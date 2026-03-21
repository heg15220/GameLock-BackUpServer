import { createLevel } from "./schema";

const hints = (es, en) => ({ es: Array.isArray(es) ? es : [es], en: Array.isArray(en) ? en : [en] });

const level = (index, config) =>
  createLevel({
    index,
    world: "neon-foundry",
    theme: "neon-foundry",
    musicId: "world1-loop",
    ...config,
  });

const WORLD1_BASE_LEVELS = [
  level(0, {
    id: "flux-01",
    name: { es: "Calibracion", en: "Calibration" },
    taxonomy: "direct",
    difficultyBand: "teach",
    backgroundId: "neon-grid",
    ballSpawn: { x: 132, y: 430, aimDeg: -38, power: 0.91 },
    target: { x: 724, y: 316 },
    obstacles: [],
    starRules: { parTimeMs: 4200, parBounces: 1 },
    tutorialHints: hints(
      "Arrastra desde la orbita y suelta. Mantener la trayectoria limpia da 3 estrellas.",
      "Drag from the orb and release. Keeping the line clean earns 3 stars."
    ),
  }),
  level(1, {
    id: "flux-02",
    name: { es: "Caida Guiada", en: "Guided Drop" },
    taxonomy: "direct",
    difficultyBand: "teach",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 154, y: 410, aimDeg: -39, power: 0.97 },
    target: { x: 764, y: 154 },
    obstacles: [{ type: "wall", x: 642, y: 270, w: 132, h: 18, tint: "#5a6c92" }],
    starRules: { parTimeMs: 5200, parBounces: 1 },
    tutorialHints: hints(
      "El objetivo no siempre esta a la misma altura. Lee la gravedad antes de tirar.",
      "The basin will not always sit at the same height. Read gravity before releasing."
    ),
  }),
  level(2, {
    id: "flux-03",
    name: { es: "Eco de Goma", en: "Rubber Echo" },
    taxonomy: "one-bounce",
    difficultyBand: "teach",
    backgroundId: "prism-bay",
    ballSpawn: { x: 148, y: 426, aimDeg: -61, power: 0.64 },
    target: { x: 810, y: 190 },
    obstacles: [{ type: "bumper", x: 430, y: 326, radius: 38 }],
    starRules: { parTimeMs: 6200, parBounces: 2 },
    tutorialHints: hints(
      "El bumper devuelve mas energia. Busca un rebote controlado, no potencia bruta.",
      "The bumper returns extra energy. Look for a controlled bank, not brute force."
    ),
  }),
  level(3, {
    id: "flux-04",
    name: { es: "Plano Inclinado", en: "Inclined Plane" },
    taxonomy: "controlled-drop",
    difficultyBand: "teach",
    backgroundId: "neon-grid",
    ballSpawn: { x: 136, y: 418, aimDeg: -46, power: 0.58 },
    target: { x: 786, y: 170 },
    obstacles: [{ type: "ramp", x1: 446, y1: 354, x2: 592, y2: 260, thickness: 18 }],
    starRules: { parTimeMs: 6600, parBounces: 2 },
    tutorialHints: hints(
      "Las rampas convierten caida en direccion. Llega suave para no salir despedido.",
      "Ramps convert fall into direction. Arrive soft so the orb does not kick away."
    ),
  }),
  level(4, {
    id: "flux-05",
    name: { es: "Foso Vivo", en: "Live Pit" },
    taxonomy: "risk-reward",
    difficultyBand: "reinforce",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 134, y: 430, aimDeg: -38, power: 0.57 },
    target: { x: 816, y: 182 },
    obstacles: [
      { type: "spikeStrip", x: 512, y: 500, w: 196, h: 24 },
      { type: "wall", x: 516, y: 308, w: 126, h: 20 },
    ],
    starRules: { parTimeMs: 7600, parBounces: 2 },
    tutorialHints: hints(
      "Los hazards exigen una lectura clara: poco por debajo es fallo, demasiado arriba tambien.",
      "Hazards demand clean reads: too low fails, too high does too."
    ),
  }),
  level(5, {
    id: "flux-06",
    name: { es: "Rail de Timing", en: "Timing Rail" },
    taxonomy: "timing",
    difficultyBand: "reinforce",
    backgroundId: "prism-bay",
    ballSpawn: { x: 138, y: 432, aimDeg: -61, power: 0.85 },
    target: { x: 814, y: 164 },
    obstacles: [
      {
        type: "movingBar",
        x: 482,
        y: 278,
        w: 126,
        h: 18,
        movement: { axis: "y", min: 166, max: 384, speed: 108, phase: 0.1 },
      },
    ],
    starRules: { parTimeMs: 7800, parBounces: 2 },
    tutorialHints: hints(
      "Observa un ciclo antes de tirar. El mejor disparo a veces es esperar medio segundo.",
      "Watch one cycle before committing. The best shot sometimes waits half a second."
    ),
  }),
  level(6, {
    id: "flux-07",
    name: { es: "Bolsa de Aire", en: "Air Pocket" },
    taxonomy: "controlled-drop",
    difficultyBand: "reinforce",
    backgroundId: "neon-grid",
    ballSpawn: { x: 132, y: 438, aimDeg: -24, power: 0.46 },
    target: { x: 824, y: 154 },
    obstacles: [
      { type: "fan", x: 488, y: 262, w: 164, h: 182, forceX: 42, forceY: -1180 },
      { type: "wall", x: 648, y: 376, w: 124, h: 18 },
    ],
    starRules: { parTimeMs: 8800, parBounces: 2 },
    tutorialHints: hints(
      "El ventilador sostiene la orbita. Entra en su volumen con angulo medio.",
      "The fan holds the orb up. Enter its volume on a medium angle."
    ),
  }),
  level(7, {
    id: "flux-08",
    name: { es: "Gel de Frenado", en: "Brake Gel" },
    taxonomy: "precision",
    difficultyBand: "reinforce",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 146, y: 418, aimDeg: -34, power: 0.55 },
    target: { x: 792, y: 150 },
    obstacles: [
      { type: "stickyPad", x: 620, y: 268, w: 146, h: 24 },
      { type: "wall", x: 458, y: 332, w: 128, h: 20 },
    ],
    starRules: { parTimeMs: 9200, parBounces: 3 },
    tutorialHints: hints(
      "El pad gel reduce el exceso de velocidad. Es una ayuda si lo rozas con control.",
      "The gel pad trims excess speed. It helps if you brush it with control."
    ),
  }),
  level(8, {
    id: "flux-09",
    name: { es: "Doble Eco", en: "Double Echo" },
    taxonomy: "two-bounce",
    difficultyBand: "combine",
    backgroundId: "prism-bay",
    ballSpawn: { x: 134, y: 428, aimDeg: -20, power: 0.44 },
    target: { x: 832, y: 162 },
    obstacles: [
      { type: "bumper", x: 332, y: 340, radius: 34 },
      { type: "bumper", x: 612, y: 222, radius: 36 },
    ],
    starRules: { parTimeMs: 9800, parBounces: 3 },
    tutorialHints: hints(
      "Secuencia: primer bumper para altura, segundo para correccion final.",
      "Sequence it: first bumper for height, second one for the final correction."
    ),
  }),
  level(9, {
    id: "flux-10",
    name: { es: "Flor Gravitatoria", en: "Gravity Bloom" },
    taxonomy: "puzzle-physics",
    difficultyBand: "combine",
    backgroundId: "neon-grid",
    ballSpawn: { x: 142, y: 430, aimDeg: -32, power: 0.49 },
    target: { x: 800, y: 170 },
    obstacles: [
      { type: "gravityWell", x: 512, y: 252, radius: 102, strength: 96000 },
      { type: "wall", x: 698, y: 322, w: 138, h: 18 },
    ],
    physicsProfile: { gravity: 860, drag: 0.012 },
    starRules: { parTimeMs: 10200, parBounces: 3 },
    tutorialHints: hints(
      "El campo no es decorativo: roba trayectoria. Apunta un poco abierto y deja que curve.",
      "The field is not decorative: it steals trajectory. Aim a little wider and let it bend."
    ),
  }),
  level(10, {
    id: "flux-11",
    name: { es: "Pliegue Portal", en: "Portal Fold" },
    taxonomy: "puzzle-physics",
    difficultyBand: "combine",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 148, y: 432, aimDeg: -28, power: 0.47 },
    target: { x: 812, y: 146 },
    obstacles: [
      { type: "portal", x: 384, y: 374, radius: 28, pairId: "A" },
      { type: "portal", x: 676, y: 196, radius: 28, pairId: "A" },
      { type: "wall", x: 548, y: 288, w: 126, h: 18 },
    ],
    physicsProfile: { gravity: 880 },
    starRules: { parTimeMs: 9600, parBounces: 2 },
    tutorialHints: hints(
      "Los portales conservan impulso. Entra alineado con la salida que quieres aprovechar.",
      "Portals keep momentum. Enter aligned with the exit you want to use."
    ),
  }),
  level(11, {
    id: "flux-12",
    name: { es: "Compuerta Pulso", en: "Pulse Gate" },
    taxonomy: "timing",
    difficultyBand: "combine",
    backgroundId: "prism-bay",
    ballSpawn: { x: 138, y: 434, aimDeg: -38, power: 0.61 },
    target: { x: 804, y: 150 },
    obstacles: [
      { type: "gate", x: 512, y: 248, w: 26, h: 208, periodMs: 2200, openMs: 980, phaseMs: 420 },
      { type: "wall", x: 668, y: 334, w: 136, h: 18 },
    ],
    starRules: { parTimeMs: 9800, parBounces: 2 },
    tutorialHints: hints(
      "Ventana corta: carga el tiro antes de que se abra para no perder el ritmo.",
      "Short window: charge before it opens so you do not miss the rhythm."
    ),
  }),
  level(12, {
    id: "flux-13",
    name: { es: "Capsula Nomada", en: "Nomad Capsule" },
    taxonomy: "timing",
    difficultyBand: "combine",
    backgroundId: "neon-grid",
    ballSpawn: { x: 142, y: 426, aimDeg: -40, power: 0.58 },
    target: {
      x: 786,
      y: 166,
      moving: { axis: "x", min: 700, max: 840, speed: 78, phase: 0.15 },
    },
    obstacles: [
      { type: "ramp", x1: 462, y1: 356, x2: 632, y2: 264, thickness: 18 },
      { type: "spikeStrip", x: 446, y: 500, w: 148, h: 24 },
    ],
    starRules: { parTimeMs: 9800, parBounces: 2 },
    tutorialHints: hints(
      "Ahora el objetivo se desplaza. Lanza al espacio donde va a estar, no donde esta.",
      "The target now moves. Launch to where it will be, not where it is."
    ),
  }),
  level(13, {
    id: "flux-14",
    name: { es: "Linea de Corriente", en: "Current Line" },
    taxonomy: "speed-clear",
    difficultyBand: "combine",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 132, y: 438, aimDeg: -22, power: 0.44 },
    target: { x: 820, y: 178 },
    obstacles: [
      { type: "fan", x: 358, y: 246, w: 132, h: 164, forceX: 220, forceY: -760 },
      {
        type: "movingBar",
        x: 604,
        y: 230,
        w: 122,
        h: 18,
        movement: { axis: "x", min: 534, max: 712, speed: 96, phase: 0.45 },
      },
      { type: "spikeStrip", x: 602, y: 500, w: 176, h: 24 },
    ],
    starRules: { parTimeMs: 8700, parBounces: 2 },
    tutorialHints: hints(
      "El ventilador no solo eleva: tambien acelera. Usa el empuje lateral para pasar el rail.",
      "The fan does not only lift: it accelerates. Use the lateral push to clear the rail."
    ),
  }),
  level(14, {
    id: "flux-15",
    name: { es: "Tejido Espejo", en: "Mirror Weave" },
    taxonomy: "anti-habit",
    difficultyBand: "wow",
    backgroundId: "prism-bay",
    ballSpawn: { x: 822, y: 420, aimDeg: -146, power: 0.56 },
    target: { x: 168, y: 162 },
    obstacles: [
      { type: "portal", x: 646, y: 332, radius: 28, pairId: "B" },
      { type: "portal", x: 340, y: 212, radius: 28, pairId: "B" },
      { type: "bumper", x: 500, y: 288, radius: 36 },
      { type: "wall", x: 512, y: 430, w: 152, h: 18 },
    ],
    starRules: { parTimeMs: 10400, parBounces: 3 },
    tutorialHints: hints(
      "Anti-habito: el disparo sale desde la derecha. Rompe el automatismo y lee la escena completa.",
      "Anti-habit level: the shot starts on the right. Break your routine and read the whole scene."
    ),
  }),
  level(15, {
    id: "flux-16",
    name: { es: "Terciopelo Orbital", en: "Orbital Velvet" },
    taxonomy: "precision",
    difficultyBand: "wow",
    backgroundId: "neon-grid",
    ballSpawn: { x: 142, y: 428, aimDeg: -30, power: 0.5 },
    target: { x: 810, y: 142, innerW: 50, tolerance: 12 },
    obstacles: [
      { type: "stickyPad", x: 414, y: 246, w: 156, h: 24 },
      { type: "gravityWell", x: 640, y: 214, radius: 82, strength: 72000 },
      { type: "spikeStrip", x: 520, y: 500, w: 236, h: 24 },
    ],
    physicsProfile: { gravity: 880, drag: 0.013 },
    starRules: { parTimeMs: 11600, parBounces: 3 },
    tutorialHints: hints(
      "El gel quita velocidad y el campo la curva. La solucion nace de combinar ambos.",
      "The gel strips speed and the field bends the path. The solution comes from using both."
    ),
  }),
  level(16, {
    id: "flux-17",
    name: { es: "Ritmo de Taller", en: "Workshop Rhythm" },
    taxonomy: "timing",
    difficultyBand: "wow",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 138, y: 430, aimDeg: -40, power: 0.58 },
    target: {
      x: 806,
      y: 154,
      moving: { axis: "y", min: 136, max: 214, speed: 72, phase: 0.35 },
    },
    obstacles: [
      {
        type: "movingBar",
        x: 332,
        y: 360,
        w: 118,
        h: 18,
        movement: { axis: "y", min: 232, max: 414, speed: 124, phase: 0.2 },
      },
      { type: "gate", x: 566, y: 224, w: 24, h: 192, periodMs: 2100, openMs: 1040, phaseMs: 160 },
      { type: "wall", x: 704, y: 330, w: 132, h: 18 },
    ],
    starRules: { parTimeMs: 11400, parBounces: 3 },
    tutorialHints: hints(
      "No busques reflejos puros: sincroniza dos ritmos y un objetivo movil.",
      "Do not rely on reflex alone: synchronize two rhythms and a moving target."
    ),
  }),
  level(17, {
    id: "flux-18",
    name: { es: "Labor de Precision", en: "Precision Lab" },
    taxonomy: "precision",
    difficultyBand: "challenge",
    backgroundId: "prism-bay",
    ballSpawn: { x: 150, y: 432, aimDeg: -26, power: 0.48 },
    target: { x: 830, y: 190, innerW: 46, tolerance: 10 },
    obstacles: [
      { type: "wall", x: 398, y: 182, w: 126, h: 18 },
      { type: "wall", x: 398, y: 388, w: 126, h: 18 },
      { type: "bumper", x: 594, y: 284, radius: 32 },
      { type: "spikeStrip", x: 596, y: 500, w: 206, h: 24 },
    ],
    starRules: { parTimeMs: 9300, parBounces: 2 },
    tutorialHints: hints(
      "El pasillo central invita a disparar recto, pero la respuesta es un bank limpio.",
      "The center lane tempts a straight throw, but the answer is a clean bank."
    ),
  }),
  level(18, {
    id: "flux-19",
    name: { es: "Hilatura del Cielo", en: "Sky Thread" },
    taxonomy: "wow",
    difficultyBand: "challenge",
    backgroundId: "neon-grid",
    ballSpawn: { x: 124, y: 138, aimDeg: -12, power: 0.44 },
    target: {
      x: 798,
      y: 402,
      moving: { axis: "x", min: 712, max: 842, speed: 68, phase: 0.55 },
    },
    obstacles: [
      { type: "portal", x: 286, y: 164, radius: 28, pairId: "C" },
      { type: "portal", x: 686, y: 350, radius: 28, pairId: "C" },
      { type: "fan", x: 498, y: 160, w: 144, h: 160, forceX: 80, forceY: 980 },
      { type: "wall", x: 520, y: 438, w: 132, h: 18 },
      { type: "spikeStrip", x: 224, y: 500, w: 148, h: 24 },
    ],
    physicsProfile: { gravity: 930 },
    starRules: { parTimeMs: 12600, parBounces: 3 },
    tutorialHints: hints(
      "Wow level: caida, portal y objetivo movil en una sola lectura.",
      "Wow level: drop, portal and moving goal in one single read."
    ),
  }),
  level(19, {
    id: "flux-20",
    name: { es: "Corona de Fundicion", en: "Foundry Crown" },
    taxonomy: "puzzle-physics",
    difficultyBand: "boss",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 130, y: 432, aimDeg: -38, power: 0.6 },
    target: {
      x: 818,
      y: 132,
      innerW: 50,
      tolerance: 10,
      moving: { axis: "x", min: 770, max: 848, speed: 62, phase: 0.1 },
    },
    obstacles: [
      {
        type: "movingBar",
        x: 286,
        y: 396,
        w: 110,
        h: 18,
        movement: { axis: "y", min: 236, max: 430, speed: 136, phase: 0.25 },
      },
      { type: "bumper", x: 432, y: 228, radius: 36 },
      { type: "gate", x: 566, y: 218, w: 24, h: 204, periodMs: 2300, openMs: 1080, phaseMs: 640 },
      { type: "gravityWell", x: 676, y: 256, radius: 88, strength: 82000 },
      { type: "stickyPad", x: 784, y: 280, w: 120, h: 24 },
      { type: "spikeStrip", x: 516, y: 500, w: 246, h: 24 },
    ],
    physicsProfile: { gravity: 920, restitution: 0.8, drag: 0.012 },
    starRules: { parTimeMs: 13800, parBounces: 4 },
    tutorialHints: hints(
      [
        "Todo lo aprendido entra aqui: timing, rebote, lectura de campos y control de velocidad.",
        "La solucion existe y es justa. Si fallas, el motivo esta en pantalla.",
      ],
      [
        "Everything learned appears here: timing, bounce, field reads and speed control.",
        "The solution exists and it is fair. If you miss, the reason is visible on screen.",
      ]
    ),
  }),
  level(20, {
    id: "flux-21",
    name: { es: "Ventana de Cobre", en: "Copper Window" },
    taxonomy: "direct",
    difficultyBand: "reinforce",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 140, y: 432, aimDeg: -44, power: 0.68 },
    target: { x: 814, y: 176 },
    obstacles: [
      { type: "wall", x: 474, y: 252, w: 172, h: 18 },
      { type: "wall", x: 652, y: 334, w: 126, h: 18 },
    ],
    starRules: { parTimeMs: 8200, parBounces: 2 },
    tutorialHints: hints(
      "Dos planos cierran el tiro recto. Busca una parabola media que pase limpia entre ambos.",
      "Two planes shut down the straight line. Find a medium arc that clears both."
    ),
  }),
  level(21, {
    id: "flux-22",
    name: { es: "Ascensor Mudo", en: "Silent Lift" },
    taxonomy: "controlled-drop",
    difficultyBand: "combine",
    backgroundId: "prism-bay",
    ballSpawn: { x: 132, y: 434, aimDeg: -32, power: 0.46 },
    target: { x: 826, y: 156 },
    obstacles: [
      { type: "ramp", x1: 330, y1: 404, x2: 492, y2: 292, thickness: 18 },
      { type: "fan", x: 566, y: 280, w: 148, h: 178, forceX: 34, forceY: -980 },
      { type: "wall", x: 734, y: 344, w: 120, h: 18 },
    ],
    starRules: { parTimeMs: 9800, parBounces: 3 },
    tutorialHints: hints(
      "La rampa ordena la entrada y el ventilador hace el resto. Piensa el nivel en dos actos.",
      "The ramp organizes the entry and the fan does the rest. Think of it in two acts."
    ),
  }),
  level(22, {
    id: "flux-23",
    name: { es: "Doble Crisol", en: "Double Crucible" },
    taxonomy: "two-bounce",
    difficultyBand: "combine",
    backgroundId: "neon-grid",
    ballSpawn: { x: 138, y: 430, aimDeg: -18, power: 0.42 },
    target: { x: 834, y: 164 },
    obstacles: [
      { type: "bumper", x: 308, y: 366, radius: 32 },
      { type: "bumper", x: 566, y: 248, radius: 34 },
      { type: "wall", x: 706, y: 324, w: 118, h: 18 },
    ],
    starRules: { parTimeMs: 9800, parBounces: 3 },
    tutorialHints: hints(
      "Primer rebote para ganar altura, segundo para cerrar la linea. No hace falta fuerza maxima.",
      "Use the first bank for height and the second one to close the line. Full power is not required."
    ),
  }),
  level(23, {
    id: "flux-24",
    name: { es: "Pulso Obrero", en: "Foundry Pulse" },
    taxonomy: "timing",
    difficultyBand: "combine",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 142, y: 430, aimDeg: -42, power: 0.62 },
    target: {
      x: 806,
      y: 154,
      moving: { axis: "y", min: 144, max: 210, speed: 60, phase: 0.1 },
    },
    obstacles: [
      { type: "gate", x: 488, y: 252, w: 24, h: 204, periodMs: 2300, openMs: 1020, phaseMs: 200 },
      {
        type: "movingBar",
        x: 654,
        y: 296,
        w: 126,
        h: 18,
        movement: { axis: "y", min: 204, max: 366, speed: 96, phase: 0.42 },
      },
    ],
    starRules: { parTimeMs: 10800, parBounces: 3 },
    tutorialHints: hints(
      "No hay reflejo puro que lo resuelva. Sincroniza compuerta, barra y cubo antes de soltar.",
      "Pure reflex is not enough here. Sync gate, bar and basin before releasing."
    ),
  }),
  level(24, {
    id: "flux-25",
    name: { es: "Canal de Turbina", en: "Turbine Channel" },
    taxonomy: "controlled-drop",
    difficultyBand: "combine",
    backgroundId: "prism-bay",
    ballSpawn: { x: 132, y: 434, aimDeg: -20, power: 0.39 },
    target: { x: 822, y: 182 },
    obstacles: [
      { type: "fan", x: 402, y: 272, w: 144, h: 184, forceX: 190, forceY: -700 },
      { type: "wall", x: 566, y: 224, w: 136, h: 18 },
      { type: "wall", x: 704, y: 382, w: 120, h: 18 },
      { type: "spikeStrip", x: 574, y: 500, w: 172, h: 24 },
    ],
    starRules: { parTimeMs: 9800, parBounces: 2 },
    tutorialHints: hints(
      "El ventilador acelera y recoloca. Entra bajo y deja que el flujo limpie el resto.",
      "The fan accelerates and relocates the line. Enter low and let the stream clean up the rest."
    ),
  }),
  level(25, {
    id: "flux-26",
    name: { es: "Gel de Medianoche", en: "Midnight Gel" },
    taxonomy: "precision",
    difficultyBand: "challenge",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 146, y: 430, aimDeg: -36, power: 0.54 },
    target: { x: 810, y: 142, innerW: 52, tolerance: 13 },
    obstacles: [
      { type: "wall", x: 414, y: 320, w: 136, h: 18 },
      { type: "stickyPad", x: 586, y: 262, w: 150, h: 24 },
      { type: "wall", x: 754, y: 232, w: 116, h: 18 },
    ],
    starRules: { parTimeMs: 10400, parBounces: 2 },
    tutorialHints: hints(
      "El pad no es castigo: es el freno fino que convierte exceso de velocidad en captura util.",
      "The pad is not a punishment. It is the fine brake that turns excess speed into a useful catch."
    ),
  }),
  level(26, {
    id: "flux-27",
    name: { es: "Curva de Cobalto", en: "Cobalt Curve" },
    taxonomy: "puzzle-physics",
    difficultyBand: "challenge",
    backgroundId: "neon-grid",
    ballSpawn: { x: 140, y: 432, aimDeg: -31, power: 0.5 },
    target: { x: 816, y: 176 },
    obstacles: [
      { type: "gravityWell", x: 536, y: 248, radius: 96, strength: 88000 },
      { type: "wall", x: 660, y: 294, w: 148, h: 18 },
      { type: "spikeStrip", x: 482, y: 500, w: 200, h: 24 },
    ],
    physicsProfile: { gravity: 850, drag: 0.012 },
    starRules: { parTimeMs: 11200, parBounces: 3 },
    tutorialHints: hints(
      "Abre el disparo y deja que el campo haga la curva final. Si lo fuerzas, el pozo te roba la linea.",
      "Open the shot and let the field finish the bend. Force it and the well steals the line."
    ),
  }),
  level(27, {
    id: "flux-28",
    name: { es: "Puerta Sesgada", en: "Skew Gate" },
    taxonomy: "timing",
    difficultyBand: "challenge",
    backgroundId: "prism-bay",
    ballSpawn: { x: 136, y: 430, aimDeg: -46, power: 0.64 },
    target: { x: 828, y: 150 },
    obstacles: [
      { type: "ramp", x1: 386, y1: 382, x2: 556, y2: 272, thickness: 18 },
      { type: "gate", x: 630, y: 226, w: 24, h: 198, periodMs: 2100, openMs: 920, phaseMs: 360 },
      { type: "wall", x: 738, y: 314, w: 128, h: 18 },
    ],
    starRules: { parTimeMs: 10600, parBounces: 3 },
    tutorialHints: hints(
      "La rampa te obliga a llegar ordenado a la compuerta. No corras: prepara el angulo de entrada.",
      "The ramp forces you to arrive to the gate in control. Do not rush the entry angle."
    ),
  }),
  level(28, {
    id: "flux-29",
    name: { es: "Retorno de Bronce", en: "Bronze Return" },
    taxonomy: "anti-habit",
    difficultyBand: "challenge",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 824, y: 420, aimDeg: -148, power: 0.52 },
    target: { x: 176, y: 184 },
    obstacles: [
      { type: "fan", x: 610, y: 248, w: 140, h: 160, forceX: -120, forceY: -860 },
      { type: "wall", x: 494, y: 332, w: 132, h: 18 },
      { type: "bumper", x: 322, y: 258, radius: 34 },
    ],
    starRules: { parTimeMs: 10800, parBounces: 3 },
    tutorialHints: hints(
      "Nivel espejo: sales desde la derecha y el ventilador te recoloca hacia el bumper bueno.",
      "Mirror stage: you launch from the right and the fan repositions the orb toward the good bumper."
    ),
  }),
  level(29, {
    id: "flux-30",
    name: { es: "Domo Resonante", en: "Resonant Dome" },
    taxonomy: "one-bounce",
    difficultyBand: "challenge",
    backgroundId: "neon-grid",
    ballSpawn: { x: 140, y: 432, aimDeg: -58, power: 0.72 },
    target: { x: 808, y: 188 },
    obstacles: [
      { type: "wall", x: 506, y: 138, w: 204, h: 18 },
      { type: "bumper", x: 506, y: 284, radius: 42 },
      { type: "wall", x: 710, y: 338, w: 128, h: 18 },
    ],
    starRules: { parTimeMs: 9800, parBounces: 2 },
    tutorialHints: hints(
      "El techo descarta el tiro alto. Busca el bumper central y usa su energia para entrar al cubo.",
      "The ceiling removes the high line. Use the central bumper and cash in its energy at the basin."
    ),
  }),
  level(30, {
    id: "flux-31",
    name: { es: "Linea de Servicio", en: "Service Line" },
    taxonomy: "speed-clear",
    difficultyBand: "challenge",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 132, y: 436, aimDeg: -24, power: 0.43 },
    target: { x: 834, y: 170 },
    obstacles: [
      {
        type: "movingBar",
        x: 496,
        y: 316,
        w: 128,
        h: 18,
        movement: { axis: "x", min: 430, max: 612, speed: 124, phase: 0.15 },
      },
      { type: "fan", x: 278, y: 284, w: 126, h: 176, forceX: 220, forceY: -540 },
      { type: "spikeStrip", x: 472, y: 500, w: 220, h: 24 },
    ],
    starRules: { parTimeMs: 8400, parBounces: 2 },
    tutorialHints: hints(
      "Nivel de ritmo corto: usa el empuje temprano del fan para llegar antes de que la barra vuelva.",
      "Short rhythm stage: use the early fan push to arrive before the bar swings back."
    ),
  }),
  level(31, {
    id: "flux-32",
    name: { es: "Bisel Magnetico", en: "Magnetic Bevel" },
    taxonomy: "precision",
    difficultyBand: "challenge",
    backgroundId: "prism-bay",
    ballSpawn: { x: 148, y: 432, aimDeg: -28, power: 0.48 },
    target: { x: 826, y: 146, innerW: 48, tolerance: 10 },
    obstacles: [
      { type: "gravityWell", x: 680, y: 208, radius: 78, strength: 68000 },
      { type: "wall", x: 420, y: 204, w: 142, h: 18 },
      { type: "wall", x: 438, y: 392, w: 142, h: 18 },
      { type: "stickyPad", x: 594, y: 282, w: 132, h: 24 },
    ],
    physicsProfile: { gravity: 890, drag: 0.013 },
    starRules: { parTimeMs: 11800, parBounces: 3 },
    tutorialHints: hints(
      "El objetivo es estrecho, pero el campo ayuda si llegas lento. El gel prepara esa velocidad.",
      "The basin is narrow, but the field helps if you arrive slow. The gel sets that speed."
    ),
  }),
  level(32, {
    id: "flux-33",
    name: { es: "Taller Fantasma", en: "Ghost Workshop" },
    taxonomy: "puzzle-physics",
    difficultyBand: "challenge",
    backgroundId: "neon-grid",
    ballSpawn: { x: 144, y: 430, aimDeg: -33, power: 0.53 },
    target: { x: 812, y: 152 },
    obstacles: [
      { type: "portal", x: 360, y: 366, radius: 28, pairId: "D" },
      { type: "portal", x: 696, y: 202, radius: 28, pairId: "D" },
      { type: "wall", x: 530, y: 286, w: 152, h: 18 },
      { type: "spikeStrip", x: 506, y: 500, w: 184, h: 24 },
    ],
    starRules: { parTimeMs: 10600, parBounces: 2 },
    tutorialHints: hints(
      "El portal evita el muro, pero solo si entras con la inclinacion que te deja salir hacia arriba.",
      "The portal bypasses the wall, but only if you enter on the angle that sends you upward."
    ),
  }),
  level(33, {
    id: "flux-34",
    name: { es: "Cisterna Tensa", en: "Tense Cistern" },
    taxonomy: "risk-reward",
    difficultyBand: "wow",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 136, y: 434, aimDeg: -30, power: 0.47 },
    target: {
      x: 796,
      y: 164,
      moving: { axis: "x", min: 730, max: 840, speed: 72, phase: 0.33 },
    },
    obstacles: [
      { type: "wall", x: 450, y: 290, w: 148, h: 18 },
      { type: "wall", x: 660, y: 250, w: 118, h: 18 },
      { type: "spikeStrip", x: 416, y: 500, w: 300, h: 24 },
      { type: "bumper", x: 594, y: 360, radius: 34 },
    ],
    starRules: { parTimeMs: 11200, parBounces: 3 },
    tutorialHints: hints(
      "El suelo perdona cero. Usa el bumper como seguro y apunta al espacio que va a ocupar el cubo.",
      "The floor forgives nothing. Use the bumper as insurance and aim for where the basin will be."
    ),
  }),
  level(34, {
    id: "flux-35",
    name: { es: "Cascada de Niebla", en: "Mist Cascade" },
    taxonomy: "controlled-drop",
    difficultyBand: "wow",
    backgroundId: "prism-bay",
    ballSpawn: { x: 134, y: 424, aimDeg: -46, power: 0.72 },
    target: { x: 820, y: 184 },
    obstacles: [
      { type: "fan", x: 506, y: 252, w: 156, h: 180, forceX: 50, forceY: -980 },
      { type: "ramp", x1: 676, y1: 338, x2: 822, y2: 252, thickness: 18 },
      { type: "wall", x: 404, y: 320, w: 124, h: 18 },
    ],
    starRules: { parTimeMs: 11800, parBounces: 3 },
    tutorialHints: hints(
      "La bruma te levanta y la rampa remata la curva. Deja que el fan haga altura antes del ultimo apoyo.",
      "The mist lifts and the ramp finishes the curve. Let the fan create height before the final touch."
    ),
  }),
  level(35, {
    id: "flux-36",
    name: { es: "Hexagono de Pulso", en: "Pulse Hex" },
    taxonomy: "timing",
    difficultyBand: "wow",
    backgroundId: "neon-grid",
    ballSpawn: { x: 140, y: 430, aimDeg: -39, power: 0.58 },
    target: { x: 812, y: 146 },
    obstacles: [
      { type: "gate", x: 384, y: 248, w: 24, h: 204, periodMs: 1800, openMs: 780, phaseMs: 0 },
      { type: "gate", x: 634, y: 248, w: 24, h: 204, periodMs: 1800, openMs: 780, phaseMs: 900 },
      { type: "wall", x: 510, y: 340, w: 140, h: 18 },
    ],
    starRules: { parTimeMs: 12200, parBounces: 3 },
    tutorialHints: hints(
      "Las compuertas laten a contratiempo. No tires cuando una abre: tira para que la segunda tambien lo haga.",
      "The gates pulse out of phase. Do not shoot when one opens, shoot so the second opens too."
    ),
  }),
  level(36, {
    id: "flux-37",
    name: { es: "Rizo Industrial", en: "Industrial Curl" },
    taxonomy: "two-bounce",
    difficultyBand: "wow",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 136, y: 432, aimDeg: -26, power: 0.46 },
    target: { x: 830, y: 156 },
    obstacles: [
      { type: "bumper", x: 336, y: 318, radius: 34 },
      { type: "ramp", x1: 466, y1: 356, x2: 620, y2: 260, thickness: 18 },
      { type: "bumper", x: 676, y: 224, radius: 34 },
      { type: "spikeStrip", x: 522, y: 500, w: 184, h: 24 },
    ],
    starRules: { parTimeMs: 11600, parBounces: 4 },
    tutorialHints: hints(
      "El nivel no pide potencia sino secuencia: bumper, rampa, bumper, captura.",
      "This stage is about sequence, not brute force: bumper, ramp, bumper, catch."
    ),
  }),
  level(37, {
    id: "flux-38",
    name: { es: "Sutura de Neon", en: "Neon Stitch" },
    taxonomy: "precision",
    difficultyBand: "wow",
    backgroundId: "prism-bay",
    ballSpawn: { x: 146, y: 430, aimDeg: -34, power: 0.54 },
    target: { x: 812, y: 156, innerW: 50, tolerance: 11 },
    obstacles: [
      { type: "stickyPad", x: 394, y: 286, w: 148, h: 24 },
      { type: "wall", x: 598, y: 316, w: 132, h: 18 },
      { type: "gravityWell", x: 714, y: 214, radius: 76, strength: 62000 },
      { type: "spikeStrip", x: 554, y: 500, w: 208, h: 24 },
    ],
    physicsProfile: { gravity: 890, drag: 0.013 },
    starRules: { parTimeMs: 12600, parBounces: 3 },
    tutorialHints: hints(
      "La costura buena no es recta: el gel quita impulso y el campo curva la ultima entrada.",
      "The good stitch is not straight: the gel removes excess impulse and the field bends the final entry."
    ),
  }),
  level(38, {
    id: "flux-39",
    name: { es: "Linea Muerta", en: "Dead Line" },
    taxonomy: "speed-clear",
    difficultyBand: "wow",
    backgroundId: "neon-grid",
    ballSpawn: { x: 134, y: 434, aimDeg: -22, power: 0.44 },
    target: { x: 838, y: 172 },
    obstacles: [
      {
        type: "movingBar",
        x: 590,
        y: 248,
        w: 132,
        h: 18,
        movement: { axis: "y", min: 170, max: 388, speed: 148, phase: 0.1 },
      },
      { type: "wall", x: 404, y: 322, w: 122, h: 18 },
      { type: "spikeStrip", x: 602, y: 500, w: 158, h: 24 },
    ],
    starRules: { parTimeMs: 7800, parBounces: 2 },
    tutorialHints: hints(
      "Una sola ventana buena por ciclo. Lee el movimiento antes de tocar la pantalla.",
      "There is only one good window per cycle. Read the motion before you touch the screen."
    ),
  }),
  level(39, {
    id: "flux-40",
    name: { es: "Ancla de Vacio", en: "Void Anchor" },
    taxonomy: "puzzle-physics",
    difficultyBand: "wow",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 140, y: 430, aimDeg: -36, power: 0.57 },
    target: { x: 812, y: 164 },
    obstacles: [
      { type: "gravityWell", x: 468, y: 268, radius: 88, strength: 72000 },
      { type: "fan", x: 666, y: 260, w: 148, h: 178, forceX: 48, forceY: -1060 },
      { type: "wall", x: 610, y: 356, w: 136, h: 18 },
    ],
    physicsProfile: { gravity: 900, drag: 0.012 },
    starRules: { parTimeMs: 12400, parBounces: 3 },
    tutorialHints: hints(
      "El pozo atrae y el fan libera. La solucion nace de dejar que cada campo haga solo su parte.",
      "The well attracts and the fan releases. The solution comes from letting each field do only its job."
    ),
  }),
  level(40, {
    id: "flux-41",
    name: { es: "Boveda Espectral", en: "Spectral Vault" },
    taxonomy: "puzzle-physics",
    difficultyBand: "boss",
    backgroundId: "prism-bay",
    ballSpawn: { x: 148, y: 432, aimDeg: -34, power: 0.5 },
    target: {
      x: 818,
      y: 140,
      moving: { axis: "y", min: 132, max: 200, speed: 58, phase: 0.2 },
    },
    obstacles: [
      { type: "gate", x: 454, y: 228, w: 24, h: 204, periodMs: 2100, openMs: 900, phaseMs: 150 },
      { type: "portal", x: 544, y: 374, radius: 28, pairId: "F" },
      { type: "portal", x: 748, y: 194, radius: 28, pairId: "F" },
      { type: "wall", x: 644, y: 286, w: 144, h: 18 },
    ],
    starRules: { parTimeMs: 13000, parBounces: 3 },
    tutorialHints: hints(
      "Compuerta, portal y objetivo vivo. El tiro bueno llega tarde a la primera mitad y puntual a la segunda.",
      "Gate, portal and a living target. The good shot arrives late to the first half and on time to the second."
    ),
  }),
  level(41, {
    id: "flux-42",
    name: { es: "Costura Orbital", en: "Orbital Stitch" },
    taxonomy: "precision",
    difficultyBand: "boss",
    backgroundId: "neon-grid",
    ballSpawn: { x: 150, y: 432, aimDeg: -27, power: 0.48 },
    target: { x: 826, y: 184, innerW: 44, tolerance: 9 },
    obstacles: [
      { type: "wall", x: 374, y: 176, w: 122, h: 18 },
      { type: "wall", x: 374, y: 394, w: 122, h: 18 },
      { type: "wall", x: 588, y: 176, w: 122, h: 18 },
      { type: "wall", x: 588, y: 394, w: 122, h: 18 },
      { type: "bumper", x: 484, y: 286, radius: 30 },
      { type: "stickyPad", x: 724, y: 278, w: 128, h: 24 },
      { type: "spikeStrip", x: 492, y: 500, w: 232, h: 24 },
    ],
    starRules: { parTimeMs: 13400, parBounces: 3 },
    tutorialHints: hints(
      "El pasillo central no esta quieto en tu cabeza: piensa en una costura curva, no en una recta.",
      "The center lane only looks straight. Think of a curved stitch, not a straight stitch."
    ),
  }),
  level(42, {
    id: "flux-43",
    name: { es: "Doble Fundente", en: "Twin Melt" },
    taxonomy: "wow",
    difficultyBand: "boss",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 136, y: 432, aimDeg: -34, power: 0.52 },
    target: { x: 818, y: 148 },
    obstacles: [
      { type: "gravityWell", x: 392, y: 248, radius: 74, strength: 56000 },
      { type: "gravityWell", x: 690, y: 230, radius: 82, strength: 76000 },
      { type: "wall", x: 530, y: 338, w: 122, h: 18 },
      { type: "ramp", x1: 742, y1: 318, x2: 846, y2: 236, thickness: 18 },
    ],
    physicsProfile: { gravity: 860, drag: 0.011 },
    starRules: { parTimeMs: 13600, parBounces: 3 },
    tutorialHints: hints(
      "Dos pozos, dos intenciones: el primero te afina la ruta y el segundo la remata cerca del cubo.",
      "Two wells, two intentions: the first trims the path and the second finishes it near the basin."
    ),
  }),
  level(43, {
    id: "flux-44",
    name: { es: "Cadena de Montaje", en: "Assembly Chain" },
    taxonomy: "timing",
    difficultyBand: "boss",
    backgroundId: "prism-bay",
    ballSpawn: { x: 138, y: 432, aimDeg: -38, power: 0.6 },
    target: {
      x: 812,
      y: 148,
      moving: { axis: "x", min: 744, max: 848, speed: 84, phase: 0.1 },
    },
    obstacles: [
      {
        type: "movingBar",
        x: 332,
        y: 360,
        w: 114,
        h: 18,
        movement: { axis: "y", min: 224, max: 406, speed: 130, phase: 0.18 },
      },
      {
        type: "movingBar",
        x: 570,
        y: 220,
        w: 124,
        h: 18,
        movement: { axis: "x", min: 500, max: 690, speed: 112, phase: 0.46 },
      },
      { type: "gate", x: 700, y: 218, w: 24, h: 210, periodMs: 2200, openMs: 980, phaseMs: 420 },
      { type: "spikeStrip", x: 548, y: 500, w: 222, h: 24 },
    ],
    starRules: { parTimeMs: 13800, parBounces: 4 },
    tutorialHints: hints(
      "Tres ritmos en cadena. Mira el patron completo y suelta una vez, no tres medias decisiones.",
      "Three rhythms in a chain. Read the whole pattern and release once, not in three half-decisions."
    ),
  }),
  level(44, {
    id: "flux-45",
    name: { es: "Retorno de Mercurio", en: "Mercury Return" },
    taxonomy: "anti-habit",
    difficultyBand: "boss",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 814, y: 412, aimDeg: -154, power: 0.6 },
    target: { x: 178, y: 154 },
    obstacles: [
      { type: "portal", x: 668, y: 330, radius: 28, pairId: "G" },
      { type: "portal", x: 356, y: 216, radius: 28, pairId: "G" },
      { type: "fan", x: 504, y: 228, w: 150, h: 168, forceX: -140, forceY: -820 },
      { type: "wall", x: 510, y: 420, w: 158, h: 18 },
      { type: "bumper", x: 230, y: 274, radius: 36 },
    ],
    starRules: { parTimeMs: 13400, parBounces: 4 },
    tutorialHints: hints(
      "Todo va al reves salvo la logica. Si lees el mapa de derecha a izquierda, la solucion aparece.",
      "Everything is reversed except the logic. Read the map from right to left and the route appears."
    ),
  }),
  level(45, {
    id: "flux-46",
    name: { es: "Camara Helicoidal", en: "Helical Chamber" },
    taxonomy: "puzzle-physics",
    difficultyBand: "boss",
    backgroundId: "neon-grid",
    ballSpawn: { x: 142, y: 432, aimDeg: -41, power: 0.62 },
    target: { x: 824, y: 146 },
    obstacles: [
      { type: "ramp", x1: 312, y1: 390, x2: 470, y2: 284, thickness: 18 },
      { type: "gravityWell", x: 560, y: 244, radius: 86, strength: 82000 },
      { type: "gate", x: 684, y: 214, w: 24, h: 212, periodMs: 2000, openMs: 840, phaseMs: 500 },
      { type: "stickyPad", x: 782, y: 286, w: 120, h: 24 },
      { type: "spikeStrip", x: 512, y: 500, w: 252, h: 24 },
    ],
    physicsProfile: { gravity: 900, drag: 0.012 },
    starRules: { parTimeMs: 14200, parBounces: 4 },
    tutorialHints: hints(
      "La rampa pone giro, el pozo curva y el gel frena. Es un nivel de montaje fino, no de reflejos.",
      "The ramp adds shape, the well bends and the gel brakes. This is a fine assembly stage, not a reflex stage."
    ),
  }),
  level(46, {
    id: "flux-47",
    name: { es: "Trama de Titanio", en: "Titanium Weave" },
    taxonomy: "two-bounce",
    difficultyBand: "boss",
    backgroundId: "prism-bay",
    ballSpawn: { x: 136, y: 432, aimDeg: -24, power: 0.45 },
    target: {
      x: 826,
      y: 154,
      moving: { axis: "y", min: 140, max: 216, speed: 74, phase: 0.3 },
    },
    obstacles: [
      { type: "bumper", x: 298, y: 354, radius: 34 },
      { type: "bumper", x: 530, y: 252, radius: 36 },
      { type: "bumper", x: 722, y: 220, radius: 32 },
      { type: "wall", x: 656, y: 350, w: 122, h: 18 },
    ],
    starRules: { parTimeMs: 12800, parBounces: 4 },
    tutorialHints: hints(
      "No memorices un golpe aislado. Memoriza la cadencia de los tres bumpers y el objetivo movil.",
      "Do not memorize one impact. Memorize the cadence of the three bumpers and the moving basin."
    ),
  }),
  level(47, {
    id: "flux-48",
    name: { es: "Fuelle Carmesi", en: "Crimson Bellows" },
    taxonomy: "speed-clear",
    difficultyBand: "boss",
    backgroundId: "alloy-dawn",
    ballSpawn: { x: 134, y: 434, aimDeg: -18, power: 0.41 },
    target: { x: 840, y: 176 },
    obstacles: [
      { type: "fan", x: 286, y: 286, w: 132, h: 184, forceX: 230, forceY: -640 },
      { type: "fan", x: 600, y: 226, w: 132, h: 164, forceX: 180, forceY: -860 },
      {
        type: "movingBar",
        x: 478,
        y: 348,
        w: 124,
        h: 18,
        movement: { axis: "x", min: 410, max: 610, speed: 130, phase: 0.2 },
      },
      { type: "spikeStrip", x: 430, y: 500, w: 336, h: 24 },
    ],
    starRules: { parTimeMs: 9600, parBounces: 3 },
    tutorialHints: hints(
      "Dos soplos y una sola carrera. Si esperas demasiado, el nivel pierde su unica ventana limpia.",
      "Two gusts and one clean run. Wait too long and the level loses its only clean window."
    ),
  }),
  level(48, {
    id: "flux-49",
    name: { es: "Corona Bisagra", en: "Hinge Crown" },
    taxonomy: "wow",
    difficultyBand: "boss",
    backgroundId: "neon-grid",
    ballSpawn: { x: 142, y: 432, aimDeg: -36, power: 0.58 },
    target: {
      x: 820,
      y: 136,
      innerW: 46,
      tolerance: 10,
      moving: { axis: "x", min: 776, max: 844, speed: 60, phase: 0.25 },
    },
    obstacles: [
      {
        type: "movingBar",
        x: 298,
        y: 384,
        w: 112,
        h: 18,
        movement: { axis: "y", min: 240, max: 420, speed: 140, phase: 0.08 },
      },
      { type: "bumper", x: 432, y: 240, radius: 34 },
      { type: "gate", x: 574, y: 214, w: 24, h: 214, periodMs: 2300, openMs: 980, phaseMs: 610 },
      { type: "gravityWell", x: 688, y: 256, radius: 84, strength: 78000 },
      { type: "stickyPad", x: 794, y: 280, w: 118, h: 24 },
      { type: "spikeStrip", x: 520, y: 500, w: 246, h: 24 },
    ],
    physicsProfile: { gravity: 910, restitution: 0.8, drag: 0.012 },
    starRules: { parTimeMs: 14600, parBounces: 4 },
    tutorialHints: hints(
      "Cada pieza corrige un error distinto: la barra la altura, el bumper el rumbo, el gel la velocidad.",
      "Each piece fixes a different mistake: the bar corrects height, the bumper course, the gel speed."
    ),
  }),
  level(49, {
    id: "flux-50",
    name: { es: "Nucleo Flux", en: "Flux Core" },
    taxonomy: "puzzle-physics",
    difficultyBand: "boss",
    backgroundId: "prism-bay",
    ballSpawn: { x: 132, y: 432, aimDeg: -40, power: 0.62 },
    target: {
      x: 818,
      y: 128,
      innerW: 44,
      tolerance: 9,
      moving: { axis: "y", min: 126, max: 198, speed: 64, phase: 0.14 },
    },
    obstacles: [
      {
        type: "movingBar",
        x: 280,
        y: 390,
        w: 112,
        h: 18,
        movement: { axis: "y", min: 226, max: 420, speed: 142, phase: 0.18 },
      },
      { type: "portal", x: 398, y: 214, radius: 28, pairId: "H" },
      { type: "portal", x: 676, y: 362, radius: 28, pairId: "H" },
      { type: "bumper", x: 520, y: 254, radius: 36 },
      { type: "gate", x: 590, y: 214, w: 24, h: 214, periodMs: 2100, openMs: 880, phaseMs: 460 },
      { type: "gravityWell", x: 700, y: 224, radius: 82, strength: 76000 },
      { type: "fan", x: 806, y: 262, w: 126, h: 168, forceX: -40, forceY: -760 },
      { type: "spikeStrip", x: 500, y: 500, w: 274, h: 24 },
    ],
    physicsProfile: { gravity: 920, restitution: 0.8, drag: 0.012 },
    starRules: { parTimeMs: 15200, parBounces: 5 },
    tutorialHints: hints(
      [
        "Final extendido: cada mecanica aparece una vez y con un papel claro.",
        "No busques una salida caotica. La ruta ganadora sigue siendo legible de principio a fin.",
      ],
      [
        "Extended finale: every mechanic appears once and with a clear purpose.",
        "Do not hunt for chaos. The winning route is still readable from start to finish.",
      ]
    ),
  }),
];

const EXPANSION_NAME_PREFIX = [
  { es: "Resonancia", en: "Resonance" },
  { es: "Trenza", en: "Braid" },
  { es: "Helice", en: "Helix" },
  { es: "Compas", en: "Pulse" },
  { es: "Prisma", en: "Prism" },
  { es: "Vector", en: "Vector" },
  { es: "Cadena", en: "Chain" },
  { es: "Pulso", en: "Rhythm" },
  { es: "Nexo", en: "Nexus" },
  { es: "Corona", en: "Crown" },
];

const EXPANSION_NAME_SUFFIX = [
  { es: "de Cobre", en: "Copper" },
  { es: "de Titanio", en: "Titanium" },
  { es: "de Cromo", en: "Chrome" },
  { es: "de Iridio", en: "Iridium" },
  { es: "de Neutron", en: "Neutron" },
];

const EXPANSION_BACKGROUNDS = ["neon-grid", "alloy-dawn", "prism-bay"];
const EXPANSION_DIFFICULTY = ["challenge", "challenge", "wow", "boss", "boss"];

const toFluxId = (levelNumber) => `flux-${String(levelNumber).padStart(2, "0")}`;

const buildExpansionName = (slot, tier) => {
  const prefix = EXPANSION_NAME_PREFIX[slot];
  const suffix = EXPANSION_NAME_SUFFIX[tier];
  return {
    es: `${prefix.es} ${suffix.es}`,
    en: `${suffix.en} ${prefix.en}`,
  };
};

const buildExpansionHints = (slot, tier) => {
  const chapter = tier + 6;
  switch (slot) {
    case 0:
      return hints(
        [
          `Acto ${chapter}: abre sobre la pared baja y deja caer la orbita sin forzar.`,
          "Si el primer contacto es limpio, el resto del nivel se simplifica.",
        ],
        [
          `Act ${chapter}: open above the low wall and let the orb drop without forcing it.`,
          "If the first touch is clean, the rest of the route becomes simple.",
        ]
      );
    case 1:
      return hints(
        [
          `Acto ${chapter}: este patron premia un unico rebote de calidad, no una cadena de impactos.`,
          "Ajusta potencia para que el bumper te entregue al borde del objetivo.",
        ],
        [
          `Act ${chapter}: this pattern rewards one quality bank, not a chain of impacts.`,
          "Tune power so the bumper delivers you on the basin rim.",
        ]
      );
    case 2:
      return hints(
        [
          `Acto ${chapter}: la rampa define la curva y el ventilador mantiene altura.`,
          "Entra con angulo medio para evitar saturar la salida.",
        ],
        [
          `Act ${chapter}: the ramp defines shape and the fan keeps altitude.`,
          "Enter on a medium angle to avoid overdriving the exit.",
        ]
      );
    case 3:
      return hints(
        [
          `Acto ${chapter}: observa un ciclo entero de barra y compuerta antes de tirar.`,
          "Aqui gana el ritmo, no la reaccion instantanea.",
        ],
        [
          `Act ${chapter}: watch one full bar and gate cycle before releasing.`,
          "Rhythm wins here, not instant reaction.",
        ]
      );
    case 4:
      return hints(
        [
          `Acto ${chapter}: portal y pozo se complementan, no compiten.`,
          "Piensa la salida del portal como un segundo punto de lanzamiento.",
        ],
        [
          `Act ${chapter}: portal and well complement each other, they do not compete.`,
          "Treat the portal exit as a second launch point.",
        ]
      );
    case 5:
      return hints(
        [
          `Acto ${chapter}: pasillo estrecho, lectura fina y control de velocidad al final.`,
          "El gel corrige exceso, pero no salva una linea mala.",
        ],
        [
          `Act ${chapter}: narrow lane, fine reading and controlled finish speed.`,
          "Gel trims excess speed, but it will not save a bad line.",
        ]
      );
    case 6:
      return hints(
        [
          `Acto ${chapter}: memoriza la cadencia de bumpers, no un unico punto de impacto.`,
          "El tercer contacto solo funciona si llegas con energia util.",
        ],
        [
          `Act ${chapter}: memorize bumper cadence, not one isolated contact point.`,
          "The third touch only works if you arrive with useful energy.",
        ]
      );
    case 7:
      return hints(
        [
          `Acto ${chapter}: zona de riesgo con ventana corta. Prioriza ruta limpia sobre potencia.`,
          "Si dudas en mitad del tiro, el hazard se vuelve inevitable.",
        ],
        [
          `Act ${chapter}: short-window risk zone. Prioritize clean route over raw power.`,
          "If you hesitate mid-flight, the hazard becomes inevitable.",
        ]
      );
    case 8:
      return hints(
        [
          `Acto ${chapter}: escenario espejo, lectura de derecha a izquierda.`,
          "Lanza con intencion, no por reflejo. El mapa pide otra memoria muscular.",
        ],
        [
          `Act ${chapter}: mirrored stage, read it from right to left.`,
          "Release with intent, not reflex. The map asks for different muscle memory.",
        ]
      );
    default:
      return hints(
        [
          `Acto ${chapter}: nivel sintesis. Cada sistema aporta una correccion distinta.`,
          "No busques caos: la ruta correcta sigue siendo legible de principio a fin.",
        ],
        [
          `Act ${chapter}: synthesis stage. Each system contributes a different correction.`,
          "Do not chase chaos: the correct route stays readable from start to finish.",
        ]
      );
  }
};

const buildExpansionLevel = (offset) => {
  const levelNumber = 51 + offset;
  const slot = offset % 10;
  const tier = Math.floor(offset / 10);
  const levelIndex = 50 + offset;
  const id = toFluxId(levelNumber);
  const pairId = `X${levelNumber}`;
  const backgroundId = EXPANSION_BACKGROUNDS[(offset + tier) % EXPANSION_BACKGROUNDS.length];
  const difficultyBand = EXPANSION_DIFFICULTY[tier] ?? "boss";
  const name = buildExpansionName(slot, tier);
  const tutorialHints = buildExpansionHints(slot, tier);

  if (levelNumber === 51) {
    return level(levelIndex, {
      id,
      name,
      taxonomy: "direct",
      difficultyBand,
      backgroundId,
      ballSpawn: { x: 136, y: 430, aimDeg: -37, power: 0.84 },
      target: { x: 808, y: 186 },
      obstacles: [{ type: "wall", x: 556, y: 302, w: 126, h: 18 }],
      starRules: { parTimeMs: 9600, parBounces: 2 },
      tutorialHints,
    });
  }

  if (levelNumber === 61) {
    return level(levelIndex, {
      id,
      name,
      taxonomy: "direct",
      difficultyBand,
      backgroundId,
      ballSpawn: { x: 138, y: 430, aimDeg: -40, power: 0.88 },
      target: { x: 818, y: 168 },
      obstacles: [
        { type: "wall", x: 566, y: 294, w: 136, h: 18 },
        { type: "ramp", x1: 676, y1: 318, x2: 802, y2: 234, thickness: 18 },
      ],
      starRules: { parTimeMs: 10300, parBounces: 2 },
      tutorialHints,
    });
  }

  if (levelNumber === 63) {
    return level(levelIndex, {
      id,
      name,
      taxonomy: "controlled-drop",
      difficultyBand,
      backgroundId,
      ballSpawn: { x: 136, y: 432, aimDeg: -35, power: 0.64 },
      target: { x: 832, y: 162 },
      obstacles: [
        { type: "ramp", x1: 444, y1: 358, x2: 640, y2: 252, thickness: 18 },
        { type: "fan", x: 710, y: 250, w: 152, h: 180, forceX: 60, forceY: -960 },
        { type: "wall", x: 598, y: 360, w: 128, h: 18 },
      ],
      starRules: { parTimeMs: 11400, parBounces: 3 },
      tutorialHints,
    });
  }

  if (levelNumber === 70) {
    return level(levelIndex, {
      id,
      name,
      taxonomy: "wow",
      difficultyBand,
      backgroundId,
      ballSpawn: { x: 134, y: 432, aimDeg: -40, power: 0.61 },
      target: { x: 820, y: 140, innerW: 46, tolerance: 10 },
      obstacles: [
        {
          type: "movingBar",
          x: 300,
          y: 384,
          w: 112,
          h: 18,
          movement: { axis: "y", min: 248, max: 410, speed: 124, phase: 0.18 },
        },
        { type: "portal", x: 396, y: 226, radius: 28, pairId },
        { type: "portal", x: 684, y: 354, radius: 28, pairId },
        { type: "bumper", x: 534, y: 264, radius: 34 },
        { type: "gate", x: 604, y: 220, w: 24, h: 206, periodMs: 2300, openMs: 1100, phaseMs: 540 },
        { type: "stickyPad", x: 792, y: 282, w: 118, h: 24 },
        { type: "spikeStrip", x: 520, y: 500, w: 230, h: 24 },
      ],
      starRules: { parTimeMs: 14600, parBounces: 5 },
      tutorialHints,
    });
  }

  if (levelNumber === 97) {
    return level(levelIndex, {
      id,
      name,
      taxonomy: "two-bounce",
      difficultyBand,
      backgroundId,
      ballSpawn: { x: 136, y: 432, aimDeg: -24, power: 0.52 },
      target: { x: 828, y: 150 },
      obstacles: [
        { type: "bumper", x: 286, y: 352, radius: 34 },
        { type: "bumper", x: 512, y: 248, radius: 40 },
        { type: "bumper", x: 718, y: 216, radius: 32 },
        { type: "wall", x: 650, y: 340, w: 128, h: 18 },
      ],
      starRules: { parTimeMs: 13200, parBounces: 5 },
      tutorialHints,
    });
  }

  switch (slot) {
    case 0:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "direct",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 136, y: 430, aimDeg: -36 - tier * 1.5, power: 0.58 + tier * 0.03 },
        target:
          tier >= 3
            ? {
                x: 804 + tier * 7,
                y: 192 - tier * 8,
                moving: {
                  axis: "y",
                  min: 170 - tier * 3,
                  max: 220 - tier * 3,
                  speed: 56 + tier * 8,
                  phase: 0.12 + tier * 0.03,
                },
              }
            : { x: 804 + tier * 7, y: 192 - tier * 8 },
        obstacles: [
          { type: "wall", x: 520 + tier * 10, y: 304 - tier * 8, w: 122 + tier * 6, h: 18 },
          ...(tier >= 2 ? [{ type: "ramp", x1: 656, y1: 316, x2: 772, y2: 238, thickness: 18 }] : []),
        ],
        starRules: { parTimeMs: 9800 + tier * 450, parBounces: 2 + (tier >= 3 ? 1 : 0) },
        tutorialHints,
      });
    case 1:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "one-bounce",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 142, y: 428, aimDeg: -58 + tier * 1.2, power: 0.56 + tier * 0.03 },
        target: { x: 816 + tier * 6, y: 176 - tier * 6 },
        obstacles: [
          { type: "bumper", x: 388 + tier * 12, y: 336 - tier * 10, radius: 34 + (tier % 2) * 2 },
          { type: "wall", x: 630 + tier * 6, y: 270 + tier * 4, w: 122, h: 18 },
          ...(tier >= 3 ? [{ type: "stickyPad", x: 748, y: 282, w: 118, h: 24 }] : []),
        ],
        starRules: { parTimeMs: 10200 + tier * 420, parBounces: 2 + (tier >= 4 ? 1 : 0) },
        tutorialHints,
      });
    case 2:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "controlled-drop",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 134, y: 434, aimDeg: -42 + tier, power: 0.52 + tier * 0.03 },
        target: { x: 834 - tier * 2, y: 170 - tier * 8 },
        obstacles: [
          { type: "ramp", x1: 430, y1: 372 - tier * 8, x2: 612, y2: 262 - tier * 10, thickness: 18 },
          {
            type: "fan",
            x: 690,
            y: 262 - tier * 4,
            w: 146,
            h: 174,
            forceX: 45 + tier * 10,
            forceY: -940 - tier * 80,
          },
          ...(tier >= 2 ? [{ type: "spikeStrip", x: 520, y: 500, w: 180 + tier * 20, h: 24 }] : []),
        ],
        starRules: { parTimeMs: 10800 + tier * 460, parBounces: 3 + (tier >= 4 ? 1 : 0) },
        tutorialHints,
      });
    case 3:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "timing",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 138, y: 432, aimDeg: -39 - tier * 0.8, power: 0.6 + tier * 0.02 },
        target:
          tier >= 4
            ? {
                x: 824,
                y: 154,
                moving: { axis: "x", min: 770, max: 850, speed: 84, phase: 0.2 },
              }
            : { x: 824, y: 154 - tier * 4 },
        obstacles: [
          {
            type: "movingBar",
            x: 430 + tier * 10,
            y: 300 - tier * 6,
            w: 128,
            h: 18,
            movement: { axis: "y", min: 196 - tier * 6, max: 392 - tier * 4, speed: 100 + tier * 14, phase: 0.1 },
          },
          {
            type: "gate",
            x: 634 + tier * 4,
            y: 226,
            w: 24,
            h: 206,
            periodMs: 2200 - tier * 120,
            openMs: 980 - tier * 80,
            phaseMs: 360 + tier * 40,
          },
          ...(tier >= 1 ? [{ type: "wall", x: 772, y: 330, w: 104, h: 18 }] : []),
        ],
        starRules: { parTimeMs: 11400 + tier * 520, parBounces: 3 + (tier >= 3 ? 1 : 0) },
        tutorialHints,
      });
    case 4:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "puzzle-physics",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 146, y: 432, aimDeg: -33 + tier * 0.8, power: 0.48 + tier * 0.03 },
        target: { x: 812 + tier * 6, y: 150 - tier * 6 },
        obstacles: [
          { type: "portal", x: 332, y: 370, radius: 28, pairId },
          { type: "portal", x: 654, y: 214, radius: 28, pairId },
          { type: "gravityWell", x: 512 + tier * 10, y: 248 - tier * 6, radius: 78 + tier * 6, strength: 68000 + tier * 8000 },
          { type: "wall", x: 726, y: 322 - tier * 8, w: 132, h: 18 },
          ...(tier >= 2
            ? [
                {
                  type: "gate",
                  x: 590,
                  y: 214,
                  w: 22,
                  h: 208,
                  periodMs: 2140 - tier * 90,
                  openMs: 900 - tier * 70,
                  phaseMs: 280 + tier * 60,
                },
              ]
            : []),
        ],
        physicsProfile: { gravity: 880 + tier * 10, drag: 0.012 },
        starRules: { parTimeMs: 12000 + tier * 560, parBounces: 3 + (tier >= 4 ? 1 : 0) },
        tutorialHints,
      });
    case 5:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "precision",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 148, y: 432, aimDeg: -29 + tier * 0.6, power: 0.5 + tier * 0.02 },
        target: {
          x: 830 - tier * 2,
          y: 180 - tier * 4,
          innerW: 52 - tier * 2,
          tolerance: 13 - tier,
        },
        obstacles: [
          { type: "wall", x: 360, y: 190, w: 112, h: 18 },
          { type: "wall", x: 360, y: 396, w: 112, h: 18 },
          { type: "wall", x: 590, y: 190, w: 112, h: 18 },
          { type: "wall", x: 590, y: 396, w: 112, h: 18 },
          { type: "stickyPad", x: 724, y: 280, w: 128, h: 24 },
          { type: "bumper", x: 486, y: 290, radius: 30 + (tier >= 3 ? 2 : 0) },
          ...(tier >= 2 ? [{ type: "spikeStrip", x: 488, y: 500, w: 236, h: 24 }] : []),
        ],
        starRules: { parTimeMs: 12400 + tier * 540, parBounces: 4 + (tier >= 4 ? 1 : 0) },
        tutorialHints,
      });
    case 6:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "two-bounce",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 136, y: 432, aimDeg: -22 + tier * 0.5, power: 0.44 + tier * 0.02 },
        target:
          tier >= 3
            ? {
                x: 830,
                y: 162 - tier * 2,
                moving: { axis: "y", min: 140, max: 220, speed: 70 + tier * 6, phase: 0.28 },
              }
            : { x: 830, y: 162 - tier * 4 },
        obstacles: [
          { type: "bumper", x: 286, y: 352, radius: 34 },
          { type: "bumper", x: 512, y: 252, radius: 34 + tier * 2 },
          { type: "bumper", x: 718, y: 214, radius: 30 + (tier % 2) * 2 },
          { type: "wall", x: 642, y: 346, w: 132, h: 18 },
          ...(tier >= 3
            ? [
                {
                  type: "movingBar",
                  x: 460,
                  y: 174,
                  w: 118,
                  h: 18,
                  movement: { axis: "x", min: 390, max: 610, speed: 96 + tier * 12, phase: 0.22 },
                },
              ]
            : []),
        ],
        starRules: { parTimeMs: 11800 + tier * 520, parBounces: 4 + (tier >= 4 ? 1 : 0) },
        tutorialHints,
      });
    case 7:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "risk-reward",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 134, y: 434, aimDeg: -18 + tier * 0.5, power: 0.4 + tier * 0.02 },
        target: { x: 842, y: 176 - tier * 5 },
        obstacles: [
          { type: "fan", x: 304, y: 288, w: 132, h: 178, forceX: 190 + tier * 20, forceY: -640 - tier * 70 },
          { type: "spikeStrip", x: 420, y: 500, w: 260 + tier * 18, h: 24 },
          { type: "wall", x: 532, y: 320, w: 124, h: 18 },
          { type: "ramp", x1: 676, y1: 320, x2: 812, y2: 236, thickness: 18 },
          ...(tier >= 2
            ? [
                {
                  type: "movingBar",
                  x: 580,
                  y: 250,
                  w: 120,
                  h: 18,
                  movement: { axis: "x", min: 522, max: 676, speed: 112 + tier * 10, phase: 0.18 },
                },
              ]
            : []),
        ],
        starRules: { parTimeMs: 11200 + tier * 500, parBounces: 3 + (tier >= 3 ? 1 : 0) },
        tutorialHints,
      });
    case 8:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "anti-habit",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 816, y: 416, aimDeg: -154 + tier * 2, power: 0.57 + tier * 0.02 },
        target: { x: 170 + tier * 2, y: 170 - tier * 4 },
        obstacles: [
          { type: "portal", x: 676, y: 336, radius: 28, pairId },
          { type: "portal", x: 352, y: 218, radius: 28, pairId },
          { type: "fan", x: 516, y: 234, w: 154, h: 168, forceX: -140 - tier * 20, forceY: -780 - tier * 60 },
          { type: "wall", x: 520, y: 424, w: 160, h: 18 },
          { type: "bumper", x: 236, y: 274, radius: 34 + tier * 2 },
          ...(tier >= 1
            ? [
                {
                  type: "gate",
                  x: 442,
                  y: 214,
                  w: 24,
                  h: 212,
                  periodMs: 2180 - tier * 100,
                  openMs: 960 - tier * 70,
                  phaseMs: 340 + tier * 40,
                },
              ]
            : []),
          ...(tier >= 3 ? [{ type: "spikeStrip", x: 300, y: 500, w: 220, h: 24 }] : []),
        ],
        starRules: { parTimeMs: 12600 + tier * 580, parBounces: 4 + (tier >= 3 ? 1 : 0) },
        tutorialHints,
      });
    default:
      return level(levelIndex, {
        id,
        name,
        taxonomy: "wow",
        difficultyBand,
        backgroundId,
        ballSpawn: { x: 132, y: 432, aimDeg: -38, power: 0.6 + tier * 0.02 },
        target:
          tier >= 2
            ? {
                x: 818,
                y: 136 - tier * 2,
                innerW: 46 - tier,
                tolerance: 10 - tier * 0.8,
                moving: {
                  axis: "x",
                  min: 782,
                  max: 846,
                  speed: 58 + tier * 8,
                  phase: 0.2 + tier * 0.03,
                },
              }
            : { x: 818, y: 136 - tier * 2, innerW: 46 - tier, tolerance: 10 - tier * 0.8 },
        obstacles: [
          {
            type: "movingBar",
            x: 286,
            y: 388,
            w: 112,
            h: 18,
            movement: { axis: "y", min: 220, max: 420, speed: 138 + tier * 10, phase: 0.18 },
          },
          { type: "gravityWell", x: 458, y: 242, radius: 74 + tier * 4, strength: 64000 + tier * 6000 },
          {
            type: "gate",
            x: 582,
            y: 214,
            w: 24,
            h: 214,
            periodMs: 2200 - tier * 100,
            openMs: 930 - tier * 70,
            phaseMs: 450,
          },
          { type: "portal", x: 694, y: 350, radius: 28, pairId },
          { type: "portal", x: 806, y: 206, radius: 28, pairId },
          { type: "stickyPad", x: 790, y: 282, w: 120, h: 24 },
          { type: "bumper", x: 516, y: 292, radius: 32 },
          { type: "fan", x: 868, y: 266, w: 104, h: 160, forceX: -40, forceY: -760 - tier * 50 },
          { type: "spikeStrip", x: 500, y: 500, w: 280, h: 24 },
        ],
        physicsProfile: { gravity: 910 + tier * 6, restitution: 0.8, drag: 0.012 },
        starRules: { parTimeMs: 13800 + tier * 620, parBounces: 5 + (tier >= 4 ? 1 : 0) },
        tutorialHints,
      });
  }
};

const WORLD1_EXPANSION_LEVELS = Array.from({ length: 50 }, (_, index) => buildExpansionLevel(index));

export const WORLD1_LEVELS = [...WORLD1_BASE_LEVELS, ...WORLD1_EXPANSION_LEVELS];
