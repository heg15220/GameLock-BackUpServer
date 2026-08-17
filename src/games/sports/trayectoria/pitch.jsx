/**
 * The place all of this happens.
 *
 * Until now there were two drawings of a football pitch in this game and neither of them was
 * one. `scene.jsx` had a goal made of three strokes, a net that was a translucent rectangle
 * with a dashed border, and a keeper built from a circle and two lines. `chancegames.jsx` had
 * no pitch at all - the seven mechanics were grey bars, so a goalkeeper's penalty save and a
 * striker's finish were the same rectangle with different words over it.
 *
 * That second one is the real fault, and it is not a drawing fault. The MODEL has always
 * known what kind of footballer you are: `REPERTOIRE` in bigmatch.js filters the chances by
 * position group and `CHANCE_MECHANIC` gives each of them its own verb, so a keeper's career
 * really is a different game from a striker's. None of it reached the screen. This file is
 * the surface that lets it.
 *
 * ── What is here ──────────────────────────────────────────────────────────────
 *
 *  - A STADIUM, in one coordinate system: stands, hoardings, the goal with a real net drawn
 *    in perspective, and mown grass. Everything is in the same 200x120 viewBox the shot
 *    scene already used, so `PLACEMENTS` and `SITUATIONS` keep meaning what they meant.
 *  - FIGURES that are silhouettes rather than pictograms. Same principle `trophies.jsx`
 *    settled on: a silhouette is a shape, not an outline. They are built from a skeleton -
 *    joints in a 40-unit-tall space, limbs as round-capped strokes, torso and head filled -
 *    so a pose is data and not a second drawing. Six poses cover every chance in the game.
 *  - A CAMERA, which is the whole trick. `behind` is the view over the taker's shoulder and
 *    `goal` is the view from the goal line looking out. Which one a chance uses is decided
 *    by whether the player is the one striking the ball or the one stopping it - so the
 *    screen says what kind of footballer you are before a word of copy does.
 *
 * Pure drawing. Nothing here decides anything, takes an input or knows what a chance is.
 */

import React from "react";

/* ── The frame everything is measured in ─────────────────────────────────────
   Unchanged from the original scene on purpose: `PLACEMENTS` is a table of points
   in this goal mouth and every one of them stays where it was.               */

export const STAGE = { width: 200, height: 120 };
export const GOAL = { left: 44, right: 156, top: 20, bottom: 62 };

/**
 * The back of the net, in perspective.
 *
 * Further away is higher on screen and narrower, which is the only thing that turns a
 * rectangle into a goal. Every panel of netting is a quad between this plane and the mouth.
 */
const BACK = { left: 53, right: 147, top: 26, bottom: 56 };

/** A point in the goal mouth, in normalised (u, v). The tables in scene.jsx speak this. */
export const at = (u, v) => ({
  x: GOAL.left + (GOAL.right - GOAL.left) * u,
  y: GOAL.top + (GOAL.bottom - GOAL.top) * v,
});

const points = (...pairs) => pairs.map(([x, y]) => `${x},${y}`).join(" ");

/* ── Defs ────────────────────────────────────────────────────────────────────
   The net and the crowd are patterns rather than paths: a net is a repeating mesh
   and drawing two hundred line segments to say so would cost more than it reads.
   Ids are fixed and the definitions identical, so several of these on one page
   resolve to the same thing no matter which one the browser picks first.      */

export function PitchDefs() {
  return (
    <defs>
      {/* The mesh. Two diagonals rather than a grid: a goal net is hung on the diagonal
          and the difference is most of what makes it read as netting. */}
      <pattern id="tr-net" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M 0 3 L 3 0 L 6 3 L 3 6 Z" className="tr-pitch__mesh" />
      </pattern>
      {/* The same mesh, tighter, for the panels that are further away. Perspective is the
          only reason this exists: a net whose holes are the same size at the back of the
          goal as at the mouth is a flat picture of a net. */}
      <pattern id="tr-net-far" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M 0 2 L 2 0 L 4 2 L 2 4 Z" className="tr-pitch__mesh" />
      </pattern>
      {/* A crowd, at the only level of detail a crowd needs from this far away. */}
      <pattern id="tr-crowd" width="5" height="4" patternUnits="userSpaceOnUse">
        <circle cx="1.2" cy="1.2" r="1" className="tr-pitch__head" />
        <circle cx="3.7" cy="3" r="1" className="tr-pitch__head-alt" />
      </pattern>
    </defs>
  );
}

/* ── The ground ──────────────────────────────────────────────────────────────
   Back to front, which is also the order it has to be painted in: people, then
   the boards they lean over, then the grass, then the goal standing on it.   */

/** Tiers of crowd behind the goal, and the boards in front of them. */
export function Stands() {
  return (
    <g className="tr-pitch__stands" aria-hidden="true">
      <rect x="0" y="0" width={STAGE.width} height="27" className="tr-pitch__tier" />
      {/* The upper tier sits back and therefore darker: two values is the whole of the
          depth here, and one flat band read as no stand at all. */}
      <rect x="0" y="0" width={STAGE.width} height="11" className="tr-pitch__tier is-far" />
      <rect x="0" y="0" width={STAGE.width} height="27" fill="url(#tr-crowd)" />
      {/* The steps. Two lines is enough to say "this is banked seating" and any more
          starts competing with the goal for the eye. */}
      <path d="M 0 11 H 200 M 0 19.5 H 200" className="tr-pitch__step" />
      {/* Hoardings: the band that separates the crowd from the pitch, and the thing that
          makes the goal read as standing in front of something rather than floating. */}
      <rect x="0" y="27" width={STAGE.width} height="7" className="tr-pitch__hoarding" />
      <path d="M 0 27.4 H 200" className="tr-pitch__hoarding-lip" />
      {/* The strip of ground behind the goal line. */}
      <rect x="0" y="34" width={STAGE.width} height={GOAL.bottom - 34} className="tr-pitch__far" />
    </g>
  );
}

/**
 * The grass in front of the goal line, mown in bands.
 *
 * The bands get taller towards the camera, which is the cheapest honest depth cue there is:
 * equal stripes would read as a flat wall of green standing on end.
 */
export function Grass() {
  const bands = [];
  let y = GOAL.bottom;
  let height = 6;
  let index = 0;
  while (y < STAGE.height) {
    const tall = Math.min(height, STAGE.height - y);
    bands.push(
      <rect
        key={y}
        x="0"
        y={y}
        width={STAGE.width}
        height={tall}
        className={`tr-pitch__mow${index % 2 ? " is-dark" : ""}`}
      />,
    );
    y += tall;
    height *= 1.42;
    index += 1;
  }
  return (
    <g className="tr-pitch__grass" aria-hidden="true">
      {bands}
      {/* The goal line, and the six-yard box opening out towards the camera. Ellipse arcs
          rather than straight lines, because everything on a pitch curves under a lens. */}
      <path d={`M 0 ${GOAL.bottom} H 200`} className="tr-pitch__line" />
      <path
        d={`M 30 ${GOAL.bottom} L 24 82 H 176 L 170 ${GOAL.bottom}`}
        className="tr-pitch__line"
        fill="none"
      />
    </g>
  );
}

/**
 * The goal: netting in five panels, then the frame over it.
 *
 * The panels are what make it a box rather than a rectangle - two sides, a roof, a floor and
 * the back - and they are drawn before the posts so the frame reads as being in front of its
 * own net, which is where a frame is.
 */
export function GoalFrame() {
  const post = 3.4;
  return (
    <g className="tr-pitch__goal" aria-hidden="true">
      {/* Roof and floor catch the light differently from the sides, so they are separate
          shapes rather than one outline with a fill. */}
      <polygon
        points={points([GOAL.left, GOAL.top], [GOAL.right, GOAL.top], [BACK.right, BACK.top], [BACK.left, BACK.top])}
        fill="url(#tr-net-far)"
        className="tr-pitch__panel is-roof"
      />
      <polygon
        points={points([GOAL.left, GOAL.bottom], [GOAL.right, GOAL.bottom], [BACK.right, BACK.bottom], [BACK.left, BACK.bottom])}
        fill="url(#tr-net-far)"
        className="tr-pitch__panel is-floor"
      />
      <polygon
        points={points([GOAL.left, GOAL.top], [BACK.left, BACK.top], [BACK.left, BACK.bottom], [GOAL.left, GOAL.bottom])}
        fill="url(#tr-net)"
        className="tr-pitch__panel"
      />
      <polygon
        points={points([GOAL.right, GOAL.top], [BACK.right, BACK.top], [BACK.right, BACK.bottom], [GOAL.right, GOAL.bottom])}
        fill="url(#tr-net)"
        className="tr-pitch__panel"
      />
      <rect
        x={BACK.left}
        y={BACK.top}
        width={BACK.right - BACK.left}
        height={BACK.bottom - BACK.top}
        fill="url(#tr-net-far)"
        className="tr-pitch__panel is-back"
      />

      {/* The frame. Filled rather than stroked: a post has a width, and at this size the
          difference between a 3.4-unit bar and a 3.4-unit line is the difference between
          a goal and a diagram of one. */}
      <rect x={GOAL.left} y={GOAL.top} width={post} height={GOAL.bottom - GOAL.top} className="tr-pitch__post" />
      <rect x={GOAL.right - post} y={GOAL.top} width={post} height={GOAL.bottom - GOAL.top} className="tr-pitch__post" />
      <rect x={GOAL.left} y={GOAL.top} width={GOAL.right - GOAL.left} height={post} className="tr-pitch__post" />
    </g>
  );
}

/* ── The ball ────────────────────────────────────────────────────────────────
   A circle was a token for a ball. This is one: the classic panelling, at the only
   level of detail that survives being drawn six units across.                 */

export function Ball({ x, y, r = 3.4, className = "" }) {
  return (
    <g className={`tr-pitch__ball ${className}`.trim()} transform={`translate(${x} ${y})`} aria-hidden="true">
      <circle cx="0" cy="0" r={r} className="tr-pitch__ball-skin" />
      <g className="tr-pitch__ball-panels" transform={`scale(${r / 3.4})`}>
        <path d="M 0 -1.9 L 1.8 -0.6 L 1.1 1.5 L -1.1 1.5 L -1.8 -0.6 Z" />
        <path d="M 0 -1.9 L 0 -3.4 M 1.8 -0.6 L 3.2 -1.1 M 1.1 1.5 L 2.1 2.7 M -1.1 1.5 L -2.1 2.7 M -1.8 -0.6 L -3.2 -1.1" />
      </g>
    </g>
  );
}

/* ── The footballer ──────────────────────────────────────────────────────────
   A skeleton, not a drawing. Joints live in a space 40 units tall with the feet on
   the origin, limbs are round-capped strokes and the torso and head are filled, so
   every pose is the same figure standing differently rather than a new picture.
   That is what makes six of them affordable - and what stops the keeper and the
   striker looking like two unrelated species.                                 */

/*
 * Proportion is what makes a silhouette read as a person, and the first version of these
 * got it wrong in the direction that is hardest to unsee: the head was a fifth of the body
 * and the thighs were a ninth of it, so six carefully posed skeletons all came out as the
 * same snowman. A footballer is about seven and a half heads tall and his shoulders are a
 * quarter of his height across. These are built to that and nothing else changed.
 */
const POSES = {
  /** Waiting. The one every figure falls back to. */
  stand: {
    head: [0, -36.4],
    shoulders: [[-5.2, -31], [5.2, -31]],
    hip: [0, -20],
    arms: [[[-5.2, -31], [-7.6, -25], [-7.4, -17.5]], [[5.2, -31], [7.6, -25], [7.4, -17.5]]],
    legs: [[[-1.8, -20], [-3.2, -10.5], [-3.6, 0]], [[1.8, -20], [3.2, -10.5], [3.6, 0]]],
  },
  /** Striking it. Planted on one, the other swung through, shoulders turned over the ball. */
  strike: {
    head: [1.6, -36.2],
    shoulders: [[-6, -30.6], [4.8, -31.4]],
    hip: [0, -20],
    arms: [[[-6, -30.6], [-10, -26.5], [-12.5, -32]], [[4.8, -31.4], [8, -26], [9, -19]]],
    legs: [[[-1.8, -20], [-4.4, -10.5], [-5.2, 0]], [[1.8, -20], [6, -15], [12, -10]]],
  },
  /** Running onto it. */
  run: {
    head: [1.4, -36],
    shoulders: [[-4.8, -30.6], [5.4, -31]],
    hip: [0, -20],
    arms: [[[-4.8, -30.6], [-8.8, -26.5], [-7, -20]], [[5.4, -31], [9, -27], [10, -31.5]]],
    legs: [[[-1.8, -20], [-4.4, -11.5], [-8, -3.5]], [[1.8, -20], [4.4, -11], [6.4, 0]]],
  },
  /** Meeting a cross. Off the ground, arched, arms out for the leap. */
  head: {
    head: [0, -38.2],
    shoulders: [[-5.4, -32.6], [5.4, -32.6]],
    hip: [0, -22],
    arms: [[[-5.4, -32.6], [-9.6, -29.5], [-11.5, -35]], [[5.4, -32.6], [9.6, -29.5], [11.5, -35]]],
    legs: [[[-1.8, -22], [-4.4, -15], [-6, -7.5]], [[1.8, -22], [3, -16.5], [3.8, -10]]],
  },
  /** Making himself big. A keeper's whole job in a one-on-one. */
  spread: {
    head: [0, -34.2],
    shoulders: [[-5.6, -28.8], [5.6, -28.8]],
    hip: [0, -19],
    arms: [[[-5.6, -28.8], [-10.5, -26.5], [-14.5, -22]], [[5.6, -28.8], [10.5, -26.5], [14.5, -22]]],
    legs: [[[-2, -19], [-6, -10.5], [-8.6, 0]], [[2, -19], [6, -10.5], [8.6, 0]]],
  },
  /**
   * Full stretch, and the pose that had to be rebuilt: laid out flat along the ground it
   * read as a torpedo with a head buried in it. A dive is a DIAGONAL - the feet trailing
   * low behind, the body climbing, the top hand as high as it will go - and the head sits
   * on the body's own axis rather than wherever there was room for it.
   *
   * Drawn going to his right (frame right) and mirrored for the other side, because a dive
   * is one shape and which way it goes is a transform, not a second pose.
   */
  dive: {
    head: [10.5, -24.5],
    shoulders: [[5.6, -20.4], [4.2, -16.4]],
    hip: [-5, -12.4],
    arms: [[[5.6, -20.4], [12, -25], [18.5, -30]], [[4.2, -16.4], [10.4, -20], [16.8, -23.5]]],
    legs: [[[-6.4, -13], [-13, -9.6], [-19, -6]], [[-4, -11], [-10.4, -6], [-16, -2]]],
  },
};

export const POSE_NAMES = Object.keys(POSES);

const bone = (joints) => `M ${joints.map(([x, y]) => `${x} ${y}`).join(" L ")}`;

/**
 * One footballer.
 *
 * `height` is in stage units, so a keeper on his line (a shade over two metres of a
 * two-and-a-half-metre goal) and a striker on the penalty spot - nearer the camera, and
 * therefore bigger - are the same figure at two sizes rather than two drawings.
 */
export function Figure({
  x,
  y,
  pose = "stand",
  height = 34,
  facing = 1,
  className = "",
}) {
  const shape = POSES[pose] ?? POSES.stand;
  const scale = height / 40;
  const [hx, hy] = shape.head;
  const [left, right] = shape.shoulders;
  const [hipX, hipY] = shape.hip;

  return (
    <g
      className={`tr-figure ${className}`.trim()}
      transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`}
      aria-hidden="true"
    >
      {/* Limbs first: the torso and the head sit on top of them, which is what stops a
          shoulder joint reading as a hole in the shape. */}
      <g className="tr-figure__limbs">
        {shape.legs.map((joints, index) => (
          <path key={`leg-${index}`} d={bone(joints)} className="tr-figure__leg" />
        ))}
        {shape.arms.map((joints, index) => (
          <path key={`arm-${index}`} d={bone(joints)} className="tr-figure__arm" />
        ))}
      </g>
      <polygon
        className="tr-figure__torso"
        points={points(left, right, [hipX + 2.9, hipY], [hipX - 2.9, hipY])}
      />
      <circle cx={hx} cy={hy} r="2.7" className="tr-figure__head" />
    </g>
  );
}

/* ── The two cameras ─────────────────────────────────────────────────────────
   Both of them look at the goal, because every chance in this game is about the
   goal and a view that could not see it would be a worse picture for the sake of
   a cleverer one. What changes is HOW CLOSE, and therefore who the frame is about:

     BEHIND  the whole stadium. The taker is in the foreground with the ball at his
             feet and the keeper is a figure on a line thirty units away. This is a
             chance you are taking.
     GOAL    cropped hard onto the mouth. The goal fills the frame, the keeper is
             life-size in it and the ball is coming at you. This is a chance you are
             stopping.

   One drawing, two crops - which is why it is a viewBox and not a second scene.
   `cameraFor` in scene.jsx decides which, off the same `stops` flag the model has
   used to tell the two apart since the shot scene was written.                */

export const CAMERAS = { BEHIND: "behind", GOAL: "goal", AREA: "area" };

/**
 * BEHIND and GOAL are both 5:3, which is not a coincidence worth losing: the surface they
 * are drawn on is given the same ratio, so the mapping from a pointer's position in the box
 * to a position in the picture is linear on both axes and nothing has to be distorted to
 * make it so.
 *
 * AREA is the exception and it is SQUARE on purpose. It is the only camera an input lands
 * in two dimensions on, and `judgeChance` measures that input as a circle in 0..1 on both
 * axes - so on any other ratio the ring drawn around the target would be a lie about the
 * target. What is drawn and what is judged have to be the same shape.
 */
export const CAMERA_VIEWBOX = {
  [CAMERAS.BEHIND]: `0 0 ${STAGE.width} ${STAGE.height}`,
  // Tight on the mouth, with just enough grass under it to stand the keeper on.
  [CAMERAS.GOAL]: "30 8 140 84",
  [CAMERAS.AREA]: "44 4 112 112",
};

/** The box each camera crops to, so a caller can map 0..1 of a surface into the picture. */
export const CAMERA_BOX = {
  [CAMERAS.BEHIND]: { x: 0, y: 0, width: STAGE.width, height: STAGE.height },
  [CAMERAS.GOAL]: { x: 30, y: 8, width: 140, height: 84 },
  [CAMERAS.AREA]: { x: 44, y: 4, width: 112, height: 112 },
};

/**
 * The whole stadium, once.
 *
 * `children` are drawn last, in front of everything: the figures, the ball, and whatever a
 * mechanic needs to put on the pitch. The goal is part of the ground rather than part of the
 * contents, so a caller can never accidentally draw the net over its own keeper.
 */
export function PitchStage({ camera = CAMERAS.BEHIND, className = "", children }) {
  return (
    <g className={`tr-pitch is-${camera} ${className}`.trim()}>
      <PitchDefs />
      <Stands />
      <Grass />
      <GoalFrame />
      {children}
    </g>
  );
}

export default PitchStage;
