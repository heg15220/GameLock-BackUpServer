/**
 * FULGOR — el mundo en pantalla.
 *
 * Este componente es la bisagra entre la simulación pura y React, y su única regla es que
 * la bisagra NO deja pasar nada: `sim.js` no sabe que React existe, React no sabe cómo se
 * resuelve una colisión.
 *
 * LA DECISIÓN QUE HACE QUE ESTO NO SE ATRAGANTE: el estado del mundo vive en un `useRef`,
 * no en un `useState`. Sesenta veces por segundo cambia la posición del héroe, y sesenta
 * re-renderizados de React por segundo para repintar un canvas que React no toca serían
 * cincuenta y nueve de más. React sólo se entera de lo que le importa —con quién se puede
 * hablar, qué salida se está pisando— y eso cambia dos veces por minuto, no sesenta veces
 * por segundo.
 *
 * EL PASO ES FIJO Y EL RELOJ NO. Se acumula el tiempo real y se consume en pasos de 1/60,
 * porque una simulación atada al tiempo real hace que la física dependa de la potencia del
 * aparato: en un móvil lento el héroe atravesaría paredes finas al saltarse la comprobación
 * intermedia. Con paso fijo, el juego es el mismo en todas partes.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";

import { VISTA, compilar } from "./maps.js";
import { crearTaller, pintar } from "./render.js";
import { createWorld, interlocutor, situar, step } from "./sim.js";

const PASO = 1 / 60;
/** 832×672 internos: suficiente para escritorio y HiDPI sin interpolar un lienzo pequeño. */
const CALIDAD_CANVAS = 4;
/** Tope de tiempo consumido por fotograma. Sin él, volver de una pestaña en segundo plano
 *  dispara un salto de veinte segundos y el héroe aparece en la otra punta del mapa. */
const MAX_ACUMULADO = 0.25;

const TECLAS = {
  ArrowUp: "arriba", ArrowDown: "abajo", ArrowLeft: "izq", ArrowRight: "der",
  w: "arriba", s: "abajo", a: "izq", d: "der",
  W: "arriba", S: "abajo", A: "izq", D: "der",
};

/**
 * @param {object} props
 * @param {string} props.distrito       distrito activo
 * @param {string} props.bloque         manana | tarde | noche, de `calendar.js`
 * @param {string} props.clima
 * @param {object} props.trajes         { [idPersonaje]: piezas } — el de Dani sale del taller
 * @param {(id: string) => void} props.onHablar
 * @param {(destino: string) => void} props.onSalir
 * @param {boolean} props.congelado     true mientras hay un diálogo abierto
 */
export default function Mundo({
  distrito,
  bloque = "tarde",
  clima = "despejado",
  trajes = {},
  modoFulgor = false,
  congelado = false,
  desde = null,
  entradaRef: entradaExterna,
  onCerca,
  onHablar,
  onLugar,
  onSalir,
}) {
  const canvasRef = useRef(null);
  const tallerRef = useRef(null);
  const mundoRef = useRef(null);
  /**
   * La entrada puede venir de fuera, y normalmente viene: la cruceta está en la pantalla de
   * ABAJO, que es otro componente. Si no la pasan —en un test, o montando el mundo suelto—
   * se crea una propia, para que este componente siga siendo jugable por sí mismo.
   */
  const entradaPropia = useRef({ arriba: false, abajo: false, izq: false, der: false, correr: false });
  const entradaRef = entradaExterna ?? entradaPropia;
  const opcionesRef = useRef({ bloque, clima, trajes, modoFulgor, congelado });

  // Lo único que React necesita saber del mundo: qué tengo delante.
  const cercaRef = useRef(null);

  const onCercaRef = useRef(onCerca);
  onCercaRef.current = onCerca;

  opcionesRef.current = { bloque, clima, trajes, modoFulgor, congelado };

  /* ── Montaje del distrito ──────────────────────────────────────────────────────── */

  useLayoutEffect(() => {
    if (!tallerRef.current) tallerRef.current = crearTaller();
    const mapa = compilar(distrito);
    if (!mapa) return;

    let estado = createWorld(mapa);
    // Si venimos de otro distrito, entramos por SU puerta, no por el punto de partida del
    // capítulo: llegar a La Concha desde el instituto y aparecer en la plaza central sería
    // teletransporte, y el jugador pierde el mapa mental que el §1.1 quiere que construya.
    const puerta = desde ? mapa.entradas?.[desde] : null;
    estado = puerta ? situar(estado, puerta) : situar(estado, mapa.spawn);
    mundoRef.current = estado;
    cercaRef.current = null;
    onCercaRef.current?.(null);
  }, [distrito, desde]);

  /* ── Entrada ───────────────────────────────────────────────────────────────────── */

  /**
   * UN SOLO GESTO PARA TODO, que es el molde de la DS: el mismo botón habla con quien
   * tienes delante, entra por la puerta que pisas y sube a tu casa. El orden importa —
   * la persona gana al sitio— porque plantarse a hablar con alguien encima de una salida
   * y que el juego te saque del distrito sería el peor fallo posible de esta pantalla.
   */
  const interactuar = useCallback(() => {
    const estado = mundoRef.current;
    if (!estado || opcionesRef.current.congelado) return;
    const quien = interlocutor(estado);
    if (quien) {
      onHablar?.(quien.id);
      return;
    }
    const disparador = estado.disparador;
    if (disparador?.tipo === "salida") onSalir?.(disparador.destino);
    else if (disparador?.tipo === "lugar") onLugar?.(disparador);
  }, [onHablar, onLugar, onSalir]);

  // El botón A de la pantalla de abajo dispara esto. Se cuelga del propio objeto de entrada
  // para no tener que pasar una segunda referencia entre las dos mitades de la consola.
  entradaRef.current.accionar = interactuar;

  useEffect(() => {
    const abajo = (e) => {
      if (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        interactuar();
        return;
      }
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
    // Al perder el foco se sueltan todas las teclas. Sin esto, cambiar de pestaña mientras
    // se anda deja al héroe caminando solo contra una pared para siempre.
    // Se apagan las CLAVES, no se sustituye el objeto: la pantalla de abajo escribe en ese
    // mismo objeto y le tiene colgado su `accionar`. Cambiarlo por uno nuevo dejaba el
    // botón A sin nada que llamar en cuanto el juego perdía el foco una sola vez.
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
  }, [interactuar]);

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
      let estado = mundoRef.current;
      if (estado) {
        while (acumulado >= PASO) {
          estado = step(estado, {
            entrada: entradaRef.current,
            dt: PASO,
            congelado: opciones.congelado,
          });
          acumulado -= PASO;
        }
        mundoRef.current = estado;

        // Sólo se avisa a React cuando CAMBIA lo que se tiene delante. Sesenta veces por
        // segundo se recalcula; dos veces por minuto se cuenta.
        const quien = opciones.congelado ? null : interlocutor(estado);
        const d = opciones.congelado ? null : estado.disparador;
        const foco = quien
          ? { tipo: "npc", id: quien.id }
          : d?.tipo === "salida" ? { tipo: "salida", id: d.destino }
          : d?.tipo === "lugar" ? { tipo: "lugar", id: d.id }
          : null;
        const firma = foco ? `${foco.tipo}:${foco.id}` : "";
        if (firma !== cercaRef.current) {
          cercaRef.current = firma;
          onCercaRef.current?.(foco);
        }

        pintar(ctx, tallerRef.current, estado, {
          bloque: opciones.bloque,
          clima: opciones.clima,
          trajes: opciones.trajes,
          modoFulgor: opciones.modoFulgor,
          resaltado: quien?.id ?? null,
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
  }, []);

  return (
    <div className="fg-mundo">
      <canvas
        ref={canvasRef}
        className="fg-mundo__lienzo"
        width={VISTA.w * CALIDAD_CANVAS}
        height={VISTA.h * CALIDAD_CANVAS}
        role="img"
        aria-label={`Marés — ${distrito}`}
      />
    </div>
  );
}
