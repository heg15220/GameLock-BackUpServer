import { STAGE_HEIGHT, STAGE_WIDTH } from "./levels";

function sampleTerrain(terrain, x) {
  const clampedX = Math.max(0, Math.min(STAGE_WIDTH, x));
  for (let i = 0; i < terrain.length - 1; i += 1) {
    const a = terrain[i];
    const b = terrain[i + 1];
    if (clampedX >= a.x && clampedX <= b.x) {
      const t = (clampedX - a.x) / (b.x - a.x || 1);
      return a.y + (b.y - a.y) * t;
    }
  }
  return terrain[terrain.length - 1].y;
}

function createGroundPath(ctx, terrain) {
  ctx.beginPath();
  ctx.moveTo(0, STAGE_HEIGHT);
  ctx.lineTo(terrain[0].x, terrain[0].y);
  terrain.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.lineTo(STAGE_WIDTH, STAGE_HEIGHT);
  ctx.closePath();
}

function drawSky(ctx, level, elapsedMs) {
  const env = level.environment;
  const gradient = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT);
  gradient.addColorStop(0, env.skyTop);
  gradient.addColorStop(1, env.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);

  ctx.fillStyle = env.haze;
  ctx.fillRect(0, STAGE_HEIGHT * 0.28, STAGE_WIDTH, STAGE_HEIGHT * 0.34);

  if (env.atmosphere === "night" || env.atmosphere === "volcanic-night" || env.atmosphere === "neon") {
    ctx.fillStyle = "rgba(232,244,255,0.75)";
    for (let i = 0; i < 56; i += 1) {
      const x = (i * 97) % STAGE_WIDTH;
      const y = 40 + ((i * 67) % 220);
      const twinkle = 0.45 + 0.55 * Math.sin(elapsedMs * 0.003 + i * 0.9);
      ctx.globalAlpha = twinkle;
      ctx.beginPath();
      ctx.arc(x, y, 1.1 + (i % 3) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (env.atmosphere !== "neon") {
      ctx.fillStyle = "rgba(242,248,255,0.8)";
      ctx.beginPath();
      ctx.arc(820, 92, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(220,240,255,0.25)";
      ctx.beginPath();
      ctx.arc(812, 86, 31, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (env.atmosphere === "sunset") {
    ctx.fillStyle = "rgba(255,226,173,0.58)";
    ctx.beginPath();
    ctx.arc(792, 120, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  if (env.atmosphere === "storm") {
    ctx.fillStyle = "rgba(30,49,73,0.26)";
    for (let i = 0; i < 5; i += 1) {
      const y = 78 + i * 36;
      ctx.beginPath();
      ctx.ellipse(140 + i * 170, y, 140, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const flash = Math.max(0, Math.sin(elapsedMs * 0.009 + 1.8));
    if (flash > 0.94) {
      ctx.fillStyle = `rgba(224,242,255,${(flash - 0.94) * 6})`;
      ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT);
    }
  }

  if (env.atmosphere === "neon") {
    ctx.fillStyle = "rgba(25,38,72,0.4)";
    for (let i = 0; i < 18; i += 1) {
      const w = 26 + (i % 4) * 9;
      const h = 42 + (i % 6) * 26;
      const x = i * 56;
      const y = 286 - h;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(123,188,255,0.22)";
      ctx.fillRect(x + 4, y + 6, w - 8, 2);
      ctx.fillStyle = "rgba(25,38,72,0.4)";
    }
  }

  ctx.fillStyle = env.cloud;
  for (let i = 0; i < 4; i += 1) {
    const x = 120 + i * 230;
    const y = 82 + (i % 2) * 68;
    ctx.beginPath();
    ctx.ellipse(x, y, 132, 38, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMountain(ctx, mountain) {
  const baseY = mountain.baseY;
  const halfWidth = mountain.width * 0.5;
  const topY = baseY - mountain.height;

  ctx.fillStyle = mountain.tint;
  ctx.beginPath();
  ctx.moveTo(mountain.x - halfWidth, baseY);
  ctx.lineTo(mountain.x, topY);
  ctx.lineTo(mountain.x + halfWidth, baseY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.beginPath();
  ctx.moveTo(mountain.x, topY);
  ctx.lineTo(mountain.x - halfWidth * 0.2, topY + mountain.height * 0.25);
  ctx.lineTo(mountain.x + halfWidth * 0.1, topY + mountain.height * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(34,50,63,0.28)";
  ctx.beginPath();
  ctx.moveTo(mountain.x, topY);
  ctx.lineTo(mountain.x + halfWidth * 0.72, baseY);
  ctx.lineTo(mountain.x + halfWidth * 0.18, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawTreesAndProps(ctx, level) {
  const env = level.environment;
  level.scenery.trees.forEach((tree) => {
    const terrainY = sampleTerrain(level.terrain, tree.x);
    const trunkTop = terrainY - tree.size;
    ctx.strokeStyle = "rgba(73,47,28,0.7)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tree.x, terrainY);
    ctx.lineTo(tree.x, trunkTop);
    ctx.stroke();

    ctx.fillStyle = env.tree;
    ctx.beginPath();
    ctx.ellipse(tree.x, trunkTop + 4, tree.size * 0.38, tree.size * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(23,32,37,0.3)";
  level.scenery.props.forEach((prop) => {
    const y = sampleTerrain(level.terrain, prop.x);
    ctx.fillRect(prop.x - prop.width * 0.5, y - prop.height, prop.width, prop.height);
  });
}

function drawGround(ctx, level) {
  const env = level.environment;
  createGroundPath(ctx, level.terrain);
  ctx.fillStyle = env.deepSoil;
  ctx.fill();

  ctx.save();
  createGroundPath(ctx, level.terrain);
  ctx.clip();

  ctx.fillStyle = env.midGrass;
  for (let x = 0; x < STAGE_WIDTH + 32; x += 34) {
    ctx.fillRect(x, 0, 18, STAGE_HEIGHT);
  }

  ctx.fillStyle = env.topGrass;
  ctx.beginPath();
  ctx.moveTo(level.terrain[0].x, level.terrain[0].y);
  level.terrain.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  level.terrain
    .slice()
    .reverse()
    .forEach((point) => ctx.lineTo(point.x, point.y + 26));
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(66,114,34,0.56)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(level.terrain[0].x, level.terrain[0].y);
  level.terrain.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
}

function drawTerrainStrip(ctx, terrain, x1, x2, depth) {
  const points = [];
  for (let x = x1; x <= x2; x += 8) {
    points.push({ x, y: sampleTerrain(terrain, x) });
  }
  points.push({ x: x2, y: sampleTerrain(terrain, x2) });
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  points
    .slice()
    .reverse()
    .forEach((point) => ctx.lineTo(point.x, point.y + depth));
  ctx.closePath();
}

function drawObstacles(ctx, runtime, elapsedMs) {
  const terrain = runtime.level.terrain;
  const obstacles = runtime.obstacles;

  obstacles.hazardPits.forEach((pit) => {
    const wave = Math.sin(elapsedMs * 0.004 + pit.x1 * 0.02) * 2.6;
    ctx.fillStyle = pit.tint;
    ctx.fillRect(pit.x1, pit.top + wave, pit.x2 - pit.x1, STAGE_HEIGHT - pit.top + 1);
    ctx.strokeStyle = pit.edge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pit.x1, pit.top + wave);
    ctx.lineTo(pit.x2, pit.top + wave);
    ctx.stroke();
  });

  obstacles.surfacePatches.forEach((patch) => {
    drawTerrainStrip(ctx, terrain, patch.x1, patch.x2, 18);
    ctx.fillStyle = patch.tint;
    ctx.fill();
    ctx.strokeStyle = "rgba(33,44,52,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  obstacles.windZones.forEach((zone) => {
    ctx.fillStyle = "rgba(126,210,255,0.14)";
    ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
    ctx.strokeStyle = "rgba(175,231,255,0.46)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);

    const direction = zone.currentForce >= 0 ? 1 : -1;
    for (let y = zone.y + 14; y < zone.y + zone.height; y += 18) {
      const anim = (elapsedMs * 0.08 + y) % 18;
      const startX = direction > 0 ? zone.x + 8 : zone.x + zone.width - 8;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(219,245,255,0.6)";
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + direction * (14 + anim), y - 2);
      ctx.stroke();
    }
  });

  obstacles.walls.forEach((wall) => {
    ctx.fillStyle = wall.tint;
    ctx.fillRect(wall.x, wall.top, wall.width, wall.height);
    ctx.fillStyle = "rgba(233,248,255,0.2)";
    ctx.fillRect(wall.x + 2, wall.top + 2, 2, wall.height - 4);
    ctx.fillStyle = "rgba(10,18,28,0.22)";
    ctx.fillRect(wall.x + wall.width - 3, wall.top + 2, 2, wall.height - 4);
  });

  const drawBumper = (bumper, moving) => {
    const gradient = ctx.createRadialGradient(
      bumper.x - bumper.radius * 0.25,
      bumper.y - bumper.radius * 0.3,
      1,
      bumper.x,
      bumper.y,
      bumper.radius
    );
    gradient.addColorStop(0, "#fff8c9");
    gradient.addColorStop(1, bumper.tint ?? "#f39e48");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = moving ? "rgba(146,233,255,0.9)" : "rgba(122,72,25,0.92)";
    ctx.lineWidth = moving ? 2.6 : 2;
    ctx.stroke();
  };

  obstacles.bumpers.forEach((bumper) => drawBumper(bumper, false));
  obstacles.movingBumpers.forEach((mover) => drawBumper(mover, true));
}

function drawCoins(ctx, coins, elapsedMs) {
  coins.forEach((coin, index) => {
    if (coin.collected) {
      return;
    }
    const pulse = Math.sin(elapsedMs * 0.006 + index * 0.7) * 1.8;
    ctx.beginPath();
    ctx.fillStyle = "rgba(255,210,66,0.96)";
    ctx.arc(coin.x, coin.y + pulse, coin.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(185,124,0,0.95)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,236,143,0.96)";
    ctx.font = "700 15px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("1", coin.x, coin.y + pulse + 0.5);
  });
}

function drawCup(ctx, level, elapsedMs) {
  const hole = level.hole;
  const env = level.environment;

  ctx.fillStyle = "rgba(36,21,12,0.92)";
  ctx.fillRect(hole.x - hole.cupWidth * 0.36, hole.y + 2, hole.cupWidth * 0.72, hole.cupDepth);
  ctx.beginPath();
  ctx.fillStyle = "rgba(20,13,10,0.96)";
  ctx.ellipse(hole.x, hole.y + hole.cupDepth, hole.cupWidth * 0.36, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = "#17100f";
  ctx.ellipse(hole.x, hole.y + 1, hole.rimRadius, hole.rimRadius * 0.64, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = "rgba(180,224,222,0.82)";
  ctx.lineWidth = 2.4;
  ctx.ellipse(hole.x, hole.y + 1, hole.rimRadius + 3, hole.rimRadius * 0.74, 0, 0, Math.PI * 2);
  ctx.stroke();

  const poleX = hole.x + hole.cupWidth * 0.5 + 4;
  const poleTop = hole.y - 60;
  ctx.strokeStyle = "rgba(222,244,255,0.95)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(poleX, hole.y - 2);
  ctx.lineTo(poleX, poleTop);
  ctx.stroke();

  const flutter = Math.sin(elapsedMs * 0.008) * 4;
  ctx.fillStyle = env.flag;
  ctx.beginPath();
  ctx.moveTo(poleX, poleTop + 2);
  ctx.quadraticCurveTo(poleX + 28 + flutter, poleTop + 8, poleX, poleTop + 16);
  ctx.closePath();
  ctx.fill();
}

function drawTrail(ctx, trail) {
  trail.forEach((dot) => {
    const alpha = dot.life;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${0.32 * alpha})`;
    ctx.arc(dot.x, dot.y, 1.8 + 2.2 * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawAim(ctx, runtime) {
  if (runtime.mode !== "playing" || runtime.ball.moving) {
    return;
  }
  runtime.aim.preview.forEach((point, index) => {
    const alpha = 0.2 + (index / runtime.aim.preview.length) * 0.5;
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.arc(point.x, point.y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBall(ctx, ball) {
  ctx.beginPath();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.ellipse(ball.x + 1.8, ball.y + 5.4, 8.4, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();

  const gradient = ctx.createRadialGradient(ball.x - 2.5, ball.y - 3.5, 1, ball.x, ball.y, ball.radius + 1.6);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#dbe8ef");
  ctx.beginPath();
  ctx.fillStyle = gradient;
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(88,106,118,0.82)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

export function drawGolfScene(ctx, runtime) {
  const level = runtime.level;
  const elapsedMs = runtime.levelTimeMs;

  drawSky(ctx, level, elapsedMs);
  level.scenery.mountains.forEach((mountain) => drawMountain(ctx, mountain));
  drawTreesAndProps(ctx, level);
  drawGround(ctx, level);
  drawObstacles(ctx, runtime, elapsedMs);
  drawCoins(ctx, runtime.coins, elapsedMs);
  drawCup(ctx, level, elapsedMs);
  drawTrail(ctx, runtime.trail);
  drawAim(ctx, runtime);
  drawBall(ctx, runtime.ball);
}
