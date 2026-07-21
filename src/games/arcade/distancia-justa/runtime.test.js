import { describe, expect, it } from "vitest";
import {
  DistanciaJustaRuntime,
  rankRacers,
  ROUNDS,
  TARGET_MIN_M,
  TARGET_MAX_M,
  FORWARD_SPEED,
  MAX_DISTANCE_M,
} from "./runtime.js";

const make = (seed = 777, opts = {}) => new DistanciaJustaRuntime({ seed, ...opts });

// Drive a round to results: confirm the player, then let time flow so the AI
// rivals reach and commit their own stops (the round only resolves once all
// four have confirmed, or the clock expires).
function playIdleRound(rt) {
  if (rt.snapshot().screen === "announce") rt.skipAnnounce();
  rt.confirmPlayer();
  rt.advanceTime(30000);
  const ais = rt.lastRound.filter((r) => !r.isPlayer);
  const err = ais.reduce((a, r) => a + r.error, 0) / ais.length;
  rt.nextRound();
  return err;
}

describe("target generation", () => {
  it("stays within the 40–180 m band and is reproducible from a seed", () => {
    const a = make(1234);
    const b = make(1234);
    a.startGame("normal");
    b.startGame("normal");
    expect(a.snapshot().targetMeters).toBe(b.snapshot().targetMeters);
    for (let i = 0; i < 20; i += 1) {
      const t = a.snapshot().targetMeters;
      expect(t).toBeGreaterThanOrEqual(TARGET_MIN_M);
      expect(t).toBeLessThanOrEqual(TARGET_MAX_M);
      a.skipAnnounce();
      a.confirmPlayer();
      a.advanceTime(30000);
      a.nextRound();
      if (a.snapshot().screen === "gameover") a.startGame("normal");
    }
  });
});

describe("rankRacers", () => {
  it("ranks by closeness and awards placement points", () => {
    const ranked = rankRacers([
      { id: "a", error: 3 },
      { id: "b", error: 1 },
      { id: "c", error: 8 },
      { id: "d", error: 5 },
    ]);
    const byId = Object.fromEntries(ranked.map((r) => [r.id, r]));
    expect(byId.b.rank).toBe(0);
    expect(byId.b.points).toBe(5);
    expect(byId.a.rank).toBe(1);
    expect(byId.a.points).toBe(3);
    expect(byId.d.points).toBe(2);
    expect(byId.c.points).toBe(1);
  });

  it("lets tied racers share the better placement", () => {
    const ranked = rankRacers([
      { id: "a", error: 2 },
      { id: "b", error: 2 },
      { id: "c", error: 9 },
      { id: "d", error: 9 },
    ]);
    const byId = Object.fromEntries(ranked.map((r) => [r.id, r]));
    expect(byId.a.points).toBe(5);
    expect(byId.b.points).toBe(5);
    expect(byId.c.points).toBe(2);
    expect(byId.d.points).toBe(2);
  });
});

describe("difficulty", () => {
  it("makes rivals tighter as difficulty rises", () => {
    const mean = (level) => {
      const rt = make(4242);
      rt.startGame(level);
      let sum = 0;
      for (let i = 0; i < ROUNDS; i += 1) sum += playIdleRound(rt);
      return sum / ROUNDS;
    };
    const easy = mean("facil");
    const normal = mean("normal");
    const hard = mean("dificil");
    expect(hard).toBeLessThan(normal);
    expect(normal).toBeLessThan(easy);
  });
});

describe("difficulty grid", () => {
  it("keeps signs at 10/20/30 m but zooms the world in on harder levels", () => {
    const rt = make();
    rt.startGame("facil");
    const easy = rt.snapshot();
    rt.startGame("normal");
    const normal = rt.snapshot();
    rt.startGame("dificil");
    const hard = rt.snapshot();

    // Same labelled signs for everyone.
    for (const s of [easy, normal, hard]) {
      expect(s.markerStep).toBe(10);
      expect(s.markerMax).toBe(30);
    }
    // Fewer metres on screen (more zoom) → the same signs sit farther apart.
    expect(normal.viewM).toBeLessThan(easy.viewM);
    expect(hard.viewM).toBeLessThan(normal.viewM);
  });
});

describe("movement", () => {
  it("walks forward and back and clamps to the field", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipAnnounce();
    rt.setMove(1);
    rt.advanceTime(1000);
    expect(rt.snapshot().player.meters).toBeCloseTo(FORWARD_SPEED, 1);
    rt.setMove(-1);
    rt.advanceTime(5000); // walk back past zero
    expect(rt.snapshot().player.meters).toBe(0);
    rt.setMove(1);
    rt.advanceTime(20000); // long forward push, but the field is capped
    expect(rt.snapshot().player.meters).toBeLessThanOrEqual(MAX_DISTANCE_M);
  });

  it("does not move a confirmed runner while rivals finish", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipAnnounce();
    rt.setMove(1);
    rt.advanceTime(1000);
    rt.confirmPlayer();
    const locked = rt.snapshot().player.meters;
    rt.setMove(1);
    rt.advanceTime(1200); // rivals still walking, round not resolved yet
    expect(rt.snapshot().screen).toBe("run");
    expect(rt.snapshot().player.meters).toBeCloseTo(locked, 1);
  });
});

describe("results gating", () => {
  it("holds results until every runner has confirmed a point", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipAnnounce();
    rt.confirmPlayer();
    expect(rt.snapshot().player.confirmed).toBe(true);
    // The player is done, but the rivals are still walking — no results yet.
    expect(rt.snapshot().screen).toBe("run");
    expect(rt.snapshot().waitingForRivals).toBe(true);
    let steps = 0;
    while (rt.snapshot().screen === "run" && steps < 400) {
      rt.advanceTime(100);
      steps += 1;
    }
    expect(rt.snapshot().screen).toBe("reveal");
    // It resolved because all four confirmed, not because the clock ran out.
    expect(rt.snapshot().timeLeftSeconds).toBeGreaterThan(0);
  });

  it("still resolves via the 30s clock if the player never confirms", () => {
    const rt = make();
    rt.startGame("normal");
    rt.skipAnnounce();
    rt.advanceTime(31000);
    expect(rt.snapshot().screen).toBe("reveal");
  });
});

describe("round and match flow", () => {
  it("runs a full match to a sorted final standings", () => {
    const rt = make();
    rt.startGame("normal");
    for (let i = 0; i < ROUNDS; i += 1) {
      expect(rt.snapshot().screen).toBe("announce");
      rt.skipAnnounce();
      expect(rt.snapshot().screen).toBe("run");
      rt.confirmPlayer();
      rt.advanceTime(30000);
      expect(rt.snapshot().screen).toBe("reveal");
      expect(rt.snapshot().lastRound).toHaveLength(4);
      rt.nextRound();
    }
    const snap = rt.snapshot();
    expect(snap.screen).toBe("gameover");
    expect(snap.standings).toHaveLength(4);
    for (let i = 1; i < snap.standings.length; i += 1) {
      expect(snap.standings[i - 1].total).toBeGreaterThanOrEqual(snap.standings[i].total);
    }
  });
});

describe("input routing", () => {
  it("threads the primary action through each screen", () => {
    const rt = make();
    expect(rt.snapshot().screen).toBe("menu");
    rt.pressVirtualKey("Enter"); // menu -> announce
    expect(rt.snapshot().screen).toBe("announce");
    rt.pressVirtualKey("Enter"); // announce -> run (skip)
    expect(rt.snapshot().screen).toBe("run");
    rt.pressVirtualKey("Space"); // confirm player, but rivals still running
    expect(rt.snapshot().screen).toBe("run");
    rt.advanceTime(30000);
    expect(rt.snapshot().screen).toBe("reveal");
  });
});
