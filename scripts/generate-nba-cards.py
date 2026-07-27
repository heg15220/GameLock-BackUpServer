#!/usr/bin/env python3
"""Genera los cachés de "Draft de Leyendas NBA" desde el dataset del `archive`.

Produce dos ficheros:
  1. cards.generated.json      — leyendas (medias de carrera) para el DRAFT del usuario.
  2. team-seasons.generated.json — equipos REALES de temporadas REALES (nombre y
     plantilla reales) para los rivales del torneo.

Rating (media 50-99): se calcula un Game Score por partido (fórmula de Hollinger,
que usa puntos, tiros, rebotes ofensivos/defensivos, robos, asistencias, tapones,
faltas y pérdidas) con un ajuste suave de era (para no premiar el ritmo inflado de
épocas antiguas) y se mapea de forma ABSOLUTA con una curva de pendiente contenida:
así el 99 queda reservado a una élite mínima y la mayoría cae en una pirámide
realista. Carrera y temporada usan la MISMA curva, para que sean comparables.

Se agregan las estadísticas por (jugador, temporada, equipo) en una sola pasada y de
ahí se derivan tanto la carrera (sumando temporadas) como las plantillas por
temporada. Los agregados se cachean en parquet para reafinar la curva sin releer el
CSV de 389 MB.

Uso:
    python scripts/generate-nba-cards.py [ruta_archive] [--refresh] [--slope S] [--base B]
"""

import argparse
import json
import os
import sys
import tempfile
from collections import defaultdict

import numpy as np
import pandas as pd

# Columnas del box score necesarias.
STAT_COLS = [
    "personId", "playerteamId", "playerteamCity", "playerteamName", "gameDate",
    "numMinutes", "points", "assists", "blocks", "steals",
    "fieldGoalsAttempted", "fieldGoalsMade",
    "threePointersAttempted", "threePointersMade",
    "freeThrowsAttempted", "freeThrowsMade",
    "reboundsDefensive", "reboundsOffensive", "reboundsTotal",
    "turnovers", "foulsPersonal", "win",
]
NUMERIC_MAP = {
    "numMinutes": "min", "points": "pts", "assists": "ast", "blocks": "blk",
    "steals": "stl", "fieldGoalsAttempted": "fga", "fieldGoalsMade": "fgm",
    "threePointersAttempted": "tpa", "threePointersMade": "tpm",
    "freeThrowsAttempted": "fta", "freeThrowsMade": "ftm",
    "reboundsDefensive": "rdef", "reboundsOffensive": "roff",
    "reboundsTotal": "rtot", "turnovers": "tov", "foulsPersonal": "pf", "win": "win",
}
SUM_KEYS = list(NUMERIC_MAP.values())

DECADE_LABELS = {
    1940: "40s", 1950: "50s", 1960: "60s", 1970: "70s", 1980: "80s",
    1990: "90s", 2000: "2000s", 2010: "2010s", 2020: "2020s",
}

# Curva de rating (ver docstring). overall = clip(BASE + SLOPE * gmsc, 40, 99).
# Calibrado para que el 99 quede reservado a ~3 leyendas y ~8 lleguen a 95+.
DEFAULT_BASE = 49.5
DEFAULT_SLOPE = 2.12

MIN_CAREER_GAMES = 200      # pool de leyendas drafteables
MIN_SEASON_GAMES = 20       # para entrar en la plantilla de una temporada
MIN_TEAM_TOP_GAMES = 45     # el jugador con más partidos marca "temporada completa"
MIN_TEAM_ROSTER = 8         # jugadores mínimos para que la temporada sea usable
MAX_TEAM_ROSTER = 10
MIN_SEASON_YEAR = 1955


def season_end_year(date_str):
    # La temporada NBA cruza dos años; se etiqueta por el año de FIN (oct→ año+1).
    y = int(date_str[0:4]); m = int(date_str[5:7])
    return y + 1 if m >= 10 else y


def aggregate(stats_path):
    """Agrega por (personId, seasonEndYear, teamId). Vectorizado por chunks."""
    sums = None
    names = {}  # (season, teamId) -> "City Name"
    reader = pd.read_csv(stats_path, usecols=STAT_COLS, chunksize=500_000, low_memory=False)
    seen = 0
    for chunk in reader:
        chunk = chunk[pd.to_numeric(chunk["personId"], errors="coerce").notna()].copy()
        chunk = chunk[chunk["gameDate"].astype(str).str.len() >= 7]
        chunk["personId"] = pd.to_numeric(chunk["personId"]).astype("int64")
        chunk["teamId"] = pd.to_numeric(chunk["playerteamId"], errors="coerce").fillna(0).astype("int64")
        ds = chunk["gameDate"].astype(str)
        yr = pd.to_numeric(ds.str.slice(0, 4), errors="coerce").fillna(0).astype(int)
        mo = pd.to_numeric(ds.str.slice(5, 7), errors="coerce").fillna(1).astype(int)
        chunk["season"] = np.where(mo >= 10, yr + 1, yr).astype(int)
        for col in NUMERIC_MAP:
            chunk[col] = pd.to_numeric(chunk[col], errors="coerce").fillna(0.0)
        num = chunk.rename(columns=NUMERIC_MAP)
        g = num.groupby(["personId", "season", "teamId"])[SUM_KEYS].sum()
        g["games"] = num.groupby(["personId", "season", "teamId"]).size()
        sums = g if sums is None else sums.add(g, fill_value=0)

        nm = (chunk["playerteamCity"].fillna("").astype(str) + " "
              + chunk["playerteamName"].fillna("").astype(str)).str.strip()
        for (season, teamId), name in zip(zip(chunk["season"], chunk["teamId"]), nm):
            if name and (season, teamId) not in names:
                names[(int(season), int(teamId))] = name
        seen += len(chunk)
        print(f"  ...{seen:,} filas", file=sys.stderr)

    sums = sums.reset_index()
    return sums, names


def load_players(players_path):
    cols = ["personId", "firstName", "lastName", "guard", "forward", "center", "heightInches"]
    df = pd.read_csv(players_path, usecols=cols).fillna(
        {"firstName": "", "lastName": "", "guard": 0, "forward": 0, "center": 0, "heightInches": 0})
    out = {}
    for r in df.itertuples(index=False):
        out[int(r.personId)] = {
            "name": f"{r.firstName} {r.lastName}".strip(),
            "guard": int(r.guard or 0), "forward": int(r.forward or 0),
            "center": int(r.center or 0), "height": float(r.heightInches or 0),
        }
    return out


def per_game_frame(df):
    """Añade columnas por-partido, Game Score y atributos a un DataFrame de sumas."""
    g = df["games"].clip(lower=1)
    pg = pd.DataFrame({"games": df["games"]})
    for k in ["pts", "ast", "blk", "stl", "tov", "pf", "min", "rtot", "rdef", "roff"]:
        pg[k + "pg"] = df[k] / g
    pg["fgp"] = np.where(df["fga"] > 0, df["fgm"] / df["fga"], 0.0)
    pg["tpp"] = np.where(df["tpa"] > 0, df["tpm"] / df["tpa"], 0.0)
    pg["ftp"] = np.where(df["fta"] > 0, df["ftm"] / df["fta"], 0.0)
    pg["tpapg"] = df["tpa"] / g
    pg["fgmpg"] = df["fgm"] / g
    pg["fgapg"] = df["fga"] / g
    pg["ftapg"] = df["fta"] / g
    pg["ftmpg"] = df["ftm"] / g
    # Game Score de Hollinger (por partido). Crédito de rebote basado en el TOTAL
    # (0.3·total + 0.4·ofensivos) para que los jugadores anteriores a 1974 —cuyo
    # desglose ofensivo/defensivo no se registró— reciban igualmente su rebote.
    reb_credit = 0.3 * pg["rtotpg"] + 0.4 * pg["roffpg"]
    pg["gmsc"] = (
        pg["ptspg"] + 0.4 * pg["fgmpg"] - 0.7 * pg["fgapg"]
        - 0.4 * (pg["ftapg"] - pg["ftmpg"]) + reb_credit
        + pg["stlpg"] + 0.7 * pg["astpg"] + 0.7 * pg["blkpg"]
        - 0.4 * pg["pfpg"] - pg["tovpg"]
    )
    return pg


def attributes_frame(pg):
    clip = np.clip
    anot = clip(38 + pg["ptspg"] * 1.9 + (pg["fgp"] - 0.45) * 70, 25, 99)
    volw = clip(pg["tpapg"] / 2.0, 0, 1)
    tiro3 = clip(28 + (pg["tpp"] - 0.30) * 130 * volw + clip(pg["tpapg"], 0, 8) * 3.2, 15, 99)
    pase = clip(42 + pg["astpg"] * 5.8, 25, 99)
    rebote = clip(34 + pg["rtotpg"] * 4.4, 25, 99)
    dint = clip(40 + pg["blkpg"] * 12 + pg["rdefpg"] * 2.3, 25, 99)
    dext = clip(42 + pg["stlpg"] * 21, 25, 99)
    tlibre = np.where(pg["ftp"] > 0, clip(30 + pg["ftp"] * 68, 25, 99), 55)
    return pd.DataFrame({
        "anotacion": anot.round(), "tiro3": tiro3.round(), "pase": pase.round(),
        "rebote": rebote.round(), "defInterior": dint.round(),
        "defExterior": dext.round(), "tiroLibre": tlibre.round(),
    }).astype(int)


def role_of(guard, forward, center, height, apg, rpg):
    if not (guard or forward or center):
        if height and height < 78: guard = 1
        elif height and height > 82: center = 1
        else: forward = 1
    if center and not guard:
        return "PIVOT"
    if guard and not forward and not center:
        return "BASE" if apg >= 4.0 else "ESCOLTA"
    if forward:
        return "ALA_PIVOT" if (height >= 82 or rpg >= 7.5) else "ALERO"
    return "ESCOLTA" if guard else "ALERO"


def build(archive, out_dir, base, slope, refresh):
    cache = os.path.join(tempfile.gettempdir(), "nba_agg_cache.pkl")
    names_cache = os.path.join(tempfile.gettempdir(), "nba_names_cache.json")
    if not refresh and os.path.exists(cache) and os.path.exists(names_cache):
        print("Usando agregados cacheados...", file=sys.stderr)
        sums = pd.read_pickle(cache)
        with open(names_cache, encoding="utf-8") as f:
            names = {tuple(map(int, k.split("|"))): v for k, v in json.load(f).items()}
    else:
        print("Agregando box scores (tarda por el tamaño del CSV)...", file=sys.stderr)
        sums, names = aggregate(os.path.join(archive, "PlayerStatistics.csv"))
        # Caché local propia (la escribimos y leemos nosotros en el temp del SO);
        # no es entrada de terceros, así que el pickle es seguro aquí.
        sums.to_pickle(cache)
        with open(names_cache, "w", encoding="utf-8") as f:
            json.dump({f"{s}|{t}": n for (s, t), n in names.items()}, f, ensure_ascii=False)

    players = load_players(os.path.join(archive, "Players.csv"))

    # ── Carrera (suma de temporadas) ──
    career = sums.groupby("personId")[SUM_KEYS + ["games"]].sum().reset_index()
    # Década = la del año con más partidos.
    year_games = sums.groupby(["personId", "season"])["games"].sum().reset_index()
    idx = year_games.groupby("personId")["games"].idxmax()
    peak_year = year_games.loc[idx].set_index("personId")["season"]
    career["decade"] = career["personId"].map(lambda p: int(peak_year.get(p, 2000)) // 10 * 10)
    cpg = per_game_frame(career)

    def overall_series(pg):
        # Mapeo ABSOLUTO del Game Score a media 50-99, con pendiente contenida para
        # que el 99 quede reservado a una élite mínima. Sin ajuste de era: se apoya
        # en el crédito de rebote corregido para que las épocas antiguas sean justas.
        ov = base + slope * pg["gmsc"].values
        return np.clip(np.round(ov), 40, 99).astype(int)

    career["overall"] = overall_series(cpg)
    cattr = attributes_frame(cpg)

    # ── Cartas de leyenda (draft del usuario) ──
    cards = []
    for i, row in career.iterrows():
        if row["games"] < MIN_CAREER_GAMES:
            continue
        meta = players.get(int(row["personId"]))
        if not meta or not meta["name"]:
            continue
        pg = cpg.loc[i]
        role = role_of(meta["guard"], meta["forward"], meta["center"], meta["height"],
                       pg["astpg"], pg["rtotpg"])
        dec = int(row["decade"])
        cards.append({
            "id": int(row["personId"]), "name": meta["name"], "decade": dec,
            "decadeLabel": DECADE_LABELS.get(dec, f"{dec}s"), "role": role,
            "height": round(meta["height"]), "games": int(row["games"]),
            "overall": int(row["overall"]),
            "attrs": {k: int(cattr.loc[i, k]) for k in cattr.columns},
            "stats": stat_block(pg),
        })
    cards.sort(key=lambda c: (-c["overall"], c["name"]))

    # ── Plantillas por temporada (equipos reales) ──
    season = sums[(sums["season"] >= MIN_SEASON_YEAR) & (sums["teamId"] > 0)].reset_index(drop=True)
    spg = per_game_frame(season)
    season["decade"] = (season["season"] // 10 * 10).astype(int)
    season["overall"] = overall_series(spg)
    sattr = attributes_frame(spg)

    team_seasons = []
    for (yr, tid), grp in season.groupby(["season", "teamId"]):
        name = names.get((int(yr), int(tid)))
        if not name:
            continue
        # Titulares = mayor minutaje POR PARTIDO (entre los de suficientes partidos).
        rows = grp.assign(_mpg=grp["min"] / grp["games"].clip(lower=1)).sort_values(
            "_mpg", ascending=False)
        elig = rows[rows["games"] >= MIN_SEASON_GAMES]
        if len(elig) < MIN_TEAM_ROSTER or elig["games"].max() < MIN_TEAM_TOP_GAMES:
            continue
        roster = []
        for i, r in elig.head(MAX_TEAM_ROSTER).iterrows():
            meta = players.get(int(r["personId"]))
            if not meta or not meta["name"]:
                continue
            pg = spg.loc[i]
            roster.append({
                "id": int(r["personId"]), "name": meta["name"],
                "role": role_of(meta["guard"], meta["forward"], meta["center"],
                                meta["height"], pg["astpg"], pg["rtotpg"]),
                "overall": int(r["overall"]),
                "min": round(float(pg["minpg"]), 1),
                # El motor solo necesita attrs; se omiten stats de exhibición para
                # aligerar el JSON (miles de temporadas-equipo).
                "attrs": {k: int(sattr.loc[i, k]) for k in sattr.columns},
            })
        if len(roster) < MIN_TEAM_ROSTER:
            continue
        team_seasons.append({
            "key": f"{yr}-{tid}", "season": int(yr),
            "label": f"{yr - 1}-{str(yr)[2:]}", "name": name,
            "rating": round(float(np.mean([p["overall"] for p in roster[:8]]))),
            "players": roster,
        })
    team_seasons.sort(key=lambda ts: (-ts["season"], ts["name"]))

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "cards.generated.json"), "w", encoding="utf-8") as f:
        json.dump({"count": len(cards), "minGames": MIN_CAREER_GAMES,
                   "decades": sorted({c["decade"] for c in cards}), "cards": cards},
                  f, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(out_dir, "team-seasons.generated.json"), "w", encoding="utf-8") as f:
        json.dump({"count": len(team_seasons), "teams": team_seasons},
                  f, ensure_ascii=False, separators=(",", ":"))

    report(cards, team_seasons, out_dir)


def stat_block(pg):
    return {
        "ppg": round(float(pg["ptspg"]), 1), "rpg": round(float(pg["rtotpg"]), 1),
        "apg": round(float(pg["astpg"]), 1), "spg": round(float(pg["stlpg"]), 1),
        "bpg": round(float(pg["blkpg"]), 1), "fgp": round(float(pg["fgp"]), 3),
        "tpp": round(float(pg["tpp"]), 3),
    }


def report(cards, team_seasons, out_dir):
    print(f"\nLeyendas: {len(cards):,} · Temporadas-equipo: {len(team_seasons):,}", file=sys.stderr)
    print(f"Salida en {out_dir}", file=sys.stderr)
    # Histograma de medias (leyendas).
    buckets = defaultdict(int)
    for c in cards:
        buckets[c["overall"] // 5 * 5] += 1
    print("Distribución de medias (leyendas):", file=sys.stderr)
    for b in sorted(buckets, reverse=True):
        print(f"  {b:>3}-{b+4}: {buckets[b]:4d} {'#'*(buckets[b]//6)}", file=sys.stderr)
    n99 = sum(1 for c in cards if c["overall"] >= 99)
    n95 = sum(1 for c in cards if c["overall"] >= 95)
    n90 = sum(1 for c in cards if c["overall"] >= 90)
    print(f"  99: {n99} · 95+: {n95} · 90+: {n90}", file=sys.stderr)
    print("Top 15:", file=sys.stderr)
    for c in cards[:15]:
        print(f"  {c['overall']}  {c['name']:24s} {c['role']:10s} {c['decadeLabel']:5s} "
              f"{c['stats']['ppg']}p {c['stats']['rpg']}r {c['stats']['apg']}a", file=sys.stderr)
    strong = sorted(team_seasons, key=lambda t: -t["rating"])[:8]
    print("Mejores temporadas-equipo:", file=sys.stderr)
    for ts in strong:
        star = max(ts["players"], key=lambda p: p["overall"])
        print(f"  {ts['rating']}  {ts['label']} {ts['name']:26s} · {star['name']} {star['overall']}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    default_archive = os.environ.get("NBA_ARCHIVE", r"C:\Users\hugoe\Downloads\archive")
    ap.add_argument("archive", nargs="?", default=default_archive)
    ap.add_argument("--refresh", action="store_true", help="reagrega desde el CSV (ignora la caché)")
    ap.add_argument("--base", type=float, default=DEFAULT_BASE)
    ap.add_argument("--slope", type=float, default=DEFAULT_SLOPE)
    here = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(here, "..", "src", "games", "sports", "nba-legends-draft", "data")
    args = ap.parse_args()
    build(args.archive, out_dir, args.base, args.slope, args.refresh)


if __name__ == "__main__":
    main()
