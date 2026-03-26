const fs = require('fs');
const path = 'src/data/games.js';
const src = fs.readFileSync(path, 'utf8');
const replacement = `  {
    id: "arcade-neon-rush",
    image: arcadeNeonRushImage,
    sessionTime: "2-8 min",

    title: "Neon Rush",
    category: "Arcade",
    tagline: "Runner de precision con 20 niveles, obstaculos neon y salto de baja latencia + salto aereo de apoyo.",
    description:
      "Integracion completa del juego Neon Rush con 20 niveles de dificultad progresiva. El jugador avanza de forma continua y debe reaccionar con saltos precisos para evitar pinchos, techos, bloques y secuencias combinadas. Se reforzo la jugabilidad para reducir frustracion: jump buffer, coyote time, hitboxes mas justas, salto aereo de apoyo y asistencia dinamica tras varios intentos.",
    objective_es:
      "Completa cada nivel llegando al portal final sin chocar contra obstaculos. Mejora tu mejor tiempo y supera niveles cada vez mas exigentes.",
    howToPlay_es:
      "Pulsa Espacio, flecha arriba, click o tap para saltar. En movil y tablet puedes tocar cualquier zona del juego para activar el salto, y volver a tocar en el aire para usar el salto aereo de apoyo (1 por ciclo). Puedes arrancar desde pantalla inicial con la misma entrada. R reintenta cuando caes y Esc vuelve al menu principal.",
    highlights: [
      "20 niveles con identidad visual propia (easy/medium/hard/insane).",
      "Mecanicas de precision: pinchos de suelo, pinchos de techo, bloques, jump pads y orbes de impulso.",
      "Respuesta de salto reforzada con jump buffer + coyote time para minimizar delay percibido.",
      "Salto aereo de apoyo (1 por ciclo) para resolver secuencias densas sin bloqueos injustos.",
      "Colisiones ajustadas para esquiva justa y menos muertes por bordes ambiguos.",
      "Asistencia progresiva por intentos (ligera reduccion de velocidad) para evitar bloqueos imposibles.",
      "HUD de progreso, puntuacion, mejor marca y contador de intentos por nivel.",
      "Bridge QA activo: \`render_game_to_text\` y \`advanceTime\` disponibles para automatizacion.",
    ],
    difficulty: "Progresiva",
    multiplayer: "Solo",
    viability: "Alta: juego Canvas autocontenido integrado via iframe con estado serializable.",
    visualStyle: "Neon synthwave con overlays arcades, efectos de particulas y fondos tematicos por nivel.",
    techFocus: "Runner determinista con ajustes de input-latency, fisica de salto y balance de colisiones para esquiva fiable.",

    category_en: "Arcade",
    tagline_en: "Precision runner with 20 levels, neon obstacles, and low-latency jump response + assist air jump.",
    description_en:
      "Full Neon Rush integration with 20 progressively harder levels. The player auto-runs and must react with precise jumps to avoid spikes, ceiling traps, blocks, and mixed obstacle patterns. Gameplay was tuned to reduce frustration: jump buffer, coyote time, fairer hitboxes, an assist air jump, and dynamic assist after repeated failures.",
    objective_en:
      "Complete each level by reaching the final portal without colliding with obstacles. Improve your best runs and clear increasingly demanding stages.",
    howToPlay_en:
      "Press Space, Up Arrow, click, or tap to jump. On mobile/tablet, tapping anywhere in the game area triggers jump, and tapping again mid-air triggers the assist air jump (1 per cycle). The same input starts a run from the intro screen. Press R to retry after a crash and Esc to return to the main menu.",
    highlights_en: [
      "20 levels with distinct visual identity across easy/medium/hard/insane tiers.",
      "Precision mechanics: ground spikes, ceiling spikes, solid blocks, jump pads, and boost orbs.",
      "Snappy jump response via jump-buffer + coyote-time to reduce perceived input delay.",
      "Assist air jump (1 per cycle) to keep dense obstacle sections dodgeable.",
      "Collision tuning for fair dodging and fewer ambiguous edge deaths.",
      "Progressive assist after repeated retries (slight speed reduction) to prevent impossible-feeling stalls.",
      "HUD with progress, score, best record, and per-level attempt tracking.",
      "QA bridge enabled: \`render_game_to_text\` and \`advanceTime\` are exposed for automation.",
    ],
    difficulty_en: "Progressive",
    multiplayer_en: "Solo",
    viability_en: "High: self-contained Canvas game integrated via iframe with serializable runtime state.",
    visualStyle_en: "Neon synthwave direction with arcade overlays, particles, and level-themed backdrops.",
    techFocus_en: "Deterministic runner with input-latency improvements, jump physics tuning, and dodge-friendly collision balancing.",
  },`;

const re = /\{\s*id:\s*"arcade-neon-rush"[\s\S]*?techFocus_en:[\s\S]*?\n\s*\},/;
if (!re.test(src)) {
  throw new Error('arcade-neon-rush block not found for replacement');
}
const next = src.replace(re, replacement);
fs.writeFileSync(path, next);
console.log('updated arcade-neon-rush block');
