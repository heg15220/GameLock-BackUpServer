// Obstáculos Rodantes sound. A jump and a mid-air hover need to be told apart
// by ear alone — you are usually looking at the next barrel, not at yourself —
// so the jump is a rising blip and each hover is a shorter, higher tick.

import { createArcadeAudio, readStoredMuted } from "../shared/wiiPartyAudio.js";

const MUTED_KEY = "obstaculosAudioMuted";

export function readStoredObstaculosMuted() {
  return readStoredMuted(MUTED_KEY);
}

export function createObstaculosAudio(initialMuted = false) {
  return createArcadeAudio(
    MUTED_KEY,
    ({ tone, noise, sweep }) => ({
      playJump: (t) => tone(420, t, 0.13, 0.24, "triangle", 760),
      playHover: (t) => tone(880, t, 0.06, 0.16, "sine", 1080),
      // Clipped a barrel: a wooden knock plus the stumble.
      playHit: (t) => {
        noise(t, 0.13, 0.3, 260, 0.8);
        tone(180, t + 0.02, 0.18, 0.24, "sawtooth", 120);
      },
      playWin: (t) => sweep([523, 659, 784, 1047], t, 0.1, 0.16, 0.27),
      playLose: (t) => {
        tone(392, t, 0.16, 0.24, "triangle");
        tone(311, t + 0.15, 0.18, 0.22, "triangle");
        tone(233, t + 0.32, 0.3, 0.2, "sine");
      },
    }),
    initialMuted,
  );
}

export default createObstaculosAudio;
