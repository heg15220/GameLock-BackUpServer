# Plantillas abiertas adicionales: archivo CC0 v9

La ampliación usa listas históricas de OpenFootball y separa dos hechos: la aparición de un jugador en una lista de club de una temporada y su identidad con fecha de nacimiento. Una identidad de Wikidata nunca constituye evidencia de afiliación.

El archivo publicado contiene **218 listas de club-temporada y 4.779 registros de jugador**, distribuidos entre **15 ligas y 2005–2015**: 152 listas MLS de 2005–2014, 30 listas europeas de 2014/15 y los 36 clubes de las dos primeras divisiones alemanas de 2015/16. Se añadieron 1.019 identidades fechadas de Wikidata. Son registros de temporada, no 4.779 personas diferentes, y algunas listas omiten jugadores incluso antes de aplicar los filtros. Por ejemplo, la lista fuente de New York de 2013 no incluye a Thierry Henry; no se completa esa ausencia por memoria ni extrapolación.

## Fuentes incorporadas

| Fuente | Licencia de datos | Contenido utilizable |
| --- | --- | --- |
| [OpenFootball v0-format](https://github.com/openfootball/v0-format) | [CC0-1.0](https://github.com/openfootball/v0-format/blob/master/LICENSE.md) | Listas de MLS 2005–2014, Alemania 2015/16, Austria y Champions 2014/15 |
| [OpenFootball players](https://github.com/openfootball/players) | [CC0-1.0](https://github.com/openfootball/players/blob/master/LICENSE.md) | Nombre, nacimiento explícito y país de la ficha; ninguna afiliación se toma de estas fichas |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing) | CC0 para datos estructurados | Identidades masculinas con ocupación explícita de futbolista, nacimiento exacto único y nacionalidad compatible con el catálogo |

Cada archivo fuente conserva revisión Git, URL inmutable y SHA-256. Las identidades nuevas de Wikidata guardan QID y revisión individual. La API de Wikipedia se utiliza para resolver un título completo a una entidad; no se copia texto de sus artículos a este archivo CC0.

El inventario de 15 repositorios está en `output/manager-v9/open-sources/inventory.json`. Las listas modernas de Inglaterra, España, Alemania, Italia y Austria solo aportaban los clubes 2023/24 ya integrados. Los repositorios de Sudamérica, Bélgica, Europa y mundo consultados no contenían archivos de plantillas. El archivo histórico `v0-format` es una fuente adicional efectiva; la existencia de resultados para una liga no implica que haya plantillas para esa temporada.

## Validación y límites

- Solo se publica un club si aparece entre los participantes documentados de su liga y temporada. APOEL, BATE, Shakhtar, Ludogorets, Malmö y Maribor se excluyen de estas listas porque sus ligas no pertenecen al catálogo de 51 ligas.
- Alemania incluye cumpleaños explícitos en sus listas de 2015/16. MLS y muchas listas europeas omiten esos datos: se enlazan únicamente nombres completos con una identidad fechada inequívoca. No se deducen nacimientos del campo `age`, que llega a contener cero, ni del año de inscripción.
- Los monónimos sin cumpleaños en la propia lista se excluyen. Dos personas con el mismo nombre y distinto nacimiento no se resuelven por su supuesto club. La ciudadanía británica por sí sola no se convierte en Inglaterra, Escocia, Gales o Irlanda del Norte: sin otra identidad inequívoca de la fuente, ese registro no se incorpora.
- Una lista requiere al menos once jugadores identificados y un portero. Este umbral permite importar una lista parcial; no certifica una plantilla completa ni las posiciones o suplentes exactos de una fecha.
- La precisión es **temporada**. Pueden figurar entradas y salidas de invierno; las afiliaciones simultáneas entre listas deben pasar la política de conflictos del constructor del mundo. No se representan como un corte del primer día de liga.
- No se importan estadísticas MLS ni se infieren atributos, potencial, precio o rendimiento de estas fuentes. Esos campos siguen siendo estimaciones del juego.

El informe `output/manager-v9/open-sources/cc0-roster-audit.json` registra los recuentos finales por año, listas descartadas e identidades sin resolver. El JSON distribuido `public/data/football-manager/cc0-season-rosters.json` incluye su propio resumen `coverage`; `cc0-player-identities.json` distribuye las identidades nuevas y sus revisiones.

## Fuentes localizadas que no se importaron aquí

[ewenme/squads](https://github.com/ewenme/squads) contiene nueve ligas europeas entre 2004/05 y 2020/21, pero declara que sus datos proceden de Transfermarkt y no muestra una licencia abierta de datos en su raíz. Su disponibilidad en GitHub no prueba autorización para redistribuirlos. No se ha usado para completar huecos.

[StatsBomb/Hudl open-data](https://github.com/hudl/open-data) publica partidos seleccionados, eventos y alineaciones, pero requiere revisar sus condiciones propias y tampoco equivale a un archivo mundial de plantillas registradas. No se ha incorporado a esta ampliación CC0. El dataset de investigación Pappalardo/Wyscout se trata separadamente, bajo su licencia CC BY 4.0 y con evidencia de alineaciones fechadas.

## Reproducción

```sh
node scripts/sync-manager-cc0-rosters.mjs --offline
node scripts/sync-manager-cc0-identities.mjs
node scripts/sync-manager-cc0-rosters.mjs --offline
npx vitest run src/games/sports/manager/cc0-roster-parser.test.js --threads=false
```

El primer importador puede ejecutarse sin `--offline` para descargar los archivos CC0 desde las revisiones inventariadas. El segundo conserva las respuestas de API en caché y no consulta afiliaciones P54 para asignar clubes. El juego consume los archivos publicados: no necesita claves, acceso a las APIs ni conexión durante la carrera.
