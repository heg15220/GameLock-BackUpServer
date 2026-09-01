// El Escondite sound: feedback begins only after a search, so audio cannot
// disclose which untouched hiding place is occupied.

import { createArcadeAudio, readStoredMuted } from "../shared/wiiPartyAudio.js";

const MUTED_KEY = "elEscondideAudioMuted";

export function readStoredEscondideMuted() {
  return readStoredMuted(MUTED_KEY);
}

export function createEscondideAudio(initialMuted = false) {
  return createArcadeAudio(
    MUTED_KEY,
    ({ tone, noise, sweep }) => ({
      // Searched a place and caught somebody.
      playFound: (t) => {
        tone(660, t, 0.1, 0.28, "triangle");
        tone(988, t + 0.08, 0.14, 0.26, "triangle");
        tone(1319, t + 0.18, 0.2, 0.22, "sine");
      },
      // Searched a place and it was empty.
      playEmpty: (t) => {
        noise(t, 0.12, 0.2, 320, 1.2);
        tone(220, t + 0.02, 0.16, 0.18, "sawtooth", 170);
      },
      playWin: (t) => sweep([523, 659, 784, 1047], t, 0.11, 0.16, 0.27),
      playLose: (t) => {
        tone(440, t, 0.16, 0.24, "triangle");
        tone(349, t + 0.15, 0.18, 0.22, "triangle");
        tone(262, t + 0.32, 0.3, 0.2, "sine");
      },
    }),
    initialMuted,
  );
}

export default createEscondideAudio;
