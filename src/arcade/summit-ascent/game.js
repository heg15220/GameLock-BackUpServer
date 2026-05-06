/* ============================================================
 * Summit Ascent — Standalone HTML game
 * ----------------------------------------------------------------
 * Vista lateral 2D con cámara que sigue al climber en X e Y
 * (lerp suave, clamped al bounds del mundo). Inspirado en la
 * perspectiva del juego "Cavar el Hoyo" (dig-hole-treasure):
 * cielo con paralaje, masa continua de roca con materiales
 * incrustados, climber rigeado y partículas climáticas.
 * ============================================================ */

(function () {
  "use strict";

  /* =====================================================
   *  1. CONSTANTES
   * ===================================================== */

  const FIXED_DT = 1 / 60;
  const MAX_FRAME_DT = 1 / 24;
  const STORAGE_KEY = "summit-ascent-html-progress-v1";
  const VERSION = "1.0.0";

  // Lenguaje (con override por query string ?lang=)
  const LANG_OVERRIDE = (() => {
    try {
      return new URLSearchParams(window.location.search).get("lang");
    } catch (e) {
      return null;
    }
  })();
  const USER_LANGUAGE = String(
    LANG_OVERRIDE ||
      (navigator.languages && navigator.languages[0]) ||
      navigator.language ||
      ""
  ).toLowerCase();
  const DEFAULT_LOCALE = USER_LANGUAGE.startsWith("es") ? "es" : "en";

  // Mundo
  const WORLD_MARGIN_X = 220;
  const WORLD_BOTTOM_PADDING = 220;
  const WORLD_TOP_PADDING = 380;
  const FOG_BAND_HEIGHT = 240;

  // Física del climber
  const GRAVITY = 1450;
  const TERMINAL_VELOCITY = 1100;
  const CLIMB_SPEED = 168;
  const SIDE_SPEED = 138;
  const DESCEND_SPEED = 92;
  const FALL_DRAG = 0.985;
  const ROPE_LENGTH = 240;
  const ROPE_STRETCH = 36;
  const ROPE_CATCH_PENALTY = 28;
  const ANCHOR_THROW_DISTANCE = 185;
  const ANCHOR_MIN_THROW_DISTANCE = 48;
  const ANCHOR_RETHROW_WINDOW = 14;
  const ANCHOR_CEILING_SLACK = 3;
  const ANCHOR_SWING_DURATION = 0.42;
  const ANCHOR_THROW_DURATION = 0.82;
  const ANCHOR_THROW_ARC_MIN = 56;
  const ANCHOR_THROW_ARC_MAX = 120;
  const SAFE_GRACE_AFTER_CAVE = 1.6;
  const FOOTHOLD_SNAP_THRESHOLD = 28;
  const PLAYER_RADIUS = 14;
  const PLAYER_HEIGHT = 36;

  // Intro / suelo / caseta de salida
  const HUT_X = 70;
  const HUT_GROUND_Y_OFFSET = 18;
  const INTRO_DOOR_DURATION = 0.65;
  const INTRO_WALK_SPEED = 92;
  const GROUND_STRIP_HEIGHT = 28;

  // Cumbre / esplanada / bandera
  const SUMMIT_PLATEAU_WIDTH = 150;
  const SUMMIT_PLATEAU_RIGHT_DROP = 110; // píxeles que la silueta cae a la derecha
  const SUMMIT_FLAG_OFFSET = 88;          // posición de la bandera dentro de la esplanada
  const SUMMIT_WALK_SPEED = 110;
  const SUMMIT_FLAG_REACH = 9;
  const MOUNTAIN_RIGHT_BASE_OFFSET = 1100;
  const SLOPE_LEVEL_STEP_PERCENT = 5;
  const SLOPE_FIRST_LEVEL_START_PERCENT = 1;
  const SLOPE_PROFILE_BASE_RUN = 0.02;
  const SLOPE_PROFILE_GRADE_RUN = 2.05;
  const SLOPE_PROFILE_SCALE = 0.48;
  const SLOPE_PLATEAU_RATIO = 0.055;
  const SLOPE_PLATEAU_MIN_HEIGHT = 72;
  const SLOPE_PLATEAU_MAX_HEIGHT = 150;
  const SLOPE_PLATEAU_MIN_METERS = 320;
  const SLOPE_PLATEAU_MAX_METERS = 520;
  const WALKABLE_PLATEAU_MARGIN = 26;
  const WALKABLE_PLATEAU_SPEED = 118;
  const CLIMBER_FACE_MIN_OFFSET = -28;
  const CLIMBER_FACE_MAX_OFFSET = 10;
  const CLIMBER_FACE_REATTACH_OFFSET = 8;
  const MOUNTAIN_PEAK_NARROW_RATIO = 0.78; // dónde empieza el estrechamiento del pico

  // Recursos
  const STAMINA_MAX = 100;
  const WATER_MAX = 100;
  const GRIP_MAX = 100;
  const FOOD_DEFAULT = 2;
  const STAMINA_IDLE_DRAIN = 0.45;
  const STAMINA_CLIMB_DRAIN = 1.55;
  const STAMINA_LATERAL_DRAIN = 0.95;
  const STAMINA_DESCENT_DRAIN = 0.62;
  const WATER_DRAIN = 0.32;
  const GRIP_RECOVERY = 8.5;
  const GRIP_RAIN_DRAIN = 4.2;
  const GRIP_SNOW_DRAIN = 3.4;
  const GRIP_FOG_DRAIN = 1.6;
  const STAMINA_DRINK_RECOVER = 12;
  const STAMINA_FOOD_RECOVER = 25;
  const WATER_DRINK_AMOUNT = 18;
  const REST_RECOVERY_PER_SECOND = 2.2;
  const REST_DURATION_DEFAULT = 30;

  // Cámara y mundo de render
  const CAMERA_LERP = 0.115;
  const CAMERA_VERTICAL_OFFSET_RATIO = 0.52;
  const CAMERA_HORIZONTAL_OFFSET_RATIO = 0.5;
  const PARALLAX_SKY = 0.06;
  const PARALLAX_FAR_PEAKS = 0.18;
  const PARALLAX_MID_PEAKS = 0.34;
  const PARALLAX_NEAR_DETAIL = 0.62;

  // Climber rig
  const RIG_BONE_HEAD = "head";
  const RIG_BONE_TORSO = "torso";
  const RIG_BONE_HIP = "hip";
  const RIG_LEG_BONES = ["thighL", "thighR", "shinL", "shinR", "footL", "footR"];
  const RIG_ARM_BONES = ["upperL", "upperR", "forearmL", "forearmR", "handL", "handR"];

  // Audio
  const AUDIO_DEFAULT_GAIN = 0.42;
  const AUDIO_MUTED_KEY = "summit-ascent-muted";

  // Eventos UI
  const UI_TIMING = {
    messageDuration: 3.2,
    toastDuration: 2.4,
    danger: 4.6,
  };

  // Tabla de niveles altimétricos
  const ALTITUDE_DISPLAY_FACTOR = 0.34; // 1 px = ~0.34 m

  // Bandas de niebla extras adicionales (efecto visual)
  const NOISE_OCTAVES = 4;

  // Paleta de holds (colores incrustados sobre la masa de roca)
  const HOLD_PALETTE_BASE = [
    "#d6dde9",
    "#c0c8d4",
    "#a4adbb",
    "#8a93a3",
  ];
  const HOLD_PALETTE_VOLCANIC = [
    "#ffba7d",
    "#e88f54",
    "#a35636",
    "#682f1f",
  ];
  const HOLD_PALETTE_ICE = [
    "#dbf2ff",
    "#a3d4ee",
    "#6fa9c8",
    "#4a7a92",
  ];
  const HOLD_PALETTE_DUNES = [
    "#ffe2a3",
    "#e9b96f",
    "#b38842",
    "#7a5a2a",
  ];
  const HOLD_PALETTE_JADE = [
    "#c9f6dc",
    "#80d8a4",
    "#4d9b76",
    "#256148",
  ];

  /* =====================================================
   *  2. UTILIDADES
   * ===================================================== */

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function unlerp(a, b, v) {
    if (b === a) return 0;
    return clamp((v - a) / (b - a), 0, 1);
  }

  function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function approach(value, target, max) {
    if (value < target) return Math.min(target, value + max);
    return Math.max(target, value - max);
  }

  function lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    return a + diff * t;
  }

  function hashSeed(seed) {
    let h = seed | 0;
    h = (h ^ (h >>> 16)) * 0x85ebca6b;
    h = (h ^ (h >>> 13)) * 0xc2b2ae35;
    return (h ^ (h >>> 16)) >>> 0;
  }

  function makeRng(seed) {
    let state = hashSeed(seed) || 1;
    return function rng() {
      state |= 0;
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngRange(rng, lo, hi) {
    return lo + rng() * (hi - lo);
  }

  function rngInt(rng, lo, hi) {
    return Math.floor(rngRange(rng, lo, hi + 1));
  }

  function rngChoice(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function distance(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function distanceSq(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return dx * dx + dy * dy;
  }

  function formatSecondsClock(totalSeconds) {
    const total = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function formatMeters(meters) {
    const safe = Math.max(0, Math.round(meters));
    if (safe >= 10000) {
      return `${(safe / 1000).toFixed(1)} km`;
    }
    return `${safe.toLocaleString("es-ES")} m`;
  }

  function formatMetersShort(meters) {
    const safe = Math.max(0, Math.round(meters));
    return `${safe} m`;
  }

  function pad(n, d) {
    return String(n).padStart(d, "0");
  }

  /* =====================================================
   *  3. INTERNACIONALIZACIÓN
   * ===================================================== */

  const STRINGS = {
    es: {
      gameTitle: "Summit Ascent",
      menuEyebrow: "Aventura vertical",
      menuLead:
        "Elige una montaña, gestiona estamina, agua, agarre y rutas para llegar a la cumbre antes de que el clima te cierre el paso.",
      btnStart: "Iniciar ascenso",
      btnRandom: "Montaña al azar",
      btnTutorial: "Cómo se juega",
      btnReset: "Borrar récords",
      btnRestart: "Reiniciar montaña",
      btnQuit: "Volver al menú",
      btnResume: "Reanudar",
      btnRetry: "Reintentar montaña",
      btnChange: "Cambiar montaña",
      btnShare: "Copiar resumen",
      btnTutorialBack: "Volver al menú",

      tutorialEyebrow: "Guía rápida",
      tutorialTitle: "Cómo se juega",
      tutorialControlsTitle: "Controles",
      tutorialResourcesTitle: "Recursos",
      tutorialPerspectiveTitle: "Cámara y vista",
      tutorialPerspectiveCopy:
        "La cámara es lateral con seguimiento suave en X e Y, mostrando un corte de la montaña con materiales incrustados (presas, hielo, vetas, ledges). El cielo se desplaza con paralaje cuando te mueves; el suelo y la cumbre quedan referenciados en la barra de altitud lateral.",
      tutorialClimateTitle: "Clima por bandas",
      tutorialClimateCalm: "Tranquilo: drenaje base.",
      tutorialClimateWind: "Viento: añade deriva lateral y consumo.",
      tutorialClimateFog: "Niebla: visibilidad reducida y agarre frío.",
      tutorialClimateRain: "Lluvia: roca resbaladiza, agarre debilitado.",
      tutorialClimateSnow: "Nieve: estamina alta y peligro de caída.",

      pauseEyebrow: "Ruta detenida",
      pauseTitle: "Pausa",
      pauseLead:
        "Tómate un respiro. La estamina y el clima se reanudarán al continuar.",

      caveEyebrow: "Refugio",
      caveTitle: "Cueva",
      caveLead: "Has llegado a una grieta donde puedes recuperar fuerzas.",
      caveLootCopy:
        "Encuentras agua y víveres dejados por escaladores anteriores.",
      caveResourceFood: "Comida disponible",
      caveResourceWater: "Agua disponible",
      caveResourceWood: "Leña",
      caveActionsLabel: "Acciones",
      caveStateLabel: "Estado actual",
      caveStateStamina: "Estamina",
      caveStateWater: "Agua",
      caveStateGrip: "Agarre",
      caveStateFood: "Comida",
      caveStateAltitude: "Altitud actual",
      caveStateTime: "Tiempo en montaña",
      caveDrinkBtn: "Beber agua (+18 hidratación)",
      caveEatBtn: "Comer ración (+25 estamina)",
      caveCollectFoodBtn: "Recoger comida disponible",
      caveRestBtn: "Descansar 30 segundos",
      caveLeaveBtn: "Salir y continuar",

      endingEyebrowDead: "Caída fatal",
      endingEyebrowWon: "Cumbre conquistada",
      endingEyebrowAbandon: "Abandono voluntario",
      endingTitleDead: "Has caído al vacío",
      endingTitleWon: "¡La cumbre es tuya!",
      endingTitleAbandon: "Has bajado de la montaña",
      endingLeadDead:
        "La cuerda no llegó a tiempo. Cada caída enseña algo nuevo sobre la pared.",
      endingLeadWon:
        "El viento de la cumbre te recibe con la calma de quien ya ha vencido.",
      endingLeadAbandon:
        "A veces la decisión más sabia es darse la vuelta antes que arriesgar de más.",

      hudObjective:
        "Asciende hasta la cumbre administrando estamina, agua y anclajes.",
      hudPaused: "Juego en pausa.",
      hudCaveActive: "Estás dentro de una cueva.",

      vitalStamina: "Estamina",
      vitalWater: "Agua",
      vitalGrip: "Agarre",
      vitalAscent: "Ascenso",
      statAltitude: "Altitud",
      statWeather: "Clima",
      statZone: "Zona",
      statFood: "Comida",
      statCave: "Cueva",
      statAnchor: "Anclaje",
      statTime: "Tiempo",
      statBest: "Récord",

      anchorLabelNone: "Sin anclaje",
      anchorLabelAt: "Tope {{m}} m",
      anchorPlaced: "Anclaje lanzado",
      anchorAuto: "Anclaje automático",

      caveStatusEntered: "Activa",
      caveStatusNearby: "Cerca",
      caveStatusEmpty: "—",

      msgWelcome: "Bienvenido a {{name}}. ¡Sube con cabeza!",
      msgRouteResume: "Reanudas la ruta.",
      msgPaused: "Juego en pausa.",
      msgUnpause: "De vuelta a la pared.",
      msgNoWater: "No queda agua en tu cantimplora.",
      msgNoFood: "No quedan raciones.",
      msgNoCaveNear: "No hay cuevas cerca.",
      msgFoodEaten: "Te comes una ración. Estamina recuperada.",
      msgDrink: "Bebes y recuperas algo de fuerza.",
      msgClimateChange: "Entras en zona: {{name}}.",
      msgAnchorLimit: "La cuerda ya no da más. Planta un nuevo anclaje.",
      msgNeedAnchor: "Pulsa Espacio para lanzar un anclaje.",
      msgAnchorFlying: "Anclaje en vuelo.",
      msgAnchorTooFar: "Alcanza primero el anclaje actual.",
      msgRopeCatch: "La cuerda te atrapa. Pierdes estamina.",
      msgFallToDeath: "Has caído al vacío.",
      msgSummit: "¡Cumbre alcanzada!",
      msgSummitReached: "¡Cumbre alcanzada! Camina hasta la bandera.",
      msgRecordBeat: "¡Nuevo récord en {{name}}!",
      msgGripLow: "Tu agarre está casi nulo.",
      msgWaterLow: "Tu hidratación está baja.",
      msgStaminaLow: "Estás agotado. Busca una cueva.",
      msgRestStart: "Descansas y recuperas estamina.",
      msgRestEnd: "Te sientes recuperado.",

      caveNoteBase: "Pasos al fuego se oyen lejanos.",
      cardTagWind: "viento",
      cardTagFog: "niebla",
      cardTagRain: "lluvia",
      cardTagSnow: "nieve",
      cardTagCold: "frío",
      cardTagHot: "calor",
      cardTagBalanced: "equilibrada",
      cardTagSavage: "salvaje",
      cardTagHard: "difícil",
      cardTagExtreme: "extrema",
      cardTagNarrow: "rutas estrechas",
      cardTagWide: "muros amplios",
      cardTagFewCaves: "pocas cuevas",
      cardTagManyCaves: "cuevas frecuentes",

      detailHeight: "Altura",
      detailDifficulty: "Dificultad",
      detailRecord: "Mejor altitud",
      detailRuns: "Intentos",
      detailLayers: "Bandas climáticas",
      detailCaves: "Cuevas y refugios",
      summitTopLabel: "Cumbre",
      summitBaseLabel: "Base",

      copySummary: "Resumen copiado al portapapeles.",
      copyFail: "No pude copiar el resumen.",
      resetConfirm:
        "¿Borrar todos los récords y progreso guardado? Esto no se puede deshacer.",

      summaryAttempt: "Intento {{n}}",
      summaryAltitudeReached: "Altitud alcanzada",
      summaryDistance: "Distancia recorrida",
      summaryTime: "Tiempo total",
      summaryAnchorsPlaced: "Anclajes plantados",
      summaryFalls: "Caídas",
      summaryRopeCatches: "Cuerdas a tiempo",
      summaryCavesVisited: "Cuevas visitadas",
      summaryRecordSet: "Nuevo récord",

      beaconNextCave: "Cueva más cercana",
      beaconKeepClimbing: "Sigue escalando",
      beaconNeedAnchor: "Lanza anclaje",
      beaconAnchorTop: "Sube hasta el anclaje",
      beaconPlateauWalk: "Camina la llanura",
      beaconLowStamina: "Busca refugio",
      beaconWeather: "Clima cambia",
      beaconRain: "Atento a la lluvia",
      beaconSnow: "Cuidado con la nieve",
      beaconFog: "Visibilidad reducida",
      beaconWind: "Viento fuerte",

      controlsCompact: "Mover · Escalar · Anclaje · Agua · Cueva",
      kbdEscape: "Esc",
      kbdSpace: "Espacio",

      audioMuted: "Audio silenciado",
      audioUnmuted: "Audio activado",

      caveNotesGeneric: [
        "Las paredes están húmedas; alguien encendió fuego hace poco.",
        "Hay marcas talladas con el piolet de antiguos escaladores.",
        "Una corriente de aire fría te recuerda que la cumbre sigue lejos.",
        "Restos de comida: parece que esta cueva ha salvado a más de uno.",
        "Un haz de luz entra por una grieta y dibuja la silueta de la roca.",
        "Las gotas en el techo marcan un ritmo lento, casi reconfortante.",
      ],
    },
    en: {
      gameTitle: "Summit Ascent",
      menuEyebrow: "Vertical adventure",
      menuLead:
        "Pick a mountain, manage stamina, water, grip and routes to reach the summit before the weather closes in.",
      btnStart: "Begin ascent",
      btnRandom: "Random mountain",
      btnTutorial: "How to play",
      btnReset: "Erase records",
      btnRestart: "Restart mountain",
      btnQuit: "Back to menu",
      btnResume: "Resume",
      btnRetry: "Retry mountain",
      btnChange: "Change mountain",
      btnShare: "Copy summary",
      btnTutorialBack: "Back to menu",

      tutorialEyebrow: "Quick guide",
      tutorialTitle: "How to play",
      tutorialControlsTitle: "Controls",
      tutorialResourcesTitle: "Resources",
      tutorialPerspectiveTitle: "Camera & view",
      tutorialPerspectiveCopy:
        "The camera is side-on with smooth follow on X and Y, showing a vertical cross-section of the mountain with embedded materials (holds, ice, veins, ledges). The sky parallaxes as you move; the side rail tracks your altitude between base and summit.",
      tutorialClimateTitle: "Weather bands",
      tutorialClimateCalm: "Calm: base drain.",
      tutorialClimateWind: "Wind: lateral drift and extra drain.",
      tutorialClimateFog: "Fog: lower visibility and cold grip.",
      tutorialClimateRain: "Rain: slick rock, weakened grip.",
      tutorialClimateSnow: "Snow: high stamina cost and slip risk.",

      pauseEyebrow: "Route paused",
      pauseTitle: "Pause",
      pauseLead: "Take a breath. Stamina and weather will resume on continue.",

      caveEyebrow: "Shelter",
      caveTitle: "Cave",
      caveLead: "You reach a crevice where you can recover.",
      caveLootCopy:
        "You find water and supplies left by previous climbers.",
      caveResourceFood: "Available food",
      caveResourceWater: "Available water",
      caveResourceWood: "Firewood",
      caveActionsLabel: "Actions",
      caveStateLabel: "Current status",
      caveStateStamina: "Stamina",
      caveStateWater: "Water",
      caveStateGrip: "Grip",
      caveStateFood: "Food",
      caveStateAltitude: "Current altitude",
      caveStateTime: "Mountain time",
      caveDrinkBtn: "Drink water (+18 hydration)",
      caveEatBtn: "Eat ration (+25 stamina)",
      caveCollectFoodBtn: "Collect available food",
      caveRestBtn: "Rest 30 seconds",
      caveLeaveBtn: "Leave & continue",

      endingEyebrowDead: "Fatal fall",
      endingEyebrowWon: "Summit conquered",
      endingEyebrowAbandon: "Voluntary retreat",
      endingTitleDead: "You fell into the void",
      endingTitleWon: "The summit is yours!",
      endingTitleAbandon: "You climbed back down",
      endingLeadDead:
        "The rope didn't catch in time. Every fall teaches you something about the wall.",
      endingLeadWon:
        "The summit wind greets you with the calm of those who already won.",
      endingLeadAbandon:
        "Sometimes the wisest call is to turn back rather than push too far.",

      hudObjective:
        "Climb to the summit while managing stamina, water and anchors.",
      hudPaused: "Game paused.",
      hudCaveActive: "You are inside a cave.",

      vitalStamina: "Stamina",
      vitalWater: "Water",
      vitalGrip: "Grip",
      vitalAscent: "Ascent",
      statAltitude: "Altitude",
      statWeather: "Weather",
      statZone: "Zone",
      statFood: "Food",
      statCave: "Cave",
      statAnchor: "Anchor",
      statTime: "Time",
      statBest: "Best",

      anchorLabelNone: "No anchor",
      anchorLabelAt: "Limit {{m}} m",
      anchorPlaced: "Anchor thrown",
      anchorAuto: "Auto anchor",

      caveStatusEntered: "Active",
      caveStatusNearby: "Nearby",
      caveStatusEmpty: "—",

      msgWelcome: "Welcome to {{name}}. Climb smart!",
      msgRouteResume: "You resume the route.",
      msgPaused: "Game paused.",
      msgUnpause: "Back on the wall.",
      msgNoWater: "Your canteen is empty.",
      msgNoFood: "No rations left.",
      msgNoCaveNear: "No cave nearby.",
      msgFoodEaten: "You eat a ration. Stamina recovered.",
      msgDrink: "You drink and feel a little stronger.",
      msgClimateChange: "Entering zone: {{name}}.",
      msgAnchorLimit: "The rope is fully extended. Plant a new anchor.",
      msgNeedAnchor: "Press Space to throw an anchor.",
      msgAnchorFlying: "Anchor in flight.",
      msgAnchorTooFar: "Reach the current anchor first.",
      msgRopeCatch: "The rope catches you. You lose stamina.",
      msgFallToDeath: "You fell into the void.",
      msgSummit: "Summit reached!",
      msgSummitReached: "Summit reached! Walk to the flag.",
      msgRecordBeat: "New record on {{name}}!",
      msgGripLow: "Your grip is nearly gone.",
      msgWaterLow: "Hydration low.",
      msgStaminaLow: "You're exhausted. Find a cave.",
      msgRestStart: "You rest and recover stamina.",
      msgRestEnd: "You feel recovered.",

      caveNoteBase: "Footsteps echo near the fire.",
      cardTagWind: "wind",
      cardTagFog: "fog",
      cardTagRain: "rain",
      cardTagSnow: "snow",
      cardTagCold: "cold",
      cardTagHot: "heat",
      cardTagBalanced: "balanced",
      cardTagSavage: "savage",
      cardTagHard: "hard",
      cardTagExtreme: "extreme",
      cardTagNarrow: "narrow routes",
      cardTagWide: "wide walls",
      cardTagFewCaves: "few caves",
      cardTagManyCaves: "frequent caves",

      detailHeight: "Height",
      detailDifficulty: "Difficulty",
      detailRecord: "Best altitude",
      detailRuns: "Attempts",
      detailLayers: "Weather bands",
      detailCaves: "Caves and shelters",
      summitTopLabel: "Summit",
      summitBaseLabel: "Base",

      copySummary: "Summary copied to clipboard.",
      copyFail: "Could not copy summary.",
      resetConfirm:
        "Erase all records and saved progress? This cannot be undone.",

      summaryAttempt: "Attempt {{n}}",
      summaryAltitudeReached: "Altitude reached",
      summaryDistance: "Distance climbed",
      summaryTime: "Total time",
      summaryAnchorsPlaced: "Anchors placed",
      summaryFalls: "Falls",
      summaryRopeCatches: "Rope catches",
      summaryCavesVisited: "Caves visited",
      summaryRecordSet: "New record",

      beaconNextCave: "Nearest cave",
      beaconKeepClimbing: "Keep climbing",
      beaconNeedAnchor: "Throw anchor",
      beaconAnchorTop: "Climb to anchor",
      beaconPlateauWalk: "Walk the plateau",
      beaconLowStamina: "Find shelter",
      beaconWeather: "Weather shifts",
      beaconRain: "Rain incoming",
      beaconSnow: "Mind the snow",
      beaconFog: "Low visibility",
      beaconWind: "Strong wind",

      controlsCompact: "Move · Climb · Anchor · Water · Cave",
      kbdEscape: "Esc",
      kbdSpace: "Space",

      audioMuted: "Audio muted",
      audioUnmuted: "Audio on",

      caveNotesGeneric: [
        "The walls are damp; someone lit a fire here recently.",
        "Pickaxe marks of older climbers cover the stone.",
        "A cold draft reminds you the summit is still far above.",
        "Food remains — this cave has saved more than one climber.",
        "A beam of light cuts through a crack and traces the rock.",
        "Drops in the ceiling beat a slow, almost soothing rhythm.",
      ],
    },
  };

  function makeT(locale) {
    const dict = STRINGS[locale] || STRINGS.en;
    return function t(key, params) {
      let v = dict[key];
      if (v == null) v = STRINGS.en[key] != null ? STRINGS.en[key] : key;
      if (typeof v === "string" && params) {
        for (const k in params) {
          v = v.replace(new RegExp(`{{${k}}}`, "g"), params[k]);
        }
      }
      return v;
    };
  }

  /* =====================================================
   *  4. DATOS DE MONTAÑAS
   * ===================================================== */

  const MOUNTAINS = [
    {
      id: "granito",
      name: { es: "Aguja de Granito", en: "Granite Spire" },
      seed: 11,
      height: 12800,
      difficulty: { es: "Equilibrada", en: "Balanced" },
      sky: ["#8eb6e5", "#1d2a48"],
      paletteRock: "#495568",
      paletteRockDeep: "#2a3245",
      paletteAccent: "#c8d3e7",
      holdPalette: "base",
      faceBase: 220,
      faceAmp: 76,
      faceVeer: 0.34,
      slopeProfile: {
        baseSoftness: 0.16,
        lowerSlopePower: 1.0,
        wallIntensity: 1.0,
        summitSharpness: 1.0,
        roughness: 0.9,
      },
      tags: { es: ["equilibrada", "viento duro", "cuevas frecuentes"], en: ["balanced", "hard wind", "frequent caves"] },
      description: {
        es: "Pared larga y técnica. Primer tercio tranquilo, viento fuerte a media altura, lluvia sobre roca oscura y nieve final. Cuevas separadas para obligar a gestionar agua.",
        en: "A long technical face. The first third is calm, hard wind at mid-altitude, rain on dark rock and final snow. Caves are spread out to force water management.",
      },
      layers: [
        {
          from: 0,
          to: 2100,
          name: { es: "Campo bajo", en: "Lower field" },
          climate: "calm",
          drain: 1.0,
          wind: 0.0,
          fog: 0.0,
          rain: 0.0,
          snow: 0.0,
          color: "#526a45",
        },
        {
          from: 2100,
          to: 4200,
          name: { es: "Caliza clara", en: "Pale limestone" },
          climate: "calm",
          drain: 1.05,
          wind: 0.03,
          fog: 0.0,
          rain: 0.0,
          snow: 0.0,
          color: "#776f62",
        },
        {
          from: 4200,
          to: 6500,
          name: { es: "Arista con viento", en: "Wind ridge" },
          climate: "wind",
          drain: 1.32,
          wind: 0.22,
          fog: 0.05,
          rain: 0.0,
          snow: 0.0,
          color: "#5f6872",
        },
        {
          from: 6500,
          to: 8800,
          name: { es: "Pared negra", en: "Black wall" },
          climate: "rain",
          drain: 1.55,
          wind: 0.08,
          fog: 0.1,
          rain: 1.0,
          snow: 0.0,
          color: "#3f454d",
        },
        {
          from: 8800,
          to: 10800,
          name: { es: "Cornisa de niebla", en: "Fog cornice" },
          climate: "fog",
          drain: 1.28,
          wind: 0.05,
          fog: 0.78,
          rain: 0.0,
          snow: 0.0,
          color: "#606b75",
        },
        {
          from: 10800,
          to: 12800,
          name: { es: "Cumbre nevada", en: "Snowy summit" },
          climate: "snow",
          drain: 1.65,
          wind: 0.13,
          fog: 0.2,
          rain: 0.0,
          snow: 1.0,
          color: "#d8e2eb",
        },
      ],
      caves: [
        { y: 1450, name: { es: "Cueva del Pastor", en: "Shepherd Cave" }, food: 2, water: 24, wood: 2, note: { es: "La primera parada permite aprender el ritmo sin regalar demasiada energía.", en: "The first stop lets you learn the rhythm without giving away too much energy." } },
        { y: 3350, name: { es: "Refugio de Pizarra", en: "Slate Shelter" }, food: 2, water: 18, wood: 1, note: { es: "Justo antes del viento: conviene salir con estamina alta.", en: "Right before the wind — leave with high stamina." } },
        { y: 5600, name: { es: "Grieta del Vendaval", en: "Gale Crack" }, food: 3, water: 14, wood: 1, note: { es: "Cueva difícil de alcanzar con viento lateral. Premia el control fino.", en: "Hard to reach with lateral wind. Rewards fine control." } },
        { y: 7900, name: { es: "Sala de Lluvia", en: "Rain Hall" }, food: 3, water: 28, wood: 2, note: { es: "Tras una subida húmeda, recupera lo justo para atravesar la niebla.", en: "After a damp climb, gives just enough to cross the fog." } },
        { y: 10150, name: { es: "Vivac Blanco", en: "White Bivouac" }, food: 3, water: 12, wood: 1, note: { es: "Último refugio antes de la nieve final.", en: "Last refuge before the final snow." } },
      ],
    },
    {
      id: "volcan",
      name: { es: "Volcán Rojo", en: "Red Volcano" },
      seed: 37,
      height: 14200,
      difficulty: { es: "Salvaje", en: "Savage" },
      sky: ["#f0a378", "#2a1a25"],
      paletteRock: "#6f3d33",
      paletteRockDeep: "#361c1a",
      paletteAccent: "#ffb27a",
      holdPalette: "volcanic",
      faceBase: 240,
      faceAmp: 96,
      faceVeer: 0.42,
      slopeProfile: {
        baseSoftness: 0.20,
        lowerSlopePower: 0.85,
        wallIntensity: 0.9,
        summitSharpness: 0.85,
        roughness: 1.25,
      },
      tags: { es: ["muy largo", "roca inestable", "cuevas generosas"], en: ["very long", "unstable rock", "generous caves"] },
      description: {
        es: "Ascenso más ancho pero con roca inestable. Consume menos al principio, pero las zonas altas alternan niebla caliente, lluvia ácida y placas de nieve.",
        en: "Wider ascent with unstable rock. Easier early on, but high zones alternate hot fog, acid rain and snow plates.",
      },
      layers: [
        { from: 0, to: 2600, name: { es: "Ladera herbosa", en: "Grassy slope" }, climate: "calm", drain: 0.95, wind: 0.0, fog: 0.0, rain: 0.0, snow: 0.0, color: "#5b6b3d" },
        { from: 2600, to: 5200, name: { es: "Basalto rojo", en: "Red basalt" }, climate: "heat", drain: 1.18, wind: 0.03, fog: 0.08, rain: 0.0, snow: 0.0, color: "#764334" },
        { from: 5200, to: 7500, name: { es: "Chimeneas de vapor", en: "Steam vents" }, climate: "fog", drain: 1.35, wind: 0.04, fog: 0.66, rain: 0.0, snow: 0.0, color: "#57444a" },
        { from: 7500, to: 9800, name: { es: "Canal de tormenta", en: "Storm canyon" }, climate: "rain", drain: 1.58, wind: 0.1, fog: 0.18, rain: 1.0, snow: 0.0, color: "#3e3638" },
        { from: 9800, to: 11900, name: { es: "Arista expuesta", en: "Exposed ridge" }, climate: "wind", drain: 1.46, wind: 0.26, fog: 0.08, rain: 0.0, snow: 0.0, color: "#675c58" },
        { from: 11900, to: 14200, name: { es: "Cráter nevado", en: "Snow crater" }, climate: "snow", drain: 1.7, wind: 0.11, fog: 0.22, rain: 0.0, snow: 1.0, color: "#e1e5e9" },
      ],
      caves: [
        { y: 1700, name: { es: "Abrigo del Roble", en: "Oak Shelter" }, food: 2, water: 20, wood: 2, note: { es: "Pequeña ayuda inicial, antes de que la pendiente se vuelva seria.", en: "Small early help before the slope gets serious." } },
        { y: 4100, name: { es: "Tubo de Lava", en: "Lava Tube" }, food: 3, water: 18, wood: 1, note: { es: "Cueva profunda con provisiones atrapadas entre columnas de basalto.", en: "Deep cave with supplies trapped between basalt columns." } },
        { y: 6900, name: { es: "Cámara de Vapor", en: "Steam Chamber" }, food: 2, water: 30, wood: 0, note: { es: "La niebla hace difícil encontrarla, pero salva la zona de tormenta.", en: "Hard to find in fog, but saves the storm zone." } },
        { y: 9150, name: { es: "Galería Roja", en: "Red Gallery" }, food: 3, water: 18, wood: 1, note: { es: "Colocada tras la lluvia para que la estamina llegue muy justa.", en: "Placed after the rain so stamina arrives tight." } },
        { y: 11400, name: { es: "Refugio del Cráter", en: "Crater Shelter" }, food: 2, water: 22, wood: 2, note: { es: "Último punto seguro antes del frío.", en: "Last safe point before the cold." } },
        { y: 13250, name: { es: "Cornisa de Hielo", en: "Ice Cornice" }, food: 2, water: 8, wood: 1, note: { es: "Pequeño premio final: no lo malgastes.", en: "Small final reward — don't waste it." } },
      ],
    },
    {
      id: "hielo",
      name: { es: "Colmillo Blanco", en: "White Fang" },
      seed: 71,
      height: 13600,
      difficulty: { es: "Difícil", en: "Hard" },
      sky: ["#cfe7ff", "#101929"],
      paletteRock: "#4f6478",
      paletteRockDeep: "#1f2c3d",
      paletteAccent: "#b5d6f0",
      holdPalette: "ice",
      faceBase: 210,
      faceAmp: 84,
      faceVeer: 0.28,
      slopeProfile: {
        baseSoftness: 0.12,
        lowerSlopePower: 1.1,
        wallIntensity: 1.15,
        summitSharpness: 1.2,
        roughness: 0.85,
      },
      tags: { es: ["difícil", "pocas cuevas", "frío constante"], en: ["hard", "few caves", "constant cold"] },
      description: {
        es: "El prototipo más severo. Menos cuevas, mucha nieve, niebla peligrosa y viento alto. Cada descanso importa.",
        en: "The harshest prototype. Fewer caves, lots of snow, dangerous fog and high wind. Every rest matters.",
      },
      layers: [
        { from: 0, to: 1800, name: { es: "Campo helado", en: "Frozen field" }, climate: "calm", drain: 1.06, wind: 0.02, fog: 0.04, rain: 0.0, snow: 0.1, color: "#53685f" },
        { from: 1800, to: 4300, name: { es: "Roca azul", en: "Blue rock" }, climate: "wind", drain: 1.18, wind: 0.1, fog: 0.05, rain: 0.0, snow: 0.0, color: "#445969" },
        { from: 4300, to: 6600, name: { es: "Muro de lluvia", en: "Rain wall" }, climate: "rain", drain: 1.55, wind: 0.11, fog: 0.18, rain: 1.0, snow: 0.0, color: "#354655" },
        { from: 6600, to: 9000, name: { es: "Laberinto blanco", en: "White maze" }, climate: "fog", drain: 1.42, wind: 0.08, fog: 0.84, rain: 0.0, snow: 0.25, color: "#aeb9c1" },
        { from: 9000, to: 11250, name: { es: "Espolón ventoso", en: "Wind spur" }, climate: "wind", drain: 1.62, wind: 0.32, fog: 0.2, rain: 0.0, snow: 0.35, color: "#ccd5dc" },
        { from: 11250, to: 13600, name: { es: "Cumbre nevada", en: "Snow summit" }, climate: "snow", drain: 1.78, wind: 0.18, fog: 0.3, rain: 0.0, snow: 1.0, color: "#edf3f7" },
      ],
      caves: [
        { y: 1250, name: { es: "Cabaña del Valle", en: "Valley Cabin" }, food: 2, water: 16, wood: 2, note: { es: "No parece mucho, pero evita empezar la ruta en déficit.", en: "Modest but keeps you out of an early deficit." } },
        { y: 3600, name: { es: "Fisura Azul", en: "Blue Fissure" }, food: 2, water: 20, wood: 1, note: { es: "La entrada está en una pared inclinada: cuidado con separarte.", en: "Entrance on a tilted wall — careful not to drift." } },
        { y: 6250, name: { es: "Cueva de la Cascada", en: "Waterfall Cave" }, food: 3, water: 24, wood: 0, note: { es: "Punto crítico tras la lluvia helada.", en: "Critical point after the freezing rain." } },
        { y: 8700, name: { es: "Burbuja de Niebla", en: "Fog Bubble" }, food: 2, water: 14, wood: 1, note: { es: "Difícil de ver. La señal aparece cuando estás cerca.", en: "Hard to see — beacon shows when you're close." } },
        { y: 11100, name: { es: "Iglú de Roca", en: "Rock Igloo" }, food: 3, water: 12, wood: 2, note: { es: "Última recuperación real antes de la cumbre.", en: "Last real recovery before the summit." } },
      ],
    },
    {
      id: "dunas",
      name: { es: "Crestas de Arena", en: "Sand Crests" },
      seed: 89,
      height: 11400,
      difficulty: { es: "Equilibrada", en: "Balanced" },
      sky: ["#ffd58a", "#4a2a1a"],
      paletteRock: "#8a6a4a",
      paletteRockDeep: "#3a2a1a",
      paletteAccent: "#ffe1a3",
      holdPalette: "dunes",
      faceBase: 230,
      faceAmp: 102,
      faceVeer: 0.5,
      slopeProfile: {
        baseSoftness: 0.22,
        lowerSlopePower: 0.8,
        wallIntensity: 0.85,
        summitSharpness: 0.75,
        roughness: 1.35,
      },
      tags: { es: ["calor seco", "muros amplios", "anclajes frecuentes"], en: ["dry heat", "wide walls", "frequent anchors"] },
      description: {
        es: "Acantilado de arenisca expuesto al sol. La pared es generosa en presas pero el calor agota antes de tiempo. Pocas cuevas, muchas grietas.",
        en: "Sun-baked sandstone cliff. The wall is generous in holds but the heat wears you out fast. Few caves, many cracks.",
      },
      layers: [
        { from: 0, to: 1900, name: { es: "Arena tibia", en: "Warm sand" }, climate: "heat", drain: 1.1, wind: 0.04, fog: 0.0, rain: 0.0, snow: 0.0, color: "#b48a52" },
        { from: 1900, to: 4200, name: { es: "Pared de adobe", en: "Adobe wall" }, climate: "heat", drain: 1.22, wind: 0.06, fog: 0.0, rain: 0.0, snow: 0.0, color: "#8c6738" },
        { from: 4200, to: 6700, name: { es: "Cresta del simún", en: "Simoom crest" }, climate: "wind", drain: 1.38, wind: 0.28, fog: 0.12, rain: 0.0, snow: 0.0, color: "#705638" },
        { from: 6700, to: 9000, name: { es: "Cornisa de polvo", en: "Dust cornice" }, climate: "fog", drain: 1.32, wind: 0.16, fog: 0.62, rain: 0.0, snow: 0.0, color: "#90785a" },
        { from: 9000, to: 11400, name: { es: "Cima de azafrán", en: "Saffron summit" }, climate: "calm", drain: 1.18, wind: 0.06, fog: 0.04, rain: 0.0, snow: 0.0, color: "#d4a86a" },
      ],
      caves: [
        { y: 1500, name: { es: "Sombra del Caravanero", en: "Caravan Shade" }, food: 2, water: 26, wood: 1, note: { es: "El primer respiro a la sombra: agua abundante para el calor.", en: "First shaded breath — generous water for the heat." } },
        { y: 3700, name: { es: "Pozo de los Higos", en: "Fig Well" }, food: 3, water: 30, wood: 1, note: { es: "Pozo natural medio enterrado. Sirve para todo el tramo siguiente.", en: "A buried natural well. Carries you through the next section." } },
        { y: 6100, name: { es: "Grieta de Bronce", en: "Bronze Crack" }, food: 2, water: 16, wood: 1, note: { es: "Cueva pequeña en plena cresta de viento.", en: "Small cave right on the wind crest." } },
        { y: 8400, name: { es: "Sala del Mosaico", en: "Mosaic Hall" }, food: 3, water: 20, wood: 2, note: { es: "Cueva amplia con frescos antiguos.", en: "Wide cave with ancient frescoes." } },
        { y: 10500, name: { es: "Mirador del Ocaso", en: "Sunset Lookout" }, food: 2, water: 14, wood: 1, note: { es: "Cueva alta con vistas al desierto.", en: "High cave overlooking the desert." } },
      ],
    },
    {
      id: "jade",
      name: { es: "Pico de Jade", en: "Jade Peak" },
      seed: 113,
      height: 13200,
      difficulty: { es: "Extrema", en: "Extreme" },
      sky: ["#a5e6c8", "#14302a"],
      paletteRock: "#2f5a48",
      paletteRockDeep: "#102820",
      paletteAccent: "#c9f6dc",
      holdPalette: "jade",
      faceBase: 200,
      faceAmp: 88,
      faceVeer: 0.22,
      slopeProfile: {
        baseSoftness: 0.10,
        lowerSlopePower: 1.2,
        wallIntensity: 1.3,
        summitSharpness: 1.25,
        roughness: 1.1,
      },
      tags: { es: ["extrema", "lluvia constante", "rutas estrechas"], en: ["extreme", "constant rain", "narrow routes"] },
      description: {
        es: "Pared selvática verticalísima sobre la jungla. Lluvia constante, niebla densa y muy poco apoyo. La cumbre se gana sufriendo.",
        en: "Near-vertical jungle face. Constant rain, dense fog and very little purchase. The summit is earned through suffering.",
      },
      layers: [
        { from: 0, to: 1500, name: { es: "Selva baja", en: "Lower jungle" }, climate: "calm", drain: 1.05, wind: 0.02, fog: 0.08, rain: 0.4, snow: 0.0, color: "#3a5a3c" },
        { from: 1500, to: 3800, name: { es: "Pared esmeralda", en: "Emerald wall" }, climate: "rain", drain: 1.4, wind: 0.05, fog: 0.18, rain: 1.0, snow: 0.0, color: "#2f4a3a" },
        { from: 3800, to: 6300, name: { es: "Cornisa de musgo", en: "Moss cornice" }, climate: "fog", drain: 1.45, wind: 0.07, fog: 0.74, rain: 0.5, snow: 0.0, color: "#3e604d" },
        { from: 6300, to: 8800, name: { es: "Bóveda de jade", en: "Jade vault" }, climate: "rain", drain: 1.52, wind: 0.12, fog: 0.34, rain: 1.0, snow: 0.0, color: "#1f3d31" },
        { from: 8800, to: 11000, name: { es: "Filo aéreo", en: "Sky edge" }, climate: "wind", drain: 1.62, wind: 0.34, fog: 0.18, rain: 0.4, snow: 0.18, color: "#3e5648" },
        { from: 11000, to: 13200, name: { es: "Cumbre esmeralda", en: "Emerald summit" }, climate: "snow", drain: 1.74, wind: 0.16, fog: 0.32, rain: 0.0, snow: 1.0, color: "#d6f0e0" },
      ],
      caves: [
        { y: 1100, name: { es: "Boca de Lianas", en: "Liana Mouth" }, food: 2, water: 22, wood: 2, note: { es: "Entrada cubierta por lianas: salva el primer tramo lluvioso.", en: "Liana-covered entrance — saves the first wet section." } },
        { y: 3300, name: { es: "Cámara del Quetzal", en: "Quetzal Chamber" }, food: 3, water: 26, wood: 1, note: { es: "Pequeñas plumas verdes brillan en la pared.", en: "Tiny green feathers glint on the wall." } },
        { y: 5800, name: { es: "Galería Esmeralda", en: "Emerald Gallery" }, food: 3, water: 18, wood: 1, note: { es: "Vetas de jade reflejan la luz; descanso obligado.", en: "Jade veins reflect the light — a mandatory rest." } },
        { y: 8200, name: { es: "Sala del Eco", en: "Echo Hall" }, food: 2, water: 16, wood: 0, note: { es: "Cueva alta, profunda, con corrientes frías.", en: "High deep cave with cold drafts." } },
        { y: 10650, name: { es: "Mirador del Cielo", en: "Sky Lookout" }, food: 3, water: 14, wood: 1, note: { es: "Última oportunidad antes del filo.", en: "Last chance before the edge." } },
      ],
    },
  ];

  function findMountainById(id) {
    return MOUNTAINS.find((m) => m.id === id) || MOUNTAINS[0];
  }

  function holdPaletteFor(mountain) {
    if (mountain.holdPalette === "volcanic") return HOLD_PALETTE_VOLCANIC;
    if (mountain.holdPalette === "ice") return HOLD_PALETTE_ICE;
    if (mountain.holdPalette === "dunes") return HOLD_PALETTE_DUNES;
    if (mountain.holdPalette === "jade") return HOLD_PALETTE_JADE;
    return HOLD_PALETTE_BASE;
  }

  /* =====================================================
   *  5. AUDIO MANAGER
   * ===================================================== */

  function GameAudio() {
    let ctx = null;
    let master = null;
    let muted = false;

    try {
      muted = localStorage.getItem(AUDIO_MUTED_KEY) === "1";
    } catch (e) {
      muted = false;
    }

    function ensure() {
      if (ctx) return ctx;
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = AUDIO_DEFAULT_GAIN;
      master.connect(ctx.destination);
      return ctx;
    }

    function setMuted(value) {
      muted = !!value;
      try {
        localStorage.setItem(AUDIO_MUTED_KEY, muted ? "1" : "0");
      } catch (e) {
        // ignore
      }
      if (master) master.gain.value = muted ? 0 : AUDIO_DEFAULT_GAIN;
    }

    function isMuted() {
      return muted;
    }

    function toggle() {
      setMuted(!muted);
    }

    function playTone(frequency, duration, type, gain) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const osc = c.createOscillator();
      const env = c.createGain();
      osc.type = type || "sine";
      osc.frequency.value = frequency;
      env.gain.value = 0;
      env.gain.setValueAtTime(0, c.currentTime);
      const peak = (gain == null ? 0.6 : gain) * 0.42;
      env.gain.linearRampToValueAtTime(peak, c.currentTime + 0.018);
      env.gain.exponentialRampToValueAtTime(
        0.0001,
        c.currentTime + Math.max(0.05, duration)
      );
      osc.connect(env);
      env.connect(master);
      osc.start();
      osc.stop(c.currentTime + Math.max(0.06, duration + 0.05));
    }

    function playNoise(duration, gain) {
      if (muted) return;
      const c = ensure();
      if (!c) return;
      const buf = c.createBuffer(1, c.sampleRate * duration, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = c.createBufferSource();
      src.buffer = buf;
      const env = c.createGain();
      env.gain.value = (gain == null ? 0.5 : gain) * 0.32;
      env.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1400;
      src.connect(filter);
      filter.connect(env);
      env.connect(master);
      src.start();
      src.stop(c.currentTime + duration + 0.05);
    }

    function chord(frequencies, duration, type, gain) {
      frequencies.forEach((f, i) =>
        setTimeout(
          () => playTone(f, duration, type, gain),
          i * 18
        )
      );
    }

    return {
      ensure,
      isMuted,
      setMuted,
      toggle,
      anchor() {
        playTone(420, 0.12, "square", 0.42);
        setTimeout(() => playTone(280, 0.18, "triangle", 0.36), 60);
      },
      autoAnchor() {
        playTone(360, 0.1, "triangle", 0.32);
      },
      step() {
        playTone(220 + Math.random() * 60, 0.06, "triangle", 0.16);
      },
      stepCold() {
        playTone(180 + Math.random() * 30, 0.08, "sawtooth", 0.18);
      },
      drink() {
        playTone(640, 0.18, "sine", 0.42);
        setTimeout(() => playTone(480, 0.22, "sine", 0.32), 80);
      },
      eat() {
        playTone(540, 0.12, "sine", 0.36);
        setTimeout(() => playTone(680, 0.14, "sine", 0.32), 80);
        setTimeout(() => playTone(820, 0.16, "sine", 0.3), 160);
      },
      ropeCatch() {
        playTone(180, 0.16, "sawtooth", 0.6);
        playNoise(0.2, 0.5);
      },
      fall() {
        for (let i = 0; i < 6; i++) {
          setTimeout(
            () => playTone(220 - i * 24, 0.16, "sawtooth", 0.42),
            i * 80
          );
        }
      },
      gameOver() {
        chord([220, 174, 130, 110], 0.6, "triangle", 0.38);
      },
      summit() {
        chord([523, 659, 784, 988], 0.45, "triangle", 0.5);
        setTimeout(() => chord([784, 988, 1175], 0.55, "sine", 0.42), 280);
      },
      enterCave() {
        playTone(280, 0.4, "triangle", 0.32);
        setTimeout(() => playTone(220, 0.5, "sine", 0.28), 120);
      },
      leaveCave() {
        playTone(360, 0.18, "sine", 0.32);
        setTimeout(() => playTone(540, 0.18, "sine", 0.28), 80);
      },
      menuTick() {
        playTone(560, 0.05, "square", 0.18);
      },
      menuConfirm() {
        playTone(640, 0.08, "sine", 0.32);
        setTimeout(() => playTone(820, 0.1, "sine", 0.3), 60);
      },
      windGust() {
        playNoise(0.8, 0.25);
      },
      thunder() {
        playNoise(0.5, 0.42);
        setTimeout(() => playTone(80, 0.4, "sawtooth", 0.5), 80);
      },
      record() {
        chord([523, 659, 784, 1046], 0.32, "sine", 0.5);
      },
    };
  }

  /* =====================================================
   *  6. PERSISTENCIA
   * ===================================================== */

  const DEFAULT_PROGRESS = {
    version: VERSION,
    locale: DEFAULT_LOCALE,
    lastMountain: MOUNTAINS[0].id,
    bestAltitudeByMountain: {},
    runsByMountain: {},
    cavesVisitedByMountain: {},
    bestTimeByMountain: {},
    summits: [],
    totalRuns: 0,
    totalSummits: 0,
  };

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return cloneProgress(DEFAULT_PROGRESS);
      const parsed = JSON.parse(raw);
      const merged = Object.assign({}, cloneProgress(DEFAULT_PROGRESS), parsed);
      merged.bestAltitudeByMountain =
        merged.bestAltitudeByMountain || {};
      merged.runsByMountain = merged.runsByMountain || {};
      merged.cavesVisitedByMountain = merged.cavesVisitedByMountain || {};
      merged.bestTimeByMountain = merged.bestTimeByMountain || {};
      merged.summits = merged.summits || [];
      return merged;
    } catch (e) {
      return cloneProgress(DEFAULT_PROGRESS);
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      // ignore
    }
  }

  function cloneProgress(progress) {
    return JSON.parse(JSON.stringify(progress));
  }

  function resetProgress() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  /* =====================================================
   *  7. GENERACIÓN DE MUNDO Y RUTA
   * ===================================================== */

  function generateRun(mountainId, locale) {
    const template = findMountainById(mountainId);
    const rng = makeRng(template.seed * 31);

    const mountain = JSON.parse(JSON.stringify(template));

    // Holds (presas): puntos a lo largo de la pared con leve variación.
    // Se anclan a la cara real (sampleFaceX) para que aparezcan justo sobre
    // la roca tanto en la base ancha como en el pico estrecho.
    const holds = [];
    const holdPalette = holdPaletteFor(mountain);
    const holdSpacing = 56;
    for (let y = 80; y < mountain.height; y += holdSpacing) {
      const layer = mountain.layers.find((l) => y >= l.from && y <= l.to) ||
        mountain.layers[0];
      const faceXAt = sampleFaceX(y, mountain);
      const offsetX = rngRange(rng, -8, 32);
      const offsetY = rngRange(rng, -12, 12);
      const radius = rngRange(rng, 8, 13);
      const color = holdPalette[Math.floor(rng() * holdPalette.length)];
      const climate = layer.climate;
      holds.push({
        x: faceXAt + offsetX,
        y: y + offsetY,
        radius,
        color,
        climate,
        type: rng() < 0.18 ? "ledge" : rng() < 0.5 ? "jug" : "crimp",
      });
    }

    // Ledges (cornisas) con orientación
    const ledges = [];
    for (let y = 280; y < mountain.height; y += rngRange(rng, 240, 460)) {
      const xCenter = sampleFaceX(y, mountain) + 12;
      const length = rngRange(rng, 38, 90);
      const tilt = rngRange(rng, -0.18, 0.18);
      ledges.push({
        x: xCenter,
        y,
        length,
        tilt,
      });
    }

    // Marcadores de cuevas y entradas (cada cueva del template)
    const caves = mountain.caves.map((cave) => {
      const cy = cave.y;
      const xMouth = sampleFaceX(cy, mountain) + 36;
      return Object.assign({}, cave, {
        mouthX: xMouth,
        mouthY: cy,
        taken: false,
        triggered: false,
        nameLocalized: cave.name[locale] || cave.name.es,
        noteLocalized: (cave.note && (cave.note[locale] || cave.note.es)) || "",
      });
    });

    // Vegetación y detalles (decorativos)
    const flora = [];
    for (let i = 0; i < 80; i++) {
      const y = rngRange(rng, 60, mountain.height - 60);
      const layer = mountain.layers.find((l) => y >= l.from && y <= l.to) ||
        mountain.layers[0];
      flora.push({
        x: rngRange(rng, 80, 540),
        y,
        size: rngRange(rng, 6, 22),
        kind: layer.climate,
        sway: rngRange(rng, 0, Math.PI * 2),
      });
    }

    // Marcadores de banda en la barra de altitud (lateral)
    const altitudeBands = mountain.layers.map((layer) => ({
      from: layer.from,
      to: layer.to,
      climate: layer.climate,
      label: layer.name[locale] || layer.name.es,
    }));

    return {
      mountain,
      holds,
      ledges,
      caves,
      flora,
      altitudeBands,
      stats: {
        anchorsPlaced: 0,
        manualAnchors: 0,
        falls: 0,
        ropeCatches: 0,
        cavesVisited: 0,
      },
    };
  }

  /* =====================================================
   *  8. ESTADO PRINCIPAL
   * ===================================================== */

  const STATES = {
    BOOT: "boot",
    MENU: "menu",
    TUTORIAL: "tutorial",
    READY: "ready",
    PLAYING: "playing",
    PAUSED: "paused",
    CAVE: "cave",
    DEAD: "dead",
    WON: "won",
  };

  const state = {
    locale: DEFAULT_LOCALE,
    state: STATES.BOOT,
    progress: loadProgress(),
    audio: GameAudio(),
    selectedMountainId: MOUNTAINS[0].id,
    run: null,
    canvas: null,
    ctx: null,
    dpr: 1,
    width: 0,
    height: 0,
    cameraX: 0,
    cameraY: 0,
    cameraTargetX: 0,
    cameraTargetY: 0,
    elapsed: 0,
    runTime: 0,
    accumulator: 0,
    lastTimestamp: 0,
    keys: new Set(),
    pointer: { active: false, x: 0, y: 0, dragX: 0, dragY: 0 },
    touchActive: false,
    weather: {
      snowflakes: [],
      raindrops: [],
      windStreaks: [],
      fogPatches: [],
      sparks: [],
    },
    parallax: {
      cloudsFar: [],
      cloudsNear: [],
      stars: [],
      birds: [],
    },
    climber: createClimber(),
    anchor: { y: -Infinity, placed: false, manual: false, x: 0 },
    anchorThrow: {
      active: false,
      elapsed: 0,
      duration: ANCHOR_THROW_DURATION,
      fromX: 0,
      fromY: 0,
      targetX: 0,
      targetY: 0,
      arcHeight: ANCHOR_THROW_ARC_MIN,
    },
    safeGrace: 0,
    rest: { active: false, secondsLeft: 0, total: 0 },
    cave: { active: null, sessionStart: 0 },
    intro: { active: false, phase: "door", timer: 0, hutX: HUT_X, groundY: 0, faceArrivalX: 0 },
    summitWalk: { active: false, flagX: 0, plateauY: 0, plateauLeftX: 0, plateauRightX: 0, completed: false, cheerTimer: 0 },
    fallTime: 0,
    diedAt: null,
    summitAt: null,
    summarySnapshot: null,
    messageTimer: 0,
    toastTimer: 0,
    anchorLimitHintTimer: 0,
    beacon: { title: "", copy: "", arrow: "↑", active: false },
    flashRecord: false,
  };

  let t = makeT(state.locale);

  function createClimber() {
    return {
      x: 220,
      y: 40,
      vx: 0,
      vy: 0,
      facing: 1,
      armSwing: 0,
      legSwing: 0,
      bodyTilt: 0,
      grounded: false,
      falling: false,
      stamina: STAMINA_MAX,
      water: WATER_MAX,
      grip: GRIP_MAX,
      food: FOOD_DEFAULT,
      armReachL: 0,
      armReachR: 0,
      shake: 0,
      anchorSwingTimer: 0,
      walkPhase: 0,
      rope: { active: true, segments: [] },
    };
  }

  function createAnchorThrowState() {
    return {
      active: false,
      elapsed: 0,
      duration: ANCHOR_THROW_DURATION,
      fromX: 0,
      fromY: 0,
      targetX: 0,
      targetY: 0,
      arcHeight: ANCHOR_THROW_ARC_MIN,
    };
  }

  /* =====================================================
   *  9. INICIALIZACIÓN
   * ===================================================== */

  function boot() {
    state.canvas = document.getElementById("summitCanvas");
    if (!state.canvas) return;
    state.ctx = state.canvas.getContext("2d");

    setupParallax();
    bindUI();
    bindInput();
    resize();

    setLocale(state.progress.locale || DEFAULT_LOCALE);
    setSelectedMountain(state.progress.lastMountain || MOUNTAINS[0].id);

    state.lastTimestamp = performance.now();
    state.state = STATES.MENU;
    requestAnimationFrame(loop);
    window.render_game_to_text = renderGameToText;
    window.advanceTime = advanceTime;
    window.__summitAscentApi = {
      startSelectedMountain,
      restartRun,
      quitToMenu,
      togglePause,
      resumeRun,
      tryPlaceManualAnchor,
      tryDrinkInline,
      tryEnterNearbyCave,
      renderGameToText,
      advanceTime,
    };
  }

  function setupParallax() {
    const rng = makeRng(0x537468);
    state.parallax.cloudsFar = [];
    for (let i = 0; i < 24; i++) {
      state.parallax.cloudsFar.push({
        x: rngRange(rng, -200, 1800),
        y: rngRange(rng, -2000, 200),
        size: rngRange(rng, 30, 80),
        speed: rngRange(rng, 0.05, 0.18),
        opacity: rngRange(rng, 0.32, 0.62),
      });
    }
    state.parallax.cloudsNear = [];
    for (let i = 0; i < 14; i++) {
      state.parallax.cloudsNear.push({
        x: rngRange(rng, -200, 1800),
        y: rngRange(rng, -1400, 200),
        size: rngRange(rng, 60, 140),
        speed: rngRange(rng, 0.1, 0.28),
        opacity: rngRange(rng, 0.28, 0.55),
      });
    }
    state.parallax.stars = [];
    for (let i = 0; i < 90; i++) {
      state.parallax.stars.push({
        x: rngRange(rng, 0, 1600),
        y: rngRange(rng, -3000, 200),
        size: rngRange(rng, 0.6, 2.2),
        twinkle: rngRange(rng, 0, Math.PI * 2),
      });
    }
    state.parallax.birds = [];
    for (let i = 0; i < 6; i++) {
      state.parallax.birds.push({
        x: rngRange(rng, -200, 1600),
        y: rngRange(rng, -1200, 200),
        speed: rngRange(rng, 16, 32),
        flap: rngRange(rng, 0, Math.PI * 2),
        scale: rngRange(rng, 0.6, 1.4),
      });
    }
  }

  function setLocale(locale) {
    if (!STRINGS[locale]) locale = "en";
    state.locale = locale;
    t = makeT(locale);
    state.progress.locale = locale;
    saveProgress(state.progress);

    document.querySelectorAll(".summit-locale-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.locale === locale);
    });

    syncStaticTexts();
    renderMountainGrid();
    renderMountainDetail();
  }

  function setSelectedMountain(id) {
    const mountain = findMountainById(id);
    state.selectedMountainId = mountain.id;
    state.progress.lastMountain = mountain.id;
    saveProgress(state.progress);

    document.querySelectorAll(".summit-mountain-card").forEach((card) => {
      card.classList.toggle(
        "is-selected",
        card.dataset.mountain === mountain.id
      );
    });

    document
      .getElementById("summitShell")
      .setAttribute("data-mountain", mountain.id);

    renderMountainDetail();
  }

  function syncStaticTexts() {
    setText("hudWorldLabel", findMountainById(state.selectedMountainId).name[state.locale]);
    setText("hudTitle", t("gameTitle"));
    setText("hudObjective", t("hudObjective"));

    setText("menuEyebrow", t("menuEyebrow"));
    setText("menuTitle", t("gameTitle"));
    setText("menuLead", t("menuLead"));

    setText("startBtn", t("btnStart"));
    setText("randomBtn", t("btnRandom"));
    setText("tutorialBtn", t("btnTutorial"));
    setText("resetProgressBtn", t("btnReset"));

    setText("tutorialEyebrow", t("tutorialEyebrow"));
    setText("tutorialTitle", t("tutorialTitle"));
    setText("tutorialControlsTitle", t("tutorialControlsTitle"));
    setText("tutorialResourcesTitle", t("tutorialResourcesTitle"));
    setText("tutorialPerspectiveTitle", t("tutorialPerspectiveTitle"));
    setText("tutorialPerspectiveCopy", t("tutorialPerspectiveCopy"));
    setText("tutorialClimateTitle", t("tutorialClimateTitle"));
    setText("tutorialBackBtn", t("btnTutorialBack"));

    setText("pauseEyebrow", t("pauseEyebrow"));
    setText("pauseTitle", t("pauseTitle"));
    setText("pauseLead", t("pauseLead"));
    setText("resumeBtn", t("btnResume"));
    setText("restartFromPauseBtn", t("btnRestart"));
    setText("quitFromPauseBtn", t("btnQuit"));

    setText("caveEyebrow", t("caveEyebrow"));
    setText("caveTitle", t("caveTitle"));
    setText("caveLead", t("caveLead"));
    setText("caveLootCopy", t("caveLootCopy"));
    setText("caveResourceFoodLabel", t("caveResourceFood"));
    setText("caveResourceWaterLabel", t("caveResourceWater"));
    setText("caveResourceWoodLabel", t("caveResourceWood"));
    setText("caveActionsLabel", t("caveActionsLabel"));
    setText("caveStateLabel", t("caveStateLabel"));
    setText("caveDrinkBtn", t("caveDrinkBtn"));
    setText("caveEatBtn", t("caveEatBtn"));
    setText("caveCollectFoodBtn", t("caveCollectFoodBtn"));
    setText("caveRestBtn", t("caveRestBtn"));
    setText("caveLeaveBtn", t("caveLeaveBtn"));

    setText("staminaLabel", t("vitalStamina"));
    setText("waterLabel", t("vitalWater"));
    setText("gripLabel", t("vitalGrip"));
    setText("ascentLabel", t("vitalAscent"));
    setText("altitudeLabel", t("statAltitude"));
    setText("weatherLabel", t("statWeather"));
    setText("zoneLabel", t("statZone"));
    setText("foodLabel", t("statFood"));
    setText("caveStatusLabel", t("statCave"));
    setText("anchorLabel", t("statAnchor"));
    setText("timeLabel", t("statTime"));
    setText("bestLabel", t("statBest"));
    setText("summitTopLabel", t("summitTopLabel"));
    setText("summitBaseLabel", t("summitBaseLabel"));

    setText("detailLayersLabel", t("detailLayers"));
    setText("detailCavesLabel", t("detailCaves"));
    setText("detailHeightLabel", t("detailHeight"));
    setText("detailDifficultyLabel", t("detailDifficulty"));
    setText("detailRecordLabel", t("detailRecord"));
    setText("detailRunsLabel", t("detailRuns"));

    setText("endingRestartBtn", t("btnRetry"));
    setText("endingChangeBtn", t("btnChange"));
    setText("endingShareBtn", t("btnShare"));

    const tutorialList = document.getElementById("tutorialClimateList");
    if (tutorialList) {
      tutorialList.innerHTML = "";
      const climateMap = [
        ["calm", t("tutorialClimateCalm")],
        ["wind", t("tutorialClimateWind")],
        ["fog", t("tutorialClimateFog")],
        ["rain", t("tutorialClimateRain")],
        ["snow", t("tutorialClimateSnow")],
      ];
      for (const [climate, label] of climateMap) {
        const li = document.createElement("li");
        li.innerHTML =
          `<span class="summit-climate-dot" data-climate="${climate}"></span>` +
          escapeHtml(label);
        tutorialList.appendChild(li);
      }
    }
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* =====================================================
   *  10. RESIZE / DPR
   * ===================================================== */

  function resize() {
    if (!state.canvas) return;
    const rect = state.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.dpr = dpr;
    state.width = w;
    state.height = h;
    state.canvas.width = Math.floor(w * dpr);
    state.canvas.height = Math.floor(h * dpr);
    state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* =====================================================
   *  11. INPUT
   * ===================================================== */

  function bindInput() {
    window.addEventListener("resize", resize);
    window.addEventListener("resize", syncEmbeddedTouchMode);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);

    state.canvas.addEventListener("pointerdown", onPointerDown);
    state.canvas.addEventListener("pointermove", onPointerMove);
    state.canvas.addEventListener("pointerup", onPointerUp);
    state.canvas.addEventListener("pointercancel", onPointerUp);

    document.querySelectorAll(".summit-touch-btn").forEach((btn) => {
      const action = btn.dataset.touch;
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        triggerTouchAction(action, true);
        state.touchActive = true;
        document
          .getElementById("summitShell")
          .setAttribute("data-touch", "true");
      });
      btn.addEventListener("pointerup", (e) => {
        e.preventDefault();
        triggerTouchAction(action, false);
      });
      btn.addEventListener("pointercancel", () => {
        triggerTouchAction(action, false);
      });
    });

    syncEmbeddedTouchMode();
    if (window.MutationObserver) {
      const observer = new MutationObserver(syncEmbeddedTouchMode);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      if (document.body) {
        observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
      }
    }
  }

  function syncEmbeddedTouchMode() {
    const embedded =
      document.documentElement.classList.contains("mobile-shell-embed") ||
      (document.body && document.body.classList.contains("mobile-shell-embed"));
    const coarse =
      window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (!embedded && !coarse && !state.touchActive) return;
    state.touchActive = true;
    const shell = document.getElementById("summitShell");
    if (shell) shell.setAttribute("data-touch", "true");
  }

  function triggerTouchAction(action, down) {
    const map = {
      up: "arrowup",
      down: "arrowdown",
      left: "arrowleft",
      right: "arrowright",
      anchor: " ",
      water: "q",
      cave: "e",
      food: "f",
    };
    const key = map[action];
    if (!key) return;
    if (down) {
      state.keys.add(key);
      if (key === " " || key === "q" || key === "e") {
        handleSingleKey(key, { repeat: false, shiftKey: false });
      }
    } else {
      state.keys.delete(key);
    }
  }

  function onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (state.state === STATES.PLAYING) {
      if (
        k === "arrowup" ||
        k === "arrowdown" ||
        k === "arrowleft" ||
        k === "arrowright" ||
        k === " " ||
        k === "w" ||
        k === "a" ||
        k === "s" ||
        k === "d" ||
        k === "q" ||
        k === "e" ||
        k === "f"
      ) {
        e.preventDefault();
      }
    }
    state.keys.add(k);
    if (!e.repeat) {
      handleSingleKey(k, e);
    }
  }

  function onKeyUp(e) {
    const k = e.key.toLowerCase();
    state.keys.delete(k);
  }

  function handleSingleKey(k, ev) {
    switch (k) {
      case "p":
        if (state.state === STATES.PLAYING) togglePause();
        else if (state.state === STATES.PAUSED) resumeRun();
        break;
      case "r":
        if (state.state === STATES.PLAYING) {
          restartRun();
        } else if (state.state === STATES.DEAD || state.state === STATES.WON) {
          restartRun();
        }
        break;
      case "escape":
        if (state.state === STATES.PLAYING) togglePause();
        else if (state.state === STATES.PAUSED) quitToMenu();
        else if (state.state === STATES.CAVE) leaveCave();
        else if (
          state.state === STATES.DEAD ||
          state.state === STATES.WON
        ) {
          quitToMenu();
        }
        break;
      case "f":
        if (
          state.state === STATES.PLAYING &&
          ev &&
          ev.shiftKey
        ) {
          toggleFullscreen();
        }
        break;
      case "m":
        toggleMute();
        break;
      case " ":
        if (state.state === STATES.PLAYING) {
          tryPlaceManualAnchor();
        }
        break;
      case "q":
        if (state.state === STATES.PLAYING) {
          tryDrinkInline();
        }
        break;
      case "e":
        if (state.state === STATES.PLAYING) {
          tryEnterNearbyCave();
        } else if (state.state === STATES.CAVE) {
          leaveCave();
        }
        break;
      case "enter":
        if (state.state === STATES.MENU) startSelectedMountain();
        break;
    }
  }

  function onPointerDown(e) {
    state.pointer.active = true;
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    state.pointer.dragX = 0;
    state.pointer.dragY = 0;
  }

  function onPointerMove(e) {
    if (!state.pointer.active) return;
    state.pointer.dragX = e.clientX - state.pointer.x;
    state.pointer.dragY = e.clientY - state.pointer.y;
  }

  function onPointerUp() {
    state.pointer.active = false;
  }

  /* =====================================================
   *  12. UI BINDINGS
   * ===================================================== */

  function bindUI() {
    bindClick("startBtn", () => startSelectedMountain());
    bindClick("randomBtn", () => {
      const idx = Math.floor(Math.random() * MOUNTAINS.length);
      setSelectedMountain(MOUNTAINS[idx].id);
      startSelectedMountain();
    });
    bindClick("tutorialBtn", () => openTutorial());
    bindClick("tutorialBackBtn", () => closeTutorial());
    bindClick("resetProgressBtn", () => confirmResetProgress());

    bindClick("pauseBtn", () => togglePause());
    bindClick("caveListBtn", () => showCavesBeacon());
    bindClick("muteBtn", () => toggleMute());
    bindClick("fullscreenBtn", () => toggleFullscreen());
    bindClick("quitBtn", () => quitToMenu());

    bindClick("resumeBtn", () => resumeRun());
    bindClick("restartFromPauseBtn", () => restartRun());
    bindClick("quitFromPauseBtn", () => quitToMenu());

    bindClick("caveDrinkBtn", () => caveAction("drink"));
    bindClick("caveEatBtn", () => caveAction("eat"));
    bindClick("caveCollectFoodBtn", () => caveAction("collect"));
    bindClick("caveRestBtn", () => caveAction("rest"));
    bindClick("caveLeaveBtn", () => leaveCave());

    bindClick("endingRestartBtn", () => restartRun());
    bindClick("endingChangeBtn", () => quitToMenu());
    bindClick("endingShareBtn", () => copyEndingSummary());

    document
      .getElementById("localeEsBtn")
      ?.addEventListener("click", () => setLocale("es"));
    document
      .getElementById("localeEnBtn")
      ?.addEventListener("click", () => setLocale("en"));
  }

  function bindClick(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.preventDefault();
      fn(e);
    });
  }

  function renderMountainGrid() {
    const grid = document.getElementById("mountainGrid");
    if (!grid) return;
    grid.innerHTML = "";
    for (const mountain of MOUNTAINS) {
      const card = document.createElement("article");
      card.className = "summit-mountain-card";
      card.setAttribute("tabindex", "0");
      card.dataset.mountain = mountain.id;
      const tags = (mountain.tags[state.locale] || mountain.tags.es)
        .map((tg) => {
          const variant = mountainTagVariant(tg);
          return `<span class="summit-mountain-card-tag ${variant}">${escapeHtml(
            tg
          )}</span>`;
        })
        .join("");
      const description =
        mountain.description[state.locale] || mountain.description.es;
      card.innerHTML = `
        <div class="summit-mountain-card-thumb"></div>
        <h3>${escapeHtml(mountain.name[state.locale] || mountain.name.es)}</h3>
        <p>${escapeHtml(description)}</p>
        <div class="summit-mountain-card-tags">${tags}</div>
      `;
      card.addEventListener("click", () => {
        setSelectedMountain(mountain.id);
        state.audio.menuTick();
      });
      card.addEventListener("dblclick", () => {
        setSelectedMountain(mountain.id);
        startSelectedMountain();
      });
      card.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          setSelectedMountain(mountain.id);
          startSelectedMountain();
        }
      });
      if (mountain.id === state.selectedMountainId) {
        card.classList.add("is-selected");
      }
      grid.appendChild(card);
    }
  }

  function mountainTagVariant(tag) {
    const lc = String(tag).toLowerCase();
    if (lc.includes("calor") || lc.includes("heat") || lc.includes("hot")) {
      return "summit-mountain-card-flame";
    }
    if (
      lc.includes("frío") ||
      lc.includes("hielo") ||
      lc.includes("cold") ||
      lc.includes("ice") ||
      lc.includes("snow") ||
      lc.includes("nieve")
    ) {
      return "summit-mountain-card-cold";
    }
    return "summit-mountain-card-mid";
  }

  function renderMountainDetail() {
    const mountain = findMountainById(state.selectedMountainId);
    setText("detailEyebrow", t("menuEyebrow"));
    setText("detailName", mountain.name[state.locale] || mountain.name.es);
    setText(
      "detailDescription",
      mountain.description[state.locale] || mountain.description.es
    );
    setText(
      "detailHeightValue",
      formatMeters(Math.round(mountain.height * ALTITUDE_DISPLAY_FACTOR))
    );
    setText(
      "detailDifficultyValue",
      mountain.difficulty[state.locale] || mountain.difficulty.es
    );
    const best = state.progress.bestAltitudeByMountain[mountain.id] || 0;
    setText("detailRecordValue", formatMeters(best));
    const runs = state.progress.runsByMountain[mountain.id] || 0;
    setText("detailRunsValue", String(runs));

    const layersList = document.getElementById("detailLayersList");
    if (layersList) {
      layersList.innerHTML = "";
      mountain.layers.forEach((layer) => {
        const li = document.createElement("li");
        li.dataset.climate = layer.climate;
        const fromM = Math.round(layer.from * ALTITUDE_DISPLAY_FACTOR);
        const toM = Math.round(layer.to * ALTITUDE_DISPLAY_FACTOR);
        li.innerHTML = `
          <strong>${escapeHtml(
            layer.name[state.locale] || layer.name.es
          )}</strong>
          <span>${formatMeters(fromM)} – ${formatMeters(toM)} · drain x${layer.drain.toFixed(2)}</span>
        `;
        layersList.appendChild(li);
      });
    }

    const cavesList = document.getElementById("detailCavesList");
    if (cavesList) {
      cavesList.innerHTML = "";
      mountain.caves.forEach((cave) => {
        const li = document.createElement("li");
        const altM = Math.round(cave.y * ALTITUDE_DISPLAY_FACTOR);
        li.innerHTML = `
          <strong>${escapeHtml(
            cave.name[state.locale] || cave.name.es
          )}</strong>
          <span>${formatMeters(altM)} · 🍫 ${cave.food} · 💧 ${cave.water}</span>
        `;
        cavesList.appendChild(li);
      });
    }
  }

  /* =====================================================
   *  13. CICLO DE JUEGO
   * ===================================================== */

  function startSelectedMountain() {
    state.audio.ensure();
    const mountain = findMountainById(state.selectedMountainId);
    state.run = generateRun(mountain.id, state.locale);
    state.progress.runsByMountain[mountain.id] =
      (state.progress.runsByMountain[mountain.id] || 0) + 1;
    state.progress.totalRuns = (state.progress.totalRuns || 0) + 1;
    saveProgress(state.progress);

    state.runTime = 0;
    state.elapsed = 0;
    state.fallTime = 0;
    state.anchor = { y: -Infinity, placed: false, manual: false, x: 0 };
    state.anchorThrow = createAnchorThrowState();
    state.safeGrace = 0.6;
    state.rest = { active: false, secondsLeft: 0, total: 0 };
    state.cave.active = null;
    state.cave.sessionStart = 0;
    state.anchorLimitHintTimer = 0;
    state.flashRecord = false;
    state.summarySnapshot = null;

    const groundY = state.run.mountain.layers[0].from + HUT_GROUND_Y_OFFSET;
    const wallArrivalX = sampleFaceX(groundY) - 6;

    state.climber = createClimber();
    state.climber.x = HUT_X;
    state.climber.y = groundY;
    state.climber.facing = 1;
    state.anchor = { y: -Infinity, x: 0, placed: false, manual: false };
    state.anchorThrow = createAnchorThrowState();

    state.intro = {
      active: true,
      phase: "door",
      timer: 0,
      hutX: HUT_X,
      groundY,
      faceArrivalX: wallArrivalX,
    };

    state.summitWalk = {
      active: false,
      flagX: 0,
      plateauY: 0,
      plateauLeftX: 0,
      plateauRightX: 0,
      completed: false,
      cheerTimer: 0,
    };

    state.cameraX = state.cameraTargetX = state.climber.x - state.width * 0.5;
    state.cameraY = state.cameraTargetY = state.climber.y - state.height * 0.5;

    state.weather.snowflakes = [];
    state.weather.raindrops = [];
    state.weather.windStreaks = [];
    state.weather.fogPatches = [];
    state.weather.sparks = [];

    setStateMachine(STATES.PLAYING);
    closeAllOverlays();

    showMessage(
      t("msgWelcome", { name: mountain.name[state.locale] || mountain.name.es })
    );
    state.audio.menuConfirm();
    setBeacon(t("beaconNeedAnchor"), "Space", t("msgNeedAnchor"));
  }

  function setStateMachine(next) {
    state.state = next;
    document.getElementById("summitShell").setAttribute("data-state", next);
  }

  function togglePause() {
    if (state.state === STATES.PLAYING) {
      setStateMachine(STATES.PAUSED);
      openOverlay("pauseOverlay");
      renderPauseStats();
      state.audio.menuTick();
    } else if (state.state === STATES.PAUSED) {
      resumeRun();
    }
  }

  function resumeRun() {
    closeOverlay("pauseOverlay");
    setStateMachine(STATES.PLAYING);
    showMessage(t("msgUnpause"), 1.4);
  }

  function restartRun() {
    closeAllOverlays();
    startSelectedMountain();
  }

  function quitToMenu() {
    closeAllOverlays();
    setStateMachine(STATES.MENU);
    openOverlay("menuOverlay");
  }

  function openTutorial() {
    setStateMachine(STATES.TUTORIAL);
    closeOverlay("menuOverlay");
    openOverlay("tutorialOverlay");
  }

  function closeTutorial() {
    closeOverlay("tutorialOverlay");
    openOverlay("menuOverlay");
    setStateMachine(STATES.MENU);
  }

  function confirmResetProgress() {
    if (!window.confirm(t("resetConfirm"))) return;
    resetProgress();
    state.progress = loadProgress();
    setLocale(state.progress.locale || DEFAULT_LOCALE);
    setSelectedMountain(state.progress.lastMountain || MOUNTAINS[0].id);
    showToast(t("btnReset"));
  }

  function showCavesBeacon() {
    if (!state.run) return;
    const next = nextCaveAbove(state.climber.y);
    if (!next) {
      showToast(t("msgNoCaveNear"));
      return;
    }
    const altDelta = Math.round(
      (next.y - state.climber.y) * ALTITUDE_DISPLAY_FACTOR
    );
    setBeacon(
      `${t("beaconNextCave")}: ${next.nameLocalized}`,
      "↑",
      formatMetersShort(altDelta)
    );
  }

  function nextCaveAbove(y) {
    if (!state.run) return null;
    return state.run.caves.find((cave) => !cave.taken && cave.mouthY > y);
  }

  function nearestCave(y) {
    if (!state.run) return null;
    let best = null;
    let bestDist = Infinity;
    for (const cave of state.run.caves) {
      if (cave.taken) continue;
      const d = Math.abs(cave.mouthY - y);
      if (d < bestDist) {
        bestDist = d;
        best = cave;
      }
    }
    return best;
  }

  function hasActiveAnchor() {
    return Boolean(state.anchor.placed && Number.isFinite(state.anchor.y));
  }

  function hasAnchorThrow() {
    return Boolean(state.anchorThrow && state.anchorThrow.active);
  }

  function anchorTopReached() {
    if (!hasActiveAnchor()) return true;
    return state.climber.y >= state.anchor.y - ANCHOR_RETHROW_WINDOW;
  }

  function anchorClimbRoom() {
    if (!hasActiveAnchor()) return 0;
    return Math.max(0, state.anchor.y - state.climber.y - ANCHOR_CEILING_SLACK);
  }

  function showAnchorClimbHint() {
    if (state.anchorLimitHintTimer > 0) return;
    const text = hasAnchorThrow()
      ? t("msgAnchorFlying")
      : hasActiveAnchor()
      ? t("msgAnchorLimit")
      : t("msgNeedAnchor");
    showToast(text, 1.35);
    state.anchorLimitHintTimer = 1.2;
  }

  function climberPocketWorld() {
    const climber = state.climber;
    return {
      x: climber.x - 8 * climber.facing,
      y: climber.y - 5,
    };
  }

  function anchorThrowPosition(throwState) {
    const t0 = clamp(throwState.elapsed / throwState.duration, 0, 1);
    const t1 = t0;
    const x = lerp(throwState.fromX, throwState.targetX, t1);
    const baseY = lerp(throwState.fromY, throwState.targetY, t1);
    const arcY = Math.sin(Math.PI * t1) * throwState.arcHeight;
    return { x, y: baseY + arcY, t: t1 };
  }

  function tryPlaceManualAnchor() {
    if (!state.run) return;
    if (state.intro.active) return;
    const climber = state.climber;
    if (climber.falling) return;
    if (hasAnchorThrow()) return;
    if (climber.stamina < 10) {
      showToast(t("msgStaminaLow"));
      return;
    }
    if (hasActiveAnchor() && !anchorTopReached()) {
      showToast(t("msgAnchorTooFar"), 1.4);
      return;
    }
    const mountainTop = state.run.mountain.height;
    const targetY = Math.min(climber.y + ANCHOR_THROW_DISTANCE, mountainTop);
    if (targetY < climber.y + ANCHOR_MIN_THROW_DISTANCE && climber.y < mountainTop - 6) {
      showToast(t("msgAnchorLimit"), 1.4);
      return;
    }
    const targetX = sampleFaceX(targetY) - 4;
    const pocket = climberPocketWorld();
    const flightDistance = distance(pocket.x, pocket.y, targetX, targetY);
    state.anchor = { y: -Infinity, x: 0, placed: false, manual: false };
    state.anchorThrow = {
      active: true,
      elapsed: 0,
      duration: ANCHOR_THROW_DURATION,
      fromX: pocket.x,
      fromY: pocket.y,
      targetX,
      targetY,
      arcHeight: clamp(flightDistance * 0.42, ANCHOR_THROW_ARC_MIN, ANCHOR_THROW_ARC_MAX),
    };
    climber.anchorSwingTimer = ANCHOR_SWING_DURATION;
    state.run.stats.anchorsPlaced += 1;
    state.run.stats.manualAnchors += 1;
    showToast(t("anchorPlaced"));
    setBeacon(t("beaconAnchorTop"), "↑", formatMetersShort(Math.round((targetY - climber.y) * ALTITUDE_DISPLAY_FACTOR)));
  }

  function tryDrinkInline() {
    if (!state.run) return;
    const climber = state.climber;
    if (climber.water <= 0) {
      showToast(t("msgNoWater"));
      return;
    }
    const drink = Math.min(climber.water, WATER_DRINK_AMOUNT * 0.5);
    climber.water -= drink * 0.4;
    climber.stamina = clamp(
      climber.stamina + STAMINA_DRINK_RECOVER * 0.5,
      0,
      STAMINA_MAX
    );
    state.audio.drink();
    showToast(t("msgDrink"));
  }

  function tryEnterNearbyCave() {
    if (!state.run) return;
    const climber = state.climber;
    const cave = state.run.caves.find(
      (c) => !c.taken && Math.abs(c.mouthY - climber.y) < 60
    );
    if (!cave) {
      showToast(t("msgNoCaveNear"));
      return;
    }
    enterCave(cave);
  }

  function enterCave(cave) {
    state.cave.active = cave;
    state.cave.sessionStart = state.runTime;
    setStateMachine(STATES.CAVE);
    state.audio.enterCave();
    populateCaveOverlay(cave);
    openOverlay("caveOverlay");
  }

  function leaveCave() {
    if (!state.cave.active) return;
    state.cave.active.taken = true;
    state.run.stats.cavesVisited += 1;
    state.cave.active = null;
    closeOverlay("caveOverlay");
    setStateMachine(STATES.PLAYING);
    state.safeGrace = SAFE_GRACE_AFTER_CAVE;
    state.audio.leaveCave();
    state.progress.cavesVisitedByMountain[state.run.mountain.id] =
      (state.progress.cavesVisitedByMountain[state.run.mountain.id] || 0) + 1;
    saveProgress(state.progress);
  }

  function populateCaveOverlay(cave) {
    setText("caveTitle", cave.nameLocalized);
    setText("caveLead", t("caveLead"));
    setText("caveResourceFoodValue", String(cave.food));
    setText("caveResourceWaterValue", `${cave.water} u`);
    setText("caveResourceWoodValue", String(cave.wood || 0));
    refreshCaveStateBlock();

    const noteEl = document.getElementById("caveNote");
    if (noteEl) {
      const generic =
        STRINGS[state.locale].caveNotesGeneric || STRINGS.en.caveNotesGeneric;
      const sample = generic[Math.floor(Math.random() * generic.length)];
      noteEl.textContent = cave.noteLocalized
        ? `${cave.noteLocalized} — ${sample}`
        : sample;
    }
  }

  function refreshCaveStateBlock() {
    const climber = state.climber;
    setText("caveStateStamina", `${Math.round(climber.stamina)}/${STAMINA_MAX}`);
    setText("caveStateWater", `${Math.round(climber.water)}/${WATER_MAX}`);
    setText("caveStateGrip", `${Math.round(climber.grip)}/${GRIP_MAX}`);
    setText(
      "caveStateFood",
      `${climber.food} ${climber.food === 1 ? t("statFood") : t("statFood")}`
    );
    setText(
      "caveStateAltitude",
      formatMeters(Math.round(climber.y * ALTITUDE_DISPLAY_FACTOR))
    );
    setText("caveStateTime", formatSecondsClock(state.runTime));
  }

  function caveAction(kind) {
    const cave = state.cave.active;
    if (!cave) return;
    const climber = state.climber;
    let changed = false;
    switch (kind) {
      case "drink":
        if (cave.water > 0) {
          const portion = Math.min(cave.water, WATER_DRINK_AMOUNT);
          cave.water -= portion;
          climber.water = clamp(climber.water + portion, 0, WATER_MAX);
          climber.stamina = clamp(
            climber.stamina + STAMINA_DRINK_RECOVER,
            0,
            STAMINA_MAX
          );
          climber.grip = clamp(climber.grip + 4, 0, GRIP_MAX);
          state.audio.drink();
          changed = true;
        } else {
          showToast(t("msgNoWater"));
        }
        break;
      case "eat":
        if (climber.food > 0) {
          climber.food -= 1;
          climber.stamina = clamp(
            climber.stamina + STAMINA_FOOD_RECOVER,
            0,
            STAMINA_MAX
          );
          climber.grip = clamp(climber.grip + 6, 0, GRIP_MAX);
          state.audio.eat();
          changed = true;
        } else {
          showToast(t("msgNoFood"));
        }
        break;
      case "collect":
        if (cave.food > 0) {
          climber.food += cave.food;
          cave.food = 0;
          state.audio.menuConfirm();
          changed = true;
        }
        break;
      case "rest":
        if (climber.stamina < STAMINA_MAX) {
          state.rest.active = true;
          state.rest.secondsLeft = REST_DURATION_DEFAULT;
          state.rest.total = REST_DURATION_DEFAULT;
          showToast(t("msgRestStart"));
          changed = true;
        } else {
          showToast(t("msgRestEnd"));
        }
        break;
    }
    if (changed) {
      populateCaveOverlay(cave);
    }
  }

  function copyEndingSummary() {
    if (!state.summarySnapshot) return;
    const text = state.summarySnapshot;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(t("copySummary")))
        .catch(() => showToast(t("copyFail")));
    } else {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showToast(t("copySummary"));
      } catch (e) {
        showToast(t("copyFail"));
      }
    }
  }

  function toggleMute() {
    state.audio.toggle();
    const shell = document.getElementById("summitShell");
    if (shell) {
      shell.setAttribute("data-audio", state.audio.isMuted() ? "muted" : "on");
    }
    showToast(state.audio.isMuted() ? t("audioMuted") : t("audioUnmuted"));
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (el.requestFullscreen) {
        el.requestFullscreen();
      }
    } catch (e) {
      // ignore
    }
  }

  function openOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden");
  }

  function closeOverlay(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add("hidden");
  }

  function closeAllOverlays() {
    [
      "menuOverlay",
      "tutorialOverlay",
      "pauseOverlay",
      "caveOverlay",
      "endingOverlay",
    ].forEach(closeOverlay);
  }

  /* =====================================================
   *  14. SIMULACIÓN — UPDATE
   * ===================================================== */

  function update(dt) {
    state.anchorLimitHintTimer = Math.max(0, state.anchorLimitHintTimer - dt);
    if (state.state === STATES.PLAYING) {
      state.elapsed += dt;
      state.runTime += dt;
      if (state.intro.active) {
        updateIntro(dt);
      } else if (state.summitWalk.active) {
        updateSummitWalk(dt);
      } else {
        updateClimber(dt);
        updateAnchor(dt);
      }
      if (state.climber.anchorSwingTimer > 0) {
        state.climber.anchorSwingTimer = Math.max(
          0,
          state.climber.anchorSwingTimer - dt
        );
      }
      updateWeather(dt);
      updateBeacon();
      if (!state.summitWalk.active) {
        checkAutoCaveProximity();
      }
      updateRest(dt);
      checkLossOrWin();
    } else if (state.state === STATES.CAVE) {
      state.elapsed += dt;
      updateRest(dt);
    } else {
      // PAUSE / MENU / TUTORIAL: no time advances except small idle anims
    }

    // Cámara siempre se actualiza (lerp sigue al player)
    updateCamera(dt);
    updateParallax(dt);
  }

  function updateRest(dt) {
    if (!state.rest.active) return;
    state.rest.secondsLeft -= dt;
    state.climber.stamina = clamp(
      state.climber.stamina + REST_RECOVERY_PER_SECOND * dt,
      0,
      STAMINA_MAX
    );
    state.climber.grip = clamp(
      state.climber.grip + REST_RECOVERY_PER_SECOND * 0.6 * dt,
      0,
      GRIP_MAX
    );
    if (state.rest.secondsLeft <= 0) {
      state.rest.active = false;
      showToast(t("msgRestEnd"));
      refreshCaveStateBlock();
    }
  }

  function updateIntro(dt) {
    const climber = state.climber;
    const intro = state.intro;
    intro.timer += dt;

    // Permite saltar el intro pulsando cualquier dirección o espacio
    const skipPressed =
      state.keys.has("arrowleft") ||
      state.keys.has("arrowright") ||
      state.keys.has("arrowup") ||
      state.keys.has("a") ||
      state.keys.has("d") ||
      state.keys.has("w") ||
      state.keys.has("enter");

    if (skipPressed) {
      climber.x = intro.faceArrivalX;
      climber.y = intro.groundY;
      finishIntro();
      return;
    }

    if (intro.phase === "door") {
      if (intro.timer >= INTRO_DOOR_DURATION) {
        intro.phase = "walk";
        intro.timer = 0;
        climber.facing = 1;
      }
      return;
    }

    if (intro.phase === "walk") {
      // Camina automáticamente hacia la base de la pared
      const targetX = intro.faceArrivalX;
      const dx = targetX - climber.x;
      const step = INTRO_WALK_SPEED * dt;
      if (dx <= step) {
        climber.x = targetX;
        finishIntro();
      } else {
        climber.x += step;
        climber.legSwing += dt * 9;
        climber.armSwing += dt * 9;
      }
    }
  }

  function finishIntro() {
    const climber = state.climber;
    const intro = state.intro;
    intro.active = false;
    intro.phase = "arrived";
    state.anchor = { y: -Infinity, x: 0, placed: false, manual: false };
    state.anchorThrow = createAnchorThrowState();
    state.safeGrace = 0.6;
    setBeacon(t("beaconNeedAnchor"), "Space", t("msgNeedAnchor"));
  }

  function updateClimber(dt) {
    const climber = state.climber;
    const layer = currentLayer(climber.y);
    const climateFactor = layer ? layer.drain : 1;

    let inputX = 0;
    let inputY = 0;
    if (state.keys.has("arrowleft") || state.keys.has("a")) inputX -= 1;
    if (state.keys.has("arrowright") || state.keys.has("d")) inputX += 1;
    if (state.keys.has("arrowup") || state.keys.has("w")) inputY -= 1;
    if (state.keys.has("arrowdown") || state.keys.has("s")) inputY += 1;
    let walkablePlateau = currentWalkablePlateau();

    if (climber.falling) {
      // Caída libre con drag y deriva por viento
      const wind = layer ? layer.wind : 0;
      climber.vx = climber.vx * FALL_DRAG + wind * 240 * dt;
      climber.vy += GRAVITY * dt;
      if (climber.vy > TERMINAL_VELOCITY) climber.vy = TERMINAL_VELOCITY;
      climber.x += climber.vx * dt;
      climber.y -= climber.vy * dt; // y crece hacia arriba en world coords
      clampClimberToClimbableFace({ stopInwardVelocity: true });
      state.fallTime += dt;
      if (climber.y <= state.run.mountain.layers[0].from + 4) {
        // Tocó el suelo: muerte
        triggerDeath("ground");
      }
      // ¿Cuerda atrapa?
      if (hasActiveAnchor()) {
        const delta = climber.y - state.anchor.y;
        if (delta <= -ROPE_LENGTH) {
          // La cuerda se tensa: bot rebote elástico
          climber.y = state.anchor.y - ROPE_LENGTH;
          climber.vy = -climber.vy * 0.18;
          climber.vx *= 0.6;
          climber.falling = false;
          climber.stamina = clamp(
            climber.stamina - ROPE_CATCH_PENALTY,
            0,
            STAMINA_MAX
          );
          climber.grip = clamp(climber.grip - 12, 0, GRIP_MAX);
          state.run.stats.ropeCatches += 1;
          state.audio.ropeCatch();
          showMessage(t("msgRopeCatch"), 2.4);
          state.fallTime = 0;
        }
      }
      return;
    }

    // Movimiento sobre la pared. Subir exige un anclaje fijo por encima,
    // salvo en las llanuras, donde el jugador camina sin cuerda.
    const wantsClimb = inputY < 0;
    const walkingPlateau = Boolean(walkablePlateau);
    const canClimb = wantsClimb && !walkingPlateau && anchorClimbRoom() > 0;
    if (wantsClimb && !canClimb && !walkingPlateau) {
      showAnchorClimbHint();
    }
    const climbing = canClimb;
    const descending = inputY > 0;

    // Estamina
    if (climbing) {
      climber.stamina -= STAMINA_CLIMB_DRAIN * climateFactor * dt;
    } else if (walkingPlateau && inputX !== 0) {
      climber.stamina -= STAMINA_LATERAL_DRAIN * 0.42 * climateFactor * dt;
    } else if (descending) {
      climber.stamina -= STAMINA_DESCENT_DRAIN * climateFactor * dt;
    } else if (inputX !== 0) {
      climber.stamina -= STAMINA_LATERAL_DRAIN * climateFactor * dt;
    } else {
      climber.stamina -= STAMINA_IDLE_DRAIN * climateFactor * dt;
    }
    if (state.safeGrace > 0) {
      state.safeGrace -= dt;
      climber.stamina = Math.max(climber.stamina, 28);
    }

    // Velocidades horizontales/verticales
    const targetVx = inputX * (walkingPlateau ? WALKABLE_PLATEAU_SPEED : SIDE_SPEED);
    const targetVy = walkingPlateau
      ? 0
      : climbing
      ? -CLIMB_SPEED
      : descending
      ? -DESCEND_SPEED * -1
      : 0;

    climber.vx = lerp(climber.vx, targetVx, 1 - Math.exp(-dt * 11));
    climber.vy = lerp(climber.vy, targetVy, 1 - Math.exp(-dt * 9));

    // Aplicar viento
    if (layer && layer.wind) {
      climber.vx += layer.wind * 80 * dt;
    }

    climber.x += climber.vx * dt;
    climber.y += -climber.vy * dt; // vy negativa = sube

    if (walkingPlateau) {
      state.anchor = { y: -Infinity, x: 0, placed: false, manual: false };
      state.anchorThrow = createAnchorThrowState();
      climber.x = clamp(climber.x, walkablePlateau.minX, walkablePlateau.maxX);
      climber.y = plateauSurfaceYAtX(walkablePlateau, climber.x);
      climber.vy = 0;
      if (
        inputX > 0 &&
        climber.x >= Math.max(walkablePlateau.startX, walkablePlateau.endX) - 4
      ) {
        climber.y = walkablePlateau.endY + WALKABLE_PLATEAU_MARGIN + 2;
        climber.x = sampleFaceX(climber.y) + CLIMBER_FACE_REATTACH_OFFSET;
        climber.vx = 0;
        setBeacon(t("beaconNeedAnchor"), "Space", t("msgNeedAnchor"));
      } else if (
        inputX < 0 &&
        climber.x <= Math.min(walkablePlateau.startX, walkablePlateau.endX) + 4
      ) {
        climber.y = walkablePlateau.startY - WALKABLE_PLATEAU_MARGIN - 2;
        climber.x = sampleFaceX(climber.y) + CLIMBER_FACE_REATTACH_OFFSET;
        climber.vx = 0;
        setBeacon(t("beaconNeedAnchor"), "Space", t("msgNeedAnchor"));
      }
    } else if (hasActiveAnchor()) {
      const ceiling = state.anchor.y - ANCHOR_CEILING_SLACK;
      if (climber.y > ceiling) {
        climber.y = ceiling;
        climber.vy = Math.max(climber.vy, 0);
      }
    }
    if (climber.vx !== 0) {
      climber.facing = climber.vx >= 0 ? 1 : -1;
    }
    climber.armSwing += dt * (climbing ? 6 : walkingPlateau && inputX !== 0 ? 8 : 2);
    climber.legSwing += dt * (climbing ? 6 : walkingPlateau && inputX !== 0 ? 9 : 2.4);
    climber.bodyTilt = lerp(
      climber.bodyTilt,
      inputX * 0.18 + (layer ? layer.wind * 0.5 : 0),
      1 - Math.exp(-dt * 8)
    );

    // Snap a la pared (limita X dentro de los holds)
    if (!walkingPlateau) {
      clampClimberToClimbableFace({ stopInwardVelocity: true });
    }

    // Hidratación / agua
    climber.water = clamp(
      climber.water - WATER_DRAIN * climateFactor * dt,
      0,
      WATER_MAX
    );

    // Agarre con clima
    if (layer && layer.rain > 0) {
      climber.grip = clamp(
        climber.grip - GRIP_RAIN_DRAIN * layer.rain * dt,
        0,
        GRIP_MAX
      );
    }
    if (layer && layer.snow > 0) {
      climber.grip = clamp(
        climber.grip - GRIP_SNOW_DRAIN * layer.snow * dt,
        0,
        GRIP_MAX
      );
    }
    if (layer && layer.fog > 0) {
      climber.grip = clamp(
        climber.grip - GRIP_FOG_DRAIN * layer.fog * dt,
        0,
        GRIP_MAX
      );
    }
    if (
      (!layer || (!layer.rain && !layer.snow && !layer.fog)) &&
      climber.grip < GRIP_MAX
    ) {
      climber.grip = clamp(climber.grip + GRIP_RECOVERY * dt, 0, GRIP_MAX);
    }

    // Si stamina llega a 0, comienza la caída
    if (climber.stamina <= 0) {
      climber.stamina = 0;
      climber.falling = true;
      climber.vy = 60;
      state.run.stats.falls += 1;
      state.audio.fall();
    }

    // Audio steps
    if (climbing && Math.random() < dt * 4.4) {
      if (layer && (layer.snow > 0.4 || layer.rain > 0.4)) {
        state.audio.stepCold();
      } else {
        state.audio.step();
      }
    }
  }

  function updateAnchor(dt) {
    const throwState = state.anchorThrow;
    if (!throwState || !throwState.active) return;
    throwState.elapsed += dt;
    if (throwState.elapsed < throwState.duration) return;
    state.anchor = {
      y: throwState.targetY,
      x: throwState.targetX,
      placed: true,
      manual: true,
    };
    state.anchorThrow = createAnchorThrowState();
    state.audio.anchor();
  }

  function updateWeather(dt) {
    const climber = state.climber;
    const layer = currentLayer(climber.y);
    if (!layer) return;

    // Snow
    if (layer.snow > 0) {
      const desired = Math.floor(180 * layer.snow);
      while (state.weather.snowflakes.length < desired) {
        state.weather.snowflakes.push(spawnSnowflake());
      }
    }
    // Despawn snow if too far below climate band
    state.weather.snowflakes = state.weather.snowflakes.filter((s) => {
      s.x += s.vx * dt + (layer.wind ? layer.wind * 90 * dt : 0);
      s.y -= s.vy * dt;
      s.spin += dt * s.rotSpeed;
      if (s.y < state.cameraY - 200) return false;
      return true;
    });

    // Rain
    if (layer.rain > 0) {
      const desired = Math.floor(220 * layer.rain);
      while (state.weather.raindrops.length < desired) {
        state.weather.raindrops.push(spawnRaindrop());
      }
    }
    state.weather.raindrops = state.weather.raindrops.filter((r) => {
      r.x += r.vx * dt + (layer.wind ? layer.wind * 220 * dt : 0);
      r.y -= r.vy * dt;
      if (r.y < state.cameraY - 100) return false;
      return true;
    });

    // Wind streaks
    if (layer.wind > 0.06) {
      const desired = Math.floor(40 * layer.wind);
      while (state.weather.windStreaks.length < desired) {
        state.weather.windStreaks.push(spawnWindStreak());
      }
    }
    state.weather.windStreaks = state.weather.windStreaks.filter((w) => {
      w.x += w.vx * dt;
      w.life -= dt;
      return w.life > 0;
    });

    // Fog patches
    if (layer.fog > 0.05) {
      const desired = Math.floor(14 * layer.fog);
      while (state.weather.fogPatches.length < desired) {
        state.weather.fogPatches.push(spawnFogPatch());
      }
    }
    state.weather.fogPatches = state.weather.fogPatches.filter((f) => {
      f.x += f.vx * dt;
      f.alpha -= dt * 0.05;
      return f.alpha > 0;
    });

    // Sparks (volcán o random ambient)
    if (state.run.mountain.id === "volcan" && Math.random() < dt * 4) {
      state.weather.sparks.push(spawnSpark());
    }
    state.weather.sparks = state.weather.sparks.filter((s) => {
      s.x += s.vx * dt;
      s.y -= s.vy * dt;
      s.life -= dt;
      return s.life > 0;
    });

    // Audio ambiental
    if (layer.wind > 0.18 && Math.random() < dt * 0.4) {
      state.audio.windGust();
    }
    if (layer.rain > 0.4 && Math.random() < dt * 0.05) {
      state.audio.thunder();
    }
  }

  function spawnSnowflake() {
    return {
      x: state.cameraX + rngLocal(-100, state.width + 100),
      y: state.cameraY + state.height + rngLocal(-20, 200),
      vx: rngLocal(-12, 12),
      vy: rngLocal(40, 120),
      size: rngLocal(2, 5),
      spin: rngLocal(0, Math.PI * 2),
      rotSpeed: rngLocal(-2, 2),
      alpha: rngLocal(0.55, 0.95),
    };
  }

  function spawnRaindrop() {
    return {
      x: state.cameraX + rngLocal(-100, state.width + 100),
      y: state.cameraY + state.height + rngLocal(-20, 200),
      vx: rngLocal(-30, 30),
      vy: rngLocal(220, 360),
      length: rngLocal(8, 18),
      alpha: rngLocal(0.32, 0.62),
    };
  }

  function spawnWindStreak() {
    const fromLeft = Math.random() < 0.5;
    return {
      x: fromLeft
        ? state.cameraX - rngLocal(0, 200)
        : state.cameraX + state.width + rngLocal(0, 200),
      y: state.cameraY + rngLocal(0, state.height),
      vx: fromLeft ? rngLocal(180, 320) : rngLocal(-320, -180),
      length: rngLocal(60, 140),
      alpha: rngLocal(0.18, 0.42),
      life: rngLocal(0.8, 1.6),
    };
  }

  function spawnFogPatch() {
    return {
      x: state.cameraX + rngLocal(-200, state.width + 200),
      y: state.cameraY + rngLocal(0, state.height),
      vx: rngLocal(-22, 22),
      size: rngLocal(120, 280),
      alpha: rngLocal(0.18, 0.42),
    };
  }

  function spawnSpark() {
    const climber = state.climber;
    return {
      x: climber.x + rngLocal(-80, 80),
      y: climber.y - rngLocal(30, 220),
      vx: rngLocal(-30, 30),
      vy: rngLocal(70, 160),
      life: rngLocal(0.6, 1.4),
      size: rngLocal(1.2, 2.4),
      hue: rngLocal(20, 40),
    };
  }

  function rngLocal(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  function checkAutoCaveProximity() {
    if (!state.run) return;
    const climber = state.climber;
    const cave = nearestCave(climber.y);
    if (!cave) return;
    const dy = Math.abs(cave.mouthY - climber.y);
    if (dy < 18 && !cave.taken && !cave.triggered) {
      cave.triggered = true;
      // Auto-show beacon close to cave
      setBeacon(
        cave.nameLocalized,
        "→",
        `${formatMetersShort(
          Math.round(cave.mouthY * ALTITUDE_DISPLAY_FACTOR)
        )}`
      );
    }
  }

  function startSummitWalk() {
    if (state.summitWalk.active) return;
    const summitY = state.run.mountain.height;
    const summitFaceX = sampleFaceX(summitY);
    const plateauLeftX = summitFaceX - 6;
    const plateauRightX = summitFaceX + SUMMIT_PLATEAU_WIDTH;
    state.summitWalk = {
      active: true,
      plateauY: summitY,
      plateauLeftX,
      plateauRightX,
      flagX: summitFaceX + SUMMIT_FLAG_OFFSET,
      completed: false,
      cheerTimer: 0,
    };
    const climber = state.climber;
    climber.y = summitY;
    climber.vy = 0;
    climber.vx = 0;
    climber.falling = false;
    climber.facing = 1;
    climber.anchorSwingTimer = 0;
    state.anchor = { y: -Infinity, x: 0, placed: false, manual: false };
    state.anchorThrow = createAnchorThrowState();
    showMessage(t("msgSummitReached") || "¡Cumbre! Camina hasta la bandera.", 4.2);
    if (state.audio && state.audio.menuConfirm) state.audio.menuConfirm();
  }

  function updateSummitWalk(dt) {
    const climber = state.climber;
    const sw = state.summitWalk;
    // Lock vertical position en la esplanada
    climber.y = sw.plateauY;
    climber.vy = 0;

    let inputX = 0;
    if (state.keys.has("arrowleft") || state.keys.has("a")) inputX -= 1;
    if (state.keys.has("arrowright") || state.keys.has("d")) inputX += 1;

    const targetVx = inputX * SUMMIT_WALK_SPEED;
    climber.vx = lerp(climber.vx, targetVx, 1 - Math.exp(-dt * 11));
    climber.x += climber.vx * dt;

    // Limitar a la esplanada
    if (climber.x < sw.plateauLeftX + 4) climber.x = sw.plateauLeftX + 4;
    if (climber.x > sw.plateauRightX - 4) climber.x = sw.plateauRightX - 4;

    if (inputX !== 0) {
      climber.facing = inputX > 0 ? 1 : -1;
      climber.legSwing += dt * 9;
      climber.armSwing += dt * 9;
    }

    // En la esplanada el caminante va erguido, sin inclinación de escalada
    climber.bodyTilt = lerp(climber.bodyTilt, 0, 1 - Math.exp(-dt * 9));
    climber.anchorSwingTimer = 0;

    // Recuperación pasiva
    climber.stamina = clamp(climber.stamina + 6 * dt, 0, STAMINA_MAX);
    climber.grip = clamp(climber.grip + 8 * dt, 0, GRIP_MAX);

    if (sw.cheerTimer > 0) sw.cheerTimer = Math.max(0, sw.cheerTimer - dt);

    // Llegada a la bandera
    if (!sw.completed && Math.abs(climber.x - sw.flagX) < SUMMIT_FLAG_REACH) {
      sw.completed = true;
      sw.cheerTimer = 0.6;
      triggerWin();
    }
  }

  function checkLossOrWin() {
    const climber = state.climber;
    const summit = state.run.mountain.height;
    if (!state.summitWalk.active && climber.y >= summit) {
      startSummitWalk();
      return;
    }
  }

  function triggerDeath(cause) {
    if (state.state !== STATES.PLAYING) return;
    state.diedAt = state.climber.y;
    state.summitAt = null;
    state.audio.gameOver();
    state.run.stats.falls += 1;
    setStateMachine(STATES.DEAD);
    finalizeRun(false);
  }

  function triggerWin() {
    if (state.state !== STATES.PLAYING) return;
    state.diedAt = null;
    state.summitAt = state.climber.y;
    state.audio.summit();
    setStateMachine(STATES.WON);
    finalizeRun(true);
  }

  function finalizeRun(won) {
    const mountain = state.run.mountain;
    const altitude = Math.round(state.climber.y * ALTITUDE_DISPLAY_FACTOR);
    const totalAltitude = Math.round(mountain.height * ALTITUDE_DISPLAY_FACTOR);
    const newRecord =
      altitude >
      (state.progress.bestAltitudeByMountain[mountain.id] || 0);
    if (newRecord) {
      state.progress.bestAltitudeByMountain[mountain.id] = altitude;
      state.flashRecord = true;
      state.audio.record();
    }
    if (won) {
      state.progress.totalSummits = (state.progress.totalSummits || 0) + 1;
      state.progress.summits = state.progress.summits || [];
      state.progress.summits.push({
        mountain: mountain.id,
        time: Math.round(state.runTime),
        when: Date.now(),
      });
      const prevTime = state.progress.bestTimeByMountain[mountain.id];
      if (!prevTime || state.runTime < prevTime) {
        state.progress.bestTimeByMountain[mountain.id] = Math.round(
          state.runTime
        );
      }
    }
    saveProgress(state.progress);

    state.summarySnapshot = buildSummaryText(won, altitude, totalAltitude);
    populateEndingOverlay(won, altitude, totalAltitude, newRecord);
    openOverlay("endingOverlay");

    if (newRecord) {
      showMessage(t("msgRecordBeat", { name: mountain.name[state.locale] || mountain.name.es }), 3.4);
    } else if (won) {
      showMessage(t("msgSummit"), 3.4);
    } else {
      showMessage(t("msgFallToDeath"), 3.4);
    }
  }

  function populateEndingOverlay(won, altitude, totalAltitude, newRecord) {
    const card = document
      .getElementById("endingOverlay")
      .querySelector(".summit-end-card");
    card.setAttribute("data-result", won ? "won" : "dead");
    setText(
      "endingEyebrow",
      won ? t("endingEyebrowWon") : t("endingEyebrowDead")
    );
    setText(
      "endingTitle",
      won ? t("endingTitleWon") : t("endingTitleDead")
    );
    setText(
      "endingLead",
      won ? t("endingLeadWon") : t("endingLeadDead")
    );

    const stats = document.getElementById("endingStats");
    if (stats) {
      stats.innerHTML = "";
      const rows = [
        [t("summaryAltitudeReached"), formatMeters(altitude)],
        [
          t("summaryDistance"),
          formatMeters(
            Math.max(
              0,
              Math.round(
                (state.climber.y - state.run.mountain.layers[0].from) *
                  ALTITUDE_DISPLAY_FACTOR
              )
            )
          ),
        ],
        [t("summaryTime"), formatSecondsClock(state.runTime)],
        [t("summaryAnchorsPlaced"), String(state.run.stats.anchorsPlaced)],
        [t("summaryFalls"), String(state.run.stats.falls)],
        [t("summaryRopeCatches"), String(state.run.stats.ropeCatches)],
        [t("summaryCavesVisited"), String(state.run.stats.cavesVisited)],
      ];
      for (const [label, value] of rows) {
        const div = document.createElement("div");
        div.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(
          value
        )}</strong>`;
        stats.appendChild(div);
      }
    }

    const summary = document.getElementById("endingSummary");
    if (summary) {
      summary.textContent = state.summarySnapshot || "";
    }

    if (newRecord) {
      const recordPill = document.createElement("div");
      recordPill.style.gridColumn = "1 / -1";
      recordPill.innerHTML = `<span>${escapeHtml(t("summaryRecordSet"))}</span><strong>${escapeHtml(
        formatMeters(altitude)
      )}</strong>`;
      const stats2 = document.getElementById("endingStats");
      if (stats2) stats2.appendChild(recordPill);
    }
  }

  function buildSummaryText(won, altitude, totalAltitude) {
    const mountain = state.run.mountain;
    const lines = [];
    lines.push(`${t("gameTitle")} — ${mountain.name[state.locale] || mountain.name.es}`);
    lines.push(`${t("summaryAttempt", { n: state.progress.runsByMountain[mountain.id] || 1 })}`);
    lines.push("");
    lines.push(
      `${t("summaryAltitudeReached")}: ${formatMeters(altitude)} / ${formatMeters(
        totalAltitude
      )}`
    );
    lines.push(`${t("summaryTime")}: ${formatSecondsClock(state.runTime)}`);
    lines.push(`${t("summaryAnchorsPlaced")}: ${state.run.stats.anchorsPlaced}`);
    lines.push(`${t("summaryRopeCatches")}: ${state.run.stats.ropeCatches}`);
    lines.push(`${t("summaryCavesVisited")}: ${state.run.stats.cavesVisited}`);
    lines.push(
      `${t("statBest")}: ${formatMeters(
        state.progress.bestAltitudeByMountain[mountain.id] || 0
      )}`
    );
    return lines.join("\n");
  }

  function setBeacon(title, arrow, copy) {
    state.beacon.title = title;
    state.beacon.arrow = arrow || "↑";
    state.beacon.copy = copy || "";
    state.beacon.active = true;
    setText("beaconTitle", title);
    setText("beaconCopy", copy || "");
    const arrowEl = document.getElementById("beaconArrow");
    if (arrowEl) arrowEl.textContent = arrow;
    document
      .getElementById("beaconCard")
      .setAttribute("data-active", "true");
  }

  function updateBeacon() {
    if (!state.run) return;
    const climber = state.climber;
    if (climber.stamina < 25) {
      setBeacon(t("beaconLowStamina"), "⚠", t("msgStaminaLow"));
      return;
    }
    if (!state.intro.active && !state.summitWalk.active) {
      const plateau = currentWalkablePlateau();
      if (plateau) {
        setBeacon(
          t("beaconPlateauWalk"),
          "↔",
          formatMetersShort(Math.round(plateau.distanceMeters))
        );
        return;
      }
      if (hasAnchorThrow()) {
        setBeacon(t("beaconAnchorTop"), "↑", t("msgAnchorFlying"));
        return;
      }
      if (!hasActiveAnchor()) {
        setBeacon(t("beaconNeedAnchor"), "Space", t("msgNeedAnchor"));
        return;
      }
      if (anchorTopReached()) {
        setBeacon(t("beaconNeedAnchor"), "Space", t("msgAnchorLimit"));
        return;
      }
      setBeacon(
        t("beaconAnchorTop"),
        "↑",
        formatMetersShort(
          Math.round((state.anchor.y - climber.y) * ALTITUDE_DISPLAY_FACTOR)
        )
      );
      return;
    }
    const layer = currentLayer(climber.y);
    if (layer && layer.rain >= 0.6) {
      setBeacon(t("beaconRain"), "☔", "");
      return;
    }
    if (layer && layer.snow >= 0.5) {
      setBeacon(t("beaconSnow"), "❄", "");
      return;
    }
    if (layer && layer.fog >= 0.5) {
      setBeacon(t("beaconFog"), "🌫", "");
      return;
    }
    if (layer && layer.wind >= 0.22) {
      setBeacon(t("beaconWind"), "🌬", "");
      return;
    }
    setBeacon(t("beaconKeepClimbing"), "↑", "");
  }

  function currentLayer(y) {
    if (!state.run) return null;
    return (
      state.run.mountain.layers.find((l) => y >= l.from && y <= l.to) ||
      state.run.mountain.layers[0]
    );
  }

  // Perfil progresivo por fases: base caminable → ladera baja → pared
  // principal → pared técnica alta → pico/cumbre. Cada fase aporta un
  // desplazamiento horizontal acumulativo a la cara escalable.
  // Acepta opcionalmente una montaña explícita para usar antes de que
  // state.run esté inicializado (durante la generación del mundo).
  function plateauGeometryAt(y, x, mountainArg) {
    const mountain = mountainArg || (state.run ? state.run.mountain : null);
    if (!mountain || !mountain.layers) return null;
    const layers = mountain.layers;
    const profileCfg = mountain.slopeProfile || {};
    for (let i = 0; i < layers.length - 1; i++) {
      const layer = layers[i];
      const from = Math.max(0, layer.from || 0);
      const to = Math.min(mountain.height, layer.to == null ? mountain.height : layer.to);
      const levelHeight = Math.max(1, to - from);
      const plateauHeight = clamp(
        levelHeight * (profileCfg.plateauRatio || SLOPE_PLATEAU_RATIO),
        SLOPE_PLATEAU_MIN_HEIGHT,
        SLOPE_PLATEAU_MAX_HEIGHT
      );
      const startY = to - plateauHeight;
      const endY = to;
      const yInBand =
        y >= startY - WALKABLE_PLATEAU_MARGIN &&
        y <= endY + WALKABLE_PLATEAU_MARGIN;
      if (!yInBand) continue;

      const startX = sampleFaceX(startY, mountain);
      const endX = sampleFaceX(endY, mountain);
      const detectMinX = Math.min(startX, endX) - WALKABLE_PLATEAU_MARGIN;
      const detectMaxX = Math.max(startX, endX) + WALKABLE_PLATEAU_MARGIN;
      const xInSpan = x == null || (x >= detectMinX && x <= detectMaxX);
      if (!xInSpan) continue;
      const upperExitX = Math.max(startX, endX) - WALKABLE_PLATEAU_MARGIN * 0.5;
      const lowerExitX = Math.min(startX, endX) + WALKABLE_PLATEAU_MARGIN * 0.5;
      if (x != null && y > endY + 1 && x >= upperExitX) continue;
      if (x != null && y < startY - 1 && x <= lowerExitX) continue;
      const minX = Math.min(startX, endX) + CLIMBER_FACE_MIN_OFFSET;
      const maxX = Math.max(startX, endX) + CLIMBER_FACE_MAX_OFFSET;

      return {
        index: i,
        startY,
        endY,
        startX,
        endX,
        minX,
        maxX,
        distanceMeters: plateauDistanceMetersFor(mountain, i),
      };
    }
    return null;
  }

  function plateauSurfaceYAtX(plateau, x) {
    const span = plateau.endX - plateau.startX;
    if (Math.abs(span) < 0.001) return plateau.startY;
    const targetX = clamp(x, Math.min(plateau.startX, plateau.endX), Math.max(plateau.startX, plateau.endX));
    let lo = plateau.startY;
    let hi = plateau.endY;
    const ascendingX = plateau.endX >= plateau.startX;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) * 0.5;
      const midX = sampleFaceX(mid);
      if (ascendingX ? midX < targetX : midX > targetX) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) * 0.5;
  }

  function currentWalkablePlateau() {
    if (!state.run || state.intro.active || state.summitWalk.active) return null;
    return plateauGeometryAt(state.climber.y, state.climber.x, state.run.mountain);
  }

  function clampClimberToClimbableFace(options = {}) {
    if (!state.run || !state.climber) return;
    const climber = state.climber;
    const faceX = sampleFaceX(climber.y);
    const minX = faceX + CLIMBER_FACE_MIN_OFFSET;
    const maxX = faceX + CLIMBER_FACE_MAX_OFFSET;
    if (climber.x < minX) {
      climber.x = minX;
      if (options.stopOutwardVelocity && climber.vx < 0) climber.vx = 0;
    }
    if (climber.x > maxX) {
      climber.x = maxX;
      if (options.stopInwardVelocity && climber.vx > 0) climber.vx = 0;
    }
  }

  function gradeRunRate(gradePercent) {
    const grade = Math.max(1, gradePercent || 1);
    return SLOPE_PROFILE_BASE_RUN + SLOPE_PROFILE_GRADE_RUN / grade;
  }

  function integrateGradeRun(height, startGrade, endGrade, localRatio) {
    const h = Math.max(0, height) * clamp(localRatio, 0, 1);
    if (h <= 0) return 0;
    const gradeDelta = endGrade - startGrade;
    if (Math.abs(gradeDelta) < 0.0001) {
      return h * gradeRunRate(startGrade);
    }

    const f = clamp(localRatio, 0, 1);
    const integralInvGrade =
      (Math.log(startGrade + gradeDelta * f) - Math.log(startGrade)) /
      gradeDelta;
    return height * (SLOPE_PROFILE_BASE_RUN * f + SLOPE_PROFILE_GRADE_RUN * integralInvGrade);
  }

  function plateauDistanceMetersFor(mountain, levelIndex) {
    const seedWave = Math.sin((mountain.seed || 1) * 0.37 + levelIndex * 1.91) * 0.5 + 0.5;
    return lerp(SLOPE_PLATEAU_MIN_METERS, SLOPE_PLATEAU_MAX_METERS, seedWave);
  }

  function sampleProgressiveFaceProfile(y, mountainArg) {
    const mountain = mountainArg || (state.run ? state.run.mountain : null);
    if (!mountain) {
      return {
        x: 0,
        gradeStart: 1,
        gradeEnd: 5,
        gradePercent: 1,
        plateauBlend: 0,
        plateauDistanceMeters: 0,
      };
    }

    const layers = mountain.layers && mountain.layers.length
      ? mountain.layers
      : [{ from: 0, to: mountain.height }];
    const profileCfg = mountain.slopeProfile || {};
    const lowerSlopePower = profileCfg.lowerSlopePower == null ? 1.0 : profileCfg.lowerSlopePower;
    const wallIntensity = profileCfg.wallIntensity == null ? 1.0 : profileCfg.wallIntensity;
    const summitSharpness = profileCfg.summitSharpness == null ? 1.0 : profileCfg.summitSharpness;
    const veer = mountain.faceVeer == null ? 0.34 : mountain.faceVeer;
    const visualScale =
      (profileCfg.slopeVisualScale || SLOPE_PROFILE_SCALE) *
      (0.86 + veer * 0.42);

    const clampedY = clamp(y, 0, mountain.height);
    let x = 0;
    let gradeStart = SLOPE_FIRST_LEVEL_START_PERCENT;
    let gradeEnd = SLOPE_LEVEL_STEP_PERCENT;
    let gradePercent = gradeStart;
    let plateauBlend = 0;
    let plateauDistanceMeters = 0;

    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const from = Math.max(0, layer.from || 0);
      const to = Math.min(mountain.height, layer.to == null ? mountain.height : layer.to);
      const levelHeight = Math.max(1, to - from);
      const hasPlateau = i < layers.length - 1;
      plateauDistanceMeters = hasPlateau ? plateauDistanceMetersFor(mountain, i) : 0;
      const plateauHeight = hasPlateau
        ? clamp(
            levelHeight * (profileCfg.plateauRatio || SLOPE_PLATEAU_RATIO),
            SLOPE_PLATEAU_MIN_HEIGHT,
            SLOPE_PLATEAU_MAX_HEIGHT
          )
        : 0;
      const climbHeight = Math.max(1, levelHeight - plateauHeight);
      const levelStartGrade =
        i === 0 ? SLOPE_FIRST_LEVEL_START_PERCENT : i * SLOPE_LEVEL_STEP_PERCENT;
      const levelEndGrade = (i + 1) * SLOPE_LEVEL_STEP_PERCENT;
      const levelT = layers.length <= 1 ? 0 : i / (layers.length - 1);
      const technicalFactor =
        (i < 2 ? lowerSlopePower : 1) *
        lerp(1, wallIntensity, smoothstep(0.25, 1, levelT)) *
        (i === layers.length - 1 ? summitSharpness : 1);
      const effectiveStartGrade = Math.max(1, levelStartGrade * technicalFactor);
      const effectiveEndGrade = Math.max(effectiveStartGrade + 0.1, levelEndGrade * technicalFactor);

      if (clampedY <= from) {
        gradeStart = levelStartGrade;
        gradeEnd = levelEndGrade;
        gradePercent = levelStartGrade;
        break;
      }

      const levelY = Math.min(clampedY, to) - from;
      if (levelY <= climbHeight) {
        const local = levelY / climbHeight;
        x += integrateGradeRun(climbHeight, effectiveStartGrade, effectiveEndGrade, local) * visualScale;
        gradeStart = levelStartGrade;
        gradeEnd = levelEndGrade;
        gradePercent = lerp(levelStartGrade, levelEndGrade, local);
        break;
      }

      x += integrateGradeRun(climbHeight, effectiveStartGrade, effectiveEndGrade, 1) * visualScale;

      if (hasPlateau) {
        const plateauY = Math.min(levelY - climbHeight, plateauHeight);
        const plateauEase = smoothstep(0, 1, plateauY / Math.max(1, plateauHeight));
        const plateauDistanceWorld = plateauDistanceMeters / ALTITUDE_DISPLAY_FACTOR;
        x += plateauDistanceWorld * plateauEase;
        plateauBlend = plateauY > 0 && clampedY <= to
          ? Math.sin(plateauEase * Math.PI)
          : 0;
        gradeStart = levelEndGrade;
        gradeEnd = (i + 2) * SLOPE_LEVEL_STEP_PERCENT;
        gradePercent = levelEndGrade;
        if (clampedY <= to) break;
      }

      gradeStart = levelEndGrade;
      gradeEnd = (i + 2) * SLOPE_LEVEL_STEP_PERCENT;
      gradePercent = gradeStart;
    }

    return { x, gradeStart, gradeEnd, gradePercent, plateauBlend, plateauDistanceMeters };
  }

  function sampleFaceX(y, mountainArg) {
    const mountain = mountainArg || (state.run ? state.run.mountain : null);
    if (!mountain) return 220;

    const t = clamp(y / mountain.height, 0, 1);

    const baseX = mountain.faceBase || 220;
    const profileCfg = mountain.slopeProfile || {};
    const progressive = sampleProgressiveFaceProfile(y, mountain);
    const roughnessFactor = profileCfg.roughness == null ? 1.0 : profileCfg.roughness;

    const progressiveRoughnessScale =
      (0.03 +
        0.97 *
          smoothstep(0.07, 0.68, t) *
          (1.0 - 0.7 * smoothstep(0.88, 1.0, t))) *
      (1 - 0.78 * progressive.plateauBlend);

    const progressiveAmp = mountain.faceAmp || 76;
    const progressiveIrregularity =
      (
        Math.sin(t * Math.PI * 6.5 + mountain.seed) *
          progressiveAmp *
          0.42 *
          progressiveRoughnessScale *
          roughnessFactor +
        Math.sin(t * Math.PI * 15.5 + mountain.seed * 0.43) *
          progressiveAmp *
          0.18 *
          progressiveRoughnessScale *
          roughnessFactor +
        Math.sin(t * Math.PI * 42.0 + mountain.seed * 0.17) *
          5 *
          progressiveRoughnessScale *
          roughnessFactor +
        smoothstep(0.45, 0.52, t) *
          (1 - smoothstep(0.56, 0.64, t)) *
          -14 *
          roughnessFactor *
          (1 - progressive.plateauBlend) +
        smoothstep(0.68, 0.74, t) *
          (1 - smoothstep(0.76, 0.82, t)) *
          18 *
          roughnessFactor *
          (1 - progressive.plateauBlend)
      ) *
      (1.0 - 0.82 * smoothstep(0.93, 1.0, t));

    return baseX + progressive.x + progressiveIrregularity;

    const baseSoftness = profileCfg.baseSoftness == null ? 0.15 : profileCfg.baseSoftness;
    const lowerSlopePower = profileCfg.lowerSlopePower == null ? 1.0 : profileCfg.lowerSlopePower;
    const wallIntensity = profileCfg.wallIntensity == null ? 1.0 : profileCfg.wallIntensity;
    const summitSharpness = profileCfg.summitSharpness == null ? 1.0 : profileCfg.summitSharpness;
  /*
   * Perfil progresivo de la cara escalable.
   *
   * La idea visual es:
   *
   * 0.00 - 0.15: base suave, casi caminable.
   * 0.15 - 0.35: ladera más inclinada.
   * 0.35 - 0.60: pared principal de escalada.
   * 0.60 - 0.82: pared técnica alta.
   * 0.82 - 1.00: pico final estrecho.
   *
   * Cada fase suma desplazamiento horizontal acumulativo.
   * Así la montaña no se comporta como una pared recta, sino como una
   * ladera que se va empinando y cerrando hacia la cumbre.
   */

    const baseEnd = clamp(baseSoftness, 0.10, 0.22);
    const basePush = 240 + baseEnd * 170;

    const phaseBase =
      smoothstep(0.00, baseEnd, t) *
      basePush;

    const phaseLowerSlope =
      smoothstep(baseEnd, 0.35, t) *
      230 *
      lowerSlopePower;

    const phaseMainWall =
      smoothstep(0.35, 0.60, t) *
      205 *
      wallIntensity;

    const phaseHighWall =
      smoothstep(0.60, MOUNTAIN_PEAK_NARROW_RATIO, t) *
      170 *
      wallIntensity;

    const phaseSummitNarrow =
      smoothstep(MOUNTAIN_PEAK_NARROW_RATIO, 1.00, t) *
      118 *
      summitSharpness;

    let profile =
      phaseBase +
      phaseLowerSlope +
      phaseMainWall +
      phaseHighWall +
      phaseSummitNarrow;

  /*
   * faceVeer sigue controlando el carácter general de cada montaña.
   * Un faceVeer alto hace que la montaña avance más hacia la derecha.
   */
    const veer = mountain.faceVeer == null ? 0.34 : mountain.faceVeer;
    profile *= 0.85 + veer * 0.55;

  /*
   * Irregularidad visual:
   *
   * - Muy baja en la base, para que parezca caminable.
   * - Más visible en la zona media y alta.
   * - Reducida cerca de la cumbre para que la explanada final sea estable.
   */
    const roughnessScale =
      0.07 +
      0.93 *
        smoothstep(0.10, 0.68, t) *
        (1.0 - 0.65 * smoothstep(0.88, 1.0, t));

    const amp = mountain.faceAmp || 76;

    const wave1 =
      Math.sin(t * Math.PI * 6.5 + mountain.seed) *
      amp *
      0.50 *
      roughnessScale *
      roughnessFactor;

    const wave2 =
      Math.sin(t * Math.PI * 15.5 + mountain.seed * 0.43) *
      amp *
      0.22 *
      roughnessScale *
      roughnessFactor;

    const microLedges =
      Math.sin(t * Math.PI * 42.0 + mountain.seed * 0.17) *
      7 *
      roughnessScale *
      roughnessFactor;

  /*
   * Repisas y salientes puntuales.
   *
   * midRidge crea una pequeña repisa hacia fuera en zona media.
   * highOverhang crea un tramo algo más agresivo en zona alta.
   */
    const midRidge =
      smoothstep(0.45, 0.52, t) *
      (1 - smoothstep(0.56, 0.64, t)) *
      -18 *
      roughnessFactor;

    const highOverhang =
      smoothstep(0.68, 0.74, t) *
      (1 - smoothstep(0.76, 0.82, t)) *
      22 *
      roughnessFactor;

  /*
   * Suavizado extra al llegar a la cumbre.
   * Evita que las ondas deformen demasiado el punto donde empieza la explanada.
   */
    const summitStabilizer = 1.0 - 0.75 * smoothstep(0.93, 1.0, t);

    const irregularity =
      (wave1 + wave2 + microLedges + midRidge + highOverhang) *
      summitStabilizer;

    return baseX + profile + irregularity;
  }

  function sampleRightX(y, mountainArg) {
    const mountain = mountainArg || (state.run ? state.run.mountain : null);
    if (!mountain) return 900;

    const summitY = mountain.height;
    const summitFaceX = sampleFaceX(summitY, mountain);
    const plateauRightX = summitFaceX + SUMMIT_PLATEAU_WIDTH;

    if (y >= summitY) {
      return plateauRightX;
    }

    const t = clamp(y / summitY, 0, 1);
    const slope = mountain.slopeProfile || {};
    const summitSharpness = slope.summitSharpness != null ? slope.summitSharpness : 1.0;
    const roughnessMult = slope.roughness != null ? slope.roughness : 1.0;

    const baseSpread = MOUNTAIN_RIGHT_BASE_OFFSET || 1100;
    // Cierre progresivo: power > 1 hace que la mayor parte del cierre
    // ocurra en el tramo medio, dejando la base muy ancha y la cumbre
    // ya estrechada cuando se acerca al pico. summitSharpness afila el pico.
    const closeProfile = Math.pow(1 - t, 1.05 + (summitSharpness - 1) * 0.25) * baseSpread;

    const amp = mountain.faceAmp || 76;
    const roughnessScale =
      (0.30 + 0.45 * smoothstep(0.05, 0.65, 1 - t)) * roughnessMult;

    const rightWave =
      Math.sin((1 - t) * Math.PI * 5.2 + mountain.seed * 0.7) *
      amp *
      0.32 *
      roughnessScale;

    const rightWave2 =
      Math.sin((1 - t) * Math.PI * 13.1 + mountain.seed * 0.37) *
      amp *
      0.14 *
      roughnessScale;

    return plateauRightX + closeProfile + rightWave + rightWave2;
  }

  /* =====================================================
   *  15. CÁMARA — lerp X e Y al estilo dig-hole
   * ===================================================== */

  function updateCamera(dt) {
    if (!state.run) return;
    const climber = state.climber;
    const targetX = climber.x - state.width * CAMERA_HORIZONTAL_OFFSET_RATIO;
    const targetY = climber.y - state.height * CAMERA_VERTICAL_OFFSET_RATIO;
    state.cameraTargetX = targetX;
    state.cameraTargetY = targetY;
    state.cameraX = lerp(state.cameraX, targetX, CAMERA_LERP);
    state.cameraY = lerp(state.cameraY, targetY, CAMERA_LERP);

    const minY = state.run.mountain.layers[0].from - 80;
    const maxY = state.run.mountain.height + 200;
    if (state.cameraY < minY - state.height) {
      state.cameraY = minY - state.height;
    }
    if (state.cameraY > maxY) {
      state.cameraY = maxY;
    }
  }

  function updateParallax(dt) {
    for (const c of state.parallax.cloudsFar) {
      c.x += c.speed * 8 * dt;
      if (c.x > 1800) c.x = -200;
    }
    for (const c of state.parallax.cloudsNear) {
      c.x += c.speed * 16 * dt;
      if (c.x > 1800) c.x = -200;
    }
    for (const b of state.parallax.birds) {
      b.x += b.speed * dt;
      b.flap += dt * 6;
      if (b.x > 1800) b.x = -200;
    }
  }

  /* =====================================================
   *  16. RENDER
   * ===================================================== */

  function render() {
    const ctx = state.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, state.width, state.height);

    drawSky(ctx);
    drawStars(ctx);
    drawClouds(ctx);
    drawDistantPeaks(ctx);
    drawMidPeaks(ctx);

    if (state.run) {
      drawRockMass(ctx);
      drawBaseScene(ctx);
      drawSummitCap(ctx);
      drawHolds(ctx);
      drawLedges(ctx);
      drawCaveMouths(ctx);
      drawAnchor(ctx);
      drawSummitFlag(ctx);
      drawClimber(ctx);
      drawWeather(ctx);
      drawFog(ctx);
      drawAltitudeOverlay(ctx);
    }
  }

  /* ---- Cielo ---- */

  function drawSky(ctx) {
    const mountain = state.run ? state.run.mountain : null;
    const top = mountain ? mountain.sky[0] : "#8eb6e5";
    const bottom = mountain ? mountain.sky[1] : "#1d2a48";
    const grad = ctx.createLinearGradient(0, 0, 0, state.height);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, state.width, state.height);

    // Capa de neblina horizontal alta
    const layer = state.run ? currentLayer(state.climber.y) : null;
    if (layer && (layer.fog > 0 || layer.snow > 0)) {
      const fogAlpha = (layer.fog * 0.3) + (layer.snow * 0.2);
      ctx.fillStyle = `rgba(220, 230, 240, ${fogAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, state.width, state.height);
    }
  }

  function drawStars(ctx) {
    const climber = state.climber;
    const altitudeRatio = state.run
      ? climber.y / state.run.mountain.height
      : 0;
    const starsAlpha = clamp(altitudeRatio * 1.6 - 0.3, 0, 0.85);
    if (starsAlpha < 0.04) return;
    ctx.save();
    for (const s of state.parallax.stars) {
      const px = s.x - state.cameraX * PARALLAX_SKY;
      const py = s.y - state.cameraY * (PARALLAX_SKY * 0.8);
      if (px < -10 || px > state.width + 10) continue;
      if (py < -10 || py > state.height + 10) continue;
      const twinkle = 0.5 + 0.5 * Math.sin(state.elapsed * 2 + s.twinkle);
      ctx.fillStyle = `rgba(245, 250, 255, ${(starsAlpha * twinkle).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawClouds(ctx) {
    ctx.save();
    for (const c of state.parallax.cloudsFar) {
      const px = c.x - state.cameraX * PARALLAX_SKY;
      const py = c.y - state.cameraY * (PARALLAX_SKY * 0.6);
      if (px + c.size < 0 || px > state.width) continue;
      if (py + c.size < -50 || py > state.height + 50) continue;
      drawCloud(ctx, px, py, c.size, c.opacity * 0.78);
    }
    for (const c of state.parallax.cloudsNear) {
      const px = c.x - state.cameraX * PARALLAX_FAR_PEAKS;
      const py = c.y - state.cameraY * (PARALLAX_FAR_PEAKS * 0.6);
      if (px + c.size < 0 || px > state.width) continue;
      if (py + c.size < -50 || py > state.height + 50) continue;
      drawCloud(ctx, px, py, c.size, c.opacity);
    }
    for (const b of state.parallax.birds) {
      const px = b.x - state.cameraX * PARALLAX_FAR_PEAKS;
      const py = b.y - state.cameraY * (PARALLAX_FAR_PEAKS * 0.6);
      if (px < -10 || px > state.width + 10) continue;
      if (py < -10 || py > state.height + 10) continue;
      drawBird(ctx, px, py, b.scale, b.flap);
    }
    ctx.restore();
  }

  function drawCloud(ctx, x, y, size, alpha) {
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.ellipse(x + size * 0.6, y - size * 0.18, size * 0.7, size * 0.42, 0, 0, Math.PI * 2);
    ctx.ellipse(x - size * 0.55, y + size * 0.05, size * 0.55, size * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBird(ctx, x, y, scale, flap) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "rgba(20, 20, 30, 0.58)";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    const wing = Math.sin(flap) * 4;
    ctx.moveTo(-7, 0);
    ctx.quadraticCurveTo(-3, -3 - wing, 0, 0);
    ctx.quadraticCurveTo(3, -3 - wing, 7, 0);
    ctx.stroke();
    ctx.restore();
  }

  /* ---- Picos lejanos ---- */

  // Picos lejanos: cordillera triangular lejana (parallax horizontal lento).
  // Picos a posiciones fijas en el mundo, generados con seed determinístico.
  function drawDistantPeaks(ctx) {
    if (!state.run) return;
    const mountain = state.run.mountain;
    const baseY = state.height * 0.86 + state.cameraY * PARALLAX_FAR_PEAKS * 0.05;
    const camOffsetX = state.cameraX * PARALLAX_FAR_PEAKS * 0.7;
    ctx.save();
    ctx.fillStyle = darken(mountain.paletteRock, 0.46);
    ctx.beginPath();
    ctx.moveTo(-50, state.height);
    ctx.lineTo(-50, baseY);
    // Serie de triángulos (montañas) a lo largo del horizonte
    const peakCount = 7;
    const span = state.width + 200;
    for (let i = 0; i <= peakCount; i++) {
      const t = i / peakCount;
      const peakX = -50 + t * span - (camOffsetX % (span / peakCount));
      const seedJit = Math.sin((i + 3.1) * 12.9 + mountain.seed * 0.31);
      const peakHeight = 92 + (seedJit * 0.5 + 0.5) * 70;
      const halfBase = 56 + (Math.cos(i * 4.7 + mountain.seed) * 0.5 + 0.5) * 28;
      // Lado izquierdo del pico
      ctx.lineTo(peakX - halfBase, baseY);
      // Cima
      ctx.lineTo(peakX, baseY - peakHeight);
      // Lado derecho del pico
      ctx.lineTo(peakX + halfBase, baseY);
    }
    ctx.lineTo(state.width + 50, baseY);
    ctx.lineTo(state.width + 50, state.height);
    ctx.closePath();
    ctx.fill();

    // Capa de nieve blanquecina en las cimas más altas
    ctx.fillStyle = "rgba(220, 232, 244, 0.35)";
    for (let i = 0; i <= peakCount; i++) {
      const t = i / peakCount;
      const peakX = -50 + t * span - (camOffsetX % (span / peakCount));
      const seedJit = Math.sin((i + 3.1) * 12.9 + mountain.seed * 0.31);
      const peakHeight = 92 + (seedJit * 0.5 + 0.5) * 70;
      if (peakHeight < 130) continue;
      const halfBase = 56 + (Math.cos(i * 4.7 + mountain.seed) * 0.5 + 0.5) * 28;
      const snowCapY = baseY - peakHeight + 14;
      const snowHalf = halfBase * 0.36;
      ctx.beginPath();
      ctx.moveTo(peakX - snowHalf, snowCapY);
      ctx.lineTo(peakX, baseY - peakHeight);
      ctx.lineTo(peakX + snowHalf, snowCapY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Picos medios: cadena más cercana, triángulos más grandes y oscuros
  function drawMidPeaks(ctx) {
    if (!state.run) return;
    const mountain = state.run.mountain;
    const baseY = state.height * 0.94 + state.cameraY * PARALLAX_MID_PEAKS * 0.05;
    const camOffsetX = state.cameraX * PARALLAX_MID_PEAKS * 0.7;
    ctx.save();
    ctx.fillStyle = darken(mountain.paletteRock, 0.26);
    ctx.beginPath();
    ctx.moveTo(-80, state.height);
    ctx.lineTo(-80, baseY);
    const peakCount = 5;
    const span = state.width + 280;
    for (let i = 0; i <= peakCount; i++) {
      const t = i / peakCount;
      const peakX = -80 + t * span - (camOffsetX % (span / peakCount));
      const seedJit = Math.sin((i + 5.7) * 9.31 + mountain.seed * 0.51);
      const peakHeight = 140 + (seedJit * 0.5 + 0.5) * 110;
      const halfBase = 90 + (Math.cos(i * 3.3 + mountain.seed * 0.6) * 0.5 + 0.5) * 50;
      ctx.lineTo(peakX - halfBase, baseY);
      ctx.lineTo(peakX, baseY - peakHeight);
      ctx.lineTo(peakX + halfBase, baseY);
    }
    ctx.lineTo(state.width + 80, baseY);
    ctx.lineTo(state.width + 80, state.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ---- Masa de roca (cutaway) ---- */

  function drawMountainMaterialBands(ctx, mountain, camY) {
    const viewMin = camY - 140;
    const viewMax = camY + state.height + 140;

    for (const layer of mountain.layers) {
      if (layer.to < viewMin || layer.from > viewMax) continue;

      const syTop = state.height - (layer.to - camY);
      const syBottom = state.height - (layer.from - camY);
      const h = syBottom - syTop;
      if (h <= 0) continue;

      const base = layer.color || mountain.paletteRock;
      const grad = ctx.createLinearGradient(0, syTop, 0, syBottom);
      grad.addColorStop(0, darken(base, -0.10));
      grad.addColorStop(0.54, base);
      grad.addColorStop(1, darken(base, 0.18));
      ctx.fillStyle = grad;
      ctx.fillRect(-220, syTop, state.width + 820, h);
    }

    const snowStart = mountain.height * 0.84;
    if (viewMax >= snowStart) {
      const snowTop = state.height - (mountain.height - camY);
      const snowBottom = state.height - (snowStart - camY);
      const snowGrad = ctx.createLinearGradient(0, snowTop, 0, snowBottom);
      snowGrad.addColorStop(0, "rgba(255,255,255,0.72)");
      snowGrad.addColorStop(1, "rgba(220,235,240,0)");
      ctx.fillStyle = snowGrad;
      ctx.fillRect(-220, snowTop - 20, state.width + 820, snowBottom - snowTop + 40);
    }
  }

  function drawRockMass(ctx) {
    const mountain = state.run.mountain;
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();

    const summitY = mountain.height;
    const summitFaceX = sampleFaceX(summitY);
    const plateauRightX = summitFaceX + SUMMIT_PLATEAU_WIDTH;

    const minY = camY;
    const maxY = camY + state.height;
    const samples = 56;

    // Helper que traza la silueta cerrada de la montaña (cara izquierda hasta
    // el pico, esplanada plana y cara derecha que baja). Acepta un offset
    // horizontal hacia adentro para dibujar la capa "interior" más clara.
    function pathSilhouette(faceOffset) {
      ctx.beginPath();
      // Empieza fuera de pantalla a la izquierda al fondo
      const bottomCanvasY = state.height + 80;
      ctx.moveTo(-200, bottomCanvasY);

      // Cara izquierda (climbable) desde la base hasta la cumbre
      const startY = Math.max(minY - 80, 0);
      const endY = Math.min(maxY + 80, summitY);
      const usableSamples = Math.max(8, Math.floor(samples * (endY - startY) / (maxY - minY)));
      for (let i = 0; i <= usableSamples; i++) {
        const wy = startY + (i / usableSamples) * (endY - startY);
        const wx = sampleFaceX(wy) + faceOffset;
        const sx = wx - camX;
        const sy = state.height - (wy - camY);
        ctx.lineTo(sx, sy);
      }

      // Si la cumbre es visible, añade esplanada y cara derecha
      if (endY >= summitY - 0.5) {
        const summitScreenY = state.height - (summitY - camY);
        // Esplanada (slight inclination para look natural)
        ctx.lineTo(summitFaceX + faceOffset - camX, summitScreenY);
        ctx.lineTo(plateauRightX - faceOffset - camX, summitScreenY);
        // Cara derecha bajando con curva
        const rightSamples = 18;
        for (let i = 1; i <= rightSamples; i++) {
          const t = i / rightSamples;
          const wy = summitY - t * (summitY - 0);
          const wx = sampleRightX(wy) - faceOffset;
          const sx = wx - camX;
          const sy = state.height - (wy - camY);
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(state.width + 800, bottomCanvasY);
      } else {
        // Cumbre no visible: cierre por arriba y derecha como antes
        ctx.lineTo(state.width + 200, -50);
        ctx.lineTo(state.width + 200, bottomCanvasY);
      }
      ctx.lineTo(-200, bottomCanvasY);
      ctx.closePath();
    }

    // Capa profunda de roca
    ctx.fillStyle = mountain.paletteRockDeep;
    pathSilhouette(0);
    ctx.fill();

    // Capa más clara, ligeramente metida hacia adentro (luz lateral)
    ctx.save();
    pathSilhouette(18);
    ctx.clip();
    drawMountainMaterialBands(ctx, mountain, camY);
    ctx.restore();

    ctx.globalAlpha = 0.18;
    ctx.fillStyle = mountain.paletteRock;
    pathSilhouette(18);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Texturas (vetas) - ruido determinístico
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 18; i++) {
      const yWorld = camY + (i + 1) * (state.height / 18);
      const layer = currentLayer(yWorld) || { color: mountain.paletteRock };
      const wx = sampleFaceX(yWorld) + 30 + Math.sin(i * 1.3 + state.elapsed * 0.05) * 8;
      const sy = state.height - (yWorld - camY);
      ctx.strokeStyle = darken(layer.color || mountain.paletteRock, -0.18);
      ctx.beginPath();
      ctx.moveTo(wx - camX, sy);
      ctx.lineTo(wx - camX + 80, sy + 14);
      ctx.stroke();
    }

    // Bordes de pared (highlight) sobre la cara izquierda visible
    ctx.strokeStyle = mountain.paletteAccent;
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    const hlStart = Math.max(minY - 20, 0);
    const hlEnd = Math.min(maxY + 20, summitY);
    const hlSamples = samples;
    for (let i = 0; i <= hlSamples; i++) {
      const wy = hlStart + (i / hlSamples) * (hlEnd - hlStart);
      const wx = sampleFaceX(wy);
      const sx = wx - camX;
      const sy = state.height - (wy - camY);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    // Si la cumbre es visible, dibujar borde superior (esplanada) y línea de cumbre derecha
    if (hlEnd >= summitY - 0.5) {
      const summitScreenY = state.height - (summitY - camY);
      ctx.beginPath();
      ctx.moveTo(summitFaceX - camX, summitScreenY);
      ctx.lineTo(plateauRightX - camX, summitScreenY);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function darken(hex, amount) {
    const c = hexToRgb(hex);
    if (!c) return hex;
    const r = clamp(Math.round(c.r * (1 - amount)), 0, 255);
    const g = clamp(Math.round(c.g * (1 - amount)), 0, 255);
    const b = clamp(Math.round(c.b * (1 - amount)), 0, 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function hexToRgb(hex) {
    if (typeof hex !== "string") return null;
    let s = hex.replace("#", "");
    if (s.length === 3) {
      s = s.split("").map((c) => c + c).join("");
    }
    if (s.length !== 6) return null;
    return {
      r: parseInt(s.substr(0, 2), 16),
      g: parseInt(s.substr(2, 2), 16),
      b: parseInt(s.substr(4, 2), 16),
    };
  }

  /* ---- Suelo + caseta de salida (escena base) ---- */

  function drawBaseScene(ctx) {
    if (!state.run) return;
    const mountain = state.run.mountain;
    const camX = state.cameraX;
    const camY = state.cameraY;
    const groundWorldY = mountain.layers[0].from + HUT_GROUND_Y_OFFSET;
    const groundScreenY = state.height - (groundWorldY - camY);
    if (groundScreenY < -40 || groundScreenY > state.height + 80) return;

    ctx.save();

    // Tira de tierra que va desde el lateral izquierdo del lienzo hasta donde
    // empieza la roca (sampleFaceX al nivel del suelo). Encima, hierba/musgo.
    const faceX = sampleFaceX(groundWorldY);
    const screenFaceX = faceX - camX;
    const groundLeftScreen = -40;
    const groundRightScreen = Math.min(screenFaceX + 6, state.width + 40);

    if (groundRightScreen > groundLeftScreen) {
      // Tierra: extiende desde el suelo hasta el borde inferior, siguiendo
      // la cara curva de la roca para no solapar la pared.
      ctx.fillStyle = "#3a2e22";
      ctx.beginPath();
      ctx.moveTo(groundLeftScreen, groundScreenY);
      // Borde superior derecho: sigue la curva de la pared bajando
      const followSamples = 14;
      for (let i = 0; i <= followSamples; i++) {
        const t = i / followSamples;
        const wy = groundWorldY - t * (state.height + 80);
        const wxFace = sampleFaceX(wy);
        const sxFace = wxFace - camX;
        const syHere = state.height - (wy - camY);
        ctx.lineTo(Math.min(sxFace + 4, state.width + 40), syHere);
      }
      ctx.lineTo(groundLeftScreen, state.height + 40);
      ctx.closePath();
      ctx.fill();

      // Capa más clara cerca de la superficie (gradiente)
      const earthGrad = ctx.createLinearGradient(
        0,
        groundScreenY - 4,
        0,
        groundScreenY + GROUND_STRIP_HEIGHT + 10
      );
      earthGrad.addColorStop(0, "#5a4a36");
      earthGrad.addColorStop(1, "rgba(58, 46, 34, 0)");
      ctx.fillStyle = earthGrad;
      ctx.fillRect(
        groundLeftScreen,
        groundScreenY,
        groundRightScreen - groundLeftScreen,
        GROUND_STRIP_HEIGHT + 10
      );

      // Hierba superior
      ctx.fillStyle = "#5a7a3d";
      ctx.fillRect(
        groundLeftScreen,
        groundScreenY - 3,
        groundRightScreen - groundLeftScreen,
        4
      );

      // Briznas y matas
      ctx.strokeStyle = "#3e5a2a";
      ctx.lineWidth = 1.1;
      for (let gx = groundLeftScreen + 8; gx < groundRightScreen - 4; gx += 11) {
        const seed = Math.sin(gx * 0.13 + mountain.seed) * 0.5 + 0.5;
        const h = 3 + seed * 4;
        ctx.beginPath();
        ctx.moveTo(gx, groundScreenY - 1);
        ctx.lineTo(gx + 1.6, groundScreenY - h);
        ctx.stroke();
      }

      // Pequeñas piedras
      ctx.fillStyle = "#777067";
      for (let i = 0; i < 7; i++) {
        const sx = groundLeftScreen + 22 + i * 36 + Math.sin(i + mountain.seed) * 6;
        if (sx > groundRightScreen - 4) break;
        ctx.beginPath();
        ctx.ellipse(sx, groundScreenY + 4, 3 + (i % 2) * 1.2, 1.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Caseta de salida: cabaña de madera con techo y chimenea
    const hutScreenX = HUT_X - camX;
    const hutBaseY = groundScreenY;
    drawHutSilhouette(ctx, hutScreenX, hutBaseY, state.intro);

    ctx.restore();
  }

  function drawHutSilhouette(ctx, hutScreenX, hutBaseY, intro) {
    if (hutScreenX < -120 || hutScreenX > state.width + 120) return;
    ctx.save();
    ctx.translate(hutScreenX, hutBaseY);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 36, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo: rectángulo de troncos
    const bodyW = 56;
    const bodyH = 38;
    ctx.fillStyle = "#7a512f";
    ctx.fillRect(-bodyW / 2, -bodyH, bodyW, bodyH);
    // Vetas de troncos horizontales
    ctx.strokeStyle = "rgba(40, 22, 8, 0.55)";
    ctx.lineWidth = 1.2;
    for (let y = -bodyH + 6; y < 0; y += 6) {
      ctx.beginPath();
      ctx.moveTo(-bodyW / 2 + 2, y);
      ctx.lineTo(bodyW / 2 - 2, y);
      ctx.stroke();
    }

    // Techo: triángulo a dos aguas
    ctx.fillStyle = "#3e2a1c";
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 - 4, -bodyH);
    ctx.lineTo(0, -bodyH - 18);
    ctx.lineTo(bodyW / 2 + 4, -bodyH);
    ctx.closePath();
    ctx.fill();
    // Borde frontal del techo
    ctx.strokeStyle = "#22140a";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 - 4, -bodyH);
    ctx.lineTo(0, -bodyH - 18);
    ctx.lineTo(bodyW / 2 + 4, -bodyH);
    ctx.stroke();

    // Chimenea
    ctx.fillStyle = "#4a3528";
    ctx.fillRect(bodyW / 2 - 16, -bodyH - 14, 8, 10);
    ctx.fillStyle = "#2a1c14";
    ctx.fillRect(bodyW / 2 - 17, -bodyH - 14, 10, 2);

    // Humo animado
    const t2 = state.elapsed * 0.6;
    ctx.fillStyle = "rgba(220, 220, 220, 0.65)";
    for (let i = 0; i < 3; i++) {
      const phase = t2 + i * 0.7;
      const px = bodyW / 2 - 12 + Math.sin(phase) * 3;
      const py = -bodyH - 18 - i * 7;
      const r = 3 + i * 1.1;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ventana iluminada (lado izquierdo)
    ctx.fillStyle = "#ffd28a";
    ctx.fillRect(-bodyW / 2 + 6, -bodyH + 8, 12, 10);
    ctx.strokeStyle = "#2a1c14";
    ctx.lineWidth = 1;
    ctx.strokeRect(-bodyW / 2 + 6, -bodyH + 8, 12, 10);
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 + 12, -bodyH + 8);
    ctx.lineTo(-bodyW / 2 + 12, -bodyH + 18);
    ctx.moveTo(-bodyW / 2 + 6, -bodyH + 13);
    ctx.lineTo(-bodyW / 2 + 18, -bodyH + 13);
    ctx.stroke();

    // Puerta (animada en el intro)
    let doorOpen = 1;
    if (intro && intro.active && intro.phase === "door") {
      doorOpen = clamp(intro.timer / INTRO_DOOR_DURATION, 0, 1);
    } else if (intro && intro.active && intro.phase === "walk") {
      doorOpen = 1;
    } else {
      doorOpen = 0; // cerrada cuando ya está fuera
    }
    const doorW = 14;
    const doorH = 22;
    const doorX = bodyW / 2 - 10 - doorW;
    const doorY = -doorH;
    // Marco oscuro (interior visible)
    ctx.fillStyle = "#1a0e06";
    ctx.fillRect(doorX, doorY, doorW, doorH);
    // Hoja de la puerta abriéndose hacia fuera (rotación simulada con escala X)
    const doorScale = 1 - doorOpen * 0.85;
    if (doorScale > 0.05) {
      ctx.save();
      ctx.translate(doorX, doorY);
      ctx.scale(doorScale, 1);
      ctx.fillStyle = "#5a3a22";
      ctx.fillRect(0, 0, doorW, doorH);
      ctx.strokeStyle = "#22140a";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0.5, 0.5, doorW - 1, doorH - 1);
      ctx.fillStyle = "#d8c08a";
      ctx.beginPath();
      ctx.arc(doorW - 3, doorH * 0.55, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Cartelito "Base"
    ctx.fillStyle = "rgba(255, 246, 220, 0.92)";
    ctx.fillRect(-bodyW / 2 - 2, -bodyH - 3, 18, 8);
    ctx.fillStyle = "#3a2614";
    ctx.font = "bold 6px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("BASE", -bodyW / 2 + 7, -bodyH + 1);

    ctx.restore();
  }

  /* ---- Cumbre: esplanada + bandera ---- */

  function drawSummitCap(ctx) {
    if (!state.run) return;
    const mountain = state.run.mountain;
    const camX = state.cameraX;
    const camY = state.cameraY;
    const summitY = mountain.height;
    const summitScreenY = state.height - (summitY - camY);
    if (summitScreenY < -40 || summitScreenY > state.height + 40) return;

    const summitFaceX = sampleFaceX(summitY);
    const plateauRightX = summitFaceX + SUMMIT_PLATEAU_WIDTH;
    const leftScreen = summitFaceX - camX;
    const rightScreen = plateauRightX - camX;

    ctx.save();
    // Capa de nieve / hielo cubriendo la esplanada y bajando un poco por las dos caras
    const snowGrad = ctx.createLinearGradient(
      0,
      summitScreenY - 14,
      0,
      summitScreenY + 22
    );
    snowGrad.addColorStop(0, "#ffffff");
    snowGrad.addColorStop(0.55, "#e7eef6");
    snowGrad.addColorStop(1, "rgba(220, 230, 240, 0)");
    ctx.fillStyle = snowGrad;

    // Path del manto de nieve: empieza abajo a la izquierda (en la cara
    // izquierda, ~dropDepth px por debajo del pico), sube por la cara hasta
    // el pico, cruza la esplanada con cresta ondulada, y baja por la cara
    // derecha la misma profundidad. Se cierra por debajo del pico.
    const dropDepth = 70;
    const dropSamples = 10;
    ctx.beginPath();

    // Cara izquierda: subir desde dropDepth abajo hasta el pico
    for (let i = 0; i <= dropSamples; i++) {
      const t = i / dropSamples;
      const wy = (summitY - dropDepth) + dropDepth * t;
      const wx = sampleFaceX(wy) - 0.5;
      const sx = wx - camX;
      const sy = state.height - (wy - camY);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    // Cresta de nieve sobre la esplanada (ondulación leve)
    const ridgeSamples = 12;
    for (let i = 1; i <= ridgeSamples; i++) {
      const t = i / ridgeSamples;
      const sx = leftScreen + (rightScreen - leftScreen) * t;
      const wave = Math.sin(t * Math.PI * 3 + mountain.seed * 0.4) * 2.4;
      ctx.lineTo(sx, summitScreenY - 7 - wave);
    }
    // Cara derecha: bajar desde el pico hasta dropDepth abajo
    for (let i = 0; i <= dropSamples; i++) {
      const t = i / dropSamples;
      const wy = summitY - dropDepth * t;
      const wx = sampleRightX(wy) + 0.5;
      const sx = wx - camX;
      const sy = state.height - (wy - camY);
      ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();

    // Brillo / highlight superior
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.beginPath();
    ctx.ellipse(
      (leftScreen + rightScreen) / 2,
      summitScreenY - 5,
      (rightScreen - leftScreen) * 0.42,
      2.4,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Pequeñas rocas asomando en la esplanada
    ctx.fillStyle = darken(mountain.paletteRock, 0.18);
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4;
      const sx = leftScreen + (rightScreen - leftScreen) * t;
      ctx.beginPath();
      ctx.ellipse(sx, summitScreenY - 2, 4, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSummitFlag(ctx) {
    if (!state.run) return;
    const mountain = state.run.mountain;
    const camX = state.cameraX;
    const camY = state.cameraY;
    const summitY = mountain.height;
    const summitFaceX = sampleFaceX(summitY);
    const flagX = summitFaceX + SUMMIT_FLAG_OFFSET;
    const summitScreenY = state.height - (summitY - camY);
    if (summitScreenY < -120 || summitScreenY > state.height + 60) return;

    const sx = flagX - camX;
    const baseY = summitScreenY - 6; // sobre la nieve

    ctx.save();

    // Sombra del mástil sobre la nieve
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(sx + 2, baseY + 2, 6, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mástil
    ctx.strokeStyle = "#3a2814";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    const poleHeight = 52;
    ctx.beginPath();
    ctx.moveTo(sx, baseY);
    ctx.lineTo(sx, baseY - poleHeight);
    ctx.stroke();

    // Punta dorada
    ctx.fillStyle = "#f6c85f";
    ctx.beginPath();
    ctx.arc(sx, baseY - poleHeight - 1, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Tela ondeando: triángulo con vértice derecho oscilando
    const wave = Math.sin(state.elapsed * 5) * 4;
    const flagW = 26;
    const flagH = 16;
    const flagTop = baseY - poleHeight + 2;
    const flagBottom = flagTop + flagH;

    const flagGrad = ctx.createLinearGradient(sx, flagTop, sx, flagBottom);
    flagGrad.addColorStop(0, "#ff5b3a");
    flagGrad.addColorStop(1, "#c8331f");
    ctx.fillStyle = flagGrad;
    ctx.beginPath();
    ctx.moveTo(sx + 1, flagTop);
    ctx.quadraticCurveTo(
      sx + flagW * 0.5 + wave * 0.4,
      flagTop + flagH * 0.18 + wave,
      sx + flagW + wave,
      flagTop + flagH * 0.5
    );
    ctx.quadraticCurveTo(
      sx + flagW * 0.5 + wave * 0.4,
      flagBottom - flagH * 0.18 - wave,
      sx + 1,
      flagBottom
    );
    ctx.closePath();
    ctx.fill();
    // Borde de la tela
    ctx.strokeStyle = "rgba(80, 24, 12, 0.6)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // Pliegue claro
    ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx + 4, flagTop + flagH * 0.32);
    ctx.quadraticCurveTo(
      sx + flagW * 0.5 + wave * 0.3,
      flagTop + flagH * 0.42 + wave * 0.5,
      sx + flagW * 0.85 + wave * 0.6,
      flagTop + flagH * 0.5
    );
    ctx.stroke();

    // Texto pequeño de cumbre conseguida (cuando el caminante llega)
    if (state.summitWalk.active) {
      ctx.fillStyle = "rgba(255, 250, 230, 0.92)";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("CUMBRE", sx, baseY - poleHeight - 6);
    }

    ctx.restore();
  }

  /* ---- Holds (presas) ---- */

  function drawHolds(ctx) {
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    for (const hold of state.run.holds) {
      const sx = hold.x - camX;
      const sy = state.height - (hold.y - camY);
      if (sx < -50 || sx > state.width + 50) continue;
      if (sy < -50 || sy > state.height + 50) continue;
      ctx.beginPath();
      ctx.fillStyle = hold.color;
      ctx.shadowColor = "rgba(0,0,0,0.32)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.arc(sx, sy, hold.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      // outline sutil
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = darken(hold.color, 0.28);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ---- Ledges ---- */

  function drawLedges(ctx) {
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    ctx.fillStyle = "rgba(20, 26, 38, 0.8)";
    for (const ledge of state.run.ledges) {
      const sx = ledge.x - camX;
      const sy = state.height - (ledge.y - camY);
      if (sx < -100 || sx > state.width + 100) continue;
      if (sy < -50 || sy > state.height + 80) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(ledge.tilt);
      ctx.fillRect(-ledge.length / 2, -4, ledge.length, 8);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---- Cave mouths ---- */

  function drawCaveMouths(ctx) {
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    for (const cave of state.run.caves) {
      if (cave.taken) continue;
      // Boca anclada a la pared real (no a un offset fijo)
      const faceAtMouth = sampleFaceX(cave.mouthY);
      const mouthScreenX = faceAtMouth - camX;
      const sy = state.height - (cave.mouthY - camY);
      if (mouthScreenX < -120 || mouthScreenX > state.width + 120) continue;
      if (sy < -120 || sy > state.height + 120) continue;

      // Canal: entra hacia la derecha (dentro de la roca) con perspectiva.
      // Boca exterior alta y estrecha; fondo muy oscuro con luz cálida al final.
      const mouthHalfH = 18;
      const channelLen = 56;
      const backHalfH = 9;

      // Arco exterior (recortado en la roca): degradado oscuro
      const grad = ctx.createLinearGradient(
        mouthScreenX,
        sy,
        mouthScreenX + channelLen,
        sy
      );
      grad.addColorStop(0, "rgba(28, 16, 6, 0.94)");
      grad.addColorStop(0.55, "rgba(56, 26, 8, 0.92)");
      grad.addColorStop(1, "rgba(255, 168, 80, 0.95)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(mouthScreenX - 2, sy - mouthHalfH);
      // Arco superior con leve curvatura
      ctx.quadraticCurveTo(
        mouthScreenX + channelLen * 0.5,
        sy - mouthHalfH - 2,
        mouthScreenX + channelLen,
        sy - backHalfH
      );
      // Pared del fondo (corta)
      ctx.lineTo(mouthScreenX + channelLen, sy + backHalfH);
      // Arco inferior
      ctx.quadraticCurveTo(
        mouthScreenX + channelLen * 0.5,
        sy + mouthHalfH + 2,
        mouthScreenX - 2,
        sy + mouthHalfH
      );
      ctx.closePath();
      ctx.fill();

      // Bordes irregulares de roca (pequeñas estalactitas/estalagmitas)
      ctx.fillStyle = "rgba(15, 8, 4, 0.95)";
      for (let i = 0; i < 5; i++) {
        const tx = mouthScreenX + 4 + i * (channelLen * 0.18);
        const r = 2 + (i % 2);
        ctx.beginPath();
        ctx.moveTo(tx - r, sy - mouthHalfH + (i % 2) * 1);
        ctx.lineTo(tx, sy - mouthHalfH + 5 + (i % 2) * 1.5);
        ctx.lineTo(tx + r, sy - mouthHalfH + (i % 2) * 1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tx - r, sy + mouthHalfH - (i % 2) * 1);
        ctx.lineTo(tx, sy + mouthHalfH - 5 - (i % 2) * 1.5);
        ctx.lineTo(tx + r, sy + mouthHalfH - (i % 2) * 1);
        ctx.closePath();
        ctx.fill();
      }

      // Halo cálido proyectándose hacia fuera del canal
      const halo = ctx.createRadialGradient(
        mouthScreenX + channelLen - 4,
        sy,
        2,
        mouthScreenX - 8,
        sy,
        70
      );
      halo.addColorStop(0, "rgba(255, 200, 120, 0.65)");
      halo.addColorStop(0.4, "rgba(255, 150, 70, 0.22)");
      halo.addColorStop(1, "rgba(255, 130, 50, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.ellipse(
        mouthScreenX - 6,
        sy,
        46,
        mouthHalfH + 8,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Pequeña silueta de la caseta al fondo (cabaña en miniatura)
      const hutBackX = mouthScreenX + channelLen - 14;
      ctx.fillStyle = "rgba(20, 10, 4, 0.92)";
      ctx.fillRect(hutBackX - 5, sy - 5, 10, 10);
      ctx.beginPath();
      ctx.moveTo(hutBackX - 6, sy - 5);
      ctx.lineTo(hutBackX, sy - 10);
      ctx.lineTo(hutBackX + 6, sy - 5);
      ctx.closePath();
      ctx.fill();
      // Ventana cálida
      ctx.fillStyle = "rgba(255, 220, 140, 0.92)";
      ctx.fillRect(hutBackX - 2, sy - 2, 4, 4);

      // Línea de suelo del canal (suelo de roca)
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mouthScreenX - 2, sy + mouthHalfH - 1);
      ctx.lineTo(mouthScreenX + channelLen, sy + backHalfH - 1);
      ctx.stroke();

      // Marca "E" si el climber está cerca
      const climber = state.climber;
      if (Math.abs(climber.y - cave.mouthY) < 60 && !state.intro.active) {
        ctx.fillStyle = "rgba(255, 246, 220, 0.95)";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("E", mouthScreenX - 14, sy);
        ctx.strokeStyle = "rgba(255, 246, 220, 0.6)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(mouthScreenX - 14, sy, 7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---- Anchor + cuerda ---- */

  function drawAnchor(ctx) {
    const climber = state.climber;
    if (state.intro.active) return;
    if (hasAnchorThrow()) {
      drawAnchorThrow(ctx);
    }
    if (!hasActiveAnchor()) return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    const sx = state.anchor.x - camX;
    const sy = state.height - (state.anchor.y - camY);
    const px = climber.x - camX;
    const py = state.height - (climber.y - camY) - 4; // arnés (cintura)

    const visible = sx >= -30 && sx <= state.width + 30 && sy >= -30 && sy <= state.height + 30;

    if (visible) {
      ctx.save();
      // Mástil del piolet hundido en la roca: sale ligeramente hacia el climber
      ctx.strokeStyle = "#5a4630";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      const shaftDx = -8; // hacia el climber (izquierda)
      const shaftDy = -2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + shaftDx, sy + shaftDy);
      ctx.stroke();

      // Cabeza del piolet clavada en la roca (forma de T)
      ctx.strokeStyle = "#cfd4d9";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(sx - 3, sy - 4);
      ctx.lineTo(sx + 4, sy + 4);
      ctx.stroke();
      // Punta hundida en la roca
      ctx.fillStyle = "#9aa1a8";
      ctx.beginPath();
      ctx.arc(sx + 4, sy + 4, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Pequeño polvo de roca debajo (residuo del impacto)
      ctx.fillStyle = "rgba(220, 210, 200, 0.32)";
      ctx.beginPath();
      ctx.ellipse(sx + 1, sy + 6, 5, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mosquetón naranja desde el piolet
      ctx.strokeStyle = "#e08020";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(sx + shaftDx - 1, sy + shaftDy + 2, 2.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Cuerda desde el mosquetón al arnés
    ctx.save();
    ctx.strokeStyle = "rgba(214, 130, 60, 0.92)";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    const ax = sx - 9;
    const ay = sy - 0;
    ctx.moveTo(ax, ay);
    const ctrlX = (ax + px) / 2 - 6;
    const ctrlY = Math.max(ay, py) + 14;
    ctx.quadraticCurveTo(ctrlX, ctrlY, px, py);
    ctx.stroke();
    ctx.restore();
  }

  function drawAnchorThrow(ctx) {
    const throwState = state.anchorThrow;
    if (!throwState || !throwState.active) return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    const pos = anchorThrowPosition(throwState);
    const prev = anchorThrowPosition({
      ...throwState,
      elapsed: Math.max(0, throwState.elapsed - 0.035),
    });
    const pocket = climberPocketWorld();
    const sx = pos.x - camX;
    const sy = state.height - (pos.y - camY);
    const prevSx = prev.x - camX;
    const prevSy = state.height - (prev.y - camY);
    const pocketSx = pocket.x - camX;
    const pocketSy = state.height - (pocket.y - camY);
    const angle = Math.atan2(sy - prevSy, sx - prevSx);

    ctx.save();
    ctx.strokeStyle = "rgba(214, 130, 60, 0.46)";
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(pocketSx, pocketSy);
    ctx.quadraticCurveTo(
      (pocketSx + sx) * 0.5 - 18,
      Math.min(pocketSy, sy) - 38,
      sx,
      sy
    );
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(sx, sy);
    ctx.rotate(angle);
    ctx.strokeStyle = "#5a4630";
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(8, 0);
    ctx.stroke();
    ctx.strokeStyle = "#d7dce2";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(4, -5);
    ctx.lineTo(10, 4);
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 214, 120, 0.95)";
    ctx.beginPath();
    ctx.arc(-12, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---- Climber rig ---- */

  function drawClimber(ctx) {
    const climber = state.climber;
    // Durante la apertura de la puerta, el climber sigue dentro de la caseta:
    // no se dibuja hasta que la puerta esté abierta y empiece a caminar.
    if (state.intro.active && state.intro.phase === "door") return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    const sx = climber.x - camX;
    const sy = state.height - (climber.y - camY);

    if (sx < -80 || sx > state.width + 80) return;
    if (sy < -80 || sy > state.height + 80) return;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(climber.bodyTilt);
    if (climber.facing < 0) {
      ctx.scale(-1, 1);
    }

    // sombra
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // piernas
    drawClimberLegs(ctx, climber);
    // torso
    drawClimberTorso(ctx, climber);
    // brazos
    drawClimberArms(ctx, climber);
    // cabeza
    drawClimberHead(ctx, climber);

    ctx.restore();
  }

  function drawClimberLegs(ctx, climber) {
    const swing = Math.sin(climber.legSwing) * 8;
    ctx.save();
    ctx.strokeStyle = "#3b3a4a";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    // Pierna izquierda
    ctx.beginPath();
    ctx.moveTo(-3, 4);
    ctx.lineTo(-6, 14 + swing);
    ctx.lineTo(-2, 22 + swing * 0.5);
    ctx.stroke();
    // Pierna derecha
    ctx.beginPath();
    ctx.moveTo(3, 4);
    ctx.lineTo(6, 14 - swing);
    ctx.lineTo(2, 22 - swing * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  function drawClimberTorso(ctx, climber) {
    ctx.save();
    // Mochila
    ctx.fillStyle = "#a3604c";
    ctx.fillRect(-7, -8, 14, 14);
    // Torso
    ctx.fillStyle = "#f06544";
    ctx.fillRect(-6, -10, 12, 14);
    // Cinturón
    ctx.fillStyle = "#f6c85f";
    ctx.fillRect(-7, 2, 14, 3);
    ctx.restore();
  }

  function drawClimberArms(ctx, climber) {
    const sway = Math.sin(climber.armSwing) * 4;
    const swingT = climber.anchorSwingTimer > 0
      ? 1 - climber.anchorSwingTimer / ANCHOR_SWING_DURATION
      : 0;

    ctx.save();
    ctx.strokeStyle = "#f06544";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // En la cumbre: pose erguida, brazos al costado oscilando como caminata
    if (state.summitWalk && state.summitWalk.active) {
      const walkSwing = Math.sin(climber.armSwing) * 6;
      // Brazo izquierdo balanceando hacia atrás
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(-7 - walkSwing * 0.3, 2);
      ctx.lineTo(-6 - walkSwing * 0.6, 10);
      ctx.stroke();
      // Brazo derecho contrario
      ctx.beginPath();
      ctx.moveTo(5, -5);
      ctx.lineTo(7 + walkSwing * 0.3, 2);
      ctx.lineTo(6 + walkSwing * 0.6, 10);
      ctx.stroke();
      // Cuando llega a la bandera: brazo levantado en celebración
      if (state.summitWalk.completed) {
        const cheer = Math.sin(state.elapsed * 6) * 0.4;
        ctx.beginPath();
        ctx.moveTo(5, -5);
        ctx.lineTo(8 + cheer * 2, -16);
        ctx.lineTo(10 + cheer * 3, -26 - Math.abs(cheer) * 4);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    // Brazo izquierdo (mano de apoyo en la pared)
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(-12 - sway, -10);
    ctx.lineTo(-15 - sway, -16);
    ctx.stroke();

    // Brazo derecho: en swing arquea, sube y golpea hacia la roca con el piolet.
    // Curva: 0..0.45 levantar el piolet, 0.45..0.85 golpe descendente, 0.85..1.0 reposo.
    let elbowX = 11 + sway;
    let elbowY = -12;
    let handX = 13 + sway;
    let handY = -18;
    let pickShaftEndX = handX + 7;
    let pickShaftEndY = handY - 6;
    let pickHeadX = pickShaftEndX + 2;
    let pickHeadY = pickShaftEndY + 1;

    if (swingT > 0) {
      let phase;
      if (swingT < 0.45) {
        // levantar el piolet por encima de la cabeza
        phase = swingT / 0.45;
        const e = easeOutCubic(phase);
        elbowX = lerp(11, 6, e);
        elbowY = lerp(-12, -22, e);
        handX = lerp(13, 9, e);
        handY = lerp(-18, -32, e);
        pickShaftEndX = handX + lerp(7, 14, e);
        pickShaftEndY = handY + lerp(-6, -14, e);
      } else if (swingT < 0.85) {
        // golpe: cae con fuerza hacia la pared (arriba/derecha)
        phase = (swingT - 0.45) / 0.4;
        const e = easeOutCubic(phase);
        elbowX = lerp(6, 14, e);
        elbowY = lerp(-22, -16, e);
        handX = lerp(9, 18, e);
        handY = lerp(-32, -22, e);
        pickShaftEndX = handX + lerp(14, 14, e);
        pickShaftEndY = handY + lerp(-14, 0, e);
      } else {
        // reposo breve tras el golpe
        phase = (swingT - 0.85) / 0.15;
        const e = easeOutCubic(phase);
        elbowX = lerp(14, 11, e);
        elbowY = lerp(-16, -12, e);
        handX = lerp(18, 13, e);
        handY = lerp(-22, -18, e);
        pickShaftEndX = handX + lerp(14, 7, e);
        pickShaftEndY = handY + lerp(0, -6, e);
      }
      pickHeadX = pickShaftEndX + 2;
      pickHeadY = pickShaftEndY + 1;
    }

    ctx.beginPath();
    ctx.moveTo(5, -5);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Mástil del piolet en mano derecha
    ctx.strokeStyle = "#7a6347";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(pickShaftEndX, pickShaftEndY);
    ctx.stroke();

    // Cabeza del piolet (forma de T)
    ctx.strokeStyle = "#9aa1a8";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(pickShaftEndX - 4, pickShaftEndY + 2);
    ctx.lineTo(pickShaftEndX + 5, pickShaftEndY - 2);
    ctx.stroke();
    ctx.fillStyle = "#cdd2d7";
    ctx.beginPath();
    ctx.arc(pickHeadX, pickHeadY, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Destello en el momento del impacto
    if (swingT > 0.78 && swingT < 0.92) {
      ctx.fillStyle = "rgba(255, 230, 160, 0.85)";
      ctx.beginPath();
      ctx.arc(pickShaftEndX + 2, pickShaftEndY, 4.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawClimberHead(ctx, climber) {
    ctx.save();
    ctx.fillStyle = "#fbe0c4";
    ctx.beginPath();
    ctx.arc(0, -14, 4.4, 0, Math.PI * 2);
    ctx.fill();
    // casco
    ctx.fillStyle = "#f8c54e";
    ctx.beginPath();
    ctx.ellipse(0, -16, 5.2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // ojo
    ctx.fillStyle = "#22202b";
    ctx.beginPath();
    ctx.arc(1.4, -13.5, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---- Weather render ---- */

  function drawWeather(ctx) {
    drawSnow(ctx);
    drawRain(ctx);
    drawWindStreaks(ctx);
    drawSparks(ctx);
  }

  function drawSnow(ctx) {
    if (state.weather.snowflakes.length === 0) return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    for (const s of state.weather.snowflakes) {
      const sx = s.x - camX;
      const sy = state.height - (s.y - camY);
      if (sx < -10 || sx > state.width + 10) continue;
      if (sy < -10 || sy > state.height + 10) continue;
      ctx.fillStyle = `rgba(245, 250, 255, ${s.alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRain(ctx) {
    if (state.weather.raindrops.length === 0) return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    ctx.strokeStyle = "rgba(140, 180, 220, 0.6)";
    ctx.lineWidth = 1.2;
    for (const r of state.weather.raindrops) {
      const sx = r.x - camX;
      const sy = state.height - (r.y - camY);
      if (sx < -10 || sx > state.width + 10) continue;
      if (sy < -10 || sy > state.height + 10) continue;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 2, sy - r.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWindStreaks(ctx) {
    if (state.weather.windStreaks.length === 0) return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    for (const w of state.weather.windStreaks) {
      const sx = w.x - camX;
      const sy = state.height - (w.y - camY);
      ctx.strokeStyle = `rgba(245, 250, 255, ${w.alpha.toFixed(3)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - w.length, sy + 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSparks(ctx) {
    if (state.weather.sparks.length === 0) return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    for (const s of state.weather.sparks) {
      const sx = s.x - camX;
      const sy = state.height - (s.y - camY);
      ctx.fillStyle = `hsla(${Math.round(s.hue)}, 90%, 60%, ${(s.life * 0.8).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFog(ctx) {
    if (state.weather.fogPatches.length === 0) return;
    const camX = state.cameraX;
    const camY = state.cameraY;
    ctx.save();
    for (const f of state.weather.fogPatches) {
      const sx = f.x - camX;
      const sy = state.height - (f.y - camY);
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, f.size);
      grad.addColorStop(0, `rgba(220, 230, 240, ${f.alpha.toFixed(3)})`);
      grad.addColorStop(1, "rgba(220, 230, 240, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, f.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawAltitudeOverlay(ctx) {
    // En el HUD ya hay un side rail, pero pintamos un marcador 3D en el canvas con la altura textual.
    // Texto pequeño abajo a la derecha.
    const altitudeM = Math.round(state.climber.y * ALTITUDE_DISPLAY_FACTOR);
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
    ctx.font = "bold 12px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${altitudeM} m`, state.width - 12, state.height - 18);
    ctx.restore();
  }

  /* =====================================================
   *  17. HUD SYNC
   * ===================================================== */

  function updateHUD() {
    if (!state.run) return;
    const climber = state.climber;
    const mountain = state.run.mountain;

    setText("hudWorldLabel", mountain.name[state.locale] || mountain.name.es);

    // Barras
    setBarFill("staminaFill", climber.stamina / STAMINA_MAX);
    setBarFill("waterFill", climber.water / WATER_MAX);
    setBarFill("gripFill", climber.grip / GRIP_MAX);
    setBarFill("ascentFill", climber.y / mountain.height);
    setText("staminaValue", String(Math.round(climber.stamina)));
    setText("waterValue", String(Math.round(climber.water)));
    setText("gripValue", String(Math.round(climber.grip)));
    setText("ascentValue", `${Math.round((climber.y / mountain.height) * 100)}%`);

    // Stats
    const altitudeM = Math.round(climber.y * ALTITUDE_DISPLAY_FACTOR);
    setText("altitudeValue", `${altitudeM} m`);
    const layer = currentLayer(climber.y);
    setText(
      "weatherValue",
      layer ? climateLabel(layer.climate) : "—"
    );
    setText(
      "zoneValue",
      layer ? layer.name[state.locale] || layer.name.es : "—"
    );
    setText("foodValue", String(climber.food));
    const cave = state.cave.active;
    setText(
      "caveStatusValue",
      cave
        ? t("caveStatusEntered")
        : nearestCave(climber.y) &&
          Math.abs(nearestCave(climber.y).mouthY - climber.y) < 200
        ? t("caveStatusNearby")
        : t("caveStatusEmpty")
    );
    if (state.anchor.placed) {
      const altAnchor = Math.round(state.anchor.y * ALTITUDE_DISPLAY_FACTOR);
      setText("anchorValue", t("anchorLabelAt", { m: altAnchor }));
    } else {
      setText("anchorValue", t("anchorLabelNone"));
    }
    setText("timeValue", formatSecondsClock(state.runTime));
    const best = state.progress.bestAltitudeByMountain[mountain.id] || 0;
    setText("bestValue", `${best} m`);

    // Side rail
    const altitudeFill = document.getElementById("altitudeFill");
    if (altitudeFill) {
      const ratio = clamp(climber.y / mountain.height, 0, 1);
      altitudeFill.style.height = `${(ratio * 100).toFixed(2)}%`;
    }
    const altitudePin = document.getElementById("altitudePin");
    if (altitudePin) {
      const ratio = clamp(climber.y / mountain.height, 0, 1);
      altitudePin.style.bottom = `${(ratio * 100).toFixed(2)}%`;
    }
    const markersWrap = document.getElementById("altitudeMarkers");
    if (markersWrap && markersWrap.dataset.mountain !== mountain.id) {
      markersWrap.innerHTML = "";
      mountain.caves.forEach((cave) => {
        const marker = document.createElement("div");
        marker.className = "summit-altitude-marker is-cave";
        const ratio = clamp(cave.y / mountain.height, 0, 1);
        marker.style.bottom = `${(ratio * 100).toFixed(2)}%`;
        markersWrap.appendChild(marker);
      });
      markersWrap.dataset.mountain = mountain.id;
    }
  }

  function climateLabel(climate) {
    switch (climate) {
      case "calm":
        return state.locale === "es" ? "Tranquilo" : "Calm";
      case "wind":
        return state.locale === "es" ? "Viento" : "Wind";
      case "fog":
        return state.locale === "es" ? "Niebla" : "Fog";
      case "rain":
        return state.locale === "es" ? "Lluvia" : "Rain";
      case "snow":
        return state.locale === "es" ? "Nieve" : "Snow";
      case "heat":
        return state.locale === "es" ? "Calor" : "Heat";
      default:
        return climate;
    }
  }

  function setBarFill(id, ratio) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.width = `${clamp(ratio, 0, 1) * 100}%`;
  }

  function renderPauseStats() {
    const wrap = document.getElementById("pauseStats");
    if (!wrap || !state.run) return;
    const climber = state.climber;
    const mountain = state.run.mountain;
    const altitudeM = Math.round(climber.y * ALTITUDE_DISPLAY_FACTOR);
    const total = Math.round(mountain.height * ALTITUDE_DISPLAY_FACTOR);
    const rows = [
      [t("statAltitude"), `${altitudeM} m / ${total} m`],
      [t("vitalStamina"), `${Math.round(climber.stamina)}/${STAMINA_MAX}`],
      [t("vitalWater"), `${Math.round(climber.water)}/${WATER_MAX}`],
      [t("vitalGrip"), `${Math.round(climber.grip)}/${GRIP_MAX}`],
      [t("statTime"), formatSecondsClock(state.runTime)],
      [t("statAnchor"), state.anchor.placed ? "OK" : "—"],
      [
        t("summaryAnchorsPlaced"),
        String(state.run.stats.anchorsPlaced),
      ],
      [
        t("summaryRopeCatches"),
        String(state.run.stats.ropeCatches),
      ],
    ];
    wrap.innerHTML = "";
    for (const [label, value] of rows) {
      const div = document.createElement("div");
      div.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(
        value
      )}</strong>`;
      wrap.appendChild(div);
    }
  }

  /* =====================================================
   *  18. BRIDGE QA / TEST
   * ===================================================== */

  function round(value, digits) {
    const factor = Math.pow(10, digits || 0);
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  function buildTextPayload() {
    const selectedMountain = findMountainById(state.selectedMountainId);
    const mountain = state.run ? state.run.mountain : selectedMountain;
    const climber = state.climber;
    const layer = state.run ? currentLayer(climber.y) : null;
    const cave = state.run ? nearestCave(climber.y) : null;
    const slopeInfo = state.run ? sampleProgressiveFaceProfile(climber.y, mountain) : null;
    const plateau = state.run ? currentWalkablePlateau() : null;
    const faceX = state.run ? sampleFaceX(climber.y, mountain) : null;
    const altitude = state.run
      ? Math.round(climber.y * ALTITUDE_DISPLAY_FACTOR)
      : 0;
    const totalAltitude = mountain
      ? Math.round(mountain.height * ALTITUDE_DISPLAY_FACTOR)
      : 0;

    return {
      game: "summit-ascent",
      version: VERSION,
      locale: state.locale,
      mode: state.state,
      coordinateSystem:
        "world origin at route base; x grows right, y/altitude grows upward; canvas origin is top-left",
      selectedMountain: selectedMountain
        ? {
            id: selectedMountain.id,
            name: selectedMountain.name[state.locale] || selectedMountain.name.es,
          }
        : null,
      mountain: mountain
        ? {
            id: mountain.id,
            name: mountain.name[state.locale] || mountain.name.es,
            altitudeMeters: totalAltitude,
            heightWorld: Math.round(mountain.height),
          }
        : null,
      climber: {
        x: round(climber.x, 1),
        y: round(climber.y, 1),
        vx: round(climber.vx, 1),
        vy: round(climber.vy, 1),
        facing: climber.facing,
        falling: Boolean(climber.falling),
        stamina: round(climber.stamina, 1),
        water: round(climber.water, 1),
        grip: round(climber.grip, 1),
        food: climber.food,
        faceOffsetX: faceX == null ? null : round(climber.x - faceX, 1),
        canClimb: anchorClimbRoom() > 0,
        canWalkWithoutAnchor: Boolean(plateau || state.summitWalk.active),
        movementMode: state.summitWalk.active
          ? "summit-walk"
          : plateau
          ? "plateau-walk"
          : "climb",
      },
      progress: {
        altitudeMeters: altitude,
        ascentRatio: mountain ? round(climber.y / mountain.height, 3) : 0,
        runTimeSeconds: round(state.runTime, 1),
        bestAltitudeMeters:
          mountain && state.progress.bestAltitudeByMountain[mountain.id]
            ? state.progress.bestAltitudeByMountain[mountain.id]
            : 0,
      },
      route: state.run
        ? {
            slope: slopeInfo
              ? {
                  gradeStartPercent: round(slopeInfo.gradeStart, 1),
                  gradeEndPercent: round(slopeInfo.gradeEnd, 1),
                  currentGradePercent: round(slopeInfo.gradePercent, 1),
                  onPlateau: slopeInfo.plateauBlend > 0.05,
                  plateauDistanceMeters: round(slopeInfo.plateauDistanceMeters, 0),
                }
              : null,
            walkablePlateau: plateau
              ? {
                  index: plateau.index,
                  startY: round(plateau.startY, 1),
                  endY: round(plateau.endY, 1),
                  startX: round(plateau.startX, 1),
                  endX: round(plateau.endX, 1),
                  distanceMeters: round(plateau.distanceMeters, 0),
                }
              : null,
            currentLayer: layer
              ? {
                  name: layer.name[state.locale] || layer.name.es,
                  climate: layer.climate,
                  drain: layer.drain,
                  wind: layer.wind,
                  fog: layer.fog,
                  rain: layer.rain,
                  snow: layer.snow,
                }
              : null,
            nearestCave: cave
              ? {
                  name: cave.nameLocalized,
                  y: round(cave.mouthY, 1),
                  altitudeMeters: Math.round(cave.mouthY * ALTITUDE_DISPLAY_FACTOR),
                  distanceWorld: round(cave.mouthY - climber.y, 1),
                  taken: Boolean(cave.taken),
                  reachable: Math.abs(cave.mouthY - climber.y) < 95,
                }
              : null,
            nextCave: nextCaveAbove(climber.y)
              ? {
                  name: nextCaveAbove(climber.y).nameLocalized,
                  altitudeMeters: Math.round(
                    nextCaveAbove(climber.y).mouthY * ALTITUDE_DISPLAY_FACTOR
                  ),
                  distanceWorld: round(nextCaveAbove(climber.y).mouthY - climber.y, 1),
                }
              : null,
          }
        : null,
      anchor: {
        placed: hasActiveAnchor(),
        manual: Boolean(state.anchor.manual),
        x: hasActiveAnchor() ? round(state.anchor.x, 1) : null,
        y: hasActiveAnchor() ? round(state.anchor.y, 1) : null,
        altitudeMeters: hasActiveAnchor()
          ? Math.round(state.anchor.y * ALTITUDE_DISPLAY_FACTOR)
          : null,
        climbRoomWorld: hasActiveAnchor() ? round(anchorClimbRoom(), 1) : 0,
        topReached: anchorTopReached(),
        needsAnchor: !hasActiveAnchor() || anchorTopReached(),
        ropeRemainingMeters: hasActiveAnchor()
          ? Math.max(0, Math.round(ROPE_LENGTH - Math.abs(climber.y - state.anchor.y)))
          : null,
        throw: hasAnchorThrow()
          ? {
              active: true,
              progress: round(state.anchorThrow.elapsed / state.anchorThrow.duration, 2),
              fromX: round(state.anchorThrow.fromX, 1),
              fromY: round(state.anchorThrow.fromY, 1),
              targetX: round(state.anchorThrow.targetX, 1),
              targetY: round(state.anchorThrow.targetY, 1),
              currentX: round(anchorThrowPosition(state.anchorThrow).x, 1),
              currentY: round(anchorThrowPosition(state.anchorThrow).y, 1),
            }
          : { active: false },
      },
      cave: {
        active: state.cave.active
          ? state.cave.active.nameLocalized ||
            state.cave.active.name[state.locale] ||
            state.cave.active.name.es
          : null,
        resting: Boolean(state.rest.active),
        restSecondsLeft: round(state.rest.secondsLeft, 1),
      },
      stats: state.run
        ? {
            anchorsPlaced: state.run.stats.anchorsPlaced,
            manualAnchors: state.run.stats.manualAnchors,
            ropeCatches: state.run.stats.ropeCatches,
            cavesVisited: state.run.stats.cavesVisited,
          }
        : null,
      message: document.getElementById("messageBox")?.textContent || "",
      toast: document.getElementById("toast")?.textContent || "",
      controls: {
        moveLeft: ["ArrowLeft", "A"],
        moveRight: ["ArrowRight", "D"],
        climb: ["ArrowUp", "W"],
        descend: ["ArrowDown", "S"],
        anchor: "Space",
        drink: "Q",
        cave: "E",
        eat: "F",
        pause: "P",
        restart: "R",
      },
    };
  }

  function renderGameToText() {
    return JSON.stringify(buildTextPayload());
  }

  function advanceTime(ms) {
    const frameMs = FIXED_DT * 1000;
    const totalMs = Math.max(frameMs, Number.isFinite(ms) ? ms : frameMs);
    const steps = Math.max(1, Math.round(totalMs / frameMs));
    for (let i = 0; i < steps; i += 1) {
      update(FIXED_DT);
    }
    render();
    updateHUD();
    hideMessageIfDue(totalMs / 1000);
    hideToastIfDue(totalMs / 1000);
    state.lastTimestamp = performance.now();
    state.accumulator = 0;
    return renderGameToText();
  }

  /* =====================================================
   *  19. MENSAJES Y TOAST
   * ===================================================== */

  function showMessage(text, duration) {
    const el = document.getElementById("messageBox");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.add("show");
    state.messageTimer = duration || UI_TIMING.messageDuration;
  }

  function hideMessageIfDue(dt) {
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) {
        const el = document.getElementById("messageBox");
        if (el) {
          el.classList.remove("show");
          setTimeout(() => el.classList.add("hidden"), 240);
        }
      }
    }
  }

  function showToast(text, duration) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    el.classList.add("show");
    state.toastTimer = duration || UI_TIMING.toastDuration;
  }

  function hideToastIfDue(dt) {
    if (state.toastTimer > 0) {
      state.toastTimer -= dt;
      if (state.toastTimer <= 0) {
        const el = document.getElementById("toast");
        if (el) {
          el.classList.remove("show");
          setTimeout(() => el.classList.add("hidden"), 240);
        }
      }
    }
  }

  /* =====================================================
   *  20. MAIN LOOP
   * ===================================================== */

  function loop(now) {
    requestAnimationFrame(loop);
    const last = state.lastTimestamp || now;
    let dt = Math.min(MAX_FRAME_DT, (now - last) / 1000);
    state.lastTimestamp = now;

    // step físico
    state.accumulator += dt;
    let physicsSteps = 0;
    while (state.accumulator >= FIXED_DT && physicsSteps < 4) {
      update(FIXED_DT);
      state.accumulator -= FIXED_DT;
      physicsSteps += 1;
    }
    if (physicsSteps === 4) {
      // Drop excess accumulator to avoid spiral of death
      state.accumulator = 0;
    }

    render();
    updateHUD();
    hideMessageIfDue(dt);
    hideToastIfDue(dt);
  }

  /* =====================================================
   *  21. ARRANQUE
   * ===================================================== */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
