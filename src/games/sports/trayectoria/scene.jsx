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
 *    coordinates. There are fourteen ids across five shot types and they all live in the
 *    same frame, which is what makes one drawing enough.
 *  - `SITUATIONS` says where the ball starts, how much the flight bends and what furniture
 *    the situation needs - a wall for a free kick, a keeper off his line for a one-on-one,
 *    the cross coming in for a header. That is the "situación" the picture is of.
 *  - The same two tables drive the thumbnail on each option button, so what you pick and
 *    what you then watch are the same drawing at two sizes.
 *
 * Sides are drawn from behind the shooter, so "a su izquierda" - the keeper's left - is on
 * the right of the frame. Consistency between the button and the replay is what matters
 * here; the model does not care which way round it is.
 */

import React from "react";

/* The goal mouth inside the 200x120 stage, and the ground it stands on. */
const GOAL = { left: 44, right: 156, top: 20, bottom: 62 };
const at = (u, v) => ({
  x: GOAL.left + (GOAL.right - GOAL.left) * u,
  y: GOAL.top + (GOAL.bottom - GOAL.top) * v,
});

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
 */
export const SITUATIONS = {
  penal: { from: [100, 102], bend: 0.06, keeper: [0.5, 0.62] },
  // `advance` walks the keeper off his line, towards the viewer, and makes him bigger for
  // it. The goal mouth has no depth axis - v is crossbar to ground - so closing a player
  // down has to be drawn rather than expressed as a point in the frame.
  mano_a_mano: { from: [95, 92], bend: 0.1, keeper: [0.5, 0.68], advance: 16, scale: 1.35 },
  cabezazo: { from: [62, 76], bend: 0.3, keeper: [0.46, 0.6] },
  falta: { from: [70, 112], bend: 0.42, keeper: [0.34, 0.62] },
  volea: { from: [116, 106], bend: 0.16, keeper: [0.55, 0.6] },
  pase_gol: { from: [86, 104], bend: 0.24, keeper: [0.5, 0.6] },

  /**
   * The same drawing from the other side of it.
   *
   * `stops: true` swaps the two moving parts and nothing else: the ball flies to the GAP,
   * because the gap is where the opponent actually put it, and the figure in the goal
   * follows the player's CHOICE, because the choice is where he went. Landing on the same
   * point is the save. It needs no second SVG - the picture was always "a ball, a goal
   * and a man"; only which of them the player controls has changed.
   */
  parada_penal: { from: [100, 102], bend: 0.06, keeper: [0.5, 0.62], stops: true },
  salida_mano_a_mano: {
    from: [95, 92], bend: 0.1, keeper: [0.5, 0.68], advance: 16, scale: 1.35, stops: true,
  },
  tiro_lejano: { from: [104, 112], bend: 0.14, keeper: [0.5, 0.6], stops: true },
  centro_lateral: { from: [26, 88], bend: 0.36, keeper: [0.42, 0.55], stops: true },
  despeje: { from: [78, 84], bend: 0.2, keeper: [0.5, 0.6], stops: true },
  entrada: { from: [92, 96], bend: 0.08, keeper: [0.5, 0.66], advance: 12, scale: 1.2, stops: true },
  anticipo: { from: [34, 86], bend: 0.32, keeper: [0.48, 0.58], stops: true },
};

/** A flight from the ball to a point in the goal, bent by however much the strike bends. */
function flight(from, target, bend) {
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

/** The frame, the net and the grass. Drawn once and reused at both sizes. */
function Goal({ net = true }) {
  return (
    <g className="tr-scene__goal">
      {net ? (
        <rect
          x={GOAL.left}
          y={GOAL.top}
          width={GOAL.right - GOAL.left}
          height={GOAL.bottom - GOAL.top}
          className="tr-scene__net"
        />
      ) : null}
      <path
        d={`M ${GOAL.left} ${GOAL.bottom} V ${GOAL.top} H ${GOAL.right} V ${GOAL.bottom}`}
        className="tr-scene__frame"
      />
      <path d={`M 8 ${GOAL.bottom} H 192`} className="tr-scene__ground" />
    </g>
  );
}

/** A keeper, as a shape rather than a person: shoulders, head, and arms up. */
function Keeper({ u, v, spread = 1, advance = 0, scale = 1 }) {
  const { x, y } = at(u, v);
  return (
    <g
      className="tr-scene__keeper"
      transform={`translate(${x} ${y + advance}) scale(${scale})`}
    >
      <circle cx="0" cy="-11" r="3.4" />
      <path d={`M ${-5 * spread} 0 L 0 -8 L ${5 * spread} 0`} />
      <path d={`M ${-5 * spread} 0 L ${-7 * spread} -9 M ${5 * spread} 0 L ${7 * spread} -9`} />
    </g>
  );
}

/** What makes the situation itself: the spot, the wall, the cross coming in. */
function Furniture({ type }) {
  if (type === "penal") {
    return (
      <g className="tr-scene__prop">
        <path d={`M 74 ${GOAL.bottom + 6} A 40 14 0 0 0 126 ${GOAL.bottom + 6}`} />
        <circle cx="100" cy="102" r="1.6" className="tr-scene__spot" />
      </g>
    );
  }
  if (type === "falta") {
    return (
      <g className="tr-scene__prop">
        {[0, 1, 2, 3].map((index) => (
          <g key={index} transform={`translate(${84 + index * 9} 84)`}>
            <circle cx="0" cy="-13" r="2.8" />
            <path d="M -3.4 0 L -3.4 -10 L 3.4 -10 L 3.4 0" />
          </g>
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

  return (
    <svg
      className={`tr-scene${
        result ? (result.absent ? " is-absent" : result.scored ? " is-scored" : " is-saved") : ""
      }`}
      viewBox="0 0 200 120"
      role="img"
      aria-hidden="true"
    >
      <Goal />
      <Furniture type={type} />
      {/* Once he has committed he is diving in the goal, so whatever brought him off his
          line no longer applies. */}
      <Keeper
        u={keeperSpot[0]}
        v={keeperSpot[1]}
        spread={shot ? 1.5 : 1}
        advance={shot ? 0 : situation.advance ?? 0}
        scale={shot ? 1 : situation.scale ?? 1}
      />

      {/* The ball, on the spot the situation strikes from - and still there on a night it
          never got struck. */}
      {!shot ? <circle cx={situation.from[0]} cy={situation.from[1]} r="3" className="tr-scene__ball" /> : null}

      {target ? (
        <>
          <path
            d={flight(situation.from, target, situation.bend)}
            className="tr-scene__flight"
            pathLength="100"
          />
          <circle cx={target.x} cy={target.y} r="3" className="tr-scene__ball" />
        </>
      ) : null}

      {gapPoint ? (
        <circle cx={gapPoint.x} cy={gapPoint.y} r="7.5" className="tr-scene__gap" />
      ) : null}
    </svg>
  );
}

/**
 * The same drawing, small enough to sit on a button. No furniture and no keeper: at this
 * size the only readable information is where in the goal the ball is going.
 */
export function PlacementDiagram({ type, placement }) {
  const situation = SITUATIONS[type] ?? SITUATIONS.penal;
  const spot = PLACEMENTS[placement];
  if (!spot) return null;
  const target = at(...spot);

  return (
    <svg className="tr-aim" viewBox="30 12 140 100" aria-hidden="true">
      <Goal net={false} />
      <path
        d={flight(situation.from, target, situation.bend)}
        className="tr-aim__flight"
      />
      <circle cx={target.x} cy={target.y} r="6" className="tr-aim__target" />
    </svg>
  );
}
