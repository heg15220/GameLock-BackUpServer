// Pulso Exacto sound — fully synthesized.
//
// This game has no recorded assets: every cue is a short WebAudio blip. A timing
// game wants sparse, clean feedback (a soft tick for pacing, a bright ping for a
// good stop), and simple oscillator tones deliver that with nothing to load.
// Levels were chosen to survive small laptop speakers: nothing important sits
// below ~500 Hz or under roughly -26 dBFS.

const MUTED_KEY = "pulsoExactoAudioMuted";
const MASTER_VOLUME = 0.42;

export function readStoredPulsoMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTED_KEY) === "1";
}

export function createPulsoExactoAudio(initialMuted = false) {
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

  // A tone is one enveloped oscillator; `steps` chains a few into a small arpeggio.
  const tone = (freq, when, dur, gain, type = "sine") => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
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

  const play = (build) => {
    const audioContext = ensure();
    if (!audioContext || muted) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    build(audioContext.currentTime);
  };

  const persist = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
    }
    applyMute();
    return muted;
  };

  return {
    unlock,
    // Pacing tick during the 2s guide: short, soft, high enough to cut through.
    playTick: () => play((t) => tone(880, t, 0.06, 0.18, "square")),
    // Stop registered.
    playStop: () => play((t) => tone(520, t, 0.09, 0.3, "triangle")),
    // Bang on the target.
    playPerfect: () =>
      play((t) => {
        tone(784, t, 0.12, 0.32, "triangle");
        tone(1175, t + 0.09, 0.16, 0.3, "triangle");
        tone(1568, t + 0.19, 0.22, 0.26, "sine");
      }),
    // Scored, but not perfect.
    playGood: () =>
      play((t) => {
        tone(587, t, 0.1, 0.28, "triangle");
        tone(880, t + 0.09, 0.14, 0.24, "sine");
      }),
    // Missed the scoring window.
    playMiss: () =>
      play((t) => {
        tone(330, t, 0.14, 0.26, "sawtooth");
        tone(247, t + 0.11, 0.2, 0.22, "sawtooth");
      }),
    // End-of-game flourish.
    playFinish: () =>
      play((t) => {
        tone(523, t, 0.12, 0.28, "triangle");
        tone(659, t + 0.11, 0.12, 0.28, "triangle");
        tone(784, t + 0.22, 0.12, 0.28, "triangle");
        tone(1047, t + 0.33, 0.26, 0.26, "sine");
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

export default createPulsoExactoAudio;
