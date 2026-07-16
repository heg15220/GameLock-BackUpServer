// The surfaces — the one place their character is written down.
//
// A surface is a restitution/friction pair and almost nothing more.  Everything
// you feel about it falls out of those two numbers through the bounce: clay bites
// the ball, so it throws it up and scrubs its pace (slow, high); grass barely
// grips, so the ball skids on through (fast, low); a table is hard and slick, so
// it gives the ball back almost intact.
//
// There is deliberately no per-surface branch anywhere else in the codebase.  To
// add a surface you add a row here, and the shot solver, the bounce and the AI's
// rollouts all pick it up for free — the AI re-adapts because it predicts the
// future by playing it, and it is now playing on a different court.
//
//   restitution  Normal coefficient of restitution: the fraction of its downward
//                speed the ball keeps.  High = a bounce that sits up and waits.
//   friction     Coulomb mu at the contact patch.  High = the surface grips the
//                spin and converts it, which is what makes topspin kick forward
//                and slice check and stay low.
//   traction     How well a shoe grips it.  Low = the player slides into the shot
//                instead of stopping dead.  This is why clay players slide, and
//                it is the same number the movement model brakes with.
//   paceLabel    The commentator's number: how quick the court plays.  Display
//                and seeding only — never physics.

// ── Tennis ──────────────────────────────────────────────────────────────────

export const SURFACES = {
  hard: {
    id: "hard",
    restitution: 0.760,
    friction: 0.62,
    traction: 0.95,
    paceLabel: 1.00,
  },
  clay: {
    id: "clay",
    // Bites hardest and gives the most back upward: the high, slow ball.
    restitution: 0.820,
    friction: 0.86,
    // ...and the loose top dressing is what the player slides on.
    traction: 0.55,
    paceLabel: 0.88,
  },
  grass: {
    id: "grass",
    // Lowest bounce, least grip: the ball skids through instead of sitting up.
    restitution: 0.700,
    friction: 0.42,
    traction: 0.78,
    paceLabel: 1.12,
  },
};

export const SURFACE_IDS = Object.keys(SURFACES);

export function getSurface(id) {
  return SURFACES[id] ?? SURFACES.hard;
}

// ── Table tennis ────────────────────────────────────────────────────────────

// ITTF ball-drop test: dropped 30 cm onto the table it must rebound about 23 cm,
// which is a restitution of sqrt(23/30) ≈ 0.875.  The number is not a taste, it
// is the definition of a legal table.
export const TABLE_WOOD = { id: "table", restitution: 0.875, friction: 0.25 };

// Where the point ends.  The ball is dead either way, so this only has to look
// right as it rolls away.
export const FLOOR = { id: "floor", restitution: 0.45, friction: 0.5 };
