import React, { Suspense, lazy, useMemo } from "react";
import AdventureGame from "../games/AdventureGame";
import ActionGame from "../games/ActionGame";
import RacingGame from "../games/RacingGame";
import KnowledgeGame from "../games/KnowledgeGame";
import KnowledgeArcadeGame from "../games/KnowledgeArcadeGame";
import RpgGame from "../games/RpgGame";
import HeadSoccerGame from "../games/HeadSoccerGame";
import PacmanGame from "../games/PacmanGame";
import MinesweeperGame from "../games/MinesweeperGame";
import ChessGame from "../games/ChessGame";
import CheckersGame from "../games/CheckersGame";
import DominoStrategyGame from "../games/DominoStrategyGame";
import StrategySudokuGame from "../games/StrategySudokuGame";
import StrategyBattleshipGame from "../games/StrategyBattleshipGame";
import PokerTexasHoldemGame from "../games/PokerTexasHoldemGame";
import ParchisStrategyGame from "../games/ParchisStrategyGame";
import StrategyMansionTripleEnigmaGame from "../games/StrategyMansionTripleEnigmaGame";
import RaceGame2DPro from "../games/RaceGame2DPro";
import SunsetSlipstream from "../games/racing/midnight-traffic";
import resolveBrowserLanguage from "../utils/resolveBrowserLanguage";

const PlatformerGame = lazy(() => import("../games/PlatformerGame"));
const FighterGame = lazy(() => import("../games/FighterGame"));
const BilliardsGame = lazy(() => import("../games/arcade/billiards-club"));
const BowlingGame = lazy(() => import("../games/arcade/bowling-pro"));
const PenaltyNeuralKeeperGame = lazy(() => import("../games/arcade/penalty-neural-keeper"));
const CosmicVanguardGame = lazy(() => import("../games/arcade/cosmic-vanguard"));
const OrchardMatchBlastGame = lazy(() => import("../games/arcade/orchard-match-blast"));
const ReactorTossGame = lazy(() => import("../games/arcade/reactor-toss"));
const TerritoryWarGame = lazy(() => import("../games/arcade/territory-war"));
const GolfTour2DGame = lazy(() => import("../games/arcade/golf-tour-2d"));
const ArcheryHorizonGame = lazy(() => import("../games/arcade/archery-horizon"));
const PinballWizardGame  = lazy(() => import("../games/arcade/pinball-wizard"));
const BubbleStormGame        = lazy(() => import("../games/arcade/bubble-storm"));
const BasketballCourtGame    = lazy(() => import("../games/arcade/basketball-court"));
const IceStrikeProGame       = lazy(() => import("../games/arcade/ice-strike-pro"));
const StickBrawlShowdownGame = lazy(() => import("../games/arcade/stick-brawl-showdown"));
const KnowledgeSudokuGame = () => <KnowledgeArcadeGame variant="sudoku" />;
const KnowledgeAhorcadoGame = () => <KnowledgeArcadeGame variant="ahorcado" />;
const KnowledgePacienciaGame = () => <KnowledgeArcadeGame variant="paciencia" />;
const KnowledgePuzleGame = () => <KnowledgeArcadeGame variant="puzle" />;
const KnowledgeCrucigramaGame = () => <KnowledgeArcadeGame variant="crucigrama" />;
const KnowledgeSopaLetrasGame = () => <KnowledgeArcadeGame variant="sopa-letras" />;
const KnowledgeWordleGame = () => <KnowledgeArcadeGame variant="wordle" />;
const KnowledgeAnagramasGame = () => <KnowledgeArcadeGame variant="anagramas" />;
const KnowledgeCalculoMentalGame = () => <KnowledgeArcadeGame variant="calculo-mental" />;
const KnowledgeTablaPeriodicaGame = () => <KnowledgeArcadeGame variant="tabla-periodica" />;
const KnowledgeMapasGame = () => <KnowledgeArcadeGame variant="mapas" />;
const KnowledgeMapasCaminoCortoGame = () => <KnowledgeArcadeGame variant="mapas-camino-corto" />;
const KnowledgeAdivinaPaisGame = () => <KnowledgeArcadeGame variant="adivina-pais" />;
const KnowledgeRefranesGame = () => <KnowledgeArcadeGame variant="refranes" />;
const KnowledgeTangramGame = () => <KnowledgeArcadeGame variant="tangram" />;

const GAME_COMPONENTS = {
  "adventure-echoes": AdventureGame,
  "action-core-strike": ActionGame,
  "racing-neon-lanes": RacingGame,
  "knowledge-quiz-nexus": KnowledgeGame,
  "knowledge-logic-vault": KnowledgeGame,
  "knowledge-refranes-clasicos": KnowledgeRefranesGame,
  "knowledge-sudoku-sprint": KnowledgeSudokuGame,
  "knowledge-domino-chain": DominoStrategyGame,
  "knowledge-ahorcado-flash": KnowledgeAhorcadoGame,
  "knowledge-paciencia-lite": KnowledgePacienciaGame,
  "knowledge-puzle-deslizante": KnowledgePuzleGame,
  "knowledge-crucigrama-mini": KnowledgeCrucigramaGame,
  "knowledge-sopa-letras-mega": KnowledgeSopaLetrasGame,
  "knowledge-wordle-pro": KnowledgeWordleGame,
  "knowledge-anagramas-pro": KnowledgeAnagramasGame,
  "knowledge-calculo-mental-flash10": KnowledgeCalculoMentalGame,
  "knowledge-tabla-periodica-total": KnowledgeTablaPeriodicaGame,
  "knowledge-mapas-atlas": KnowledgeMapasGame,
  "knowledge-mapas-camino-corto": KnowledgeMapasCaminoCortoGame,
  "knowledge-adivina-pais-silueta": KnowledgeAdivinaPaisGame,
  "knowledge-tangram-pro": KnowledgeTangramGame,
  "strategy-chess-grandmaster": ChessGame,
  "strategy-damas-clasicas": CheckersGame,
  "strategy-sudoku-tecnicas": StrategySudokuGame,
  "strategy-hundir-flota-pro": StrategyBattleshipGame,
  "strategy-poker-holdem-no-bet": PokerTexasHoldemGame,
  "strategy-parchis-ludoteka": ParchisStrategyGame,
  "strategy-mansion-triple-enigma": StrategyMansionTripleEnigmaGame,
  "rpg-emberfall": RpgGame,
  "platformer-sky-runner": PlatformerGame,
  "fighter-neon-dojo": FighterGame,
  "sports-head-soccer-arena": HeadSoccerGame,
  "arcade-pacman-maze-protocol": PacmanGame,
  "arcade-reactor-toss": ReactorTossGame,
  "arcade-territory-war": TerritoryWarGame,
  "arcade-orchard-match-blast": OrchardMatchBlastGame,
  "arcade-billar-pool-club": BilliardsGame,
  "arcade-bowling-pro-tour": BowlingGame,
  "arcade-penalty-neural-keeper": PenaltyNeuralKeeperGame,
  "arcade-cosmic-vanguard": CosmicVanguardGame,
  "arcade-golf-tour-2d": GolfTour2DGame,
  "arcade-archery-horizon": ArcheryHorizonGame,
  "arcade-pinball-wizard":  PinballWizardGame,
  "arcade-bubble-storm":       BubbleStormGame,
  "arcade-ice-strike-pro":     IceStrikeProGame,
  "arcade-stick-brawl-showdown": StickBrawlShowdownGame,
  "sports-basketball-court":   BasketballCourtGame,
  "arcade-buscaminas-classic": MinesweeperGame,
  "racing-race2dpro": RaceGame2DPro,
  "racing-sunset-slipstream": SunsetSlipstream,
};

const CONTROL_HINTS_BY_LOCALE = {
  es: {
    "adventure-echoes": "Movimiento con WASD/flechas + busqueda, escaneo, raciones, baliza y salto (B).",
    "action-core-strike": "Movimiento con WASD/flechas + rafaga, cohete, overdrive, defensa y botiquin en rondas.",
    "racing-neon-lanes": "Carriles con izquierda/derecha, velocidad con arriba/abajo, turbo (espacio) e item (I).",
    "knowledge-quiz-nexus": "Selecciona respuesta por boton y avanza al bloquear la pregunta.",
    "knowledge-logic-vault": "Selecciona respuesta por boton y avanza al bloquear la pregunta.",
    "knowledge-refranes-clasicos": "5 rondas: lee el inicio del refran, escribe la continuacion y valida con Enter. N avanza una ronda ya revisada y R reinicia.",
    "knowledge-sudoku-sprint": "Mueve seleccion con flechas, escribe 1-4 (o A/S/D/F), limpia con Backspace/Delete y R para partida aleatoria.",
    "knowledge-domino-chain": "Domino clasico 4P por parejas: flechas izq/der eligen ficha, arriba/abajo extremo, Enter juega, P pasa, N avanza ronda y R reinicia.",
    "knowledge-ahorcado-flash": "Escribe letras para adivinar y, al terminar, usa Enter o el boton de partida aleatoria.",
    "knowledge-paciencia-lite": "D roba, A selecciona descarte, Q/W/E/R columnas, flechas cambian destino, Enter/Espacio mueven y P lanza partida aleatoria.",
    "knowledge-puzle-deslizante": "Usa flechas para mover el hueco o pulsa fichas adyacentes. R carga partida aleatoria.",
    "knowledge-crucigrama-mini": "Selecciona longitud maxima (6-10), flechas para navegar, letras para escribir, Backspace para borrar, Enter para comprobar y boton de partida aleatoria.",
    "knowledge-sopa-letras-mega": "Arrastra o marca inicio-fin para seleccionar palabras en horizontal, vertical o diagonal (tambien al reves). R carga partida aleatoria.",
    "knowledge-wordle-pro": "Wordle ES/EN con 10k palabras por idioma. Escribe letras, Enter valida, Backspace borra y usa el boton de partida aleatoria.",
    "knowledge-anagramas-pro": "Anagramas ES/EN con 10k palabras por idioma. Usa las mismas letras, Enter valida, M mezcla y usa el boton de partida aleatoria.",
    "knowledge-calculo-mental-flash10": "Partida de 10 rondas en 40s: escribe el resultado, Enter valida y R reinicia.",
    "knowledge-tabla-periodica-total": "Tabla periodica vacia: flechas para moverte, escribe simbolo o nombre, Enter valida, N salta y R reinicia.",
    "knowledge-mapas-atlas": "Elige escala (mundo/continente/pais/ciudades), escribe nombres geograficos y pulsa Enter para validar. R reinicia y N carga mapa aleatorio.",
    "knowledge-mapas-camino-corto": "Modo paises/provincias: elige continente o pais, escribe vecino siguiente, Enter valida, verde ideal, naranja alternativo, R reinicia y N nueva ruta.",
    "knowledge-adivina-pais-silueta": "5 rondas: observa la silueta, escribe el pais y valida con Enter. Recomendados en vivo segun letras, N pasa ronda tras validar y R reinicia partida.",
    "knowledge-tangram-pro": "Tangram de 7 tans: arrastra piezas, Q/E rota 45 grados, F voltea el paralelogramo, Enter intenta encajar, H muestra guia, R reinicia y N nueva silueta.",
    "strategy-chess-grandmaster": "Clic para mover, promocion al coronar, U deshace, D reclama tablas y F alterna pantalla completa.",
    "strategy-damas-clasicas": "Damas 8x8: clic para mover en diagonal, capturas encadenadas, U deshace, X retiro, R reinicia y F alterna pantalla completa.",
    "strategy-sudoku-tecnicas": "Sudoku 9x9: flechas para mover, 1-9 o QWE/ASD/UIO para escribir, Backspace borra, P aplica pista y R partida aleatoria.",
    "strategy-hundir-flota-pro": "Hundir la Flota Classic Card: juega una carta de batalla por turno y recarga mano a 5. Clic en carta de mano y despues en objetivo; algunas cartas de poder te dejan elegir efecto.",
    "strategy-poker-holdem-no-bet": "Poker clasico 5 cartas con apuestas reales: ciegas, bote y acciones call/raise/fold/all-in. Enter accion principal, U subir, A all-in, F retirarse, 1-5 seleccionar descarte, D descartar, S servirse, N siguiente mano y R reiniciar.",
    "strategy-parchis-ludoteka": "Antes de iniciar puedes elegir color de fichas. S/Enter inicia partida, R/Enter/Space tira dado, 1..9 elige jugada, Enter primera jugada, X continua sin jugada y N nueva partida.",
    "strategy-mansion-triple-enigma": "Deduccion tipo misterio con tutorial guiado: mueve en tablero, elige sospechoso y arma, y lanza sospecha. A abre/cierra acusacion final, 1/2/3 cambian pestana, Enter confirma y N reinicia caso.",
    "rpg-emberfall": "Explora con WASD/flechas y usa atacar, habilidad, defender, enfocar, invocar (U) y pocion.",
    "platformer-sky-runner": "Movimiento con A/D o flechas, salto variable con W/arriba/espacio y accion con F en rutas de 8 sectores con springs, viento, checkpoints y bosses.",
    "fighter-neon-dojo": "Combate con A/D o flechas, salto W/arriba, jab J/espacio, heavy K/enter, guardia L/abajo y special U/B.",
    "sports-head-soccer-arena": "A/D o flechas para mover, arriba/W para salto, mantener Space para cargar y soltar para disparar. Enter inicia, R reinicia, P pausa.",
    "arcade-reactor-toss": "Touch/raton: tira hacia atras desde la orbita y suelta. Flechas o A/D apuntan, W/S ajustan potencia, Enter/Espacio lanza, P pausa, R reinicia, L selecciona nivel, M audio y F pantalla completa.",
    "arcade-territory-war": "Turnos Territory War: A/D o flechas mueven, W/arriba salta, Q/E o arriba/abajo ajustan angulo, mantener Espacio o click carga potencia y al soltar lanza granada. P pausa, R reinicia y F pantalla completa.",
    "arcade-orchard-match-blast": "Match-3 original: elige meta de puntos (Basica/Clasica/Avanzada/Extrema) antes de empezar. Intercambia bloques de color adyacentes; flechas mueven cursor, Enter/Espacio confirma, H pista, S mezclar, B Bloom, R reinicia y F pantalla completa.",
    "arcade-billar-pool-club": "Raton opcional para apuntar: A/D afinan angulo, W/S regulan potencia, Space tira, O push out, V safety, 1/2 decisiones. En blanca en mano usa flechas/WASD para mover, Enter/Space para fijar y P para autocolocar. F pantalla completa.",
    "arcade-bowling-pro-tour": "A/D ajustan linea, W/S potencia, Q/E efecto y Enter/Espacio lanza. R reinicia la serie y F activa pantalla completa.",
    "arcade-penalty-neural-keeper": "Selecciona rival y dificultad, inicia la tanda y usa 1-5 para elegir zona (abajo izq/der, arriba izq/der, centro). R vuelve al menu y F pantalla completa.",
    "arcade-cosmic-vanguard": "A/D o izq/der rotan, W impulsa, S frena, Shift boost, Espacio dispara, E/X pulso EMP, P pausa, R reinicia y F pantalla completa. Las pasadas al limite cargan Vanguard Drive.",
    "arcade-golf-tour-2d": "Mini golf 2D: arrastra desde la bola para apuntar y potencia. A/D o flechas angulo, W/S potencia, Enter/Espacio lanza, P pausa, R reinicia, L selector y F pantalla completa.",
    "arcade-archery-horizon": "Tiro con arco por profundidad: A/D o J/L desvio, arriba/abajo o I/K trayectoria, Q/E ajuste grueso de trayectoria, W/S o +/- intensidad, Z/X ajuste fino, Shift modo fino, 1-5 presets y 6 recomendado. Enter/Espacio dispara, P pausa, R reinicia, N avanza y F pantalla completa.",
    "arcade-pinball-wizard": "Z o flecha izquierda para flipper izquierdo, X o flecha derecha para el derecho. Mantén Espacio para cargar el plunger y suéltalo para lanzar. R reinicia.",
    "arcade-bubble-storm": "Mueve el ratón para apuntar y haz clic para disparar burbujas. Tab o S cambia la burbuja siguiente. Forma grupos de 3+ del mismo color para hacerlos explotar. R reinicia.",
    "arcade-ice-strike-pro": "←→/AD apuntan, W sube potencia, Q giro interior, E giro exterior, Espacio lanza. S barre durante el vuelo. R reinicia, Esc menú.",
    "arcade-stick-brawl-showdown": "Fighter arcade avanzado: A/D o flechas mover, W/arriba saltar, S/abajo bloquear, G/espacio jab, H/enter cross, J/K patadas, F proyectil, B super, P pausa y R reinicia.",
    "sports-basketball-court": "Baloncesto 6 posiciones: arriba/abajo ajustan arco, izq/der desviacion lateral, W/S potencia, Space/Enter lanza. P pausa, R nueva ronda y F pantalla completa.",
    "arcade-pacman-maze-protocol": "WASD o flechas para mover, Enter/Espacio para empezar, P/Esc para pausa, R reinicia, M sonido y G debug.",
    "arcade-buscaminas-classic": "Click izq abre, click der o pulsacion larga marca bandera. Flechas mueven cursor, Enter/Espacio abre, F marca, H sugiere IA, A ejecuta IA, R reinicia. En competitivo puntuan celdas + tiempo.",
    "racing-race2dpro": "Arriba/abajo acelerar/frenar, izq/der girar. Móvil: joystick táctil izq. + botones der. R reinicia.",
    "racing-sunset-slipstream": "Izq/der maniobra, arriba acelera, abajo enfria el ritmo, Espacio activa focus y R reinicia.",
  },
  en: {
    "adventure-echoes": "Move with WASD/arrows plus search, scan, rations, beacon and jump (B).",
    "action-core-strike": "Move with WASD/arrows plus burst, rocket, overdrive, defense and medkit in rounds.",
    "racing-neon-lanes": "Lane driving with left/right, speed with up/down, turbo (space) and item (I).",
    "knowledge-quiz-nexus": "Choose an answer button and continue after locking the question.",
    "knowledge-logic-vault": "Choose an answer button and continue after locking the question.",
    "knowledge-refranes-clasicos": "5 rounds: read the proverb opening, type the continuation, and press Enter to check. N advances a reviewed round and R restarts.",
    "knowledge-sudoku-sprint": "Move selection with arrows, type 1-4 (or A/S/D/F), clear with Backspace/Delete and press R for a random match.",
    "knowledge-domino-chain": "Classic 4-player team domino: left/right chooses tile, up/down edge, Enter plays, P passes, N advances round, and R restarts.",
    "knowledge-ahorcado-flash": "Type letters to guess the word and, after finishing, use Enter or the random-match button.",
    "knowledge-paciencia-lite": "D draws, A selects waste, Q/W/E/R selects columns, arrows change target, Enter/Space moves, and P loads a random match.",
    "knowledge-puzle-deslizante": "Use arrows to move the blank or click adjacent tiles. Press R for a random match.",
    "knowledge-crucigrama-mini": "Choose max length (6-10), arrows navigate, letters write, Backspace clears, Enter checks, and the random-match button loads another puzzle.",
    "knowledge-sopa-letras-mega": "Drag or click start-end to select words horizontally, vertically, or diagonally (reverse also works). Press R for a random match.",
    "knowledge-wordle-pro": "Wordle ES/EN with 10k words per locale. Type letters, Enter submits, Backspace deletes and use the random-match button.",
    "knowledge-anagramas-pro": "Anagrams ES/EN with 10k words per locale. Use the same letters, Enter submits, M shuffles and use the random-match button.",
    "knowledge-calculo-mental-flash10": "10 rounds in 40s: type the result, press Enter to submit, and R to restart.",
    "knowledge-tabla-periodica-total": "Empty periodic table: arrows move cells, type symbol/name, Enter checks, N jumps pending, and R restarts.",
    "knowledge-mapas-atlas": "Choose scope (world/continent/country/cities), type geographic names and press Enter to validate. R restarts and N loads random map.",
    "knowledge-mapas-camino-corto": "Countries/provinces mode: choose continent or country, type next neighbor, Enter checks, green ideal, orange alternative, R restart, N new route.",
    "knowledge-adivina-pais-silueta": "5 rounds: inspect the silhouette, type the country and press Enter. Live recommendations update by letters, N advances after checking and R restarts.",
    "knowledge-tangram-pro": "7-tan tangram: drag pieces, Q/E rotates 45 degrees, F flips the parallelogram, Enter snaps, H toggles guide, R restarts, and N loads another silhouette.",
    "strategy-chess-grandmaster": "Click pieces to move, choose promotion on last rank, U undo, D claim draw, and F toggles fullscreen.",
    "strategy-damas-clasicas": "8x8 checkers: click to move diagonally, chain captures, U undo, X resign, R restart, and F toggle fullscreen.",
    "strategy-sudoku-tecnicas": "Sudoku 9x9: arrows move, 1-9 or QWE/ASD/UIO types values, Backspace clears, P applies hint, and R starts a random match.",
    "strategy-hundir-flota-pro": "Battleship Classic Card: play one battle card per turn and refill to 5. Click a hand card, then target card; some power cards let you choose between two effects.",
    "strategy-poker-holdem-no-bet": "Classic 5-card draw with real betting: blinds, pot play, and check/call/raise/fold/all-in decisions. Enter main action, U raise, A all-in, F fold, 1-5 select discard, D discard, S stand pat, N next hand, and R restart.",
    "strategy-parchis-ludoteka": "Pick your token color before starting. S/Enter starts the match, R/Enter/Space rolls the die, 1..9 picks a move, Enter takes the first move, X continues without move, and N starts a new match.",
    "strategy-mansion-triple-enigma": "Mystery deduction with guided tutorial: move on the board, pick suspect and weapon, then submit a suggestion. A toggles accusation, 1/2/3 switch tabs, Enter confirms, and N restarts the case.",
    "rpg-emberfall": "Explore with WASD/arrows and use attack, skill, defend, focus, summon (U) and potion.",
    "platformer-sky-runner": "Move with A/D or arrows, use variable jump with W/up/space and F action in 8-sector routes with springs, wind, checkpoints and boss fights.",
    "fighter-neon-dojo": "Fight with A/D or arrows, jump W/up, jab J/space, heavy K/enter, guard L/down and special U/B.",
    "sports-head-soccer-arena": "A/D or arrows move, up/W jumps, hold Space to charge and release to shoot. Enter starts, R restarts, P pauses.",
    "arcade-reactor-toss": "Touch/mouse: pull back from the orb and release. Arrows or A/D aim, W/S adjust power, Enter/Space launches, P pauses, R restarts, L opens level select, M sound, and F toggles fullscreen.",
    "arcade-territory-war": "Territory War turn-based flow: A/D or arrows move, W/up jumps, Q/E or up/down tune angle, hold Space or mouse to charge and release to throw. P pauses, R restarts, F fullscreen.",
    "arcade-orchard-match-blast": "Original match-3: choose a score goal preset (Basic/Standard/Advanced/Extreme) before starting. Swap adjacent color blocks; arrows move cursor, Enter/Space confirms, H hint, S shuffle, B Bloom, R restart, and F toggles fullscreen.",
    "arcade-billar-pool-club": "Mouse aiming is optional: A/D fine tune angle, W/S adjust power, Space shoots, O push out, V safety, and 1/2 decisions. With ball in hand, use arrows/WASD to move the cue ball, Enter/Space to confirm, and P to auto-place. F toggles fullscreen.",
    "arcade-bowling-pro-tour": "A/D adjust line, W/S power, Q/E spin, and Enter/Space throws. R restarts the series and F toggles fullscreen.",
    "arcade-penalty-neural-keeper": "Choose rival and difficulty, start the shootout, then use 1-5 for target zones (bottom left/right, top left/right, center). R returns to menu and F toggles fullscreen.",
    "arcade-cosmic-vanguard": "A/D or left/right rotate, W thrusts, S brakes, Shift boosts, Space fires, E/X launches an EMP pulse, P pauses, R restarts, and F toggles fullscreen. Close passes charge Vanguard Drive.",
    "arcade-golf-tour-2d": "2D mini golf: drag from the ball to set angle and power. A/D or arrows adjust angle, W/S power, Enter/Space launches, P pause, R restart, L level select, and F fullscreen.",
    "arcade-archery-horizon": "Depth archery mode: A/D or J/L tune yaw, up/down or I/K trajectory, Q/E coarse trajectory trim, W/S or +/- intensity, Z/X fine trim, Shift fine mode, 1-5 presets and 6 recommendation. Enter/Space fires, P pauses, R restarts, N advances, F toggles fullscreen.",
    "arcade-pinball-wizard": "Z or left arrow for left flipper, X or right arrow for right flipper. Hold Space to charge the plunger and release to launch. R restarts.",
    "arcade-bubble-storm": "Move the mouse to aim and click to shoot bubbles. Tab or S swaps the next bubble. Match 3+ same-colour bubbles to pop them. R restarts.",
    "arcade-ice-strike-pro": "←→/AD aim, W raise power, Q in-turn, E out-turn, Space deliver. S sweeps mid-flight. R restart, Esc menu.",
    "arcade-stick-brawl-showdown": "Advanced arcade fighter: A/D or arrows move, W/up jump, S/down block, G/space jab, H/enter cross, J/K kicks, F projectile, B super, P pause, R restart.",
    "sports-basketball-court": "Basketball 6 spots: up/down tune arc, left/right lateral aim, W/S power, Space/Enter shoots. P pauses, R starts a new round, and F toggles fullscreen.",
    "arcade-pacman-maze-protocol": "Use arrows or WASD to move, Enter/Space to start, P/Esc to pause, R restart, M sound and G debug.",
    "arcade-buscaminas-classic": "Left click reveals, right click or long press marks. Arrows move cursor, Enter/Space reveals, F marks, H asks AI hint, A runs AI move, R restarts. Competitive mode scores cells + time.",
    "racing-race2dpro": "Up/down throttle/brake, left/right steer. Mobile: left touch joystick + right buttons. R restart.",
    "racing-sunset-slipstream": "Left/right steers, up accelerates, down cools the pace, Space activates focus, and R restarts.",
  }
};

const UI_COPY_BY_LOCALE = {
  es: {
    playNow: "Jugar ahora",
    readyMode: "Modo interactivo listo para la categoria",
    loading: "Cargando motor del juego...",
    unsupported: "Este juego todavia no tiene motor jugable asignado."
  },
  en: {
    playNow: "Play now",
    readyMode: "Interactive mode is ready for category",
    loading: "Loading game engine...",
    unsupported: "This game does not have a playable engine assigned yet."
  }
};

function GamePlayground({ game }) {
  const locale = useMemo(resolveBrowserLanguage, []);
  const resolvedLocale = locale === "es" ? "es" : "en";
  const copy = UI_COPY_BY_LOCALE[resolvedLocale] ?? UI_COPY_BY_LOCALE.en;

  if (!game) {
    return null;
  }

  const ActiveGame = GAME_COMPONENTS[game.id];
  const localizedHints = CONTROL_HINTS_BY_LOCALE[resolvedLocale] ?? CONTROL_HINTS_BY_LOCALE.es;
  const controlHint = localizedHints[game.id] ?? CONTROL_HINTS_BY_LOCALE.es[game.id];

  return (
    <section className="game-playground">
      <div className="playground-header">
        <h3>{copy.playNow}</h3>
        <p>
          {copy.readyMode}{" "}
          <strong>{game.category}</strong>.
        </p>
        {controlHint ? <p className="control-hint">{controlHint}</p> : null}
      </div>

      {ActiveGame ? (
        <Suspense fallback={<p className="unsupported-game">{copy.loading}</p>}>
          <ActiveGame />
        </Suspense>
      ) : (
        <p className="unsupported-game">
          {copy.unsupported}
        </p>
      )}
    </section>
  );
}

export default GamePlayground;
