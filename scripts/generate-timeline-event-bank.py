#!/usr/bin/env python3
"""
Generate an expanded timeline event bank for Cronologia Maestra from Wikidata.

The script pulls dated entities by thematic category, validates years, enriches
with bilingual labels/descriptions (es/en), and writes a JS module compatible
with src/games/knowledge/timelineEventBank.js.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import requests


SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"
WIKIDATA_API_ENDPOINT = "https://www.wikidata.org/w/api.php"
USER_AGENT = "plataforma-juegos-saas-timeline/1.0 (local generation)"
DEFAULT_TARGET = 10_000
CURRENT_YEAR = 2026
MIN_YEAR = -4000
PAGE_SIZE = 220
MAX_PAGES_PER_PULL = 18
SLEEP_BETWEEN_REQUESTS_SECONDS = 0.17
SELECTION_OVERFETCH_RATIO = 1.35


@dataclass(frozen=True)
class CategoryConfig:
  id: str
  class_id: str
  date_property: str
  target: int
  tags: List[str]
  title_prefix_es: str
  title_prefix_en: str
  fallback_desc_es: str
  fallback_desc_en: str
  quality_keywords_es: Optional[List[str]] = None
  quality_keywords_en: Optional[List[str]] = None


CATEGORY_CONFIG: List[CategoryConfig] = [
    CategoryConfig(
        id="historical-event",
        class_id="Q1190554",
        date_property="P585",
        target=1000,
        tags=["geopolitics", "rights", "culture"],
        title_prefix_es="Hecho historico",
        title_prefix_en="Historical event",
        fallback_desc_es="Hito historico registrado en una cronologia publica",
        fallback_desc_en="Historical milestone recorded in a public chronology",
    ),
    CategoryConfig(
        id="election",
        class_id="Q40231",
        date_property="P585",
        target=400,
        tags=["geopolitics", "rights"],
        title_prefix_es="Proceso electoral",
        title_prefix_en="Electoral process",
        fallback_desc_es="Evento electoral con fecha documentada",
        fallback_desc_en="Election event with documented date",
    ),
    CategoryConfig(
        id="military-conflict",
        class_id="Q180684",
        date_property="P580",
        target=400,
        tags=["war", "geopolitics"],
        title_prefix_es="Inicio de conflicto militar",
        title_prefix_en="Military conflict begins",
        fallback_desc_es="Conflicto militar con inicio cronologico registrado",
        fallback_desc_en="Military conflict with a documented start date",
    ),
    CategoryConfig(
        id="war",
        class_id="Q198",
        date_property="P580",
        target=250,
        tags=["war", "geopolitics"],
        title_prefix_es="Comienzo de guerra",
        title_prefix_en="War begins",
        fallback_desc_es="Guerra con fecha de inicio verificada",
        fallback_desc_en="War with verified start date",
    ),
    CategoryConfig(
        id="treaty",
        class_id="Q131569",
        date_property="P571",
        target=250,
        tags=["geopolitics", "rights"],
        title_prefix_es="Firma o adopcion de tratado",
        title_prefix_en="Treaty signature or adoption",
        fallback_desc_es="Tratado con fecha oficial registrada",
        fallback_desc_en="Treaty with an official recorded date",
    ),
    CategoryConfig(
        id="political-party",
        class_id="Q7278",
        date_property="P571",
        target=300,
        tags=["geopolitics", "rights", "economy"],
        title_prefix_es="Fundacion de partido politico",
        title_prefix_en="Political party founded",
        fallback_desc_es="Partido politico con fecha de fundacion documentada",
        fallback_desc_en="Political party with documented foundation date",
    ),
    CategoryConfig(
        id="video-game",
        class_id="Q7889",
        date_property="P577",
        target=1300,
        tags=["technology", "culture", "media", "gaming"],
        title_prefix_es="Lanzamiento de videojuego",
        title_prefix_en="Video game release",
        fallback_desc_es="Videojuego con hito de lanzamiento documentado",
        fallback_desc_en="Video game with documented release milestone",
    ),
    CategoryConfig(
        id="software",
        class_id="Q7397",
        date_property="P571",
        target=650,
        tags=["technology", "programming", "economy"],
        title_prefix_es="Creacion de software",
        title_prefix_en="Software created",
        fallback_desc_es="Producto de software con fecha de origen registrada",
        fallback_desc_en="Software product with a recorded inception date",
    ),
    CategoryConfig(
        id="programming-language",
        class_id="Q9143",
        date_property="P571",
        target=250,
        tags=["technology", "science", "programming"],
        title_prefix_es="Aparicion de lenguaje de programacion",
        title_prefix_en="Programming language appears",
        fallback_desc_es="Lenguaje de programacion con inicio documentado",
        fallback_desc_en="Programming language with documented first year",
    ),
    CategoryConfig(
        id="film",
        class_id="Q11424",
        date_property="P577",
        target=900,
        tags=["culture", "media", "art", "cinema"],
        title_prefix_es="Estreno de pelicula",
        title_prefix_en="Film release",
        fallback_desc_es="Pelicula con fecha de estreno documentada",
        fallback_desc_en="Film with documented release date",
    ),
    CategoryConfig(
        id="tv-series",
        class_id="Q5398426",
        date_property="P571",
        target=300,
        tags=["culture", "media"],
        title_prefix_es="Inicio de serie de television",
        title_prefix_en="Television series starts",
        fallback_desc_es="Serie con fecha de inicio documentada",
        fallback_desc_en="Series with documented start date",
    ),
    CategoryConfig(
        id="music-album",
        class_id="Q482994",
        date_property="P577",
        target=700,
        tags=["culture", "media", "music"],
        title_prefix_es="Publicacion de album musical",
        title_prefix_en="Music album release",
        fallback_desc_es="Album musical con fecha de publicacion registrada",
        fallback_desc_en="Music album with recorded publication date",
    ),
    CategoryConfig(
        id="song",
        class_id="Q7366",
        date_property="P577",
        target=700,
        tags=["culture", "media", "music"],
        title_prefix_es="Publicacion de cancion",
        title_prefix_en="Song release",
        fallback_desc_es="Cancion con fecha de publicacion documentada",
        fallback_desc_en="Song with documented release date",
    ),
    CategoryConfig(
        id="sports-event",
        class_id="Q16510064",
        date_property="P585",
        target=850,
        tags=["sports", "culture"],
        title_prefix_es="Evento deportivo",
        title_prefix_en="Sports event",
        fallback_desc_es="Evento deportivo con fecha oficial registrada",
        fallback_desc_en="Sports event with official recorded date",
    ),
    CategoryConfig(
        id="space-mission",
        class_id="Q2133344",
        date_property="P619",
        target=250,
        tags=["space", "science", "technology"],
        title_prefix_es="Lanzamiento de mision espacial",
        title_prefix_en="Space mission launch",
        fallback_desc_es="Mision espacial con fecha de lanzamiento verificada",
        fallback_desc_en="Space mission with verified launch date",
    ),
    CategoryConfig(
        id="satellite",
        class_id="Q26540",
        date_property="P619",
        target=250,
        tags=["space", "science", "technology"],
        title_prefix_es="Puesta en orbita de satelite",
        title_prefix_en="Satellite put in orbit",
        fallback_desc_es="Satelite con fecha de lanzamiento documentada",
        fallback_desc_en="Satellite with documented launch date",
    ),
    CategoryConfig(
        id="restaurant",
        class_id="Q11707",
        date_property="P571",
        target=250,
        tags=["culture", "economy", "gastronomy"],
        title_prefix_es="Apertura o fundacion de restaurante",
        title_prefix_en="Restaurant opening or founding",
        fallback_desc_es="Establecimiento gastronomico con fecha de inicio registrada",
        fallback_desc_en="Food venue with documented opening or inception date",
        quality_keywords_es=["restaurante", "cafeteria", "bar", "bistro", "comida", "gastronomi"],
        quality_keywords_en=["restaurant", "cafe", "bar", "bistro", "food", "dining", "pizzeria"],
    ),
    CategoryConfig(
        id="food-company",
        class_id="Q1252971",
        date_property="P571",
        target=250,
        tags=["economy", "culture", "gastronomy"],
        title_prefix_es="Fundacion de empresa alimentaria",
        title_prefix_en="Food company founded",
        fallback_desc_es="Empresa alimentaria con fecha de inicio documentada",
        fallback_desc_en="Food company with documented inception date",
        quality_keywords_es=["alimento", "bebida", "lacteo", "confiter", "comida", "nutricion", "cervec"],
        quality_keywords_en=["food", "beverage", "dairy", "confectionery", "snack", "nutrition", "brewery"],
    ),
    CategoryConfig(
        id="book",
        class_id="Q571",
        date_property="P577",
        target=750,
        tags=["culture", "media", "art"],
        title_prefix_es="Publicacion de libro",
        title_prefix_en="Book publication",
        fallback_desc_es="Obra editorial con fecha de publicacion registrada",
        fallback_desc_en="Published work with a documented publication date",
    ),
]

assert sum(category.target for category in CATEGORY_CONFIG) == DEFAULT_TARGET

FALLBACK_CATEGORY_IDS = [
    "historical-event",
    "video-game",
    "film",
    "song",
    "book",
    "software",
]

YEAR_PATTERN = re.compile(r"^([+-]?\d+)")
SPACE_PATTERN = re.compile(r"\s+")
QID_LABEL_PATTERN = re.compile(r"^Q\d+$", re.IGNORECASE)


def normalize_space(value: str) -> str:
    return SPACE_PATTERN.sub(" ", value).strip()


def to_ascii_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_text = "".join(character for character in normalized if ord(character) < 128)
    return normalize_space(ascii_text)


def sanitize_text(value: str, max_length: int = 180) -> str:
    text = to_ascii_text(value)
    text = text.replace("`", "'")
    if len(text) > max_length:
        text = text[:max_length].rstrip(" ,;:-")
    return text.strip(" \t\n\r.,;:")


def matches_any_keyword(haystack: str, keywords: Optional[List[str]]) -> bool:
    if not keywords:
        return True
    lowered = haystack.lower()
    return any(keyword.lower() in lowered for keyword in keywords)


def parse_year(date_value: str) -> Optional[int]:
    if not date_value:
        return None
    match = YEAR_PATTERN.match(str(date_value).strip())
    if not match:
        return None
    try:
        year_value = int(match.group(1))
    except ValueError:
        return None
    if year_value == 0:
        return None
    return year_value


def format_year_es(year: int) -> str:
    return f"{abs(year)} a. C." if year < 0 else str(year)


def format_year_en(year: int) -> str:
    return f"{abs(year)} BCE" if year < 0 else str(year)


def build_sparql_query(category: CategoryConfig, limit: int, offset: int) -> str:
    return f"""
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?item ?date WHERE {{
  ?item wdt:P31 wd:{category.class_id} .
  ?item wdt:{category.date_property} ?date .
  FILTER NOT EXISTS {{
    ?item wdt:{category.date_property} ?date2 .
    FILTER(?date2 < ?date)
  }}
}}
LIMIT {limit}
OFFSET {offset}
"""


def request_json(
    session: requests.Session,
    url: str,
    *,
    params: Dict[str, str],
    timeout: int,
    max_attempts: int = 6,
) -> Dict:
    wait_seconds = 1.2
    for attempt in range(1, max_attempts + 1):
        try:
            response = session.get(url, params=params, timeout=timeout)
        except requests.RequestException:
            if attempt == max_attempts:
                raise
            time.sleep(wait_seconds)
            wait_seconds *= 1.7
            continue

        if response.status_code in {429, 500, 502, 503, 504}:
            if attempt == max_attempts:
                response.raise_for_status()
            retry_after = response.headers.get("Retry-After")
            if retry_after:
                try:
                    wait_seconds = max(wait_seconds, float(retry_after))
                except ValueError:
                    pass
            time.sleep(wait_seconds)
            wait_seconds *= 1.7
            continue

        response.raise_for_status()
        return response.json()
    raise RuntimeError("Unexpected request failure path")


def extract_qid(item_uri: str) -> Optional[str]:
    if not item_uri:
        return None
    marker = "/entity/"
    if marker not in item_uri:
        return None
    qid = item_uri.split(marker, 1)[1].strip()
    if not qid.startswith("Q"):
        return None
    return qid


def fetch_category_records(
    *,
    session: requests.Session,
    category: CategoryConfig,
    required_count: int,
    used_qids: set[str],
    start_offset: int,
) -> Tuple[List[Dict], int, bool]:
    if required_count <= 0:
        return [], start_offset, False

    added_records: List[Dict] = []
    local_seen_qids: set[str] = set()
    offset = start_offset
    exhausted = False

    for _ in range(MAX_PAGES_PER_PULL):
        query = build_sparql_query(category, PAGE_SIZE, offset)
        payload = request_json(
            session,
            SPARQL_ENDPOINT,
            params={"format": "json", "query": query},
            timeout=140,
        )
        bindings = payload.get("results", {}).get("bindings", [])
        if not bindings:
            exhausted = True
            break

        offset += PAGE_SIZE

        for row in bindings:
            qid = extract_qid(row.get("item", {}).get("value", ""))
            if not qid:
                continue
            if qid in used_qids or qid in local_seen_qids:
                continue

            year = parse_year(row.get("date", {}).get("value", ""))
            if year is None:
                continue
            if year < MIN_YEAR or year > CURRENT_YEAR:
                continue

            local_seen_qids.add(qid)
            added_records.append(
                {
                    "qid": qid,
                    "year": year,
                    "category_id": category.id,
                }
            )
            if len(added_records) >= required_count:
                break

        if len(added_records) >= required_count:
            break

        if len(bindings) < PAGE_SIZE:
            exhausted = True
            break

        time.sleep(SLEEP_BETWEEN_REQUESTS_SECONDS)

    return added_records, offset, exhausted


def chunked(values: Iterable[str], chunk_size: int) -> Iterable[List[str]]:
    current: List[str] = []
    for value in values:
        current.append(value)
        if len(current) >= chunk_size:
            yield current
            current = []
    if current:
        yield current


def fetch_entity_texts(
    session: requests.Session,
    qids: List[str],
) -> Dict[str, Dict[str, str]]:
    info: Dict[str, Dict[str, str]] = {}
    for ids_chunk in chunked(qids, 50):
        payload = request_json(
            session,
            WIKIDATA_API_ENDPOINT,
            params={
                "action": "wbgetentities",
                "ids": "|".join(ids_chunk),
                "props": "labels|descriptions",
                "languages": "es|en",
                "format": "json",
                "origin": "*",
            },
            timeout=70,
        )
        entities = payload.get("entities", {})
        for qid in ids_chunk:
            entity = entities.get(qid, {})
            labels = entity.get("labels", {})
            descriptions = entity.get("descriptions", {})
            info[qid] = {
                "label_es": labels.get("es", {}).get("value", ""),
                "label_en": labels.get("en", {}).get("value", ""),
                "desc_es": descriptions.get("es", {}).get("value", ""),
                "desc_en": descriptions.get("en", {}).get("value", ""),
            }
        time.sleep(SLEEP_BETWEEN_REQUESTS_SECONDS)
    return info


def render_event(
    row: Dict,
    category_by_id: Dict[str, CategoryConfig],
    text_by_qid: Dict[str, Dict[str, str]],
) -> Optional[Dict]:
    category = category_by_id[row["category_id"]]
    qid = row["qid"]
    year = int(row["year"])
    text_info = text_by_qid.get(qid, {})

    label_es = sanitize_text(text_info.get("label_es", ""))
    label_en = sanitize_text(text_info.get("label_en", ""))

    if not label_es and label_en:
        label_es = label_en
    if not label_en and label_es:
        label_en = label_es
    if not label_es and not label_en:
        label_es = qid
        label_en = qid

    if QID_LABEL_PATTERN.fullmatch(label_es) and QID_LABEL_PATTERN.fullmatch(label_en):
        return None

    desc_es = sanitize_text(text_info.get("desc_es", ""), max_length=210)
    desc_en = sanitize_text(text_info.get("desc_en", ""), max_length=210)

    blocked_markers = [
        "wikimedia disambiguation page",
        "pagina de desambiguacion de wikimedia",
        "wikimedia category",
        "categoria de wikimedia",
    ]
    desc_es_l = desc_es.lower()
    desc_en_l = desc_en.lower()
    if any(marker in desc_es_l for marker in blocked_markers):
        return None
    if any(marker in desc_en_l for marker in blocked_markers):
        return None

    if not desc_es:
        desc_es = category.fallback_desc_es
    if not desc_en:
        desc_en = category.fallback_desc_en

    quality_haystack = " ".join([label_es, label_en, desc_es, desc_en]).lower()
    if category.quality_keywords_es and not matches_any_keyword(
        quality_haystack,
        category.quality_keywords_es,
    ):
        return None
    if category.quality_keywords_en and not matches_any_keyword(
        quality_haystack,
        category.quality_keywords_en,
    ):
        return None

    title_es = sanitize_text(f"{category.title_prefix_es}: {label_es}", max_length=170)
    title_en = sanitize_text(f"{category.title_prefix_en}: {label_en}", max_length=170)
    if not title_es or not title_en:
        return None

    year_token = str(year) if year >= 0 else f"b{abs(year)}"
    event_id = f"wd-{category.id}-{qid.lower()}-{year_token}"
    return {
        "id": event_id,
        "year": year,
        "tags": category.tags,
        "title": {"es": title_es, "en": title_en},
        "summary": {"es": "", "en": ""},
        "qid": qid,
        "category_id": category.id,
    }


def build_target_by_category(target_total: int) -> Dict[str, int]:
    targets: Dict[str, int] = {}
    remainders: List[Tuple[float, str]] = []
    assigned = 0

    for category in CATEGORY_CONFIG:
        raw_target = target_total * (category.target / DEFAULT_TARGET)
        base_target = int(raw_target)
        targets[category.id] = base_target
        remainders.append((raw_target - base_target, category.id))
        assigned += base_target

    remaining = target_total - assigned
    if remaining > 0:
        for _, category_id in sorted(remainders, key=lambda item: (-item[0], item[1])):
            if remaining <= 0:
                break
            targets[category_id] = targets.get(category_id, 0) + 1
            remaining -= 1

    return targets


def select_final_events(events: List[Dict], target_total: int) -> List[Dict]:
    target_by_category = build_target_by_category(target_total)
    events_by_category: Dict[str, List[Dict]] = {category.id: [] for category in CATEGORY_CONFIG}
    for event in events:
        category_id = event.get("category_id")
        if category_id not in events_by_category:
            events_by_category[category_id] = []
        events_by_category[category_id].append(event)

    for category_events in events_by_category.values():
        category_events.sort(key=lambda item: (item["year"], item["id"]))

    selected: List[Dict] = []
    selected_ids: set[str] = set()

    def add_event(candidate: Dict) -> bool:
        candidate_id = candidate["id"]
        if candidate_id in selected_ids:
            return False
        selected_ids.add(candidate_id)
        selected.append(candidate)
        return True

    overflow_by_category: Dict[str, List[Dict]] = {}
    for category in CATEGORY_CONFIG:
        category_id = category.id
        category_events = events_by_category.get(category_id, [])
        target_for_category = target_by_category.get(category_id, 0)
        index = 0
        added = 0
        while index < len(category_events) and added < target_for_category and len(selected) < target_total:
            if add_event(category_events[index]):
                added += 1
            index += 1
        overflow_by_category[category_id] = category_events[index:]

    if len(selected) >= target_total:
        return selected[:target_total]

    overflow_index: Dict[str, int] = {category.id: 0 for category in CATEGORY_CONFIG}
    progress_made = True
    while len(selected) < target_total and progress_made:
        progress_made = False
        for category in CATEGORY_CONFIG:
            category_id = category.id
            overflow_events = overflow_by_category.get(category_id, [])
            index = overflow_index.get(category_id, 0)
            while index < len(overflow_events):
                candidate = overflow_events[index]
                index += 1
                if add_event(candidate):
                    progress_made = True
                    break
            overflow_index[category_id] = index
            if len(selected) >= target_total:
                break

    if len(selected) < target_total:
        for event in sorted(events, key=lambda item: (item["year"], item["id"])):
            if len(selected) >= target_total:
                break
            add_event(event)

    return selected[:target_total]


def write_js_module(path: Path, events: List[Dict]) -> None:
    lines = [
        "const E = (id, year, tags, titleEs, titleEn, summaryEs, summaryEn) => ({",
        "  id,",
        "  year,",
        "  tags,",
        "  title: { es: titleEs, en: titleEn },",
        "  summary: { es: summaryEs, en: summaryEn },",
        "});",
        "",
        "export const GENERATED_TIMELINE_EVENTS = [",
    ]
    for event in events:
        lines.append(
            "  E("
            + json.dumps(event["id"], ensure_ascii=True)
            + ", "
            + str(event["year"])
            + ", "
            + json.dumps(event["tags"], ensure_ascii=True)
            + ", "
            + json.dumps(event["title"]["es"], ensure_ascii=True)
            + ", "
            + json.dumps(event["title"]["en"], ensure_ascii=True)
            + ", "
            + json.dumps(event["summary"]["es"], ensure_ascii=True)
            + ", "
            + json.dumps(event["summary"]["en"], ensure_ascii=True)
            + "),"
        )
    lines.append("];")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--target",
        type=int,
        default=DEFAULT_TARGET,
        help=f"Number of new events to generate (default: {DEFAULT_TARGET})",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("src/games/knowledge/timelineEventBank.generated.js"),
        help="Output JS module path",
    )
    parser.add_argument(
        "--meta-out",
        type=Path,
        default=Path("src/games/knowledge/timelineEventBank.generated.meta.json"),
        help="Metadata output path",
    )
    return parser


def main() -> int:
    args = build_parser().parse_args()
    target_total = max(1, int(args.target))
    planned_total = max(target_total, int(round(target_total * SELECTION_OVERFETCH_RATIO)))

    category_by_id = {category.id: category for category in CATEGORY_CONFIG}
    requested_by_category: Dict[str, int] = {}
    for category in CATEGORY_CONFIG:
        share = category.target / DEFAULT_TARGET
        requested_by_category[category.id] = max(
            1,
            int(round(target_total * share * SELECTION_OVERFETCH_RATIO)),
        )

    selected_rows: List[Dict] = []
    used_qids: set[str] = set()
    offset_by_category: Dict[str, int] = {category.id: 0 for category in CATEGORY_CONFIG}
    exhausted_by_category: Dict[str, bool] = {category.id: False for category in CATEGORY_CONFIG}
    count_by_category: Dict[str, int] = {category.id: 0 for category in CATEGORY_CONFIG}

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})

    print("Generating timeline events from Wikidata...")
    for category in CATEGORY_CONFIG:
        requested = requested_by_category[category.id]
        rows, next_offset, exhausted = fetch_category_records(
            session=session,
            category=category,
            required_count=requested,
            used_qids=used_qids,
            start_offset=offset_by_category[category.id],
        )
        offset_by_category[category.id] = next_offset
        exhausted_by_category[category.id] = exhausted

        for row in rows:
            used_qids.add(row["qid"])
            selected_rows.append(row)
            count_by_category[category.id] += 1

        print(
            f"- {category.id}: requested={requested} added={len(rows)}"
            f" offset={next_offset} exhausted={exhausted}"
        )

    while len(selected_rows) < planned_total:
        remaining = planned_total - len(selected_rows)
        progress_made = False
        for category_id in FALLBACK_CATEGORY_IDS:
            if remaining <= 0:
                break
            if exhausted_by_category.get(category_id, False):
                continue

            category = category_by_id[category_id]
            chunk_target = min(remaining, 240)
            rows, next_offset, exhausted = fetch_category_records(
                session=session,
                category=category,
                required_count=chunk_target,
                used_qids=used_qids,
                start_offset=offset_by_category[category_id],
            )
            offset_by_category[category_id] = next_offset
            exhausted_by_category[category_id] = exhausted

            if rows:
                progress_made = True
                for row in rows:
                    used_qids.add(row["qid"])
                    selected_rows.append(row)
                    count_by_category[category_id] = count_by_category.get(category_id, 0) + 1
                remaining = planned_total - len(selected_rows)
                print(
                    f"- fallback {category_id}: +{len(rows)}"
                    f" total={len(selected_rows)} remaining={remaining}"
                )

        if not progress_made:
            break

    if len(selected_rows) < target_total:
        print(
            f"ERROR: only {len(selected_rows)} events collected, target is {target_total}.",
            file=sys.stderr,
        )
        return 1

    selected_rows = selected_rows[:planned_total]
    qids = [row["qid"] for row in selected_rows]
    print(f"Fetching labels/descriptions for {len(qids)} entities...")
    texts = fetch_entity_texts(session, qids)

    events: List[Dict] = []
    used_event_ids: set[str] = set()
    for row in selected_rows:
        event = render_event(row, category_by_id, texts)
        if not event:
            continue
        if event["id"] in used_event_ids:
            continue
        used_event_ids.add(event["id"])
        events.append(event)

    if len(events) < target_total:
        print(
            f"ERROR: after text quality filtering, only {len(events)} events remain"
            f" (target {target_total}).",
            file=sys.stderr,
        )
        return 1

    events = select_final_events(events, target_total)
    if len(events) < target_total:
        print(
            f"ERROR: after category balancing, only {len(events)} events remain"
            f" (target {target_total}).",
            file=sys.stderr,
        )
        return 1

    events.sort(key=lambda item: (item["year"], item["id"]))
    final_count_by_category: Dict[str, int] = {}
    for event in events:
        category_id = event.get("category_id")
        if not category_id:
            continue
        final_count_by_category[category_id] = final_count_by_category.get(category_id, 0) + 1

    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_js_module(args.out, events)

    metadata = {
        "source": {
            "sparql_endpoint": SPARQL_ENDPOINT,
            "wikidata_api_endpoint": WIKIDATA_API_ENDPOINT,
            "generated_with_user_agent": USER_AGENT,
        },
        "total_generated_events": len(events),
        "target_requested": target_total,
        "planned_prefetch_total": planned_total,
        "year_range": {
            "min": min(event["year"] for event in events),
            "max": max(event["year"] for event in events),
        },
        "categories_requested": requested_by_category,
        "categories_final": final_count_by_category,
    }
    args.meta_out.parent.mkdir(parents=True, exist_ok=True)
    args.meta_out.write_text(json.dumps(metadata, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    print(f"Wrote {len(events)} events to {args.out}")
    print(f"Wrote metadata to {args.meta_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
