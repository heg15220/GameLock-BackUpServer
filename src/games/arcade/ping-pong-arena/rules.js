// Pure table-tennis scoring rules — no DOM, no canvas. Fully unit-testable.
//
// Set to 11 points, win by 2. Best-of 1/3/5 sets. Serve alternates every 2
// points until 10-10, then every 1 point. Serve side alternates each set.

export const POINTS_TO_WIN_SET = 11;
export const WIN_BY = 2;

export const OTHER = { player: "opponent", opponent: "player" };

export function setsToWin(bestOf) {
  const n = Number(bestOf) || 1;
  return Math.floor(n / 2) + 1;
}

// Which side serves at a given score, given who served first this set.
export function serverFor(playerPoints, opponentPoints, firstServer) {
  const pp = Math.max(0, Math.floor(playerPoints));
  const op = Math.max(0, Math.floor(opponentPoints));
  const total = pp + op;
  const deuce = pp >= 10 && op >= 10;
  const switches = deuce ? total - 10 : Math.floor(total / 2);
  return switches % 2 === 0 ? firstServer : OTHER[firstServer];
}

export function isSetPoint(playerPoints, opponentPoints) {
  const won = (a, b) => a >= POINTS_TO_WIN_SET - 1 && a - b >= WIN_BY - 1;
  return won(playerPoints, opponentPoints) || won(opponentPoints, playerPoints);
}

export function setWinner(playerPoints, opponentPoints) {
  const win = (a, b) => a >= POINTS_TO_WIN_SET && a - b >= WIN_BY;
  if (win(playerPoints, opponentPoints)) return "player";
  if (win(opponentPoints, playerPoints)) return "opponent";
  return null;
}

export function createMatchState(bestOf = 3, startingServer = "player") {
  return {
    bestOf,
    setsNeeded: setsToWin(bestOf),
    playerSets: 0,
    opponentSets: 0,
    playerPoints: 0,
    opponentPoints: 0,
    // Who served first in the current set. Alternates each set.
    firstServerThisSet: startingServer,
    matchStartingServer: startingServer,
    server: startingServer,
    setNumber: 1,
    lastSetWinner: null,
    matchWinner: null,
    over: false,
  };
}

// Register a won point for `scorer` ("player" | "opponent"). Returns a new state.
export function registerPoint(state, scorer) {
  if (state.over || (scorer !== "player" && scorer !== "opponent")) {
    return state;
  }

  let playerPoints = state.playerPoints + (scorer === "player" ? 1 : 0);
  let opponentPoints = state.opponentPoints + (scorer === "opponent" ? 1 : 0);

  const winner = setWinner(playerPoints, opponentPoints);
  if (!winner) {
    return {
      ...state,
      playerPoints,
      opponentPoints,
      server: serverFor(playerPoints, opponentPoints, state.firstServerThisSet),
    };
  }

  // Set closed.
  const playerSets = state.playerSets + (winner === "player" ? 1 : 0);
  const opponentSets = state.opponentSets + (winner === "opponent" ? 1 : 0);
  const matchWinner =
    playerSets >= state.setsNeeded
      ? "player"
      : opponentSets >= state.setsNeeded
        ? "opponent"
        : null;

  // Serve alternates each new set.
  const nextFirstServer = OTHER[state.firstServerThisSet];

  return {
    ...state,
    playerSets,
    opponentSets,
    playerPoints: matchWinner ? playerPoints : 0,
    opponentPoints: matchWinner ? opponentPoints : 0,
    firstServerThisSet: matchWinner ? state.firstServerThisSet : nextFirstServer,
    server: matchWinner ? state.server : nextFirstServer,
    setNumber: matchWinner ? state.setNumber : state.setNumber + 1,
    lastSetWinner: winner,
    matchWinner,
    over: Boolean(matchWinner),
  };
}
