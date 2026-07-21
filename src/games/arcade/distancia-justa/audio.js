// Distancia Justa sound — fully synthesized WebAudio cues, no assets to load.
// Sparse and bright so the feedback survives small laptop speakers.

const MUTED_KEY = "distanciaJustaAudioMuted";
const MASTER_VOLUME = 0.4;

export function readStoredDistanciaMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTED_KEY) === "1";
}

export function createDistanciaJustaAudio(initialMuted = false) {
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
    if (audioContext && audioContext.state === "suspended") audioContext.resume().catch(() => {});
  };

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
    if (typeof window !== "undefined") window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
    applyMute();
    return muted;
  };

  return {
    unlock,
    playAnnounce: () =>
      play((t) => {
        tone(523, t, 0.12, 0.28, "triangle");
        tone(784, t + 0.12, 0.18, 0.28, "triangle");
      }),
    playConfirm: () => play((t) => tone(660, t, 0.09, 0.3, "square")),
    playRoundWin: () =>
      play((t) => {
        tone(659, t, 0.1, 0.28, "triangle");
        tone(988, t + 0.1, 0.18, 0.28, "sine");
      }),
    playRoundEnd: () => play((t) => tone(392, t, 0.14, 0.24, "triangle")),
    playMatchWin: () =>
      play((t) => {
        tone(523, t, 0.12, 0.28, "triangle");
        tone(659, t + 0.11, 0.12, 0.28, "triangle");
        tone(784, t + 0.22, 0.12, 0.28, "triangle");
        tone(1047, t + 0.33, 0.28, 0.26, "sine");
      }),
    playMatchEnd: () =>
      play((t) => {
        tone(440, t, 0.16, 0.24, "triangle");
        tone(330, t + 0.14, 0.22, 0.22, "sawtooth");
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

export default createDistanciaJustaAudio;
