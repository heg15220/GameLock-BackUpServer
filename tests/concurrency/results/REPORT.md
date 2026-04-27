# Concurrency report — 500 VUs vs umbral avg ≤ 500 ms

> Corrida del 2026-04-27 contra `localhost`. VUs=500, threshold=500 ms.
> Stack: Node 22.x · Windows 11 · Vite preview 4.5 · backends Node nativos.
> Wikipedia-gacha en SQLite local (sin Redis), `RATE_LIMIT_PER_MIN=10000`.

## TL;DR

**Ningún juego cumple el objetivo de ≤500 ms avg bajo 500 usuarios concurrentes
en este entorno.**

| Bloque                | Filas medidas | Verdict ok | Verdict fail |
|-----------------------|--------------:|-----------:|-------------:|
| Backend (3 servicios) | 9 fases       | 4          | **5**        |
| Frontend app open     | 2 fases       | 0          | **2**        |
| Frontend per-game     | 68 juegos     | 0          | **68** (5 inlined sin chunk)|

La causa raíz es **saturación de un único proceso Node** (cliente y servidor
comparten CPU; cada servicio corre con un solo worker; Vite preview es
single-thread Connect). Las medidas reflejan eso. Los detalles abajo
desagregan qué es problema de localhost / setup, qué es algoritmo, y qué es
arquitectura.

## Backend (500 VUs)

| backend          | phase    | ok  | err | avg(ms)  | p50  | p95  | p99  | max  | verdict |
|------------------|----------|----:|----:|---------:|-----:|-----:|-----:|-----:|:--------|
| cosmic-vanguard  | open     | 500 | 0   | **790**  | 797  | 941  | 955  | 958  | fail    |
| cosmic-vanguard  | play     | 500 | 0   | 425      | 431  | 485  | 490  | 498  | ok      |
| cosmic-vanguard  | gameplay | 500 | 0   | **538**  | 536  | 636  | 661  | 671  | fail    |
| penalty-shootout | open     | 500 | 0   | **646**  | 657  | 793  | 805  | 807  | fail    |
| penalty-shootout | play     | 500 | 0   | 348      | 341  | 373  | 375  | 375  | ok      |
| penalty-shootout | gameplay | 500 | 0   | 227      | 220  | 337  | 372  | 375  | ok      |
| wikipedia-gacha  | open     | 500 | 0   | **643**  | 644  | 736  | 744  | 745  | fail    |
| wikipedia-gacha  | play     | 500 | 0   | 264      | 263  | 285  | 286  | 287  | ok      |
| wikipedia-gacha  | gameplay | 500 | 0   | **1947** | 1911 | 3273 | 3387 | 3433 | fail    |

**Lectura por servicio:**

- **cosmic-vanguard** lee/escribe un JSON desde disco en cada request (`open`
  → `readStore`; `gameplay` → `readStore` + `writeStore`). 500 reads/writes
  serializadas contra el mismo archivo es lo que se ve. Solución natural:
  cache en memoria en lectura + write-coalescing (escribir cada N runs en
  vez de cada uno).
- **penalty-shootout** sólo `open` cae fuera (lee el JSON de teams) — `play`
  y `gameplay` ya cachean en memoria. Bastaría cachear `getPublicTeams` (es
  catálogo estático) tras la primera lectura.
- **wikipedia-gacha** `gameplay` (= `openPack`) es el peor caso global con
  ~1.9 s avg. Eso ocurre porque la apertura de pack hace varias escrituras
  SQLite por usuario (rolls, contadores, persistencia diferida pero
  reactiva). Bajo 500 sesiones simultáneas el queue por-token ayuda pero el
  worker único de Node satura el CPU. Mitigaciones: arrancar el server con
  `WIKIPEDIA_GACHA_WORKERS=N` (cluster ya soportado), usar Postgres
  + Redis (ya soportado), o en su defecto WAL+`synchronous=NORMAL` en
  SQLite.

## Frontend (500 VUs sobre Vite preview)

### App open

| phase             | ok  | err | avg(ms)  | p95  | p99  | max  | verdict |
|-------------------|----:|----:|---------:|-----:|-----:|-----:|:--------|
| app · index.html  | 500 | 0   | **648**  | 737  | 742  | 746  | fail    |
| app · main bundle | 488 | 12  | **1980** | 2925 | 3035 | 3045 | fail    |

12 conexiones (2.4 %) caen al solicitar el main bundle — Vite preview
satura su accept queue bajo 500 simultáneas. Esto **no es producción**.
En producción tu CDN/Nginx/Cloudfront sirve estos chunks con HTTP/2 y CDN
edges; lo que medimos aquí es el límite de un Connect single-thread sirviendo
un bundle de ~1.5 MB 500 veces a la vez en localhost.

### Per-game lazy chunk

- 68 / 73 juegos medidos (5 están inlined dentro del bundle principal:
  `arcade-reactor-toss`, `arcade-territory-war`, `arcade-golf-tour-2d`,
  `arcade-bubble-storm`, `racing-sunset-slipstream` — su coste de apertura
  = el del main bundle).
- Todos los 68 medidos fallan el budget de 500 ms.
- avg típico: 500-700 ms. Outliers más lentos:
  - `arcade-valle-tranquilo`: 1330 ms avg (bundle más grande del catálogo)
  - `arcade-dig-hole-treasure`: 908 ms
  - `strategy-baraja-ia-arena`: 706 ms

Tabla completa en `frontend-latest.json` — campo `perGame[]`.

> **Importante para frontend-only**: la concurrencia no afecta al gameplay
> per-cliente. Un usuario individual ve 0 ms de coste HTTP cuando le da a
> "jugar" o juega, porque toda la lógica corre en su navegador. La métrica
> de 500 ms / avg sólo aplica a la fase **abrir** (descarga del chunk).
> El coste de "click play → ready" y "input → frame" per-cliente está
> medido en `tests/bench/bench.spec.js` con la instrumentación
> `window.__bench` y se mantiene <50 ms p95 en todos los juegos según el
> último latest.json del bench tradicional.

## Recomendaciones priorizadas

1. **wikipedia-gacha gameplay (1947 ms)**: lo más urgente. Arranca el
   server con `WIKIPEDIA_GACHA_WORKERS=4` (mínimo) o migrar a Postgres+Redis
   detrás de Nginx para esa carga. El cluster mode ya está implementado
   (`server/wikipedia-gacha/index.mjs:432-466`).
2. **cosmic-vanguard open + gameplay (790 / 538 ms)**: introducir cache en
   memoria del leaderboard y debouncing de escrituras. Cambio pequeño,
   gran impacto.
3. **penalty-shootout open (646 ms)**: cachear `getPublicTeams` tras la
   primera lectura.
4. **Frontend**: la media de Vite preview no es representativa. Repetir la
   medida tras desplegar `dist/` detrás de Nginx/CDN o usar
   `npm run preview` con HTTP/2 + reverse proxy. Esperable que todos los
   chunks bajen a <100 ms avg en producción.

## Cómo reproducir

Ver `tests/concurrency/README.md`. JSON crudos en
`tests/concurrency/results/{backend,frontend}-latest.json`.
