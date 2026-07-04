// Fabrica del Web Worker de damas y calculo sincrono de reserva. El
// `new URL(..., import.meta.url)` debe ser literal para que Vite empaquete el
// worker, por eso vive en el modulo del propio juego.

import { chooseAIMove } from "./checkersAI";

export const createCheckersWorker = () =>
  new Worker(new URL("./engine.worker.js", import.meta.url), { type: "module" });

export const checkersFallbackChooseMove = (state, levelId) => chooseAIMove(state, levelId);
