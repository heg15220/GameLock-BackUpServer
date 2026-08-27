/**
 * FULGOR — el escenario de Intervención, aterrizado sobre el plano real.
 *
 * ESTE ARCHIVO EXISTE PARA MATAR EL GRAFO DE CÍRCULOS.
 *
 * `intervention.js` genera la Intervención como un grafo: seis a catorce nodos, aristas
 * `sombra` o `visible`, objetivos, testigos, y un reloj en turnos. Esas son las REGLAS y
 * están bien; lo que estaba mal era enseñarlas tal cual, como puntos y líneas flotando
 * sobre una foto. Un jugador no debería ver nunca el diagrama de su propio juego.
 *
 * Aquí el grafo se ATERRIZA: cada nodo recibe una posición de verdad dentro del distrito,
 * derivada del propio mapa, y a partir de ahí el jugador no ve nodos — ve una azotea, un
 * callejón y a alguien mirando. Camina. Al llegar a un sitio que el grafo reconoce como
 * nodo, `game.move()` cobra lo que la arista costaba. Ni una regla ha cambiado de sitio.
 *
 * NADA DE ESTO SE ESCRIBE A MANO, Y ES EL PUNTO. Los puntos de interés se derivan del mapa
 * con las mismas reglas para los cuatro distritos construidos y para los cinco que faltan:
 * suelo pisable, bien repartido, alcanzable desde la entrada, y clasificado en sombra o
 * descubierto según lo que hay pisado y lo cerrado que esté el sitio. Un distrito nuevo trae
 * sus Intervenciones puestas el día que se dibuja su rejilla.
 *
 * Todo aquí es puro: entra un mapa compilado y un escenario del motor, salen coordenadas.
 */

import { TILE, isSolid } from "./tiles.js";
import { libre } from "./sim.js";
import { adjacency, hopDistances } from "../intervention.js";

/** Separación mínima entre puntos de interés, en tiles. Bajo esto, dos nodos son el mismo sitio. */
export const SEPARACION = 4;

/**
 * Cuántos pasos de desorden se toleran al desempatar por oscuridad.
 *
 * El orden de lejanía es lo que hace que el reloj se crea, así que el ajuste de sombra sólo
 * puede mover un nodo dentro de este margen. Dos pasos son un par de metros: imperceptibles
 * para el jugador, suficientes para que un nodo oscuro acabe en un portal en vez de en mitad
 * de la plaza de al lado.
 */
export const TOLERANCIA_SOMBRA = 2;

/**
 * Qué suelo es oscuro.
 *
 * No es una lista de gustos: es dónde no llega la luz de la calle. El interior de una nave,
 * una azotea, la vía del tren y el barro del descampado esconden; el adoquín de una plaza
 * con farolas, no. `intervention.js` ya decide si una ARISTA es de sombra; esto decide si
 * un SITIO lo es, que es lo que el jugador ve al llegar.
 */
const SUELO_OSCURO = new Set(["nave", "naveLinea", "azotea", "rail", "metal", "tierra", "muelle"]);

/* ── Lectura del mapa ────────────────────────────────────────────────────────────── */

export function tileEn(mapa, tx, ty) {
  if (tx < 0 || ty < 0 || ty >= mapa.suelo.length) return "vacio";
  const fila = mapa.suelo[ty];
  if (tx >= fila.length) return "vacio";
  return mapa.leyenda[fila[tx]] ?? "vacio";
}

const pisable = (mapa, tx, ty) => !isSolid(tileEn(mapa, tx, ty));

/**
 * Cuánto se abre un sitio: cuántas de las veinticuatro casillas de alrededor son pisables.
 *
 * Sirve para dos cosas a la vez. Alto significa plaza —buen sitio para un objetivo, mal
 * sitio para esconderse—; bajo significa callejón. Y descarta los rincones de una casilla,
 * donde un nodo dejaría al héroe encajonado sin salida.
 */
export function apertura(mapa, tx, ty) {
  let n = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      if (pisable(mapa, tx + dx, ty + dy)) n += 1;
    }
  }
  return n;
}

/**
 * Distancia A PIE desde una casilla, en pasos, para todo el distrito. Inundación por anchura.
 *
 * A pie y no en línea recta, y ahí está el detalle que importa: el otro lado de la dársena
 * está a diez metros en línea recta y a media ciudad andando. Un reparto de nodos ordenado
 * por distancia euclídea pondría el objetivo "lejos" al otro lado del agua y el motor
 * cobraría seis turnos por un sitio que se ve desde la entrada.
 */
export function distanciasAPie(mapa, desdeTx, desdeTy) {
  const alto = mapa.suelo.length;
  const ancho = mapa.suelo[0]?.length ?? 0;
  const dist = new Map();
  const clave = (x, y) => y * ancho + x;
  if (!pisable(mapa, desdeTx, desdeTy)) return dist;

  const cola = [[desdeTx, desdeTy]];
  dist.set(clave(desdeTx, desdeTy), 0);
  while (cola.length) {
    const [x, y] = cola.shift();
    const d = dist.get(clave(x, y));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
      const k = clave(nx, ny);
      if (dist.has(k) || !pisable(mapa, nx, ny)) continue;
      dist.set(k, d + 1);
      cola.push([nx, ny]);
    }
  }
  return dist;
}

/** Las casillas pisables alcanzables a pie desde un punto. */
export function alcanzables(mapa, desdeTx, desdeTy) {
  return new Set(distanciasAPie(mapa, desdeTx, desdeTy).keys());
}

/* ── Puntos de interés ───────────────────────────────────────────────────────────── */

/**
 * Cuánto distrito ocupa un escenario, en pasos desde la entrada.
 *
 * UNA ESCARAMUZA NO ES UN PASEO POR LA CIUDAD. `intervention.js` le da tres o cuatro nodos y
 * de tres a cinco turnos, y el diseño dice que se resuelve en dos o tres minutos: es una
 * esquina, no un barrio. Repartidos por los 512×384 del distrito entero, esos tres nodos
 * quedaban a medio minuto de caminata el uno del otro y el encuentro se convertía en un
 * trayecto con nada en medio.
 *
 * Una decisiva, en cambio, tiene catorce nodos y dieciséis turnos: ésa sí se come el mapa.
 */
export function radioSegunTamano(nNodos) {
  // El muestreo de punto más lejano SIEMPRE empuja al borde del radio permitido, así que un
  // escenario de tres nodos con radio R acaba midiendo 2R de punta a punta. Con R = 11 la
  // escaramuza medía 352 px: dos pantallas enteras para tres sitios, sin ver nunca el
  // siguiente desde el actual. Siete pasos deja los extremos a poco más de una vista.
  if (nNodos <= 4) return 14;   // escaramuza: una esquina y sus salidas (mapas 2×)
  if (nNodos <= 9) return Infinity; // estándar: aprovecha el distrito ampliado completo
  return Infinity;              // decisiva: el distrito entero
}

/**
 * `cuantos` sitios repartidos por el distrito, derivados del plano y de nada más.
 *
 * El reparto es de PUNTO MÁS LEJANO, no aleatorio: se empieza en la entrada y cada punto
 * nuevo es el que está más lejos de todos los ya elegidos. Eso da un reparto que cubre el
 * área disponible en vez de amontonarse donde hay más suelo libre — que es lo que pasa con
 * cualquier muestreo al azar, y el motivo por el que un escenario aleatorio se siente
 * siempre igual.
 *
 * Es determinista sin necesitar semilla: el mismo mapa da siempre los mismos sitios, así
 * que dos Intervenciones en el Puerto Viejo comparten geografía, como debe ser —es el mismo
 * puerto— y lo que cambia entre ellas es el grafo que se aterriza encima.
 */
export function puntosDeInteres(mapa, cuantos, { entrada = null, radio = Infinity } = {}) {
  const alto = mapa.suelo.length;
  const ancho = mapa.suelo[0]?.length ?? 0;
  const inicio = entrada ?? {
    tx: Math.round((mapa.spawn?.x ?? TILE) / TILE),
    ty: Math.round((mapa.spawn?.y ?? TILE) / TILE),
  };

  const dist = distanciasAPie(mapa, inicio.tx, inicio.ty);
  const candidatos = [];
  for (let ty = 1; ty < alto - 1; ty += 1) {
    for (let tx = 1; tx < ancho - 1; tx += 1) {
      const pasos = dist.get(ty * ancho + tx);
      if (pasos === undefined || pasos > radio) continue;
      const ap = apertura(mapa, tx, ty);
      // Menos de seis vecinos libres es un recoveco: no cabe una escena ahí.
      if (ap < 6) continue;
      // Y CABER DE VERDAD, con los bultos puestos. El suelo puede ser asfalto y estar
      // ocupado por un coche aparcado o por un transformador: se comprueba con la misma
      // caja de pies con la que anda el héroe, no con el tipo de tile.
      if (!libre(mapa, tx * TILE + TILE / 2, ty * TILE + TILE)) continue;
      candidatos.push({ tx, ty, apertura: ap, pasos, kind: tileEn(mapa, tx, ty) });
    }
  }
  if (!candidatos.length) return [];

  const d2 = (a, b) => (a.tx - b.tx) ** 2 + (a.ty - b.ty) ** 2;
  const elegidos = [];

  // El primero es la propia entrada, o el candidato más cercano a ella.
  elegidos.push(candidatos.reduce((mejor, c) => (d2(c, inicio) < d2(mejor, inicio) ? c : mejor)));

  while (elegidos.length < cuantos) {
    let mejor = null;
    let mejorPuntos = -1;
    for (const c of candidatos) {
      const cerca = Math.min(...elegidos.map((e) => d2(c, e)));
      if (cerca < SEPARACION * SEPARACION) continue;
      // Lejanía manda; la apertura desempata, para que el sitio elegido sea el más
      // aprovechable de su zona y no el primero que pasa el filtro.
      const puntos = cerca * 100 + c.apertura;
      if (puntos > mejorPuntos) {
        mejorPuntos = puntos;
        mejor = c;
      }
    }
    if (!mejor) break; // el distrito no da para más sitios distintos
    elegidos.push(mejor);
  }

  /**
   * Y AHORA SE ORDENAN POR LEJANÍA A PIE, que es lo que `anclar` va a leer.
   *
   * El reparto de punto más lejano sirve para CUBRIR el distrito, pero el orden en que
   * escupe los sitios no es el orden de distancia a la entrada: el séptimo elegido puede
   * estar más cerca que el tercero. Sin este reordenado, el objetivo principal —que el grafo
   * pone a seis saltos— podía aterrizar más cerca de la puerta que un nodo intermedio, y el
   * jugador vería el reloj cobrarle seis turnos por un paseo de dos pasos.
   */
  elegidos.sort((a, b) => a.pasos - b.pasos);

  return elegidos.map((c) => ({
    x: c.tx * TILE + TILE / 2,
    y: c.ty * TILE + TILE,
    tx: c.tx,
    ty: c.ty,
    apertura: c.apertura,
    pasos: c.pasos,
    // Un sitio esconde si el suelo es oscuro o si está cerrado. Los dos criterios juntos
    // porque un callejón de adoquín también esconde, y una azotea abierta también.
    sombra: SUELO_OSCURO.has(c.kind) || c.apertura < 12,
  }));
}

/* ── Aterrizaje ──────────────────────────────────────────────────────────────────── */

/**
 * Ata cada nodo del grafo a un sitio del mapa.
 *
 * EL CRITERIO ES QUE LA DISTANCIA MIENTA LO MENOS POSIBLE: el nodo que en el grafo está a
 * cinco saltos de la entrada se coloca en el sitio que está a cinco puestos de lejanía en
 * el plano. Si el objetivo principal está lejos en el grafo —y `placeObjectives` lo pone
 * ahí a propósito, para que el reloj tenga de qué ir— también está lejos a pie. Sin esta
 * correspondencia, el jugador vería el objetivo a dos pasos y el juego le cobraría seis
 * turnos por llegar, que es la forma más rápida de que un reloj deje de creerse.
 *
 * Los nodos de sombra prefieren sitios de sombra: entre dos huecos del mismo rango, se le
 * da al nodo oscuro el sitio oscuro. Es un ajuste fino y sólo se aplica cuando no rompe el
 * orden de lejanía.
 */
export function anclar(escenario, mapa) {
  const puntos = puntosDeInteres(mapa, escenario.nodos.length, {
    radio: radioSegunTamano(escenario.nodos.length),
  });
  if (!puntos.length) return {};

  const saltos = hopDistances(escenario, escenario.entrada);
  const nodosOrdenados = [...escenario.nodos].sort(
    (a, b) => (saltos[a.id] ?? 99) - (saltos[b.id] ?? 99) || a.indice - b.indice,
  );

  // Los puntos ya salen en orden de lejanía creciente desde la entrada.
  const posiciones = {};
  const libres = [...puntos];
  for (const nodo of nodosOrdenados) {
    if (!libres.length) break;
    const quiereSombra = nodo.visibilidad < 0.7;
    /**
     * El ajuste de sombra sólo puede elegir ENTRE SITIOS IGUAL DE LEJOS.
     *
     * Antes miraba los dos primeros libres sin más, y con eso se saltaba un puesto del orden
     * de lejanía: la entrada acabó a once pasos y el primer nodo a cero, con el reloj
     * cobrando al revés. Un empate a distancia se puede desempatar por oscuridad; una
     * diferencia de distancia, no — el orden de lejanía es lo que hace que el reloj se crea.
     */
    const ventana = libres.filter((p) => Math.abs(p.pasos - libres[0].pasos) <= TOLERANCIA_SOMBRA);
    const elegido = ventana.find((p) => p.sombra === quiereSombra) ?? libres[0];
    libres.splice(libres.indexOf(elegido), 1);
    posiciones[nodo.id] = elegido;
  }

  // Si el escenario trae más nodos que sitios da el mapa, los sobrantes comparten el último
  // sitio en vez de quedarse sin coordenada: el juego sigue, sólo se apretuja.
  for (const nodo of escenario.nodos) {
    if (!posiciones[nodo.id]) posiciones[nodo.id] = puntos[puntos.length - 1];
  }
  return posiciones;
}

/* ── Qué se ve desde dónde ───────────────────────────────────────────────────────── */

/** Radio del cono de un testigo, en píxeles. Tres tiles y medio de alcance útil. */
export const ALCANCE_TESTIGO = 56;

/**
 * Los conos de visión, y la promesa que llevan encima.
 *
 * EL CONO NO ES UNA REGLA NUEVA: ES EL DIBUJO DE LA QUE YA HAY. `intervention.js` decide
 * qué aristas son `visible` y qué visibilidad tiene cada nodo, y `exposureAt` cobra por
 * proximidad de testigo. El cono se abre desde el testigo HACIA los nodos vecinos por
 * arista visible, y nada más. Lo que ves tapado es exactamente lo que el motor no te cobra.
 *
 * Era la tentación evidente y la que había que evitar: dibujar unos conos bonitos que no
 * coincidieran con lo que el juego cobra. Un jugador que esquiva un cono y aun así paga
 * deja de creerse la pantalla entera.
 */
export function conosDeVision(escenario, posiciones) {
  const vecinos = adjacency(escenario);
  const conos = [];

  for (const testigo of escenario.testigos ?? []) {
    const origen = posiciones[testigo.nodo];
    if (!origen) continue;

    // Hacia cada vecino por arista visible. Un testigo que sólo tiene salidas de sombra
    // vigila su propio sitio y poco más — y eso también es información útil.
    const arcos = (vecinos[testigo.nodo] ?? [])
      .filter((v) => {
        const arista = escenario.aristas.find(
          (a) => (a.a === testigo.nodo && a.b === v) || (a.b === testigo.nodo && a.a === v),
        );
        return arista?.via === "visible";
      })
      .map((v) => posiciones[v])
      .filter(Boolean)
      .map((destino) => ({
        angulo: Math.atan2(destino.y - origen.y, destino.x - origen.x),
        alcance: Math.min(ALCANCE_TESTIGO, Math.hypot(destino.x - origen.x, destino.y - origen.y)),
      }));

    conos.push({
      id: testigo.id,
      nodo: testigo.nodo,
      x: origen.x,
      y: origen.y,
      arcos: arcos.length ? arcos : [{ angulo: Math.PI / 2, alcance: ALCANCE_TESTIGO * 0.45 }],
      apertura: Math.PI / 3.2,
    });
  }
  return conos;
}

/**
 * ¿Dentro de qué cono está un punto? Devuelve los ids de los testigos que lo ven.
 *
 * Se usa SÓLO para avisar en pantalla —el borde de la vista parpadea cuando te ven—, nunca
 * para cobrar: quien cobra es `exposureAt`. Si esto decidiera algo, habría dos reglas de
 * visibilidad en dos archivos y acabarían discrepando.
 */
export function vistoPor(conos, x, y) {
  const vistos = [];
  for (const cono of conos) {
    const d = Math.hypot(x - cono.x, y - cono.y);
    for (const arco of cono.arcos) {
      if (d > arco.alcance) continue;
      let delta = Math.atan2(y - cono.y, x - cono.x) - arco.angulo;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      if (Math.abs(delta) <= cono.apertura) {
        vistos.push(cono.id);
        break;
      }
    }
  }
  return vistos;
}

/* ── A quién le toca ahora ───────────────────────────────────────────────────────── */

/**
 * El nodo cuyo sitio pisa el héroe, o null si está de camino.
 *
 * Es lo que sustituye al arrastre de ruta del §4.2: ya no se dibuja un camino sobre un
 * grafo, se anda. Al entrar en el radio de un nodo distinto del actual, `index.jsx` llama a
 * `game.move()` y el motor cobra la arista — la misma llamada que hacía el mapa de puntos,
 * disparada por los pies en vez de por el dedo.
 */
export const RADIO_NODO = 13;

export function nodoBajoLosPies(escenario, posiciones, heroe, { radio = RADIO_NODO } = {}) {
  let mejor = null;
  let mejorD = radio;
  for (const nodo of escenario.nodos) {
    const p = posiciones[nodo.id];
    if (!p) continue;
    const d = Math.hypot(p.x - heroe.x, p.y - heroe.y);
    if (d < mejorD) {
      mejorD = d;
      mejor = nodo.id;
    }
  }
  return mejor;
}
