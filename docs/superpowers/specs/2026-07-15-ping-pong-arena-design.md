# Ping Pong Arena — Diseño

Fecha: 2026-07-15
Estado: aprobado, en implementación

Sustituye y deja obsoleto cualquier ping pong previo de la plataforma. El WIP anterior
(`src/games/arcade/table-tennis-arena/` y su SVG de catálogo) se borra por completo y se
ignora, por decisión explícita del usuario. Este diseño no reutiliza nada de aquel código
ni del módulo `shared/racket3d` (que pertenece al juego de tenis, intacto).

## Objetivo

Añadir un juego nuevo de tenis de mesa a la sección **Deportes**:

- id `sports-ping-pong-arena`, título **"Ping Pong Arena"**.
- Directorio `src/games/arcade/ping-pong-arena/`.
- Vista en **primera persona pseudo-3D** sobre Canvas 2D (sin three.js), como los dos
  repos de referencia (`shresthalucky/PingPong`, `SafalPandey/js-table-tennis`) y como el
  resto de juegos 3D de Deportes (`basketball-court`).
- **Touch stage** en móvil y tablet: el escenario es el mando. El dedo mueve la pala y el
  *flick* golpea. En escritorio el ratón hace de pala; teclado como alternativa accesible.

## Referencias

Ambos repos clonados son tenis de mesa FPP con proyección 3D→2D propia sobre canvas:
la pala se controla con la posición del ratón/dedo y un **flick** (deslizamiento rápido) en
el instante del contacto define potencia, colocación y efecto. La IA rival espeja la bola y
devuelve. Puntuación a 11. De ahí se toman: la proyección en perspectiva, el modelo de
control por flick, y la lógica de saque/rebote/punto. Se reescribe todo en el estilo React +
runtime del repo destino y se enriquece con efecto (spin) real y formato de partido.

## Arquitectura

Descomposición del módulo (las piezas puras se testean sin DOM ni canvas):

| Fichero | Responsabilidad |
| --- | --- |
| `physics.js` | Constantes de mundo, proyección perspectiva 3D→2D, paso de la bola (gravedad, drag, Magnus por efecto), rebote en mesa con acoplamiento efecto↔bote, colisión con red, y modelo de golpe pala→bola desde el gesto. **Puro y testeado.** |
| `rules.js` | Puntuación: set a 11 con diferencia de 2, rotación de saque (cada 2 puntos, cada 1 desde 10-10), y formato al mejor de 1/3/5 sets. **Puro y testeado.** |
| `ai.js` | Rival: predicción del bote, movimiento de la pala con retardo y error por dificultad, y elección de devolución (colocación + efecto + potencia) con error escalado. **Puro y testeado.** |
| `scene.js` | Render sobre `ctx`: mesa, red, patas, gradas, focos, marcador, palas, bola con sombra, vallas de publicidad, HUD y menús. |
| `engine.js` | Clase `PingPongRuntime`: máquina de estados (menú → saque → peloteo → punto → set → partido), bucle de paso fijo con acumulador, entrada (ratón/dedo/teclado/teclas virtuales), snapshot al puente móvil e integración de las piezas anteriores. |
| `index.jsx` | Componente React: canvas, ciclo de vida del runtime, `useGameRuntimeBridge`, controles táctiles mínimos y pantalla completa. Sigue el patrón de `basketball-court`. |
| `copy.js` | Textos es/en. |

## 1. Perspectiva y render

Cámara en perspectiva tras la línea de fondo del jugador, ligeramente elevada, mirando hacia
la mesa y el rival. Proyección propia `project3D(x, y, z)` (pinhole con distancia focal y
plano de proyección), orden de pintor por profundidad. Canvas dimensionado al contenedor con
clamp de DPR (1–2) y `setTransform`, como el resto de la sección.

Escena: mesa reglamentaria (2.74 × 1.525 m, altura 0.76 m), red de 15.25 cm, patas, línea
central y de fondo, gradas de fondo con público esquemático, focos, marcador y **vallas
publicitarias perimetrales** alimentadas por `src/config/adPreview.js` (marca neutra si la
preview está apagada), en la línea de `penalty-neural-keeper`.

## 2. Control — el escenario es el mando

- **Móvil/tablet** (touch stage): el dedo sobre el canvas mapea la posición de la pala en el
  plano de golpeo cercano (x lateral, y altura). Sin botones de golpe. El id se añade a
  `DIRECT_TOUCH_GAME_IDS` (`mobileGameProfiles.js`) → shell `mobile-first`, y el selector de
  stage `.ping-pong-arena-stage` en `mobileStageProfiles.js` para los anuncios. El deck móvil
  es mínimo: saca + pausa/reinicio + toggle de dificultad.
- **Escritorio**: el ratón *es* la pala, mismo modelo. Teclado accesible: flechas posicionan,
  ↑/↓ fijan el tipo de efecto del próximo golpe, Espacio saca.
- **Gesto → golpe**: velocidad del flick → **potencia**; componente horizontal → **colocación**
  izquierda/derecha; flick hacia **arriba → liftado** (topspin: la bola cae en picado y pica
  acelerando y bajo), hacia **abajo → cortado** (backspin: flota y frena tras botar). El
  contacto se detecta cuando la bola cruza el plano de la pala acercándose y la pala la cubre.

## 3. Física con efecto

Modelo pragmático pero con efecto real (todo en `physics.js`, funciones puras):

- **Vuelo**: gravedad, drag cuadrático y **Magnus** dependiente del efecto y la velocidad de
  avance — el topspin añade fuerza hacia abajo (cae en picado), el backspin hacia arriba
  (flota).
- **Bote en mesa** con restitución y **acoplamiento efecto↔bote**: el topspin sale más bajo y
  acelerado hacia delante; el backspin bota más alto y frena. El efecto decae en cada bote.
- **Red**: si la bola cruza el plano de la red por debajo de su altura, choca; el lado que
  metió en la red pierde el punto (o *let* en el saque si se decide repetir).
- **Substepping a paso fijo** para que una bola rápida no atraviese la red ni la mesa.

## 4. Reglas (rules.js)

- Set a **11 puntos, diferencia de 2**. Formato al mejor de **1 / 3 / 5** sets (elegible en el
  menú).
- **Saque**: rota cada 2 puntos; desde 10-10, cada 1 punto. El saque debe botar primero en el
  campo propio y luego cruzar (como en los repos). El lado de saque alterna por set.
- Fin de partido cuando un jugador gana la mayoría de sets del formato.

## 5. IA (ai.js) — tres niveles

Rival con tres dificultades (**Fácil / Medio / Difícil**). En cada bola:

- **Predice** dónde botará y mueve la pala hacia allí con un **retardo de reacción** y un
  **error de cobertura** escalados por dificultad (fácil llega peor y tarde).
- **Elige la devolución** (colocación lateral, efecto y potencia) con **error angular** y de
  potencia escalados. Fácil comete más faltas no forzadas y arriesga peor; difícil coloca
  mejor, usa más efecto y falla menos.

Todo puro y determinista (RNG inyectable) para poder testear la escalera de niveles.

## 6. Publicidad y responsive

Sistema de anuncios de plataforma: sale solo con el registro correcto — `games.js`
(categoría "Deportes"), `GamePlayground.jsx` (import lazy + mapa de ids + hints es/en),
`mobileStageProfiles.js` (selector de stage), `mobileGameProfiles.js` (deck mínimo + touch
directo) y `gameCatalogDescriptions.js`. No se añade a `TABLET_LANDSCAPE_AD_DISABLED_GAME_IDS`,
para que los raíles laterales salgan en tablet landscape. Vallas dentro de la escena por
`adPreview.js`. SVG de catálogo nuevo en `src/assets/games/`.

Escritorio: ratón + teclado, HUD completo, raíles laterales. Tablet: escenario táctil, HUD
condensado, raíles en landscape. Móvil: `MobileGameShell` touch-native, stack con el estado
primero en portrait, escenario maximizado en landscape.

## 7. Pruebas

**Vitest** sobre las piezas puras:

- `physics`: el liftado (topspin) cae más corto y bajo que el golpe plano con la misma salida;
  el cortado (backspin) flota más; el bote no atraviesa la red; la energía no crece en vuelo.
- `rules`: cierre de set a 11 con diferencia de 2, rotación de saque cada 2 y cada 1 desde
  10-10, y cierre de partido al mejor de 3/5.
- `ai`: monotonicidad de dificultad — un nivel superior alcanza y devuelve más bolas y comete
  menos faltas que el inferior en simulación headless; el error nunca sale de la banda del
  nivel.
