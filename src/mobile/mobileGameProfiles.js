import { getMobileShellMode } from "../utils/mobileShellProfile";

const DIRECT_TOUCH_GAME_IDS = new Set([
  "sports-ping-pong-arena",
  // The cups are the buttons: you point at the one you mean, so a virtual pad
  // would only get between the finger and the table.
  "arcade-shell-game",
  // The whole stage is one big STOP button, so a virtual pad would only sit
  // between the finger and the tap that stops the clock.
  "arcade-pulso-exacto",
  "arcade-orchard-match-blast",
  "arcade-reactor-toss",
  "arcade-golf-tour-2d",
  "arcade-buscaminas-classic",
  "arcade-bubble-storm",
  "arcade-neon-rush",
  "racing-race2dpro",
  "racing-sunset-slipstream",
]);

const TABLET_LANDSCAPE_CONTROL_DECK_GAME_IDS = new Set([
  "arcade-orchard-match-blast",
  "arcade-reactor-toss",
  "arcade-golf-tour-2d",
  "arcade-buscaminas-classic",
  "arcade-bubble-storm",
  "arcade-neon-rush",
]);

const STRATEGY_MOBILE_FIRST_GAME_IDS = new Set([
  "strategy-chess-grandmaster",
  "strategy-damas-clasicas",
  "strategy-sudoku-tecnicas",
  "strategy-hundir-flota-pro",
  "strategy-poker-holdem-no-bet",
  "strategy-parchis-ludoteka",
  "strategy-baraja-ia-arena",
  "strategy-mansion-triple-enigma",
]);

const KNOWLEDGE_MOBILE_FIRST_GAME_IDS = new Set([
  "knowledge-quiz-nexus",
  "knowledge-logic-vault",
  "knowledge-iq-masters-protocol",
  "knowledge-refranes-clasicos",
  "knowledge-wikipedia-gacha",
  "knowledge-sudoku-sprint",
  "knowledge-domino-chain",
  "knowledge-ahorcado-flash",
  "knowledge-paciencia-lite",
  "knowledge-puzle-deslizante",
  "knowledge-crucigrama-mini",
  "knowledge-sopa-letras-mega",
  "knowledge-wordle-pro",
  "knowledge-anagramas-pro",
  "knowledge-calculo-mental-flash10",
  "knowledge-tabla-periodica-total",
  "knowledge-mapas-atlas",
  "knowledge-mapas-camino-corto",
  "knowledge-adivina-pais-silueta",
  "knowledge-tangram-pro",
  "knowledge-cronologia-maestra",
]);

const t = (locale, es, en) => (locale === "en" ? en : es);
const input = (code, key) => ({ code, key });

function isTabletLandscapeViewport(viewport) {
  return viewport?.formFactor === "tablet" && viewport?.orientation === "landscape";
}

function control(id, label, options = {}) {
  return {
    id,
    label,
    type: options.type ?? "hold",
    tone: options.tone ?? "default",
    inputs: options.inputs ?? [],
    action: options.action ?? "input",
    targetSelector: options.targetSelector ?? null,
    hideWhenUnavailable: options.hideWhenUnavailable ?? false,
    frameFunction: options.frameFunction ?? null,
    frameGuard: options.frameGuard ?? null,
    stateLabels: options.stateLabels ?? null,
    visibility: options.visibility ?? null,
    extraClassName: options.extraClassName ?? null,
  };
}

function utilityRow(locale, extra = []) {
  return [
    ...extra,
    control("pause", t(locale, "Pausa", "Pause"), {
      type: "tap",
      tone: "utility",
      inputs: [input("KeyP", "p")],
    }),
    control("restart", t(locale, "Reinicio", "Restart"), {
      type: "tap",
      tone: "utility",
      inputs: [input("KeyR", "r")],
    }),
  ];
}

function directionalPad(locale, mapping) {
  return [
    control("up", mapping.upLabel ?? "▲", { inputs: [mapping.up], tone: mapping.upTone }),
    control("left", mapping.leftLabel ?? "◀", { inputs: [mapping.left], tone: mapping.leftTone }),
    control("right", mapping.rightLabel ?? "▶", { inputs: [mapping.right], tone: mapping.rightTone }),
    control("down", mapping.downLabel ?? "▼", { inputs: [mapping.down], tone: mapping.downTone }),
  ];
}

function resolveRetroProfile(gameId, locale) {
  switch (gameId) {
    case "arcade-retro-breakout-1986":
      return {
        layout: "split",
        heading: t(locale, "Emisor", "Emitter"),
        hint: t(locale, "Mueve el emisor y libera el pulso.", "Move the emitter and release the pulse."),
        leftPad: [
          control("left", "◀", { inputs: [input("ArrowLeft", "ArrowLeft")] }),
          control("right", "▶", { inputs: [input("ArrowRight", "ArrowRight")] }),
        ],
        rightPad: [
          control("launch", t(locale, "Lanza", "Launch"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-retro-space-invaders":
    case "arcade-retro-galaga-quantum":
    case "arcade-retro-centipede-circuit":
      return {
        layout: "split",
        heading: t(locale, "Nave", "Ship"),
        hint: t(locale, "Desplaza y dispara.", "Move and fire."),
        leftPad: [
          control("left", "◀", { inputs: [input("ArrowLeft", "ArrowLeft")] }),
          control("right", "▶", { inputs: [input("ArrowRight", "ArrowRight")] }),
        ],
        rightPad: [
          control("fire", t(locale, "Disparo", "Fire"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-retro-tetris-blockfall":
      return {
        layout: "split",
        heading: "Mosaic",
        hint: t(locale, "Encaja piezas variadas hasta rellenar el tablero. Cambia la pieza cuando no convenga.", "Fit varied pieces until the board is full. Change the piece when needed."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
          upLabel: t(locale, "Arriba", "Up"),
          downLabel: t(locale, "Abajo", "Down"),
        }),
        rightPad: [
          control("place", t(locale, "Coloca", "Place"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("change", t(locale, "Cambia", "Change"), {
            type: "tap",
            tone: "secondary",
            inputs: [input("KeyC", "c")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-retro-bomber-grid":
      return {
        layout: "split",
        heading: t(locale, "Baliza", "Beacon"),
        hint: t(locale, "Muévete y despliega balizas.", "Move and deploy beacons."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("bomb", t(locale, "Bomba", "Bomb"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-retro-road-fighter-synth":
    case "arcade-retro-river-raid-neon":
      return {
        layout: "split",
        heading: t(locale, "Carretera", "Road"),
        hint: t(locale, "Maniobra, acelera y frena.", "Steer, accelerate, and brake."),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Gas", "Gas"),
          downLabel: t(locale, "Freno", "Brake"),
        }),
        rightPad: gameId === "arcade-retro-river-raid-neon"
          ? [
              control("fire", t(locale, "Disparo", "Fire"), {
                type: "tap",
                tone: "primary",
                inputs: [input("Space", " ")],
              }),
            ]
          : [],
        utilities: utilityRow(locale),
      };
    case "arcade-retro-lunar-lander-orbit":
      // Two-thumb layout: attitude (rotate) on the left, thrust on the right.
      // The lander's rotation is momentum-based, so a single analog joystick can't
      // give the fine, held rotation the physics expects — discrete buttons match
      // the keyboard scheme the game is tuned around.
      return {
        layout: "split",
        leftPadMode: "buttons",
        heading: t(locale, "Aterrizaje", "Landing"),
        hint: t(locale, "Gira con ◀ ▶ y mantén el propulsor para frenar la caída.", "Turn with ◀ ▶ and hold thrust to slow your descent."),
        leftPad: [
          control("rotate-left", "◀", { type: "hold", inputs: [input("KeyA", "a")] }),
          control("rotate-right", "▶", { type: "hold", inputs: [input("KeyD", "d")] }),
        ],
        rightPad: [
          control("thrust", t(locale, "Propulsor", "Thrust"), {
            type: "hold",
            tone: "primary",
            inputs: [input("KeyW", "w")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    default:
      return {
        layout: "split",
        heading: t(locale, "Dirección", "Direction"),
        hint: t(locale, "Usa la cruceta para jugar.", "Use the D-pad to play."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("start", "Start", {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale),
      };
  }
}

export function getResponsiveMobileShellMode(game, viewport) {
  const gameId = String(game?.id ?? "");
  const categoryKey = String(game?.category ?? "");
  const isKnowledgeCategory = categoryKey === "Conocimiento" || categoryKey === "Knowledge";
  const isStrategyCategory = categoryKey === "Estrategia" || categoryKey === "Strategy";

  const enableTabletLandscapeDeck =
    isTabletLandscapeViewport(viewport) &&
    TABLET_LANDSCAPE_CONTROL_DECK_GAME_IDS.has(gameId);

  if (enableTabletLandscapeDeck) {
    return "dual-screen";
  }

  if (DIRECT_TOUCH_GAME_IDS.has(gameId)) {
    return "mobile-first";
  }

  const baseMode = getMobileShellMode(game, viewport);
  if (baseMode !== "dual-screen") {
    return baseMode;
  }

  if (gameId === "strategy-hundir-flota-pro") {
    return "dual-screen";
  }

  if (
    STRATEGY_MOBILE_FIRST_GAME_IDS.has(gameId) ||
    KNOWLEDGE_MOBILE_FIRST_GAME_IDS.has(gameId) ||
    isKnowledgeCategory ||
    isStrategyCategory
  ) {
    return "mobile-first";
  }

  return baseMode;
}

export function getMobileControlProfile(game, locale = "es") {
  const gameId = String(game?.id ?? "");

  if (gameId.startsWith("arcade-retro-")) {
    return resolveRetroProfile(gameId, locale);
  }

  if (gameId === "arcade-territory-war") {
    return {
      layout: "split",
      heading: t(locale, "Turno", "Turn"),
      hint: t(locale, "Muévete, salta, activa el cañón, ajusta ángulo y mantén el disparo.", "Move, jump, toggle the cannon, tune angle, and hold the shot."),
      leftPad: [
        control("left", t(locale, "Izq", "Left"), {
          inputs: [input("KeyA", "a")],
        }),
        control("right", t(locale, "Der", "Right"), {
          inputs: [input("KeyD", "d")],
        }),
      ],
      rightPad: [
        control("jump", t(locale, "Salta", "Jump"), {
          type: "tap",
          tone: "accent",
          inputs: [input("KeyW", "w")],
        }),
        control("aimUp", t(locale, "Áng+", "Aim+"), {
          type: "hold",
          inputs: [input("KeyQ", "q")],
        }),
        control("aimDown", t(locale, "Áng-", "Aim-"), {
          type: "hold",
          inputs: [input("KeyE", "e")],
        }),
        control("throw", t(locale, "Lanza", "Throw"), {
          type: "hold",
          tone: "primary",
          inputs: [input("Space", " ")],
        }),
        control("cannon", t(locale, "Cañón", "Cannon"), {
          type: "tap",
          tone: "accent",
          inputs: [input("KeyC", "c")],
        }),
        control("cancel", t(locale, "Cancela", "Cancel"), {
          type: "tap",
          inputs: [input("KeyX", "x")],
        }),
      ],
      utilities: utilityRow(locale),
    };
  }

  if (gameId === "platformer-sky-runner") {
    return {
      layout: "split",
      heading: t(locale, "Runner", "Runner"),
      hint: t(locale, "Muévete, mantén el salto variable y usa Fuego cuando tengas poder.", "Move, hold variable jump, and use Fire when powered up."),
      leftPad: [
        control("left", t(locale, "Izq", "Left"), {
          inputs: [input("ArrowLeft", "ArrowLeft")],
        }),
        control("right", t(locale, "Der", "Right"), {
          inputs: [input("ArrowRight", "ArrowRight")],
        }),
      ],
      rightPad: [
        control("jump", t(locale, "Salta", "Jump"), {
          type: "hold",
          tone: "accent",
          inputs: [input("Space", " ")],
        }),
        control("fire", t(locale, "Fuego", "Fire"), {
          type: "tap",
          tone: "primary",
          inputs: [input("KeyF", "f")],
        }),
      ],
      utilities: utilityRow(locale, [
        control("start", "Start", {
          type: "tap",
          tone: "utility",
          inputs: [input("Enter", "Enter")],
        }),
      ]),
    };
  }

  if (gameId === "racing-race2dpro") {
    return {
      layout: "split",
      heading: t(locale, "Race 2D", "Race 2D"),
      hint: t(
        locale,
        "Joystick completo para dirigir, acelerar y frenar; botones para focus y reinicio rapido.",
        "Use the full joystick for steering, throttle, and brake, with side buttons for focus and quick restart."
      ),
      leftPad: directionalPad(locale, {
        up: input("ArrowUp", "ArrowUp"),
        left: input("ArrowLeft", "ArrowLeft"),
        right: input("ArrowRight", "ArrowRight"),
        down: input("ArrowDown", "ArrowDown"),
        upLabel: t(locale, "Gas", "Gas"),
        downLabel: t(locale, "Freno", "Brake"),
      }),
      rightPad: [
        control("focus", "Focus", {
          type: "hold",
          tone: "primary",
          inputs: [input("Space", " ")],
        }),
        control("start", "Start", {
          type: "tap",
          tone: "accent",
          inputs: [input("Enter", "Enter")],
        }),
      ],
      utilities: utilityRow(locale),
    };
  }

  if (gameId === "racing-sunset-slipstream") {
    return {
      layout: "split",
      heading: t(locale, "Slipstream", "Slipstream"),
      hint: t(
        locale,
        "Joystick para carril y ritmo; focus y reinicio quedan en el bloque de acciones.",
        "Use the joystick for lane control and pace, with focus and restart on the action side."
      ),
      leftPad: directionalPad(locale, {
        up: input("ArrowUp", "ArrowUp"),
        left: input("ArrowLeft", "ArrowLeft"),
        right: input("ArrowRight", "ArrowRight"),
        down: input("ArrowDown", "ArrowDown"),
        upLabel: t(locale, "Gas", "Gas"),
        downLabel: t(locale, "Cool", "Cool"),
      }),
      rightPad: [
        control("focus", "Focus", {
          type: "hold",
          tone: "primary",
          inputs: [input("Space", " ")],
        }),
        control("start", "Start", {
          type: "tap",
          tone: "accent",
          inputs: [input("Enter", "Enter")],
        }),
      ],
      utilities: utilityRow(locale),
    };
  }

  if (gameId === "strategy-hundir-flota-pro") {
    return {
      layout: "split",
      heading: t(locale, "Mesa tactica", "Tactical table"),
      hint: t(
        locale,
        "Toca una carta de mano y despues una casilla amarilla. Las acciones rapidas quedan aqui.",
        "Tap a hand card, then a yellow target tile. Quick actions stay here."
      ),
      leftPad: [
        control("startIntro", t(locale, "Iniciar", "Start"), {
          type: "tap",
          tone: "primary",
          action: "click-target",
          targetSelector: ".strategy-intro-cta",
          hideWhenUnavailable: true,
        }),
        control("newMatch", t(locale, "Nueva", "New"), {
          type: "tap",
          tone: "utility",
          action: "click-target",
          targetSelector: "#battleship-new-match, #battleship-new-match-head",
          hideWhenUnavailable: true,
        }),
        control("cancel", t(locale, "Cancelar", "Cancel"), {
          type: "tap",
          tone: "accent",
          action: "click-target",
          targetSelector: "#battleship-cancel-action",
          hideWhenUnavailable: true,
        }),
      ],
      rightPad: [
        control("hand1", t(locale, "Carta 1", "Card 1"), {
          type: "tap",
          tone: "primary",
          action: "click-target",
          targetSelector: ".battleship-hand-card:not(:disabled):nth-of-type(1)",
          hideWhenUnavailable: true,
        }),
        control("hand2", t(locale, "Carta 2", "Card 2"), {
          type: "tap",
          action: "click-target",
          targetSelector: ".battleship-hand-card:not(:disabled):nth-of-type(2)",
          hideWhenUnavailable: true,
        }),
        control("hand3", t(locale, "Carta 3", "Card 3"), {
          type: "tap",
          action: "click-target",
          targetSelector: ".battleship-hand-card:not(:disabled):nth-of-type(3)",
          hideWhenUnavailable: true,
        }),
        control("hand4", t(locale, "Carta 4", "Card 4"), {
          type: "tap",
          action: "click-target",
          targetSelector: ".battleship-hand-card:not(:disabled):nth-of-type(4)",
          hideWhenUnavailable: true,
        }),
        control("hand5", t(locale, "Carta 5", "Card 5"), {
          type: "tap",
          action: "click-target",
          targetSelector: ".battleship-hand-card:not(:disabled):nth-of-type(5)",
          hideWhenUnavailable: true,
        }),
        control("discardWhite", t(locale, "Descartar", "Discard"), {
          type: "tap",
          action: "click-target",
          targetSelector: "#battleship-choice-discard-white",
          hideWhenUnavailable: true,
        }),
        control("playTwo", t(locale, "Jugar 2", "Play 2"), {
          type: "tap",
          tone: "primary",
          action: "click-target",
          targetSelector: "#battleship-choice-play-two",
          hideWhenUnavailable: true,
        }),
        control("repair", t(locale, "Reparar", "Repair"), {
          type: "tap",
          tone: "accent",
          action: "click-target",
          targetSelector: "#battleship-choice-repair",
          hideWhenUnavailable: true,
        }),
        control("drawThree", t(locale, "Robar 3", "Draw 3"), {
          type: "tap",
          tone: "primary",
          action: "click-target",
          targetSelector: "#battleship-choice-draw-three",
          hideWhenUnavailable: true,
        }),
        control("confirmDiscard", t(locale, "Confirmar", "Confirm"), {
          type: "tap",
          tone: "primary",
          action: "click-target",
          targetSelector: "#battleship-confirm-discard-white:not(:disabled)",
          hideWhenUnavailable: true,
        }),
      ],
      utilities: [],
    };
  }

  switch (gameId) {
    case "sports-padel-arena":
      return {
        layout: "split",
        heading: t(locale, "Pádel", "Padel"),
        hint: t(
          locale,
          "Mueve el joystick y elige golpe: Volea (ataque; remata si la bola llega alta), Revés, Globo o Dejada. Mantén el botón pulsado para cargar potencia: la barra sobre tu figura dice cuánta llevas. Marca dirección con el joystick al golpear para colocar. El globo pasa por encima de los de la red y, tras botar, puedes jugar la pared. En el saque, cualquier botón saca cruzado. Dificultad y formato en el menú.",
          "Move the joystick and pick a shot: Volley (attack; smashes a high ball), Backhand, Lob or Drop. Hold the button to charge power — the bar above your figure shows how much. Hold a joystick direction as you hit to place it. The lob clears the net players and, after a bounce, you can play the wall. On serve, any button serves cross-court. Difficulty and format in the menu.",
        ),
        // A four-way pad renders as an analog joystick to move the active player.
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        // Cuatro golpes a elegir (y el saque con cualquiera de ellos): Volea es el
        // ataque natural (remate si la bola llega alta a la red), más revés, globo y
        // dejada. Reflejan las teclas F / G / H / J del teclado.
        //
        // Son de tipo "hold", no "tap": mantener pulsado carga la potencia del
        // golpe, igual que mantener la tecla en el ordenador. El deck emite
        // keydown al apoyar el dedo y keyup al levantarlo, así que el motor no
        // distingue de dónde viene el gesto.
        rightPad: [
          control("volea", t(locale, "Volea", "Volley"), {
            type: "hold",
            tone: "primary",
            inputs: [input("KeyF", "f")],
          }),
          control("reves", t(locale, "Revés", "Backhand"), {
            type: "hold",
            inputs: [input("KeyG", "g")],
          }),
          control("globo", t(locale, "Globo", "Lob"), {
            type: "hold",
            inputs: [input("KeyH", "h")],
          }),
          control("dejada", t(locale, "Dejada", "Drop"), {
            type: "hold",
            inputs: [input("KeyJ", "j")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-terror-zombi":
      return {
        layout: "split",
        heading: t(locale, "Cementerio", "Graveyard"),
        hint: t(
          locale,
          "Mueve el joystick para huir de los zombis en 8 direcciones. Si te tocan, cazas al resto. Elige cementerio, dificultad y «Otra vez»/«Cambiar» en los botones del panel.",
          "Push the joystick to flee the zombies in 8 directions. If they touch you, hunt the rest. Pick the graveyard, difficulty and «Again»/«Change» from the panel buttons.",
        ),
        // A full four-way pad renders as an analog joystick, so dodging is a
        // thumb push in any direction rather than tapping buttons.
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        // Map/difficulty/result actions live in the game's own header toolbar
        // (.tz-actions), which stays visible in the mobile shell — so the deck
        // only carries the joystick and the shared utilities.
        rightPad: [],
        utilities: utilityRow(locale),
      };
    case "arcade-brile":
      return {
        layout: "split",
        heading: t(locale, "Brilé", "Dodgeball"),
        hint: t(
          locale,
          "Mueve el joystick para colocarte y esquivar. Con el balón, Lanzar apunta solo al rival más peligroso; Atrapar cázalo justo cuando te llega para brilar al lanzador. Dificultad y «Otra vez»/«Cambiar» en los botones del panel.",
          "Move the joystick to reposition and dodge. Holding the ball, Throw auto-aims at the most dangerous rival; Catch it right as it reaches you to send the thrower out. Difficulty and «Again»/«Change» are in the panel buttons.",
        ),
        // Joystick to move; two big action taps mirror the keyboard throw/catch.
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("catch", t(locale, "Atrapar", "Catch"), {
            type: "tap",
            inputs: [input("KeyK", "k")],
          }),
          control("throw", t(locale, "Lanzar", "Throw"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-topos-mazazos":
      return {
        layout: "split",
        heading: t(locale, "Jardín", "Garden"),
        hint: t(
          locale,
          "Mueve el joystick para colocarte junto a un agujero y pulsa Golpear: el mazazo alcanza todo lo que asome a tu alrededor. Marrón 1, dorado 3, bomba -2 y aturdimiento. Dificultad y «¡A jugar!»/«Otra vez» en los botones del panel.",
          "Push the joystick to line up next to a hole and tap Whack: the swing hits everything popped up around you. Brown 1, gold 3, bomb -2 and a stun. Difficulty and «Play!»/«Again» are in the panel buttons.",
        ),
        // A full four-way pad renders as an analog joystick, so repositioning
        // between holes is a thumb push rather than tapping buttons.
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("whack", t(locale, "Golpear", "Whack"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-distancia-justa":
      return {
        layout: "split",
        heading: t(locale, "Distancia", "Distance"),
        hint: t(
          locale,
          "Mueve el joystick a la derecha para avanzar y a la izquierda para retroceder; confirma tu posición. En el menú, elige la dificultad aquí abajo.",
          "Push the joystick right to advance and left to step back; confirm your position. On the menu, pick the difficulty down here.",
        ),
        // A left/right directional pair renders as an analog joystick, so walking
        // is a thumb push instead of tapping buttons.
        leftPad: [
          control("moveLeft", "◀", { type: "hold", inputs: [input("ArrowLeft", "ArrowLeft")] }),
          control("moveRight", "▶", { type: "hold", inputs: [input("ArrowRight", "ArrowRight")] }),
        ],
        // Difficulty taps click the on-screen menu cards and auto-hide once the
        // match starts (their targets disappear); Confirm stays for the run.
        rightPad: [
          control("diffEasy", t(locale, "Fácil", "Easy"), {
            type: "tap",
            action: "click-target",
            targetSelector: ".dj-diff--facil",
            hideWhenUnavailable: true,
          }),
          control("diffNormal", t(locale, "Normal", "Normal"), {
            type: "tap",
            action: "click-target",
            targetSelector: ".dj-diff--normal",
            hideWhenUnavailable: true,
          }),
          control("diffHard", t(locale, "Difícil", "Hard"), {
            type: "tap",
            action: "click-target",
            targetSelector: ".dj-diff--dificil",
            hideWhenUnavailable: true,
          }),
          control("confirm", t(locale, "✓ Confirmar", "✓ Confirm"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "sports-head-soccer-arena":
      return {
        layout: "split",
        heading: t(locale, "Fútbol arcade", "Arcade football"),
        hint: t(locale, "Corre con joystick, salta y remata con botones.", "Move with the joystick, then jump and shoot with buttons."),
        leftPad: [
          control("left", "◀", { inputs: [input("KeyA", "a")] }),
          control("right", "▶", { inputs: [input("KeyD", "d")] }),
        ],
        rightPad: [
          control("start", "Start", {
            type: "tap",
            tone: "utility",
            inputs: [input("Enter", "Enter")],
          }),
          control("kick", t(locale, "Disparo", "Kick"), {
            type: "hold",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("jump", t(locale, "Salta", "Jump"), {
            type: "hold",
            tone: "accent",
            inputs: [input("KeyW", "w")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "sports-basketball-court":
      return {
        layout: "split",
        leftPadMode: "buttons",
        heading: t(locale, "Tiro", "Shot"),
        hint: t(locale, "Arco, desvío y potencia en una sola cruceta.", "Arc, lateral aim, and power on one cross-pad."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
          upLabel: t(locale, "Arco+", "Arc+"),
          downLabel: t(locale, "Arco-", "Arc-"),
        }),
        rightPad: [
          control("powerUp", t(locale, "Pot+", "Pow+"), { inputs: [input("KeyW", "w")], tone: "accent" }),
          control("powerDown", t(locale, "Pot-", "Pow-"), { inputs: [input("KeyS", "s")] }),
          control("shoot", t(locale, "Lanza", "Shoot"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "sports-ping-pong-arena":
      return {
        layout: "split",
        heading: t(locale, "Ping pong", "Ping pong"),
        hint: t(
          locale,
          "La pala es tu dedo: muévela sobre el escenario y desliza rápido al golpear. Desliza hacia delante para sacar.",
          "The paddle is your finger: move it on the stage and flick as you hit. Flick forward to serve.",
        ),
        leftPad: [],
        rightPad: [
          control("serve", t(locale, "Saca", "Serve"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("start", "Start", {
            type: "tap",
            tone: "accent",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-billar-pool-club": {
      const billiardsPlay = { billiardsPhases: ["play"] };
      const billiardsOver = { billiardsPhases: ["rack-over", "match-over"] };
      const billiardsRackOver = { billiardsPhases: ["rack-over"] };
      return {
        layout: "split",
        leftPadMode: "buttons",
        heading: t(locale, "Billar", "Pool"),
        hint: t(locale, "La cruceta ajusta ángulo y potencia. El botón principal tira.", "The D-pad adjusts angle and power. Main button shoots."),
        leftPad: [
          control("powerUp", t(locale, "Pot+", "Pow+"), {
            inputs: [input("KeyW", "w")],
            tone: "accent",
            visibility: billiardsPlay,
          }),
          control("aimLeft", t(locale, "Aim -", "Aim -"), {
            inputs: [input("KeyA", "a")],
            visibility: billiardsPlay,
          }),
          control("aimRight", t(locale, "Aim +", "Aim +"), {
            inputs: [input("KeyD", "d")],
            visibility: billiardsPlay,
          }),
          control("powerDown", t(locale, "Pot-", "Pow-"), {
            inputs: [input("KeyS", "s")],
            visibility: billiardsPlay,
          }),
        ],
        rightPad: [
          control("shoot", t(locale, "Tiro", "Shoot"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
            visibility: billiardsPlay,
          }),
          control("pushOut", t(locale, "Push Out", "Push Out"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyO", "o")],
            visibility: billiardsPlay,
          }),
          control("safety", "Safety", {
            type: "tap",
            inputs: [input("KeyV", "v")],
            visibility: billiardsPlay,
          }),
          control("place", t(locale, "Auto", "Auto"), {
            type: "tap",
            inputs: [input("KeyP", "p")],
            visibility: billiardsPlay,
          }),
          control("backToConfig", t(locale, "Volver a configuración", "Back to setup"), {
            type: "tap",
            tone: "accent",
            action: "click-any-target",
            targetSelector: "#billiards-new-match-btn",
            visibility: billiardsOver,
            extraClassName: "mobile-control-deck__button--rack-over",
          }),
          control("nextRack", t(locale, "Ir al siguiente rack", "Go to next rack"), {
            type: "tap",
            tone: "primary",
            action: "click-any-target",
            targetSelector: "#billiards-next-rack-btn",
            visibility: billiardsRackOver,
            extraClassName: "mobile-control-deck__button--rack-over",
          }),
        ],
        utilities: [],
      };
    }
    case "arcade-bowling-pro-tour":
      return {
        layout: "split",
        heading: t(locale, "Bolos", "Bowling"),
        hint: t(locale, "Ajusta línea, efecto y potencia.", "Tune line, spin, and power."),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Pot+", "Pow+"),
          downLabel: t(locale, "Pot-", "Pow-"),
        }),
        rightPad: [
          control("spinLeft", t(locale, "Spin◀", "Spin◀"), { inputs: [input("KeyQ", "q")] }),
          control("spinRight", t(locale, "Spin▶", "Spin▶"), { inputs: [input("KeyE", "e")] }),
          control("throw", t(locale, "Lanza", "Throw"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale, [
          control("start", "Start", {
            type: "tap",
            tone: "utility",
            inputs: [input("Enter", "Enter")],
          }),
        ]),
      };
    case "arcade-penalty-neural-keeper":
      return {
        layout: "zones",
        heading: t(locale, "Penalti", "Penalty"),
        hint: t(locale, "Elige zona o parada. Arriba son los disparos altos.", "Choose shot or save zone. Top row is high."),
        zones: [
          control("zone3", t(locale, "Arr. izq.", "Top left"), { type: "tap", tone: "primary", inputs: [input("Digit3", "3")] }),
          control("zone5", t(locale, "Centro", "Center"), { type: "tap", tone: "accent", inputs: [input("Digit5", "5")] }),
          control("zone4", t(locale, "Arr. der.", "Top right"), { type: "tap", tone: "primary", inputs: [input("Digit4", "4")] }),
          control("zone1", t(locale, "Ab. izq.", "Bottom left"), { type: "tap", inputs: [input("Digit1", "1")] }),
          control("zone2", t(locale, "Ab. der.", "Bottom right"), { type: "tap", inputs: [input("Digit2", "2")] }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-cosmic-vanguard":
      return {
        layout: "split",
        heading: t(locale, "Nave", "Ship"),
        hint: t(locale, "Rota, impulsa y dispara.", "Rotate, thrust, and fire."),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Impulso", "Thrust"),
          downLabel: t(locale, "Freno", "Brake"),
        }),
        rightPad: [
          control("fire", t(locale, "Fuego", "Fire"), {
            type: "hold",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("boost", "Boost", {
            type: "hold",
            tone: "accent",
            inputs: [input("ShiftLeft", "Shift")],
          }),
          control("pulse", t(locale, "Pulso", "Pulse"), {
            type: "tap",
            inputs: [input("KeyE", "e")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-territory-war":
      return {
        layout: "split",
        heading: t(locale, "Turno", "Turn"),
        hint: t(locale, "Muévete, salta, ajusta ángulo y mantén el lanzamiento.", "Move, jump, tune angle, and hold throw."),
        leftPad: directionalPad(locale, {
          up: input("KeyQ", "q"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyE", "e"),
          upLabel: t(locale, "Áng+", "Aim+"),
          downLabel: t(locale, "Áng-", "Aim-"),
        }),
        rightPad: [
          control("jump", t(locale, "Salta", "Jump"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyW", "w")],
          }),
          control("throw", t(locale, "Lanza", "Throw"), {
            type: "hold",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("cancel", t(locale, "Cancela", "Cancel"), {
            type: "tap",
            inputs: [input("KeyX", "x")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-archery-horizon":
      return {
        layout: "split",
        heading: t(locale, "Arco", "Bow"),
        hint: t(locale, "La cruceta mueve desvío y trayectoria. Los botones laterales ajustan fuerza.", "D-pad tunes yaw and trajectory. Side buttons adjust power."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("ArrowDown", "ArrowDown"),
          upLabel: t(locale, "Tray+", "Traj+"),
          downLabel: t(locale, "Tray-", "Traj-"),
        }),
        rightPad: [
          control("powerUp", t(locale, "Fuerza+", "Power+"), { inputs: [input("KeyW", "w")], tone: "accent" }),
          control("powerDown", t(locale, "Fuerza-", "Power-"), { inputs: [input("KeyS", "s")] }),
          control("shoot", t(locale, "Dispara", "Shoot"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale, [
          control("next", t(locale, "Siguiente", "Next"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyN", "n")],
          }),
        ]),
      };
    case "arcade-pinball-wizard":
      return {
        layout: "split",
        heading: t(locale, "Flippers", "Flippers"),
        hint: t(locale, "Pulsa los flippers y lanza la bola.", "Trigger flippers and launch the ball."),
        leftPad: [
          control("leftFlip", t(locale, "Izq", "Left"), {
            inputs: [input("ArrowLeft", "ArrowLeft")],
            tone: "accent",
          }),
          control("rightFlip", t(locale, "Der", "Right"), {
            inputs: [input("ArrowRight", "ArrowRight")],
            tone: "accent",
          }),
        ],
        rightPad: [
          control("plunger", "Plunger", {
            type: "hold",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-reactor-toss":
      return {
        layout: "split",
        heading: t(locale, "Orbita", "Orbit"),
        hint: t(
          locale,
          "El joystick ajusta direccion y potencia; los botones lanzan y abren acciones rapidas.",
          "Use the joystick to tune direction and power; action buttons launch and open quick actions."
        ),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Pot+", "Pow+"),
          downLabel: t(locale, "Pot-", "Pow-"),
        }),
        rightPad: [
          control("launch", t(locale, "Lanza", "Launch"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("levels", t(locale, "Niveles", "Levels"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyL", "l")],
          }),
          control("audio", t(locale, "Audio", "Audio"), {
            type: "tap",
            inputs: [input("KeyM", "m")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-golf-tour-2d":
      return {
        layout: "split",
        heading: t(locale, "Green", "Green"),
        hint: t(
          locale,
          "Arrastra sobre el campo para fijar la trayectoria completa y suelta para golpear; los botones quedan como apoyo.",
          "Drag on the course to set the full shot path and release to strike; buttons remain as backup."
        ),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Pot+", "Pow+"),
          downLabel: t(locale, "Pot-", "Pow-"),
        }),
        rightPad: [
          control("shoot", t(locale, "Golpe", "Shoot"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("levels", t(locale, "Hoyos", "Levels"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyL", "l")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-orchard-match-blast":
      return {
        layout: "split",
        heading: t(locale, "Huerto", "Orchard"),
        hint: t(
          locale,
          "Mueve el cursor con joystick y usa los botones para seleccionar, Bloom y ayudas.",
          "Move the cursor with the joystick and use action buttons for select, Bloom, and assists."
        ),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("select", t(locale, "Selecciona", "Select"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
          control("bloom", "Bloom", {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyB", "b")],
          }),
          control("hint", t(locale, "Pista", "Hint"), {
            type: "tap",
            inputs: [input("KeyH", "h")],
          }),
          control("shuffle", t(locale, "Mezcla", "Shuffle"), {
            type: "tap",
            inputs: [input("KeyS", "s")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-bubble-storm":
      return {
        layout: "split",
        heading: t(locale, "Burbuja", "Bubble"),
        hint: t(
          locale,
          "El joystick corrige el angulo del canon y los botones disparan o cambian la siguiente burbuja.",
          "The joystick fine-tunes the cannon angle, while the action buttons shoot or swap the next bubble."
        ),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
          upLabel: t(locale, "Arriba", "Up"),
          downLabel: t(locale, "Abajo", "Down"),
        }),
        rightPad: [
          control("shoot", t(locale, "Dispara", "Shoot"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("swap", t(locale, "Cambia", "Swap"), {
            type: "tap",
            tone: "accent",
            inputs: [input("Tab", "Tab")],
          }),
          control("start", "Start", {
            type: "tap",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: [
          control("restart", t(locale, "Reinicio", "Restart"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyR", "r")],
          }),
        ],
      };
    case "arcade-neon-rush":
      return {
        layout: "split",
        heading: t(locale, "Runner", "Runner"),
        hint: t(
          locale,
          "Cualquier direccion del joystick activa el salto rapido; a la derecha quedan salto y reinicio.",
          "Any joystick direction triggers the quick jump, with jump and retry buttons on the right."
        ),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowUp", "ArrowUp"),
          right: input("ArrowUp", "ArrowUp"),
          down: input("ArrowUp", "ArrowUp"),
          upLabel: t(locale, "Salto", "Jump"),
          leftLabel: t(locale, "Salto", "Jump"),
          rightLabel: t(locale, "Salto", "Jump"),
          downLabel: t(locale, "Salto", "Jump"),
        }),
        rightPad: [
          control("jump", t(locale, "Salta", "Jump"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("restart", t(locale, "Reintenta", "Retry"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyR", "r")],
          }),
        ],
        utilities: [],
      };
    case "arcade-buscaminas-classic":
      return {
        layout: "split",
        heading: t(locale, "Mina", "Mine"),
        hint: t(
          locale,
          "Mueve el cursor con joystick y usa los botones para abrir, marcar o pedir ayuda.",
          "Move the cursor with the joystick, then use action buttons to reveal, flag, or request help."
        ),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("reveal", t(locale, "Abrir", "Reveal"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
          control("flag", t(locale, "Bandera", "Flag"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyF", "f")],
          }),
          control("hint", t(locale, "Pista IA", "AI hint"), {
            type: "tap",
            inputs: [input("KeyH", "h")],
          }),
          control("ai", t(locale, "Jugada IA", "AI move"), {
            type: "tap",
            inputs: [input("KeyA", "a")],
          }),
        ],
        utilities: [
          control("restart", t(locale, "Reinicio", "Restart"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyR", "r")],
          }),
        ],
      };
    case "arcade-ice-strike-pro":
      return {
        layout: "split",
        heading: "Curling",
        hint: t(locale, "Apunta, ajusta potencia y gira la piedra.", "Aim, change power, and curl the stone."),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Pot+", "Pow+"),
          downLabel: "Sweep",
        }),
        rightPad: [
          control("inTurn", t(locale, "Giro I", "In turn"), { inputs: [input("KeyQ", "q")] }),
          control("outTurn", t(locale, "Giro O", "Out turn"), { inputs: [input("KeyE", "e")] }),
          control("throw", t(locale, "Lanza", "Throw"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-pacman-maze-protocol":
      return {
        layout: "split",
        heading: "Lumen Relay",
        hint: t(locale, "Muévete con la cruceta. Start inicia o reanuda.", "Use the D-pad to move. Start begins or resumes."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("start", "Start", {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-pong-neon-arena":
      return {
        layout: "split",
        heading: "Pong",
        hint: t(locale, "Controla la pala en vertical y el avance en profundidad.", "Control vertical movement and depth shift."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("start", "Start", {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: [
          ...utilityRow(locale),
          control("ai-difficulty", t(locale, "IA", "AI"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyI", "i")],
          }),
        ],
      };
    case "arcade-stick-brawl-showdown":
      return {
        layout: "split",
        heading: t(locale, "Combate", "Fight"),
        hint: t(locale, "Movimiento y bloqueo a la izquierda. Todo el arsenal a la derecha.", "Movement and guard on the left. Full attack kit on the right."),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Salta", "Jump"),
          downLabel: t(locale, "Bloq.", "Guard"),
        }),
        rightPad: [
          control("guard", t(locale, "Bloqueo", "Guard"), {
            type: "hold",
            tone: "utility",
            inputs: [input("KeyS", "s")],
          }),
          control("jab", "Jab", { type: "tap", tone: "primary", inputs: [input("Space", " ")] }),
          control("cross", "Cross", { type: "tap", inputs: [input("Enter", "Enter")] }),
          control("kick-light", t(locale, "Kick", "Kick"), {
            type: "tap",
            inputs: [input("KeyJ", "j")],
          }),
          control("kick-heavy", t(locale, "Smash", "Smash"), {
            type: "tap",
            inputs: [input("KeyK", "k")],
          }),
          control("projectile", t(locale, "Shot", "Shot"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyF", "f")],
          }),
          control("super", "Super", { type: "tap", tone: "primary", inputs: [input("KeyB", "b")] }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-summit-ascent":
      return {
        layout: "split",
        heading: t(locale, "Escalada", "Climb"),
        hint: t(
          locale,
          "Sube, planta anclajes, esquiva escombros y usa Cueva cuando el indicador marque una entrada cercana.",
          "Climb, plant anchors, dodge debris, and use Cave when the indicator shows a nearby entrance."
        ),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
          upLabel: t(locale, "Sube", "Climb"),
          downLabel: t(locale, "Baja", "Down"),
        }),
        leftSupportPad: [
          control("pause", t(locale, "Pausa", "Pause"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyP", "p")],
          }),
          control("restart", t(locale, "Reinicio", "Restart"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyR", "r")],
          }),
        ],
        rightPad: [
          control("anchor", t(locale, "Ancla", "Anchor"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("water", t(locale, "Agua", "Water"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyQ", "q")],
          }),
          control("cave", t(locale, "Cueva", "Cave"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyE", "e")],
          }),
          control("jump", t(locale, "Esquivar", "Dodge"), {
            type: "tap",
            tone: "primary",
            inputs: [input("KeyJ", "j")],
          }),
          control("start", "Start", {
            type: "tap",
            tone: "primary",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: [],
      };
    case "arcade-dig-hole-treasure":
      return {
        layout: "split",
        heading: t(locale, "Excavar", "Dig"),
        hint: t(locale, "Muévete, salta y usa la excavación principal.", "Move, jump, and use the main dig action."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
          upLabel: t(locale, "Salta", "Jump"),
          downLabel: t(locale, "Baja", "Down"),
        }),
        leftSupportPad: [
          control("pause", t(locale, "Pausa", "Pause"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyP", "p")],
          }),
        ],
        rightPad: [
          control("dig", t(locale, "Excava", "Dig"), {
            type: "hold",
            tone: "primary",
            inputs: [input("KeyK", "k")],
          }),
          control("interact", t(locale, "Usar", "Use"), {
            type: "tap",
            inputs: [input("Enter", "Enter")],
          }),
          control("market", t(locale, "Mercado", "Market"), {
            type: "tap",
            inputs: [input("KeyM", "m")],
          }),
          control("torch", t(locale, "Antorcha", "Torch"), {
            type: "tap",
            inputs: [input("KeyB", "b")],
          }),
          control("jetpack", t(locale, "Jetpack", "Jetpack"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyT", "t")],
          }),
          control("restart", t(locale, "Reinicio", "Restart"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyR", "r")],
          }),
        ],
        utilities: [],
      };
      /*
        hint: t(locale, "Muévete, interactúa y sirve con los botones laterales.", "Move, interact, and serve with the side buttons."),
      */
    case "arcade-neon-crypt":
      return {
        layout: "split",
        heading: t(locale, "Mazmorra", "Dungeon"),
        hint: t(locale, "Muévete, ataca y esquiva.", "Move, attack, and dash."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("attack", t(locale, "Ataque", "Attack"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("dash", "Dash", {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyE", "e")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-valle-tranquilo":
      return {
        layout: "split",
        heading: t(locale, "Granja", "Farm"),
        hint: t(
          locale,
          "Muévete, usa la herramienta activa y abre acciones clave sin depender del HUD interno.",
          "Move, use the active tool, and trigger key actions without relying on the in-game desktop HUD."
        ),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        leftSupportPad: [
          control("mine", t(locale, "Mina", "Mine"), {
            type: "tap",
            inputs: [input("KeyM", "m")],
          }),
          control("eat", t(locale, "Comer", "Eat"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyH", "h")],
          }),
          control("torch", t(locale, "Ant.", "Torch"), {
            type: "tap",
            inputs: [input("KeyT", "t")],
          }),
        ],
        rightPad: [
          control("closeModal", t(locale, "✕ Cerrar", "✕ Close"), {
            type: "tap",
            tone: "accent",
            action: "click-target",
            targetSelector: "#mb.on #m-close",
            hideWhenUnavailable: true,
          }),
          control("toolPrev", t(locale, "Herram-", "Tool-"), {
            type: "tap",
            inputs: [input("KeyQ", "q")],
          }),
          control("toolNext", t(locale, "Herram+", "Tool+"), {
            type: "tap",
            inputs: [input("Tab", "Tab")],
          }),
          control("tool", t(locale, "Usa", "Use"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("talk", t(locale, "Habla", "Talk"), {
            type: "tap",
            tone: "accent",
            inputs: [input("Enter", "Enter")],
          }),
          control("travelContext", t(locale, "Entrar", "Enter"), {
            type: "tap",
            tone: "utility",
            action: "valle-travel-context",
            hideWhenUnavailable: true,
            stateLabels: {
              exitInterior: t(locale, "Salir", "Exit"),
              exitMine: t(locale, "Salir mina", "Exit Mine"),
              enterMine: t(locale, "Entrar mina", "Enter Mine"),
              enterPortal: t(locale, "Entrar", "Enter"),
            },
          }),
          control("shop", t(locale, "Tienda", "Shop"), {
            type: "tap",
            inputs: [input("KeyB", "b")],
          }),
          control("sleep", t(locale, "Dormir", "Sleep"), {
            type: "tap",
            inputs: [input("KeyZ", "z")],
          }),
        ],
        utilities: [],
      };
    default:
      return {
        layout: "split",
        heading: t(locale, "Controles", "Controls"),
        hint: t(locale, "Cruceta a la izquierda y acciones rápidas a la derecha.", "D-pad on the left and quick actions on the right."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("primary", "A", {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("secondary", "B", {
            type: "tap",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale),
      };
  }
}
