#!/usr/bin/env python3
"""Extract dated player/club observations from DFL-authorized IDSSE metadata.

Research output only: a matchday squad does not establish season-start membership.
The script deliberately never downloads the multi-gigabyte tracking files.
"""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen
import xml.etree.ElementTree as ET

ARTICLE = "https://api.figshare.com/v2/articles/28196177"
LICENSE = "https://creativecommons.org/licenses/by/4.0/"
POSITIONS = {"TW": "GK", "IV": "DEF", "IVL": "DEF", "IVR": "DEF", "LV": "DEF", "RV": "DEF",
             "DML": "MID", "DMR": "MID", "DMZ": "MID", "ZML": "MID", "ZMR": "MID", "ZM": "MID",
             "ZO": "MID", "OLM": "MID", "ORM": "MID", "OM": "MID", "LM": "MID", "RM": "MID",
             "STZ": "FWD", "STL": "FWD", "STR": "FWD", "LA": "FWD", "RA": "FWD", "HL": "FWD", "HR": "FWD"}


def parse_match(raw, source):
    root = ET.fromstring(raw)
    general = root.find("./MatchInformation/General")
    if general is None or not general.get("KickoffTime"):
        raise ValueError("Missing played match date")
    date = general.attrib["KickoffTime"][:10]
    records = []
    for team in root.findall("./MatchInformation/Teams/Team"):
        for player in team.findall("./Players/Player"):
            position = player.get("PlayingPosition")
            records.append({
                "identityNamespace": "dfl", "identityId": player.attrib["PersonId"],
                "name": " ".join(filter(None, [player.get("FirstName"), player.get("LastName")])),
                "clubIdentity": team.attrib["TeamId"], "clubName": team.attrib["TeamName"],
                "observedDate": date, "season": general.attrib["Season"],
                "competition": general.attrib["CompetitionName"], "matchId": general.attrib["MatchId"],
                "starting": player.get("Starting") == "true", "shirtNumber": int(player.attrib["ShirtNumber"]),
                "sourcePosition": position, "position": POSITIONS.get(position),
                "precision": "matchday-observation", "source": source,
            })
    if len({(r["identityId"], r["clubIdentity"]) for r in records}) != len(records):
        raise ValueError("Duplicate participant in match")
    return records


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--output", default="output/manager-v12/new-sources")
    args = parser.parse_args()
    directory = Path(args.output)
    directory.mkdir(parents=True, exist_ok=True)

    def cached(name, url):
        path = directory / name
        if not path.exists():
            if args.offline:
                raise FileNotFoundError(path)
            with urlopen(url, timeout=40) as response:
                path.write_bytes(response.read())
        return path.read_bytes()

    metadata = json.loads(cached("idsse-metadata.json", ARTICLE))
    if metadata.get("license", {}).get("url") != LICENSE:
        raise ValueError("Unexpected dataset license: review source before using")
    files = [f for f in metadata["files"] if f["name"].startswith("DFL_02_01_matchinformation_")]
    records, evidence = [], []
    for file in files:
        if file["size"] > 100000 or not file["name"].endswith(".xml"):
            raise ValueError("Unexpected metadata file size or type")
        raw = cached(file["name"], file["download_url"])
        if hashlib.md5(raw).hexdigest() != file["computed_md5"]:
            raise ValueError("Source checksum mismatch")
        records.extend(parse_match(raw, file["download_url"]))
        evidence.append({"file": file["name"], "source": file["download_url"], "sha256": hashlib.sha256(raw).hexdigest()})
    archive = {
        "schemaVersion": 1, "license": "CC-BY-4.0", "licenseUrl": LICENSE,
        "source": "https://doi.org/10.6084/m9.figshare.28196177", "articleVersion": metadata.get("version"),
        "attribution": "Deutsche Fußball Liga (DFL); Bassek, Rein, Weber and Memmert (2025), doi:10.1038/s41597-025-04505-y",
        "modifications": "Match metadata normalized into dated player/club observations; known tactical positions grouped; unknown positions retained as null.",
        "scope": "dated-matchday-squads", "completeSeasonRoster": False,
        "limitations": ["No season-start affiliation inferred", "No dates of birth or nationality in these actas", "Bench positions may be absent", "Provider IDs are namespaced and require independent identity reconciliation"],
        "evidence": evidence, "observations": records,
    }
    (directory / "dfl-matchday-evidence.json").write_text(json.dumps(archive, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = {"matches": len(files), "clubs": len({r["clubIdentity"] for r in records}),
               "players": len({r["identityId"] for r in records}), "observations": len(records),
               "dates": sorted({r["observedDate"] for r in records}), "missingPosition": sum(r["position"] is None for r in records)}
    (directory / "dfl-summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
