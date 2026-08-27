/**
 * El panel superior: lo que ves (§11.1).
 *
 * Nunca lo que decides — eso es `board.jsx`. La bisagra separa las dos cosas y este archivo
 * respeta esa separación: aquí no hay ni un `onClick` que cambie el estado del juego salvo
 * el arrastre de ruta, que es el gesto del stylus de la DS y el único acto que ocurre
 * físicamente sobre la escena (§4.2).
 *
 * SVG Y NO CANVAS. §14.2 dice canvas 2D, y para un juego con partículas tendría razón. Este
 * dibuja de seis a catorce círculos, unas cuantas líneas y dos siluetas, y se redibuja por
 * eventos y no en bucle. En SVG eso sale gratis, hereda las variables CSS de las dos paletas
 * sin una sola línea de código de color, es accesible por nodo y se puede inspeccionar. Un
 * canvas obligaría a reimplementar el tema, el foco y el hit-testing a mano.
 *
 * NO HAY TEXTO ESCRITO AQUÍ. Todo pasa por `copy` (§13.1).
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { Icon } from "./icons.jsx";
import { Portrait, Silhouette } from "./portraits.jsx";
import { adjacency, cheapestRoute, nextEscalation, routeVisibility } from "./intervention.js";
import { TECHNIQUES } from "./tables.js";

const VIEW = { w: 200, h: 130 };
const districtAsset = (id = "aguas") => `/assets/fulgor/districts/${id}.png`;
const techniqueAsset = (id) => `/assets/fulgor/techniques/${id}.svg`;

/**
 * AQUÍ VIVÍA EL GRAFO, y se ha ido entero.
 *
 * `layoutNodes` repartía los nodos de `intervention.js` en columnas por rango y `NodeMap`
 * los pintaba como circunferencias unidas por líneas de puntos sobre el PNG del distrito,
 * con la visibilidad de cada sitio expresada como el GROSOR DEL ANILLO, y la ruta se
 * elegía arrastrando el dedo. Era el diagrama interno del juego puesto delante del jugador.
 *
 * Lo sustituye `world/Intervencion.jsx`: el mismo distrito que se pisa en la mitad civil,
 * de noche, con los testigos de pie y sus conos de luz caídos en el suelo. El grafo sigue
 * existiendo —es lo que cobra el reloj— pero debajo del pavimento, y quien lo aterriza
 * sobre la rejilla del mapa es `world/escenario.js`.
 */

/* ── El corte de cámara ──────────────────────────────────────────────────────────── */

/**
 * El 80% de la identidad del juego (§1.4). Dos segundos de cámara que convierten una tirada
 * de dados en un momento de anime.
 *
 * Cinco plantillas parametrizadas por color, silueta y nombre, más las ocho insignia (§16.1).
 * Se puede saltar con un toque, y en 8 horas eso no es una comodidad: es diseño (§11.5).
 */
export function TechniqueCut({ tecnicaId, copy, onSaltar }) {
  const tech = TECHNIQUES[tecnicaId];
  if (!tech) return null;
  return (
    <div
      className="fg-cut"
      data-afinidad={tech.afinidad}
      onPointerDown={onSaltar}
      role="button"
      tabIndex={0}
      aria-label={copy.ui.saltar}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSaltar?.()}
    >
      <div className="fg-cut__lineas" aria-hidden="true" />
      <img className="fg-cut__art" src={techniqueAsset(tecnicaId)} alt="" aria-hidden="true" />
      <Silhouette id="dani" altura={120} brillo />
      <span className="fg-cut__nombre">{copy.tecnicas[tecnicaId]}</span>
      <span className="fg-tiny fg-muted">{copy.ui.saltar}</span>
    </div>
  );
}

/* ── Escenas de diálogo ──────────────────────────────────────────────────────────── */

/**
 * A portrait and a line. `expresion` comes from the scene rather than from the character, so
 * the same twelve shared shapes of `portraits.jsx` carry the whole emotional range without a
 * single bespoke drawing.
 */
export function SceneText({ quien = null, texto, expresion = "neutro", variante = "civil", copy, distrito = "aguas" }) {
  return (
    <div className="fg-scene fg-scene--illustrated" style={{ "--fg-scene-art": `url(${districtAsset(distrito)})` }}>
      {quien && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <Portrait id={quien} expresion={expresion} tamano={72} variante={variante} titulo={copy.personajes[quien]} />
          <span className="fg-scene__quien">{copy.personajes[quien]}</span>
        </div>
      )}
      <p className="fg-scene__linea">{texto}</p>
    </div>
  );
}

/* ── La cabecera de la Intervención ──────────────────────────────────────────────── */

/**
 * El reloj no es un cronómetro de fracaso: es un medidor de agravamiento (§4.1). Por eso lo
 * que se imprime no es el tiempo que queda, sino QUÉ VA A EMPEORAR en el siguiente turno.
 * Un reloj que el jugador no puede leer es un castigo.
 */
export function InterventionHeader({ escenario, copy }) {
  if (!escenario) return null;
  const quedan = Math.max(0, escenario.reloj.max - escenario.reloj.turno);
  const siguiente = nextEscalation(escenario);
  const principal = escenario.objetivos.find((o) => o.principal);

  return (
    <div className="fg-tiny" style={{ display: "flex", flexDirection: "column", gap: 3, padding: "6px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon nombre="reloj" tamano={13} />
        <strong>{quedan === 1 ? copy.intervencion.turnoUno : copy.intervencion.turnos.replace("{n}", quedan)}</strong>
        <span className="fg-muted" style={{ marginLeft: "auto" }}>{copy.distritos[escenario.distrito]}</span>
      </div>
      {principal && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Icon nombre="nodo" tamano={13} />
          <span>{copy.objetivos[principal.tipo]}</span>
        </div>
      )}
      {siguiente && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--fg-heroe-peligro)" }}>
          <Icon nombre="fallido" tamano={13} />
          <span>{copy.intervencion.vaAEmpeorar.replace("{que}", copy.agravamientos[siguiente.id] ?? "")}</span>
        </div>
      )}
    </div>
  );
}

/* ── El escenario del duelo ──────────────────────────────────────────────────────── */

/** Two silhouettes facing each other, and nothing else. At 352 px that is the whole picture. */
export function DuelStage({ duelo, copy, corte = null, onSaltarCorte, distrito = "puerto" }) {
  if (!duelo) return null;
  return (
    <div className="fg-duel-stage" style={{ "--fg-scene-art": `url(${districtAsset(distrito)})` }}>
      <Silhouette id="dani" altura={104} brillo variante="heroe" />
      <span className="fg-display fg-display--sm fg-muted" style={{ alignSelf: "center" }}>
        {copy.duelo.titulo}
      </span>
      <Silhouette id={duelo.rival?.id ?? "chapa"} altura={104} variante="heroe" />
      {corte && <TechniqueCut tecnicaId={corte} copy={copy} onSaltar={onSaltarCorte} />}
    </div>
  );
}

/* ── El epílogo ──────────────────────────────────────────────────────────────────── */

/** Seven endings, none of them ordered and none of them labelled (§9.1, §17). */
export function Epilogue({ final, copy }) {
  if (!final) return null;
  return (
    <div className="fg-scene" style={{ justifyContent: "center", height: "100%" }}>
      <h2 className="fg-display fg-display--lg">{copy.finales[final.id]}</h2>
      <p className="fg-scene__linea">{copy.finalesTexto[final.id]}</p>
    </div>
  );
}

/* ── El despachador ──────────────────────────────────────────────────────────────── */

/** One switch, so `index.jsx` never has to know which picture belongs to which phase. */
export function Stage({ fase, escenario, duelo, final, escena, copy, velocidad, onMover, corte, onSaltarCorte, variante, capitulo = 1, distrito = "aguas" }) {
  switch (fase) {
    case "duelo":
      return <DuelStage duelo={duelo} copy={copy} corte={corte} onSaltarCorte={onSaltarCorte} distrito={escenario?.distrito ?? distrito} />;
    // "intervencion" ya NO se pinta aquí. Este caso montaba <NodeMap>: el grafo de
    // `intervention.js` dibujado literalmente —círculos y líneas de puntos sobre una foto—
    // con la visibilidad como grosor de anillo. Lo sustituye <Intervencion>, que camina el
    // mismo distrito que la mitad civil del juego. Ver `world/escenario.js`.
    case "epilogo":
      return <Epilogue final={final} copy={copy} />;
    case "escena":
      return <SceneText {...escena} copy={copy} variante={variante} distrito={distrito} />;
    default:
      return escena
        ? <SceneText {...escena} copy={copy} variante={variante} distrito={distrito} />
        : <ChapterBackdrop capitulo={capitulo} distrito={distrito} copy={copy} />;
  }
}

export function ChapterBackdrop({ capitulo = 1, distrito = "aguas", copy }) {
  return (
    <div className="fg-chapter-backdrop" style={{ "--fg-scene-art": `url(${districtAsset(distrito)})` }}>
      <span className="fg-chapter-backdrop__kicker">{copy.capituloN.replace("{n}", capitulo)}</span>
      <strong className="fg-display fg-display--lg">{copy.capitulos[`c${capitulo}`]}</strong>
      <span className="fg-tiny">{copy.distritos[distrito]}</span>
    </div>
  );
}

export default Stage;
