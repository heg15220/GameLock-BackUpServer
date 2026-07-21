// Terror Zombi sound — hybrid on purpose.
//
// The character moments are samples: a zombie is a recorded throat, and no
// oscillator stack sounds like one. They are CC0 recordings from BigSoundBank
// (see public/legal/audio-licenses.txt), re-encoded to mono and loudness
// normalised, ~1.2 MB for the lot.
//
// The victory sting stays synthesized: there is no CC0 recording of "you
// outlasted the horde", and an arpeggio is exactly what synthesis is good at.
// Every synth cue also stays in place as the fallback for its sample, so the
// game is fully audible from the first frame — samples decode in the
// background after the first gesture and simply take over when ready. Sound is
// never allowed to block or break gameplay.
//
// Levels: samples were normalised at encode time (cues -16 LUFS, bed -26
// LUFS), so the gains below are trims, not rescues. Anything below roughly
// -30 dBFS with no energy above ~1 kHz does not survive laptop speakers.
//
// Durations are the game's, not the file's. Every asset was cut to a single
// gesture (one hoot, one snarl, one swell) after measuring where the energy
// actually sits — the source recordings run 12-24 s of continuous material,
// which as a game cue is a drone. On top of that, CUE_MS caps playback to the
// beat the sound belongs to and releases it with a short fade, so a cue can
// never outlive the moment that triggered it even if the asset is swapped
// later. The clearest case: the grave lid finishes grinding exactly when the
// start grace ends and the horde is allowed to infect.

import biteUrl from "./assets/sounds/zombie-bite.mp3";
import snarlUrl from "./assets/sounds/zombie-snarl.mp3";
import infectUrl from "./assets/sounds/zombie-infect.mp3";
import roarUrl from "./assets/sounds/zombie-roar.mp3";
import groanUrl from "./assets/sounds/zombie-groan.mp3";
import hordeUrl from "./assets/sounds/zombie-horde.mp3";
import tombstoneUrl from "./assets/sounds/tombstone-open.mp3";
import owlBarnUrl from "./assets/sounds/owl-barn.mp3";
import owlTawnyUrl from "./assets/sounds/owl-tawny.mp3";
import bedUrl from "./assets/sounds/graveyard-night-bed.mp3";
import { START_GRACE_MS } from "./runtime.js";

const MUTED_KEY = "terrorZombiAudioMuted";
const MASTER_VOLUME = 0.38;

const SAMPLES = {
  bite: { url: biteUrl, gain: 0.95 },
  snarl: { url: snarlUrl, gain: 0.8 },
  infect: { url: infectUrl, gain: 1 },
  roar: { url: roarUrl, gain: 0.95 },
  groan: { url: groanUrl, gain: 0.45 },
  horde: { url: hordeUrl, gain: 0.34 },
  tombstone: { url: tombstoneUrl, gain: 0.7 },
  owlBarn: { url: owlBarnUrl, gain: 0.4 },
  owlTawny: { url: owlTawnyUrl, gain: 0.45 },
  bed: { url: bedUrl, gain: 1 },
};

// How long each cue is allowed to sound, measured by its beat in the round.
// The assets are already cut to roughly these lengths; this is the ceiling that
// keeps them honest and gives every cue a clean release instead of a hard stop.
export const CUE_MS = {
  // The lid stops grinding the instant infections become possible.
  tombstone: START_GRACE_MS,
  // A catch is punctuation: several can land in the same tick.
  bite: 700,
  snarl: 900,
  // You turning is the round's big personal beat, so it gets room — but the
  // "infected" banner is a state, not a noise: it must not drone under play.
  infect: 1600,
  // The result panel is already up; the roar lands and gets out of the way.
  roar: 2200,
  // Ambience detail: one gesture, always shorter than the gap that follows it.
  groan: 3000,
  horde: 4000,
  owlTawny: 2200,
  owlBarn: 2200,
};
const CUE_RELEASE = 0.12;

const BED_GAIN = 0.5;
// The bed is an excerpt, not a seam-checked loop, so it is not looped on the
// node. Two copies run offset by this much and crossfade into each other, which
// hides the seam regardless of where the excerpt happens to start and end.
const BED_XFADE = 3;
// Several rivals can be caught in the same tick; cap the stacked throats so a
// pile-up reads as one nasty moment instead of a flanged chorus of itself.
const MAX_BITE_VOICES = 3;
// Idle graveyard detail: an owl or a distant groan every so often.
export const DETAIL_MIN_MS = 5200;
const DETAIL_MAX_MS = 12000;
export const DETAILS = ["owlTawny", "owlBarn", "groan", "horde"];

export function readStoredTerrorZombiMuted() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

export function createTerrorZombiAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let bedBus = null;
  let muted = Boolean(initialMuted);
  let loading = null;
  let biteVoices = 0;
  let bedTimer = null;
  let detailTimer = null;
  let bedRunning = false;
  const buffers = new Map();

  const applyMute = () => {
    if (master) master.gain.value = muted ? 0 : MASTER_VOLUME;
  };

  // Built on first gesture, never at import: SSR and the vitest node env have no
  // window, and returning null there makes every cue a no-op instead of a throw.
  const ensure = () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!ctx) {
      try {
        ctx = new AudioContextClass();
      } catch {
        // The browser can refuse (Chrome caps contexts per page). Staying null
        // makes the whole module silent instead of taking the round down.
        ctx = null;
        return null;
      }
      master = ctx.createGain();
      applyMute();
      master.connect(ctx.destination);
      bedBus = ctx.createGain();
      bedBus.gain.value = BED_GAIN;
      bedBus.connect(master);
    }
    return ctx;
  };

  // Decoded in the background; until a buffer lands its cue falls back to synth.
  const loadSamples = () => {
    if (loading || !ctx) return loading;
    loading = Promise.all(
      Object.entries(SAMPLES).map(async ([name, def]) => {
        try {
          const res = await fetch(def.url);
          const bytes = await res.arrayBuffer();
          buffers.set(name, await ctx.decodeAudioData(bytes));
        } catch {
          /* se queda en síntesis */
        }
      }),
    );
    return loading;
  };

  const unlock = () => {
    const audioContext = ensure();
    if (!audioContext) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    loadSamples();
  };

  const tone = (freq, when, dur, gain, type = "sine", glideTo = null) => {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), when + dur);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(gain, when + 0.01);
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

  // A short burst of filtered noise — the wet "thud" of a bite.
  const noise = (when, dur, gain, freq = 900) => {
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

  // Fires a decoded sample, capped to its beat. Returns how many milliseconds it
  // will actually sound, or 0 when the buffer is not there yet — so the caller
  // can fall back to its synth version, and the ambience can chain on the end.
  const sample = (name, { gain = 1, rate = 1, delay = 0, bus = null, onEnded = null } = {}) => {
    const buffer = buffers.get(name);
    if (!ctx || !master || !buffer) return 0;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    const env = ctx.createGain();
    const level = (SAMPLES[name]?.gain ?? 1) * gain;
    src.connect(env);
    env.connect(bus ?? master);

    const at = ctx.currentTime + delay;
    // Rate-shifted playback finishes proportionally sooner or later.
    const natural = buffer.duration / (rate || 1);
    const cap = (CUE_MS[name] ?? 0) / 1000;
    const len = cap > 0 ? Math.min(cap, natural) : natural;

    env.gain.setValueAtTime(level, at);
    if (len < natural - 0.01) {
      // Cut short: ramp down instead of chopping, or it clicks.
      const release = Math.min(CUE_RELEASE, len * 0.4);
      env.gain.setValueAtTime(level, at + len - release);
      env.gain.linearRampToValueAtTime(0.0001, at + len);
    }

    src.start(at);
    src.stop(at + len + 0.02);
    src.onended = () => {
      src.disconnect();
      env.disconnect();
      onEnded?.();
    };
    return (delay + len) * 1000;
  };

  const play = (build) => {
    const audioContext = ensure();
    if (!audioContext || muted) return;
    if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
    build(audioContext.currentTime);
  };

  // ── Ambience bed ───────────────────────────────────────────────────────────
  // One voice per pass, each fading in and out over BED_XFADE, with the next one
  // starting BED_XFADE before the current ends. The overlap is the crossfade.
  const scheduleBedVoice = () => {
    const buffer = buffers.get("bed");
    if (!ctx || !bedBus || !buffer || !bedRunning) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const env = ctx.createGain();
    const at = ctx.currentTime + 0.05;
    const dur = buffer.duration;
    env.gain.setValueAtTime(0.0001, at);
    env.gain.linearRampToValueAtTime(1, at + BED_XFADE);
    env.gain.setValueAtTime(1, at + dur - BED_XFADE);
    env.gain.linearRampToValueAtTime(0.0001, at + dur);
    src.connect(env);
    env.connect(bedBus);
    src.start(at);
    src.stop(at + dur + 0.05);
    src.onended = () => {
      src.disconnect();
      env.disconnect();
    };
    bedTimer = setTimeout(scheduleBedVoice, Math.max(1000, (dur - BED_XFADE) * 1000));
  };

  const scheduleDetail = () => {
    if (!bedRunning) return;
    const name = DETAILS[Math.floor(Math.random() * DETAILS.length)];
    // Slight detune each time so a repeat never lands identically.
    const playedMs = sample(name, { gain: 0.9, rate: 0.92 + Math.random() * 0.16, bus: bedBus });
    // The gap is counted from the END of this detail, not its start. Measuring
    // it from the start let a long one still be sounding when the next fired,
    // which stacked owls on top of groans instead of spacing the graveyard out.
    const gap = DETAIL_MIN_MS + Math.random() * (DETAIL_MAX_MS - DETAIL_MIN_MS);
    detailTimer = setTimeout(scheduleDetail, playedMs + gap);
  };

  const clearTimers = () => {
    if (bedTimer) clearTimeout(bedTimer);
    if (detailTimer) clearTimeout(detailTimer);
    bedTimer = null;
    detailTimer = null;
  };

  const startAmbience = () => {
    const audioContext = ensure();
    if (!audioContext || bedRunning) return;
    bedRunning = true;
    bedBus.gain.setTargetAtTime(BED_GAIN, audioContext.currentTime, 0.4);
    // The samples may still be decoding on the very first round; retry shortly
    // rather than leaving the graveyard silent for the whole match.
    const begin = () => {
      if (!bedRunning) return;
      if (buffers.has("bed")) {
        scheduleBedVoice();
        detailTimer = setTimeout(scheduleDetail, DETAIL_MIN_MS);
      } else {
        bedTimer = setTimeout(begin, 600);
      }
    };
    begin();
  };

  const stopAmbience = () => {
    bedRunning = false;
    clearTimers();
    if (ctx && bedBus) bedBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
  };

  const setAmbiencePaused = (paused) => {
    if (!ctx || !bedBus || !bedRunning) return;
    bedBus.gain.setTargetAtTime(paused ? 0.06 : BED_GAIN, ctx.currentTime, 0.2);
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
    startAmbience,
    stopAmbience,
    setAmbiencePaused,
    // Round start: a grave lid grinding open, over the low horn that swells.
    playStart: () =>
      play((t) => {
        sample("tombstone", { rate: 1.15 });
        tone(110, t, 0.5, 0.28, "sawtooth", 165);
        tone(220, t + 0.06, 0.4, 0.16, "triangle");
      }),
    // A rival is caught: a snarl, pitched slightly differently each time.
    playBite: () =>
      play((t) => {
        if (biteVoices >= MAX_BITE_VOICES) return;
        const rate = 0.9 + Math.random() * 0.25;
        const fired =
          Math.random() < 0.5
            ? sample("bite", { rate, onEnded: () => { biteVoices -= 1; } })
            : sample("snarl", { rate, gain: 0.9, onEnded: () => { biteVoices -= 1; } });
        if (fired) {
          biteVoices += 1;
          noise(t, 0.1, 0.28, 700); // el impacto por debajo, para que tenga cuerpo
        } else {
          noise(t, 0.16, 0.5, 700);
          tone(90, t, 0.18, 0.24, "sawtooth", 60);
        }
      }),
    // You turn: the throat is yours now.
    playInfect: () =>
      play((t) => {
        if (sample("infect")) return;
        noise(t, 0.2, 0.55, 600);
        tone(200, t, 0.6, 0.32, "sawtooth", 70);
        tone(130, t + 0.05, 0.5, 0.2, "square", 55);
      }),
    // You outlast the horde: synthesized on purpose — no CC0 recording says this.
    playWin: () =>
      play((t) => {
        stopAmbience();
        tone(392, t, 0.14, 0.26, "triangle");
        tone(523, t + 0.13, 0.14, 0.26, "triangle");
        tone(659, t + 0.26, 0.14, 0.26, "triangle");
        tone(784, t + 0.39, 0.3, 0.24, "sine");
      }),
    // You fell: the horde roars over a somber drop.
    playLose: () =>
      play((t) => {
        stopAmbience();
        sample("roar", { rate: 0.95 });
        tone(330, t, 0.2, 0.2, "sawtooth", 220);
        tone(196, t + 0.16, 0.4, 0.18, "sawtooth", 130);
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
    snapshot: () => ({ muted, available: Boolean(ctx), samples: buffers.size }),
    dispose: () => {
      bedRunning = false;
      clearTimers();
      if (ctx) ctx.close().catch(() => {});
      ctx = null;
      master = null;
      bedBus = null;
      buffers.clear();
      loading = null;
    },
  };
}

export default createTerrorZombiAudio;
