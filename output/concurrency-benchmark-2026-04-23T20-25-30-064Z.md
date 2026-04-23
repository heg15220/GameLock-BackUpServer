# Benchmark de concurrencia

- Fecha: 2026-04-23T20:25:30.062Z
- Base URL: http://127.0.0.1:4173
- Usuarios concurrentes por juego: 3
- Juegos medidos: 65
- Juegos con medida especifica: 65
- Juegos en bundle base compartido: 34
- SLA objetivo por fase: <= 500 ms (P95)
- Errores de sesión: 0
- Errores de petición: 0

## SLA

- Start stage OK: 65/65
- Ready to play OK: 65/65

## Peor P95 por inicio

| Juego | Start Avg ms | Start P95 ms |
| --- | ---: | ---: |
| platformer-sky-runner | 170.41 | 197.04 |
| knowledge-wordle-pro | 91.63 | 101.16 |
| knowledge-ahorcado-flash | 82.45 | 87.57 |
| knowledge-anagramas-pro | 78.29 | 86.82 |
| knowledge-mapas-atlas | 75.05 | 80.72 |
| knowledge-tangram-pro | 79.47 | 80.42 |
| arcade-stick-brawl-showdown | 78.45 | 79.65 |
| arcade-retro-river-raid-neon | 70.55 | 75.03 |
| arcade-pacman-maze-protocol | 64.96 | 73.58 |
| knowledge-cronologia-maestra | 65.56 | 68.24 |

## Peor P95 listo para jugar

| Juego | Ready Avg ms | Ready P95 ms |
| --- | ---: | ---: |
| platformer-sky-runner | 170.41 | 197.04 |
| knowledge-wordle-pro | 91.63 | 101.16 |
| knowledge-ahorcado-flash | 82.45 | 87.57 |
| knowledge-anagramas-pro | 78.29 | 86.82 |
| knowledge-mapas-atlas | 75.05 | 80.72 |
| knowledge-tangram-pro | 79.47 | 80.42 |
| arcade-stick-brawl-showdown | 78.45 | 79.65 |
| arcade-retro-river-raid-neon | 70.55 | 75.03 |
| arcade-pacman-maze-protocol | 64.96 | 73.58 |
| knowledge-cronologia-maestra | 65.56 | 68.24 |

## Resultados completos

| Juego | Modo | Start P95 ms | Gameplay P95 ms | Ready P95 ms | Total P95 ms | Errores |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| platformer-sky-runner | game_specific | 197.04 | 0 | 197.04 | 197.04 | 0 |
| arcade-pacman-maze-protocol | shared_base_bundle | 73.58 | 0 | 73.58 | 73.58 | 0 |
| arcade-stick-brawl-showdown | game_specific | 79.65 | 0 | 79.65 | 79.65 | 0 |
| arcade-reactor-toss | game_specific | 60.53 | 0 | 60.53 | 60.53 | 0 |
| arcade-territory-war | game_specific | 63.65 | 0 | 63.65 | 63.65 | 0 |
| arcade-orchard-match-blast | game_specific | 62.53 | 0 | 62.53 | 62.53 | 0 |
| arcade-billar-pool-club | game_specific | 55.74 | 0 | 55.74 | 55.74 | 0 |
| arcade-bowling-pro-tour | game_specific | 57.4 | 0 | 57.4 | 57.4 | 0 |
| arcade-cosmic-vanguard | game_specific | 61.19 | 0 | 61.19 | 61.19 | 0 |
| arcade-golf-tour-2d | game_specific | 56.89 | 0 | 56.89 | 56.89 | 0 |
| arcade-archery-horizon | game_specific | 56.82 | 0 | 56.82 | 56.82 | 0 |
| arcade-pinball-wizard | game_specific | 52.15 | 0 | 52.15 | 52.15 | 0 |
| arcade-bubble-storm | game_specific | 54.16 | 0 | 54.16 | 54.16 | 0 |
| arcade-ice-strike-pro | game_specific | 53.69 | 0 | 53.69 | 53.69 | 0 |
| arcade-neon-crypt | game_specific | 51.39 | 0 | 51.39 | 51.39 | 0 |
| arcade-neon-rush | game_specific | 62.66 | 0 | 62.66 | 62.66 | 0 |
| arcade-pong-neon-arena | shared_base_bundle | 60.2 | 0 | 60.2 | 60.2 | 0 |
| arcade-buscaminas-classic | shared_base_bundle | 50.79 | 0 | 50.79 | 50.79 | 0 |
| sports-head-soccer-arena | shared_base_bundle | 49.67 | 0 | 49.67 | 49.67 | 0 |
| racing-race2dpro | shared_base_bundle | 46.43 | 0 | 46.43 | 46.43 | 0 |
| racing-sunset-slipstream | shared_base_bundle | 44.67 | 0 | 44.67 | 44.67 | 0 |
| knowledge-quiz-nexus | game_specific | 46.1 | 0 | 46.1 | 46.1 | 0 |
| knowledge-iq-masters-protocol | shared_base_bundle | 55.35 | 0 | 55.35 | 55.35 | 0 |
| knowledge-refranes-clasicos | game_specific | 49.85 | 0 | 49.85 | 49.85 | 0 |
| knowledge-sudoku-sprint | game_specific | 51.91 | 0 | 51.91 | 51.91 | 0 |
| knowledge-domino-chain | shared_base_bundle | 43.59 | 0 | 43.59 | 43.59 | 0 |
| knowledge-ahorcado-flash | game_specific | 87.57 | 0 | 87.57 | 87.57 | 0 |
| knowledge-paciencia-lite | game_specific | 60.76 | 0 | 60.76 | 60.76 | 0 |
| knowledge-puzle-deslizante | game_specific | 60.12 | 0 | 60.12 | 60.12 | 0 |
| knowledge-crucigrama-mini | game_specific | 53.85 | 0 | 53.85 | 53.85 | 0 |
| knowledge-sopa-letras-mega | shared_base_bundle | 51.67 | 0 | 51.67 | 51.67 | 0 |
| knowledge-wordle-pro | game_specific | 101.16 | 0 | 101.16 | 101.16 | 0 |
| knowledge-anagramas-pro | game_specific | 86.82 | 0 | 86.82 | 86.82 | 0 |
| knowledge-calculo-mental-flash10 | shared_base_bundle | 55.41 | 0 | 55.41 | 55.41 | 0 |
| knowledge-tabla-periodica-total | shared_base_bundle | 45.55 | 0 | 45.55 | 45.55 | 0 |
| knowledge-mapas-atlas | game_specific | 80.72 | 0 | 80.72 | 80.72 | 0 |
| knowledge-mapas-camino-corto | shared_base_bundle | 43.82 | 0 | 43.82 | 43.82 | 0 |
| knowledge-adivina-pais-silueta | shared_base_bundle | 38.7 | 0 | 38.7 | 38.7 | 0 |
| knowledge-tangram-pro | game_specific | 80.42 | 0 | 80.42 | 80.42 | 0 |
| knowledge-cronologia-maestra | game_specific | 68.24 | 0 | 68.24 | 68.24 | 0 |
| strategy-sudoku-tecnicas | shared_base_bundle | 42.47 | 0 | 42.47 | 42.47 | 0 |
| strategy-chess-grandmaster | shared_base_bundle | 58.25 | 0 | 58.25 | 58.25 | 0 |
| strategy-hundir-flota-pro | shared_base_bundle | 37.89 | 0 | 37.89 | 37.89 | 0 |
| strategy-parchis-ludoteka | shared_base_bundle | 48.02 | 0 | 48.02 | 48.02 | 0 |
| strategy-damas-clasicas | shared_base_bundle | 39.94 | 0 | 39.94 | 39.94 | 0 |
| strategy-poker-holdem-no-bet | shared_base_bundle | 41.5 | 0 | 41.5 | 41.5 | 0 |
| strategy-baraja-ia-arena | shared_base_bundle | 40.72 | 0 | 40.72 | 40.72 | 0 |
| strategy-mansion-triple-enigma | shared_base_bundle | 42.49 | 0 | 42.49 | 42.49 | 0 |
| arcade-retro-snake-classic | shared_base_bundle | 38.42 | 0 | 38.42 | 38.42 | 0 |
| arcade-retro-breakout-1986 | shared_base_bundle | 41.76 | 0 | 41.76 | 41.76 | 0 |
| arcade-retro-space-invaders | shared_base_bundle | 53.67 | 0 | 53.67 | 53.67 | 0 |
| arcade-retro-tetris-blockfall | shared_base_bundle | 53.03 | 0 | 53.03 | 53.03 | 0 |
| arcade-retro-frogger-crossing | shared_base_bundle | 39.88 | 0 | 39.88 | 39.88 | 0 |
| arcade-retro-bomber-grid | shared_base_bundle | 43.44 | 0 | 43.44 | 43.44 | 0 |
| arcade-retro-galaga-quantum | shared_base_bundle | 38.81 | 0 | 38.81 | 38.81 | 0 |
| arcade-retro-qbert-prism | shared_base_bundle | 37.95 | 0 | 37.95 | 37.95 | 0 |
| arcade-retro-lunar-lander-orbit | shared_base_bundle | 37.82 | 0 | 37.82 | 37.82 | 0 |
| arcade-retro-centipede-circuit | shared_base_bundle | 38.2 | 0 | 38.2 | 38.2 | 0 |
| arcade-retro-river-raid-neon | shared_base_bundle | 75.03 | 0 | 75.03 | 75.03 | 0 |
| arcade-retro-tron-lightcycles | shared_base_bundle | 45.14 | 0 | 45.14 | 45.14 | 0 |
| arcade-retro-road-fighter-synth | shared_base_bundle | 43.93 | 0 | 43.93 | 43.93 | 0 |
| arcade-kitchen-rush-2d | game_specific | 53.08 | 0 | 53.08 | 53.08 | 0 |
| arcade-dig-hole-treasure | game_specific | 46.2 | 0 | 46.2 | 46.2 | 0 |
| arcade-valle-tranquilo | game_specific | 51.07 | 0 | 51.07 | 51.07 | 0 |
| sports-basketball-court | game_specific | 46.36 | 0 | 46.36 | 46.36 | 0 |

## Sin atribución por juego

- Estos juegos están dentro del bundle base compartido en el escenario `warm-game-entry`.
- El benchmark calienta `index.html` y recursos base antes de medir, así que no puede asignarles una latencia por juego sin otro modelo de medición.
- Juegos: arcade-buscaminas-classic, arcade-pacman-maze-protocol, arcade-pong-neon-arena, arcade-retro-bomber-grid, arcade-retro-breakout-1986, arcade-retro-centipede-circuit, arcade-retro-frogger-crossing, arcade-retro-galaga-quantum, arcade-retro-lunar-lander-orbit, arcade-retro-qbert-prism, arcade-retro-river-raid-neon, arcade-retro-road-fighter-synth, arcade-retro-snake-classic, arcade-retro-space-invaders, arcade-retro-tetris-blockfall, arcade-retro-tron-lightcycles, knowledge-adivina-pais-silueta, knowledge-calculo-mental-flash10, knowledge-domino-chain, knowledge-iq-masters-protocol, knowledge-mapas-camino-corto, knowledge-sopa-letras-mega, knowledge-tabla-periodica-total, racing-race2dpro, racing-sunset-slipstream, sports-head-soccer-arena, strategy-baraja-ia-arena, strategy-chess-grandmaster, strategy-damas-clasicas, strategy-hundir-flota-pro, strategy-mansion-triple-enigma, strategy-parchis-ludoteka, strategy-poker-holdem-no-bet, strategy-sudoku-tecnicas

