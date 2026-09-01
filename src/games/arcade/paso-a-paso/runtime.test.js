import { describe, expect, it } from "vitest";
import {
  PasoAPasoRuntime,
  NUMBERS,
  TOP_STEP,
  PICK_MS,
  REVEAL_MS,
  CLIMB_MS,
  aiWeights,
  nashMix,
  resolvePicks,
} from "./runtime.js";

// One full round: the pick window, the reveal, and the climb.
const ROUND_MS = PICK_MS + REVEAL_MS + CLIMB_MS + 40;

function fresh(options = {}) {
  const rt = new PasoAPasoRuntime({ seed: 1234, ...options });
  rt.startMatch(options.difficulty ?? "normal");
  return rt;
}

describe("resolvePicks", () => {
  it("advances only the numbers nobody else chose", () => {
    expect(resolvePicks([1, 3, 5, 5])).toEqual([
      { pick: 1, unique: true, gain: 1 },
      { pick: 3, unique: true, gain: 3 },
      { pick: 5, unique: false, gain: 0 },
      { pick: 5, unique: false, gain: 0 },
    ]);
  });

  it("moves nobody when everyone picks the same number", () => {
    for (const result of resolvePicks([5, 5, 5, 5])) expect(result.gain).toBe(0);
  });

  it("treats a missing pick as no move without blocking anyone", () => {
    const [a, b, c, d] = resolvePicks([null, null, 3, 5]);
    expect(a.gain).toBe(0);
    expect(b.gain).toBe(0);
    // Two nulls must not read as a clash for each other, and must leave the
    // real numbers untouched.
    expect(c).toEqual({ pick: 3, unique: true, gain: 3 });
    expect(d).toEqual({ pick: 5, unique: true, gain: 5 });
  });
});

describe("nashMix", () => {
  it("is a probability distribution", () => {
    const mix = nashMix(4);
    expect(mix).toHaveLength(NUMBERS.length);
    expect(mix.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    for (const p of mix) expect(p).toBeGreaterThan(0);
  });

  it("equalises the value of every number, so no pick dominates", () => {
    const mix = nashMix(4);
    const values = NUMBERS.map((k, i) => k * (1 - mix[i]) ** 3);
    expect(values[1]).toBeCloseTo(values[0], 6);
    expect(values[2]).toBeCloseTo(values[0], 6);
  });

  it("still prefers 5 over 1, which is what makes the game tense", () => {
    const [p1, p3, p5] = nashMix(4);
    expect(p5).toBeGreaterThan(p3);
    expect(p3).toBeGreaterThan(p1);
  });
});

describe("aiWeights", () => {
  const arg = (over = {}) => ({ personality: "equilibrio", difficulty: "normal", need: TOP_STEP, ...over });

  it("favours the only number that reaches the top, harder the closer it is", () => {
    const share = (w, i) => w[i] / w.reduce((a, b) => a + b, 0);
    // From four or five steps out only 5 gets there, so 5 is the favourite —
    // and more so at five, where falling short cannot be repaired.
    expect(share(aiWeights(arg({ need: 4 })), 2)).toBeGreaterThan(0.6);
    expect(share(aiWeights(arg({ need: 5 })), 2)).toBeGreaterThan(
      share(aiWeights(arg({ need: 4 })), 2),
    );
    // An easy rival fumbles its own finish often enough to be catchable.
    expect(share(aiWeights(arg({ need: 4, difficulty: "facil" })), 2)).toBeLessThan(0.5);
  });

  it("repositions with a quiet number instead of locking onto the only finisher", () => {
    const share = (w, i) => w[i] / w.reduce((a, b) => a + b, 0);
    const w = aiWeights(arg({ need: 4, difficulty: "dificil" }));
    // 5 is the only winner from four out, but a rival that only ever played 5
    // there would deadlock against every other rival on 4 or 5. Taking the quiet
    // 1 leaves it three steps out, where 3 and 5 both win — so 1 has to outrank
    // the contested 3, and the 5 must not be an absolute lock.
    expect(share(w, 2)).toBeLessThan(0.85);
    expect(share(w, 0)).toBeGreaterThan(share(w, 1));
  });

  it("prefers the least contested finisher when several numbers would win", () => {
    const w = aiWeights(arg({ need: 1 }));
    // 1, 3 and 5 all finish, but 1 is the one nobody else wants.
    expect(w[0]).toBeGreaterThan(w[1]);
    expect(w[0]).toBeGreaterThan(w[2]);
  });

  it("leans on 5 for the impulsive rival and off it for the cautious one", () => {
    const impulsive = aiWeights(arg({ personality: "impulsivo", behind: 6 }));
    const cautious = aiWeights(arg({ personality: "prudente" }));
    const norm = (w) => w.map((v) => v / w.reduce((a, b) => a + b, 0));
    expect(norm(impulsive)[2]).toBeGreaterThan(norm(cautious)[2]);
    expect(norm(cautious)[0]).toBeGreaterThan(norm(impulsive)[0]);
  });

  it("sits on the number the human keeps repeating rather than dodging it", () => {
    const norm = (w) => w.map((v) => v / w.reduce((a, b) => a + b, 0));
    const blind = norm(aiWeights(arg({ personality: "lector", difficulty: "dificil" })));
    const read = norm(
      aiWeights(arg({ personality: "lector", difficulty: "dificil", humanBias: { 5: 6 } })),
    );
    // Colliding is the punishment for a one-note player; stepping aside would
    // hand them the number for free.
    expect(read[2]).toBeGreaterThan(blind[2]);
  });

  it("ignores a human who is already well behind", () => {
    const norm = (w) => w.map((v) => v / w.reduce((a, b) => a + b, 0));
    const blind = norm(aiWeights(arg({ personality: "lector", difficulty: "dificil" })));
    const trailing = norm(
      aiWeights(arg({
        personality: "lector",
        difficulty: "dificil",
        humanBias: { 5: 6 },
        humanLead: -5,
      })),
    );
    expect(trailing[2]).toBeCloseTo(blind[2], 6);
  });

  it("takes the number the leader needs to finish, on hard only", () => {
    const norm = (w) => w.map((v) => v / w.reduce((a, b) => a + b, 0));
    const quiet = norm(aiWeights(arg({ difficulty: "dificil" })));
    const blocking = norm(aiWeights(arg({ difficulty: "dificil", threatNeed: 4 })));
    expect(blocking[2]).toBeGreaterThan(quiet[2]);

    // Blocking measurably hurts whoever does it in a four-way race, so only the
    // hard rivals pay that price; normal and easy ones just climb.
    for (const difficulty of ["normal", "facil"]) {
      const calm = norm(aiWeights(arg({ difficulty })));
      const pressed = norm(aiWeights(arg({ difficulty, threatNeed: 4 })));
      expect(pressed[2]).toBeCloseTo(calm[2], 6);
    }
  });

  it("never denies a leader who is further from the gate than itself", () => {
    const norm = (w) => w.map((v) => v / w.reduce((a, b) => a + b, 0));
    const quiet = norm(aiWeights(arg({ difficulty: "dificil", need: 2 })));
    const pressed = norm(aiWeights(arg({ difficulty: "dificil", need: 2, threatNeed: 4 })));
    expect(pressed[2]).toBeCloseTo(quiet[2], 6);
  });
});

describe("PasoAPasoRuntime", () => {
  it("starts on the menu with everyone at the bottom", () => {
    const rt = new PasoAPasoRuntime({ seed: 7 });
    const snap = rt.snapshot();
    expect(snap.screen).toBe("menu");
    expect(snap.players).toHaveLength(4);
    expect(snap.players.every((p) => p.step === 0)).toBe(true);
    expect(snap.topStep).toBe(TOP_STEP);
  });

  it("gives the player the reference's ten seconds and then reveals", () => {
    const rt = fresh();
    expect(rt.snapshot().screen).toBe("pick");
    expect(rt.snapshot().secondsLeft).toBe(10);
    rt.advanceTime(PICK_MS - 500);
    expect(rt.snapshot().screen).toBe("pick");
    rt.advanceTime(600);
    expect(rt.snapshot().screen).toBe("reveal");
  });

  it("never leaks the rivals' numbers before the reveal", () => {
    const rt = fresh();
    rt.choose(3);
    const hidden = rt.snapshot();
    expect(hidden.players[0].pick).toBe(3);
    expect(hidden.players.slice(1).every((p) => p.pick === null)).toBe(true);
    rt.advanceTime(PICK_MS + 10);
    const shown = rt.snapshot();
    expect(shown.players.slice(1).every((p) => NUMBERS.includes(p.pick))).toBe(true);
  });

  it("marks who has settled on a number without saying which", () => {
    const rt = fresh();
    // Nobody has committed in the first instant of the round.
    expect(rt.snapshot().players.every((p) => p.locked === false)).toBe(true);

    // The human locks the moment they choose; the number is theirs to see.
    rt.choose(3);
    const afterChoice = rt.snapshot();
    expect(afterChoice.players[0].locked).toBe(true);
    expect(afterChoice.players[0].pick).toBe(3);

    // The rivals settle at staggered moments, and every one of them is locked
    // before the ten seconds are up — but their numbers stay hidden throughout.
    rt.advanceTime(PICK_MS - 200);
    const late = rt.snapshot();
    expect(late.screen).toBe("pick");
    expect(late.players.slice(1).every((p) => p.locked === true)).toBe(true);
    expect(late.players.slice(1).every((p) => p.pick === null)).toBe(true);
  });

  it("has the rivals decide at the top of the round, not at the reveal", () => {
    const rt = fresh();
    // The choice is simultaneous, so a rival's number cannot depend on the one
    // the human has not made yet: it already exists behind the snapshot.
    expect(rt.players.slice(1).every((p) => NUMBERS.includes(p.pick))).toBe(true);
    const decided = rt.players.slice(1).map((p) => p.pick);
    rt.choose(5);
    rt.advanceTime(PICK_MS + 10);
    expect(rt.snapshot().players.slice(1).map((p) => p.pick)).toEqual(decided);
  });

  it("moves the player by their number only when it was theirs alone", () => {
    const rt = fresh();
    rt.choose(5);
    rt.advanceTime(PICK_MS + 10);
    const revealed = rt.snapshot();
    const you = revealed.players[0];
    const clashed = revealed.players.slice(1).some((p) => p.pick === 5);
    expect(you.unique).toBe(!clashed);
    rt.advanceTime(REVEAL_MS + CLIMB_MS + 20);
    expect(rt.snapshot().players[0].step).toBe(clashed ? 0 : 5);
  });

  it("stays put when the clock runs out with no choice", () => {
    const rt = fresh();
    rt.advanceTime(ROUND_MS);
    expect(rt.snapshot().players[0].step).toBe(0);
    expect(rt.snapshot().round).toBe(2);
  });

  it("lets the player change their mind until the clock stops", () => {
    const rt = fresh();
    rt.choose(1);
    rt.advanceTime(4000);
    rt.choose(5);
    expect(rt.snapshot().yourPick).toBe(5);
    rt.advanceTime(PICK_MS - 4000 + 10);
    expect(rt.snapshot().screen).toBe("reveal");
    expect(rt.snapshot().players[0].pick).toBe(5);
  });

  it("refuses picks once the numbers are out", () => {
    const rt = fresh();
    rt.choose(3);
    rt.advanceTime(PICK_MS + 10);
    rt.choose(5);
    expect(rt.snapshot().players[0].pick).toBe(3);
  });

  it("ends the moment somebody stands on step 12 and never overshoots it", () => {
    const rt = fresh();
    rt.players[1].step = TOP_STEP - 1;
    rt.players[1].fromStep = TOP_STEP - 1;
    for (let i = 0; i < 40 && rt.snapshot().screen !== "gameover"; i += 1) {
      rt.advanceTime(ROUND_MS);
    }
    const snap = rt.snapshot();
    expect(snap.screen).toBe("gameover");
    expect(snap.winners.length).toBeGreaterThan(0);
    for (const player of snap.players) expect(player.step).toBeLessThanOrEqual(TOP_STEP);
    for (const id of snap.winners) {
      expect(snap.players.find((p) => p.id === id).step).toBe(TOP_STEP);
    }
  });

  it("declares every climber that reached the top in the same round", () => {
    const rt = fresh();
    // Two rivals one step from the gate: 1 and 3 both finish, and the finishing
    // logic sends them to different numbers, so both should arrive together.
    rt.players[1].step = TOP_STEP - 1;
    rt.players[2].step = TOP_STEP - 3;
    rt.advanceTime(ROUND_MS);
    const snap = rt.snapshot();
    if (snap.screen === "gameover") {
      expect(snap.winners.length).toBeGreaterThanOrEqual(1);
      expect(new Set(snap.winners).size).toBe(snap.winners.length);
    }
  });

  it("breaks the endgame deadlock instead of stalling on 5 forever", () => {
    // Three climbers four steps from the gate all want the same 5. If the AI
    // could only ever play its one winning number they would clash every round
    // and the match would never end.
    let worst = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      const rt = new PasoAPasoRuntime({ seed });
      rt.startMatch("dificil");
      for (const player of rt.players.slice(1)) {
        player.step = TOP_STEP - 4;
        player.fromStep = TOP_STEP - 4;
      }
      let rounds = 0;
      while (rt.snapshot().screen !== "gameover" && rounds < 100) {
        rt.advanceTime(ROUND_MS); // the human never picks: this is the AI alone
        rounds += 1;
      }
      expect(rt.snapshot().screen).toBe("gameover");
      worst = Math.max(worst, rounds);
    }
    expect(worst).toBeLessThan(20);
  });

  it("is reproducible from a seed", () => {
    const run = () => {
      const rt = new PasoAPasoRuntime({ seed: 99 });
      rt.startMatch("dificil");
      const picks = [];
      for (let i = 0; i < 8 && rt.snapshot().screen !== "gameover"; i += 1) {
        rt.choose(NUMBERS[i % NUMBERS.length]);
        rt.advanceTime(ROUND_MS);
        picks.push(rt.snapshot().players.map((p) => p.step).join("-"));
      }
      return picks.join("|");
    };
    expect(run()).toBe(run());
  });

  it("pauses the clock instead of letting the round expire behind a menu", () => {
    const rt = fresh();
    rt.advanceTime(2000);
    rt.togglePause();
    rt.advanceTime(30000);
    expect(rt.snapshot().screen).toBe("pick");
    rt.togglePause();
    rt.advanceTime(PICK_MS);
    expect(rt.snapshot().screen).not.toBe("pick");
  });

  it("maps the d-pad the way the Wii original does", () => {
    const rt = fresh();
    rt.pressVirtualKey("ArrowLeft");
    expect(rt.snapshot().yourPick).toBe(1);
    rt.pressVirtualKey("ArrowUp");
    expect(rt.snapshot().yourPick).toBe(3);
    rt.pressVirtualKey("ArrowRight");
    expect(rt.snapshot().yourPick).toBe(5);
    rt.pressVirtualKey("Digit1");
    expect(rt.snapshot().yourPick).toBe(1);
  });

  it("keeps a match under the pace the equilibrium predicts", () => {
    // ~0.68 steps per round at equilibrium, so 12 steps is roughly 18 rounds for
    // one climber and fewer for the fastest of four. A match that regularly ran
    // past 40 rounds would mean the AI had collapsed onto one number.
    let worst = 0;
    for (let seed = 0; seed < 25; seed += 1) {
      const rt = new PasoAPasoRuntime({ seed });
      rt.startMatch("normal");
      let rounds = 0;
      while (rt.snapshot().screen !== "gameover" && rounds < 200) {
        rt.choose(NUMBERS[rounds % NUMBERS.length]);
        rt.advanceTime(ROUND_MS);
        rounds += 1;
      }
      expect(rt.snapshot().screen).toBe("gameover");
      worst = Math.max(worst, rounds);
    }
    expect(worst).toBeLessThan(40);
  });
});
