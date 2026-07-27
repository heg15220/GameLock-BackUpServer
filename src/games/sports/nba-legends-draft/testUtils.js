// Utilidades para los tests: cartas y equipos sintéticos (no dependen del JSON
// generado, para probar la lógica de forma aislada).

import { buildTeam, defaultStarterIds } from "./draft.js";

export function card(id, overall, role = "ALERO", over = {}) {
  return {
    id,
    name: `P${id}`,
    decade: 2000,
    decadeLabel: "2000s",
    role,
    height: 78,
    games: 500,
    overall,
    attrs: {
      anotacion: overall,
      tiro3: overall - 5,
      pase: overall - 10,
      rebote: overall - 8,
      defInterior: overall - 6,
      defExterior: overall - 7,
      tiroLibre: 75,
      ...over,
    },
    stats: { ppg: 20, rpg: 5, apg: 4, spg: 1, bpg: 0.5, fgp: 0.47, tpp: 0.36 },
  };
}

const ROLES = ["BASE", "ESCOLTA", "ALERO", "ALA_PIVOT", "PIVOT"];

// Roster de 8 con medias alrededor de `base` (±spread).
export function roster(idBase, base) {
  const cards = [];
  for (let i = 0; i < 8; i++) {
    const ov = Math.max(50, Math.min(99, base - i * 2));
    cards.push(card(idBase + i, ov, ROLES[i % 5]));
  }
  return cards;
}

export function team(id, name, base) {
  const r = roster(id * 100, base);
  return buildTeam(id, name, r, defaultStarterIds(r));
}
