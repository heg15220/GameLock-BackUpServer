// Web Worker que ejecuta la busqueda de ajedrez fuera del hilo de la interfaz.
// Recibe el estado de la partida (datos puros, clonados por postMessage) y
// devuelve la jugada elegida, sin congelar la UI mientras "piensa".

import { chooseAIMove } from "./chessAI";

self.onmessage = (event) => {
  const data = event.data || {};
  const { id, state, levelId } = data;
  try {
    const move = chooseAIMove(state, levelId);
    self.postMessage({ id, ok: true, move });
  } catch (error) {
    self.postMessage({ id, ok: false, error: String((error && error.message) || error) });
  }
};
