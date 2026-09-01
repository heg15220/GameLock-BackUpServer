// Shared WebAudio kit for the Wii Party-inspired minis.
//
// None of these games ships a recorded asset: every cue is a short synthesized
// blip, so there is nothing to load and nothing to license. The five games only
// differ in *which* cues they define, so the context handling, the mute
// persistence and the two sound primitives live here and each game passes a map
// of named cues built from them.
//
// Levels were chosen to survive small laptop speakers: nothing important sits
// below ~200 Hz or above roughly -24 dBFS.

const MASTER_VOLUME = 0.4;

/**
 * @param {string} storageKey  localStorage key holding the muted flag
 * @param {(kit: object) => Record<string, (t: number) => void>} defineCues
 *        receives { tone, noise, sweep } and returns the named cues
 * @param {boolean} initialMuted
 */
export function createArcadeAudio(storageKey, defineCues, initialMuted = false) {
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

  // One enveloped oscillator. `endFreq` glides the pitch across the note.
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

  // A filtered noise burst: footsteps, rustles, thuds — anything a tone would
  // turn into a bell.
  const noise = (when, dur, gain, freq = 620, q = 1.1, type = "bandpass") => {
    if (!ctx || !master) return;
    const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
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

  // A short run of notes, for fanfares and stingers.
  const sweep = (freqs, when, step, dur, gain, type = "triangle") => {
    freqs.forEach((f, i) => tone(f, when + i * step, dur, gain, type));
  };

  const play = (build) => {
    const audioContext = ensure();
    if (!audioContext || muted || typeof build !== "function") return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    build(audioContext.currentTime);
  };

  const persist = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, muted ? "1" : "0");
      } catch {
        // Storage can be denied; muting still applies for this session.
      }
    }
    applyMute();
    return muted;
  };

  const cues = defineCues({ tone, noise, sweep }) ?? {};
  const api = {
    unlock,
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

  for (const [name, build] of Object.entries(cues)) {
    api[name] = () => play(build);
  }
  return api;
}

export function readStoredMuted(storageKey) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export default createArcadeAudio;
