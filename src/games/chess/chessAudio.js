// Chess piece sound. Samples come from Kenney's "Impact Sounds" pack (CC0, see
// public/legal/audio-licenses.txt): impactWood_light for a move, impactWood_heavy
// for a capture, each trimmed to chess-tap length and encoded to mono mp3.
//
// This replaced a synthesized version that measured -37 dBFS with a 130-210 Hz
// fundamental — technically correct and effectively inaudible, since laptop
// speakers roll off that low and the ear is least sensitive there. Recorded wood
// carries broadband click energy in the 1-4 kHz range, which is what actually
// reads as a piece landing on a board.
//
// Playback is Web Audio rather than <audio> elements, matching ping-pong-arena:
// an AudioBufferSourceNode is one-shot, so a fast move followed by a capture
// overlaps instead of cutting itself off the way a shared element's .play() does.

import moveUrl from "./assets/sounds/move.mp3";
import captureUrl from "./assets/sounds/capture.mp3";

const CHESS_AUDIO_MUTED_KEY = "chessAudioMuted";

const MASTER_VOLUME = 0.45;

// Per-cue gain, relative to master. A capture sits above a move so it reads as
// the heavier event rather than merely a different one.
const CUES = {
  move: { url: moveUrl, gain: 0.75 },
  capture: { url: captureUrl, gain: 1 },
};

// Repeated moves from one sample turn into a machine-gun tick. A few percent of
// pitch scatter is enough to keep consecutive taps from sounding identical.
const PITCH_JITTER = 0.06;

export function readStoredChessMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CHESS_AUDIO_MUTED_KEY) === "1";
}

export function createChessAudio(initialMuted = false) {
  let ctx = null;
  let master = null;
  let unlocked = false;
  let lastEvent = null;
  let eventCount = 0;
  let muted = Boolean(initialMuted);
  let loading = null;
  const buffers = new Map();

  const applyMuteState = () => {
    if (master) {
      master.gain.value = muted ? 0 : MASTER_VOLUME;
    }
  };

  // Built on first gesture, never at import: SSR and the vitest node env have no
  // window, and returning null there makes every play() a no-op instead of a throw.
  const ensure = () => {
    if (typeof window === "undefined") return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!ctx) {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      applyMuteState();
      master.connect(ctx.destination);
    }
    return ctx;
  };

  // Fetch and decode both cues once. Safe to call repeatedly: the in-flight
  // promise is reused, so unlock() and a first play() racing it never decode twice.
  const preload = () => {
    const audioContext = ensure();
    if (!audioContext) return Promise.resolve();
    if (loading) return loading;

    loading = Promise.all(
      Object.entries(CUES).map(async ([name, { url }]) => {
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
    // Decode ahead of the first move so it isn't the one cue that gets dropped.
    preload();
  };

  const play = (eventName) => {
    const cue = CUES[eventName];
    // Recorded even when muted, unknown, or context-less so tests and the QA
    // bridge can assert which cue fired without needing Web Audio.
    lastEvent = { name: eventName, at: Date.now() };
    eventCount += 1;
    if (!cue) return;

    const audioContext = ensure();
    if (!audioContext || !master || muted) return;
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }

    const buffer = buffers.get(eventName);
    if (!buffer) {
      // Still decoding, or it failed. Kick the load so later cues land.
      preload();
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1 - PITCH_JITTER / 2 + Math.random() * PITCH_JITTER;

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
      window.localStorage.setItem(CHESS_AUDIO_MUTED_KEY, muted ? "1" : "0");
    }
    applyMuteState();
    return muted;
  };

  return {
    unlock,
    preload,
    play,
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
      loading = null;
      buffers.clear();
    },
  };
}

export default createChessAudio;
