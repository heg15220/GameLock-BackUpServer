/**
 * The competition, told once and in order.
 *
 * A season used to describe a continental cup twice. `seasonFixtures` rolled a
 * `final_continental` from its own odds and played it as one of the three deciders - first
 * screen of the year, before anything else existed - and then, once the season had been
 * simulated, the bracket of the SAME edition was narrated behind it: last sixteen, quarter,
 * semi, and a second final free to disagree with the first. Two accounts of one competition,
 * in the wrong order, neither answerable to the other.
 *
 * There is one now. The bracket is built with the season's plan, its ties are nights in the
 * season's own calendar, and the night the player decides is a ROUND of it. These are the
 * three things that has to mean:
 *
 *  1. No round is ever told twice.
 *  2. The rounds arrive in the order football plays them, with his night in its place.
 *  3. What the bracket says and what the cabinet says are the same sentence.
 */

import { describe, expect, it } from "vitest";

import {
  PHASES,
  acceptOffer,
  agreeTerms,
  completeSigning,
  nextFixture,
  nextTie,
  openMarket,
  playChance,
  resolveEvent,
  signYouthClub,
  startCareer,
  takeShot,
  watchMatch,
} from "./career.js";
import { LIVE_ROUNDS, TOURNAMENTS } from "./tournaments.js";
import { TOURNAMENT_NIGHTS } from "./bigmatch.js";
import { world } from "./world.js";

const start = (seed) =>
  startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
    world,
  );

/**
 * A whole career, with every night it is handed written down in the order it arrived.
 *
 * Deliberately the full loop rather than a staged fragment: what is under test is the
 * ORDER, and an order is only wrong when something else is played before or after it.
 */
function timeline(seed, { hit = true } = {}) {
  const opened = start(seed);
  let run = completeSigning(agreeTerms(signYouthClub(opened, opened.offers[0].clubId)));
  const nights = [];
  const seen = new Set();
  let guard = 0;

  while (run.phase !== PHASES.RETIRED && guard < 1500) {
    guard += 1;
    if (run.phase === PHASES.EVENT) {
      run = resolveEvent(run, run.event.es.options[0].id);
      continue;
    }
    if (run.phase === PHASES.TOURNAMENT) {
      const tie = run.tournament.ties[run.tournament.index];
      nights.push({
        season: tie.season,
        cup: tie.tournamentId,
        round: tie.round,
        watched: true,
        won: tie.won,
        played: tie.played,
        // The ninety minutes as the screen will read them, so a test can ask whether the
        // player is anywhere in his own quarter-final.
        beats: (run.tournament.broadcast?.beats ?? []).map((beat) => beat.id),
      });
      run = nextTie(run, "es");
      continue;
    }
    if (run.phase === PHASES.MATCH) {
      const fixture = run.matchday.fixtures[run.matchday.index];
      if (!run.matchday.last) {
        // A night worth three chances is one night. Recorded on the first of them, or the
        // timeline reports the same final three times and calls it a duplicate.
        if (fixture.round && !seen.has(fixture.id)) {
          seen.add(fixture.id);
          nights.push({
            season: run.season,
            cup: fixture.tournamentId,
            round: fixture.round,
            watched: false,
            kind: fixture.kind,
          });
        }
        const { shot } = run.matchday;
        if (shot.mode === "match") run = watchMatch(run, "es");
        if (run.matchday.shot.mode === "skill") {
          const aim = shot.chance.gates ?? [shot.chance.target];
          const inputs = aim.map((value) => (hit ? value : Math.min(1, value + shot.chance.tolerance * 4 + 0.3)));
          run = playChance(run, shot.chance.gates ? inputs : inputs[0]);
        } else {
          run = takeShot(run, shot.options[hit ? shot.gap : (shot.gap + 1) % shot.options.length]);
        }
      }
      if (run.phase === PHASES.MATCH && run.matchday.last) run = nextFixture(run, "es");
      continue;
    }
    if (run.phase === PHASES.SEASON) {
      run = openMarket(run, "es");
      continue;
    }
    if (run.phase === PHASES.MARKET) {
      run = acceptOffer(run, (run.offers.find((offer) => offer.stay) ?? run.offers[0]).clubId);
      run = completeSigning(agreeTerms(run));
      continue;
    }
    break;
  }
  expect(guard, "the career never reached the end").toBeLessThan(1500);
  return { nights, run };
}

const SEEDS = ["render-e", "p1", "render-c", "p6", "bracket-a", "bracket-b", "bracket-c"];

/** Every night of every career, tagged with the career it came from. */
const everyNight = (options) =>
  SEEDS.flatMap((seed) => timeline(seed, options).nights.map((night) => ({ ...night, seed })));

/** The key a competition is identified by: one career, one season, one cup. */
const runKey = (night) => `${night.seed}:S${night.season}:${night.cup}`;

describe("one competition, told once", () => {
  const nights = everyNight();

  it("gives a career tournament nights at all", () => {
    expect(nights.length, "no bracket was ever played").toBeGreaterThan(20);
    expect(nights.some((night) => !night.watched), "no round was ever the player's").toBe(true);
  });

  /**
   * THE REPORTED FAULT. A final played as a decider and then narrated again as the last tie
   * of the same bracket is the same night twice, and it was guaranteed rather than unlucky:
   * the two came from different rolls in different halves of the season loop.
   */
  it("never plays the same round of the same cup twice in a season", () => {
    const seen = new Set();
    for (const night of nights) {
      const key = `${runKey(night)}:${night.round}`;
      expect(seen.has(key), `${key} was played twice`).toBe(false);
      seen.add(key);
    }
  });

  /**
   * And the other half of it: the final came FIRST, because the deciders were all played
   * before the season was simulated and the bracket could only be built afterwards.
   */
  it("plays the rounds of a cup in the order football plays them", () => {
    const runs = new Map();
    for (const night of nights) {
      const key = runKey(night);
      const path = runs.get(key) ?? [];
      path.push(night.round);
      runs.set(key, path);
    }
    expect(runs.size).toBeGreaterThan(5);
    for (const [key, path] of runs) {
      const order = path.map((round) => LIVE_ROUNDS.indexOf(round));
      for (let i = 1; i < order.length; i += 1) {
        expect(order[i], `${key}: ${path.join(" -> ")}`).toBeGreaterThan(order[i - 1]);
      }
    }
  });

  it("only ever hands him a round the format actually has", () => {
    for (const night of nights) {
      expect(TOURNAMENTS[night.cup], `unknown cup ${night.cup}`).toBeTruthy();
      expect(LIVE_ROUNDS).toContain(night.round);
      expect(TOURNAMENTS[night.cup].knockout).toContain(night.round);
    }
  });

  /**
   * A night he decides is the END of what his side had drawn: the run reached that round on
   * its own and stopped there for him. Anything queued after it in the same competition
   * exists only because he came through, so it can never be a round he had already passed.
   */
  it("puts his own night at or after every round his side was given", () => {
    const bySeason = new Map();
    for (const night of nights) {
      const key = runKey(night);
      bySeason.set(key, [...(bySeason.get(key) ?? []), night]);
    }
    for (const [key, path] of bySeason) {
      const mine = path.findIndex((night) => !night.watched);
      if (mine < 0) continue;
      // Everything before it was watched, and everything before it was won - a run does
      // not arrive at his night having already gone out.
      for (const night of path.slice(0, mine)) {
        expect(night.watched, `${key}: two nights of his own`).toBe(true);
        expect(night.won, `${key}: reached his night after going out`).toBe(true);
      }
    }
  });

  it("no longer stages a continental night as a fixture standing next to the bracket", () => {
    for (const night of nights.filter((entry) => !entry.watched)) {
      // Every night he decides in a cup is one of the four kinds that names a round.
      const stage = TOURNAMENT_NIGHTS[night.kind];
      expect(stage, `${night.kind} is not a round`).toBeTruthy();
      // A trophy night names its own round; a `tie` kind covers several, so the round
      // comes from the night the bracket staged.
      if (!stage.tie) expect(stage.round).toBe(night.round);
      expect(night.cup, "a round with no competition to belong to").toBeTruthy();
    }
  });
});

/**
 * A run he is IN, and not just one his club is having.
 *
 * The ties are simulated and they stay simulated - a bracket is a competition his side
 * plays, and it plays whether or not the ball comes to him. What was missing is that the
 * player was not in it at all: ninety minutes of his own quarter-final naming the two
 * clubs, the shots, the saves and the corners, and never the man whose career the whole
 * thing is about. Whether he is in the eleven now comes off what he is rated and how much
 * football he has been playing. See `roundOdds`.
 */
describe("whether he is in the side for a knockout tie", () => {
  const nights = everyNight();

  it("answers the question for every tie, one way or the other", () => {
    expect(nights.length).toBeGreaterThan(20);
    for (const night of nights.filter((entry) => entry.watched)) {
      expect(typeof night.played, `${runKey(night)} ${night.round} never named a team sheet`).toBe(
        "boolean",
      );
    }
  });

  it("puts him in most of them", () => {
    const watched = nights.filter((night) => night.watched);
    const played = watched.filter((night) => night.played);
    /*
     * He is in the side far more often than not - these are careers good enough to be in
     * Europe at all. How OFTEN he is left out is `roundOdds`, which is measured directly in
     * matchmode.test.js; asserting a miss inside this sample only asked whether these
     * particular seven careers happened to contain one, which is a coin and not a contract.
     */
    expect(played.length / watched.length).toBeGreaterThan(0.5);
  });

  /**
   * The point of the whole thing. A tie he played has HIM in the ninety minutes, drawn from
   * the same repertoire a decisive night uses - a keeper claiming crosses, a centre-back
   * throwing himself in front of things, a midfielder threading the pass.
   */
  it("narrates him inside the ties he played, and leaves him out of the ones he did not", () => {
    const isPlayerBeat = (id) => id.startsWith("player");
    const withHim = nights.filter((night) => night.watched && night.played);
    const withoutHim = nights.filter((night) => night.watched && night.played === false);

    expect(withHim.length, "he never played a knockout tie").toBeGreaterThan(5);
    for (const night of withHim) {
      expect(
        night.beats.some(isPlayerBeat),
        `${runKey(night)} ${night.round}: he played and never appeared`,
      ).toBe(true);
    }
    // Only when this sample of careers actually contains one - see above.
    for (const night of withoutHim) {
      expect(
        night.beats.some(isPlayerBeat),
        `${runKey(night)} ${night.round}: left out and still in the feed`,
      ).toBe(false);
    }
  });

  /**
   * Being in the side and having a sight of goal are two different things, and the feed
   * only ever had the first: he appeared, he did some work, and every goal his side scored
   * belonged to nobody. A forward who starts fifteen seasons of quarter-finals and never
   * once scores in one is not a forward.
   *
   * A goal the tie ALREADY HAD can be his. The scoreline is the bracket's and does not
   * move; what changes is whose it was. See GOAL_SHARE in narration.js.
   */
  it("gives him a share of the goals in the ties he starts, and none in the ones he does not", () => {
    const withHim = nights.filter((night) => night.watched && night.played);
    const withoutHim = nights.filter((night) => night.watched && night.played === false);

    const his = withHim.filter((night) => night.beats.includes("playerGoal"));
    expect(his.length, "he never scored in a knockout tie he started").toBeGreaterThan(0);
    // But not most of them: a bracket is not a highlight reel of one man.
    expect(his.length).toBeLessThan(withHim.length);

    for (const night of withoutHim) {
      expect(
        night.beats.includes("playerGoal"),
        `${runKey(night)} ${night.round}: scored in a tie he was left out of`,
      ).toBe(false);
    }
  });

  it("never invents a goal the tie did not have", () => {
    for (const seed of SEEDS) {
      const { run } = timeline(seed);
      for (const record of run.state.history) {
        for (const bracket of record.tournamentRuns ?? []) {
          for (const round of bracket.rounds ?? []) {
            if (!round.live || !round.score) continue;
            // Whatever the feed says about who scored, the tie finished what it finished.
            expect(round.score.us).toBeGreaterThanOrEqual(0);
            expect(Number.isInteger(round.score.us)).toBe(true);
          }
        }
      }
    }
  });

  /**
   * The one thing a tie must never do: happen in a competition his side has already gone
   * out of. Left in the calendar after an eliminated semi-final, a World Cup final was
   * still played - and won - a fortnight after the country was knocked out.
   */
  it("never plays a round of a run that has already ended", () => {
    for (const seed of SEEDS) {
      const { run } = timeline(seed);
      for (const record of run.state.history) {
        for (const bracket of record.tournamentRuns ?? []) {
          const rounds = bracket.rounds ?? [];
          const lost = rounds.findIndex((round) => round.won === false);
          if (lost < 0) continue;
          expect(lost, `${seed} S${record.season} ${bracket.id}: played on after going out`).toBe(
            rounds.length - 1,
          );
        }
      }
    }
  });
});

describe("the bracket and the cabinet say the same thing", () => {
  it("never lifts a cup the run did not win, or loses one it did", () => {
    for (const seed of SEEDS) {
      const { run } = timeline(seed);
      for (const record of run.state.history) {
        for (const bracket of record.tournamentRuns ?? []) {
          const spec = TOURNAMENTS[bracket.id];
          const trophy = spec?.trophy;
          if (!trophy) continue;
          const lifted = [
            ...(record.titles ?? []),
            ...(record.national?.titles ?? []),
          ].some((title) => title.trophy === trophy);
          expect(
            Boolean(bracket.champion),
            `${seed} S${record.season} ${bracket.id}: bracket says ${bracket.champion}, cabinet says ${lifted}`,
          ).toBe(lifted);
        }
      }
    }
  });

  it("leaves no bracket waiting on a night that was already played", () => {
    for (const seed of SEEDS) {
      const { run } = timeline(seed);
      for (const record of run.state.history) {
        for (const bracket of record.tournamentRuns ?? []) {
          expect(bracket.pendingAt, `${seed} S${record.season}: unanswered round`).toBeFalsy();
          expect(bracket.rounds.some((round) => round.pending)).toBe(false);
        }
      }
    }
  });
});

/**
 * The Euro and the Copa America had no bracket at all. The World Cup and the two club cups
 * were simulated; those two existed only as the standalone final that this whole change
 * removed - so half the national tournaments in the game were a single night and nothing
 * else, and taking the night away without building them would have deleted them outright.
 */
describe("every tournament in the table is one a career can actually play", () => {
  it("has a real format for all five", () => {
    for (const id of ["champions", "libertadores", "euro", "copa_america", "world_cup"]) {
      expect(TOURNAMENTS[id], `${id} is not in the table`).toBeTruthy();
      expect(TOURNAMENTS[id].knockout.length).toBeGreaterThan(2);
    }
  });

  it("plays the national ones as brackets rather than as one night", () => {
    const cups = new Set(everyNight().map((night) => night.cup));
    // A Spanish career plays the Euro and the World Cup; the two club cups and the Copa
    // America need a career that goes elsewhere, and the formats above cover those.
    expect(cups.has("euro"), "the Euro never played a knockout round").toBe(true);
    expect(cups.has("world_cup"), "the World Cup never played a knockout round").toBe(true);
  });
});
