// Tennis scoring: points, games, sets, deuce, advantage, tiebreak.
// Pure reducer — no rendering, no timers, no globals.  Player indices are 0/1.

export const POINT_LABELS = ["0", "15", "30", "40"];

export function createMatch({
  setsToWin = 2,
  gamesPerSet = 6,
  tiebreakAt = 6,
  tiebreakTo = 7,
  server = 0,
} = {}) {
  return {
    setsToWin,
    gamesPerSet,
    tiebreakAt,
    tiebreakTo,
    server,
    firstServer: server,
    points: [0, 0],
    games: [0, 0],
    sets: [0, 0],
    completedSets: [],
    tiebreak: false,
    tiebreakPointsPlayed: 0,
    winner: null,
    lastEvent: null,
  };
}

function labelFor(points, i) {
  const me = points[i];
  const you = points[1 - i];
  if (me >= 3 && you >= 3) {
    if (me === you) return "40";
    return me > you ? "Ad" : "-";
  }
  return POINT_LABELS[Math.min(me, 3)];
}

export function scoreLabels(match) {
  if (match.tiebreak) {
    return [String(match.points[0]), String(match.points[1])];
  }
  return [labelFor(match.points, 0), labelFor(match.points, 1)];
}

export function isDeuce(match) {
  return (
    !match.tiebreak && match.points[0] >= 3 && match.points[0] === match.points[1]
  );
}

// True when `player` is one point from taking the current game (or tiebreak).
function hasGamePoint(match, player) {
  const me = match.points[player];
  const you = match.points[1 - player];
  if (match.tiebreak) {
    return me >= match.tiebreakTo - 1 && me >= you;
  }
  return me >= 3 && me > you;
}

// The situational flags layer B of the AI feeds on.  `player` is whose point of
// view we are describing.
export function pointContext(match, player) {
  const opponent = 1 - player;
  const onServe = match.server === player;

  const gamePoint = hasGamePoint(match, player);
  const gamePointAgainst = hasGamePoint(match, opponent);

  // A break point only exists for the returner.
  const breakPoint = (!onServe && gamePoint) || (onServe && gamePointAgainst);

  const setPointFor = (p) => {
    if (!hasGamePoint(match, p)) return false;
    if (match.tiebreak) return true;
    const g = match.games[p];
    const og = match.games[1 - p];
    return g + 1 >= match.gamesPerSet && g + 1 - og >= 2;
  };

  const matchPointFor = (p) =>
    setPointFor(p) && match.sets[p] + 1 >= match.setsToWin;

  return {
    deuce: isDeuce(match),
    breakPoint,
    setPoint: setPointFor(player) || setPointFor(opponent),
    matchPoint: matchPointFor(player) || matchPointFor(opponent),
    // Pressure is heavier when it is *you* who can lose the point that matters.
    facingPressure:
      hasGamePoint(match, opponent) || setPointFor(opponent) || matchPointFor(opponent),
  };
}

// In a tiebreak the serve changes after the first point, then every two.
function tiebreakServerAfter(firstServer, pointsPlayed) {
  if (pointsPlayed === 0) return firstServer;
  return (firstServer + Math.floor((pointsPlayed + 1) / 2)) % 2;
}

function startTiebreak(match) {
  match.tiebreak = true;
  match.tiebreakPointsPlayed = 0;
  match.points = [0, 0];
  match.tiebreakFirstServer = match.server;
}

function closeSet(match, winner) {
  match.sets[winner] += 1;
  match.completedSets.push({
    games: [...match.games],
    tiebreak: match.tiebreak,
    tiebreakPoints: match.tiebreak ? [...match.points] : null,
  });
  match.games = [0, 0];
  match.points = [0, 0];
  match.tiebreak = false;
  match.tiebreakPointsPlayed = 0;
  match.lastEvent = "set";

  if (match.sets[winner] >= match.setsToWin) {
    match.winner = winner;
    match.lastEvent = "match";
  }
}

function closeGame(match, winner) {
  match.games[winner] += 1;
  match.points = [0, 0];
  match.server = 1 - match.server;
  match.lastEvent = "game";

  const mine = match.games[winner];
  const theirs = match.games[1 - winner];

  if (mine >= match.gamesPerSet && mine - theirs >= 2) {
    closeSet(match, winner);
    return;
  }
  if (mine === match.tiebreakAt && theirs === match.tiebreakAt) {
    startTiebreak(match);
    match.lastEvent = "tiebreak";
  }
}

// Awards one point and cascades game/set/match closure.  Returns a new object;
// the input is not mutated.
export function awardPoint(match, winner) {
  if (match.winner != null) return match;

  const next = {
    ...match,
    points: [...match.points],
    games: [...match.games],
    sets: [...match.sets],
    completedSets: [...match.completedSets],
    lastEvent: "point",
  };

  next.points[winner] += 1;

  if (next.tiebreak) {
    next.tiebreakPointsPlayed += 1;
    const me = next.points[winner];
    const you = next.points[1 - winner];
    if (me >= next.tiebreakTo && me - you >= 2) {
      // The tiebreak game itself counts on the scoreboard.
      next.games[winner] += 1;
      closeSet(next, winner);
      return next;
    }
    next.server = tiebreakServerAfter(
      next.tiebreakFirstServer ?? next.server,
      next.tiebreakPointsPlayed
    );
    return next;
  }

  const me = next.points[winner];
  const you = next.points[1 - winner];
  if (me >= 4 && me - you >= 2) {
    closeGame(next, winner);
  }

  return next;
}

export function matchSummary(match) {
  const sets = match.completedSets.map((s) => `${s.games[0]}-${s.games[1]}`);
  if (match.winner == null && (match.games[0] || match.games[1])) {
    sets.push(`${match.games[0]}-${match.games[1]}`);
  }
  return sets;
}
