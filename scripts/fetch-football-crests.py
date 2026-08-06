#!/usr/bin/env python3
"""
Fetch club crests, competition logos and country flags for the football career sim.

Sources
  - Club crests / competition logos: en.wikipedia.org. The crest is reliably the first
    non-decorative image inside the article's infobox. en.wikipedia is used rather than
    es.wikipedia because it hosts non-free crests locally (es.wikipedia forbids fair use,
    so many of its club articles simply have no crest at all).
  - Country flags: lipis/flag-icons (MIT), keyed by ISO alpha-2.

Local development asset only. Club crests and league marks are trademarks of their
respective owners; they are fetched for local play and are excluded from git via
public/assets/football/.gitignore.

Usage
  python scripts/fetch-football-crests.py            # fetch everything, skip existing
  python scripts/fetch-football-crests.py --only clubs
  python scripts/fetch-football-crests.py --force    # re-fetch even if present
"""

import argparse
import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "scripts", "data")
OUT = os.path.join(ROOT, "public", "assets", "football")

UA = {
    "User-Agent": "GameLock-CareerSim/0.1 (local development build; hugoeg2002@gmail.com)"
}

# Decorative furniture that shows up inside football infoboxes before/around the crest.
NOISE = re.compile(
    r"(^kit_|_pattern|flag_of|flag_map|oojs_ui|edit-ltr|soccerball|commons-logo|"
    r"question_book|ambox|disambig|padlock|wiki[a-z]*-logo|_map\.|location_|"
    r"red_pog|blue_pog|stadium|estadio|aerial|panorama|_by_|\d{4}-\d{2}-\d{2})",
    re.I,
)

FLAG_BASE = "https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/{}.svg"

lock_print = __import__("threading").Lock()

# Club names carry accents and Turkish/Vietnamese letters; a redirected stdout on
# Windows defaults to cp1252 and would crash the whole run on the first one.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001 - older interpreters / exotic streams
    pass


def log(msg):
    with lock_print:
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()


def slugify(value):
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def http_json(url, tries=4):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as err:
            if err.code in (429, 503) and attempt < tries - 1:
                time.sleep(2 ** attempt)
                continue
            raise
        except Exception:
            if attempt < tries - 1:
                time.sleep(1 + attempt)
                continue
            raise
    return None


def http_bytes(url, tries=4):
    """Fetch bytes, backing off hard on 429.

    upload.wikimedia.org throttles far more aggressively than the API does, and answers
    429 for a while once tripped. Short retries just deepen the hole, so back off in
    tens of seconds and honour Retry-After when it is sent.
    """
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=45) as response:
                return response.read()
        except urllib.error.HTTPError as err:
            if err.code in (429, 503) and attempt < tries - 1:
                retry_after = err.headers.get("Retry-After") if err.headers else None
                delay = int(retry_after) if (retry_after or "").isdigit() else 5 * (3 ** attempt)
                log(f"  throttled ({err.code}), waiting {delay}s")
                time.sleep(delay)
                continue
            raise
        except Exception:
            if attempt < tries - 1:
                time.sleep(1 + attempt)
                continue
            raise
    return None


def wiki_api(params):
    return http_json("https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(params))


def resolve_title(query):
    data = wiki_api(
        {"action": "query", "format": "json", "list": "search", "srsearch": query, "srlimit": 1}
    )
    hits = (data.get("query") or {}).get("search") or []
    return hits[0]["title"] if hits else None


def infobox_image(title):
    """Return (image_url, page_title) for the crest in the article's infobox."""
    data = wiki_api(
        {
            "action": "parse",
            "format": "json",
            "page": title,
            "prop": "text",
            "section": 0,
            "redirects": 1,
        }
    )
    html = ((data.get("parse") or {}).get("text") or {}).get("*")
    if not html:
        return None
    match = re.search(
        r'<table[^>]*class="[^"]*infobox[^"]*"[^>]*>(.*?)</table>', html, re.S
    )
    scope = match.group(1) if match else html[:12000]

    for src in re.findall(r'<img[^>]+src="([^"]+)"', scope):
        src = src.split("?")[0].replace("&amp;", "&")
        if src.startswith("//"):
            src = "https:" + src
        filename = urllib.parse.unquote(src.rsplit("/", 1)[-1])
        if NOISE.search(filename):
            continue
        width = re.match(r"(\d+)px-", filename)
        if width and int(width.group(1)) < 80:
            continue
        return src
    return None


def download_candidates(thumb_url):
    """Ordered (url, extension) attempts for one infobox image.

    Vector crests are taken at full size. For raster crests a 512px render is nicer than
    the 250px the infobox uses, but Wikimedia only serves a whitelist of widths per file
    and answers 400 otherwise - so the original thumbnail and the source file follow as
    fallbacks.
    """
    original = re.sub(r"/thumb(/.*)/\d+px-[^/]+$", r"\1", thumb_url)
    ext = os.path.splitext(original)[1].lower() or ".png"
    if original.lower().endswith(".svg"):
        return [(original, ".svg")]
    candidates = []
    if "/thumb/" in thumb_url:
        # The width the infobox already asked for is guaranteed to be renderable, and at
        # 250px it is well above the ~64px a crest is drawn at. Asking for a rounder 512
        # only earns a 400 from the thumbnailer on most files.
        candidates.append((thumb_url, ".png"))
    candidates.append((original, ext))
    return candidates


def fetch_entity(name, queries, out_dir, slug, force):
    """Look an entity up on Wikipedia and save its crest. Returns a manifest record.

    `queries` is tried in order: the first that lands on an article with a usable infobox
    image wins. Later queries are progressively less specific.
    """
    existing = [
        f for f in os.listdir(out_dir) if os.path.splitext(f)[0] == slug
    ] if os.path.isdir(out_dir) else []
    if existing and not force:
        return {"name": name, "file": existing[0], "status": "cached"}

    if isinstance(queries, str):
        queries = [queries]

    last = {"name": name, "status": "no-article", "query": queries[0]}
    for query in queries:
        try:
            title = resolve_title(query)
            if not title:
                continue
            thumb = infobox_image(title)
            if not thumb:
                last = {"name": name, "status": "no-image", "page": title, "query": query}
                continue

            for url, ext in download_candidates(thumb):
                try:
                    blob = http_bytes(url, tries=2)
                except Exception:  # noqa: BLE001 - try the next candidate size
                    continue
                if not blob or len(blob) < 200:
                    continue
                path = os.path.join(out_dir, slug + ext)
                with open(path, "wb") as handle:
                    handle.write(blob)
                return {
                    "name": name,
                    "file": slug + ext,
                    "status": "ok",
                    "page": title,
                    "source": url,
                    "bytes": len(blob),
                }
            last = {"name": name, "status": "empty", "page": title, "query": query}
        except Exception as err:  # noqa: BLE001 - report and keep going
            last = {"name": name, "status": "error", "error": str(err), "query": query}
    return last


def fetch_flag(country, out_dir, force):
    iso = (country.get("iso_alpha2") or "").lower()
    slug = country.get("slug") or slugify(country["name_en"])
    if not iso:
        return {"name": country["name_en"], "status": "no-iso"}
    path = os.path.join(out_dir, slug + ".svg")
    if os.path.exists(path) and not force:
        return {"name": country["name_en"], "file": slug + ".svg", "status": "cached"}
    try:
        blob = http_bytes(FLAG_BASE.format(iso))
        if not blob:
            return {"name": country["name_en"], "status": "empty"}
        with open(path, "wb") as handle:
            handle.write(blob)
        return {
            "name": country["name_en"],
            "file": slug + ".svg",
            "status": "ok",
            "bytes": len(blob),
        }
    except Exception as err:  # noqa: BLE001
        return {"name": country["name_en"], "status": "error", "error": str(err)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["clubs", "competitions", "flags"], default=None)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    competitions = json.load(
        open(os.path.join(DATA, "football-world.competitions.json"), encoding="utf-8")
    )
    countries = json.load(
        open(os.path.join(DATA, "football-world.countries.json"), encoding="utf-8")
    )
    by_fifa = {c["fifa_code"]: c for c in countries}

    for sub in ("crests", "competitions", "flags"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)

    manifest = {"clubs": {}, "competitions": {}, "flags": {}}
    manifest_path = os.path.join(OUT, "manifest.json")
    if os.path.exists(manifest_path):
        manifest.update(json.load(open(manifest_path, encoding="utf-8")))

    jobs = []

    if args.only in (None, "competitions"):
        out_dir = os.path.join(OUT, "competitions")
        for comp in competitions:
            country = by_fifa.get(comp["country_fifa_code"], {})
            place = country.get("name_en", "")
            queries = [
                f"{comp['name']} {place} football league".strip(),
                f"{comp['name']} {place}".strip(),
                comp["name"],
            ]
            jobs.append(
                ("competitions", comp["id"], comp["name"], queries, out_dir, comp["id"])
            )

    if args.only in (None, "clubs"):
        out_dir = os.path.join(OUT, "crests")
        for comp in competitions:
            country = by_fifa.get(comp["country_fifa_code"], {})
            place = country.get("name_en", "")
            for team in comp["teams"]:
                queries = [
                    f"{team['name']} football club {place}".strip(),
                    f"{team['name']} {place} football".strip(),
                    f"{team['name']} football club".strip(),
                ]
                jobs.append(("clubs", team["id"], team["name"], queries, out_dir, team["id"]))

    if jobs:
        log(f"fetching {len(jobs)} entities with {args.workers} workers")
        done = [0]

        def run(job):
            bucket, key, name, query, out_dir, slug = job
            record = fetch_entity(name, query, out_dir, slug, args.force)
            manifest[bucket][key] = record
            done[0] += 1
            if record["status"] not in ("ok", "cached") or done[0] % 25 == 0:
                log(f"[{done[0]}/{len(jobs)}] {name}: {record['status']}")
            # Deliberately unhurried: the media servers throttle well before the API does.
            time.sleep(0.6)
            return record

        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            list(pool.map(run, jobs))

    if args.only in (None, "flags"):
        out_dir = os.path.join(OUT, "flags")
        log(f"fetching {len(countries)} flags")
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            for country, record in zip(
                countries, pool.map(lambda c: fetch_flag(c, out_dir, args.force), countries)
            ):
                manifest["flags"][country["fifa_code"]] = record

    with open(manifest_path, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=1)

    for bucket in ("clubs", "competitions", "flags"):
        records = manifest[bucket].values()
        ok = sum(1 for r in records if r["status"] in ("ok", "cached"))
        log(f"{bucket}: {ok}/{len(manifest[bucket])} resolved")
    log(f"manifest -> {manifest_path}")


if __name__ == "__main__":
    main()
