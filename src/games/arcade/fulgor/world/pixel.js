/**
 * FULGOR — el pincel de píxeles.
 *
 * Todo el arte del mundo de FULGOR se dibuja píxel a píxel sobre un `Uint8ClampedArray` y
 * no con las primitivas de canvas. La razón es concreta y no es purismo: a 16 píxeles de
 * lado, el antialias de `fillRect` con coordenadas fraccionarias convierte un borde limpio
 * en dos tonos sucios, y el pixel art vive o muere en el borde.
 *
 * Como efecto secundario, el arte queda comprobable y **mirable**: son datos, no llamadas a
 * un contexto, así que `scripts/fulgor-art-preview.mjs` los vuelca a PNG desde Node y los
 * tests pueden afirmar el color de un píxel sin montar un DOM.
 */

export const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** Rampa de tonos. Por convenio el índice 0 es la sombra y el último el brillo. */
export const ramp = (...hexes) => hexes.map(hex);

/** Aclara u oscurece un color hacia el blanco o el negro. `f` en [-1, 1]. */
export function shade(color, f) {
  const objetivo = f >= 0 ? 255 : 0;
  const k = Math.abs(f);
  return color.map((c) => Math.round(c + (objetivo - c) * k));
}

/** Mezcla dos colores. `t` en [0, 1] va de `a` a `b`. */
export function mix(a, b, t) {
  return a.map((c, i) => Math.round(c + (b[i] - c) * t));
}

/**
 * Ruido determinista por píxel. La misma entrada da siempre la misma salida, que es lo que
 * permite que un suelo tenga grano sin titilar entre fotogramas.
 */
export function noise(x, y, v, salt = 0) {
  let h = (x * 374761393) ^ (y * 668265263) ^ (v * 2654435761) ^ (salt * 40503);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/* ── El lienzo ───────────────────────────────────────────────────────────────────── */

export class Painter {
  constructor(w, h = w) {
    this.w = w;
    this.h = h;
    this.size = w; // compatibilidad con los tiles, que son cuadrados
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  set(x, y, color, alpha = 255) {
    const px = x | 0;
    const py = y | 0;
    if (px < 0 || py < 0 || px >= this.w || py >= this.h) return;
    const i = (py * this.w + px) * 4;
    if (alpha >= 255) {
      this.data[i] = color[0];
      this.data[i + 1] = color[1];
      this.data[i + 2] = color[2];
      this.data[i + 3] = 255;
      return;
    }
    // Mezcla sobre lo que ya hubiera: hace falta para las sombras y los cristales.
    const a = alpha / 255;
    const prev = this.data[i + 3] / 255;
    const out = a + prev * (1 - a);
    if (out <= 0) return;
    for (let k = 0; k < 3; k += 1) {
      this.data[i + k] = (color[k] * a + this.data[i + k] * prev * (1 - a)) / out;
    }
    this.data[i + 3] = out * 255;
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alphaAt(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  fill(color) {
    for (let y = 0; y < this.h; y += 1) for (let x = 0; x < this.w; x += 1) this.set(x, y, color);
  }

  rect(x, y, w, h, color, alpha = 255) {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.set(x + i, y + j, color, alpha);
  }

  hline(y, x0, x1, color, alpha = 255) {
    for (let x = x0; x <= x1; x += 1) this.set(x, y, color, alpha);
  }

  vline(x, y0, y1, color, alpha = 255) {
    for (let y = y0; y <= y1; y += 1) this.set(x, y, color, alpha);
  }

  /** Elipse rellena. La forma de la que salen las cabezas, los hombros y las sombras. */
  ellipse(cx, cy, rx, ry, color, alpha = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color, alpha);
      }
    }
  }

  /**
   * Contorno exterior de un píxel alrededor de todo lo dibujado.
   *
   * Es el gesto que más sube la calidad de un sprite pequeño: sin línea, la silueta se
   * disuelve contra un suelo del mismo valor tonal, y el personaje deja de leerse en el
   * momento en que pisa una acera clara. Se llama al final, cuando ya está todo puesto.
   */
  outline(color, alpha = 255) {
    const original = new Uint8ClampedArray(this.data);
    const opaco = (x, y) => {
      if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
      return original[(y * this.w + x) * 4 + 3] > 40;
    };
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        if (opaco(x, y)) continue;
        if (opaco(x - 1, y) || opaco(x + 1, y) || opaco(x, y - 1) || opaco(x, y + 1)) {
          this.set(x, y, color, alpha);
        }
      }
    }
  }

  /** Copia horizontal reflejada. Así el perfil izquierdo sale del derecho sin dibujarlo. */
  mirrored() {
    const out = new Painter(this.w, this.h);
    for (let y = 0; y < this.h; y += 1) {
      for (let x = 0; x < this.w; x += 1) {
        const i = (y * this.w + x) * 4;
        const j = (y * this.w + (this.w - 1 - x)) * 4;
        out.data[j] = this.data[i];
        out.data[j + 1] = this.data[i + 1];
        out.data[j + 2] = this.data[i + 2];
        out.data[j + 3] = this.data[i + 3];
      }
    }
    return out;
  }
}
