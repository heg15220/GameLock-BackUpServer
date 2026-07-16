// Render for Trilero / Shell Game.
//
// Everything here is drawn procedurally — there are no bitmaps to ship, load or
// scale. The cups are the whole game's visual identity, so they get real
// treatment: a curved tapered silhouette, a lit side and a shaded side from one
// consistent key light, a specular streak, contact occlusion where they meet the
// felt, and a shadow that softens and spreads as the cup rises.
//
// The one rule the art has to obey: a cup crossing in front must read as being
// in front. Depth drives scale, shadow and draw order together, because any one
// of them alone is not convincing.

export const PALETTE = {
  backdrop: "#070d18",
  feltDark: "#0b3b2c",
  feltLight: "#176349",
  feltEdge: "#062017",
  rail: "#3b2415",
  railLight: "#6b432a",
  cupBody: "#c8402f",
  cupLit: "#f0714f",
  cupShade: "#6d1d15",
  cupRim: "#f7d9c4",
  ball: "#fbf6e9",
  ballShade: "#c9b48c",
  spot: "rgba(255, 208, 138, 0.16)",
  text: "#f4f7ff",
  textDim: "rgba(196, 214, 236, 0.75)",
  gold: "#ffd166",
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// ── Layout ───────────────────────────────────────────────────────────────────
// Slots are evenly spaced across a centred band. Positions are computed for
// fractional slots too, so a cup mid-cross lands between them.
//
// The cups grow until whichever dimension binds first stops them — width on a
// squat stage, height on a tall one. No fixed pixel ceiling: the stage is
// whatever the shell hands us (a phone in portrait fullscreen is very tall), and
// a hard cap there would leave the cups stranded and small in a big empty frame.
const GAP_RATIO = 0.42; // gap between cups, as a fraction of cup width
const CUP_ASPECT = 0.72; // width / height

// How far a fully raised cup rises, in cup heights. Exported so the layout tests
// can check a lifted cup still clears the HUD without re-deriving the number.
export const LIFT_RATIO = 0.85;

// Where the cups stand, and how much of the top of the stage the HUD owns.
const BASE_Y_RATIO = 0.72;
const HUD_BAND = 0.12;

export function layoutFor(vW, vH, cups) {
  const n = Math.max(1, cups);

  // Width-bound: all cups plus their gaps inside a centred band.
  const byWidth = (vW * 0.88) / (n + (n - 1) * GAP_RATIO);
  // Height-bound: derived rather than dialled in, so it cannot drift out of step
  // with the lift. A cup raised on the reveal reaches baseY - cupH * (1 + LIFT),
  // and that has to stay clear of the HUD band.
  const maxCupH = (vH * (BASE_Y_RATIO - HUD_BAND)) / (1 + LIFT_RATIO);
  const byHeight = maxCupH * CUP_ASPECT;

  const cupW = Math.max(18, Math.min(byWidth, byHeight));
  const cupH = cupW / CUP_ASPECT;
  const gap = cupW * GAP_RATIO;
  const span = n * cupW + (n - 1) * gap;
  const baseY = vH * BASE_Y_RATIO;

  return {
    cups: n,
    baseY,
    cupW,
    cupH,
    gap,
    span,
    left: (vW - span) / 2,
    // Where the felt starts. Tied to the cups rather than the frame so a cup at
    // full lift still has table behind it on any aspect ratio.
    feltY: Math.max(vH * 0.16, baseY - cupH * 2.1),
    vW,
    vH,
  };
}

// x for a slot, fractional allowed.
export function slotX(layout, slot) {
  const step = layout.cupW + layout.gap;
  return layout.left + layout.cupW / 2 + slot * step;
}

// Which slot a point falls on, or -1. Used for tap/click picking: the stage is
// the control, so the whole cup column is a target, not just its silhouette.
export function slotAtPoint(layout, x, y) {
  if (y < layout.baseY - layout.cupH * 1.6 || y > layout.baseY + layout.cupH * 0.5) return -1;
  const step = layout.cupW + layout.gap;
  for (let i = 0; i < layout.cups; i++) {
    const cx = slotX(layout, i);
    if (Math.abs(x - cx) <= (layout.cupW + layout.gap * 0.5) / 2) return i;
  }
  return -1;
}

// ── Primitives ───────────────────────────────────────────────────────────────

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(rx, 0.01), Math.max(ry, 0.01), 0, 0, Math.PI * 2);
}

// The cup silhouette: an upturned, slightly waisted taper. Drawn as two mirrored
// beziers so the sides bow instead of running dead straight — a plain trapezoid
// reads as a traffic cone, not a cup.
function cupPath(ctx, x, baseY, w, h) {
  const halfB = w / 2;
  const halfT = w * 0.34;
  const topY = baseY - h;
  const capRy = halfT * 0.34;

  ctx.beginPath();
  ctx.moveTo(x - halfB, baseY);
  ctx.bezierCurveTo(
    x - halfB * 0.99, baseY - h * 0.42,
    x - halfT * 1.06, baseY - h * 0.74,
    x - halfT, topY + capRy,
  );
  ctx.ellipse(x, topY + capRy, halfT, capRy, 0, Math.PI, 0, false);
  ctx.bezierCurveTo(
    x + halfT * 1.06, baseY - h * 0.74,
    x + halfB * 0.99, baseY - h * 0.42,
    x + halfB, baseY,
  );
  ctx.ellipse(x, baseY, halfB, halfB * 0.3, 0, 0, Math.PI, false);
  ctx.closePath();
}

// depth: -1 (pushed back) … 0 (at rest) … 1 (crossing in front)
// lift:  0 (on the felt) … 1 (fully raised)
export function drawCup(ctx, layout, { x, depth = 0, lift = 0 }) {
  const depthScale = 1 + depth * 0.16;
  const w = layout.cupW * depthScale;
  const h = layout.cupH * depthScale;
  const baseY = layout.baseY + depth * layout.cupH * 0.1;
  const riseY = baseY - lift * layout.cupH * LIFT_RATIO;

  // Shadow: spreads and fades as the cup leaves the felt.
  const shW = w * (0.5 + lift * 0.34);
  const shAlpha = 0.5 * (1 - lift * 0.55);
  const sg = ctx.createRadialGradient(x, baseY, 0, x, baseY, shW);
  sg.addColorStop(0, `rgba(2, 12, 8, ${shAlpha})`);
  sg.addColorStop(1, "rgba(2, 12, 8, 0)");
  ctx.fillStyle = sg;
  ellipse(ctx, x, baseY + h * 0.02, shW, shW * 0.34);
  ctx.fill();

  // The dark mouth under a raised cup.
  if (lift > 0.02) {
    ctx.fillStyle = "rgba(6, 18, 14, 0.85)";
    ellipse(ctx, x, riseY, (w / 2) * 0.96, (w / 2) * 0.3);
    ctx.fill();
  }

  // Body, lit from the upper left.
  const bg = ctx.createLinearGradient(x - w / 2, riseY - h, x + w / 2, riseY);
  bg.addColorStop(0, PALETTE.cupLit);
  bg.addColorStop(0.34, PALETTE.cupBody);
  bg.addColorStop(1, PALETTE.cupShade);
  ctx.fillStyle = bg;
  cupPath(ctx, x, riseY, w, h);
  ctx.fill();

  // Vertical shading so the cup reads as round rather than flat.
  const rg = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  rg.addColorStop(0, "rgba(0,0,0,0.28)");
  rg.addColorStop(0.3, "rgba(255,255,255,0.06)");
  rg.addColorStop(0.62, "rgba(0,0,0,0)");
  rg.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = rg;
  cupPath(ctx, x, riseY, w, h);
  ctx.fill();

  // Specular streak.
  ctx.save();
  cupPath(ctx, x, riseY, w, h);
  ctx.clip();
  const sp = ctx.createLinearGradient(x - w * 0.28, riseY - h, x - w * 0.1, riseY);
  sp.addColorStop(0, "rgba(255,255,255,0.42)");
  sp.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sp;
  ctx.fillRect(x - w * 0.3, riseY - h, w * 0.18, h);
  ctx.restore();

  // Rim band near the base — a moulded lip catches the light.
  ctx.strokeStyle = "rgba(255, 226, 205, 0.45)";
  ctx.lineWidth = Math.max(1, h * 0.018);
  ellipse(ctx, x, riseY - h * 0.06, (w / 2) * 0.985, (w / 2) * 0.3 * 0.985);
  ctx.stroke();

  // Contact occlusion: without this the cup floats even when it is down.
  if (lift < 0.3) {
    const ao = 1 - lift / 0.3;
    ctx.fillStyle = `rgba(3, 14, 10, ${0.34 * ao})`;
    ellipse(ctx, x, baseY, (w / 2) * 0.98, (w / 2) * 0.3);
    ctx.fill();
  }
}

export function drawBall(ctx, layout, x, y, radius) {
  // Contact shadow first, tight and dark.
  const sg = ctx.createRadialGradient(x, layout.baseY, 0, x, layout.baseY, radius * 1.7);
  sg.addColorStop(0, "rgba(2, 12, 8, 0.55)");
  sg.addColorStop(1, "rgba(2, 12, 8, 0)");
  ctx.fillStyle = sg;
  ellipse(ctx, x, layout.baseY, radius * 1.7, radius * 0.6);
  ctx.fill();

  const g = ctx.createRadialGradient(
    x - radius * 0.35, y - radius * 0.4, radius * 0.1,
    x, y, radius,
  );
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.45, PALETTE.ball);
  g.addColorStop(1, PALETTE.ballShade);
  ctx.fillStyle = g;
  ellipse(ctx, x, y, radius, radius);
  ctx.fill();

  // Bounced light from the felt along the lower edge.
  ctx.strokeStyle = "rgba(120, 220, 175, 0.28)";
  ctx.lineWidth = Math.max(1, radius * 0.14);
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.9, Math.PI * 0.18, Math.PI * 0.82);
  ctx.stroke();
}

// ── Table ────────────────────────────────────────────────────────────────────
export function drawTable(ctx, layout) {
  const { vW, vH, baseY, feltY } = layout;
  // The lamp hangs over the cups, not over the middle of whatever frame we were
  // given, so the light stays keyed to the action on any aspect ratio.
  const lampY = feltY - (baseY - feltY) * 0.35;
  const reach = Math.max(vW, vH) * 0.7;

  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, vW, vH);

  // Warm overhead pool of light — a street table under a lamp.
  const spot = ctx.createRadialGradient(vW / 2, lampY, vH * 0.04, vW / 2, baseY, reach);
  spot.addColorStop(0, "rgba(255, 214, 150, 0.22)");
  spot.addColorStop(0.55, PALETTE.spot);
  spot.addColorStop(1, "rgba(255, 208, 138, 0)");
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, vW, vH);

  // Felt, brighter under the lamp and falling off to the edges.
  const felt = ctx.createRadialGradient(vW / 2, baseY, vH * 0.05, vW / 2, baseY, reach);
  felt.addColorStop(0, PALETTE.feltLight);
  felt.addColorStop(0.6, PALETTE.feltDark);
  felt.addColorStop(1, PALETTE.feltEdge);
  ctx.fillStyle = felt;
  ctx.fillRect(0, feltY, vW, vH - feltY);

  // A soft lip where the felt meets the back wall, so the table has an edge.
  const horizon = ctx.createLinearGradient(0, feltY, 0, feltY + vH * 0.06);
  horizon.addColorStop(0, "rgba(2, 10, 7, 0.55)");
  horizon.addColorStop(1, "rgba(2, 10, 7, 0)");
  ctx.fillStyle = horizon;
  ctx.fillRect(0, feltY, vW, vH * 0.06);

  // Front rail, to sit the felt in something.
  const railY = vH * 0.93;
  const rail = ctx.createLinearGradient(0, railY, 0, vH);
  rail.addColorStop(0, PALETTE.railLight);
  rail.addColorStop(1, PALETTE.rail);
  ctx.fillStyle = rail;
  ctx.fillRect(0, railY, vW, vH - railY);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, railY, vW, Math.max(1, vH * 0.006));

  // Vignette.
  const vig = ctx.createRadialGradient(vW / 2, vH * 0.55, vH * 0.2, vW / 2, vH * 0.55, vW * 0.75);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vW, vH);
}

// Highlight ring under a slot the player is hovering or has picked.
export function drawSlotMarker(ctx, layout, slot, { active = false, correct = null } = {}) {
  const x = slotX(layout, slot);
  const color =
    correct === true ? "rgba(126, 231, 168, 0.9)"
    : correct === false ? "rgba(255, 122, 106, 0.9)"
    : active ? "rgba(255, 209, 102, 0.85)"
    : "rgba(226, 240, 255, 0.22)";
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, layout.cupH * 0.028);
  ellipse(ctx, x, layout.baseY + layout.cupH * 0.04, layout.cupW * 0.56, layout.cupW * 0.19);
  ctx.stroke();
}

// ── Composed scene ───────────────────────────────────────────────────────────
// `cups` is a render list: { slot, lift, depth }. Painter's order by depth so a
// cup crossing in front actually occludes the one going behind.
export function drawWorld(ctx, layout, view) {
  drawTable(ctx, layout);

  for (let i = 0; i < layout.cups; i++) {
    const isPick = view.pickedSlot === i;
    drawSlotMarker(ctx, layout, i, {
      active: view.hoverSlot === i || isPick,
      correct: isPick && view.pickCorrect != null ? view.pickCorrect : null,
    });
  }

  const ordered = [...view.cups].sort((a, b) => a.depth - b.depth);

  // The ball is under a cup, so it paints between the cups behind it and the
  // cup that hides it — otherwise a raised cup would show nothing underneath.
  const ballCup = view.ball?.visible ? view.cups[view.ball.cupIndex] : null;

  for (const cup of ordered) {
    if (ballCup && cup === ballCup) {
      const bx = slotX(layout, view.ball.slot);
      drawBall(ctx, layout, bx, layout.baseY - view.ball.radius, view.ball.radius);
    }
    drawCup(ctx, layout, { x: slotX(layout, cup.slot), depth: cup.depth, lift: cup.lift });
  }
}
