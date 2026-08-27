/**
 * FULGOR — el atlas de suelo, dibujado con código.
 *
 * TRES COSAS QUE MERECEN LEERSE DESPACIO:
 *
 *  - AQUÍ NO HAY TEMA NI HORA DEL DÍA. Un tile de asfalto es el mismo a las ocho de la
 *    mañana que bajo la lluvia de las tres de la madrugada; lo que cambia es la luz, y la
 *    luz se aplica en una pasada de `render.js` sobre la escena entera. Hornear una copia
 *    del atlas por cada combinación de hora y clima multiplicaría por doce la memoria para
 *    conseguir exactamente el mismo píxel que da un `globalCompositeOperation`.
 *
 *  - LOS DATOS Y EL HORNO ESTÁN SEPARADOS A PROPÓSITO. `TILE_KINDS` es una tabla pura: la
 *    lee `sim.js` para saber qué bloquea el paso, y la leen los tests sin tocar un canvas.
 *    `bakeTileAtlas()` es lo único que necesita un DOM, y es una función, no un efecto de
 *    módulo — importar este archivo en Node no dibuja nada.
 *
 *  - CADA TIPO TIENE CUATRO VARIANTES Y LA CELDA ELIGE LA SUYA POR HASH DE SUS COORDENADAS.
 *    Es lo que separa un suelo de un mantel: sin variación, veinte metros de acera son un
 *    patrón repetido que el ojo detecta al instante y deja de leer como suelo.
 */

import { Painter, hex, noise, ramp, shade } from "./pixel.js";

/** Lado del tile en píxeles de arte. Todo el mundo se mide en múltiplos de esto. */
export const TILE = 16;

/** Variantes horneadas por tipo. Cuatro bastan para romper la retícula sin inflar el atlas. */
export const VARIANTS = 4;

/* ── La tabla pura ───────────────────────────────────────────────────────────────── */

/**
 * `solido` bloquea el paso. `altura` es cuántos tiles hacia arriba ocupa visualmente un
 * bloque: la fachada de un edificio es sólida y mide 1, pero el suelo que hay debajo de un
 * seto es sólido y mide 0 porque no tapa a nadie. `render.js` usa `altura` para decidir si
 * un tile se pinta en la capa de suelo o en la de objetos ordenada por Y.
 */
export const TILE_KINDS = {
  vacio:    { solido: true,  altura: 0 },
  asfalto:  { solido: false, altura: 0 },
  acera:    { solido: false, altura: 0 },
  adoquin:  { solido: false, altura: 0 },
  hierba:   { solido: false, altura: 0 },
  tierra:   { solido: false, altura: 0 },
  arena:    { solido: false, altura: 0 },
  cesped:      { solido: false, altura: 0 },
  cespedClaro: { solido: false, altura: 0 },
  marca:       { solido: false, altura: 0 },
  muelle:   { solido: false, altura: 0 },
  baldosa:  { solido: false, altura: 0 },
  nave:      { solido: false, altura: 0 },
  naveLinea: { solido: false, altura: 0 },
  azotea:   { solido: false, altura: 0 },
  rail:     { solido: false, altura: 0 },
  metal:    { solido: false, altura: 0 },
  agua:     { solido: true,  altura: 0 },
  muro:     { solido: true,  altura: 1 },
  seto:     { solido: true,  altura: 1 },
  verja:    { solido: true,  altura: 1 },
  cornisa:  { solido: true,  altura: 1 },
  fachada:  { solido: true,  altura: 1 },
  ventana:  { solido: true,  altura: 1 },
  puerta:   { solido: true,  altura: 1 },
  techo:    { solido: true,  altura: 1 },

  /* ── Interiores del instituto ─────────────────────────────────────────
   * Un interior se construye igual que una calle: suelo pisable abajo y una banda de pared
   * de altura 1 arriba, que es la que da el volumen. Lo único que cambia son las texturas.
   *
   * `pizarra`, `taquilla` y `corcho` son PARED, no mobiliario: son la cara vertical del
   * fondo de la sala, igual que `fachada` lo es de un edificio. Lo que se puede rodear —un
   * pupitre, la mesa del profesor— es un bulto y vive en `props.js`.
   */
  parquet:  { solido: false, altura: 0 },
  linoleo:  { solido: false, altura: 0 },
  azulejo:  { solido: false, altura: 0 },
  paredInt: { solido: true,  altura: 1 },
  pizarra:  { solido: true,  altura: 1 },
  taquilla: { solido: true,  altura: 1 },
  corcho:   { solido: true,  altura: 1 },
};

/** El orden es el del atlas: la fila de un tipo es su índice aquí. */
export const TILE_ORDER = Object.keys(TILE_KINDS);

export const TILE_ROW = TILE_ORDER.reduce((acc, id, i) => ({ ...acc, [id]: i }), {});

export function isSolid(kind) {
  return TILE_KINDS[kind]?.solido ?? true;
}

/**
 * La variante de una celda. Determinista y estable: la misma casilla del mismo mapa saca
 * siempre el mismo adoquín, de modo que el suelo no titila entre fotogramas ni cambia al
 * volver a entrar en el distrito.
 */
export function variantAt(x, y, salt = 0) {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) % VARIANTS;
}

/* ── Las recetas ─────────────────────────────────────────────────────────────────── */

/**
 * Cada receta recibe un `Painter` limpio y la variante. Ninguna consulta la hora ni el
 * distrito: eso es luz, y la luz va en otra capa.
 */
const RECIPES = {
  vacio(p) {
    p.fill(hex("#0a0e18"));
  },

  asfalto(p, v) {
    const c = ramp("#2b3038", "#343a43", "#3d434d", "#474e58");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.86) p.set(x, y, c[3]);
        else if (n > 0.68) p.set(x, y, c[2]);
        else if (n < 0.14) p.set(x, y, c[0]);
      }
    }
    // Una grieta cada cuatro variantes: el asfalto de Marés está viejo.
    if (v === 2) {
      let x = 3;
      for (let y = 1; y < TILE - 1; y += 1) {
        p.set(x, y, c[0]);
        x += noise(x, y, v, 7) > 0.6 ? 1 : 0;
      }
    }
  },

  acera(p, v) {
    // Gris cálido, no azulado: la acera de una ciudad portuaria del sur está sucia de sal y
    // de sol, y en azul se leía como hielo.
    const c = ramp("#585349", "#6b6659", "#787264", "#847d6e");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.9) p.set(x, y, c[2]);
        else if (n < 0.1) p.set(x, y, c[0]);
      }
    }
    // La junta de la losa, en dos bordes para que al alicatar no salga doble línea, y con
    // alfa baja: al cubrir veinte metros, una junta opaca convierte el suelo en una rejilla.
    p.hline(0, 0, TILE - 1, c[0], 130);
    p.vline(0, 0, TILE - 1, c[0], 130);
    p.hline(1, 1, TILE - 1, c[3], 60);
  },

  adoquin(p, v) {
    // Piedra gris azulada, deliberadamente lejos del marrón de `muelle` y `tierra`: los tres
    // se tocan en el Puerto Viejo y con la paleta anterior eran el mismo suelo.
    const c = ramp("#3b4147", "#575e66", "#6d757e", "#828b95");
    p.fill(c[0]);
    // Cantos rodados de 5×5 en hiladas trabadas, no ladrillos: cada piedra lleva su brillo
    // arriba a la izquierda y su sombra abajo, que es lo que le da bulto al canto.
    for (let fila = 0; fila < 4; fila += 1) {
      const off = fila % 2 === 0 ? 0 : -3;
      for (let col = -1; col < 4; col += 1) {
        const x0 = col * 6 + off;
        const y0 = fila * 4;
        const t = 1 + (Math.floor(noise(col, fila, v, 3) * 3) % 3);
        p.rect(x0 + 1, y0 + 1, 5, 3, c[t]);
        p.hline(y0 + 1, x0 + 1, x0 + 4, c[Math.min(3, t + 1)], 120);
        p.set(x0 + 1, y0 + 1, c[Math.min(3, t + 1)]);
        p.hline(y0 + 3, x0 + 2, x0 + 5, c[0], 110);
      }
    }
  },

  hierba(p, v) {
    const c = ramp("#33552b", "#3e6633", "#4a7a3c", "#5c9149");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.82) p.set(x, y, c[2]);
        else if (n < 0.16) p.set(x, y, c[0]);
      }
    }
    // Briznas: dos píxeles en vertical, que es lo que hace que la hierba parezca hierba.
    for (let i = 0; i < 7; i += 1) {
      const x = Math.floor(noise(i, 1, v, 11) * TILE);
      const y = Math.floor(noise(i, 2, v, 13) * (TILE - 3)) + 1;
      p.set(x, y, c[3]);
      p.set(x, y + 1, c[3]);
    }
    if (v === 3) {
      const x = 4 + Math.floor(noise(5, 5, v) * 7);
      const y = 4 + Math.floor(noise(6, 6, v) * 7);
      p.set(x, y, hex("#e6d67a"));
      p.set(x + 1, y, hex("#f2e79a"));
    }
  },

  tierra(p, v) {
    // Tierra seca y olivácea, no chocolate: la separa de la madera del muelle.
    const c = ramp("#4a4530", "#5b553c", "#6a6248", "#7a7156");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.84) p.set(x, y, c[3]);
        else if (n > 0.66) p.set(x, y, c[2]);
        else if (n < 0.15) p.set(x, y, c[0]);
      }
    }
    for (let i = 0; i < 4; i += 1) {
      const x = Math.floor(noise(i, 9, v, 21) * (TILE - 2));
      const y = Math.floor(noise(i, 10, v, 23) * (TILE - 1));
      p.set(x, y, c[0]);
      p.set(x + 1, y, c[3]);
    }
  },

  arena(p, v) {
    const c = ramp("#a8905f", "#bda372", "#c9b189", "#d8c39d");
    p.fill(c[2]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.88) p.set(x, y, c[3]);
        else if (n < 0.12) p.set(x, y, c[1]);
      }
    }
    // Conchas y guijarros sueltos. Aquí había una línea de marea sinusoidal: como la
    // variante sale del hash de la casilla, salía un alambre serpenteando por toda la playa.
    for (let i = 0; i < 3; i += 1) {
      const x = 2 + Math.floor(noise(i, 7, v, 61) * (TILE - 4));
      const y = 2 + Math.floor(noise(i, 8, v, 67) * (TILE - 4));
      p.set(x, y, c[3]);
      p.set(x + 1, y, c[1]);
    }
  },

  cesped(p, v) {
    const c = ramp("#2f5c2c", "#3a6f36", "#417a3c", "#4c8a46");
    // Uniforme a propósito. Las franjas de corte del campo son cosa del MAPA, que alterna
    // columnas de `cesped` y `cespedClaro`; si dependieran de la variante saldrían a
    // manchas, porque la variante es el hash de la casilla y no su columna.
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.88) p.set(x, y, c[3]);
        else if (n < 0.1) p.set(x, y, c[0]);
      }
    }
  },

  cespedClaro(p, v) {
    const c = ramp("#356630", "#417a3c", "#4c8a46", "#5b9c54");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.88) p.set(x, y, c[3]);
        else if (n < 0.1) p.set(x, y, c[0]);
      }
    }
  },

  marca(p, v) {
    RECIPES.cesped(p, v);
    // La cal de la línea de banda. Nunca perfecta: se pinta con alfa alta pero con algún
    // píxel comido, porque una línea de 16 px opaca y recta lee a interfaz, no a campo.
    for (let y = 0; y < TILE; y += 1) {
      if (noise(0, y, v, 91) > 0.12) p.set(7, y, hex("#e8eadf"), 225);
      if (noise(1, y, v, 93) > 0.2) p.set(8, y, hex("#cfd3c6"), 200);
    }
  },

  muelle(p, v) {
    // Madera claramente madera: más saturada y más clara que la tierra, con clavos.
    const c = ramp("#4b3521", "#6a4a2c", "#87613b", "#a37b4e");
    p.fill(c[2]);
    for (let y = 0; y < TILE; y += 1) {
      const enJunta = y % 5 === 0;
      for (let x = 0; x < TILE; x += 1) {
        if (enJunta) p.set(x, y, c[0]);
        else {
          const n = noise(x, y, v);
          if (n > 0.85) p.set(x, y, c[3]);
          else if (n < 0.2) p.set(x, y, c[1]);
        }
      }
    }
    // Veta larga y clavos: los dos detalles que dicen "tablón" a 16 px.
    p.hline(2 + (v % 3), 1, 13, c[1], 120);
    p.set(3, 3, c[0]);
    p.set(12, 8, c[0]);
    p.set(3, 13, c[0]);
  },

  baldosa(p, v) {
    const c = ramp("#8d8f95", "#a5a7ad", "#b8bac0", "#c9cbd1");
    p.fill(c[2]);
    // Damero de 8: suelo de interior de edificio público.
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const claro = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
        p.set(x, y, claro ? c[2] : c[1]);
        if (noise(x, y, v) > 0.94) p.set(x, y, c[3]);
      }
    }
    p.hline(0, 0, TILE - 1, c[0], 170);
    p.vline(0, 0, TILE - 1, c[0], 170);
    p.hline(8, 0, TILE - 1, c[0], 110);
    p.vline(8, 0, TILE - 1, c[0], 110);
  },

  nave(p, v) {
    const c = ramp("#3f4348", "#4d5257", "#5a5f65", "#686d74");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.9) p.set(x, y, c[2]);
        else if (n < 0.1) p.set(x, y, c[0]);
      }
    }
    // Manchas de aceite, pocas y en todas las variantes: el Polígono Norte huele a esto.
    // La línea amarilla de seguridad que había aquí se ha ido a su propio tipo, `naveLinea`:
    // como variante salía sembrada al azar por toda la nave en vez de marcar un pasillo.
    for (let i = 0; i < 4; i += 1) {
      const x = 3 + Math.floor(noise(i, 3, v, 5) * 10);
      const y = 3 + Math.floor(noise(i, 4, v, 5) * 10);
      p.set(x, y, hex("#22262c"), 190);
      p.set(x + 1, y, hex("#22262c"), 120);
    }
  },

  naveLinea(p, v) {
    RECIPES.nave(p, v);
    p.rect(0, 6, TILE, 3, hex("#b79a34"));
    for (let x = 0; x < TILE; x += 1) {
      // Pintura comida por el paso de las carretillas.
      if (noise(x, 0, v, 77) > 0.7) p.rect(x, 6, 1, 3, hex("#5a5f65"), 200);
    }
  },

  azotea(p, v) {
    const c = ramp("#3a3d44", "#474b53", "#525761", "#5f646f");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.72) p.set(x, y, c[2]);
        else if (n > 0.6) p.set(x, y, c[3]);
        else if (n < 0.2) p.set(x, y, c[0]);
      }
    }
  },

  rail(p, v) {
    const c = ramp("#3a3630", "#4a453d", "#585249", "#6a6358");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        if (noise(x, y, v) > 0.7) p.set(x, y, c[2]);
        else if (noise(x, y, v, 2) > 0.9) p.set(x, y, c[3]);
      }
    }
    // Traviesa y los dos carriles de acero. La vía corre en horizontal.
    p.rect(0, 6, TILE, 4, hex("#4a3a2a"));
    p.hline(4, 0, TILE - 1, hex("#8f949c"));
    p.hline(5, 0, TILE - 1, hex("#c2c7cf"));
    p.hline(11, 0, TILE - 1, hex("#8f949c"));
    p.hline(12, 0, TILE - 1, hex("#c2c7cf"));
  },

  metal: (p, v) => {
    const c = ramp("#4b515a", "#5a616b", "#69707b", "#7b838f");
    p.fill(c[1]);
    p.hline(0, 0, TILE - 1, c[0]);
    p.vline(0, 0, TILE - 1, c[0]);
    p.hline(1, 1, TILE - 1, c[3], 90);
    // Remaches en las esquinas: la lectura instantánea de "esto es chapa".
    for (const [rx, ry] of [[3, 3], [12, 3], [3, 12], [12, 12]]) {
      p.set(rx, ry, c[3]);
      p.set(rx + 1, ry, c[2]);
      p.set(rx, ry + 1, c[2]);
      p.set(rx + 1, ry + 1, c[0]);
    }
    if (noise(v, v, v) > 0.5) p.rect(6, 7, 4, 2, hex("#6b4a2e"), 120);
  },

  agua(p, v) {
    // El agua se dibuja con BANDAS, no con ruido por píxel. La versión anterior sembraba
    // píxeles sueltos y salía nieve de televisor: el ojo lee "agua" en la ondulación
    // horizontal continua y en el brillo aislado, no en la textura.
    const c = ramp("#0f2c3d", "#164257", "#1e5a75", "#3c8fae");
    for (let y = 0; y < TILE; y += 1) {
      // La onda depende SÓLO de la fila dentro del tile, nunca de la variante. Si dependiera
      // de la variante, dos casillas contiguas tendrían fases distintas y la dársena entera
      // se vería a cuadros: era el defecto más visible de la primera pasada.
      const onda = Math.sin(y / 2.6) + Math.sin(y * 1.7 / 4.1) * 0.5;
      const tono = onda > 0.9 ? c[2] : onda < -0.9 ? c[0] : c[1];
      p.hline(y, 0, TILE - 1, tono);
    }
    // Dos crestas cortas por tile: el destello del agua, que es lo que la hace parecer viva.
    for (let i = 0; i < 2; i += 1) {
      const y = 1 + Math.floor(noise(i, v, v, 51) * (TILE - 2));
      const x = Math.floor(noise(i, v, v, 53) * (TILE - 5));
      p.hline(y, x, x + 3, c[3], 190);
      p.hline(y + 1, x + 1, x + 2, c[3], 90);
    }
  },

  muro(p, v) {
    const c = ramp("#3b3630", "#4d4740", "#5c554c", "#6d6559");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.86) p.set(x, y, c[2]);
        else if (n < 0.14) p.set(x, y, c[0]);
      }
    }
    // Coronación clara arriba y sombra abajo: con esos dos gestos un cuadrado plano pasa
    // a leerse como un volumen visto desde arriba y en escorzo.
    p.rect(0, 0, TILE, 2, c[3]);
    p.rect(0, TILE - 3, TILE, 3, hex("#241f1b"), 190);
  },

  seto(p, v) {
    // Un seto no es hierba alta: es un MURO de hoja. Lo que lo separaba mal de `hierba` era
    // que compartían tono medio y que los grumos no tenían luz propia. Ahora el fondo es
    // casi negro, cada grumo lleva su brillo arriba a la izquierda y su sombra abajo, y hay
    // una base oscura de tres píxeles que lo asienta contra el suelo.
    const c = ramp("#0e2210", "#1c3d1a", "#2c5c27", "#437f38");
    p.fill(c[0]);
    for (let i = 0; i < 12; i += 1) {
      const cx = Math.floor(noise(i, 1, v, 31) * TILE);
      const cy = Math.floor(noise(i, 2, v, 37) * (TILE - 2));
      const r = 2 + Math.floor(noise(i, 3, v, 41) * 2);
      for (let y = -r; y <= r; y += 1) {
        for (let x = -r; x <= r; x += 1) {
          const d = x * x + y * y;
          if (d > r * r) continue;
          // La luz cae desde arriba a la izquierda, igual que en todo el juego.
          const luz = x + y < -r * 0.4 ? c[3] : x + y > r * 0.7 ? c[1] : c[2];
          p.set(cx + x, cy + y, luz);
        }
      }
    }
    p.rect(0, TILE - 3, TILE, 3, c[0], 215);
    p.hline(TILE - 4, 0, TILE - 1, c[1], 140);
  },

  verja(p, v) {
    const barra = hex("#8a9099");
    const sombra = hex("#161b25");
    // La verja es casi toda aire. Se pinta con alfa para que se vea el suelo detrás, que es
    // lo que la distingue de un muro a simple vista.
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        if ((x + y) % 4 === 0) p.set(x, y, barra, 150);
        else if ((x - y + TILE) % 4 === 0) p.set(x, y, barra, 110);
      }
    }
    p.vline(0, 0, TILE - 1, barra, 230);
    if (v % 2 === 0) p.vline(TILE - 1, 0, TILE - 1, barra, 230);
    p.hline(0, 0, TILE - 1, barra, 230);
    p.hline(TILE - 1, 0, TILE - 1, sombra, 90);
  },

  /**
   * EL BORDE DEL TEJADO, y la pieza que convierte una banda en un edificio.
   *
   * Sin ella, una manzana vista desde arriba es una franja oscura pegada a una franja clara
   * y el ojo la lee como dos suelos distintos, no como un volumen. La cornisa da la cota:
   * canalón claro arriba, vuelo, y la sombra que el alero proyecta sobre su propia fachada.
   * Tres bandas de píxeles, y de golpe el edificio tiene altura.
   */
  cornisa(p, v) {
    const c = ramp("#4a443d", "#6d6559", "#8d8478", "#a9a091");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        if (noise(x, y, v) > 0.9) p.set(x, y, c[2]);
      }
    }
    p.rect(0, 0, TILE, 3, c[2]);        // el canalón
    p.hline(0, 0, TILE - 1, c[3]);      // su brillo
    p.hline(3, 0, TILE - 1, c[0]);      // el vuelo
    p.rect(0, 4, TILE, 4, hex("#3a342e"), 130); // la sombra del alero sobre la fachada
    for (let y = 9; y < TILE; y += 5) p.hline(y, 0, TILE - 1, c[0], 160);
  },

  fachada(p, v) {
    // Estuco claro, no muro oscuro. La fachada es donde vive el volumen de la ciudad: si es
    // una banda negra, Marés parece un decorado recortado. Y la sillería tiene que VERSE —
    // antes iba a alfa 110 sobre un fondo oscuro y desaparecía.
    const c = ramp("#5b5148", "#7a6f63", "#8d8173", "#a09384");
    p.fill(c[2]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.88) p.set(x, y, c[3]);
        else if (n < 0.12) p.set(x, y, c[1]);
      }
    }
    // Hiladas de sillar con junta vertical trabada.
    for (let fila = 0; fila < 3; fila += 1) {
      const y = fila * 5 + 4;
      p.hline(y, 0, TILE - 1, c[0], 170);
      p.hline(y + 1, 0, TILE - 1, c[3], 70);
      const jx = fila % 2 === 0 ? 4 : 11;
      p.vline(jx, y - 4, y - 1, c[0], 150);
    }
    p.rect(0, TILE - 2, TILE, 2, hex("#2b2521"), 150);
  },

  ventana(p, v) {
    RECIPES.fachada(p, v);
    const marco = hex("#2b2723");
    // El cristal apagado lleva su propio reflejo del cielo. Sin él, la ventana sin luz es un
    // agujero negro en la fachada y el edificio parece bombardeado.
    const cristal = hex("#33414f");
    const luz = hex("#e8c877");
    p.rect(3, 3, 10, 9, marco);
    // Una de cada dos ventanas está encendida. Marés es una ciudad con gente dentro.
    const encendida = v % 2 === 0;
    p.rect(4, 4, 8, 7, encendida ? luz : cristal, encendida ? 235 : 255);
    if (encendida) {
      p.rect(4, 4, 8, 2, hex("#f4e0a4"));
      p.rect(6, 7, 3, 4, hex("#b89a56"), 170);
    } else {
      p.rect(4, 4, 8, 3, hex("#4a5a6b"), 200);
      p.set(5, 8, hex("#465464"));
    }
    p.vline(8, 4, 10, marco);
    p.hline(7, 4, 11, marco);
  },

  /**
   * EL PORTAL. Sigue siendo sólido —se entra por disparador, no atravesando el tile—, pero
   * sin él una manzana es un muro continuo y el jugador no tiene ni idea de dónde vive.
   *
   * El escalón claro de abajo es la mitad del trabajo: es lo que hace que la puerta se lea
   * como una abertura a ras de acera y no como un cuadro colgado en la pared.
   */
  puerta(p, v) {
    RECIPES.fachada(p, v);
    const marco = hex("#4a3a2c");
    const hueco = hex("#171b22");
    const madera = hex("#6b4a30");
    p.rect(4, 3, 8, 13, marco);
    p.rect(5, 4, 6, 11, madera);
    p.rect(5, 4, 6, 3, hueco);            // el montante de cristal, oscuro
    p.hline(4, 5, 10, hex("#3a4a58"));
    p.vline(8, 8, 14, shade(madera, -0.34));
    p.set(7, 11, hex("#c8a44a"));         // el tirador
    p.rect(3, 15, 10, 1, shade(marco, 0.5));
    p.rect(3, 14, 10, 1, hex("#8d8478"));  // el escalón
  },

  techo(p, v) {
    const c = ramp("#33383f", "#40454d", "#4b515a", "#585f69");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.88) p.set(x, y, c[2]);
        else if (n < 0.12) p.set(x, y, c[0]);
      }
    }
    // Chapa ondulada: la nave del polígono y los tejadillos del puerto.
    for (let x = 0; x < TILE; x += 4) {
      p.vline(x, 0, TILE - 1, c[3], 120);
      p.vline(x + 1, 0, TILE - 1, c[0], 100);
    }
  },

  /* ── Interiores del instituto ───────────────────────────────────── */

  /**
   * Tarima de aula.
   *
   * LA PRIMERA VERSIÓN PARECIÓ UN MURO DE LADRILLO. La culpa fue de tres cosas juntas: junta
   * marcada cada 8 píxeles, testa de listón en cada tile y ruido a plena fuerza. Con eso, el
   * ojo agrupa los rectángulos y lee aparejo, no suelo. La madera se lee cuando la VETA pesa
   * más que la junta: aquí la veta es larga y visible, la junta va a un tercio de alfa, y la
   * testa aparece en una de cada cuatro celdas en vez de en todas.
   */
  parquet(p, v) {
    const c = ramp("#7a5a38", "#96703f", "#ab8250", "#c09a67");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        // Veta larga: varía mucho en x y casi nada en y, que es como corre una fibra.
        const fibra = noise(Math.floor(x / 2), Math.floor(y / 8) + v * 3, v + 7);
        p.set(x, y, fibra > 0.62 ? c[2] : fibra < 0.24 ? c[0] : c[1]);
      }
    }
    // Un solo listón por tile, de 8 píxeles, y la junta apenas insinuada.
    p.hline(0, 0, TILE - 1, shade(c[0], -0.3), 70);
    p.hline(8, 0, TILE - 1, shade(c[0], -0.3), 55);
    // Brillo de barniz, en diagonal suave: es lo que dice «esto es horizontal y se pisa».
    for (let x = 0; x < TILE; x += 1) {
      if ((x + v * 5) % 13 === 0) p.vline(x, 0, TILE - 1, c[3], 26);
    }
    // Testa del listón sólo en una de cada cuatro celdas.
    if (v === 0) p.vline(11, 0, 7, shade(c[0], -0.25), 90);
  },

  /** Lin\u00f3leo de pasillo: damero grande de instituci\u00f3n p\u00fablica, m\u00e1s fr\u00edo que el aula. */
  linoleo(p, v) {
    const c = ramp("#4e5a55", "#6d7b74", "#8c9a92", "#a8b4ac");
    p.fill(c[2]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const claro = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0;
        p.set(x, y, claro ? c[2] : c[1]);
        // El moteado del lin\u00f3leo barato, que es lo que lo hace reconocible.
        if (noise(x, y, v) > 0.9) p.set(x, y, c[3]);
        else if (noise(x, y, v + 3) < 0.08) p.set(x, y, c[0]);
      }
    }
    p.hline(0, 0, TILE - 1, c[0], 90);
    p.vline(0, 0, TILE - 1, c[0], 90);
  },

  /** Gres de laboratorio: pieza peque\u00f1a, junta clara, superficie que se friega. */
  azulejo(p, v) {
    const c = ramp("#59615f", "#79837f", "#98a29c", "#b6bfb8");
    p.fill(c[1]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) p.set(x, y, noise(x, y, v) > 0.88 ? c[2] : c[1]);
    }
    for (const k of [0, 4, 8, 12]) {
      p.hline(k, 0, TILE - 1, c[3], 120);
      p.vline(k, 0, TILE - 1, c[3], 120);
    }
    if (v % 3 === 0) p.rect(5, 5, 3, 3, c[0], 90);
  },

  /** Pared interior: got\u00e9 pintado y z\u00f3calo oscuro abajo. La base de las otras tres. */
  paredInt(p, v) {
    const c = ramp("#6f6a5e", "#938d7e", "#b3ac9a", "#cfc7b3");
    p.fill(c[2]);
    for (let y = 0; y < TILE; y += 1) {
      for (let x = 0; x < TILE; x += 1) {
        const n = noise(x, y, v);
        if (n > 0.84) p.set(x, y, c[3]);
        else if (n < 0.16) p.set(x, y, c[1]);
      }
    }
    // Coronaci\u00f3n clara arriba y z\u00f3calo abajo: los dos gestos que dan volumen a un plano.
    p.rect(0, 0, TILE, 2, c[3]);
    p.rect(0, TILE - 4, TILE, 4, shade(c[0], -0.15));
    p.hline(TILE - 5, 0, TILE - 1, c[3], 120);
  },

  /** El encerado: verde apagado, marco de madera y lo que no se borr\u00f3 del todo. */
  pizarra(p, v) {
    RECIPES.paredInt(p, v);
    const madera = hex("#5a4630");
    const verde = hex("#20362c");
    const tiza = hex("#d8e0d4");
    p.rect(0, 1, TILE, 11, madera);
    p.rect(1, 2, TILE - 2, 9, verde);
    // Restos de tiza: trazos horizontales medio borrados, NUNCA letras legibles \u2014 a 16 px
    // una letra es una mancha, y una mancha que pretende ser letra se lee como suciedad.
    for (let i = 0; i < 3; i += 1) {
      const y = 4 + ((v + i * 2) % 6);
      const x0 = 2 + ((v * 3 + i * 5) % 5);
      p.hline(y, x0, x0 + 4 + ((v + i) % 5), tiza, 40 + ((v + i) % 3) * 25);
    }
    // La canaleta de las tizas, que es lo que hace que una pizarra sea una pizarra.
    p.hline(11, 0, TILE - 1, shade(madera, 0.25));
    p.hline(12, 0, TILE - 1, shade(madera, -0.4));
    if (v % 2 === 0) p.rect(4, 10, 3, 1, tiza, 220);
  },

  /** Taquillas: dos puertas por tile, con rejilla, tirador y alg\u00fan bomb\u00edn de lat\u00f3n. */
  taquilla(p, v) {
    RECIPES.paredInt(p, v);
    const chapa = ramp("#2f4a5c", "#3d6076", "#4a7590", "#6a94ad");
    p.rect(0, 0, TILE, 13, chapa[1]);
    for (const x0 of [0, 8]) {
      p.rect(x0 + 1, 1, 6, 11, chapa[1]);
      p.vline(x0 + 1, 1, 11, chapa[3], 170);
      p.vline(x0 + 6, 1, 11, chapa[0], 200);
      p.hline(1, x0 + 1, x0 + 6, chapa[2], 150);
      for (const y of [3, 5, 7]) p.hline(y, x0 + 3, x0 + 5, chapa[0], 190);
      p.rect(x0 + 2, 8, 1, 3, chapa[3]);
      if ((v + x0) % 3 === 0) p.set(x0 + 5, 9, hex("#cbb46a"));
    }
    p.vline(7, 0, 12, chapa[0], 220);
    // La junta con el suelo: sin ella las taquillas flotan.
    p.rect(0, 12, TILE, 2, shade(chapa[0], -0.4));
  },

  /** Corcho de anuncios: folios clavados, ninguno legible, todos torcidos. */
  corcho(p, v) {
    RECIPES.paredInt(p, v);
    const tabla = ramp("#6b5330", "#8a6c40", "#a6864f", "#c0a069");
    p.rect(1, 1, TILE - 2, 11, tabla[1]);
    for (let y = 1; y < 12; y += 1) {
      for (let x = 1; x < TILE - 1; x += 1) {
        if (noise(x, y, v + 11) > 0.7) p.set(x, y, tabla[2]);
      }
    }
    p.rect(0, 0, TILE, 1, tabla[0]);
    for (const [fx, fy, fw, fh] of [[2, 3, 5, 6], [9, 2, 5, 7]]) {
      const off = (v + fx) % 2;
      p.rect(fx, fy + off, fw, fh, hex("#e6e2d6"));
      p.hline(fy + off, fx, fx + fw - 1, hex("#f4f1e8"));
      p.vline(fx + fw - 1, fy + off, fy + off + fh - 1, hex("#bdb8a8"));
      for (let i = 1; i < fh - 1; i += 2) p.hline(fy + off + i, fx + 1, fx + fw - 2, hex("#9a9488"), 120);
      p.set(fx + Math.floor(fw / 2), fy + off, hex("#c8453a"));
    }
  },

};

/* ── El horno ────────────────────────────────────────────────────────────────────── */

/**
 * Los píxeles de un tile, en crudo y sin canvas de por medio.
 *
 * Existe como función pública por dos razones que no son de estilo: los tests pueden
 * afirmar cosas sobre el color de una celda sin montar un DOM, y el visor de arte de
 * `scripts/` puede volcar el atlas a PNG desde Node — que es la única forma de MIRAR el
 * pixel art antes de meterlo en el juego, y este archivo se escribió mirándolo.
 */
export function paintTile(kind, v = 0) {
  const receta = RECIPES[kind] ?? RECIPES.vacio;
  const painter = new Painter(TILE);
  receta(painter, v);
  return { data: painter.data, size: TILE };
}

/**
 * Devuelve un único canvas con todas las variantes de todos los tipos: una fila por tipo,
 * una columna por variante. Un solo atlas significa un solo `drawImage` por celda sin
 * cambiar de origen, que es la diferencia entre pintar un mapa de 40×30 en un fotograma o
 * en tres.
 *
 * `crear` se inyecta para poder hornear en un `OffscreenCanvas` cuando existe y en un
 * `<canvas>` normal cuando no, sin que este módulo conozca al documento.
 */
export function bakeTileAtlas({ crear = defaultCanvas } = {}) {
  const filas = TILE_ORDER.length;
  const canvas = crear(VARIANTS * TILE, filas * TILE);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  TILE_ORDER.forEach((kind, fila) => {
    for (let v = 0; v < VARIANTS; v += 1) {
      const { data } = paintTile(kind, v);
      ctx.putImageData(new ImageData(data, TILE, TILE), v * TILE, fila * TILE);
    }
  });

  return { canvas, ancho: VARIANTS * TILE, alto: filas * TILE };
}

export function defaultCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Dónde está en el atlas el tile `kind` en su variante `v`. */
export function atlasSource(kind, v) {
  const fila = TILE_ROW[kind] ?? TILE_ROW.vacio;
  return { sx: v * TILE, sy: fila * TILE, sw: TILE, sh: TILE };
}
