# Archivo atribuido de participantes y plantillas

La ampliación regional y las nuevas plantillas se conservan en archivos separados de los datos CC0. Wikimedia publica el texto de sus artículos con [CC BY-SA 4.0 y sus condiciones de reutilización](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content). Una página accesible públicamente no se considera por ello de dominio público.

Cada registro importado conserva la URL de la revisión (`oldid`), su número, la huella SHA-256 de la descarga, la atribución a los colaboradores, el enlace al historial y la licencia. La adaptación consiste en extraer hechos estructurados y resolver identidades de clubes; no incorpora imágenes, escudos ni texto narrativo. Los archivos derivados mantienen CC BY-SA 4.0 en sus registros; los archivos y registros CC0 conservan su propia licencia. El código de extracción y las valoraciones del juego son independientes de esos datos.

## Participantes

El archivo regional publicado añade **444 combinaciones**: 441 adaptadas de Wikimedia y tres calendarios CC0. El archivo combinado suma **1.223 combinaciones** en las 51 ligas del catálogo. Cada una de las 15 ligas regionales incorporadas está disponible en 2025; sus huecos en otras épocas permanecen visibles.

`sync-manager-regional-memberships.mjs` busca artículos de temporadas, consulta la API pública sin claves y conserva una caché reproducible. Lee tablas con una columna explícita de equipo/club y contexto de participantes o clasificación regular. Excluye cambios de entrenador, personal, fichajes, goleadores, liguillas, eliminatorias y tablas acumuladas.

Cuando el artículo declara un número de clubes, la tabla debe coincidir con él. Sin ese dato se conserva la tabla regular completa o una lista explícita de participantes, con el contexto exacto para revisión. Una tabla corta de estadios no desplaza a una clasificación regular más completa. Las conferencias solo se unen cuando son grupos complementarios de la misma fase y no comparten identidades. Un grupo aislado nunca representa toda la competición.

Apertura, Clausura e Invierno se conservan por separado. En temporadas partidas se utiliza el torneo inicial disponible; en ediciones anuales con dos torneos se prefiere Clausura. Las fases documentadas y sus cantidades permanecen en `stages`. No se unen automáticamente listas de dos torneos con participantes distintos. Esto documenta la pertenencia inicial: el calendario jugable sigue usando el formato disponible en el motor y no reproduce todos los reglamentos regionales.

Los archivos Football.TXT de [OpenFootball South America](https://github.com/openfootball/south-america) y [OpenFootball World](https://github.com/openfootball/world) aportan además calendarios CC0 que no estaban publicados en football.json. Mantienen su revisión Git, licencia y validación por rivales. El archivo combinado de participantes conserva la procedencia y licencia de cada temporada.

Los alias se delimitan por país y por la identidad enlazada, no solo por el nombre corto. Unión de Mar del Plata no se convierte en Unión de Santa Fe. Los cambios de nombre de [Torque en 2020](https://montevideocitytorque.com/en/2020/01/nueva-identidad/) y de [Real Garcilaso a Cusco](https://cuscofc.pe/historia/) están respaldados por la historia oficial de esos clubes: conservan un ID y muestran el nombre de la temporada.

## Plantillas

El archivo final contiene **86 listas y 2.418 filas de jugador-temporada**: 33 listas/944 filas de 2012, 31/837 de 2013 y 22/637 de 2025. Son registros de fuente, no una promesa de 2.418 personas distintas activas: el juego filtra edades, duplicados, préstamos ambiguos y afiliaciones que ya tienen una fuente más precisa. Incluye Sporting Cristal en 2012 y 2013 y LDU Quito en 2013, comprobados contra los participantes regionales.

`sync-manager-wikimedia-rosters.mjs` extrae listas de temporada con nombre, posición y nacimiento documentados; una edad o nacionalidad desconocida no se inventa. El parser excluye los cedidos salientes y sus subsecciones. Se conserva también la fuente de identidad del futbolista cuando procede de su artículo individual.

La integración da prioridad a los cortes editoriales completos y las afiliaciones fechadas contrastadas. Una lista Wikimedia no desplaza esas pertenencias. Los nombres canónicos duplicados o artículos de identidad compartidos entre clubes de una misma temporada quedan excluidos de la importación ambigua. Se utiliza preferentemente el `pageId` canónico de la biografía: dos revisiones o alias redirigidos no crean dos personas. Las expansiones de nombres cortos, como Thiago o Joaquín, exigen además el nacimiento documentado correspondiente. La fuente de temporada no recibe `membershipVerified:true` ni se presenta como una inscripción exacta al 1 de septiembre.

Cada jugador importado se etiqueta `wikimedia-season-squad`, con `membershipPrecision:season`, atribución y licencia. Sus medias, potenciales y valores son estimaciones originales del juego, identificadas como `club-age-model-estimate`. Los registros de jugadores y participantes son independientes: disponer de una liga histórica completa no implica tener todas sus plantillas reales.

## Reconstrucción y comprobaciones

```powershell
node scripts/sync-manager-regional-memberships.mjs
node scripts/sync-manager-memberships.mjs --offline
node scripts/sync-manager-wikimedia-rosters.mjs --offline
```

Los importadores reutilizan la caché, espacian las peticiones y respetan las respuestas de limitación del servicio. La reconstrucción offline utiliza fuentes ya descargadas; una alternativa regional ausente se registra como hueco. Las pruebas focales cubren tablas sin clases CSS, enlaces de artículos inexistentes, recuentos declarados, fases separadas, conferencias, cambios de entrenador, encabezados y grupos antiguos y prioridad del Madrid 2013 frente a listas de temporada. La comprobación de Zaragoza 2012 exige la identidad real de Hélder Postiga, su club y su nacimiento; no basta con incrementar una cifra de jugadores.

La [matriz de participantes](football-manager-participants.md) es la referencia de combinaciones seleccionables. Las revisiones de los artículos y los huecos registrados permiten auditar o corregir una fila sin inventar cobertura.

Validación del archivo final: **47/47 pruebas** — 13 del parser regional, nueve de participantes (las 1.223 combinaciones), seis de consistencia del mundo en los 36 años, tres de integración Wikimedia, seis de plantillas editoriales y diez de proveedores. La integración comprueba además que un jugador sin fecha completa de nacimiento conserva su identidad, que Thiago/Joaquín no se duplican y que las biografías compartidas por dos listas de temporada no reciben una afiliación arbitraria.
