# Priorizacion P1 P2 P3 para SLA <= 500 ms con >1000 concurrentes

- Fuente 1: benchmark rapido de entrada con 100 concurrentes por juego.
- Fuente 2: benchmark rapido de entrada con 3000 concurrentes por juego.
- Alcance: esta priorizacion cubre latencia de entrada/carga de recursos del juego, no latencia de acciones internas durante la partida.

## Regla

- `P1`: errores/timeouts ya con 100 concurrentes o `p95 > 500 ms` con 100 concurrentes.
- `P2`: sin errores a 100, pero `250 < p95 <= 500 ms` a 100 o mala escalabilidad a 3000.
- `P3`: sin errores a 100 y margen amplio en esta metrica.

- P1: 15
- P2: 4
- P3: 46

## P1

| Juego | P95 100 ms | Err 100 | P95 3000 ms | Err 3000 | Motivo |
| --- | ---: | ---: | ---: | ---: | --- |
| arcade-dig-hole-treasure | 1670.93 | 268 | 19200.1 | 15000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-valle-tranquilo | 1326.29 | 81 | 10421.33 | 9000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-neon-rush | 659.67 | 88 | 11541.77 | 9000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-stick-brawl-showdown | 466.82 | 146 | 12300.36 | 6000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-kitchen-rush-2d | 456.88 | 72 | 6640.73 | 6000 | Ya presenta errores/timeouts con 100 concurrentes. |
| platformer-sky-runner | 454.02 | 44 | 6409.16 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-territory-war | 433.07 | 11 | 8911.7 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-archery-horizon | 406.23 | 10 | 6065.46 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-orchard-match-blast | 316.55 | 21 | 9982.71 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-bubble-storm | 265.86 | 18 | 6404.79 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| sports-basketball-court | 262.99 | 45 | 3190.36 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-golf-tour-2d | 261.16 | 9 | 6476.17 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-neon-crypt | 253.49 | 18 | 7236.92 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-cosmic-vanguard | 217.71 | 45 | 5176.09 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |
| arcade-billar-pool-club | 210.49 | 25 | 5903.43 | 3000 | Ya presenta errores/timeouts con 100 concurrentes. |

## P2

| Juego | P95 100 ms | Err 100 | P95 3000 ms | Err 3000 | Motivo |
| --- | ---: | ---: | ---: | ---: | --- |
| arcade-reactor-toss | 445.64 | 0 | 8274.54 | 3000 | Est? cerca del l?mite a 100 concurrentes. |
| arcade-pinball-wizard | 305.47 | 0 | 6326.4 | 3000 | Est? cerca del l?mite a 100 concurrentes. |
| arcade-ice-strike-pro | 249.6 | 0 | 5418.51 | 3000 | Escala mal en la prueba de 3000 concurrentes. |
| arcade-bowling-pro-tour | 241.71 | 0 | 5023.98 | 3000 | Escala mal en la prueba de 3000 concurrentes. |

## P3

| Juego | P95 100 ms | Err 100 | P95 3000 ms | Err 3000 | Motivo |
| --- | ---: | ---: | ---: | ---: | --- |
| arcade-pacman-maze-protocol | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-pong-neon-arena | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-buscaminas-classic | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| sports-head-soccer-arena | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| racing-race2dpro | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| racing-sunset-slipstream | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-quiz-nexus | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-iq-masters-protocol | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-refranes-clasicos | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-sudoku-sprint | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-domino-chain | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-ahorcado-flash | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-paciencia-lite | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-puzle-deslizante | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-crucigrama-mini | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-sopa-letras-mega | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-wordle-pro | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-anagramas-pro | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-calculo-mental-flash10 | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-tabla-periodica-total | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-mapas-atlas | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-mapas-camino-corto | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-adivina-pais-silueta | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-tangram-pro | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| knowledge-cronologia-maestra | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-sudoku-tecnicas | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-chess-grandmaster | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-hundir-flota-pro | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-parchis-ludoteka | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-damas-clasicas | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-poker-holdem-no-bet | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-baraja-ia-arena | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| strategy-mansion-triple-enigma | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-snake-classic | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-breakout-1986 | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-space-invaders | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-tetris-blockfall | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-frogger-crossing | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-bomber-grid | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-galaga-quantum | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-qbert-prism | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-lunar-lander-orbit | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-centipede-circuit | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-river-raid-neon | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-tron-lightcycles | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
| arcade-retro-road-fighter-synth | 0 | 0 | 0 | 0 | Cumple holgadamente en esta m?trica de entrada. |
