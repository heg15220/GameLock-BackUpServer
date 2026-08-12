/**
 * The seven ways a chance gets played.
 *
 * `minigames.js` is the model - where the target is, how wide, how fast - and has no React
 * in it. This is the other half: one surface per mechanic, each one a different verb in the
 * hand, all of them ending in the same call. Nothing here decides anything. Every surface
 * hands `onSettle` what the player committed, in the 0..1 units the judge already speaks,
 * and `judgeChance` is the only thing that says whether it went in.
 *
 * THREE RULES, and they are why this is its own file rather than seven branches:
 *
 *  1. ONE VERB EACH. A sweep is a tap, a charge is a hold, an aim is a drag. If two of them
 *     needed the same explanation they would be the same game with different paint, which
 *     is exactly what the roster used to be.
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
 */
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";

import { MECHANICS, spotAt } from "./minigames.js";
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

/**
 * The furniture every chance shares: what you are being asked, the surface itself, and the
 * one line that says which verb this is. The prompt and the hint are the only places the
 * games differ in words, so a player who has met this one before can skip them and the one
 * who has not is never left guessing what to do with his thumb.
 */
const Surface = forwardRef(function Surface({ mechanic, prompt, hint, label, children, ...rest }, ref) {
  return (
    <div className="tr-chance">
      <p className="tr-chance__prompt">{prompt}</p>
      <button
        type="button"
        ref={ref}
        className={`tr-chance__track is-${mechanic}`}
        aria-label={label}
        {...rest}
      >
        {children}
      </button>
      <p className="tr-chance__hint">{hint}</p>
    </div>
  );
});

/** The band a call has to land in, as the two custom properties the CSS reads. */
const bandAt = (centre, tolerance) => ({
  "--from": `${Math.max(0, centre - tolerance) * 100}%`,
  "--size": `${tolerance * 200}%`,
});

/* ── One touch, and two of them ──────────────────────────────────────────────
   Sweep, window and bend all run a marker along a line and stop it. Bend is the
   two-gate case of the same act, which is why it is not a fourth surface: the
   second call is the same call again, and the first one stays on screen as the
   argument for the second.                                                    */

function TrackGame({ chance, copy, reduced, onSettle }) {
  const [position, setPosition] = useState(0);
  const [gate, setGate] = useState(0);
  const [locked, setLocked] = useState([]);
  const frame = useRef({ start: 0 });

  const gates = chance.gates ?? [chance.target];
  const closing = chance.mechanic === MECHANICS.WINDOW;

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

  return (
    <Surface
      mechanic={chance.mechanic}
      prompt={
        gates.length > 1
          ? fillTemplate(copy.match.chanceGate, { n: gate + 1, total: gates.length })
          : copy.match.chancePrompt[chance.mechanic]
      }
      hint={copy.match.chanceHint[chance.mechanic]}
      label={copy.match.chancePrompt[chance.mechanic]}
      onClick={() => settle(at)}
    >
      {/* The target is drawn: this is a test of timing, never of guessing where. */}
      <span className="tr-chance__target" style={bandAt(gates[gate], chance.tolerance)} />
      <span className="tr-chance__marker" style={{ "--at": `${at * 100}%` }} />
      {locked.map((value, i) => (
        <span key={i} className="tr-chance__locked" style={{ "--at": `${value * 100}%` }} />
      ))}
    </Surface>
  );
}

/* ── Hold and release ────────────────────────────────────────────────────────
   The bar climbs while you hold it and it does not come back. That is the whole
   difference from a sweep: a sweep forgives you by coming round again, and this
   asks you to let go of something while it is still moving.                   */

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

  return (
    <Surface
      mechanic={chance.mechanic}
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
      <span className="tr-chance__target" style={bandAt(chance.target, chance.tolerance)} />
      <span
        className={`tr-chance__fill${holding ? " is-live" : ""}`}
        style={{ "--at": `${(reduced ? chance.target : value) * 100}%` }}
      />
    </Surface>
  );
}

/* ── Drag and release, on something that is moving ───────────────────────────
   The only chance with two dimensions. The disc is the run being made or the
   cross coming across, and it goes once: you are not placing a ball on a static
   dot, you are trying to be where it ends up. That is the whole of this game,
   and it is why the field is SQUARE - the judge measures a circle in 0..1 on
   both axes, so on a wide box the drawn ring would be a lie about where the
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
      <span
        className="tr-chance__spot"
        style={{
          "--x": `${spot.x * 100}%`,
          "--y": `${spot.y * 100}%`,
          "--r": `${chance.tolerance * 100}%`,
        }}
      />
      {at ? (
        <span
          className="tr-chance__reticle"
          style={{ "--x": `${at.x * 100}%`, "--y": `${at.y * 100}%` }}
        />
      ) : null}
    </Surface>
  );
}

/* ── One gesture you cannot take back ────────────────────────────────────────
   The run-up crosses the bar; the moment you start the swipe is your timing and
   where you end it is your side. Both come out of the same movement, because a
   keeper does not get to choose those two things separately.                  */

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

  return (
    <Surface
      mechanic={chance.mechanic}
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
      <span className="tr-chance__target" style={bandAt(chance.gates[0], chance.tolerance)} />
      {/* The run-up, across the top: the second thing being judged, drawn as plainly as the
          first so the player can see both of the calls he is making. */}
      <span
        className="tr-chance__run"
        style={{
          ...bandAt(chance.gates[1], chance.tolerance),
          "--at": `${(reduced ? chance.gates[1] : run) * 100}%`,
        }}
      />
      <span
        className={`tr-chance__keeper${gone.current !== null ? " is-gone" : ""}`}
        style={{ "--at": `${(reduced ? chance.gates[0] : side ?? 0.5) * 100}%` }}
      />
    </Surface>
  );
}

/* ── Two touches and the beat between them ───────────────────────────────────
   The only chance where WHERE you press is irrelevant. Sell it, then go - and
   what the model reads is the gap.                                            */

function FeintGame({ chance, copy, reduced, onSettle }) {
  const [beat, setBeat] = useState(0);
  const [running, setRunning] = useState(false);
  const started = useRef(0);
  const done = useRef(false);

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

  return (
    <Surface
      mechanic={chance.mechanic}
      prompt={running ? copy.match.chanceGo : copy.match.chancePrompt[chance.mechanic]}
      hint={copy.match.chanceHint[chance.mechanic]}
      label={copy.match.chancePrompt[chance.mechanic]}
      onClick={touch}
    >
      <span className="tr-chance__target" style={bandAt(chance.target, chance.tolerance)} />
      <span
        className={`tr-chance__beat${running ? " is-live" : ""}`}
        style={{ "--at": `${(reduced && running ? chance.target : beat) * 100}%` }}
      />
    </Surface>
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
