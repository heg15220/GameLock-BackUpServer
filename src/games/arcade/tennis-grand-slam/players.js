// The 32-player AI field.  Names are invented on purpose — no real-player
// likenesses.
//
// A player is three things:
//   rating   – seeds the draw and picks which tier of the ladder they play at
//   surface  – how much the surface flatters or hurts them
//   style    – biases the layer-C weights, so two opponents at the same rating
//              still feel like different matches
import { TIER_IDS } from "../shared/racket3d/adaptiveAi";

// Style multipliers applied to the AI's shot-candidate scoring.  >1 means the
// player reaches for that shot more often than a neutral player would.
export const STYLES = {
  baseliner: {
    id: "baseliner",
    es: "Fondista",
    en: "Baseliner",
    serve: 0.88,
    power: 0.92,
    topspin: 1.30,
    slice: 0.80,
    dropShot: 0.70,
    lob: 1.05,
    netPlay: 0.45,
    consistency: 1.18,
    // Sits well behind the baseline and grinds.
    restDepth: 1.35,
    aggressionBias: -0.08,
  },
  server: {
    id: "server",
    es: "Sacador",
    en: "Server",
    serve: 1.35,
    power: 1.12,
    topspin: 0.92,
    slice: 1.00,
    dropShot: 0.60,
    lob: 0.75,
    netPlay: 1.05,
    consistency: 0.92,
    restDepth: 1.05,
    aggressionBias: 0.06,
  },
  aggressive: {
    id: "aggressive",
    es: "Agresivo",
    en: "Aggressive",
    serve: 1.05,
    power: 1.28,
    topspin: 1.02,
    slice: 0.70,
    dropShot: 0.85,
    lob: 0.60,
    netPlay: 0.95,
    consistency: 0.82,
    restDepth: 0.85,
    aggressionBias: 0.16,
  },
  allcourt: {
    id: "allcourt",
    es: "All-court",
    en: "All-court",
    serve: 1.05,
    power: 1.02,
    topspin: 1.05,
    slice: 1.10,
    dropShot: 1.20,
    lob: 1.00,
    netPlay: 1.25,
    consistency: 1.02,
    restDepth: 1.00,
    aggressionBias: 0.04,
  },
  counterpuncher: {
    id: "counterpuncher",
    es: "Contragolpeador",
    en: "Counterpuncher",
    serve: 0.82,
    power: 0.84,
    topspin: 1.12,
    slice: 1.30,
    dropShot: 0.95,
    lob: 1.35,
    netPlay: 0.55,
    consistency: 1.28,
    restDepth: 1.20,
    aggressionBias: -0.12,
  },
};

export const SURFACES = ["hard", "clay", "grass"];

function player(name, country, rating, style, surface) {
  return { id: name.toLowerCase().replace(/[^a-z]+/g, "-"), name, country, rating, style, surface };
}

export const PLAYERS = [
  player("Ander Ruiz", "ESP", 97, "baseliner", "clay"),
  player("Nikolai Vetrov", "RUS", 96, "aggressive", "hard"),
  player("Lucas Bergmann", "GER", 95, "server", "grass"),
  player("Marek Solano", "ARG", 94, "baseliner", "clay"),
  player("Theo Lavigne", "FRA", 93, "allcourt", "clay"),
  player("Kaito Mishima", "JPN", 92, "counterpuncher", "hard"),
  player("Elias Nordahl", "SWE", 91, "server", "grass"),
  player("Bruno Cazale", "BRA", 90, "aggressive", "clay"),
  player("Iván Petrescu", "ROU", 89, "baseliner", "clay"),
  player("Owen Kilbride", "GBR", 88, "server", "grass"),
  player("Diego Arroyo", "ESP", 87, "counterpuncher", "clay"),
  player("Matteo Ranieri", "ITA", 86, "allcourt", "hard"),
  player("Sven Dijkstra", "NED", 85, "server", "grass"),
  player("Rafael Antunes", "POR", 84, "baseliner", "clay"),
  player("Cody Whitfield", "USA", 83, "aggressive", "hard"),
  player("Tomas Novak", "CZE", 82, "allcourt", "hard"),
  player("Yusuf Demir", "TUR", 81, "counterpuncher", "hard"),
  player("Liam Carrow", "AUS", 80, "server", "grass"),
  player("Pablo Iriarte", "ARG", 79, "baseliner", "clay"),
  player("Henrik Sund", "NOR", 78, "allcourt", "grass"),
  player("Nico Ferraro", "ITA", 77, "aggressive", "clay"),
  player("Aaron Blythe", "USA", 76, "server", "hard"),
  player("Milos Rajic", "SRB", 75, "counterpuncher", "clay"),
  player("Jonas Weber", "SUI", 74, "allcourt", "hard"),
  player("Emre Kaplan", "TUR", 73, "baseliner", "clay"),
  player("Dylan Frost", "CAN", 72, "aggressive", "hard"),
  player("Kwame Asante", "RSA", 71, "server", "grass"),
  player("Ren Takahashi", "JPN", 70, "counterpuncher", "hard"),
  player("Felipe Duarte", "CHI", 69, "baseliner", "clay"),
  player("Oscar Lindqvist", "SWE", 68, "allcourt", "grass"),
  player("Andrés Peralta", "MEX", 67, "aggressive", "hard"),
  player("Ciaran Doyle", "IRL", 66, "counterpuncher", "grass"),
];

export function getStyle(styleId) {
  return STYLES[styleId] ?? STYLES.allcourt;
}

// How well a player's game travels to a given surface.  Small on purpose: it
// nudges upsets, it does not decide matches.
export function surfaceFit(playerData, surface) {
  if (playerData.surface === surface) return 1;
  // Clay and grass are the opposite ends; hard sits between them.
  const distance = (a, b) => {
    const order = { clay: 0, hard: 1, grass: 2 };
    return Math.abs(order[a] - order[b]);
  };
  return distance(playerData.surface, surface) === 1 ? 0.97 : 0.93;
}

// Effective rating for a given surface, used to seed the draw and to simulate
// the matches the human is not in.
export function effectiveRating(playerData, surface) {
  return playerData.rating * surfaceFit(playerData, surface);
}

// Maps a player's rating onto the difficulty ladder, scaled by the difficulty
// the human picked.  The chosen tier is the *ceiling*: the top seed plays at it
// and the rest of the field steps down from there, so the whole draw scales
// together and the final is always the hardest match of the run.
export function tierForPlayer(playerData, ceilingTierId) {
  const ceiling = Math.max(0, TIER_IDS.indexOf(ceilingTierId));
  const best = PLAYERS[0].rating;
  const worst = PLAYERS[PLAYERS.length - 1].rating;
  const strength = (playerData.rating - worst) / (best - worst); // 0..1

  // The weakest player in the field sits two rungs below the ceiling (but never
  // below the bottom rung).
  const floor = Math.max(0, ceiling - 2);
  const index = Math.round(floor + strength * (ceiling - floor));
  return TIER_IDS[Math.max(0, Math.min(TIER_IDS.length - 1, index))];
}
