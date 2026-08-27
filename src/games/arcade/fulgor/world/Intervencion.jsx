/**
 * FULGOR — la Intervención, caminada.
 *
 * ESTA PANTALLA EXISTE PARA SUSTITUIR AL GRAFO DE CÍRCULOS.
 *
 * Lo que había: una foto del distrito con seis a catorce circunferencias blancas unidas por
 * líneas de puntos, y la visibilidad de cada sitio expresada como el GROSOR DEL ANILLO. Un
 * diagrama del propio juego, puesto delante del jugador. Se arrastraba el dedo de un
 * círculo a otro y el reloj bajaba.
 *
 * Lo que hay: el mismo distrito que se pisa en la mitad civil del juego, de noche, con el
 * reloj corriendo. Se anda. Los testigos son gente de pie con un cono de luz caído en el
 * suelo. El objetivo es una marca flotando sobre un sitio, y si está fuera de cuadro, una
 * flecha pegada al borde apuntando hacia él. No hay plano, no hay nodos, no hay líneas.
 *
 * Y NINGUNA REGLA HA CAMBIADO DE SITIO. `intervention.js` sigue llevando el grafo, el reloj
 * en turnos y el coste de cada arista; `escenario.js` lo aterriza sobre la rejilla del mapa;
 * y cuando los pies del héroe entran en el radio de un nodo distinto del suyo, se llama a
 * `game.move()` — exactamente la misma llamada que hacía el arrastre del dedo, disparada
 * por caminar. El grafo no se ha borrado: se ha escondido debajo del suelo, que es donde
 * tenía que haber estado siempre.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { VISTA, compilar } from "./maps.js";
import { crearTaller, pintar } from "./render.js";
import { createWorld, situar, step } from "./sim.js";
import { anclar, conosDeVision, nodoBajoLosPies, vistoPor } from "./escenario.js";

const PASO = 1 / 60;
const MAX_ACUMULADO = 0.25;
const CALIDAD_CANVAS = 4;

const TECLAS = {
  ArrowUp: "arriba", ArrowDown: "abajo", ArrowLeft: "izq", ArrowRight: "der",
  w: "arriba", s: "abajo", a: "izq", d: "der",
  W: "arriba", S: "abajo", A: "izq", D: "der",
};

export default function Intervencion({
  escenario,
  clima = "despejado",
  traje = null,
  congelado = false,
  entradaRef: entradaExterna,
  onLlegar,
  onVisto,
}) {
  const canvasRef = useRef(null);
  const tallerRef = useRef(null);
  const mundoRef = useRef(null);
  const entradaPropia = useRef({ arriba: false, abajo: false, izq: false, der: false, correr: false });
  const entradaRef = entradaExterna ?? entradaPropia;

  const [alerta, setAlerta] = useState(false);
  const alertaRef = useRef(false);
  /** Nodo cuya llegada ya se ha pedido al motor y está esperando confirmación. */
  const pedidoRef = useRef(null);

  /**
   * El aterrizaje se calcula UNA VEZ por escenario y se guarda.
   *
   * `anclar` recorre el mapa entero buscando sitios; hacerlo por fotograma sería repetir un
   * barrido de 768 casillas sesenta veces por segundo para obtener siempre lo mismo. El
   * escenario sólo cambia cuando empieza otra Intervención.
   */
  const montaje = useMemo(() => {
    if (!escenario) return null;
    const mapa = compilar(escenario.distrito);
    if (!mapa) return null;
    const posiciones = anclar(escenario, mapa);
    return { mapa, posiciones, conos: conosDeVision(escenario, posiciones) };
  }, [escenario]);

  const opcionesRef = useRef({ congelado, clima, traje });
  opcionesRef.current = { congelado, clima, traje };
  const escenarioRef = useRef(escenario);
  escenarioRef.current = escenario;
  const montajeRef = useRef(montaje);
  montajeRef.current = montaje;
  const onLlegarRef = useRef(onLlegar);
  onLlegarRef.current = onLlegar;
  const onVistoRef = useRef(onVisto);
  onVistoRef.current = onVisto;

  /* ── Montaje ───────────────────────────────────────────────────────────────────── */

  useLayoutEffect(() => {
    if (!montaje) return;
    if (!tallerRef.current) tallerRef.current = crearTaller();

    /**
     * Los testigos y los adversarios entran como HABITANTES del mundo, no como iconos.
     *
     * Pasan por la misma tubería ordenada por Y que Dani y que las farolas, así que un
     * testigo puede quedar delante o detrás de ti según dónde estéis, y se le puede rodear
     * por detrás. Un icono flotante no permite eso, y rodear por detrás es justamente la
     * jugada que esta pantalla existe para ofrecer.
     */
    const gente = [];
    for (const t of escenario.testigos ?? []) {
      const p = montaje.posiciones[t.nodo];
      if (p) gente.push({ id: t.id, x: p.x, y: p.y, dir: "sur", rutina: null });
    }
    for (const nodo of escenario.nodos) {
      const p = montaje.posiciones[nodo.id];
      if (!p) continue;
      if (nodo.adversario) gente.push({ id: "hierro", x: p.x + 6, y: p.y, dir: "sur", rutina: null });
      if (nodo.civil) gente.push({ id: "oscar", x: p.x - 8, y: p.y + 3, dir: "sur", rutina: null });
    }

    const mundoConGente = { ...montaje.mapa, npcs: gente };
    const entrada = montaje.posiciones[escenario.entrada] ?? montaje.mapa.spawn;
    mundoRef.current = situar(createWorld(mundoConGente), { x: entrada.x, y: entrada.y + 10, dir: "norte" });
    pedidoRef.current = null;
  }, [escenario, montaje]);

  /* ── Teclado ───────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const abajo = (e) => {
      if (e.key === "Shift") entradaRef.current.correr = true;
      const dir = TECLAS[e.key];
      if (dir) {
        e.preventDefault();
        entradaRef.current[dir] = true;
      }
    };
    const arriba = (e) => {
      if (e.key === "Shift") entradaRef.current.correr = false;
      const dir = TECLAS[e.key];
      if (dir) entradaRef.current[dir] = false;
    };
    const soltarTodo = () => {
      for (const k of ["arriba", "abajo", "izq", "der", "correr"]) entradaRef.current[k] = false;
    };
    window.addEventListener("keydown", abajo);
    window.addEventListener("keyup", arriba);
    window.addEventListener("blur", soltarTodo);
    return () => {
      window.removeEventListener("keydown", abajo);
      window.removeEventListener("keyup", arriba);
      window.removeEventListener("blur", soltarTodo);
    };
  }, [entradaRef]);

  /* ── El bucle ──────────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(CALIDAD_CANVAS, 0, 0, CALIDAD_CANVAS, 0, 0);

    let vivo = true;
    let anterior = performance.now();
    let acumulado = 0;

    const fotograma = (ahora) => {
      if (!vivo) return;
      const dt = Math.min(MAX_ACUMULADO, (ahora - anterior) / 1000);
      anterior = ahora;
      acumulado += dt;

      const opciones = opcionesRef.current;
      const esc = escenarioRef.current;
      const mont = montajeRef.current;
      let estado = mundoRef.current;

      if (estado && esc && mont) {
        while (acumulado >= PASO) {
          estado = step(estado, { entrada: entradaRef.current, dt: PASO, congelado: opciones.congelado });
          acumulado -= PASO;
        }
        mundoRef.current = estado;

        if (!opciones.congelado) {
          /**
           * EL PASO DE NODO. Al entrar en el radio de un sitio que no es el actual, el motor
           * cobra la arista. Es la única línea de este archivo que toca las reglas, y no las
           * toca: las llama.
           *
           * EL CERROJO NO ES OPCIONAL. Esto corre sesenta veces por segundo y `esc` sólo se
           * actualiza cuando React repinta: entre la llamada y el repintado caben veinte
           * fotogramas más, y sin cerrojo los veinte volvían a llamar a `move()` con el
           * mismo destino. Un paso costaba media docena de turnos y el reloj se vaciaba solo.
           */
          const pisado = nodoBajoLosPies(esc, mont.posiciones, estado.heroe);
          if (pisado && pisado !== esc.posicion && pisado !== pedidoRef.current) {
            pedidoRef.current = pisado;
            onLlegarRef.current?.(pisado);
          } else if (pisado === esc.posicion) {
            // El motor ya ha confirmado la llegada: el cerrojo se suelta para el siguiente.
            pedidoRef.current = null;
          }

          // El aviso de "te están viendo". No cobra nada —quien cobra es `exposureAt`—,
          // sólo enciende el borde de la pantalla.
          const vistos = vistoPor(mont.conos, estado.heroe.x, estado.heroe.y);
          const ahoraVisto = vistos.length > 0;
          if (ahoraVisto !== alertaRef.current) {
            alertaRef.current = ahoraVisto;
            setAlerta(ahoraVisto);
            onVistoRef.current?.(vistos);
          }
        }

        const marcas = (esc.objetivos ?? [])
          .filter((o) => !o.cumplido)
          .map((o) => ({ ...mont.posiciones[o.nodo], principal: o.principal }))
          .filter((m) => m.x !== undefined);

        pintar(ctx, tallerRef.current, estado, {
          // La Intervención es siempre de noche: es cuando sale el otro.
          bloque: "noche",
          clima: opciones.clima,
          trajes: opciones.traje ? { dani: opciones.traje } : {},
          modoFulgor: true,
          conos: mont.conos,
          marcas,
          vista: VISTA,
        });
      }
      requestAnimationFrame(fotograma);
    };

    const handle = requestAnimationFrame(fotograma);
    return () => {
      vivo = false;
      cancelAnimationFrame(handle);
    };
  }, [entradaRef]);

  const reencuadrar = useCallback(() => {
    const estado = mundoRef.current;
    if (estado) mundoRef.current = { ...estado, camara: { ...estado.camara } };
  }, []);
  useEffect(reencuadrar, [reencuadrar]);

  if (!escenario) return null;

  return (
    <div className={`fg-mundo fg-mundo--intervencion ${alerta ? "fg-mundo--visto" : ""}`}>
      <canvas
        ref={canvasRef}
        className="fg-mundo__lienzo"
        width={VISTA.w * CALIDAD_CANVAS}
        height={VISTA.h * CALIDAD_CANVAS}
        role="img"
        aria-label={`Intervención — ${escenario.distrito}`}
      />
    </div>
  );
}
