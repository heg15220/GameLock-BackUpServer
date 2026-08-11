#!/usr/bin/env python3
"""
Find mirrored crests that are photographs rather than badges.

The fetch resolves a club by asking Wikipedia for a title, and for a club named after its
city that title is sometimes the CITY. The article is real, the infobox image is real, and
nothing downstream can tell - so Burgos CF got an aerial view of Burgos, Bahia got the
Salvador waterfront and Liverpool de Montevideo got a portrait of Luis Suarez. Every one of
them sailed past the filename filters, because a filename says nothing about what is inside
the file.

What separates them is flatness. A badge is a handful of flat colours with a transparent or
single-colour ground; a photograph has no flat region anywhere in it. Scoring that is one
number:

    flat = transparent share + (opaque share x share of the largest single colour)

On the current mirror the nine photographs all score under 0.08 and the lowest real crest
scores 0.34, which is not a threshold that needs tuning - it is a gap with nothing in it.

    python scripts/audit-football-crests.py            # crests, the usual case
    python scripts/audit-football-crests.py --bucket competitions
    python scripts/audit-football-crests.py --all      # score everything, not just suspects

This only nominates. Whether a logo is the RIGHT logo is a judgement no score can make, so
confirm by eye, then add the SHA-256 to scripts/data/football-asset-rejects.json with a note
saying what the picture actually is. Both the fetch and the world build read that file.
"""

import argparse
import hashlib
import json
import os
import sys

try:
    from PIL import Image
except ImportError:  # noqa: BLE001 - the only dependency, and it is not worth a crash
    sys.exit("this script needs Pillow: python -m pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "public", "assets", "football")
REJECTS = os.path.join(ROOT, "scripts", "data", "football-asset-rejects.json")

# Where the gap sits on the current mirror, with room on both sides of it. Anything under
# this is worth a look; nothing under it has yet turned out to be a real badge.
SUSPECT = 0.2


def flatness(path):
    """0 for a photograph, towards 1 for a badge. None if it is not a raster at all."""
    image = Image.open(path).convert("RGBA")
    # Scoring a thumbnail rather than the full image: the answer is about how the colours
    # are distributed, which survives the resample, and it keeps a 1000px crest cheap.
    image.thumbnail((120, 120))
    pixels = list(image.getdata())
    if not pixels:
        return None

    clear = sum(1 for pixel in pixels if pixel[3] < 32) / len(pixels)
    # Quantised to 4 bits a channel, so the anti-aliasing along a badge's edges does not
    # read as a thousand different colours and score it as a photograph.
    counts = {}
    for red, green, blue, alpha in pixels:
        if alpha < 32:
            continue
        key = (red >> 4, green >> 4, blue >> 4)
        counts[key] = counts.get(key, 0) + 1
    if not counts:
        return 1.0
    top = max(counts.values()) / sum(counts.values())
    return clear + (1 - clear) * top


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", default="crests", choices=["crests", "competitions", "trophies", "flags"])
    parser.add_argument("--all", action="store_true", help="print every file, not just the suspects")
    args = parser.parse_args()

    directory = os.path.join(ASSETS, args.bucket)
    if not os.path.isdir(directory):
        sys.exit(f"nothing mirrored at {os.path.relpath(directory, ROOT)}")

    never, misfiled = set(), {}
    if os.path.exists(REJECTS):
        with open(REJECTS, encoding="utf-8") as handle:
            data = json.load(handle)
        never = set(data["sha256"])
        misfiled = {k: v["sha256"] for k, v in data.get("misfiled", {}).items()}

    scored = []
    skipped = 0
    for name in sorted(os.listdir(directory)):
        path = os.path.join(directory, name)
        # An SVG is a drawing by construction; there is no photograph to find in one.
        if name.startswith(".") or name.lower().endswith(".svg"):
            continue
        blob = open(path, "rb").read()
        digest = hashlib.sha256(blob).hexdigest()
        key = f"{args.bucket}/{os.path.splitext(name)[0]}"
        if digest in never or misfiled.get(key) == digest:
            skipped += 1
            continue
        try:
            score = flatness(path)
        except Exception as err:  # noqa: BLE001 - an unreadable file is itself a finding
            print(f"{'?':>6}  {name}  ({err})")
            continue
        if score is not None:
            scored.append((score, name, digest))

    scored.sort()
    shown = scored if args.all else [row for row in scored if row[0] < SUSPECT]

    for score, name, digest in shown:
        print(f"{score:6.3f}  {name}\n        {digest}")

    print(
        f"\n{len(scored)} rasters scored in {args.bucket}"
        f" ({skipped} already rejected, {len(shown)} shown)"
    )
    if not args.all and shown:
        print(f"look at each one, then add the digests to {os.path.relpath(REJECTS, ROOT)}")


if __name__ == "__main__":
    main()
