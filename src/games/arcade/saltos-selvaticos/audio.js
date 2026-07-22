// Saltos Selváticos sound — fully synthesized WebAudio cues, no assets to load.
// Woody and tropical: the pump is a hollow bongo whose pitch rises with how
// well it was timed, so the swing rhythm is audible as well as visible.

const MUTED_KEY = "saltosSelvaticosAudioMuted";
const MASTER_VOLUME = 0.4;

export function readStoredSaltosMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTED_KEY) === "1";
}

export function createSaltosSelvaticosAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
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

  const tone = (freq, when, dur, gain, type = "sine", endFreq = null) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, when + dur);
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

  // Short filtered noise burst — leaves rustling, a landing thud.
  const noise = (when, dur, gain, freq, q = 1) => {
    if (!ctx || !master) return;
    if (!noiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(freq, when);
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(gain, when + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(when);
    src.stop(when + dur + 0.02);
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
    if (typeof window !== "undefined") window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
    applyMute();
    return muted;
  };

  return {
    unlock,
    playReady: () =>
      play((t) => {
        tone(392, t, 0.14, 0.24, "triangle");
        noise(t + 0.05, 0.22, 0.1, 2600, 0.8);
      }),
    playGo: () =>
      play((t) => {
        tone(523, t, 0.1, 0.26, "triangle");
        tone(784, t + 0.1, 0.16, 0.26, "triangle");
      }),
    // Timing quality (-0.7…1) tunes the bongo: crisp and high when it lands on
    // the bottom of the arc, dull and low when it fights the swing.
    playPump: (quality = 1) => {
      const q = Math.max(-0.7, Math.min(1, Number(quality) || 0));
      play((t) => {
        const base = 150 + q * 130;
        tone(base, t, 0.09 + q * 0.04, 0.22 + q * 0.1, "sine", Math.max(60, base * 0.55));
        noise(t, 0.05, q > 0.35 ? 0.14 : 0.05, q > 0.35 ? 3200 : 900, 1.2);
      });
    },
    playJump: () =>
      play((t) => {
        tone(330, t, 0.22, 0.26, "triangle", 880);
        noise(t, 0.18, 0.1, 2200, 0.7);
      }),
    // The vine going slack: a snapping creak, then the drop.
    playSlack: () =>
      play((t) => {
        noise(t, 0.1, 0.2, 1400, 3);
        tone(240, t, 0.3, 0.24, "sawtooth", 70);
      }),
    playLand: () =>
      play((t) => {
        tone(110, t, 0.16, 0.3, "sine", 55);
        noise(t, 0.16, 0.16, 480, 0.6);
      }),
    playRoundWin: () =>
      play((t) => {
        tone(659, t, 0.1, 0.26, "triangle");
        tone(988, t + 0.1, 0.2, 0.26, "sine");
      }),
    playRoundEnd: () => play((t) => tone(392, t, 0.16, 0.22, "triangle")),
    playMatchWin: () =>
      play((t) => {
        tone(523, t, 0.12, 0.26, "triangle");
        tone(659, t + 0.11, 0.12, 0.26, "triangle");
        tone(784, t + 0.22, 0.12, 0.26, "triangle");
        tone(1047, t + 0.33, 0.3, 0.24, "sine");
      }),
    playMatchEnd: () =>
      play((t) => {
        tone(440, t, 0.16, 0.22, "triangle");
        tone(330, t + 0.14, 0.24, 0.2, "sawtooth");
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
      noiseBuffer = null;
    },
  };
}

export default createSaltosSelvaticosAudio;
