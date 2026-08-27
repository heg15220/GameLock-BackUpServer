/**
 * FULGOR — la pantalla de abajo durante la exploración.
 *
 * ESTO SUSTITUYE AL MENÚ DE BLOQUE, Y NO ES UN CAMBIO DE INTERFAZ: ES UN CAMBIO DE JUEGO.
 *
 * Antes, la mitad inferior era una lista de nueve botones —clase/familia, quedar, entrenar,
 * taller, trabajar, investigar, contramedidas, patrullar, descansar— y el jugador gastaba
 * su tarde pulsando uno. Eso convierte una historia en un formulario: las nueve opciones
 * están siempre ahí, todas al mismo nivel, y ninguna tiene sitio ni cara.
 *
 * Ahora cada una de esas nueve cosas es UN SITIO O UNA PERSONA en Marés. Entrenar es Tuerca
 * en el campo del instituto. El taller es Chapa en la subestación. Descansar es tu portal.
 * La tarde se gasta yendo, y por eso el panel de abajo ya no ofrece: **informa y controla**.
 *
 * LO QUE SÍ TIENE QUE HABER, porque sin ello el hilo narrativo se rompe:
 *
 *  - **Dónde estás y en qué capítulo.** Un mundo sin brújula no es libertad, es estar
 *    perdido. La cinta de arriba dice el capítulo, su título y hacia dónde apunta.
 *  - **El estado que cambia paseando:** Rango, dinero y quién te está mirando más. Carga y
 *    Compostura NO: son recursos de duelo y fuera de un duelo están siempre al máximo.
 *  - **La cruceta y el botón de acción**, que en un móvil son el juego entero.
 *  - **Los tres paneles** —expedientes, traje, guardado—, que son consulta, no acción: no
 *    gastan bloque y por eso pueden seguir siendo botones sin contradecir nada.
 */

import React from "react";

const DIRS = ["arriba", "izq", "der", "abajo"];

/**
 * Los glifos se dibujan AQUÍ, en SVG, en vez de tirar de `<Icon>`.
 *
 * `icons.jsx` sirve los 71 iconos de `/assets/fulgor/ui/`, y esos salen de un generador que
 * elige el motivo con `hash(id) % 8`: a 16 píxeles, "expediente", "máscara" y "guardar"
 * acaban siendo el mismo borrón redondeado con distinto tinte. Tres botones que el jugador
 * va a pulsar cien veces necesitan tres siluetas que se distingan de un vistazo, y a este
 * tamaño eso se consigue con cuatro trazos, no con un motivo aleatorio.
 */
const GLIFOS = {
  mapa: (
    <>
      <path d="M3.5 5.5l4-2 5 2 4-2v11l-4 2-5-2-4 2z" />
      <path d="M7.5 3.5v11M12.5 5.5v11" />
      <circle cx="12.5" cy="9" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  expedientes: (
    <>
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h4l1.6 2H15a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 15 15H4.5A1.5 1.5 0 0 1 3 13.5z" />
      <path d="M6 9.5h7M6 12h4.5" strokeLinecap="round" />
    </>
  ),
  traje: (
    <>
      <path d="M4 8.5C4 5.9 6.7 4 10 4s6 1.9 6 4.5c0 3.4-2.7 6.5-6 6.5S4 11.9 4 8.5z" />
      <path d="M6.6 9.2h2.1M11.3 9.2h2.1" strokeLinecap="round" strokeWidth="2" />
    </>
  ),
  guardado: (
    <>
      <path d="M4 4.8h9.2L16 7.6v7.6H4z" />
      <path d="M7 4.8v3.6h5V4.8M7 15.2v-3.4h6v3.4" />
    </>
  ),
};

const FLECHAS = {
  arriba: "M10 6l4 5H6z",
  abajo: "M10 14l-4-5h8z",
  izq: "M6 10l5-4v8z",
  der: "M14 10l-5 4V6z",
};

export default function Controles({
  copy,
  capitulo,
  tituloCapitulo,
  distrito,
  distritoFoco,
  dia,
  dias,
  bloque,
  rango,
  dinero,
  masInteresado,
  mision,
  entradaRef,
  puedeAccion,
  etiquetaAccion,
  onAccion,
  onPanel,
  panel,
}) {
  const pulsar = (dir, valor) => (evento) => {
    evento.preventDefault();
    if (entradaRef?.current) entradaRef.current[dir] = valor;
  };

  return (
    <div className="fg-controles">
      {/* ── La cinta: el hilo narrativo, donde antes estaba la lista ───────────── */}
      <div className="fg-cinta">
        <div className="fg-cinta__hilo">
          <span className="fg-cinta__cap">
            {copy.ui?.capitulo ?? "Capítulo"} {capitulo}
          </span>
          <span className="fg-cinta__titulo">{tituloCapitulo}</span>
        </div>
        <div className="fg-cinta__lugar">
          <svg viewBox="0 0 20 20" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M10 18s6-5.4 6-9.6A6 6 0 0 0 4 8.4C4 12.6 10 18 10 18z" />
            <circle cx="10" cy="8.4" r="2" />
          </svg>
          <span>{copy.distritos?.[distrito] ?? distrito}</span>
          {/* Hacia dónde apunta el capítulo. Es la única brújula, y es deliberadamente
              suave: dice el barrio, nunca la puerta concreta. */}
          {distritoFoco && distritoFoco !== distrito && (
            <span className="fg-cinta__foco">→ {copy.distritos?.[distritoFoco] ?? distritoFoco}</span>
          )}
        </div>
        <div className="fg-cinta__reloj">
          <span>{copy.ui?.dia ?? "Día"} {dia}/{dias}</span>
          <strong data-bloque={bloque}>{copy.bloques?.[bloque] ?? bloque}</strong>
        </div>
      </div>

      {mision && (
        <div className={`fg-mision ${mision.here ? "fg-mision--aqui" : ""}`}>
          <span className="fg-mision__icono" aria-hidden="true">{mision.here ? "◆" : "➜"}</span>
          <span className="fg-mision__texto">
            <small>{copy.ui?.siguienteMision ?? "Siguiente misión"}</small>
            <strong>{mision.title}</strong>
            <span>{mision.instruction}</span>
          </span>
          <span className="fg-mision__destino">
            {mision.here ? (copy.ui?.estasAqui ?? "Estás aquí") : (copy.distritos?.[mision.district] ?? mision.district)}
          </span>
        </div>
      )}

      {/* ── Lo que de verdad cambia mientras paseas ───────────────────────────── */}
      {/**
        * AQUÍ ESTABAN CARGA Y COMPOSTURA, y estaban mal.
        *
        * Son recursos de DUELO: `game.js` las rellena al abrir cada duelo y no las
        * arrastra entre uno y otro, así que paseando por Marés se verían dos barras llenas
        * al 100% durante ocho horas de campaña. Una barra que nunca se mueve no informa,
        * ocupa. Lo que sí cambia mientras andas es el Rango —lo que Marés cree saber de ti,
        * y que arrastra consigo el interés de Sabater— y el dinero.
        */}
      <div className="fg-estado">
        <span className="fg-estado__dato">
          <span className="fg-estado__et">{copy.recursos?.rango ?? "Rango"}</span>
          <strong>{rango}</strong>
        </span>
        <span className="fg-estado__dato">
          <span className="fg-estado__et">{copy.recursos?.dinero ?? "Dinero"}</span>
          <strong>{dinero}</strong>
        </span>
        {/* Quién está mirando más. El Pilar 1 dice que el secreto no es un medidor sino un
            reparto; esto es la punta de ese reparto, y es lo único de la sospecha que cabe
            en una línea. El expediente entero está a un botón. */}
        {masInteresado && (
          <span className="fg-estado__ojo" title={copy.expedientes?.interes ?? "Interés"}>
            <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M2 10s3.2-5 8-5 8 5 8 5-3.2 5-8 5-8-5-8-5z" />
              <circle cx="10" cy="10" r="2.2" />
            </svg>
            <span>{masInteresado.nombre}</span>
          </span>
        )}
      </div>
      {/* ── El mando ───────────────────────────────────────────────────────────── */}
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
          {/* El botón de acción se APAGA con su motivo en vez de desaparecer, que es la misma
              regla que el menú de duelo aplica a las técnicas: esconder una opción es
              esconder información, y este juego trata de información. */}
          <button
            type="button"
            className="fg-boton-accion"
            disabled={!puedeAccion}
            onClick={onAccion}
          >
            <span className="fg-boton-accion__letra">A</span>
            <span className="fg-boton-accion__texto">
              {puedeAccion ? etiquetaAccion : (copy.ui?.nadaCerca ?? "—")}
            </span>
          </button>

          <div className="fg-atajos">
            {[
              ["mapa", "ruta", copy.ui?.mapa ?? "Mapa"],
              ["expedientes", "expediente", copy.ui?.expedientes],
              ["traje", "mascara", copy.ui?.traje],
              ["guardado", "guardar", copy.ui?.guardar],
            ].map(([id, icono, etiqueta]) => (
              <button
                key={id}
                type="button"
                className={`fg-atajo ${panel === id ? "fg-atajo--activo" : ""}`}
                onClick={() => onPanel(panel === id ? null : id)}
                title={etiqueta}
                aria-label={etiqueta}
                aria-pressed={panel === id}
              >
                <svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                  {GLIFOS[id]}
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
