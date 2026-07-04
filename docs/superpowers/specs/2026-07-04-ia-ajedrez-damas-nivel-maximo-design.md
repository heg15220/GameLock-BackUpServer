# Diseño: Reforzar la IA de Ajedrez y Damas (nivel máximo)

- **Fecha:** 2026-07-04
- **Estado:** Aprobado (pendiente de revisión del spec por el usuario)
- **Ámbito:** `src/games/chess/*`, `src/games/checkers/*`, `src/games/shared/*`, integración en `ChessGame.jsx` y `CheckersGame.jsx`.

## 1. Objetivo

Elevar la fuerza de la IA en dificultad máxima ("Experto") en **ajedrez** y **damas**, de un nivel "club débil" a **"club fuerte / experto"** (salto subjetivo grande, sin colgar piezas y viendo táctica de varias jugadas). Se recalibra además la curva de dificultad de los niveles inferiores para que la progresión siga teniendo sentido.

### Encuadre realista (no-objetivos)

- **No** se implementa NNUE, Stockfish, AlphaZero ni tablebases nativas: son motores en C++/redes neuronales entrenadas que calculan millones de posiciones/segundo, inviables en un motor JavaScript en el navegador de un móvil.
- **No** se añade cálculo en servidor ni dependencias de red. Todo corre en el cliente.
- **No** se añaden rutinas dedicadas de finales (KQvK, KRvK); se descartó en el brainstorming.

## 2. Decisiones de alcance (acordadas)

1. **Arquitectura:** la búsqueda corre en un **Web Worker** dentro del navegador del cliente (cero impacto de concurrencia en backend; no comparte estado entre usuarios). Presupuesto de cálculo **~2 s** por jugada; la UI no se congela.
2. **Niveles (opción A):** se mantienen los **4 niveles actuales** (Principiante / Intermedio / Avanzado / Experto). "Experto" pasa a ser el máximo reforzado; se recalibran los intermedios.
3. **Juegos:** ajedrez **y** damas.
4. **Extras:** motor mejorado **+ libro de aperturas** (ajedrez completo; damas mini-libro). Sin finales dedicados.

## 3. Arquitectura (Web Worker + integración)

### 3.1 Protocolo

El estado de ambos juegos ya es **datos puros** (arrays/objetos sin funciones), por lo que se transfiere por `postMessage` (clonado estructurado) sin serialización manual.

- **UI → worker:** `{ id, type: "search", state, levelId }`
- **worker → UI:** `{ id, type: "result", move, info: { depth, score, nodes } }`

La `move` devuelta es un objeto plano con los mismos índices que el estado clonado. Al aplicarla, la UI la **re-empareja** contra sus `legalMoves` reales por `from`/`to`/`promotion`/`captureIndex` para robustez.

### 3.2 Ciclo de vida y control

- **Identificador de petición (`id`):** cada solicitud lleva un `id` incremental. Respuestas cuyo `id` no coincide con la petición vigente se **descartan** (evita jugadas obsoletas tras deshacer/reiniciar).
- **Cancelación:** deshacer, reiniciar o rendirse invalida el `id` en curso.
- **Fallback:** si `typeof Worker === "undefined"` (o falla la creación), se ejecuta el motor **síncrono** en el hilo principal, como hoy.
- **Ritmo ~2 s:** el `deadline` del motor (~1.8 s en Experto) marca el tiempo real. Se conserva un mínimo agradable (~450–600 ms) para que la respuesta no llegue "de golpe" en posiciones triviales.

### 3.3 Hook cliente

`src/games/shared/useEngineWorker.js`: crea/gestiona el worker, expone `requestMove(state, levelId) → Promise<move>`, maneja `id`/cancelación y el fallback síncrono. `ChessGame.jsx` y `CheckersGame.jsx` sustituyen la llamada síncrona actual (`chooseAIMove` dentro de `executeAiMove`) por este flujo asíncrono, manteniendo el resto de la lógica de turnos.

## 4. Motor de búsqueda

Base actual: negamax + poda alfa-beta + *iterative deepening* (+ quiescence en ajedrez). Se añade:

- **Tabla de transposición (TT) + Zobrist hashing:** clave incremental por XOR de valores aleatorios por (pieza, casilla) + turno + enroque + en-passant. Almacén `Map` con `{ depth, score, flag: EXACT|LOWER|UPPER, bestMove }`. Se sondea al entrar en el nodo (con corte si la profundidad y el flag son suficientes) y se guarda al salir. Se **limpia cada jugada** para acotar memoria. El **hash move** encabeza la ordenación (mayor acelerador del alfa-beta).
- **Ordenación de jugadas:** hash move → capturas por **MVV-LVA** → **killer moves** (2 por *ply*) → **history heuristic** (tabla acumulada por cortes).
- **Podas/reducciones:** **null-move pruning** (ajedrez; en damas solo cuando no hay captura obligatoria pendiente), **Late Move Reductions** (reduce jugadas tardías no-captura/no-jaque, con re-búsqueda a plena profundidad si superan alfa), **aspiration windows** en el *iterative deepening*.
- **Quiescence:** ajedrez con *delta pruning*; **damas gana quiescence de capturas encadenadas** (evita el efecto horizonte típico de las capturas obligatorias) — salto de fuerza relevante.
- **Gestión de tiempo:** corte por `deadline` y tope de nodos como salvaguarda; se devuelve siempre la mejor jugada de la **última iteración completada**. Al no bloquear la UI, el tope de nodos sube respecto de los valores actuales.

## 5. Evaluación

### 5.1 Ajedrez

- **Piece-square tables** por fase, **interpoladas apertura↔final** según material no-peón.
- **Estructura de peones:** penalización por doblados y aislados; **bonus por peones pasados** escalado por avance.
- **Torres** en columna abierta / semiabierta.
- **Seguridad del rey:** escudo de peones y penalización por columnas abiertas frente al rey.
- Conserva lo existente: **pareja de alfiles**, movilidad, bonus de centro.

### 5.2 Damas

- Control de columnas y del centro, avance hacia promoción, penalización de hombres atrapados o pegados al borde, bonus por damas activas, **oposición/tempo** básicos.
- Conserva las heurísticas de reglas propias ya evaluadas: `forcedPiece`, `mistakes`, movimiento extra con una sola ficha.

## 6. Libro de aperturas

- **Ajedrez** (`chessOpeningBook.js`): libro compacto de líneas sólidas (Italiana, Ruy López, Siciliana, Gambito de Dama, Caro-Kann, etc.) para las primeras ~6–10 jugadas, indexado por posición (clave tipo FEN corta), con **selección aleatoria ponderada** para dar variedad. Fuera del libro, decide el motor.
- **Damas** (`checkersOpeningBook.js`): mini-libro de aperturas estándar equivalente.
- **Uso por nivel:** Experto/Avanzado usan libro completo; Intermedio parcial; Principiante no lo usa (juega peor de forma natural).

## 7. Recalibración de niveles (opción A)

Un único motor; los niveles se diferencian por parámetros: presupuesto de tiempo/profundidad, `randomness`, `blunderRate`, `topChoices` y uso de libro. Como el motor nuevo es más fuerte a igual profundidad, se **reducen** los presupuestos de los niveles bajos para mantener la accesibilidad.

Curva orientativa (se afina en implementación con las suites tácticas):

| Nivel | Tiempo aprox. | blunderRate | randomness | Libro |
|-------|---------------|-------------|------------|-------|
| Principiante | ~150 ms | alto (~0.18) | alto | no |
| Intermedio | ~400 ms | ~0.05 | medio | parcial |
| Avanzado | ~900 ms | ~0.01 | bajo | sí |
| Experto | ~1800 ms | 0 | 0 | sí |

Damas usa una tabla análoga. Los valores exactos son objetivo de calibración, no contrato.

## 8. Organización del código

Se refactoriza cada `*AI.js` monolítico en unidades con una responsabilidad clara; el motor queda **puro y testeable sin worker** (el worker es solo un envoltorio).

```
src/games/chess/
  chessEngine.js          (sin cambios de fondo; posible exposición de helpers)
  chessEvaluation.js      (eval + PST + estructura de peones + seguridad del rey)
  chessSearch.js          (negamax, TT, podas, ordenación, quiescence, tiempo)
  chessOpeningBook.js     (libro de aperturas)
  chessAI.js              (orquesta: niveles + chooseAIMove; API estable)
  engine.worker.js        (envoltorio worker)

src/games/checkers/
  checkersEngine.js
  checkersEvaluation.js
  checkersSearch.js
  checkersOpeningBook.js
  checkersAI.js
  engine.worker.js

src/games/shared/
  transpositionTable.js   (TT genérica: Map + reemplazo + limpieza)
  useEngineWorker.js       (hook cliente + fallback síncrono)
```

La API pública `chooseAIMove(state, levelId, rng?)` y `getAiLevelById(levelId)` se mantiene estable para no romper los consumidores actuales ni los tests existentes.

## 9. Testing

Vitest en Node (sin worker, porque el motor es puro):

- **Zobrist/TT:** misma posición → misma clave; posiciones distintas → claves distintas; una entrada TT válida corta correctamente.
- **Suites tácticas:** posiciones donde el motor debe **encontrar mate en 1 y en 2** y **no colgar** una pieza (validación objetiva de fuerza en ajedrez y damas).
- **Libro:** toda entrada del libro es una jugada **legal** en su posición.
- **Determinismo:** con `rng` fijo, `chooseAIMove` es reproducible.
- **Presupuesto:** la búsqueda respeta el `deadline`/tope de nodos (no se desborda).
- **Regresión:** los tests existentes de `chessEngine.test.js` y `checkersEngine.test.js` siguen en verde.

## 10. Riesgos y mitigaciones

- **Integración asíncrona del bridge:** hoy la IA se resuelve síncrona dentro del *tick* de `requestAnimationFrame`/`advanceTime`. Mitigación: el hook devuelve una `Promise` y la aplicación de la jugada pasa a un `onmessage`; se conserva el fallback síncrono para el modo sin worker y para los tests.
- **Coste de memoria de la TT:** se limpia por jugada y se limita su tamaño con política de reemplazo.
- **Rendimiento del clonado por nodo:** ya es barato (`board.slice()`); no cambia. El TT reduce nodos, no los encarece.
- **Empaquetado del worker:** Vite soporta `new Worker(new URL(...), { type: "module" })` nativamente; se añade fallback si el navegador no soporta módulos en workers.
