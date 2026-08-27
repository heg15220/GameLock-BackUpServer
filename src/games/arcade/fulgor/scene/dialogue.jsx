/**
 * FULGOR — la caja de diálogo.
 *
 * Es la anatomía exacta de la referencia, y cada pieza está porque hace un trabajo:
 *
 *   ┌── el retrato SANGRA por arriba y por la izquierda ──────────────────┐
 *   │  ╔═ Silvia ═╗                                                       │
 *   │ ┌╫───────────────────────────────────────────────────────────────┐  │
 *   │ │║  Al parecer la visita todos los días desde que acabó el       │  │
 *   │ │║  Frontera de Fútbol.                                      ▸   │  │
 *   │ └───────────────────────────────────────────────────────────────┘  │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 *  - **El retrato se sale de la caja.** Si estuviera dentro, la caja sería un cuadro con
 *    una foto y la escena estaría detrás. Saliéndose, el personaje está EN la escena y la
 *    caja es lo que dice, no dónde vive. Es el gesto que más define la referencia y el que
 *    más se pierde al copiarla de memoria.
 *
 *  - **La placa del nombre monta sobre el borde superior.** No es decoración: rompe el
 *    rectángulo, que es lo que impide que el conjunto se lea como un formulario.
 *
 *  - **El texto se escribe letra a letra, y se puede saltar.** Escribirse es lo que le da
 *    voz; poder saltarlo es lo que impide que a la tercera hora sea un impuesto. El primer
 *    toque completa la línea, el segundo avanza — nunca al revés, porque avanzar por
 *    accidente y perderse una frase es de lo que peor sienta en un juego de historia.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Caracteres por segundo. Rápido pero legible; a menos, se siente lento a la tercera línea. */
const VELOCIDAD = 46;

/**
 * @param {object} props
 * @param {{ hablante: string, nombre: string, animo?: string, texto: string }[]} props.lineas
 * @param {(i: number) => string} props.retrato   ruta del retrato para la línea i
 * @param {() => void} props.onCerrar
 */
export default function Dialogo({ lineas = [], retrato, onCerrar, onLinea, onDecision }) {
  const [secuencia, setSecuencia] = useState(lineas);
  const [i, setI] = useState(0);
  const [visibles, setVisibles] = useState(0);
  const inicio = useRef(0);

  const linea = secuencia[i] ?? null;
  const completa = linea ? visibles >= linea.texto.length : true;

  useEffect(() => {
    setSecuencia(lineas);
    setI(0);
    setVisibles(0);
  }, [lineas]);

  /* El mecanógrafo. Va por reloj real y no por intervalo fijo, para que una pestaña en
     segundo plano no deje media frase escrita al volver. */
  useEffect(() => {
    if (!linea) return undefined;
    setVisibles(0);
    inicio.current = performance.now();
    let vivo = true;
    const tic = () => {
      if (!vivo) return;
      const pasado = (performance.now() - inicio.current) / 1000;
      const n = Math.floor(pasado * VELOCIDAD);
      setVisibles(Math.min(linea.texto.length, n));
      if (n < linea.texto.length) requestAnimationFrame(tic);
    };
    const h = requestAnimationFrame(tic);
    return () => {
      vivo = false;
      cancelAnimationFrame(h);
    };
  }, [linea]);

  useEffect(() => {
    if (linea) onLinea?.(i, linea);
  }, [i, linea, onLinea]);

  const avanzar = useCallback(() => {
    if (!linea) return;
    if (!completa) {
      // Primer toque: completar. Nunca avanzar.
      setVisibles(linea.texto.length);
      return;
    }
    if (linea.opciones?.length) return;
    if (i + 1 < secuencia.length) setI(i + 1);
    else onCerrar?.();
  }, [completa, i, linea, secuencia.length, onCerrar]);

  const elegir = useCallback((opcion, evento) => {
    evento?.preventDefault();
    evento?.stopPropagation();
    const respuesta = (opcion.response ?? []).map((r) => ({
      hablante: r.speaker,
      nombre: r.name,
      animo: r.mood ?? "neutro",
      texto: r.text,
    }));
    onDecision?.(opcion.id);
    setSecuencia((actual) => [...actual.slice(0, i + 1), ...respuesta, ...actual.slice(i + 1)]);
    setI(i + 1);
  }, [i, onDecision]);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        e.stopPropagation();
        avanzar();
      }
    };
    // En captura, para ganarle al manejador del mundo: mientras hay diálogo, la barra
    // espaciadora avanza el texto y no vuelve a hablar con quien ya está hablando.
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [avanzar]);

  const texto = useMemo(() => (linea ? linea.texto.slice(0, visibles) : ""), [linea, visibles]);
  if (!linea) return null;

  // Sin hablante no hay retrato: es un sitio pensando en voz alta, no alguien hablando.
  const conRetrato = Boolean(linea.hablante);

  return (
    <div
      className={`fg-dialogo ${conRetrato ? "" : "fg-dialogo--narrador"}`}
      onPointerDown={avanzar}
      role="dialog"
      aria-live="polite"
    >
      {conRetrato && (
        <img
          className="fg-dialogo__retrato"
          src={retrato?.(i, linea) ?? ""}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      )}

      <div className="fg-dialogo__caja">
        {/* SIN NOMBRE NO HAY PLACA. Las escenas de guion alternan voz en off y personaje, y
            una placa vacía dejaba un pico de color montado sobre el borde de la caja sin
            nada escrito dentro — el borrón exacto que la placa existe para evitar. */}
        {linea.nombre && <span className="fg-dialogo__placa">{linea.nombre}</span>}
        <p className="fg-dialogo__texto">
          {texto}
          {/* El texto completo va en el DOM para el lector de pantalla aunque en pantalla
              se esté escribiendo: quien usa lector no tiene por qué esperar al mecanógrafo. */}
          <span className="fg-sr">{linea.texto}</span>
        </p>
        {completa && linea.opciones?.length > 0 && (
          <div className="fg-dialogo__opciones" role="group" aria-label="Respuesta de Dani">
            {linea.opciones.map((opcion, n) => (
              <button key={opcion.id} type="button" onPointerDown={(e) => elegir(opcion, e)}>
                <span>{n + 1}</span>{opcion.label}
              </button>
            ))}
          </div>
        )}
        <span className={`fg-dialogo__avance ${completa ? "" : "fg-dialogo__avance--espera"}`} aria-hidden="true">
          {linea.opciones?.length ? "" : "▼"}
        </span>
      </div>
    </div>
  );
}
