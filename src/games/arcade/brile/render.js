// Top-down renderer for Brilé — a fenced twilight graveyard court split by a
// bright centre line. Two grass courts in the middle, a walled "cementerio"
// strip of headstones behind each one (where the brilados wait), faceless
// team-coloured figures (blue = you, red = rivals) and rubber balls. A live ball
// heading at you flashes a catch telegraph.
//
// Pure function of runtime state — it reads, never mutates.

import { ARENA_W, ARENA_H, CEM_W, CENTER_X, WALL_MARGIN, BODY_R } from "./runtime.js";

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hash(n) {
  const t = Math.sin(n * 12.9898) * 43758.5453;
  return t - Math.floor(t);
}

function drawTombstone(ctx, cx, groundY, w, h) {
  const top = groundY - h;
  ctx.fillStyle = "rgba(15,22,16,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.12, groundY, w * 0.6, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, "#b9bec4");
  g.addColorStop(0.5, "#8b9197");
  g.addColorStop(1, "#5f656c");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, groundY);
  ctx.lineTo(cx - w / 2, top + w / 2);
  ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(60,70,60,0.5)";
  ctx.lineWidth = Math.max(1, w * 0.06);
  ctx.beginPath();
  ctx.moveTo(cx, top + h * 0.3);
  ctx.lineTo(cx, top + h * 0.62);
  ctx.moveTo(cx - w * 0.16, top + h * 0.42);
  ctx.lineTo(cx + w * 0.16, top + h * 0.42);
  ctx.stroke();
}

// A compact faceless runner. Volume from a moonlit rim and an underside shadow;
// the shirt carries the team colour. Prisoners are drawn a touch desaturated.
function drawFigure(ctx, p, sx, sy, r, isYou, pulse, elapsedMs) {
  const f = p.facing >= 0 ? 1 : -1;
  const speed = Math.hypot(p.vx || 0, p.vy || 0);
  const moving = speed > 3;
  const dim = p.zone === "prison" ? 0.72 : 1;

  const cyc = (elapsedMs / 1000) * 10 + (p.wander || 0) * 6;
  const swing = moving ? Math.sin(cyc) : Math.sin(elapsedMs / 900) * 0.1;
  const bob = moving ? Math.abs(Math.sin(cyc)) * r * 0.18 : 0;

  const baseY = sy + r * 0.5;
  const hipY = baseY - r * 0.62 + bob;
  const bodyH = r * 1.1;
  const bodyW = r * 1.28;
  const bodyTopY = hipY - bodyH;
  const headR = r * 0.72;
  const headCY = bodyTopY - headR * 0.45;

  // ground shadow
  ctx.fillStyle = "rgba(14,20,12,0.38)";
  ctx.beginPath();
  ctx.ellipse(sx, baseY, r * 0.95, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = dim;

  // legs
  ctx.strokeStyle = "#28324c";
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.32;
  const spread = r * 0.3;
  const lift = r * 0.42;
  ctx.beginPath();
  ctx.moveTo(sx - spread, hipY);
  ctx.lineTo(sx - spread + swing * lift, baseY);
  ctx.moveTo(sx + spread, hipY);
  ctx.lineTo(sx + spread - swing * lift, baseY);
  ctx.stroke();

  // arms (skin), one forward when moving
  ctx.strokeStyle = p.skin || "#f2c9a0";
  ctx.lineWidth = r * 0.26;
  const shoulderY = bodyTopY + bodyH * 0.3;
  ctx.beginPath();
  ctx.moveTo(sx - bodyW * 0.4, shoulderY);
  ctx.lineTo(sx - bodyW * 0.4 - swing * r * 0.4, shoulderY + r * 0.6);
  ctx.moveTo(sx + bodyW * 0.4, shoulderY);
  ctx.lineTo(sx + bodyW * 0.4 + (p.holding ? f * r * 0.7 : swing * r * 0.4), shoulderY + (p.holding ? -r * 0.1 : r * 0.6));
  ctx.stroke();

  // body (team shirt)
  const grad = ctx.createLinearGradient(sx - bodyW / 2, 0, sx + bodyW / 2, 0);
  grad.addColorStop(0, p.shirtShade || "rgba(0,0,0,0.3)");
  grad.addColorStop(0.5, p.color);
  grad.addColorStop(1, p.color);
  ctx.fillStyle = grad;
  roundRect(ctx, sx - bodyW / 2, bodyTopY, bodyW, bodyH, bodyW * 0.34);
  ctx.fill();
  // rim light
  ctx.save();
  roundRect(ctx, sx - bodyW / 2, bodyTopY, bodyW, bodyH, bodyW * 0.34);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.ellipse(sx + bodyW * 0.3, bodyTopY + bodyH * 0.3, bodyW * 0.3, bodyH * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // head (faceless)
  ctx.fillStyle = p.skin || "#f2c9a0";
  ctx.beginPath();
  ctx.arc(sx, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, headCY, headR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.arc(sx + headR * 0.3, headCY - headR * 0.3, headR * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.arc(sx - headR * 0.32, headCY + headR * 0.34, headR * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // hair cap
  ctx.fillStyle = p.hair || "#3a2a1a";
  ctx.beginPath();
  ctx.arc(sx, headCY, headR, Math.PI * 1.03, Math.PI * 2 - 0.03, false);
  ctx.arc(sx, headCY - headR * 0.2, headR * 0.96, Math.PI * 2 - 0.03, Math.PI * 1.03, true);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;

  if (isYou) {
    ctx.strokeStyle = "#e2f2ff";
    ctx.globalAlpha = 0.5 + pulse * 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, baseY, r * 1.2, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const ay = headCY - headR - r * 0.6 - pulse * r * 0.3;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(sx, ay + r * 0.45);
    ctx.lineTo(sx - r * 0.45, ay);
    ctx.lineTo(sx + r * 0.45, ay);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBall(ctx, x, y, r, flight) {
  ctx.fillStyle = "rgba(12,18,10,0.35)";
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r);
  g.addColorStop(0, "#fff1c9");
  g.addColorStop(0.5, "#f6b73c");
  g.addColorStop(1, "#c9761a");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,50,10,0.5)";
  ctx.lineWidth = Math.max(0.6, r * 0.14);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  if (flight) {
    ctx.strokeStyle = "rgba(255,241,201,0.5)";
    ctx.lineWidth = Math.max(0.8, r * 0.2);
    ctx.beginPath();
    ctx.arc(x, y, r * 1.7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawScene(ctx, rt, W, H, dpr = 1) {
  const width = W ?? ctx.canvas.width;
  const height = H ?? ctx.canvas.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Twilight sky.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#3b4a52");
  sky.addColorStop(0.55, "#465049");
  sky.addColorStop(1, "#2e3a2f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // Moon glow, upper right.
  const mg = ctx.createRadialGradient(width * 0.86, height * 0.16, 4, width * 0.86, height * 0.16, height * 0.6);
  mg.addColorStop(0, "rgba(226,232,240,0.4)");
  mg.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#e8edf2";
  ctx.beginPath();
  ctx.arc(width * 0.86, height * 0.16, Math.max(7, height * 0.03), 0, Math.PI * 2);
  ctx.fill();

  const pad = Math.min(width, height) * 0.08;
  const scale = Math.min((width - 2 * pad) / ARENA_W, (height - 2 * pad) / ARENA_H);
  const aw = ARENA_W * scale;
  const ah = ARENA_H * scale;
  const ox = (width - aw) / 2;
  const oy = (height - ah) / 2;
  const wx = (x) => ox + x * scale;
  const wy = (y) => oy + y * scale;

  // Zone rectangles (x bands).
  const zone = (x0, x1, fill) => {
    ctx.fillStyle = fill;
    ctx.fillRect(wx(x0), wy(0), (x1 - x0) * scale, ah);
  };

  ctx.save();
  roundRect(ctx, ox, oy, aw, ah, 8);
  ctx.clip();

  // Graveyard strips (behind each court) — dark earth.
  zone(0, CEM_W, "#39352b");
  zone(ARENA_W - CEM_W, ARENA_W, "#39352b");
  // The two grass courts, faintly team-tinted.
  const gA = ctx.createLinearGradient(wx(CEM_W), 0, wx(CENTER_X), 0);
  gA.addColorStop(0, "#5f6f49");
  gA.addColorStop(1, "#6f7d4f");
  ctx.fillStyle = gA;
  ctx.fillRect(wx(CEM_W), wy(0), (CENTER_X - CEM_W) * scale, ah);
  const gB = ctx.createLinearGradient(wx(CENTER_X), 0, wx(ARENA_W - CEM_W), 0);
  gB.addColorStop(0, "#6f7d4f");
  gB.addColorStop(1, "#5f6f49");
  ctx.fillStyle = gB;
  ctx.fillRect(wx(CENTER_X), wy(0), (ARENA_W - CEM_W - CENTER_X) * scale, ah);
  // subtle team tint washes
  ctx.fillStyle = "rgba(56,189,248,0.08)";
  ctx.fillRect(wx(CEM_W), wy(0), (CENTER_X - CEM_W) * scale, ah);
  ctx.fillStyle = "rgba(244,63,94,0.08)";
  ctx.fillRect(wx(CENTER_X), wy(0), (ARENA_W - CEM_W - CENTER_X) * scale, ah);

  // Mowing stripes.
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let i = 0; i < 10; i += 1) {
    if (i % 2 === 0) ctx.fillRect(wx(CEM_W) + (i * (aw - 2 * CEM_W * scale)) / 10, wy(0), (aw - 2 * CEM_W * scale) / 20, ah);
  }

  // Boundary line between each court and its back strip.
  ctx.strokeStyle = "rgba(230,235,240,0.35)";
  ctx.lineWidth = Math.max(1.5, scale * 0.8);
  for (const x of [CEM_W, ARENA_W - CEM_W]) {
    ctx.beginPath();
    ctx.moveTo(wx(x), wy(0));
    ctx.lineTo(wx(x), wy(ARENA_H));
    ctx.stroke();
  }

  // Centre line — bright, dashed.
  ctx.strokeStyle = "rgba(248,250,252,0.85)";
  ctx.lineWidth = Math.max(2, scale * 1.1);
  ctx.setLineDash([scale * 5, scale * 4]);
  ctx.beginPath();
  ctx.moveTo(wx(CENTER_X), wy(0));
  ctx.lineTo(wx(CENTER_X), wy(ARENA_H));
  ctx.stroke();
  ctx.setLineDash([]);

  // A few headstones dotted through each graveyard strip.
  const stoneW = Math.max(6, scale * 5);
  for (let i = 0; i < 5; i += 1) {
    const fy = (i + 0.5) / 5;
    const lY = wy(ARENA_H * fy);
    drawTombstone(ctx, wx(CEM_W * (0.35 + hash(i) * 0.35)), lY, stoneW, stoneW * 1.3);
    drawTombstone(ctx, wx(ARENA_W - CEM_W * (0.35 + hash(i + 9) * 0.35)), lY, stoneW, stoneW * 1.3);
  }
  ctx.restore();

  // Fence around the whole arena.
  ctx.strokeStyle = "#171c18";
  ctx.lineWidth = Math.max(2, scale * 1.1);
  roundRect(ctx, wx(WALL_MARGIN), wy(WALL_MARGIN), (ARENA_W - 2 * WALL_MARGIN) * scale, (ARENA_H - 2 * WALL_MARGIN) * scale, 6);
  ctx.stroke();

  // Catch telegraph: any live enemy ball closing on an in-court body gets a red
  // aim line; the human also gets a pulsing ring so the catch cue is unmissable.
  const you = rt.player;
  for (const ball of rt.balls) {
    if (ball.state !== "flight" || !ball.live) continue;
    const foe = ball.team === "A" ? "B" : "A";
    let tgt = null;
    let td = Infinity;
    for (const p of rt.players) {
      if (p.team !== foe || p.zone !== "court") continue;
      const bl = Math.hypot(ball.vx, ball.vy) || 1;
      const rel = ((p.x - ball.x) * ball.vx + (p.y - ball.y) * ball.vy) / bl;
      if (rel < 0) continue;
      const perp = Math.abs((p.x - ball.x) * -ball.vy + (p.y - ball.y) * ball.vx) / bl;
      if (perp < 8 && rel < td) {
        td = rel;
        tgt = p;
      }
    }
    if (tgt) {
      ctx.strokeStyle = "rgba(248,113,113,0.5)";
      ctx.lineWidth = Math.max(1, scale * 0.6);
      ctx.setLineDash([scale * 2, scale * 2]);
      ctx.beginPath();
      ctx.moveTo(wx(ball.x), wy(ball.y));
      ctx.lineTo(wx(tgt.x), wy(tgt.y));
      ctx.stroke();
      ctx.setLineDash([]);
      if (tgt === you) {
        const pr = (Math.sin(rt.elapsedMs / 90) + 1) / 2;
        ctx.strokeStyle = `rgba(248,113,113,${0.5 + pr * 0.5})`;
        ctx.lineWidth = Math.max(1.5, scale * 0.9);
        ctx.beginPath();
        ctx.arc(wx(tgt.x), wy(tgt.y), scale * (5 + pr * 3), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // Painter-sort figures + loose/flight balls by world y.
  const pulse = (Math.sin(rt.elapsedMs / 260) + 1) / 2;
  const r = Math.max(5, BODY_R * scale * 1.5);
  const drawables = [
    ...rt.players.map((p) => ({ y: p.y, kind: "fig", p })),
    ...rt.balls.filter((b) => b.state !== "held").map((b) => ({ y: b.y, kind: "ball", b })),
  ].sort((a, b) => a.y - b.y);
  for (const d of drawables) {
    if (d.kind === "fig") {
      drawFigure(ctx, d.p, wx(d.p.x), wy(d.p.y), r, d.p.isPlayer, d.p.isPlayer ? pulse : 0, rt.elapsedMs);
    } else {
      drawBall(ctx, wx(d.b.x), wy(d.b.y), Math.max(2.5, scale * 2), d.b.state === "flight");
    }
  }
  // Held balls drawn last so they sit over their carrier's hand.
  for (const b of rt.balls) {
    if (b.state === "held") drawBall(ctx, wx(b.x), wy(b.y), Math.max(2.5, scale * 2), false);
  }

  // Twilight vignette.
  const vg = ctx.createRadialGradient(width / 2, height * 0.46, Math.min(width, height) * 0.34, width / 2, height / 2, Math.max(width, height) * 0.66);
  vg.addColorStop(0, "rgba(12,18,14,0)");
  vg.addColorStop(1, "rgba(12,18,14,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);
}

export default drawScene;
