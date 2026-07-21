// Brilé sound — fully synthesized WebAudio cues, no assets to load. Punchy and
// short so throws, catches and hits read clearly over a chaotic 6v6 court.

const MUTED_KEY = "brileAudioMuted";
const MASTER_VOLUME = 0.4;

export function readStoredBrileMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(MUTED_KEY) === "1";
}

export function createBrileAudio(initialMuted = false) {
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

  const tone = (freq, when, dur, gain, type = "sine", glideTo = null) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), when + dur);
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

  // A short burst of filtered noise — the slap of a ball on a body or a catch.
  const noise = (when, dur, gain, freq = 1200) => {
    if (!ctx || !master) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, when);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, when);
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
    // Kick-off: a bright referee whistle.
    playWhistle: () =>
      play((t) => {
        tone(1760, t, 0.16, 0.2, "square", 2200);
        tone(2100, t + 0.05, 0.12, 0.14, "sine");
      }),
    // A throw: a quick airy "whoosh".
    playThrow: () =>
      play((t) => {
        tone(520, t, 0.1, 0.16, "triangle", 900);
        noise(t, 0.06, 0.14, 2400);
      }),
    // A hit lands: a firm rubbery slap.
    playHit: () =>
      play((t) => {
        noise(t, 0.12, 0.5, 1000);
        tone(150, t, 0.14, 0.22, "sawtooth", 80);
      }),
    // A catch: a satisfying snap plus a little rising "saved!" ping.
    playCatch: () =>
      play((t) => {
        noise(t, 0.05, 0.4, 2600);
        tone(440, t + 0.02, 0.12, 0.2, "triangle");
        tone(660, t + 0.1, 0.16, 0.18, "sine");
      }),
    // Your team wins: a small triumphant arpeggio.
    playWin: () =>
      play((t) => {
        tone(392, t, 0.14, 0.26, "triangle");
        tone(523, t + 0.13, 0.14, 0.26, "triangle");
        tone(659, t + 0.26, 0.14, 0.26, "triangle");
        tone(784, t + 0.39, 0.3, 0.24, "sine");
      }),
    // Your team falls: a somber two-note drop.
    playLose: () =>
      play((t) => {
        tone(330, t, 0.2, 0.24, "sawtooth", 220);
        tone(196, t + 0.16, 0.4, 0.22, "sawtooth", 130);
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

export default createBrileAudio;
