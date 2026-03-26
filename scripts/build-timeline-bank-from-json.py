#!/usr/bin/env python3
"""
Build `src/games/knowledge/timelineEventBank.generated.js` from bilingual JSON files.

Input JSON shape (both files must align by index/id/date/year):
[
  { "id": "...", "source": "...", "year": 2026, "date": "2026-03-25", "text": "..." },
  ...
]
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List


ES_PREFIX_PATTERNS = [
    re.compile(r"^En\s+-?\d{1,6},\s*", re.IGNORECASE),
    re.compile(r"^Entre\s+-?\d{1,6}\s+y\s+-?\d{1,6},\s*", re.IGNORECASE),
    re.compile(r"^El\s+\d{4}-\d{2}-\d{2},\s*", re.IGNORECASE),
]

EN_PREFIX_PATTERNS = [
    re.compile(r"^In\s+-?\d{1,6},\s*", re.IGNORECASE),
    re.compile(r"^Between\s+-?\d{1,6}\s+and\s+-?\d{1,6},\s*", re.IGNORECASE),
    re.compile(r"^On\s+\d{4}-\d{2}-\d{2},\s*", re.IGNORECASE),
]

WAR_KEYWORDS = [
    "war",
    "fight",
    "assault",
    "mass violence",
    "force posture",
    "coercion",
    "combat",
    "guerra",
    "combate",
    "asalto",
    "violencia masiva",
    "coaccion",
]


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def strip_date_prefix(text: str, patterns: List[re.Pattern[str]]) -> str:
    out = normalize_space(text)
    for pattern in patterns:
        out = pattern.sub("", out)
    out = normalize_space(out).rstrip(".")
    if out:
        out = out[0].upper() + out[1:]
    return out


def infer_tags(event_id: str, source: str, title_es: str, title_en: str) -> List[str]:
    source_l = normalize_space(source).lower()
    text_l = f"{title_es} {title_en} {source_l}".lower()
    tags = {"geopolitics", "politics"}
    if "seshat" in source_l:
        tags.add("rights")
    if "gdelt" in source_l and "aid action" in text_l:
        tags.add("economy")
    if any(keyword in text_l for keyword in WAR_KEYWORDS):
        tags.add("war")
    if "protest" in text_l or "protesta" in text_l:
        tags.add("rights")
    # Keep deterministic order for stable diffs.
    tag_order = ["geopolitics", "politics", "rights", "war", "economy"]
    return [tag for tag in tag_order if tag in tags]


def ensure_alignment(es_rows: List[Dict[str, Any]], en_rows: List[Dict[str, Any]]) -> None:
    if len(es_rows) != len(en_rows):
        raise ValueError(f"Different lengths: es={len(es_rows)}, en={len(en_rows)}")
    for index, (es_row, en_row) in enumerate(zip(es_rows, en_rows)):
        for key in ("id", "year", "date"):
            if es_row.get(key) != en_row.get(key):
                raise ValueError(
                    f"Row {index} mismatch in '{key}': es={es_row.get(key)!r}, en={en_row.get(key)!r}"
                )


def write_js_module(out_path: Path, events: List[Dict[str, Any]]) -> None:
    lines: List[str] = [
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
            + json.dumps(event["title_es"], ensure_ascii=True)
            + ", "
            + json.dumps(event["title_en"], ensure_ascii=True)
            + ", "
            + json.dumps(event["summary_es"], ensure_ascii=True)
            + ", "
            + json.dumps(event["summary_en"], ensure_ascii=True)
            + "),"
        )
    lines.append("];")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_meta(meta_path: Path, payload: Dict[str, Any]) -> None:
    meta_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input-es",
        type=Path,
        default=Path("output/historical-events-non-wikipedia/historical_events_es.json"),
    )
    parser.add_argument(
        "--input-en",
        type=Path,
        default=Path("output/historical-events-non-wikipedia/historical_events_en.json"),
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("src/games/knowledge/timelineEventBank.generated.js"),
    )
    parser.add_argument(
        "--meta-out",
        type=Path,
        default=Path("src/games/knowledge/timelineEventBank.generated.meta.json"),
    )
    args = parser.parse_args()

    es_rows = json.loads(args.input_es.read_text(encoding="utf-8"))
    en_rows = json.loads(args.input_en.read_text(encoding="utf-8"))
    ensure_alignment(es_rows, en_rows)

    events: List[Dict[str, Any]] = []
    for es_row, en_row in zip(es_rows, en_rows):
        event_id = str(es_row["id"])
        source = str(es_row.get("source") or en_row.get("source") or "")
        year = int(es_row["year"])

        title_es = strip_date_prefix(str(es_row.get("text") or ""), ES_PREFIX_PATTERNS)
        title_en = strip_date_prefix(str(en_row.get("text") or ""), EN_PREFIX_PATTERNS)
        if not title_es:
            title_es = f"Hecho historico registrado ({event_id})"
        if not title_en:
            title_en = f"Recorded historical event ({event_id})"

        summary_es = normalize_space(f"Fuente: {source}.")
        summary_en = normalize_space(f"Source: {source}.")
        tags = infer_tags(event_id, source, title_es, title_en)

        events.append(
            {
                "id": event_id,
                "year": year,
                "tags": tags,
                "title_es": title_es,
                "title_en": title_en,
                "summary_es": summary_es,
                "summary_en": summary_en,
            }
        )

    events.sort(key=lambda item: (item["year"], item["id"]))

    args.out.parent.mkdir(parents=True, exist_ok=True)
    write_js_module(args.out, events)

    years = [event["year"] for event in events]
    metadata = {
        "source_kind": "non-wikipedia-json-conversion",
        "input_es": str(args.input_es),
        "input_en": str(args.input_en),
        "total_generated_events": len(events),
        "year_range": {"min": min(years), "max": max(years)},
        "notes": [
            "Events built from local bilingual JSON files.",
            "Date prefixes were removed from titles to avoid exposing the answer year in gameplay.",
        ],
    }
    write_meta(args.meta_out, metadata)

    print(
        json.dumps(
            {
                "out": str(args.out),
                "meta_out": str(args.meta_out),
                "count": len(events),
                "year_min": min(years),
                "year_max": max(years),
            },
            ensure_ascii=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
