# Benchmark de concurrencia

- Fecha: 2026-04-23T20:21:43.220Z
- Base URL: http://127.0.0.1:4173
- Usuarios concurrentes por juego: 3
- Juegos medidos: 65
- Juegos con medida especifica: 31
- Juegos en bundle base compartido: 34
- SLA objetivo por fase: <= 500 ms (P95)
- Errores de sesión: 0
- Errores de petición: 0

## SLA

- Start stage OK: 31/31
- Ready to play OK: 31/31

## Peor P95 por inicio

| Juego | Start Avg ms | Start P95 ms |
| --- | ---: | ---: |
| knowledge-wordle-pro | 55.76 | 74.86 |
| knowledge-ahorcado-flash | 54.75 | 58.09 |
| knowledge-anagramas-pro | 46.12 | 47.48 |
| knowledge-mapas-atlas | 38.42 | 42.33 |
| knowledge-cronologia-maestra | 25.87 | 27.77 |
| arcade-stick-brawl-showdown | 20.42 | 21.97 |
| arcade-valle-tranquilo | 8.22 | 9.61 |
| platformer-sky-runner | 9.09 | 9.29 |
| knowledge-crucigrama-mini | 7.04 | 7.65 |
| arcade-reactor-toss | 6.46 | 7.43 |

## Peor P95 listo para jugar

| Juego | Ready Avg ms | Ready P95 ms |
| --- | ---: | ---: |
| knowledge-wordle-pro | 55.76 | 74.86 |
| knowledge-ahorcado-flash | 54.75 | 58.09 |
| knowledge-anagramas-pro | 46.12 | 47.48 |
| knowledge-mapas-atlas | 38.42 | 42.33 |
| knowledge-cronologia-maestra | 25.87 | 27.77 |
| arcade-stick-brawl-showdown | 20.42 | 21.97 |
| arcade-valle-tranquilo | 8.22 | 9.61 |
| platformer-sky-runner | 9.09 | 9.29 |
| knowledge-crucigrama-mini | 7.04 | 7.65 |
| arcade-reactor-toss | 6.46 | 7.43 |

## Resultados completos

| Juego | Modo | Start P95 ms | Gameplay P95 ms | Ready P95 ms | Total P95 ms | Errores |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| platformer-sky-runner | game_specific | 9.29 | 0 | 9.29 | 9.29 | 0 |
| arcade-pacman-maze-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-stick-brawl-showdown | game_specific | 21.97 | 0 | 21.97 | 21.97 | 0 |
| arcade-reactor-toss | game_specific | 7.43 | 0 | 7.43 | 7.43 | 0 |
| arcade-territory-war | game_specific | 4.88 | 0 | 4.88 | 4.88 | 0 |
| arcade-orchard-match-blast | game_specific | 5.21 | 0 | 5.21 | 5.21 | 0 |
| arcade-billar-pool-club | game_specific | 5.14 | 0 | 5.14 | 5.14 | 0 |
| arcade-bowling-pro-tour | game_specific | 4.84 | 0 | 4.84 | 4.84 | 0 |
| arcade-cosmic-vanguard | game_specific | 4.66 | 0 | 4.66 | 4.66 | 0 |
| arcade-golf-tour-2d | game_specific | 5.42 | 0 | 5.42 | 5.42 | 0 |
| arcade-archery-horizon | game_specific | 5.85 | 0 | 5.85 | 5.85 | 0 |
| arcade-pinball-wizard | game_specific | 4.2 | 0 | 4.2 | 4.2 | 0 |
| arcade-bubble-storm | game_specific | 3.83 | 0 | 3.83 | 3.83 | 0 |
| arcade-ice-strike-pro | game_specific | 4.59 | 0 | 4.59 | 4.59 | 0 |
| arcade-neon-crypt | game_specific | 4.53 | 0 | 4.53 | 4.53 | 0 |
| arcade-neon-rush | game_specific | 6.98 | 0 | 6.98 | 6.98 | 0 |
| arcade-pong-neon-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-buscaminas-classic | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| sports-head-soccer-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-race2dpro | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-sunset-slipstream | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-quiz-nexus | game_specific | 4.42 | 0 | 4.42 | 4.42 | 0 |
| knowledge-iq-masters-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-refranes-clasicos | game_specific | 7.43 | 0 | 7.43 | 7.43 | 0 |
| knowledge-sudoku-sprint | game_specific | 6.53 | 0 | 6.53 | 6.53 | 0 |
| knowledge-domino-chain | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-ahorcado-flash | game_specific | 58.09 | 0 | 58.09 | 58.09 | 0 |
| knowledge-paciencia-lite | game_specific | 6.96 | 0 | 6.96 | 6.96 | 0 |
| knowledge-puzle-deslizante | game_specific | 5.61 | 0 | 5.61 | 5.61 | 0 |
| knowledge-crucigrama-mini | game_specific | 7.65 | 0 | 7.65 | 7.65 | 0 |
| knowledge-sopa-letras-mega | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-wordle-pro | game_specific | 74.86 | 0 | 74.86 | 74.86 | 0 |
| knowledge-anagramas-pro | game_specific | 47.48 | 0 | 47.48 | 47.48 | 0 |
| knowledge-calculo-mental-flash10 | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tabla-periodica-total | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-mapas-atlas | game_specific | 42.33 | 0 | 42.33 | 42.33 | 0 |
| knowledge-mapas-camino-corto | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-adivina-pais-silueta | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tangram-pro | game_specific | 5.08 | 0 | 5.08 | 5.08 | 0 |
| knowledge-cronologia-maestra | game_specific | 27.77 | 0 | 27.77 | 27.77 | 0 |
| strategy-sudoku-tecnicas | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| strategy-chess-grandmaster | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| strategy-hundir-flota-pro | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| strategy-parchis-ludoteka | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| strategy-damas-clasicas | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| strategy-poker-holdem-no-bet | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| strategy-baraja-ia-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| strategy-mansion-triple-enigma | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-snake-classic | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-breakout-1986 | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-space-invaders | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-tetris-blockfall | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-frogger-crossing | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-bomber-grid | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-galaga-quantum | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-qbert-prism | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-lunar-lander-orbit | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-centipede-circuit | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-river-raid-neon | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-tron-lightcycles | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-retro-road-fighter-synth | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-kitchen-rush-2d | game_specific | 5.39 | 0 | 5.39 | 5.39 | 0 |
| arcade-dig-hole-treasure | game_specific | 6.46 | 0 | 6.46 | 6.46 | 0 |
| arcade-valle-tranquilo | game_specific | 9.61 | 0 | 9.61 | 9.61 | 0 |
| sports-basketball-court | game_specific | 4.15 | 0 | 4.15 | 4.15 | 0 |

## Sin atribución por juego

- Estos juegos están dentro del bundle base compartido en el escenario `warm-game-entry`.
- El benchmark calienta `index.html` y recursos base antes de medir, así que no puede asignarles una latencia por juego sin otro modelo de medición.
- Juegos: arcade-buscaminas-classic, arcade-pacman-maze-protocol, arcade-pong-neon-arena, arcade-retro-bomber-grid, arcade-retro-breakout-1986, arcade-retro-centipede-circuit, arcade-retro-frogger-crossing, arcade-retro-galaga-quantum, arcade-retro-lunar-lander-orbit, arcade-retro-qbert-prism, arcade-retro-river-raid-neon, arcade-retro-road-fighter-synth, arcade-retro-snake-classic, arcade-retro-space-invaders, arcade-retro-tetris-blockfall, arcade-retro-tron-lightcycles, knowledge-adivina-pais-silueta, knowledge-calculo-mental-flash10, knowledge-domino-chain, knowledge-iq-masters-protocol, knowledge-mapas-camino-corto, knowledge-sopa-letras-mega, knowledge-tabla-periodica-total, racing-race2dpro, racing-sunset-slipstream, sports-head-soccer-arena, strategy-baraja-ia-arena, strategy-chess-grandmaster, strategy-damas-clasicas, strategy-hundir-flota-pro, strategy-mansion-triple-enigma, strategy-parchis-ludoteka, strategy-poker-holdem-no-bet, strategy-sudoku-tecnicas

