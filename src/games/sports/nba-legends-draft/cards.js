// Draft de Leyendas NBA — acceso al catálogo de cartas generado por el script
// Python (scripts/generate-nba-cards.py). Cada carta:
//   { id, name, decade, decadeLabel, role, height, games, overall,
//     attrs: { anotacion, tiro3, pase, rebote, defInterior, defExterior, tiroLibre },
//     stats: { ppg, rpg, apg, spg, bpg, fgp, tpp } }

import data from "./data/cards.generated.json";
import { randInt, sampleWithout } from "./rng.js";

export const ALL_CARDS = data.cards;
export const CARD_COUNT = data.count;
export const DECADES = data.decades.slice().sort((a, b) => a - b);

export const ROLES = ["BASE", "ESCOLTA", "ALERO", "ALA_PIVOT", "PIVOT"];

const BY_ID = new Map(ALL_CARDS.map((c) => [c.id, c]));
const BY_DECADE = new Map();
for (const c of ALL_CARDS) {
  if (!BY_DECADE.has(c.decade)) BY_DECADE.set(c.decade, []);
  BY_DECADE.get(c.decade).push(c);
}

export function cardById(id) {
  return BY_ID.get(id) ?? null;
}

export function cardsInDecade(decade) {
  return BY_DECADE.get(decade) ?? [];
}

export function decadeLabel(decade) {
  const c = cardsInDecade(decade)[0];
  return c ? c.decadeLabel : `${decade}s`;
}

// Década aleatoria (resultado del "dado") que tenga al menos `minCards` cartas.
export function rollDecade(rng, minCards = 1) {
  const usable = DECADES.filter((d) => cardsInDecade(d).length >= minCards);
  return usable[randInt(rng, usable.length)];
}

// 7 (o `count`) candidatos aleatorios de una década, excluyendo ids ya elegidos.
export function sampleCandidates(rng, decade, count = 7, excludeIds = new Set()) {
  const avail = cardsInDecade(decade).filter((c) => !excludeIds.has(c.id));
  return sampleWithout(rng, avail, count);
}
