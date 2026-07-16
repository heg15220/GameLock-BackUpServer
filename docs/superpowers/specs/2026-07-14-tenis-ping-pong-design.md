# Tenis Grand Slam y Ping Pong 3D — Diseño

Fecha: 2026-07-14
Estado: aprobado, pendiente de plan de implementación

## Objetivo

Añadir dos juegos nuevos a la sección **Deportes**:

1. **`sports-tennis-grand-slam`** — tenis con modo exhibición y modo torneo, plantel de
   jugadores IA y una IA de 5 niveles escalonados que se adapta dinámicamente a la física,
   el entorno, las mecánicas y la situación de partido.
2. **`sports-table-tennis-arena`** — ping pong en escenario 3D (mesa, red, ambiente de
   estadio), **touch-first**: la pala se controla con el dedo y el gesto de deslizamiento
   define el golpe.

Ambos con adaptación a escritorio, móvil y tablet, y con los paneles de publicidad
integrados igual que en el resto de juegos de Deportes en las tres vistas.

## Contexto del repositorio

Patrones existentes que este diseño reutiliza en vez de reinventar:

- Los juegos viven en `src/games/arcade/<slug>/` y exportan un componente React por defecto.
- Se registran en `src/components/GamePlayground.jsx` (import lazy + mapa de ids + hints de
  control por locale) y se catalogan en `src/data/games.js` con `category: "Deportes"` /
  `category_en: "Sports"`, más descripciones en `src/data/gameCatalogDescriptions.js`.
- El patrón de "3D" en Deportes es `src/games/arcade/basketball-court/index.jsx`: cámara
  pinhole con yaw/pitch y proyección en perspectiva propia sobre Canvas 2D
  (`project3D`, ~línea 257), física balística con substepping y `handleResize` con clamp de DPR.
- El estado del juego se publica al shell móvil con `useGameRuntimeBridge`
  (`src/utils/useGameRuntimeBridge.js`) a partir de un snapshot emitido por el runtime.
- La publicidad es **de plataforma**, no per-juego (ver sección 7).

No hay three.js y no se añade: el render 3D se hace con proyección propia sobre Canvas 2D,
por coherencia con el resto de la sección y por peso de bundle y rendimiento en móvil.

## 1. Estructura de ficheros

Módulo compartido nuevo — `src/games/arcade/shared/racket3d/`:

| Fichero | Responsabilidad |
| --- | --- |
| `camera.js` | `createCamera({pos, lookAt})`, `project(x,y,z)`, helpers de línea y polígono 3D con orden de pintor. Generaliza la matemática de `basketball-court`. |
| `ballPhysics.js` | Integrador con gravedad, drag cuadrático, fuerza de Magnus y bote con fricción tangencial. Paso fijo con substepping. |
| `adaptiveAi.js` | Núcleo de IA de 3 capas: `buildContext`, `resolveParams`, `chooseShot`. Funciones puras. |

Tenis — `src/games/arcade/tennis-grand-slam/`:

| Fichero | Responsabilidad |
| --- | --- |
| `index.jsx` | Componente React: canvas, ciclo de vida del runtime, controles táctiles, puente de snapshot. |
| `runtime.js` | Bucle de juego, estado, input, cámara. |
| `physics.js` | Constantes de tenis y por superficie sobre `ballPhysics`. |
| `scene.js` | Render de pista, red, gradas, vallas publicitarias, jugadores, HUD. |
| `rules.js` | Puntuación: puntos, juegos, sets, deuce, ventaja, tiebreak. |
| `ai.js` | Vocabulario de golpes de tenis y pesos por estilo, sobre `adaptiveAi`. |
| `players.js` | Plantel de 32 jugadores IA. |
| `tournament.js` | Cuadro, emparejamientos, simulación de partidos ajenos, persistencia. |
| `copy.js` | Textos es/en. |

Ping pong — `src/games/arcade/table-tennis-arena/`: misma descomposición sin `players.js`
ni `tournament.js`, y con `input.js` adicional para el modelo de gesto táctil.

Ningún fichero acumula dos responsabilidades. Las piezas puras (`ballPhysics`, `adaptiveAi`,
`rules`, `tournament`) se testean sin render ni DOM.

## 2. Motor 3D compartido

Cámara pinhole con yaw/pitch, proyección en perspectiva, orden de pintor por profundidad.
Canvas 2D, sin dependencias nuevas. El canvas se dimensiona al contenedor con clamp de DPR
(1–2), como el resto de juegos de la sección.

## 3. Física con efecto

Sobre la balística existente se añade lo que aquí es imprescindible:

- **Gravedad** y **drag aerodinámico cuadrático**.
- **Fuerza de Magnus** (`F = k·(ω × v)`): hace que el liftado caiga en picado y el cortado
  flote. Sin ella, "liftar la pelota" no tiene efecto físico real.
- **Bote con fricción tangencial que acopla efecto y velocidad lineal**: el liftado pica y
  sale acelerado y bajo; el cortado patina y se frena. El efecto cambia la trayectoria
  *después* del bote, no es un indicador decorativo.
- **Substepping a paso fijo** (~240 Hz de simulación, render en rAF) para que una bola rápida
  no atraviese la red, la mesa ni el suelo.

Mismo integrador en los dos juegos con distintas constantes (masa, radio, coeficiente de
drag, dimensiones del terreno).

**Superficies de tenis** (las tres de un Grand Slam): pista dura, tierra batida y hierba son
solo juegos de constantes de restitución y fricción — tierra da bote alto y lento, hierba
bote bajo y rápido. No hay lógica especial por superficie en ningún otro sitio.

## 4. IA: 5 niveles escalonados + adaptación dinámica

Motor único compartido por ambos juegos, en tres capas.

### Capa A — Perfil de habilidad (el nivel)

Cinco niveles: **Novato, Amateur, Pro, Élite, Leyenda**. Cada uno es un vector de parámetros
continuos:

| Parámetro | Efecto |
| --- | --- |
| `reactionMs` | Retardo antes de empezar a interceptar. |
| `readError` | Error (m) en la predicción del bote, que decae según se acerca la bola. |
| `footSpeed` / `accel` | Cobertura de pista o de mesa. |
| `timingJitter` | Error (ms) en el punto de contacto. Produce golpes mal ejecutados. |
| `aimSigma` | Dispersión angular respecto al destino pretendido. |
| `powerControl` | Fidelidad de la potencia realmente aplicada frente a la pretendida. |
| `spinSkill` | Capacidad de imprimir y de leer efecto. |
| `anticipation` | Cuánto lee el golpe del rival *antes* del impacto (0 = solo después). |
| `riskAppetite` | Disposición base a buscar el golpe ganador. |
| `stamina` | Degradación a lo largo de peloteos y partidos largos. |

**La IA juega a través de la misma física que el jugador humano**: no teletransporta ni
recibe devoluciones imposibles. Un nivel alto tiene menos error y decide mejor, nada más.

### Capa B — Modulación situacional (lo dinámico)

En cada golpe se construye un contexto a partir del estado real de la partida: presión del
marcador (punto de break, de set, de partido, deuce), longitud del peloteo y fatiga
acumulada, posición propia y del rival en la pista, calidad de la bola entrante (velocidad,
efecto, profundidad, altura de contacto) y momentum de los últimos puntos.

Ese contexto desplaza los parámetros de la Capa A **dentro de una banda acotada que depende
del propio nivel**: un Novato se descompone bajo presión (±25%), una Leyenda apenas se mueve
(±10%) y además en dirección contraria. En bola de break, al Novato se le dispara `aimSigma`
y se le hunde `riskAppetite` (se achica y empuja); a la Leyenda le *sube* `riskAppetite` y su
puntería aguanta. El mismo evento produce comportamientos opuestos según el nivel.

### Capa C — Selección de golpe (la decisión)

Para cada bola entrante la IA enumera los golpes candidatos —tenis: plano, liftado cruzado,
liftado paralelo, cortado, dejada, globo; ping pong: drive, loop, bloqueo, cortado, smash,
flick— y puntúa cada uno con valor esperado:

```
EV(golpe) = P(entra) × [ w_win · P(punto ganado) + w_pos · ventaja_posicional ]
            − riesgo × P(error no forzado)
```

`P(entra)` se calcula **simulando la trayectoria candidata con el mismo motor de física**
(rollout barato de ~15 pasos) aplicándole el modelo de error de la IA. La elección final es un
softmax cuya temperatura depende del nivel: un Novato escoge a veces un golpe dominado, una
Leyenda va casi al argmax.

**Consecuencia clave**: como el rollout usa la física real, la IA se adapta sola al entorno y
a las mecánicas. Cambiar la superficie, la altura de la red o el drag de la bola cambia sus
decisiones sin retocar la IA. Esto es lo que implementa "decidir dinámicamente lo mejor en
función de la dificultad puesta".

## 5. Tenis — `sports-tennis-grand-slam`

- **Cámara** en perspectiva tras el jugador propio, que rota en los cambios de lado.
- **Control total del jugador**: movimiento libre por la pista (WASD/flechas en escritorio,
  joystick virtual en táctil), selección de tipo de golpe, carga de potencia por mantenido, y
  dirección resultante del movimiento más el apuntado.
- **Dimensiones reglamentarias**: pista de 23.77 × 8.23 m (individuales), red de 0.914 m en el
  centro y 1.07 m en los postes.
- **Puntuación**: 15/30/40, deuce, ventaja, juegos, sets. Al mejor de 3 sets, tiebreak a 6-6.
- **Modo Exhibición**: se elige rival, superficie, dificultad y número de sets.
- **Modo Torneo**: cuadro de **32 jugadores y 5 rondas** (1ª ronda, octavos, cuartos,
  semifinal, final). Decisión confirmada por el usuario: es más corto que las 7 rondas de un
  Grand Slam real (cuadro de 128), y se acepta a propósito para que una sesión de torneo dure
  lo razonable.
  - Plantel de 32 jugadores IA en `players.js`: nombre, nacionalidad, rating, superficie
    preferida y **estilo de juego** (fondista, sacador, agresivo, all-court, contragolpeador)
    que sesga los pesos de la Capa C. Cada rival se juega distinto, no es el mismo bot con
    otro nombre.
  - El jugador disputa sus 5 partidos; el resto del cuadro se simula por rating + ajuste a la
    superficie + varianza.
  - Vista de bracket navegable. Progreso persistido en `localStorage` para poder retomar.
  - La dificultad elegida escala todo el plantel: rondas tempranas contra niveles bajos, final
    contra el nivel techo.

## 6. Ping pong — `sports-table-tennis-arena`

### Escenario

Mesa reglamentaria (2.74 × 1.525 m, altura 0.76 m), red de 15.25 cm, vallas publicitarias
perimetrales, gradas con público, focos cenitales y marcador. Cámara tras el lado propio con
ligera elevación.

### Control touch-first: la pala es el dedo

No hay botones de golpe. El escenario **es** el mando.

- La posición del dedo sobre la mitad inferior de la pantalla mapea directamente la posición
  de la pala en el plano de golpeo.
- El **gesto en el instante del contacto** define el golpe:
  - velocidad del deslizamiento → **potencia**;
  - componente horizontal → **colocación** izquierda/derecha;
  - deslizar **hacia arriba** → **liftado**: la pelota sube, cae en picado y pica acelerando;
  - deslizar **hacia abajo** → **cortado**: flota y patina al botar;
  - recto hacia delante → **derechazo plano**.
- Si el contacto ocurre en la mitad de revés de la pala, sale **de revés**, con su propia
  envolvente de potencia y ángulo, más limitada que la de derecha.
- El punto exacto de la cara de la pala (centro vs canto) afecta a la precisión: colocarse
  bien se premia.

### Saque reglamentado (ITTF)

Se modela la regla: la bola se lanza verticalmente al menos 16 cm desde la palma abierta, se
golpea detrás de la línea de fondo, bota una vez en el campo propio y una en el contrario.
Flujo táctil: mantener pulsado para sostener la bola, flick hacia arriba para el lanzamiento,
deslizar para golpear. Se pitan faltas por no lanzar, golpear antes del apogeo o botar mal.
El *let* (roza la red y entra) se repite.

### Escritorio y tablet

- **Escritorio**: el ratón *es* la pala, con el mismo modelo de velocidad de gesto, que mapea
  de forma natural. Teclado como alternativa accesible (flechas para posicionar, teclas para
  tipo de efecto, espacio para sacar).
- **Tablet**: idéntico a móvil con un plano de golpeo mayor.

### Reglas

Sets a 11 puntos con diferencia de 2, al mejor de 5. Saque alterno cada 2 puntos, y cada 1
punto a partir de 10-10.

### IA

El mismo motor de 3 capas con el vocabulario de golpes del tenis de mesa.

## 7. Publicidad en las tres vistas

El sistema es de plataforma. Los anuncios salen automáticamente **si el juego se registra
correctamente**, y ese registro es el trabajo real:

1. `category: "Deportes"` en `src/data/games.js`. La categoría ya está en
   `MOBILE_SHELL_CATEGORIES` (`src/utils/mobileShellProfile.js`).
2. Alta en `src/components/GamePlayground.jsx`: import lazy, entrada en el mapa de ids y hints
   de control en es y en.
3. **`src/mobile/mobileStageProfiles.js`**: declarar los selectores de escenario
   (`"sports-tennis-grand-slam": [".tennis-stage"]`,
   `"sports-table-tennis-arena": [".table-tennis-stage"]`). Sin esto,
   `MobileStageAdOverlay` no sabe dónde colocar los anuncios en móvil y tablet.
4. **`src/mobile/mobileGameProfiles.js`**: perfil de control deck de cada juego. En ping pong
   el deck es mínimo (solo utilidades), porque el escenario es la superficie de control.
5. Los raíles de escritorio y de tablet-landscape los pinta `GameLaunchModal` sin trabajo
   adicional; basta con **no** añadir los ids a `TABLET_LANDSCAPE_AD_DISABLED_GAME_IDS`.

Además, **vallas dentro de la escena 3D**: paneles patrocinadores renderizados en el mundo
—tras la línea de fondo en tenis, perimetrales alrededor de la mesa en ping pong— alimentados
por los datos de slot de `src/config/adPreview.js`, igual que hace `penalty-neural-keeper` con
`drawBannerPanel`. Con la preview de anuncios apagada muestran marca neutra de relleno.

## 8. Responsive

- **Escritorio**: teclado y ratón, HUD completo, raíles de anuncios a izquierda y derecha.
- **Tablet**: escenario táctil, HUD condensado, raíles laterales en landscape.
- **Móvil**: `MobileGameShell` en modo touch-native. En portrait se aplica el stack con el
  estado primero que ya usa Deportes (`isStatusFirstStack` en `MobileGameShell.jsx`) más el
  anuncio inferior compacto; en landscape se maximiza el escenario.
- FOV de cámara y escala del HUD se adaptan al aspect ratio.

## 9. Pruebas

**Vitest** sobre las piezas puras:

- `ballPhysics`: trayectorias sanas, y sobre todo el acoplamiento efecto↔bote (liftado
  acelera y baja tras botar; cortado frena y se levanta).
- `rules` de tenis: deuce, ventaja, cierre de juego, cierre de set, tiebreak.
- `rules` de ping pong: 11 con diferencia de 2, rotación de saque, rotación a 1 punto desde
  10-10, faltas de saque, let.
- `tournament`: generación del cuadro de 32, emparejamientos por ronda, simulación de partidos
  ajenos, persistencia y retomado.
- `adaptiveAi`: monotonicidad de nivel (un nivel superior gana consistentemente al inferior en
  simulación headless de peloteos), y que la modulación de la Capa B nunca sale de la banda
  del nivel.

**Playwright**: acciones de humo en el estilo `playwright-actions-*.json` del repo — lanzar
cada juego y disputar el primer punto.
