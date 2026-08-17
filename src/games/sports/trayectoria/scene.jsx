/**
 * The shot, drawn.
 *
 * The big match was the one screen in the game where the player actually plays, and it was
 * made entirely of words: a header, a shot type, three sentences and a prompt. "Cabezazo al
 * área" and "Al segundo palo" are spatial facts being described rather than shown, which is
 * the one place in this game where prose is the wrong instrument.
 *
 * So the goal is drawn once and everything else is data on top of it:
 *
 *  - `PLACEMENTS` puts every placement id at a point in the goal mouth, in normalised
 *    coordinates. There are twenty-one ids across thirteen shot types and they all live in
 *    the same frame, which is what makes one drawing enough.
 *  - `SITUATIONS` says where the ball starts, how much the flight bends and what furniture
 *    the situation needs - a wall for a free kick, a keeper off his line for a one-on-one,
 *    the cross coming in for a header. That is the "situación" the picture is of.
 *  - The same two tables drive the thumbnail on each option button, so what you pick and
 *    what you then watch are the same drawing at two sizes.
 *
 * THE STADIUM ITSELF NOW LIVES IN `pitch.jsx`, and this file is what it used to be minus the
 * drawing: the tables, the flight arithmetic and the staging. That split is what let the
 * seven minigames be played on the same pitch as the shot they are a version of - before it,
 * a keeper's penalty save was a grey bar and this was the only picture of football anywhere.
 *
 * Sides are drawn from behind the shooter, so "a su izquierda" - the keeper's left - is on
 * the right of the frame. Consistency between the button and the replay is what matters
 * here; the model does not care which way round it is.
 */

import React from "react";

import {
  Ball,
  CAMERAS,
  CAMERA_VIEWBOX,
  Figure,
  GOAL,
  GoalFrame,
  PitchDefs,
  PitchStage,
  at,
} from "./pitch.jsx";

export { GOAL, at };

/** Every placement in the game, as a point in that mouth. */
export const PLACEMENTS = {
  izquierda: [0.8, 0.55],
  centro: [0.5, 0.45],
  derecha: [0.2, 0.55],
  cruzado: [0.79, 0.7],
  "primer-palo": [0.18, 0.45],
  picadita: [0.5, 0.16],
  "segundo-palo": [0.82, 0.33],
  atras: [0.32, 0.62],
  barrera: [0.66, 0.18],
  "palo-largo": [0.85, 0.26],
  rasa: [0.42, 0.88],
  abajo: [0.28, 0.88],
  escuadra: [0.87, 0.1],
  cruzada: [0.75, 0.55],
  // Where the man stopping it goes, rather than where the ball does. Same frame, same
  // units - the goal mouth is the goal mouth from either side of it.
  achique: [0.5, 0.75],
  "palo-corto": [0.22, 0.6],
  salida: [0.5, 0.3],
  adelantarse: [0.35, 0.7],
  aguantar: [0.55, 0.65],
  cerrar: [0.72, 0.72],
  // And where the pass is put.
  "al-hueco": [0.6, 0.5],
};

/**
 * Where each kind of chance is struck from, how much the flight bends, and what has to be
 * in the picture for it to be that chance rather than any other.
 *
 * `pose` is new, and it is the half of this table the old drawing had no use for: a figure
 * that can only stand still does not need to be told it is heading the ball. See `Figure`.
 */
export const SITUATIONS = {
  penal: { from: [100, 102], bend: 0.06, keeper: [0.5, 0.62], pose: "strike" },
  // `advance` walks the keeper off his line, towards the viewer, and makes him bigger for
  // it. The goal mouth has no depth axis - v is crossbar to ground - so closing a player
  // down has to be drawn rather than expressed as a point in the frame.
  mano_a_mano: { from: [95, 92], bend: 0.1, keeper: [0.5, 0.68], advance: 16, scale: 1.35, pose: "run", keeperPose: "spread" },
  cabezazo: { from: [62, 76], bend: 0.3, keeper: [0.46, 0.6], pose: "head" },
  falta: { from: [70, 112], bend: 0.42, keeper: [0.34, 0.62], pose: "strike" },
  volea: { from: [116, 106], bend: 0.16, keeper: [0.55, 0.6], pose: "strike" },
  pase_gol: { from: [86, 104], bend: 0.24, keeper: [0.5, 0.6], pose: "run" },

  /**
   * The same drawing from the other side of it.
   *
   * `stops: true` swaps the two moving parts and nothing else: the ball flies to the GAP,
   * because the gap is where the opponent actually put it, and the figure in the goal
   * follows the player's CHOICE, because the choice is where he went. Landing on the same
   * point is the save. It needs no second SVG - the picture was always "a ball, a goal
   * and a man"; only which of them the player controls has changed.
   *
   * It is also what picks the camera: a chance you are stopping is drawn tight on the
   * mouth, because you are the one in it. See `cameraFor`.
   */
  parada_penal: { from: [100, 102], bend: 0.06, keeper: [0.5, 0.62], stops: true, keeperPose: "stand" },
  salida_mano_a_mano: {
    from: [95, 92], bend: 0.1, keeper: [0.5, 0.68], advance: 16, scale: 1.35, stops: true,
    keeperPose: "spread",
  },
  tiro_lejano: { from: [104, 112], bend: 0.14, keeper: [0.5, 0.6], stops: true, keeperPose: "stand" },
  centro_lateral: { from: [26, 88], bend: 0.36, keeper: [0.42, 0.55], stops: true, keeperPose: "head" },
  despeje: { from: [78, 84], bend: 0.2, keeper: [0.5, 0.6], stops: true, keeperPose: "head" },
  entrada: { from: [92, 96], bend: 0.08, keeper: [0.5, 0.66], advance: 12, scale: 1.2, stops: true, keeperPose: "run" },
  anticipo: { from: [34, 86], bend: 0.32, keeper: [0.48, 0.58], stops: true, keeperPose: "run" },
};

/**
 * Which way this chance is filmed.
 *
 * One flag, already in the table, already meaning exactly this: a chance the player is
 * STOPPING is a chance he is standing in, so the camera comes in tight and he is life-size
 * in the frame. A chance he is taking is filmed over his shoulder with the whole stadium in
 * it. It is the fastest thing on the screen to read and it says what kind of footballer you
 * are before a word of copy does.
 */
export const cameraFor = (type) =>
  SITUATIONS[type]?.stops ? CAMERAS.GOAL : CAMERAS.BEHIND;

/** A flight from the ball to a point in the goal, bent by however much the strike bends. */
export function flight(from, target, bend) {
  const midX = (from[0] + target.x) / 2;
  const midY = (from[1] + target.y) / 2;
  // Perpendicular to the line, so the bend reads as swerve rather than as a wobble.
  const dx = target.x - from[0];
  const dy = target.y - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const cx = midX + (-dy / length) * bend * length * 0.5;
  const cy = midY + (dx / length) * bend * length * 0.5;
  return `M ${from[0]} ${from[1]} Q ${cx} ${cy} ${target.x} ${target.y}`;
}

/**
 * What makes the situation itself: the spot, the wall, the cross coming in.
 *
 * Exported because the played mode needs it too. A free kick drawn without its wall is a
 * shot from thirty yards at an empty goal, which is not the chance the model handed out -
 * and the wall is the single thing that says "this is a falta" faster than the label does.
 */
export function Furniture({ type }) {
  if (type === "penal") {
    return (
      <g className="tr-scene__prop">
        <path d={`M 74 ${GOAL.bottom + 6} A 40 14 0 0 0 126 ${GOAL.bottom + 6}`} />
        <circle cx="100" cy="102" r="1.6" className="tr-scene__spot" />
      </g>
    );
  }
  if (type === "falta") {
    // A wall of actual players rather than four identical tokens, and turned away from the
    // ball the way a wall stands.
    return (
      <g className="tr-scene__wall">
        {[0, 1, 2, 3].map((index) => (
          <Figure key={index} x={92 + index * 7.5} y={86} height={30} pose="stand" />
        ))}
      </g>
    );
  }
  // The cross that put the ball there, so the header has something to be a header of -
  // and the same delivery for the two chances that are about meeting one before he does.
  if (type === "cabezazo" || type === "centro_lateral" || type === "anticipo") {
    return (
      <g className="tr-scene__prop">
        <path d="M 12 104 Q 34 66 60 74" className="tr-scene__cross" />
        <path d="M 55 71 L 62 76 L 54 78" className="tr-scene__cross" />
      </g>
    );
  }
  if (type === "volea") {
    return (
      <g className="tr-scene__prop">
        <path d="M 128 74 Q 124 92 116 104" className="tr-scene__cross" />
        <path d="M 112 97 L 116 105 L 121 99" className="tr-scene__cross" />
      </g>
    );
  }
  // One on one: the keeper is already off his line, which is the whole picture.
  return null;
}

/**
 * The full drawing.
 *
 * Before the shot it is the situation and nothing else - showing the flight in advance
 * would give away the one thing the player is supposed to be guessing at. After it, the
 * ball's path is drawn to where it was actually hit, and the gap is ringed.
 */
export default function ShotScene({ type, options = [], gap = null, result = null }) {
  const situation = SITUATIONS[type] ?? SITUATIONS.penal;
  const camera = cameraFor(type);

  // A night the ball never came to him has a result but no shot in it, so the drawing stays
  // the situation it always was: no flight, no dive, and above all no gap ringed - the gap
  // is where a keeper was not, and no keeper was ever asked anything.
  const shot = result && !result.absent ? result : null;
  // On a chance the player is STOPPING, the gap is where the opponent put it - so it is
  // the ball's destination and not a ring drawn beside it.
  const stops = Boolean(situation.stops);
  const gapAt = gap != null && options[gap] ? at(...PLACEMENTS[options[gap]]) : null;
  const gapPoint = shot && !stops ? gapAt : null;

  // Who moves where. Shooting: the ball goes to his choice and the keeper covers it or is
  // beaten by it. Stopping: the ball goes to the gap and the figure in the goal is HIM,
  // going where he chose - the two landing on the same point is the save.
  let keeperSpot = situation.keeper;
  let target = null;
  if (shot) {
    if (stops) {
      if (options[shot.picked]) keeperSpot = PLACEMENTS[options[shot.picked]];
      target = gapAt;
    } else {
      const beaten = options.findIndex((option, index) => index !== gap);
      const covered = shot.scored ? beaten : shot.picked;
      if (options[covered]) keeperSpot = PLACEMENTS[options[covered]];
      if (options[shot.picked]) target = at(...PLACEMENTS[options[shot.picked]]);
    }
  }

  const keeperAt = at(keeperSpot[0], keeperSpot[1]);
  // Once he has committed he is diving, whichever side of the goal he ended up on. Before
  // that he is whatever the situation says he is WAITING in - never the dive itself, or the
  // frame opens on a keeper already flat out with nothing to dive at.
  const keeperPose = shot ? "dive" : situation.keeperPose ?? "stand";
  // A dive is one shape and which way it goes is a transform - see POSES.dive.
  const facing = keeperSpot[0] < 0.5 ? -1 : 1;

  return (
    <svg
      className={`tr-scene${
        result ? (result.absent ? " is-absent" : result.scored ? " is-scored" : " is-saved") : ""
      }`}
      viewBox={CAMERA_VIEWBOX[camera]}
      role="img"
      aria-hidden="true"
    >
      <PitchStage camera={camera}>
        <Furniture type={type} />

        {/* The man in the goal. He stands on the ground line whatever height the placement
            he is covering sits at - a keeper does not float up to the crossbar - so `v`
            moves his DIVE and not his feet. */}
        <Figure
          x={keeperAt.x}
          y={GOAL.bottom + (situation.advance ?? 0) * (shot ? 0 : 1)}
          height={34 * (shot ? 1 : situation.scale ?? 1)}
          pose={keeperPose}
          facing={facing}
          className="tr-scene__keeper"
        />

        {/* The man taking it, in the foreground, unless this is a chance he is standing in
            the goal for - in which case he is the figure above and there is nobody else. */}
        {stops ? null : (
          <Figure
            x={situation.from[0] - 11}
            y={situation.from[1] + 4}
            height={46}
            pose={shot ? "strike" : situation.pose ?? "stand"}
            facing={situation.from[0] > 100 ? -1 : 1}
            className="tr-scene__taker"
          />
        )}

        {/* The ball, on the spot the situation strikes from - and still there on a night it
            never got struck. */}
        {!shot ? <Ball x={situation.from[0]} y={situation.from[1]} /> : null}

        {target ? (
          <>
            <path
              d={flight(situation.from, target, situation.bend)}
              className="tr-scene__flight"
              pathLength="100"
            />
            <Ball x={target.x} y={target.y} />
          </>
        ) : null}

        {gapPoint ? (
          <circle cx={gapPoint.x} cy={gapPoint.y} r="7.5" className="tr-scene__gap" />
        ) : null}
      </PitchStage>
    </svg>
  );
}

/**
 * The same drawing, small enough to sit on a button. No stadium and no figures: at this
 * size the only readable information is where in the goal the ball is going, and everything
 * else is noise competing with it.
 */
export function PlacementDiagram({ type, placement }) {
  const situation = SITUATIONS[type] ?? SITUATIONS.penal;
  const spot = PLACEMENTS[placement];
  if (!spot) return null;
  const target = at(...spot);

  return (
    <svg className="tr-aim" viewBox="30 12 140 100" aria-hidden="true">
      <PitchDefs />
      <GoalFrame />
      <path
        d={flight(situation.from, target, situation.bend)}
        className="tr-aim__flight"
      />
      <circle cx={target.x} cy={target.y} r="6" className="tr-aim__target" />
    </svg>
  );
}
