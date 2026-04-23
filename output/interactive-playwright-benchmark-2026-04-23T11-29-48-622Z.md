# Interactive Playwright Benchmark

- Base URL: `http://127.0.0.1:4174`
- Timeout per game: `15000 ms`
- Bridge wait budget: `2500 ms`
- Post-click wait budget: `2500 ms`
- Total games: `5`
- Interactive detected: `5`
- Timeouts: `0`

## Summary

- Bridge p50: `6679.95 ms`
- Bridge p95: `8107.96 ms`
- Interactive p50: `8436.63 ms`
- Interactive p95: `13676.24 ms`

## Slowest

| Game | Interactive ms | Bridge ms | State |
| --- | ---: | ---: | --- |
| platformer-sky-runner | 13676.24 | - | platformer_arcade, playing |
| arcade-territory-war | 12581.7 | - | battle, playing |
| arcade-archery-horizon | 8436.63 | 8107.96 | arcade-archery-horizon, play, aiming |
| arcade-kitchen-rush-2d | 6831.09 | 6679.95 | arcade-kitchen-rush-2d, playing, running |
| arcade-orchard-match-blast | 6831.04 | 6570.8 | arcade_match3, playing |
