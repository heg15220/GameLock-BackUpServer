# Benchmark de concurrencia

- Fecha: 2026-04-23T20:24:03.818Z
- Base URL: http://127.0.0.1:4173
- Usuarios concurrentes por juego: 1000
- Juegos medidos: 65
- Juegos con medida especifica: 31
- Juegos en bundle base compartido: 34
- SLA objetivo por fase: <= 500 ms (P95)
- Errores de sesión: 142
- Errores de petición: 423

## SLA

- Start stage OK: 10/31
- Ready to play OK: 10/31
- Fallan start stage: knowledge-anagramas-pro (19778.46 ms), knowledge-mapas-atlas (18679.21 ms), knowledge-wordle-pro (17313 ms), knowledge-ahorcado-flash (10656.53 ms), knowledge-cronologia-maestra (8914.59 ms), arcade-kitchen-rush-2d (3540.16 ms), knowledge-paciencia-lite (3477.31 ms), knowledge-tangram-pro (3066.88 ms), arcade-stick-brawl-showdown (1899.13 ms), arcade-valle-tranquilo (1782.79 ms), arcade-neon-rush (1702.35 ms), platformer-sky-runner (1583.02 ms), knowledge-refranes-clasicos (1152.25 ms), arcade-dig-hole-treasure (1102.73 ms), knowledge-crucigrama-mini (917.72 ms), knowledge-puzle-deslizante (915.85 ms), knowledge-sudoku-sprint (885.05 ms), arcade-reactor-toss (864.89 ms), arcade-billar-pool-club (623.62 ms), sports-basketball-court (621.33 ms), arcade-cosmic-vanguard (558.86 ms)
- Fallan ready to play: knowledge-anagramas-pro (19778.46 ms), knowledge-mapas-atlas (18679.21 ms), knowledge-wordle-pro (17313 ms), knowledge-ahorcado-flash (10656.53 ms), knowledge-cronologia-maestra (8914.59 ms), arcade-kitchen-rush-2d (3540.16 ms), knowledge-paciencia-lite (3477.31 ms), knowledge-tangram-pro (3066.88 ms), arcade-stick-brawl-showdown (1899.13 ms), arcade-valle-tranquilo (1782.79 ms), arcade-neon-rush (1702.35 ms), platformer-sky-runner (1583.02 ms), knowledge-refranes-clasicos (1152.25 ms), arcade-dig-hole-treasure (1102.73 ms), knowledge-crucigrama-mini (917.72 ms), knowledge-puzle-deslizante (915.85 ms), knowledge-sudoku-sprint (885.05 ms), arcade-reactor-toss (864.89 ms), arcade-billar-pool-club (623.62 ms), sports-basketball-court (621.33 ms), arcade-cosmic-vanguard (558.86 ms)

## Peor P95 por inicio

| Juego | Start Avg ms | Start P95 ms |
| --- | ---: | ---: |
| knowledge-anagramas-pro | 14839.52 | 19778.46 |
| knowledge-mapas-atlas | 14101.23 | 18679.21 |
| knowledge-wordle-pro | 11442.56 | 17313 |
| knowledge-ahorcado-flash | 6730.1 | 10656.53 |
| knowledge-cronologia-maestra | 5844.45 | 8914.59 |
| arcade-kitchen-rush-2d | 3433.6 | 3540.16 |
| knowledge-paciencia-lite | 3406.68 | 3477.31 |
| knowledge-tangram-pro | 3032.61 | 3066.88 |
| arcade-stick-brawl-showdown | 1566.33 | 1899.13 |
| arcade-valle-tranquilo | 1590.53 | 1782.79 |

## Peor P95 listo para jugar

| Juego | Ready Avg ms | Ready P95 ms |
| --- | ---: | ---: |
| knowledge-anagramas-pro | 14839.52 | 19778.46 |
| knowledge-mapas-atlas | 14101.23 | 18679.21 |
| knowledge-wordle-pro | 11442.56 | 17313 |
| knowledge-ahorcado-flash | 6730.1 | 10656.53 |
| knowledge-cronologia-maestra | 5844.45 | 8914.59 |
| arcade-kitchen-rush-2d | 3433.6 | 3540.16 |
| knowledge-paciencia-lite | 3406.68 | 3477.31 |
| knowledge-tangram-pro | 3032.61 | 3066.88 |
| arcade-stick-brawl-showdown | 1566.33 | 1899.13 |
| arcade-valle-tranquilo | 1590.53 | 1782.79 |

## Resultados completos

| Juego | Modo | Start P95 ms | Gameplay P95 ms | Ready P95 ms | Total P95 ms | Errores |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| platformer-sky-runner | game_specific | 1583.02 | 0 | 1583.02 | 1583.02 | 0 |
| arcade-pacman-maze-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-stick-brawl-showdown | game_specific | 1899.13 | 0 | 1899.13 | 1899.13 | 0 |
| arcade-reactor-toss | game_specific | 864.89 | 0 | 864.89 | 864.89 | 0 |
| arcade-territory-war | game_specific | 435.15 | 0 | 435.15 | 435.15 | 0 |
| arcade-orchard-match-blast | game_specific | 499.05 | 0 | 499.05 | 499.05 | 0 |
| arcade-billar-pool-club | game_specific | 623.62 | 0 | 623.62 | 623.62 | 0 |
| arcade-bowling-pro-tour | game_specific | 493.98 | 0 | 493.98 | 493.98 | 0 |
| arcade-cosmic-vanguard | game_specific | 558.86 | 0 | 558.86 | 558.86 | 0 |
| arcade-golf-tour-2d | game_specific | 490.81 | 0 | 490.81 | 490.81 | 0 |
| arcade-archery-horizon | game_specific | 463.85 | 0 | 463.85 | 463.85 | 0 |
| arcade-pinball-wizard | game_specific | 438.72 | 0 | 438.72 | 438.72 | 0 |
| arcade-bubble-storm | game_specific | 417.56 | 0 | 417.56 | 417.56 | 0 |
| arcade-ice-strike-pro | game_specific | 455.13 | 0 | 455.13 | 455.13 | 0 |
| arcade-neon-crypt | game_specific | 476.37 | 0 | 476.37 | 476.37 | 0 |
| arcade-neon-rush | game_specific | 1702.35 | 0 | 1702.35 | 1702.35 | 0 |
| arcade-pong-neon-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| arcade-buscaminas-classic | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| sports-head-soccer-arena | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-race2dpro | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| racing-sunset-slipstream | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-quiz-nexus | game_specific | 497.02 | 0 | 497.02 | 497.02 | 0 |
| knowledge-iq-masters-protocol | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-refranes-clasicos | game_specific | 1152.25 | 0 | 1152.25 | 1152.25 | 0 |
| knowledge-sudoku-sprint | game_specific | 885.05 | 0 | 885.05 | 885.05 | 0 |
| knowledge-domino-chain | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-ahorcado-flash | game_specific | 10656.53 | 0 | 10656.53 | 10656.53 | 422 |
| knowledge-paciencia-lite | game_specific | 3477.31 | 0 | 3477.31 | 3477.31 | 0 |
| knowledge-puzle-deslizante | game_specific | 915.85 | 0 | 915.85 | 915.85 | 0 |
| knowledge-crucigrama-mini | game_specific | 917.72 | 0 | 917.72 | 917.72 | 0 |
| knowledge-sopa-letras-mega | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-wordle-pro | game_specific | 17313 | 0 | 17313 | 17313 | 0 |
| knowledge-anagramas-pro | game_specific | 19778.46 | 0 | 19778.46 | 19778.46 | 1 |
| knowledge-calculo-mental-flash10 | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tabla-periodica-total | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-mapas-atlas | game_specific | 18679.21 | 0 | 18679.21 | 18679.21 | 0 |
| knowledge-mapas-camino-corto | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-adivina-pais-silueta | shared_base_bundle | n/a | n/a | n/a | n/a | 0 |
| knowledge-tangram-pro | game_specific | 3066.88 | 0 | 3066.88 | 3066.88 | 0 |
| knowledge-cronologia-maestra | game_specific | 8914.59 | 0 | 8914.59 | 8914.59 | 0 |
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
| arcade-kitchen-rush-2d | game_specific | 3540.16 | 0 | 3540.16 | 3540.16 | 0 |
| arcade-dig-hole-treasure | game_specific | 1102.73 | 0 | 1102.73 | 1102.73 | 0 |
| arcade-valle-tranquilo | game_specific | 1782.79 | 0 | 1782.79 | 1782.79 | 0 |
| sports-basketball-court | game_specific | 621.33 | 0 | 621.33 | 621.33 | 0 |

## Sin atribución por juego

- Estos juegos están dentro del bundle base compartido en el escenario `warm-game-entry`.
- El benchmark calienta `index.html` y recursos base antes de medir, así que no puede asignarles una latencia por juego sin otro modelo de medición.
- Juegos: arcade-buscaminas-classic, arcade-pacman-maze-protocol, arcade-pong-neon-arena, arcade-retro-bomber-grid, arcade-retro-breakout-1986, arcade-retro-centipede-circuit, arcade-retro-frogger-crossing, arcade-retro-galaga-quantum, arcade-retro-lunar-lander-orbit, arcade-retro-qbert-prism, arcade-retro-river-raid-neon, arcade-retro-road-fighter-synth, arcade-retro-snake-classic, arcade-retro-space-invaders, arcade-retro-tetris-blockfall, arcade-retro-tron-lightcycles, knowledge-adivina-pais-silueta, knowledge-calculo-mental-flash10, knowledge-domino-chain, knowledge-iq-masters-protocol, knowledge-mapas-camino-corto, knowledge-sopa-letras-mega, knowledge-tabla-periodica-total, racing-race2dpro, racing-sunset-slipstream, sports-head-soccer-arena, strategy-baraja-ia-arena, strategy-chess-grandmaster, strategy-damas-clasicas, strategy-hundir-flota-pro, strategy-mansion-triple-enigma, strategy-parchis-ludoteka, strategy-poker-holdem-no-bet, strategy-sudoku-tecnicas

