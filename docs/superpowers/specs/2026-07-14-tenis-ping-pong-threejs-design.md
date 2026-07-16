# Tenis y Ping Pong sobre three.js — Rediseño de físicas, mecánicas y assets

Fecha: 2026-07-14
Estado: aprobado, pendiente de plan de implementación
Sustituye al render y a la física descritos en `2026-07-14-tenis-ping-pong-design.md`.

## Objetivo

Rehacer las físicas y las mecánicas de `sports-tennis-grand-slam` y `sports-table-tennis-arena`
sobre **three.js**, con una librería de assets 3D procedurales (raquetas, palas, pelotas,
pistas, mesa, NPCs, entorno) y con velocidades, spins y movimientos de calidad profesional.

## Punto de partida

Los dos juegos existen. Su render 3D es una proyección en perspectiva hecha a mano sobre
Canvas 2D (`scene.js` de cada juego + `shared/racket3d/camera.js`, ~1.700 líneas). La física
de vuelo (`shared/racket3d/ballPhysics.js`) ya tiene gravedad, drag cuadrático, fuerza de
Magnus y bote con impulso tangencial de Coulomb, y la IA predice sus golpes haciendo rollout
sobre esa misma física.

Lo que no da la talla para el objetivo:

- El render 2D no puede dar sombras, materiales, público, ni NPCs animados creíbles.
- El golpe **no se simula**: elegir "liftado" asigna directamente velocidad y spin a la bola.
- El coeficiente de Magnus es una constante, así que el efecto no curva la trayectoria tanto
  como debe.
- El substepping a 240 Hz deja pasar bolas rápidas a través de la red (tunneling).

### Qué se conserva

Sin reescribir: `rules.js` de ambos juegos, `tournament.js`, `players.js`, `copy.js`, el motor
`adaptiveAi` (se recalibra, no se reescribe) y sus tests. Se conserva también el registro de
plataforma: `src/data/games.js`, `src/data/gameCatalogDescriptions.js`,
`src/components/GamePlayground.jsx`, `src/mobile/mobileStageProfiles.js`,
`src/mobile/mobileGameProfiles.js` y los SVG de catálogo.

### Qué se tira

`src/games/arcade/tennis-grand-slam/scene.js`, `src/games/arcade/table-tennis-arena/scene.js`
y `src/games/arcade/shared/racket3d/camera.js`.

`shared/racket3d/ballPhysics.js` no se borra ni se conserva tal cual: se descompone en
`physics/aero.js` (vuelo), `physics/world.js` (colisiones) y `physics/stepper.js` (integrador y
rollout), que es donde vive su lógica reescrita. Su test acompaña a la descomposición.

## 1. Arquitectura

Se añade `three` a `dependencies`. Los dos juegos ya se cargan con `React.lazy()` desde
`GamePlayground.jsx`, de modo que three.js queda confinado a su chunk y no entra en el bundle
del resto del catálogo. `vite.config.js` declara un `manualChunks` que agrupa `three` en un
chunk compartido por ambos juegos, para que no se duplique.

`src/games/arcade/shared/racket3d/` pasa a ser el motor común:

| Ruta | Responsabilidad |
| --- | --- |
| `engine/renderer.js` | `WebGLRenderer`, clamp de DPR (1–2), resize contra el contenedor, teardown. |
| `engine/quality.js` | Detección de dispositivo y los tres presets; degradación automática por frame time. |
| `engine/cameraRig.js` | Cámara broadcast: seguimiento, dolly, cambio de lado, shake de impacto. |
| `engine/loop.js` | Bucle de paso fijo con acumulador + interpolación de estado para el render. |
| `assets/textures.js` | Atlas de texturas generadas en `<canvas>`, cacheado. |
| `assets/ball.js` | Pelota de tenis y de ping pong. |
| `assets/racket.js` | Raqueta de tenis con encordado. |
| `assets/paddle.js` | Pala de ping pong. |
| `assets/court.js` | Pista, líneas, red, postes. |
| `assets/table.js` | Mesa, red, patas. |
| `assets/arena.js` | Gradas, público instanciado, focos, marcador. |
| `assets/adBoards.js` | Vallas publicitarias sobre los slots de `src/config/adPreview.js` (evoluciona el fichero actual). |
| `assets/player/rig.js` | Esqueleto humanoide. |
| `assets/player/mesh.js` | `SkinnedMesh` del cuerpo y la equipación. |
| `assets/player/animator.js` | Locomoción procedural + IK de golpeo. |
| `physics/aero.js` | Vuelo: drag y sustentación dependientes del spin ratio. |
| `physics/contact.js` | Impacto pala–pelota: impulso normal + tangencial, sweet spot. |
| `physics/world.js` | Volúmenes de colisión y CCD (swept sphere). |
| `physics/stepper.js` | Integrador de paso fijo y rollout compartido con la IA. |
| `physics/surfaces.js` | Constantes de dura, tierra y hierba; madera de mesa. |
| `ai/adaptiveAi.js` | El motor de 3 capas actual, movido aquí y recalibrado. |

Cada juego conserva `index.jsx`, `runtime.js`, `physics.js` (constantes propias), `rules.js`,
`ai.js`, `copy.js`, y `scene.js` se reescribe como ensamblador de la escena three.js.

Si el navegador no expone WebGL, `index.jsx` muestra un aviso legible en lugar de un canvas
negro.

## 2. Física

### 2.1 El contacto se simula

Hoy el tipo de golpe asigna el resultado. En el nuevo modelo la pala es **un plano orientado
con velocidad de swing** y el impacto se resuelve como una colisión rígida:

- Impulso **normal** con restitución dependiente del material (caucho de ping pong, encordado
  de tenis) y de la velocidad de aproximación.
- Impulso **tangencial** de Coulomb contra la superficie de la pala: la componente de la
  velocidad de swing paralela a la cara es la que **crea el spin**.

Consecuencia: el efecto no se elige, se genera cepillando la bola. Los botones (tenis) y el
gesto táctil (ping pong) pasan a definir **trayectoria de swing y ángulo de cara**, no el
resultado del golpe.

### 2.2 Sweet spot

El coeficiente de restitución decae con la distancia radial al centro de la pala, y un impacto
descentrado genera un par que abre la cara. Colocarse bien se premia y golpear con el canto se
castiga, sin ninguna regla ad hoc.

### 2.3 Aerodinámica dependiente del spin

`magnusCoeff` constante se sustituye por coeficientes función del **spin ratio** `S = ωr/v`:

- `Cl(S)` — sustentación: crece con `S` y satura. Es lo que hace que un liftado cargado caiga
  en picado.
- `Cd(S)` — arrastre: crece con `S`.

Tenis: `Cd ≈ 0,55` base. Ping pong: `Cd ≈ 0,45` base, y con 2,7 g de masa el drag y el Magnus
dominan sobre la gravedad — por eso es un juego distinto y no un tenis en miniatura.

### 2.4 Colisión continua

Swept sphere contra: cinta y malla de la red (cilindro + plano), **cantos de la mesa** (la bola
de canto se simula, es icónica), postes, tablero, suelo y líneas de fondo. Una bola de ping
pong a 28 m/s recorre 12 cm por paso a 240 Hz frente a los 15,25 cm de red: hoy la atraviesa.
Con CCD, no.

### 2.5 Paso fijo a 600 Hz con interpolación

La simulación corre a paso fijo (600 Hz) desacoplada del render, que interpola el estado entre
los dos últimos pasos. La física deja de depender de los fps, es determinista, y el movimiento
sale suave en cualquier tasa de refresco. Es el principal responsable de la sensación de
profesionalidad.

### 2.6 Magnitudes reales

| | Pelota | Golpe fuerte | Spin |
| --- | --- | --- | --- |
| Tenis | 57 mm / 57 g | Saque 180–225 km/h; drive 110–140 km/h | 2.000–3.500 rpm de liftado |
| Ping pong | 40 mm / 2,7 g | Smash 25–30 m/s | 100–150 vueltas/s en un loop |

No se falsean constantes para hacerlo jugable. La física se queda real y la jugabilidad se
ajusta con un `timeScale` global (por defecto 1,0 en escritorio; se permite bajarlo en móvil).

### 2.7 Superficies

Dura, tierra batida y hierba son juegos de constantes de restitución y fricción: tierra da bote
alto y lento y permite deslizamiento; hierba, bote bajo y rápido. No hay lógica especial por
superficie en ningún otro sitio del código.

## 3. Mecánicas del jugador

- Aceleración e inercia, con fricción dependiente de la superficie: en tierra batida el jugador
  **desliza** al frenar.
- **Split-step** con ventana de tiempo: acertarlo mejora la aceleración de salida.
- Recuperación hacia la posición neutra entre golpes.
- **Ventana de timing** en el contacto: llegar pronto o tarde gira la cara de la pala, con
  consecuencia física real (la bola se va larga o al pasillo), no con una penalización
  arbitraria.
- Tenis: movimiento libre (WASD/flechas o joystick virtual), carga de potencia por mantenido,
  y la dirección sale del movimiento más el apuntado.
- Ping pong: se conserva el modelo touch-first (el dedo es la pala), pero el gesto ahora mapea
  a **pose y velocidad de la pala**, no a un tipo de golpe. La regla de saque ITTF se mantiene.

## 4. IA

El motor de 3 capas (perfil de habilidad × modulación situacional × selección de golpe por
valor esperado) se conserva. Cambia sólo lo que debe cambiar:

- El rollout de la Capa C usa el **nuevo** integrador y el **nuevo** modelo de contacto, así que
  la IA sigue adaptándose sola al entorno sin retocar sus números.
- La IA ya no elige "un golpe" abstracto: elige **un swing** (trayectoria de pala + ángulo de
  cara + punto de contacto pretendido), y su error de nivel se aplica sobre esos parámetros.
  Un Novato golpea descentrado; una Leyenda encuentra el sweet spot.
- Los cinco niveles se recalibran contra la nueva física mediante la escalera de tests headless.

## 5. Assets procedurales

Todo se construye en código: geometría paramétrica + texturas generadas en `<canvas>`. Cero
ficheros binarios y cero peticiones de red.

**Texturas** (`textures.js`, generadas una vez y cacheadas): tierra batida con grano y brillo
húmedo, hierba con vetas de siega, hormigón acrílico pintado, madera barnizada de mesa, caucho
de pala (rojo liso y negro con puntas), fieltro de pelota con normal map de ruido, tela de
gradas, y logos de vallas.

**Objetos:**

- **Pelota de tenis**: esfera con la costura clásica (`TubeGeometry` sobre la curva), fieltro
  con normal map, y estela de velocidad por encima de un umbral. Rota según su `ω` real, así
  que el efecto **se ve girar**.
- **Pelota de ping pong**: esfera pulida con logo impreso que delata el giro.
- **Raqueta de tenis**: mango torneado (`LatheGeometry`), overgrip en espiral, garganta, marco
  ovalado (`ExtrudeGeometry`) y **encordado de 16×19 como `InstancedMesh`**, que cede
  visiblemente en el impacto.
- **Pala de ping pong**: hoja laminada, caras de caucho rojo y negro, mango cóncavo, canto.
- **Pista de tenis**: 23,77 × 8,23 m reglamentarios, líneas de anchura correcta, red con malla
  instanciada que se deforma al impacto, cinta superior, postes; tres materiales de superficie.
- **Mesa de ping pong**: 2,74 × 1,525 × 0,76 m, línea central, red de 15,25 cm con soportes,
  patas y estructura.
- **Entorno**: gradas en cuenco, **público como `InstancedMesh` de miles de figuras** con idle y
  celebración animados por atributos de instancia (una draw call), torres de focos con haces
  volumétricos baratos, marcador 3D, silla de juez y vallas publicitarias alimentadas por
  `src/config/adPreview.js` (con marca neutra si la preview está apagada).

## 6. NPCs: esqueleto e IK

Humanoide low-poly (torso, cabeza, brazos, piernas, equipación, zapatillas) sobre un `Skeleton`
real de three.js, renderizado como `SkinnedMesh`. **No hay clips grabados**: la animación se
calcula cada frame.

- **Locomoción procedural**: cadencia y zancada derivadas de la velocidad real; pies plantados
  con IK contra el suelo (no patinan); inclinación del torso en aceleraciones y cambios de
  dirección; split-step como salto real.
- **Golpe con IK**: la mano que sostiene la pala se resuelve por cinemática inversa hacia **el
  punto de impacto que predice la física**. El NPC nunca golpea al aire; un golpe forzado se ve
  forzado porque el brazo llega estirado.
- **Saque completo**: lanzamiento, arqueo, extensión, impacto y aterrizaje, encadenados sobre la
  trayectoria real de la bola lanzada.
- **Deslizamiento en tierra** ligado al modelo de fricción de superficie.
- **Fisonomía por jugador**: los 32 del plantel varían en altura, complexión, colores de
  equipación y mano dominante (zurdos incluidos), derivados de su ficha en `players.js`.

## 7. Calidad escalonada y rendimiento

Tres presets detectados en runtime, con degradación automática si el frame time sube:

| | Alto (escritorio) | Medio (tablet) | Bajo (móvil) |
| --- | --- | --- | --- |
| Sombras | Mapa suave (PCF) | Mapa duro | Blob proyectado |
| Público | Instanciado animado | Instanciado estático | Impostores |
| Extras | Estela, deformación de red y cuerdas, haces de focos, shake de cámara | Estela y shake | Ninguno |
| Objetivo | 60 fps | 60 fps | 60 fps |

Presupuesto duro: **menos de 60 draw calls** en cualquier preset. Materiales compartidos,
geometrías fusionadas, todo lo repetido instanciado, un único atlas de texturas.

## 8. Publicidad y responsive

Sin cambios respecto al diseño anterior: el sistema de anuncios es de plataforma y ya funciona
porque los juegos están registrados en `games.js` (categoría Deportes), `GamePlayground.jsx`,
`mobileStageProfiles.js` y `mobileGameProfiles.js`, y no están en
`TABLET_LANDSCAPE_AD_DISABLED_GAME_IDS`. Las vallas dentro de la escena pasan de dibujarse en
2D a ser planos texturizados en la escena three.js.

Escritorio (teclado y ratón, HUD completo, raíles laterales), tablet (escenario táctil, HUD
condensado) y móvil (`MobileGameShell` touch-native, stack de estado primero en portrait) se
mantienen. El FOV de la cámara se adapta al aspect ratio.

## 9. Pruebas

**Vitest**, sobre las piezas puras (sin DOM ni WebGL):

- `aero`: la energía nunca crece en vuelo libre; el liftado cae más corto que el plano con la
  misma velocidad de salida; el cortado flota más.
- `contact`: un swing tangencial ascendente produce el signo y la magnitud de spin esperados; un
  impacto descentrado reduce la velocidad de salida y desvía la dirección.
- `world`: una bola a 30 m/s **no** atraviesa la red en ningún paso (test de CCD).
- `stepper`: determinismo — misma semilla y mismas entradas producen el mismo punto.
- `surfaces`: tierra da bote más alto y lento que hierba.
- `adaptiveAi`: escalera de niveles — en peloteos headless, cada nivel gana consistentemente al
  inferior; la modulación de la Capa B nunca sale de la banda de su nivel.
- Se conservan y deben seguir pasando los tests actuales de `rules` (tenis y ping pong),
  `tournament` e `input`.

**Playwright**: acciones de humo en el estilo `playwright-actions-*.json` del repo — lanzar cada
juego y disputar el primer punto.

## 10. Riesgos

- **Peso del bundle**: three.js son ~170 kB gzip. Mitigado con import dinámico y chunk
  compartido; no afecta al resto del catálogo.
- **Rendimiento del `SkinnedMesh` con IK en móvil**: si el coste de skinning no cabe en el
  presupuesto, el preset bajo cae a un rig rígido (sin skinning) manteniendo la misma jerarquía
  de huesos y la misma animación.
- **Recalibrado de la IA**: al cambiar la física, los cinco niveles quedan descalibrados hasta
  que la escalera de tests headless pase. Es trabajo esperado, no una sorpresa.
