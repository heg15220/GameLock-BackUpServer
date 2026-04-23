# Benchmark de concurrencia

- Fecha: 2026-04-23T21:17:36.259Z
- Base URL: http://127.0.0.1:4173
- Usuarios concurrentes por juego: 1000
- Juegos medidos: 65
- Juegos con medida especifica: 31
- Juegos en bundle base compartido: 34
- SLA objetivo por fase: <= 500 ms (P95)
- Errores de sesión: 31000
- Errores de petición: 50000

## SLA

- Start stage OK: 16/31
- Ready to play OK: 16/31
- Fallan start stage: knowledge-mapas-atlas (1231.9 ms), knowledge-anagramas-pro (935.08 ms), knowledge-wordle-pro (930.6 ms), arcade-stick-brawl-showdown (717.63 ms), knowledge-cronologia-maestra (636.05 ms), knowledge-sudoku-sprint (609.45 ms), arcade-valle-tranquilo (605.23 ms), knowledge-puzle-deslizante (600.83 ms), arcade-kitchen-rush-2d (596.29 ms), knowledge-ahorcado-flash (591.2 ms), knowledge-tangram-pro (590.75 ms), knowledge-paciencia-lite (587.9 ms), arcade-dig-hole-treasure (584.21 ms), arcade-neon-rush (577.31 ms), knowledge-crucigrama-mini (570.38 ms)
- Fallan ready to play: knowledge-mapas-atlas (1231.9 ms), knowledge-anagramas-pro (935.08 ms), knowledge-wordle-pro (930.6 ms), arcade-stick-brawl-showdown (717.63 ms), knowledge-cronologia-maestra (636.05 ms), knowledge-sudoku-sprint (609.45 ms), arcade-valle-tranquilo (605.23 ms), knowledge-puzle-deslizante (600.83 ms), arcade-kitchen-rush-2d (596.29 ms), knowledge-ahorcado-flash (591.2 ms), knowledge-tangram-pro (590.75 ms), knowledge-paciencia-lite (587.9 ms), arcade-dig-hole-treasure (584.21 ms), arcade-neon-rush (577.31 ms), knowledge-crucigrama-mini (570.38 ms)

## Peor P95 por inicio

| Juego | Start Avg ms | Start P95 ms |
| --- | ---: | ---: |
| knowledge-mapas-atlas | 1187.67 | 1231.9 |
| knowledge-anagramas-pro | 890.86 | 935.08 |
| knowledge-wordle-pro | 902.26 | 930.6 |
| arcade-stick-brawl-showdown | 706.21 | 717.63 |
| knowledge-cronologia-maestra | 610.04 | 636.05 |
| knowledge-sudoku-sprint | 577.93 | 609.45 |
| arcade-valle-tranquilo | 573.33 | 605.23 |
| knowledge-puzle-deslizante | 564.3 | 600.83 |
| arcade-kitchen-rush-2d | 570.27 | 596.29 |
| knowledge-ahorcado-flash | 561.93 | 591.2 |

## Peor P95 listo para jugar

| Juego | Ready Avg ms | Ready P95 ms |
| --- | ---: | ---: |
| knowledge-mapas-atlas | 1187.67 | 1231.9 |
| knowledge-anagramas-pro | 890.86 | 935.08 |
| knowledge-wordle-pro | 902.26 | 930.6 |
| arcade-stick-brawl-showdown | 706.21 | 717.63 |
| knowledge-cronologia-maestra | 610.04 | 636.05 |
| knowledge-sudoku-sprint | 577.93 | 609.45 |
| arcade-valle-tranquilo | 573.33 | 605.23 |
| knowledge-puzle-deslizante | 564.3 | 600.83 |
| arcade-kitchen-rush-2d | 570.27 | 596.29 |
| knowledge-ahorcado-flash | 561.93 | 591.2 |

## Resultados completos

| Juego | Modo | Start P95 ms | Gameplay P95 ms | Ready P95 ms | Total P95 ms | Errores |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| platformer-sky-runner | game_specific | 428.86 | 0 | 428.86 | 428.86 | 1000 |
| arcade-pacman-maze-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-stick-brawl-showdown | game_specific | 717.63 | 0 | 717.63 | 717.63 | 2000 |
| arcade-reactor-toss | game_specific | 330.28 | 0 | 330.28 | 330.28 | 1000 |
| arcade-territory-war | game_specific | 307.59 | 0 | 307.59 | 307.59 | 1000 |
| arcade-orchard-match-blast | game_specific | 308.89 | 0 | 308.89 | 308.89 | 1000 |
| arcade-billar-pool-club | game_specific | 300.93 | 0 | 300.93 | 300.93 | 1000 |
| arcade-bowling-pro-tour | game_specific | 292.65 | 0 | 292.65 | 292.65 | 1000 |
| arcade-cosmic-vanguard | game_specific | 289.92 | 0 | 289.92 | 289.92 | 1000 |
| arcade-golf-tour-2d | game_specific | 292.42 | 0 | 292.42 | 292.42 | 1000 |
| arcade-archery-horizon | game_specific | 283.56 | 0 | 283.56 | 283.56 | 1000 |
| arcade-pinball-wizard | game_specific | 282.93 | 0 | 282.93 | 282.93 | 1000 |
| arcade-bubble-storm | game_specific | 327.48 | 0 | 327.48 | 327.48 | 1000 |
| arcade-ice-strike-pro | game_specific | 293.28 | 0 | 293.28 | 293.28 | 1000 |
| arcade-neon-crypt | game_specific | 292.8 | 0 | 292.8 | 292.8 | 1000 |
| arcade-neon-rush | game_specific | 577.31 | 0 | 577.31 | 577.31 | 2000 |
| arcade-pong-neon-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-buscaminas-classic | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| sports-head-soccer-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-race2dpro | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-sunset-slipstream | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-quiz-nexus | game_specific | 283.58 | 0 | 283.58 | 283.58 | 1000 |
| knowledge-iq-masters-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-refranes-clasicos | game_specific | 282.36 | 0 | 282.36 | 282.36 | 1000 |
| knowledge-sudoku-sprint | game_specific | 609.45 | 0 | 609.45 | 609.45 | 2000 |
| knowledge-domino-chain | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-ahorcado-flash | game_specific | 591.2 | 0 | 591.2 | 591.2 | 2000 |
| knowledge-paciencia-lite | game_specific | 587.9 | 0 | 587.9 | 587.9 | 2000 |
| knowledge-puzle-deslizante | game_specific | 600.83 | 0 | 600.83 | 600.83 | 2000 |
| knowledge-crucigrama-mini | game_specific | 570.38 | 0 | 570.38 | 570.38 | 2000 |
| knowledge-sopa-letras-mega | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-wordle-pro | game_specific | 930.6 | 0 | 930.6 | 930.6 | 3000 |
| knowledge-anagramas-pro | game_specific | 935.08 | 0 | 935.08 | 935.08 | 3000 |
| knowledge-calculo-mental-flash10 | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tabla-periodica-total | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-mapas-atlas | game_specific | 1231.9 | 0 | 1231.9 | 1231.9 | 4000 |
| knowledge-mapas-camino-corto | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-adivina-pais-silueta | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tangram-pro | game_specific | 590.75 | 0 | 590.75 | 590.75 | 2000 |
| knowledge-cronologia-maestra | game_specific | 636.05 | 0 | 636.05 | 636.05 | 2000 |
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
| arcade-kitchen-rush-2d | game_specific | 596.29 | 0 | 596.29 | 596.29 | 2000 |
| arcade-dig-hole-treasure | game_specific | 584.21 | 0 | 584.21 | 584.21 | 2000 |
| arcade-valle-tranquilo | game_specific | 605.23 | 0 | 605.23 | 605.23 | 2000 |
| sports-basketball-court | game_specific | 288.38 | 0 | 288.38 | 288.38 | 1000 |

## Sin atribución por juego

- Estos juegos están dentro del bundle base compartido en el escenario `warm-game-entry`.
- El benchmark calienta `index.html` y recursos base antes de medir, así que no puede asignarles una latencia por juego sin otro modelo de medición.
- Juegos: arcade-buscaminas-classic, arcade-pacman-maze-protocol, arcade-pong-neon-arena, arcade-retro-bomber-grid, arcade-retro-breakout-1986, arcade-retro-centipede-circuit, arcade-retro-frogger-crossing, arcade-retro-galaga-quantum, arcade-retro-lunar-lander-orbit, arcade-retro-qbert-prism, arcade-retro-river-raid-neon, arcade-retro-road-fighter-synth, arcade-retro-snake-classic, arcade-retro-space-invaders, arcade-retro-tetris-blockfall, arcade-retro-tron-lightcycles, knowledge-adivina-pais-silueta, knowledge-calculo-mental-flash10, knowledge-domino-chain, knowledge-iq-masters-protocol, knowledge-mapas-camino-corto, knowledge-sopa-letras-mega, knowledge-tabla-periodica-total, racing-race2dpro, racing-sunset-slipstream, sports-head-soccer-arena, strategy-baraja-ia-arena, strategy-chess-grandmaster, strategy-damas-clasicas, strategy-hundir-flota-pro, strategy-mansion-triple-enigma, strategy-parchis-ludoteka, strategy-poker-holdem-no-bet, strategy-sudoku-tecnicas

