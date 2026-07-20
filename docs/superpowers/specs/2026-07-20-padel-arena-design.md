# Pádel Pro Arena — Diseño

Fecha: 2026-07-20
Estado: aprobado, en implementación

Añade un juego nuevo de **pádel en pseudo-3D** a la sección **Deportes**. Sigue el patrón del
juego de referencia interno `src/games/arcade/ping-pong-arena/` (deporte de raqueta pseudo-3D
sobre Canvas 2D con motor modular puro y testeado), adaptado a las particularidades del pádel:
pista cerrada por cristales y vallas, juego por parejas (2v2), rebotes de pared válidos y
puntuación reglamentaria.

La calidad de las **mecánicas de juego** (física de la bola, rebotes de cristal, IA de parejas
y respuesta del control) es el criterio de éxito prioritario, por indicación explícita del
usuario.

## Objetivo

- id `sports-padel-arena`, título **"Pádel Pro Arena"**.
- Directorio nuevo y limpio `src/games/sports/padel-arena/` (se crea la sección `sports/`).
- Vista **broadcast pseudo-3D** sobre Canvas 2D: cámara elevada por detrás de la pareja del
  jugador, mirando hacia la red y el fondo rival, con el recinto completo visible.
- **Touch stage** en móvil/tablet con `layout:"split"`: joystick para mover + botón grande de
  golpe/saque, como `arcade-brile`. Teclado en escritorio.

## Decisiones aprobadas (brainstorming)

1. **Cámara:** broadcast, elevada tras la pareja del jugador (no primera persona, no lateral).
2. **Control:** joystick mueve al jugador activo + botón de golpe con **timing manual**; la
   pareja es IA. Se **auto-conmuta el jugador activo** al más cercano a la bola dentro de tu
   pareja (aprobado como matiz): mueves una sola figura a la vez.
3. **Puntuación:** reglamentaria de pádel — 0/15/30/40/Ventaja, juegos a 6 con diferencia de 2,
   **tie-break** a 7, partido al mejor de **1 o 3 sets** (elegible en menú). Saque por debajo
   de la cintura, cruzado, con rotación reglamentaria.

## Arquitectura

Descomposición del módulo (las piezas puras se testean sin DOM ni canvas):

| Fichero | Responsabilidad |
| --- | --- |
| `physics.js` | Constantes de mundo (pista 10×20 m a escala de píxeles), proyección perspectiva 3D→2D (`createCamera`, `project3D`, `unproject`), paso de la bola (gravedad, drag), bote en suelo (restitución de pelota de baja presión), **rebote en cristal de fondo y laterales** con validación de la regla (cristal válido solo tras bote en suelo), colisión continua con la red, detección de `out`/falta (valla, doble bote, fuera del recinto), y modelo de golpe pala→bola desde gesto+timing. **Puro y testeado.** |
| `rules.js` | Puntuación reglamentaria: punto 0/15/30/40/Ventaja, juego, set a 6 (dif 2) con tie-break a 7, partido al mejor de 1/3 sets, rotación de saque y lado de saque (cruzado par/impar). **Puro y testeado.** |
| `ai.js` | IA de las 3 figuras controladas por la máquina (tu pareja + 2 rivales): predicción del punto de corte de la bola, posicionamiento por zona (red/fondo, reparto entre compañeros), y elección de golpe (globo, bandeja, víbora, remate, salida de pared) con error y agresividad escalados por dificultad. **Puro y testeado.** |
| `scene.js` | Render pseudo-3D back-to-front (painter's algorithm) sobre `ctx`: pista + líneas, **cristales** (paneles con reflejo y destello de rebote), **vallas metálicas** (rejilla romboidal), **red** (malla + cinta), **monigotes sin cara** (cuerpo estilizado, dos colores de equipo, animación de carrera/swing, sombra), **palas perforadas** sin cuerdas, bola con brillo y sombra que comunica altura, HUD/marcador y overlays. |
| `engine.js` | Clase `PadelRuntime`: máquina de estados (menú → saque → peloteo → punto → juego → set → partido), bucle de paso fijo con acumulador, entrada (teclado/teclas virtuales/joystick táctil), conmutación del jugador activo, snapshot al puente móvil e integración de las piezas anteriores. Contrato `{ canvas, locale, onSnapshot, onFullscreen }` con `start/destroy/advanceTime/pressVirtualKey/setVirtualKey`. |
| `index.jsx` | Componente React: canvas, ciclo de vida del runtime, `useGameRuntimeBridge`, controles mínimos y pantalla completa. Sigue el patrón de `ping-pong-arena/index.jsx`. |
| `audio.js` | Golpe de pala, bote en suelo, **bote en cristal**, red, aplausos y cantador de árbitro, con toggle. Sigue el patrón `audio.js` existente. |
| `copy.js` | Textos es/en. |

## 1. Geometría y cámara

- Mundo a escala real: pista **10 m ancho × 20 m largo**, red central de **0,88 m** en el
  centro (0,92 m en postes), líneas de saque a 3 m de la red y línea central de saque.
  Coordenadas: `x` ancho (centrado en 0), `y` altura desde suelo, `z` profundidad (tu fondo en
  `z` menor → fondo rival en `z` mayor). Paredes de cristal hasta ~3 m y vallas por encima
  hasta ~4 m en el patrón reglamentario.
- **Cámara broadcast**: posición elevada y ligeramente detrás de la línea de fondo de tu
  pareja, con inclinación hacia la red. Proyección pinhole propia con distancia focal y plano
  de proyección; orden de pintor por profundidad. Canvas dimensionado al contenedor con
  `ResizeObserver` y `devicePixelRatio` (como ping-pong).

## 2. Arte y assets (todo dibujado en Canvas + 1 SVG de catálogo)

- **Pista:** superficie tipo césped artificial (verde/azul) con líneas blancas reglamentarias,
  sombreado por profundidad y foco de pabellón.
- **Cristales:** paneles semitransparentes con gradiente/reflejo y marco metálico; **destello**
  breve en el punto de impacto al rebotar la bola.
- **Vallas:** patrón de rejilla metálica romboidal en las zonas altas laterales y esquinas.
- **Red:** malla en perspectiva con cinta superior blanca y postes.
- **Monigotes de calidad sin cara:** figuras estilizadas (cabeza lisa sin rostro, torso, brazos
  y piernas) en dos colores de equipo, con sombra proyectada y animación de carrera/golpe;
  legibles a distancia broadcast.
- **Palas:** paleta sólida **perforada** (agujeros), sin cuerdas, con mango y grip; una por
  figura, orientada al golpe.
- **Pelota:** amarilla con brillo especular y sombra en suelo proporcional a la altura.
- **SVG de catálogo:** `src/assets/games/sports-padel-arena.svg`, coherente con los existentes.

## 3. Física de la bola (mecánica crítica)

- Vuelo parabólico con gravedad y drag suave; se **relanza en cada contacto** desde el punto de
  impacto (mismo modelo determinista que ping-pong).
- **Bote en suelo:** rebote con coeficiente de restitución de pelota de **baja presión** (botes
  más bajos y lentos que el tenis).
- **Regla distintiva del pádel:** tras botar en suelo, la bola puede **impactar en el cristal**
  de fondo o lateral y **seguir en juego** (rebote elástico contra el plano del cristal). Si la
  bola toca el cristal **antes** de botar en el suelo del campo receptor, o toca **valla/rejilla
  o poste**, es **punto perdido**.
- **Red:** colisión continua (una bola rápida no la atraviesa); si la roza por encima, sigue.
- **Faltas/out:** doble bote en el suelo, bola que sale por encima del recinto, o bote fuera de
  la pista sin cristal válido.
- **Saque:** por debajo de la cintura, **cruzado**, con bote previo obligatorio en el cuadro de
  saque propio antes de pasar la red.
- **Golpe:** el instante del botón (timing respecto a la llegada de la bola) y la dirección del
  joystick al impactar definen **colocación** (cruzado/paralelo) y **altura/tipo** (raso, globo,
  remate según zona). Ventana de timing con margen "perfecto/bueno/tarde" que modula potencia y
  precisión — núcleo de la sensación de juego.

## 4. Dobles + IA

- El jugador humano controla al **jugador activo** de su pareja, auto-conmutado al más cercano
  al punto de corte previsto; el compañero IA cubre su zona (sube a red o defiende fondo según
  la jugada).
- **2 rivales IA** predicen el punto de corte, se reparten la pista (uno a red, otro a fondo) y
  eligen golpe según zona y oportunidad (globo para pasar la red, bandeja/víbora de control,
  remate ante bola alta, salida de pared en defensa).
- **3 niveles** (Fácil/Medio/Difícil): escalan tiempo de reacción, error de colocación,
  agresividad al subir a red y calidad de la salida de pared.

## 5. Controles

- **Escritorio (teclado):** Flechas mueven al jugador activo; **Espacio** golpea/saca (timing);
  la dirección de las flechas en el impacto fija la colocación. **P** pausa · **R** reinicia ·
  **F** pantalla completa.
- **Móvil (touch stage, `layout:"split"`):** joystick izquierdo (directionalPad → joystick
  analógico) mueve; botón derecho grande **Golpear/Sacar** (tap con timing); fila de utilidades.
  Mismo patrón que `arcade-brile` en `mobileGameProfiles.js`. Selector de escenario
  `.padel-stage` en `mobileStageProfiles.js`.

## 6. Puntuación (reglamentaria)

`rules.js` puro: punto 0→15→30→40→(Ventaja)→juego; **set a 6 juegos** con diferencia de 2 y
**tie-break** a 7 (dif 2) a 6-6; partido **al mejor de 1 o 3 sets** (elegible en menú). Rotación
de saque por juego y **lado de saque cruzado** alternando por paridad de puntos. Sin punto de
oro (ventaja clásica) por defecto.

## 7. Menú, flujo y audio

- Menú: dificultad + formato (1/3 sets) + jugar. Overlays de punto/juego/set/partido con
  marcador reglamentario (games y sets). Cantador de árbitro y aplausos por punto.
- `audio.js` con toggle: golpe de pala, bote suelo, **bote cristal** (timbre distinto), red,
  aplausos.

## 8. Integración en el repo

- `registry.jsx`: `lazy(() => import("./sports/padel-arena"))`, entrada en `GAME_REGISTRY`
  (`"sports-padel-arena"`) y en `CONTROL_HINTS_BY_LOCALE` (es/en).
- `data/games.js`: metadata completa ES/EN (title, tagline, description, objective, howToPlay,
  highlights, difficulty, multiplayer, viability, visualStyle, techFocus) e import del SVG.
- `data/gameCatalogDescriptions.js`: descripción de catálogo es/en.
- `mobile/mobileGameProfiles.js`: caso `sports-padel-arena` con joystick + botón golpe +
  utilidades.
- `mobile/mobileStageProfiles.js`: `"sports-padel-arena": [".padel-stage"]`.
- `data/__order-check.test.js`: alta de la nueva id en el orden del catálogo.

## 9. Tests

- `physics.test.js`: bote en suelo, **rebote de cristal válido vs falta**, colisión de red,
  out/doble bote, saque cruzado con bote previo, acoplamiento timing→golpe.
- `rules.test.js`: secuencia de punto completa incl. ventaja, cierre de juego/set, **tie-break**,
  rotación y lado de saque, cierre de partido a 1/3 sets.
- `ai.test.js`: predicción del punto de corte, reparto de zona entre compañeros, elección de
  golpe por zona, escalado por dificultad (determinista con RNG sembrado).
- `smoke.test.js`: arranque del runtime, avance de tiempo y snapshot no nulo.

## No-objetivos (YAGNI)

- Sin online/multijugador humano (solo vs IA).
- Sin editor de pista ni personalización de personajes.
- Sin punto de oro configurable en la primera versión (ventaja clásica).
- Sin efecto (spin) tipo Magnus de la bola: la pelota de pádel apenas lo justifica frente al
  coste; el énfasis va a rebotes de pared y timing.
