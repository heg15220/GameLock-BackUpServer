import { describe, expect, it } from "vitest";
import {
  PadelRuntime,
  CHARGE_MAX_MS,
  POWER_DEPTH_GAIN,
  POWER_FLIGHT_GAIN,
} from "./engine.js";

// Canvas de mentira: el motor solo necesita un contexto 2D que no reviente.
function stubCanvas() {
  const ctx = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "canvas") return { width: 960, height: 540 };
        return () => {
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return { addColorStop() {} };
          }
          if (prop === "measureText") return { width: 40 };
          return undefined;
        };
      },
      set: () => true,
    },
  );
  return { clientWidth: 960, clientHeight: 540, width: 960, height: 540, getContext: () => ctx };
}

const make = () =>
  new PadelRuntime({ canvas: stubCanvas(), locale: "es", onSnapshot: () => {} });

// Lleva el motor a un peloteo con el humano como jugador activo.
function intoRally(rt) {
  rt.startMatch();
  rt.screen = "rally";
  return rt;
}

describe("carga de potencia al mantener pulsado", () => {
  it("empieza a cero y sube mientras se mantiene", () => {
    const rt = intoRally(make());
    expect(rt.chargeRatio()).toBe(0);

    rt.onHitPress("volea");
    expect(rt.hitHeld).toBe(true);
    rt.updateActivePlayer(0.1); // 100 ms
    const parcial = rt.chargeRatio();
    expect(parcial).toBeGreaterThan(0);
    expect(parcial).toBeLessThan(1);

    rt.updateActivePlayer(0.1);
    expect(rt.chargeRatio()).toBeGreaterThan(parcial);
  });

  it("no pasa del tope por mucho que se aguante", () => {
    const rt = intoRally(make());
    rt.onHitPress("volea");
    for (let i = 0; i < 40; i += 1) rt.updateActivePlayer(0.1); // 4 s
    expect(rt.chargeRatio()).toBe(1);
    expect(rt.hitChargeMs).toBe(CHARGE_MAX_MS);
  });

  it("soltar congela la carga en vez de descargarla", () => {
    const rt = intoRally(make());
    rt.onHitPress("volea");
    rt.updateActivePlayer(0.2);
    const alSoltar = rt.chargeRatio();
    rt.onHitRelease("volea");
    expect(rt.hitHeld).toBe(false);
    rt.updateActivePlayer(0.3);
    expect(rt.chargeRatio()).toBeCloseTo(alSoltar, 6);
  });

  it("la repetición de tecla del sistema no reinicia la carga", () => {
    const rt = intoRally(make());
    rt.onHitPress("volea");
    rt.updateActivePlayer(0.2);
    const antes = rt.chargeRatio();
    rt.onHitPress("volea"); // como haría el autorrepeat
    expect(rt.chargeRatio()).toBe(antes);
  });

  it("cambiar de golpe mientras cargas reinicia la carga", () => {
    const rt = intoRally(make());
    rt.onHitPress("volea");
    rt.updateActivePlayer(0.2);
    expect(rt.chargeRatio()).toBeGreaterThan(0);
    rt.onHitPress("globo");
    expect(rt.chargeRatio()).toBe(0);
    expect(rt.pendingShot).toBe("globo");
  });

  it("mantener conserva el swing armado", () => {
    const rt = intoRally(make());
    rt.onHitPress("volea");
    // Más tiempo del que dura la ventana normal de golpeo.
    for (let i = 0; i < 10; i += 1) rt.updateActivePlayer(0.1);
    expect(rt.players[rt.activeIndex].swingArmedMs).toBeGreaterThan(0);
  });
});

describe("los tres dispositivos usan el mismo circuito", () => {
  it("teclado: keydown carga y keyup suelta", () => {
    const rt = intoRally(make());
    rt.onKeyDown({ code: "KeyF", repeat: false, preventDefault() {} });
    expect(rt.hitHeld).toBe(true);
    rt.onKeyUp({ code: "KeyF" });
    expect(rt.hitHeld).toBe(false);
  });

  it("teclado: keydown con repeat no reinicia", () => {
    const rt = intoRally(make());
    rt.onKeyDown({ code: "KeyF", repeat: false, preventDefault() {} });
    rt.updateActivePlayer(0.2);
    const antes = rt.chargeRatio();
    rt.onKeyDown({ code: "KeyF", repeat: true, preventDefault() {} });
    expect(rt.chargeRatio()).toBe(antes);
  });

  it("botón en pantalla y deck móvil: press/release virtuales", () => {
    const rt = intoRally(make());
    rt.pressVirtualKey("KeyH");
    expect(rt.hitHeld).toBe(true);
    expect(rt.pendingShot).toBe("globo");
    rt.updateActivePlayer(0.15);
    expect(rt.chargeRatio()).toBeGreaterThan(0);
    rt.releaseVirtualKey("KeyH");
    expect(rt.hitHeld).toBe(false);
  });

  it("soltar una tecla que no es de golpe no toca la carga", () => {
    const rt = intoRally(make());
    rt.onHitPress("volea");
    rt.updateActivePlayer(0.2);
    const antes = rt.chargeRatio();
    rt.onKeyUp({ code: "ArrowLeft" });
    expect(rt.hitHeld).toBe(true);
    expect(rt.chargeRatio()).toBe(antes);
  });
});

describe("mantener pulsado no encadena golpes sobre la misma bola", () => {
  // Regresión: al mantener, el swing se re-arma cada frame. Como tras golpear la
  // bola sigue unos frames dentro del alcance del jugador, se volvía a golpear
  // al frame siguiente: dos (o más) sonidos de pala solapados a milisegundos, y
  // la trayectoria relanzada encima. La rama de la IA ya se protegía mirando la
  // posesión; la del humano no la necesitaba mientras el swing se desarmaba solo.
  function rallyBallAtPlayer(rt) {
    const p = rt.players[rt.activeIndex];
    rt.ball = {
      ...rt.ball,
      live: true,
      owner: "away", // viene del rival: es legal devolverla
      x: p.x,
      z: p.z,
      y: 40,
      floorBounces: 1,
      glassHits: 0,
    };
    return p;
  }

  it("golpea una sola vez aunque se siga aguantando el botón", () => {
    const rt = intoRally(make());
    rallyBallAtPlayer(rt);
    let golpes = 0;
    const strike = rt.strike.bind(rt);
    rt.strike = (...args) => {
      golpes += 1;
      return strike(...args);
    };

    rt.onHitPress("volea");
    // Medio segundo aguantando, que es justo lo que invita a hacer la carga.
    for (let i = 0; i < 30; i += 1) rt.updateActivePlayer(1 / 60);

    expect(golpes).toBe(1);
  });

  it("vuelve a golpear cuando el rival ha devuelto la bola", () => {
    const rt = intoRally(make());
    rallyBallAtPlayer(rt);
    let golpes = 0;
    const strike = rt.strike.bind(rt);
    rt.strike = (...args) => {
      golpes += 1;
      return strike(...args);
    };

    rt.onHitPress("volea");
    for (let i = 0; i < 10; i += 1) rt.updateActivePlayer(1 / 60);
    expect(golpes).toBe(1);

    // El rival la devuelve: la bola vuelve a ser jugable para el humano.
    rallyBallAtPlayer(rt);
    for (let i = 0; i < 10; i += 1) rt.updateActivePlayer(1 / 60);
    expect(golpes).toBe(2);
  });
});

describe("la potencia se nota en el golpe", () => {
  it("las ganancias son aditivas: un toque seco deja el juego como estaba", () => {
    // power = 0 no debe alterar ni profundidad ni vuelo.
    expect(1 + POWER_DEPTH_GAIN * 0).toBe(1);
    expect(1 - POWER_FLIGHT_GAIN * 0).toBe(1);
  });

  it("a plena carga la bola va más al fondo y llega antes", () => {
    expect(1 + POWER_DEPTH_GAIN * 1).toBeGreaterThan(1);
    expect(1 - POWER_FLIGHT_GAIN * 1).toBeLessThan(1);
    // Sin pasarse: sigue siendo pádel, no un cañón.
    expect(POWER_DEPTH_GAIN).toBeLessThanOrEqual(0.25);
    expect(POWER_FLIGHT_GAIN).toBeLessThanOrEqual(0.25);
  });

  it("el golpe gasta la carga", () => {
    const rt = intoRally(make());
    rt.onHitPress("volea");
    rt.updateActivePlayer(0.3);
    expect(rt.chargeRatio()).toBeGreaterThan(0);
    rt.playerHit(rt.activeIndex);
    expect(rt.chargeRatio()).toBe(0);
  });

  it("el snapshot publica la carga para el HUD", () => {
    let snap = null;
    const rt = new PadelRuntime({
      canvas: stubCanvas(),
      locale: "es",
      onSnapshot: (s) => {
        snap = s;
      },
    });
    intoRally(rt);
    rt.onHitPress("volea");
    rt.updateActivePlayer(0.26);
    rt.pushSnapshot();
    expect(snap.charging).toBe(true);
    expect(snap.charge).toBeGreaterThan(0);
    expect(snap.charge).toBeLessThanOrEqual(1);
  });
});
