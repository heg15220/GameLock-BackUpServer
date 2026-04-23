# Benchmark de concurrencia

- Fecha: 2026-04-23T21:06:55.791Z
- Base URL: http://127.0.0.1:4173
- Usuarios concurrentes por juego: 1000
- Juegos medidos: 65
- Juegos con medida especifica: 31
- Juegos en bundle base compartido: 34
- SLA objetivo por fase: <= 500 ms (P95)
- Errores de sesión: 8472
- Errores de petición: 11988

## SLA

- Start stage OK: 0/31
- Ready to play OK: 0/31
- Fallan start stage: knowledge-mapas-atlas (21520.4 ms), knowledge-anagramas-pro (20838.88 ms), knowledge-ahorcado-flash (20666.19 ms), knowledge-cronologia-maestra (20585.39 ms), knowledge-wordle-pro (20396 ms), arcade-kitchen-rush-2d (9771.77 ms), arcade-valle-tranquilo (8139.58 ms), knowledge-paciencia-lite (6798.15 ms), knowledge-refranes-clasicos (6233.01 ms), knowledge-tangram-pro (6051.56 ms), arcade-reactor-toss (3676.85 ms), arcade-billar-pool-club (3643.54 ms), arcade-dig-hole-treasure (3488.7 ms), arcade-bowling-pro-tour (3231.94 ms), platformer-sky-runner (3050.78 ms), knowledge-puzle-deslizante (2906.81 ms), sports-basketball-court (2620.78 ms), arcade-archery-horizon (2596.07 ms), arcade-golf-tour-2d (2578.77 ms), arcade-stick-brawl-showdown (2568.15 ms), knowledge-quiz-nexus (2464.62 ms), knowledge-crucigrama-mini (2453.13 ms), arcade-neon-rush (2328.59 ms), knowledge-sudoku-sprint (2230.89 ms), arcade-orchard-match-blast (2104.52 ms), arcade-cosmic-vanguard (2081.54 ms), arcade-ice-strike-pro (2031.54 ms), arcade-pinball-wizard (1901.3 ms), arcade-neon-crypt (1827.1 ms), arcade-territory-war (1717.85 ms), arcade-bubble-storm (1692.01 ms)
- Fallan ready to play: knowledge-mapas-atlas (21520.4 ms), knowledge-anagramas-pro (20838.88 ms), knowledge-ahorcado-flash (20666.19 ms), knowledge-cronologia-maestra (20585.39 ms), knowledge-wordle-pro (20396 ms), arcade-kitchen-rush-2d (9771.77 ms), arcade-valle-tranquilo (8139.58 ms), knowledge-paciencia-lite (6798.15 ms), knowledge-refranes-clasicos (6233.01 ms), knowledge-tangram-pro (6051.56 ms), arcade-reactor-toss (3676.85 ms), arcade-billar-pool-club (3643.54 ms), arcade-dig-hole-treasure (3488.7 ms), arcade-bowling-pro-tour (3231.94 ms), platformer-sky-runner (3050.78 ms), knowledge-puzle-deslizante (2906.81 ms), sports-basketball-court (2620.78 ms), arcade-archery-horizon (2596.07 ms), arcade-golf-tour-2d (2578.77 ms), arcade-stick-brawl-showdown (2568.15 ms), knowledge-quiz-nexus (2464.62 ms), knowledge-crucigrama-mini (2453.13 ms), arcade-neon-rush (2328.59 ms), knowledge-sudoku-sprint (2230.89 ms), arcade-orchard-match-blast (2104.52 ms), arcade-cosmic-vanguard (2081.54 ms), arcade-ice-strike-pro (2031.54 ms), arcade-pinball-wizard (1901.3 ms), arcade-neon-crypt (1827.1 ms), arcade-territory-war (1717.85 ms), arcade-bubble-storm (1692.01 ms)

## Peor P95 por inicio

| Juego | Start Avg ms | Start P95 ms |
| --- | ---: | ---: |
| knowledge-mapas-atlas | 20893.28 | 21520.4 |
| knowledge-anagramas-pro | 19984.08 | 20838.88 |
| knowledge-ahorcado-flash | 14866.2 | 20666.19 |
| knowledge-cronologia-maestra | 16908.96 | 20585.39 |
| knowledge-wordle-pro | 13015.38 | 20396 |
| arcade-kitchen-rush-2d | 8953.94 | 9771.77 |
| arcade-valle-tranquilo | 5504.81 | 8139.58 |
| knowledge-paciencia-lite | 6005.25 | 6798.15 |
| knowledge-refranes-clasicos | 5596.57 | 6233.01 |
| knowledge-tangram-pro | 5243.99 | 6051.56 |

## Peor P95 listo para jugar

| Juego | Ready Avg ms | Ready P95 ms |
| --- | ---: | ---: |
| knowledge-mapas-atlas | 20893.28 | 21520.4 |
| knowledge-anagramas-pro | 19984.08 | 20838.88 |
| knowledge-ahorcado-flash | 14866.2 | 20666.19 |
| knowledge-cronologia-maestra | 16908.96 | 20585.39 |
| knowledge-wordle-pro | 13015.38 | 20396 |
| arcade-kitchen-rush-2d | 8953.94 | 9771.77 |
| arcade-valle-tranquilo | 5504.81 | 8139.58 |
| knowledge-paciencia-lite | 6005.25 | 6798.15 |
| knowledge-refranes-clasicos | 5596.57 | 6233.01 |
| knowledge-tangram-pro | 5243.99 | 6051.56 |

## Resultados completos

| Juego | Modo | Start P95 ms | Gameplay P95 ms | Ready P95 ms | Total P95 ms | Errores |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| platformer-sky-runner | game_specific | 3050.78 | 0 | 3050.78 | 3050.78 | 0 |
| arcade-pacman-maze-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-stick-brawl-showdown | game_specific | 2568.15 | 0 | 2568.15 | 2568.15 | 768 |
| arcade-reactor-toss | game_specific | 3676.85 | 0 | 3676.85 | 3676.85 | 0 |
| arcade-territory-war | game_specific | 1717.85 | 0 | 1717.85 | 1717.85 | 0 |
| arcade-orchard-match-blast | game_specific | 2104.52 | 0 | 2104.52 | 2104.52 | 0 |
| arcade-billar-pool-club | game_specific | 3643.54 | 0 | 3643.54 | 3643.54 | 0 |
| arcade-bowling-pro-tour | game_specific | 3231.94 | 0 | 3231.94 | 3231.94 | 0 |
| arcade-cosmic-vanguard | game_specific | 2081.54 | 0 | 2081.54 | 2081.54 | 0 |
| arcade-golf-tour-2d | game_specific | 2578.77 | 0 | 2578.77 | 2578.77 | 0 |
| arcade-archery-horizon | game_specific | 2596.07 | 0 | 2596.07 | 2596.07 | 0 |
| arcade-pinball-wizard | game_specific | 1901.3 | 0 | 1901.3 | 1901.3 | 0 |
| arcade-bubble-storm | game_specific | 1692.01 | 0 | 1692.01 | 1692.01 | 0 |
| arcade-ice-strike-pro | game_specific | 2031.54 | 0 | 2031.54 | 2031.54 | 0 |
| arcade-neon-crypt | game_specific | 1827.1 | 0 | 1827.1 | 1827.1 | 0 |
| arcade-neon-rush | game_specific | 2328.59 | 0 | 2328.59 | 2328.59 | 768 |
| arcade-pong-neon-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-buscaminas-classic | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| sports-head-soccer-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-race2dpro | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-sunset-slipstream | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-quiz-nexus | game_specific | 2464.62 | 0 | 2464.62 | 2464.62 | 0 |
| knowledge-iq-masters-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-refranes-clasicos | game_specific | 6233.01 | 0 | 6233.01 | 6233.01 | 0 |
| knowledge-sudoku-sprint | game_specific | 2230.89 | 0 | 2230.89 | 2230.89 | 791 |
| knowledge-domino-chain | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-ahorcado-flash | game_specific | 20666.19 | 0 | 20666.19 | 20666.19 | 1280 |
| knowledge-paciencia-lite | game_specific | 6798.15 | 0 | 6798.15 | 6798.15 | 0 |
| knowledge-puzle-deslizante | game_specific | 2906.81 | 0 | 2906.81 | 2906.81 | 663 |
| knowledge-crucigrama-mini | game_specific | 2453.13 | 0 | 2453.13 | 2453.13 | 414 |
| knowledge-sopa-letras-mega | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-wordle-pro | game_specific | 20396 | 0 | 20396 | 20396 | 1788 |
| knowledge-anagramas-pro | game_specific | 20838.88 | 0 | 20838.88 | 20838.88 | 1060 |
| knowledge-calculo-mental-flash10 | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tabla-periodica-total | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-mapas-atlas | game_specific | 21520.4 | 0 | 21520.4 | 21520.4 | 1190 |
| knowledge-mapas-camino-corto | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-adivina-pais-silueta | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tangram-pro | game_specific | 6051.56 | 0 | 6051.56 | 6051.56 | 440 |
| knowledge-cronologia-maestra | game_specific | 20585.39 | 0 | 20585.39 | 20585.39 | 1107 |
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
| arcade-kitchen-rush-2d | game_specific | 9771.77 | 0 | 9771.77 | 9771.77 | 0 |
| arcade-dig-hole-treasure | game_specific | 3488.7 | 0 | 3488.7 | 3488.7 | 840 |
| arcade-valle-tranquilo | game_specific | 8139.58 | 0 | 8139.58 | 8139.58 | 608 |
| sports-basketball-court | game_specific | 2620.78 | 0 | 2620.78 | 2620.78 | 271 |

## Sin atribución por juego

- Estos juegos están dentro del bundle base compartido en el escenario `warm-game-entry`.
- El benchmark calienta `index.html` y recursos base antes de medir, así que no puede asignarles una latencia por juego sin otro modelo de medición.
- Juegos: arcade-buscaminas-classic, arcade-pacman-maze-protocol, arcade-pong-neon-arena, arcade-retro-bomber-grid, arcade-retro-breakout-1986, arcade-retro-centipede-circuit, arcade-retro-frogger-crossing, arcade-retro-galaga-quantum, arcade-retro-lunar-lander-orbit, arcade-retro-qbert-prism, arcade-retro-river-raid-neon, arcade-retro-road-fighter-synth, arcade-retro-snake-classic, arcade-retro-space-invaders, arcade-retro-tetris-blockfall, arcade-retro-tron-lightcycles, knowledge-adivina-pais-silueta, knowledge-calculo-mental-flash10, knowledge-domino-chain, knowledge-iq-masters-protocol, knowledge-mapas-camino-corto, knowledge-sopa-letras-mega, knowledge-tabla-periodica-total, racing-race2dpro, racing-sunset-slipstream, sports-head-soccer-arena, strategy-baraja-ia-arena, strategy-chess-grandmaster, strategy-damas-clasicas, strategy-hundir-flota-pro, strategy-mansion-triple-enigma, strategy-parchis-ludoteka, strategy-poker-holdem-no-bet, strategy-sudoku-tecnicas

