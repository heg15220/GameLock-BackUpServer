// Pádel Pro Arena — puntuación reglamentaria. Módulo puro y testeable.
//
// Punto: 0 → 15 → 30 → 40 → juego, con ventaja clásica en 40-40 (sin punto de oro).
// Juego: primero a 4 puntos con diferencia de 2.
// Set: primero a 6 juegos con diferencia de 2; a 6-6 se juega tie-break a 7 (dif 2).
// Partido: al mejor de 1 o 3 sets. Saque alterna por juego entre equipos; el lado
// de saque (derecha/izquierda) alterna por paridad de puntos.
//
// Equipos: "home" (tu pareja) y "away" (rivales).

export const OTHER = { home: "away", away: "home" };
export const GAMES_TO_WIN_SET = 6;
export const TIEBREAK_TO = 7;

const POINT_LABELS = ["0", "15", "30", "40"];

export function setsToWin(bestOf) {
  const n = Number(bestOf) || 1;
  return Math.floor(n / 2) + 1;
}

export function createMatchState(bestOf = 3, startingServer = "home") {
  return {
    bestOf,
    setsNeeded: setsToWin(bestOf),
    homeSets: 0,
    awaySets: 0,
    homeGames: 0,
    awayGames: 0,
    homePoints: 0,
    awayPoints: 0,
    server: startingServer,
    matchStartingServer: startingServer,
    tieBreak: false,
    setNumber: 1,
    lastGameWinner: null,
    lastSetWinner: null,
    matchWinner: null,
    over: false,
  };
}

// Etiqueta de marcador de puntos para el juego actual. Devuelve { home, away }.
export function pointLabels(state) {
  const { homePoints: hp, awayPoints: ap, tieBreak } = state;
  if (tieBreak) return { home: String(hp), away: String(ap) };
  if (hp >= 3 && ap >= 3) {
    if (hp === ap) return { home: "40", away: "40" };
    return hp > ap
      ? { home: "Ad", away: "40" }
      : { home: "40", away: "Ad" };
  }
  return { home: POINT_LABELS[Math.min(hp, 3)], away: POINT_LABELS[Math.min(ap, 3)] };
}

// Lado desde el que se saca en el punto actual: "right" (cuadro de iguales) con
// número par de puntos jugados, "left" (cuadro de ventaja) con número impar.
export function serveCourt(state) {
  return (state.homePoints + state.awayPoints) % 2 === 0 ? "right" : "left";
}

function gameWon(a, b, tieBreak) {
  const need = tieBreak ? TIEBREAK_TO : 4;
  return a >= need && a - b >= 2;
}

function setWon(gA, gB) {
  return gA >= GAMES_TO_WIN_SET && gA - gB >= 2;
}

// Registra un punto ganado por `scorer` ("home"|"away"). Devuelve un estado nuevo.
export function registerPoint(state, scorer) {
  if (state.over || (scorer !== "home" && scorer !== "away")) return state;

  let homePoints = state.homePoints + (scorer === "home" ? 1 : 0);
  let awayPoints = state.awayPoints + (scorer === "away" ? 1 : 0);

  const winner = gameWon(
    scorer === "home" ? homePoints : awayPoints,
    scorer === "home" ? awayPoints : homePoints,
    state.tieBreak,
  )
    ? scorer
    : null;

  if (!winner) {
    return { ...state, homePoints, awayPoints };
  }

  // Juego (o tie-break) cerrado.
  let homeGames = state.homeGames + (winner === "home" ? 1 : 0);
  let awayGames = state.awayGames + (winner === "away" ? 1 : 0);
  const nextServer = OTHER[state.server];

  const setClosed = state.tieBreak || setWon(homeGames, awayGames);
  if (!setClosed) {
    const enterTieBreak = homeGames === 6 && awayGames === 6;
    return {
      ...state,
      homePoints: 0,
      awayPoints: 0,
      homeGames,
      awayGames,
      server: nextServer,
      tieBreak: enterTieBreak,
      lastGameWinner: winner,
    };
  }

  // Set cerrado (por juegos o por tie-break).
  const homeSets = state.homeSets + (winner === "home" ? 1 : 0);
  const awaySets = state.awaySets + (winner === "away" ? 1 : 0);
  const matchWinner =
    homeSets >= state.setsNeeded ? "home" : awaySets >= state.setsNeeded ? "away" : null;

  return {
    ...state,
    homePoints: 0,
    awayPoints: 0,
    homeGames: matchWinner ? homeGames : 0,
    awayGames: matchWinner ? awayGames : 0,
    homeSets,
    awaySets,
    server: nextServer,
    tieBreak: false,
    setNumber: matchWinner ? state.setNumber : state.setNumber + 1,
    lastGameWinner: winner,
    lastSetWinner: winner,
    matchWinner,
    over: Boolean(matchWinner),
  };
}
