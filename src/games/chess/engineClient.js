// Fabrica del Web Worker de ajedrez y funcion de calculo sincrono de reserva.
// El `new URL(..., import.meta.url)` debe ser literal para que Vite empaquete
// el worker correctamente, por eso vive en el modulo del propio juego.

import { chooseAIMove } from "./chessAI";

export const createChessWorker = () =>
  new Worker(new URL("./engine.worker.js", import.meta.url), { type: "module" });

// Reserva usada cuando el entorno no soporta Web Workers de modulo.
export const chessFallbackChooseMove = (state, levelId) => chooseAIMove(state, levelId);
