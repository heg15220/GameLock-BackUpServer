// Topos a Mazazos — sonido sintetizado con WebAudio (sin ficheros externos).
// Cues alegres y cortos: mazazo acertado (pop + tono), topo dorado (arpegio),
// bomba (ruido grave), mazazo al aire (whoosh) y fin de ronda (jingle).

const MUTED_KEY = "gamelock.topos-mazazos.muted";
const MASTER_VOLUME = 0.4;

export function readStoredToposMuted() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function createToposAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let muted = Boolean(initialMuted);

  const applyMute = () => {
    if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
  };

  const ensure = () => {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) {
      ctx = new Ctor();
      master = ctx.createGain();
      applyMute();
      master.connect(ctx.destination);
    }
    return ctx;
  };

  const unlock = () => {
    const c = ensure();
    if (c && c.state === "suspended") c.resume().catch(() => {});
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

  const noise = (when, dur, gain, freq = 900, type = "lowpass") => {
    if (!ctx || !master) return;
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
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
    const c = ensure();
    if (!c || muted) return;
    if (c.state === "suspended") c.resume().catch(() => {});
    build(c.currentTime);
  };

  const persist = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
      } catch {
        /* no persiste */
      }
    }
    applyMute();
    return muted;
  };

  return {
    unlock,
    // Mazazo acertado: pop percusivo + tono corto.
    playHit: () =>
      play((t) => {
        noise(t, 0.05, 0.4, 1600);
        tone(520, t, 0.09, 0.3, "square", 260);
      }),
    // Topo dorado: arpegio ascendente brillante.
    playGold: () =>
      play((t) => {
        noise(t, 0.04, 0.3, 1800);
        tone(660, t, 0.08, 0.26, "triangle");
        tone(880, t + 0.07, 0.08, 0.26, "triangle");
        tone(1180, t + 0.14, 0.14, 0.24, "sine");
      }),
    // Bomba: golpe grave y ruido.
    playBomb: () =>
      play((t) => {
        noise(t, 0.22, 0.5, 320);
        tone(160, t, 0.24, 0.34, "sawtooth", 60);
      }),
    // Mazazo al aire: whoosh corto.
    playSwing: () =>
      play((t) => {
        noise(t, 0.08, 0.18, 700, "bandpass");
      }),
    // Fin de ronda: jingle alegre (victoria) o descendente (derrota).
    playEnd: (won) =>
      play((t) => {
        if (won) {
          tone(523, t, 0.14, 0.26, "triangle");
          tone(659, t + 0.13, 0.14, 0.26, "triangle");
          tone(784, t + 0.26, 0.14, 0.26, "triangle");
          tone(1046, t + 0.39, 0.3, 0.24, "sine");
        } else {
          tone(440, t, 0.2, 0.24, "sawtooth", 300);
          tone(262, t + 0.18, 0.4, 0.22, "sawtooth", 180);
        }
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
    dispose: () => {
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      master = null;
    },
  };
}

export default createToposAudio;
