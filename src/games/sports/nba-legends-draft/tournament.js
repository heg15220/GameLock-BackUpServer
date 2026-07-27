// Draft de Leyendas NBA — torneo. Temporada regular a una vuelta (todos contra
// todos) y playoffs formato NBA: 2 conferencias de 8, series al mejor de 7,
// sembrado por récord. Puro y testeable; la UI orquesta qué partidos ve el usuario
// (con play-by-play) y cuáles se auto-simulan al instante.

import { quickResult } from "./simulation.js";

export const TEAMS_PER_CONF = 8;
export const CONF_COUNT = 2;
export const TOTAL_TEAMS = TEAMS_PER_CONF * CONF_COUNT; // 16
export const SERIES_TO_WIN = 4; // al mejor de 7

const mix = (...ns) => {
  let h = 0x811c9dc5 >>> 0;
  for (const n of ns) {
    h ^= n >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};

// ─── Liga ─────────────────────────────────────────────────────────────────────
export function buildLeague(userTeam, cpuTeams) {
  const teams = [userTeam, ...cpuTeams].slice(0, TOTAL_TEAMS);
  const conf = {};
  teams.forEach((t, i) => {
    conf[t.id] = i < TEAMS_PER_CONF ? 0 : 1;
  });
  const games = [];
  let gid = 0;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i];
      const b = teams[j];
      games.push({
        id: gid++,
        homeId: a.id,
        awayId: b.id,
        isUser: a.id === userTeam.id || b.id === userTeam.id,
        result: null,
      });
    }
  }
  return {
    teams,
    byId: new Map(teams.map((t) => [t.id, t])),
    conf,
    userId: userTeam.id,
    games,
    stage: "regular",
    playoffs: null,
  };
}

export function gameSeed(game) {
  return mix(game.id, game.homeId, game.awayId);
}

// Registra el resultado de un partido (result de simulateGame: A=local, B=visitante).
export function recordGame(game, result) {
  game.result = {
    scoreHome: result.scoreA,
    scoreAway: result.scoreB,
    winnerId: result.winner === "A" ? game.homeId : game.awayId,
  };
  return game.result;
}

// Auto-simula al instante un partido concreto.
export function playGameInstant(league, game) {
  const home = league.byId.get(game.homeId);
  const away = league.byId.get(game.awayId);
  return recordGame(game, quickResult(home, away, gameSeed(game)));
}

// Auto-simula todos los partidos que el usuario NO juega.
export function simulateNonUserGames(league) {
  for (const g of league.games) {
    if (!g.result && !g.isUser) playGameInstant(league, g);
  }
}

export function userGames(league) {
  return league.games.filter((g) => g.isUser);
}

export function allRegularSeasonPlayed(league) {
  return league.games.every((g) => g.result);
}

// ─── Clasificación ────────────────────────────────────────────────────────────
export function standings(league) {
  const rec = new Map(
    league.teams.map((t) => [t.id, { team: t, w: 0, l: 0, pf: 0, pa: 0 }]),
  );
  for (const g of league.games) {
    if (!g.result) continue;
    const h = rec.get(g.homeId);
    const a = rec.get(g.awayId);
    h.pf += g.result.scoreHome;
    h.pa += g.result.scoreAway;
    a.pf += g.result.scoreAway;
    a.pa += g.result.scoreHome;
    if (g.result.winnerId === g.homeId) {
      h.w += 1;
      a.l += 1;
    } else {
      a.w += 1;
      h.l += 1;
    }
  }
  const byConf = [[], []];
  for (const r of rec.values()) {
    byConf[league.conf[r.team.id]].push({ ...r, diff: r.pf - r.pa });
  }
  byConf.forEach((list) => list.sort((x, y) => y.w - x.w || y.diff - x.diff));
  return byConf;
}

// ─── Playoffs ─────────────────────────────────────────────────────────────────
// Orden de emparejamiento por conferencia: 1-8, 4-5, 3-6, 2-7 (mantiene 1 y 2 en
// ramas opuestas). Índices 0-based sobre la clasificación ordenada.
const BRACKET_PAIRS = [
  [0, 7],
  [3, 4],
  [2, 5],
  [1, 6],
];

function makeSeries(round, conf, hi, lo, userId) {
  return {
    id: mix(round, conf, hi.team.id, lo.team.id),
    round,
    conf,
    hiId: hi.team.id,
    loId: lo.team.id,
    hiSeed: hi.seed,
    loSeed: lo.seed,
    winsHi: 0,
    winsLo: 0,
    games: [],
    winnerId: null,
    winnerSeed: null,
    isUser: hi.team.id === userId || lo.team.id === userId,
  };
}

export function startPlayoffs(league) {
  const sd = standings(league);
  // Rango global (para desempatar cruces de conferencia en la final).
  const globalRank = new Map();
  const all = [...sd[0], ...sd[1]].sort((x, y) => y.w - x.w || y.diff - x.diff);
  all.forEach((r, i) => globalRank.set(r.team.id, i));

  const round0 = [];
  for (let c = 0; c < CONF_COUNT; c++) {
    const seeded = sd[c].map((r, i) => ({ ...r, seed: i + 1 }));
    for (const [hiIdx, loIdx] of BRACKET_PAIRS) {
      round0.push(makeSeries(0, c, seeded[hiIdx], seeded[loIdx], league.userId));
    }
  }
  league.playoffs = { rounds: [round0], champion: null, globalRank };
  league.stage = "playoffs";
  return league.playoffs;
}

function resolveSeriesWinner(series, globalRank) {
  if (series.winsHi >= SERIES_TO_WIN) {
    series.winnerId = series.hiId;
    series.winnerSeed = series.hiSeed;
  } else if (series.winsLo >= SERIES_TO_WIN) {
    series.winnerId = series.loId;
    series.winnerSeed = series.loSeed;
  }
  return series.winnerId;
}

export function seriesGameSeed(series) {
  return mix(series.id, series.games.length + 1);
}

// Registra un juego de una serie (para las series del usuario, jugadas una a una).
export function recordSeriesGame(series, result, league) {
  const hiWon = result.winner === "A";
  series.games.push({ scoreHi: result.scoreA, scoreLo: result.scoreB, hiWon });
  if (hiWon) series.winsHi += 1;
  else series.winsLo += 1;
  resolveSeriesWinner(series, league?.playoffs?.globalRank);
  return series.winnerId;
}

// Auto-simula una serie entera al instante.
export function simulateSeriesInstant(league, series) {
  let guard = 0;
  while (!series.winnerId && guard++ < 9) {
    const home = league.byId.get(series.hiId);
    const away = league.byId.get(series.loId);
    recordSeriesGame(series, quickResult(home, away, seriesGameSeed(series)), league);
  }
  return series;
}

// En una serie del usuario, ¿el usuario es el equipo "hi"? (para ordenar el visor)
export function userIsHi(league, series) {
  return series.hiId === league.userId;
}

// Devuelve la serie activa del usuario en la ronda actual, o null.
export function activeUserSeries(league) {
  const po = league.playoffs;
  if (!po) return null;
  const cur = po.rounds[po.rounds.length - 1];
  return cur.find((s) => s.isUser && !s.winnerId) || null;
}

// Avanza la ronda: auto-simula las series CPU pendientes y, si todas están
// decididas, construye la siguiente ronda (o corona al campeón). Devuelve true si
// se pudo avanzar, false si queda una serie del usuario por resolver.
export function advancePlayoffs(league) {
  const po = league.playoffs;
  const cur = po.rounds[po.rounds.length - 1];
  for (const s of cur) {
    if (!s.winnerId && !s.isUser) simulateSeriesInstant(league, s);
  }
  if (cur.some((s) => !s.winnerId)) return false;

  if (cur.length === 1) {
    po.champion = league.byId.get(cur[0].winnerId);
    league.stage = "champion";
    return true;
  }

  const winnerRec = (s) => ({
    team: league.byId.get(s.winnerId),
    seed: s.winnerSeed,
  });
  const next = [];
  const nextRound = cur[0].round + 1;
  if (cur.length > 2) {
    // Empareja series adyacentes dentro de cada conferencia.
    for (let i = 0; i < cur.length; i += 2) {
      const a = cur[i];
      const b = cur[i + 1];
      const wa = winnerRec(a);
      const wb = winnerRec(b);
      const [hi, lo] = wa.seed <= wb.seed ? [wa, wb] : [wb, wa];
      next.push(makeSeries(nextRound, a.conf, hi, lo, league.userId));
    }
  } else {
    // Finales de conferencia → Finales NBA (cruce de conferencias). Desempata por
    // rango global de temporada regular.
    const wa = winnerRec(cur[0]);
    const wb = winnerRec(cur[1]);
    const ra = po.globalRank.get(wa.team.id);
    const rb = po.globalRank.get(wb.team.id);
    const [hi, lo] = ra <= rb ? [wa, wb] : [wb, wa];
    next.push(makeSeries(nextRound, -1, hi, lo, league.userId));
  }
  po.rounds.push(next);
  return true;
}

// Etiqueta de ronda según cuántas series tenga.
export function roundLabel(seriesCount) {
  if (seriesCount >= 8) return "primera-ronda";
  if (seriesCount >= 4) return "semis-conferencia";
  if (seriesCount >= 2) return "finales-conferencia";
  return "finales";
}
