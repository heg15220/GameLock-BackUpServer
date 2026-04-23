# Benchmark de concurrencia

- Fecha: 2026-04-23T21:13:26.785Z
- Base URL: http://127.0.0.1:4173
- Usuarios concurrentes por juego: 1000
- Juegos medidos: 65
- Juegos con medida especifica: 31
- Juegos en bundle base compartido: 34
- SLA objetivo por fase: <= 500 ms (P95)
- Errores de sesión: 11458
- Errores de petición: 23120

## SLA

- Start stage OK: 1/31
- Ready to play OK: 1/31
- Fallan start stage: knowledge-wordle-pro (20372.32 ms), knowledge-ahorcado-flash (20316.08 ms), knowledge-anagramas-pro (8871.9 ms), knowledge-refranes-clasicos (6388.8 ms), knowledge-paciencia-lite (4741.55 ms), knowledge-puzle-deslizante (3997.18 ms), arcade-reactor-toss (3996.87 ms), knowledge-crucigrama-mini (3680.53 ms), arcade-billar-pool-club (3188.41 ms), platformer-sky-runner (3137.83 ms), knowledge-sudoku-sprint (2999.88 ms), arcade-bowling-pro-tour (2934.91 ms), knowledge-quiz-nexus (2915.13 ms), arcade-archery-horizon (2912.28 ms), arcade-golf-tour-2d (2898.08 ms), arcade-neon-rush (2491.59 ms), arcade-stick-brawl-showdown (2475.06 ms), arcade-cosmic-vanguard (2293.86 ms), arcade-ice-strike-pro (2265.37 ms), arcade-orchard-match-blast (2117.65 ms), arcade-pinball-wizard (1993.3 ms), arcade-neon-crypt (1928.08 ms), arcade-bubble-storm (1809.85 ms), arcade-territory-war (1749.69 ms), knowledge-mapas-atlas (1380.26 ms), arcade-dig-hole-treasure (948.9 ms), arcade-kitchen-rush-2d (900.14 ms), knowledge-cronologia-maestra (728.75 ms), knowledge-tangram-pro (709.04 ms), arcade-valle-tranquilo (646.79 ms)
- Fallan ready to play: knowledge-wordle-pro (20372.32 ms), knowledge-ahorcado-flash (20316.08 ms), knowledge-anagramas-pro (8871.9 ms), knowledge-refranes-clasicos (6388.8 ms), knowledge-paciencia-lite (4741.55 ms), knowledge-puzle-deslizante (3997.18 ms), arcade-reactor-toss (3996.87 ms), knowledge-crucigrama-mini (3680.53 ms), arcade-billar-pool-club (3188.41 ms), platformer-sky-runner (3137.83 ms), knowledge-sudoku-sprint (2999.88 ms), arcade-bowling-pro-tour (2934.91 ms), knowledge-quiz-nexus (2915.13 ms), arcade-archery-horizon (2912.28 ms), arcade-golf-tour-2d (2898.08 ms), arcade-neon-rush (2491.59 ms), arcade-stick-brawl-showdown (2475.06 ms), arcade-cosmic-vanguard (2293.86 ms), arcade-ice-strike-pro (2265.37 ms), arcade-orchard-match-blast (2117.65 ms), arcade-pinball-wizard (1993.3 ms), arcade-neon-crypt (1928.08 ms), arcade-bubble-storm (1809.85 ms), arcade-territory-war (1749.69 ms), knowledge-mapas-atlas (1380.26 ms), arcade-dig-hole-treasure (948.9 ms), arcade-kitchen-rush-2d (900.14 ms), knowledge-cronologia-maestra (728.75 ms), knowledge-tangram-pro (709.04 ms), arcade-valle-tranquilo (646.79 ms)

## Peor P95 por inicio

| Juego | Start Avg ms | Start P95 ms |
| --- | ---: | ---: |
| knowledge-wordle-pro | 15346.26 | 20372.32 |
| knowledge-ahorcado-flash | 14846.9 | 20316.08 |
| knowledge-anagramas-pro | 8378.11 | 8871.9 |
| knowledge-refranes-clasicos | 5854.46 | 6388.8 |
| knowledge-paciencia-lite | 3642.03 | 4741.55 |
| knowledge-puzle-deslizante | 2925.85 | 3997.18 |
| arcade-reactor-toss | 3633.7 | 3996.87 |
| knowledge-crucigrama-mini | 2797.58 | 3680.53 |
| arcade-billar-pool-club | 2874.08 | 3188.41 |
| platformer-sky-runner | 2663.36 | 3137.83 |

## Peor P95 listo para jugar

| Juego | Ready Avg ms | Ready P95 ms |
| --- | ---: | ---: |
| knowledge-wordle-pro | 15346.26 | 20372.32 |
| knowledge-ahorcado-flash | 14846.9 | 20316.08 |
| knowledge-anagramas-pro | 8378.11 | 8871.9 |
| knowledge-refranes-clasicos | 5854.46 | 6388.8 |
| knowledge-paciencia-lite | 3642.03 | 4741.55 |
| knowledge-puzle-deslizante | 2925.85 | 3997.18 |
| arcade-reactor-toss | 3633.7 | 3996.87 |
| knowledge-crucigrama-mini | 2797.58 | 3680.53 |
| arcade-billar-pool-club | 2874.08 | 3188.41 |
| platformer-sky-runner | 2663.36 | 3137.83 |

## Resultados completos

| Juego | Modo | Start P95 ms | Gameplay P95 ms | Ready P95 ms | Total P95 ms | Errores |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| platformer-sky-runner | game_specific | 3137.83 | 0 | 3137.83 | 3137.83 | 0 |
| arcade-pacman-maze-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-stick-brawl-showdown | game_specific | 2475.06 | 0 | 2475.06 | 2475.06 | 768 |
| arcade-reactor-toss | game_specific | 3996.87 | 0 | 3996.87 | 3996.87 | 0 |
| arcade-territory-war | game_specific | 1749.69 | 0 | 1749.69 | 1749.69 | 0 |
| arcade-orchard-match-blast | game_specific | 2117.65 | 0 | 2117.65 | 2117.65 | 0 |
| arcade-billar-pool-club | game_specific | 3188.41 | 0 | 3188.41 | 3188.41 | 0 |
| arcade-bowling-pro-tour | game_specific | 2934.91 | 0 | 2934.91 | 2934.91 | 0 |
| arcade-cosmic-vanguard | game_specific | 2293.86 | 0 | 2293.86 | 2293.86 | 0 |
| arcade-golf-tour-2d | game_specific | 2898.08 | 0 | 2898.08 | 2898.08 | 0 |
| arcade-archery-horizon | game_specific | 2912.28 | 0 | 2912.28 | 2912.28 | 0 |
| arcade-pinball-wizard | game_specific | 1993.3 | 0 | 1993.3 | 1993.3 | 0 |
| arcade-bubble-storm | game_specific | 1809.85 | 0 | 1809.85 | 1809.85 | 0 |
| arcade-ice-strike-pro | game_specific | 2265.37 | 0 | 2265.37 | 2265.37 | 0 |
| arcade-neon-crypt | game_specific | 1928.08 | 0 | 1928.08 | 1928.08 | 0 |
| arcade-neon-rush | game_specific | 2491.59 | 0 | 2491.59 | 2491.59 | 768 |
| arcade-pong-neon-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-buscaminas-classic | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| sports-head-soccer-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-race2dpro | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-sunset-slipstream | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-quiz-nexus | game_specific | 2915.13 | 0 | 2915.13 | 2915.13 | 0 |
| knowledge-iq-masters-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-refranes-clasicos | game_specific | 6388.8 | 0 | 6388.8 | 6388.8 | 0 |
| knowledge-sudoku-sprint | game_specific | 2999.88 | 0 | 2999.88 | 2999.88 | 783 |
| knowledge-domino-chain | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-ahorcado-flash | game_specific | 20316.08 | 0 | 20316.08 | 20316.08 | 1276 |
| knowledge-paciencia-lite | game_specific | 4741.55 | 0 | 4741.55 | 4741.55 | 592 |
| knowledge-puzle-deslizante | game_specific | 3997.18 | 0 | 3997.18 | 3997.18 | 0 |
| knowledge-crucigrama-mini | game_specific | 3680.53 | 0 | 3680.53 | 3680.53 | 0 |
| knowledge-sopa-letras-mega | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-wordle-pro | game_specific | 20372.32 | 0 | 20372.32 | 20372.32 | 1512 |
| knowledge-anagramas-pro | game_specific | 8871.9 | 0 | 8871.9 | 8871.9 | 2421 |
| knowledge-calculo-mental-flash10 | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tabla-periodica-total | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-mapas-atlas | game_specific | 1380.26 | 0 | 1380.26 | 1380.26 | 4000 |
| knowledge-mapas-camino-corto | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-adivina-pais-silueta | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tangram-pro | game_specific | 709.04 | 0 | 709.04 | 709.04 | 2000 |
| knowledge-cronologia-maestra | game_specific | 728.75 | 0 | 728.75 | 728.75 | 2000 |
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
| arcade-kitchen-rush-2d | game_specific | 900.14 | 0 | 900.14 | 900.14 | 2000 |
| arcade-dig-hole-treasure | game_specific | 948.9 | 0 | 948.9 | 948.9 | 2000 |
| arcade-valle-tranquilo | game_specific | 646.79 | 0 | 646.79 | 646.79 | 2000 |
| sports-basketball-court | game_specific | 337.92 | 0 | 337.92 | 337.92 | 1000 |

## Sin atribución por juego

- Estos juegos están dentro del bundle base compartido en el escenario `warm-game-entry`.
- El benchmark calienta `index.html` y recursos base antes de medir, así que no puede asignarles una latencia por juego sin otro modelo de medición.
- Juegos: arcade-buscaminas-classic, arcade-pacman-maze-protocol, arcade-pong-neon-arena, arcade-retro-bomber-grid, arcade-retro-breakout-1986, arcade-retro-centipede-circuit, arcade-retro-frogger-crossing, arcade-retro-galaga-quantum, arcade-retro-lunar-lander-orbit, arcade-retro-qbert-prism, arcade-retro-river-raid-neon, arcade-retro-road-fighter-synth, arcade-retro-snake-classic, arcade-retro-space-invaders, arcade-retro-tetris-blockfall, arcade-retro-tron-lightcycles, knowledge-adivina-pais-silueta, knowledge-calculo-mental-flash10, knowledge-domino-chain, knowledge-iq-masters-protocol, knowledge-mapas-camino-corto, knowledge-sopa-letras-mega, knowledge-tabla-periodica-total, racing-race2dpro, racing-sunset-slipstream, sports-head-soccer-arena, strategy-baraja-ia-arena, strategy-chess-grandmaster, strategy-damas-clasicas, strategy-hundir-flota-pro, strategy-mansion-triple-enigma, strategy-parchis-ludoteka, strategy-poker-holdem-no-bet, strategy-sudoku-tecnicas

