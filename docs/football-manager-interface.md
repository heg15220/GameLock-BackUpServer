# Interfaz del modo mánager

## Dirección visual

El campo y la identidad del club son el foco. El despacho reúne preparación, próximo partido y once; una navegación lateral en escritorio y horizontal en móvil permite moverse por los departamentos. El centro de partido ocupa su propia sección para dar espacio al campo y a los controles del banquillo.

Paleta: carbón `#171b17`, oliva `#232b21`, césped, blanco cálido para texto y lima `#c8ff5f` para las acciones. Se reutilizan las fuentes del proyecto Bricolage Grotesque y Outfit. Las superficies de información son discretas para dar protagonismo al estadio y a las camisetas. La tipografía, el espacio y los iconos distinguen acciones, navegación e información.

El estadio es una ilustración SVG original definida en código. Las posiciones del campo representan la disposición táctica, no datos de seguimiento de jugadores. Los movimientos y los eventos visuales responden al estado del encuentro. Los escudos y trofeos se reutilizan de Carrera futbolera, con sus derechos originales.

## Presentación del partido

En los encuentros nuevos, el motor resuelve una posesión por minuto de simulación. Su descriptor identifica al poseedor, pasadores, receptores, defensor, portero y, cuando corresponde, autor del gol y asistente. La vista representa esos participantes mediante recorridos interpolados: circulación, recuperación, contraataque, córner, falta, penalti, remate y celebración. La formación, mentalidad e instrucciones modifican el dibujo. Las trayectorias son una interpretación visual de los sucesos simulados; no proceden de datos de seguimiento ni de una reconstrucción de un partido histórico real.

Un mismo reloj de presentación mueve a los jugadores y el balón. Reproducir consume la secuencia del minuto y después solicita el siguiente al motor. Las velocidades 1×, 2× y 4× cambian ese reloj. Pausar detiene tanto las posiciones como el balón y el avance del encuentro. Las decisiones del banquillo detienen la reproducción; la sustitución actualiza los participantes y descarta cualquier recorrido que pudiera devolver al campo al jugador que salió.

El remate y su celebración comparten el identificador del gol. El marcador visible y la lista de goleadores esperan al desenlace visual del remate; la celebración no vuelve a sumar el gol. El motor puede haber comprometido ya el resultado de ese minuto, por lo que el estado técnico del motor y el marcador de la presentación representan momentos diferentes de la misma jugada. No se calculan minutos posteriores para anticipar resultados.

El centro de partido permanece abierto al terminar el encuentro para mostrar la última jugada, también si se marca en el minuto final. La carrera registra la jornada una sola vez. «Volver al despacho» permite salir del resultado cuando el usuario termina de verlo. Los avances de cinco o quince minutos y «Ver resultado» conservan su función de saltar tiempo; no constituyen una reproducción de todas las posesiones omitidas.

Las partidas mantienen el formato de carrera v2. El modelo del partido tiene su propia versión: los encuentros nuevos utilizan `modelVersion: 3`, y los encuentros ya iniciados con los modelos 1 y 2 se reconstruyen con sus reglas anteriores. Las seis instrucciones nuevas se habilitan desde el siguiente encuentro de una partida antigua; no se cambia el modelo de un partido en curso. Sus escenas visuales se derivan de los sucesos disponibles; una ocasión antigua sin autor registrado no adquiere una identidad histórica verificada por ser animada. El guardado registra el minuto y las decisiones, y el motor determinista reconstruye el tramo jugado. La fracción de segundo de una animación no forma parte del guardado; recargar puede volver a presentar la última posesión sin duplicar estadísticas ni goles.

## Pizarra y respuesta táctica

El modelo 3 incorpora anchura, pases, ritmo, línea defensiva, elección al recuperar y reacción al perder. La pizarra los agrupa en posesión, defensa y transiciones. Los planes «Controlar», «Atacar espacios», «Apretar arriba» y «Proteger ventaja» aplican combinaciones visibles y editables; no sustituyen a los futbolistas ni alteran el dibujo elegido.

Las posesiones registran las instrucciones, presión y espacio estimados y una ruta de participantes reales. Los pases cortos favorecen apoyos entre líneas cercanas, los directos favorecen destinos adelantados y las transiciones distinguen conservar de contraatacar. Las intercepciones truncan la ruta y registran al recuperador. El ritmo y la presión tienen costes de condición; una línea alta puede conceder espacio detrás. Estos efectos son probabilísticos, con valores calibrados para el juego, y no garantizan una mejora del resultado.

El campo representa esos recorridos y objetivos: apoyos alrededor del portador, coberturas que se conservan, receptores que buscan espacio y un número limitado de presionantes. Anchura y altura del bloque se reflejan en las distancias. La aceleración y separación local suavizan el desplazamiento sin convertirlo en un motor físico reglamentario. Las decisiones pausan la reproducción y afectan a las posesiones futuras; el registro ya jugado permanece intacto.

La investigación y sus límites están en [Investigación táctica](football-manager-tactical-research.md). Se consultaron explicaciones oficiales de Football Manager, el manual de We Are Football 2024 y ejercicios de FIFA. Los intentos de reproducción de vídeos no permitieron observar fragmentos continuos; las conclusiones se atribuyen a los documentos leídos. No se copió código ni material gráfico de estos juegos.

## Balón parado y límites

La colocación visual toma como referencia las reglas de IFAB:

- [Penaltis, Ley 14](https://www.theifab.com/laws/latest/the-penalty-kick/): lanzador identificado, portero sobre la línea y los demás jugadores detrás del punto, fuera del área y separados del punto de penalti.
- [Tiros libres, Ley 13](https://www.theifab.com/laws/latest/free-kicks/): preparación del golpeo y barrera con separación respecto al balón.
- [Córneres, Ley 17](https://www.theifab.com/laws/latest/the-corner-kick/): colocación en la esquina, separación de los rivales y envío hacia el área.

La separación reglamentaria de referencia es 9,15 metros. El campo utiliza coordenadas porcentuales para que estas disposiciones se adapten a pantalla; no mide infracciones físicas en metros ni implementa todas las excepciones, repeticiones y sanciones de las leyes. Las probabilidades de falta, penalti, remate y gol son estimaciones de la simulación. Las tarjetas, el fuera de juego y el arbitraje completo no deben deducirse de estas animaciones.

## Bibliotecas y método

- [Motion para React](https://motion.dev/docs/react): animaciones de disposición, transiciones y respuesta a las acciones. Licencia MIT.
- [Lucide React](https://lucide.dev/guide/react): iconos SVG importados individualmente. Licencia ISC, con avisos de los iconos derivados de Feather incluidos en el paquete.
- Skills utilizadas: `develop-web-game` (pruebas Playwright, estado textual y capturas) y [frontend-design de Anthropic](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), localizada mediante `find-skills`. La guía de diseño se consultó en su fuente oficial; no se instala un plugin global ni un servicio remoto para ejecutar el juego.

Versiones exactas fijadas por `package-lock.json`. Los avisos de Motion y sus dependencias, y de Lucide, se distribuyen en `public/data/manager-interface-licenses.txt`.

## Accesibilidad y uso

Los controles tienen nombres accesibles, foco visible y etiquetas en español e inglés. Las animaciones respetan la preferencia de movimiento reducido. La reproducción automática empieza solo al pulsar reproducir; el usuario puede pausar para pensar y detenerse en el descanso. Salir de la sección del partido detiene la reproducción de la interfaz, y el encuentro se conserva para continuar.

Con movimiento reducido, cada jugada conserva su orden y una breve permanencia en pantalla mediante posiciones discretas, sin reproducir el desplazamiento continuo de los jugadores. Los controles de velocidad y pausa siguen disponibles. La narración, el marcador y las identidades permiten comprender la acción sin depender únicamente del movimiento o del color.

## Auditoría de presentación

`scripts/test-manager-presentation.mjs` genera guardados mediante `createManagerCareer`, `managerReducer` y `serializeManagerCareer`, y los importa por el control público del juego. Utiliza las plantillas reales de Madrid y Barcelona de 2013 en una liga reducida de prueba; ese entorno no pretende representar el calendario histórico. La búsqueda determinista de semillas encuentra jugadas reales del motor, incluido un gol en el minuto 90, en vez de insertar eventos artificiales.

El script inspecciona posiciones, balón, escena y tiempo de presentación mediante atributos `data-*`, y compara el marcador con los goleadores y el estado textual del juego. Cubre movimiento durante una posesión, pausa, velocidad efectiva, balón parado, gol antes y después del remate, sustituciones sin reingreso, guardado, final del partido, móvil de 390 píxeles con movimiento reducido y tableta de 820 píxeles. Sus capturas y `verification.json` quedan en el directorio de salida. La comprobación visual de esas capturas complementa las aserciones automáticas.

```sh
node scripts/test-manager-presentation.mjs http://127.0.0.1:5192 output/manager-v5/presentation
```

`--fixtures-only` genera y valida únicamente los guardados, sin abrir el navegador. El script no utiliza modificaciones privadas de React ni añade trampas al juego de producción. `window.render_game_to_text()` se usa para lectura; la prueba de pausa no invoca `advanceTime`, porque ese puente representa un avance explícito del motor.

Validación realizada el 10 de octubre de 2026:

- Los nueve grupos de comprobaciones de presentación pasaron sin errores de página ni de consola. Las velocidades medidas fueron 1,07×, 2,10× y 4,23×, dentro de los márgenes del reloj de navegador.
- Pasaron las 81 pruebas relacionadas de motor, salud, integración, partido en vivo, escenas y modelos de presentación. La prueba de escena incluye un goleador del minuto 64 sustituido automáticamente: aparece durante su jugada, sale al terminarla y no reaparece después de una decisión manual.
- La regresión previa de dirección de partidos pasó en escritorio, teléfono y tableta. La nueva pasada verificó además la reanudación después de consumir la cola de un avance de cinco minutos.
- Se revisaron las capturas del penalti, recuperación tras córner, gol, gol final y móvil con movimiento reducido, además de las capturas de posesión pausada y remate final pausado. En esta última se conserva el 0–0, la narración todavía no revela el resultado y el control Reproducir permanece disponible.

La evidencia de esta pasada está en `output/manager-v5/presentation-final/verification.json` y las capturas del mismo directorio. Estas comprobaciones validan los comportamientos descritos; no certifican un simulador físico completo ni la cobertura histórica de todo el fútbol.

Los datos históricos, las valoraciones estimadas y los límites de los torneos siguen documentados en las secciones de fuentes y en `football-manager-simulation.md`.

La compilación de producción también pasó los nueve grupos de presentación, sin errores de página ni de consola. Las velocidades medidas fueron 0,99×, 2,04× y 4,20×. Se revisaron las capturas de gol final y móvil; el encabezado conserva la fecha y jornada del partido mostrado. La compilación terminó correctamente y el cliente de la skill también pasó sobre ella. La evidencia consolidada está en `output/manager-v5/verification.json`, y la pasada de producción en `output/manager-v5/production-presentation/verification.json`.

## Auditoría de las instrucciones del modelo 3

`scripts/test-manager-tactics.mjs` utiliza guardados generados por el motor y los importa desde el control público. Comprueba los seis campos, los cuatro planes, la conservación del pasado y la reconstrucción exacta tras recargar. Para las jugadas compara la ruta y el contexto táctico calculados por el motor con los que presenta el campo. Añade una intercepción real y verifica que el balón termine en el defensor registrado, sin alcanzar al receptor previsto ni volver al atacante en la recuperación posterior.

```sh
node scripts/test-manager-tactics.mjs http://127.0.0.1:5192 output/manager-v6/tactics
```

El 10 de octubre de 2026 pasaron los siete grupos de esta auditoría, sin errores de página ni de consola. Incluyen pausa exacta, sustitución seguida de una instrucción sin reingreso del jugador retirado, teléfono de 390 píxeles con movimiento reducido y tableta de 820 píxeles. En la escena comparada, la amplitud del equipo fue de 38,30 puntos porcentuales con «Estrecha» y 76,22 con «Amplia»; es una comprobación geométrica de esa jugada, no una estadística de fútbol real.

Se revisaron visualmente las capturas de pizarra de escritorio, teléfono y tableta, el campo móvil, las jugadas estrecha y amplia y la intercepción. Los controles se mantienen legibles y sin desbordamiento horizontal. En duelos cercanos algunas etiquetas pueden coincidir parcialmente; la identidad del portador y el registro del partido ofrecen información adicional.

La evidencia está en `output/manager-v6/tactics/verification.json`. La primera ejecución detectó una carrera temporal de la propia prueba al intentar pausar al final de una escena a 4×; se repitió a 1× con margen suficiente, sin modificar el juego para satisfacer la prueba. La regresión general de presentación utiliza también el modelo 3 y conserva la búsqueda de goles de último minuto por semillas reales del motor.

La regresión general de presentación del modelo 3 pasó sus nueve grupos: pausa y velocidades, balón parado, marcador sincronizado con el remate, gol final, sustituciones y reanudación después de saltar cinco minutos. La evidencia está en `output/manager-v6/presentation/verification.json`. Las 98 pruebas relacionadas de motor, salud, integración, modelos de partido y campo también pasaron. La compilación de producción terminó correctamente en 3 min 50 s; mantiene los avisos existentes de directivas de cliente y tamaño de algunos paquetes.

La versión compilada también pasó los siete grupos de instrucciones tácticas, sin errores de página ni de consola. Se inspeccionaron sus capturas de intercepción y campo móvil. Resultados consolidados: `output/manager-v6/verification.json`; evidencia de producción: `output/manager-v6/production-tactics/verification.json`.


## Mercado y ojeadores (v7)

El centro de contratación separa búsqueda, seguimiento y ventas. Incluye calendario, presupuesto libre tras reservas, llegadas pendientes y mesa de negociación por etapas. Los formularios distinguen el precio del club del salario, prima, duración y rol del futbolista. La red de ojeo permite elegir experiencia/juicio, filtros y duración; los informes muestran fase, fecha, encaje, riesgo y estimaciones. Las superficies claras usan texto oscuro explícito dentro del tema del estudio.

La cobertura del selector procede del archivo de participantes: solo ofrece ligas verificadas para el año, muestra huecos y enlaza cada fuente. Las temporadas de año natural se distinguen de las que abarcan dos años. Detalles: [participantes](football-manager-participants.md), [contratación](football-manager-recruitment.md) e [investigación oficial](football-manager-market-research.md).

La auditoría de navegador del mercado pasó siete grupos en desarrollo, con cero errores de página/consola; se revisaron contratos, pendientes, ventas y ojeo en escritorio y teléfono. La verificación final compilada se registra en `output/manager-v7/verification.json`.

La compilación v7 terminó correctamente en 3 min 23 s. Sobre esa compilación pasaron los siete grupos de mercado, seis de cobertura/compatibilidad y siete de dirección táctica, sin errores de página ni consola. Se inspeccionaron las capturas de contrato, informes, cobertura, selección y campo en escritorio y móvil, además de ejecutar el cliente original de la skill de desarrollo de juegos. La selección coincide con el archivo en 1990, 2013 y 2025; la partida dirigida real de v6 conserva exactamente sus datos al restaurarse. La suite completa del mánager pasó sus 185 pruebas en 17 archivos.
