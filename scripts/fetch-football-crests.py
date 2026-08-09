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
  python scripts/fetch-football-crests.py --only trophies
  python scripts/fetch-football-crests.py --force    # re-fetch even if present

After a trophies run, re-run scripts/build-trayectoria-world.mjs so world.data.json picks
up the paths - the game reads them from there, and falls back to its own silhouettes for
everything that was not mirrored.
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


"""
Trophies.

`media.copero.com.ar` is the same CDN the competition records already carry their league
marks from, and it publishes the silverware itself at a path that is entirely predictable
once you know the three shapes it uses:

    /trophies/football/national/{FIFA}/{league-slug}.png     <- already in the data as
                                                                `league_trophy_url`
    /trophies/football/national/{FIFA}/{cup-slug}.png        <- the domestic cup id with
                                                                its country prefix removed
    /trophies/football/international/{CONFED}/{slug}.png     <- verified per confederation

Coverage is real but partial: leagues and most domestic cups, UEFA, CONMEBOL, CONCACAF's
and the AFC's club competitions, and both FIFA trophies. There is nothing for CAF, for
OFC, or for any national-team tournament except the Copa América. That is why the game
draws its own silhouettes and treats these as enrichment - see trophies.jsx - and why a
miss here is logged rather than retried.
"""

COPERO = "https://media.copero.com.ar/trophies/football"

# Probed against the CDN one slug at a time, not guessed. The three individual awards are
# filed under confederations rather than in any awards folder of their own - the Golden
# Boot lives under UEFA and the Ballon d'Or and Golden Glove under FIFA - which is why
# they were missed the first time round.
COPERO_INTERNATIONAL = {
    "UEFA/champions-league",
    "UEFA/europa-league",
    "UEFA/golden-boot",
    "CONMEBOL/libertadores",
    "CONMEBOL/copa-sudamericana",
    "CONMEBOL/copa-america",
    "CONCACAF/concachampions",
    "AFC/champions-league-elite",
    "OFC/nations-cup",
    "FIFA/world-cup",
    "FIFA/club-world-cup",
    "FIFA/ballon-dor",
    "FIFA/golden-glove",
}

"""
The second source.

Copero stops well short of the whole world: it has no European Championship, no Gold Cup,
no Asian Cup, no Africa Cup of Nations, nothing for CAF or OFC at club level, and it is
missing a fair number of the smaller leagues and domestic cups. The game can award every
one of those, so they need a picture from somewhere.

Wikipedia is that somewhere, and the machinery is already here - `fetch_entity` is what
pulls club crests and league marks out of an infobox. What comes back is the competition's
mark rather than a photograph of its trophy, which for a league or a cup is arguably the
more recognisable image anyway.

Ordered queries, most specific first, because "Primera División" on its own lands on a
disambiguation page for about fifteen different countries.
"""

WIKI_INTERNATIONAL = {
    "UEFA/euro": ["UEFA European Championship", "UEFA Euro"],
    "CONCACAF/gold-cup": ["CONCACAF Gold Cup"],
    "AFC/asian-cup": ["AFC Asian Cup"],
    "CAF/africa-cup-of-nations": ["Africa Cup of Nations"],
    "OFC/nations-cup": ["OFC Nations Cup"],
    "CONCACAF/champions-cup": ["CONCACAF Champions Cup", "CONCACAF Champions League"],
    "CONCACAF/central-american-cup": ["CONCACAF Central American Cup"],
    "CAF/champions-league": ["CAF Champions League"],
    "CAF/confederation-cup": ["CAF Confederation Cup"],
    "OFC/champions-league": ["OFC Champions League"],
    "AFC/champions-league-two": ["AFC Champions League Two", "AFC Cup"],
}


def deslug(slug):
    """`taca-de-portugal` -> `taca de portugal`, which is enough for Wikipedia's search."""
    return slug.replace("-", " ").strip()


# The handful whose slug is not a searchable name. Everything else resolves from `deslug`.
WIKI_OVERRIDES = {
    "league/liga-nacional-guatemala": ["Liga Nacional de Fútbol de Guatemala"],
    "cup/slv-copa-presidente": ["Copa El Salvador", "Copa Presidente El Salvador"],
    "cup/copa-primera-de-nicaragua": ["Copa de Nicaragua"],
    "cup/supercopa-guatemala": ["Supercopa de Guatemala", "Copa de Guatemala"],
}


def cup_slug(cup_id, fifa):
    """`esp-copa-del-rey` -> `copa-del-rey`. Copero drops the country prefix; we must too."""
    prefix = f"{fifa.lower()}-"
    return cup_id[len(prefix):] if cup_id.lower().startswith(prefix) else cup_id


def fetch_trophy(key, url, out_dir, force):
    """
    Mirror one trophy. A 403 from this CDN means 'not published', not 'try again'.

    Copero is not consistent about the format - most trophies are png, a handful are webp
    - and the URL in the data is only authoritative for the leagues, where it is published
    verbatim. Everything else is a path we built, so both extensions are tried before the
    trophy is written off.
    """
    stem, ext = os.path.splitext(url)
    candidates = [url] + [f"{stem}{alt}" for alt in (".webp", ".png") if alt != ext]

    for candidate in candidates:
        name = key.replace("/", "__") + (os.path.splitext(candidate)[1] or ".png")
        path = os.path.join(out_dir, name)
        if os.path.exists(path) and not force:
            return {"name": key, "file": name, "status": "cached"}
        try:
            blob = http_bytes(candidate, tries=2)
        except Exception:  # noqa: BLE001
            blob = None
        if blob:
            with open(path, "wb") as handle:
                handle.write(blob)
            return {"name": key, "file": name, "status": "ok", "bytes": len(blob)}
    return {"name": key, "status": "missing"}


def trophy_jobs(competitions):
    """Every trophy worth asking copero for, as (manifest key, url) pairs."""
    jobs = {}
    for comp in competitions:
        fifa = comp["country_fifa_code"]
        league_url = comp.get("league_trophy_url")
        if league_url:
            jobs[f"league/{comp['id']}"] = league_url
        cup_id = comp.get("domestic_cup_id")
        if cup_id:
            slug = cup_slug(cup_id, fifa)
            jobs[f"cup/{cup_id}"] = f"{COPERO}/national/{fifa}/{slug}.png"
    for slug in sorted(COPERO_INTERNATIONAL):
        jobs[f"international/{slug}"] = f"{COPERO}/international/{slug}.png"
    return jobs


def wiki_trophy_jobs(competitions, by_fifa, done):
    """
    What Wikipedia has to cover: everything copero could not, plus the international
    competitions it never had. Returns (manifest key, name, queries, slug) tuples.
    """
    jobs = []
    for comp in competitions:
        place = by_fifa.get(comp["country_fifa_code"], {}).get("name_en", "")

        key = f"league/{comp['id']}"
        if key not in done:
            jobs.append((key, comp["name"], WIKI_OVERRIDES.get(key) or [
                f"{comp['name']} {place} football league".strip(),
                f"{comp['name']} {place}".strip(),
            ], key.replace("/", "__")))

        cup_id = comp.get("domestic_cup_id")
        key = f"cup/{cup_id}" if cup_id else None
        # One cup can be shared by two divisions of the same country, so guard the dupe.
        if cup_id and key not in done and not any(j[0] == key for j in jobs):
            name = deslug(cup_slug(cup_id, comp["country_fifa_code"]))
            jobs.append((key, name, WIKI_OVERRIDES.get(key) or [
                f"{name} {place} football cup".strip(),
                f"{name} football".strip(),
                name,
            ], key.replace("/", "__")))

    for slug, queries in WIKI_INTERNATIONAL.items():
        key = f"international/{slug}"
        if key not in done:
            jobs.append((key, slug, queries, key.replace("/", "__")))
    return jobs


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--only", choices=["clubs", "competitions", "flags", "trophies"], default=None
    )
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

    for sub in ("crests", "competitions", "flags", "trophies"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)

    manifest = {"clubs": {}, "competitions": {}, "flags": {}, "trophies": {}}
    manifest_path = os.path.join(OUT, "manifest.json")
    if os.path.exists(manifest_path):
        manifest.update(json.load(open(manifest_path, encoding="utf-8")))
    manifest.setdefault("trophies", {})

    if args.only in (None, "trophies"):
        out_dir = os.path.join(OUT, "trophies")

        # Pass one: copero, which has the real silverware where it has anything at all.
        wanted = trophy_jobs(competitions)
        log(f"trophies: {len(wanted)} to try from copero")
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            results = pool.map(
                lambda item: (item[0], fetch_trophy(item[0], item[1], out_dir, args.force)),
                wanted.items(),
            )
            for key, record in results:
                manifest["trophies"][key] = record

        # Pass two: Wikipedia for the gaps. A competition mark is not a photograph of a
        # cup, but it names the trophy just as well and the game can award all of these.
        done = {
            key
            for key, record in manifest["trophies"].items()
            if record.get("status") in ("ok", "cached")
        }
        gaps = wiki_trophy_jobs(competitions, by_fifa, done)
        log(f"trophies: {len(gaps)} gaps to try on wikipedia")
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            results = pool.map(
                lambda job: (job[0], fetch_entity(job[1], job[2], out_dir, job[3], args.force)),
                gaps,
            )
            for key, record in results:
                # Never let a Wikipedia miss overwrite a copero hit.
                if record.get("status") in ("ok", "cached") or key not in manifest["trophies"]:
                    manifest["trophies"][key] = {**record, "source_site": "wikipedia"}

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

    for bucket in ("clubs", "competitions", "flags", "trophies"):
        records = manifest[bucket].values()
        ok = sum(1 for r in records if r["status"] in ("ok", "cached"))
        log(f"{bucket}: {ok}/{len(manifest[bucket])} resolved")
    log(f"manifest -> {manifest_path}")


if __name__ == "__main__":
    main()
