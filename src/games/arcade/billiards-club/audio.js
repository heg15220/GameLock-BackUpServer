// Billiards sound, synthesized rather than sampled so there are no assets to ship
// or license. Same factory shape as createHeadSoccerAudio in HeadSoccerGame.jsx:
// a lazy context, a master gain the mute toggle rides on, and tone/noise
// primitives the cue map draws from.
//
// Two cues:
//   cueStrike(power) - leather tip on phenolic. Dull and woody; the tip is soft,
//                      so this is deliberately darker than a ball-ball contact.
//   ballHit(speed)   - the bright phenolic "clac", scaled by impact speed so a
//                      soft kiss and a hard break are audibly different shots.
//
// Ball-ball impacts need rate control. A break produces dozens of contacts across
// a handful of frames, and firing every one gives a smeared wall of clicks and a
// voice pile-up. updatePhysics resolves all collisions in a single synchronous
// pass per frame, so instead of throttling on wall-clock time we accumulate the
// frame's impacts and flush once: the loudest few survive, staggered by a few ms
// so they read as distinct contacts rather than phase-cancelling into one click.

const BILLIARDS_AUDIO_MUTED_KEY = "billiardsAudioMuted";

const MASTER_GAIN = 0.2;

// Cue-ball speed at a full-power break, from the lerp ceiling in startShot. Used
// to normalize impact speeds into a 0..1 loudness.
const REFERENCE_SPEED = 1700;

// Below this (px/s) a contact is a nudge nobody would hear on a real table.
const MIN_AUDIBLE_SPEED = 30;

// Per-frame ceiling on ball-ball voices. Three reads as a busy cluster; more just
// muddies into noise.
const MAX_BALL_HITS_PER_FRAME = 3;

// Stagger between clustered impacts, seconds.
const HIT_STAGGER = 0.011;

export function readStoredBilliardsMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(BILLIARDS_AUDIO_MUTED_KEY) === "1";
}

export function createBilliardsAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let unlocked = false;
  let lastEvent = null;
  let eventCount = 0;
  let muted = Boolean(initialMuted);
  let pendingHits = [];

  const applyMuteState = () => {
    if (master) {
      master.gain.value = muted ? 0 : MASTER_GAIN;
    }
  };

  // Built on first gesture, never at import: SSR and the vitest node env have no
  // window, and returning null there makes every cue a no-op instead of a throw.
  const ensure = () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!ctx) {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      applyMuteState();
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const unlock = () => {
    const audioContext = ensure();
    if (!audioContext) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    unlocked = true;
  };

  const tone = (time, frequency, duration, options = {}) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = options.type || "sine";
    osc.frequency.setValueAtTime(frequency, time);
    if (options.to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), time + duration);
    }
    filter.type = options.filterType || "lowpass";
    filter.frequency.setValueAtTime(options.filter || 4000, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, options.gain || 0.06), time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + duration + 0.03);
  };

  const noise = (time, duration, options = {}) => {
    if (!ctx || !master) return;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      // Decaying envelope baked into the buffer keeps the burst transient-shaped.
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = options.filterType || "bandpass";
    filter.frequency.value = options.filter || 3000;
    filter.Q.value = options.q || 1;
    gain.gain.setValueAtTime(options.gain || 0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(time);
    source.stop(time + duration + 0.02);
  };

  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  const renderCueStrike = (time, power) => {
    const strength = clamp01(power);
    // Soft leather tip: darker and rounder than phenolic-on-phenolic.
    noise(time, 0.02, { gain: 0.05 + strength * 0.07, filter: 2000 + strength * 900, q: 1.5 });
    tone(time, 380 + strength * 130, 0.055, {
      type: "triangle",
      gain: 0.05 + strength * 0.06,
      to: 240,
      filter: 2200,
    });
    // Low body of the stroke, only really present on harder shots.
    tone(time, 150, 0.075, { type: "sine", gain: 0.02 + strength * 0.05, to: 95, filter: 600 });
  };

  const renderBallHit = (time, strength) => {
    // Bright, hard phenolic click. Harder contacts ring slightly higher.
    noise(time, 0.014, { gain: 0.04 + strength * 0.1, filter: 3200 + strength * 1400, q: 2.2 });
    tone(time, 1250 + strength * 620, 0.035, {
      type: "triangle",
      gain: 0.03 + strength * 0.075,
      to: 780,
      filter: 6000,
    });
  };

  const record = (name, detail) => {
    lastEvent = { name, ...detail, at: Date.now() };
    eventCount += 1;
  };

  const playCueStrike = (power = 1) => {
    const audioContext = ensure();
    // Recorded even when muted or context-less so tests and the QA bridge can
    // assert which cue fired without needing Web Audio.
    record("cueStrike", { power: Math.round(clamp01(power) * 100) / 100 });
    if (!audioContext || !master || muted) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    renderCueStrike(audioContext.currentTime + 0.01, power);
  };

  // Collected during the physics pass, not played yet — see flushBallHits.
  const queueBallHit = (speed) => {
    if (!(speed > MIN_AUDIBLE_SPEED)) return;
    pendingHits.push(speed);
  };

  const flushBallHits = () => {
    if (!pendingHits.length) return;
    const hits = pendingHits;
    pendingHits = [];

    // Loudest first, so the cap drops the nudges rather than whatever the
    // collision loop happened to resolve last.
    hits.sort((a, b) => b - a);
    const audible = hits.slice(0, MAX_BALL_HITS_PER_FRAME);

    record("ballHit", { speed: Math.round(audible[0]), impacts: hits.length });

    const audioContext = ensure();
    if (!audioContext || !master || muted) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    const now = audioContext.currentTime + 0.01;
    audible.forEach((speed, index) => {
      renderBallHit(now + index * HIT_STAGGER, clamp01(speed / REFERENCE_SPEED));
    });
  };

  const persistMuted = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BILLIARDS_AUDIO_MUTED_KEY, muted ? "1" : "0");
    }
    applyMuteState();
    return muted;
  };

  return {
    unlock,
    playCueStrike,
    queueBallHit,
    flushBallHits,
    setMuted: (nextMuted) => {
      muted = Boolean(nextMuted);
      return persistMuted();
    },
    toggleMuted: () => {
      muted = !muted;
      return persistMuted();
    },
    snapshot: () => ({
      unlocked,
      available: Boolean(ctx),
      contextState: ctx?.state || "idle",
      muted,
      lastEvent,
      eventCount,
    }),
    dispose: () => {
      if (ctx) {
        ctx.close().catch(() => {});
      }
      ctx = null;
      master = null;
      pendingHits = [];
    },
  };
}

export default createBilliardsAudio;
