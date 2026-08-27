/**
 * Visor de arte de FULGOR.
 *
 * Vuelca a PNG lo que dibujan los constructores de `src/games/arcade/fulgor/world/`, sin
 * navegador y sin dependencias: las recetas son puras y devuelven píxeles, y aquí sólo hay
 * un codificador PNG mínimo sobre el `zlib` de Node.
 *
 * Existe porque el pixel art escrito a ciegas sale mal. Esto es el espejo.
 *
 *   node scripts/fulgor-art-preview.mjs            → todas las hojas
 *   node scripts/fulgor-art-preview.mjs tiles      → sólo el atlas de suelo
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import { TILE, TILE_ORDER, VARIANTS, paintTile, variantAt } from "../src/games/arcade/fulgor/world/tiles.js";
import { PROPS, PROP_IDS, paintProp } from "../src/games/arcade/fulgor/world/props.js";
import { compilar } from "../src/games/arcade/fulgor/world/maps.js";
import { ordenarPorProfundidad } from "../src/games/arcade/fulgor/world/render.js";
import { puntosDeInteres } from "../src/games/arcade/fulgor/world/escenario.js";
import { ANIMOS_VALIDOS, CAST, DIRS, RETRATO_H, RETRATO_W, SPRITE_H, SPRITE_W, paintCharacter, paintPortrait } from "../src/games/arcade/fulgor/world/sprites.js";

const OUT = path.resolve("tmp/fulgor-art");

/* ── PNG mínimo (RGBA, sin filtros, sin entrelazado) ─────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bits por canal
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filtro None
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4)
      .copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ── Un lienzo de trabajo con blit y escalado entero ─────────────────────────────── */

class Sheet {
  constructor(w, h, fondo = [16, 20, 30, 255]) {
    this.w = w;
    this.h = h;
    this.px = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i += 1) this.px.set(fondo, i * 4);
  }

  /** Pega `src` (ancho×alto RGBA) en (dx, dy) ampliado por `escala`, respetando el alfa. */
  blit(src, ancho, dx, dy, escala = 1, alto = ancho) {
    for (let y = 0; y < alto; y += 1) {
      for (let x = 0; x < ancho; x += 1) {
        const i = (y * ancho + x) * 4;
        const a = src[i + 3] / 255;
        if (a === 0) continue;
        for (let sy = 0; sy < escala; sy += 1) {
          for (let sx = 0; sx < escala; sx += 1) {
            const px = dx + x * escala + sx;
            const py = dy + y * escala + sy;
            if (px < 0 || py < 0 || px >= this.w || py >= this.h) continue;
            const j = (py * this.w + px) * 4;
            this.px[j] = src[i] * a + this.px[j] * (1 - a);
            this.px[j + 1] = src[i + 1] * a + this.px[j + 1] * (1 - a);
            this.px[j + 2] = src[i + 2] * a + this.px[j + 2] * (1 - a);
            this.px[j + 3] = 255;
          }
        }
      }
    }
  }

  rect(x, y, w, h, color) {
    for (let j = 0; j < h; j += 1) {
      for (let i = 0; i < w; i += 1) {
        const px = x + i;
        const py = y + j;
        if (px < 0 || py < 0 || px >= this.w || py >= this.h) continue;
        this.px.set(color, (py * this.w + px) * 4);
      }
    }
  }

  save(nombre) {
    fs.mkdirSync(OUT, { recursive: true });
    const destino = path.join(OUT, nombre);
    fs.writeFileSync(destino, encodePng(this.w, this.h, this.px));
    console.log(`  ${destino}  (${this.w}×${this.h})`);
  }
}

/* ── Hoja 1: el atlas de suelo, cada tipo con sus cuatro variantes ───────────────── */

function hojaTiles() {
  const ESCALA = 4;
  const CELDA = TILE * ESCALA;
  const MARGEN = 6;
  const ETIQUETA = 76; // hueco a la izquierda para saber qué es cada fila
  const w = ETIQUETA + VARIANTS * (CELDA + MARGEN) + MARGEN;
  const h = MARGEN + TILE_ORDER.length * (CELDA + MARGEN);
  const hoja = new Sheet(w, h);

  TILE_ORDER.forEach((kind, fila) => {
    const y = MARGEN + fila * (CELDA + MARGEN);
    // Una barra de color por fila para poder contarlas de un vistazo.
    hoja.rect(4, y, 3, CELDA, [56, 225, 255, 255]);
    for (let v = 0; v < VARIANTS; v += 1) {
      const { data, size } = paintTile(kind, v);
      hoja.blit(data, size, ETIQUETA + v * (CELDA + MARGEN), y, ESCALA);
    }
  });

  hoja.save("01-tiles.png");
  console.log(`  filas, de arriba abajo: ${TILE_ORDER.join(", ")}`);
}

/* ── Hoja 2: un trozo de calle alicatado de verdad ───────────────────────────────── */

/**
 * Mirar un tile suelto no dice nada: lo que hay que juzgar es si al alicatarlo se ve la
 * retícula. Esta hoja pinta un fragmento de calle con acera, bordillo, fachadas y un
 * charco para comprobar exactamente eso.
 */
function hojaCalle() {
  const ESCALA = 3;
  const MAPA = [
    "TTTTTTTTTTTTTTTT",
    "TTTTTTTTTTTTTTTT",
    "FVFFVFFVFFVFFVFF",
    "cccccccccccccccc",
    "cccccccccccccccc",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaa",
    "cccccccccccccccc",
    "sssshhhhhhhhssss",
    "hhhhhhhhhhhhhhhh",
    "hhhhpppppppphhhh",
    "ppppppppppppppp p".replace(" ", "p"),
    "mmmmmmmmmmmmmmmm",
    "wwwwwwwwwwwwwwww",
  ];
  const CLAVE = {
    T: "techo", F: "fachada", V: "ventana", c: "acera", a: "asfalto",
    s: "seto", h: "hierba", p: "adoquin", m: "muelle", w: "agua",
  };

  const cols = MAPA[0].length;
  const filas = MAPA.length;
  const hoja = new Sheet(cols * TILE * ESCALA, filas * TILE * ESCALA);

  for (let y = 0; y < filas; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const kind = CLAVE[MAPA[y][x]] ?? "vacio";
      // La misma función de variante que usa el juego, para que la hoja mienta lo mínimo.
      let hsh = (x * 73856093) ^ (y * 19349663);
      hsh = Math.imul(hsh ^ (hsh >>> 15), 2246822507);
      hsh = Math.imul(hsh ^ (hsh >>> 13), 3266489909);
      const v = ((hsh ^ (hsh >>> 16)) >>> 0) % VARIANTS;
      const { data, size } = paintTile(kind, v);
      hoja.blit(data, size, x * TILE * ESCALA, y * TILE * ESCALA, ESCALA);
    }
  }

  hoja.save("02-calle.png");
}

/* ── Hoja 3: el reparto, cada uno en sus tres direcciones ────────────────────────── */

function hojaReparto() {
  const ESCALA = 4;
  const CW = SPRITE_W * ESCALA;
  const CH = SPRITE_H * ESCALA;
  const HUECO = 4;
  const ids = Object.keys(CAST);
  const PORFILA = 6;
  const filas = Math.ceil(ids.length / PORFILA);
  // Cada personaje ocupa un bloque de 3 direcciones en horizontal.
  const bloqueW = DIRS.length * (CW + HUECO) + 10;
  const hoja = new Sheet(PORFILA * bloqueW, filas * (CH + 14) + 8, [26, 30, 42, 255]);

  ids.forEach((id, i) => {
    const bx = (i % PORFILA) * bloqueW + 4;
    const by = Math.floor(i / PORFILA) * (CH + 14) + 4;
    hoja.rect(bx - 2, by - 2, 3, CH + 4, [56, 225, 255, 255]);
    DIRS.forEach((dir, d) => {
      const p = paintCharacter(id, dir, 0);
      hoja.blit(p.data, SPRITE_W, bx + d * (CW + HUECO), by, ESCALA, SPRITE_H);
    });
  });

  hoja.save("03-reparto.png");
  console.log(`  bloques, en lectura normal: ${ids.join(", ")}`);
}

/* ── Hoja 4: el ciclo de andar y el traje ────────────────────────────────────────── */

/**
 * Lo que hay que juzgar aquí no es un sprite, es el MOVIMIENTO: si al recorrer 0-1-0-2 el
 * chaval camina o patina. Y la fila de abajo comprueba la promesa del constructor — que las
 * piezas del traje se ven puestas.
 */
function hojaAndar() {
  const ESCALA = 5;
  const CW = SPRITE_W * ESCALA;
  const CH = SPRITE_H * ESCALA;
  const ciclo = [0, 1, 0, 2];
  const TRAJE = {
    mascara: "#1d2733", torso: "#1f2b3d", guantes: "#38e1ff",
    botas: "#243247", cinturon: "#c8a44a", manto: "#132033",
  };
  const filas = [
    { etiqueta: "dani sur", id: "dani", dir: "sur", traje: null },
    { etiqueta: "dani este", id: "dani", dir: "este", traje: null },
    { etiqueta: "dani norte", id: "dani", dir: "norte", traje: null },
    { etiqueta: "FULGOR sur", id: "dani", dir: "sur", traje: TRAJE },
    { etiqueta: "FULGOR este", id: "dani", dir: "este", traje: TRAJE },
    { etiqueta: "FULGOR norte", id: "dani", dir: "norte", traje: TRAJE },
  ];
  const hoja = new Sheet(ciclo.length * (CW + 6) + 10, filas.length * (CH + 8) + 6, [26, 30, 42, 255]);

  filas.forEach((f, fi) => {
    const y = 4 + fi * (CH + 8);
    hoja.rect(2, y, 3, CH, [56, 225, 255, 255]);
    ciclo.forEach((frame, ci) => {
      const p = paintCharacter(f.id, f.dir, frame, { traje: f.traje });
      hoja.blit(p.data, SPRITE_W, 8 + ci * (CW + 6), y, ESCALA, SPRITE_H);
    });
  });

  hoja.save("04-andar.png");
  console.log(`  filas: ${filas.map((f) => f.etiqueta).join(" · ")}`);
}

/* ── Hoja 5: los bultos ──────────────────────────────────────────────────────────── */

/**
 * Alineados por los PIES y sobre un fondo gris medio, que es donde de verdad se ven: sobre
 * el azul oscuro de las otras hojas, cualquier cosa con contorno parece que funciona.
 */
function hojaBultos() {
  const ESCALA = 4;
  const HUECO = 8;
  const altoMax = Math.max(...PROP_IDS.map((id) => PROPS[id].h));
  const anchoBloque = (id) => PROPS[id].w * 2 * ESCALA + HUECO * 3;
  const total = PROP_IDS.reduce((a, id) => a + anchoBloque(id), 0);
  const hoja = new Sheet(total + 8, altoMax * ESCALA + 20, [104, 108, 118, 255]);

  let x = 4;
  PROP_IDS.forEach((id) => {
    hoja.rect(x - 2, 6, 2, altoMax * ESCALA + 6, [56, 225, 255, 255]);
    for (let v = 0; v < 2; v += 1) {
      const { data, w, h } = paintProp(id, v);
      hoja.blit(data, w, x + v * (PROPS[id].w * ESCALA + HUECO), 10 + (altoMax - h) * ESCALA, ESCALA, h);
    }
    x += anchoBloque(id);
  });

  hoja.save("05-bultos.png");
  console.log(`  bultos: ${PROP_IDS.join(", ")}`);
}

/* ── Hoja 6: un distrito entero ──────────────────────────────────────────────────── */

/**
 * La única hoja que juzga el JUEGO y no una pieza suelta: ¿se lee la calle? ¿se distingue
 * la acera del asfalto? ¿los bultos se apoyan en el suelo o flotan? ¿los personajes se ven
 * contra el fondo o se pierden?
 *
 * Reusa el orden de profundidad de `render.js` —que es puro justamente para esto— y repite
 * a mano sólo el dibujo, que es lo que allí necesita un canvas.
 */
function hojaDistrito(id = "aguas") {
  const mapa = compilar(id);
  const { data: _ignorado } = paintTile("vacio", 0);
  const ESCALA = 2;
  const w = mapa.suelo[0].length * TILE;
  const h = mapa.suelo.length * TILE;
  const hoja = new Sheet(w * ESCALA, h * ESCALA, [10, 14, 24, 255]);

  // Suelo
  for (let ty = 0; ty < mapa.suelo.length; ty += 1) {
    for (let tx = 0; tx < mapa.suelo[ty].length; tx += 1) {
      const kind = mapa.leyenda[mapa.suelo[ty][tx]] ?? "vacio";
      const { data, size } = paintTile(kind, variantAt(tx, ty) % VARIANTS);
      hoja.blit(data, size, tx * TILE * ESCALA, ty * TILE * ESCALA, ESCALA);
    }
  }

  // El héroe donde nace, y los NPC donde los pone el mapa.
  const heroe = { id: "dani", x: mapa.spawn.x, y: mapa.spawn.y, dir: mapa.spawn.dir, paso: 0, andando: false };
  const actores = [heroe, ...mapa.npcs.map((n) => ({ ...n, paso: 0, andando: false }))];

  for (const item of ordenarPorProfundidad(mapa.props, actores)) {
    if (item.clase === "bulto") {
      const b = item.dato;
      const def = PROPS[b.id];
      const { data, w: pw, h: ph } = paintProp(b.id, b.v % 2);
      hoja.blit(data, pw, (b.x - Math.floor(def.w / 2)) * ESCALA, (b.y - def.h + 1) * ESCALA, ESCALA, ph);
    } else {
      const a = item.dato;
      const p = paintCharacter(a.id, a.dir ?? "sur", 0);
      hoja.blit(p.data, SPRITE_W, (a.x - SPRITE_W / 2) * ESCALA, (a.y - SPRITE_H + 1) * ESCALA, ESCALA, SPRITE_H);
    }
  }

  // Los sitios que el mapa da para una Intervención: naranja los descubiertos, azul los de
  // sombra. No están escritos en ninguna parte — salen de la rejilla.
  for (const punto of puntosDeInteres(mapa, 14)) {
    const color = punto.sombra ? [80, 150, 255, 255] : [255, 150, 60, 255];
    hoja.rect((punto.x - 5) * ESCALA, (punto.y - 5) * ESCALA, 10 * ESCALA, 2 * ESCALA, color);
    hoja.rect((punto.x - 5) * ESCALA, (punto.y + 3) * ESCALA, 10 * ESCALA, 2 * ESCALA, color);
    hoja.rect((punto.x - 5) * ESCALA, (punto.y - 5) * ESCALA, 2 * ESCALA, 10 * ESCALA, color);
    hoja.rect((punto.x + 3) * ESCALA, (punto.y - 5) * ESCALA, 2 * ESCALA, 10 * ESCALA, color);
  }

  // El encuadre real de la partida, marcado en cian: 176×144 alrededor del héroe. Sirve
  // para comprobar que un distrito de 32×24 no es un descampado en la pantalla de verdad.
  const vx = Math.round(heroe.x - 88);
  const vy = Math.round(heroe.y - 8 - 72);
  for (const [x, y, ww, hh] of [[vx, vy, 176, 2], [vx, vy + 142, 176, 2], [vx, vy, 2, 144], [vx + 174, vy, 2, 144]]) {
    hoja.rect(x * ESCALA, y * ESCALA, ww * ESCALA, hh * ESCALA, [56, 225, 255, 255]);
  }

  hoja.save(`06-distrito-${id}.png`);
}

/* ── Hoja 7: los retratos de diálogo ─────────────────────────────────────────────── */

/**
 * Una columna por ánimo. Lo que hay que juzgar es si los cuatro se distinguen a simple
 * vista: si "tenso" y "roto" se parecen, la mitad del guion deja de tener cara.
 */
function hojaRetratos(ids = ["dani", "nuria", "sabater", "chapa", "pilar", "isma", "cero", "julia"]) {
  const ESCALA = 3;
  const CW = RETRATO_W * ESCALA;
  const CH = RETRATO_H * ESCALA;
  const HUECO = 6;
  const hoja = new Sheet(
    ANIMOS_VALIDOS.length * (CW + HUECO) + 10,
    ids.length * (CH + HUECO) + 10,
    [26, 30, 42, 255],
  );

  ids.forEach((id, fila) => {
    const y = 6 + fila * (CH + HUECO);
    hoja.rect(2, y, 3, CH, [56, 225, 255, 255]);
    ANIMOS_VALIDOS.forEach((animo, col) => {
      const p = paintPortrait(id, animo);
      hoja.blit(p.data, RETRATO_W, 8 + col * (CW + HUECO), y, ESCALA, RETRATO_H);
    });
  });

  hoja.save("07-retratos.png");
  console.log(`  columnas: ${ANIMOS_VALIDOS.join(" · ")}`);
  console.log(`  filas: ${ids.join(" · ")}`);
}

/* ── Arranque ────────────────────────────────────────────────────────────────────── */

const que = process.argv[2] ?? "todo";
console.log("FULGOR — visor de arte");
if (que === "todo" || que === "tiles") {
  hojaTiles();
  hojaCalle();
}
if (que === "todo" || que === "bultos") hojaBultos();
if (que === "todo" || que === "distrito") for (const d of ["aguas", "concha", "instituto", "poligono"]) hojaDistrito(d);
if (que === "todo" || que === "retratos") hojaRetratos();
if (que === "todo" || que === "gente") {
  hojaReparto();
  hojaAndar();
}
