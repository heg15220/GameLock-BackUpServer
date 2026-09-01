// Caída Libre sound. The whole game is one moment — the doors opening — so the
// two outcomes have to be told apart before you have finished reading the
// screen: a solid landing thud, or the floor dropping away under you.

import { createArcadeAudio, readStoredMuted } from "../shared/wiiPartyAudio.js";

const MUTED_KEY = "caidaLibreAudioMuted";

export function readStoredCaidaMuted() {
  return readStoredMuted(MUTED_KEY);
}

export function createCaidaAudio(initialMuted = false) {
  return createArcadeAudio(
    MUTED_KEY,
    ({ tone, noise, sweep }) => ({
      // Stepping across to the other trapdoor.
      playStep: (t) => noise(t, 0.06, 0.16, 700, 1.2),
      // The floor held.
      playSafe: (t) => {
        noise(t, 0.09, 0.22, 300, 1);
        tone(523, t + 0.04, 0.12, 0.22, "triangle");
      },
      // The floor did not.
      playFall: (t) => {
        tone(700, t, 0.45, 0.26, "sine", 160);
        noise(t + 0.1, 0.3, 0.14, 900, 0.6, "lowpass");
      },
      playWin: (t) => sweep([523, 659, 784, 1047], t, 0.1, 0.16, 0.27),
      playLose: (t) => {
        tone(392, t, 0.18, 0.24, "triangle");
        tone(294, t + 0.17, 0.2, 0.22, "triangle");
        tone(196, t + 0.36, 0.32, 0.2, "sine");
      },
    }),
    initialMuted,
  );
}

export default createCaidaAudio;
