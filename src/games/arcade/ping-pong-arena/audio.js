// Ping Pong Arena sound. Samples come from the shresthalucky/PingPong reference
// (ISC, see public/legal/audio-licenses.txt). Cue semantics follow that reference:
// bounceIn/bounceOut split on whether the ball came off the table or the floor,
// clapHigh/clapLow on who took the point, and the referee whistles the match in
// and out.
//
// Playback is Web Audio rather than the reference's <audio> elements: an
// AudioBufferSourceNode is one-shot, so rapid cues (a fast rally hits bat then
// bounce within a few frames) overlap instead of cutting each other off the way
// a shared element's .play() does.

import bounceInUrl from "./assets/sounds/bounce1.mp3";
import bounceOutUrl from "./assets/sounds/bounce2.mp3";
import clapHighUrl from "./assets/sounds/clap1.mp3";
import clapLowUrl from "./assets/sounds/clap2.mp3";
import batHitUrl from "./assets/sounds/hit.mp3";
import refereeUrl from "./assets/sounds/referee.mp3";

// Per-cue gain, relative to master. The claps are long crowd beds and would
// otherwise bury the table, which is where the game's feedback actually lives.
const CUES = {
  bounceIn: { url: bounceInUrl, gain: 0.9 },
  bounceOut: { url: bounceOutUrl, gain: 0.7 },
  batHit: { url: batHitUrl, gain: 1 },
  clapHigh: { url: clapHighUrl, gain: 0.5 },
  clapLow: { url: clapLowUrl, gain: 0.4 },
  referee: { url: refereeUrl, gain: 0.6 },
};

const MASTER_VOLUME = 0.5;

export default class PingPongAudio {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.masterGain = null;
    this.buffers = new Map();
    this.loading = null;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  getEnabled() {
    return this.enabled;
  }

  // The context can only be created once a gesture has landed, so this is called
  // from the cue sites rather than at construction. Returns null wherever Web
  // Audio is unavailable (SSR, the node test env), which makes every play() a
  // no-op instead of a throw.
  ensureContext() {
    if (!this.enabled) return null;
    if (typeof window === "undefined") return null;

    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (!this.context) {
      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = MASTER_VOLUME;
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      this.context.resume().catch(() => undefined);
    }

    return this.context;
  }

  // Fetch and decode every cue once. Safe to call repeatedly: the in-flight
  // promise is reused, so preload() on start and a first play() racing it do not
  // decode twice.
  preload() {
    const context = this.ensureContext();
    if (!context) return Promise.resolve();
    if (this.loading) return this.loading;

    this.loading = Promise.all(
      Object.entries(CUES).map(async ([name, { url }]) => {
        try {
          const res = await fetch(url);
          const raw = await res.arrayBuffer();
          const buffer = await context.decodeAudioData(raw);
          this.buffers.set(name, buffer);
        } catch {
          // A cue that fails to load simply stays silent — sound is never worth
          // taking the game down for.
        }
      }),
    ).then(() => undefined);

    return this.loading;
  }

  play(name, { rate = 1 } = {}) {
    const cue = CUES[name];
    if (!cue) return;

    const context = this.ensureContext();
    if (!context) return;

    const buffer = this.buffers.get(name);
    if (!buffer) {
      // Still decoding (or failed). Kick off the load so later cues land.
      this.preload();
      return;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;

    const gain = context.createGain();
    gain.gain.value = cue.gain;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
  }

  dispose() {
    if (this.context && this.context.state !== "closed") {
      this.context.close().catch(() => undefined);
    }
    this.context = null;
    this.masterGain = null;
    this.buffers.clear();
    this.loading = null;
  }
}
