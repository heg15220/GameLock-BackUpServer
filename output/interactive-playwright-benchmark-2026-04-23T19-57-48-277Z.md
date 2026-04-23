# Interactive Playwright Benchmark

- Base URL: `http://127.0.0.1:4173`
- Timeout per game: `20000 ms`
- Bridge wait budget: `5000 ms`
- Post-click wait budget: `5000 ms`
- Total games: `3`
- Interactive detected: `3`
- Timeouts: `0`

## Summary

- Bridge p50: `7659.53 ms`
- Bridge p95: `10706.56 ms`
- Interactive p50: `7887.19 ms`
- Interactive p95: `10854.83 ms`

## Slowest

| Game | Interactive ms | Bridge ms | State |
| --- | ---: | ---: | --- |
| platformer-sky-runner | 10854.83 | 10706.56 | platformer_arcade, playing |
| arcade-territory-war | 7887.19 | 7659.53 | battle, playing |
| arcade-dig-hole-treasure | 4205.71 | 4205.55 | arcade-dig-hole-treasure, world_select |
