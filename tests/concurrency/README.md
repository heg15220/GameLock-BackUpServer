# Concurrency tests — 500 virtual users

Pruebas de carga que miden el tiempo de respuesta de los 3 backends y el
servidor estático de la SPA frente a 500 usuarios concurrentes, en cada uno
de los 3 phases del flujo de juego: **abrir**, **darle a jugar**, **gameplay
activo**. Objetivo declarado: `avg ≤ 500 ms` en cada fase.

## Layout

```
tests/concurrency/
├── lib/
│   ├── stats.mjs         — percentiles + tabla
│   ├── http-client.mjs   — agente HTTP keep-alive compartido
│   └── load-runner.mjs   — runner de N usuarios concurrentes con phases
├── run-backend-load.mjs  — escenarios para los 3 backends
├── run-frontend-load.mjs — fetch concurrente de index.html, main bundle y
│                           cada chunk lazy de juego
├── run-all.mjs           — orquestador (build + servicios + ambos runners)
└── results/              — JSON por ejecución + latest.json
```

## Cómo se ejecuta

```bash
# 1) build una sola vez
npm run build

# 2) levantar servicios manualmente (en paralelo)
node server/cosmic-vanguard-backend.mjs &
node server/penalty-shootout/index.mjs &
WIKIPEDIA_GACHA_DB_PATH=/tmp/gacha.sqlite \
  WIKIPEDIA_GACHA_RATE_LIMIT_PER_MIN=10000 \
  node server/wikipedia-gacha/index.mjs &
npx vite preview --host 127.0.0.1 --port 4173 &

# 3) ejecutar runners
node tests/concurrency/run-backend-load.mjs
node tests/concurrency/run-frontend-load.mjs

# o todo en uno (orquestado)
node tests/concurrency/run-all.mjs
```

Variables de entorno relevantes:

| Variable                | Default                  | Descripción                         |
|-------------------------|--------------------------|-------------------------------------|
| `CONCURRENCY_VUS`       | `500`                    | usuarios virtuales concurrentes     |
| `CONCURRENCY_THRESHOLD_MS` | `500`                 | umbral de avg para verdict          |
| `COSMIC_BASE`           | `http://127.0.0.1:8787`  |                                     |
| `PENALTY_BASE`          | `http://127.0.0.1:8788`  |                                     |
| `GACHA_BASE`            | `http://127.0.0.1:8791`  |                                     |
| `PREVIEW_BASE`          | `http://127.0.0.1:4173`  |                                     |

## Qué se mide

### Backend (3 servicios)

Cada VU recorre las 3 fases con tokens/sesiones distintas:

| Backend           | open                         | play                         | gameplay                       |
|-------------------|------------------------------|------------------------------|--------------------------------|
| cosmic-vanguard   | `GET /config`                | `GET /leaderboard`           | `POST /runs` (escribe entry)   |
| penalty-shootout  | `GET /teams`                 | `POST /matches`              | `POST /matches/:id/shots`      |
| wikipedia-gacha   | `POST /session/bootstrap`    | `GET /packs/status`          | `POST /packs/open`             |

### Frontend (1 SPA + chunks lazy)

- `app · index.html`: 500 concurrent `GET /` (Vite preview).
- `app · main bundle`: 500 concurrent `GET /assets/index-{hash}.js`.
- `open_game_chunk` por cada juego: 500 concurrent `GET` al chunk lazy del
  juego (resolución por nombre de prefijo o por marker de contenido para los
  chunks anónimos `index-{hash}.js`).

> **Nota**: las fases "play" y "gameplay activo" para los juegos
> *frontend-only* no implican coste HTTP — corren íntegramente en el
> navegador del usuario, así que la concurrencia no las afecta. La medición
> per-cliente de esas fases vive ya en `tests/bench/bench.spec.js` con la
> instrumentación `window.__bench`.

## Verdict

Cada fila se etiqueta `ok` si `avg ≤ threshold` **y** error-rate `< 2 %`.
En caso contrario, `fail`. El runner sale con exit code `1` si alguna
fila falla.
