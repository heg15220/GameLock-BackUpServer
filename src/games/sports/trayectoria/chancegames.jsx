/**
 * The seven ways a chance gets played, on the pitch it is happening on.
 *
 * `minigames.js` is the model - where the target is, how wide, how fast - and has no React
 * in it. This is the other half: one surface per mechanic, each one a different verb in the
 * hand, all of them ending in the same call. Nothing here decides anything. Every surface
 * hands `onSettle` what the player committed, in the 0..1 units the judge already speaks,
 * and `judgeChance` is the only thing that says whether it went in.
 *
 * ── Why these are drawn on a pitch ────────────────────────────────────────────
 *
 * They used to be grey bars. Seven mechanics, each correct, each keyed off the player's
 * position by `CHANCE_MECHANIC` - and all of them rendered as the same rectangle with a
 * marker running along it. A goalkeeper's penalty save and a striker's finish were the same
 * screen with different words over it, which meant the one thing the model has always known
 * about you, THAT YOUR POSITION IS A DIFFERENT GAME, never reached the eye.
 *
 * So every surface is now the same stadium `scene.jsx` draws, and the 0..1 the mechanic
 * speaks is a line inside it: the goal mouth for the ones you aim across, the run of the
 * grass for the ones you time, the flight of the ball itself for the one you power. The
 * camera comes from `cameraFor` - over the shoulder when you are taking it, tight on the
 * mouth when you are the one in the goal - so before a word is read the screen has already
 * said which kind of footballer this career is about.
 *
 * ── The rules that did not change ─────────────────────────────────────────────
 *
 *  1. ONE VERB EACH. A sweep is a tap, a charge is a hold, an aim is a drag. If two of them
 *     needed the same explanation they would be the same game with different paint.
 *  2. THE TARGET IS ALWAYS DRAWN. Not one of these is a guess about where the goal is. The
 *     guessing lives in the blind shot, in the other mode; here you can see what you are
 *     being asked for and the only question is whether you can do it.
 *  3. REDUCED MOTION IS NOT A HARDER GAME. Anyone who has asked for no movement gets the
 *     chance still, and one press per call commits on the target. That preference asks for
 *     less movement, never for less career.
 *
 * The tap games commit on CLICK and the held ones on POINTER events, which is not an
 * inconsistency: a tap is a decision and a click is the browser's word for a decision, while
 * a hold and a drag do not exist until a pointer is down.
 *
 * ── The one geometric promise ─────────────────────────────────────────────────
 *
 * `pointIn` reads a pointer as 0..1 of the SURFACE, and the judge measures against 0..1. So
 * every camera's viewBox has the aspect ratio its surface is given in CSS, and the only
 * mechanic that lands a two-dimensional input uses the square one. What is drawn and what
 * is judged are the same shape - see CAMERA_VIEWBOX.
 */
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { MECHANICS, spotAt } from "./minigames.js";
import {
  Ball,
  CAMERAS,
  CAMERA_VIEWBOX,
  Figure,
  GOAL,
  PitchStage,
} from "./pitch.jsx";
import { Furniture, SITUATIONS, cameraFor, flight } from "./scene.jsx";
import { fillTemplate, getCopy } from "./copy.js";
import usePrefersReducedMotion from "./motion.js";

/** Where a pointer landed inside an element, in 0..1 of its own box. */
function pointIn(element, event) {
  const box = element?.getBoundingClientRect?.() ?? { left: 0, top: 0, width: 1, height: 1 };
  return {
    x: Math.max(0, Math.min(1, (event.clientX - box.left) / Math.max(1, box.width))),
    y: Math.max(0, Math.min(1, (event.clientY - box.top) / Math.max(1, box.height))),
  };
}

/* ── Reading the pitch in the units the model speaks ─────────────────────────
   Every one of these turns a 0..1 the judge understands into a place in the
   picture. They are the whole translation layer; past this point a mechanic is
   drawing football rather than drawing a bar.                                */

const MOUTH = { w: GOAL.right - GOAL.left, h: GOAL.bottom - GOAL.top };
/** Across the goal, left post to right post. */
const mouthX = (u) => GOAL.left + MOUTH.w * u;
/** Up the run of the grass: 0 is at the camera's feet, 1 is on the goal line. */
const runY = (t) => 116 - Math.max(0, Math.min(1, t)) * 50;

/** The situation this chance belongs to, so the surface can stand people in the right place. */
const sceneOf = (chance) => SITUATIONS[chance?.shotType] ?? SITUATIONS.penal;

/*
 * THREE MECHANICS DO NOT GET TO PICK THEIR CAMERA, and it is not a style choice.
 *
 * `cameraFor` crops tight on the mouth for a chance the player is stopping, which is right
 * for anything measured ACROSS the goal and wrong for anything measured along the pitch:
 * the window runs up fifty units of grass and the charge draws the whole flight of the
 * ball, and the tight crop throws both of them off the bottom and the side of the frame.
 * Measured on the preview, a keeper's WINDOW was a figure alone in an empty goal with its
 * target zone entirely outside the picture - a chance that could not be timed by looking
 * at it. So the ones that need the depth of the pitch always get the wide camera, and only
 * the ones that live in the goal mouth take the close one.
 */

/**
 * The furniture every chance shares: what you are being asked, the pitch itself, and the
 * one line that says which verb this is. The prompt and the hint are the only places the
 * games differ in words, so a player who has met this one before can skip them and the one
 * who has not is never left guessing what to do with his thumb.
 */
const Surface = forwardRef(function Surface(
  { mechanic, camera = CAMERAS.BEHIND, prompt, hint, label, children, ...rest },
  ref,
) {
  return (
    <div className="tr-chance">
      <p className="tr-chance__prompt">{prompt}</p>
      <button
        type="button"
        ref={ref}
        className={`tr-chance__stage is-${mechanic} is-${camera}`}
        aria-label={label}
        {...rest}
      >
        <svg className="tr-chance__pitch" viewBox={CAMERA_VIEWBOX[camera]} aria-hidden="true">
          <PitchStage camera={camera}>{children}</PitchStage>
        </svg>
      </button>
      <p className="tr-chance__hint">{hint}</p>
    </div>
  );
});

/**
 * The man taking it, the ball at his feet, and whatever makes the chance the chance it is.
 *
 * The furniture is not decoration: the wall is what tells you this is a free kick, the spot
 * is what tells you it is a penalty, and the cross coming in is the whole reason a header
 * is a header. Playing them on a bare goal made four of the thirteen look like each other.
 */
function Taker({ chance, pose = null }) {
  const scene = sceneOf(chance);
  if (scene.stops) return <Furniture type={chance?.shotType} />;
  return (
    <>
      <Furniture type={chance?.shotType} />
      <Figure
        x={scene.from[0] - 11}
        y={scene.from[1] + 4}
        height={40}
        pose={pose ?? scene.pose ?? "stand"}
        facing={scene.from[0] > 100 ? -1 : 1}
        className="tr-scene__taker"
      />
      <Ball x={scene.from[0]} y={scene.from[1]} />
    </>
  );
}

/** The man in the way, on his line, for the cameras that are looking at him. */
function Opponent({ chance, u = 0.5, pose = null, className = "tr-scene__keeper" }) {
  const scene = sceneOf(chance);
  return (
    <Figure
      x={mouthX(u)}
      y={GOAL.bottom}
      height={32}
      pose={pose ?? scene.keeperPose ?? "stand"}
      facing={u < 0.5 ? -1 : 1}
      className={className}
    />
  );
}

/* ── One touch, and two of them ──────────────────────────────────────────────
   Sweep, window and bend all run a marker along a line and stop it. Bend is the
   two-gate case of the same act, which is why it is not a fourth surface: the
   second call is the same call again, and the first one stays on screen as the
   argument for the second.

   What differs now is the LINE. A sweep runs across the goal mouth, because that
   is where a sweep is aimed. A window runs up the grass, because what closes on
   you is a man arriving. Same state machine, two different pieces of football. */

function TrackGame({ chance, copy, reduced, onSettle }) {
  const [position, setPosition] = useState(0);
  const [gate, setGate] = useState(0);
  const [locked, setLocked] = useState([]);
  const frame = useRef({ start: 0 });

  const gates = chance.gates ?? [chance.target];
  const closing = chance.mechanic === MECHANICS.WINDOW;
  const camera = closing ? CAMERAS.BEHIND : cameraFor(chance.shotType);

  useEffect(() => {
    // Reduced motion gets a still track and a tap: the same decision without the chase.
    if (reduced) return undefined;
    frame.current.start = performance.now();
    let raf = 0;
    const step = (now) => {
      const elapsed = ((now - frame.current.start) / 1000) % chance.period;
      const phase = elapsed / chance.period;
      // A sweep bounces; a window runs once and is gone.
      setPosition(closing ? phase : phase < 0.5 ? phase * 2 : 2 - phase * 2);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [chance.period, closing, reduced, gate]);

  const settle = useCallback(
    (value) => {
      const next = [...locked, value];
      if (next.length >= gates.length) {
        onSettle(gates.length > 1 ? next : next[0]);
        return;
      }
      setLocked(next);
      setGate(next.length);
      frame.current.start = performance.now();
    },
    [gates.length, locked, onSettle],
  );

  const at = reduced ? gates[gate] : position;
  const tol = chance.tolerance;

  return (
    <Surface
      mechanic={chance.mechanic}
      camera={camera}
      prompt={
        gates.length > 1
          ? fillTemplate(copy.match.chanceGate, { n: gate + 1, total: gates.length })
          : copy.match.chancePrompt[chance.mechanic]
      }
      hint={copy.match.chanceHint[chance.mechanic]}
      label={copy.match.chancePrompt[chance.mechanic]}
      onClick={() => settle(at)}
    >
      {closing ? (
        <ClosingRun chance={chance} target={gates[gate]} tolerance={tol} at={at} />
      ) : (
        <AcrossTheGoal
          chance={chance}
          target={gates[gate]}
          tolerance={tol}
          at={at}
          locked={locked}
          curling={gates.length > 1 && gate === 1}
        />
      )}
    </Surface>
  );
}

/**
 * The sight running across the goal, and the band it has to stop in.
 *
 * On the second gate of a bend the line stops being a place and becomes a shape: the flight
 * from the ball to the point already locked in, curling further the further the marker has
 * run. You are not aiming twice - you are aiming, and then deciding how much to bend it.
 */
function AcrossTheGoal({ chance, target, tolerance, at, locked = [], curling = false }) {
  const scene = sceneOf(chance);
  const bandFrom = mouthX(Math.max(0, target - tolerance));
  const bandTo = mouthX(Math.min(1, target + tolerance));
  const aimU = curling ? locked[0] ?? 0.5 : at;
  const bend = curling ? (at - 0.5) * 1.4 : 0;
  /*
   * WHO IS MOVING depends on whose chance it is, and getting this wrong made a keeper's
   * long-range save read as a corpse: the figure took its pose from the situation table,
   * which says `dive` for that chance, so the man you were playing lay flat on the line
   * while a marker swept over him. On a chance you are STOPPING you are the one running
   * the line - the sight and the keeper are the same object - and on one you are taking,
   * he stands where the situation put him and the sight is the ball's.
   */
  const mine = Boolean(scene.stops);

  return (
    <>
      <Taker chance={chance} />
      <Opponent
        chance={chance}
        u={mine ? at : scene.keeper[0]}
        pose={mine ? "spread" : undefined}
        className={mine ? "tr-scene__keeper" : "tr-scene__keeper is-idle"}
      />

      {/* The band, drawn through the goal so it reads as a part of the target rather than
          as a gauge sitting on top of one. */}
      <rect
        className="tr-play__band"
        x={bandFrom}
        y={GOAL.top}
        width={Math.max(1, bandTo - bandFrom)}
        height={MOUTH.h}
      />
      {locked.map((value, index) => (
        <line
          key={index}
          className="tr-play__locked"
          x1={mouthX(value)}
          y1={GOAL.top}
          x2={mouthX(value)}
          y2={GOAL.bottom}
        />
      ))}

      {curling ? (
        <path
          className="tr-play__curl"
          d={flight(scene.from, { x: mouthX(aimU), y: GOAL.top + MOUTH.h * 0.45 }, bend)}
        />
      ) : (
        <line
          className="tr-play__sight"
          x1={mouthX(at)}
          y1={GOAL.top - 4}
          x2={mouthX(at)}
          y2={GOAL.bottom}
        />
      )}
      {mine ? <Ball x={mouthX(0.5)} y="100" /> : null}
    </>
  );
}

/**
 * The thing that closes on you: a man arriving, up the run of the grass.
 *
 * A window is a moment rather than a place, and the honest picture of a moment in football
 * is somebody getting nearer. The band is a strip of ground, and he crosses it once.
 */
function ClosingRun({ chance, target, tolerance, at }) {
  /*
   * The window is a moment, and the ground it maps onto has to be measured the same way the
   * man crossing it is - `runY(1 - t)`, so t=0 is the far distance and t=1 is on top of you.
   * Computed the other way round it drew the band at the far end while he arrived at the
   * near one, and the chance became untimeable by looking at it.
   */
  const from = runY(1 - Math.max(0, target - tolerance));
  const to = runY(1 - Math.min(1, target + tolerance));
  const top = Math.min(from, to);

  return (
    <>
      <rect
        className="tr-play__band is-ground"
        x="46"
        y={top}
        width="108"
        height={Math.max(2.5, Math.abs(to - from))}
        rx="2"
      />
      <Ball x="100" y={runY(0.06)} />
      {/* Him, arriving. He gets bigger as he comes, which is the only cue that says he is
          closing rather than sliding down a bar. */}
      <Figure
        x="100"
        y={runY(1 - at)}
        height={18 + at * 22}
        pose="run"
        facing={-1}
        className="tr-play__closer"
      />
    </>
  );
}

/* ── Hold and release ────────────────────────────────────────────────────────
   The bar climbs while you hold it and it does not come back. That is the whole
   difference from a sweep: a sweep forgives you by coming round again, and this
   asks you to let go of something while it is still moving.

   Drawn as the strike itself: the arc the ball would take, growing while you hold
   it. The two ghosts are the band - too little and it never gets there, too much
   and it is in the stand behind the goal. Nothing else says "power" this fast. */

function ChargeGame({ chance, copy, reduced, onSettle }) {
  const [value, setValue] = useState(0);
  const [holding, setHolding] = useState(false);
  const held = useRef(0);
  const done = useRef(false);

  const settle = useCallback(
    (at) => {
      if (done.current) return;
      done.current = true;
      onSettle(at);
    },
    [onSettle],
  );

  useEffect(() => {
    if (!holding || reduced) return undefined;
    const start = performance.now();
    let raf = 0;
    const step = (now) => {
      const filled = (now - start) / 1000 / chance.period;
      if (filled >= 1) {
        // Held past the top. Over the bar, and it is your own fault, which is the point.
        held.current = 1;
        setValue(1);
        settle(1);
        return;
      }
      held.current = filled;
      setValue(filled);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [holding, reduced, chance.period, settle]);

  const release = () => {
    if (!holding) return;
    settle(held.current);
  };

  const at = reduced ? chance.target : value;

  return (
    <Surface
      mechanic={chance.mechanic}
      camera={CAMERAS.BEHIND}
      prompt={copy.match.chancePrompt[chance.mechanic]}
      hint={copy.match.chanceHint[chance.mechanic]}
      label={copy.match.chancePrompt[chance.mechanic]}
      onPointerDown={(event) => {
        if (reduced) {
          settle(chance.target);
          return;
        }
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setHolding(true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      // Keyboard: press to start, press again to let go. Same two moments, no pointer.
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        if (reduced) settle(chance.target);
        else if (!holding) setHolding(true);
        else release();
      }}
    >
      <PowerArc chance={chance} at={at} live={holding} />
    </Surface>
  );
}

/**
 * The strike, previewed. Power is how high up the goal the ball finishes.
 *
 * The first version of this drew the band as two ghost FLIGHTS, one at each end of it, and
 * it was the worst picture in the game: the camera looks down the pitch, so distance to the
 * goal is vertical on screen and the flight of a volley is a near-vertical stick - two of
 * them fifteen units apart were indistinguishable, and the thing being asked for was
 * invisible. Measured on a gameplay frame: a red line, two dashed lines on top of it, and
 * no way to tell what "the band" meant.
 *
 * So the band moved to where it is actually being aimed - a strip ACROSS THE GOAL, at the
 * height the ball has to arrive at. Same green rectangle the sweep uses, turned ninety
 * degrees, and it means the same thing. The flight is now one line and the ball rides its
 * end, so what climbs is the ball rather than a diagram, and past the crossbar it is
 * visibly in the stand behind the goal.
 */
function PowerArc({ chance, at, live }) {
  const scene = sceneOf(chance);
  // Under the bar at the bottom of the band, over it at the top: the whole risk of a hold.
  const height = (power) => GOAL.bottom - power * (MOUTH.h + 20);
  const top = height(Math.min(1, chance.target + chance.tolerance));
  const foot = height(Math.max(0, chance.target - chance.tolerance));
  const landing = { x: mouthX(0.5), y: height(at) };

  return (
    <>
      <Taker chance={chance} pose="strike" />
      <Opponent chance={chance} u={scene.keeper[0]} className="tr-scene__keeper is-idle" />

      {/* Where it has to arrive. Across the goal, because that is the thing being hit. */}
      <rect
        className="tr-play__band"
        x={GOAL.left}
        y={top}
        width={MOUTH.w}
        height={Math.max(2, foot - top)}
      />
      {/* And the bar itself, marked, so "over it" is a place and not a number. */}
      <line
        className="tr-play__over"
        x1={GOAL.left - 6}
        y1={GOAL.top}
        x2={GOAL.right + 6}
        y2={GOAL.top}
      />
      <path
        className={`tr-play__curl${live ? " is-live" : ""}`}
        d={flight(scene.from, landing, 0.34)}
      />
      <Ball x={landing.x} y={landing.y} r="3.4" />
    </>
  );
}

/* ── Drag and release, on something that is moving ───────────────────────────
   The only chance with two dimensions. The disc is the run being made or the
   cross coming across, and it goes once: you are not placing a ball on a static
   dot, you are trying to be where it ends up. That is the whole of this game,
   and it is why the camera is SQUARE - the judge measures a circle in 0..1 on
   both axes, so on a wide crop the drawn ring would be a lie about where the
   target is. What is drawn and what is judged are the same shape.

   The crosshair runs the full width and height on purpose: on a phone your own
   thumb covers the point you are aiming with, and the lines stay visible either
   side of it.                                                                 */

function AimGame({ chance, copy, reduced, onSettle }) {
  const field = useRef(null);
  const [aim, setAim] = useState(null);
  const [run, setRun] = useState(0);
  const held = useRef({ at: null, t: 0 });
  const done = useRef(false);

  const settle = useCallback(
    (where, t) => {
      if (done.current) return;
      done.current = true;
      // Nothing under the hand when the run ended: the ball went through and he was not
      // there. The far corner is outside every disc this builds - see `inside` in
      // minigames.js - so it reads as the miss it was.
      onSettle(where ? { ...where, t } : { x: 1, y: 1, t: 1 });
    },
    [onSettle],
  );

  useEffect(() => {
    if (reduced) return undefined;
    const start = performance.now();
    let raf = 0;
    const step = (now) => {
      const elapsed = (now - start) / 1000 / chance.period;
      if (elapsed >= 1) {
        held.current.t = 1;
        setRun(1);
        // It arrived. If he was on it, that is a header; if he never moved, it is not.
        settle(held.current.at, 1);
        return;
      }
      held.current.t = elapsed;
      setRun(elapsed);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, chance.period, settle]);

  const track = (event) => {
    const point = pointIn(field.current, event);
    held.current.at = point;
    setAim(point);
  };

  // Where the ball is now, and where the hand is. Both drawn, always.
  const spot = spotAt(chance.spot, reduced ? 1 : run);
  const at = aim ?? (reduced ? spot : null);

  return (
    <Surface
      mechanic={chance.mechanic}
      camera={CAMERAS.AREA}
      prompt={copy.match.chancePrompt[chance.mechanic]}
      hint={copy.match.chanceHint[chance.mechanic]}
      label={copy.match.chancePrompt[chance.mechanic]}
      ref={field}
      onPointerDown={(event) => {
        if (reduced) {
          settle(spot, 1);
          return;
        }
        event.currentTarget.setPointerCapture?.(event.pointerId);
        track(event);
      }}
      onPointerMove={(event) => {
        if (reduced || !held.current.at) return;
        track(event);
      }}
      onPointerUp={() => held.current.at && settle(held.current.at, held.current.t)}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        settle(spot, reduced ? 1 : held.current.t);
      }}
    >
      <AimField chance={chance} spot={spot} at={at} />
    </Surface>
  );
}

/**
 * The square crop of the box, and the two things in it: where the ball is going to be, and
 * where you have put yourself.
 *
 * `AREA` maps 0..1 of the surface onto 0..1 of this crop on both axes, so the arithmetic
 * below is the only place the two coordinate systems meet - and it is a straight lerp.
 */
function AimField({ chance, spot, at }) {
  const box = { x: 44, y: 4, size: 112 };
  const px = (u) => box.x + u * box.size;
  const py = (v) => box.y + v * box.size;
  const radius = chance.tolerance * box.size;

  return (
    <>
      {/* The ball's destination, travelling. The disc around it is exactly the disc the
          judge measures, at exactly the size it measures it. */}
      <circle className="tr-play__disc" cx={px(spot.x)} cy={py(spot.y)} r={radius} />
      <Ball x={px(spot.x)} y={py(spot.y)} r="3.6" />

      {at ? (
        <g className="tr-play__reticle">
          <line x1={px(at.x)} y1={box.y} x2={px(at.x)} y2={box.y + box.size} />
          <line x1={box.x} y1={py(at.y)} x2={box.x + box.size} y2={py(at.y)} />
          <Figure x={px(at.x)} y={py(at.y) + 14} height={30} pose="head" className="tr-scene__taker" />
        </g>
      ) : null}
    </>
  );
}

/* ── One gesture you cannot take back ────────────────────────────────────────
   The run-up crosses the bar; the moment you start the swipe is your timing and
   where you end it is your side. Both come out of the same movement, because a
   keeper does not get to choose those two things separately.

   You are the keeper here, so the camera is tight on the mouth and the figure in
   the goal is you. The timing is the ring closing on the ball: when it touches,
   it has been struck, and if you are still standing up you have not saved it.  */

function DiveGame({ chance, copy, reduced, onSettle }) {
  const field = useRef(null);
  const [run, setRun] = useState(0);
  const [side, setSide] = useState(null);
  const at = useRef(0);
  const gone = useRef(null);
  const done = useRef(false);

  const settle = useCallback(
    (where, when) => {
      if (done.current) return;
      done.current = true;
      onSettle([where, when]);
    },
    [onSettle],
  );

  useEffect(() => {
    if (reduced) return undefined;
    const start = performance.now();
    let raf = 0;
    const step = (now) => {
      const elapsed = (now - start) / 1000 / chance.period;
      if (elapsed >= 1) {
        // The ball has been struck and you are still standing up.
        at.current = 1;
        setRun(1);
        settle(0.5, 1);
        return;
      }
      at.current = elapsed;
      setRun(elapsed);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [reduced, chance.period, settle]);

  const committed = gone.current !== null;
  const where = reduced ? chance.gates[0] : side ?? 0.5;
  const when = reduced ? chance.gates[1] : run;

  return (
    <Surface
      mechanic={chance.mechanic}
      camera={CAMERAS.GOAL}
      prompt={copy.match.chancePrompt[chance.mechanic]}
      hint={copy.match.chanceHint[chance.mechanic]}
      label={copy.match.chancePrompt[chance.mechanic]}
      ref={field}
      onPointerDown={(event) => {
        if (reduced) {
          settle(chance.gates[0], chance.gates[1]);
          return;
        }
        // The instant is taken here and never revised: you have gone.
        if (gone.current === null) gone.current = at.current;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setSide(pointIn(field.current, event).x);
      }}
      onPointerMove={(event) => {
        if (reduced || gone.current === null) return;
        setSide(pointIn(field.current, event).x);
      }}
      onPointerUp={() => {
        if (gone.current === null) return;
        settle(side ?? 0.5, gone.current);
      }}
      onKeyDown={(event) => {
        if (event.key !== " " && event.key !== "Enter") return;
        event.preventDefault();
        settle(chance.gates[0], chance.gates[1]);
      }}
    >
      <TheDive chance={chance} where={where} when={when} committed={committed || reduced} />
    </Surface>
  );
}

/** The mouth, you in it, and the ball about to be struck. */
function TheDive({ chance, where, when, committed }) {
  const [side, moment] = chance.gates;
  const tol = chance.tolerance;
  const bandFrom = mouthX(Math.max(0, side - tol));
  const bandTo = mouthX(Math.min(1, side + tol));
  // The ring closes on the ball and the strike is when it arrives. The band is the window
  // either side of that: gone too early and he has watched you go.
  const ring = 20 * (1 - Math.min(1, when / Math.max(moment, 0.01))) + 4;

  return (
    <>
      <rect
        className="tr-play__band"
        x={bandFrom}
        y={GOAL.top}
        width={Math.max(1, bandTo - bandFrom)}
        height={MOUTH.h}
      />
      {/* You. Standing until you have gone, and then committed, which is the point of the
          whole mechanic - a dive is the one thing you cannot take back. */}
      <Figure
        x={mouthX(where)}
        y={GOAL.bottom}
        height={32}
        pose={committed ? "dive" : "spread"}
        facing={where < 0.5 ? -1 : 1}
        className="tr-scene__keeper"
      />
      <circle className="tr-play__ring" cx="100" cy="86" r={Math.max(4, ring)} />
      <Ball x="100" y="86" r="3.4" />
    </>
  );
}

/* ── Two touches and the beat between them ───────────────────────────────────
   The only chance where WHERE you press is irrelevant. Sell it, then go - and
   what the model reads is the gap.

   Drawn as the man in front of you losing his balance. He leans further the
   longer you wait, and the band is the moment his weight is fully on the wrong
   foot. Wait past it and he has recovered.                                    */

function FeintGame({ chance, copy, reduced, onSettle }) {
  const [beat, setBeat] = useState(0);
  const [running, setRunning] = useState(false);
  const started = useRef(0);
  const done = useRef(false);
  const camera = cameraFor(chance.shotType);

  const settle = useCallback(
    (value) => {
      if (done.current) return;
      done.current = true;
      onSettle(value);
    },
    [onSettle],
  );

  useEffect(() => {
    if (!running || reduced) return undefined;
    let raf = 0;
    const step = (now) => {
      const elapsed = (now - started.current) / 1000 / chance.period;
      if (elapsed >= 1) {
        // You sold it so well that the defender went and came back.
        setBeat(1);
        settle(1);
        return;
      }
      setBeat(elapsed);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, reduced, chance.period, settle]);

  const touch = () => {
    if (reduced) {
      if (!running) setRunning(true);
      else settle(chance.target);
      return;
    }
    if (!running) {
      started.current = performance.now();
      setRunning(true);
      return;
    }
    settle((performance.now() - started.current) / 1000 / chance.period);
  };

  const at = reduced && running ? chance.target : beat;

  return (
    <Surface
      mechanic={chance.mechanic}
      camera={camera}
      prompt={running ? copy.match.chanceGo : copy.match.chancePrompt[chance.mechanic]}
      hint={copy.match.chanceHint[chance.mechanic]}
      label={copy.match.chancePrompt[chance.mechanic]}
      onClick={touch}
    >
      <TheFeint chance={chance} at={at} running={running} />
    </Surface>
  );
}

/** Him, going the wrong way. */
function TheFeint({ chance, at, running }) {
  const tol = chance.tolerance;
  // He leans across the mouth as the beat runs, and the band is where he is beaten.
  const lean = (t) => 0.5 + t * 0.42;
  const bandFrom = mouthX(lean(Math.max(0, chance.target - tol)));
  const bandTo = mouthX(lean(Math.min(1, chance.target + tol)));

  return (
    <>
      <Taker chance={chance} pose={running ? "run" : "stand"} />
      <rect
        className="tr-play__band"
        x={Math.min(bandFrom, bandTo)}
        y={GOAL.top}
        width={Math.max(1, Math.abs(bandTo - bandFrom))}
        height={MOUTH.h}
      />
      <Figure
        x={mouthX(lean(at))}
        y={GOAL.bottom}
        height={32}
        pose={running ? "dive" : "spread"}
        facing={1}
        className="tr-scene__keeper"
      />
    </>
  );
}

const SURFACES = {
  [MECHANICS.SWEEP]: TrackGame,
  [MECHANICS.WINDOW]: TrackGame,
  [MECHANICS.BEND]: TrackGame,
  [MECHANICS.CHARGE]: ChargeGame,
  [MECHANICS.AIM]: AimGame,
  [MECHANICS.DIVE]: DiveGame,
  [MECHANICS.FEINT]: FeintGame,
};

/**
 * The chance, played however this one is played.
 *
 * `onSettle` gets exactly what `judgeChance` expects for this mechanic and nothing more: a
 * number, a pair, or a point. The screen above does not know which it got and does not need
 * to - see `targetsOf` in minigames.js.
 */
export default function ChanceGame({ chance, locale, onSettle }) {
  const copy = getCopy(locale);
  const reduced = usePrefersReducedMotion();
  const Played = SURFACES[chance?.mechanic];
  if (!Played) return null;
  return <Played chance={chance} copy={copy} reduced={reduced} onSettle={onSettle} />;
}
