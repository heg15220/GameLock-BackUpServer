import { getMobileShellMode } from "../utils/mobileShellProfile";

const DIRECT_TOUCH_GAME_IDS = new Set([
  "arcade-orchard-match-blast",
  "arcade-reactor-toss",
  "arcade-golf-tour-2d",
  "arcade-buscaminas-classic",
  "arcade-bubble-storm",
  "arcade-neon-rush",
]);

const t = (locale, es, en) => (locale === "en" ? en : es);
const input = (code, key) => ({ code, key });

function control(id, label, options = {}) {
  return {
    id,
    label,
    type: options.type ?? "hold",
    tone: options.tone ?? "default",
    inputs: options.inputs ?? [],
    action: options.action ?? "input",
  };
}

function fullscreenControl(locale) {
  return control(
    "fullscreen",
    t(locale, "Pantalla", "Fullscreen"),
    { type: "tap", tone: "utility", action: "fullscreen" }
  );
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
    fullscreenControl(locale),
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
        heading: t(locale, "Pala", "Paddle"),
        hint: t(locale, "Mueve la pala y lanza la bola.", "Move the paddle and launch the ball."),
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
        heading: t(locale, "Bloques", "Blocks"),
        hint: t(locale, "Mueve, rota y acelera la caída.", "Move, rotate, and drop faster."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
          upLabel: t(locale, "Gira", "Rotate"),
          downLabel: t(locale, "Baja", "Soft"),
        }),
        rightPad: [
          control("drop", t(locale, "Drop", "Hard drop"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-retro-bomber-grid":
      return {
        layout: "split",
        heading: t(locale, "Bomba", "Bomb"),
        hint: t(locale, "Muévete y planta bombas.", "Move and plant bombs."),
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
      return {
        layout: "split",
        heading: t(locale, "Aterrizaje", "Landing"),
        hint: t(locale, "Rota y usa el propulsor.", "Rotate and use thrust."),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Thrust", "Thrust"),
          downLabel: t(locale, "Brake", "Brake"),
        }),
        rightPad: [],
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
  const baseMode = getMobileShellMode(game, viewport);
  if (baseMode !== "dual-screen") {
    return baseMode;
  }
  return DIRECT_TOUCH_GAME_IDS.has(game?.id) ? "mobile-first" : baseMode;
}

export function getMobileControlProfile(game, locale = "es") {
  const gameId = String(game?.id ?? "");

  if (DIRECT_TOUCH_GAME_IDS.has(gameId)) {
    return null;
  }

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

  switch (gameId) {
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
          control("jump", t(locale, "Salta", "Jump"), {
            type: "hold",
            tone: "accent",
            inputs: [input("KeyW", "w")],
          }),
          control("kick", t(locale, "Disparo", "Kick"), {
            type: "hold",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("start", "Start", {
            type: "tap",
            tone: "utility",
            inputs: [input("Enter", "Enter")],
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
    case "arcade-billar-pool-club":
      return {
        layout: "split",
        leftPadMode: "buttons",
        heading: t(locale, "Billar", "Pool"),
        hint: t(locale, "La cruceta ajusta ángulo y potencia. El botón principal tira.", "The D-pad adjusts angle and power. Main button shoots."),
        leftPad: [
          control("powerUp", t(locale, "Pot+", "Pow+"), {
            inputs: [input("KeyW", "w")],
            tone: "accent",
          }),
          control("aimLeft", t(locale, "Aim -", "Aim -"), {
            inputs: [input("KeyA", "a")],
          }),
          control("aimRight", t(locale, "Aim +", "Aim +"), {
            inputs: [input("KeyD", "d")],
          }),
          control("powerDown", t(locale, "Pot-", "Pow-"), {
            inputs: [input("KeyS", "s")],
          }),
        ],
        rightPad: [
          control("shoot", t(locale, "Tiro", "Shoot"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("nextRack", t(locale, "Siguiente", "Next rack"), {
            type: "tap",
            tone: "utility",
            inputs: [input("KeyN", "n")],
          }),
          control("pushOut", t(locale, "Push Out", "Push Out"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyO", "o")],
          }),
          control("safety", "Safety", {
            type: "tap",
            inputs: [input("KeyV", "v")],
          }),
          control("place", t(locale, "Auto", "Auto"), {
            type: "tap",
            inputs: [input("KeyP", "p")],
          }),
        ],
        utilities: [fullscreenControl(locale)],
      };
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
        heading: "Pac-Man",
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
        utilities: utilityRow(locale),
      };
    case "arcade-stick-brawl-showdown":
      return {
        layout: "split",
        heading: t(locale, "Combate", "Fight"),
        hint: t(locale, "Movimiento a la izquierda. Ataques y defensa a la derecha.", "Movement on the left. Attacks and guard on the right."),
        leftPad: directionalPad(locale, {
          up: input("KeyW", "w"),
          left: input("KeyA", "a"),
          right: input("KeyD", "d"),
          down: input("KeyS", "s"),
          upLabel: t(locale, "Salta", "Jump"),
          downLabel: t(locale, "Bloq.", "Guard"),
        }),
        rightPad: [
          control("jab", "Jab", { type: "tap", tone: "primary", inputs: [input("Space", " ")] }),
          control("cross", "Cross", { type: "tap", inputs: [input("Enter", "Enter")] }),
          control("super", "Super", { type: "tap", tone: "accent", inputs: [input("KeyB", "b")] }),
        ],
        utilities: utilityRow(locale),
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
        ],
        utilities: utilityRow(locale),
      };
    case "arcade-kitchen-rush-2d":
      return {
        layout: "split",
        heading: t(locale, "Cocina", "Kitchen"),
        hint: t(locale, "Muévete, interactúa y sirve con los botones laterales.", "Move, interact, and serve with the side buttons."),
        leftPad: directionalPad(locale, {
          up: input("ArrowUp", "ArrowUp"),
          left: input("ArrowLeft", "ArrowLeft"),
          right: input("ArrowRight", "ArrowRight"),
          down: input("ArrowDown", "ArrowDown"),
        }),
        rightPad: [
          control("interact", t(locale, "Usar", "Use"), {
            type: "tap",
            tone: "accent",
            inputs: [input("KeyE", "e")],
          }),
          control("cut", t(locale, "Corta", "Cut"), {
            type: "tap",
            tone: "primary",
            inputs: [input("Space", " ")],
          }),
          control("serve", t(locale, "Sirve", "Serve"), {
            type: "tap",
            inputs: [input("Enter", "Enter")],
          }),
        ],
        utilities: utilityRow(locale),
      };
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
        rightPad: [
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
          control("shop", t(locale, "Tienda", "Shop"), {
            type: "tap",
            inputs: [input("KeyB", "b")],
          }),
          control("toolNext", t(locale, "Herram+", "Tool+"), {
            type: "tap",
            inputs: [input("Tab", "Tab")],
          }),
          control("toolPrev", t(locale, "Herram-", "Tool-"), {
            type: "tap",
            inputs: [input("KeyQ", "q")],
          }),
          control("sleep", t(locale, "Dormir", "Sleep"), {
            type: "tap",
            inputs: [input("KeyZ", "z")],
          }),
          control("mine", t(locale, "Mina", "Mine"), {
            type: "tap",
            inputs: [input("KeyM", "m")],
          }),
        ],
        utilities: [fullscreenControl(locale)],
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
