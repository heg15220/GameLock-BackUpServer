// Top-down renderer for Terror Zombi, styled after Wii Party's zombie-tag
// minigame: a fenced cemetery at twilight — luminous grey-teal sky, mowed green
// grass, leafy and bare trees ringing the yard, a black wrought-iron fence with
// an arched double gate, chunky rounded headstones, and little running figures.
//
// The figures are deliberately FACELESS: form comes from moonlight rim-light and
// a soft underside shadow, not from painted eyes and mouths. Survivors are clean
// colour-shirted mannequins; the undead are hunched, mottled and tattered with
// hollow sunken sockets. Both share a springy run cycle — lean, bob, foot-lift
// and arm swing — while zombies drag one leg into a lurching limp.
//
// Pure function of runtime state — it reads, never mutates. W/H are CSS pixels;
// dpr scales the backing store so the scene stays crisp on phones.

import { ARENA_W, ARENA_H, WALL_MARGIN } from "./runtime.js";

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

// Cheap deterministic hash → [0,1), for scattering scenery without RNG state.
function hash(n) {
  const t = Math.sin(n * 12.9898) * 43758.5453;
  return t - Math.floor(t);
}

// ── Scenery ───────────────────────────────────────────────────────────────

// A full leafy canopy: a dark mass with a few moonlit dabs, like the oaks that
// ring the Wii Party yard. Drawn behind the fence to frame the grass.
function drawCanopy(ctx, cx, cy, r, seed) {
  const rnd = (n) => hash(seed + n);
  ctx.fillStyle = "#141b14";
  ctx.fillRect(cx - r * 0.09, cy, r * 0.18, r * 0.85);
  const lobes = 7;
  ctx.fillStyle = "#1c2a1a";
  ctx.beginPath();
  for (let i = 0; i < lobes; i += 1) {
    const a = (i / lobes) * Math.PI * 2;
    const rr = r * (0.62 + rnd(i) * 0.42);
    ctx.moveTo(cx, cy);
    ctx.arc(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, rr, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = "#26361f";
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.12, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  // moonlit dabs, biased to the upper-right where the moon sits
  ctx.fillStyle = "rgba(120,142,96,0.5)";
  for (let i = 0; i < 6; i += 1) {
    const a = rnd(i * 3) * Math.PI * 2;
    const d = rnd(i * 5) * r * 0.72;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d + r * 0.12, cy - r * 0.2 + Math.sin(a) * d, r * (0.12 + rnd(i) * 0.12), 0, Math.PI * 2);
    ctx.fill();
  }
}

// A bare, gnarled dead tree — graveyard mood. A tapering trunk that forks into a
// few crooked branches, silhouetted against the sky.
function drawDeadTree(ctx, x, groundY, h, seed) {
  const rnd = (n) => hash(seed + n);
  ctx.strokeStyle = "#12180f";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const branch = (bx, by, ang, len, wdt, depth) => {
    if (depth > 3 || len < h * 0.06) return;
    const ex = bx + Math.cos(ang) * len;
    const ey = by + Math.sin(ang) * len;
    ctx.lineWidth = wdt;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    const spread = 0.5 + rnd(depth + bx) * 0.5;
    branch(ex, ey, ang - spread, len * 0.72, wdt * 0.66, depth + 1);
    branch(ex, ey, ang + spread * (0.6 + rnd(depth + 3) * 0.6), len * 0.7, wdt * 0.66, depth + 1);
    if (rnd(depth + by) > 0.5) branch(ex, ey, ang + (rnd(depth) - 0.5) * 0.4, len * 0.6, wdt * 0.55, depth + 1);
  };
  branch(x, groundY, -Math.PI / 2 + (rnd(seed) - 0.5) * 0.3, h * 0.5, Math.max(2.4, h * 0.05), 0);
}

// A low tuft of grass — three blades, for texture on the mowed field.
function drawGrassTuft(ctx, x, y, s, tint) {
  ctx.strokeStyle = tint;
  ctx.lineWidth = Math.max(1, s * 0.16);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - s * 0.3, y - s * 0.7, x - s * 0.5, y - s);
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.8, x + s * 0.1, y - s * 1.15);
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s * 0.6, y - s);
  ctx.stroke();
}

function drawTombstone(ctx, cx, groundY, w, h, kind) {
  const top = groundY - h;
  // ground shadow
  ctx.fillStyle = "rgba(20,30,20,0.4)";
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.14, groundY, w * 0.68, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === 2) {
    // a leaning stone cross
    ctx.save();
    ctx.translate(cx, groundY);
    ctx.rotate(-0.09);
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, "#c2c7cd");
    g.addColorStop(0.5, "#9aa0a6");
    g.addColorStop(1, "#6b7178");
    ctx.fillStyle = g;
    const arm = w * 0.5;
    const bar = w * 0.26;
    roundRect(ctx, -bar / 2, -h, bar, h, bar * 0.35); // upright
    ctx.fill();
    roundRect(ctx, -arm, -h * 0.72, arm * 2, bar * 0.9, bar * 0.3); // cross-arm
    ctx.fill();
    ctx.fillStyle = "rgba(90,120,80,0.4)"; // moss at the foot
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.06, bar * 0.7, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const grad = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  grad.addColorStop(0, "#c2c7cd");
  grad.addColorStop(0.5, "#9aa0a6");
  grad.addColorStop(1, "#6b7178");
  ctx.fillStyle = grad;

  if (kind === 1) {
    roundRect(ctx, cx - w / 2, top, w, h, w * 0.14); // rectangular slab
    ctx.fill();
  } else {
    // rounded-top headstone
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, groundY);
    ctx.lineTo(cx - w / 2, top + w / 2);
    ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0);
    ctx.lineTo(cx + w / 2, groundY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(40,48,42,0.5)";
  ctx.lineWidth = 1;
  ctx.stroke();
  // engraved cross
  ctx.strokeStyle = "rgba(70,78,72,0.55)";
  ctx.lineWidth = Math.max(1.4, w * 0.08);
  ctx.beginPath();
  ctx.moveTo(cx, top + h * 0.26);
  ctx.lineTo(cx, top + h * 0.58);
  ctx.moveTo(cx - w * 0.16, top + h * 0.38);
  ctx.lineTo(cx + w * 0.16, top + h * 0.38);
  ctx.stroke();
  // moonlit top edge
  ctx.fillStyle = "rgba(226,232,240,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx + w * 0.1, top + h * 0.12, w * 0.24, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // creeping moss at the base
  ctx.fillStyle = "rgba(90,120,80,0.35)";
  ctx.beginPath();
  ctx.ellipse(cx - w * 0.2, groundY - h * 0.06, w * 0.28, h * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFence(ctx, x, y, w, h, scale) {
  const iron = "#171c18";
  const railW = Math.max(2, 1.0 * scale);
  const pickW = Math.max(2, 0.85 * scale);
  const gap = Math.max(7, 2.2 * scale);
  const pickH = Math.max(8, 3.0 * scale);
  const gateHalf = w * 0.12;
  const gateCx = x + w / 2;

  ctx.lineCap = "round";
  ctx.strokeStyle = iron;

  const picketRow = (py, dir, skipGate) => {
    for (let px = x; px <= x + w + 0.5; px += gap) {
      if (skipGate && Math.abs(px - gateCx) < gateHalf) continue;
      ctx.lineWidth = pickW;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py - dir * pickH);
      ctx.stroke();
      ctx.fillStyle = iron;
      ctx.beginPath();
      ctx.moveTo(px, py - dir * (pickH + pickW * 0.9));
      ctx.lineTo(px - pickW * 0.7, py - dir * pickH);
      ctx.lineTo(px + pickW * 0.7, py - dir * pickH);
      ctx.closePath();
      ctx.fill();
    }
  };
  const picketCol = (px, cy1, cy2) => {
    for (let py = cy1; py <= cy2 + 0.5; py += gap) {
      ctx.lineWidth = pickW;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - pickH * 0.5, py);
      ctx.stroke();
    }
  };

  ctx.lineWidth = railW;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.stroke();

  picketRow(y, -1, false);
  picketRow(y + h, 1, true);
  picketCol(x, y, y + h);
  picketCol(x + w, y, y + h);

  ctx.strokeStyle = iron;
  ctx.lineWidth = Math.max(2, 1.2 * scale);
  const gy = y + h;
  const gTop = gy - pickH * 1.5;
  for (const s of [-1, 1]) {
    const inner = gateCx + s * gateHalf * 0.12;
    const outer = gateCx + s * gateHalf;
    ctx.beginPath();
    ctx.moveTo(inner, gy);
    ctx.lineTo(inner, gTop);
    ctx.lineTo(outer, gTop + pickH * 0.4);
    ctx.lineTo(outer, gy);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.2, 0.6 * scale);
    for (let k = 1; k <= 3; k += 1) {
      const bx = inner + (outer - inner) * (k / 4);
      ctx.beginPath();
      ctx.moveTo(bx, gy);
      ctx.lineTo(bx, gTop + pickH * 0.4 * (k / 4));
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(2, 1.2 * scale);
  }
  ctx.beginPath();
  ctx.arc(gateCx, gTop, gateHalf, Math.PI, 0);
  ctx.stroke();
}

// ── Characters ──────────────────────────────────────────────────────────────

// A faceless figure. Volume is read from a moonlit rim-light on the upper-right
// and a soft shadow on the lower-left — no eyes, no mouth. Zombies get a hunched
// posture, mottled sickly skin, a torn shirt hem, and hollow sunken sockets so
// they still read as undead without a cartoon face.
function drawCharacter(ctx, e, sx, sy, r, elapsedMs, playerPulse) {
  const zombie = e.kind === "zombie";
  const f = e.facing >= 0 ? 1 : -1;
  const speed = Math.hypot(e.vx || 0, e.vy || 0);
  const moving = speed > 2;

  // Run cycle — legs/arms swing, a vertical bob and a slight squash sell weight.
  // Zombies shamble at ~60% cadence with a dragging limp.
  const rate = zombie ? 6.5 : 10.5;
  const cyc = (elapsedMs / 1000) * rate + (e.wander || 0) * 6;
  const swing = moving ? Math.sin(cyc) : Math.sin(elapsedMs / 900) * 0.12; // idle breathing
  const bob = moving ? Math.abs(Math.sin(cyc)) * r * 0.2 : Math.sin(elapsedMs / 900) * r * 0.04;
  // Lean into the direction of travel; zombies also permanently hunch forward.
  const lean = (moving ? f * r * 0.22 : 0) + (zombie ? f * r * 0.3 : 0);
  const sway = zombie ? Math.sin(cyc * 0.5) * r * 0.12 : 0;

  const skin = zombie ? "#8faa72" : e.skin || "#f2c9a0";
  const legColor = zombie ? "#3f4a30" : "#2b3550";
  const shirt = zombie ? "#586d43" : e.color;
  const shirtShade = zombie ? "#3c4a2d" : "rgba(0,0,0,0.28)";
  const hair = e.hair || "#3a2a1a";

  const baseY = sy + r * 0.55; // feet on the ground
  const hipY = baseY - r * 0.7 + bob;
  const bodyH = r * 1.25;
  const bodyW = r * (zombie ? 1.5 : 1.4);
  const shoulderX = sx + lean + sway;
  const bodyTopY = hipY - bodyH;
  const headR = r * 0.82;
  const headCX = shoulderX + (zombie ? f * r * 0.14 : 0); // droop forward
  const headCY = bodyTopY - headR * 0.5 + (zombie ? r * 0.14 : 0);

  // ground shadow — tightens as the figure lifts on the bob
  ctx.fillStyle = "rgba(16,24,14,0.4)";
  ctx.beginPath();
  ctx.ellipse(sx, baseY, r * (1.05 - bob / r * 0.25), r * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Legs (drawn first, behind the body) ──
  ctx.strokeStyle = legColor;
  ctx.lineCap = "round";
  ctx.lineWidth = r * 0.36;
  const legSpread = r * 0.34;
  // zombie drags the back leg: asymmetric lift
  const lift = r * 0.5;
  const lA = swing;
  const lB = zombie ? Math.max(-0.35, -swing) : -swing; // stiff dragging leg
  const footL = { x: sx - legSpread + lA * lift, y: baseY - Math.max(0, lA) * r * 0.18 };
  const footR = { x: sx + legSpread + lB * lift, y: baseY - Math.max(0, lB) * r * 0.18 };
  ctx.beginPath();
  ctx.moveTo(sx - legSpread * 0.7 + lean * 0.4, hipY);
  ctx.lineTo(footL.x, footL.y);
  ctx.moveTo(sx + legSpread * 0.7 + lean * 0.4, hipY);
  ctx.lineTo(footR.x, footR.y);
  ctx.stroke();
  // feet
  ctx.fillStyle = zombie ? "#2c3422" : "#20283c";
  for (const ft of [footL, footR]) {
    ctx.beginPath();
    ctx.ellipse(ft.x + f * r * 0.12, ft.y, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Back arm (behind body) ──
  const shoulderY = bodyTopY + bodyH * 0.28;
  ctx.strokeStyle = skin;
  ctx.lineWidth = r * 0.28;
  if (zombie) {
    const reach = sx + f * r * 1.7 + Math.sin(cyc * 0.5) * r * 0.14;
    ctx.beginPath();
    ctx.moveTo(shoulderX - f * bodyW * 0.2, shoulderY);
    ctx.lineTo(reach, shoulderY + r * 0.55 + Math.sin(cyc * 0.5 + 1) * r * 0.12);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(reach, shoulderY + r * 0.55, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(shoulderX - bodyW * 0.42, shoulderY);
    ctx.lineTo(shoulderX - bodyW * 0.42 - swing * r * 0.5, shoulderY + r * 0.72);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(shoulderX - bodyW * 0.42 - swing * r * 0.5, shoulderY + r * 0.72, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Body (shirt) ──
  const bodyGrad = ctx.createLinearGradient(shoulderX - bodyW / 2, 0, shoulderX + bodyW / 2, 0);
  bodyGrad.addColorStop(0, shirtShade);
  bodyGrad.addColorStop(0.5, shirt);
  bodyGrad.addColorStop(1, shirt);
  ctx.fillStyle = bodyGrad;
  if (zombie) {
    // torn, jagged hem
    const bx = shoulderX - bodyW / 2;
    const bw = bodyW;
    const topY = bodyTopY;
    const midY = hipY - r * 0.15;
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.16, topY);
    ctx.arc(shoulderX, topY + bw * 0.16, bw * 0.34, Math.PI * 1.2, Math.PI * 1.8);
    ctx.lineTo(bx + bw, midY);
    ctx.lineTo(bx + bw * 0.82, hipY);
    ctx.lineTo(bx + bw * 0.66, midY);
    ctx.lineTo(bx + bw * 0.5, hipY + r * 0.05);
    ctx.lineTo(bx + bw * 0.34, midY);
    ctx.lineTo(bx + bw * 0.18, hipY);
    ctx.lineTo(bx, midY);
    ctx.closePath();
    ctx.fill();
  } else {
    roundRect(ctx, shoulderX - bodyW / 2, bodyTopY, bodyW, bodyH, bodyW * 0.36);
    ctx.fill();
  }
  // moonlit rim on the right, shadow on the left — gives the torso roundness
  ctx.save();
  if (zombie) {
    roundRect(ctx, shoulderX - bodyW / 2, bodyTopY, bodyW, bodyH * 1.1, bodyW * 0.36);
  } else {
    roundRect(ctx, shoulderX - bodyW / 2, bodyTopY, bodyW, bodyH, bodyW * 0.36);
  }
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.ellipse(shoulderX + bodyW * 0.3, bodyTopY + bodyH * 0.3, bodyW * 0.3, bodyH * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(shoulderX - bodyW * 0.34, bodyTopY + bodyH * 0.55, bodyW * 0.28, bodyH * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (zombie) {
    // dark decay stains
    ctx.fillStyle = "rgba(30,40,22,0.5)";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(shoulderX + (hash(i + e.wander * 4) - 0.5) * bodyW * 0.7,
        bodyTopY + bodyH * (0.3 + hash(i * 2) * 0.5), r * (0.1 + hash(i) * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // ── Front arm (over body) ──
  ctx.strokeStyle = skin;
  ctx.lineWidth = r * 0.3;
  if (zombie) {
    const reach = sx + f * r * 1.9 + Math.sin(cyc * 0.5 + 0.6) * r * 0.14;
    ctx.beginPath();
    ctx.moveTo(shoulderX + f * bodyW * 0.1, shoulderY - r * 0.05);
    ctx.lineTo(reach, shoulderY - r * 0.28 + Math.sin(cyc * 0.5) * r * 0.12);
    ctx.stroke();
    // clawed hand
    ctx.fillStyle = skin;
    const hx = reach;
    const hy = shoulderY - r * 0.28;
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = skin;
    ctx.lineWidth = r * 0.09;
    for (let k = -1; k <= 1; k += 1) {
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + f * r * 0.28, hy + k * r * 0.16);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(shoulderX + bodyW * 0.42, shoulderY);
    ctx.lineTo(shoulderX + bodyW * 0.42 + swing * r * 0.5, shoulderY + r * 0.72);
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(shoulderX + bodyW * 0.42 + swing * r * 0.5, shoulderY + r * 0.72, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Head (faceless) ──
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
  ctx.fill();
  // form from light, not features
  ctx.save();
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.22)"; // moonlit cheek, upper-right
  ctx.beginPath();
  ctx.arc(headCX + headR * 0.32, headCY - headR * 0.3, headR * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.2)"; // underside shadow, lower-left
  ctx.beginPath();
  ctx.arc(headCX - headR * 0.34, headCY + headR * 0.36, headR * 0.6, 0, Math.PI * 2);
  ctx.fill();
  if (zombie) {
    // mottled decay + hollow sunken sockets (shadow, not eyes)
    ctx.fillStyle = "rgba(70,92,54,0.55)";
    ctx.beginPath();
    ctx.arc(headCX - headR * 0.1, headCY - headR * 0.2, headR * 0.24, 0, Math.PI * 2);
    ctx.arc(headCX + headR * 0.35, headCY + headR * 0.3, headR * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(12,18,10,0.7)";
    const sockDX = headR * 0.34;
    const sockY = headCY + headR * 0.02;
    const sockOff = f * headR * 0.16;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(headCX + s * sockDX + sockOff, sockY, headR * 0.2, headR * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // grim slack jaw shadow
    ctx.fillStyle = "rgba(12,18,10,0.5)";
    ctx.beginPath();
    ctx.ellipse(headCX + sockOff, headCY + headR * 0.55, headR * 0.22, headR * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = zombie ? "rgba(60,80,45,0.6)" : "rgba(120,80,50,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(headCX, headCY, headR, 0, Math.PI * 2);
  ctx.stroke();

  if (!zombie) {
    // hair cap — the only feature the survivors get; it also orients the head
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(headCX, headCY, headR, Math.PI * 1.02, Math.PI * 2 - 0.02, false);
    ctx.arc(headCX, headCY - headR * 0.18, headR * 0.98, Math.PI * 2 - 0.02, Math.PI * 1.02, true);
    ctx.closePath();
    ctx.fill();
    // side-part highlight
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.ellipse(headCX + headR * 0.28, headCY - headR * 0.55, headR * 0.3, headR * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // sparse, matted hair patches
    ctx.fillStyle = "#2f3a24";
    ctx.beginPath();
    ctx.arc(headCX - headR * 0.2, headCY - headR * 0.62, headR * 0.28, 0, Math.PI * 2);
    ctx.arc(headCX + headR * 0.4, headCY - headR * 0.5, headR * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }

  // player marker: colour ring on the ground + a bobbing chevron overhead.
  if (e.isPlayer) {
    ctx.strokeStyle = e.color;
    ctx.globalAlpha = 0.5 + playerPulse * 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, baseY, r * 1.28, r * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const arrowY = headCY - headR - r * 0.7 - playerPulse * r * 0.3;
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.moveTo(headCX, arrowY + r * 0.5);
    ctx.lineTo(headCX - r * 0.5, arrowY);
    ctx.lineTo(headCX + r * 0.5, arrowY);
    ctx.closePath();
    ctx.fill();
  }
}

// ── Scene ─────────────────────────────────────────────────────────────────

export function drawScene(ctx, rt, W, H, dpr = 1) {
  const width = W ?? ctx.canvas.width;
  const height = H ?? ctx.canvas.height;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Twilight sky behind the trees — luminous grey-teal, not black.
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#3b4a52");
  sky.addColorStop(0.55, "#465049");
  sky.addColorStop(1, "#2e3a2f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // A scatter of faint stars in the upper sky.
  ctx.fillStyle = "rgba(226,232,240,0.5)";
  for (let i = 0; i < 26; i += 1) {
    const px = hash(i * 1.3) * width;
    const py = hash(i * 2.7) * height * 0.4;
    const tw = 0.4 + hash(i + rt.elapsedMs / 3000) * 0.9; // gentle twinkle
    ctx.globalAlpha = 0.25 + tw * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, 0.6 + hash(i) * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Low moon glow, upper right.
  const mg = ctx.createRadialGradient(width * 0.82, height * 0.14, 4, width * 0.82, height * 0.14, height * 0.5);
  mg.addColorStop(0, "rgba(226,232,240,0.45)");
  mg.addColorStop(1, "rgba(226,232,240,0)");
  ctx.fillStyle = mg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#e8edf2";
  ctx.beginPath();
  ctx.arc(width * 0.82, height * 0.14, Math.max(9, height * 0.035), 0, Math.PI * 2);
  ctx.fill();
  // faint craters
  ctx.fillStyle = "rgba(150,164,178,0.35)";
  const mr = Math.max(9, height * 0.035);
  ctx.beginPath();
  ctx.arc(width * 0.82 - mr * 0.3, height * 0.14 - mr * 0.2, mr * 0.22, 0, Math.PI * 2);
  ctx.arc(width * 0.82 + mr * 0.3, height * 0.14 + mr * 0.25, mr * 0.16, 0, Math.PI * 2);
  ctx.fill();

  // Draw the arena at the ACTIVE map's size, not the pinned first-map defaults —
  // the bigger graveyards (Camposanto, Necrópolis) grow the field, and the fence
  // and fit-to-view scaling must follow or entities would spill past the rail.
  const arenaW = rt.arenaW || ARENA_W;
  const arenaH = rt.arenaH || ARENA_H;
  const pad = Math.min(width, height) * 0.11; // room for the tree ring
  const scale = Math.min((width - 2 * pad) / arenaW, (height - 2 * pad) / arenaH);
  const aw = arenaW * scale;
  const ah = arenaH * scale;
  const ox = (width - aw) / 2;
  const oy = (height - ah) / 2 + Math.min(width, height) * 0.02;
  const wx = (x) => ox + x * scale;
  const wy = (y) => oy + y * scale;

  // Trees ringing the yard (behind the fence): leafy canopies with a couple of
  // bare dead trees woven in for graveyard mood.
  const tr = Math.max(26, aw * 0.11);
  for (let i = 0; i < 7; i += 1) {
    const cx = ox + (aw * (i + 0.5)) / 7;
    if (i === 2 || i === 5) {
      drawDeadTree(ctx, cx, oy + tr * 0.15, tr * 1.5, i + 3);
    } else {
      drawCanopy(ctx, cx, oy - tr * 0.35, tr * (0.85 + ((i * 7) % 5) * 0.06), i + 1);
    }
  }
  drawCanopy(ctx, ox - tr * 0.4, oy + ah * 0.3, tr * 0.95, 21);
  drawDeadTree(ctx, ox - tr * 0.1, oy + ah * 0.78, tr * 1.1, 22);
  drawCanopy(ctx, ox + aw + tr * 0.4, oy + ah * 0.34, tr * 0.95, 31);
  drawCanopy(ctx, ox + aw + tr * 0.3, oy + ah * 0.76, tr * 0.85, 32);

  // Mowed cemetery grass inside the fence.
  const ground = ctx.createRadialGradient(
    ox + aw / 2, oy + ah * 0.42, 10,
    ox + aw / 2, oy + ah / 2, Math.max(aw, ah) * 0.72,
  );
  ground.addColorStop(0, "#8a9663");
  ground.addColorStop(0.7, "#6e7a4c");
  ground.addColorStop(1, "#4d5636");
  ctx.fillStyle = ground;
  roundRect(ctx, ox, oy, aw, ah, 10);
  ctx.fill();

  ctx.save();
  roundRect(ctx, ox, oy, aw, ah, 10);
  ctx.clip();

  // Mowing stripes for texture.
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  for (let sx = 0; sx < aw; sx += aw / 9) {
    if ((Math.round(sx / (aw / 9)) & 1) === 0) ctx.fillRect(ox + sx, oy, aw / 18, ah);
  }

  // A worn dirt path curving in from the gate.
  ctx.strokeStyle = "rgba(74,64,48,0.4)";
  ctx.lineWidth = Math.max(6, aw * 0.05);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ox + aw * 0.5, oy + ah);
  ctx.quadraticCurveTo(ox + aw * 0.42, oy + ah * 0.6, ox + aw * 0.58, oy + ah * 0.34);
  ctx.stroke();

  // Scattered grass tufts + a few dead leaves.
  for (let i = 0; i < 26; i += 1) {
    const gx = ox + hash(i * 3.1) * aw;
    const gy = oy + hash(i * 5.7) * ah;
    const s = Math.max(3, scale * (0.7 + hash(i) * 0.6));
    drawGrassTuft(ctx, gx, gy, s, hash(i) > 0.5 ? "rgba(60,74,42,0.55)" : "rgba(120,140,88,0.4)");
  }
  ctx.fillStyle = "rgba(120,90,50,0.35)";
  for (let i = 0; i < 10; i += 1) {
    const lx = ox + hash(i * 7.3 + 2) * aw;
    const ly = oy + hash(i * 9.1 + 4) * ah;
    ctx.beginPath();
    ctx.ellipse(lx, ly, scale * 0.5, scale * 0.28, hash(i) * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Slow-drifting ground fog, animated on the clock.
  const drift = (rt.elapsedMs || 0) / 4200;
  ctx.fillStyle = "rgba(200,215,210,0.06)";
  for (let i = 0; i < 3; i += 1) {
    const fxp = ox + ((hash(i * 4) + drift * (0.3 + i * 0.1)) % 1) * aw;
    const fyp = oy + (0.3 + hash(i * 6) * 0.5) * ah;
    ctx.beginPath();
    ctx.ellipse(fxp, fyp, aw * 0.26, ah * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    // wrap a second copy so fog never pops at the edge
    ctx.beginPath();
    ctx.ellipse(fxp - aw, fyp, aw * 0.26, ah * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const fx = wx(WALL_MARGIN);
  const fy = wy(WALL_MARGIN);
  const fw = (arenaW - 2 * WALL_MARGIN) * scale;
  const fh = (arenaH - 2 * WALL_MARGIN) * scale;
  drawFence(ctx, fx, fy, fw, fh, scale);

  // Tombstones + characters, painter-sorted by world y for depth.
  const drawables = [
    ...rt.tombstones.map((s, i) => ({ y: s.y, type: "stone", s, i })),
    ...rt.entities.map((e) => ({ y: e.y, type: "char", e })),
  ].sort((a, b) => a.y - b.y);

  const pulse = (Math.sin(rt.elapsedMs / 260) + 1) / 2;
  const charR = Math.max(6, 2.6 * scale);
  for (const d of drawables) {
    if (d.type === "stone") {
      drawTombstone(ctx, wx(d.s.x), wy(d.s.y + d.s.h / 2), d.s.w * scale, d.s.h * scale * 1.7, d.i % 3);
    } else {
      drawCharacter(ctx, d.e, wx(d.e.x), wy(d.e.y), charR, rt.elapsedMs, d.e.isPlayer ? pulse : 0);
    }
  }

  // Gentle twilight vignette — moody, but never the pitch black of before.
  const vg = ctx.createRadialGradient(
    width / 2, height * 0.46, Math.min(width, height) * 0.34,
    width / 2, height / 2, Math.max(width, height) * 0.66,
  );
  vg.addColorStop(0, "rgba(12,18,14,0)");
  vg.addColorStop(1, "rgba(12,18,14,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, width, height);
}

export default drawScene;
