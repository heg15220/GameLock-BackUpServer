# Interactive Playwright Benchmark

- Base URL: `http://127.0.0.1:4174`
- Timeout per game: `15000 ms`
- Total games: `5`
- Interactive detected: `5`
- Timeouts: `0`

## Summary

- Bridge p50: `6744.18 ms`
- Bridge p95: `7687.31 ms`
- Interactive p50: `7821.5 ms`
- Interactive p95: `29846.59 ms`

## Slowest

| Game | Interactive ms | Bridge ms | State |
| --- | ---: | ---: | --- |
| platformer-sky-runner | 29846.59 | - | platformer_arcade, playing |
| arcade-territory-war | 25293.83 | - | battle, playing |
| arcade-archery-horizon | 7821.5 | 7687.31 | arcade-archery-horizon, play, aiming |
| arcade-orchard-match-blast | 7133.11 | 6744.18 | arcade_match3, playing |
| arcade-kitchen-rush-2d | 6674.93 | 6517.65 | arcade-kitchen-rush-2d, playing, running |
