#!/usr/bin/env python3
"""
Generate 10,000 historical/political/geopolitical events without Wikipedia sources.

Data sources:
- Seshat API (ancient and long-run historical records)
- GDELT Event Database (recent geopolitical/political events, including 2026)

Outputs:
- output/historical-events-non-wikipedia/historical_events_es.json
- output/historical-events-non-wikipedia/historical_events_en.json
- output/historical-events-non-wikipedia/metadata.json
"""

from __future__ import annotations

import argparse
import io
import json
import re
import time
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import requests


SESHAT_API_ROOT = "https://seshat-db.com/api/"
GDELT_DAILY_BASE = "http://data.gdeltproject.org/events"
DEFAULT_TARGET_TOTAL = 10_000
DEFAULT_TARGET_SESHAT = 8_000
DEFAULT_TARGET_GDELT = 2_000
MIN_YEAR = -500
MAX_YEAR = 2026

EXCLUDED_SESHAT_GENERAL_ENDPOINT_FRAGMENTS = (
    "research-assistants",
    "experts",
    "editors",
)

META_FIELD_SET = {
    "id",
    "polity",
    "name",
    "description",
    "comment",
    "tag",
    "is_disputed",
    "is_uncertain",
    "year_from",
    "year_to",
    "start_year",
    "end_year",
}

GDELT_ROOT_CODE_EN = {
    "01": "public statement",
    "02": "appeal",
    "03": "intent to cooperate",
    "04": "consultation",
    "05": "diplomatic cooperation",
    "06": "material cooperation",
    "07": "aid action",
    "08": "yield",
    "09": "investigation",
    "10": "demand",
    "11": "disapproval",
    "12": "rejection",
    "13": "threat",
    "14": "protest",
    "15": "force posture display",
    "16": "reduction of relations",
    "17": "coercion",
    "18": "assault",
    "19": "fight",
    "20": "mass violence",
}

GDELT_ROOT_CODE_ES = {
    "01": "declaracion publica",
    "02": "llamamiento",
    "03": "intencion de cooperacion",
    "04": "consulta",
    "05": "cooperacion diplomatica",
    "06": "cooperacion material",
    "07": "accion de ayuda",
    "08": "cesion",
    "09": "investigacion",
    "10": "demanda",
    "11": "desaprobacion",
    "12": "rechazo",
    "13": "amenaza",
    "14": "protesta",
    "15": "demostracion de fuerza",
    "16": "reduccion de relaciones",
    "17": "coaccion",
    "18": "asalto",
    "19": "combate",
    "20": "violencia masiva",
}

TOKEN_TRANSLATIONS_ES = {
    "polity": "entidad politica",
    "polities": "entidades politicas",
    "duration": "duracion",
    "durations": "duraciones",
    "peak": "pico",
    "years": "anos",
    "year": "ano",
    "relationship": "relacion",
    "preceding": "precedente",
    "succeeding": "sucesora",
    "entities": "entidades",
    "entity": "entidad",
    "language": "idioma",
    "languages": "idiomas",
    "religion": "religion",
    "religions": "religiones",
    "capital": "capital",
    "capitals": "capitales",
    "military": "militar",
    "administrative": "administrativo",
    "levels": "niveles",
    "level": "nivel",
    "professional": "profesional",
    "soldiers": "soldados",
    "officers": "oficiales",
    "firearms": "armas de fuego",
    "firearm": "arma de fuego",
    "fortifications": "fortificaciones",
    "walls": "murallas",
    "wall": "muralla",
    "roads": "carreteras",
    "bridges": "puentes",
    "courts": "tribunales",
    "markets": "mercados",
    "formal": "formal",
    "legal": "legal",
    "codes": "codigos",
    "code": "codigo",
    "present": "presente",
    "absent": "ausente",
    "inferred": "inferido",
    "continuity": "continuidad",
    "unknown": "desconocido",
    "none": "ninguno",
    "yes": "si",
    "no": "no",
}


@dataclass
class EventRecord:
    id: str
    source: str
    year: int
    date: str
    text_en: str
    text_es: str


def request_json(session: requests.Session, url: str, timeout: int = 45) -> Dict[str, Any]:
    for attempt in range(5):
        try:
            response = session.get(url, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except Exception:
            if attempt == 4:
                raise
            time.sleep(0.7 * (attempt + 1))
    raise RuntimeError("request_json: unexpected path")


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def to_iso_date_from_year(year: int) -> str:
    if year < 0:
        return f"-{abs(year):04d}-01-01"
    return f"{year:04d}-01-01"


def resolve_year_from_row(row: Dict[str, Any]) -> Optional[int]:
    candidates: List[Any] = []
    for key in (
        "year_from",
        "start_year",
        "polity_year_from",
        "peak_year_from",
        "year_to",
        "end_year",
        "polity_year_to",
        "peak_year_to",
    ):
        candidates.append(row.get(key))
    polity = row.get("polity")
    if isinstance(polity, dict):
        candidates.extend([polity.get("start_year"), polity.get("end_year")])
    for candidate in candidates:
        if candidate is None or candidate == "":
            continue
        try:
            value = int(candidate)
        except (TypeError, ValueError):
            continue
        return value
    return None


def prettify_endpoint_label(endpoint_key: str) -> str:
    parts = endpoint_key.split("/", 1)
    slug = parts[1] if len(parts) == 2 else endpoint_key
    return normalize_space(slug.replace("-", " "))


def translate_tokens_to_es(text: str) -> str:
    words = re.split(r"(\W+)", text)
    translated: List[str] = []
    for token in words:
        key = token.lower()
        if key in TOKEN_TRANSLATIONS_ES:
            value = TOKEN_TRANSLATIONS_ES[key]
            translated.append(value)
        else:
            translated.append(token)
    out = "".join(translated)
    out = normalize_space(out)
    if out:
        out = out[0].upper() + out[1:]
    return out


def format_value_en(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and value.is_integer():
            return str(int(value))
        return str(value)
    if isinstance(value, str):
        return normalize_space(value)
    if isinstance(value, dict):
        for key in ("long_name", "name"):
            v = value.get(key)
            if v:
                return normalize_space(v)
        return normalize_space(json.dumps(value, ensure_ascii=True))
    if isinstance(value, list):
        if not value:
            return ""
        rendered: List[str] = []
        for item in value[:4]:
            rendered_value = format_value_en(item)
            if rendered_value:
                rendered.append(rendered_value)
        return normalize_space(", ".join(rendered))
    return normalize_space(str(value))


def format_value_es(value: Any) -> str:
    raw = format_value_en(value)
    if not raw:
        return raw
    return translate_tokens_to_es(raw)


def extract_primary_observation(row: Dict[str, Any]) -> Tuple[str, str]:
    for key, value in row.items():
        if key in META_FIELD_SET:
            continue
        if key.endswith("_id"):
            continue
        if value in (None, "", [], {}):
            continue
        value_en = format_value_en(value)
        if not value_en:
            continue
        value_es = format_value_es(value)
        return value_en, value_es
    return "recorded", "registrado"


def resolve_polity_name(row: Dict[str, Any], polity_by_id: Dict[int, Dict[str, Any]]) -> str:
    polity = row.get("polity")
    if isinstance(polity, dict):
        return normalize_space(polity.get("long_name") or polity.get("name") or "Unknown polity")
    polity_party = row.get("polity_party")
    try:
        polity_id = int(polity_party)
    except (TypeError, ValueError):
        return "Unknown polity"
    polity_info = polity_by_id.get(polity_id) or {}
    return normalize_space(polity_info.get("long_name") or polity_info.get("name") or f"Polity {polity_id}")


def event_from_seshat_row(
    endpoint_key: str,
    row: Dict[str, Any],
    polity_by_id: Dict[int, Dict[str, Any]],
) -> Optional[EventRecord]:
    year = resolve_year_from_row(row)
    if year is None or year < MIN_YEAR or year > MAX_YEAR:
        return None

    polity_name = resolve_polity_name(row, polity_by_id)
    indicator_en = prettify_endpoint_label(endpoint_key)
    indicator_es = translate_tokens_to_es(indicator_en)
    value_en, value_es = extract_primary_observation(row)

    year_from = row.get("year_from")
    year_to = row.get("year_to")
    interval_text_en = ""
    interval_text_es = ""
    if year_from not in (None, "") and year_to not in (None, "") and str(year_from) != str(year_to):
        interval_text_en = f"Between {year_from} and {year_to}, "
        interval_text_es = f"Entre {year_from} y {year_to}, "
    else:
        interval_text_en = f"In {year}, "
        interval_text_es = f"En {year}, "

    text_en = (
        f"{interval_text_en}{polity_name} recorded an observation for "
        f"\"{indicator_en}\": {value_en}."
    )
    text_es = (
        f"{interval_text_es}{polity_name} registro una observacion para "
        f"\"{indicator_es}\": {value_es}."
    )

    row_id = row.get("id")
    if row_id is None:
        return None
    event_id = f"seshat-{endpoint_key.replace('/', '-')}-{row_id}"

    return EventRecord(
        id=event_id,
        source=f"Seshat API:{endpoint_key}",
        year=year,
        date=to_iso_date_from_year(year),
        text_en=normalize_space(text_en),
        text_es=normalize_space(text_es),
    )


def events_from_polity_row(row: Dict[str, Any]) -> List[EventRecord]:
    records: List[EventRecord] = []
    polity_id = row.get("id")
    if polity_id is None:
        return records
    name = normalize_space(row.get("long_name") or row.get("name") or f"Polity {polity_id}")
    start_year = row.get("start_year")
    end_year = row.get("end_year")

    try:
        start_year_i = int(start_year)
    except (TypeError, ValueError):
        start_year_i = None
    try:
        end_year_i = int(end_year)
    except (TypeError, ValueError):
        end_year_i = None

    if start_year_i is not None and MIN_YEAR <= start_year_i <= MAX_YEAR:
        records.append(
            EventRecord(
                id=f"seshat-core-polities-{polity_id}-start",
                source="Seshat API:core/polities",
                year=start_year_i,
                date=to_iso_date_from_year(start_year_i),
                text_en=f"In {start_year_i}, the polity {name} began.",
                text_es=f"En {start_year_i}, comenzo la entidad politica {name}.",
            )
        )
    if end_year_i is not None and MIN_YEAR <= end_year_i <= MAX_YEAR:
        records.append(
            EventRecord(
                id=f"seshat-core-polities-{polity_id}-end",
                source="Seshat API:core/polities",
                year=end_year_i,
                date=to_iso_date_from_year(end_year_i),
                text_en=f"In {end_year_i}, the polity {name} ended.",
                text_es=f"En {end_year_i}, finalizo la entidad politica {name}.",
            )
        )
    return records


def fetch_all_pages(session: requests.Session, url: str, max_records: Optional[int] = None) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    next_url: Optional[str] = url
    while next_url:
        payload = request_json(session, next_url)
        batch = payload.get("results") or []
        out.extend(batch)
        if max_records is not None and len(out) >= max_records:
            return out[:max_records]
        next_url = payload.get("next")
        time.sleep(0.03)
    return out


def select_seshat_endpoints(root: Dict[str, str]) -> List[Tuple[str, str]]:
    selected: List[Tuple[str, str]] = []
    for key, url in root.items():
        if key == "core/polities":
            selected.append((key, url))
            continue
        if key.startswith("general/"):
            if any(fragment in key for fragment in EXCLUDED_SESHAT_GENERAL_ENDPOINT_FRAGMENTS):
                continue
            selected.append((key, url))
            continue
        if key.startswith("wf/"):
            selected.append((key, url))
            continue
    selected.sort(key=lambda item: item[0])
    return selected


def collect_seshat_events(
    session: requests.Session,
    target_count: int,
) -> List[EventRecord]:
    root = request_json(session, SESHAT_API_ROOT)
    endpoint_items = select_seshat_endpoints(root)

    polities_url = root.get("core/polities")
    if not polities_url:
        raise RuntimeError("Missing core/polities endpoint in Seshat API root")
    all_polities = fetch_all_pages(session, polities_url)
    polity_by_id = {
        int(item["id"]): item
        for item in all_polities
        if item.get("id") is not None
    }

    records: List[EventRecord] = []
    seen_ids: set[str] = set()

    for endpoint_key, endpoint_url in endpoint_items:
        rows = fetch_all_pages(session, endpoint_url)
        if endpoint_key == "core/polities":
            for row in rows:
                for record in events_from_polity_row(row):
                    if record.id in seen_ids:
                        continue
                    records.append(record)
                    seen_ids.add(record.id)
                    if len(records) >= target_count:
                        return records
            continue

        for row in rows:
            record = event_from_seshat_row(endpoint_key, row, polity_by_id)
            if not record:
                continue
            if record.id in seen_ids:
                continue
            records.append(record)
            seen_ids.add(record.id)
            if len(records) >= target_count:
                return records
    return records


def iter_gdelt_rows_from_zip_bytes(raw_zip: bytes) -> Iterable[List[str]]:
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as zf:
        members = zf.namelist()
        if not members:
            return
        with zf.open(members[0]) as stream:
            for raw in stream:
                line = raw.decode("utf-8", errors="replace").rstrip("\n")
                if not line:
                    continue
                columns = line.split("\t")
                if len(columns) < 57:
                    continue
                yield columns


def yyyymmdd_to_iso(yyyymmdd: str) -> Optional[str]:
    text = normalize_space(yyyymmdd)
    if not re.fullmatch(r"\d{8}", text):
        return None
    return f"{text[:4]}-{text[4:6]}-{text[6:8]}"


def collect_gdelt_events(
    session: requests.Session,
    target_count: int,
    day_urls: List[str],
) -> List[EventRecord]:
    records: List[EventRecord] = []
    seen_ids: set[str] = set()

    for day_url in day_urls:
        response = session.get(day_url, timeout=120)
        if response.status_code != 200:
            continue
        for cols in iter_gdelt_rows_from_zip_bytes(response.content):
            global_event_id = cols[0].strip()
            sql_date = cols[1].strip()
            actor1 = normalize_space(cols[6])
            actor2 = normalize_space(cols[16])
            event_root = cols[28].strip().zfill(2)

            if not global_event_id or global_event_id in seen_ids:
                continue
            if not actor1:
                continue
            if event_root not in GDELT_ROOT_CODE_EN:
                continue

            iso_date = yyyymmdd_to_iso(sql_date)
            if not iso_date:
                continue
            year = int(iso_date[:4])
            if year < MIN_YEAR or year > MAX_YEAR:
                continue

            relation_en = f" in relation to {actor2}" if actor2 else ""
            relation_es = f" en relacion con {actor2}" if actor2 else ""
            action_en = GDELT_ROOT_CODE_EN[event_root]
            action_es = GDELT_ROOT_CODE_ES[event_root]

            text_en = (
                f"On {iso_date}, {actor1}{relation_en} was involved in an event "
                f"classified as \"{action_en}\"."
            )
            text_es = (
                f"El {iso_date}, {actor1}{relation_es} estuvo implicado en un evento "
                f"clasificado como \"{action_es}\"."
            )

            record = EventRecord(
                id=f"gdelt-{global_event_id}",
                source="GDELT Events",
                year=year,
                date=iso_date,
                text_en=normalize_space(text_en),
                text_es=normalize_space(text_es),
            )
            records.append(record)
            seen_ids.add(global_event_id)
            if len(records) >= target_count:
                return records
    return records


def build_gdelt_day_urls() -> List[str]:
    # Prioritize current year (2026) and recent years to guarantee modern coverage.
    ordered_days = [
        "20260325",
        "20260324",
        "20260323",
        "20260322",
        "20260321",
        "20260320",
        "20260215",
        "20260115",
        "20251215",
        "20251115",
        "20251015",
        "20250915",
        "20250815",
        "20250715",
    ]
    return [f"{GDELT_DAILY_BASE}/{day}.export.CSV.zip" for day in ordered_days]


def assemble_json_payload(events: List[EventRecord], locale: str) -> List[Dict[str, Any]]:
    payload: List[Dict[str, Any]] = []
    for event in events:
        payload.append(
            {
                "id": event.id,
                "source": event.source,
                "year": event.year,
                "date": event.date,
                "text": event.text_es if locale == "es" else event.text_en,
            }
        )
    return payload


def ensure_range_presence(events: List[EventRecord]) -> None:
    years = [event.year for event in events]
    if not years:
        raise RuntimeError("No events generated.")
    if min(years) > -500:
        raise RuntimeError("Generated set does not reach ~500 BCE.")
    if max(years) < 2026:
        raise RuntimeError("Generated set does not reach 2026.")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-total", type=int, default=DEFAULT_TARGET_TOTAL)
    parser.add_argument("--target-seshat", type=int, default=DEFAULT_TARGET_SESHAT)
    parser.add_argument("--target-gdelt", type=int, default=DEFAULT_TARGET_GDELT)
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("output/historical-events-non-wikipedia"),
    )
    args = parser.parse_args()

    target_total = max(1, int(args.target_total))
    target_seshat = max(0, int(args.target_seshat))
    target_gdelt = max(0, int(args.target_gdelt))

    session = requests.Session()
    session.headers.update({"User-Agent": "plataforma-juegos-saas-historical-events/1.0"})

    seshat_events = collect_seshat_events(session, target_seshat)
    gdelt_events = collect_gdelt_events(session, target_gdelt, build_gdelt_day_urls())

    all_events = seshat_events + gdelt_events
    # Fill missing slots with additional Seshat if needed.
    if len(all_events) < target_total:
        missing = target_total - len(all_events)
        extra_seshat = collect_seshat_events(session, target_seshat + missing + 500)
        known = {event.id for event in all_events}
        for event in extra_seshat:
            if event.id in known:
                continue
            all_events.append(event)
            known.add(event.id)
            if len(all_events) >= target_total:
                break

    # Keep exactly target_total, ordered by year then id for stable output.
    all_events.sort(key=lambda event: (event.year, event.id))
    all_events = all_events[:target_total]

    ensure_range_presence(all_events)

    args.out_dir.mkdir(parents=True, exist_ok=True)
    out_es = args.out_dir / "historical_events_es.json"
    out_en = args.out_dir / "historical_events_en.json"
    out_meta = args.out_dir / "metadata.json"

    payload_es = assemble_json_payload(all_events, "es")
    payload_en = assemble_json_payload(all_events, "en")

    out_es.write_text(json.dumps(payload_es, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    out_en.write_text(json.dumps(payload_en, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    years = [event.year for event in all_events]
    metadata = {
        "total_events": len(all_events),
        "range_year_min": min(years),
        "range_year_max": max(years),
        "sources": [
            {
                "name": "Seshat API",
                "url": SESHAT_API_ROOT,
                "events_included": len(seshat_events),
            },
            {
                "name": "GDELT Events",
                "url": f"{GDELT_DAILY_BASE}/",
                "events_included": len(gdelt_events),
                "files_used": build_gdelt_day_urls(),
            },
        ],
        "filters": {
            "min_year": MIN_YEAR,
            "max_year": MAX_YEAR,
        },
    }
    out_meta.write_text(json.dumps(metadata, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    print(json.dumps(
        {
            "out_es": str(out_es),
            "out_en": str(out_en),
            "out_meta": str(out_meta),
            "total_events": len(all_events),
            "range": [min(years), max(years)],
            "seshat_events": len(seshat_events),
            "gdelt_events": len(gdelt_events),
        },
        ensure_ascii=True,
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
