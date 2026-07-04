// Hook que gestiona el Web Worker de un motor de juego (ajedrez o damas) desde
// un componente React. Expone `requestMove`, que devuelve una promesa con la
// jugada elegida por el motor, calculada fuera del hilo de la interfaz.
//
// Responsabilidades:
//   - Crear el worker de forma perezosa y reutilizarlo entre jugadas.
//   - Identificar cada peticion (`id`) y descartar respuestas obsoletas cuando
//     el usuario deshace, reinicia o cancela.
//   - Garantizar un tiempo minimo de "pensar" para que la respuesta no llegue
//     de golpe en posiciones triviales.
//   - Recurrir a un calculo sincrono de reserva si no hay Web Workers.

import { useCallback, useEffect, useMemo, useRef } from "react";

const supportsWorker = () => typeof Worker !== "undefined";

export default function useEngineWorker(workerFactory, fallbackChooseMove) {
  const workerRef = useRef(null);
  const pendingRef = useRef(null); // { id, resolve, reject }
  const idRef = useRef(0);
  const brokenRef = useRef(false);

  const ensureWorker = useCallback(() => {
    if (workerRef.current || brokenRef.current || !supportsWorker()) {
      return workerRef.current;
    }
    try {
      const worker = workerFactory();
      worker.onmessage = (event) => {
        const { id, ok, move, error } = event.data || {};
        const pending = pendingRef.current;
        if (!pending || pending.id !== id) return; // respuesta obsoleta: descartar
        pendingRef.current = null;
        if (ok) pending.resolve(move);
        else pending.reject(new Error(error || "engine error"));
      };
      worker.onerror = () => {
        brokenRef.current = true;
        workerRef.current = null;
      };
      workerRef.current = worker;
    } catch {
      brokenRef.current = true;
      workerRef.current = null;
    }
    return workerRef.current;
  }, [workerFactory]);

  const requestMove = useCallback((state, levelId, options = {}) => {
    const { minThinkMs = 0 } = options;
    const id = ++idRef.current;

    // Cancelar cualquier peticion anterior aun en vuelo.
    if (pendingRef.current) {
      pendingRef.current.reject(new Error("cancelled"));
      pendingRef.current = null;
    }

    const started = Date.now();
    const worker = ensureWorker();

    const computed = new Promise((resolve, reject) => {
      if (worker) {
        pendingRef.current = { id, resolve, reject };
        worker.postMessage({ id, state, levelId });
      } else {
        // Reserva sincrona (sin Web Worker disponible).
        try {
          resolve(fallbackChooseMove(state, levelId));
        } catch (error) {
          reject(error);
        }
      }
    });

    return computed.then((move) => {
      // Si entretanto llego otra peticion, esta quedo obsoleta.
      if (id !== idRef.current) {
        throw new Error("cancelled");
      }
      const wait = Math.max(0, minThinkMs - (Date.now() - started));
      if (wait > 0) {
        return new Promise((resolve) => setTimeout(() => resolve(move), wait));
      }
      return move;
    });
  }, [ensureWorker, fallbackChooseMove]);

  const cancel = useCallback(() => {
    idRef.current += 1; // invalida la respuesta en vuelo
    if (pendingRef.current) {
      pendingRef.current.reject(new Error("cancelled"));
      pendingRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Objeto estable para que los consumidores puedan usarlo como dependencia de
  // efectos/callbacks sin re-ejecutarlos en cada render.
  return useMemo(() => ({ requestMove, cancel }), [requestMove, cancel]);
}
