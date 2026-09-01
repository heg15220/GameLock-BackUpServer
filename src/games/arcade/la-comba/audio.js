// La Comba sound. A rhythm game lives on its feedback being instant and
// unambiguous, so an on-beat turn is a bright two-note chime, a sloppy one is a
// single duller note, and a trip is the rope slapping the ground.

import { createArcadeAudio, readStoredMuted } from "../shared/wiiPartyAudio.js";

const MUTED_KEY = "laCombaAudioMuted";

export function readStoredCombaMuted() {
  return readStoredMuted(MUTED_KEY);
}

export function createCombaAudio(initialMuted = false) {
  return createArcadeAudio(
    MUTED_KEY,
    ({ tone, noise, sweep }) => ({
      playPerfect: (t) => {
        tone(784, t, 0.07, 0.26, "triangle");
        tone(1175, t + 0.055, 0.1, 0.22, "sine");
      },
      playGood: (t) => tone(587, t, 0.08, 0.22, "triangle"),
      // Off the beat: the rope brushes the ground instead of clearing it.
      playWobble: (t) => noise(t, 0.1, 0.2, 420, 1.1),
      // Somebody caught a foot.
      playTrip: (t) => {
        noise(t, 0.16, 0.3, 240, 0.9);
        tone(196, t + 0.03, 0.2, 0.24, "sawtooth", 130);
      },
      playWin: (t) => sweep([523, 659, 784, 1047], t, 0.1, 0.16, 0.27),
      playLose: (t) => {
        tone(392, t, 0.16, 0.24, "triangle");
        tone(311, t + 0.15, 0.18, 0.22, "triangle");
        tone(262, t + 0.32, 0.28, 0.2, "sine");
      },
    }),
    initialMuted,
  );
}

export default createCombaAudio;
