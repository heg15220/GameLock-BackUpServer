/**
 * FULGOR — el prólogo jugable y la apertura animada.
 *
 * Dos componentes que se ven una vez por partida y en este orden: primero `Prologo`, que
 * explica, y después `Apertura`, que no explica nada y sólo pone el tono. Ninguno de los dos
 * toca el estado del motor — los dos son pantalla, como `Transicion` — y por eso viven en la
 * capa de vista y `game.js` no se entera de que existen.
 *
 * NO HAY TEXTO ESCRITO AQUÍ. Todo pasa por `copy` (§13.1), y `prologo.js` pone la estructura.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { retratoURL } from "./world/render.js";
import { fillTemplate } from "./copy.js";
import { CARTAS, DURACION_FRASE, FRASES_APERTURA, TOTAL_CARTAS } from "./prologo.js";

/* ── El prólogo ──────────────────────────────────────────────────────────────────── */

/**
 * Cinco cartas, una detrás de otra, con el botón de saltar siempre a la vista.
 *
 * LOS RETRATOS SALEN DEL MISMO HORNO QUE LOS SPRITES. `retratoURL` es la función que pinta
 * los bustos de la caja de diálogo, así que la cara de Nuria en la carta de presentación es
 * literalmente la misma que la que verás en la plaza dos minutos después. Si fueran dibujos
 * aparte, el prólogo estaría presentando a otra persona.
 */
export function Prologo({ copy, onTerminar }) {
  const [i, setI] = useState(0);
  const carta = CARTAS[i];
  const ultima = i === TOTAL_CARTAS - 1;

  const avanzar = useCallback(() => {
    if (ultima) onTerminar?.();
    else setI((n) => n + 1);
  }, [onTerminar, ultima]);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        avanzar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [avanzar]);

  return (
    <div className="fg-prologo" role="group" aria-label={copy.prologo.titulo}>
      <div className="fg-prologo__cinta">
        <span className="fg-tiny fg-muted">
          {fillTemplate(copy.prologo.paso, { n: i + 1, total: TOTAL_CARTAS })}
        </span>
        <button type="button" className="fg-btn fg-btn--ghost fg-tiny" onClick={() => onTerminar?.()}>
          {copy.prologo.saltar}
        </button>
      </div>

      {/* La clave por carta reinicia la animación de entrada: sin ella, la segunda carta
          aparecía ya colocada y el paso se leía como un cambio de texto, no de página. */}
      <div className="fg-prologo__carta" key={carta.id}>
        <h2 className="fg-display fg-display--lg">{copy.prologo[carta.titulo]}</h2>

        {carta.retratos.length > 0 && (
          <div className="fg-prologo__caras" aria-hidden="true">
            {carta.retratos.map((id) => (
              <figure key={id} className="fg-prologo__cara">
                <img src={retratoURL(id, "neutro")} alt="" draggable="false" />
                <figcaption className="fg-tiny">{copy.personajes[id]}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {carta.icono && (
          <div className="fg-prologo__icono" aria-hidden="true">
            <Icon nombre={carta.icono} tamano={44} />
          </div>
        )}

        <div className="fg-prologo__lineas">
          {carta.lineas.map((clave, n) => (
            <p key={clave} className="fg-prologo__linea" style={{ animationDelay: `${120 + n * 160}ms` }}>
              {copy.prologo[clave]}
            </p>
          ))}
        </div>
      </div>

      <button type="button" className="fg-btn fg-btn--primary" onClick={avanzar}>
        {ultima ? copy.prologo.empezar : copy.prologo.siguiente}
      </button>
    </div>
  );
}

/* ── La apertura ─────────────────────────────────────────────────────────────────── */

/**
 * Ocho frases sobre negro, una cada 2,6 segundos, saltables con un toque.
 *
 * EL TEMPORIZADOR VA POR ÍNDICE Y NO POR CADENA DE `setTimeout`. La versión encadenada
 * —cada frase programando la siguiente— pierde el hilo si la pestaña se va a segundo plano
 * y vuelve, que es exactamente lo que hace un móvil cuando entra una notificación. Un solo
 * intervalo que avanza un contador no tiene ese problema.
 *
 * `onTerminar` se llama una sola vez, y de eso se encarga `hecho`: sin él, el intervalo
 * seguía disparando después de la última frase y el juego arrancaba el capítulo dos veces.
 */
export function Apertura({ copy, onTerminar }) {
  const [i, setI] = useState(0);
  const hecho = useRef(false);

  const terminar = useCallback(() => {
    if (hecho.current) return;
    hecho.current = true;
    onTerminar?.();
  }, [onTerminar]);

  useEffect(() => {
    const t = setInterval(() => {
      setI((n) => {
        if (n + 1 >= FRASES_APERTURA.length) {
          clearInterval(t);
          terminar();
          return n;
        }
        return n + 1;
      });
    }, DURACION_FRASE);
    return () => clearInterval(t);
  }, [terminar]);

  useEffect(() => {
    const tecla = (e) => {
      if (e.key === " " || e.key === "Enter" || e.key === "Escape") {
        e.preventDefault();
        terminar();
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [terminar]);

  return (
    <div
      className="fg-apertura"
      onPointerDown={terminar}
      role="button"
      tabIndex={0}
      aria-label={copy.apertura.pulsa}
    >
      <p className="fg-apertura__frase" key={FRASES_APERTURA[i]}>
        {copy.apertura[FRASES_APERTURA[i]]}
      </p>
      <span className="fg-apertura__pie fg-tiny">{copy.apertura.pulsa}</span>
    </div>
  );
}

export default Prologo;
