/**
 * FULGOR — el constructor de personajes.
 *
 * Un sprite de FULGOR no es un archivo: es una FUNCIÓN de un descriptor. Eso no es una
 * elegancia gratuita, es lo que hace que el traje importe.
 *
 * EL TRAJE QUE MONTAS ES EL QUE CAMINA. `suit.js` lleva seis ranuras —máscara, torso,
 * guantes, botas, cinturón, manto— y cinco generaciones. En la versión anterior del juego
 * todo eso era una lista de números en un menú. Aquí las piezas equipadas entran como
 * argumento de este constructor, así que el chaval que cruza el Polígono Norte lleva
 * puesto exactamente lo que montaste en el taller, con su color y su desgaste. Un sistema
 * que era una hoja de cálculo pasa a estar en pantalla.
 *
 * TRES DECISIONES DE DIBUJO QUE SOSTIENEN TODO LO DEMÁS:
 *
 *  - **La luz cae siempre desde arriba a la izquierda.** En cada masa —cabeza, torso,
 *    pierna— el borde superior izquierdo lleva el tono claro y el inferior derecho el
 *    oscuro. Es la única regla que convierte un montón de rectángulos en un volumen, y se
 *    respeta sin excepción para que veintidós personajes parezcan del mismo mundo.
 *
 *  - **Contorno exterior de un píxel, siempre.** Sin él, un personaje con camisa clara
 *    desaparece al pisar la acera. El contorno no es negro puro: es la tinta del juego
 *    teñida con el color de la ropa, que es lo que evita el aspecto de calcomanía.
 *
 *  - **Sólo tres direcciones dibujadas.** Sur, norte y perfil. El perfil izquierdo es el
 *    derecho reflejado. Dibujar los cuatro sería un 33% más de trabajo para un resultado
 *    que nadie distingue.
 */

import { Painter, hex, mix, shade } from "./pixel.js";

/** Caja del sprite. Alto de 24 sobre tiles de 16: el chaval mide justo tile y medio. */
export const SPRITE_W = 16;
export const SPRITE_H = 24;

/** Las tres direcciones que se dibujan. `oeste` sale de reflejar `este`. */
export const DIRS = ["sur", "norte", "este"];

/** Fotogramas únicos por dirección. El ciclo de andar los recorre 0-1-0-2. */
export const FRAMES = 3;

/** El orden en que la animación consume los fotogramas. */
export const WALK_CYCLE = [0, 1, 0, 2];

const TINTA = hex("#141a24");

/* ── El reparto ──────────────────────────────────────────────────────────────────── */

/**
 * Descriptores AUTORALES, no generados por hash.
 *
 * Lo que había antes derivaba el color de pelo de un `hash(id) % 360`, de modo que un
 * personaje con nombre, edad y carácter escritos en `story.js` salía teñido por el azar de
 * su identificador. Aquí cada uno está decidido: Nuria es la hermana pequeña y lleva el
 * mismo cian que su hermano sin saber por qué; Sabater va de gris marengo porque es una
 * inspectora y el juego tiene que decírtelo antes de que abra la boca.
 *
 * `porte` ajusta la silueta: `chaval` es la altura por defecto, `adulto` sube los hombros
 * y estrecha la cabeza, `mayor` encorva, `grande` ensancha.
 */
export const CAST = {
  dani:     { piel: "#e8c9a8", pelo: "#2c2622", peinado: "alboroto", ropa: "#3a6ea5", pantalon: "#2a3244", detalle: "#38e1ff", porte: "chaval" },
  nuria:    { piel: "#e8c9a8", pelo: "#3a2c24", peinado: "coletas",  ropa: "#4fb6c8", pantalon: "#7a5a44", detalle: "#ffd98a", porte: "cria" },
  isma:     { piel: "#c99a72", pelo: "#191412", peinado: "rizo",     ropa: "#7a4a8c", pantalon: "#33384a", detalle: "#e8e0d0", porte: "chaval" },
  pilar:    { piel: "#dcb492", pelo: "#b8b4ae", peinado: "mono",     ropa: "#6b5a72", pantalon: "#4a4048", detalle: "#c9b189", porte: "mayor" },
  carmen:   { piel: "#e8c9a8", pelo: "#4a3328", peinado: "media",    ropa: "#c9d4dc", pantalon: "#3d4a58", detalle: "#8fbfa8", porte: "adulto" },
  requena:  { piel: "#d8b592", pelo: "#8a8681", peinado: "entradas", ropa: "#d8d2c4", pantalon: "#5a5348", detalle: "#a05a3a", porte: "adulto" },
  oscar:    { piel: "#e0bd97", pelo: "#6b4a2c", peinado: "corto",    ropa: "#8a5a3a", pantalon: "#3a3f47", detalle: "#d8c39d", porte: "chaval" },
  julia:    { piel: "#b8825c", pelo: "#241c18", peinado: "trenza",   ropa: "#3a7a5c", pantalon: "#2c3440", detalle: "#e6d67a", porte: "adulto" },
  tomas:    { piel: "#d8b28c", pelo: "#3a3028", peinado: "corto",    ropa: "#4a5a6a", pantalon: "#38404c", detalle: "#8a9099", porte: "adulto" },
  marga:    { piel: "#e0bd97", pelo: "#8c3a2c", peinado: "media",    ropa: "#b8443a", pantalon: "#2c2a34", detalle: "#e8e0d0", porte: "adulto" },
  sabater:  { piel: "#dcb492", pelo: "#2a2622", peinado: "recogido", ropa: "#3d4450", pantalon: "#2a2e38", detalle: "#8a9099", porte: "adulto" },
  yusuf:    { piel: "#8a5f3c", pelo: "#141010", peinado: "rapado",   ropa: "#c8b06a", pantalon: "#4a4436", detalle: "#e8e0d0", porte: "grande" },
  ezequiel: { piel: "#e4c4a0", pelo: "#c4b48a", peinado: "peinado",  ropa: "#e0e4ea", pantalon: "#c4c8d0", detalle: "#38e1ff", porte: "adulto" },
  iria:     { piel: "#d8b28c", pelo: "#6a4a7a", peinado: "corto",    ropa: "#4a3a6a", pantalon: "#2e2a3a", detalle: "#b89ade", porte: "adulto" },
  chapa:    { piel: "#c99a72", pelo: "#4a4038", peinado: "gorra",    ropa: "#8a6a3a", pantalon: "#4a4438", detalle: "#b79a34", porte: "grande" },
  tuerca:   { piel: "#e0bd97", pelo: "#a85a2c", peinado: "alboroto", ropa: "#5a7a4a", pantalon: "#3a4038", detalle: "#c8b06a", porte: "chaval" },
  vigia:    { piel: "#dcb492", pelo: "#d8d2c4", peinado: "largo",    ropa: "#2c3a4a", pantalon: "#22282e", detalle: "#8fd4e8", porte: "adulto" },
  larga:    { piel: "#c99a72", pelo: "#1a1614", peinado: "largo",    ropa: "#3a2c3a", pantalon: "#241e24", detalle: "#8a4a6a", porte: "adulto" },
  sordo:    { piel: "#d8b28c", pelo: "#5a5048", peinado: "rapado",   ropa: "#4a4a4a", pantalon: "#333338", detalle: "#8a9099", porte: "grande" },
  hierro:   { piel: "#b8825c", pelo: "#241c18", peinado: "rapado",   ropa: "#6a3a2c", pantalon: "#3a2e28", detalle: "#a06a4a", porte: "grande" },
  tasador:  { piel: "#e4c4a0", pelo: "#8a8681", peinado: "entradas", ropa: "#2c2c34", pantalon: "#24242c", detalle: "#c8a44a", porte: "adulto" },
  cero:     { piel: "#c8c4c0", pelo: "#e8e8e8", peinado: "corto",    ropa: "#1a1a22", pantalon: "#141418", detalle: "#ff4a5a", porte: "adulto" },

  /* ── La clase ────────────────────────────────────────────────────
   * Siete compañeros sentados en los pupitres del aula. No tienen expediente, ni voz, ni
   * nombre en `copy.personajes`: son la clase, y una clase con tres personas dentro no es
   * una clase. Llevan `decorativo: true` en el mapa, así que el botón de hablar no los
   * ofrece — lo único que hacen es estar, que en el capítulo 1 es exactamente el trabajo.
   *
   * Las paletas están repartidas a mano para que ninguno se parezca al de al lado: si tres
   * salen con la misma ropa, deja de leerse como un aula y pasa a leerse como un error.
   */
  alumnoA:  { piel: "#e8c9a8", pelo: "#4a3a2a", peinado: "corto",    ropa: "#7a8c5a", pantalon: "#3a4048", detalle: "#e0d8c4", porte: "chaval" },
  alumnoB:  { piel: "#a9744d", pelo: "#1a1512", peinado: "rizo",     ropa: "#c26a4a", pantalon: "#2e3644", detalle: "#f0e2c8", porte: "chaval" },
  alumnoC:  { piel: "#dcb492", pelo: "#6b3a2c", peinado: "coletas",  ropa: "#9a5a8c", pantalon: "#4a3f52", detalle: "#e8dcc0", porte: "cria" },
  alumnoD:  { piel: "#c99a72", pelo: "#2c2622", peinado: "trenza",   ropa: "#3f7f8c", pantalon: "#2a3440", detalle: "#d8e4e0", porte: "chaval" },
  alumnoE:  { piel: "#e0bd97", pelo: "#b09050", peinado: "media",    ropa: "#5a5f9a", pantalon: "#33384a", detalle: "#e8e0d0", porte: "chaval" },
  alumnoF:  { piel: "#8a5f3c", pelo: "#141010", peinado: "rapado",   ropa: "#c8a84a", pantalon: "#443c30", detalle: "#efe6cc", porte: "chaval" },
  alumnoG:  { piel: "#d8b28c", pelo: "#3a3028", peinado: "gorra",    ropa: "#4a6b4a", pantalon: "#3a4038", detalle: "#c9d4b8", porte: "chaval" },
};

/**
 * EL REPARTO VERTICAL DE LOS 24 PÍXELES, que es la decisión de la que cuelga todo lo demás.
 *
 *    y  0.. 2   aire para el pelo (mechones, moños, gorras)
 *    y  3..11   cabeza  (9 px)
 *    y 11..17   torso   (7 px)
 *    y 18..23   piernas (6 px)
 *
 * La primera pasada daba a la cabeza casi la mitad de la figura y salía una seta. Un chibi
 * legible quiere la cabeza en torno a un tercio: nueve de veinticuatro, con el pelo comiendo
 * de la reserva de arriba y no del cuerpo.
 */
const SUELO = 23;
const TORSO_Y = SUELO - 12;   // 11
const TORSO_H = 7;
const PIERNA_Y = SUELO - 5;   // 18

/** Silueta por porte: radio de la cabeza, semiancho de hombros y encorvado. */
const PORTES = {
  cria:   { cabeza: 4.0, hombro: 3.2, encorva: 0 },
  chaval: { cabeza: 3.9, hombro: 3.7, encorva: 0 },
  adulto: { cabeza: 3.6, hombro: 4.3, encorva: 0 },
  grande: { cabeza: 3.7, hombro: 5.1, encorva: 0 },
  mayor:  { cabeza: 3.6, hombro: 3.9, encorva: 1 },
};

/* ── Peinados ────────────────────────────────────────────────────────────────────── */

/**
 * Cada peinado se dibuja en las tres direcciones. Recibe el centro y el radio de la cabeza
 * ya calculados, de modo que el mismo peinado funciona en una cría y en un portuario sin
 * tocar una constante.
 */
const PEINADOS = {
  /**
   * El casquete base del que salen casi todos los demás.
   *
   * DOS COTAS QUE NO SE TOCAN. Por delante el pelo termina en `cy - ry*0.20`, justo por
   * encima de los ojos: si baja más, tapa la cara y el personaje se convierte en un bulto
   * con flequillo — que es exactamente lo que pasaba en la primera pasada. Por detrás baja
   * hasta `cy + ry*0.55`, porque una nuca no es piel desnuda.
   */
  corto(p, { cx, cy, rx, ry, dir, c, luz }) {
    if (dir === "norte") {
      p.ellipse(cx, cy - ry * 0.16, rx * 1.02, ry * 0.9, c);
      p.ellipse(cx - rx * 0.3, cy - ry * 0.55, rx * 0.5, ry * 0.3, luz);
      return;
    }
    // El flequillo termina en `cy + 0.08·ry`: roza la ceja y deja el ojo entero. Bajarlo
    // dos décimas más lo convierte en un casco con cara debajo.
    p.ellipse(cx, cy - ry * 0.5, rx * 1.02, ry * 0.58, c);
    // De perfil, la NUCA. Mirando al este, la parte de atrás del cráneo cae por la
    // izquierda y tiene que ser pelo: sin esto asomaba piel donde va el cogote, y el
    // personaje parecía llevar el pelo pegado a la frente y nada detrás.
    if (dir === "este") p.ellipse(cx - rx * 0.42, cy - ry * 0.14, rx * 0.62, ry * 0.76, c);
    // Las patillas bajan por delante de la oreja sin invadir la mejilla.
    for (const lado of [-1, 1]) {
      if (dir === "este" && lado > 0) continue;
      p.vline(Math.round(cx + lado * rx * 0.94), Math.round(cy - ry * 0.5), Math.round(cy - ry * 0.02), c);
    }
    p.ellipse(cx - rx * 0.32, cy - ry * 0.72, rx * 0.5, ry * 0.24, luz);
    // Un realce de un píxel en la coronilla. Con pelo oscuro es lo único que separa "pelo"
    // de "casco" a esta escala.
    p.hline(Math.round(cy - ry * 1.02), Math.round(cx - rx * 0.4), Math.round(cx + rx * 0.1), luz);
  },

  alboroto(p, ctx) {
    const { cx, cy, rx, ry, dir, c, luz } = ctx;
    PEINADOS.corto(p, ctx);
    // Mechones: lo que separa a Dani de un funcionario. Tres picos irregulares arriba.
    for (const [k, alto] of [[-0.62, 0.78], [0.05, 1.02], [0.67, 0.52]]) {
      const x = Math.round(cx + k * rx);
      const n = Math.max(2, Math.round(alto * ry));
      for (let i = 0; i < n; i += 1) p.set(x, Math.round(cy - ry) - i, i === n - 1 ? luz : c);
    }
    if (dir === "este") for (let i = 0; i < Math.round(ry * 0.8); i += 1) p.set(Math.round(cx + rx), Math.round(cy - ry * 0.4) + i, c);
  },

  rizo(p, { cx, cy, rx, ry, dir, c, luz }) {
    p.ellipse(cx, cy - ry * (dir === "norte" ? 0.18 : 0.5), rx * 1.14, ry * (dir === "norte" ? 0.9 : 0.66), c);
    // Grumos de rizo con luz propia arriba a la izquierda. Todos por encima de la ceja.
    for (const [dx, dy] of [[-2.8, -0.62], [0, -0.86], [2.8, -0.62], [-3.4, -0.2], [3.4, -0.2]]) {
      p.ellipse(cx + dx * rx * 0.27, cy + dy * ry, rx * 0.44, ry * 0.4, c);
      p.set(Math.round(cx + dx * rx * 0.27 - rx * 0.16), Math.round(cy + dy * ry - ry * 0.24), luz);
    }
  },

  media(p, ctx) {
    const { cx, cy, rx, ry, dir, c } = ctx;
    PEINADOS.corto(p, ctx);
    // Cae por los lados hasta la mandíbula: el gesto que la separa de `corto`. Va por FUERA
    // del óvalo de la cara, nunca por encima, para no comerse los ojos.
    for (const lado of [-1, 1]) {
      const x = Math.round(cx + lado * (rx + (dir === "sur" ? 0 : 0)));
      for (let i = 0; i < Math.round(ry * 1.3); i += 1) p.set(x, Math.round(cy - ry * 0.5) + i, c);
    }
  },

  largo(p, ctx) {
    const { cx, cy, rx, ry, c } = ctx;
    PEINADOS.media(p, ctx);
    for (const lado of [-1, 1]) {
      const x = Math.round(cx + lado * rx);
      const largo = Math.round(ry * 2.1);
      for (let i = 0; i < largo; i += 1) {
        p.set(x, Math.round(cy + ry * 0.2) + i, c);
        if (i < largo * 0.62) p.set(x - lado, Math.round(cy + ry * 0.2) + i, c);
      }
    }
  },

  coletas(p, ctx) {
    const { cx, cy, rx, ry, dir, c, luz } = ctx;
    PEINADOS.corto(p, ctx);
    // Dos coletas a los lados. En la vista de espaldas se ven enteras, que es lo que hace
    // que Nuria siga siendo Nuria cuando se aleja de ti — y eso pasa mucho en este juego.
    for (const lado of [-1, 1]) {
      const x = cx + lado * rx * 1.3;
      p.ellipse(x, cy - ry * 0.1, rx * 0.42, ry * 0.62, c);
      p.set(Math.round(x - lado * rx * 0.14), Math.round(cy - ry * 0.7), luz);
      if (dir === "norte") p.ellipse(x, cy + ry * 0.6, rx * 0.34, ry * 0.52, c);
    }
  },

  trenza(p, ctx) {
    const { cx, cy, rx, ry, dir, c } = ctx;
    PEINADOS.media(p, ctx);
    // La trenza cae SOBRE EL HOMBRO, nunca por delante de la cara. Centrada en `cx` le
    // tapaba la nariz y la boca en el retrato de diálogo, que es donde más se ve.
    const x = cx - rx * (dir === "este" ? 0.6 : 0.86);
    for (let i = 0; i < 7; i += 1) {
      p.ellipse(x, cy + ry * 0.7 + i * ry * 0.42, rx * (0.4 - i * 0.02), ry * 0.29, i % 2 === 0 ? c : shade(c, -0.18));
    }
  },

  mono(p, ctx) {
    const { cx, cy, rx, ry, c, luz } = ctx;
    PEINADOS.corto(p, ctx);
    p.ellipse(cx, cy - ry * 1.36, rx * 0.62, ry * 0.52, c);
    p.set(Math.round(cx - rx * 0.26), Math.round(cy - ry * 1.52), luz);
  },

  recogido(p, ctx) {
    const { cx, cy, rx, ry, dir, c } = ctx;
    PEINADOS.corto(p, ctx);
    p.ellipse(cx + (dir === "este" ? -rx * 0.5 : 0), cy - ry * 0.05, rx * 0.5, ry * 0.44, c);
  },

  entradas(p, { cx, cy, rx, ry, dir, c, luz }) {
    // La coronilla despejada. Dos aletas laterales y una franja fina arriba.
    if (dir === "norte") {
      p.ellipse(cx, cy - ry * 0.2, rx * 1.0, ry * 0.82, c);
      p.ellipse(cx, cy - ry * 0.62, rx * 0.55, ry * 0.3, shade(c, 0.1));
      return;
    }
    for (const lado of [-1, 1]) {
      p.ellipse(cx + lado * rx * 0.8, cy - ry * 0.44, rx * 0.4, ry * 0.44, c);
    }
    p.ellipse(cx, cy - ry * 0.86, rx * 0.86, ry * 0.2, c);
    p.set(Math.round(cx - rx * 0.8), Math.round(cy - ry * 0.6), luz);
  },

  peinado(p, ctx) {
    const { cx, cy, rx, ry, dir, c, luz } = ctx;
    PEINADOS.corto(p, ctx);
    // Raya al lado y todo en su sitio: Ezequiel Reig no se despeina.
    p.ellipse(cx + rx * 0.2, cy - ry * 0.72, rx * 0.62, ry * 0.22, luz);
    if (dir !== "norte") {
      p.vline(Math.round(cx - rx * 0.34), Math.round(cy - ry * 0.98), Math.round(cy - ry * 0.4), shade(c, -0.32));
    }
  },

  rapado(p, { cx, cy, rx, ry, dir, c }) {
    const bajo = dir === "norte" ? 0.86 : 0.56;
    p.ellipse(cx, cy - ry * (dir === "norte" ? 0.2 : 0.5), rx * 0.98, ry * bajo, shade(c, 0.06), 205);
  },

  gorra(p, { cx, cy, rx, ry, dir, c, luz }) {
    p.ellipse(cx, cy - ry * 0.42, rx * 1.04, ry * 0.6, c);
    p.ellipse(cx, cy - ry * 0.72, rx * 0.7, ry * 0.3, luz);
    // La visera sólo existe hacia donde mira. De espaldas, una gorra es una gorra.
    if (dir === "sur") p.rect(Math.round(cx - rx), Math.round(cy - ry * 0.1), Math.round(rx * 2), 2, shade(c, -0.28));
    if (dir === "este") p.rect(Math.round(cx + rx * 0.4), Math.round(cy - ry * 0.15), Math.round(rx), 2, shade(c, -0.28));
  },
};

/* ── El cuerpo ───────────────────────────────────────────────────────────────────── */

/**
 * Un fotograma. `paso` va de -1 a 1 y es la fase del ciclo de andar: mueve las piernas en
 * oposición, los brazos al contrario que las piernas, y hunde el cuerpo un píxel en el
 * apoyo. Ese hundimiento de un solo píxel es la diferencia entre un muñeco que se desliza
 * y alguien que camina.
 */
function paintBody(p, desc, dir, paso, traje) {
  const porte = PORTES[desc.porte] ?? PORTES.chaval;
  const piel = hex(desc.piel);
  const pelo = hex(desc.pelo);
  const ropa = traje?.torso ? hex(traje.torso) : hex(desc.ropa);
  const pantalon = traje?.botas ? hex(traje.botas) : hex(desc.pantalon);
  const detalle = hex(desc.detalle);

  const cx = SPRITE_W / 2;
  const hombro = porte.hombro;
  const bob = paso === 0 ? 0 : 1;          // el pie de apoyo hunde el cuerpo un píxel
  const torsoY = TORSO_Y + bob + porte.encorva;

  /* Piernas ------------------------------------------------------------------------ */
  /**
   * LAS PIERNAS ANDAN EN LAS TRES DIRECCIONES, no sólo de perfil.
   *
   * De perfil el paso se ve como zancada. De frente y de espaldas no hay zancada que ver,
   * así que el paso se lee de otra forma: la pierna que avanza SE LEVANTA —queda un píxel
   * más corta— y la que apoya se abre un píxel. Sin eso, quien cruza la plaza hacia ti
   * patina, y patinar es el defecto que más delata a un sprite hecho a medias.
   *
   * La zancada de perfil es de UN píxel por pierna, no de dos: con dos, la pierna
   * adelantada se despegaba del torso y quedaba flotando en el aire.
   */
  const zapato = traje?.botas ? shade(hex(traje.botas), -0.34) : shade(pantalon, -0.4);
  for (const [lado, fase] of [[-1, 1], [1, -1]]) {
    const levanta = Math.max(0, paso * fase);
    const dx = cx + lado * 1.7 + (dir === "este" ? fase * paso * 1.2 : lado * levanta * 0.6);
    const alto = 6 - levanta;
    const x0 = Math.round(dx - 1);
    p.rect(x0, PIERNA_Y + bob, 2, alto, pantalon);
    p.vline(x0, PIERNA_Y + bob, PIERNA_Y + bob + alto - 1, shade(pantalon, 0.16));
    p.rect(x0, PIERNA_Y + bob + alto - 1, dir === "este" ? 3 : 2, 1, zapato);
  }
  // Un píxel de sombra entre las dos piernas: sin él, de frente son un bloque único.
  if (dir !== "este") p.vline(Math.round(cx), PIERNA_Y + bob, SUELO, shade(pantalon, -0.5));

  /* Torso -------------------------------------------------------------------------- */
  const x0 = Math.round(cx - hombro + 0.5);
  const ancho = Math.round(hombro * 2 - 1);
  p.rect(x0, torsoY, ancho, TORSO_H, ropa);
  // La luz cae desde arriba a la izquierda. La regla de oro de todo el archivo.
  p.vline(x0, torsoY, torsoY + TORSO_H - 1, shade(ropa, 0.18));
  p.hline(torsoY, x0, x0 + ancho - 1, shade(ropa, 0.14));
  p.vline(x0 + ancho - 1, torsoY, torsoY + TORSO_H - 1, shade(ropa, -0.24));
  p.hline(torsoY + TORSO_H - 1, x0 + 1, x0 + ancho - 1, shade(ropa, -0.28));
  // Los hombros se comen las esquinas: un rectángulo perfecto no tiene cuerpo dentro.
  p.set(x0, torsoY, shade(ropa, -0.5), 0);
  p.set(x0 + ancho - 1, torsoY, shade(ropa, -0.5), 0);

  if (porte.encorva) p.hline(torsoY, x0 + 1, x0 + ancho - 2, shade(ropa, -0.22));

  /* Brazos ------------------------------------------------------------------------- */
  /**
   * Los brazos van pegados al torso, así que el contorno exterior NO los separa de él: hay
   * que dibujar la costura a mano. Es un píxel, y sin ese píxel el personaje es un bloque
   * de color con una cabeza encima.
   */
  const brazoY = torsoY + 1;
  const swing = dir === "este" ? Math.round(-paso * 1.4) : 0;
  for (const [lado, fase] of [[-1, -1], [1, 1]]) {
    const bx = Math.round(cx + lado * (hombro + 0.4));
    const by = brazoY + fase * swing;
    const tono = lado < 0 ? shade(ropa, 0.1) : shade(ropa, -0.3);
    p.rect(bx, by, 1, 4, tono);
    p.vline(bx - lado, by, by + 3, shade(ropa, -0.42), 150); // la costura
    const mano = traje?.guantes ? hex(traje.guantes) : piel;
    p.rect(bx, by + 4, 1, 2, mano);
    p.set(bx, by + 4, shade(mano, 0.18));
  }

  /* Cinturón ----------------------------------------------------------------------- */
  if (traje?.cinturon) {
    const cint = hex(traje.cinturon);
    p.hline(torsoY + TORSO_H - 2, x0, x0 + ancho - 1, cint);
    p.set(Math.round(cx), torsoY + TORSO_H - 2, shade(cint, 0.45));
  }

  /* Emblema ------------------------------------------------------------------------ */
  // El rayo del pecho, sólo de frente y sólo con traje: es la firma, y una firma que se ve
  // por la espalda no es una firma.
  if (traje?.torso && dir === "sur") {
    const ex = Math.round(cx);
    for (const [dx, dy] of [[0, 1], [-1, 2], [0, 2], [0, 3], [1, 3], [0, 4]]) {
      p.set(ex + dx, torsoY + dy, detalle);
    }
  }

  /* Manto -------------------------------------------------------------------------- */
  // Va después del torso y de los brazos, antes de la cabeza. De espaldas se ve entero pero
  // deja los hombros fuera —si no, es un rectángulo negro—; de frente sólo asoma por los
  // costados, que es como cuelga una capa de verdad.
  if (traje?.manto) {
    const capa = hex(traje.manto);
    if (dir === "norte") {
      p.rect(x0 + 1, torsoY + 1, ancho - 2, TORSO_H + 2, capa);
      p.vline(x0 + 1, torsoY + 1, torsoY + TORSO_H, shade(capa, 0.24));
      p.vline(x0 + ancho - 2, torsoY + 1, torsoY + TORSO_H, shade(capa, -0.3));
      // El vuelo del bajo se desplaza con el paso: es lo que hace que la capa pese.
      const vuelo = Math.round(paso);
      p.hline(torsoY + TORSO_H + 2, x0 + 1 + vuelo, x0 + ancho - 2 + vuelo, shade(capa, -0.36));
    } else {
      for (const lado of [-1, 1]) {
        const x = Math.round(cx + lado * (hombro + 1.4));
        for (let i = 0; i < 6; i += 1) p.set(x, torsoY + 1 + i, i > 3 ? shade(capa, -0.28) : capa);
      }
    }
  }

  /* Cabeza ------------------------------------------------------------------------- */
  const ry = porte.cabeza;
  const rx = ry * 0.94;
  const cy = torsoY - ry + 0.5;
  p.ellipse(cx, cy, rx, ry, piel);
  p.ellipse(cx - rx * 0.3, cy - ry * 0.28, rx * 0.56, ry * 0.46, shade(piel, 0.12));
  p.ellipse(cx + rx * 0.46, cy + ry * 0.4, rx * 0.48, ry * 0.42, shade(piel, -0.15));
  // La sombra que la cabeza proyecta sobre el pecho. Un píxel, y asienta la figura entera.
  p.hline(torsoY, Math.round(cx - rx * 0.6), Math.round(cx + rx * 0.6), shade(ropa, -0.34), 170);

  /* Cara --------------------------------------------------------------------------- */
  // Ojos grandes y oscuros con un píxel de brillo: la abreviatura de "anime" a esta escala.
  // Van BAJOS en el óvalo —proporción chibi— y eso es además lo que deja sitio al flequillo
  // sin que se lo coma. De espaldas no hay cara, que es obvio y aun así es el error más
  // común en los sprites de este tipo.
  if (dir !== "norte") {
    const ojoY = Math.round(cy + ry * 0.26);
    const ojos = dir === "sur"
      ? [Math.round(cx - rx * 0.56), Math.round(cx + rx * 0.56 - 2)]
      : [Math.round(cx + rx * 0.22)];
    for (const ox of ojos) {
      p.rect(ox, ojoY, 2, 2, TINTA);
      p.set(ox, ojoY, mix(TINTA, [255, 255, 255], 0.8));
      p.set(ox, ojoY - 2, shade(pelo, -0.1));
    }
    p.hline(Math.round(cy + ry * 0.8), Math.round(cx - 1), Math.round(cx + (dir === "sur" ? 1 : 0)), shade(piel, -0.45));
  }

  /* Pelo y máscara ----------------------------------------------------------------- */
  const ctxPelo = { cx, cy, rx, ry, dir, c: pelo, luz: shade(pelo, 0.24) };
  const peinado = PEINADOS[desc.peinado] ?? PEINADOS.corto;
  peinado(p, ctxPelo);

  if (traje?.mascara) {
    const m = hex(traje.mascara);
    // Antifaz, no casco: deja la coronilla y el pelo fuera. La distinción importa porque
    // `suit.js` separa "reconocible" de "irreconocible" y el jugador tiene que VER cuál es.
    // El antifaz se sube hasta la ceja y deja el mentón fuera. A `cy + ry*0.08` cubría la
    // cara entera y el héroe era una silueta sin barbilla: se perdía la mitad de la
    // expresión y, con ella, la diferencia entre llevar careta y ser un bulto.
    const mY = Math.round(cy - ry * 0.12);
    p.rect(Math.round(cx - rx * 0.96), mY, Math.round(rx * 1.92), 3, m);
    p.hline(mY, Math.round(cx - rx * 0.96), Math.round(cx + rx * 0.96 - 1), shade(m, 0.24));
    p.hline(mY + 2, Math.round(cx - rx * 0.96), Math.round(cx + rx * 0.96 - 1), shade(m, -0.3));
    if (dir !== "norte") {
      const visor = shade(hex(desc.detalle), 0.12);
      const ojos = dir === "sur"
        ? [Math.round(cx - rx * 0.56), Math.round(cx + rx * 0.56 - 2)]
        : [Math.round(cx + rx * 0.22)];
      for (const ox of ojos) p.rect(ox, mY + 1, 2, 1, visor);
    }
  }
}

/* ── El traje que se ve ──────────────────────────────────────────────────────────── */

/**
 * De qué color es cada generación del traje.
 *
 * `suit.js` lleva cinco generaciones y seis ranuras, cada pieza con su integridad. Todo eso
 * era una hoja de cálculo; esta tabla es el puente que lo pone encima del chaval. Las
 * generaciones van de la chapuza —tela oscura y cinta aislante— al traje de verdad, y se
 * nota a un vistazo: es el único indicador de progreso que el jugador no tiene que abrir un
 * menú para leer.
 */
export const PALETA_TRAJE = {
  improvisado: { mascara: "#2a2622", torso: "#33302b", guantes: "#4a443c", botas: "#2c2924", cinturon: "#6b5a3a", manto: "#241f1b" },
  taller:      { mascara: "#22282f", torso: "#2b333d", guantes: "#5a6470", botas: "#242a32", cinturon: "#8a7440", manto: "#1b2027" },
  aislado:     { mascara: "#1f2a33", torso: "#26333f", guantes: "#7a8894", botas: "#202a33", cinturon: "#a08a46", manto: "#18222b" },
  conductor:   { mascara: "#1d2733", torso: "#22303f", guantes: "#38e1ff", botas: "#1f2a36", cinturon: "#c8a44a", manto: "#152029" },
  fulgor:      { mascara: "#151d29", torso: "#1a2637", guantes: "#38e1ff", botas: "#18222f", cinturon: "#ffd98a", manto: "#101a26" },
};

/** Por debajo de esta integridad, la pieza se ve gastada. */
export const INTEGRIDAD_GASTADA = 45;

/**
 * Convierte un traje del motor en los colores que entiende `paintCharacter`.
 *
 * UNA PIEZA ROTA NO SE PINTA. `suit.js` deja de dar sus estadísticas cuando la integridad
 * llega a cero, y aquí desaparece del sprite por el mismo motivo: si el guante reventado
 * siguiera dibujándose igual, el jugador tendría que ir al taller a enterarse de algo que
 * el juego puede decirle mirándose las manos.
 */
export function coloresDeTraje(traje) {
  if (!traje?.piezas) return null;
  const paleta = PALETA_TRAJE[traje.generacion] ?? PALETA_TRAJE.improvisado;
  const salida = {};
  for (const [slot, pieza] of Object.entries(traje.piezas)) {
    const base = paleta[slot];
    if (!base || (pieza?.integridad ?? 0) <= 0) continue;
    // Gastada: el color pierde brillo y se acerca al gris de la calle.
    salida[slot] = (pieza.integridad ?? 100) < INTEGRIDAD_GASTADA
      ? rgbAHex(mix(hex(base), [96, 92, 88], 0.42))
      : base;
  }
  return Object.keys(salida).length ? salida : null;
}

const rgbAHex = ([r, g, b]) =>
  `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`;

/* ── El retrato ──────────────────────────────────────────────────────────────────── */

/** Caja del busto de diálogo. Se estira por CSS con `image-rendering: pixelated`. */
export const RETRATO_W = 52;
export const RETRATO_H = 62;

/**
 * Los cuatro ánimos que ya usa el juego. `ceja` es la altura relativa de la ceja sobre el
 * ojo y `curva` cuánto se inclina hacia dentro; `boca` es el ancho y `abajo` si baja en las
 * comisuras. Cuatro números por ánimo: a esta escala no cabe más, y no hace falta más.
 */
const ANIMOS = {
  neutro:   { ceja: 0.34, curva: 0.0,  boca: 0.34, abajo: 0,    ojo: 1.0,  sombra: 0 },
  tenso:    { ceja: 0.24, curva: 0.5,  boca: 0.24, abajo: 0.5,  ojo: 0.82, sombra: 0.2 },
  decidido: { ceja: 0.26, curva: 0.85, boca: 0.42, abajo: -0.4, ojo: 1.12, sombra: 0 },
  roto:     { ceja: 0.42, curva: -0.7, boca: 0.22, abajo: 1.0,  ojo: 0.7,  sombra: 0.45 },
};

export const ANIMOS_VALIDOS = Object.keys(ANIMOS);

/**
 * EL RETRATO SALE DEL MISMO CONSTRUCTOR QUE EL SPRITE, y esa es toda la razón de que exista
 * esta función en vez de una carpeta de imágenes.
 *
 * La versión anterior del juego tenía 88 retratos SVG generados por hash: el color de pelo
 * de Nuria en su ficha no tenía por qué coincidir —y no coincidía— con ningún otro sitio,
 * porque salía de `hash("nuria") % 360`. Aquí el retrato y el muñeco que cruza la plaza
 * comparten paleta, peinado y porte por construcción. Si mañana Nuria se corta el pelo, se
 * lo corta en los dos sitios y en la misma línea de código.
 */
export function paintPortrait(id, animo = "neutro", { desc = null } = {}) {
  const d = desc ?? CAST[id] ?? CAST.dani;
  const a = ANIMOS[animo] ?? ANIMOS.neutro;
  const piel = hex(d.piel);
  const pelo = hex(d.pelo);
  const ropa = hex(d.ropa);

  const p = new Painter(RETRATO_W, RETRATO_H);
  const cx = RETRATO_W / 2;
  const ry = 19 * (d.porte === "cria" ? 1.04 : d.porte === "adulto" || d.porte === "mayor" ? 0.94 : 1);
  const rx = ry * 0.86;
  const cy = 24;

  /* Hombros: el busto tiene que apoyarse en algo o la cabeza flota. */
  const hombroY = Math.round(cy + ry * 1.02);
  p.ellipse(cx, hombroY + 26, rx * 2.0, 24, ropa);
  p.ellipse(cx - rx * 0.7, hombroY + 24, rx * 0.9, 12, shade(ropa, 0.14));
  p.ellipse(cx + rx * 0.9, hombroY + 28, rx * 0.8, 12, shade(ropa, -0.2));
  // Cuello, con la sombra que la mandíbula le echa encima.
  p.rect(Math.round(cx - rx * 0.34), Math.round(cy + ry * 0.6), Math.round(rx * 0.7), 10, shade(piel, -0.1));
  p.rect(Math.round(cx - rx * 0.34), Math.round(cy + ry * 0.6), Math.round(rx * 0.7), 3, shade(piel, -0.34));

  /* Cabeza */
  p.ellipse(cx, cy, rx, ry, piel);
  p.ellipse(cx - rx * 0.3, cy - ry * 0.26, rx * 0.58, ry * 0.48, shade(piel, 0.1));
  p.ellipse(cx + rx * 0.48, cy + ry * 0.36, rx * 0.46, ry * 0.44, shade(piel, -0.13));
  // Orejas.
  for (const lado of [-1, 1]) p.ellipse(cx + lado * rx * 0.98, cy + ry * 0.12, rx * 0.14, ry * 0.2, shade(piel, -0.08));

  /* Ojos: grandes, con iris y brillo. Es lo que separa un retrato de anime de una cara. */
  const ojoY = Math.round(cy + ry * 0.24);
  const ojoR = 4.4 * a.ojo;
  for (const lado of [-1, 1]) {
    const ox = cx + lado * rx * 0.44;
    p.ellipse(ox, ojoY, ojoR * 0.78, ojoR, [252, 250, 246]);
    p.ellipse(ox, ojoY + ojoR * 0.1, ojoR * 0.62, ojoR * 0.78, mix(TINTA, hex(d.detalle), 0.5));
    p.ellipse(ox, ojoY + ojoR * 0.16, ojoR * 0.34, ojoR * 0.44, TINTA);
    p.set(Math.round(ox - ojoR * 0.3), Math.round(ojoY - ojoR * 0.36), [255, 255, 255]);
    p.set(Math.round(ox - ojoR * 0.3) + 1, Math.round(ojoY - ojoR * 0.36), [255, 255, 255]);
    // La línea de las pestañas, arriba: cierra el ojo por su parte alta como en el anime.
    for (let i = -Math.round(ojoR * 0.8); i <= Math.round(ojoR * 0.8); i += 1) {
      p.set(Math.round(ox + i), Math.round(ojoY - ojoR * 0.86), TINTA);
    }
  }

  /* Cejas: el 80% de la expresión a esta escala. */
  for (const lado of [-1, 1]) {
    const ox = cx + lado * rx * 0.44;
    const base = ojoY - ry * a.ceja - 2;
    for (let i = -4; i <= 4; i += 1) {
      // `curva` inclina la ceja hacia el entrecejo: positiva es enfado, negativa es pena.
      const alza = -i * lado * a.curva;
      p.set(Math.round(ox + i), Math.round(base + alza), shade(pelo, -0.1));
      p.set(Math.round(ox + i), Math.round(base + alza) + 1, shade(pelo, 0.06));
    }
  }

  /* Nariz y boca */
  p.set(Math.round(cx), Math.round(cy + ry * 0.52), shade(piel, -0.3));
  p.set(Math.round(cx) + 1, Math.round(cy + ry * 0.54), shade(piel, -0.22));
  const bocaY = Math.round(cy + ry * 0.74);
  const bocaW = Math.round(rx * a.boca);
  for (let i = -bocaW; i <= bocaW; i += 1) {
    const k = Math.abs(i) / Math.max(1, bocaW);
    p.set(Math.round(cx + i), Math.round(bocaY + k * a.abajo * 2), shade(piel, -0.5));
  }

  /* Ojeras y sombra del ánimo roto */
  if (a.sombra > 0) {
    for (const lado of [-1, 1]) {
      p.ellipse(cx + lado * rx * 0.44, ojoY + ojoR * 1.15, ojoR * 0.8, 1.6, shade(piel, -0.26), Math.round(a.sombra * 255));
    }
  }

  /* Pelo, con el mismo repertorio que el sprite. */
  const peinado = PEINADOS[d.peinado] ?? PEINADOS.corto;
  peinado(p, { cx, cy, rx, ry, dir: "sur", c: pelo, luz: shade(pelo, 0.26) });

  p.outline(mix(TINTA, ropa, 0.18));
  return p;
}

/* ── La hoja ─────────────────────────────────────────────────────────────────────── */

/**
 * Un fotograma suelto, en crudo. Lo usa el horno y lo usa el visor de arte.
 *
 * El contorno se tiñe con la ropa en vez de ser tinta pura porque un contorno negro
 * absoluto sobre veintidós personajes distintos los aplana a todos por igual: la línea
 * teñida conserva la temperatura de cada uno.
 */
export function paintCharacter(id, dir = "sur", frame = 0, { traje = null, desc = null } = {}) {
  const d = desc ?? CAST[id] ?? CAST.dani;
  const dibujarDir = dir === "oeste" ? "este" : dir;
  const paso = frame === 0 ? 0 : frame === 1 ? 1 : -1;

  const p = new Painter(SPRITE_W, SPRITE_H);
  paintBody(p, d, dibujarDir, paso, traje);
  p.outline(mix(TINTA, hex(traje?.torso ?? d.ropa), 0.22));

  return dir === "oeste" ? p.mirrored() : p;
}

/**
 * La hoja completa de un personaje: tres direcciones × tres fotogramas, en una rejilla.
 *
 * Se hornea una vez al entrar en el distrito. Para Dani se vuelve a hornear cuando cambia
 * una pieza del traje —y sólo entonces—, que es una hoja de 48×72 píxeles: coste
 * irrelevante a cambio de que el equipo se vea.
 */
export function bakeCharacterSheet(id, { traje = null, desc = null, crear } = {}) {
  const canvas = (crear ?? defaultCanvas)(SPRITE_W * FRAMES, SPRITE_H * DIRS.length);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  DIRS.forEach((dir, fila) => {
    for (let f = 0; f < FRAMES; f += 1) {
      const p = paintCharacter(id, dir, f, { traje, desc });
      ctx.putImageData(new ImageData(p.data, SPRITE_W, SPRITE_H), f * SPRITE_W, fila * SPRITE_H);
    }
  });
  return { canvas, id };
}

function defaultCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Dónde está en la hoja el fotograma que toca. `oeste` lee la fila de `este` y avisa de que
 * hay que reflejar al pintar — reflejar en el `drawImage` cuesta una escala negativa y
 * ahorra la mitad de la hoja.
 */
export function sheetSource(dir, paso) {
  const frame = WALK_CYCLE[paso % WALK_CYCLE.length];
  const espejo = dir === "oeste";
  const fila = DIRS.indexOf(espejo ? "este" : dir);
  return {
    sx: frame * SPRITE_W,
    sy: (fila < 0 ? 0 : fila) * SPRITE_H,
    sw: SPRITE_W,
    sh: SPRITE_H,
    espejo,
  };
}
