/**
 * FULGOR — la pantalla de abajo durante una Intervención.
 *
 * Mismo principio que en la exploración: **informa y controla, no ofrece**. Aquí ya no hay
 * lista de nodos a los que ir ni leyenda de "línea continua = ruta visible, línea de puntos
 * = ruta en sombra", porque no hay líneas: hay una calle, y se ve si está iluminada.
 *
 * Lo que sí tiene que estar, y estaba repartido entre el grafo y su cabecera:
 *
 *  - **El reloj, grande.** Es el único antagonista que no se puede pegar. El §4 entero
 *    cuelga de él, así que ocupa el sitio que ocupaba el diagrama.
 *  - **Qué pasa si tardas un turno más.** `nextEscalation` ya lo dice con una frase concreta
 *    —"el humo baja una planta"— y una frase concreta asusta más que una barra roja.
 *  - **Los objetivos**, tachándose.
 *  - **Quién está mirando**, por nombre.
 *  - **La cruceta**, que es como se anda.
 */

import React from "react";

import { nextEscalation } from "../intervention.js";

const DIRS = ["arriba", "izq", "der", "abajo"];
const FLECHAS = {
  arriba: "M10 6l4 5H6z",
  abajo: "M10 14l-4-5h8z",
  izq: "M6 10l5-4v8z",
  der: "M14 10l-5 4V6z",
};

export default function ControlesIntervencion({ escenario, copy, entradaRef, visto = [], onRetirarse }) {
  if (!escenario) return null;

  const pulsar = (dir, valor) => (evento) => {
    evento.preventDefault();
    if (entradaRef?.current) entradaRef.current[dir] = valor;
  };

  const quedan = Math.max(0, escenario.reloj.max - escenario.reloj.turno);
  const apurado = quedan <= 2;
  const siguiente = nextEscalation(escenario);
  const principal = escenario.objetivos.find((o) => o.principal);
  const opcionales = escenario.objetivos.filter((o) => !o.principal);

  return (
    <div className="fg-controles fg-controles--intervencion">
      <div className="fg-cinta">
        <div className="fg-cinta__hilo">
          {/* El reloj ocupa el sitio que ocupaba el diagrama, y en el tamaño que merece. */}
          <span className="fg-reloj" data-apurado={apurado ? "true" : "false"}>
            <strong>{quedan}</strong>
            <span>{copy.intervencion?.turnosRestantes ?? "turnos"}</span>
          </span>
        </div>
        <div className="fg-cinta__reloj">
          <span>{copy.distritos?.[escenario.distrito] ?? escenario.distrito}</span>
        </div>
      </div>

      {/* Lo que cuesta tardar, dicho con la frase concreta que ya escribe el motor. */}
      {siguiente && (
        <p className="fg-agravamiento">
          {copy.intervencion?.siGastasOtroTurno ?? "Si gastas otro turno:"}{" "}
          <strong>{copy.agravamientos?.[siguiente.id] ?? siguiente.id}</strong>
        </p>
      )}

      <ul className="fg-objetivos">
        {principal && (
          <li data-cumplido={principal.cumplido ? "true" : "false"} data-principal="true">
            {copy.objetivos?.[principal.tipo] ?? principal.tipo}
          </li>
        )}
        {opcionales.map((o) => (
          <li key={o.id} data-cumplido={o.cumplido ? "true" : "false"}>
            {copy.objetivos?.[o.tipo] ?? o.tipo}
          </li>
        ))}
      </ul>

      <div className="fg-mandos">
        <div className="fg-cruceta" role="group" aria-label={copy.ui?.mover ?? "Mover"}>
          {DIRS.map((dir) => (
            <button
              key={dir}
              type="button"
              className={`fg-cruceta__tecla fg-cruceta__tecla--${dir}`}
              onPointerDown={pulsar(dir, true)}
              onPointerUp={pulsar(dir, false)}
              onPointerLeave={pulsar(dir, false)}
              onPointerCancel={pulsar(dir, false)}
              aria-label={dir}
            >
              <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
                <path d={FLECHAS[dir]} fill="currentColor" />
              </svg>
            </button>
          ))}
          <span className="fg-cruceta__centro" aria-hidden="true" />
        </div>

        <div className="fg-mandos__derecha">
          {/* Quién mira, por nombre. Se enciende cuando de verdad te tienen en el cono. */}
          <span className="fg-vigilancia" data-visto={visto.length ? "true" : "false"}>
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M2 10s3.2-5 8-5 8 5 8 5-3.2 5-8 5-8-5-8-5z" />
              <circle cx="10" cy="10" r="2.2" />
            </svg>
            <span>
              {escenario.testigos.length
                ? escenario.testigos.map((t) => copy.personajes?.[t.id] ?? t.id).join(" · ")
                : (copy.intervencion?.sinTestigos ?? "—")}
            </span>
          </span>

          <button type="button" className="fg-btn fg-btn--ghost fg-retirarse" onClick={onRetirarse}>
            {copy.intervencion?.salir ?? "Retirarse"}
          </button>
        </div>
      </div>
    </div>
  );
}
