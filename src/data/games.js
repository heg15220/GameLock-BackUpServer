import neonDriftImage from "../assets/games/neon-drift.svg";
import puzzleVaultImage from "../assets/games/puzzle-vault.svg";
import wordBlitzImage from "../assets/games/word-blitz.svg";
import colonyArchitectImage from "../assets/games/colony-architect.svg";
import rhythmReactorImage from "../assets/games/rhythm-reactor.svg";
import cardTacticsImage from "../assets/games/card-tactics.svg";
import skyRunnerImage from "../assets/games/sky-runner.svg";
import neonDojoImage from "../assets/games/neon-dojo.svg";
import headSoccerArenaImage from "../assets/games/head-soccer-arena.svg";
import pacmanMazeProtocolImage from "../assets/games/pacman-maze-protocol.svg";
import pongNeonArenaImage from "../assets/games/pong-neon-arena.svg";
import arcadeBuscaminasClassicImage from "../assets/games/arcade-buscaminas-classic.svg";
import arcadeBillarPoolClubImage from "../assets/games/arcade-billar-pool-club.svg";
import arcadeBowlingProTourImage from "../assets/games/arcade-bowling-pro-tour.svg";
import arcadePenaltyNeuralKeeperImage from "../assets/games/arcade-penalty-neural-keeper.svg";
import arcadeCosmicVanguardImage from "../assets/games/arcade-cosmic-vanguard.svg";
import arcadeGolfTour2DImage from "../assets/games/arcade-golf-tour-2d.svg";
import arcadeArcheryHorizonImage from "../assets/games/arcade-archery-horizon.svg";
import arcadePinballWizardImage from "../assets/games/arcade-pinball-wizard.svg";
import arcadeBubbleStormImage from "../assets/games/arcade-bubble-storm.svg";
import arcadeIceStrikeProImage from "../assets/games/arcade-ice-strike-pro.svg";
import arcadeNeonCryptImage from "../assets/games/arcade-neon-crypt.svg";
import arcadeNeonRushImage from "../assets/games/arcade-neon-rush.svg";
import arcadeStickBrawlShowdownImage from "../assets/games/arcade-stick-brawl-showdown.svg";
import sportsBasketballCourtImage from "../assets/games/sports-basketball-court.svg";
import arcadeOrchardMatchBlastImage from "../assets/games/arcade-orchard-match-blast.svg";
import arcadeReactorTossImage from "../assets/games/arcade-reactor-toss.svg";
import arcadeTerritoryWarImage from "../assets/games/arcade-territory-war.svg";
import arcadeRetroSnakeClassicImage from "../assets/games/arcade-retro-snake-classic.svg";
import arcadeRetroBreakout1986Image from "../assets/games/arcade-retro-breakout-1986.svg";
import arcadeRetroSpaceInvadersImage from "../assets/games/arcade-retro-space-invaders.svg";
import arcadeRetroTetrisBlockfallImage from "../assets/games/arcade-retro-tetris-blockfall.svg";
import arcadeRetroFroggerCrossingImage from "../assets/games/arcade-retro-frogger-crossing.svg";
import arcadeRetroBomberGridImage from "../assets/games/arcade-retro-bomber-grid.svg";
import arcadeRetroGalagaQuantumImage from "../assets/games/arcade-retro-galaga-quantum.svg";
import arcadeRetroQbertPrismImage from "../assets/games/arcade-retro-qbert-prism.svg";
import arcadeRetroLunarLanderOrbitImage from "../assets/games/arcade-retro-lunar-lander-orbit.svg";
import arcadeRetroCentipedeCircuitImage from "../assets/games/arcade-retro-centipede-circuit.svg";
import arcadeRetroRiverRaidNeonImage from "../assets/games/arcade-retro-river-raid-neon.svg";
import arcadeRetroTronLightcyclesImage from "../assets/games/arcade-retro-tron-lightcycles.svg";
import arcadeRetroRoadFighterSynthImage from "../assets/games/arcade-retro-road-fighter-synth.svg";
import knowledgeSudokuImage from "../assets/games/knowledge-sudoku.svg";
import knowledgeDominoImage from "../assets/games/knowledge-domino.svg";
import knowledgeAhorcadoImage from "../assets/games/knowledge-ahorcado.svg";
import knowledgePacienciaImage from "../assets/games/knowledge-paciencia.svg";
import knowledgePuzleImage from "../assets/games/knowledge-puzle.svg";
import knowledgeCrucigramaImage from "../assets/games/knowledge-crucigrama.svg";
import knowledgeSopaLetrasImage from "../assets/games/knowledge-sopa-letras.svg";
import knowledgeWordleImage from "../assets/games/knowledge-wordle.svg";
import knowledgeAnagramasImage from "../assets/games/knowledge-anagramas.svg";
import knowledgeCalculoMentalImage from "../assets/games/knowledge-calculo-mental.svg";
import knowledgeIqMastersImage from "../assets/games/knowledge-iq-masters.svg";
import knowledgeTablaPeriodicaImage from "../assets/games/knowledge-tabla-periodica.svg";
import knowledgeMapasImage from "../assets/games/knowledge-mapas.svg";
import knowledgeAdivinaPaisImage from "../assets/games/knowledge-adivina-pais.svg";
import knowledgeTangramImage from "../assets/games/knowledge-tangram.svg";
import knowledgeCronologiaImage from "../assets/games/knowledge-cronologia.svg";
import knowledgeRefranesImage from "../assets/games/knowledge-refranes.svg";
import knowledgeWikipediaGachaImage from "../assets/games/knowledge-wikipedia-gacha.svg";
import chessGrandmasterArenaImage from "../assets/games/chess-grandmaster-arena.svg";
import strategySudokuTecnicasImage from "../assets/games/strategy-sudoku-tecnicas.svg";
import strategyHundirFlotaProImage from "../assets/games/strategy-hundir-flota-pro.svg";
import strategyDamasProfesionalImage from "../assets/games/strategy-damas-professional.svg";
import strategyPokerNoBetImage from "../assets/games/strategy-poker-no-bet.svg";
import strategyParchisLudotekaImage from "../assets/games/strategy-parchis-ludoteka.svg";
import strategyBarajaIaImage from "../assets/games/strategy-baraja-ia.svg";
import strategyMansionTripleEnigmaImage from "../assets/games/strategy-mansion-triple-enigma.svg";
import race2dproImage from "../assets/games/race2dpro.svg";
import sunsetSlipstreamImage from "../assets/games/sunset-slipstream.svg";

/**
 * Game catalog
 * ─────────────────────────────────────────────────────────────────────────────
 * Each entry contains a Spanish (default) set of fields plus *_en counterparts
 * for the English locale.  The helper getLocalizedGame() in src/i18n/index.js
 * picks the correct set based on the browser language.
 *
 * REQUIRED FIELDS PER GAME
 *   id          – unique slug, used as the component registry key
 *   image       – imported SVG asset
 *   category    – Spanish key used internally for filtering  (no accents, e.g. "Accion")
 *   sessionTime – language-neutral duration string, e.g. "3-6 min"
 *
 * LOCALIZED FIELDS (add both es and _en versions)
 *   title / title_en               – game name (often the same)
 *   tagline / tagline_en           – one-liner shown on the card
 *   description / description_en   – paragraph shown in the launch modal
 *   highlights / highlights_en     – bullet list of key features
 *   difficulty / difficulty_en     – difficulty label
 *   multiplayer / multiplayer_en   – mode label (Solo / Solo vs AI …)
 *   viability / viability_en       – technical viability note
 *   visualStyle / visualStyle_en   – art-direction note
 *   techFocus / techFocus_en       – tech note
 *   objective_es / objective_en    – 1-2 sentence goal statement (shown in modal)
 *   howToPlay_es / howToPlay_en    – brief control summary (shown in modal)
 */
export const games = [
  // ── Adventure ──────────────────────────────────────────────────────────────
  {
    id: "adventure-echoes",
    image: colonyArchitectImage,
    sessionTime: "4-7 min",

    title: "Echoes of the Lost Temple",
    category: "Aventura",
    tagline: "Aventura arcade táctica con pistas, salto de riesgo y extracción final.",
    description:
      "Aventura de exploración por casillas donde cada paso importa. Gestiona vida, energía, luz y amenaza mientras rastreas la reliquia oculta y vuelves al campamento base antes de quedarte sin margen.",
    objective_es: "Encuentra la reliquia oculta y vuelve al campamento base antes de quedarte sin vida, energía o margen.",
    howToPlay_es: "Muévete con WASD/flechas. Busca pistas, escanea amenazas, gestiona raciones y usa la baliza para ampliar visión. El salto táctico (B) te permite esquivar trampas críticas.",
    highlights: [
      "Mapa táctico con niebla de guerra y visión extendida por baliza.",
      "Salto táctico temporal para esquivar trampas críticas.",
      "Pistas de distancia/dirección para mantener reto sin frustración.",
      "Gestión de riesgo con raciones y amenaza dinámica.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: mecánicas por turnos y estado ligero en cliente.",
    visualStyle: "Selva táctica con niebla, capas de escenario y telemetría de amenaza.",
    techFocus: "Director de riesgo, salto táctico tipo action-adventure y escaneo con pistas.",

    category_en: "Adventure",
    tagline_en: "Tactical arcade adventure with clues, risk jumps and final extraction.",
    description_en:
      "A tile-based exploration adventure where every step matters. Manage health, energy, light and threat while tracking the hidden relic and returning to base camp before your margins run out.",
    objective_en: "Find the hidden relic and return to base camp before running out of health, energy or margin.",
    howToPlay_en: "Move with WASD/arrows. Search for clues, scan threats, manage rations and use the beacon to expand vision. Tactical jump (B) lets you skip critical traps.",
    highlights_en: [
      "Tactical map with fog of war and extended vision via beacon.",
      "Temporary tactical jump to dodge critical traps.",
      "Distance/direction clues to keep the challenge without frustration.",
      "Risk management with rations and dynamic threat.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: turn-based mechanics and lightweight client state.",
    visualStyle_en: "Tactical jungle with fog, scene layers and threat telemetry.",
    techFocus_en: "Risk director, action-adventure tactical leap and clue-based scanning.",
  },

  // ── Action ─────────────────────────────────────────────────────────────────
  {
    id: "action-core-strike",
    image: rhythmReactorImage,
    sessionTime: "2-4 min",

    title: "Core Strike Arena",
    category: "Accion",
    tagline: "Arena shooter por rondas con foco, overdrive y score competitivo.",
    description:
      "Combate intenso contra una IA ofensiva. Debes leer la intención rival, administrar foco/munición y reaccionar con rapidez para tumbar al enemigo antes de que termine el cronómetro de arena.",
    objective_es: "Derrota al enemigo antes de que acabe el cronómetro. Sobrevive tres rondas acumulando el mayor score posible.",
    howToPlay_es: "Muévete con WASD/flechas. Alterna entre ráfaga, cohete, overdrive, defensa y botiquín según la situación de cada ronda.",
    highlights: [
      "Sistema de combate reactivo con overdrive y botiquines limitados.",
      "Tres rondas con escalado de vida enemiga y bonus por tiempo.",
      "Intención enemiga visible para decisiones tácticas más limpias.",
      "Partidas cortas con curva de riesgo clara.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo vs IA",
    viability: "Alta: bucle en tiempo real con intervalos controlados.",
    visualStyle: "Arena shooter estilizada con telemetría de combate y amenazas visibles.",
    techFocus: "Formato por rondas, lectura de intención enemiga, score y gestión de cooldowns.",

    category_en: "Action",
    tagline_en: "Round-based arena shooter with focus, overdrive and competitive score.",
    description_en:
      "Intense combat against an offensive AI. Read the enemy's intent, manage focus/ammo and react quickly to take down the enemy before the arena timer runs out.",
    objective_en: "Defeat the enemy before the timer runs out. Survive three rounds with the highest score possible.",
    howToPlay_en: "Move with WASD/arrows. Alternate between burst, rocket, overdrive, defense and medkit depending on each round's situation.",
    highlights_en: [
      "Reactive combat system with overdrive and limited medkits.",
      "Three rounds with escalating enemy health and time bonus.",
      "Visible enemy intent for cleaner tactical decisions.",
      "Short matches with a clear risk curve.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: real-time loop with controlled intervals.",
    visualStyle_en: "Stylized arena shooter with combat telemetry and visible threats.",
    techFocus_en: "Round format, enemy intent reading, score and cooldown management.",
  },

  // ── Adventure (platformer) ─────────────────────────────────────────────────
  {
    id: "platformer-sky-runner",
    image: skyRunnerImage,
    sessionTime: "3-6 min",

    title: "Sky Runner DX",
    category: "Aventura",
    tagline: "Plataformas 2D arcade con 32 sectores artesanales, biomas avanzados y jefes con variantes.",
    description:
      "Run arcade inspirado en plataformas retro: ahora hay 32 sectores artesanales con biomas propios, zonas de viento, springs, checkpoints, hazards y varios bosses de comportamiento diferenciado. Cada partida compone una ruta de 8 sectores y siempre remata con un nuevo jefe final.",
    objective_es: "Completa una ruta de 8 sectores, asegura checkpoints, domina los hazards y derrota a los bosses hasta capturar el cubo final.",
    howToPlay_es: "A/D o flechas para moverte, W/arriba/espacio para saltar, F activa el power-up de fuego. Springs, corrientes de viento y checkpoints forman parte de la ruta.",
    highlights: [
      "Pool de 32 sectores artesanales con biomas forestales, tormenta, tóxicos, crepusculares y celestiales.",
      "Ruta de 8 sectores por run con layouts side-scroll, verticales e híbridos.",
      "Varios encuentros de jefe por partida con barra de vida, variantes y jefe final nuevo.",
      "Física arcade consistente con coyote time y jump buffer.",
      "IA enemiga de patrulla, jumper y jefes con perfiles ofensivos distintos.",
      "Checkpoints, springs, viento y hazards visualmente telegrafiados.",
      "Power-up de fuego para derrotar enemigos a distancia.",
      "Estado QA exportado para automatización de pruebas.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: motor modular Canvas con game loop fijo y colisiones por tiles.",
    visualStyle: "Pixel-art retro con parallax multicapa, biomas nuevos, overlays ambientales y HUD táctico integrado.",
    techFocus: "Arquitectura modular con 32 sectores, reachability reforzada, bosses por variante y telemetría de entorno.",

    category_en: "Adventure",
    tagline_en: "2D arcade platformer with 32 handcrafted sectors, advanced biomes and variant bosses.",
    description_en:
      "A retro platformer run rebuilt around 32 handcrafted sectors with distinct biomes, wind zones, springs, checkpoints, hazards and several differentiated bosses. Each session assembles an 8-sector route and always ends with a new final boss.",
    objective_en: "Complete an 8-sector route, secure checkpoints, master hazards and defeat the bosses to capture the final cube.",
    howToPlay_en: "A/D or arrows to move, W/up/space for variable jump, F to activate the fire power-up. Springs, wind lanes and checkpoints are part of the route.",
    highlights_en: [
      "Pool of 32 handcrafted sectors across forest, storm, toxic, sunset and celestial biomes.",
      "8-sector routes with side-scroll, vertical and hybrid layouts.",
      "Multiple boss encounters per run with health bars, variants and a new final boss.",
      "Consistent arcade physics with coyote time and jump buffer.",
      "Patrol AI, jumper enemies and bosses with differentiated offensive profiles.",
      "Checkpoints, springs, wind lanes and telegraphed hazards.",
      "Fire power-up to defeat distant enemies.",
      "Exported QA state for test automation.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: modular Canvas engine with fixed game loop and tile collisions.",
    visualStyle_en: "Retro pixel-art with multi-layer parallax, new biomes, environmental overlays and integrated tactical HUD.",
    techFocus_en: "Modular architecture with 32 sectors, reinforced reachability, boss variants and environment telemetry.",
  },

  // ── Action (fighter) ───────────────────────────────────────────────────────
  {
    id: "fighter-neon-dojo",
    image: neonDojoImage,
    sessionTime: "2-5 min",

    title: "Neon Dojo Clash",
    category: "Accion",
    tagline: "Fighting 2D con guardia, combos, medidor y rival IA.",
    description:
      "Combate 1v1 enfocado en fundamentos de fighting games: confirmar golpes, gestionar guardia y decidir cuándo gastar meter en un special de alto impacto.",
    objective_es: "Reduce la vida del oponente a cero antes de que lo haga él. Usa combos, guardia y especiales de forma estratégica.",
    howToPlay_es: "A/D o flechas para moverte, W/arriba para saltar. J/espacio jab, K/enter heavy, L/abajo guardia, U/B especial.",
    highlights: [
      "Ataques light/heavy/special con startup/active/recovery.",
      "Guardia con ruptura y castigo por sobreuso.",
      "Input buffer para confirmar secuencias cortas de combo.",
      "IA reactiva que ajusta distancia y elección de ataque.",
      "Feedback audiovisual de impacto, bloqueo y ruptura de guardia.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo vs IA",
    viability: "Alta: loop en tiempo real con hitbox lógica e input buffer.",
    visualStyle: "Arena neón de combate con luchadores humanos animados por estado.",
    techFocus: "State machine de lucha, ventana de ataques y audio por hit/block/KO.",

    category_en: "Action",
    tagline_en: "2D fighting with guard, combos, meter and AI opponent.",
    description_en:
      "1v1 combat focused on fighting game fundamentals: confirm hits, manage guard and decide when to spend meter on a high-impact special move.",
    objective_en: "Reduce the opponent's health to zero before they do the same. Use combos, guard and specials strategically.",
    howToPlay_en: "A/D or arrows to move, W/up to jump. J/space jab, K/enter heavy, L/down guard, U/B special.",
    highlights_en: [
      "Light/heavy/special attacks with startup/active/recovery frames.",
      "Guard with break mechanic and penalty for overuse.",
      "Input buffer for confirming short combo sequences.",
      "Reactive AI that adjusts distance and attack choice.",
      "Audiovisual feedback for impact, block and guard break.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: real-time loop with logical hitboxes and input buffer.",
    visualStyle_en: "Neon combat arena with state-animated human fighters.",
    techFocus_en: "Fighting state machine, attack windows and per-hit/block/KO audio.",
  },

  // ── Arcade ─────────────────────────────────────────────────────────────────
  {
    id: "arcade-pacman-maze-protocol",
    image: pacmanMazeProtocolImage,
    sessionTime: "4-9 min",

    title: "Pac-Man Maze Protocol",
    category: "Arcade",
    tagline: "Arcade de laberinto con persecución, pellets, power mode y FSM de fantasmas.",
    description:
      "Versión completa de Pac-Man con mapa por tiles, túneles laterales, 4 fantasmas con comportamientos diferenciados, sistema de vidas/puntuación/niveles y modo debug para validar IA y colisiones.",
    objective_es: "Recoge todos los pellets del laberinto sin ser atrapado por los fantasmas. Usa power pellets para revertir los roles.",
    howToPlay_es: "WASD o flechas para moverte. Enter/Espacio para empezar, P/Esc para pausa, R reinicia, M activa el sonido.",
    highlights: [
      "FSM de fantasmas con modos scatter, chase, frightened y eaten.",
      "Targeting fiel: Blinky/Pinky/Inky/Clyde con reglas distintas.",
      "Power pellets con bonus de fantasmas encadenado (200/400/800/1600).",
      "Loop fijo 60 ticks + render Canvas y puente QA render_game_to_text.",
      "HUD con score, high score persistente, vidas, nivel y métricas de frame.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: motor Canvas 2D desacoplado con IA por estados y pathfinding BFS.",
    visualStyle: "Laberinto neón oscuro con lectura clara de rutas, pellets y estados de fantasmas.",
    techFocus: "Arquitectura modular engine/world/entities/ai/state + HUD React desacoplado.",

    category_en: "Arcade",
    tagline_en: "Maze arcade with pursuit, pellets, power mode and ghost FSM.",
    description_en:
      "Full Pac-Man with tile map, side tunnels, 4 ghosts with distinct behaviors, lives/score/levels system and debug mode to validate AI and collisions.",
    objective_en: "Collect all pellets in the maze without being caught by ghosts. Use power pellets to reverse roles.",
    howToPlay_en: "WASD or arrows to move. Enter/Space to start, P/Esc to pause, R restart, M toggle sound.",
    highlights_en: [
      "Ghost FSM with scatter, chase, frightened and eaten modes.",
      "Faithful targeting: Blinky/Pinky/Inky/Clyde with distinct rules.",
      "Power pellets with chained ghost bonus (200/400/800/1600).",
      "Fixed 60-tick loop, Canvas render and QA bridge render_game_to_text.",
      "HUD with score, persistent high score, lives, level and frame metrics.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: decoupled 2D Canvas engine with FSM AI and BFS pathfinding.",
    visualStyle_en: "Dark neon maze with clear route, pellet and ghost-state readability.",
    techFocus_en: "Modular engine/world/entities/ai/state architecture + decoupled React HUD.",
  },

  {
    id: "arcade-stick-brawl-showdown",
    image: arcadeStickBrawlShowdownImage,
    sessionTime: "3-8 min",

    title: "Stick Brawl Showdown",
    category: "Arcade",
    tagline: "Fighting arcade 1v1 con IA adaptativa, fisicas refinadas y escenarios dinamicos de alta calidad.",
    description:
      "Combate stickman competitivo creado para la seccion Arcade: incluye motor fisico con momentum, knockback progresivo, guard break, regeneracion de vida condicionada y una IA que lee patrones del jugador para ajustar su estrategia en tiempo real.",
    objective_es: "Gana el mejor de tres rounds reduciendo la vida rival a cero o llegando con ventaja al final del tiempo.",
    howToPlay_es:
      "A/D o flechas para moverte, W o arriba para saltar, S o abajo para bloquear. G/espacio jab, H/enter cross, J patada, K roundhouse, F proyectil y B super (requiere barra llena). P pausa, R reinicia round.",
    highlights: [
      "5 escenarios detallados con atmosfera propia: Neon Rooftop, Obsidian Forge, Aurora Icefield, Storm Temple y Sunset Dunes.",
      "Fisica de combate mejorada: aceleracion, friccion, hitstun, knockback escalado y empuje entre cuerpos.",
      "Sistema tactico de vida y defensa: chip damage, guard break y regeneracion parcial de vida fuera de intercambio.",
      "IA con razonamiento dinamico por distancia, agresividad rival, patron de entradas y contexto de ronda.",
      "Super burst + proyectiles para control de espacio y cierre de rounds.",
      "Bridge QA con `render_game_to_text` y `advanceTime` para validacion automatizada.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo vs IA",
    viability: "Alta: runtime Canvas determinista integrado en React con estado serializable y telemetria clara.",
    visualStyle: "Neo-arcade cinematografico con capas parallax, clima dinamico, glow competitivo y feedback de impacto.",
    techFocus: "State machine de lucha, IA adaptativa basada en patron, control de recursos (vida/guardia/super) y pipeline Canvas 2D.",

    category_en: "Arcade",
    tagline_en: "1v1 arcade fighter with adaptive AI, refined physics, and high-detail dynamic stages.",
    description_en:
      "Competitive stickman combat built for the Arcade category, featuring momentum-driven physics, progressive knockback, guard break, conditional health regeneration, and AI that reads player patterns to adapt strategy in real time.",
    objective_en: "Win a best-of-three set by KO or by holding the health lead when the timer expires.",
    howToPlay_en:
      "A/D or arrows to move, W/up to jump, S/down to block. G/space jab, H/enter cross, J kick, K roundhouse, F projectile, and B super (full meter required). P pauses and R restarts the round.",
    highlights_en: [
      "5 handcrafted arenas with distinct atmosphere: Neon Rooftop, Obsidian Forge, Aurora Icefield, Storm Temple, and Sunset Dunes.",
      "Upgraded combat physics: acceleration, friction, hitstun, scaled knockback, and body push resolution.",
      "Tactical sustain model with chip damage, guard break, and conditional out-of-combat health regeneration.",
      "Dynamic AI reasoning based on spacing, opponent aggression, input patterns, and round context.",
      "Super burst and projectile layers for space control and round closing.",
      "QA bridge with `render_game_to_text` and `advanceTime` hooks for deterministic testing.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: deterministic Canvas runtime embedded in React with serializable state and clean telemetry.",
    visualStyle_en: "Cinematic neo-arcade direction with parallax layers, dynamic weather, competitive glow, and strong hit feedback.",
    techFocus_en: "Fighting state machine, pattern-aware adaptive AI, resource economy (health/guard/super), and a 2D Canvas render pipeline.",
  },

  {
    id: "arcade-reactor-toss",
    image: arcadeReactorTossImage,
    sessionTime: "1-3 min",

    title: "Flux Basin",
    category: "Arcade",
    tagline: "Desliza para lanzar la pelota rayada al cubo. ¡Domina los rebotes en 12 niveles!",
    description:
      "Arcade de fisica al estilo TigerBall (Laxarus P.C., 2016): desliza en la direccion del lanzamiento, calibra la fuerza y deja que la gravedad y los rebotes lleven la pelota rayada directo al cubo azul.",
    objective_es:
      "Supera 12 niveles encestando la pelota en el cubo antes de quedarte sin vidas. Usa el comodin de forma tactica cuando el camino se cierre.",
    howToPlay_es:
      "Touch/raton: desliza en la direccion que deseas lanzar y suelta para disparar — la velocidad del deslizamiento determina la fuerza. Teclado: flechas o A/D ajustan angulo, W/S potencia, Enter/Espacio lanza, B comodin, R reinicia, P pausa.",
    highlights: [
      "Control de deslizamiento intuitivo: la direccion y velocidad del swipe definen angulo y fuerza.",
      "Fisica realista con gravedad, rebotes energeticos en paredes, plataformas y cubos.",
      "12 niveles de dificultad progresiva: anillos, bloques amarillos, sierras giratorias y zonas de peligro.",
      "Tres tipos de piel de pelota: Tigre, Abeja, Sandia y Clasica.",
      "Comodin limitado para resolver impases sin romper el ritmo arcade.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: motor Canvas 2D propio con fisica ligera, colisiones discretas y estado serializable.",
    visualStyle: "Paleta menta-turquesa con pelota rayada, cubos cilindricas teal, bloques amarillos y estrellas doradas.",
    techFocus: "Fisica de proyectil con swipe-to-throw, colision circulo-AABB, progresion por niveles y bridge QA.",
    tagline: "Arcade mobile-first de fisica y precision: tira hacia atras, rebota y captura la orbita en una capsula magnetica.",
    description:
      "Arcade 2D original ambientado en una fundicion neon-industrial. Dominas una orbita energetica con un unico gesto principal: tirar hacia atras y soltar. La dificultad crece con bumpers, rampas, compuertas temporizadas, portales, ventiladores, campos de gravedad y superficies gel.",
    objective_es:
      "Completa 100 niveles cortos llevando la orbita hasta la capsula receptora con el menor numero posible de intentos, rebotes y tiempo.",
    howToPlay_es:
      "Touch/raton: tira hacia atras desde la orbita y suelta. Teclado: flechas/A-D apuntan, W/S ajustan potencia, Enter/Espacio lanza, P pausa, R reinicia, L abre seleccion de nivel y F alterna pantalla completa.",
    highlights: [
      "100 niveles mobile-first con curva pedagogica: directo, bank shot, timing, portales y combinaciones.",
      "10 prefabs de obstaculo preparados para escalar a nuevos mundos y 100+ niveles.",
      "Sistema propio de 3 estrellas por precision, tiempo, limpieza y primer intento.",
      "5 skins desbloqueables por estrellas acumuladas y guardado local versionado.",
      "Feedback premium: preview limitada, trails, particulas, micro camera shake y vibracion movil.",
    ],
    viability: "Alta: runtime Canvas 2D desacoplado con fisica legible, guardado local y bridge QA determinista.",
    visualStyle: "Laboratorio neon-industrial con materiales cartoon-premium, fondos oscuros de alto contraste y UI tactil compacta.",
    techFocus: "Arquitectura modular por capas (physics/level/entities/systems/services), prefabs parametrizables y HUD React desacoplado.",

    category_en: "Arcade",
    tagline_en: "Swipe to toss the striped ball into the cup. Master the rebounds across 12 levels!",
    description_en:
      "A physics arcade in the spirit of TigerBall (Laxarus P.C., 2016): swipe in the throw direction, gauge the power, and let gravity and bounces carry the striped ball straight into the teal cup.",
    objective_en:
      "Clear 12 levels by sinking the ball into the cup before running out of lives. Use the wildcard tactically when a lane closes down.",
    howToPlay_en:
      "Touch/mouse: swipe in the throw direction and release to shoot — swipe speed sets the power. Keyboard: arrows or A/D adjust angle, W/S power, Enter/Space fires, B wildcard, R restart, P pause.",
    highlights_en: [
      "Intuitive swipe control: swipe direction and speed set angle and launch power.",
      "Realistic physics with gravity, high-energy wall/platform/cup rebounds.",
      "12 levels of progressive difficulty: rings, yellow sun-blocks, spinning saws, and danger zones.",
      "Four ball skins: Tiger, Bee, Watermelon, Classic.",
      "Limited wildcard to solve bottlenecks without breaking the arcade pace.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: custom Canvas 2D runtime with lightweight physics, discrete collisions, and serializable state.",
    visualStyle_en: "Mint-teal palette with striped ball, teal cylindrical cups, yellow sun-blocks, and golden stars.",
    techFocus_en: "Projectile physics with swipe-to-throw, circle-vs-AABB collisions, level progression, and QA bridge.",
    tagline_en: "Mobile-first physics arcade: pull back, bank cleanly, and secure the orb inside a magnetic capsule.",
    description_en:
      "An original 2D physics arcade set inside a neon-industrial foundry. You command an energy orb with one main gesture: pull back and release. Difficulty escalates through bumpers, ramps, timed gates, portals, fans, gravity wells, and gel surfaces.",
    objective_en:
      "Clear 100 short levels by guiding the orb into the receiver capsule with as few attempts, rebounds, and seconds as possible.",
    howToPlay_en:
      "Touch/mouse: pull back from the orb and release. Keyboard: arrows/A-D aim, W/S power, Enter/Space launch, P pause, R restart, L opens level select, and F toggles fullscreen.",
    highlights_en: [
      "100 mobile-first levels with a proper teaching curve: direct shots, banks, timing, portals, and layered combinations.",
      "10 obstacle prefabs ready to scale into new worlds and 100+ levels.",
      "Original 3-star system based on precision, time, cleanliness, and first-try clears.",
      "5 unlockable skins tied to cumulative stars plus versioned local save data.",
      "Premium feedback: limited preview, trails, particles, micro camera shake, and mobile vibration.",
    ],
    viability_en: "High: decoupled Canvas 2D runtime with readable physics, local save, and deterministic QA hooks.",
    visualStyle_en: "Neon-industrial laboratory with cartoon-premium materials, high-contrast dark backdrops, and compact tactile UI.",
    techFocus_en: "Modular architecture across physics/level/entities/systems/services, parameterized prefabs, and a React HUD separated from simulation.",
  },

  {
    id: "arcade-territory-war",
    image: arcadeTerritoryWarImage,
    sessionTime: "4-10 min",

    title: "Territory War: Stick Arena",
    category: "Arcade",
    tagline: "Estrategia por turnos estilo Territory War con granadas, salto y control de altura.",
    description:
      "Arcade tactico por turnos inspirado en Territory War: cada ronda activas un stickman, te reposicionas con movimiento limitado, ajustas angulo/potencia y lanzas granadas para eliminar el escuadron rival.",
    objective_es: "Deja al equipo contrario sin unidades vivas. El ultimo equipo en pie gana la partida.",
    howToPlay_es:
      "A/D o flechas para mover, W o arriba para saltar, Q/E o arriba/abajo para ajustar el angulo, mantener Espacio o click para cargar potencia y soltar para lanzar. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Combate 1v1 hasta 6v6 con turnos alternos, viento dinamico y cuenta atras por turno.",
      "Fisica de proyectil con gravedad, rebotes y explosiones de area con dano y knockback.",
      "IA rival que selecciona objetivos y calcula tiros balisticos con variacion controlada.",
      "Tres mapas inspirados en Territory War (wasteland, graveyard, island) con plataformas elevadas.",
      "Bridge QA con `render_game_to_text` y `advanceTime` para test automatizado determinista.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo vs CPU",
    viability: "Alta: runtime Canvas 2D con reglas claras de turnos y simulacion determinista.",
    visualStyle: "Estetica stickman clasica con cielo luminoso, plataformas de troncos y HUD competitivo.",
    techFocus: "Turn manager, artilleria paraboloide, IA de punteria y resolucion de dano por radio.",

    category_en: "Arcade",
    tagline_en: "Territory War style turn-based strategy with grenades, jumps, and high-ground control.",
    description_en:
      "Turn-based tactical arcade inspired by Territory War: each round you control one stickman, reposition with limited movement, set angle/power, and throw grenades to wipe the rival squad.",
    objective_en: "Eliminate every enemy unit. Last team standing wins the match.",
    howToPlay_en:
      "A/D or arrows move, W or up jumps, Q/E or up/down tune angle, hold Space or mouse to charge power and release to throw. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "1v1 up to 6v6 turn flow with dynamic wind and per-turn countdown pressure.",
      "Projectile physics with gravity, bounces, and area explosions that deal damage and knockback.",
      "CPU opponent that picks targets and computes ballistic throws with controlled spread.",
      "Three Territory War inspired maps (wasteland, graveyard, island) with elevated platforms.",
      "QA bridge with deterministic `render_game_to_text` and `advanceTime` hooks.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo vs CPU",
    viability_en: "High: Canvas 2D runtime with explicit turn rules and deterministic simulation.",
    visualStyle_en: "Classic stickman look with bright skies, floating logs, and competitive HUD.",
    techFocus_en: "Turn manager, ballistic artillery, aiming AI, and radial damage resolution.",
  },

  {
    id: "arcade-orchard-match-blast",
    image: arcadeOrchardMatchBlastImage,
    sessionTime: "3-8 min",

    title: "Orchard Match Blast",
    category: "Arcade",
    tagline: "Match-3 arcade propio con bloques de color, cascadas y objetivo de puntuacion.",
    description:
      "Juego match-3 original inspirado en la mecanica Slide & Match: intercambia bloques de color adyacentes, activa cadenas de cascada y optimiza cada movimiento para alcanzar la meta de puntuacion antes de agotar tiempo o movimientos.",
    objective_es: "Alcanza la puntuacion objetivo encadenando lineas de 3 o mas bloques antes de quedarte sin tiempo o movimientos.",
    howToPlay_es: "Selecciona dos bloques de color adyacentes con raton/touch para intercambiarlos. Flechas mueven cursor, Enter/Espacio confirma, H muestra pista, S mezcla, B activa Bloom y R reinicia.",
    highlights: [
      "Motor match-3 original con validacion de swaps y resolucion de cascadas.",
      "Identidad visual propia con bloques de color y UI arcade de alto contraste.",
      "Partidas cortas con objetivo de score, limite de tiempo y de movimientos.",
      "Atajos de ayuda: pista inteligente, mezcla manual y control por teclado.",
      "Bridge QA con `render_game_to_text`, tablero serializado y `advanceTime` determinista.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: reglas discretas sobre grid 8x8, estado ligero y bucle determinista.",
    visualStyle: "Tablero neon de bloques con overlays limpios y feedback de combos.",
    techFocus: "Deteccion de matches, cascadas por gravedad, busqueda de jugada posible y puente QA automatizable.",

    category_en: "Arcade",
    tagline_en: "Original match-3 arcade with color blocks, cascades, and score goals.",
    description_en:
      "An original match-3 game inspired by the Slide & Match mechanic: swap adjacent color blocks, trigger cascade chains, and optimize each move to reach the target score before running out of time or moves.",
    objective_en: "Reach the target score by chaining lines of 3+ color blocks before time or moves run out.",
    howToPlay_en: "Swap two adjacent color blocks with mouse/touch. Arrows move cursor, Enter/Space confirms, H shows hint, S shuffles, B triggers Bloom, and R restarts.",
    highlights_en: [
      "Original match-3 engine with strict swap validation and cascade resolution.",
      "Custom visual identity with color blocks and high-contrast arcade UI readability.",
      "Short sessions with score target plus time and move constraints.",
      "Utility controls: smart hint, manual shuffle, and keyboard-first input.",
      "QA bridge with `render_game_to_text`, serialized board state, and deterministic `advanceTime`.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: discrete 8x8 grid rules, lightweight state, and deterministic loop.",
    visualStyle_en: "Neon block board with clean overlays and combo feedback.",
    techFocus_en: "Match detection, gravity cascades, move-availability search, and automation-ready QA bridge.",
  },

  {
    id: "arcade-billar-pool-club",
    image: arcadeBillarPoolClubImage,
    sessionTime: "5-12 min",

    title: "Billar Pool Club",
    category: "Arcade",
    tagline: "Billar de estilo profesional con Bola 8, Bola 9 y Bola 10, fisica precisa y IA tactica.",
    description:
      "Mesa de pool top-down con sensacion de club real: saque, blanca en mano, lectura de angulos, grupos lisas/rayas, cierre cantado de la 8, disciplina Bola 9 y Bola 10 con push out, safety y tres faltas consecutivas.",
    objective_es: "Gana un match al mejor de tres racks dominando el saque, las entradas largas y la gestion de faltas segun el modo elegido.",
    howToPlay_es: "Raton opcional para apuntar: ajusta con A/D, regula potencia con W/S o rueda, tira con Espacio. En blanca en mano usa flechas/WASD para moverla, Enter/Espacio para fijar, P para autocolocar y canta tronera al cerrar la 8.",
    highlights: [
      "Tres disciplinas jugables: Bola 8, Bola 9 y Bola 10, con flujo de turnos y faltas diferenciadas.",
      "Fisica de colision, bandas, troneras y friccion con avance temporal determinista.",
      "IA con busqueda de tiros directos a tronera y ruido por dificultad.",
      "Cierre de Bola 8 cantando tronera, Bola 9 con regla de tres faltas y Bola 10 con tiro cantado.",
      "Bridge QA completo con `render_game_to_text`, estado de bolas y control de tiempo.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo vs IA",
    viability: "Alta: canvas 2D con reglas discretas, IA heuristica y simulacion determinista.",
    visualStyle: "Mesa de club con madera barnizada, paño verde profundo, guia de tiro y HUD de match.",
    techFocus: "Fisica de billar, evaluacion de faltas, estados de rack/match y automatizacion QA.",

    category_en: "Arcade",
    tagline_en: "Professional-style billiards with 8-ball, 9-ball and 10-ball, precise physics and tactical AI.",
    description_en:
      "A top-down pool table with club-level feel: break shot, cue-ball in hand, angle reading, solids/stripes grouping, called 8-ball finish, plus 9-ball and 10-ball with push out, safety, and three-foul pressure.",
    objective_en: "Win a best-of-three match by controlling the break, building long runs, and managing fouls under the selected rule set.",
    howToPlay_en: "Mouse aiming is optional: fine tune with A/D, adjust power with W/S or wheel, and shoot with Space. With ball in hand, use arrows/WASD to move it, Enter/Space to confirm, P to auto-place, and call the pocket before finishing the 8.",
    highlights_en: [
      "Three playable disciplines: 8-ball, 9-ball and 10-ball with differentiated turn flow and foul logic.",
      "Collision, cushion, pocket, and friction physics with deterministic time stepping.",
      "AI that searches direct potting lines and scales error by difficulty.",
      "Called-pocket 8-ball finish, 9-ball three-consecutive-foul rule, and called-shot 10-ball.",
      "Full QA bridge with `render_game_to_text`, ball state, and deterministic time control.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: 2D canvas with discrete rules, heuristic AI, and deterministic simulation.",
    visualStyle_en: "Club table with varnished wood, deep green felt, shot guide, and match HUD.",
    techFocus_en: "Billiards physics, foul evaluation, rack/match state flow, and QA automation.",
  },

  {
    id: "arcade-bowling-pro-tour",
    image: arcadeBowlingProTourImage,
    sessionTime: "6-14 min",

    title: "Bowling Pro Tour",
    category: "Arcade",
    tagline: "Bowling 1v1 rehecho con alley de referencia, marcador oficial, split detector e IA por dificultad.",
    description:
      "Juego de bolos profesional en navegador rehecho a partir del pack de referencia 03-Bowling-Assets-Original: entorno de alley reinterpretado en canvas, marcador completo por cuadros, reglas reales de strike/spare, detector de split, alternancia de pista A/B y panel integrado de assets + reglamento.",
    objective_es: "Gana la serie de 10 cuadros frente a la IA sumando la mayor puntuacion acumulada con buena lectura de lineas y conversion de spares.",
    howToPlay_es: "A/D ajustan linea, W/S potencia y Q/E efecto. Enter/Espacio lanza. R reinicia serie y F alterna pantalla completa.",
    highlights: [
      "Puntuacion oficial de bowling: strike, spare, cuadro abierto y decimo cuadro con bolas extra.",
      "Detector de split, marca F por falta y resumen de dobles/triples por jugador.",
      "IA en 4 niveles (Principiante, Club, Pro y Elite) con consistencia y toma de linea distintas.",
      "Regla de estilo por par de pistas: cada cuadro alterna entre pista A y B.",
      "Panel in-game con inventario del pack de Blender, materiales interpretados y cobertura reglamentaria.",
      "HUD premium con alley en perspectiva, tabla por cuadro, acumulados y resumen estadistico.",
      "Bridge QA con render_game_to_text y avance temporal determinista.",
    ],
    difficulty: "Variable (4 niveles IA)",
    multiplayer: "Solo vs IA",
    viability: "Alta: motor determinista de cuadros, scoring discreto y IA heuristica configurable.",
    visualStyle: "Alley broadcast en perspectiva con ball return, monitores, boards, gutters y pin deck inspirados en el pack de Blender.",
    techFocus: "Motor de reglas de bowling + simulacion de pinfall collider-inspired + panel de referencia de assets y reglamento.",

    category_en: "Arcade",
    tagline_en: "Rebuilt 1v1 bowling with a reference alley environment, official scoring, split detection, and tiered AI.",
    description_en:
      "Professional browser bowling rebuilt from the 03-Bowling-Assets-Original reference pack: a reinterpreted alley environment in canvas, full frame-by-frame scoring, real strike/spare rules, split detection, A/B lane alternation, and an integrated asset + rulebook panel.",
    objective_en: "Win the 10-frame series against AI by maximizing cumulative score through strong line control and spare conversion.",
    howToPlay_en: "A/D adjust line, W/S power, Q/E spin. Enter/Space throws. R restarts the series and F toggles fullscreen.",
    highlights_en: [
      "Official bowling scoring: strike, spare, open frame, and tenth-frame bonus balls.",
      "Split detector and foul telemetry per player.",
      "Four AI levels (Beginner, Club, Pro, Elite) with different consistency and lane decisions.",
      "Pair-lane style rule: every frame alternates between lane A and B.",
      "Premium HUD with per-frame marks, cumulative totals, and statistical recap.",
      "QA bridge with render_game_to_text and deterministic time stepping.",
    ],
    difficulty_en: "Variable (4 AI tiers)",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: deterministic frame engine, discrete scoring, and configurable heuristic AI.",
    visualStyle_en: "Broadcast-inspired lane canvas with readable pins and competitive panel.",
    techFocus_en: "Bowling rules engine + pinfall simulation + profile-driven AI.",
  },

  {
    id: "arcade-penalty-neural-keeper",
    image: arcadePenaltyNeuralKeeperImage,
    sessionTime: "2-5 min",

    title: "Penalty Neural Keeper",
    category: "Arcade",
    tagline: "Tanda de penaltis por equipos con backend Node, rivales configurables y portero IA adaptativo.",
    description:
      "Arcade de penaltis por equipos con backend ligero: eliges rival y dificultad, juegas tanda clasica de 5 lanzamientos mas muerte subita y cada disparo se resuelve en servidor con IA adaptativa del portero, historial de tiros y simulacion automatica del turno rival.",
    objective_es:
      "Supera al equipo rival en una tanda de 5 lanzamientos mas muerte subita evitando caer en patrones repetitivos que el portero pueda aprender.",
    howToPlay_es:
      "Selecciona la zona con botones o teclado: 1 abajo izq, 2 abajo der, 3 arriba izq, 4 arriba der, 5 centro. R reinicia tanda, F pantalla completa.",
    highlights: [
      "Tanda clasica de 5 tiros mas muerte subita con rival configurado por backend.",
      "Fisica de disparo con potencia, curva, trayectorias altas/bajas y rebote visual en caso de parada.",
      "IA dinamica con analisis de frecuencia, recencia, transiciones entre zonas y deteccion de repeticion.",
      "Backend Node con estado de match, historial, idempotencia razonable y telemetria visible de adaptacion, confianza e indice de aprendizaje.",
      "Render Canvas con cesped por franjas, porteria con red reactiva, animacion de estirada y trazas del balon.",
      "Bridge QA con render_game_to_text y avance temporal determinista via advanceTime.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo vs IA",
    viability: "Alta: simulacion 2D ligera, estado serializable y heuristicas de IA calibrables.",
    visualStyle: "Estadio nocturno de alto contraste con campo detallado, red dinamica y HUD tactico.",
    techFocus: "Modelado de tiro por curvas quadraticas + IA adaptativa de corto plazo + telemetria QA completa.",

    category_en: "Arcade",
    tagline_en: "Team shootout with Node backend, configurable rivals, and an adaptive AI goalkeeper.",
    description_en:
      "Team-based penalty arcade backed by a lightweight server: choose rival and difficulty, play a classic 5-shot shootout plus sudden death, and have every attempt resolved server-side with adaptive goalkeeper AI, shot history, and simulated rival turns.",
    objective_en:
      "Beat the rival team over a 5-shot shootout plus sudden death while avoiding repetitive patterns the goalkeeper can learn.",
    howToPlay_en:
      "Choose target zone with buttons or keyboard: 1 bottom left, 2 bottom right, 3 top left, 4 top right, 5 center. R restarts, F toggles fullscreen.",
    highlights_en: [
      "Classic 5-shot format plus sudden death with server-configured rival profiles.",
      "Shot physics with power, curve, high/low trajectories, and visual rebound on saves.",
      "Dynamic AI combining frequency, recency, transition reads, and repetition detection.",
      "Node backend with match state, shot history, reasonable idempotency, and live telemetry for adaptation, confidence, and learning index.",
      "Canvas render with striped grass, reactive net, dive animation, and ball trails.",
      "QA bridge exposing render_game_to_text plus deterministic advanceTime stepping.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: lightweight 2D simulation, serializable state, and tunable AI heuristics.",
    visualStyle_en: "High-contrast night stadium with detailed pitch, dynamic net, and tactical HUD.",
    techFocus_en: "Quadratic shot trajectory model + short-horizon adaptive AI + full QA telemetry.",
  },

  {
    id: "arcade-cosmic-vanguard",
    image: arcadeCosmicVanguardImage,
    sessionTime: "4-8 min",

    title: "Cosmic Vanguard",
    category: "Arcade",
    tagline: "Shooter espacial tactico con wrap-around, pasadas de riesgo/recompensa, bosses por fases y backend de leaderboard.",
    description:
      "Arcade espacial original construido para la plataforma: pilotas una nave con inercia refinada en orbitas cerradas, limpias oleadas de cazas y drones, rozas fuego y asteroides para activar Vanguard Drive, rompes cinturones de asteroides, gestionas calor/energia/escudo y sobrevives hasta llegar a dreadnoughts con fases y refuerzos por sector. Incluye backend Node ligero para clasificacion y configuracion diaria, con fallback local cuando no esta disponible.",
    objective_es:
      "Mantente con vida el maximo tiempo posible, limpia las flotillas enemigas de cada oleada, explota las pasadas al limite para sostener Vanguard Drive y escala la clasificacion alcanzando mas score, precision y control tactico que el resto.",
    howToPlay_es:
      "A/D o flechas izq/der rotan la nave, W/arriba impulsa, S/abajo frena, Shift activa boost, Espacio dispara, E/X lanza pulso EMP, P pausa, R reinicia y F alterna pantalla completa. Las pasadas al limite cargan Vanguard Drive.",
    highlights: [
      "Nave con inercia refinada, control de drift y wrap-around completo con lectura por telemetria QA.",
      "Sistema de pasadas al limite que recompensa precision agresiva con energia, escudo y Vanguard Drive.",
      "Tres arquetipos de enemigos mas dreadnought con fases y refuerzos cada 3 oleadas.",
      "Asteroides destructibles con fragmentacion parcial y pickups de casco, coolant y energia.",
      "Sistemas de calor, escudo, energia, combo y amenaza por sector para sostener profundidad arcade.",
      "Backend Node con endpoints para config diaria, health y leaderboard persistente; fallback local si no esta levantado.",
      "Bridge QA con render_game_to_text y avance temporal determinista via advanceTime.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo / Competitivo asincrono",
    viability: "Alta: motor Canvas puro, estado serializable y backend ligero sin dependencias.",
    visualStyle: "Opera espacial neon con nebulosas, HUD tactico, bosses geométricos y portada editorial propia.",
    techFocus: "Motor 2D deterministic-step + IA de persecucion/disparo + persistencia remota/local de runs.",

    category_en: "Arcade",
    tagline_en: "Tactical space shooter with wrap-around movement, risk-reward close passes, phased bosses, and leaderboard backend.",
    description_en:
      "Original space arcade built for the platform: pilot a refined-inertia ship across wrapped orbits, skim bullets and asteroids to activate Vanguard Drive, clear waves of fighters and drones, break asteroid belts, manage heat/energy/shields, and survive long enough to reach phased dreadnoughts with reinforcement bursts. It includes a lightweight Node backend for daily configuration and leaderboard sync, plus a local fallback when the server is unavailable.",
    objective_en:
      "Stay alive as long as possible, clear every hostile wave, exploit close passes to sustain Vanguard Drive, and climb the leaderboard through high score, strong accuracy, and disciplined tactical control.",
    howToPlay_en:
      "A/D or left/right arrows rotate, W/up thrusts, S/down brakes, Shift boosts, Space fires, E/X launches an EMP pulse, P pauses, R restarts, and F toggles fullscreen. Close passes charge Vanguard Drive.",
    highlights_en: [
      "Refined inertia handling with drift control, full wrap-around space, and QA-readable coordinates.",
      "Close-pass system that rewards aggressive precision with energy, shielding, and Vanguard Drive.",
      "Three enemy archetypes plus phased dreadnought bosses with support wings every 3 waves.",
      "Breakable asteroids with partial fragmentation and hull/coolant/energy pickups.",
      "Heat, shield, energy, combo, and sector-threat systems for deeper arcade decision-making.",
      "Node backend exposing daily config, health, and persistent leaderboard endpoints, with local fallback.",
      "QA bridge exposing render_game_to_text plus deterministic advanceTime stepping.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo / Async competitive",
    viability_en: "High: pure Canvas runtime, serializable state, and lightweight backend with no extra dependencies.",
    visualStyle_en: "Neon space opera with layered nebulas, tactical HUD, geometric bosses, and bespoke editorial cover art.",
    techFocus_en: "Deterministic 2D engine + layered dogfight AI + risk/reward combat systems + remote/local run persistence.",
  },

  {
    id: "arcade-golf-tour-2d",
    image: arcadeGolfTour2DImage,
    sessionTime: "4-12 min",

    title: "Golf Tour 2D Pro",
    category: "Arcade",
    tagline: "Mini golf 2D side-view con 200 niveles, terrenos en pendiente y hoyos estilo arcade clasico.",
    description:
      "Campana larga y rejugable de mini golf 2D en vista lateral: 200 niveles repartidos en biomas de dia, ocaso, noche, neon y tormenta, con terreno estratificado (capa verde + subsuelo), montanas de fondo, bandera y hoyo con tubo vertical. El gameplay se basa en tiros parabolicos con gravedad, rebote sobre pendientes, control de viento y gestion de obstaculos.",
    objective_es:
      "Emboca en el menor numero de golpes posible y optimiza estrellas por ejecucion limpia en los 200 mapas del tour.",
    howToPlay_es:
      "Arrastra desde la bola para apuntar y ajustar potencia. Teclado: A/D o flechas para angulo, W/S para potencia, Enter/Espacio lanza, P pausa, R reinicia, L abre selector y F pantalla completa.",
    highlights: [
      "200 niveles diferentes con progresion de dificultad y mapas pensados para mobile-first.",
      "Fisica side-view con gravedad real, rebotes en slope, rodadura y parada natural por friccion.",
      "Hoyo estilo tubo con bandera y deteccion de embocado por velocidad/entrada al cup.",
      "Direccion artistica inspirada en minigolf lateral: capas de terreno, montanas, arboles y cielo limpio.",
      "Progresion por estrellas, mejor numero de golpes y desbloqueo secuencial de niveles.",
      "UI profesional con overlays de menu, pausa, fin de nivel, fin de campana y selector completo.",
      "Bridge QA con render_game_to_text + advanceTime para validacion automatizada y determinista.",
    ],
    difficulty: "Variable (Rookie / Pro / Elite / Master)",
    multiplayer: "Solo",
    viability: "Alta: motor Canvas determinista con estado serializable y persistencia local ligera.",
    visualStyle: "Minigolf side-view colorista con perspectiva de suelo por capas y horizonte de montanas.",
    techFocus: "Runtime modular (niveles/fisica/render) con colision sobre terreno continuo y campana de 200 mapas.",

    category_en: "Arcade",
    tagline_en: "Side-view 2D mini golf with 200 levels, layered terrain slopes, and classic cup presentation.",
    description_en:
      "A long-form replayable side-view 2D mini golf campaign: 200 levels across diverse day/night biomes with layered ground perspective, mountain backdrops, and tube-style cup + flag targets. Gameplay focuses on arc shots under gravity, slope rebounds, wind control, and obstacle management.",
    objective_en:
      "Sink the ball with the lowest stroke count possible and optimize stars through clean execution across all 200 tour layouts.",
    howToPlay_en:
      "Drag from the ball to set direction and power. Keyboard: A/D or arrows for angle, W/S for power, Enter/Space launches, P pauses, R restarts, L opens level select, and F toggles fullscreen.",
    highlights_en: [
      "200 distinct levels with mobile-first pacing and escalating obstacle complexity.",
      "Side-view physics with gravity, slope collision, rolling friction, and natural stopping behavior.",
      "Tube-style cup + flag goal with speed-sensitive sink detection.",
      "Visual direction inspired by classic lateral mini golf: layered ground, mountains, trees, clear sky.",
      "Star progression with best-strokes tracking and sequential unlock flow.",
      "Professional UX with menu/pause/clear/campaign-complete overlays and full level select.",
      "QA bridge exposing render_game_to_text and advanceTime deterministic stepping.",
    ],
    difficulty_en: "Variable (Rookie / Pro / Elite / Master)",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic Canvas runtime with serializable state and lightweight local persistence.",
    visualStyle_en: "Color-rich side-view mini golf direction with layered terrain perspective and mountain horizon.",
    techFocus_en: "Modular runtime (levels/physics/render) with continuous terrain collision and 200-level progression architecture.",
  },
  {
    id: "arcade-archery-horizon",
    image: arcadeArcheryHorizonImage,
    sessionTime: "4-10 min",

    title: "Archery Horizon 100",
    category: "Arcade",
    tagline: "Tiro con arco 3D en perspectiva de horizonte con 100 niveles, camara de vuelo y fisica avanzada.",
    description:
      "Campana de 100 niveles de tiro con arco donde la distancia crece con la dificultad: cuanto mas avanzado el nivel, mas lejos aparece la diana en la profundidad del mapa. El jugador configura intensidad y trayectoria antes de disparar, la flecha vuela con gravedad, drag, viento dinamico y zonas de corriente, y la camara sigue toda la parabola hasta el punto de impacto.",
    objective_es:
      "Ajusta trayectoria e intensidad para impactar la diana en cada nivel y desbloquear progresivamente los 100 escenarios.",
    howToPlay_es:
      "Desvio con A/D o flechas izq/der, trayectoria con arriba/abajo, intensidad con W/S, Enter/Espacio para disparar, P pausa, R reinicia, N siguiente nivel y F pantalla completa.",
    highlights: [
      "100 niveles diferentes con escalado de distancia, viento y precision requerida.",
      "Entornos variados (valle, canones, hielo, tormenta, volcan, meseta) con fisicas calibradas por biome.",
      "Mecanicas avanzadas: dianas moviles, muros con huecos, corredores de corriente ascendente y viento por rafagas.",
      "Vista pseudo-3D de horizonte para leer profundidad y anticipar la trayectoria.",
      "Camara dinamica que cambia de vista de arco a seguimiento de flecha y bloqueo de impacto.",
      "Feedback de anillos (bullseye/interior/medio/exterior) con scoring y rachas.",
      "Bridge QA con render_game_to_text + advanceTime para validacion automatizada determinista.",
    ],
    difficulty: "Variable (Rookie / Pro / Elite / Master / Legend)",
    multiplayer: "Solo",
    viability: "Alta: motor Canvas determinista con niveles procedurales controlados y estado serializable.",
    visualStyle: "Paisajes de horizonte con profundidad marcada, dianas de alto contraste y HUD tecnico de tiro.",
    techFocus: "Simulacion balistica 3D simplificada + colision en plano de objetivo + camara follow-shot + progresion de 100 niveles.",

    category_en: "Arcade",
    tagline_en: "Horizon-depth 3D archery with 100 levels, flight camera tracking, and advanced physics.",
    description_en:
      "A 100-level archery campaign where difficulty scales mainly through range: the harder the level, the farther the target sits on the map horizon. Players set intensity and trajectory before each release, then watch a full camera-follow shot driven by gravity, drag, dynamic wind, moving targets, and tactical obstacle layers.",
    objective_en:
      "Tune trajectory and intensity to hit each target and clear all 100 levels with consistent precision.",
    howToPlay_en:
      "Yaw with A/D or left/right arrows, trajectory with up/down, intensity with W/S, Enter/Space to fire, P pause, R restart, N next level, and F fullscreen.",
    highlights_en: [
      "100 distinct levels with escalating distance, wind variance, and precision thresholds.",
      "Multiple biomes (valley, canyon, frost, storm, volcanic, plateau) with tuned physics profiles.",
      "Advanced mechanics: moving targets, slit walls, updraft corridors, and gusting crosswinds.",
      "Pseudo-3D horizon rendering so players can read depth before committing to a shot.",
      "Dynamic camera flow: bow setup view -> in-flight arrow follow -> impact lock.",
      "Ring-based hit feedback (bullseye/inner/mid/outer) with streak and score progression.",
      "QA bridge exposing render_game_to_text and deterministic advanceTime stepping.",
    ],
    difficulty_en: "Variable (Rookie / Pro / Elite / Master / Legend)",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic Canvas runtime with controlled procedural levels and serializable state.",
    visualStyle_en: "Depth-rich horizon landscapes, high-contrast targets, and technical archery HUD language.",
    techFocus_en: "Simplified 3D ballistic simulation + target-plane collision + shot-follow camera + 100-level progression.",
  },

  {
    id: "arcade-pinball-wizard",
    image: arcadePinballWizardImage,
    sessionTime: "3-10 min",

    title: "Pinball Wizard",
    category: "Arcade",
    tagline: "Pinball arcade neon con físicas reales de flipper, bumpers pop, slingshots y sistema de multiplicador.",
    description:
      "Mesa de pinball 2D con motor de física propio: bola de cromo con gravedad y fricción de aire, flippers con velocidad angular real que transfieren energía a la bola, tres bumpers pop de expulsión elástica, cinco drop-targets con reset de multiplicador, dos slingshots laterales y tres rollover lanes en la parte superior. El plunger de resorte se carga manteniendo Espacio — la potencia determina el alcance inicial de la bola.",
    objective_es:
      "Mantén la bola en juego el mayor tiempo posible, derriba todos los targets para subir el multiplicador y encadena golpes a bumpers para obtener combos.",
    howToPlay_es:
      "Z o flecha izquierda activa el flipper izquierdo, X o flecha derecha el derecho. Mantén Espacio para cargar el plunger y suéltalo para lanzar. Derriba los 5 targets para aumentar el multiplicador (hasta ×6). Ilumina las 3 lanes superiores para +5000 puntos.",
    highlights: [
      "Flippers con velocidad angular real: la bola gana energía del flipper en movimiento.",
      "Motor de sub-stepping (4 pasos/frame) para colisiones precisas a cualquier velocidad.",
      "3 bumpers pop con combo encadenado: el multiplicador de puntos escala con hits consecutivos.",
      "5 drop-targets: derribarlos todos incrementa el multiplicador global y resetea los objetivos.",
      "2 slingshots laterales con boost de velocidad y efecto elástico.",
      "3 rollover lanes en la parte superior con bonificación de 5000 al completar el set.",
      "Audio procedural completo via Web Audio API: bumpers, targets, slings, lanzamiento y drain.",
      "Plunger con barra de carga visual y velocidad mínima/máxima configurable.",
      "Récord persistente en localStorage.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: motor Canvas puro, estado serializable, sin dependencias externas.",
    visualStyle: "Neon noir: mesa oscura con felt, paredes metálicas, bumpers magenta, targets cyan y bola cromada con gradiente.",
    techFocus: "Física real de flipper con omega angular + sub-stepping + colisión cápsula-segmento + bumper elástico + audio procedural.",

    category_en: "Arcade",
    tagline_en: "Neon arcade pinball with real flipper physics, pop bumpers, slingshots, and a multiplier system.",
    description_en:
      "A 2D pinball table with a custom physics engine: chrome ball with gravity and air friction, flippers with real angular velocity that transfer energy to the ball, three elastically ejecting pop bumpers, five resetting drop targets, two lateral slingshots, and three top rollover lanes. The spring plunger charges while Space is held — release power determines initial ball speed.",
    objective_en:
      "Keep the ball alive as long as possible, knock down all targets to raise the multiplier, and chain bumper hits for combo bonuses.",
    howToPlay_en:
      "Z or left arrow activates the left flipper, X or right arrow the right one. Hold Space to charge the plunger and release to launch. Knock down all 5 targets to raise the multiplier (up to ×6). Light all 3 top lanes for a +5000 bonus.",
    highlights_en: [
      "Flippers with real angular velocity: ball gains energy from a swinging flipper.",
      "4-substep physics per frame for accurate high-speed collisions.",
      "3 pop bumpers with chained combos: bonus multiplier scales with consecutive hits.",
      "5 drop targets: clearing all raises the global multiplier and resets the bank.",
      "2 lateral slingshots with speed boost and elastic effect.",
      "3 top rollover lanes with 5000-pt bonus for lighting the full set.",
      "Full procedural audio via Web Audio API: bumpers, targets, slings, launch, and drain.",
      "Plunger with visual charge bar and configurable min/max launch speed.",
      "Persistent high score in localStorage.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: pure Canvas engine, serializable state, no external dependencies.",
    visualStyle_en: "Neon noir: dark felt table, metallic walls, magenta bumpers, cyan targets, and chrome ball with radial gradient.",
    techFocus_en: "Real flipper physics with angular omega + sub-stepping + capsule-segment collision + elastic bumper + procedural audio.",
  },

  {
    id: "arcade-bubble-storm",
    image: arcadeBubbleStormImage,
    sessionTime: "5-15 min",

    title: "Bubble Storm",
    category: "Arcade",
    tagline: "Dispara burbujas de colores a la rejilla hexagonal, forma grupos de 3+ para hacerlos explotar y encadena caídas en cascada.",
    description:
      "Bubble Storm es un juego de disparo de burbujas estilo Bust-a-Move con rejilla hexagonal real, trayectoria con rebote en paredes y lógica de caída de burbujas aisladas. El cañón central apunta siguiendo el ratón; la línea de ayuda punteada muestra la trayectoria exacta antes de disparar. Cada niveles añade colores adicionales a la rejilla. Cada N disparos aparece una nueva fila en la parte superior que empuja todo hacia abajo — si las burbujas cruzan la línea de peligro, es game over.",
    objective_es:
      "Elimina todas las burbujas de la rejilla antes de que alcancen la zona de peligro. Provoca caídas en cadena para maximizar el score.",
    howToPlay_es:
      "Mueve el ratón para apuntar. Haz clic (o pulsa Espacio) para disparar. Tab o S cambia la burbuja siguiente con la actual. Agrupa 3 o más burbujas del mismo color para hacerlas explotar. Las burbujas que quedan flotando sin conexión con el techo caen automáticamente.",
    highlights: [
      "Rejilla hexagonal real con 11 columnas desfasadas — la burbuja encaja en el hueco más cercano al punto de impacto.",
      "Trayectoria de ayuda con rebote en paredes calculada en tiempo real.",
      "Detección de grupos por BFS flood-fill sobre el grafo de vecinos hexagonales.",
      "Caída de burbujas aisladas: BFS desde el techo, todo lo que no cuelga cae con física de gravedad.",
      "Swap de burbujas: intercambia actual y siguiente para preparar jugadas.",
      "Color de siguiente burbuja siempre entre los colores presentes — nunca colores sin posición.",
      "Push de nueva fila animado suavemente cada N disparos.",
      "Progresión por niveles: al limpiar el tablero se añaden más filas y más colores.",
      "Audio procedural via Web Audio API. Hi-score persistente en localStorage.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: Canvas 2D puro, sin librerías externas, estado serializable.",
    visualStyle: "Neon oscuro: fondo #080b14 con vignette, burbujas brillantes con gradiente radial 3D y glow de color, partículas al explotar.",
    techFocus: "Rejilla hexagonal offset con BFS match + BFS flood-fill de aislamiento + snap-to-nearest-empty + trayectoria con rebotes.",

    category_en: "Arcade",
    tagline_en: "Shoot coloured bubbles at the hex grid, match 3+ to pop them, and chain cascade drops for massive scores.",
    description_en:
      "Bubble Storm is a Bust-a-Move-style bubble shooter with a true hexagonal grid, wall-bouncing trajectory, and isolated-bubble drop logic. The central cannon aims with the mouse; a dotted guide line shows the exact trajectory before shooting. Each level adds more colours to the grid. Every N shots a new row pushes in from the top — if bubbles cross the danger line, it's game over.",
    objective_en:
      "Clear all bubbles from the grid before they reach the danger zone. Trigger cascade drops to maximise your score.",
    howToPlay_en:
      "Move the mouse to aim. Click (or press Space) to shoot. Tab or S swaps the next bubble with the current one. Group 3 or more same-colour bubbles to pop them. Bubbles that have no path to the ceiling fall automatically.",
    highlights_en: [
      "True hexagonal grid with 11 staggered columns — the bubble snaps to the empty slot closest to the impact point.",
      "Real-time aim guide with wall-bounce trajectory preview.",
      "Group detection via BFS flood-fill over the hex neighbour graph.",
      "Isolated-bubble drop: BFS from ceiling; anything not hanging falls under gravity.",
      "Bubble swap: exchange current and next bubbles to plan ahead.",
      "Next bubble always chosen from colours present in the grid — no unshootable orphans.",
      "Smooth animated new-row push every N shots.",
      "Level progression: clearing the board adds more rows and colours.",
      "Procedural audio via Web Audio API. Persistent hi-score in localStorage.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: pure Canvas 2D, no external libraries, serializable state.",
    visualStyle_en: "Dark neon: #080b14 background with vignette, radial-gradient 3D bubbles with colour glow, particle explosions.",
    techFocus_en: "Offset hex grid with BFS match + BFS ceiling-connectivity isolation + snap-to-nearest-empty + wall-bounce trajectory.",
  },

  {
    id: "arcade-ice-strike-pro",
    image: arcadeIceStrikeProImage,
    sessionTime: "5-15 min",

    title: "Ice Strike Pro",
    category: "Arcade",
    tagline: "Curling profesional con física real de curl, IA estratégica y mecánica de barrido.",
    description:
      "Ice Strike Pro es un simulador de curling 2D con física auténtica: las piedras curvan según la rotación aplicada, el rozamiento reduce la velocidad, y barrer con la escoba (tecla S) disminuye la fricción en pleno vuelo. La IA planifica tiros de draw, guardas y takeouts. Cada partida dura 6 ends con 4 piedras por equipo y fin.",
    objective_es:
      "Acumula más puntos que la CPU después de 6 ends. Cada end suma los puntos de la piedra más cercana al centro del house; sólo puntúa el equipo cuya piedra quede más pegada al botón.",
    howToPlay_es:
      "Usa ← → o A/D para apuntar, W sube la potencia, Q selecciona giro interior y E giro exterior. Pulsa Espacio para lanzar. Mantén S para barrer durante el vuelo y reducir la curva. R reinicia la partida, Esc vuelve al menú.",
    highlights: [
      "Física de curl real: la piedra curva según la rotación y la velocidad hacia adelante.",
      "Barrido en tiempo real con tecla S — reduce fricción un 28 % y limita la curvatura.",
      "IA con tres estrategias adaptativas: draw al botón, guarda frente al house y takeout.",
      "Colisiones elásticas entre piedras con corrección posicional (COR 0.90).",
      "Línea de trayectoria predictiva con curva simulada y piedra fantasma en el destino.",
      "6 ends completos con marcador por end, historial de resultados y lógica de hammer.",
      "Puntuación en vivo mostrando quién puntúa en el end actual antes de terminar.",
      "Canvas 2D nativo — sin librerías externas.",
    ],
    difficulty: "Media",
    multiplayer: "Solo vs IA",
    viability: "Alta: Canvas 2D puro, física determinista, sin dependencias externas.",
    visualStyle: "Azul hielo: hoja de curling con textura de pebble, anillos de casa en rojo y blanco, HUD lateral oscuro con panel de info.",
    techFocus: "Física de curl con velocidad lateral proporcional a la velocidad frontal + collisiones elásticas multi-piedra + predicción de trayectoria en tiempo real.",

    category_en: "Arcade",
    tagline_en: "Professional curling with real curl physics, strategic AI, and a live sweeping mechanic.",
    description_en:
      "Ice Strike Pro is a 2D curling simulator with authentic physics: stones curl based on applied rotation, friction gradually slows them down, and sweeping with the broom (S key) reduces friction mid-flight. The AI plans draw shots, guards, and takeouts. Each match lasts 6 ends with 4 stones per team per end.",
    objective_en:
      "Outscore the CPU after 6 ends. Each end awards points to the team whose stone sits closest to the button; only the leading team scores, counting all stones closer than the opponent's nearest.",
    howToPlay_en:
      "Use ← → or A/D to aim, W raises power, Q selects in-turn and E out-turn. Press Space to deliver. Hold S to sweep mid-flight and reduce the curl. R restarts the match, Esc returns to the menu.",
    highlights_en: [
      "Real curl physics: the stone bends according to rotation and forward speed.",
      "Live sweeping with the S key — cuts friction by 28% and limits the curve.",
      "Adaptive AI with three strategies: draw to the button, guard in front of the house, and takeout.",
      "Elastic stone-on-stone collisions with positional correction (COR 0.90).",
      "Predictive aim line with simulated curl and a ghost stone at the projected destination.",
      "6 complete ends with per-end scoring, end-log history, and hammer logic.",
      "Live score preview showing who is scoring in the current end before it concludes.",
      "Native Canvas 2D — no external libraries.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: pure Canvas 2D, deterministic physics, no external dependencies.",
    visualStyle_en: "Ice blue: curling sheet with pebble texture, red-and-white house rings, dark side HUD with info panel.",
    techFocus_en: "Curl physics with lateral velocity proportional to forward speed + multi-stone elastic collisions + real-time trajectory prediction.",
  },

  {
    id: "arcade-neon-crypt",
    image: arcadeNeonCryptImage,
    sessionTime: "5-20 min",

    title: "Neon Crypt",
    category: "Arcade",
    tagline: "Dungeon crawler arcade: combate por oleadas con espada, esquiva y enemigos con IA.",
    description:
      "Neon Crypt es un arena dungeon crawler top-down por oleadas. Muévete con WASD, apunta con el ratón y ataca con un arco de espada de 86°. El dash te da invencibilidad breve para esquivar proyectiles. Cada oleada incluye Grunts que cargan, Arqueros que mantienen distancia y disparan, Brutos lentos pero demoledores, y Jefes cada 5 oleadas con ataques en ráfaga de 8 proyectiles. Recoge orbes verdes de los enemigos caídos para recuperar vida.",
    objective_es:
      "Sobrevivir el mayor número de oleadas posible y acumular la puntuación más alta. Las oleadas aumentan en dificultad: más enemigos, más tipos simultáneos y jefes con ataques en ráfaga.",
    howToPlay_es:
      "WASD o flechas para moverte, ratón para apuntar, Click o Espacio para atacar con la espada. Shift o E activa el dash — te hace invencible brevemente y te reposiciona. Los orbes verdes restauran 1 punto de vida. R reinicia, Esc vuelve al menú.",
    highlights: [
      "3 tipos de enemigos con comportamientos distintos: Grunt (carga), Archer (distancia + proyectil), Brute (tanque lento).",
      "Jefe cada 5 oleadas: melee + ráfaga de 8 proyectiles en patrón circular.",
      "Dash con invencibilidad temporal — esencial para esquivar ráfagas de jefe.",
      "Arco de espada de 86° con detección precisa de ángulo; rebote visual de fallo.",
      "Orbes de vida con drop aleatorio (35%) y recogida automática por proximidad.",
      "Separación dinámica entre enemigos para evitar apilamiento; arqueros con strafe lateral.",
      "Partículas procedurales: impacto, muerte, dash trail, spark de espada.",
      "Canvas 2D nativo — sin librerías externas.",
    ],
    difficulty: "Progresiva",
    multiplayer: "Solo",
    viability: "Alta: Canvas 2D puro, física de steer + colisiones circulares, sin dependencias externas.",
    visualStyle: "Estética neon gótica: suelo con rejilla oscura y puntos de textura, pilares de piedra con brillo de borde, enemigos con formas distintas (círculo, diamante, cuadrado, estrella) y aura neon.",
    techFocus: "Steering behavior con separación dinámica + colisiones circulares + arco de hitbox angular + sistema de partículas procedural + proyectiles con trail de elipse.",

    category_en: "Arcade",
    tagline_en: "Arena dungeon crawler: wave combat with sword, dash, and AI-driven enemies.",
    description_en:
      "Neon Crypt is a top-down arena dungeon crawler with wave-based combat. Move with WASD, aim with the mouse, and attack with an 86° sword arc. The dash grants brief invincibility to dodge projectiles. Each wave includes Grunts that charge, Archers who keep distance and shoot, slow-but-hard-hitting Brutes, and a Boss every 5 waves firing an 8-projectile circular burst. Collect green orbs from fallen enemies to restore HP.",
    objective_en:
      "Survive as many waves as possible and reach the highest score. Waves scale in difficulty: more enemies, more types simultaneously, and bosses with burst attacks.",
    howToPlay_en:
      "WASD or arrows to move, mouse to aim, Click or Space to swing your sword. Shift or E activates the dash — grants brief invincibility and repositions you. Green orbs restore 1 HP. R restarts, Esc returns to the menu.",
    highlights_en: [
      "3 enemy types with distinct behaviors: Grunt (rushes), Archer (keeps distance + shoots), Brute (slow tank).",
      "Boss every 5 waves: melee attacks + 8-projectile circular burst.",
      "Dash with temporary invincibility — essential for dodging boss bursts.",
      "86° sword arc with precise angle detection; visual spark on miss.",
      "HP orbs with random drop (35%) and auto-pickup by proximity.",
      "Dynamic enemy separation prevents stacking; Archers strafe laterally.",
      "Procedural particles: hit, death, dash trail, sword spark.",
      "Native Canvas 2D — no external libraries.",
    ],
    difficulty_en: "Progressive",
    multiplayer_en: "Solo",
    viability_en: "High: pure Canvas 2D, steering + circular collision physics, no external dependencies.",
    visualStyle_en: "Neon gothic aesthetic: dark grid floor with texture dots, stone pillars with edge glow, distinct enemy shapes (circle, diamond, square, star) with neon aura.",
    techFocus_en: "Steering behavior with dynamic separation + circular collisions + angular hitbox arc + procedural particle system + projectiles with ellipse trail.",
  },

    {
    id: "arcade-neon-rush",
    image: arcadeNeonRushImage,
    sessionTime: "2-8 min",

    title: "Neon Rush",
    category: "Arcade",
    tagline: "Runner de precision con 100 niveles, entornos variados y salto de baja latencia + salto aereo de apoyo.",
    description:
      "Integracion completa del juego Neon Rush con 100 niveles de dificultad progresiva. El jugador avanza de forma continua y debe reaccionar con saltos precisos para evitar pinchos, techos, bloques y secuencias combinadas. Se reforzo la jugabilidad para reducir frustracion: jump buffer, coyote time, hitboxes mas justas, salto aereo de apoyo y asistencia dinamica tras varios intentos.",
    objective_es:
      "Completa cada nivel llegando al portal final sin chocar contra obstaculos. Mejora tu mejor tiempo y supera niveles cada vez mas exigentes.",
    howToPlay_es:
      "Pulsa Espacio, flecha arriba, click o tap para saltar. En movil y tablet puedes tocar cualquier zona del juego para activar el salto, y volver a tocar en el aire para usar el salto aereo de apoyo (1 por ciclo). Puedes arrancar desde pantalla inicial con la misma entrada. R reintenta cuando caes y Esc vuelve al menu principal.",
    highlights: [
      "100 niveles con identidad visual propia (easy/medium/hard/insane) y 80 niveles nuevos de diseno procedural.",
      "Mecanicas de precision: pinchos de suelo, pinchos de techo, bloques, jump pads y orbes de impulso.",
      "Respuesta de salto reforzada con jump buffer + coyote time para minimizar delay percibido.",
      "Salto aereo de apoyo (1 por ciclo) para resolver secuencias densas sin bloqueos injustos.",
      "Colisiones ajustadas para esquiva justa y menos muertes por bordes ambiguos.",
      "Asistencia progresiva por intentos (ligera reduccion de velocidad) para evitar bloqueos imposibles.",
      "HUD de progreso, puntuacion, mejor marca y contador de intentos por nivel.",
      "Bridge QA activo: `render_game_to_text` y `advanceTime` disponibles para automatizacion.",
    ],
    difficulty: "Progresiva",
    multiplayer: "Solo",
    viability: "Alta: juego Canvas autocontenido integrado via iframe con estado serializable.",
    visualStyle: "Neon synthwave con overlays arcades, efectos de particulas y fondos tematicos por nivel.",
    techFocus: "Runner determinista con ajustes de input-latency, fisica de salto y balance de colisiones para esquiva fiable.",

    category_en: "Arcade",
    tagline_en: "Precision runner with 100 levels, varied environments, and low-latency jump response + assist air jump.",
    description_en:
      "Full Neon Rush integration with 100 progressively harder levels. The player auto-runs and must react with precise jumps to avoid spikes, ceiling traps, blocks, and mixed obstacle patterns. Gameplay was tuned to reduce frustration: jump buffer, coyote time, fairer hitboxes, an assist air jump, and dynamic assist after repeated failures.",
    objective_en:
      "Complete each level by reaching the final portal without colliding with obstacles. Improve your best runs and clear increasingly demanding stages.",
    howToPlay_en:
      "Press Space, Up Arrow, click, or tap to jump. On mobile/tablet, tapping anywhere in the game area triggers jump, and tapping again mid-air triggers the assist air jump (1 per cycle). The same input starts a run from the intro screen. Press R to retry after a crash and Esc to return to the main menu.",
    highlights_en: [
      "100 levels with distinct visual identity across easy/medium/hard/insane tiers, including 80 new procedural stages.",
      "Precision mechanics: ground spikes, ceiling spikes, solid blocks, jump pads, and boost orbs.",
      "Snappy jump response via jump-buffer + coyote-time to reduce perceived input delay.",
      "Assist air jump (1 per cycle) to keep dense obstacle sections dodgeable.",
      "Collision tuning for fair dodging and fewer ambiguous edge deaths.",
      "Progressive assist after repeated retries (slight speed reduction) to prevent impossible-feeling stalls.",
      "HUD with progress, score, best record, and per-level attempt tracking.",
      "QA bridge enabled: `render_game_to_text` and `advanceTime` are exposed for automation.",
    ],
    difficulty_en: "Progressive",
    multiplayer_en: "Solo",
    viability_en: "High: self-contained Canvas game integrated via iframe with serializable runtime state.",
    visualStyle_en: "Neon synthwave direction with arcade overlays, particles, and level-themed backdrops.",
    techFocus_en: "Deterministic runner with input-latency improvements, jump physics tuning, and dodge-friendly collision balancing.",
  },

  {
    id: "arcade-pong-neon-arena",
    image: pongNeonArenaImage,
    sessionTime: "3-8 min",

    title: "Pong Neon Arena",
    category: "Arcade",
    tagline: "Pong clásico 1 vs IA con física de english, dificultad adaptativa y audio Web.",
    description:
      "Versión avanzada del Pong original con física realista de spin (english), IA adaptativa con tres perfiles de juego, sistema de puntuación por tiempo o marcador, efectos de partículas y audio generado por Web Audio API.",
    objective_es: "Alcanza 9 puntos antes que la IA o consigue la mayor puntuación cuando expire el tiempo. Usa el ángulo de golpe para engañar a la CPU.",
    howToPlay_es: "W/S o flechas arriba/abajo para mover la raqueta. Ratón sobre el canvas también funciona. Enter/Espacio para empezar, P pausa, R reinicia, M sonido, F pantalla completa. Pulsa el botón de dificultad para ciclar entre Rookie, Arcade y Pro.",
    highlights: [
      "Física de english (spin) según zona de impacto en la raqueta.",
      "IA con tres perfiles: BAL (equilibrado), AGR (agresivo), DEF (defensivo).",
      "Loop de física a 120 Hz desacoplado del render para precisión máxima.",
      "Audio procedural con Web Audio API: golpes, paredes, goles y victoria.",
      "Rally tracker, récord persistente y sistema de victorias acumulado.",
    ],
    difficulty: "Media",
    multiplayer: "Solo vs IA",
    viability: "Alta: motor Canvas 2D puro con física determinista y sin dependencias externas.",
    visualStyle: "Neón oscuro con raquetas cyan/ámbar, partículas de impacto y trail de balón.",
    techFocus: "Loop fijo 120Hz + render RAF, IA con dificultad dinámica y Web Audio API procedural.",

    category_en: "Arcade",
    tagline_en: "Classic Pong 1 vs AI with english physics, adaptive difficulty and Web Audio.",
    description_en:
      "An advanced take on the original Pong featuring realistic spin physics, adaptive AI with three play profiles, score-by-time or scorecard system, particle effects and procedural audio via Web Audio API.",
    objective_en: "Reach 9 points before the AI or score the most when time runs out. Use shot angle to trick the CPU.",
    howToPlay_en: "W/S or up/down arrows move your paddle. Mouse over the canvas also works. Enter/Space to start, P pause, R restart, M sound, F fullscreen. Click the difficulty button to cycle through Rookie, Arcade and Pro.",
    highlights_en: [
      "English (spin) physics based on paddle impact zone.",
      "AI with three profiles: BAL (balanced), AGR (aggressive), DEF (defensive).",
      "120 Hz physics loop decoupled from render for maximum precision.",
      "Procedural audio with Web Audio API: hits, walls, goals and victory.",
      "Rally tracker, persistent record and cumulative win counter.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: pure 2D Canvas engine with deterministic physics and no external dependencies.",
    visualStyle_en: "Dark neon with cyan/amber paddles, impact particles and ball trail.",
    techFocus_en: "Fixed 120Hz loop + RAF render, dynamic difficulty AI and procedural Web Audio API.",
  },

  {
    id: "arcade-buscaminas-classic",
    image: arcadeBuscaminasClassicImage,
    sessionTime: "3-12 min",

    title: "Buscaminas IA Classic",
    category: "Arcade",
    tagline: "Buscaminas clasico con primer clic seguro, puntuacion por tiempo/celdas y modo competitivo.",
    description:
      "Version moderna del Buscaminas con reglas clasicas: abre celdas seguras, interpreta numeros adyacentes y marca minas con banderas. Incluye tres niveles de IA asistente (basica, tactica y avanzada), primer clic garantizado, puntuacion por celdas descubiertas y tiempo, y modo competitivo con clasificacion local contra 25 rivales.",
    objective_es: "Abre todas las celdas seguras sin detonar minas. Usa banderas y pistas numericas para deducir posiciones peligrosas.",
    howToPlay_es: "Click izquierdo abre celda, click derecho o pulsacion larga marca bandera/interrogacion. Teclado: flechas mueven cursor, Enter/Espacio abre, F marca, H pide sugerencia IA, A ejecuta jugada IA y R reinicia.",
    highlights: [
      "Primer clic siempre seguro y expansion automatica de zonas vacias.",
      "Reglas clasicas completas: numeros adyacentes, banderas e interrogaciones.",
      "Cuatro tableros: Principiante, Intermedio, Experto y Personalizado.",
      "Tres niveles de IA: basica (heuristica simple), tactica (logica pura) y avanzada (logica + riesgo).",
      "Puntuacion competitiva basada en celdas descubiertas y tiempo empleado.",
      "Modo competitivo con clasificacion local de 25 rivales sobre la misma partida.",
      "Bridge QA con render_game_to_text, coordenadas y avance temporal determinista.",
    ],
    difficulty: "Variable (4 tableros + 3 niveles IA)",
    multiplayer: "Solo / Competitivo local (25 rivales)",
    viability: "Alta: motor de cuadrilla determinista, estado compacto y deduccion incremental.",
    visualStyle: "Panel premium con rejilla limpia, numeros de alto contraste y feedback de estado.",
    techFocus: "Generacion segura de minas, flood-fill de celdas vacias y solver IA por niveles.",

    category_en: "Arcade",
    tagline_en: "Classic Minesweeper with safe first click, score by time/cells, and competitive mode.",
    description_en:
      "Modern Minesweeper built on classic rules: reveal safe cells, read adjacent numbers and flag mines. It includes three assistant AI levels (basic, tactical and advanced), guaranteed safe first click, score based on revealed cells plus time, and a competitive mode with a local 25-rival leaderboard.",
    objective_en: "Reveal every safe cell without detonating mines. Use flags and numeric clues to deduce dangerous spots.",
    howToPlay_en: "Left click reveals a cell, right click or long press cycles flag/question. Keyboard: arrows move cursor, Enter/Space reveal, F marks, H requests AI hint, A executes AI move, and R restarts.",
    highlights_en: [
      "First click is always safe with automatic empty-area expansion.",
      "Complete classic rules: adjacent numbers, flags and question marks.",
      "Four board presets: Beginner, Intermediate, Expert and Custom.",
      "Three AI levels: basic (simple heuristic), tactical (pure logic), advanced (logic + risk estimation).",
      "Competitive score based on discovered cells and elapsed time.",
      "Competitive mode with local 25-rival leaderboard on the same board.",
      "QA bridge with render_game_to_text, coordinates and deterministic time stepping.",
    ],
    difficulty_en: "Variable (4 boards + 3 AI tiers)",
    multiplayer_en: "Solo / Local competitive (25 rivals)",
    viability_en: "High: deterministic grid engine, compact state and incremental deduction.",
    visualStyle_en: "Premium panel with clean grid, high-contrast numbers and state feedback.",
    techFocus_en: "Safe mine generation, empty-cell flood fill and tiered AI solver.",
  },

  // ── Sports ─────────────────────────────────────────────────────────────────
  {
    id: "sports-head-soccer-arena",
    image: headSoccerArenaImage,
    sessionTime: "3-6 min",

        title: "Head Soccer Pro",
    category: "Deportes",
    tagline: "Futbol 1v1 arcade reconstruido con fisica determinista, IA por niveles y HUD competitivo.",
    description:
      "Partidos rapidos 1v1 con identidad arcade y control preciso. Manten el tiro para cargar potencia, rompe la defensa rival y gestiona el ritmo del reloj en estadios cartoon.",
    objective_es: "Marca mas goles que la CPU antes de que termine el tiempo, combinando salto, cabezazo y disparo cargado.",
    howToPlay_es: "Flechas o A/D para moverte, arriba o W para saltar, manten Espacio para cargar y suelta para chutar. Enter inicia, R reinicia y P pausa.",
    highlights: [
      "Reconstruccion completa basada en referencia v2 con motor nuevo en React + Canvas.",
      "Fisica arcade estable con loop fijo, rebotes elastico-controlados y colision de cabezazos/disparos.",
      "IA escalable en tres niveles (Rookie, Pro, Elite) con anticipacion y gestion de carga.",
      "HUD profesional: barras de potencia, marcador central, cronometro critico y overlays de estado.",
      "Controles tactiles y teclado integrados con soporte QA via render_game_to_text y avance temporal.",
    ],
    difficulty: "Variable (Rookie / Pro / Elite)",
    multiplayer: "Solo vs IA",
    viability: "Alta: arquitectura determinista con estado compacto, bucle fijo y separacion render/simulacion.",
    visualStyle: "Cartoon deportivo con estadio multicapa, porterias ajedrezadas y feedback visual de potencia/gol.",
    techFocus: "Motor Canvas con timestep fijo, IA configurable por perfil y bridge de automatizacion QA.",

    category_en: "Sports",
    tagline_en: "Rebuilt 1v1 arcade soccer with deterministic physics, tiered AI, and competitive HUD.",
    description_en:
      "Fast 1v1 matches with arcade identity and responsive controls. Hold shots to charge power, break defensive setups, and manage the match clock under pressure.",
    objective_en: "Score more goals than the CPU before time runs out using jumps, headers, and charged shots.",
    howToPlay_en: "Arrows or A/D move, Up or W jumps, hold Space to charge and release to shoot. Enter starts, R restarts, and P pauses.",
    highlights_en: [
      "Full rebuild from the v2 reference with a fresh React + Canvas runtime.",
      "Stable arcade physics with fixed-step simulation, elastic bounces, and reliable ball contacts.",
      "Three AI tiers (Rookie, Pro, Elite) with anticipation and timed power-shot behavior.",
      "Professional HUD with power wings, center scoreboard, critical timer, and match overlays.",
      "Integrated keyboard/touch controls plus QA bridge support via render_game_to_text and time advance.",
    ],
    difficulty_en: "Variable (Rookie / Pro / Elite)",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: deterministic architecture with compact state and clean simulation/render separation.",
    visualStyle_en: "Cartoon sports look with layered stadium art, checkered goals, and strong goal/power feedback.",
    techFocus_en: "Fixed-step Canvas engine, profile-driven AI, and automation-friendly QA bridge.",
  },

  // ── Racing ─────────────────────────────────────────────────────────────────
  {
    id: "racing-neon-lanes",
    image: neonDriftImage,
    sessionTime: "2-5 min",

    title: "Neon Lanes Rush",
    category: "Carreras",
    tagline: "Carreras arcade por carril con clima, near-miss, turbo y cajas de ítem.",
    description:
      "Juego de carreras arcade centrado en reflejos. Cambia de carril para evitar obstáculos, adapta tu conducción al clima y completa la distancia objetivo maximizando near-miss y turbo.",
    objective_es: "Recorre la distancia objetivo evitando obstáculos y maximiza near-miss y turbo para el mayor score posible.",
    howToPlay_es: "Izq/der para cambiar carril, arriba/abajo para velocidad, Espacio para turbo, I para usar ítem recogido.",
    highlights: [
      "Control rápido con teclado o botones táctiles.",
      "Renderizado en canvas con motor Phaser y estado serializable.",
      "Cajas de ítem con Pulso EMP o kit de reparación.",
      "Escudo de recuperación para evitar derrotas injustas.",
      "Clima y estabilidad que cambian el ritmo de carrera.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: motor Phaser en canvas con loop determinista y telemetría QA.",
    visualStyle: "Arcade racing con HUD competitivo, scroll de pista y estados climáticos visibles.",
    techFocus: "Loop Phaser por ticks, cadena near-miss y sistema de ítems ofensivo/defensivo.",

    category_en: "Racing",
    tagline_en: "Arcade lane racing with weather, near-miss, turbo and item boxes.",
    description_en:
      "A reflex-focused arcade racing game. Change lanes to avoid obstacles, adapt your driving to the weather and complete the target distance by maximizing near-miss chains and turbo.",
    objective_en: "Cover the target distance avoiding obstacles, use turbo and maximize near-misses for the highest score.",
    howToPlay_en: "Left/right to change lane, up/down for speed, Space for turbo, I to use a collected item.",
    highlights_en: [
      "Fast control with keyboard or touch buttons.",
      "Canvas rendering with Phaser engine and serializable state.",
      "Item boxes with EMP Pulse or repair kit.",
      "Recovery shield to prevent unfair defeats.",
      "Weather and stability that change the racing pace.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: Phaser canvas engine with deterministic loop and QA telemetry.",
    visualStyle_en: "Arcade racing with competitive HUD, track scroll and visible weather states.",
    techFocus_en: "Tick-based Phaser loop, near-miss chain and offensive/defensive item system.",
  },
  {
    id: "racing-race2dpro",
    image: race2dproImage,
    sessionTime: "5-15 min",

    title: "Race 2D Pro",
    category: "Carreras",
    tagline: "6 circuitos nuevos, procedimiento de salida FIA y carrera 2D realista.",
    description:
      "Juego de carreras 2D con motor Canvas nativo. Incluye 6 circuitos rediseñados desde cero con una metodología de tramos rectos y curvas enlazadas, procedimiento de salida tipo parrilla con cinco luces y estrategia de carrera por vueltas.",
    objective_es: "Termina la carrera en primera posición superando a todos los rivales antes de que completen sus vueltas.",
    howToPlay_es: "Arriba/abajo para acelerar y frenar, izquierda/derecha para girar. En móvil: joystick táctil izquierdo + botones derecha. R reinicia la carrera.",
    highlights: [
      "6 circuitos inéditos generados a partir de planos de rectas y curvas, cada uno con longitud, anchura y perfil propios.",
      "Procedimiento de salida reconstruido con boxes de parrilla, cinco luces y liberación sincronizada.",
      "IA de carrera con gestión de trazada, ritmo y adelantamientos sobre formato por vueltas.",
      "Colisiones entre coches, escapatorias y límites de pista con agarre por entorno.",
      "Joystick táctil para móvil y teclado en escritorio.",
    ],
    difficulty: "Media",
    multiplayer: "Solo vs IA",
    viability: "Alta: motor Canvas 2D nativo, sin dependencias externas de juego.",
    visualStyle: "Circuito 2D cenital con entornos diferenciados, boxes de salida y HUD de fin de semana.",
    techFocus: "Canvas 2D, física de vehículo, procedimiento de salida, trazado procedural por segmentos.",

    category_en: "Racing",
    tagline_en: "6 new circuits, FIA-style start procedure, and realistic 2D racing.",
    description_en:
      "2D racing game with a native Canvas engine. It features 6 rebuilt circuits authored from straight-and-corner blueprints, a five-light grid start procedure, and lap-based race flow with realistic pack behaviour.",
    objective_en: "Finish the race in first place by beating all rivals before they complete their laps.",
    howToPlay_en: "Up/down to accelerate and brake, left/right to steer. On mobile: left touch joystick + right buttons. R restarts the race.",
    highlights_en: [
      "6 original circuits generated from straight-and-corner track plans, each with its own width, length, and overtaking profile.",
      "Rebuilt race start with staggered grid slots, five lights, and synchronized launch timing.",
      "Race AI focused on line discipline, pace variation, and overtaking over multi-lap sessions.",
      "Car-to-car collisions, runoff areas, and environment-based grip around the full lap.",
      "Touch joystick for mobile and keyboard on desktop.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: native Canvas 2D engine, no external game dependencies.",
    visualStyle_en: "Top-down 2D circuit with distinct environments, start boxes, and weekend-style HUD.",
    techFocus_en: "Canvas 2D, vehicle physics, race start procedure, segment-based procedural tracks.",
  },

  // ── Knowledge ──────────────────────────────────────────────────────────────
  {
    id: "racing-sunset-slipstream",
    image: sunsetSlipstreamImage,
    sessionTime: "2-6 min",

    title: "Sunset Slipstream",
    category: "Carreras",
    tagline: "Supervivencia arcade top-down con trafico denso, near miss, escudos y focus.",
    description:
      "Carreras de supervivencia en autopista con camara cenital, carretera vertical y control con inercia. Debes leer el trafico, corregir la trazada con precision y exprimir los near miss para cargar focus, activar camara lenta y seguir vivo cuando la densidad sube.",
    objective_es: "Sobrevive el maximo tiempo posible, esquiva coches y encadena near miss para subir la puntuacion.",
    howToPlay_es: "Izquierda/derecha maniobra el coche, arriba acelera, abajo enfria el ritmo, Espacio activa focus y R reinicia la sesion.",
    highlights: [
      "Autopista canvas top-down con carretera vertical, scroll limpio y coches mas grandes en pantalla.",
      "Sistema de near miss con racha, bonus de puntuacion y recarga de focus.",
      "Power-ups defensivos y de energia para sostener sesiones mas largas.",
      "Estado QA serializable con render_game_to_text y avance determinista.",
      "Direccion visual propia inspirada en atardecer, skyline y asfalto de alta velocidad.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: motor Canvas nativo con poca superficie tecnica y telemetria clara.",
    visualStyle: "Autopista al atardecer con horizonte urbano, asfalto centrado, luces laterales y coches de silueta arcade.",
    techFocus: "Scroll vertical, control con inercia, spawns deterministicos, near miss scoring y bullet-time ligero.",

    category_en: "Racing",
    tagline_en: "Top-down highway survival with dense traffic, near misses, shields, and focus.",
    description_en:
      "A survival racer built around a top-down highway, a vertical road layout, and inertia-based handling. Read traffic, correct the car precisely, and milk near misses to charge focus, trigger slow motion, and stay alive as density ramps up.",
    objective_en: "Survive as long as possible, dodge traffic, and chain near misses to climb the score.",
    howToPlay_en: "Left/right steers the car, up accelerates, down cools the pace, Space activates focus, and R restarts the session.",
    highlights_en: [
      "Top-down canvas highway with a vertical road, cleaner scroll, and larger on-screen cars.",
      "Near-miss system with streaks, score bonuses, and focus recharge.",
      "Defensive and energy pickups that support longer sessions.",
      "Serializable QA state with render_game_to_text and deterministic frame stepping.",
      "Original visual direction built around sunset glow, skyline silhouettes, and fast asphalt.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: native Canvas engine with low technical surface area and clear telemetry.",
    visualStyle_en: "Sunset highway with urban horizon, centred asphalt, roadside lights, and bold arcade cars.",
    techFocus_en: "Vertical scroll, inertia handling, deterministic spawns, near-miss scoring, and light bullet-time.",
  },
  {
    id: "knowledge-quiz-nexus",
    image: wordBlitzImage,
    sessionTime: "4-8 min",

    title: "Quiz Nexus",
    category: "Conocimiento",
    tagline: "Rondas de conocimiento con límite de tiempo por pregunta.",
    description:
      "Juego de preguntas por bloques temáticos con feedback inmediato. Combina rapidez y precisión para acumular puntos y cerrar la sesión con rango experto.",
    objective_es: "Responde el mayor número de preguntas correctamente dentro del tiempo límite para alcanzar el rango experto.",
    howToPlay_es: "Selecciona la respuesta pulsando el botón correspondiente y avanza al bloquear la pregunta.",
    highlights: [
      "Banco de preguntas reutilizable y ampliable (>10k).",
      "Cambio automático de idioma: navegador es → español; resto → inglés.",
      "Temporizador por ronda para aumentar desafío.",
      "Sistema de puntuación y ranking final.",
    ],
    difficulty: "Baja-Media",
    multiplayer: "Solo",
    viability: "Alta: banco masivo local con i18n por idioma de navegador.",
    visualStyle: "Panel quiz premium con identidad neón y lectura rápida de feedback.",
    techFocus: "Selección balanceada por tópicos, i18n es/en y puntuación por racha.",

    category_en: "Knowledge",
    tagline_en: "Knowledge rounds with a time limit per question.",
    description_en:
      "A question game in thematic blocks with immediate feedback. Combine speed and accuracy to accumulate points and end the session with an expert rank.",
    objective_en: "Answer as many questions correctly as possible within the time limit to reach the expert rank.",
    howToPlay_en: "Select an answer by clicking its button and advance after locking the question.",
    highlights_en: [
      "Reusable and expandable question bank (>10k).",
      "Automatic language switch: browser es → Spanish; other → English.",
      "Per-round timer to increase challenge.",
      "Scoring system and final ranking.",
    ],
    difficulty_en: "Low-Medium",
    multiplayer_en: "Solo",
    viability_en: "High: large local bank with browser-language i18n.",
    visualStyle_en: "Premium quiz panel with neon identity and fast feedback readability.",
    techFocus_en: "Topic-balanced selection, es/en i18n and streak-based scoring.",
  },

  {
    id: "knowledge-iq-masters-protocol",
    image: knowledgeIqMastersImage,
    sessionTime: "5-10 min",

    title: "IQ Masters Figure Line",
    category: "Conocimiento",
    tagline: "Puzzle single-line profesional: traza figuras usando cada segmento una sola vez.",
    description:
      "Juego de figuras tipo single-line inspirado en retos de agilidad mental. Conecta nodos adyacentes para recorrer todos los segmentos sin repetir ninguno. Incluye progresion por niveles, tiempos objetivo, pista contextual y estilo visual cuidado.",
    objective_es:
      "Completa cada figura recorriendo todos sus segmentos una sola vez, con el menor tiempo y errores posibles.",
    howToPlay_es:
      "Click/tap en nodos para iniciar la ruta y seguir por nodos conectados; tambien puedes arrastrar. R reinicia, Z deshace, H muestra pista y N avanza al siguiente nivel completado. El progreso queda guardado en local.",
    highlights: [
      "6 figuras desbloqueables con aumento de complejidad y trazados de tipo Euler.",
      "Control por click/touch y arrastre continuo para ritmo de juego movil y desktop.",
      "Pista contextual de siguiente arista valida sin resolverte toda la figura.",
      "Cronometro, contador de errores, mejores tiempos por nivel y desbloqueo progresivo.",
      "Animacion y feedback visual orientados a claridad y respuesta rapida.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: motor determinista de grafo, estado compacto y persistencia local.",
    visualStyle: "Tablero neon premium con trazos brillantes, nodos reactivos y HUD minimalista.",
    techFocus:
      "Validacion de aristas sobre grafo, runtime reactivo por nodos, soporte pointer events y bridge QA render_game_to_text.",

    category_en: "Knowledge",
    tagline_en: "Professional single-line puzzle: trace figures while using each edge exactly once.",
    description_en:
      "Single-line figure tracing inspired by premium brain-puzzle apps. Connect adjacent nodes and clear every edge exactly once. Includes progressive levels, contextual hints, and polished visual feedback.",
    objective_en:
      "Clear every figure by traversing each edge exactly once with low time and minimal mistakes.",
    howToPlay_en:
      "Click/tap nodes to start and continue the route across connected nodes; dragging is also supported. R resets, Z undoes, H requests a hint, and N advances after a clear. Progress is stored locally.",
    highlights_en: [
      "6 unlockable figures with rising complexity and Euler-style routes.",
      "Click/touch tracing with continuous drag for desktop and mobile flow.",
      "Contextual hinting for the next valid edge without auto-solving the board.",
      "Timer, mistake counter, per-level best times, and local unlock progression.",
      "Animation and visual feedback tuned for clarity and response speed.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic graph engine, compact state, and local persistence.",
    visualStyle_en: "Premium neon board with glowing strokes, reactive nodes, and a clean HUD.",
    techFocus_en:
      "Edge validation over a graph model, reactive node runtime, pointer event support, and render_game_to_text QA bridge.",
  },

  {
    id: "knowledge-refranes-clasicos",
    image: knowledgeRefranesImage,
    sessionTime: "2-5 min",

    title: "Reto de Refranes",
    category: "Conocimiento",
    tagline: "5 rondas para completar refranes del refranero espanol o ingles segun idioma.",
    description:
      "Modo de memoria verbal y cultura popular. En cada ronda se muestra el inicio de un refran y debes escribir la parte restante; si fallas, el juego revela la respuesta correcta antes de pasar al siguiente.",
    objective_es:
      "Completa 5 refranes por partida escribiendo la continuacion correcta y cierra la sesion con el maximo numero de aciertos.",
    howToPlay_es:
      "Lee el inicio del refran, escribe la parte que falta y valida con Enter o el boton. El navegador usa refranes espanoles si el idioma empieza por es y proverbios ingleses en cualquier otro caso.",
    highlights: [
      "Banco local de 500 refranes espanoles y 500 proverbios ingleses.",
      "Partidas compactas de 5 rondas con revelado inmediato de la respuesta.",
      "Validacion tolerante: acepta la continuacion o el refran completo.",
      "Seleccion por idioma de navegador: es* -> espanol; resto -> ingles.",
      "Bridge QA con prompt, respuesta, historial y progreso serializado.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: dataset local cerrado, validacion textual y flujo de 5 rondas.",
    visualStyle: "Tarjetas editoriales con foco en tipografia, cita y memoria verbal.",
    techFocus: "Banco bilingue generado desde fuentes publicas, normalizacion de texto y validacion por prompt+respuesta.",

    category_en: "Knowledge",
    tagline_en: "5 rounds to complete Spanish or English proverbs based on browser language.",
    description_en:
      "Verbal-memory and folk-wisdom mode. Each round reveals the opening of a proverb and you must type the missing continuation; when you fail, the correct answer is shown before the next round.",
    objective_en:
      "Complete 5 proverbs per match by typing the correct continuation and finish with the highest possible score.",
    howToPlay_en:
      "Read the proverb opening, type the missing ending, and submit with Enter or the button. Browsers with locale starting with es use Spanish sayings; all others use English proverbs.",
    highlights_en: [
      "Local bank of 500 Spanish sayings and 500 English proverbs.",
      "Compact 5-round matches with immediate answer reveal.",
      "Forgiving validation: accepts either the continuation or the full proverb.",
      "Browser-language switch: es* -> Spanish; everything else -> English.",
      "QA bridge with serialized prompt, answer, history, and progress.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: closed local dataset, text validation and a clear 5-round loop.",
    visualStyle_en: "Editorial quote-card layout focused on typography and proverb recall.",
    techFocus_en: "Bilingual public-source proverb bank, text normalization, and prompt-plus-answer validation.",
  },

  {
    id: "knowledge-wikipedia-gacha",
    image: knowledgeWikipediaGachaImage,
    sessionTime: "4-12 min",

    title: "Wikipedia Gacha",
    category: "Conocimiento",
    tagline: "Sobres de articulos de Wikipedia con rareza por Q-Score, sesion anonima por navegador y coleccion persistente.",
    description:
      "Vertical slice jugable de un gacha de conocimiento: cada navegador obtiene un token anonimo, abre sobres de 5 cartas, acumula duplicados, completa misiones diarias y desbloquea trofeos sin crear cuenta.",
    objective_es:
      "Construye tu coleccion de articulos, persigue cartas SR+, reclama misiones diarias y guarda un codigo de recuperacion para no perder el progreso del navegador.",
    howToPlay_es:
      "Usa las pestanas Home / Open Pack / Collection / Missions / Trophies. En Open Pack puedes abrir sobres con boton o con Espacio/Enter; 1-5 cambian de pantalla y R sincroniza el estado.",
    highlights: [
      "Sesion anonima por navegador con token persistente en localStorage.",
      "Backend propio con pity SR+, regeneracion 1 pack/min y coleccion persistente.",
      "Pack reveal de 5 cartas con rarezas C-LR, flavor text SSR+ y shards por duplicados.",
      "Misiones diarias, trofeos, historial de sobres y export/import por codigo de recuperacion.",
      "Esquema MySQL listo para migracion real y vertical slice funcional dentro del repo actual.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: contrato backend estable, estado compacto por navegador y dataset local cacheado.",
    visualStyle: "Archivo editorial con papel, laton y paneles de gabinete de museo reinterpretados para UI interactiva.",
    techFocus: "Sesion anonima, RNG de sobres, pity, persistencia de coleccion, misiones, trofeos y render_game_to_text para QA.",

    category_en: "Knowledge",
    tagline_en: "Wikipedia article packs with Q-Score rarity, anonymous browser sessions, and persistent collection progress.",
    description_en:
      "Playable vertical slice of a knowledge gacha: every browser gets an anonymous token, opens 5-card packs, collects duplicates, clears daily missions, and unlocks trophies without creating an account.",
    objective_en:
      "Build your article collection, chase SR+ pulls, claim daily missions, and keep a recovery code so browser progress is not lost.",
    howToPlay_en:
      "Use the Home / Open Pack / Collection / Missions / Trophies tabs. In Open Pack you can open packs with the button or Space/Enter; keys 1-5 switch screens and R syncs state.",
    highlights_en: [
      "Anonymous browser session with a persistent localStorage token.",
      "Custom backend with SR+ pity, 1 pack/min regen, and persistent collection state.",
      "Five-card reveal flow with C-LR rarities, SSR+ flavor text, and shard rewards for duplicates.",
      "Daily missions, trophies, pack history, and export/import via recovery code.",
      "MySQL schema prepared for real migration plus a functional vertical slice in the current repo.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: stable backend contract, compact per-browser state, and cached local dataset.",
    visualStyle_en: "Editorial archive with paper, brass, and cabinet-of-curiosities UI framing.",
    techFocus_en: "Anonymous session flow, pack RNG, pity, collection persistence, missions, trophies, and render_game_to_text QA output.",
  },

  {
    id: "knowledge-sudoku-sprint",
    image: knowledgeSudokuImage,
    sessionTime: "3-7 min",

    title: "Sudoku Sprint 4x4",
    category: "Conocimiento",
    tagline: "Sudoku de resolución rápida con validación inmediata y control por teclado.",
    description:
      "Modo de agilidad mental en formato Sudoku 4x4. Rellena celdas sin repetir números y completa el tablero con cero conflictos.",
    objective_es: "Rellena el tablero Sudoku 4x4 sin repetir números en filas, columnas ni bloques.",
    howToPlay_es: "Flechas para navegar celdas, teclas 1-4 o A/S/D/F para rellenar, Backspace/Delete para borrar, R para nueva partida aleatoria.",
    highlights: [
      "Selección de celda por ratón o flechas.",
      "Entrada numérica por teclas 1-4 y atajos A/S/D/F.",
      "Detección de conflictos en tiempo real.",
      "Payload QA con tablero, selección y estado de resolución.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: lógica determinista y estado compacto 100% cliente.",
    visualStyle: "Panel oscuro premium con rejilla 4x4 y feedback de conflictos.",
    techFocus: "Validación de fila/columna/bloque + bridge QA de estado serializable.",

    category_en: "Knowledge",
    tagline_en: "Quick-solve Sudoku with immediate validation and keyboard control.",
    description_en:
      "A mental agility mode in 4x4 Sudoku format. Fill cells without repeating numbers and complete the board with zero conflicts.",
    objective_en: "Fill the 4x4 Sudoku board without repeating numbers in any row, column or block.",
    howToPlay_en: "Arrows to navigate cells, keys 1-4 or A/S/D/F to fill, Backspace/Delete to clear, R for a random new match.",
    highlights_en: [
      "Cell selection by mouse or arrows.",
      "Number input with keys 1-4 and A/S/D/F shortcuts.",
      "Real-time conflict detection.",
      "QA payload with board, selection and resolution status.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic logic and compact 100% client-side state.",
    visualStyle_en: "Premium dark panel with 4x4 grid and conflict feedback.",
    techFocus_en: "Row/column/block validation + serializable QA state bridge.",
  },

  // ── Strategy ───────────────────────────────────────────────────────────────
  {
    id: "knowledge-domino-chain",
    image: knowledgeDominoImage,
    sessionTime: "6-18 min",

    title: "Domino Clasico Arena",
    category: "Estrategia",
    tagline: "Mesa de domino clasico 4 jugadores por parejas con tranca y puntuacion acumulada.",
    description:
      "Implementacion completa del domino clasico doble-seis: 7 fichas por jugador, apertura con 6|6, turnos circulares, pases, cierre por tranca y marcador por equipos hasta objetivo.",
    objective_es: "Domina rondas de domino en parejas y alcanza antes que el rival la meta de puntos.",
    howToPlay_es: "Flechas izq/der eligen ficha, arriba/abajo eligen extremo, Enter juega, P pasa turno, N avanza ronda, R reinicia.",
    highlights: [
      "Mesa 4 jugadores por parejas con 7 fichas por mano.",
      "Reglas clasicas: apertura 6|6, salida por derecha y tranca por bloqueo.",
      "IA por dificultad: facil, media heuristica y dificil con busqueda minimax.",
      "Partida multi-ronda con objetivo configurable, resumen de cierre y bridge QA.",
    ],
    difficulty: "Variable (Facil/Media/Dificil)",
    multiplayer: "Solo vs IA",
    viability: "Alta: reglas discretas, IA heuristica/minimax y estado serializable para QA.",
    visualStyle: "Mesa de tapete con rivales visibles, cadena serpenteante y HUD de equipo.",
    techFocus: "Motor de rondas 4 asientos con tranca, puntuacion por parejas e IA multi-nivel.",

    category_en: "Strategy",
    tagline_en: "Classic 4-player team domino with blockage, scoring and configurable AI difficulty.",
    description_en:
      "Full double-six domino implementation with 7 tiles per seat, opening by 6|6, clockwise turns, forced passes, blockage resolution and team scoring by rounds.",
    objective_en: "Win team domino rounds and reach the target score before the rival pair.",
    howToPlay_en: "Left/right arrows choose tile, up/down choose edge, Enter plays, P passes, N advances round, R restarts.",
    highlights_en: [
      "4-seat board with partnership scoring and hidden AI hands.",
      "Classic rules: 6|6 opening, right starter rotation and blockage close.",
      "AI by difficulty: easy, medium heuristic and hard minimax search.",
      "Multi-round match with configurable target, end summary and QA bridge.",
    ],
    difficulty_en: "Variable (Easy/Medium/Hard)",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: discrete rules, heuristic/minimax AI and serializable QA state.",
    visualStyle_en: "Felt table with top/side opponents, serpentine chain and tactical team HUD.",
    techFocus_en: "Rule-accurate 4-seat round engine, blockage detection and team AI decisioning.",
  },
  // ── Knowledge (continued) ──────────────────────────────────────────────────
  {
    id: "knowledge-ahorcado-flash",
    image: knowledgeAhorcadoImage,
    sessionTime: "2-4 min",

    title: "Ahorcado Flash",
    category: "Conocimiento",
    tagline: "Adivina palabras con pista temática y límite de fallos.",
    description:
      "Juego clásico de palabras: usa las pistas y acierta letras antes de perder todos los intentos disponibles.",
    objective_es: "Adivina la palabra oculta letra a letra antes de agotar todos los intentos disponibles.",
    howToPlay_es: "Escribe letras para adivinar la palabra. Cuando termines, pulsa Enter o el botón de partida aleatoria para una nueva palabra.",
    highlights: [
      "Diccionario temático orientado a conocimiento general.",
      "Teclado virtual + input físico.",
      "Cambio de palabra al reiniciar para variar partidas.",
      "Bridge QA con máscara, letras usadas e intentos restantes.",
    ],
    difficulty: "Baja-Media",
    multiplayer: "Solo",
    viability: "Alta: conjunto acotado de palabras, flujo simple y rejugable.",
    visualStyle: "Interfaz neón con barra de progreso de errores y teclado virtual.",
    techFocus: "Entrada por teclado global, máscara de palabra y gestión de intentos.",

    category_en: "Knowledge",
    tagline_en: "Guess words with a themed clue and error limit.",
    description_en: "Classic word game: use clues and guess letters before losing all available attempts.",
    objective_en: "Guess the hidden word letter by letter before running out of all available attempts.",
    howToPlay_en: "Type letters to guess the word. When finished, press Enter or the random match button for a new word.",
    highlights_en: [
      "Knowledge-oriented thematic dictionary.",
      "Virtual keyboard + physical input.",
      "Word change on restart for game variety.",
      "QA bridge with mask, used letters and remaining attempts.",
    ],
    difficulty_en: "Low-Medium",
    multiplayer_en: "Solo",
    viability_en: "High: bounded word set, simple and replayable flow.",
    visualStyle_en: "Neon interface with error progress bar and virtual keyboard.",
    techFocus_en: "Global keyboard input, word mask and attempt management.",
  },

  {
    id: "knowledge-paciencia-lite",
    image: knowledgePacienciaImage,
    sessionTime: "4-8 min",

    title: "Paciencia Clásica Lite",
    category: "Conocimiento",
    tagline: "Solitario compacto con stock, descarte y fundaciones por palo.",
    description:
      "Versión ligera de paciencia: roba cartas, organiza columnas y construye fundaciones de As a 7 para ganar la ronda.",
    objective_es: "Construye las cuatro fundaciones de As a 7 organizando correctamente las columnas del solitario.",
    howToPlay_es: "D roba, A selecciona descarte, Q/W/E/R columnas, flechas cambian destino, Enter/Espacio mueven, P lanza partida aleatoria.",
    highlights: [
      "Stock/descarte con reciclado cuando se agota el mazo.",
      "Fundaciones por palo con progreso visible.",
      "Destino de columna controlado por teclado y UI.",
      "Auto-selección a fundación para acelerar flujo.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: motor de reglas discreto sin dependencias externas.",
    visualStyle: "Mesa de cartas minimalista con estados de selección y destino.",
    techFocus: "Reglas de movimiento tipo solitario + progresión por fundaciones.",

    category_en: "Knowledge",
    tagline_en: "Compact solitaire with stock, waste and suit foundations.",
    description_en:
      "A lightweight patience game: draw cards, organize columns and build foundations from Ace to 7 to win the round.",
    objective_en: "Build all four foundations from Ace to 7 by correctly organizing the solitaire columns.",
    howToPlay_en: "D draws, A selects waste, Q/W/E/R columns, arrows change target, Enter/Space moves, P loads a random match.",
    highlights_en: [
      "Stock/waste with recycling when the deck runs out.",
      "Suit foundations with visible progress.",
      "Column destination controlled by keyboard and UI.",
      "Auto-selection to foundation to speed up flow.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: discrete rules engine with no external dependencies.",
    visualStyle_en: "Minimalist card table with selection and destination states.",
    techFocus_en: "Solitaire movement rules + foundation-based progression.",
  },

  {
    id: "knowledge-puzle-deslizante",
    image: knowledgePuzleImage,
    sessionTime: "2-6 min",

    title: "Puzle Deslizante 8",
    category: "Conocimiento",
    tagline: "Ordena fichas del 1 al 8 moviendo el hueco vacío.",
    description: "Puzzle numérico clásico de 8 piezas. Mueve las fichas adyacentes para ordenar la secuencia completa.",
    objective_es: "Ordena las fichas del 1 al 8 deslizando el espacio vacío para completar la secuencia.",
    howToPlay_es: "Usa las flechas para mover el hueco o pulsa fichas adyacentes directamente. R carga una nueva partida aleatoria.",
    highlights: [
      "Control dual: teclado y ratón.",
      "Conteo de movimientos por partida.",
      "Finalización automática al detectar secuencia correcta.",
      "Payload QA con posición exacta de cada ficha.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: algoritmo de swap simple y estado totalmente determinista.",
    visualStyle: "Grid 3x3 limpio con foco en legibilidad y ritmo rápido.",
    techFocus: "Movimientos por flechas/click y verificación instantánea de solución.",

    category_en: "Knowledge",
    tagline_en: "Order tiles 1 to 8 by moving the empty space.",
    description_en: "Classic 8-piece sliding puzzle. Move adjacent tiles to sort the complete sequence.",
    objective_en: "Sort tiles 1 to 8 by sliding the empty space to complete the sequence.",
    howToPlay_en: "Use arrows to move the blank or click adjacent tiles directly. R loads a new random match.",
    highlights_en: [
      "Dual control: keyboard and mouse.",
      "Move counter per game.",
      "Automatic completion when the correct sequence is detected.",
      "QA payload with exact position of each tile.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: simple swap algorithm and fully deterministic state.",
    visualStyle_en: "Clean 3x3 grid focused on readability and fast pacing.",
    techFocus_en: "Arrow/click moves and instant solution verification.",
  },

  {
    id: "knowledge-crucigrama-mini",
    image: knowledgeCrucigramaImage,
    sessionTime: "4-9 min",

    title: "Crucigrama Pro",
    category: "Conocimiento",
    tagline: "Crucigrama dinamico con mas de 10.000 partidas y selector de longitud maxima.",
    description:
      "Rellena una rejilla dinamica de crucigrama con pistas naturales. El juego permite elegir longitud maxima de palabra (6-10), valida progreso y mantiene partidas deterministas para rejugar.",
    objective_es: "Completa la rejilla usando pistas horizontales y verticales, ajustando la longitud maxima segun el reto deseado.",
    howToPlay_es: "Selecciona la longitud maxima en el desplegable, usa flechas para navegar, escribe letras, Backspace para borrar y Enter para comprobar. El boton de nueva partida carga otro tablero.",
    highlights: [
      "Mas de 10.000 partidas por idioma con generacion determinista.",
      "Selector de longitud maxima (6-10) con palabras mixtas por partida.",
      "Pistas variadas por estilo y dificultad para evitar repeticion.",
      "Bridge QA con rejilla editable completa y estado serializado.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: rejilla fija de bajo coste y validación por comparación directa.",
    visualStyle: "Panel de letras con celdas bloqueadas y listado de pistas lateral.",
    techFocus: "Edición celda a celda, navegación por flechas y comprobación de solución.",

    category_en: "Knowledge",
    tagline_en: "Dynamic crossword with 10k+ matches and max-length selector.",
    description_en:
      "Fill a dynamic crossword grid with natural clues. You can choose max word length (6-10), keep deterministic replayability, and check progress at any time.",
    objective_en: "Complete the grid using across and down clues while tuning the max word length for your preferred challenge.",
    howToPlay_en: "Pick max length from the dropdown, use arrows to navigate, type letters, Backspace to clear, and Enter to check. The random button loads another board.",
    highlights_en: [
      "10k+ deterministic matches per locale.",
      "Max-length selector (6-10) with mixed word lengths per board.",
      "Varied clue styles by grammar and difficulty.",
      "QA bridge with full editable grid and serialized state.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: fixed low-cost grid and direct-comparison validation.",
    visualStyle_en: "Letter panel with blocked cells and lateral clue list.",
    techFocus_en: "Cell-by-cell editing, arrow navigation and solution checking.",
  },

  {
    id: "knowledge-sopa-letras-mega",
    image: knowledgeSopaLetrasImage,
    sessionTime: "4-10 min",

    title: "Sopa de Letras Mega",
    category: "Conocimiento",
    tagline: "Tablero grande 20x20 con 10.000 partidas ES/EN y palabras en 8 direcciones.",
    description:
      "Encuentra palabras de conocimiento general dentro de una rejilla grande. Cada partida cambia de forma determinista y permite localizar palabras en horizontal, vertical o diagonal, tanto en sentido normal como al revés.",
    objective_es: "Encuentra todas las palabras ocultas en la rejilla 20x20 en horizontal, vertical o diagonal.",
    howToPlay_es: "Arrastra o marca inicio-fin para seleccionar palabras en horizontal, vertical o diagonal (también al revés). R carga una nueva partida aleatoria.",
    highlights: [
      "Tablero grande 20x20 para sesiones de búsqueda más largas.",
      "10.000 combinaciones por idioma (es/en) según locale del navegador.",
      "Selección por arrastre o click inicio-fin con soporte de dirección inversa.",
      "Palabras reales de ciencia, historia, lenguaje, salud y cultura.",
      "Bridge QA con estado serializado de progreso y palabras pendientes.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: generador determinista por semilla, estado ligero y validación directa por trazado.",
    visualStyle: "Panel premium de letras con rejilla amplia, trazado en vivo y listado de objetivos.",
    techFocus: "Generación procedural bilingüe de 10k partidas + detección de líneas (horizontal/reversa/vertical/diagonal).",

    category_en: "Knowledge",
    tagline_en: "Large 20x20 board with 10,000 ES/EN matches and words in 8 directions.",
    description_en:
      "Find general knowledge words within a large grid. Each match changes deterministically and lets you locate words horizontally, vertically or diagonally, in both normal and reverse directions.",
    objective_en: "Find all hidden words in the 20x20 grid horizontally, vertically or diagonally.",
    howToPlay_en: "Drag or click start-end to select words horizontally, vertically or diagonally (reverse also works). Press R for a new random match.",
    highlights_en: [
      "Large 20x20 board for longer search sessions.",
      "10,000 combinations per language (es/en) based on browser locale.",
      "Selection by drag or start-end click with reverse direction support.",
      "Real words from science, history, language, health and culture.",
      "QA bridge with serialized state of progress and pending words.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: seed-based deterministic generator, lightweight state and direct trace validation.",
    visualStyle_en: "Premium letter panel with wide grid, live tracing and target word list.",
    techFocus_en: "Bilingual 10k-match procedural generation + line detection (horizontal/reverse/vertical/diagonal).",
  },
  {
    id: "knowledge-wordle-pro",
    image: knowledgeWordleImage,
    sessionTime: "3-7 min",

    title: "Wordle Pro",
    category: "Conocimiento",
    tagline: "Adivina la palabra secreta con feedback por letra y banco ES/EN de 10.000 palabras.",
    description:
      "Version pro de Wordle para la categoria Conocimiento: cada partida usa una palabra real del banco bilingue (es/en) y te da feedback exacto de letra correcta, letra presente o letra ausente.",
    objective_es: "Descubre la palabra objetivo antes de agotar los intentos maximos de la ronda.",
    howToPlay_es: "Escribe letras, pulsa Enter para validar, Backspace para borrar y usa el boton de partida aleatoria para cambiar. Cada color indica correcta/presente/ausente.",
    highlights: [
      "10.000 palabras reales por idioma (es/en) como objetivos de partida.",
      "Feedback tipo Wordle con manejo correcto de letras repetidas.",
      "Dificultad adaptada por longitud de palabra (5-10 letras).",
      "Bridge QA con estado serializado de intentos, teclado y progreso.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: motor de validacion discreto, estado compacto y telemetria clara por intento.",
    visualStyle: "Panel oscuro con rejilla Wordle, teclado virtual y leyenda de feedback cromatico.",
    techFocus: "Evaluacion determinista por posicion/frecuencia + sincronizacion de estado de teclado.",

    category_en: "Knowledge",
    tagline_en: "Guess the secret word with per-letter feedback and a bilingual 10,000-word bank.",
    description_en:
      "Pro Wordle mode for the Knowledge category: each match uses a real target word from the bilingual bank (es/en) and returns exact feedback for correct, present and absent letters.",
    objective_en: "Find the target word before running out of maximum attempts.",
    howToPlay_en: "Type letters, press Enter to submit, Backspace to delete, and use the random-match button for a new match. Colors indicate correct/present/absent letters.",
    highlights_en: [
      "10,000 real target words per locale (es/en).",
      "Wordle-style feedback with proper repeated-letter handling.",
      "Difficulty tuned by target length (5-10 letters).",
      "QA bridge with serialized attempts, keyboard state and progress.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: discrete validation engine, compact state and clear per-attempt telemetry.",
    visualStyle_en: "Dark panel with Wordle grid, virtual keyboard and color-feedback legend.",
    techFocus_en: "Deterministic position/frequency evaluation + keyboard state synchronization.",
  },

  {
    id: "knowledge-anagramas-pro",
    image: knowledgeAnagramasImage,
    sessionTime: "3-7 min",

    title: "Anagramas Pro",
    category: "Conocimiento",
    tagline: "Reordena letras para encontrar la palabra objetivo con banco ES/EN de 10.000 palabras.",
    description:
      "Modo de anagramas con palabras reales del banco bilingue. Recibes letras mezcladas de la solucion y debes reconstruir la palabra correcta en intentos limitados.",
    objective_es: "Reconstruye la palabra objetivo usando exactamente las letras mostradas antes de agotar los intentos.",
    howToPlay_es: "Escribe tu propuesta con las mismas letras, Enter valida, M remezcla letras, Backspace borra y usa el boton de partida aleatoria.",
    highlights: [
      "10.000 palabras reales por idioma (es/en) como base de retos.",
      "Mezcla determinista de letras con opcion de remezcla manual.",
      "Validacion de composicion de letras para evitar respuestas invalidas.",
      "Bridge QA con estado serializado de intentos, mezclas y solucion final.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: mecanica de anagrama de bajo coste computacional y alta rejugabilidad.",
    visualStyle: "Panel premium con fichas de letras mezcladas, teclado virtual e historial de intentos.",
    techFocus: "Generacion determinista de anagramas + control de intentos y verificacion por histogramas.",

    category_en: "Knowledge",
    tagline_en: "Reorder letters to find the target word using a bilingual 10,000-word bank.",
    description_en:
      "Anagram mode with real words from the bilingual lexicon. You receive shuffled letters from the solution and must reconstruct the exact target within limited attempts.",
    objective_en: "Rebuild the target word using exactly the displayed letters before attempts run out.",
    howToPlay_en: "Type a guess with the same letters, Enter submits, M reshuffles letters, Backspace deletes, and use the random-match button.",
    highlights_en: [
      "10,000 real words per locale (es/en) as challenge base.",
      "Deterministic letter shuffling with manual reshuffle support.",
      "Letter-composition validation to block invalid proposals.",
      "QA bridge with serialized attempts, reshuffles and final solution.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: low-cost anagram mechanics with strong replayability.",
    visualStyle_en: "Premium panel with shuffled letter tiles, virtual keyboard and guess history.",
    techFocus_en: "Deterministic anagram generation + attempt flow and histogram-based validation.",
  },
  // ── Strategy (chess) ───────────────────────────────────────────────────────
  {
    id: "knowledge-calculo-mental-flash10",
    image: knowledgeCalculoMentalImage,
    sessionTime: "1-4 min",

    title: "Calculo Mental Flash 10",
    category: "Conocimiento",
    tagline: "Partidas de 10 rondas con operaciones mixtas y limite global de 40 segundos.",
    description:
      "Modo rapido de matematicas mentales: cada sesion genera 10 calculos de dificultad creciente y solo dispones de 40 segundos totales para completarlos.",
    objective_es: "Resuelve las 10 rondas de calculo antes de que el cronometro de 40 segundos llegue a cero.",
    howToPlay_es: "Escribe el resultado de cada operacion y pulsa Enter para validar. Cada envio pasa a la siguiente ronda hasta completar 10 o agotar el tiempo.",
    highlights: [
      "Formato fijo de 10 rondas por partida con operaciones variadas.",
      "Cronometro global de 40 segundos para priorizar velocidad mental.",
      "Generacion determinista de operaciones por semilla de partida.",
      "Historial de rondas con respuesta enviada, resultado esperado y precision.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: estado compacto, reglas discretas y telemetria directa por ronda.",
    visualStyle: "Panel oscuro de entrenamiento cognitivo con foco en operacion y tiempo restante.",
    techFocus: "Generador procedural de operaciones + control de ronda/tiempo + bridge QA serializable.",

    category_en: "Knowledge",
    tagline_en: "10-round matches with mixed operations and a strict 40-second global timer.",
    description_en:
      "Fast mental-math mode: each session builds 10 escalating calculations and gives you only 40 total seconds to finish them.",
    objective_en: "Solve all 10 calculation rounds before the 40-second timer reaches zero.",
    howToPlay_en: "Type each result and press Enter to submit. Every submission advances to the next round until you finish all 10 or run out of time.",
    highlights_en: [
      "Fixed 10-round match structure with mixed arithmetic operations.",
      "Global 40-second countdown to enforce rapid mental execution.",
      "Deterministic operation generation based on match seed.",
      "Round history with submitted answer, expected result and accuracy.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: compact state, discrete rules and direct per-round telemetry.",
    visualStyle_en: "Dark cognitive-training panel focused on operation readability and time pressure.",
    techFocus_en: "Procedural math generation + round/time state machine + serializable QA bridge.",
  },

  {
    id: "knowledge-tabla-periodica-total",
    image: knowledgeTablaPeriodicaImage,
    sessionTime: "6-20 min",

    title: "Tabla Periodica Total",
    category: "Conocimiento",
    tagline: "Tabla periodica completa con 118 casillas vacias para colocar cada elemento.",
    description:
      "Reto de memorizacion avanzada: la tabla aparece vacia y debes escribir el elemento correcto en cada posicion hasta completar las 118 casillas.",
    objective_es: "Completa toda la tabla periodica introduciendo el simbolo o nombre correcto en cada celda.",
    howToPlay_es: "Selecciona una casilla, escribe simbolo o nombre y valida con Enter. Usa flechas para moverte por la tabla, N para saltar a la siguiente pendiente y R para reiniciar.",
    highlights: [
      "Rejilla completa de 118 elementos con distribucion periodica real.",
      "Casillas inicialmente vacias para entrenar memoria de posicion y nomenclatura.",
      "Validacion flexible por simbolo, nombre en espanol o nombre en ingles.",
      "Seguimiento de intentos, errores y progreso hasta completar el 100%.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo",
    viability: "Alta: dataset cerrado, validacion local y estado serializable por casilla.",
    visualStyle: "Tablero tecnico de quimica con panel lateral de entrada y feedback por celda.",
    techFocus: "Motor de validacion de elementos + navegacion de rejilla irregular + bridge QA completo.",

    category_en: "Knowledge",
    tagline_en: "Complete periodic table with 118 empty cells to place every element.",
    description_en:
      "Advanced memory challenge: the table starts empty and you must enter the correct element in every position until all 118 cells are solved.",
    objective_en: "Complete the full periodic table by entering the correct symbol or name in each cell.",
    howToPlay_en: "Select a cell, type symbol or name, and press Enter to validate. Use arrows to move, N to jump to the next pending cell, and R to restart.",
    highlights_en: [
      "Full 118-element grid with realistic periodic-table structure.",
      "All cells start empty to train location memory and element naming.",
      "Flexible validation by symbol, Spanish name, or English name.",
      "Attempt/mistake/progress tracking until reaching 100% completion.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo",
    viability_en: "High: closed dataset, local validation and per-cell serializable state.",
    visualStyle_en: "Technical chemistry board with side-entry panel and per-cell feedback.",
    techFocus_en: "Element-validation engine + irregular-grid navigation + full QA state bridge.",
  },

  {
    id: "knowledge-mapas-atlas",
    image: knowledgeMapasImage,
    sessionTime: "4-14 min",

    title: "Mapas Atlas",
    category: "Conocimiento",
    tagline: "Adivina nombres ocultos en mundo, continentes, paises, provincias y ciudades.",
    description:
      "Juego geografico basado en escritura: eliges la escala (mundo, continente, pais o ciudades) y desbloqueas etiquetas ocultas al introducir el nombre correcto de cada objetivo.",
    objective_es:
      "Completa el mapa activo descubriendo todos los nombres ocultos: continentes/oceanos en mundo, paises en continente, provincias/estados en pais y ciudades principales en modo ciudades.",
    howToPlay_es:
      "Selecciona escala y mapa, escribe un nombre geografico y valida con Enter. Cada acierto revela la etiqueta. Usa R para reiniciar y N para mapa aleatorio.",
    highlights: [
      "Modo Mundo con continentes y oceanos ocultos para entrenamiento global.",
      "Modo Continente con paises ocultos (incluye Europa completa y Sudamerica).",
      "Modo Continente ampliado: Europa, Sudamerica, America completa, Asia y Oceania por siluetas de paises.",
      "Modo Pais ampliado con decenas de paises y sus subdivisiones (estados/provincias/departamentos).",
      "Modo Ciudades con lista amplia de paises y ciudades principales desbloqueables sobre su silueta.",
      "Feedback inmediato con progreso, precision, intentos y listado desbloqueable.",
      "Bridge QA con estado serializado de objetivos, entradas y progreso visible.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: reglas discretas, dataset local y validacion textual en cliente.",
    visualStyle: "Atlas interactivo con nodos geoposicionados, panel lateral y objetivos ocultos.",
    techFocus: "Normalizacion de texto multilenguaje + motor de desbloqueo por mapa + runtime bridge.",

    category_en: "Knowledge",
    tagline_en: "Guess hidden names across world, continents, countries, provinces and cities.",
    description_en:
      "Typing-based geography challenge: choose scope (world, continent, country, or cities) and unlock hidden labels by entering each correct name.",
    objective_en:
      "Complete the active map by revealing all hidden labels: continents/oceans in world mode, countries in continent mode, provinces/states in country mode, and major cities in city mode.",
    howToPlay_en:
      "Select scope and map, type a geographic name, and press Enter to validate. Each hit reveals one label. Use R to restart and N for a random map.",
    highlights_en: [
      "World mode with hidden continents and oceans for broad training.",
      "Continent mode with hidden countries (includes full Europe and South America).",
      "Expanded continent mode: Europe, South America, full Americas, Asia and Oceania country silhouettes.",
      "Expanded country mode with dozens of countries and their subdivisions (states/provinces/departments).",
      "City mode with a broad list of countries and unlockable major-city targets over the country silhouette.",
      "Immediate feedback via progress, accuracy, attempts and unlock list.",
      "QA bridge with serialized targets, input state and visible progression.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: discrete rules, local datasets and client-side text validation.",
    visualStyle_en: "Interactive atlas with geolocated nodes, side panel and hidden targets.",
    techFocus_en: "Multilingual text normalization + map unlock engine + runtime bridge.",
  },

  {
    id: "knowledge-mapas-camino-corto",
    image: knowledgeMapasImage,
    sessionTime: "3-10 min",

    title: "Adivina el camino mas corto",
    category: "Conocimiento",
    tagline: "Conecta origen y destino por frontera (paises o provincias) usando la ruta minima.",
    description:
      "Reto geografico por adyacencia con dos apartados: paises por continente y provincias por pais. Recibes un origen y un destino y debes escribir nodos vecinos para construir la ruta mas corta.",
    objective_es:
      "Llega al destino usando el menor numero posible de pasos. Los nodos del camino ideal se muestran en verde y las alternativas no optimas en naranja.",
    howToPlay_es:
      "Elige modo (paises o provincias), escribe el siguiente vecino y valida con Enter. Solo cuentan fronteras directas con tu posicion actual. Usa R para reiniciar la misma ruta y N para generar una nueva.",
    highlights: [
      "Dos apartados jugables: paises por continente y provincias por pais.",
      "Silueta inicial visible del origen y destino fijado por partida.",
      "Motor de caminos minimos sobre grafos de fronteras de paises y provincias.",
      "Feedback visual por paso: verde (ideal) vs naranja (alternativo).",
      "Historial de ruta paso a paso con intentos, pasos usados y minimo restante.",
      "Bridge QA con estado serializado de ruta, progreso y paises revelados.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: reglas discretas de grafo, validacion textual local y estado compacto.",
    visualStyle: "Mapa de siluetas geograficas con trazado progresivo de ruta por colores.",
    techFocus: "BFS para camino minimo + validacion de vecinos en paises/provincias + telemetria de ruta.",

    category_en: "Knowledge",
    tagline_en: "Connect origin and destination through borders (countries or provinces) using shortest path.",
    description_en:
      "Adjacency-based geography challenge with two sections: countries by continent and provinces by country. Each match gives origin and destination and you must type neighboring nodes to build the shortest route.",
    objective_en:
      "Reach destination with the fewest possible steps. Ideal-path nodes are shown in green and non-optimal alternatives in orange.",
    howToPlay_en:
      "Choose mode (countries or provinces), type the next neighboring node and press Enter to validate. Only direct border neighbors of your current position are accepted. Use R to restart and N to generate a new route.",
    highlights_en: [
      "Two playable sections: countries by continent and provinces by country.",
      "Visible origin silhouette with a fixed destination per match.",
      "Shortest-path engine over country and province border graphs.",
      "Per-step visual feedback: green (ideal) vs orange (alternative).",
      "Step-by-step route log with attempts, used steps and best remaining distance.",
      "QA bridge with serialized route, progress and revealed countries.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: discrete graph rules, local text validation and compact state.",
    visualStyle_en: "Geographic silhouette board with progressive color-coded route tracing.",
    techFocus_en: "BFS shortest path + neighbor validation for countries/provinces + route telemetry.",
  },

  {
    id: "knowledge-adivina-pais-silueta",
    image: knowledgeAdivinaPaisImage,
    sessionTime: "3-8 min",

    title: "Adivina el pais",
    category: "Conocimiento",
    tagline: "5 rondas por partida para identificar paises por su silueta.",
    description:
      "Reto geografico corto y directo: en cada ronda aparece la silueta de un pais y debes escribir su nombre. Mientras escribes, el juego muestra recomendaciones de todos los paises compatibles con esas letras.",
    objective_es:
      "Completa 5 rondas con el maximo numero de aciertos, identificando cada silueta y validando el pais correcto.",
    howToPlay_es:
      "Escribe el nombre del pais y pulsa Enter para validar. Tras cada validacion se revela la respuesta y puedes avanzar a la siguiente ronda. R reinicia partida y N avanza ronda cuando ya esta validada.",
    highlights: [
      "Partidas compactas de 5 rondas con puntuacion acumulada de aciertos.",
      "Siluetas de paises reutilizadas de los datasets geograficos ya integrados.",
      "Recomendaciones dinamicas de paises compatibles segun las letras escritas.",
      "Validacion multilenguaje con alias y normalizacion de texto sin tildes.",
      "Historial de rondas con respuesta enviada y resultado por intento.",
      "Bridge QA con estado serializado de ronda, sugerencias y progreso.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: reglas discretas, datasets ya disponibles y validacion textual local.",
    visualStyle: "Tablero de silueta unica con panel lateral de entrada, recomendados e historial.",
    techFocus: "Filtrado incremental de paises + validacion por alias + zoom dinamico de silueta SVG.",

    category_en: "Knowledge",
    tagline_en: "5 rounds per match to identify countries from their silhouette.",
    description_en:
      "Short geography challenge: each round shows one country silhouette and you must type the country name. While typing, live recommendations list every country that matches the current letters.",
    objective_en:
      "Complete 5 rounds with the highest possible score by identifying each silhouette correctly.",
    howToPlay_en:
      "Type the country name and press Enter to check. After each check, the answer is revealed and you can continue to the next round. R restarts the match and N advances once a round is checked.",
    highlights_en: [
      "Compact 5-round matches with cumulative hit scoring.",
      "Country silhouettes reused from existing integrated geography datasets.",
      "Dynamic recommendations of matching countries while typing.",
      "Multilingual validation with aliases and accent-insensitive normalization.",
      "Round history with submitted guess and result.",
      "QA bridge with serialized round, recommendation, and progress state.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: discrete rules, existing datasets, and local text validation.",
    visualStyle_en: "Single-silhouette board with side panel for input, recommendations, and history.",
    techFocus_en: "Incremental country filtering + alias-based validation + dynamic SVG silhouette zoom.",
  },

  {
    id: "knowledge-tangram-pro",
    image: knowledgeTangramImage,
    sessionTime: "5-12 min",

    title: "Tangram Pro",
    category: "Conocimiento",
    tagline: "Puzzle espacial con las 7 tans clasicas y validacion profesional de encaje.",
    description:
      "Version de tangram orientada a precision geomtrica: debes reconstruir la silueta objetivo usando exactamente las 7 piezas tradicionales (2 triangulos grandes, 1 mediano, 2 pequenos, 1 cuadrado y 1 paralelogramo), sin solapes y con control total de rotacion/volteo.",
    objective_es:
      "Completa cada silueta encajando todas las piezas en su posicion correcta sin superponer geometria.",
    howToPlay_es:
      "Arrastra piezas desde la zona de bandeja al objetivo. Q/E rotan 45 grados, F voltea el paralelogramo, Enter intenta encajar la seleccion y H activa o desactiva guia visual. R reinicia la misma partida y N carga otra silueta.",
    highlights: [
      "Modelo fiel de las 7 tans con proporciones geometricas consistentes.",
      "Regla de validacion estricta: sin solapes y con todas las piezas encajadas.",
      "Sistema de snap por tolerancia espacial y orientacion por tipo de pieza.",
      "Soporte completo de rotacion por pasos de 45 grados y volteo de paralelogramo.",
      "Telemetria jugable: movimientos, tiempo, solapes activos y ayudas usadas.",
      "Bridge QA serializable con estado de piezas, slots objetivo y progreso.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: motor geometrico local, sin dependencias externas y estado compacto.",
    visualStyle: "Tablero dual bandeja/objetivo con silueta translucida y piezas cromaticas de alto contraste.",
    techFocus: "Geometria de poligonos convexos + SAT para solapes + snapping por orientacion.",

    category_en: "Knowledge",
    tagline_en: "Spatial tangram puzzle with all 7 tans and strict silhouette validation.",
    description_en:
      "Tangram mode focused on geometric precision: rebuild the target silhouette using all 7 classic tans (2 large triangles, 1 medium, 2 small, 1 square, 1 parallelogram), with no overlaps and full rotation/flip control.",
    objective_en:
      "Complete each silhouette by locking every piece in its correct position without overlapping geometry.",
    howToPlay_en:
      "Drag pieces from the tray to the target. Q/E rotates 45 degrees, F flips the parallelogram, Enter snaps the selected piece, and H toggles the guide layer. R restarts the same match and N loads another silhouette.",
    highlights_en: [
      "Faithful 7-tan model with consistent geometric proportions.",
      "Strict completion rule: no overlaps and all pieces locked.",
      "Tolerance-based snap system with orientation matching per piece type.",
      "Full 45-degree rotation flow plus dedicated parallelogram flip.",
      "Playable telemetry: moves, timer, active overlaps, and hint usage.",
      "Serializable QA bridge exposing piece states, target slots, and progress.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: fully local geometry engine, no external dependencies, compact state.",
    visualStyle_en: "Dual tray/target board with translucent silhouette and high-contrast chromatic pieces.",
    techFocus_en: "Convex polygon geometry + SAT overlap detection + orientation-aware snapping.",
  },

  {
    id: "knowledge-cronologia-maestra",
    image: knowledgeCronologiaImage,
    sessionTime: "6-16 min",

    title: "Cronologia Maestra",
    category: "Conocimiento",
    tagline: "Mision profunda de orden temporal con pistas tacticas, analitica y ranking final.",
    description:
      "Juego de conocimiento historico orientado a precision cronologica. En cada ronda recibes eventos reales mezclados, un evento ancla y recursos limitados de Intel para pedir pistas. Debes construir la linea temporal correcta y sostener consistencia a lo largo de toda la mision.",
    objective_es:
      "Ordena correctamente los eventos de cada ronda para maximizar puntuacion, racha y rango final de mision.",
    howToPlay_es:
      "Coloca cartas por clic o con teclas 1-9, elimina la ultima con Backspace y valida con Enter. Usa H/J/K para pistas (rango, fecha exacta, relacion con ancla), N para avanzar ronda ya revisada y R para nueva mision.",
    highlights: [
      "Motor determinista de misiones por semilla con 4 modos: mix, ciencia, geopolitica y cultura.",
      "Tres dificultades con distinto numero de rondas, tiempo e Intel inicial.",
      "Sistema de evaluacion profesional: precision, consistencia temporal, inversiones y error total.",
      "Economia de pistas con coste de Intel y recompensa por rondas perfectas.",
      "Informe detallado por ronda con orden correcto, orden enviado y metricas comparables.",
      "Bridge QA serializable con estado completo de ronda, cartas visibles y telemetria.",
    ],
    difficulty: "Variable (Analista/Experto/Maestro)",
    multiplayer: "Solo",
    viability: "Alta: dataset local, reglas discretas y evaluacion reproducible sin dependencias externas.",
    visualStyle: "Panel tactico de inteligencia historica con cards, timeline y tablero de analitica.",
    techFocus: "Generacion procedural por semilla + evaluacion de orden + sistema de pistas y scoring avanzado.",

    category_en: "Knowledge",
    tagline_en: "Deep timeline mission with tactical hints, analytics, and final ranking.",
    description_en:
      "Historical-knowledge game focused on chronology accuracy. Every round gives mixed real events, one anchor event, and limited Intel resources for hints. Build the correct timeline and keep consistency across the entire mission.",
    objective_en:
      "Sort each round's events correctly to maximize score, streak, and final mission rank.",
    howToPlay_en:
      "Place cards with clicks or keys 1-9, remove the latest card with Backspace, and validate with Enter. Use H/J/K for hints (range, exact year, anchor relation), N to advance reviewed rounds, and R for a new mission.",
    highlights_en: [
      "Deterministic seed-driven mission engine with 4 modes: mix, science, geopolitics, and culture.",
      "Three difficulty tiers with different round count, timer pressure, and initial Intel.",
      "Professional evaluation metrics: accuracy, chronology consistency, inversion count, and total error.",
      "Hint economy with Intel costs and perfect-round rewards.",
      "Detailed round report with correct order, submitted order, and comparable metrics.",
      "Serializable QA bridge exposing full round state, visible cards, and telemetry.",
    ],
    difficulty_en: "Variable (Analyst/Expert/Master)",
    multiplayer_en: "Solo",
    viability_en: "High: local dataset, discrete rules, and reproducible scoring without external dependencies.",
    visualStyle_en: "Historical intelligence board with tactical cards, timeline track, and analytics panel.",
    techFocus_en: "Seed-based procedural mission generation + ordering evaluation + advanced hint economy.",
  },

  {
    id: "strategy-sudoku-tecnicas",
    image: strategySudokuTecnicasImage,
    sessionTime: "5-15 min",

    title: "Sudoku Tecnicas Pro",
    category: "Estrategia",
    tagline: "Sudoku clasico 9x9 con pistas logicas basadas en tecnicas tradicionales.",
    description:
      "Version estrategica del Sudoku: completa la rejilla 9x9 sin repetir numeros en filas, columnas ni recuadros 3x3. Incluye pistas aplicadas por logica (grupo completo, barrido, barrido en linea y recuento) para guiar la resolucion sin fuerza bruta.",
    objective_es: "Completa el tablero 9x9 sin conflictos usando deduccion logica y tecnicas clasicas de Sudoku.",
    howToPlay_es: "Selecciona casilla con raton o flechas, escribe 1-9 (o QWE/ASD/UIO), Backspace borra, P aplica pista y R carga partida aleatoria.",
    highlights: [
      "Generador determinista de tableros con solucion unica por partida.",
      "Tres niveles de dificultad por cantidad de pistas iniciales.",
      "Detector de conflictos en tiempo real para filas, columnas y recuadros 3x3.",
      "Sistema de pistas con etiquetas de tecnica logica usada.",
      "Bridge QA con render_game_to_text y estado completo del tablero.",
    ],
    difficulty: "Variable (Facil/Media/Dificil)",
    multiplayer: "Solo",
    viability: "Alta: reglas discretas, estado compacto y alta rejugabilidad por semilla.",
    visualStyle: "Panel tactico oscuro con rejilla 9x9 de alta legibilidad y foco estrategico.",
    techFocus: "Generacion con unicidad, validacion de restricciones y motor de pistas por tecnicas Sudoku.",

    category_en: "Strategy",
    tagline_en: "Classic 9x9 Sudoku with logical hints based on traditional techniques.",
    description_en:
      "Strategic Sudoku mode: complete the 9x9 grid with no repeated digits in rows, columns, or 3x3 boxes. Includes logic-driven hints (complete group, box scan, line scan, counting) to support solving without brute force.",
    objective_en: "Complete the 9x9 board without conflicts using logical deduction and classic Sudoku techniques.",
    howToPlay_en: "Select a cell with mouse or arrows, type 1-9 (or QWE/ASD/UIO), Backspace clears, P applies hint, and R loads a random match.",
    highlights_en: [
      "Deterministic board generator with unique solution per match.",
      "Three difficulty tiers based on initial clues.",
      "Real-time conflict detection for rows, columns and 3x3 boxes.",
      "Hint system labeled by the logical technique used.",
      "QA bridge with render_game_to_text and full board state.",
    ],
    difficulty_en: "Variable (Easy/Medium/Hard)",
    multiplayer_en: "Solo",
    viability_en: "High: discrete rules, compact state and strong seed-based replayability.",
    visualStyle_en: "Dark tactical panel with high-readability 9x9 board and strategy focus.",
    techFocus_en: "Uniqueness-aware generation, constraint validation and technique-based hint engine.",
  },

  {
    id: "strategy-hundir-flota-pro",
    image: strategyHundirFlotaProImage,
    sessionTime: "15-30 min",

    title: "Hundir la Flota Pro",
    category: "Estrategia",
    tagline: "Edicion Classic Card 4x3 con coordenadas ocultas, clavijas y poderes tacticos.",
    description:
      "Adaptacion profesional de Hundir la Flota Classic Card basada en el reglamento del PDF oficial. Cada jugador organiza 12 cartas de coordenadas (5 naves y 7 fallos) en una cuadrilla 4x3 boca abajo y gestiona una mano de 5 cartas de batalla para revelar, danar y hundir la flota rival antes de perder la propia.",
    objective_es:
      "Hundir las 5 naves enemigas usando cartas de clavija y poderes antes de que el rival hunda las tuyas.",
    howToPlay_es:
      "En cada turno juega 1 carta de batalla y luego recarga mano hasta 5. Clavija Blanca revela una coordenada enemiga; Clavija Roja dana naves reveladas o puede explorar una oculta. Las cartas de poder aplican escudo, descartar blancas/jugar dos o reparar/robar tres segun elijas.",
    highlights: [
      "Preparacion fiel al PDF: 12 cartas de coordenadas (5 naves + 7 fallos) en cuadrilla 4x3.",
      "Mazo de batalla de 26 cartas con clavijas blancas/rojas y cartas de poder.",
      "Resolucion de dano por clavijas acumuladas, escudos absorbentes y naves hundidas.",
      "Cartas de poder con decisiones tacticas: descartar para ciclar mano, jugar dos, reparar o robar tres.",
      "Modo versus IA o local 2 jugadores con handoff oculto entre turnos.",
      "Bridge QA con render_game_to_text y avance temporal determinista para pruebas Playwright."
    ],
    difficulty: "Media",
    multiplayer: "Solo vs IA / 2 jugadores local",
    viability: "Alta: reglas discretas por turnos, estado serializable y UX clara para tablero dual.",
    visualStyle: "Mesa de combate naval por cartas con cuadrillas compactas, telemetria clara y feedback animado.",
    techFocus: "Motor de cartas ocultas/reveladas, acumulacion de clavijas por nave y resolucion de poderes con elecciones.",

    category_en: "Strategy",
    tagline_en: "Classic Card 4x3 edition with hidden coordinates, pegs, and tactical power cards.",
    description_en:
      "Professional Battleship Classic Card implementation aligned with the official PDF rulebook. Each player arranges 12 coordinate cards (5 ships and 7 misses) in a hidden 4x3 grid and manages a 5-card battle hand to reveal, damage, and sink the enemy fleet.",
    objective_en:
      "Sink all 5 enemy ships with peg and power cards before your own fleet is destroyed.",
    howToPlay_en:
      "Each turn, play 1 battle card and refill your hand to 5. White Peg reveals an enemy coordinate card; Red Peg damages revealed ships or can probe hidden cards. Power cards let you shield, discard whites/play two, or repair/draw three based on your choice.",
    highlights_en: [
      "PDF-faithful setup: 12 coordinate cards (5 ships + 7 misses) in a hidden 4x3 grid.",
      "26-card battle deck with white/red pegs and power effects.",
      "Peg-based damage accumulation, shield absorption, and proper ship sinking flow.",
      "Dual-effect power decisions: discard to cycle, play two, repair, or draw three.",
      "AI mode plus local 2-player hidden handoff flow.",
      "QA bridge with render_game_to_text and deterministic time stepping for Playwright."
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo vs AI / Local 2-player",
    viability_en: "High: turn-based discrete rules, serializable state, and clear dual-board UX.",
    visualStyle_en: "Card-table naval duel with compact grids, clear telemetry, and animated impact feedback.",
    techFocus_en: "Hidden/revealed card-state engine, peg damage accumulation, and choice-driven power resolution.",
  },

  {
    id: "strategy-parchis-ludoteka",
    image: strategyParchisLudotekaImage,
    sessionTime: "8-18 min",

    title: "Parchis Ludoteka Arena",
    category: "Estrategia",
    tagline: "Parchis estrategico individual (Tu vs 3 IAs) con capturas, barreras y bonus +10/+20.",
    description:
      "Adaptacion completa de reglas clave de parchis para la plataforma: salida obligatoria con 5, turno extra por 6, regla de tres 6 consecutivos, casillas seguras, capturas, barreras, pasillo final, llegada exacta y bonus por comer/coronar.",
    objective_es: "Completa el recorrido con tus 4 fichas antes que los 3 rivales IA, gestionando riesgo de captura, bloqueos y tempo de turnos.",
    howToPlay_es: "Pulsa Iniciar partida (S/Enter). Luego usa Tirar dado (R/Enter). Con 1..9 o click eliges jugada. Enter ejecuta la primera opcion, X continua si no hay jugada y N reinicia partida.",
    highlights: [
      "Reglas nucleares de Ludoteka aplicadas al flujo de turno (5 salida, 6 extra, triple 6 con penalizacion).",
      "Motor de movimiento con barreras, casillas seguras y llegada exacta a meta.",
      "Bonos encadenables de +10 (corona) y +20 (captura).",
      "IA con tres perfiles diferenciados: Facil, Media y Dificil.",
      "Bridge QA con render_game_to_text y avance temporal determinista.",
    ],
    difficulty: "Variable (3 niveles IA)",
    multiplayer: "Solo vs 3 IAs",
    viability: "Alta: motor por estados con trazabilidad de piezas, turnos y reglas especiales.",
    visualStyle: "Tablero tactico claro con recorrido comun, pasillos finales y telemetria de fase/racha.",
    techFocus: "Sistema de reglas de parchis con evaluacion IA por heuristicas y estimacion de amenaza.",

    category_en: "Strategy",
    tagline_en: "Individual strategy parchis (You vs 3 AIs) with captures, barriers and +10/+20 bonuses.",
    description_en:
      "A full strategic adaptation of core parchis rules for the platform: mandatory exit on 5, extra turn on 6, three-consecutive-6 penalty, safe cells, captures, barriers, final lane routing, exact finish and +10/+20 rewards.",
    objective_en: "Complete the route with all 4 pieces before the 3 AI rivals while managing capture risk, blockades and turn tempo.",
    howToPlay_en: "Press Start match (S/Enter), then Roll (R/Enter). Use 1..9 or click to pick a move. Enter executes the first option, X continues with no legal move, and N restarts the match.",
    highlights_en: [
      "Core Ludoteka-like turn flow (exit on 5, extra turn on 6, triple-6 penalty).",
      "Movement engine with barriers, safe cells and exact finish requirement.",
      "Chainable +10 (goal) and +20 (capture) reward moves.",
      "Three clearly differentiated AI profiles: Easy, Medium and Hard.",
      "QA bridge with render_game_to_text and deterministic time stepping.",
    ],
    difficulty_en: "Variable (3 AI levels)",
    multiplayer_en: "Solo vs 3 AIs",
    viability_en: "High: state-driven engine with full traceability of pieces, turns and special rules.",
    visualStyle_en: "Clear tactical board with common track, final lanes and phase/streak telemetry.",
    techFocus_en: "Parchis rules engine with heuristic AI and forward threat estimation.",
  },

  {
    id: "strategy-damas-clasicas",
    image: strategyDamasProfesionalImage,
    sessionTime: "4-16 min",

    title: "Damas Estrategia Pro",
    category: "Estrategia",
    tagline: "Damas 8x8 con IA por niveles, capturas encadenadas, control de errores y reglas configurables de bloqueo.",
    description:
      "Implementacion profesional de damas clasicas sobre tablero 8x8: 12 fichas por lado, movimiento diagonal en ambas direcciones, capturas multiples en cadena, coronacion a dama, prioridad de dama al capturar, derrota por 3 errores y modo configurable de bloqueo (pierde/tablas/material).",
    objective_es: "Captura todas las fichas rivales o bloquea su juego antes de alcanzar el limite de errores.",
    howToPlay_es: "Haz clic en una ficha y luego en el destino diagonal. Si capturas, continua la cadena con la misma ficha hasta terminar. U deshace, X te retira, R reinicia y F alterna pantalla completa.",
    highlights: [
      "Motor de damas determinista con validacion de movimiento y capturas en cadena.",
      "IA por cuatro niveles (Principiante, Intermedio, Avanzado y Experto).",
      "Regla de errores competitiva: al tercer error, pierdes la partida.",
      "Regla de bloqueo configurable: derrota directa, tablas o resolucion por material.",
      "Bridge QA con render_game_to_text y avance temporal determinista.",
    ],
    difficulty: "Variable (4 niveles IA)",
    multiplayer: "Solo vs IA",
    viability: "Alta: reglas discretas, estado compacto y decision IA evaluable.",
    visualStyle: "Mesa tactica con tablero premium de damas, feedback de capturas y panel competitivo.",
    techFocus: "Motor de reglas + minimax con alpha-beta + telemetria de errores, bloqueo y repeticion.",

    category_en: "Strategy",
    tagline_en: "8x8 checkers with multi-level AI, chain captures, error control, and configurable block rules.",
    description_en:
      "Professional web checkers implementation on an 8x8 board: 12 pieces per side, diagonal movement in both directions, multi-capture chains, king promotion, king-capture priority, defeat after 3 mistakes, and configurable blocked resolution (loss/draw/material).",
    objective_en: "Capture all opponent pieces or lock their position before reaching the mistake limit.",
    howToPlay_en: "Click a piece and then its diagonal destination. If you capture, continue the chain with the same piece until it ends. U undo, X resign, R restart, and F toggle fullscreen.",
    highlights_en: [
      "Deterministic checkers rules engine with strict move and chain-capture validation.",
      "Four AI levels (Beginner, Intermediate, Advanced, Expert).",
      "Competitive mistake rule: lose after the third invalid attempt.",
      "Configurable blocked resolution: direct loss, draw, or material-based result.",
      "QA bridge with render_game_to_text and deterministic time stepping.",
    ],
    difficulty_en: "Variable (4 AI levels)",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: discrete rules, compact state, and evaluable AI decisions.",
    visualStyle_en: "Tactical checkers table with premium board readability and capture feedback.",
    techFocus_en: "Rules engine + alpha-beta minimax + telemetry for mistakes, blockage, and repetition.",
  },

  {
    id: "strategy-poker-holdem-no-bet",
    image: strategyPokerNoBetImage,
    sessionTime: "4-10 min",

    title: "Poker Clasico Draw Con Apuestas",
    category: "Estrategia",
    tagline: "Poker clasico de 5 cartas contra 1 a 8 IAs, con ciegas, bote real y apuestas de fichas.",
    description:
      "Version estrategica de poker clasico (baraja de 52, sin comodin) para la plataforma: cada jugador recibe 5 cartas, juega ronda de apuesta inicial, realiza un descarte unico de 0 a 5 cartas, disputa una ronda final y cierra en showdown. Hay ciega pequena/grande, bote real y acciones de igualar, subir, all-in o retirarse.",
    objective_es: "Alcanza primero la meta de fichas ganando botes en rondas con apuestas reales.",
    howToPlay_es: "Configura stack inicial, nivel de ciegas y meta en el panel. Enter para pasar/igualar segun contexto, U para subir, A all-in, F retirarse, 1-5 marcar cartas, D descartar, S servirse, N siguiente mano y R reiniciar.",
    highlights: [
      "Poker con apuestas reales: bote, ciegas y decisiones de call/raise/fold/all-in.",
      "Descarte tactico de 0 a 5 cartas entre dos rondas de apuesta.",
      "Configuracion de stack inicial, nivel de ciegas y meta de fichas.",
      "Soporte de mesa configurable para 2 a 9 jugadores (Tu + 1 a 8 IAs).",
      "Evaluador real de manos de poker clasico (de carta mayor a escalera real).",
      "Dealer rotativo por mano y reparto de bote en showdown o por retirada general.",
      "Bridge QA con render_game_to_text y avance temporal determinista.",
    ],
    difficulty: "Variable",
    multiplayer: "Solo vs IA (1 a 8)",
    viability: "Alta: motor determinista de cartas con estado compacto y trazabilidad completa.",
    visualStyle: "Mesa de poker estilo casino verde con HUD tactico y lectura clara de fases.",
    techFocus: "Pipeline de poker clasico 5-card draw con economia de apuesta (pot/blinds/raise/call/all-in) e IA orientada a gestion de riesgo por mano.",

    category_en: "Strategy",
    tagline_en: "Classic 5-card poker versus 1 to 8 AIs, with blinds, real pot play and chip betting.",
    description_en:
      "Strategy-focused classic poker (52-card deck, no jokers): each player gets 5 private cards, plays an opening betting round, performs a single 0-5 card draw, plays a final betting round, and resolves the hand at showdown. The table includes small/big blinds and a real shared pot.",
    objective_en: "Reach the chip target first by winning pots in real betting rounds.",
    howToPlay_en: "Set starting stack, blind level and chip target in the panel. Enter to check/call by context, U to raise, A all-in, F fold, 1-5 mark cards, D discard, S stand pat, N next hand, and R restart.",
    highlights_en: [
      "Real betting flow: blinds, pot, call/raise/fold/all-in decisions.",
      "Single 0-5 card draw between two betting rounds.",
      "Configurable starting stack, blind level and chip target.",
      "Table setup supports 2 to 9 players (you plus 1 to 8 AIs), configurable in-game.",
      "True classic poker hand evaluator (high card through royal flush).",
      "Rotating dealer with pot resolution via showdown or full-table foldout.",
      "QA bridge with render_game_to_text and deterministic time stepping.",
    ],
    difficulty_en: "Variable",
    multiplayer_en: "Solo vs AI (1 to 8)",
    viability_en: "High: deterministic card engine with compact state and full traceability.",
    visualStyle_en: "Casino-inspired green poker table with tactical HUD and clear phase readability.",
    techFocus_en: "Classic 5-card draw pipeline with betting economy (pot/blinds/raise/call/all-in) and AI tuned for per-hand risk management.",
  },

  {
    id: "strategy-baraja-ia-arena",
    image: strategyBarajaIaImage,
    sessionTime: "3-8 min",

    title: "Baraja IA Arena",
    category: "Estrategia",
    tagline: "Mesa de baraja con Brisca/Tute, Mus y Escoba del 15 (espanola en navegador es*).",
    description:
      "Juego de cartas estrategico con selector de modalidad: Brisca/Tute mantiene el motor de bazas original, Mus anade un modo configurable a 40 piedras (2/4/6 jugadores) y Escoba del 15 incorpora mesa de 2 a 4 jugadores. En navegadores con idioma es* se usa baraja espanola de 40; en el resto, baraja inglesa adaptada (sin 8, 9, 10).",
    objective_es: "Elige modalidad: gana bazas en Brisca/Tute, llega a 40 piedras en Mus o suma 15 para capturar cartas y puntuar categorias en Escoba.",
    howToPlay_es: "Usa el selector superior para cambiar de modalidad. Brisca/Tute: click o teclas 1-3 para jugar carta. Mus: M/X para Mus-No Mus, 1-4 para descarte, Enter confirma, N siguiente mano y R reinicia. Escoba: marca cartas de mesa y juega una carta para sumar 15 (teclas 1-3, Enter primera carta, N siguiente mano, R reinicia).",
    highlights: [
      "Triple modalidad en un mismo juego: Brisca/Tute + Mus + Escoba.",
      "Mus configurable con 2, 4 o 6 jugadores IA+tu (duelo, parejas o 3v3).",
      "Version Mus clasica con baraja espanola de 40 y version adaptada con baraja inglesa.",
      "Escoba del 15 con baraja segun idioma del navegador: es* usa espanola de 40; resto usa inglesa adaptada sin 8/9/10 (Diamantes=Oros, Corazones=Copas, Treboles=Bastos, Picas=Espadas).",
      "Escoba configurable en 2/3/4 jugadores, opcion de recogida obligatoria y variante por parejas (2v2).",
      "IA configurable por dificultad en ambas modalidades.",
      "Selector de modo sin perder continuidad del juego de baraja existente.",
      "Fuente de imagenes de cartas espanolas: mcmd/playingcards.io-spanish.playing.cards.",
      "Bridge QA con render_game_to_text y avance temporal determinista.",
    ],
    difficulty: "Media",
    multiplayer: "Solo vs IA",
    viability: "Alta: estado compacto en tres motores (bazas, lances de Mus y capturas de Escoba) con reglas discretas.",
    visualStyle: "Mesa de cartas tactica con selector de modalidad y paneles de estado por modo.",
    techFocus: "Convivencia de motor Brisca/Tute existente con motor Mus (lances, descarte y tanteo a 40 piedras) y motor Escoba del 15 (capturas por suma, escobas y puntuacion por categorias), incluyendo adaptaciones de baraja inglesa.",

    category_en: "Strategy",
    tagline_en: "Card table with Brisca/Tute, Mus, and Escoba 15 (Spanish deck for es* browsers).",
    description_en:
      "Card strategy game with a top mode switch: Brisca/Tute keeps the original trick-taking engine, Mus adds a configurable race to 40 stones (2/4/6 players), and Escoba 15 adds a 2-to-4 player capture mode. Browsers with es* locale use the traditional 40-card Spanish deck; other locales use the adapted 40-card English deck (8/9/10 removed).",
    objective_en: "Choose mode: win tricks in Brisca/Tute, reach 40 stones in Mus, or build 15-point captures in Escoba to score category points.",
    howToPlay_en: "Use the top switch to change mode. Brisca/Tute: click or keys 1-3 to play cards. Mus: M/X for Mus-No Mus, 1-4 for discard, Enter confirms, N next hand, R restart. Escoba: mark table cards and play a hand card to sum 15 (keys 1-3, Enter first card, N next hand, R restart).",
    highlights_en: [
      "Triple mode in one game: Brisca/Tute + Mus + Escoba.",
      "Mus flow supports 2/4/6 players (duel, pairs, and 3v3) with Grande, Chica, Pairs, and Juego/Point lances.",
      "Classic Mus on Spanish 40-card deck plus an adapted English-deck variant.",
      "Escoba 15 selects deck by browser locale: es* uses traditional Spanish 40-card deck; other locales use adapted English 40-card deck with suit mapping Diamonds=Oros, Hearts=Copas, Clubs=Bastos, Spades=Espadas.",
      "Escoba supports 2/3/4 players, mandatory-capture option, and optional 2v2 pair accounting.",
      "Configurable AI difficulty across both modes.",
      "Mode switch keeps existing card-game flow intact.",
      "Spanish card art source: mcmd/playingcards.io-spanish.playing.cards.",
      "QA bridge with render_game_to_text and deterministic time stepping.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: compact state across three discrete engines (tricks + Mus lances + Escoba captures).",
    visualStyle_en: "Tactical card table with top mode switch and mode-specific status panels.",
    techFocus_en: "Coexistence of existing Brisca/Tute engine with Mus (discard/lances/race to 40) and Escoba 15 (sum captures/escobas/category scoring), including adapted English-deck rules.",
  },

  {
    id: "strategy-mansion-triple-enigma",
    image: strategyMansionTripleEnigmaImage,
    sessionTime: "6-14 min",

    title: "Mansion Triple Enigma",
    category: "Estrategia",
    tagline: "Deduccion competitiva tipo misterio con IA adaptativa, faroles y pistas publicas.",
    description:
      "Version independiente inspirada en la formula de deduccion de sospechoso + arma + sala. Juegas contra tres IAs que observan el contexto de la mesa, ajustan su nivel de riesgo y deciden cuando farolear en sugerencias o lanzar pistas verdaderas/enganosas para proteger su ventaja.",
    objective_es: "Resuelve antes que nadie la combinacion exacta del caso: culpable, arma y habitacion.",
    howToPlay_es: "En tu turno elige una sala conectada, plantea una sospecha (sospechoso + arma + sala) y observa quien puede refutar. Cruza la informacion de la bitacora y lanza acusacion final solo cuando tengas alta certeza.",
    highlights: [
      "Sobre secreto con una carta por categoria (sospechoso, arma y sala).",
      "Refutacion en orden de turno con informacion privada parcial.",
      "IA con memoria de cartas conocidas, mapa de sospecha y umbral dinamico de acusacion.",
      "Farol contextual: la IA decide cuando desviar sospechas con jugadas ambiguas.",
      "Pistas publicas de IA que pueden ser veraces o interesadas segun presion competitiva.",
      "Libreta de detective integrada con estado de cartas y termometro de sospecha.",
      "Bridge QA con render_game_to_text y avance temporal determinista.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo vs 3 IAs",
    viability: "Alta: estado discreto, reglas de deduccion claras y motor IA heuristico trazable.",
    visualStyle: "Mansion noir estilizada con panel de investigacion, grafo de salas y bitacora de mesa.",
    techFocus: "Motor de inferencia por eventos (refutaciones, no-respuestas, pistas) + politica IA de bluff/riesgo contextual.",

    category_en: "Strategy",
    tagline_en: "Competitive mystery deduction with adaptive AI, bluff timing, and public hint mind-games.",
    description_en:
      "Independent take on suspect + weapon + room deduction. You face three AIs that read table context, adjust risk appetite, and decide when to bluff through misleading suggestions or signal true/false hints to protect their line.",
    objective_en: "Solve the exact case combination first: culprit, weapon, and room.",
    howToPlay_en: "Each turn pick a connected room, issue a suggestion (suspect + weapon + room), and track who can refute. Cross-reference the log and launch a final accusation only when confidence is high.",
    highlights_en: [
      "Hidden envelope built from one card per category.",
      "Turn-ordered refutation with private partial information.",
      "AI memory model: known cards, suspicion map, and dynamic accusation threshold.",
      "Context-aware bluffing to redirect table pressure.",
      "Public AI hints that may be truthful or self-serving.",
      "Integrated detective notebook with per-card suspicion telemetry.",
      "QA bridge with render_game_to_text and deterministic time stepping.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo vs 3 AIs",
    viability_en: "High: discrete state machine, clear deduction rules, and traceable heuristic AI.",
    visualStyle_en: "Stylized noir mansion with investigation panel, room graph, and tactical log feed.",
    techFocus_en: "Event-driven inference engine (refutes, no-refutes, hints) plus contextual bluff/risk AI policy.",
  },

  {
    id: "strategy-chess-grandmaster",
    image: chessGrandmasterArenaImage,
    sessionTime: "5-25 min",

    title: "Grandmaster Chess Arena",
    category: "Estrategia",
    tagline: "Ajedrez completo con reglas FIDE, promoción, enroque y tablas reglamentarias.",
    description:
      "Implementación profesional de ajedrez para web: valida legalidad de cada movimiento, incluye capturas al paso, enroque corto/largo, promociones completas y detección de jaque, mate, ahogado y tablas por repetición/material.",
    objective_es: "Pon en jaque mate al rey rival o logra tablas ventajosas aplicando todas las reglas FIDE del ajedrez.",
    howToPlay_es: "Haz clic en una pieza y luego en el destino para mover. U para deshacer, D para reclamar tablas, F alterna pantalla completa.",
    highlights: [
      "IA por dificultad seleccionable al iniciar (Principiante, Intermedio, Avanzado y Experto).",
      "Notación algebraica en histórico de jugadas y resaltado de último movimiento.",
      "Reglas FIDE clave: enroque, captura al paso, promoción y control de jaque legal.",
      "Tablas por material insuficiente, triple/quíntuple repetición y regla 50/75 movimientos.",
      "Puente de QA con render_game_to_text y avance de tiempo determinista.",
    ],
    difficulty: "Variable (4 niveles IA)",
    multiplayer: "Solo vs IA",
    viability: "Alta: motor determinístico con validación legal por posición y bridge QA.",
    visualStyle: "Tablero elegante tipo torneo con panel de jugadas, piezas limpias y foco en legibilidad.",
    techFocus: "Generación de movimientos legales, SAN en español, IA minimax y reglas FIDE de tablas.",

    category_en: "Strategy",
    tagline_en: "Full chess with FIDE rules, promotion, castling and regulatory draws.",
    description_en:
      "Professional web chess implementation: validates legality of every move, includes en passant captures, short/long castling, full promotions and detection of check, checkmate, stalemate and draws by repetition/material.",
    objective_en: "Checkmate the opponent's king or achieve advantageous draws using all FIDE chess rules.",
    howToPlay_en: "Click a piece then click the destination to move. U to undo, D to claim draw, F to toggle fullscreen.",
    highlights_en: [
      "Selectable AI difficulty at start (Beginner, Intermediate, Advanced and Expert).",
      "Algebraic notation in move history and last-move highlight.",
      "Key FIDE rules: castling, en passant, promotion and legal check control.",
      "Draws by insufficient material, triple/quintuple repetition and 50/75 move rule.",
      "QA bridge with render_game_to_text and deterministic time advance.",
    ],
    difficulty_en: "Variable (4 AI levels)",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: deterministic engine with per-position legal validation and QA bridge.",
    visualStyle_en: "Elegant tournament-style board with move panel, clean pieces and readability focus.",
    techFocus_en: "Legal move generation, minimax AI and FIDE draw rules.",
  },

  // ── RPG ────────────────────────────────────────────────────────────────────
  {
    id: "rpg-emberfall",
    image: cardTacticsImage,
    sessionTime: "8-14 min",

    title: "Chronicles of Emberfall",
    category: "RPG",
    tagline: "RPG táctico con botín, contratos, invocación y combate por turnos.",
    description:
      "Asumes el papel de un héroe en una cadena de combates. Gestiona vida, maná, enfoque y santuarios para superar enemigos crecientes, subir de nivel y cerrar la expedición final.",
    objective_es: "Supera todos los encuentros de combate, sube de nivel y completa la expedición final como héroe victorioso.",
    howToPlay_es: "Explora con WASD/flechas. En combate usa atacar, habilidad, defender, enfocar, invocar (U) y poción para superar a cada enemigo por turnos.",
    highlights: [
      "Combate por turnos con acciones ofensivas, defensivas y de enfoque.",
      "Botín de fragmentos y progreso de contrato con bonus persistente.",
      "Santuarios repartidos por mapa para recuperación controlada.",
      "Progresión RPG con enemigos escalados y salida bloqueada por objetivos.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo",
    viability: "Alta: motor por estados con gran trazabilidad de combate.",
    visualStyle: "Fantasía táctica con telemetría RPG y mapa legible por capas.",
    techFocus: "Combate por turnos con contratos, fragmentos de reliquia e invocación.",

    category_en: "RPG",
    tagline_en: "Tactical RPG with loot, contracts, summoning and turn-based combat.",
    description_en:
      "You take the role of a hero in a chain of combats. Manage health, mana, focus and sanctuaries to overcome escalating enemies, level up and close the final expedition.",
    objective_en: "Clear all combat encounters, level up and complete the final expedition as a victorious hero.",
    howToPlay_en: "Explore with WASD/arrows. In combat use attack, skill, defend, focus, summon (U) and potion to defeat each enemy in turn-based fashion.",
    highlights_en: [
      "Turn-based combat with offensive, defensive and focus actions.",
      "Fragment loot and contract progress with persistent bonuses.",
      "Sanctuaries scattered across the map for controlled recovery.",
      "RPG progression with scaled enemies and objective-locked exit.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo",
    viability_en: "High: state-based engine with strong combat traceability.",
    visualStyle_en: "Tactical fantasy with RPG telemetry and layered readable map.",
    techFocus_en: "Turn-based combat with contracts, relic fragments and summoning.",
  },

  // ── Knowledge (logic) ──────────────────────────────────────────────────────
  {
    id: "knowledge-logic-vault",
    image: puzzleVaultImage,
    sessionTime: "3-6 min",

    title: "Logic Vault",
    category: "Conocimiento",
    tagline: "Retos de razonamiento rápido para entrenar mente analítica.",
    description:
      "Modo alternativo de conocimiento centrado en patrones y deducción. Complementa al quiz principal para dar variedad dentro de la misma categoría.",
    objective_es: "Resuelve todos los retos de razonamiento de la sesión con el mayor score y racha posibles.",
    howToPlay_es: "Selecciona la respuesta pulsando el botón correspondiente y avanza al bloquear la pregunta.",
    highlights: [
      "Enfoque en razonamiento, no memorización.",
      "Dinámica ideal para sesiones rápidas.",
      "Compatible con futuras expansiones de preguntas.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: reglas simples con alta rejugabilidad.",
    visualStyle: "Quiz analítico con UI compacta y foco en decisiones rápidas.",
    techFocus: "Rondas de alta variedad temática con scoring estable y trazable.",

    category_en: "Knowledge",
    tagline_en: "Quick reasoning challenges to train your analytical mind.",
    description_en:
      "An alternative knowledge mode focused on patterns and deduction. Complements the main quiz to add variety within the same category.",
    objective_en: "Solve all reasoning challenges in the session with the highest score and streak possible.",
    howToPlay_en: "Select an answer by clicking its button and advance after locking the question.",
    highlights_en: [
      "Focus on reasoning, not memorization.",
      "Ideal dynamic for quick sessions.",
      "Compatible with future question expansions.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: simple rules with high replayability.",
    visualStyle_en: "Analytical quiz with compact UI focused on fast decisions.",
    techFocus_en: "High thematic variety rounds with stable and traceable scoring.",
  },
  {
    id: "arcade-retro-snake-classic",
    image: arcadeRetroSnakeClassicImage,
    sessionTime: "2-6 min",
    title: "Snake Classico 1977",
    category: "Arcade",
    tagline: "Snake clásico rediseñado con look neon premium, HUD limpio y animaciones modernas.",
    description: "Relectura visual de Snake con tablero glow, fondo dinámico y sprites más legibles. Mantiene control preciso por rejilla, progresión por nivel y sesiones cortas con sensación de arcade actual.",
    objective_es: "Come frutos para crecer y supera el objetivo de cada nivel sin chocar con muros ni con tu cola.",
    howToPlay_es: "Flechas o WASD para girar. Enter/Espacio inicia, P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Movimiento deterministico por rejilla con aceleracion progresiva.",
      "Objetivos por nivel para evitar partidas planas e infinitas.",
      "Score y record local por juego en navegador.",
      "HUD compacto y modo pausa/reinicio inmediato.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: motor discreto, estado ligero y bucle de 60Hz.",
    visualStyle: "Neon-cyber con gradientes, bloom suave y jerarquía visual moderna de tablero.",
    techFocus: "Control por eventos, colisiones de rejilla y progresion de dificultad estable.",
    category_en: "Arcade",
    tagline_en: "Classic Snake rebuilt with premium neon visuals, cleaner HUD, and modern animation polish.",
    description_en: "A visual rework of Snake featuring glow-grid readability, animated backdrops, and refined sprite treatment while keeping precise tile control, level progression, and short replayable sessions.",
    objective_en: "Eat fruits, grow longer, and clear each level objective without hitting walls or your own tail.",
    howToPlay_en: "Use arrows or WASD to steer. Enter/Space starts, P pauses, R restarts, and F toggles fullscreen.",
    highlights_en: [
      "Deterministic grid movement with progressive pacing.",
      "Per-level goals to keep runs focused and dynamic.",
      "Local per-game high score persistence.",
      "Compact HUD plus immediate pause/restart flow.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: discrete engine, lightweight state, and stable 60Hz loop.",
    visualStyle_en: "Neon-cyber art direction with soft bloom and modern board readability.",
    techFocus_en: "Event-driven steering, grid collisions, and stable difficulty scaling.",
  },
  {
    id: "arcade-retro-breakout-1986",
    image: arcadeRetroBreakout1986Image,
    sessionTime: "3-7 min",
    title: "Breakout 1986 Remix",
    category: "Arcade",
    tagline: "Brick breaker renovado con iluminación reactiva, bloques glossy y feedback moderno.",
    description: "Breakout reinterpretado con escenario de cabina, trazas de bola, glow de impactos y lectura visual profesional. Conserva las capas de resistencia, el control fino de rebote y el power-up táctico de pala.",
    objective_es: "Destruye todos los bloques del muro sin perder tus vidas.",
    howToPlay_es: "A/D o flechas izquierda/derecha para mover pala. Espacio lanza bola. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Filas con distinta dureza para un pacing de riesgo claro.",
      "Power-up de pala extendida con temporizador.",
      "Ritmo creciente por nivel con bolas mas rapidas.",
      "Puntuacion por rotura, bonus y limpieza de muro.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: fisica simple con colisiones circulo-rectangulo.",
    visualStyle: "Cabina arcade contemporánea con materiales brillantes y contraste cinematográfico.",
    techFocus: "Deteccion de colisiones, control de angulo en pala y progresion por olas de bloques.",
    category_en: "Arcade",
    tagline_en: "Rebuilt brick breaker with reactive lighting, glossy bricks, and modern impact feedback.",
    description_en: "A redesigned Breakout featuring cabinet-like presentation, ball trails, impact glow, and professional readability while preserving layered brick durability, paddle-angle control, and tactical width boosts.",
    objective_en: "Destroy every brick wall before losing all lives.",
    howToPlay_en: "Use A/D or left/right arrows to move paddle. Space launches ball. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Multi-durability rows for clearer risk pacing.",
      "Timed extended-paddle power-up.",
      "Faster balls and pressure per level.",
      "Scoring on breaks, boosts, and full clears.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: lightweight physics with circle-vs-rect collisions.",
    visualStyle_en: "Contemporary arcade cabinet visuals with glossy materials and cinematic contrast.",
    techFocus_en: "Collision detection, paddle-angle control, and wave progression.",
  },
  {
    id: "arcade-retro-space-invaders",
    image: arcadeRetroSpaceInvadersImage,
    sessionTime: "3-8 min",
    title: "Space Invaders Core",
    category: "Arcade",
    tagline: "Defensa espacial con UI moderna, enemigos estilizados y lectura táctica superior.",
    description: "Shooter arcade inspirado en Space Invaders con dirección artística renovada: naves más definidas, disparos luminosos, atmósfera espacial dinámica y HUD claro para sesiones intensas por oleadas.",
    objective_es: "Elimina todas las naves invasoras antes de que alcancen tu base.",
    howToPlay_es: "A/D o flechas para moverte y Espacio para disparar. P pausa, R reinicia, F pantalla completa.",
    highlights: [
      "Formaciones con desplazamiento lateral y descenso gradual.",
      "Cooldowns de disparo para evitar spam.",
      "Oleadas completas con bonus de cierre.",
      "Reglas claras de derrota por impacto o invasion.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: runtime arcade clasico de entidades discretas.",
    visualStyle: "Sci-fi neon moderno con sprites refinados, trazas de disparo y brillo ambiental.",
    techFocus: "Gestor de oleadas, colisiones bala-hitbox e IA de fuego por escuadron.",
    category_en: "Arcade",
    tagline_en: "Space defense with modern UI treatment, stylized enemies, and sharper tactical readability.",
    description_en: "Space Invaders-inspired shooter with a refreshed visual direction: cleaner ships, luminous fire lines, dynamic backdrop atmosphere, and a polished HUD for wave-based pressure.",
    objective_en: "Destroy all invader ships before they reach your base line.",
    howToPlay_en: "Move with A/D or arrows and shoot with Space. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Side-shift formations with gradual descent pressure.",
      "Shot cooldowns for readable combat rhythm.",
      "Complete-wave bonus pacing.",
      "Clear lose conditions on hit or base breach.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: classic discrete-entity arcade runtime.",
    visualStyle_en: "Modern sci-fi neon style with refined sprites, shot trails, and ambient glow.",
    techFocus_en: "Wave manager, bullet-hitbox collisions, squad fire AI.",
  },
  {
    id: "arcade-retro-tetris-blockfall",
    image: arcadeRetroTetrisBlockfallImage,
    sessionTime: "4-12 min",
    title: "Tetris Blockfall",
    category: "Arcade",
    tagline: "Tetris moderno con tablero premium, ghost piece y panel visual mejorado.",
    description: "Implementación estilo Tetris con tetrominós clásicos y una capa gráfica más actual: pozo con volumen, piezas con brillo, ghost piece para lectura de caída y HUD más limpio para decisiones rápidas.",
    objective_es: "Completa lineas para mantener el pozo limpio y maximizar puntuacion.",
    howToPlay_es: "A/D mueve, arriba rota, abajo soft drop y Espacio hard drop. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Set completo de tetrominos clasicos.",
      "Escalado de velocidad por lineas acumuladas.",
      "Score por combos de line clear (1-4).",
      "Preview de proxima pieza para planificacion.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo",
    viability: "Alta: tablero discreto con merge de piezas y limpieza por filas.",
    visualStyle: "Cabina neo-arcade con panel lateral, bloques glossy y profundidad visual.",
    techFocus: "Colision de piezas, rotacion matricial y scoring por line clears.",
    category_en: "Arcade",
    tagline_en: "Modern Tetris with premium board treatment, ghost piece, and upgraded visual paneling.",
    description_en: "Tetris-style implementation with classic tetrominoes plus a contemporary visual layer: depth-focused well rendering, glossy blocks, ghost-piece readability, and cleaner HUD decisions.",
    objective_en: "Complete lines to keep the well clean and maximize score.",
    howToPlay_en: "A/D moves, up rotates, down soft drops, Space hard drops. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Full classic tetromino set.",
      "Speed scaling from cumulative cleared lines.",
      "Score progression for 1-4 line clears.",
      "Next-piece preview for planning.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo",
    viability_en: "High: discrete board with piece merging and row clears.",
    visualStyle_en: "Neo-arcade cabinet look with side panel, glossy blocks, and stronger visual depth.",
    techFocus_en: "Piece collision, matrix rotation, and line-clear scoring.",
  },
  {
    id: "arcade-retro-frogger-crossing",
    image: arcadeRetroFroggerCrossingImage,
    sessionTime: "3-8 min",
    title: "Frogger Crossing DX",
    category: "Arcade",
    tagline: "Frogger rediseñado con carriles vivos, props detallados y look moderno.",
    description: "Arcade inspirado en Frogger con actualización estética completa: carretera y río con más profundidad, vehículos y troncos más expresivos, y una lectura de timing más clara en todo el recorrido.",
    objective_es: "Llega a todas las guaridas superiores sin ser atropellado ni caer al agua.",
    howToPlay_es: "Flechas o WASD para saltar en rejilla. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Lanes de carretera y agua con velocidades opuestas.",
      "Arrastre sobre troncos para lectura de timing.",
      "Guaridas por completar para cerrar nivel.",
      "Presion temporal con penalizacion por error.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: simulacion por carriles con colisiones discretas.",
    visualStyle: "Arcade colorista contemporáneo con capas de escenario y animación ambiental.",
    techFocus: "Movimiento por casillas, deteccion por lane y progresion por slots objetivo.",
    category_en: "Arcade",
    tagline_en: "Frogger refreshed with living lanes, richer props, and a modernized presentation.",
    description_en: "Frogger-inspired arcade with full visual refresh: deeper road-and-river layering, more expressive vehicles/logs, and clearer timing readability across the run.",
    objective_en: "Reach every top home slot without being hit or falling into water.",
    howToPlay_en: "Use arrows or WASD to hop tile-by-tile. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Road and water lanes moving in opposite directions.",
      "Log drift system for timing-based positioning.",
      "Home-slot completion objective per level.",
      "Time pressure with mistake penalties.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: lane simulation with discrete collision checks.",
    visualStyle_en: "Contemporary colorful arcade style with layered scenery and ambient motion.",
    techFocus_en: "Tile movement, lane collision logic, slot-based progression.",
  },
  {
    id: "arcade-retro-bomber-grid",
    image: arcadeRetroBomberGridImage,
    sessionTime: "4-10 min",
    title: "Bomber Grid 1989",
    category: "Arcade",
    tagline: "Bomber táctico con laberinto texturizado, explosiones glow y UI moderna.",
    description: "Arcade de laberinto tipo bomber con rediseño visual profundo: tiles con materiales diferenciados, bombas y llamas más legibles, y feedback visual reforzado para jugar rápido sin perder precisión.",
    objective_es: "Elimina todas las patrullas del laberinto sin quedar atrapado por tus explosiones.",
    howToPlay_es: "Flechas/WASD para moverte y Espacio para colocar bomba. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Mapa con muros fijos y bloques destruibles por explosion.",
      "Power-ups de rango y capacidad de bomba.",
      "Patrullas con movimiento semialeatorio por celdas.",
      "Presion de tiempo por ronda en cada sector.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo",
    viability: "Alta: simulacion por celdas y explosion en cruz determinista.",
    visualStyle: "Maze neo-arcade con texturas, brillos de explosión y contraste competitivo.",
    techFocus: "Pathing por celdas, detonacion radial en cruz y sistema de mejoras.",
    category_en: "Arcade",
    tagline_en: "Tactical bomber maze with textured arenas, glow explosions, and modern UI polish.",
    description_en: "Bomber-style maze arcade with major visual upgrades: differentiated tile materials, clearer bomb/flame readability, and stronger impact feedback for fast, precise play.",
    objective_en: "Eliminate every maze patrol without trapping yourself in your own blast path.",
    howToPlay_en: "Use arrows/WASD to move and Space to plant bombs. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Fixed-wall maze plus blast-breakable blocks.",
      "Bomb range and capacity power-up system.",
      "Cell-based semi-random patrol movement.",
      "Per-sector round timer pressure.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic cell simulation with cross-blast propagation.",
    visualStyle_en: "Neo-arcade maze art with textured surfaces, glow blasts, and competitive contrast.",
    techFocus_en: "Cell pathing, cross blast propagation, upgrade systems.",
  },
  {
    id: "arcade-retro-galaga-quantum",
    image: arcadeRetroGalagaQuantumImage,
    sessionTime: "3-9 min",
    title: "Galaga Quantum",
    category: "Arcade",
    tagline: "Shooter por oleadas con formaciones vivas, combo y jefes de cierre.",
    description: "Relectura de Galaga con enemigos en patrones sinusoidales, combo de precision y oleadas con dificultad escalable.",
    objective_es: "Elimina toda la oleada sin que la defensa sea atravesada.",
    howToPlay_es: "A/D o flechas para moverte y Espacio para disparar. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Formaciones con trayectorias variables y bosses.",
      "Sistema de combo para recompensar precision.",
      "Ritmo de fuego enemigo escalado por nivel.",
      "Transiciones de oleada rapidas y claras.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: loop de oleadas con estado acotado.",
    visualStyle: "Neon sci-fi con proyectiles brillantes y siluetas modernizadas.",
    techFocus: "Gestor de oleadas, combo timer y colisiones de proyectiles.",
    category_en: "Arcade",
    tagline_en: "Wave shooter with living formations, combo flow, and stage-end bosses.",
    description_en: "A modern Galaga take with sinusoidal enemy formations, precision combo pacing, and scalable wave pressure.",
    objective_en: "Clear the entire wave before enemies breach your defense.",
    howToPlay_en: "A/D or arrows to move and Space to shoot. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Variable formations including boss targets.",
      "Combo system that rewards precision play.",
      "Enemy fire cadence scales by level.",
      "Fast and readable wave transitions.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: bounded-state wave loop.",
    visualStyle_en: "Modern neon sci-fi with bright projectile language.",
    techFocus_en: "Wave manager, combo timer, projectile collisions.",
  },
  {
    id: "arcade-retro-qbert-prism",
    image: arcadeRetroQbertPrismImage,
    sessionTime: "3-7 min",
    title: "Qbert Prism Jump",
    category: "Arcade",
    tagline: "Puzzle-arcade isometrico con conversion cromatica y patrullas rivales.",
    description: "Inspirado en Qbert, este modo exige dominar saltos diagonales sobre una piramide donde cada celda debe convertirse sin caer ni chocar.",
    objective_es: "Convierte todas las celdas de la piramide al color objetivo.",
    howToPlay_es: "Flechas o WASD para saltar en diagonales. Enter/Espacio inicia, P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Piramide reactiva con objetivos por capa.",
      "Patrulla enemiga que revierte progreso.",
      "Ritmo tactico basado en rutas seguras.",
      "Partidas cortas y muy rejugables.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: tablero discreto con transiciones claras.",
    visualStyle: "Prism neon con volumen isometrico y contraste fuerte.",
    techFocus: "Grid triangular, reglas de salto y control de estado por celda.",
    category_en: "Arcade",
    tagline_en: "Isometric puzzle-arcade with color conversion and rival patrol pressure.",
    description_en: "Inspired by Qbert, this mode focuses on diagonal hopping over a pyramid where every tile must be converted without falling or colliding.",
    objective_en: "Convert every pyramid tile to its target color state.",
    howToPlay_en: "Use arrows or WASD for diagonal hops. Enter/Space starts, P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Reactive pyramid progression by tile layer.",
      "Enemy patrol that reverts tile progress.",
      "Tactical route planning under pressure.",
      "Short high-replay runs.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: discrete board with clear transitions.",
    visualStyle_en: "Prism-neon isometric look with bold contrast.",
    techFocus_en: "Triangular grid rules, jump logic, tile-state progression.",
  },
  {
    id: "arcade-retro-lunar-lander-orbit",
    image: arcadeRetroLunarLanderOrbitImage,
    sessionTime: "3-8 min",
    title: "Lunar Lander Orbit",
    category: "Arcade",
    tagline: "Aterrizaje orbital con fisica fina, consumo de fuel y precision de vector.",
    description: "Lander clásico reconstruido con presentación moderna. Controla angulo, velocidad horizontal/vertical y combustible para aterrizar de forma segura.",
    objective_es: "Aterriza sobre la plataforma cumpliendo limites de velocidad y angulo.",
    howToPlay_es: "A/D rota, W activa propulsor. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Modelo de gravedad con empuje progresivo.",
      "Fuel limitado para decisiones de riesgo.",
      "Ventana de aterrizaje con tolerancias reales.",
      "Nivel siguiente con plataforma mas exigente.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo",
    viability: "Alta: simulacion compacta de fisica 2D.",
    visualStyle: "Paisaje lunar synth con HUD minimal y telemetria de descenso.",
    techFocus: "Integracion de velocidad, control angular y verificacion de aterrizaje.",
    category_en: "Arcade",
    tagline_en: "Orbital landing challenge with precise physics, fuel management, and vector control.",
    description_en: "A classic Lander rebuilt with modern presentation. Control angle, horizontal/vertical speed, and fuel to execute safe touchdowns.",
    objective_en: "Land on the platform within safe speed and angle limits.",
    howToPlay_en: "A/D rotates, W fires thruster. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Gravity model with responsive thrust control.",
      "Limited fuel for meaningful risk decisions.",
      "Landing window with strict tolerances.",
      "Progressive pads with tighter constraints.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo",
    viability_en: "High: compact 2D physics simulation.",
    visualStyle_en: "Synth-lunar scene with minimal HUD telemetry.",
    techFocus_en: "Velocity integration, angular control, landing validation.",
  },
  {
    id: "arcade-retro-centipede-circuit",
    image: arcadeRetroCentipedeCircuitImage,
    sessionTime: "4-9 min",
    title: "Centipede Circuit",
    category: "Arcade",
    tagline: "Shooter de base fija con enjambres segmentados, hongos tacticos y ritmo moderno.",
    description: "Actualizacion visual de Centipede con cuadricula clara y lectura de amenazas por capas. Defiende la base disparando a segmentos y unidades de caída.",
    objective_es: "Elimina todos los segmentos centipede antes de que alcancen la base.",
    howToPlay_es: "Flechas/WASD para moverte en la zona inferior y Espacio para disparar. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Cadena segmentada con desplazamiento por obstaculos.",
      "Hongos persistentes que alteran rutas enemigas.",
      "Flea de presion para cambiar la toma de decisiones.",
      "Escalado de velocidad por oleada.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: tablero discreto con colisiones deterministas.",
    visualStyle: "Arcade bio-neon con grid legible y contraste competitivo.",
    techFocus: "Pathing segmentado, proyectiles verticales y control de obstaculos.",
    category_en: "Arcade",
    tagline_en: "Fixed-shooter with segmented swarms, tactical mushrooms, and modern pacing.",
    description_en: "A Centipede visual refresh with clear grid readability and layered threat flow. Defend your base by breaking segments and reacting to drop-in pressure units.",
    objective_en: "Eliminate all centipede segments before they breach the base.",
    howToPlay_en: "Use arrows/WASD in the lower zone and Space to shoot. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Segment chain movement shaped by obstacles.",
      "Persistent mushrooms that alter enemy pathing.",
      "Flea pressure unit forcing tactical shifts.",
      "Wave speed scaling for sustained intensity.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic grid and collision flow.",
    visualStyle_en: "Bio-neon arcade direction with competitive clarity.",
    techFocus_en: "Segment pathing, vertical shooting, obstacle control.",
  },
  {
    id: "arcade-retro-river-raid-neon",
    image: arcadeRetroRiverRaidNeonImage,
    sessionTime: "4-10 min",
    title: "River Raid Neon",
    category: "Arcade",
    tagline: "Raid aereo por cañon dinamico con fuel, disparos y lectura de trayectorias moderna.",
    description: "Inspirado en River Raid: avanza por un cañon vivo, esquiva colisiones, destruye objetivos y recoge combustible para sostener la carrera.",
    objective_es: "Completa la distancia objetivo sin chocar y sin quedarte sin combustible.",
    howToPlay_es: "A/D maniobra, W acelera, S frena, Espacio dispara. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Cañon procedural con anchura variable.",
      "Objetivos hostiles y pickups de fuel en ruta.",
      "Control de ritmo via aceleracion/frenado.",
      "Progresion por distancia con riesgo acumulativo.",
    ],
    difficulty: "Alta",
    multiplayer: "Solo",
    viability: "Alta: scroll vertical con runtime de entidades ligero.",
    visualStyle: "Top-down neon militar con agua y terreno estilizados.",
    techFocus: "Generacion de bordes, economia de fuel y colisiones dinamicas.",
    category_en: "Arcade",
    tagline_en: "Aerial canyon raid with fuel routing, gunplay, and modern trajectory readability.",
    description_en: "River Raid inspired run through a living canyon. Dodge impacts, destroy targets, and collect fuel to sustain long-distance survival.",
    objective_en: "Reach target distance without crashing or running out of fuel.",
    howToPlay_en: "A/D steers, W throttles, S brakes, Space fires. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Procedural canyon width variation.",
      "Hostile targets plus fuel pickups.",
      "Pacing control via throttle and brake.",
      "Distance-based progression with cumulative risk.",
    ],
    difficulty_en: "High",
    multiplayer_en: "Solo",
    viability_en: "High: lightweight vertical-scroll entity runtime.",
    visualStyle_en: "Neon top-down military look with stylized water/land contrast.",
    techFocus_en: "Boundary generation, fuel economy, dynamic collisions.",
  },
  {
    id: "arcade-retro-tron-lightcycles",
    image: arcadeRetroTronLightcyclesImage,
    sessionTime: "3-7 min",
    title: "Tron Lightcycles",
    category: "Arcade",
    tagline: "Duelo de trazos de luz con IA reactiva y tablero moderno de alto contraste.",
    description: "Basado en Lightcycles: controla direccion en tiempo real y obliga a la IA a chocar contra estelas sin tocar paredes ni rastro propio.",
    objective_es: "Haz que la IA colisione antes que tu en el duelo de estelas.",
    howToPlay_es: "Flechas o WASD para cambiar direccion. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Estelas persistentes que cierran el espacio util.",
      "IA con decisiones de giro y evitacion.",
      "Partidas ultrarrapidas y de lectura tactica.",
      "Escalado de velocidad por nivel.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo vs IA",
    viability: "Alta: simulacion por grilla con estado compacto.",
    visualStyle: "Arena dark-neon con lineas electricas y glow cromatico.",
    techFocus: "Direccion discreta, deteccion de choque y decision AI de supervivencia.",
    category_en: "Arcade",
    tagline_en: "Light-trail duel with reactive AI and high-contrast modern board design.",
    description_en: "Lightcycles-inspired duel: steer in real time and force AI crashes while avoiding walls and existing trails.",
    objective_en: "Force the AI to crash before you do in the trail duel.",
    howToPlay_en: "Use arrows or WASD to change direction. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Persistent trails that progressively shrink safe space.",
      "Reactive AI steering and avoidance behavior.",
      "Ultra-fast rounds with tactical readability.",
      "Level-based speed escalation.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo vs AI",
    viability_en: "High: grid simulation with compact state.",
    visualStyle_en: "Dark-neon arena with electric trail language.",
    techFocus_en: "Discrete steering, crash detection, AI survival decisions.",
  },
  {
    id: "arcade-retro-road-fighter-synth",
    image: arcadeRetroRoadFighterSynthImage,
    sessionTime: "3-8 min",
    title: "Road Fighter Synth",
    category: "Arcade",
    tagline: "Carrera arcade vertical con trafico agresivo y estetica synth moderna.",
    description: "Relectura de Road Fighter con enfoque competitivo: cambia carril al milisegundo, controla ritmo y supera tramos de tráfico creciente.",
    objective_es: "Completa la distancia objetivo sin colisionar con el trafico.",
    howToPlay_es: "A/D cambia carril, W acelera, S frena. P pausa, R reinicia y F pantalla completa.",
    highlights: [
      "Trafico con perfiles ligeros y pesados.",
      "Ritmo variable segun aceleracion del jugador.",
      "Objetivo por distancia para runs compactas.",
      "Telemetria clara de carril y progreso.",
    ],
    difficulty: "Media-Alta",
    multiplayer: "Solo",
    viability: "Alta: lane runner deterministico y escalable.",
    visualStyle: "Autopista synthwave con luces y alto contraste.",
    techFocus: "Gestor de trafico por carril, colisiones y pacing de distancia.",
    category_en: "Arcade",
    tagline_en: "Vertical arcade traffic racer with aggressive flow and modern synth aesthetics.",
    description_en: "A modern Road Fighter-inspired loop: lane-switch with precision timing, pace management, and progressive traffic segments.",
    objective_en: "Complete target distance without colliding with traffic.",
    howToPlay_en: "A/D swaps lanes, W accelerates, S brakes. P pauses, R restarts, F toggles fullscreen.",
    highlights_en: [
      "Light and heavy traffic archetypes.",
      "Variable pace tied to player throttle.",
      "Distance-targeted compact runs.",
      "Clear lane and progress telemetry.",
    ],
    difficulty_en: "Medium-High",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic lane runner architecture.",
    visualStyle_en: "Synthwave highway with modern lighting language.",
    techFocus_en: "Lane traffic manager, collision model, distance pacing.",
  },

  {
    id: "sports-basketball-court",
    image: sportsBasketballCourtImage,
    sessionTime: "3-8 min",

    title: "Basketball Court Pro",
    category: "Deportes",
    tagline: "Entrena desde las 6 posiciones reglamentarias del baloncesto con físicas balisticas reales y perspectiva 3D del pabellón.",
    description:
      "Juego de baloncesto de entrenamiento donde cada ronda recorre las 6 posiciones reglamentarias: tiro libre, media distancia, triple esquina izquierda, triple esquina derecha, triple lateral izquierdo y triple central. El jugador ajusta el ángulo de arco (38-66°), la potencia y la desviación lateral antes de cada lanzamiento. La bola sigue una trayectoria balística real con gravedad y drag aerodinámico, rebota físicamente en el aro y la tabla, y la cámara 3D se posiciona detrás del tirador en cada posición para mostrar el pabellón de entrenamiento desde su perspectiva.",
    objective_es:
      "Encestar el máximo de los 6 tiros posibles en cada ronda para acumular puntos y batir tu récord (máximo 15 puntos: 1+2+3+3+3+3).",
    howToPlay_es:
      "Arriba/abajo ajustan el arco del lanzamiento, izquierda/derecha la desviación lateral y W/S la potencia. Space o Enter lanza. Los indicadores de color en los controles muestran cuándo los parámetros se acercan al ángulo y potencia ideales para cada posición. P pausa, R nueva ronda y F pantalla completa.",
    highlights: [
      "6 posiciones reglamentarias FIBA: tiro libre (1 pt), media distancia (2 pts) y cuatro triples (3 pts c/u).",
      "Física balística 3D completa: gravedad 9.82 m/s², drag aerodinámico y colisión elástica con el aro (16 puntos de contacto).",
      "Rebotes realistas en el aro y la tabla trasera: los balls cercanos pueden entrar por carambola.",
      "Cámara 3D perspectiva detrás del tirador que cambia de posición para cada tiro.",
      "Pabellón de entrenamiento detallado: suelo de parqué con vetas, líneas FIBA, zona de pintura, arco de triple, tablero con caja de tiro y red animada.",
      "Preview de trayectoria en tiempo real antes del lanzamiento.",
      "Vista de pájaro del aro (rim view) para leer la desviación lateral antes de disparar.",
      "Gauges de color (arco, potencia, lateral) que indican la distancia al parámetro ideal de cada posición.",
      "Récord persistente en localStorage.",
    ],
    difficulty: "Media",
    multiplayer: "Solo",
    viability: "Alta: motor Canvas determinista, física balística exacta y estado serializable.",
    visualStyle: "Pabellón de entrenamiento NBA/FIBA con suelo de parqué, iluminación cenital y basket reglamentario en perspectiva 3D.",
    techFocus: "Proyección perspectiva 3D custom, física balística con substep, colisión esférica aro + tabla y preview de trayectoria en tiempo real.",

    category_en: "Sports",
    tagline_en: "Train from all 6 regulation basketball spots with real ballistic physics and a 3D gymnasium perspective view.",
    description_en:
      "A basketball training game where each round cycles through 6 regulation positions: free throw, mid-range, left corner 3, right corner 3, left wing 3, and center 3. Players tune arc angle (38-66°), power, and lateral deviation before each shot. The ball follows a real ballistic trajectory with gravity and aerodynamic drag, physically bounces off the rim and backboard, and the 3D camera repositions behind the shooter at each spot to show the gymnasium from their perspective.",
    objective_en:
      "Score as many of the 6 shots as possible each round and beat your record (maximum 15 points: 1+2+3+3+3+3).",
    howToPlay_en:
      "Up/down keys tune arc, left/right lateral deviation, and W/S power. Space or Enter shoots. Colour-coded gauges show when each parameter is close to the ideal for that position. P pauses, R starts a new round, and F toggles fullscreen.",
    highlights_en: [
      "6 FIBA regulation spots: free throw (1 pt), mid-range (2 pts), and four three-pointers (3 pts each).",
      "Full 3D ballistic physics: 9.82 m/s² gravity, aerodynamic drag, and elastic collision with the rim (16 contact points).",
      "Realistic rim and backboard bounces: close shots can still go in off the iron.",
      "3D perspective camera repositions behind the shooter for each new position.",
      "Detailed training gymnasium: hardwood floor with wood-grain, full FIBA markings, paint zone, three-point arc, backboard with shooting box, and animated net.",
      "Real-time trajectory preview arc before every shot.",
      "Bird's-eye rim view to read lateral deviation before release.",
      "Colour gauges (arc, power, lateral) indicating distance from each position's ideal parameters.",
      "Persistent best-score record in localStorage.",
    ],
    difficulty_en: "Medium",
    multiplayer_en: "Solo",
    viability_en: "High: deterministic Canvas engine, exact ballistic physics, and serialisable state.",
    visualStyle_en: "NBA/FIBA training gymnasium with hardwood floor, overhead lighting, and regulation basket in custom 3D perspective.",
    techFocus_en: "Custom 3D perspective projection, ballistic physics with sub-stepping, spherical rim + backboard collision, and real-time trajectory preview.",
  },
];
