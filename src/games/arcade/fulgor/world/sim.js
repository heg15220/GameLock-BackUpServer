/**
 * FULGOR — la simulación del mundo. Pura, sin canvas y sin React.
 *
 * Aquí vive TODO lo que se puede afirmar en un test: dónde está el chaval, con qué choca,
 * a quién puede hablarle, adónde mira la cámara y qué disparador ha pisado. `render.js`
 * sólo lee este estado y lo pinta; si algo de aquí necesitara un `document`, estaría mal
 * puesto.
 *
 * CUATRO COSAS QUE MERECEN LEERSE DESPACIO:
 *
 *  - **La caja de colisión son los PIES, no el cuerpo.** Un sprite mide 16×24 pero choca
 *    con una caja de 10×7 pegada al suelo. Es la convención de todo el género cenital y no
 *    es pereza: si chocara el cuerpo entero, no podrías ponerte delante de una farola ni
 *    pasar por debajo de un balcón, y el mundo se volvería un laberinto de rectángulos
 *    invisibles a la altura de la cabeza.
 *
 *  - **Los ejes se resuelven POR SEPARADO.** Primero X contra el mapa, luego Y. Eso da
 *    gratis el deslizamiento contra la pared: entrar en diagonal en un callejón no te clava
 *    en la esquina, te desliza hacia dentro. Resolver los dos ejes a la vez produce ese
 *    agarre en las esquinas que hace que un juego se sienta barato.
 *
 *  - **El ciclo de andar avanza con la DISTANCIA recorrida, no con el tiempo.** Si avanzara
 *    con el reloj, los pies patinarían en cuanto el personaje frenara contra un muro: se
 *    quedaría quieto moviendo las piernas. Atado a la distancia, el pie se planta donde
 *    pisa.
 *
 *  - **La cámara tiene caja muerta.** No sigue al héroe píxel a píxel: lo deja moverse
 *    dentro de un rectángulo central y sólo empuja cuando lo toca. Una cámara pegada al
 *    personaje convierte cualquier ajuste de rumbo en un temblor de toda la pantalla.
 */

import { TILE, isSolid } from "./tiles.js";

/** Caja de colisión, en píxeles, anclada a los pies del sprite. */
export const HITBOX = { w: 10, h: 7 };

/** Velocidad de paseo, en píxeles por segundo. Un tile por cada 0,3 s. */
export const VELOCIDAD = 54;

/** Cuánto corre el héroe cuando aprieta. La calle de noche se cruza más rápido. */
export const VELOCIDAD_CARRERA = 88;

/** Distancia a la que se puede hablar con alguien, en píxeles. */
export const ALCANCE = 20;

/** Píxeles recorridos por fotograma del ciclo de andar. */
export const PASO_POR_PIXEL = 1 / 7;

/** Semiancho y semialto de la caja muerta de la cámara, en píxeles. */
export const CAJA_MUERTA = { x: 26, y: 20 };
export const VISTA_CAMARA = { w: 208, h: 168 };

/* ── Estado ──────────────────────────────────────────────────────────────────────── */

/**
 * Un actor: el héroe y cada NPC son lo mismo. `x` e `y` son los PIES, en píxeles de mundo,
 * porque es la coordenada con la que se ordena la profundidad y con la que se colisiona;
 * medir desde la esquina superior izquierda del sprite obligaría a restar 24 en cada
 * comparación.
 */
export function createActor(id, x, y, { dir = "sur", rutina = null, velocidad = VELOCIDAD } = {}) {
  return { id, x, y, vx: 0, vy: 0, dir, paso: 0, andando: false, velocidad, rutina, espera: 0, destino: 0 };
}

export function createWorld(mapa, { heroe = "dani", spawn = null } = {}) {
  const punto = spawn ?? mapa.spawn ?? { x: TILE * 2, y: TILE * 2 };
  return {
    mapa,
    heroe: createActor(heroe, punto.x, punto.y, { dir: punto.dir ?? "sur" }),
    npcs: (mapa.npcs ?? []).map((n) => createActor(n.id, n.x, n.y, { dir: n.dir, rutina: n.rutina })),
    camara: { x: 0, y: 0 },
    disparador: null,
    tiempo: 0,
  };
}

/* ── Colisión ────────────────────────────────────────────────────────────────────── */

export function tileAt(mapa, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= mapa.suelo.length) return "vacio";
  const fila = mapa.suelo[ty];
  if (tx >= fila.length) return "vacio";
  return mapa.leyenda[fila[tx]] ?? "vacio";
}

/**
 * ¿Cabe la caja de pies con su esquina en (x, y)?
 *
 * Se comprueban las cuatro esquinas y no el centro: con el centro, una caja de 10 píxeles
 * atravesaría media farola antes de que nadie se enterara.
 */
export function libre(mapa, x, y, { gente = [] } = {}) {
  const x0 = x - HITBOX.w / 2;
  const x1 = x + HITBOX.w / 2 - 0.01;
  const y0 = y - HITBOX.h;
  const y1 = y - 0.01;
  for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
    if (isSolid(tileAt(mapa, Math.floor(px / TILE), Math.floor(py / TILE)))) return false;
  }
  // Los bultos sólidos que no son tiles: un banco, un contenedor, un coche.
  for (const b of mapa.bultos ?? []) {
    if (x1 > b.x && x0 < b.x + b.w && y1 > b.y && y0 < b.y + b.h) return false;
  }
  /**
   * LA GENTE OCUPA SITIO. Sin esto, Dani atraviesa a su hermana como si fuera un decorado
   * pintado, y con ella se va la mitad de lo que el mundo caminable había venido a comprar:
   * si puedes cruzar a alguien, ese alguien no está ahí de verdad.
   *
   * La caja de una persona es la mitad de ancha que la de un muro a propósito. Con la caja
   * entera, cruzarse con un NPC en una acera de dos tiles sería imposible y el jugador se
   * quedaría encerrado detrás de alguien que pasea.
   */
  for (const p of gente) {
    if (Math.abs(p.x - x) < HITBOX.w * 0.62 && Math.abs(p.y - y) < HITBOX.h * 0.8) return false;
  }
  return true;
}

/**
 * Mueve al actor resolviendo cada eje por su cuenta. Devuelve cuánto se movió de verdad,
 * que es lo que alimenta el ciclo de andar.
 */
export function mover(mapa, actor, dx, dy, { gente = [] } = {}) {
  const antesX = actor.x;
  const antesY = actor.y;
  const cabe = (x, y) => libre(mapa, x, y, { gente });

  if (dx !== 0) {
    if (cabe(actor.x + dx, actor.y)) actor.x += dx;
    else {
      // Acercarse hasta rozar en vez de quedarse a medio tile. Sin esto, el personaje se
      // detiene a distancia visible de la pared y el mundo parece de goma.
      const paso = Math.sign(dx);
      while (Math.abs(actor.x - antesX) < Math.abs(dx) && cabe(actor.x + paso, actor.y)) actor.x += paso;
    }
  }
  if (dy !== 0) {
    if (cabe(actor.x, actor.y + dy)) actor.y += dy;
    else {
      const paso = Math.sign(dy);
      while (Math.abs(actor.y - antesY) < Math.abs(dy) && cabe(actor.x, actor.y + paso)) actor.y += paso;
    }
  }
  return Math.hypot(actor.x - antesX, actor.y - antesY);
}

/* ── Dirección ───────────────────────────────────────────────────────────────────── */

/**
 * El eje dominante manda, y en empate manda el horizontal.
 *
 * El desempate no es un capricho: andando en diagonal perfecta, alternar entre "sur" y
 * "este" cada fotograma haría girar la cabeza del personaje veinte veces por segundo.
 */
export function dirDe(dx, dy, previa = "sur") {
  if (dx === 0 && dy === 0) return previa;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "este" : "oeste";
  return dy > 0 ? "sur" : "norte";
}

/* ── El paso ─────────────────────────────────────────────────────────────────────── */

export function step(estado, { entrada = {}, dt = 1 / 60, congelado = false } = {}) {
  const mapa = estado.mapa;
  const heroe = { ...estado.heroe };

  if (!congelado) {
    const dx = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
    const dy = (entrada.abajo ? 1 : 0) - (entrada.arriba ? 1 : 0);
    const largo = Math.hypot(dx, dy) || 1;
    const v = entrada.correr ? VELOCIDAD_CARRERA : VELOCIDAD;
    // Normalizar la diagonal. Sin esto se anda un 41% más rápido en diagonal, que es el
    // atajo que todo jugador descubre en treinta segundos y que rompe el reloj de las
    // Intervenciones.
    //
    // Los NPC frenan al héroe pero el héroe NO frena a los NPC: si se frenaran entre sí,
    // plantarse encima de la ruta de alguien que pasea lo dejaría empujando contra ti para
    // siempre, y de un abrazo accidental salen los atascos más tontos del género.
    const recorrido = mover(mapa, heroe, (dx / largo) * v * dt, (dy / largo) * v * dt, {
      gente: estado.npcs,
    });
    heroe.andando = dx !== 0 || dy !== 0;
    heroe.dir = dirDe(dx, dy, heroe.dir);
    heroe.paso = heroe.andando ? heroe.paso + recorrido * PASO_POR_PIXEL : 0;
  } else {
    heroe.andando = false;
    heroe.paso = 0;
  }

  const npcs = estado.npcs.map((n) => pasoNpc(mapa, n, dt, congelado));
  const camara = seguirCamara(estado.camara, heroe, mapa);

  return {
    ...estado,
    heroe,
    npcs,
    camara,
    disparador: disparadorBajo(mapa, heroe),
    tiempo: estado.tiempo + dt,
  };
}

/* ── Los NPC ─────────────────────────────────────────────────────────────────────── */

/**
 * Dos rutinas y ninguna más.
 *
 * `quieto` es un personaje plantado que mira a un lado; `paseo` recorre una lista de puntos
 * y se para un rato en cada uno. Con eso basta para que una plaza parezca viva, y todo lo
 * que se añadiera por encima —buscar caminos, evitarse entre ellos— costaría mucho y no se
 * notaría, porque los distritos de Marés son pequeños a propósito.
 */
export function pasoNpc(mapa, npc, dt, congelado) {
  const n = { ...npc };
  if (congelado || !n.rutina || n.rutina.tipo !== "paseo") {
    n.andando = false;
    n.paso = 0;
    return n;
  }

  if (n.espera > 0) {
    n.espera -= dt;
    n.andando = false;
    n.paso = 0;
    return n;
  }

  const puntos = n.rutina.puntos ?? [];
  if (!puntos.length) return n;
  const objetivo = puntos[n.destino % puntos.length];
  const dx = objetivo.x - n.x;
  const dy = objetivo.y - n.y;
  const d = Math.hypot(dx, dy);

  if (d < 1.5) {
    n.destino = (n.destino + 1) % puntos.length;
    n.espera = n.rutina.pausa ?? 1.4;
    n.andando = false;
    n.paso = 0;
    return n;
  }

  const v = n.rutina.velocidad ?? VELOCIDAD * 0.6;
  const recorrido = mover(mapa, n, (dx / d) * v * dt, (dy / d) * v * dt);
  n.dir = dirDe(dx, dy, n.dir);
  n.andando = true;
  n.paso = n.paso + recorrido * PASO_POR_PIXEL;
  // Un NPC atascado contra un bulto que se ha movido no puede quedarse empujando la pared
  // el resto de la partida: si no avanza, pasa al siguiente punto.
  if (recorrido < 0.02) {
    n.destino = (n.destino + 1) % puntos.length;
    n.espera = 0.5;
  }
  return n;
}

/* ── Con quién se puede hablar ───────────────────────────────────────────────────── */

const DELANTE = { sur: [0, 1], norte: [0, -1], este: [1, 0], oeste: [-1, 0] };

/**
 * El NPC más cercano que esté DELANTE del héroe y dentro del alcance.
 *
 * El filtro de "delante" existe porque sin él, en una plaza con cinco personas, el botón de
 * hablar elige a quien esté un píxel más cerca aunque lo tengas a la espalda. Mirar a
 * alguien y que te conteste otro es de las cosas que más rápido rompen la ilusión.
 */
export function interlocutor(estado, { alcance = ALCANCE } = {}) {
  const h = estado.heroe;
  const [fx, fy] = DELANTE[h.dir] ?? DELANTE.sur;
  let mejor = null;
  let mejorD = alcance;
  for (const n of estado.npcs) {
    // Los decorativos no se ofrecen. Los siete compañeros sentados en el aula están para
    // que el aula parezca un aula; si el botón de hablar los propusiera, el jugador pulsaría
    // A delante de uno y no pasaría nada, que es peor que no poder pulsar.
    if (n.decorativo) continue;
    const dx = n.x - h.x;
    const dy = n.y - h.y;
    const d = Math.hypot(dx, dy);
    if (d > alcance) continue;
    // Producto escalar contra la dirección de la mirada: por delante o en el costado, sí;
    // a la espalda, no.
    if (d > 4 && (dx * fx + dy * fy) / d < -0.15) continue;
    if (d < mejorD) {
      mejorD = d;
      mejor = n;
    }
  }
  return mejor;
}

/* ── Disparadores ────────────────────────────────────────────────────────────────── */

/**
 * El disparador que pisa el héroe, si pisa alguno. Son rectángulos en coordenadas de
 * píxel: puertas que llevan a otro distrito, bordes de mapa, marcas de escena de guion.
 *
 * Devuelve el disparador, no lo ejecuta. Quién decide qué pasa es `index.jsx`, porque
 * cambiar de distrito toca el estado del juego entero y eso no es asunto de la simulación.
 */
export function disparadorBajo(mapa, actor) {
  for (const t of mapa.disparadores ?? []) {
    if (actor.x >= t.x && actor.x <= t.x + t.w && actor.y >= t.y && actor.y <= t.y + t.h) return t;
  }
  return null;
}

/* ── Cámara ──────────────────────────────────────────────────────────────────────── */

export function tamanoMapa(mapa) {
  return {
    w: (mapa.suelo[0]?.length ?? 0) * TILE,
    h: mapa.suelo.length * TILE,
  };
}

/**
 * Empuja la cámara sólo cuando el héroe toca el borde de la caja muerta, y la sujeta dentro
 * del mapa. Si el mapa es más pequeño que la vista en un eje, se centra en ese eje: es
 * preferible ver una franja de fondo a asomarse al vacío negro de fuera del mapa.
 */
export function seguirCamara(camara, heroe, mapa, vista = VISTA_CAMARA) {
  const { w: mw, h: mh } = tamanoMapa(mapa);
  let { x, y } = camara;

  const cxObj = heroe.x - vista.w / 2;
  const cyObj = heroe.y - 8 - vista.h / 2; // el ancla es el pecho, no los pies
  if (cxObj - x > CAJA_MUERTA.x) x = cxObj - CAJA_MUERTA.x;
  if (cxObj - x < -CAJA_MUERTA.x) x = cxObj + CAJA_MUERTA.x;
  if (cyObj - y > CAJA_MUERTA.y) y = cyObj - CAJA_MUERTA.y;
  if (cyObj - y < -CAJA_MUERTA.y) y = cyObj + CAJA_MUERTA.y;

  x = mw <= vista.w ? (mw - vista.w) / 2 : Math.max(0, Math.min(mw - vista.w, x));
  y = mh <= vista.h ? (mh - vista.h) / 2 : Math.max(0, Math.min(mh - vista.h, y));
  return { x, y };
}

/** Coloca al héroe sin arrastrar la cámara desde el distrito anterior. */
export function situar(estado, { x, y, dir = "sur" }) {
  const heroe = { ...estado.heroe, x, y, dir, paso: 0, andando: false };
  return {
    ...estado,
    heroe,
    camara: seguirCamara({ x: x - VISTA_CAMARA.w / 2, y: y - VISTA_CAMARA.h / 2 }, heroe, estado.mapa),
  };
}
