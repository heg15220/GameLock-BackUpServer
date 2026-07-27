// Draft de Leyendas NBA — máquina de estados del draft. Puro y testeable.
//
// Mecánica: 8 rondas. En cada ronda tiras el DADO → sale una DÉCADA → aparecen 7
// jugadores aleatorios de esa década (sin filtrar por posición) → eliges 1. Al
// terminar tienes 8 cartas; luego eliges cuáles 5 son titulares.

import { rollDecade, sampleCandidates } from "./cards.js";

export const ROSTER_SIZE = 8;
export const STARTERS = 5;
export const CANDIDATES_PER_ROLL = 7;

// Estado inicial del draft. `phase`: "roll" (toca tirar el dado) | "choose" (elegir
// entre los candidatos) | "done".
export function createDraft({ rounds = ROSTER_SIZE } = {}) {
  return {
    rounds,
    round: 0,
    phase: "roll",
    decade: null,
    candidates: [],
    picks: [],
  };
}

// Tira el dado: fija década y saca los candidatos. No-op si no toca tirar.
export function rollForCandidates(
  draft,
  rng,
  { candidateCount = CANDIDATES_PER_ROLL } = {},
) {
  if (draft.phase !== "roll") return draft;
  const decade = rollDecade(rng, candidateCount);
  const exclude = new Set(draft.picks.map((p) => p.id));
  const candidates = sampleCandidates(rng, decade, candidateCount, exclude);
  return { ...draft, phase: "choose", decade, candidates };
}

// Elige una carta de los candidatos actuales y avanza la ronda.
export function choosePick(draft, card) {
  if (draft.phase !== "choose") return draft;
  if (!draft.candidates.some((c) => c.id === card.id)) return draft;
  const picks = [...draft.picks, card];
  const done = picks.length >= draft.rounds;
  return {
    ...draft,
    picks,
    round: draft.round + 1,
    phase: done ? "done" : "roll",
    decade: null,
    candidates: [],
  };
}

// Quinteto por defecto: los 5 de mayor media. Devuelve un Set de ids.
export function defaultStarterIds(roster) {
  return new Set(
    roster
      .slice()
      .sort((a, b) => b.overall - a.overall)
      .slice(0, STARTERS)
      .map((c) => c.id),
  );
}

// Separa un roster de 8 en { starters, bench } según los ids elegidos.
export function splitLineup(roster, starterIds) {
  const set = starterIds instanceof Set ? starterIds : new Set(starterIds);
  const starters = roster.filter((c) => set.has(c.id));
  const bench = roster.filter((c) => !set.has(c.id));
  return { starters, bench };
}

// Media del quinteto titular (para sembrado/ordenación de equipos).
export function teamOverall(team) {
  const s = team.starters;
  return s.length ? Math.round(s.reduce((a, c) => a + c.overall, 0) / s.length) : 0;
}

// Construye el objeto equipo que consume la simulación y el torneo.
export function buildTeam(id, name, roster, starterIds) {
  const set = starterIds instanceof Set ? starterIds : new Set(starterIds);
  const { starters, bench } = splitLineup(roster, set);
  return { id, name, roster, starters, bench, starterIds: [...set] };
}

// ¿Es válido el quinteto? Exactamente 5 titulares de entre el roster.
export function isValidLineup(roster, starterIds) {
  const set = starterIds instanceof Set ? starterIds : new Set(starterIds);
  if (set.size !== STARTERS) return false;
  const ids = new Set(roster.map((c) => c.id));
  for (const id of set) if (!ids.has(id)) return false;
  return true;
}
