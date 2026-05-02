const DEFAULT_STAGE_SELECTORS = [
  ".golf-tour-canvas-shell",
  ".archery-horizon-canvas-shell",
  ".flux-basin-canvas-shell",
  ".head-soccer-pro-canvas-shell",
  ".basketball-court-stage",
  ".penalty-stage",
  ".billiards-stage",
  ".bowling-stage",
  ".pinball-canvas",
  ".pinball-shell",
  ".cosmic-vanguard-stage",
  ".tw-stage-wrap",
  ".pacman-stage-shell",
  ".sky-runner-dx-canvas-shell",
  ".pong-stage",
  ".fighter-stage",
  ".retro-arcade-stage",
  ".bubble-game",
  ".arcade-neon-rush-shell",
  ".phaser-canvas-shell",
  "iframe",
  "canvas",
];

const GAME_STAGE_SELECTORS = {
  "sports-head-soccer-arena": [
    ".head-soccer-pro-canvas-shell",
    ".head-soccer-pro-stage",
  ],
  "sports-basketball-court": [".basketball-court-stage"],
  "arcade-golf-tour-2d": [
    ".golf-tour-canvas-shell",
    ".golf-tour-stage-wrap",
  ],
  "arcade-billar-pool-club": [
    ".billiards-canvas-host",
    ".billiards-stage",
  ],
  "arcade-bowling-pro-tour": [".bowling-stage"],
  "arcade-penalty-neural-keeper": [".penalty-stage"],
  "arcade-cosmic-vanguard": [
    ".cosmic-vanguard-stage",
    ".cosmic-vanguard-stage-panel",
  ],
  "arcade-territory-war": [".tw-stage-wrap"],
  "arcade-archery-horizon": [
    ".archery-horizon-canvas-shell",
    ".archery-horizon-stage-wrap",
  ],
  "arcade-pinball-wizard": [".pinball-canvas", ".pinball-shell"],
  "platformer-sky-runner": [
    ".sky-runner-dx-canvas-shell",
    ".sky-runner-dx-stage-wrap",
  ],
  "racing-race2dpro": [".r2p"],
  "racing-sunset-slipstream": [".mtr", ".mtr__canvas"],
  "arcade-buscaminas-classic": [".mines-board-shell", ".minesweeper-game"],
  "arcade-ice-strike-pro": ["canvas"],
  "arcade-pacman-maze-protocol": [
    ".pacman-stage-shell",
    ".sky-runner-dx-canvas-shell",
  ],
  "arcade-pong-neon-arena": [".pong-game", ".pong-stage"],
  "arcade-stick-brawl-showdown": [
    ".stick-brawl-showdown-game",
    ".fighter-stage",
    ".phaser-canvas-shell",
  ],
  "arcade-dig-hole-treasure": [
    ".arcade-neon-rush-shell",
    ".arcade-neon-rush-frame",
  ],
  "arcade-neon-crypt": ["canvas"],
  "arcade-valle-tranquilo": [
    ".arcade-neon-rush-shell",
    ".arcade-neon-rush-frame",
  ],
  "arcade-orchard-match-blast": [
    ".orchard-shell",
    ".phaser-canvas-shell",
  ],
  "arcade-reactor-toss": [
    ".flux-basin-canvas-shell",
    ".flux-basin-stage-wrap",
  ],
  "arcade-bubble-storm": [".bubble-game", ".bubble-canvas"],
  "arcade-neon-rush": [
    "shadow:#gw",
    "shadow:#gc",
    "shadow:#levelSelect",
    "iframe:#gw",
    "iframe:#gc",
    "iframe:#levelSelect",
    ".arcade-neon-rush-shell",
    ".arcade-neon-rush-frame",
  ],
  "knowledge-quiz-nexus": [".knowledge-shell"],
  "knowledge-logic-vault": [".knowledge-shell"],
  "knowledge-iq-masters-protocol": [
    ".iqm-shell",
    ".iqm-figures-shell",
  ],
  "knowledge-refranes-clasicos": [
    ".proverb-shell",
    ".proverb-layout",
  ],
  "knowledge-sudoku-sprint": [".knowledge-mode-shell"],
  "knowledge-domino-chain": [
    ".knowledge-mode-shell",
    ".domino-chain",
  ],
  "knowledge-ahorcado-flash": [
    ".knowledge-mode-shell",
    ".hangman-stage",
  ],
  "knowledge-paciencia-lite": [".knowledge-mode-shell"],
  "knowledge-puzle-deslizante": [
    ".knowledge-mode-shell",
    ".puzzle-grid",
  ],
  "knowledge-crucigrama-mini": [
    ".knowledge-mode-shell",
    ".crossword-layout",
  ],
  "knowledge-sopa-letras-mega": [
    ".knowledge-mode-shell",
    ".wordsearch-shell",
  ],
  "knowledge-wordle-pro": [".knowledge-mode-shell"],
  "knowledge-anagramas-pro": [".knowledge-mode-shell"],
  "knowledge-calculo-mental-flash10": [
    ".knowledge-mode-shell",
    ".mental-math-shell",
  ],
  "knowledge-tabla-periodica-total": [
    ".knowledge-mode-shell",
    ".periodic-layout",
  ],
  "knowledge-mapas-atlas": [
    ".knowledge-mode-shell",
    ".maps-shell",
  ],
  "knowledge-mapas-camino-corto": [
    ".knowledge-mode-shell",
    ".maps-shell",
  ],
  "knowledge-adivina-pais-silueta": [
    ".knowledge-mode-shell",
    ".guess-country-layout",
  ],
  "knowledge-tangram-pro": [
    ".knowledge-mode-shell",
    ".tangram-shell",
    ".tangram-board-shell",
  ],
  "knowledge-cronologia-maestra": [
    ".knowledge-mode-shell",
    ".timeline-shell",
    ".timeline-board",
  ],
  "strategy-chess-grandmaster": [
    ".chess-board-shell",
    ".chess-game",
  ],
  "strategy-damas-clasicas": [
    ".checkers-board-shell",
    ".checkers-game",
  ],
  "strategy-sudoku-tecnicas": [
    ".strategy-sudoku-shell",
    ".strategy-sudoku-board-shell",
  ],
  "strategy-hundir-flota-pro": [
    ".battleship-battle-shell",
    ".battleship-battle-layout",
  ],
  "strategy-poker-holdem-no-bet": [".poker-table"],
  "strategy-parchis-ludoteka": [
    ".parchis-board-wrap .ludo-board",
    ".parchis-board-wrap",
    ".parchis-game-layout",
  ],
  "strategy-baraja-ia-arena": [
    ".strategy-brisca-game.brisca-arena .brisca-table-felt.is-mobile-stack",
    ".strategy-brisca-game.brisca-arena .brisca-table-felt",
    ".brisca-table-felt",
    ".brisca-table-shell",
  ],
  "strategy-mansion-triple-enigma": [
    ".mansion-layout",
    ".mansion-board-grid",
  ],
};

export function getMobileStageSelectors(gameId) {
  const specific = GAME_STAGE_SELECTORS[String(gameId ?? "")] ?? [];
  return [...specific, ...DEFAULT_STAGE_SELECTORS];
}
