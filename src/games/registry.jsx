/**
 * Game Registry
 * ─────────────────────────────────────────────────────────────────────────────
 * Central registry that maps game IDs to their React components.
 *
 * ADDING A NEW GAME
 * 1. Create your game component under src/games/{category}/{game-id}/index.jsx
 * 2. Import it here (use lazy() for heavy engines to keep the initial bundle small)
 * 3. Add an entry to GAME_REGISTRY: "your-game-id": YourGameComponent
 * 4. Add the game metadata to src/data/games.js
 * 5. Add control hint strings to CONTROL_HINTS_BY_LOCALE below
 *
 * FOLDER CONVENTION FOR NEW GAMES
 * src/games/
 *   {category}/            e.g. action/, adventure/, arcade/, …
 *     {game-id}/
 *       index.jsx          main component (default export)
 *       engine.js          optional: game logic / canvas engine
 *       assets/            optional: sprites, sounds specific to this game
 */

import React, { lazy } from "react";
import AdventureGame from "./AdventureGame";
import ActionGame from "./ActionGame";
import RacingGame from "./RacingGame";
import KnowledgeGame from "./KnowledgeGame";
import KnowledgeArcadeGame from "./KnowledgeArcadeGame";
import RpgGame from "./RpgGame";
import HeadSoccerGame from "./HeadSoccerGame";
import PacmanGame from "./PacmanGame";
import PongGame from "./PongGame";
import MinesweeperGame from "./MinesweeperGame";
import ChessGame from "./ChessGame";
import CheckersGame from "./CheckersGame";
import DominoStrategyGame from "./DominoStrategyGame";
import StrategySudokuGame from "./StrategySudokuGame";
import PokerTexasHoldemGame from "./PokerTexasHoldemGame";
import ParchisStrategyGame from "./ParchisStrategyGame";
import StrategyBarajaModesGame from "./StrategyBarajaModesGame";
import RaceGame2DPro from "./RaceGame2DPro";
import SunsetSlipstream from "./racing/midnight-traffic";

// Heavy engines use lazy() to keep initial bundle small
const PlatformerGame = lazy(() => import("./PlatformerGame"));
const FighterGame = lazy(() => import("./FighterGame"));
const BilliardsGame = lazy(() => import("./arcade/billiards-club"));
const BowlingGame = lazy(() => import("./arcade/bowling-pro"));
const PenaltyNeuralKeeperGame = lazy(() => import("./arcade/penalty-neural-keeper"));
const CosmicVanguardGame = lazy(() => import("./arcade/cosmic-vanguard"));
const OrchardMatchBlastGame = lazy(() => import("./arcade/orchard-match-blast"));
const ReactorTossGame = lazy(() => import("./arcade/reactor-toss"));
const WikipediaGachaGame = lazy(() => import("./knowledge/wikipedia-gacha"));

// KnowledgeArcadeGame variants
const KnowledgeSudokuGame    = () => <KnowledgeArcadeGame variant="sudoku" />;
const KnowledgeAhorcadoGame  = () => <KnowledgeArcadeGame variant="ahorcado" />;
const KnowledgePacienciaGame = () => <KnowledgeArcadeGame variant="paciencia" />;
const KnowledgePuzleGame     = () => <KnowledgeArcadeGame variant="puzle" />;
const KnowledgeCrucigramaGame  = () => <KnowledgeArcadeGame variant="crucigrama" />;
const KnowledgeSopaLetrasGame  = () => <KnowledgeArcadeGame variant="sopa-letras" />;
const KnowledgeWordleGame      = () => <KnowledgeArcadeGame variant="wordle" />;
const KnowledgeAnagramasGame   = () => <KnowledgeArcadeGame variant="anagramas" />;
const KnowledgeCalculoMentalGame = () => <KnowledgeArcadeGame variant="calculo-mental" />;
const KnowledgeTablaPeriodicaGame = () => <KnowledgeArcadeGame variant="tabla-periodica" />;
const KnowledgeMapasGame = () => <KnowledgeArcadeGame variant="mapas" />;
const KnowledgeMapasCaminoCortoGame = () => <KnowledgeArcadeGame variant="mapas-camino-corto" />;
const KnowledgeAdivinaPaisGame = () => <KnowledgeArcadeGame variant="adivina-pais" />;
const KnowledgeRefranesGame = () => <KnowledgeArcadeGame variant="refranes" />;

// ─── Registry ─────────────────────────────────────────────────────────────
export const GAME_REGISTRY = {
  "adventure-echoes":            AdventureGame,
  "action-core-strike":          ActionGame,
  "racing-neon-lanes":           RacingGame,
  "knowledge-quiz-nexus":        KnowledgeGame,
  "knowledge-logic-vault":       KnowledgeGame,
  "knowledge-refranes-clasicos": KnowledgeRefranesGame,
  "knowledge-wikipedia-gacha":   WikipediaGachaGame,
  "knowledge-sudoku-sprint":     KnowledgeSudokuGame,
  "knowledge-domino-chain":      DominoStrategyGame,
  "knowledge-ahorcado-flash":    KnowledgeAhorcadoGame,
  "knowledge-paciencia-lite":    KnowledgePacienciaGame,
  "knowledge-puzle-deslizante":  KnowledgePuzleGame,
  "knowledge-crucigrama-mini":   KnowledgeCrucigramaGame,
  "knowledge-sopa-letras-mega":  KnowledgeSopaLetrasGame,
  "knowledge-wordle-pro":        KnowledgeWordleGame,
  "knowledge-anagramas-pro":     KnowledgeAnagramasGame,
  "knowledge-calculo-mental-flash10": KnowledgeCalculoMentalGame,
  "knowledge-tabla-periodica-total": KnowledgeTablaPeriodicaGame,
  "knowledge-mapas-atlas":       KnowledgeMapasGame,
  "knowledge-mapas-camino-corto": KnowledgeMapasCaminoCortoGame,
  "knowledge-adivina-pais-silueta": KnowledgeAdivinaPaisGame,
  "strategy-chess-grandmaster":  ChessGame,
  "strategy-damas-clasicas":     CheckersGame,
  "strategy-sudoku-tecnicas":    StrategySudokuGame,
  "strategy-poker-holdem-no-bet": PokerTexasHoldemGame,
  "strategy-parchis-ludoteka":   ParchisStrategyGame,
  "strategy-baraja-ia-arena":    StrategyBarajaModesGame,
  "rpg-emberfall":               RpgGame,
  "platformer-sky-runner":       PlatformerGame,
  "fighter-neon-dojo":           FighterGame,
  "sports-head-soccer-arena":    HeadSoccerGame,
  "arcade-pacman-maze-protocol": PacmanGame,
  "arcade-reactor-toss":         ReactorTossGame,
  "arcade-orchard-match-blast": OrchardMatchBlastGame,
  "arcade-billar-pool-club":     BilliardsGame,
  "arcade-bowling-pro-tour":     BowlingGame,
  "arcade-penalty-neural-keeper": PenaltyNeuralKeeperGame,
  "arcade-cosmic-vanguard":      CosmicVanguardGame,
  "arcade-pong-neon-arena":      PongGame,
  "arcade-buscaminas-classic":   MinesweeperGame,
  "racing-race2dpro":            RaceGame2DPro,
  "racing-sunset-slipstream":    SunsetSlipstream,
};

export function getGameComponent(gameId) {
  return GAME_REGISTRY[gameId] ?? null;
}

// ─── Control hints (bilingual) ────────────────────────────────────────────
export const CONTROL_HINTS_BY_LOCALE = {
  es: {
    "adventure-echoes":            "WASD/flechas para moverse. Buscar, escanear, raciones, baliza y salto táctico (B).",
    "action-core-strike":          "WASD/flechas para moverse. Ráfaga, cohete, overdrive, defensa y botiquín por rondas.",
    "racing-neon-lanes":           "Izq/der cambia carril, arriba/abajo velocidad, espacio turbo, I item.",
    "knowledge-quiz-nexus":        "Selecciona respuesta por botón y avanza al bloquear la pregunta.",
    "knowledge-logic-vault":       "Selecciona respuesta por botón y avanza al bloquear la pregunta.",
    "knowledge-refranes-clasicos": "5 rondas: lee el inicio del refran, escribe la continuacion y valida con Enter. N pasa a la siguiente ronda ya revisada y R reinicia.",
    "knowledge-wikipedia-gacha":   "Gacha de articulos: 1 Home, 2 Packs, 3 Collection, 4 Missions, 5 Trophies. Espacio/Enter abre sobre en Open Pack, R sincroniza y Esc cierra detalle.",
    "knowledge-sudoku-sprint":     "Flechas para navegar, 1-4 / A/S/D/F para rellenar, Backspace borra, R partida aleatoria.",
    "knowledge-domino-chain":      "Domino 4P por parejas: izq/der elige ficha, arriba/abajo extremo, Enter juega, P pasa, N avanza ronda, R reinicia.",
    "knowledge-ahorcado-flash":    "Escribe letras para adivinar; Enter o botón para nueva partida.",
    "knowledge-paciencia-lite":    "D roba, A descarte, Q/W/E/R columnas, flechas destino, Enter/Espacio mueve, P nueva partida.",
    "knowledge-puzle-deslizante":  "Flechas mueven el hueco o pulsa fichas adyacentes. R para nueva partida.",
    "knowledge-crucigrama-mini":   "Flechas navegan, letras escriben, Backspace borra, Enter comprueba, botón nueva partida.",
    "knowledge-sopa-letras-mega":  "Arrastra o marca inicio-fin en horizontal, vertical o diagonal (también al revés). R nueva partida.",
    "knowledge-wordle-pro":        "Wordle ES/EN con 10k palabras por idioma. Escribe letras, Enter valida, Backspace borra y usa el boton de partida aleatoria.",
    "knowledge-anagramas-pro":     "Anagramas ES/EN con 10k palabras por idioma. Escribe con las mismas letras, Enter valida, M mezcla y usa el boton de partida aleatoria.",
    "knowledge-calculo-mental-flash10": "10 rondas en 40s: escribe resultado, Enter valida y R reinicia.",
    "knowledge-tabla-periodica-total": "Tabla periodica vacia: flechas mueven casilla, simbolo/nombre + Enter valida, N siguiente pendiente, R reinicia.",
    "knowledge-mapas-atlas":       "Elige escala (mundo/continente/pais/ciudades), escribe nombres geograficos y valida con Enter. R reinicia el mapa y N carga uno aleatorio.",
    "knowledge-mapas-camino-corto": "Modo paises/provincias: selecciona continente o pais, escribe vecino, Enter valida, verde ideal, naranja alternativa, R reinicia y N nueva ruta.",
    "knowledge-adivina-pais-silueta": "5 rondas: identifica la silueta escribiendo el pais y valida con Enter. Recomendados en vivo por letras; N avanza ronda ya validada y R reinicia.",
    "strategy-chess-grandmaster":  "Clic para mover, U deshace, D reclama tablas, F pantalla completa.",
    "strategy-damas-clasicas":     "Damas 8x8: clic para mover en diagonal, capturas encadenadas, U deshace, X retiro, R reinicia y F pantalla completa.",
    "strategy-sudoku-tecnicas":    "Sudoku 9x9: flechas para mover, 1-9 o QWE/ASD/UIO para escribir, Backspace borra, P aplica pista y R partida aleatoria.",
    "strategy-poker-holdem-no-bet": "Poker clasico 5 cartas con apuestas: ciegas, bote y acciones de pasar/igualar/subir/all-in/retirarse. Enter resolver accion principal, U subir, A all-in, F retirarse, 1-5 seleccionar descarte, D descartar, S servirse, N siguiente mano, R reiniciar.",
    "strategy-parchis-ludoteka":  "S/Enter inicia partida, R/Enter/Space tira dado, 1..9 elige jugada, Enter primera jugada, X continua sin jugada y N nueva partida.",
    "strategy-baraja-ia-arena":   "Modo baraja con Brisca/Tute, Mus y Escoba: cambia modalidad arriba. Mus permite 2/4/6 jugadores IA+tu. Escoba usa baraja espanola si el navegador es* y baraja inglesa adaptada en otros idiomas. Marca cartas de mesa y juega para sumar 15. Brisca usa click/1-3; Mus usa M/X + 1-4; Escoba usa click + 1-3. N siguiente mano, R reinicio.",
    "rpg-emberfall":               "WASD/flechas para explorar. Atacar, habilidad, defender, enfocar, invocar (U) y poción.",
    "platformer-sky-runner":       "A/D o flechas para moverse, W/arriba/espacio para saltar, F accion, con springs, viento y checkpoints.",
    "fighter-neon-dojo":           "A/D moverse, W saltar, J jab, K heavy, L guardia, U/B especial.",
    "sports-head-soccer-arena":    "A/D o izq/der mover, arriba/W saltar, mantener Espacio para cargar y soltar para disparar, Enter iniciar, R reiniciar, P pausa.",
    "arcade-reactor-toss": "Touch/raton: tira hacia atras desde la orbita y suelta. Flechas o A/D apuntan, W/S ajustan potencia, Enter/Espacio lanza, P pausa, R reinicia, L selecciona nivel, M audio y F pantalla completa.",
    "arcade-orchard-match-blast": "Match-3 original: intercambia dos bloques de color adyacentes. Flechas mueven cursor, Enter/Espacio confirma, H pista, S mezcla, B Bloom, R reinicia y F pantalla completa.",
    "arcade-billar-pool-club":     "Raton opcional para apuntar, A/D afinan angulo, W/S potencia, Space tira, O push out, V safety, 1/2 decisiones, flechas/WASD mueven la blanca en mano, Enter/Space confirma, P autocoloca y F pantalla completa.",
    "arcade-bowling-pro-tour":     "A/D ajustan linea, W/S potencia, Q/E efecto y Enter/Espacio lanza. R reinicia serie y F pantalla completa.",
    "arcade-penalty-neural-keeper": "Tanda de 10 penaltis: elige zona con 1-5 (abajo izq/der, arriba izq/der, centro). R reinicia y F pantalla completa.",
    "arcade-cosmic-vanguard":      "A/D o izq/der rotan, W impulsa, S frena, Shift boost, Espacio dispara, E/X pulso EMP, P pausa, R reinicia y F pantalla completa. Las pasadas al limite cargan Vanguard Drive.",
    "arcade-pacman-maze-protocol": "WASD/flechas mover, Enter/Espacio empezar, P/Esc pausa, R reinicia, M sonido.",
    "arcade-pong-neon-arena":      "W/S o flechas arriba/abajo para mover vertical. A/D o flechas izq/der para avanzar o retroceder (sin cruzar el centro). Ratón también controla vertical. Enter/Espacio empezar, P pausa, R reinicia, M sonido, F pantalla completa.",
    "arcade-buscaminas-classic":   "Click izq abre, click der o pulsación larga marca bandera. Flechas mueven cursor, Enter/Espacio abre, F marca, H sugiere IA, A ejecuta IA y R reinicia. En competitivo puntúan celdas y tiempo.",
    "racing-race2dpro":            "Arriba/abajo acelerar/frenar, izq/der girar. Móvil: joystick táctil izq. + botones der. R reinicia.",
    "racing-sunset-slipstream":    "Izq/der maniobra, arriba acelera, abajo enfria el ritmo, Espacio activa focus y R reinicia.",
  },
  en: {
    "adventure-echoes":            "WASD/arrows to move. Search, scan, rations, beacon and tactical jump (B).",
    "action-core-strike":          "WASD/arrows to move. Burst, rocket, overdrive, defense and medkit across rounds.",
    "racing-neon-lanes":           "Left/right changes lane, up/down speed, space turbo, I item.",
    "knowledge-quiz-nexus":        "Select an answer button and advance after locking the question.",
    "knowledge-logic-vault":       "Select an answer button and advance after locking the question.",
    "knowledge-refranes-clasicos": "5 rounds: read the proverb opening, type the continuation, and press Enter to check. N advances reviewed rounds and R restarts.",
    "knowledge-wikipedia-gacha":   "Article gacha: 1 Home, 2 Packs, 3 Collection, 4 Missions, 5 Trophies. Space/Enter opens a pack in Open Pack, R syncs, Esc closes details.",
    "knowledge-sudoku-sprint":     "Arrows to navigate, 1-4 / A/S/D/F to fill, Backspace clears, R random match.",
    "knowledge-domino-chain":      "4-player team domino: left/right chooses tile, up/down edge, Enter plays, P passes, N advances round, R restarts.",
    "knowledge-ahorcado-flash":    "Type letters to guess; Enter or button for a new word.",
    "knowledge-paciencia-lite":    "D draws, A waste, Q/W/E/R columns, arrows change target, Enter/Space moves, P new match.",
    "knowledge-puzle-deslizante":  "Arrows move the blank or click adjacent tiles. R for a new match.",
    "knowledge-crucigrama-mini":   "Arrows navigate, letters type, Backspace clears, Enter checks, button for new puzzle.",
    "knowledge-sopa-letras-mega":  "Drag or click start-end horizontally, vertically or diagonally (reverse also works). R new match.",
    "knowledge-wordle-pro":        "Wordle ES/EN with 10k words per locale. Type letters, Enter submits, Backspace deletes and use the random-match button.",
    "knowledge-anagramas-pro":     "Anagrams ES/EN with 10k words per locale. Type with the same letters, Enter submits, M shuffles and use the random-match button.",
    "knowledge-calculo-mental-flash10": "10 rounds in 40s: type the result, Enter submits, and R restarts.",
    "knowledge-tabla-periodica-total": "Empty periodic table: arrows move cells, symbol/name + Enter checks, N next pending, R restart.",
    "knowledge-mapas-atlas":       "Choose scope (world/continent/country/cities), type geographic names and submit with Enter. R restarts and N loads a random map.",
    "knowledge-mapas-camino-corto": "Countries/provinces mode: pick continent or country, type next neighbor, Enter checks, green ideal, orange alternative, R restart, N new route.",
    "knowledge-adivina-pais-silueta": "5 rounds: identify each silhouette by typing the country and pressing Enter. Live recommendations update by letters; N advances checked rounds and R restarts.",
    "strategy-chess-grandmaster":  "Click to move, U undo, D claim draw, F fullscreen.",
    "strategy-damas-clasicas":     "8x8 checkers: click to move diagonally, chain captures, U undo, X resign, R restart and F fullscreen.",
    "strategy-sudoku-tecnicas":    "Sudoku 9x9: arrows move, 1-9 or QWE/ASD/UIO types values, Backspace clears, P applies hint, and R starts a random match.",
    "strategy-poker-holdem-no-bet": "Classic 5-card draw with betting: blinds, real pot and check/call/raise/all-in/fold decisions. Enter resolves main action, U raise, A all-in, F fold, 1-5 select discard, D discard, S stand pat, N next hand, R restart.",
    "strategy-parchis-ludoteka":  "S/Enter starts the match, R/Enter/Space rolls the die, 1..9 picks a move, Enter first move, X continues without move, and N starts a new match.",
    "strategy-baraja-ia-arena":   "Card-table mode with Brisca/Tute, Mus, and Escoba: switch mode at the top. Mus supports 2/4/6 players. Escoba uses the Spanish deck when browser locale starts with es, and adapted English deck otherwise. Mark table cards and play to sum 15. Brisca uses click/1-3; Mus uses M/X + 1-4; Escoba uses click + 1-3. N next hand, R restart.",
    "rpg-emberfall":               "WASD/arrows to explore. Attack, skill, defend, focus, summon (U) and potion.",
    "platformer-sky-runner":       "A/D or arrows to move, W/up/space to jump, F action, with springs, wind and checkpoints.",
    "fighter-neon-dojo":           "A/D move, W jump, J jab, K heavy, L guard, U/B special.",
    "sports-head-soccer-arena":    "A/D or left/right move, up/W jump, hold Space to charge and release to shoot, Enter start, R restart, P pause.",
    "arcade-reactor-toss": "Touch/mouse: pull back from the orb and release. Arrows or A/D aim, W/S tune power, Enter/Space launches, P pauses, R restarts, L opens level select, M audio, and F fullscreen.",
    "arcade-orchard-match-blast": "Original match-3: swap two adjacent cells. Arrows move cursor, Enter/Space confirms, H hint, S shuffle, R restart, and F toggles fullscreen.",
    "arcade-billar-pool-club":     "Mouse aiming is optional: A/D fine tune angle, W/S power, Space shoots, O push out, V safety, 1/2 decisions, arrows/WASD move cue ball in hand, Enter/Space confirms, P auto-places, and F toggles fullscreen.",
    "arcade-bowling-pro-tour":     "A/D adjust line, W/S power, Q/E spin, Enter/Space throw. R restarts the series and F toggles fullscreen.",
    "arcade-penalty-neural-keeper": "10-penalty shootout: pick zones with 1-5 (bottom left/right, top left/right, center). R restarts and F toggles fullscreen.",
    "arcade-cosmic-vanguard":      "A/D or left/right rotate, W thrusts, S brakes, Shift boosts, Space fires, E/X triggers EMP pulse, P pauses, R restarts, and F toggles fullscreen. Close passes charge Vanguard Drive.",
    "arcade-pacman-maze-protocol": "WASD/arrows move, Enter/Space start, P/Esc pause, R restart, M sound.",
    "arcade-pong-neon-arena":      "W/S or up/down arrows for vertical. A/D or left/right arrows to advance or retreat (cannot cross centre line). Mouse also controls vertical. Enter/Space start, P pause, R restart, M sound, F fullscreen.",
    "arcade-buscaminas-classic":   "Left click reveals, right click or long press marks. Arrows move cursor, Enter/Space reveals, F marks, H asks AI hint, A runs AI move, R restarts. Competitive mode scores cells and time.",
    "racing-race2dpro":            "Up/down throttle/brake, left/right steer. Mobile: left touch joystick + right buttons. R restart.",
    "racing-sunset-slipstream":    "Left/right steers, up accelerates, down cools the pace, Space activates focus, and R restarts.",
  },
};

