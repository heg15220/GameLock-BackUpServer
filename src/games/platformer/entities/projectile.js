import { PROJECTILE_SETTINGS } from "../config";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const createProjectile = (player) => ({
  id: `fire-${Math.round(Math.random() * 1e9)}`,
  type: "fireball",
  x: player.facing === "right" ? player.x + player.w - 4 : player.x - PROJECTILE_SETTINGS.width + 4,
  y: player.y + player.h * 0.45,
  w: PROJECTILE_SETTINGS.width,
  h: PROJECTILE_SETTINGS.height,
  vx: player.facing === "right" ? PROJECTILE_SETTINGS.speed : -PROJECTILE_SETTINGS.speed,
  vy: -180,
  lifeTimer: PROJECTILE_SETTINGS.lifespanSeconds,
  active: true
});

export const updateProjectile = (projectile, dt, level, moveEntityWithCollisions) => {
  if (!projectile.active) {
    return null;
  }

  projectile.lifeTimer -= dt;
  if (projectile.lifeTimer <= 0) {
    projectile.active = false;
    return null;
  }

  projectile.vy += 400 * dt;
  projectile.vy = clamp(projectile.vy, -9999, 260);

  const collision = moveEntityWithCollisions(projectile, level, dt, { allowOneWay: false });
  if (collision.hitLeft || collision.hitRight || collision.hitCeiling || collision.landed || collision.fellOut) {
    projectile.active = false;
  }
  return collision;
};

