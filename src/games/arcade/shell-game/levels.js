// The difficulty curve for Trilero / Shell Game.
//
// Four axes escalate: how fast a cross runs, how many crosses a round has, how
// many cups are on the table, and which moves are allowed. They are deliberately
// *phased* rather than raised together — a round that gains speed, length, a cup
// and a new move all at once stops being readable, and an unreadable shell game
// is just a coin toss. So each band introduces one new move and consolidates the
// rest.
//
// Pure: no DOM, no canvas, no randomness. levelConfig(n) is a total function.

export const MOVES = {
  SLIDE: "slide", // two cups trade places along the row
  ARC: "arc", // one cup crosses in front of the other, on a curve
  CIRCLE: "circle", // three cups rotate around each other
  DOUBLE: "double", // two disjoint pairs cross at the same time
};

// `from` is the first level in the band. Ranges are inclusive of the next band's
// `from` minus one; the last band runs forever.
//
// swaps/duration are [atBandStart, atBandEnd] and interpolate across the band,
// so difficulty climbs inside a band as well as between bands.
const BANDS = [
  {
    from: 1,
    cups: 3,
    swaps: [3, 4],
    duration: [0.62, 0.55],
    moves: [MOVES.SLIDE],
  },
  {
    from: 4,
    cups: 4,
    swaps: [5, 7],
    duration: [0.52, 0.42],
    moves: [MOVES.SLIDE, MOVES.ARC],
  },
  {
    from: 7,
    cups: 4,
    swaps: [7, 9],
    duration: [0.4, 0.32],
    moves: [MOVES.SLIDE, MOVES.ARC, MOVES.CIRCLE],
  },
  // The fifth cup is this band's one new thing, so nothing else moves with it:
  // it opens on exactly the speed and length the previous band closed at. It
  // used to arrive at level 15, which with three lives meant almost nobody ever
  // saw it — the hardest cup in the game was effectively dead content.
  {
    from: 10,
    cups: 5,
    swaps: [9, 11],
    duration: [0.32, 0.26],
    moves: [MOVES.SLIDE, MOVES.ARC, MOVES.CIRCLE],
  },
  {
    from: 14,
    cups: 5,
    swaps: [11, 14],
    duration: [0.26, 0.16],
    moves: [MOVES.SLIDE, MOVES.ARC, MOVES.CIRCLE, MOVES.DOUBLE],
  },
];

// The open-ended top band still has to stop somewhere: past this level the
// numbers hold, so the game settles at "very hard" instead of drifting into the
// physically impossible.
const TOP_LEVEL = 25;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function bandFor(level) {
  let found = BANDS[0];
  for (const band of BANDS) if (level >= band.from) found = band;
  return found;
}

// How far through its band a level sits, 0..1.
function bandProgress(level, band) {
  const index = BANDS.indexOf(band);
  const next = BANDS[index + 1];
  const end = next ? next.from - 1 : TOP_LEVEL;
  if (end <= band.from) return 0;
  return clamp((level - band.from) / (end - band.from), 0, 1);
}

export function levelConfig(level) {
  const n = Math.max(1, Math.floor(level) || 1);
  const band = bandFor(n);
  const t = bandProgress(n, band);

  const swapDuration = lerp(band.duration[0], band.duration[1], t);

  return {
    level: n,
    cups: band.cups,
    swapCount: Math.round(lerp(band.swaps[0], band.swaps[1], t)),
    swapDuration,
    // How much a cross may start before the previous one ends. Crosses that
    // overlap must not share a cup (choreography.js enforces it), so this buys
    // pace without ever putting a cup in two places at once. It grows with the
    // band, which is what turns a tidy row of swaps into a real shuffle.
    overlap: swapDuration * lerp(0.15, 0.5, t),
    moves: band.moves,
  };
}

// The baseline odds of guessing blind at this level — used by the UI to tell the
// player what they are up against.
export function blindOdds(level) {
  return 1 / levelConfig(level).cups;
}
