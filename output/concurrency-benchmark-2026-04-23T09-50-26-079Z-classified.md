# Clasificacion de juegos - 100 concurrentes

- Criterio `estable`: sin errores y `p95 <= 250 ms`.
- Criterio `latencia alta`: sin errores y `p95 > 250 ms`.
- Criterio `errores/timeouts`: `requestErrorCount > 0`.

- Estables: 48
- Latencia alta: 2
- Errores/timeouts: 15

## Estables

| Juego | P95 ms | P99 ms |
| --- | ---: | ---: |
| arcade-bowling-pro-tour | 241.71 | 272.09 |
| arcade-buscaminas-classic | 0 | 0 |
| arcade-ice-strike-pro | 249.6 | 282.58 |
| arcade-pacman-maze-protocol | 0 | 0 |
| arcade-pong-neon-arena | 0 | 0 |
| arcade-retro-bomber-grid | 0 | 0 |
| arcade-retro-breakout-1986 | 0 | 0 |
| arcade-retro-centipede-circuit | 0 | 0 |
| arcade-retro-frogger-crossing | 0 | 0 |
| arcade-retro-galaga-quantum | 0 | 0 |
| arcade-retro-lunar-lander-orbit | 0 | 0 |
| arcade-retro-qbert-prism | 0 | 0 |
| arcade-retro-river-raid-neon | 0 | 0 |
| arcade-retro-road-fighter-synth | 0 | 0 |
| arcade-retro-snake-classic | 0 | 0 |
| arcade-retro-space-invaders | 0 | 0 |
| arcade-retro-tetris-blockfall | 0 | 0 |
| arcade-retro-tron-lightcycles | 0 | 0 |
| knowledge-adivina-pais-silueta | 0 | 0 |
| knowledge-ahorcado-flash | 0 | 0 |
| knowledge-anagramas-pro | 0 | 0 |
| knowledge-calculo-mental-flash10 | 0 | 0 |
| knowledge-cronologia-maestra | 0 | 0 |
| knowledge-crucigrama-mini | 0 | 0 |
| knowledge-domino-chain | 0 | 0 |
| knowledge-iq-masters-protocol | 0 | 0 |
| knowledge-mapas-atlas | 0 | 0 |
| knowledge-mapas-camino-corto | 0 | 0 |
| knowledge-paciencia-lite | 0 | 0 |
| knowledge-puzle-deslizante | 0 | 0 |
| knowledge-quiz-nexus | 0 | 0 |
| knowledge-refranes-clasicos | 0 | 0 |
| knowledge-sopa-letras-mega | 0 | 0 |
| knowledge-sudoku-sprint | 0 | 0 |
| knowledge-tabla-periodica-total | 0 | 0 |
| knowledge-tangram-pro | 0 | 0 |
| knowledge-wordle-pro | 0 | 0 |
| racing-race2dpro | 0 | 0 |
| racing-sunset-slipstream | 0 | 0 |
| sports-head-soccer-arena | 0 | 0 |
| strategy-baraja-ia-arena | 0 | 0 |
| strategy-chess-grandmaster | 0 | 0 |
| strategy-damas-clasicas | 0 | 0 |
| strategy-hundir-flota-pro | 0 | 0 |
| strategy-mansion-triple-enigma | 0 | 0 |
| strategy-parchis-ludoteka | 0 | 0 |
| strategy-poker-holdem-no-bet | 0 | 0 |
| strategy-sudoku-tecnicas | 0 | 0 |

## Latencia Alta

| Juego | Avg ms | P95 ms | P99 ms |
| --- | ---: | ---: | ---: |
| arcade-reactor-toss | 322.56 | 445.64 | 454.08 |
| arcade-pinball-wizard | 203.22 | 305.47 | 327.91 |

## Errores y Timeouts

| Juego | Avg ms | P95 ms | P99 ms | Errores | Fallo principal |
| --- | ---: | ---: | ---: | ---: | --- |
| arcade-dig-hole-treasure | 1395.7 | 1670.93 | 1675.64 | 268 | /arcade/dig-hole-treasure/index.html:fetch failed |
| arcade-valle-tranquilo | 1146.48 | 1326.29 | 1336.89 | 81 | /assets/index-b747ed83.js:fetch failed |
| arcade-neon-rush | 555.85 | 659.67 | 671.68 | 88 | /assets/index-4421b3fa.js:fetch failed |
| arcade-stick-brawl-showdown | 360.73 | 466.82 | 475.94 | 146 | /assets/index-3866d0f6.js:fetch failed |
| arcade-kitchen-rush-2d | 317.18 | 456.88 | 461.86 | 72 | /assets/index-176d3589.js:fetch failed |
| platformer-sky-runner | 335.73 | 454.02 | 458.32 | 44 | /assets/PlatformerGame-66c72b87.js:fetch failed |
| arcade-territory-war | 300.36 | 433.07 | 460.15 | 11 | /assets/index-60d24ea3.js:fetch failed |
| arcade-archery-horizon | 281.45 | 406.23 | 414.76 | 10 | /assets/index-d8664a64.js:fetch failed |
| arcade-orchard-match-blast | 229.03 | 316.55 | 341.71 | 21 | /assets/index-7dc890b5.js:fetch failed |
| arcade-bubble-storm | 201.88 | 265.86 | 272.29 | 18 | /assets/index-f0d57694.js:fetch failed |
| sports-basketball-court | 171.45 | 262.99 | 267.83 | 45 | /assets/index-a1c6b4a5.js:fetch failed |
| arcade-golf-tour-2d | 170.79 | 261.16 | 268.07 | 9 | /assets/index-93fb55dc.js:fetch failed |
| arcade-neon-crypt | 196.94 | 253.49 | 254.45 | 18 | /assets/index-34279f43.js:fetch failed |
| arcade-cosmic-vanguard | 167.11 | 217.71 | 224.48 | 45 | /assets/index-70f4b045.js:fetch failed |
| arcade-billar-pool-club | 157.08 | 210.49 | 215.3 | 25 | /assets/index-bcafcaf5.js:fetch failed |

