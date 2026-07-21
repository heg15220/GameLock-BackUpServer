import { describe, expect, it } from "vitest";
import * as P from "./physics.js";
import {
  SERVE_TRIGGER_DZ, SERVE_V_MIN, SERVE_V_MAX, SERVE_MAX_DRIFT, SERVE_EDGE_MARGIN,
  SERVE_SIDE_SAFETY,
} from "./engine.js";

const {
  createBall, serveBallShot, stepBall,
  BOARD_Z, BOARD_END, NET_Z, BAT_REST_Y, BOARD_HALF_WIDTH, MAX_MOVE_VELOCITY, clamp,
} = P;

// Copia del mapeo de engine.serveShotParams(). Se duplica a propósito: el motor
// necesita un canvas para instanciarse y lo que se está fijando aquí es el
// mapeo gesto → saque, no la clase.
function serveParams(dz, dx) {
  const sideAngle = dx !== 0 ? Math.atan(dz / dx) : 0;
  const d = clamp(dz, SERVE_TRIGGER_DZ, MAX_MOVE_VELOCITY);
  const t = (d - SERVE_TRIGGER_DZ) / (MAX_MOVE_VELOCITY - SERVE_TRIGGER_DZ);
  return { velocity: SERVE_V_MIN + t * (SERVE_V_MAX - SERVE_V_MIN), sideAngle };
}

// Copia de engine.serveOriginX(): la bola se pone en juego sobre la mesa.
function serveOriginX(batX) {
  const limit = BOARD_HALF_WIDTH - SERVE_EDGE_MARGIN;
  return clamp(batX, -limit, limit);
}

// Copia de engine.serveDriftCap().
function driftCap(velocity, batX) {
  const room = Math.max(0, BOARD_HALF_WIDTH - Math.abs(serveOriginX(batX)) - SERVE_SIDE_SAFETY);
  const vz = Math.abs(velocity * Math.cos(P.SERVE_ANGLE));
  const steps = (BOARD_END - BOARD_Z) / Math.max(1, vz * P.TIME);
  return Math.min(SERVE_MAX_DRIFT, room / (steps * 10));
}

// Lanza un saque y devuelve dónde bota y cuánto se desvía.
function simulate(dz, dx, batX = 0) {
  const { velocity, sideAngle } = serveParams(dz, dx);
  let ball = serveBallShot(
    createBall({ x: serveOriginX(batX), y: BAT_REST_Y, z: BOARD_Z }),
    velocity,
    sideAngle,
    driftCap(velocity, batX),
  );
  let ownBounce = null;
  let farBounce = null;
  let bounces = 0;
  let maxX = Math.abs(serveOriginX(batX));
  for (let i = 0; i < 400 && farBounce === null; i += 1) {
    ball = stepBall(ball);
    if (ball.bounceCount > bounces) {
      bounces = ball.bounceCount;
      if (ball.z < NET_Z) ownBounce ??= ball.z;
      else farBounce ??= ball.z;
    }
    maxX = Math.max(maxX, Math.abs(ball.x));
    if (ball.y < 0) break;
  }
  return { ownBounce, farBounce, maxX, velocity };
}

// Gestos de pala plausibles. dz es un delta por frame dividido por DT, así que
// un flick normal satura MAX_MOVE_VELOCITY: el extremo del rango no es un caso
// raro, es lo que hace cualquiera al sacar con ganas.
const FORWARD = [SERVE_TRIGGER_DZ + 1, 200, 400, 700, 1000, 1200, 1600, 4000];
const SIDEWAYS = [0, 1, 25, 120, 400, 900, 1600, -1, -25, -400, -1600];

describe("saque del jugador", () => {
  // Regresión: el mapeo del peloteo (velocidad 60..90) mandaba fuera cualquier
  // saque por encima de 88 — y como dz satura, un flick enérgico daba
  // exactamente 90 siempre. Sacar con fuerza era falta garantizada.
  it("cae dentro de la mesa con cualquier gesto, por fuerte que sea", () => {
    for (const dz of FORWARD) {
      for (const dx of SIDEWAYS) {
        const { farBounce, ownBounce } = simulate(dz, dx);
        expect(ownBounce, `dz=${dz} dx=${dx}: no bota en campo propio`).not.toBeNull();
        expect(farBounce, `dz=${dz} dx=${dx}: no llega al campo rival`).not.toBeNull();
        expect(farBounce, `dz=${dz} dx=${dx}: se pasa de largo`).toBeLessThanOrEqual(BOARD_END);
      }
    }
  });

  it("no se sale por los lados ni cortando desde el borde", () => {
    for (const dz of FORWARD) {
      for (const dx of SIDEWAYS) {
        // Desde el centro, desde el borde y con la pala fuera de la mesa (puede
        // irse BOUNDARY_PADDING más allá), que es el caso peor.
        for (const batX of [0, -BOARD_HALF_WIDTH, BOARD_HALF_WIDTH, -500, 500]) {
          const { maxX } = simulate(dz, dx, batX);
          expect(maxX, `dz=${dz} dx=${dx} batX=${batX}: se va de lado`).toBeLessThanOrEqual(
            BOARD_HALF_WIDTH,
          );
        }
      }
    }
  });

  it("el gesto sigue decidiendo la profundidad", () => {
    // El arreglo no puede aplanar el saque a un único golpe: empujar flojo debe
    // dejarla corta y empujar fuerte debe llevarla al fondo.
    const suave = simulate(SERVE_TRIGGER_DZ + 1, 0);
    const fuerte = simulate(MAX_MOVE_VELOCITY, 0);
    expect(fuerte.farBounce).toBeGreaterThan(suave.farBounce + 150);
    expect(suave.velocity).toBeCloseTo(SERVE_V_MIN, 1);
    expect(fuerte.velocity).toBeCloseTo(SERVE_V_MAX, 1);
  });

  it("el corte sigue moviendo la bola de lado", () => {
    const recto = simulate(600, 0);
    const cortado = simulate(600, 900);
    expect(cortado.maxX).toBeGreaterThan(recto.maxX + 50);
  });

  it("la deriva del saque queda acotada aunque el corte sea extremo", () => {
    const cap = driftCap(80, 0);
    const ball = serveBallShot(createBall({ x: 0, y: BAT_REST_Y, z: BOARD_Z }), 80, 0.05, cap);
    expect(Math.abs(ball.vx)).toBeLessThanOrEqual(SERVE_MAX_DRIFT);
    expect(Math.abs(ball.vx)).toBeLessThanOrEqual(cap);
  });

  it("sacar desde el borde recorta la deriva; desde el centro no", () => {
    expect(driftCap(80, 0)).toBe(SERVE_MAX_DRIFT);
    expect(driftCap(80, BOARD_HALF_WIDTH)).toBeLessThan(SERVE_MAX_DRIFT);
    // Y un saque lento tiene menos presupuesto que uno rápido: vuela más pasos.
    expect(driftCap(SERVE_V_MIN, 300)).toBeLessThan(driftCap(SERVE_V_MAX, 300));
  });

  it("el peloteo conserva el modelo original sin tope", () => {
    // maxDrift por defecto = 1: hitBall y el resto no cambian de comportamiento.
    const ball = serveBallShot(createBall({ x: 0, y: BAT_REST_Y, z: BOARD_Z }), 80, 0.05);
    expect(Math.abs(ball.vx)).toBeCloseTo(Math.cos(0.05), 5);
  });
});
