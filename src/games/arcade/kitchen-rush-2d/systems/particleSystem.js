import { MAX_PARTICLES } from "../constants";

export function createCutParticles(x, y, type) {
  const particles = [];
  for (let i = 0; i < 6; i += 1) {
    particles.push({
      kind: "cut_piece",
      x,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 2,
      alpha: 0.9,
      life: 26 + Math.random() * 12,
      size: 3 + Math.random() * 2,
      spriteKey: `${type}_piece`,
      tint: "#f5d0a8",
    });
  }
  return particles;
}

export function spawnBoilBubble(x, y) {
  return {
    kind: "boil_bubble",
    x: x + Math.random() * 26 - 13,
    y,
    radius: 2 + Math.random() * 3,
    vy: -0.5 - Math.random(),
    alpha: 0.8,
    life: 30,
  };
}

export function createSteamParticle(x, y) {
  return {
    kind: "steam",
    x: x + (Math.random() - 0.5) * 10,
    y,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -0.6 - Math.random() * 0.45,
    alpha: 0.7,
    size: 6 + Math.random() * 6,
    life: 50,
  };
}

export function createFrySpark(x, y) {
  return {
    kind: "fry_spark",
    x,
    y,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -Math.random() * 1.2,
    alpha: 1,
    size: 2 + Math.random(),
    life: 12,
  };
}

export function createSmokeParticle(x, y) {
  return {
    kind: "smoke",
    x: x + (Math.random() - 0.5) * 10,
    y,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.35 - Math.random() * 0.3,
    alpha: 0.5,
    size: 8 + Math.random() * 8,
    life: 54,
  };
}

export function createSuccessBurst(x, y, color = "#fde68a") {
  const burst = [];
  for (let i = 0; i < 18; i += 1) {
    const angle = (Math.PI * 2 * i) / 18;
    const speed = 2 + Math.random() * 2.5;
    burst.push({
      kind: "success",
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      size: 2 + Math.random() * 2,
      life: 22 + Math.random() * 16,
      tint: color,
    });
  }
  return burst;
}

export function pushParticles(state, newParticles) {
  if (!newParticles || newParticles.length === 0) {
    return;
  }
  state.particles.push(...newParticles);
  if (state.particles.length > MAX_PARTICLES) {
    state.particles.splice(0, state.particles.length - MAX_PARTICLES);
  }
}

export function updateParticles(state, deltaMs) {
  const gravity = 0.0038;
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx ?? 0;
    particle.y += particle.vy ?? 0;
    particle.life -= deltaMs / 16.67;

    if (particle.kind === "cut_piece" || particle.kind === "success") {
      particle.vy += gravity * deltaMs;
    }

    if (particle.kind === "steam" || particle.kind === "smoke") {
      particle.alpha = Math.max(0, particle.alpha - 0.009 * (deltaMs / 16.67));
    } else {
      particle.alpha = Math.max(0, particle.alpha - 0.02 * (deltaMs / 16.67));
    }

    return particle.life > 0 && particle.alpha > 0;
  });
}
