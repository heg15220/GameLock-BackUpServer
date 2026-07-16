// Grand Slam tournament: a seeded 32-player draw over 5 rounds.
//
// The human plays their own 5 matches; every other match in the draw is
// simulated from effective rating so the bracket around you stays alive and
// coherent (upsets happen, favourites mostly hold).
//
// The human enters as the top seed, which makes the path escalate the way a
// real seeded draw does: seed 32 first, then ~16, ~8, ~4, and the tournament's
// strongest AI in the final.
import {
  PLAYERS,
  effectiveRating,
  tierForPlayer,
} from "./players";

export const ROUND_KEYS = ["r32", "r16", "qf", "sf", "final"];

export const ROUND_NAMES = {
  es: {
    r32: "1ª ronda",
    r16: "Octavos de final",
    qf: "Cuartos de final",
    sf: "Semifinal",
    final: "Final",
  },
  en: {
    r32: "First round",
    r16: "Round of 16",
    qf: "Quarter-finals",
    sf: "Semi-finals",
    final: "Final",
  },
};

export const SURFACE_NAMES = {
  es: { hard: "Pista dura", clay: "Tierra batida", grass: "Hierba" },
  en: { hard: "Hard court", clay: "Clay", grass: "Grass" },
};

export const STORAGE_KEY = "tennis-grand-slam-tournament-v1";

export const HUMAN_ID = "__human__";

// Deterministic PRNG so a saved tournament replays identically after a reload.
export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

// Standard bracket seed order: pairs the top seed with the bottom seed and
// keeps the favourites apart until late.
export function seedOrder(size) {
  let order = [1, 2];
  while (order.length < size) {
    const round = order.length * 2;
    const next = [];
    for (const seed of order) {
      next.push(seed, round + 1 - seed);
    }
    order = next;
  }
  return order;
}

export function createTournament({
  surface = "hard",
  tierCeiling = "pro",
  setsToWin = 2,
  humanName = "Tú",
  seed = Math.floor(Math.random() * 0xffffffff),
} = {}) {
  const rng = makeRng(seed);

  // Strongest 31 for this surface make the draw; the human is the 32nd.
  const field = [...PLAYERS]
    .sort((a, b) => effectiveRating(b, surface) - effectiveRating(a, surface))
    .slice(0, 31);

  const entrants = [
    { seed: 1, id: HUMAN_ID, name: humanName, human: true, rating: 100 },
    ...field.map((p, i) => ({
      seed: i + 2,
      id: p.id,
      name: p.name,
      country: p.country,
      style: p.style,
      rating: p.rating,
      tier: tierForPlayer(p, tierCeiling),
      human: false,
    })),
  ];

  const bySeed = new Map(entrants.map((e) => [e.seed, e]));
  const order = seedOrder(32);
  const slots = order.map((s) => bySeed.get(s));

  const first = [];
  for (let i = 0; i < 32; i += 2) {
    first.push({ a: slots[i], b: slots[i + 1], winner: null, score: null });
  }

  const bracket = [first];
  let count = first.length;
  for (let r = 1; r < ROUND_KEYS.length; r += 1) {
    count = Math.floor(count / 2);
    bracket.push(
      Array.from({ length: count }, () => ({ a: null, b: null, winner: null, score: null }))
    );
  }

  return {
    version: 1,
    seed,
    surface,
    tierCeiling,
    setsToWin,
    round: 0,
    bracket,
    status: "playing", // playing | champion | eliminated
    rngState: seed,
    _rng: rng,
  };
}

export function findHumanMatch(tournament) {
  const round = tournament.bracket[tournament.round];
  if (!round) return null;
  for (let i = 0; i < round.length; i += 1) {
    const m = round[i];
    if (m.a?.human || m.b?.human) {
      return { index: i, match: m, humanIsA: Boolean(m.a?.human) };
    }
  }
  return null;
}

export function humanOpponent(tournament) {
  const found = findHumanMatch(tournament);
  if (!found) return null;
  return found.humanIsA ? found.match.b : found.match.a;
}

// Rating-driven odds with a little noise.  A 12-point rating edge is roughly a
// 3-to-1 favourite, which keeps upsets on the table without making the draw
// feel random.
export function winProbability(a, b, surface) {
  const ra = a.human ? 88 : effectiveRating(findPlayer(a.id), surface);
  const rb = b.human ? 88 : effectiveRating(findPlayer(b.id), surface);
  return 1 / (1 + Math.pow(10, (rb - ra) / 12));
}

function findPlayer(id) {
  return PLAYERS.find((p) => p.id === id) ?? PLAYERS[PLAYERS.length - 1];
}

// Produces a plausible scoreline for a simulated match rather than just a
// winner, so the bracket reads like a real draw sheet.
export function simulateScoreline(pWin, setsToWin, rng) {
  const sets = [];
  const won = [0, 0];
  while (won[0] < setsToWin && won[1] < setsToWin) {
    const winner = rng() < pWin ? 0 : 1;
    won[winner] += 1;
    // Closer matches between evenly-rated players produce tighter sets.
    const margin = rng();
    let games;
    if (margin < 0.16) games = [7, 6];
    else if (margin < 0.42) games = [6, 4];
    else if (margin < 0.72) games = [6, 3];
    else if (margin < 0.90) games = [6, 2];
    else games = [6, 1];
    sets.push(winner === 0 ? `${games[0]}-${games[1]}` : `${games[1]}-${games[0]}`);
  }
  return { winnerIndex: won[0] > won[1] ? 0 : 1, sets };
}

function rngFor(tournament) {
  if (!tournament._rng) {
    tournament._rng = makeRng(tournament.rngState ?? tournament.seed);
  }
  return tournament._rng;
}

function simulateMatch(tournament, match) {
  const rng = rngFor(tournament);
  const p = winProbability(match.a, match.b, tournament.surface);
  const { winnerIndex, sets } = simulateScoreline(p, tournament.setsToWin, rng);
  match.winner = winnerIndex === 0 ? match.a : match.b;
  match.score = winnerIndex === 0 ? sets.join(" ") : sets.join(" ");
  match.simulated = true;
}

// Records the human's result, plays out the rest of the round, and moves the
// winners into the next round.
export function reportHumanResult(tournament, humanWon, scoreLine) {
  const found = findHumanMatch(tournament);
  if (!found) return tournament;

  const { match, humanIsA } = found;
  const human = humanIsA ? match.a : match.b;
  const rival = humanIsA ? match.b : match.a;
  match.winner = humanWon ? human : rival;
  match.score = scoreLine ?? null;
  match.simulated = false;

  const round = tournament.bracket[tournament.round];
  for (const m of round) {
    if (!m.winner && m.a && m.b) simulateMatch(tournament, m);
  }

  const nextRound = tournament.bracket[tournament.round + 1];
  if (!nextRound) {
    tournament.status = humanWon ? "champion" : "eliminated";
    return tournament;
  }

  for (let i = 0; i < nextRound.length; i += 1) {
    nextRound[i].a = round[i * 2].winner;
    nextRound[i].b = round[i * 2 + 1].winner;
  }

  tournament.round += 1;

  if (!humanWon) {
    // The draw plays itself out to a champion even after you are gone.
    for (let r = tournament.round; r < tournament.bracket.length; r += 1) {
      const rd = tournament.bracket[r];
      for (const m of rd) {
        if (m.a && m.b && !m.winner) simulateMatch(tournament, m);
      }
      const nxt = tournament.bracket[r + 1];
      if (nxt) {
        for (let i = 0; i < nxt.length; i += 1) {
          nxt[i].a = rd[i * 2].winner;
          nxt[i].b = rd[i * 2 + 1].winner;
        }
      }
    }
    tournament.status = "eliminated";
  }

  return tournament;
}

export function champion(tournament) {
  const final = tournament.bracket[tournament.bracket.length - 1][0];
  return final?.winner ?? null;
}

// ── Persistence ─────────────────────────────────────────────────────────────

export function serialize(tournament) {
  const { _rng, ...rest } = tournament;
  return JSON.stringify(rest);
}

export function save(tournament) {
  try {
    window.localStorage.setItem(STORAGE_KEY, serialize(tournament));
  } catch {
    /* storage unavailable (private mode, quota) — the run just won't resume */
  }
}

export function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clear() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
