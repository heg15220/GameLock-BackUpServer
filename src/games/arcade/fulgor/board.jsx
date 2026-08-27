/**
 * El panel inferior: lo que decides (§11.1).
 *
 * LA PROMESA QUE ESTE ARCHIVO TIENE QUE CUMPLIR es la del §5.5: cada técnica lleva su coste
 * de Carga, su afinidad y **su icono de visibilidad de 0 a 3 puntitos, siempre visible antes
 * de elegir**. "El jugador nunca se delata sin saber que se estaba delatando" es una promesa
 * de interfaz, no de motor, y se rompe aquí o no se rompe.
 *
 * Y LA SEGUNDA: una opción que no se puede usar se muestra APAGADA CON SU MOTIVO, nunca
 * escondida. "No te llega la Carga" y "esto necesita concentración y estás roto" son
 * información distinta, y en un juego cuyo tema es la gestión de información, esconderla
 * sería una contradicción de diseño.
 *
 * El orden de los grupos es el del §5.5 y no se toca: básicas, técnicas, entorno, contener.
 */

import React from "react";
import { Icon, VisibilityDots } from "./icons.jsx";
import { actionMenu, composureTier, maxCarga, maxCompostura, successChance } from "./duel.js";
import { availableActions } from "./calendar.js";
import { cluesToClose, disclose } from "./suspicion.js";
import { describeSlot } from "./suit.js";
import { fillTemplate } from "./copy.js";
import { SUIT_SLOTS } from "./tables.js";

/* ── Las dos barras (§5.2) ───────────────────────────────────────────────────────── */

/**
 * Composure prints its RUNG, not just its number. §11.5 forbids saying anything with colour
 * alone, and here it matters twice over: the rung is the actual game state — which families
 * are locked, how much extra visibility everything carries — so a player who can only see the
 * bar shrinking is missing the rule.
 */
export function Meters({ heroe, copy, dif }) {
  if (!heroe) return null;
  const cargaMax = maxCarga(heroe.stats, heroe.bonoCargaTraje ?? 0);
  const composturaMax = maxCompostura(heroe.stats);
  const escalon = composureTier(heroe.compostura, dif);

  return (
    <div className="fg-meters">
      <div className="fg-meter fg-meter--carga">
        <Icon nombre="carga" tamano={14} titulo={copy.recursos.carga} />
        <span className="fg-meter__track">
          <span className="fg-meter__fill" style={{ width: `${Math.round((heroe.carga / cargaMax) * 100)}%` }} />
        </span>
        <span>{Math.round(heroe.carga)}</span>
      </div>
      <div className="fg-meter fg-meter--compostura" data-escalon={escalon.id}>
        <Icon nombre="compostura" tamano={14} titulo={copy.recursos.compostura} />
        <span className="fg-meter__track">
          <span className="fg-meter__fill" style={{ width: `${Math.round((heroe.compostura / composturaMax) * 100)}%` }} />
        </span>
        <span>{Math.round(heroe.compostura)}</span>
      </div>
    </div>
  );
}

/* ── El menú de duelo (§5.5) ─────────────────────────────────────────────────────── */

const GRUPOS = ["basica", "tecnica", "entorno", "contener"];
const ETIQUETA_GRUPO = {
  basica: "basicas",
  tecnica: "tecnicasMenu",
  entorno: "entorno",
  contener: "contener",
};

export function DuelMenu({ duelo, escenario, copy, dif, onAccion }) {
  if (!duelo) return null;
  const nodo = escenario?.nodos.find((n) => n.id === duelo.nodo) ?? null;
  const entradas = actionMenu(duelo.heroe, { nodo, dif });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Meters heroe={duelo.heroe} copy={copy} dif={dif} />

      {GRUPOS.map((grupo) => {
        const delGrupo = entradas.filter((a) => a.fuente === grupo);
        if (!delGrupo.length) return null;
        return (
          <section key={grupo}>
            <h3 className="fg-tiny fg-muted fg-display fg-display--sm" style={{ marginBottom: 4 }}>
              {copy.duelo[ETIQUETA_GRUPO[grupo]]}
            </h3>
            <div className="fg-commands">
              {delGrupo.map((a) => (
                <CommandButton
                  key={a.id}
                  accion={a}
                  duelo={duelo}
                  nodo={nodo}
                  copy={copy}
                  dif={dif}
                  onAccion={onAccion}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/**
 * One command. Everything the player needs to judge the trade is on the face of it BEFORE
 * the press: the name, the Charge it costs, the odds it lands, and the visibility dots.
 *
 * The odds are shown because a game about managing information cannot be coy about its own
 * arithmetic (§5.4). The dots are shown because the alternative is betraying the player.
 */
function CommandButton({ accion, duelo, nodo, copy, dif, onAccion }) {
  const nombre = accion.fuente === "tecnica"
    ? copy.tecnicas[accion.id]
    : accion.fuente === "entorno"
      ? copy.duelo.entornoAcciones[accion.id]
      : copy.duelo[accion.id];

  const { p } = successChance({ accion, atacante: duelo.heroe, defensor: duelo.rival, nodo, dif });
  const motivo = accion.motivo
    ? accion.motivo === "carga" ? copy.duelo.sinCarga
      : accion.motivo === "compostura" ? copy.duelo.bloqueadaCompostura
        : copy.duelo.agotada
    : null;

  return (
    <button
      type="button"
      className="fg-command"
      data-afinidad={accion.afinidad ?? undefined}
      disabled={!accion.disponible}
      onClick={() => onAccion?.(accion.id)}
      title={accion.fuente === "tecnica" ? copy.tecnicasAyuda[accion.id] : undefined}
    >
      <span className="fg-command__nombre">{nombre ?? accion.id}</span>
      <span className="fg-command__meta">
        {accion.carga > 0 && (
          <>
            <Icon nombre="carga" tamano={11} />
            <span>{accion.carga}</span>
          </>
        )}
        <span>{fillTemplate(copy.duelo.probabilidad, { p: Math.round(p * 100) })}</span>
        <VisibilityDots
          nivel={accion.visibilidadReal}
          etiqueta={accion.visibilidadReal === 0 ? copy.duelo.visibilidadNula : copy.duelo.visibilidad}
        />
      </span>
      {motivo && <span className="fg-tiny fg-muted">{motivo}</span>}
    </button>
  );
}

/* ── El menú de bloque (§7.2) ────────────────────────────────────────────────────── */

/**
 * Nine actions, three of them legal at any given moment. An illegal one prints WHY rather
 * than vanishing: "you can't patrol in the morning" is a rule the player should learn once
 * and never be puzzled by again.
 */
export function BlockMenu({ calendario, copy, onAccion, distritos = [] }) {
  const acciones = availableActions(calendario, { distritosAbiertos: distritos });
  const bloque = acciones[0]?.bloque;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="fg-tiny fg-muted" style={{ display: "flex", justifyContent: "space-between" }}>
        <span>{fillTemplate(copy.diaDe, { dia: calendario.dia, total: calendario.diasDelCapitulo })}</span>
        <strong>{copy.bloques[bloque]}</strong>
      </div>
      <div className="fg-commands">
        {acciones.map((a) => (
          <button
            key={a.id}
            type="button"
            className="fg-command"
            disabled={!a.disponible}
            onClick={() => onAccion?.(a.id)}
            title={copy.accionesAyuda[a.id]}
          >
            <span className="fg-command__nombre">
              <Icon nombre={a.id} tamano={13} /> {copy.acciones[a.id]}
            </span>
            <span className="fg-tiny fg-muted">
              {a.disponible ? copy.accionesAyuda[a.id] : fillTemplate(copy.bloqueNoDisponible, { bloque: copy.bloques[a.bloque] })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── El panel de expedientes (§3, §10) ───────────────────────────────────────────── */

/**
 * WHAT THIS PANEL IS ALLOWED TO SAY IS A RULE, NOT A RENDERING CHOICE, and it is decided in
 * `suspicion.disclose` — three modes, three answers (§10.2-§10.4). This component prints
 * whatever it is handed and never reaches past it for more, which is what makes Sin máscara's
 * "no sabes lo cerca que estás hasta que ocurre" actually true instead of merely styled.
 */
export function DossierPanel({ sospecha, copy, dif }) {
  const filas = disclose(sospecha, { dif });
  if (!filas.length) return <p className="fg-tiny fg-muted">{copy.ui.sinDatos}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p className="fg-tiny fg-muted">{copy.expediente.intro}</p>
      {filas.map((fila) => (
        <article key={fila.id} className="fg-dossier">
          <header className="fg-dossier__head">
            <span className="fg-dossier__nombre">{copy.personajes[fila.id]}</span>
            {fila.estado && (
              <span className="fg-estado" data-estado={fila.estado}>
                <Icon nombre={fila.estado} tamano={11} />
                {copy.estados[fila.estado]}
              </span>
            )}
          </header>

          <p className="fg-tiny">
            {fila.pistas === 0
              ? copy.expediente.sinPistas
              : fila.pistas === 1
                ? copy.expediente.pistasUna
                : fillTemplate(copy.expediente.pistas, { n: fila.pistas })}
            {/* Sólo Leyenda urbana dice cuántas faltan (§10.2). */}
            {fila.faltan !== undefined && fila.faltan > 0 && (
              <> · {fila.faltan === 1 ? copy.expediente.faltaUna : fillTemplate(copy.expediente.faltan, { n: fila.faltan })}</>
            )}
          </p>

          {fila.detalle?.map((pista) => (
            <p key={pista.id} className="fg-clue" data-tipo={pista.tipo}>
              <Icon nombre={pista.tipo} tamano={13} titulo={copy.pistas[pista.tipo]} />
              <span>{copy.pistaOrigen[pista.origen] ?? copy.pistasAyuda[pista.tipo]}</span>
            </p>
          ))}

          {fila.avisoObsesivo && (
            <p className="fg-tiny" style={{ color: "var(--fg-heroe-peligro)" }}>
              {fillTemplate(copy.expediente.avisoObsesivo, { quien: copy.personajes[fila.id] })}
            </p>
          )}
        </article>
      ))}
      {!filas[0]?.estado && <p className="fg-tiny fg-muted">{copy.expediente.sinAvisos}</p>}
    </div>
  );
}

/* ── El taller (§6) ──────────────────────────────────────────────────────────────── */

/**
 * Every slot prints what it GIVES and what it COSTS, because §6.1 is a table of trades and a
 * workshop screen that only showed the gains would be lying about the game.
 */
export function WorkshopPanel({ traje, materiales, copy, onReparar }) {
  if (!traje) return <p className="fg-tiny fg-muted">{copy.ui.sinDatos}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="fg-tiny fg-muted" style={{ display: "flex", justifyContent: "space-between" }}>
        <strong>{copy.generaciones[traje.generacion]}</strong>
        <span>{copy.generacionesAyuda[traje.generacion]}</span>
      </div>

      <div className="fg-slots">
        {SUIT_SLOTS.map((slot) => {
          const d = describeSlot(traje, slot);
          return (
            <button
              key={slot}
              type="button"
              className="fg-slot"
              data-banda={d.banda}
              onClick={() => onReparar?.(slot)}
              title={copy.ranurasAyuda[slot]}
            >
              <img
                className="fg-slot__art"
                src={`/assets/fulgor/suits/${traje.generacion}/${slot}.svg`}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
              <span className="fg-tiny" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Icon nombre={slot} tamano={13} />
                <strong>{copy.ranuras[slot]}</strong>
                <span className="fg-muted" style={{ marginLeft: "auto" }}>{d.integridad}</span>
              </span>
              <span className="fg-slot__bar">
                <span className="fg-slot__fill" style={{ width: `${d.integridad}%` }} />
              </span>
              <span className="fg-tiny fg-muted">
                {d.dejaFragmentos
                  ? copy.trajeUI.dejaFragmentos
                  : d.banda === "destruida"
                    ? copy.trajeUI.destruida
                    : d.reconocible
                      ? copy.trajeUI.reconocible
                      : copy.ranurasAyuda[slot]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="fg-tiny fg-muted" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {Object.entries(materiales ?? {}).map(([m, n]) => (
          <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
            <img className="fg-material-art" src={`/assets/fulgor/materials/${m}.svg`} alt={copy.materiales[m]} draggable="false" />
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── El balance (§4.5) ───────────────────────────────────────────────────────────── */

/**
 * Note what is not here: a retry button. §4.5 is explicit that a failed Intervention is not
 * repeated — it changes the chapter and the story carries on. The player can always reload a
 * save, that is his business, but the game never puts the offer in front of him, because
 * offering it would turn every failure into paperwork.
 */
export function BalancePanel({ balance, copy, onContinuar }) {
  if (!balance) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 className="fg-display fg-display--lg" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon nombre={balance.grado} tamano={22} />
        {copy.resultados[balance.grado]}
      </h2>
      <p className="fg-tiny">{copy.resultadosAyuda[balance.grado]}</p>

      <dl className="fg-tiny fg-mono" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "2px 8px" }}>
        <dt>{copy.intervencion.objetivosOpcionales}</dt>
        <dd>{balance.opcionalesCumplidos}/{balance.opcionalesTotales}</dd>
        <dt>{copy.recursos.rango}</dt>
        <dd>{balance.rango >= 0 ? `+${balance.rango}` : balance.rango}</dd>
        <dt>{copy.intervencion.reloj}</dt>
        <dd>{balance.turnosUsados}/{balance.turnosDisponibles}</dd>
      </dl>

      <button type="button" className="fg-btn fg-btn--primary" onClick={onContinuar}>
        {copy.ui.siguiente}
      </button>
    </div>
  );
}

/* ── La emergencia (§7.2) ────────────────────────────────────────────────────────── */

/** Accepting cancels whatever you were going to do. Refusing costs the city. Both are real. */
export function EmergencyPanel({ emergencia, copy, onAceptar, onRechazar }) {
  if (!emergencia) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 className="fg-display fg-display--sm">{copy.intervencion.titulo}</h2>
      <p className="fg-tiny">{copy.distritos[emergencia.distrito]}</p>
      <p className="fg-tiny fg-muted">{copy.distritosAyuda[emergencia.distrito]}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="fg-btn fg-btn--primary" style={{ flex: 1 }} onClick={onAceptar}>
          {copy.ui.aceptar}
        </button>
        <button type="button" className="fg-btn fg-btn--ghost" style={{ flex: 1 }} onClick={onRechazar}>
          {copy.ui.cancelar}
        </button>
      </div>
    </div>
  );
}

/* ── La Intervención fuera del duelo ─────────────────────────────────────────────── */

/** Between duels, the board is a legend for the map above it, plus the one way out. */
export function InterventionPanel({ escenario, copy, onSalir }) {
  if (!escenario) return null;
  const opcionales = escenario.objetivos.filter((o) => !o.principal);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p className="fg-tiny fg-muted">{copy.intervencion.arrastraRuta}</p>

      <div className="fg-tiny" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="fg-route fg-route--visible" style={{ width: 16, borderTop: "3px solid currentColor" }} />
          {copy.intervencion.rutaVisible}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span className="fg-route fg-route--sombra" style={{ width: 16, borderTop: "3px dashed currentColor" }} />
          {copy.intervencion.rutaSombra}
        </span>
      </div>

      {opcionales.length > 0 && (
        <div className="fg-tiny">
          <strong>{copy.intervencion.objetivosOpcionales}</strong>
          <ul style={{ margin: "3px 0 0", paddingLeft: 16 }}>
            {opcionales.map((o) => (
              <li key={o.id} style={{ opacity: o.cumplido ? 0.45 : 1 }}>{copy.objetivos[o.tipo]}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="fg-tiny fg-muted" style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <Icon nombre="testigo" tamano={12} />
        {escenario.testigos.length
          ? escenario.testigos.map((t) => copy.personajes[t.id] ?? t.id).join(" · ")
          : copy.intervencion.sinTestigos}
      </div>

      <button type="button" className="fg-btn fg-btn--ghost" onClick={onSalir}>
        {copy.intervencion.salir}
      </button>
    </div>
  );
}

export default DuelMenu;
