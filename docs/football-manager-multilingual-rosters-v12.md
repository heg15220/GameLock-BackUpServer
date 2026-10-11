# Plantillas multilingües: archivo español independiente

El importador `scripts/sync-manager-multilingual-rosters.mjs` aporta listas históricas de clubes que carecen de artículos de temporada en Wikipedia inglesa. La primera gramática revisada es española; el parser rechaza otros idiomas hasta que se implementen y prueben sus convenciones. El nombre «multilingual» describe el proveedor ampliable, no una afirmación de cobertura de cinco idiomas.

## Evidencia que admite

Se recupera una revisión del artículo del club anterior al 1 de septiembre del año consultado. **Esa fecha no demuestra la temporada**: una lista solo entra si su encabezado local o el campo `temporada` de `Equipo de fútbol inicio` la declara expresamente. El bloque termina en `Equipo de fútbol fin`; no se importan fichajes, cuerpo técnico, filiales, plantillas femeninas ni secciones de jugadores cedidos. El proveedor cruza el identificador del club con el catálogo independiente de participantes de la temporada declarada.

Una revisión de agosto de 2025 de Comunicaciones, por ejemplo, sigue diciendo «Plantilla y cuerpo técnico 2024/25»: puede aportar jugadores a 2024, nunca automáticamente a 2025. Diriangén tiene una lista sin temporada en la revisión probada y se rechaza. Los torneos Apertura/Clausura o I/II conservan su etiqueta en `seasonEvidence`; los registros tienen precisión de **temporada**, no una afirmación de plantilla exacta en el día de apertura. No contienen contratos, salarios ni valoraciones históricas factuales.

La documentación de las plantillas establece los campos de dorsal, nacionalidad deportiva, posición, nombre y edad, y distingue expresamente jugadores de cuerpo técnico: [Jugador de fútbol](https://es.wikipedia.org/wiki/Plantilla:Jugador_de_f%C3%BAtbol). Las fechas se leen según la convención española, día/mes/año: [Edad](https://es.wikipedia.org/wiki/Plantilla:Edad). No se transforma una edad entera en una fecha de nacimiento.

Las tablas manuales antiguas se admiten cuando identifican expresamente nombre, nacionalidad y posición, dentro de un apartado de plantilla con temporada. La variante de Oriente Petrolero 2012 etiqueta las posiciones mediante imágenes llamadas «Ficha portero», «Ficha defensa», «Ficha mediocampista» y «Ficha delantero»: se reconoce esa enumeración concreta, no colores o iconos arbitrarios. Las edades enteras siguen sin aportar nacimientos. Los rangos de temporadas se comparan con la edición correspondiente del catálogo: Bolivia sí utilizó 2011/12 y 2012/13, y no debe interpretarse esa fuente con el calendario moderno. Un rango cruzado incompatible con una edición documentada de año natural se pone en cuarentena.

Solo se consulta y atribuye una biografía cuando la fila contiene un **enlace explícito** a ella. Un nombre literal como Thierry Henry o Patrick Vieira no autoriza a identificarlo con el futbolista famoso del mismo nombre. Se exige evidencia explícita de que la biografía corresponde a un futbolista; se coteja el nacimiento con la fila. Una página de béisbol llamada Álex Rodríguez, como la enlazada incorrectamente por Tauro en la revisión explorada, no aporta identidad al juego. Las fechas contradictorias se omiten, también cuando dos filas de una misma plantilla enlazan el mismo nombre. Si no existe biografía, o el nombre no está enlazado, una fila con fecha exacta puede aportar nombre y nacimiento propios, con `identityEvidence` explícito y sin ID inventado. Si una consulta de un enlace no se completó por presupuesto o límite del servidor, se aplaza la fila, en lugar de confundir el fallo de red con inexistencia de biografía.

## Procedencia y licencia

La variante [«Equipo de fútbol inicio con esquema»](https://es.wikipedia.org/wiki/Plantilla:Equipo_de_f%C3%BAtbol_inicio_con_esquema) utiliza los mismos campos deportivos y un parámetro explícito `temporada`. Su bloque se cierra en `Equipo de fútbol fin con esquema`, sin absorber el cuerpo técnico ni los fichajes del pie. Se omiten `Jugador de fútbol cedido`, las filas posteriores a `Cesiones equipo de fútbol`, la nota `Cedido|OUT` y los grupos internos rotulados como filial. La revisión 162190034 del Deportivo de 2024 fue uno de los casos que permitió detectar esta variante: el año sí estaba en la fuente, pero la gramática inicial no la reconocía.

Los alias españoles incorporan los 22 participantes de Segunda División tanto de 2019/20 como de 2024/25. El identificador procede del catálogo de partidos OpenFootball; el título español se conserva explícitamente en el mapa `aliases` y en `candidates.json`, sin emparejamiento aproximado. `--leagues=laliga-2` limita una pasada a los clubes que pertenecían a esa división en cada año; no arrastra clubes ascendidos o descendidos desde otra edición.

Se corrigieron además los títulos exactos de Sabadell (apóstrofo simple), [UNAN Managua](https://es.wikipedia.org/wiki/Universidad_Nacional_Aut%C3%B3noma_de_Nicaragua_Managua_FC) y [Universidad O&M](https://es.wikipedia.org/wiki/Universidad_O%26M_FC). La ausencia de la página bajo un alias incorrecto no demuestra que el club carezca de documentación; la nueva consulta conserva la revisión histórica y vuelve a exigir el año expreso de la plantilla.

Cada lista conserva URL de revisión permanente, ID de revisión, SHA-256 del texto, fecha de edición, idioma, temporada declarada, historial, atribución y licencia CC BY-SA 4.0. Los jugadores resueltos conservan `identityWiki: 'es'`, `identityPageId`, revisión permanente de su biografía y el QID individual devuelto por `pageprops` cuando existe. **No se consultan afiliaciones P54 de Wikidata**. Los números de página españoles no comparten espacio de identidad con los ingleses.

Las listas se publican en `src/games/sports/manager/multilingual-season-rosters.json` y un espejo idéntico bajo `public/data/football-manager/`. Son una adaptación de información de Wikipedia: se mantiene atribución y [licencia CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). No se importa Transfermarkt, FBref ni una base cuya supuesta licencia sea únicamente la del scraper. Los perfiles externos incrustados como nombre se omiten.

## Reproducción y límites de red

La biografía puede confirmar fútbol mediante su infobox o mediante la primera afirmación de la introducción sobre el sujeto («es un futbolista»), cuando falta la ficha o deja el deporte vacío. No se admiten menciones posteriores a un hermano futbolista, ni se contradice un infobox que declare otro deporte. El nacimiento de una introducción solo se lee antes de esa primera afirmación, en formato español explícito. Pablo Vázquez Pérez y Barbero ilustran las dos variantes; las pruebas incluyen los contraejemplos. La cota de edad de 65 años es una comprobación de plausibilidad, no una regla de retiro: siempre sigue siendo necesaria una fila que documente la presencia del jugador en esa temporada.

```powershell
node scripts/sync-manager-multilingual-rosters.mjs --years=2025,2012,2020,2015,2011 --max-requests=340
node scripts/sync-manager-multilingual-rosters.mjs --years=2019,2024 --max-requests=130
node scripts/sync-manager-multilingual-rosters.mjs --years=2019,2024 --leagues=laliga-2 --max-requests=80
node scripts/sync-manager-multilingual-rosters.mjs --years=2025,2012,2020,2015,2011,2019,2024 --cached-rosters-only --rebuild --max-requests=60
node scripts/sync-manager-multilingual-rosters.mjs --years=2025,2012,2020,2015,2011,2019,2024 --offline --rebuild
node scripts/sync-manager-multilingual-rosters.mjs --season-articles --prefetch-only --years=1995,2019 --clubs=celta-vigo,deportivo-la-coruna --max-requests=3
npx vitest run src/games/sports/manager/multilingual-roster-parser.test.js --threads=false
node output/manager-v12/multilingual/audit-multilingual.mjs
```

`--clubs=...` limita identificadores de club; `--report-dir=...` selecciona informe y caché. El límite de peticiones incluye tanto plantillas como biografías; cada revisión se almacena completa, con gzip para respuestas grandes. La caché individual de biografías evita repetir la misma identidad entre clubes y años. `scripts/manager-wikimedia-rate-limit.mjs` comparte permisos con el importador inglés y respeta un enfriamiento global. Ante HTTP 429/503 o `maxlag`, esta ejecución se detiene y guarda lo recuperado. No se realiza un bucle agresivo de reintentos.

Las consultas se identifican como `GameLockArchive/1.0 (historical football facts; gamelockweb@gmail.com)`. El coordinador mantiene una sola petición y lectura de respuesta en curso, con un intervalo inicial de dos segundos y subida automática a ocho segundos tras un límite del servidor; respeta `Retry-After`. Esto sigue la [política de límites de Wikimedia](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits), sin rotar identidades ni intentar eludir restricciones. `--rebuild` reconstruye desde cero con los años indicados y permite aplicar una regla de verificación nueva a toda la caché, sin conservar filas antiguas incompatibles.

`output/manager-v12/multilingual/report.json` enumera listas admitidas, fuentes, jugadores omitidos y causas; `candidates.json` conserva las combinaciones solicitadas. El archivo es acumulativo, pero nunca combina dos capturas en una pretendida plantilla exacta. La misma revisión se reconstruye al mejorar la verificación; entre revisiones distintas se conserva la lista con más identidades válidas, manteniendo su fecha y alcance originales.

`--season-articles` permite consultar lotes de anexos con temporada en el título, y `--prefetch-only` guarda el descubrimiento sin modificar los datos publicados. La prueba inicial de 65 títulos de Celta y Deportivo entre 1990 y 2025 no encontró artículos existentes, incluido un enlace rojo presente en una revisión antigua del Celta. Por tanto esta vía no añadió jugadores en ese sondeo. No se interpretó el enlace rojo como evidencia de plantilla. El resultado está en `season-discovery.json` y las respuestas negativas quedan cacheadas para no repetirlas.

La ausencia de una lista válida se mantiene como hueco. Este proveedor no promete completar todas las temporadas 1990–2025, ni toda la plantilla de cada club. Las pruebas cubren los filtros que evitan introducir afiliaciones, edades o identidades falsas para rellenar esos huecos.

Las listas pequeñas también se conservan: nueve futbolistas con evidencia sirven aunque falten otros integrantes o no se haya resuelto ningún portero. Todos los registros llevan `complete:false`, `coverage:'partial'`, `parsedRows` y `validatedRows`; los controles por jugador no se relajan para aumentar el recuento. El motor decide por separado cómo completar los huecos de una plantilla jugable y debe mantener visible esa procedencia.

## Resultado de la importación del 11 de octubre de 2026

La reconstrucción revisada publica **242 listas de club y temporada y 5.037 filas de jugadores**. Son registros de temporada, no 5.037 personas distintas ni una cobertura completa de las 51 ligas. Hay datos para diez años declarados entre 2011 y 2025: algunas revisiones consultadas conservaban expresamente la temporada anterior. Un total de 1.711 filas usa nacimiento de la propia tabla sin atribuir una identidad biográfica inexistente o no resuelta.

| Liga | Listas | Filas verificadas |
| --- | ---: | ---: |
| Bolivia | 42 | 1.051 |
| Guatemala | 15 | 234 |
| Paraguay | 18 | 453 |
| Venezuela | 29 | 591 |
| El Salvador | 19 | 323 |
| Nicaragua | 8 | 131 |
| Panamá | 21 | 396 |
| República Dominicana | 14 | 58 |
| Colombia | 12 | 381 |
| LaLiga | 11 | 240 |
| Segunda División española | 53 | 1.179 |

`final-audit.json` registra cero errores de fechas, espacios de identidad, pertenencia a la competición, calendario o procedencia, y confirma que el espejo público es idéntico. Señala 14 identidades presentes en varios clubes de un mismo año para que el motor aplique su exclusión conservadora; no fuerza el club de destino. Deportivo 2024 aporta 24 filas verificadas: Dani Barcia tiene una corrección puntual del 17 al 19 de enero de 2003, acreditada por dos publicaciones del club. La guarda general de conflictos sigue excluyendo a Ager Aketxe y Borja Galán del corte de 2019. Las 21 pruebas puras verifican los filtros y que las excepciones solo se apliquen a sus IDs y revisiones concretos.

La revisión independiente de diez listas encontró dos contaminaciones reales. Millonarios 2024 incluía once filas de los grupos sub-20 y no inscritos, ahora excluidas; no se eliminan jóvenes que sí figuran en el primer equipo. Bolívar 2011/12 utilizaba una revisión de agosto de 2012 con el encabezado antiguo y fichajes para 2012/13: sus diecisiete filas se pusieron en cuarentena, sin reasignarlas a otro año. `multilingual-roster-corrections.js` y `quarantinedSources` documentan las fuentes del club. La muestra completa y sus límites figuran en `output/manager-v12/multilingual/independent-review.md`.
