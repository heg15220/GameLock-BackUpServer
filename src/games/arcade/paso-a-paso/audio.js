// Paso a Paso sound — fully synthesized WebAudio, no assets to load.
//
// The round has a shape the ear can follow on its own: a countdown tick that
// only starts in the last five seconds, a bright chime when the numbers flip, a
// dull buzz when yours clashed, and footsteps while the climbers move. Nothing
// important sits below ~380 Hz or above roughly -24 dBFS, so it survives laptop
// speakers without anything mastered.

const MUTED_KEY = "pasoAPasoAudioMuted";
const MASTER_VOLUME = 0.4;

export function readStoredPasoMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTED_KEY) === "1";
}

export function createPasoAPasoAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let muted = Boolean(initialMuted);

  const applyMute = () => {
    if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
  };

  const ensure = () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!ctx) {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      applyMute();
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const unlock = () => {
    const audioContext = ensure();
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
  };

  const tone = (freq, when, dur, gain, type = "sine", endFreq = null) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (endFreq != null) osc.frequency.exponentialRampToValueAtTime(endFreq, when + dur);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(gain, when + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(env);
    env.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
  };

  // A footstep is a short filtered noise burst — a tone would sound like a bell.
  const step = (when, gain) => {
    if (!ctx || !master) return;
    const frames = Math.floor(ctx.sampleRate * 0.06);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 620;
    filter.Q.value = 1.1;
    const env = ctx.createGain();
    env.gain.value = gain;
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(when);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      env.disconnect();
    };
  };

  const play = (build) => {
    const audioContext = ensure();
    if (!audioContext || muted) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    build(audioContext.currentTime);
  };

  const persist = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
      } catch {
        // Storage can be denied; muting still applies for this session.
      }
    }
    applyMute();
    return muted;
  };

  return {
    unlock,
    // Countdown, last five seconds only.
    playTick: () => play((t) => tone(920, t, 0.055, 0.16, "square")),
    // Your number changed.
    playSelect: () => play((t) => tone(660, t, 0.07, 0.24, "triangle")),
    // Cards flip and your number was yours alone.
    playReveal: () =>
      play((t) => {
        tone(659, t, 0.1, 0.26, "triangle");
        tone(988, t + 0.08, 0.16, 0.24, "sine");
      }),
    // Somebody took the same number.
    playClash: () =>
      play((t) => {
        tone(196, t, 0.16, 0.26, "sawtooth", 140);
        tone(233, t + 0.04, 0.16, 0.2, "square", 165);
      }),
    // The clock ran out with nothing chosen.
    playMiss: () => play((t) => tone(300, t, 0.22, 0.2, "sawtooth", 200)),
    // Climbers walking up their steps.
    playClimb: () =>
      play((t) => {
        for (let i = 0; i < 5; i += 1) step(t + i * 0.12, 0.3 - i * 0.03);
        tone(523, t + 0.05, 0.09, 0.16, "sine");
        tone(784, t + 0.34, 0.12, 0.16, "sine");
      }),
    playWin: () =>
      play((t) => {
        tone(523, t, 0.13, 0.28, "triangle");
        tone(659, t + 0.12, 0.13, 0.28, "triangle");
        tone(784, t + 0.24, 0.13, 0.28, "triangle");
        tone(1047, t + 0.36, 0.3, 0.26, "sine");
      }),
    playLose: () =>
      play((t) => {
        tone(440, t, 0.16, 0.24, "triangle");
        tone(370, t + 0.15, 0.16, 0.22, "triangle");
        tone(294, t + 0.3, 0.3, 0.2, "sine");
      }),
    isMuted: () => muted,
    setMuted: (next) => {
      muted = Boolean(next);
      return persist();
    },
    toggleMuted: () => {
      muted = !muted;
      return persist();
    },
    snapshot: () => ({ muted, available: Boolean(ctx) }),
    dispose: () => {
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      master = null;
    },
  };
}

export default createPasoAPasoAudio;
