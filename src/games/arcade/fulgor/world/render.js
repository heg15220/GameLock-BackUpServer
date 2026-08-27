/**
 * FULGOR — el pintor del mundo.
 *
 * Lee el estado de `sim.js` y lo dibuja. No decide nada: si aquí hubiera una regla, estaría
 * en el sitio equivocado.
 *
 * CUATRO DECISIONES QUE HACEN QUE ESTO VAYA A 60 EN UN MÓVIL:
 *
 *  - **El suelo se pinta UNA VEZ por distrito**, entero, en un lienzo del tamaño del mapa
 *    (512×384). Cada fotograma sólo se recorta el trozo visible con un `drawImage`. Pintar
 *    los 768 tiles por fotograma sería repetir 768 veces un dibujo que no ha cambiado.
 *
 *  - **La profundidad es una FUSIÓN, no una ordenación.** Los bultos ya vienen ordenados
 *    por `y` desde `maps.js` y no se mueven; los personajes son cuatro o cinco. Fusionar dos
 *    listas ordenadas es lineal; ordenar la lista entera cada fotograma no lo es.
 *
 *  - **La luz es UNA PASADA sobre la escena terminada**, no un atributo de cada tile. Por eso
 *    `tiles.js` no sabe qué hora es: la noche de Marés es un rectángulo azul en `multiply` y
 *    unos halos en `lighter`, y cuesta dos operaciones en vez de mil.
 *
 *  - **Todo se redondea a píxel entero antes de dibujar.** Con la cámara en coordenadas
 *    fraccionarias, el `drawImage` interpola y el pixel art se convierte en papilla incluso
 *    con `imageSmoothingEnabled = false`, porque el desenfoque ocurre en el muestreo. El
 *    mundo se mueve a saltos de un píxel, que es como se movía la DS.
 */

import { TILE, VARIANTS, atlasSource, bakeTileAtlas, variantAt } from "./tiles.js";
import { PROPS, PROP_VARIANTS, bakePropAtlas } from "./props.js";
import { RETRATO_H, RETRATO_W, SPRITE_H, SPRITE_W, bakeCharacterSheet, paintPortrait, sheetSource } from "./sprites.js";
import { VISTA } from "./maps.js";
import { tamanoMapa } from "./sim.js";

/* ── Luz ─────────────────────────────────────────────────────────────────────────── */

/**
 * El tinte de cada bloque del día y de cada clima. Son los tres bloques que ya usa
 * `calendar.js` —mañana, tarde, noche—, sin inventar ninguno nuevo.
 *
 * `luces` dice si las farolas están encendidas: de día apagadas, y con eso desaparece la
 * mitad del coste de la pasada de luz sin una sola condición repartida por el código.
 */
export const AMBIENTES = {
  manana: { tinte: "#ffe9c8", fuerza: 0.14, luces: false },
  tarde:  { tinte: "#ffd2a0", fuerza: 0.20, luces: false },
  noche:  { tinte: "#1b2a4a", fuerza: 0.62, luces: true },
};

export const CLIMAS = {
  despejado: { extra: 0,    gotas: 0,   niebla: 0 },
  nublado:   { extra: 0.10, gotas: 0,   niebla: 0.06 },
  lluvia:    { extra: 0.18, gotas: 110, niebla: 0.10 },
  niebla:    { extra: 0.12, gotas: 0,   niebla: 0.34 },
};

/* ── El taller ───────────────────────────────────────────────────────────────────── */

/**
 * Hornea todo lo que no cambia. Se llama una vez al montar el juego.
 *
 * Las hojas de personaje se hornean bajo demanda y se guardan por clave, porque veintidós
 * personajes × 9 fotogramas al arrancar sería trabajo tirado: en un distrito hay cuatro.
 */
export function crearTaller({ crear } = {}) {
  const tiles = bakeTileAtlas({ crear });
  const props = bakePropAtlas({ crear });
  return { tiles, props, hojas: new Map(), suelos: new Map(), crear };
}

/**
 * La hoja de un personaje. La clave incluye el traje, así que cambiar una pieza en el taller
 * produce una hoja nueva y el sprite de la calle cambia — que es toda la promesa de
 * `sprites.js` cumplida con tres líneas de caché.
 */
export function hojaDe(taller, id, traje = null) {
  const clave = traje ? `${id}|${Object.values(traje).join(",")}` : id;
  let hoja = taller.hojas.get(clave);
  if (!hoja) {
    hoja = bakeCharacterSheet(id, { traje, crear: taller.crear });
    taller.hojas.set(clave, hoja);
  }
  return hoja;
}

/**
 * El suelo de un distrito, pintado entero y guardado. Se cachea por identificador de mapa:
 * volver a Aguas Vivas por décima vez no vuelve a pintar sus 768 tiles.
 */
export function sueloDe(taller, mapa) {
  const guardado = taller.suelos.get(mapa.id);
  if (guardado) return guardado;

  const { w, h } = tamanoMapa(mapa);
  const canvas = (taller.crear ?? defaultCanvas)(w, h);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  for (let ty = 0; ty < mapa.suelo.length; ty += 1) {
    const fila = mapa.suelo[ty];
    for (let tx = 0; tx < fila.length; tx += 1) {
      const kind = mapa.leyenda[fila[tx]] ?? "vacio";
      const v = variantAt(tx, ty) % VARIANTS;
      const { sx, sy, sw, sh } = atlasSource(kind, v);
      ctx.drawImage(taller.tiles.canvas, sx, sy, sw, sh, tx * TILE, ty * TILE, TILE, TILE);
    }
  }

  taller.suelos.set(mapa.id, canvas);
  return canvas;
}

/* ── Retratos de diálogo ─────────────────────────────────────────────────────────── */

const RETRATOS = new Map();

/**
 * El retrato de un personaje como `data:` URL, listo para un `<img>`.
 *
 * Se cachea por personaje y ánimo porque una conversación de seis líneas alterna entre dos
 * o tres retratos y volver a hornear el mismo busto en cada línea del mecanógrafo sería
 * repintarlo cincuenta veces por frase.
 */
export function retratoURL(id, animo = "neutro") {
  const clave = `${id}|${animo}`;
  const guardado = RETRATOS.get(clave);
  if (guardado) return guardado;

  const canvas = defaultCanvas(RETRATO_W, RETRATO_H);
  if (!canvas) return PIXEL_VACIO;

  const p = paintPortrait(id, animo);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(new ImageData(p.data, RETRATO_W, RETRATO_H), 0, 0);

  // `OffscreenCanvas` no tiene `toDataURL`; si el horno devolvió uno, se convierte.
  const url = typeof canvas.toDataURL === "function"
    ? canvas.toDataURL("image/png")
    : lienzoNormal(canvas);
  RETRATOS.set(clave, url);
  return url;
}

function lienzoNormal(origen) {
  const c = document.createElement("canvas");
  c.width = origen.width;
  c.height = origen.height;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(origen, 0, 0);
  return c.toDataURL("image/png");
}

/* ── Profundidad ─────────────────────────────────────────────────────────────────── */

/**
 * Fusiona bultos y actores en un solo orden de pintado por `y` creciente.
 *
 * Es pura y se exporta para poder afirmar en un test que el héroe se pinta después de la
 * farola cuando está por debajo de ella — que es la única forma de comprobar la
 * profundidad sin mirar una pantalla.
 */
export function ordenarPorProfundidad(props, actores) {
  const salida = [];
  let i = 0;
  let j = 0;
  const act = [...actores].sort((a, b) => a.y - b.y);
  while (i < props.length || j < act.length) {
    if (j >= act.length || (i < props.length && props[i].y <= act[j].y)) {
      salida.push({ clase: "bulto", dato: props[i] });
      i += 1;
    } else {
      salida.push({ clase: "actor", dato: act[j] });
      j += 1;
    }
  }
  return salida;
}

/* ── El fotograma ────────────────────────────────────────────────────────────────── */

/**
 * Pinta un fotograma completo en `ctx`, que mide exactamente `VISTA`. Quien lo escala a la
 * pantalla es el CSS, con `image-rendering: pixelated` y factor entero.
 */
export function pintar(ctx, taller, estado, opciones = {}) {
  const {
    bloque = "tarde",
    clima = "despejado",
    trajes = {},
    vista = VISTA,
    modoFulgor = false,
    resaltado = null,
  } = opciones;

  const mapa = estado.mapa;
  // Cámara a píxel entero: la raíz de que el pixel art no se emborrone al desplazarse.
  const cx = Math.round(estado.camara.x);
  const cy = Math.round(estado.camara.y);

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, vista.w, vista.h);

  /* Suelo -------------------------------------------------------------------------- */
  ctx.drawImage(sueloDe(taller, mapa), cx, cy, vista.w, vista.h, 0, 0, vista.w, vista.h);

  /* Conos de visión ---------------------------------------------------------------- */
  // Van SOBRE EL SUELO y debajo de todo lo demás, porque son luz caída sobre el pavimento,
  // no una capa de interfaz. Un cono pintado encima de los personajes los teñiría y se
  // leería como un filtro; pintado debajo, es el sitio el que está iluminado.
  if (opciones.conos?.length) pintarConos(ctx, opciones.conos, cx, cy, estado.tiempo);

  /* Sombras ------------------------------------------------------------------------ */
  // Todas juntas y antes de todo lo demás: una sombra por debajo de la figura de al lado es
  // correcto, y agruparlas ahorra cambiar de alfa quince veces por fotograma.
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = "#0b0f18";
  for (const a of [estado.heroe, ...estado.npcs]) elipse(ctx, a.x - cx, a.y - cy - 1, 6, 2.4);
  for (const b of mapa.props) {
    const def = PROPS[b.id];
    if (def?.solido) elipse(ctx, b.x - cx, b.y - cy - 1, def.solido.w / 2 + 1, 2.6);
  }
  ctx.restore();

  /* Bultos y personajes, ordenados ------------------------------------------------- */
  const actores = [estado.heroe, ...estado.npcs];
  for (const item of ordenarPorProfundidad(mapa.props, actores)) {
    if (item.clase === "bulto") pintarBulto(ctx, taller, item.dato, cx, cy);
    else pintarActor(ctx, taller, item.dato, cx, cy, trajes[item.dato.id] ?? null, resaltado === item.dato.id);
  }

  /* Objetivos ---------------------------------------------------------------------- */
  // Encima de todo y ANTES de la luz: un objetivo es una marca de interfaz sobre el mundo,
  // así que no lo tiñe la noche — de madrugada tiene que verse igual de bien.
  if (opciones.marcas?.length) pintarMarcas(ctx, opciones.marcas, cx, cy, estado.tiempo, vista);

  /* Luz ---------------------------------------------------------------------------- */
  aplicarLuz(ctx, mapa, { bloque, clima, vista, cx, cy, tiempo: estado.tiempo, modoFulgor });
}

/* ── Los conos de visión ─────────────────────────────────────────────────────────── */

/**
 * ESTO ES LO QUE SUSTITUYE AL MAPA DE PUNTOS Y LÍNEAS.
 *
 * La visibilidad de un sitio era el GROSOR DE UN ANILLO en un grafo flotando sobre una
 * foto: un número disfrazado de dibujo, que el jugador tenía que aprender a leer. Aquí es
 * un cono de luz caído en el suelo desde alguien que está mirando, y no hay nada que
 * aprender — se ve, y se rodea.
 *
 * El cono respira despacio. Uno fijo se vuelve parte del decorado a los treinta segundos;
 * uno que late sigue diciendo que hay alguien ahí con los ojos abiertos.
 */
function pintarConos(ctx, conos, cx, cy, tiempo) {
  ctx.save();
  for (const cono of conos) {
    const ox = cono.x - cx;
    const oy = cono.y - cy - 4;
    for (const arco of cono.arcos) {
      const r = arco.alcance * (0.94 + Math.sin(tiempo * 1.7 + cono.x) * 0.06);
      const g = ctx.createRadialGradient(ox, oy, 2, ox, oy, r);
      g.addColorStop(0, "rgba(255, 206, 122, 0.34)");
      g.addColorStop(0.65, "rgba(255, 186, 96, 0.15)");
      g.addColorStop(1, "rgba(255, 176, 86, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      // Achatado en vertical: el cono se apoya en el suelo, no flota de canto. Es lo que
      // le da perspectiva sin necesitar una sola línea de proyección.
      ctx.ellipse(ox, oy, r, r * 0.62, 0, arco.angulo - cono.apertura, arco.angulo + cono.apertura);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/* ── Las marcas de objetivo ──────────────────────────────────────────────────────── */

/**
 * Dónde hay que ir, dicho sin un mapa.
 *
 * La marca vive SOBRE el sitio cuando está en pantalla y se pega al borde apuntando hacia
 * él cuando no lo está. Ese segundo caso es el que sustituye de verdad al plano: no hace
 * falta un diagrama del escenario si en todo momento se ve hacia dónde tirar.
 */
function pintarMarcas(ctx, marcas, cx, cy, tiempo, vista) {
  ctx.save();
  for (const marca of marcas) {
    const color = marca.principal ? "#38e1ff" : "#ffd98a";
    const x = marca.x - cx;
    const y = marca.y - cy;
    const dentro = x > 6 && y > 10 && x < vista.w - 6 && y < vista.h - 6;

    if (dentro) {
      const flota = Math.sin(tiempo * 2.6 + marca.x) * 1.6;
      // Anilla en el suelo.
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y - 1, 7, 2.8, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Y la punta de flecha encima, que es lo que se ve desde lejos.
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y - 13 + flota);
      ctx.lineTo(x - 4, y - 20 + flota);
      ctx.lineTo(x + 4, y - 20 + flota);
      ctx.closePath();
      ctx.fill();
    } else {
      // Fuera de cuadro: pegada al borde, apuntando. El jugador nunca pierde el norte.
      const mx = Math.max(8, Math.min(vista.w - 8, x));
      const my = Math.max(12, Math.min(vista.h - 8, y));
      const a = Math.atan2(y - my, x - mx);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = color;
      ctx.translate(mx, my);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-3, -4);
      ctx.lineTo(-3, 4);
      ctx.closePath();
      ctx.fill();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  }
  ctx.restore();
}

function pintarBulto(ctx, taller, bulto, cx, cy) {
  const def = PROPS[bulto.id];
  if (!def) return;
  const { fila } = taller.props.indice[bulto.id];
  const v = bulto.v % PROP_VARIANTS;
  ctx.drawImage(
    taller.props.canvas,
    v * taller.props.anchoMax, fila * taller.props.altoMax, def.w, def.h,
    Math.round(bulto.x - cx - def.w / 2), Math.round(bulto.y - cy - def.h + 1),
    def.w, def.h,
  );
}

function pintarActor(ctx, taller, actor, cx, cy, traje, resaltado) {
  const hoja = hojaDe(taller, actor.id, traje);
  const fase = actor.andando ? Math.floor(actor.paso) : 0;
  const { sx, sy, sw, sh, espejo } = sheetSource(actor.dir, fase);
  // El sprite se ancla por los PIES: la esquina de dibujo es 24 arriba y 8 a la izquierda.
  const dx = Math.round(actor.x - cx - SPRITE_W / 2);
  const dy = Math.round(actor.y - cy - SPRITE_H + 1);

  if (resaltado) {
    // El aro de "puedes hablar con este". Va debajo del sprite y no encima, para no comerse
    // la cara justo cuando el jugador está mirándola.
    ctx.save();
    ctx.strokeStyle = "#38e1ff";
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(actor.x - cx, actor.y - cy - 1, 8, 3.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (espejo) {
    ctx.save();
    ctx.translate(dx + SPRITE_W, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(hoja.canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.restore();
  } else {
    ctx.drawImage(hoja.canvas, sx, sy, sw, sh, dx, dy, sw, sh);
  }
}

function elipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/* ── La pasada de luz ────────────────────────────────────────────────────────────── */

/**
 * Tres capas y ninguna más: tinte, halos y clima.
 *
 * El tinte va en `multiply` porque oscurecer una escena es multiplicar, no superponer negro
 * — superponer negro apaga el color además del brillo y deja una noche gris muerta, que es
 * el error clásico. Los halos van en `lighter` sobre el tinte ya puesto, de modo que la luz
 * de la farola recupera color donde llega.
 */
export function aplicarLuz(ctx, mapa, { bloque, clima, vista, cx, cy, tiempo, modoFulgor }) {
  const amb = AMBIENTES[bloque] ?? AMBIENTES.tarde;
  const cli = CLIMAS[clima] ?? CLIMAS.despejado;
  const fuerza = Math.min(0.88, amb.fuerza + cli.extra);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = fuerza;
  ctx.fillStyle = amb.tinte;
  ctx.fillRect(0, 0, vista.w, vista.h);
  ctx.restore();

  if (amb.luces) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of mapa.props) {
      const luz = PROPS[b.id]?.luz;
      if (!luz) continue;
      const lx = b.x + luz.x - cx;
      const ly = b.y + luz.y - cy;
      if (lx < -luz.r || ly < -luz.r || lx > vista.w + luz.r || ly > vista.h + luz.r) continue;
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, luz.r);
      g.addColorStop(0, hexA(luz.color, 0.5));
      g.addColorStop(0.45, hexA(luz.color, 0.16));
      g.addColorStop(1, hexA(luz.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(lx - luz.r, ly - luz.r, luz.r * 2, luz.r * 2);
    }
    ctx.restore();
  }

  if (cli.niebla > 0) {
    ctx.save();
    ctx.globalAlpha = cli.niebla;
    ctx.fillStyle = "#b8c4d0";
    ctx.fillRect(0, 0, vista.w, vista.h);
    ctx.restore();
  }

  if (cli.gotas > 0) pintarLluvia(ctx, vista, tiempo, cli.gotas);

  if (modoFulgor) {
    // El modo Fulgor no es un filtro de color: es un pulso. Un tinte fijo se vuelve
    // invisible a los diez segundos; uno que respira sigue diciendo que algo va mal.
    const pulso = 0.10 + Math.sin(tiempo * 4.2) * 0.045;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = Math.max(0, pulso);
    ctx.fillStyle = "#38e1ff";
    ctx.fillRect(0, 0, vista.w, vista.h);
    ctx.restore();
  }
}

/**
 * Lluvia sin estado: la posición de cada gota se deriva del tiempo y de su índice.
 *
 * Guardar un array de gotas y actualizarlo obligaría a que el pintor tuviera memoria, y un
 * pintor con memoria es un pintor que se desincroniza cuando el juego se pausa.
 */
function pintarLluvia(ctx, vista, tiempo, cuantas) {
  ctx.save();
  ctx.strokeStyle = "#a8c8e0";
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < cuantas; i += 1) {
    const vel = 150 + (i % 7) * 26;
    const x = (i * 61) % vista.w;
    const y = ((i * 37 + tiempo * vel) % (vista.h + 20)) - 10;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 1.5, y + 5);
  }
  ctx.stroke();
  ctx.restore();
}

function hexA(h, a) {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Un lienzo donde hornear, o `null` si aquí no se puede hornear nada.
 *
 * Devuelve `null` en vez de reventar porque este módulo se importa desde sitios donde no hay
 * pantalla: `renderToStaticMarkup` en los tests de dibujo, y cualquier pasada de servidor.
 * Un `document.createElement` a pelo tiraba el render entero de un componente sólo porque
 * quería un retrato, y un retrato es lo menos importante que hay en esa pantalla.
 */
function defaultCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  // jsdom trae `<canvas>` pero no trae contexto 2D si no está instalado el paquete `canvas`.
  return typeof c.getContext === "function" && c.getContext("2d") ? c : null;
}

/** Un píxel transparente, para cuando no hay dónde hornear. Nunca deja un `src` indefinido. */
const PIXEL_VACIO = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
