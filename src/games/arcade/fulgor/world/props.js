/**
 * FULGOR — los bultos del mundo.
 *
 * Un tile es suelo; un bulto es una COSA que está de pie encima del suelo, y esa diferencia
 * es toda la profundidad que tiene el juego. Los tiles se pintan de una pasada en la capa
 * de abajo. Los bultos se ordenan por su `y` junto con los personajes, de modo que el
 * chaval pasa POR DETRÁS de la farola si está más arriba y POR DELANTE si está más abajo.
 *
 * Sin eso, un mundo cenital es un tablero: todo a la misma distancia, nada que rodear,
 * ninguna sensación de estar dentro de una calle.
 *
 * **El ancla de un bulto son sus pies**, igual que en los personajes, y por la misma razón:
 * es la coordenada con la que se ordena y con la que se colisiona. Un bulto de 26 píxeles
 * de alto puesto en `y = 100` ocupa de 74 a 100.
 *
 * **La caja sólida NO es el dibujo.** La copa de un árbol mide veintidós píxeles de ancho y
 * su tronco cinco: chocas con el tronco y te tapa la copa. Un bulto cuya caja fuera su
 * dibujo entero convertiría cada acera en un obstáculo.
 */

import { Painter, hex, mix, noise, shade } from "./pixel.js";

const TINTA = hex("#141a24");

/* ── La tabla ────────────────────────────────────────────────────────────────────── */

/**
 * `w`/`h` son el dibujo. `solido` es la caja de choque en coordenadas relativas al ancla
 * (que está en el centro-abajo del dibujo); `null` significa que se puede atravesar —una
 * marca de suelo, una sombra pintada—. `luz` marca los bultos que emiten luz de noche, que
 * `render.js` recoge para la capa de farolas.
 */
export const PROPS = {
  farola:      { w: 9,  h: 30, solido: { x: -2, y: -4, w: 4, h: 4 },   luz: { x: 0, y: -26, r: 34, color: "#ffd98a" } },
  banco:       { w: 20, h: 13, solido: { x: -10, y: -7, w: 20, h: 7 } },
  arbol:       { w: 24, h: 30, solido: { x: -3, y: -5, w: 6, h: 5 } },
  palmera:     { w: 26, h: 34, solido: { x: -3, y: -4, w: 6, h: 4 } },
  contenedor:  { w: 22, h: 17, solido: { x: -11, y: -10, w: 22, h: 10 } },
  papelera:    { w: 9,  h: 12, solido: { x: -4, y: -5, w: 8, h: 5 } },
  bolardo:     { w: 7,  h: 11, solido: { x: -3, y: -4, w: 6, h: 4 } },
  caja:        { w: 14, h: 15, solido: { x: -7, y: -9, w: 14, h: 9 } },
  barril:      { w: 12, h: 16, solido: { x: -6, y: -7, w: 12, h: 7 } },
  palet:       { w: 16, h: 9,  solido: { x: -8, y: -5, w: 16, h: 5 } },
  // La caja del coche es MÁS BAJA QUE SU DIBUJO a propósito: chocas con la mitad trasera y
  // pasas por detrás del capó, como con cualquier bulto alto. Con la caja entera (22 px de
  // alto sobre una calzada de 32) un coche aparcado cortaba la calle de lado a lado.
  coche:       { w: 20, h: 30, solido: { x: -10, y: -15, w: 20, h: 15 } },
  cabina:      { w: 14, h: 24, solido: { x: -7, y: -7, w: 14, h: 7 } },
  senal:       { w: 12, h: 22, solido: { x: -2, y: -3, w: 4, h: 3 } },
  porteria:    { w: 34, h: 18, solido: null },
  antena:      { w: 12, h: 24, solido: { x: -4, y: -4, w: 8, h: 4 } },
  transformador: { w: 20, h: 22, solido: { x: -10, y: -14, w: 20, h: 14 }, luz: { x: 0, y: -14, r: 20, color: "#38e1ff" } },

  /* ── Mobiliario de interior ───────────────────────────────────────────
   * EL PUPITRE ES LA PIEZA CLAVE Y SU CAJA SÓLIDA NO COINCIDE CON SU DIBUJO, igual que la
   * del coche. Mide 18×16 dibujado pero sólo bloquea los 7 píxeles de abajo, porque el
   * alumno se sienta DETRÁS: se pinta antes que el pupitre —tiene la `y` más pequeña— y el
   * tablero le tapa las piernas. Eso es lo que hace que un sprite de pie parezca sentado sin
   * añadir un solo fotograma a `sprites.js`.
   */
  pupitre:   { w: 21, h: 20, solido: { x: -10, y: -7, w: 21, h: 7 } },
  mesaProfe: { w: 26, h: 18, solido: { x: -13, y: -8, w: 26, h: 8 } },
  silla:     { w: 10, h: 14, solido: { x: -5, y: -4, w: 10, h: 4 } },
  estanteria: { w: 22, h: 30, solido: { x: -11, y: -8, w: 22, h: 8 } },
  mesaLab:   { w: 24, h: 17, solido: { x: -12, y: -8, w: 24, h: 8 } },
  extintor:  { w: 8,  h: 14, solido: null },
};

export const PROP_IDS = Object.keys(PROPS);

/* ── Las recetas ─────────────────────────────────────────────────────────────────── */

/**
 * Cada receta pinta con el ancla ya trasladada: `bx` es el centro horizontal y `by` la
 * fila del suelo, así que se dibuja hacia arriba desde `by`.
 */
const RECETAS = {
  farola(p, { bx, by, v }) {
    const poste = hex("#4a5058");
    const brazo = hex("#5c636c");
    // Base
    p.rect(bx - 2, by - 3, 5, 3, shade(poste, -0.3));
    p.rect(bx - 1, by - 28, 3, 26, poste);
    p.vline(bx - 1, by - 28, by - 3, shade(poste, 0.22));
    p.vline(bx + 1, by - 28, by - 3, shade(poste, -0.28));
    // El brazo y el farol: cuelga hacia un lado, que es como cuelga una farola de calle.
    const lado = v % 2 === 0 ? 1 : -1;
    p.hline(by - 28, bx, bx + lado * 3, brazo);
    p.rect(bx + lado * 3 - 1, by - 27, 3, 3, hex("#ffe6b0"));
    p.rect(bx + lado * 3 - 1, by - 24, 3, 1, shade(hex("#ffe6b0"), -0.4));
  },

  banco(p, { bx, by }) {
    const mad = hex("#7a5a38");
    const pata = hex("#3d4149");
    p.rect(bx - 9, by - 4, 3, 4, pata);
    p.rect(bx + 6, by - 4, 3, 4, pata);
    // Asiento y respaldo. El respaldo va arriba porque lo vemos desde detrás y en escorzo.
    p.rect(bx - 10, by - 7, 20, 3, mad);
    p.hline(by - 7, bx - 10, bx + 9, shade(mad, 0.2));
    p.hline(by - 5, bx - 10, bx + 9, shade(mad, -0.25));
    p.rect(bx - 10, by - 12, 20, 4, shade(mad, -0.06));
    p.hline(by - 12, bx - 10, bx + 9, shade(mad, 0.22));
    p.hline(by - 9, bx - 10, bx + 9, shade(mad, -0.3));
  },

  arbol(p, { bx, by, v }) {
    const tronco = hex("#4a3626");
    const hoja = hex("#2c5a26");
    p.rect(bx - 2, by - 10, 4, 10, tronco);
    p.vline(bx - 2, by - 10, by - 1, shade(tronco, 0.2));
    p.vline(bx + 1, by - 10, by - 1, shade(tronco, -0.3));
    // La copa: grumos con luz arriba a la izquierda, igual que el seto. La coherencia de la
    // dirección de la luz es lo que hace que todo parezca del mismo mundo.
    const cy = by - 19;
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const r = 5 + noise(i, 1, v, 17) * 4;
      const gx = bx + Math.cos(a) * r * 1.05;
      const gy = cy + Math.sin(a) * r * 0.78;
      p.ellipse(gx, gy, 3.4, 3.0, hoja);
    }
    p.ellipse(bx, cy, 8, 6.2, hoja);
    p.ellipse(bx - 3, cy - 2.6, 4.6, 3.2, shade(hoja, 0.24));
    p.ellipse(bx + 4, cy + 2.4, 4.2, 2.8, shade(hoja, -0.26));
  },

  palmera(p, { bx, by, v }) {
    const tronco = hex("#6b5136");
    const hoja = hex("#37703a");
    // El tronco se curva: una palmera recta parece un poste con plumas.
    for (let i = 0; i < 22; i += 1) {
      const x = bx + Math.sin(i / 9 + v) * 2.2;
      p.rect(Math.round(x - 1), by - 1 - i, 3, 1, i % 3 === 0 ? shade(tronco, -0.2) : tronco);
      p.set(Math.round(x - 1), by - 1 - i, shade(tronco, 0.2));
    }
    const tx = bx + Math.sin(22 / 9 + v) * 2.2;
    const ty = by - 23;
    for (let i = 0; i < 7; i += 1) {
      const a = Math.PI + (i / 6) * Math.PI;
      const lx = Math.cos(a) * 10;
      const ly = Math.sin(a) * 6;
      for (let t = 0; t <= 10; t += 1) {
        const k = t / 10;
        // La hoja cae: la parábola es lo que la separa de una raya.
        const px = tx + lx * k;
        const py = ty + ly * k + k * k * 4.5;
        p.set(Math.round(px), Math.round(py), t < 4 ? shade(hoja, 0.16) : hoja);
        if (t > 2) p.set(Math.round(px), Math.round(py) + 1, shade(hoja, -0.24));
      }
    }
    p.ellipse(tx, ty, 2.2, 1.8, shade(tronco, 0.1));
  },

  contenedor(p, { bx, by, v }) {
    const cuerpo = v % 2 === 0 ? hex("#3a6a4a") : hex("#5a5a62");
    p.rect(bx - 11, by - 10, 22, 10, cuerpo);
    p.hline(by - 10, bx - 11, bx + 10, shade(cuerpo, 0.24));
    p.vline(bx - 11, by - 10, by - 1, shade(cuerpo, 0.16));
    p.vline(bx + 10, by - 10, by - 1, shade(cuerpo, -0.28));
    p.hline(by - 1, bx - 10, bx + 10, shade(cuerpo, -0.36));
    // La tapa, más clara y desplazada: lo que dice "esto se abre".
    p.rect(bx - 11, by - 16, 22, 6, shade(cuerpo, 0.12));
    p.hline(by - 16, bx - 11, bx + 10, shade(cuerpo, 0.34));
    p.hline(by - 11, bx - 11, bx + 10, shade(cuerpo, -0.3));
    for (const rx of [bx - 8, bx + 7]) p.rect(rx, by - 3, 2, 3, hex("#2a2c30"));
  },

  papelera(p, { bx, by }) {
    const c = hex("#4d5259");
    p.rect(bx - 4, by - 9, 8, 9, c);
    p.vline(bx - 4, by - 9, by - 1, shade(c, 0.2));
    p.vline(bx + 3, by - 9, by - 1, shade(c, -0.3));
    p.hline(by - 11, bx - 4, bx + 3, shade(c, 0.3));
    p.rect(bx - 4, by - 10, 8, 1, shade(c, -0.2));
    for (let y = by - 8; y < by - 1; y += 2) p.hline(y, bx - 3, bx + 2, shade(c, -0.18), 130);
  },

  bolardo(p, { bx, by }) {
    const c = hex("#5a6068");
    p.rect(bx - 2, by - 9, 5, 9, c);
    p.vline(bx - 2, by - 9, by - 1, shade(c, 0.24));
    p.vline(bx + 2, by - 9, by - 1, shade(c, -0.3));
    p.hline(by - 9, bx - 2, bx + 2, shade(c, 0.34));
    p.hline(by - 6, bx - 2, bx + 2, hex("#c8a44a"));
  },

  caja(p, { bx, by, v }) {
    const c = hex("#8a6a42");
    p.rect(bx - 7, by - 9, 14, 9, c);
    p.hline(by - 9, bx - 7, bx + 6, shade(c, 0.26));
    p.vline(bx - 7, by - 9, by - 1, shade(c, 0.16));
    p.vline(bx + 6, by - 9, by - 1, shade(c, -0.3));
    p.hline(by - 1, bx - 6, bx + 6, shade(c, -0.38));
    // Los flejes en aspa: la abreviatura universal de "caja".
    for (let i = 0; i < 9; i += 1) {
      p.set(bx - 7 + Math.round(i * 1.5), by - 9 + i, shade(c, -0.34));
      p.set(bx + 6 - Math.round(i * 1.5), by - 9 + i, shade(c, -0.34));
    }
    if (v % 2 === 0) p.rect(bx - 3, by - 13, 8, 4, shade(c, 0.08));
  },

  barril(p, { bx, by, v }) {
    const c = v % 2 === 0 ? hex("#8a4436") : hex("#3d5a72");
    p.rect(bx - 5, by - 12, 11, 12, c);
    p.vline(bx - 5, by - 12, by - 1, shade(c, 0.2));
    p.vline(bx + 5, by - 12, by - 1, shade(c, -0.3));
    p.ellipse(bx, by - 12, 5.4, 2.2, shade(c, 0.28));
    for (const y of [by - 9, by - 4]) p.hline(y, bx - 5, bx + 5, shade(c, -0.34));
  },

  palet(p, { bx, by }) {
    const c = hex("#9a7a4e");
    for (let i = 0; i < 4; i += 1) p.rect(bx - 8, by - 5 + i * 2, 16, 1, i % 2 ? shade(c, -0.2) : c);
    p.rect(bx - 8, by - 5, 16, 1, shade(c, 0.24));
    p.vline(bx - 8, by - 5, by - 1, shade(c, -0.28));
    p.vline(bx + 7, by - 5, by - 1, shade(c, -0.28));
  },

  coche(p, { bx, by, v }) {
    // Visto desde arriba y ligeramente por detrás, apuntando hacia el fondo.
    const pintura = [hex("#8a3a3a"), hex("#2c4a72"), hex("#c8c4bc"), hex("#3a5a44")][v % 4];
    const cristal = hex("#2a3a4a");
    p.rect(bx - 9, by - 27, 18, 27, pintura);
    // Chaflanes: un coche no es un ladrillo.
    for (const [dx, dy] of [[-9, -27], [8, -27], [-9, 0], [8, 0]]) {
      p.set(bx + dx, by + dy - (dy < 0 ? 0 : 1), pintura, 0);
    }
    p.vline(bx - 9, by - 26, by - 1, shade(pintura, 0.2));
    p.vline(bx + 8, by - 26, by - 1, shade(pintura, -0.3));
    p.hline(by - 27, bx - 8, bx + 7, shade(pintura, 0.26));
    // Lunas y techo.
    p.rect(bx - 7, by - 23, 14, 5, cristal);
    p.rect(bx - 8, by - 17, 16, 8, shade(pintura, 0.08));
    p.rect(bx - 7, by - 8, 14, 5, cristal);
    p.hline(by - 23, bx - 7, bx + 6, shade(cristal, 0.3));
    // Pilotos traseros, abajo, que es por donde lo vemos.
    p.rect(bx - 8, by - 2, 3, 2, hex("#c8443a"));
    p.rect(bx + 5, by - 2, 3, 2, hex("#c8443a"));
    // Ruedas asomando.
    for (const rx of [bx - 10, bx + 8]) for (const ry of [by - 22, by - 7]) p.rect(rx, ry, 2, 5, hex("#1e2126"));
  },

  cabina(p, { bx, by }) {
    const marco = hex("#3a4a5a");
    const cristal = hex("#4a6478");
    p.rect(bx - 7, by - 22, 14, 22, marco);
    p.rect(bx - 5, by - 20, 10, 15, cristal);
    p.hline(by - 20, bx - 5, bx + 4, shade(cristal, 0.3));
    p.vline(bx - 5, by - 20, by - 6, shade(cristal, 0.22));
    p.rect(bx - 7, by - 24, 14, 3, hex("#2c6a8a"));
    p.hline(by - 24, bx - 7, bx + 6, hex("#4a9ac0"));
    p.vline(bx + 6, by - 22, by - 1, shade(marco, -0.32));
  },

  senal(p, { bx, by, v }) {
    const poste = hex("#6a7078");
    p.rect(bx - 1, by - 16, 2, 16, poste);
    p.vline(bx - 1, by - 16, by - 1, shade(poste, 0.24));
    const cara = v % 2 === 0 ? hex("#c04434") : hex("#2a5a9a");
    p.ellipse(bx, by - 17, 5.4, 5.0, cara);
    p.ellipse(bx - 1.4, by - 18.4, 3.0, 2.4, shade(cara, 0.24));
    p.hline(by - 17, bx - 3, bx + 2, hex("#e8e4dc"));
  },

  porteria(p, { bx, by }) {
    const c = hex("#d4d8dc");
    // Marco visto en escorzo, y la red como retícula de alfa baja.
    p.rect(bx - 16, by - 16, 2, 16, c);
    p.rect(bx + 14, by - 16, 2, 16, c);
    p.rect(bx - 16, by - 17, 32, 2, c);
    p.hline(by - 17, bx - 16, bx + 15, shade(c, 0.3));
    for (let y = by - 15; y < by; y += 2) p.hline(y, bx - 14, bx + 13, c, 55);
    for (let x = bx - 14; x < bx + 14; x += 3) p.vline(x, by - 15, by - 1, c, 55);
  },

  antena(p, { bx, by, v }) {
    const c = hex("#6a7078");
    p.rect(bx - 4, by - 4, 9, 4, hex("#3d4149"));
    p.rect(bx - 1, by - 22, 2, 18, c);
    p.vline(bx - 1, by - 22, by - 5, shade(c, 0.24));
    for (let i = 0; i < 4; i += 1) {
      const y = by - 20 + i * 4;
      const l = 5 - i;
      p.hline(y, bx - l, bx + l, c);
    }
    if (v % 2 === 0) p.set(bx, by - 23, hex("#ff4a5a"));
  },

  transformador(p, { bx, by }) {
    const c = hex("#4a4e54");
    p.rect(bx - 10, by - 14, 20, 14, c);
    p.hline(by - 14, bx - 10, bx + 9, shade(c, 0.26));
    p.vline(bx - 10, by - 14, by - 1, shade(c, 0.16));
    p.vline(bx + 9, by - 14, by - 1, shade(c, -0.3));
    // Aletas de refrigeración y el rayo amarillo de peligro: es el bulto que más aparece en
    // el Polígono Norte y tiene que reconocerse de un vistazo.
    for (let x = bx - 8; x < bx + 8; x += 3) p.vline(x, by - 12, by - 3, shade(c, -0.22));
    const rayo = hex("#e8c24a");
    for (const [dx, dy] of [[0, -12], [-1, -10], [0, -10], [0, -8], [1, -8], [0, -6]]) {
      p.set(bx + dx, by + dy, rayo);
    }
    p.rect(bx - 3, by - 20, 6, 6, shade(c, -0.14));
    p.set(bx, by - 21, mix(hex("#38e1ff"), [255, 255, 255], 0.4));
  },

  /* ── Mobiliario de interior ────────────────────────────────────── */

  /**
   * Pupitre de dos plazas, y la pieza de la que depende que el aula funcione.
   *
   * EL TABLERO SUBE HASTA `by - 15` A PROPÓSITO. El alumno se coloca en el mapa medio tile
   * por encima de su pupitre: se pinta antes —tiene la `y` más pequeña— y este tablero le
   * tapa de la cintura para abajo. Con la versión anterior, que subía sólo hasta `by - 11`,
   * las piernas quedaban enteras a la vista y los siete compañeros se leían DE PIE detrás de
   * una mesa, que es exactamente lo que no se quería. Un píxel de tablero es medio alumno
   * sentado.
   */
  pupitre(p, { bx, by, v }) {
    const tablero = hex("#c9a978");
    const canto = shade(tablero, -0.38);
    const pata = hex("#5a6068");
    const silla = hex("#3f6b8a");

    // Silla, delante y m\u00e1s baja: asoma el respaldo por debajo del canto del tablero.
    p.rect(bx - 4, by - 5, 8, 4, silla);
    p.hline(by - 5, bx - 4, bx + 3, shade(silla, 0.2));
    p.rect(bx - 4, by - 2, 1, 2, shade(pata, -0.2));
    p.rect(bx + 3, by - 2, 1, 2, shade(pata, -0.2));

    for (const dx of [-9, 8]) {
      p.rect(bx + dx, by - 10, 1, 10, pata);
      p.rect(bx + dx, by - 10, 1, 1, shade(pata, 0.3));
    }
    // Tablero alto y ancho: cara superior clara, canto frontal grueso.
    p.rect(bx - 10, by - 15, 21, 5, tablero);
    p.hline(by - 15, bx - 10, bx + 10, shade(tablero, 0.24));
    p.rect(bx - 10, by - 10, 21, 3, canto);
    p.hline(by - 8, bx - 10, bx + 10, shade(canto, -0.35));
    // Una libreta abierta en la mitad de los pupitres y un boli en menos.
    if (v % 2 === 0) {
      p.rect(bx - 6, by - 14, 8, 3, hex("#eae4d6"));
      p.vline(bx - 2, by - 14, by - 12, hex("#b9b2a2"));
    }
    if (v % 4 === 1) p.hline(by - 13, bx + 2, bx + 7, hex("#2f4a8c"));
  },

  /** La mesa del profesor: m\u00e1s ancha, con tarima y una pila de ex\u00e1menes sin corregir. */
  mesaProfe(p, { bx, by, v }) {
    const tarima = hex("#6b5a44");
    const tablero = hex("#a8814f");
    const canto = shade(tablero, -0.38);
    const pata = hex("#4c5158");

    // La tarima que la levanta: es lo que separa al que explica del que escucha.
    p.rect(bx - 14, by - 3, 28, 3, tarima);
    p.hline(by - 3, bx - 14, bx + 13, shade(tarima, 0.25));

    for (const dx of [-12, 11]) p.rect(bx + dx, by - 11, 2, 8, pata);
    p.rect(bx - 13, by - 15, 26, 4, tablero);
    p.hline(by - 15, bx - 13, bx + 12, shade(tablero, 0.2));
    p.rect(bx - 13, by - 11, 26, 2, canto);
    // Pila de folios y un vaso con boligrafos.
    p.rect(bx - 9, by - 18, 9, 3, hex("#e9e3d4"));
    p.hline(by - 18, bx - 9, bx - 1, hex("#f6f2e6"));
    p.rect(bx + 5, by - 19, 4, 4, hex("#7a8288"));
    if (v % 2 === 0) p.vline(bx + 6, by - 21, by - 19, hex("#c8453a"));
    p.vline(bx + 7, by - 22, by - 19, hex("#2f4a8c"));
  },

  /** Silla suelta, la que se queda mirando a ninguna parte al final de la fila. */
  silla(p, { bx, by, v }) {
    const c = hex("#3f6b8a");
    const pata = hex("#5a6068");
    for (const dx of [-4, 3]) p.rect(bx + dx, by - 4, 1, 4, pata);
    p.rect(bx - 5, by - 7, 10, 3, c);
    p.hline(by - 7, bx - 5, bx + 4, shade(c, 0.22));
    // Respaldo, ligeramente inclinado seg\u00fan la variante.
    const off = v % 2;
    p.rect(bx - 4 + off, by - 13, 8, 6, shade(c, -0.12));
    p.hline(by - 13, bx - 4 + off, bx + 3 + off, shade(c, 0.18));
  },

  /** Estanter\u00eda de laboratorio: cuatro baldas con frascos que no dicen qu\u00e9 son. */
  estanteria(p, { bx, by, v }) {
    const madera = hex("#6a5236");
    const balda = shade(madera, 0.2);
    p.rect(bx - 11, by - 30, 22, 30, shade(madera, -0.45));
    p.rect(bx - 10, by - 29, 20, 28, madera);
    for (let i = 0; i < 4; i += 1) {
      const y = by - 27 + i * 7;
      p.hline(y, bx - 10, bx + 9, balda);
      p.hline(y + 1, bx - 10, bx + 9, shade(madera, -0.35));
      // Frascos: alturas y colores distintos por balda y por variante.
      for (let k = 0; k < 4; k += 1) {
        const fx = bx - 8 + k * 5;
        if ((v + i + k) % 4 === 3) continue;
        const alto = 3 + ((v + i * 3 + k) % 3);
        const tono = [hex("#7fb0a2"), hex("#c9b06a"), hex("#a9736b"), hex("#8f9bb5")][(i + k + v) % 4];
        p.rect(fx, y - alto, 3, alto, tono);
        p.hline(y - alto, fx, fx + 2, shade(tono, 0.3));
        p.set(fx + 1, y - alto - 1, shade(tono, -0.3));
      }
    }
  },

  /** Mesa corrida de laboratorio, con su fregadero y su gr\u00edfo de gas. */
  mesaLab(p, { bx, by, v }) {
    const encimera = hex("#3c4a4f");
    const cuerpo = hex("#8a8574");
    p.rect(bx - 12, by - 9, 24, 9, cuerpo);
    p.hline(by - 9, bx - 12, bx + 11, shade(cuerpo, 0.18));
    p.vline(bx - 12, by - 9, by - 1, shade(cuerpo, 0.22));
    p.vline(bx + 11, by - 9, by - 1, shade(cuerpo, -0.3));
    // Puertas de los armarios de abajo.
    p.vline(bx, by - 8, by - 2, shade(cuerpo, -0.35));
    p.rect(bx - 3, by - 6, 2, 1, shade(cuerpo, -0.5));
    p.rect(bx + 2, by - 6, 2, 1, shade(cuerpo, -0.5));
    // Encimera oscura, que es lo que hace que se lea como laboratorio y no como cocina.
    p.rect(bx - 12, by - 13, 24, 4, encimera);
    p.hline(by - 13, bx - 12, bx + 11, shade(encimera, 0.3));
    // Fregadero a un lado y el grifo de gas en pie.
    p.rect(bx + 4, by - 12, 6, 2, shade(encimera, -0.45));
    if (v % 2 === 0) {
      p.vline(bx - 6, by - 17, by - 13, hex("#7d8890"));
      p.hline(by - 17, bx - 6, bx - 4, hex("#7d8890"));
    }
  },

  /** Extintor. No bloquea el paso: cuelga de la pared, y lo que cuelga no se rodea. */
  extintor(p, { bx, by }) {
    const rojo = hex("#a8342c");
    const soporte = hex("#5c636c");
    p.rect(bx - 3, by - 12, 6, 10, rojo);
    p.vline(bx - 3, by - 12, by - 3, shade(rojo, 0.25));
    p.vline(bx + 2, by - 12, by - 3, shade(rojo, -0.3));
    p.rect(bx - 3, by - 5, 6, 2, hex("#e2e0d8"));
    p.rect(bx - 1, by - 14, 2, 2, soporte);
    p.hline(by - 14, bx - 2, bx + 1, shade(soporte, 0.3));
  },

};

/* ── El horno ────────────────────────────────────────────────────────────────────── */

/** Los píxeles de un bulto, en crudo. Igual que en los tiles: mirable desde Node. */
export function paintProp(id, v = 0) {
  const def = PROPS[id];
  if (!def) return null;
  const p = new Painter(def.w, def.h);
  const receta = RECETAS[id];
  if (receta) receta(p, { bx: Math.floor(def.w / 2), by: def.h - 1, v, def });
  p.outline(TINTA, 210);
  return { data: p.data, w: def.w, h: def.h };
}

/**
 * Todos los bultos en un solo atlas, dos variantes cada uno. Se hornea una vez al arrancar
 * el juego, no al entrar en cada distrito: los bultos no dependen del distrito.
 */
export const PROP_VARIANTS = 2;

export function bakePropAtlas({ crear } = {}) {
  const anchoMax = Math.max(...PROP_IDS.map((id) => PROPS[id].w));
  const altoMax = Math.max(...PROP_IDS.map((id) => PROPS[id].h));
  const canvas = (crear ?? defaultCanvas)(anchoMax * PROP_VARIANTS, altoMax * PROP_IDS.length);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const indice = {};
  PROP_IDS.forEach((id, fila) => {
    const def = PROPS[id];
    indice[id] = { fila, w: def.w, h: def.h };
    for (let v = 0; v < PROP_VARIANTS; v += 1) {
      const { data, w, h } = paintProp(id, v);
      ctx.putImageData(new ImageData(data, w, h), v * anchoMax, fila * altoMax);
    }
  });

  return { canvas, indice, anchoMax, altoMax };
}

function defaultCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * La caja sólida de un bulto colocado en (x, y), en coordenadas de mundo. `sim.js` la lee
 * de `mapa.bultos`, así que quien construye un mapa llama a esto una vez y guarda el
 * resultado — no se recalcula por fotograma.
 */
export function cajaSolida(id, x, y) {
  const s = PROPS[id]?.solido;
  if (!s) return null;
  return { x: x + s.x, y: y + s.y, w: s.w, h: s.h };
}
