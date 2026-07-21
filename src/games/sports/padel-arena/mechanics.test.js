import { describe, it, expect } from "vitest";
import { PadelRuntime } from "./engine.js";
import {
  HALF_W,
  NET_Z,
  NEAR_Z,
  FAR_Z,
  SERVICE_LINE_NEAR,
  SERVICE_LINE_FAR,
  NET_HEIGHT,
  sideOfZ,
} from "./physics.js";

function makeCanvas() {
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "createLinearGradient" || prop === "createRadialGradient") {
          return () => ({ addColorStop: () => {} });
        }
        if (prop === "measureText") return () => ({ width: 40 });
        return () => {};
      },
    },
  );
  return { clientWidth: 960, clientHeight: 540, width: 0, height: 0, getContext: () => ctx };
}

function newRuntime() {
  const rt = new PadelRuntime({ canvas: makeCanvas(), locale: "es", onSnapshot: () => {}, onFullscreen: () => {} });
  rt.start();
  return rt;
}

describe("serve formation", () => {
  it("places all four players in a legal serve formation", () => {
    const rt = newRuntime();
    rt.startMatch(); // home serves first, right court
    const [p0, p1, p2, p3] = rt.players;

    // Exactly one player on each side sits deep (server/receiver) and one at the net.
    const home = [p0, p1];
    const away = [p2, p3];
    // Home is the serving side: one behind the near service line, one at the net.
    const homeDeep = home.find((p) => p.z < SERVICE_LINE_NEAR);
    const homeNet = home.find((p) => Math.abs(p.z - NET_Z) < 90);
    expect(homeDeep).toBeTruthy();
    expect(homeNet).toBeTruthy();
    // Away is receiving: one deep behind the far service line, one at the net.
    const awayDeep = away.find((p) => p.z > SERVICE_LINE_FAR);
    const awayNet = away.find((p) => Math.abs(p.z - NET_Z) < 90);
    expect(awayDeep).toBeTruthy();
    expect(awayNet).toBeTruthy();

    // Server and receiver stand cross-court (diagonal), on opposite x halves.
    expect(Math.sign(homeDeep.x)).toBe(-Math.sign(awayDeep.x));

    // Every player stays inside the court.
    for (const p of rt.players) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(HALF_W);
      expect(p.z).toBeGreaterThanOrEqual(NEAR_Z);
      expect(p.z).toBeLessThanOrEqual(FAR_Z);
    }
    rt.destroy();
  });

  it("makes you the server when your team serves", () => {
    const rt = newRuntime();
    rt.startMatch();
    expect(rt.players[rt.activeIndex].team).toBe("home");
    expect(rt.activeIndex).toBe(rt.serverIndex);
    rt.destroy();
  });

  it("makes you the receiver when the CPU serves", () => {
    const rt = newRuntime();
    rt.match = { ...rt.match, server: "away" };
    rt.beginServe();
    expect(rt.players[rt.activeIndex].team).toBe("home");
    expect(rt.activeIndex).not.toBe(rt.serverIndex);
    rt.destroy();
  });

  it("keeps the serve formation while waiting to serve (no drift)", () => {
    const rt = newRuntime();
    rt.startMatch();
    const before = rt.players.map((p) => ({ x: p.x, z: p.z }));
    for (let i = 0; i < 60; i++) rt.advanceTime(1000 / 60); // 1s of serve wait
    const after = rt.players.map((p) => ({ x: p.x, z: p.z }));
    expect(after).toEqual(before);
    rt.destroy();
  });
});

describe("shot type resolution", () => {
  // Drive a home hit from a controlled ball/keys state and read the resulting
  // swing kind the engine tagged on the player.
  function hitWith({ keys = {}, shot = "volea", ballY, floorBounces, playerZ, ballDX = 0 }) {
    const rt = newRuntime();
    rt.startMatch();
    rt.screen = "rally";
    rt.keys = { ...keys };
    rt.pendingShot = shot;
    rt.activeIndex = 0;
    rt.players[0].x = 0;
    rt.players[0].z = playerZ;
    rt.ball = { ...rt.ball, live: true, x: ballDX, y: ballY, z: playerZ, floorBounces, owner: "away" };
    rt.playerHit(0);
    const kind = rt.players[0].swingKind;
    const spin = rt.ball.spin;
    rt.destroy();
    return { kind, spin };
  }
  const kindOf = (opts) => hitWith(opts).kind;

  it("plays a lob when the Globo shot is chosen", () => {
    expect(kindOf({ shot: "globo", ballY: 40, floorBounces: 1, playerZ: 200 })).toBe("lob");
  });

  it("plays a drop shot when the Dejada shot is chosen", () => {
    expect(kindOf({ shot: "dejada", ballY: 40, floorBounces: 1, playerZ: 200 })).toBe("dejada");
  });

  it("plays a backhand (revés) when the Revés shot is chosen", () => {
    expect(kindOf({ shot: "reves", ballY: 40, floorBounces: 1, playerZ: 200 })).toBe("reves");
  });

  it("smashes a high ball near the net on the Volea (attack) shot", () => {
    expect(kindOf({ shot: "volea", ballY: NET_HEIGHT * 3, floorBounces: 0, playerZ: NET_Z - 40 })).toBe("smash");
  });

  it("plays a víbora on a very high ball with a marked direction", () => {
    expect(
      kindOf({ keys: { ArrowRight: true }, ballY: NET_HEIGHT * 3.2, floorBounces: 0, playerZ: NET_Z - 40 }),
    ).toBe("vibora");
  });

  it("plays a bandeja on a mid-height ball at the net", () => {
    expect(kindOf({ ballY: NET_HEIGHT * 1.6, floorBounces: 1, playerZ: NET_Z - 60 })).toBe("bandeja");
  });

  it("volleys a ball taken in the air away from the net", () => {
    expect(kindOf({ ballY: NET_HEIGHT * 1.4, floorBounces: 0, playerZ: 160 })).toBe("volea");
  });

  it("drives (liftada) a bounced ball from the back", () => {
    expect(kindOf({ ballY: 30, floorBounces: 1, playerZ: 120 })).toBe("drive");
  });

  it("falls back to a floaty defensive return on a poor, stretched contact", () => {
    expect(kindOf({ ballY: 26, floorBounces: 1, playerZ: 200, ballDX: 52 })).toBe("defensive");
  });

  it("puts topspin on a drive and backspin on a drop shot", () => {
    expect(hitWith({ ballY: 30, floorBounces: 1, playerZ: 120 }).spin).toBeGreaterThan(0);
    expect(hitWith({ shot: "dejada", ballY: 40, floorBounces: 1, playerZ: 200 }).spin).toBeLessThan(0);
  });
});

describe("lobs sail over the net players", () => {
  it("a high lob is out of a player's vertical reach (passes over) but a lower ball is reachable", () => {
    const rt = newRuntime();
    rt.startMatch();
    rt.screen = "rally";
    const netPlayer = rt.players[2]; // rival en la red
    netPlayer.x = 0;
    netPlayer.z = NET_Z + 30;
    // Globo alto sobre él: fuera de alcance vertical → sobrevuela, no lo intercepta.
    rt.ball = { ...rt.ball, live: true, owner: "home", x: 0, y: NET_HEIGHT * 3.8, z: NET_Z + 30, vz: 1 };
    expect(rt.ballReachableBy(netPlayer)).toBe(false);
    // La misma bola más baja sí es alcanzable.
    rt.ball = { ...rt.ball, y: NET_HEIGHT * 1.4 };
    expect(rt.ballReachableBy(netPlayer)).toBe(true);
    rt.destroy();
  });
});

describe("AI returns clear the net", () => {
  it("sends an away return over the net into the near court", () => {
    const rt = newRuntime();
    rt.startMatch();
    rt.screen = "rally";
    rt.aiConfig = { ...rt.aiConfig, faultChance: 0 }; // fuerza una devolución real
    // Rival de fondo con una bola baja del equipo local, lista para devolver.
    const away = rt.players[2];
    away.x = 0;
    away.z = FAR_Z - 40;
    rt.ball = { ...rt.ball, live: true, owner: "home", x: 0, y: 10, z: FAR_Z - 40, vx: 0, vy: 0, vz: 0, floorBounces: 1 };
    rt.aiHit(2);
    expect(rt.ball.owner).toBe("away");

    // Vuela la bola: debe cruzar el plano de la red por encima de la cinta.
    let prev = rt.ball;
    let crossHeight = null;
    for (let i = 0; i < 240; i++) {
      const next = { ...prev };
      next.vy = prev.vy - 392 * (1 / 60);
      next.x = prev.x + prev.vx / 60;
      next.y = prev.y + prev.vy / 60;
      next.z = prev.z + prev.vz / 60;
      if ((prev.z - NET_Z) * (next.z - NET_Z) <= 0 && crossHeight === null) {
        const f = (NET_Z - prev.z) / (next.z - prev.z || 1);
        crossHeight = prev.y + (next.y - prev.y) * f;
        break;
      }
      prev = next;
    }
    expect(crossHeight).not.toBeNull();
    expect(crossHeight).toBeGreaterThan(NET_HEIGHT);
    rt.destroy();
  });
});

describe("AI is beatable: reaction delay opens gaps", () => {
  it("delays chasing a fresh incoming shot instead of instantly covering it", () => {
    const rt = newRuntime();
    rt.startMatch();
    rt.screen = "rally";
    const p = rt.players[2]; // rival
    p.x = 0;
    p.z = FAR_Z - 40;
    // Golpe nuevo del jugador local hacia el rival, justo sobre él (alcanzable).
    rt.ball = { ...rt.ball, live: true, owner: "home", x: 0, y: 30, z: FAR_Z - 40, vx: 0, vy: 0, vz: 200, floorBounces: 1 };
    rt.ballHitId = 99;
    rt.updatePlayers(1 / 60, false);
    expect(p.reactMs).toBeGreaterThan(0); // está reaccionando, no golpea aún
    expect(rt.ball.owner).toBe("home"); // no ha devuelto todavía
    expect(typeof p.readErrX).toBe("number"); // lee la bola con error lateral
    rt.destroy();
  });
});

describe("the point banner names the winning team", () => {
  it("shows your point when your team wins it", () => {
    const rt = newRuntime();
    rt.startMatch();
    rt.screen = "rally";
    rt.ball = { ...rt.ball, live: true, owner: "home", floorBounces: 0 };
    rt.endPoint("home", "test");
    expect(rt.banner).toBe(rt.copy.pointForYou);
    expect(rt.pointFor).toBe("home");
    rt.destroy();
  });

  it("names the rival when the CPU wins the point", () => {
    const rt = newRuntime();
    rt.startMatch();
    rt.screen = "rally";
    rt.ball = { ...rt.ball, live: true, owner: "away", floorBounces: 0 };
    rt.endPoint("away", "test");
    expect(rt.banner).toBe(rt.copy.pointForCpu);
    expect(rt.pointFor).toBe("away");
    rt.destroy();
  });
});

describe("glass rebound stays in play", () => {
  it("keeps the point alive when a bounced ball hits the back glass", () => {
    const rt = newRuntime();
    rt.startMatch();
    rt.screen = "rally";
    // A ball owned by away, already bounced on the near floor, driving into the
    // near back glass — must rebound and keep playing, not end the point.
    rt.ball = { ...rt.ball, live: true, owner: "away", x: 0, y: 12, z: 8, vx: 0, vy: 40, vz: -120, floorBounces: 1 };
    rt.updateBall(1 / 60);
    // Still a rally (no point awarded) and the ball is now travelling back out.
    expect(rt.screen).toBe("rally");
    expect(sideOfZ(rt.ball.z)).toBe("near");
    rt.destroy();
  });
});
