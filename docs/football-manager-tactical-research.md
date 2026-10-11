# Investigación táctica para el centro de partido

Consulta: 10 de octubre de 2026. Se utilizan fuentes de los desarrolladores y de FIFA para orientar el diseño; las propuestas del juego son inferencias propias, no una reproducción de sus motores privados.

## Qué se consultó y qué se pudo observar

Se leyeron los artículos oficiales de Football Manager 24 y 26, el manual oficial de We Are Football 2024 publicado en Steam y los ejercicios de FIFA Training Centre indicados abajo. Se localizaron estos vídeos oficiales:

- [FM24 — Match Engine Revamp](https://www.youtube.com/watch?v=ow_QU4K217w), Football Manager, 4 de octubre de 2023.
- [FM26 — Game-Changing Tactics Spotlight](https://www.youtube.com/watch?v=JBLmOErhEqc), Football Manager, 2 de octubre de 2025.
- [We Are Football 2024 — Livestream mit Gerald Köhler](https://www.youtube.com/watch?v=k-4ulvf71A8), canal del editor HandyGames, actualmente THQ Nordic Mobile, 27 de enero de 2024.
- Clips enlazados por el artículo oficial de FM24: [rotaciones](https://www.youtube.com/watch?v=IHJbXRifzYA), [salida con laterales interiores](https://www.youtube.com/watch?v=tGI_SbN8MPQ) y [movimiento](https://www.youtube.com/watch?v=HJ5J9m6D5Gw).

**No se observaron fragmentos en reproducción continua.** La herramienta de navegador integrada no tenía navegadores disponibles. La consulta web ofreció páginas, enlaces y descripciones, pero no reproducción. El navegador de pruebas sí cargó las páginas y permitió inspeccionar fotogramas iniciales de FM24 y WAF2024, tapados parcialmente por el consentimiento de YouTube. El intento de rechazar las cookies y reproducir no consiguió una secuencia continua: el reloj permaneció detenido o el vídeo quedó esperando contenido. Se terminó ese intento sin descargar vídeos. Su evidencia técnica queda en `output/manager-v6/research/video-access.json` y las capturas del mismo directorio. Las conclusiones tácticas de esta investigación proceden del contenido escrito comprobado; no se presentan como una observación directa del movimiento del gameplay.

No se copiaron vídeos, modelos, imágenes ni recursos de estos juegos. Consultar una publicación no concede una licencia para redistribuir sus materiales. Los principios se implementan en código propio y no se presentan como datos de seguimiento reales.

## Principios aplicables

### 1. La forma del equipo depende de la fase y del balón

FM26 describe estructuras con y sin posesión, además de un visualizador que cambia la colocación según la zona del balón. Su ejemplo del lateral interior y del mediocentro que salta a presionar muestra que un dibujo inicial no determina una posición fija durante toda la jugada. [Fuente oficial FM26](https://www.footballmanager.com/fm26/features/possession-out-possession-fm26s-new-tactical-evolution).

Aplicación propia: conservar la identidad y los roles del once, pero calcular objetivos de apoyo, presión y repliegue a partir de la posesión, la ubicación del balón y las instrucciones. Anchura y línea defensiva deben cambiar distancias reconocibles en el campo. La transición entre objetivos debe ser continua, sin recolocar instantáneamente a todo el equipo.

### 2. Un apoyo ocupa espacio útil y sus compañeros compensan

FM24 documenta rotaciones que abren un canal cuando otro jugador lo ataca, extremos que mantienen amplitud para dejar libre el intervalo y coberturas que protegen al compañero que avanza. El artículo explica también la prioridad de roles cuando dos pretenden ocupar la misma zona. [Fuente oficial FM24](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play).

Aplicación propia: elegir receptores reales y rutas coherentes con el plan, ofrecer un apoyo por detrás y otro por delante, conservar separación lateral y evitar que todos los jugadores repitan el mismo desplazamiento. Un pase directo puede omitir apoyos intermedios; un plan corto debe usar apoyos cercanos, sin asegurar automáticamente el éxito.

### 3. Presionar significa perseguir y cubrir a la vez

El ejercicio de FIFA pide al jugador más cercano que presione, mientras los demás protegen líneas de pase. Recomienda escalonar las coberturas para que un único pase no elimine a todos los defensores. Es una sesión reducida, no una regla que obligue a que todos los equipos profesionales utilicen exactamente tres presionantes. [FIFA — Pressing and switching play](https://www.fifatrainingcentre.com/en/practice/talent-coach-programme/press-and-regain/3v3-plus-3-possession-game-pressing-and-switching-play.php).

Aplicación propia: asignar al primer defensor una aproximación al poseedor, al segundo una cobertura y al bloque un desplazamiento limitado. La presión alta debe poder producir recuperaciones y también dejar espacio si el rival la supera. El coste de esfuerzo impide que sea una mejora gratuita.

### 4. Recuperar no obliga a lanzar siempre un contraataque

FIFA describe apoyos inmediatos tras recuperar y reorganización compacta al perder; la sesión distingue conservación y ataque rápido según la situación. [FIFA — Attacking and defensive transitions](https://www.fifatrainingcentre.com/en/practice/elite-sessions/transition-to-attacking/transitions.php).

Su análisis de cómo superar la presión muestra una secuencia con recuperador, primer apoyo y corredor de salida. El primer pase puede ir hacia atrás o lateralmente para encontrar a un compañero que vea el campo. [FIFA — Passing the press](https://www.fifatrainingcentre.com/en/game/game-analysis/transition-to-attacking/passing-the-press.php).

Aplicación propia: «Conservar» favorece un apoyo seguro; «Contraatacar» favorece la salida al espacio; el modo equilibrado considera presión y espacio. La decisión queda registrada en el descriptor para que el campo represente la intención que calculó el motor, en lugar de inventar una historia distinta.

### 5. La decisión del mánager debe tener efecto causal y un coste visible

El manual de We Are Football 2024 distingue filosofía, presión, contrapresión, prioridades y preparación; permite modificar tácticas durante el encuentro. También relaciona esfuerzo con energía y aclara que la velocidad o la visualización de escenas no cambian el cálculo deportivo. [Manual oficial, páginas impresas 22–24](https://shared.steamstatic.com/store_item_assets/steam/apps/1951410/manuals/10cce42978dbac39ce022383768871c0266553c6/WAF2024_-_The_Ultimate_Guide_including_Update_3.pdf?t=1736955977).

Aplicación propia: las instrucciones modifican posesiones futuras, rutas, presión, espacio y fatiga. El registro anterior permanece intacto. El reloj visual 1×/2×/4× modifica la presentación, nunca la semilla ni el resultado. Cambiar un plan no debe convertirse en una garantía de ganar.

### 6. La naturalidad requiere continuidad y reacciones limitadas

FM24 relaciona el movimiento con locomoción, rotaciones y física del balón. Esto respalda cuidar la transición entre acciones, pero no proporciona un algoritmo abierto que pueda atribuirse al juego. [Fuente oficial FM24](https://www.footballmanager.com/features/truer-football-motion-match-authenticity-positional-play).

Aplicación propia: conservar el último punto al empezar una nueva escena, limitar el desplazamiento de apoyo y evitar perseguir el balón con los once jugadores. Un portador debe acompañar al balón, y un pase debe llegar al receptor registrado. Pausar, sustituir o cambiar una instrucción no puede resucitar a un jugador retirado ni revelar el siguiente gol.

## Auditoría inicial y regresiones propuestas

Antes de esta ampliación, el modelo 2 elegía el carril aleatoriamente y la escena calculaba profundidades principalmente por posición, mentalidad y presión. La circulación mostraba una cadena predeterminada de defensor, medio, actor y receptor. Existían controles de formación, mentalidad y presión, pero no decisiones explícitas de anchura, pases, ritmo, línea defensiva o transición. Estas observaciones proceden de `live-match.js` y `pitch-scene.js`, no de los vídeos externos.

La nueva auditoría debe comprobar:

- Cambiar los seis campos mediante los controles públicos, mantener los sucesos anteriores y recuperar exactamente las instrucciones al recargar.
- Enfrentar rutas cortas y directas sobre estados comparables, con identificadores que pertenezcan a los jugadores reales sobre el campo; comprobar inicio, destino y orden de la ruta renderizada.
- Observar mayor amplitud con «Amplia» y una línea más adelantada con «Alta», tanto en el lado local como en el visitante, sin invertir por error las coordenadas.
- Comprobar presión, coberturas y apoyo durante la misma posesión; ninguna formación debe convertirse en once jugadores detrás del balón.
- Verificar que las instrucciones de transición afectan al futuro y que un corte de pase cambia la posesión y el autor de la recuperación sin terminar la ruta truncada.
- Mantener pausa exacta, invariancia de resultado a velocidad visual, goleador y marcador únicos, sustituciones sin reingreso y el gol del minuto final.
- Conservar los modelos de partido 1 y 2 al restaurar sus guardados; las instrucciones nuevas corresponden al modelo 3. Mantener controles legibles y sin desbordamiento en móvil y con movimiento reducido.

Estas pruebas demuestran coherencia del sistema implementado. No certifican equivalencia con Football Manager, We Are Football o un simulador físico continuo. El modelo sigue resolviendo posesiones discretas y las valoraciones siguen siendo estimaciones del juego.

## Resultado de la auditoría aplicada

El modelo 3 implementa las seis instrucciones mediante contexto táctico y rutas de futbolistas reales. La revisión independiente detectó y se corrigieron dos desacuerdos entre cálculo y presentación: un pase interceptado llegaba visualmente al atacante antes de la recuperación, y el contexto de esa recuperación se calculaba antes de registrar la pérdida recién ocurrida. El balón termina ahora en el interceptor registrado y el contexto de recuperación considera la transición correcta.

La prueba `scripts/test-manager-tactics.mjs` pasó siete grupos sobre la interfaz real: controles y planes, pasado inmutable, guardado exacto, coincidencia de rutas y contexto con el campo, diferencia de amplitud, continuidad de intercepción, sustituciones sin reingreso y uso móvil/tableta. No hubo errores de página ni de consola. Se inspeccionaron las capturas de pizarra, amplitud y recuperación; el informe reproducible está en `output/manager-v6/tactics/verification.json`.
