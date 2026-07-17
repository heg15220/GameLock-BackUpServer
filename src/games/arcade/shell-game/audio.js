// Trilero / Shell Game sound.
//
// Hybrid on purpose. The result cues are samples — Kenney "Interface Sounds"
// (CC0, see public/legal/audio-licenses.txt) — because a win/lose sting wants a
// recorded, designed sound. The shuffle swish is synthesized, because there is no
// good CC0 sample of "a cup sliding across a table" and a noise burst under a
// sweeping bandpass is exactly what synthesis does well: it can take the real
// duration of the cross it belongs to, which no fixed sample could.
//
// Levels here were measured, not guessed. An earlier synth cue in this repo shipped
// at -44 dBFS — audible in theory, silent on a laptop. Anything below roughly
// -30 dBFS with no energy above ~1 kHz does not survive small speakers.

import winUrl from "./assets/sounds/win.mp3";
import loseUrl from "./assets/sounds/lose.mp3";

const SHELL_AUDIO_MUTED_KEY = "shellGameAudioMuted";

const MASTER_VOLUME = 0.5;

const SAMPLES = {
  win: { url: winUrl, gain: 0.85 },
  lose: { url: loseUrl, gain: 0.9 },
};

// A round at high level fires several crosses close together, and a DOUBLE is two
// at the exact same timestamp by construction. Cap the simultaneous swishes so a
// double reads as one fatter move instead of two flanged copies of itself.
const MAX_SWISH_VOICES = 2;

export function readStoredShellMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SHELL_AUDIO_MUTED_KEY) === "1";
}

export function createShellGameAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let limiter = null;
  let unlocked = false;
  let lastEvent = null;
  let eventCount = 0;
  let muted = Boolean(initialMuted);
  let loading = null;
  let swishesThisTick = 0;
  const buffers = new Map();

  const applyMuteState = () => {
    if (master) {
      master.gain.value = muted ? 0 : MASTER_VOLUME;
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
      // Swishes overlap with each other and with a result sting. Limit rather
      // than mixing everything quiet enough that a pile-up can never clip.
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;
      master.connect(limiter);
      limiter.connect(ctx.destination);
    }
    return ctx;
  };

  const preload = () => {
    const audioContext = ensure();
    if (!audioContext) return Promise.resolve();
    if (loading) return loading;

    loading = Promise.all(
      Object.entries(SAMPLES).map(async ([name, { url }]) => {
        try {
          const res = await fetch(url);
          const raw = await res.arrayBuffer();
          buffers.set(name, await audioContext.decodeAudioData(raw));
        } catch {
          // A cue that fails to load simply stays silent — sound is never worth
          // taking the game down for.
        }
      }),
    ).then(() => undefined);

    return loading;
  };

  const unlock = () => {
    const audioContext = ensure();
    if (!audioContext) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    unlocked = true;
    preload();
  };

  const record = (name, detail = {}) => {
    lastEvent = { name, ...detail, at: Date.now() };
    eventCount += 1;
  };

  // The cup sliding: a band of noise whose centre sweeps up and back down, so it
  // reads as a move that departs and arrives rather than a flat hiss. Kept in the
  // 700-2600 Hz band, which is where small speakers actually live.
  const renderSwish = (time, duration, strength) => {
    if (!ctx || !master) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      // Bell-shaped envelope: silent at both ends, loudest mid-slide.
      const p = i / length;
      const env = Math.sin(Math.PI * p) ** 1.5;
      data[i] = (Math.random() * 2 - 1) * env;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.4;
    band.frequency.setValueAtTime(700, time);
    band.frequency.linearRampToValueAtTime(2600, time + duration * 0.5);
    band.frequency.linearRampToValueAtTime(900, time + duration);

    const gain = ctx.createGain();
    gain.gain.value = 0.16 * strength;

    source.connect(band);
    band.connect(gain);
    gain.connect(master);
    source.start(time);
    source.stop(time + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      band.disconnect();
      gain.disconnect();
    };
  };

  // `swap` is a cross straight out of the choreography plan: it already carries
  // the duration and move type, so the cue matches the animation it belongs to.
  const playSwish = (swap = {}) => {
    const duration = Math.min(1.2, Math.max(0.12, Number(swap.duration) || 0.5));
    record("swish", { type: swap.type || "slide", double: Boolean(swap.double) });

    const audioContext = ensure();
    if (!audioContext || !master || muted) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    if (swishesThisTick >= MAX_SWISH_VOICES) return;
    swishesThisTick += 1;

    // A double is two crosses at the same timestamp; halving each keeps the pair
    // at roughly the level of a single move.
    renderSwish(audioContext.currentTime + 0.01, duration, swap.double ? 0.65 : 1);
  };

  // Called once per engine tick, after the crosses starting this tick have fired.
  const endTick = () => {
    swishesThisTick = 0;
  };

  const playSample = (name) => {
    record(name);
    const cue = SAMPLES[name];
    if (!cue) return;

    const audioContext = ensure();
    if (!audioContext || !master || muted) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const buffer = buffers.get(name);
    if (!buffer) {
      preload();
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gain = audioContext.createGain();
    gain.gain.value = cue.gain;
    source.connect(gain);
    gain.connect(master);
    source.start();
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  };

  const persistMuted = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SHELL_AUDIO_MUTED_KEY, muted ? "1" : "0");
    }
    applyMuteState();
    return muted;
  };

  return {
    unlock,
    preload,
    playSwish,
    endTick,
    playWin: () => playSample("win"),
    playLose: () => playSample("lose"),
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
      loaded: buffers.size,
    }),
    dispose: () => {
      if (ctx) {
        ctx.close().catch(() => {});
      }
      ctx = null;
      master = null;
      limiter = null;
      loading = null;
      buffers.clear();
    },
  };
}

export default createShellGameAudio;
