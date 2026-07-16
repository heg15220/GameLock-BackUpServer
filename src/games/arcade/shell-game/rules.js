// Scoring, streak and lives for Trilero / Shell Game. Pure: every function takes
// a state and returns a new one.

export const STARTING_LIVES = 3;

// A correct guess is worth more the harder the round was to read, so surviving
// level 18 counts for more than farming level 2. Cups matter as much as level:
// picking right out of five is a different act from picking right out of three.
const BASE_POINTS = 100;

export function createGameState(bestStreak = 0) {
  return {
    level: 1,
    lives: STARTING_LIVES,
    score: 0,
    streak: 0,
    bestStreak,
    rounds: 0,
    over: false,
    lastResult: null, // "hit" | "miss"
  };
}

export function pointsFor(level, cups, streak) {
  const streakBonus = 1 + Math.min(streak, 10) * 0.1;
  return Math.round(BASE_POINTS * level * (cups / 3) * streakBonus);
}

// Resolve a guess. A hit climbs the ladder; a miss costs a life but holds the
// level — dropping it too would just drag out a game that is already lost.
export function registerGuess(state, { correct, cups }) {
  if (state.over) return state;

  const rounds = state.rounds + 1;

  if (correct) {
    const streak = state.streak + 1;
    return {
      ...state,
      rounds,
      level: state.level + 1,
      score: state.score + pointsFor(state.level, cups, state.streak),
      streak,
      bestStreak: Math.max(state.bestStreak, streak),
      lastResult: "hit",
    };
  }

  const lives = state.lives - 1;
  return {
    ...state,
    rounds,
    lives,
    streak: 0,
    over: lives <= 0,
    lastResult: "miss",
  };
}
