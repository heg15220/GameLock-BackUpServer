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
import { withStrategyIntro } from "./strategy/StrategyIntroGate";

// Keep the launch shell lean: every game component loads on demand.
const AdventureGame = lazy(() => import("./AdventureGame"));
const ActionGame = lazy(() => import("./ActionGame"));
const RacingGame = lazy(() => import("./RacingGame"));
const KnowledgeArcadeGame = lazy(() => import("./KnowledgeArcadeGame"));
const RpgGame = lazy(() => import("./RpgGame"));
const HeadSoccerGame = lazy(() => import("./HeadSoccerGame"));
const PacmanGame = lazy(() => import("./PacmanGame"));
const PongGame = lazy(() => import("./PongGame"));
const MinesweeperGame = lazy(() => import("./MinesweeperGame"));
const ChessGame = lazy(() => import("./ChessGame"));
const CheckersGame = lazy(() => import("./CheckersGame"));
const DominoStrategyGame = lazy(() => import("./DominoStrategyGame"));
const StrategySudokuGame = lazy(() => import("./StrategySudokuGame"));
const StrategyBattleshipGame = lazy(() => import("./StrategyBattleshipGame"));
const PokerTexasHoldemGame = lazy(() => import("./PokerTexasHoldemGame"));
const ParchisStrategyGame = lazy(() => import("./ParchisStrategyGame"));
const StrategyBarajaModesGame = lazy(() => import("./StrategyBarajaModesGame"));
const StrategyMansionTripleEnigmaGame = lazy(() => import("./StrategyMansionTripleEnigmaGame"));
const RaceGame2DPro = lazy(() => import("./RaceGame2DPro"));
const SunsetSlipstream = lazy(() => import("./racing/midnight-traffic"));
const KnowledgeGame = lazy(() => import("./KnowledgeGame"));
const PlatformerGame = lazy(() => import("./PlatformerGame"));
const FighterGame = lazy(() => import("./FighterGame"));
const BilliardsGame = lazy(() => import("./arcade/billiards-club"));
const BowlingGame = lazy(() => import("./arcade/bowling-pro"));
const PenaltyNeuralKeeperGame = lazy(() => import("./arcade/penalty-neural-keeper"));
const CosmicVanguardGame = lazy(() => import("./arcade/cosmic-vanguard"));
const OrchardMatchBlastGame = lazy(() => import("./arcade/orchard-match-blast"));
const ReactorTossGame = lazy(() => import("./arcade/reactor-toss"));
const TerritoryWarGame = lazy(() => import("./arcade/territory-war"));
const GolfTour2DGame = lazy(() => import("./arcade/golf-tour-2d"));
const ArcheryHorizonGame = lazy(() => import("./arcade/archery-horizon"));
const PinballWizardGame = lazy(() => import("./arcade/pinball-wizard"));
const BubbleStormGame = lazy(() => import("./arcade/bubble-storm"));
const BasketballCourtGame = lazy(() => import("./arcade/basketball-court"));
const PingPongArenaGame = lazy(() => import("./arcade/ping-pong-arena"));
const PadelArenaGame = lazy(() => import("./sports/padel-arena"));
const ShellGameGame = lazy(() => import("./arcade/shell-game"));
const PulsoExactoGame = lazy(() => import("./arcade/pulso-exacto"));
const DistanciaJustaGame = lazy(() => import("./arcade/distancia-justa"));
const TerrorZombiGame = lazy(() => import("./arcade/terror-zombi"));
const BrileGame = lazy(() => import("./arcade/brile"));
const ToposMazazosGame = lazy(() => import("./arcade/topos-mazazos"));
const IceStrikeProGame = lazy(() => import("./arcade/ice-strike-pro"));
const StickBrawlShowdownGame = lazy(() => import("./arcade/stick-brawl-showdown"));
const NeonCryptGame = lazy(() => import("./arcade/neon-crypt"));
const NeonRushGame = lazy(() => import("./arcade/neon-rush"));
const ValleTranquiloGame = lazy(() => import("./arcade/valle-tranquilo"));
const DigHoleTreasureGame = lazy(() => import("./arcade/dig-hole-treasure"));
const SummitAscentGame = lazy(() => import("./arcade/summit-ascent"));
const WikipediaGachaGame = lazy(() => import("./knowledge/wikipedia-gacha"));
const RetroClassicsGame = lazy(() => import("./arcade/retro-classics"));

// KnowledgeArcadeGame variants
const KnowledgeSudokuGame    = () => <KnowledgeArcadeGame variant="sudoku" />;
const KnowledgeAhorcadoGame  = () => <KnowledgeArcadeGame variant="ahorcado" />;
const KnowledgePacienciaGame = () => <KnowledgeArcadeGame variant="paciencia" />;
const KnowledgePuzleGame     = () => <KnowledgeArcadeGame variant="puzle" />;
const KnowledgeCrucigramaGame  = () => <KnowledgeArcadeGame variant="crucigrama" />;
const KnowledgePasapalabraGame = () => <KnowledgeArcadeGame variant="pasapalabra" />;
const KnowledgeSopaLetrasGame  = () => <KnowledgeArcadeGame variant="sopa-letras" />;
const KnowledgeWordleGame      = () => <KnowledgeArcadeGame variant="wordle" />;
const KnowledgeAnagramasGame   = () => <KnowledgeArcadeGame variant="anagramas" />;
const KnowledgeCalculoMentalGame = () => <KnowledgeArcadeGame variant="calculo-mental" />;
const KnowledgeTablaPeriodicaGame = () => <KnowledgeArcadeGame variant="tabla-periodica" />;
const KnowledgeMapasGame = () => <KnowledgeArcadeGame variant="mapas" />;
const KnowledgeMapasCaminoCortoGame = () => <KnowledgeArcadeGame variant="mapas-camino-corto" />;
const KnowledgeAdivinaPaisGame = () => <KnowledgeArcadeGame variant="adivina-pais" />;
const KnowledgeRefranesGame = () => <KnowledgeArcadeGame variant="refranes" />;
const KnowledgeCronologiaGame = () => <KnowledgeArcadeGame variant="cronologia" />;
const KnowledgeTangramGame = () => <KnowledgeArcadeGame variant="tangram" />;
const KnowledgeIQMastersGame = () => <KnowledgeArcadeGame variant="iq-masters" />;
const ArcadeSnakeClassicGame = () => <RetroClassicsGame variant="snake-classic" />;
const ArcadeBreakout1986Game = () => <RetroClassicsGame variant="breakout-1986" />;
const ArcadeSpaceInvadersGame = () => <RetroClassicsGame variant="space-invaders" />;
const ArcadeTetrisBlockfallGame = () => <RetroClassicsGame variant="tetris-blockfall" />;
const ArcadeFroggerCrossingGame = () => <RetroClassicsGame variant="frogger-crossing" />;
const ArcadeBomberGridGame = () => <RetroClassicsGame variant="bomber-grid" />;
const ArcadeGalagaQuantumGame = () => <RetroClassicsGame variant="galaga-quantum" />;
const ArcadeQbertPrismGame = () => <RetroClassicsGame variant="qbert-prism" />;
const ArcadeLunarLanderOrbitGame = () => <RetroClassicsGame variant="lunar-lander-orbit" />;
const ArcadeCentipedeCircuitGame = () => <RetroClassicsGame variant="centipede-circuit" />;
const ArcadeRiverRaidNeonGame = () => <RetroClassicsGame variant="river-raid-neon" />;
const ArcadeTronLightcyclesGame = () => <RetroClassicsGame variant="tron-lightcycles" />;
const ArcadeRoadFighterSynthGame = () => <RetroClassicsGame variant="road-fighter-synth" />;

// ─── Registry ─────────────────────────────────────────────────────────────
export const GAME_REGISTRY = {
  "adventure-echoes":            AdventureGame,
  "action-core-strike":          ActionGame,
  "racing-neon-lanes":           RacingGame,
  "knowledge-quiz-nexus":        KnowledgeGame,
  "knowledge-logic-vault":       KnowledgeGame,
  "knowledge-iq-masters-protocol": KnowledgeIQMastersGame,
  "knowledge-refranes-clasicos": KnowledgeRefranesGame,
  "knowledge-wikipedia-gacha":   WikipediaGachaGame,
  "knowledge-sudoku-sprint":     KnowledgeSudokuGame,
  "knowledge-domino-chain":      DominoStrategyGame,
  "knowledge-ahorcado-flash":    KnowledgeAhorcadoGame,
  "knowledge-paciencia-lite":    KnowledgePacienciaGame,
  "knowledge-puzle-deslizante":  KnowledgePuzleGame,
  "knowledge-crucigrama-mini":   KnowledgeCrucigramaGame,
  "knowledge-pasapalabra-rondo": KnowledgePasapalabraGame,
  "knowledge-sopa-letras-mega":  KnowledgeSopaLetrasGame,
  "knowledge-wordle-pro":        KnowledgeWordleGame,
  "knowledge-anagramas-pro":     KnowledgeAnagramasGame,
  "knowledge-calculo-mental-flash10": KnowledgeCalculoMentalGame,
  "knowledge-tabla-periodica-total": KnowledgeTablaPeriodicaGame,
  "knowledge-mapas-atlas":       KnowledgeMapasGame,
  "knowledge-mapas-camino-corto": KnowledgeMapasCaminoCortoGame,
  "knowledge-adivina-pais-silueta": KnowledgeAdivinaPaisGame,
  "knowledge-tangram-pro": KnowledgeTangramGame,
  "knowledge-cronologia-maestra": KnowledgeCronologiaGame,
  "strategy-chess-grandmaster":  withStrategyIntro("strategy-chess-grandmaster", ChessGame),
  "strategy-damas-clasicas":     withStrategyIntro("strategy-damas-clasicas", CheckersGame),
  "strategy-sudoku-tecnicas":    withStrategyIntro("strategy-sudoku-tecnicas", StrategySudokuGame),
  "strategy-hundir-flota-pro":   withStrategyIntro("strategy-hundir-flota-pro", StrategyBattleshipGame),
  "strategy-poker-holdem-no-bet": withStrategyIntro("strategy-poker-holdem-no-bet", PokerTexasHoldemGame),
  "strategy-parchis-ludoteka":   withStrategyIntro("strategy-parchis-ludoteka", ParchisStrategyGame),
  "strategy-baraja-ia-arena":    withStrategyIntro("strategy-baraja-ia-arena", StrategyBarajaModesGame),
  "strategy-mansion-triple-enigma": withStrategyIntro("strategy-mansion-triple-enigma", StrategyMansionTripleEnigmaGame),
  "rpg-emberfall":               RpgGame,
  "platformer-sky-runner":       PlatformerGame,
  "fighter-neon-dojo":           FighterGame,
  "sports-head-soccer-arena":    HeadSoccerGame,
  "arcade-pacman-maze-protocol": PacmanGame,
  "arcade-reactor-toss":         ReactorTossGame,
  "arcade-territory-war":        TerritoryWarGame,
  "arcade-orchard-match-blast": OrchardMatchBlastGame,
  "arcade-billar-pool-club":     BilliardsGame,
  "arcade-bowling-pro-tour":     BowlingGame,
  "arcade-penalty-neural-keeper": PenaltyNeuralKeeperGame,
  "arcade-cosmic-vanguard":      CosmicVanguardGame,
  "arcade-golf-tour-2d":         GolfTour2DGame,
  "arcade-archery-horizon":      ArcheryHorizonGame,
  "arcade-pinball-wizard":       PinballWizardGame,
  "arcade-bubble-storm":         BubbleStormGame,
  "arcade-ice-strike-pro":       IceStrikeProGame,
  "arcade-stick-brawl-showdown": StickBrawlShowdownGame,
  "arcade-neon-crypt":           NeonCryptGame,
  "arcade-neon-rush":            NeonRushGame,
  "arcade-dig-hole-treasure":    withStrategyIntro("arcade-dig-hole-treasure", DigHoleTreasureGame),
  "arcade-summit-ascent":        SummitAscentGame,
  "arcade-valle-tranquilo":      ValleTranquiloGame,
  "sports-basketball-court":     BasketballCourtGame,
  "sports-ping-pong-arena":      PingPongArenaGame,
  "sports-padel-arena":          PadelArenaGame,
  "arcade-shell-game":           ShellGameGame,
  "arcade-pulso-exacto":         PulsoExactoGame,
  "arcade-distancia-justa":      DistanciaJustaGame,
  "arcade-terror-zombi":         TerrorZombiGame,
  "arcade-brile":                BrileGame,
  "arcade-topos-mazazos":        ToposMazazosGame,
  "arcade-pong-neon-arena":      PongGame,
  "arcade-buscaminas-classic":   MinesweeperGame,
  "arcade-retro-snake-classic":  ArcadeSnakeClassicGame,
  "arcade-retro-breakout-1986":  ArcadeBreakout1986Game,
  "arcade-retro-space-invaders": ArcadeSpaceInvadersGame,
  "arcade-retro-tetris-blockfall": ArcadeTetrisBlockfallGame,
  "arcade-retro-frogger-crossing": ArcadeFroggerCrossingGame,
  "arcade-retro-bomber-grid":    ArcadeBomberGridGame,
  "arcade-retro-galaga-quantum": ArcadeGalagaQuantumGame,
  "arcade-retro-qbert-prism": ArcadeQbertPrismGame,
  "arcade-retro-lunar-lander-orbit": ArcadeLunarLanderOrbitGame,
  "arcade-retro-centipede-circuit": ArcadeCentipedeCircuitGame,
  "arcade-retro-river-raid-neon": ArcadeRiverRaidNeonGame,
  "arcade-retro-tron-lightcycles": ArcadeTronLightcyclesGame,
  "arcade-retro-road-fighter-synth": ArcadeRoadFighterSynthGame,
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
    "knowledge-iq-masters-protocol": "Figura single-line: click/tap en nodos o arrastre para trazar. R reinicia, Z deshace, H pista y N siguiente nivel al completar.",
    "knowledge-refranes-clasicos": "5 rondas: lee el inicio del refran, escribe la continuacion y valida con Enter. N pasa a la siguiente ronda ya revisada y R reinicia.",
    "knowledge-wikipedia-gacha":   "Gacha de articulos: 1 Home, 2 Packs, 3 Collection, 4 Missions, 5 Trophies. Espacio/Enter abre sobre en Open Pack, R sincroniza y Esc cierra detalle.",
    "knowledge-sudoku-sprint":     "Flechas para navegar, 1-4 / A/S/D/F para rellenar, Backspace borra, R partida aleatoria.",
    "knowledge-domino-chain":      "Domino 4P por parejas: izq/der elige ficha, arriba/abajo extremo, Enter juega, P pasa, N avanza ronda, R reinicia.",
    "knowledge-ahorcado-flash":    "Escribe letras para adivinar; Enter o botón para nueva partida.",
    "knowledge-paciencia-lite":    "Klondike completo (52 cartas, 4 palos): arrastra o pulsa para mover. Doble click envía a fundación. D roba/recicla, F auto-fundación, P nueva partida, Esc deselecciona.",
    "knowledge-puzle-deslizante":  "Flechas mueven el hueco o pulsa fichas adyacentes. R para nueva partida.",
    "knowledge-crucigrama-mini":   "Flechas navegan, letras escriben, Backspace borra, Enter comprueba, botón nueva partida.",
    "knowledge-sopa-letras-mega":  "Arrastra o marca inicio-fin en horizontal, vertical o diagonal (también al revés). R nueva partida.",
    "knowledge-pasapalabra-rondo": "Rosco A-Z con 10k partidas por idioma: escribe respuesta, Enter valida, Espacio pasa palabra y R nueva partida.",
    "knowledge-wordle-pro":        "Wordle ES/EN con 10k palabras por idioma. Escribe letras, Enter valida, Backspace borra y usa el boton de partida aleatoria.",
    "knowledge-anagramas-pro":     "Anagramas ES/EN con 10k palabras por idioma. Escribe con las mismas letras, Enter valida, M mezcla y usa el boton de partida aleatoria.",
    "knowledge-calculo-mental-flash10": "10 rondas en 40s: escribe resultado, Enter valida y R reinicia.",
    "knowledge-tabla-periodica-total": "Tabla periodica vacia: flechas mueven casilla, simbolo/nombre + Enter valida, N siguiente pendiente, R reinicia.",
    "knowledge-mapas-atlas":       "Elige escala (mundo/continente/pais/ciudades), escribe nombres geograficos y valida con Enter. R reinicia el mapa y N carga uno aleatorio.",
    "knowledge-mapas-camino-corto": "Modo paises/provincias: selecciona continente o pais, escribe vecino, Enter valida, verde ideal, naranja alternativa, R reinicia y N nueva ruta.",
    "knowledge-adivina-pais-silueta": "5 rondas: identifica la silueta escribiendo el pais y valida con Enter. Recomendados en vivo por letras; N avanza ronda ya validada y R reinicia.",
    "knowledge-tangram-pro": "Tangram de 7 tans: arrastra piezas, Q/E rota 45 grados, F voltea el paralelogramo, Enter intenta encajar, H alterna guia, R reinicia y N nueva silueta.",
    "knowledge-cronologia-maestra": "Ordena eventos historicos por fecha en cada ronda. 1-9 coloca cartas, Backspace quita la ultima, Enter valida, H/J/K piden pistas, N siguiente ronda y R nueva mision.",
    "strategy-chess-grandmaster":  "Clic para mover, U deshace, D reclama tablas, F pantalla completa.",
    "strategy-damas-clasicas":     "Damas 8x8: clic para mover en diagonal, capturas encadenadas, U deshace, X retiro, R reinicia y F pantalla completa.",
    "strategy-sudoku-tecnicas":    "Sudoku 9x9: flechas para mover, 1-9 o QWE/ASD/UIO para escribir, Backspace borra, P aplica pista y R partida aleatoria.",
    "strategy-hundir-flota-pro":   "Hundir la Flota Classic Card: 12 coordenadas (5 naves + 7 fallos) y mano de 5 cartas de batalla. Clic en carta y luego objetivo; en poderes elige entre los dos efectos cuando aplique.",
    "strategy-poker-holdem-no-bet": "Poker clasico 5 cartas con apuestas: ciegas, bote y acciones de pasar/igualar/subir/all-in/retirarse. Enter resolver accion principal, U subir, A all-in, F retirarse, 1-5 seleccionar descarte, D descartar, S servirse, N siguiente mano, R reiniciar.",
    "strategy-parchis-ludoteka":  "Antes de iniciar puedes elegir color de fichas. S/Enter inicia partida, R/Enter/Space tira dado, 1..9 elige jugada, Enter primera jugada, X continua sin jugada y N nueva partida.",
    "strategy-baraja-ia-arena":   "Modo baraja con Brisca/Tute, Mus y Escoba: cambia modalidad arriba. Mus permite 2/4/6 jugadores IA+tu. Escoba usa baraja espanola en espanol y baraja inglesa adaptada en ingles. Marca cartas de mesa y juega para sumar 15. Brisca usa click/1-3; Mus usa M/X + 1-4; Escoba usa click + 1-3. N siguiente mano, R reinicio.",
    "strategy-mansion-triple-enigma": "Deduccion de misterio con tutorial guiado: mueve en tablero, elige sospechoso y arma, y lanza sospecha. A abre/cierra acusacion final, 1/2/3 cambian pestana, Enter confirma y N reinicia caso.",
    "rpg-emberfall":               "WASD/flechas para explorar. Atacar, habilidad, defender, enfocar, invocar (U) y poción.",
    "platformer-sky-runner":       "A/D o flechas para moverse, W/arriba/espacio para saltar, F accion, con 132 mapas, reliquias, springs, viento y checkpoints.",
    "fighter-neon-dojo":           "A/D moverse, W saltar, J jab, K heavy, L guardia, U/B especial.",
    "sports-head-soccer-arena":    "A/D o izq/der mover, arriba/W saltar, mantener Espacio para cargar y soltar para disparar, Enter iniciar, R reiniciar, P pausa.",
    "arcade-reactor-toss": "Touch/raton: tira hacia atras desde la orbita y suelta. Flechas o A/D apuntan, W/S ajustan potencia, Enter/Espacio lanza, P pausa, R reinicia, L selecciona nivel, M audio y F pantalla completa.",
    "arcade-territory-war": "Turnos estilo Territory War: A/D o flechas mueven, W/arriba salta, Q/E o arriba/abajo ajustan angulo, mantener Espacio o click carga potencia y al soltar lanza granada. P pausa, R reinicia y F pantalla completa.",
    "arcade-orchard-match-blast": "Match-3 original: intercambia dos bloques de color adyacentes. Flechas mueven cursor, Enter/Espacio confirma, H pista, S mezcla, B Bloom, R reinicia y F pantalla completa.",
    "arcade-billar-pool-club":     "Raton opcional para apuntar, A/D afinan angulo, W/S potencia, Space tira, O push out, V safety, 1/2 decisiones, flechas/WASD mueven la blanca en mano, Enter/Space confirma, P autocoloca y F pantalla completa.",
    "arcade-bowling-pro-tour":     "A/D ajustan linea, W/S potencia, Q/E efecto y Enter/Espacio lanza. R reinicia serie y F pantalla completa.",
    "arcade-penalty-neural-keeper": "Tanda de 10 penaltis: elige zona con 1-5 (abajo izq/der, arriba izq/der, centro). R reinicia y F pantalla completa.",
    "arcade-cosmic-vanguard":      "A/D o izq/der rotan, W impulsa, S frena, Shift boost, Espacio dispara, E/X pulso EMP, P pausa, R reinicia y F pantalla completa. Las pasadas al limite cargan Vanguard Drive.",
    "arcade-golf-tour-2d":        "Mini golf 2D: arrastra desde la bola para apuntar y potencia. Teclado A/D o flechas angulo, W/S potencia, Enter/Espacio lanza, P pausa, R reinicia, L selector y F pantalla completa.",
    "arcade-archery-horizon":      "Tiro con arco en profundidad: A/D o J/L desvio, arriba/abajo o I/K trayectoria, Q/E ajuste grueso de trayectoria, W/S o +/- intensidad, Z/X ajuste fino, Shift modo fino, 1-5 presets y 6 recomendado. Enter/Espacio dispara. P pausa, R reinicia, N siguiente nivel y F pantalla completa.",
    "arcade-pinball-wizard":       "Z o flecha izq para flipper izquierdo, X o flecha der para flipper derecho, mantén Espacio para cargar el plunger y suelta para lanzar. R reinicia.",
    "arcade-bubble-storm":         "Mueve el ratón para apuntar y haz clic para disparar. Tab o S cambia la burbuja siguiente. Forma grupos de 3+ del mismo color para hacerlos explotar. R reinicia.",
    "arcade-ice-strike-pro":       "←→/AD apuntan, W sube potencia, Q giro interior, E giro exterior, Espacio lanza. S barre durante el vuelo. R reinicia, Esc menú.",
    "arcade-neon-crypt":           "WASD/flechas mover, ratón apuntar, Click/Espacio atacar con espada, Shift/E esquivar (invencible), recoge orbes verdes para recuperar vida. R reinicia, Esc menú.",
    "arcade-neon-rush":            "Runner de precision de 300 niveles: Espacio/arriba/click/tap salta con respuesta inmediata (jump buffer + coyote time). Incluye 1 salto aereo de apoyo por ciclo para evitar bloqueos injustos. En movil/tablet, toca cualquier zona del juego para saltar. Esquiva pinchos y techo, usa jump pads/orbes y llega al portal final. R reintenta, Esc menu.",
    "arcade-dig-hole-treasure":    "Juego de cavar hoyo 2D: click cava, A/D o flechas mueven, W/arriba/Espacio salta, I/J/K/L excavan arriba/izq/abajo/der, T coloca antorcha, B activa jetpack, E/Enter interactua con puesto, puerta y tesoro, M abre el puesto, P pausa, R reinicia y F pantalla completa.",
    "arcade-summit-ascent":        "Escalada vertical 2D: ↑/W escala, ↓/S baja, ←→/A D mueve lateral, J esquiva escombros, Espacio planta anclaje con piolet, Q bebe agua (+12 stamina), E entra/sale de cueva. Bandas de viento, niebla, lluvia y nieve drenan estamina más rápido. Sin estamina caes; la cuerda te puede salvar.",
    "arcade-valle-tranquilo":      "Sandbox de granja pixel-art: WASD/flechas mueven, 1-9 cambian herramienta, Espacio usa herramienta, E habla con NPC, B tienda, Z dormir y M mina. Click tambien interactua por casilla.",
    "arcade-stick-brawl-showdown": "Fighter arcade avanzado: A/D o flechas mover, W/arriba saltar, S/abajo bloquear, G/espacio jab, H/enter cross, J/K patadas, F proyectil, B super, P pausa y R reinicia.",
    "sports-basketball-court":     "Baloncesto 6 posiciones: arriba/abajo ajustan arco, izq/der la desviación lateral y W/S la potencia. Space o Enter lanza. P pausa, R nueva ronda y F pantalla completa.",
    "sports-ping-pong-arena":      "Tenis de mesa en primera persona: la pala es tu dedo o el ratón y se mueve por la mesa como tu mano. Empújala hacia delante para golpear o sacar; cuanto más rápido la lances, más potente y raso sale el golpe, y cruzarla en diagonal abre la bola. Teclado: flechas mueven, Espacio saca. En el menú elige dificultad y formato. P pausa, R reinicia y F pantalla completa.",
    "sports-padel-arena":          "Pádel por parejas (2v2) en pseudo-3D con vista broadcast. Controlas al jugador de tu pareja más cercano a la bola: flechas/WASD o joystick mueven; elige golpe con F volea/ataque, G revés, H globo, J dejada (Espacio también ataca), y marca dirección para colocar. Mantén pulsado el golpe (tecla, botón o dedo) para cargar potencia: la barra sobre tu figura la marca, y a tope la bola va más al fondo y más rápida a cambio de algo de precisión. El timing y la calidad del contacto definen profundidad y efecto (liftado pica bajo, cortado se sienta). Tras botar, la bola puede rebotar en el cristal y seguir en juego; saca cruzado por debajo. Puntuación reglamentaria (15/30/40, juegos y sets con tie-break). En el menú elige dificultad y formato. P pausa, R reinicia y M sonido.",
    "arcade-shell-game":           "Toca o haz clic en el vaso que esconde la bola. La bola va siempre debajo de su vaso: si no lo pierdes de vista, aciertas. Cada acierto sube el nivel y la mezcla se endurece (más rápida, más cruces y hasta 5 vasos); tres fallos y se acaba. Teclas 1-5 eligen vaso, P pausa, R reinicia y F pantalla completa.",
    "arcade-pulso-exacto":         "Aparece un tiempo objetivo (hasta 60 s). El cronómetro se ve solo los 2 primeros segundos como guía y luego se oculta; párale con Espacio, clic o toque en cualquier zona lo más cerca del objetivo. Cuanto menor la diferencia, más puntos; 5 rondas por partida. P pausa, R reinicia, M sonido y F pantalla completa.",
    "arcade-distancia-justa":      "Camina la distancia anunciada: mantén Avanzar (D/→/Espacio o toque en la pista) y Atrás (A/←), y pulsa Confirmar (Enter) para fijar tu posición. Solo hay marcas los primeros 30 m; el resto a ojo. Compites contra 3 IAs (dificultad elegible) en 5 rondas con puntos por puesto. P pausa, R reinicia, M sonido y F pantalla completa.",
    "arcade-terror-zombi":         "Huye de los zombis en un cementerio vallado: WASD/flechas mueven en 8 direcciones (o arrastra sobre el tablero / cruceta en móvil). Si un zombi te toca, te conviertes y pasas a cazar; el último humano en pie gana. La horda acelera con el tiempo. Enter/Espacio empieza, P pausa, R reinicia, M sonido y F pantalla completa.",
    "arcade-brile":                "Balón prisionero 6v6 en un cementerio vallado. Manejas a un jugador del equipo azul: WASD/flechas mueven (o arrastra / cruceta en móvil), Espacio/J lanza al rival más peligroso y K/Mayús atrapa (púlsalo al vuelo para brilar al lanzador). Da a un rival antes de que bote y va al cementerio; desde ahí sigue lanzando y vuelve si acierta. Gana quien vacía el campo rival. Enter empieza, P pausa, R reinicia, M sonido y F pantalla completa.",
    "arcade-topos-mazazos":        "Whack-a-mole con desplazamiento en un jardín vallado: flechas/WASD (o joystick en móvil) te llevan hasta el agujero y Espacio o el botón Golpear suelta un mazazo de área que alcanza todo lo asomado a tu alrededor. Topo marrón = 1 punto, dorado = 3, y el topo bomba resta 2 y te aturde. Rodea los barriles y compite con 3 IAs: gana quien más puntúe en 30 s. Enter empieza, P pausa, R reinicia, M sonido y F pantalla completa.",
    "arcade-pacman-maze-protocol": "WASD/flechas mover, Enter/Espacio empezar, P/Esc pausa, R reinicia, M sonido.",
    "arcade-pong-neon-arena":      "W/S o flechas arriba/abajo para mover vertical. A/D o flechas izq/der para avanzar o retroceder (sin cruzar el centro). Ratón también controla vertical. Enter/Espacio empezar, P pausa, R reinicia, M sonido, F pantalla completa.",
    "arcade-buscaminas-classic":   "Click izq abre, click der o pulsación larga marca bandera. Flechas mueven cursor, Enter/Espacio abre, F marca, H sugiere IA, A ejecuta IA y R reinicia. En competitivo puntúan celdas y tiempo.",
    "arcade-retro-snake-classic": "Snake tradicional: flechas/WASD para girar, Enter/Espacio iniciar, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-breakout-1986": "Chromatic Tether: A/D o flechas mueven el emisor, Espacio libera el pulso, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-space-invaders": "Space Invaders: A/D o flechas mueve nave, Espacio dispara, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-tetris-blockfall": "Mosaic Grid: flechas/WASD mueven la pieza activa, Espacio/Enter coloca cuando llega desde la derecha, C cambia la pieza, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-frogger-crossing": "Frogger: flechas/WASD para saltar por casillas, cruza carretera y rio, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-bomber-grid": "Pulse Garden: flechas/WASD para moverte, Espacio despliega una baliza, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-galaga-quantum": "Galaga Quantum: A/D o flechas mueve nave, Espacio dispara, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-qbert-prism": "Qbert Prism: flechas/WASD para saltos diagonales, Enter/Espacio inicia, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-lunar-lander-orbit": "Lunar Lander Orbit: A/D rota, W propulsa, aterriza suave en plataforma, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-centipede-circuit": "Centipede Circuit: flechas/WASD mueven nave, Espacio dispara, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-river-raid-neon": "River Raid Neon: A/D maniobra, W acelera, S frena, Espacio dispara, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-tron-lightcycles": "Tron Lightcycles: flechas/WASD cambian direccion, evita estelas, P pausa, R reinicia y F pantalla completa.",
    "arcade-retro-road-fighter-synth": "Road Fighter Synth: A/D cambia carril, W acelera, S frena, P pausa, R reinicia y F pantalla completa.",
    "racing-race2dpro":            "Arriba/abajo acelerar/frenar, izq/der girar. Móvil: joystick táctil izq. + botones der. R reinicia.",
    "racing-sunset-slipstream":    "Izq/der maniobra, arriba acelera, abajo enfria el ritmo, Espacio activa focus y R reinicia.",
  },
  en: {
    "adventure-echoes":            "WASD/arrows to move. Search, scan, rations, beacon and tactical jump (B).",
    "action-core-strike":          "WASD/arrows to move. Burst, rocket, overdrive, defense and medkit across rounds.",
    "racing-neon-lanes":           "Left/right changes lane, up/down speed, space turbo, I item.",
    "knowledge-quiz-nexus":        "Select an answer button and advance after locking the question.",
    "knowledge-logic-vault":       "Select an answer button and advance after locking the question.",
    "knowledge-iq-masters-protocol": "Single-line figure puzzle: click/tap nodes or drag to trace. R resets, Z undoes, H hint, N next level after clear.",
    "knowledge-refranes-clasicos": "5 rounds: read the proverb opening, type the continuation, and press Enter to check. N advances reviewed rounds and R restarts.",
    "knowledge-wikipedia-gacha":   "Article gacha: 1 Home, 2 Packs, 3 Collection, 4 Missions, 5 Trophies. Space/Enter opens a pack in Open Pack, R syncs, Esc closes details.",
    "knowledge-sudoku-sprint":     "Arrows to navigate, 1-4 / A/S/D/F to fill, Backspace clears, R random match.",
    "knowledge-domino-chain":      "4-player team domino: left/right chooses tile, up/down edge, Enter plays, P passes, N advances round, R restarts.",
    "knowledge-ahorcado-flash":    "Type letters to guess; Enter or button for a new word.",
    "knowledge-paciencia-lite":    "Full Klondike (52 cards, 4 suits): drag or tap to move. Double click sends to foundation. D draw/recycle, F auto foundation, P new game, Esc deselect.",
    "knowledge-puzle-deslizante":  "Arrows move the blank or click adjacent tiles. R for a new match.",
    "knowledge-crucigrama-mini":   "Arrows navigate, letters type, Backspace clears, Enter checks, button for new puzzle.",
    "knowledge-sopa-letras-mega":  "Drag or click start-end horizontally, vertically or diagonally (reverse also works). R new match.",
    "knowledge-pasapalabra-rondo": "A-Z word ring with 10k matches per locale: type answer, Enter submits, Space passes and R loads a new match.",
    "knowledge-wordle-pro":        "Wordle ES/EN with 10k words per locale. Type letters, Enter submits, Backspace deletes and use the random-match button.",
    "knowledge-anagramas-pro":     "Anagrams ES/EN with 10k words per locale. Type with the same letters, Enter submits, M shuffles and use the random-match button.",
    "knowledge-calculo-mental-flash10": "10 rounds in 40s: type the result, Enter submits, and R restarts.",
    "knowledge-tabla-periodica-total": "Empty periodic table: arrows move cells, symbol/name + Enter checks, N next pending, R restart.",
    "knowledge-mapas-atlas":       "Choose scope (world/continent/country/cities), type geographic names and submit with Enter. R restarts and N loads a random map.",
    "knowledge-mapas-camino-corto": "Countries/provinces mode: pick continent or country, type next neighbor, Enter checks, green ideal, orange alternative, R restart, N new route.",
    "knowledge-adivina-pais-silueta": "5 rounds: identify each silhouette by typing the country and pressing Enter. Live recommendations update by letters; N advances checked rounds and R restarts.",
    "knowledge-tangram-pro": "7-tan tangram: drag pieces, Q/E rotates 45 degrees, F flips the parallelogram, Enter snaps, H toggles the guide, R restarts, and N loads another silhouette.",
    "knowledge-cronologia-maestra": "Sort historical events by date in each round. 1-9 places cards, Backspace removes last, Enter validates, H/J/K trigger hints, N advances rounds, and R starts a new mission.",
    "strategy-chess-grandmaster":  "Click to move, U undo, D claim draw, F fullscreen.",
    "strategy-damas-clasicas":     "8x8 checkers: click to move diagonally, chain captures, U undo, X resign, R restart and F fullscreen.",
    "strategy-sudoku-tecnicas":    "Sudoku 9x9: arrows move, 1-9 or QWE/ASD/UIO types values, Backspace clears, P applies hint, and R starts a random match.",
    "strategy-hundir-flota-pro":   "Battleship Classic Card: 12 coordinates (5 ships + 7 misses) and a 5-card battle hand. Click a hand card then a target; choose between dual effects on power cards when available.",
    "strategy-poker-holdem-no-bet": "Classic 5-card draw with betting: blinds, real pot and check/call/raise/all-in/fold decisions. Enter resolves main action, U raise, A all-in, F fold, 1-5 select discard, D discard, S stand pat, N next hand, R restart.",
    "strategy-parchis-ludoteka":  "Pick your token color before starting. S/Enter starts the match, R/Enter/Space rolls the die, 1..9 picks a move, Enter first move, X continues without move, and N starts a new match.",
    "strategy-baraja-ia-arena":   "Card-table mode with Brisca/Tute, Mus, and Sweep 15: switch mode at the top. Mus supports 2/4/6 players. Sweep 15 uses the Spanish deck in Spanish and the adapted English deck in English. Mark table cards and play to sum 15. Brisca uses click/1-3; Mus uses M/X + 1-4; Sweep 15 uses click + 1-3. N next hand, R restart.",
    "strategy-mansion-triple-enigma": "Triple Enigma Mansion: move on the board, pick suspect and weapon, and submit suggestions. A toggles accusation, 1/2/3 switch tabs, Enter confirms, and N restarts.",
    "rpg-emberfall":               "WASD/arrows to explore. Attack, skill, defend, focus, summon (U) and potion.",
    "platformer-sky-runner":       "A/D or arrows to move, W/up/space to jump, F action, with 132 maps, relics, springs, wind and checkpoints.",
    "fighter-neon-dojo":           "A/D move, W jump, J jab, K heavy, L guard, U/B special.",
    "sports-head-soccer-arena":    "A/D or left/right move, up/W jump, hold Space to charge and release to shoot, Enter start, R restart, P pause.",
    "arcade-reactor-toss": "Touch/mouse: pull back from the orb and release. Arrows or A/D aim, W/S tune power, Enter/Space launches, P pauses, R restarts, L opens level select, M audio, and F fullscreen.",
    "arcade-territory-war": "Turn-based Territory War rules: A/D or arrows move, W/up jumps, Q/E or up/down tunes angle, hold Space or mouse to charge and release to throw. P pauses, R restarts, F fullscreen.",
    "arcade-orchard-match-blast": "Original match-3: swap two adjacent cells. Arrows move cursor, Enter/Space confirms, H hint, S shuffle, R restart, and F toggles fullscreen.",
    "arcade-billar-pool-club":     "Mouse aiming is optional: A/D fine tune angle, W/S power, Space shoots, O push out, V safety, 1/2 decisions, arrows/WASD move cue ball in hand, Enter/Space confirms, P auto-places, and F toggles fullscreen.",
    "arcade-bowling-pro-tour":     "A/D adjust line, W/S power, Q/E spin, Enter/Space throw. R restarts the series and F toggles fullscreen.",
    "arcade-penalty-neural-keeper": "10-penalty shootout: pick zones with 1-5 (bottom left/right, top left/right, center). R restarts and F toggles fullscreen.",
    "arcade-cosmic-vanguard":      "A/D or left/right rotate, W thrusts, S brakes, Shift boosts, Space fires, E/X triggers EMP pulse, P pauses, R restarts, and F toggles fullscreen. Close passes charge Vanguard Drive.",
    "arcade-golf-tour-2d":        "2D mini golf: drag from the ball to set direction and power. Keyboard A/D or arrows adjusts angle, W/S power, Enter/Space launches, P pause, R restart, L level select, and F fullscreen.",
    "arcade-archery-horizon":      "Depth-based archery: A/D or J/L tune yaw, up/down or I/K trajectory, Q/E coarse trajectory trim, W/S or +/- intensity, Z/X fine trim, Shift fine mode, 1-5 shot presets and 6 level recommendation. Enter/Space fires. P pauses, R restarts, N advances level, and F toggles fullscreen.",
    "arcade-pinball-wizard":       "Z or left arrow for left flipper, X or right arrow for right flipper, hold Space to charge the plunger and release to launch. R restarts.",
    "arcade-bubble-storm":         "Move the mouse to aim and click to shoot. Tab or S swaps the next bubble. Match 3+ same-colour bubbles to pop them. R restarts.",
    "arcade-ice-strike-pro":       "←→/AD aim, W raise power, Q in-turn, E out-turn, Space deliver. S sweeps mid-flight. R restart, Esc menu.",
    "arcade-neon-crypt":           "WASD/arrows move, mouse aim, Click/Space sword attack, Shift/E dash (brief invincibility). Collect green orbs to restore HP. R restart, Esc menu.",
    "arcade-neon-rush":            "300-level precision runner: Space/up/click/tap jumps with immediate response (jump-buffer + coyote-time). Includes one assist air jump per cycle to prevent unfair deadlocks. On mobile/tablet, tap anywhere in the game area to jump. Dodge spikes and ceiling traps, use jump pads/orbs, and reach each final portal. R retries, Esc menu.",
    "arcade-dig-hole-treasure":    "2D digging run: click digs, A/D or arrows move, W/up/Space jumps, I/J/K/L dig up/left/down/right, T places a torch, B triggers the jetpack, E/Enter interacts with outpost, door, and treasure, M opens the market, P pauses, R restarts, and F toggles fullscreen.",
    "arcade-summit-ascent":        "Vertical 2D climbing: ↑/W climbs, ↓/S descends, ←→/A D lateral move, J dodges debris, Space plants an ice-axe anchor, Q drinks water (+12 stamina), E enters/leaves a cave. Wind, fog, rain, and snow bands drain stamina faster. If stamina hits zero you fall — the rope may catch you.",
    "arcade-valle-tranquilo":      "Pixel-art farming sandbox: WASD/arrows move, 1-9 swaps tools, Space uses the current tool, E talks to villagers, B opens the shop, Z sleeps, and M enters the mine. Mouse click also interacts per tile.",
    "arcade-stick-brawl-showdown": "Advanced arcade fighter: A/D or arrows move, W/up jump, S/down block, G/space jab, H/enter cross, J/K kicks, F projectile, B super, P pause, R restart.",
    "sports-basketball-court":     "Basketball 6 positions: up/down tune arc, left/right lateral aim, W/S power. Space or Enter shoots. P pauses, R starts a new round, and F toggles fullscreen.",
    "sports-ping-pong-arena":      "First-person table tennis: the bat is your finger or the mouse and moves across the table like your hand. Push it forward to hit or serve; the harder you drive it, the faster and flatter the shot, and cutting across it sends the ball wide. Keyboard: arrows move, Space serves. Pick difficulty and format in the menu. P pauses, R restarts, and F toggles fullscreen.",
    "sports-padel-arena":          "Pseudo-3D doubles padel (2v2) with a broadcast camera. You control whichever of your pair is closest to the ball: arrows/WASD or the joystick move; pick your shot with F volley/attack, G backhand, H lob, J drop (Space also attacks), and hold a direction to place it. Hold the shot down (key, button or finger) to charge power: the bar above your figure shows it, and fully charged the ball goes deeper and faster at some cost in accuracy. Timing and contact quality set depth and spin (topspin skids low, backspin sits up). After a floor bounce the ball can rebound off the glass and stay in play; serve cross-court, underhand. Regulation scoring (15/30/40, games and sets with tie-break). Pick difficulty and format in the menu. P pauses, R restarts, and M sound.",
    "arcade-shell-game":           "Tap or click the cup hiding the ball. The ball always rides under its own cup: keep your eye on it and you cannot be wrong. Every hit climbs a level and tightens the shuffle (faster, more crosses, up to 5 cups); three misses and you are out. Keys 1-5 pick a cup, P pauses, R restarts, and F toggles fullscreen.",
    "arcade-pulso-exacto":         "A target time appears (up to 60s). The clock is only shown for the first 2 seconds as a guide, then hides; stop it with Space, click or a tap anywhere as close to the target as you can. The smaller the gap, the more points; 5 rounds per game. P pauses, R restarts, M sound, and F toggles fullscreen.",
    "arcade-distancia-justa":      "Walk the announced distance: hold Advance (D/→/Space or a tap on the track) and Back (A/←), and press Confirm (Enter) to lock your position. Signs only cover the first 30 m; the rest is by feel. You face 3 AIs (selectable difficulty) across 5 rounds with placement points. P pauses, R restarts, M sound, and F toggles fullscreen.",
    "arcade-terror-zombi":         "Flee the zombies in a fenced graveyard: WASD/arrows move in 8 directions (or drag on the field / D-pad on mobile). Touch a zombie and you turn and start hunting; the last human standing wins. The horde speeds up over time. Enter/Space starts, P pauses, R restarts, M sound, and F toggles fullscreen.",
    "arcade-brile":                "6v6 dodgeball in a fenced graveyard. You control one blue-team player: WASD/arrows move (or drag / D-pad on mobile), Space/J throws at the most dangerous rival and K/Shift catches (snatch it midair to send the thrower out). Hit a rival before it bounces and they go to the graveyard; from there they keep throwing and return on a hit. Empty the enemy court to win. Enter starts, P pauses, R restarts, M sound, and F toggles fullscreen.",
    "arcade-topos-mazazos":        "Whack-a-mole on the move in a fenced garden: arrows/WASD (or the joystick on mobile) walk you to the hole and Space or the Whack button swings an area blow that hits everything popped up around you. Brown mole = 1 point, gold = 3, and the bomb mole costs 2 and stuns you. Weave around the barrels and race 3 AIs: most points in 30s wins. Enter starts, P pauses, R restarts, M sound, and F toggles fullscreen.",
    "arcade-pacman-maze-protocol": "WASD/arrows move, Enter/Space start, P/Esc pause, R restart, M sound.",
    "arcade-pong-neon-arena":      "W/S or up/down arrows for vertical. A/D or left/right arrows to advance or retreat (cannot cross centre line). Mouse also controls vertical. Enter/Space start, P pause, R restart, M sound, F fullscreen.",
    "arcade-buscaminas-classic":   "Left click reveals, right click or long press marks. Arrows move cursor, Enter/Space reveals, F marks, H asks AI hint, A runs AI move, R restarts. Competitive mode scores cells and time.",
    "arcade-retro-snake-classic": "Classic Snake: arrows/WASD steer, Enter/Space starts, P pauses, R restarts, F fullscreen.",
    "arcade-retro-breakout-1986": "Chromatic Tether: A/D or arrows move the emitter, Space releases the pulse, P pauses, R restarts, F fullscreen.",
    "arcade-retro-space-invaders": "Space Invaders: A/D or arrows move ship, Space shoots, P pauses, R restarts, F fullscreen.",
    "arcade-retro-tetris-blockfall": "Mosaic Grid: arrows/WASD move the active piece, Space/Enter places it once it arrives from the right, C changes the piece, P pauses, R restarts, F fullscreen.",
    "arcade-retro-frogger-crossing": "Frogger: arrows/WASD hop tiles, cross roads and river, P pauses, R restarts, F fullscreen.",
    "arcade-retro-bomber-grid": "Pulse Garden: arrows/WASD move, Space deploys a beacon, P pauses, R restarts, F fullscreen.",
    "arcade-retro-galaga-quantum": "Galaga Quantum: A/D or arrows move ship, Space shoots, P pauses, R restarts, F fullscreen.",
    "arcade-retro-qbert-prism": "Qbert Prism: arrows/WASD for diagonal hops, Enter/Space starts, P pauses, R restarts, F fullscreen.",
    "arcade-retro-lunar-lander-orbit": "Lunar Lander Orbit: A/D rotates, W thrusts, land softly on pad, P pauses, R restarts, F fullscreen.",
    "arcade-retro-centipede-circuit": "Centipede Circuit: arrows/WASD move, Space shoots, P pauses, R restarts, F fullscreen.",
    "arcade-retro-river-raid-neon": "River Raid Neon: A/D steer, W throttle, S brake, Space fire, P pauses, R restarts, F fullscreen.",
    "arcade-retro-tron-lightcycles": "Tron Lightcycles: arrows/WASD change direction, avoid trails, P pauses, R restarts, F fullscreen.",
    "arcade-retro-road-fighter-synth": "Road Fighter Synth: A/D lane swap, W accelerate, S brake, P pauses, R restarts, F fullscreen.",
    "racing-race2dpro":            "Up/down throttle/brake, left/right steer. Mobile: left touch joystick + right buttons. R restart.",
    "racing-sunset-slipstream":    "Left/right steers, up accelerates, down cools the pace, Space activates focus, and R restarts.",
  },
};
