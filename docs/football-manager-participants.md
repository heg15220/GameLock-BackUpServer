# Participantes reales por liga y temporada

Archivo `2026-10-10-participants-v2`: **1.223 combinaciones liga-temporada**, con alguna temporada documentada en las **51 ligas del catálogo**, entre 1990 y 2025. La ampliación añade 444 combinaciones regionales a las 779 anteriores. Las 15 ligas antes ausentes tienen participantes documentados para 2025; esto no significa que las 51 estén disponibles en todos los años. No se reutilizan participantes modernos para rellenar temporadas históricas.

El año seleccionado identifica el inicio de una temporada partida (`2013/14`) o la edición anual (`2025` en Brasil, Argentina o MLS). No representa la clasificación final ni incorpora resultados futuros a las valoraciones. El calendario histórico prueba pertenencia a la competición; las plantillas y atributos tienen su cobertura independiente y siguen mostrando jugadores generados y estimaciones.

## Comportamiento del juego

- Solo se ofrecen ligas con una lista completa aceptada para el año. Las ligas sin datos aparecen en el resumen de cobertura y no se simulan.
- Cada división simulada contiene exactamente los IDs de su lista. Un club moderno ausente no se deja en esa división ni se mueve por deducción a una segunda división.
- Algunos clubes con jugadores reales documentados/editoriales para ese año permanecen en el mercado. Están en una ficha `external:<país>`, con `simulated:false` y `selectable:false`; no constituyen una liga histórica.
- Se reutilizan IDs y escudos de Carrera Futbolera por identidad inequívoca. Las fuentes no proporcionan nuevos derechos sobre marcas. Los clubes sin escudo conservan el distintivo de reserva de la interfaz.
- La nueva composición solo se aplica al crear un universo. Un guardado conserva sus clubes, ligas y ascensos/descensos ya simulados; no se reconstruye contra el archivo actualizado. El lector v1 sigue separado en `legacy-v1`.

## Fuentes y reconstrucción

El archivo combina calendarios CC0 de repositorios abiertos con tablas de temporadas de Wikimedia, atribuidas bajo CC BY-SA 4.0. Los primeros guardan revisión Git, URL exacta, SHA-256 del archivo y de la licencia; los segundos conservan revisión `oldid`, huella de la descarga, atribución, historial y enlace de licencia. Cada registro conserva su licencia: no se reclasifican las adaptaciones Wikimedia como CC0. La aplicación arranca sin red ni claves de API.

| Repositorio | Uso |
| --- | --- |
| [OpenFootball football.json](https://github.com/openfootball/football.json) | Calendarios JSON, primera prioridad cuando pasan la validación |
| [FootballCSV England](https://github.com/footballcsv/england) | Premier y categorías inferiores |
| [FootballCSV Deutschland](https://github.com/footballcsv/deutschland) | Bundesliga desde 1990 |
| [Archivo de España, fork de FootballCSV](https://github.com/Jack-Tilley/es-espana) | LaLiga desde 1990 y Segunda histórica |
| [FootballCSV MLS](https://github.com/footballcsv/major-league-soccer) | Participantes desde la primera edición, 1996 |
| [FootballCSV cache.footballdata](https://github.com/footballcsv/cache.footballdata) | CSV históricos adicionales; conserva la procedencia Football-Data indicada por el repositorio |
| [FootballCSV cache.wfb](https://github.com/footballcsv/cache.wfb) | Temporadas y divisiones ausentes en las fuentes anteriores; conserva la procedencia WorldFootball indicada por el repositorio |
| [OpenFootball South America](https://github.com/openfootball/south-america) y [World](https://github.com/openfootball/world) | Archivos Football.TXT CC0 de Ecuador 2025, Paraguay 2025 y Costa Rica 2024/25 |
| [Wikimedia](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content) | Tablas de participantes y clasificaciones regulares de temporadas regionales, CC BY-SA 4.0; la revisión exacta está en cada combinación |

La licencia declarada por un repositorio no equivale a una auditoría deportiva oficial de cada fila. El importador aplica controles de identidad y de calendario; las URLs se exponen para revisión. **No se importó `engsoccerdata` ni su espejo `cache.soccerdata`**: el origen indica uso no comercial, incompatible con asumir una licencia abierta por la etiqueta de un espejo.

### Controles

1. Se lee el archivo completo, no una lista de ejemplos. Los CSV admiten comillas, comas escapadas, BOM y CRLF; se retiran las anotaciones de número de partido que acompañan algunos nombres antiguos.
2. Se exige cobertura de todos los rivales entre los participantes de una liga regular. No se acepta un simple número mínimo de nombres de un archivo truncado. Se ignoran plazas de finales todavía sin equipo (`N.N.`, `winner`, `Sieger`).
3. MLS tiene calendario desequilibrado por conferencias y usa un control específico de rivales. Argentina 2025 exige 30 equipos y al menos 16 rivales por participante, de acuerdo con sus dos zonas de 15 y dos cruces interzonales. El [fixture y formato publicados por LPF](https://www.ligaprofesional.ar/notas/institucional/2025/01/11/todo-sobre-la-temporada-2025/) son la evidencia de esta excepción.
4. Los CSV de Rusia mezclan a veces promoción y liga. Se retiran aspirantes externos únicamente si queda un núcleo completo de 16 clubes, todos enfrentados entre sí. Se conserva la lista de aspirantes excluidos y la [referencia del formato de la liga](https://premierliga.ru/about/).
5. Los alias son explícitos o coincidencias normalizadas inequívocas dentro del país. Las abreviaturas de entidad deportiva se eliminan para reutilizar identidades. No hay unión por distancia textual. Los casos ambiguos se delimitan también por competición: `Estudiantes` en Primera argentina es La Plata, no Caseros. Guadalajara español no puede convertirse en Chivas mexicano.
6. Un ID no puede estar en dos ligas en el mismo año. Si sucede, la publicación falla conservando el archivo anterior. Los archivos rechazados y sus motivos quedan en `rejected`; si una fuente alternativa completa existe, puede cubrir esa combinación.
7. El parser regional exige una columna explícita de equipo y una tabla de participantes o clasificación regular. Contrasta el número declarado cuando existe, excluye cambios de entrenador, goleadores, clasificaciones acumuladas y eliminatorias. Solo une grupos complementarios identificados de una misma fase, sin equipos repetidos. Conserva las correcciones de estructura necesarias para encabezados antiguos; no extrae nombres de todos los enlaces de un artículo.
8. Apertura, Clausura e Invierno permanecen distinguidos. Se usa el torneo inicial de la temporada partida o, en una edición anual con dos torneos, Clausura cuando consta. Las fases y recuentos originales siguen en `stages`. Nunca se unen automáticamente participantes de dos torneos distintos. Perú 1990 exige 44 clubes y 1991 exige 41, evitando tomar su zona metropolitana como toda la liga.

Estos controles prefieren un hueco visible a una reconstrucción insegura. No afirman reproducir todos los reglamentos históricos: el formato jugable de torneos, ascensos y calendarios del motor sigue siendo una aproximación independiente de la pertenencia inicial.

## Cobertura exacta

Los intervalos siguientes se refieren al año inicial. Los saltos son huecos reales del archivo aceptado.

| Liga | Años disponibles |
| --- | --- |
| LaLiga; Bundesliga | 1990–2025 |
| Premier League | 1992–2025 |
| Championship; League One; League Two; 2. Bundesliga; Serie A; Ligue 1; Eredivisie | 1993–2025 |
| Primeira Liga; Turquía; Grecia; Escocia | 1994–2025 |
| Bélgica | 1995–2025 |
| Segunda española; Ligue 2 | 1996–2025 |
| Serie B | 1997–2025 |
| Brasileirão | 2003–2025 |
| Bundesliga y 2. Liga de Austria | 2010–2025 |
| Liga MX; Rusia | 2012–2024 |
| Brasileirão B | 2012–2025 |
| Polonia | 2012–2021, 2023–2024 |
| Suiza | 2012–2020, 2023–2024 |
| J1 Japón | 2012–2017, 2019–2021, 2023–2025 |
| MLS | 1996–2019, 2021–2025 |
| 3. Liga alemana | 2014–2024 |
| Primera argentina | 2014–2015, 2021–2025 |
| China | 2014–2019, 2022–2025 |
| Australia | 2018, 2024 |
| Colombia | 2024–2025 |
| Argelia; Egipto; Marruecos | 2024 |
| Honduras; Guatemala; Primera Nacional argentina; Venezuela; Uruguay; Perú | 1990–2025 |
| Costa Rica | 1990, 1992, 1994–2025 |
| Ecuador | 1990–1995, 1998–2000, 2003–2025 |
| Chile | 1990–2002, 2004–2025 |
| Paraguay | 1990–1992, 1994, 2003–2006, 2009–2025 |
| Bolivia | 1991, 1997–2016, 2018–2025 |
| El Salvador | 1993, 1998–2006, 2008–2025 |
| Panamá | 2002, 2009–2025 |
| Nicaragua | 2010–2025 |
| República Dominicana | 2015–2025 |

Persisten huecos explícitos: por ejemplo, Bolivia 1990, Costa Rica 1991 y 1993, Ecuador 1996–1997 y 2001–2002, Paraguay 1995–2002 o Panamá anterior a 2009 salvo 2002. Algunos artículos no existen en las fuentes consultadas; otros no ofrecen una tabla completa compatible con los controles. La competición dominicana actual empieza en 2015. Tampoco se extiende una temporada vecina para cubrir huecos como MLS 2020 o México 2025. El JSON regional conserva cada alternativa rechazada y su motivo.

Ejemplos de alcance al inicio: 1990 tiene 12 ligas; 2009, 33; 2012 y 2013, 42; 2014, 45; 2023, 46; 2025, 42. Las cifras son ligas seleccionables, sin contar los fondos externos del mercado.

## API y mantenimiento

`data.js` reexporta:

- `getAvailableYears(competitionId?)`: años globales con alguna liga, o años de una liga concreta.
- `getAvailableLeagues(year)`: metadatos de ligas respaldadas, `calendar: annual|split`, `seasonLabel`, `membershipCoverage`, y banderas `simulated/selectable`.
- `getLeagueSeasonCoverage(competitionId, year)`: disponibilidad, temporada, `edition`, fases, fuente, licencia, atribución, número de clubes y razón si no está disponible.

`league-memberships.js` expone además `getSeasonParticipants` y `getUnavailableLeagues`. La cobertura del mundo incluye `catalogLeagues:51`, `totalLeagues`, `unavailableLeagues` y `externalClubs`. No se debe contar `world.competitions.length` como número de ligas: incluye fichas de clubes externos exigidas por las referencias del guardado.

```sh
node scripts/sync-manager-data.mjs --memberships-only
node scripts/sync-manager-data.mjs --memberships-only --offline
# Equivalente independiente:
node scripts/sync-manager-memberships.mjs --offline
# Ampliación regional y ensamblado posterior:
node scripts/sync-manager-regional-memberships.mjs
node scripts/sync-manager-regional-memberships.mjs --offline
node scripts/sync-manager-memberships.mjs --offline
```

La reconstrucción completa `sync-manager-data.mjs` también ejecuta el ensamblado. `--years` limita las valoraciones del importador anterior; no reduce silenciosamente el archivo de participantes. Las descargas base están limitadas a seis simultáneas; Wikimedia se consulta secuencialmente, con separación de dos segundos y espera ante limitación del servicio. Hay timeout, revisiones conservadas y caché local ignorada por Git. Una fuente regional inaccesible queda registrada como hueco sin descartar otras listas válidas. Se escribe a un archivo temporal y se renombra tras validar. Los espejos públicos son `league-memberships.json` y `regional-memberships.json` en `public/data/football-manager/`.

La auditoría automatizada recorre las **1.223 combinaciones de los 36 años**. Comprueba la igualdad exacta de cada división simulada con su lista de origen, ausencia de IDs duplicados entre divisiones y exclusión de restos del catálogo moderno. Incluye LaLiga 1990/2009, cambios 20↔22 equipos, Bundesliga 1991/92 de 20, inicio MLS 1996 de 10, Argentina 2025 de 30, Perú 1990/1991 de 44/41 y Primera Nacional 1997/98 de 32. Arrecifes e Isidro Casanova conservan sus dos Almirante Brown distintos; los grupos de campeonato parciales no sustituyen a los participantes iniciales. Las 13 regresiones del parser regional cubren asimismo las estructuras antiguas, tablas de personal y fases separadas. Las comprobaciones de mundo exigen identidad única de jugadores, afiliación y plantilla mínima en todos los años disponibles.

La prueba de producción `scripts/test-manager-coverage.mjs` pasó seis comprobaciones en escritorio (1440×1000) y móvil (390×844), sin errores de página/consola ni desbordamientos. Contrasta los selectores y las listas regionales de 1990, 2013 y 2025 con el archivo final, las URLs de evidencia y la creación de carrera. Importa además un guardado real anterior de v6 (formato 2, modelo de partido 3, minuto 10) y exige conservar todos los campos expuestos de su partido, además de la restauración y serialización deterministas. Se revisaron visualmente las capturas de preparación, cobertura móvil y partido restaurado.
