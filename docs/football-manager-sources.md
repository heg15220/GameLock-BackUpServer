# Datos del modo mánager de fútbol

El catálogo contiene **51 ligas**. La ampliación regional v8 añade evidencia para las 15 que no tenían ninguna temporada disponible. Solo se pueden iniciar ligas con participantes documentados para el año elegido; el [archivo de participantes](football-manager-participants.md) detalla los recuentos, las fuentes y los huecos, sin usar clubes modernos como sustituto histórico. Las plantillas combinan 90 listas de clubes de 2023/24, cinco de 2014/15, cortes editoriales auditados de 2013/14 y las nuevas [listas Wikimedia de 2012, 2013 y 2025](football-manager-wikimedia-rosters.md). No es una base mundial exhaustiva. El archivo conserva además 9.316 identidades masculinas de Wikidata para investigar, pero sus afiliaciones sin contrastar están en cuarentena y **no activan jugadores en un club**. Los jugadores reales, los generados y la precisión de las fuentes conservan etiquetas distintas. Las valoraciones, los potenciales y las finanzas son estimaciones del juego.

## Fuentes integradas y licencias

| Fuente | Licencia | Uso efectivo |
| --- | --- | --- |
| [OpenFootball football.json](https://github.com/openfootball/football.json) | [CC0-1.0](https://github.com/openfootball/football.json/blob/master/LICENSE.md) | Calendarios para participantes y resultados previos; 249 combinaciones de liga y temporada descargadas |
| [OpenFootball england](https://github.com/openfootball/england/tree/master/2023-24/squads) | [CC0-1.0](https://github.com/openfootball/england/blob/master/LICENSE.md) | 20 plantillas de la Premier League 2023/24 |
| [OpenFootball england 2014/15](https://github.com/openfootball/england/tree/master/2014-15/squads) | CC0-1.0 | Arsenal, Chelsea, Liverpool, Manchester City y Manchester United; 123 identidades enlazadas sin ambigüedad |
| [OpenFootball espana](https://github.com/openfootball/espana/tree/master/2023-24/squads) | [CC0-1.0](https://github.com/openfootball/espana/blob/master/LICENSE.md) | 20 plantillas de LaLiga 2023/24 |
| [OpenFootball deutschland](https://github.com/openfootball/deutschland/tree/master/2023-24/squads) | [CC0-1.0](https://github.com/openfootball/deutschland/blob/master/LICENSE.md) | 18 plantillas de Bundesliga 2023/24 |
| [OpenFootball italy](https://github.com/openfootball/italy/tree/master/2023-24/squads) | [CC0-1.0](https://github.com/openfootball/italy/blob/master/LICENSE.md) | 20 plantillas de Serie A 2023/24 |
| [OpenFootball austria](https://github.com/openfootball/austria/tree/master/2023-24/squads) | [CC0-1.0](https://github.com/openfootball/austria/blob/master/LICENSE.md) | 12 plantillas de Bundesliga austríaca 2023/24 |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Data_access) | [CC0 para datos estructurados](https://www.wikidata.org/wiki/Wikidata:Licensing) | Nacimiento, posición, género, ciudadanía, selección deportiva y afiliaciones con precisión de fechas conservada |
| [OpenFootball south-america](https://github.com/openfootball/south-america) y [world](https://github.com/openfootball/world) | CC0-1.0, conservada por registro | Participantes regionales con revisión Git y huella; no proporcionan todas las plantillas |
| Wikipedia mediante MediaWiki | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), distribuida por separado | Participantes de temporadas regionales y listas estructuradas de jugadores; revisión permanente, huella, atribución e historial por lista |

Las 90 plantillas contienen 3.256 filas reales, incluidos juveniles como Pau Cubarsí, Ethan Nwaneri y Myles Lewis-Skelly. El importador no confunde el campo de club anterior con el club de pertenencia. Los registros demasiado jóvenes para la partida y las afiliaciones duplicadas entre clubes de una temporada no se incorporan como certeza.

Se descargaron historiales de Barcelona, Real Madrid, Atlético, Valencia, Sevilla; Manchester United, Arsenal, Chelsea, Liverpool, Manchester City, Tottenham; Bayern, Dortmund, Leverkusen, Schalke; Juventus, Inter, Milan, Roma, Napoli; PSG, Marseille, Lyon, Monaco; Ajax, PSV, Benfica, Porto, Sporting; Boca, River, Santos y Flamengo. Una identidad CC0 o un intervalo fechado no demuestran por sí solos la afiliación. Las listas antiguas de OpenFootball omiten el nacimiento: sólo se aceptan coincidencias exactas de nombre con una única identidad fechada de Wikidata o las plantillas editoriales existentes. El nacimiento y la pertenencia guardan fuentes separadas, sin arrastrar el club antiguo de la ficha editorial. Se registran 17 nombres ambiguos o sin coincidencia en `unresolved`, sin inventar edad; el homónimo Reece James queda excluido.

## Auditoría de afiliaciones del 10 de octubre de 2026

La Action API confirma que la fuente contenía realmente afirmaciones falsas; no era una coincidencia de nombres creada por el juego:

- **Gonzalo Bergessio (Q969146)**: revisión 2546254464, declaración `q969146$D7D89CA4-8E76-441A-B436-FA13713099CC`, atribuía Real Madrid (Q8682) a 2011–2014 con una referencia de importación de Wikipedia. La [ficha oficial de Sampdoria](https://www.sampdoria.it/en/player/gonzalo-ruben-bergessio/) lo sitúa en Catania durante 2012/13 y 2013/14; el [traspaso oficial del 1 de agosto de 2014](https://www.sampdoria.it/news/archivio/2014/08/01/ufficiale-gonzalo-bergessio-un-calciatore-della-sampdoria/) procede de Catania.
- **Renato Ibarra (Q654903)**: revisión 2553708577, declaración `Q654903$5D33DCBD-A9CF-4D07-9871-2A0E828EC687`, atribuía Real Madrid desde 2011 sin final. La [RFEF en mayo de 2014](https://rfef.es/sites/default/files/pdf/revista/especial_mundial_2014.pdf) y el [informe de clubes de la ECA para Brasil 2014](https://www.ecaeurope.com/media/1643/eca-player-release-analysis-world-cup-2014.pdf) lo sitúan en Vitesse. El historial también contenía una afiliación no corroborada al Barcelona. Ambas quedan rechazadas para el juego.
- **Marcelo (Q38136)**: es el Marcelo correcto, no Patrick Vieira. El [perfil oficial del Real Madrid](https://www.realmadrid.com/es-ES/el-club/historia/leyendas-futbol/marcelo-vieira) permite normalizar el nombre y la nacionalidad deportiva brasileña. La primera ciudadanía devuelta por una consulta no debe sustituir a la selección deportiva.

La corrección no consiste en borrar estos dos nombres y confiar en el resto: **13.248 afiliaciones sin revisión independiente quedan en cuarentena y tres se rechazan expresamente**. Las 9.316 identidades siguen disponibles para investigación. Las tres entidades auditadas conservan todos sus clubes, incluso los externos al catálogo, IDs de declaraciones, rango, calificadores, referencias originales y revisión. El resumen `membershipAudit` expone cantidades, razones, URLs y SHA-256; la revisión del archivo es `membership-evidence-2026-10-10-v2`.

`playerClubAtDate` sólo acepta `verificationStatus: verified` con evidencia primaria revisada y un período explícito `from`/`to`. Una URL externa, la etiqueta de licencia CC0 o `P143` (importado de Wikipedia) no bastan. Tampoco se consideran verificadas automáticamente las seis entidades de la muestra original. Los intervalos abiertos dejan de tener validez al terminar el período respaldado; los clubes externos y los intervalos inciertos pueden impedir la asignación; una cesión sólo desplaza al club propietario si la relación de préstamo se documenta expresamente. Las afiliaciones rechazadas nunca prevalecen sobre una plantilla editorial auditada.

Los recuentos activos se calculan al construir cada partida después de aplicar prioridad de fuentes, fecha, edades y exclusión de duplicados. Las cifras anteriores a esta auditoría incluían afiliaciones no corroboradas y ya no se publican como cobertura fiable. `club.rosterCoverage` indica recuentos reales/generados finales, URL y precisión. `coverage.completeRealSquads` cuenta equipos jugables sin jugadores generados; `coverage.rostersComplete` sigue siendo falso para el conjunto del mundo.

La ampliación inicial añadió League One y League Two de Inglaterra, 3. Liga alemana, las dos primeras divisiones austríacas, primeras divisiones de Bélgica, Grecia, Escocia y Suiza, Série B brasileña, J1 japonesa, Superliga china, A-League australiana, Ligue 1 argelina, Premier League egipcia y Botola marroquí. Sin participantes documentados del año elegido, una liga no puede iniciar una carrera. Las divisiones históricas eliminan clubes actuales que no pertenecían a ese curso, evitando duplicar participantes. La ampliación regional v8 y sus licencias se detallan en [datos Wikimedia y OpenFootball regionales](football-manager-wikimedia-data.md).

## Fechas, incertidumbre y calidad

- Las listas OpenFootball 2023/24 son **listas de temporada**. Incluyen juveniles y fichajes de invierno, como Vitor Roque en el Barcelona. No se presentan como plantillas exactas del 1 de septiembre. La interfaz muestra esta precisión por club.
- La instantánea auditada de 2013 usa el **3 de septiembre**, después del cierre de mercado, para incluir a Bale y Carvajal y excluir a Özil. Los demás cortes usan el 1 de septiembre. Una transferencia conocida sólo por año no se convierte en un día inventado.
- Wikidata puede omitir préstamos, posiciones, fechas de salida o contener afiliaciones falsas. Se exige evidencia independiente; los vacíos siguen visibles y se completan con jugadores marcados `Generado`. Las listas OpenFootball de 2014/15 conservan la misma precisión de temporada que las de 2023/24.
- Algunas declaraciones usan el club multideportivo padre para su sección femenina. Este catálogo de ligas masculinas exige evidencia explícita `P21=Q6581097` además de una posición de fútbol. No incorpora identidades femeninas o de género desconocido por compartir club. La consulta demográfica y su huella quedan en el archivo.
- La ciudadanía británica no se convierte automáticamente en Inglaterra, Escocia, Gales o Irlanda del Norte. Se usa `P1532` o una selección absoluta documentada. Sin evidencia inequívoca se conserva `GBR`; no se inventa selección nacional.
- Los alias usan año de nacimiento; las expansiones inequívocas de un nombre se deduplican dentro de la misma nacionalidad y año. Por ejemplo, Adriano Correia Claro no duplica a Adriano Correia. Los clubes se resuelven mediante alias explícitos y nombres normalizados, sin coincidencia difusa.
- Las edades se calculan por año de nacimiento. La habilidad individual importada tiene un modelo prudente de club y edad, con techo por puesto cuando existe un grupo de titulares editoriales. Los atributos desconocidos no convierten reservas como Oier Olazábal o Isaac Cuenca en estrellas que desplacen a Víctor Valdés o Busquets. El potencial sigue siendo una estimación, no una garantía del futuro.

## Calibración de clubes y límites deportivos

Una carrera del año N toma participantes de N/N+1 y resultados de N-1/N anteriores a `N-07-01`. En campeonatos de año natural el corte es `N-01-01`. Los marcadores de la temporada a simular no mejoran retrospectivamente su fuerza inicial. La escala básica del juego es:

```text
round(clamp(54 + 12 * puntos / partidos
               + 4 * diferencia_de_goles / partidos, 48, 94))
```

Después se reduce por fuerza de liga y nivel de división, para no equiparar automáticamente a un líder de cuarta división con un campeón europeo. Los ascendidos sin resultados previos usan una estimación etiquetada. Los 68.958 partidos previos contabilizados son bases sumadas, no necesariamente encuentros únicos entre todas las entradas.

No se rellenan marcadores faltantes. La instantánea 2024/25 contiene 370 partidos completos de LaLiga y Serie A, frente a 380 de la Premier. Los puntos son los obtenidos en campo (3/1/0), sin reconstruir todas las sanciones o reglas de desempate. Los campeonatos con fases, conferencias y apertura/clausura siguen formatos simplificados. Antes de 2010 hay jugadores documentados, pero no participantes de liga reconstruidos por esta fuente.

Presupuestos, precios, potenciales, recuperación física, lesiones y evolución futura pertenecen a la simulación; no son datos médicos o financieros certificados de las personas reales. Los ascensos y descensos escriben una historia alternativa desde la primera temporada.

## Reproducir y actualizar

Ambos importadores usan APIs públicas sin claves y Node 18 o posterior:

```sh
node scripts/sync-manager-data.mjs
node scripts/sync-manager-rosters.mjs
node scripts/sync-manager-data.mjs --offline
node scripts/sync-manager-rosters.mjs --offline
```

El primero reconstruye participantes/resultados y la muestra original de seis jugadores; el segundo reconstruye 95 listas de temporada, las identidades ampliadas y su cuarentena. `node scripts/sync-manager-rosters.mjs --audit-only` actualiza la auditoría conservando las listas existentes. Puede combinarse con `--offline` una vez descargadas las tres entidades. El juego importa los JSON desde `src/games/sports/manager/`, con copias iguales en `public/data/football-manager/`. Jugar no requiere conexión ni una API externa disponible.

`--refresh` descarga las fuentes otra vez y resuelve revisiones actuales. `--years=2012,2023,2025` limita los años del importador de resultados y sustituye las temporadas por las indicadas. Por defecto incluye todo 2010–2025 y cinco años previos cuyo vacío queda registrado. `--cached-only`, exclusivo de plantillas, publica consultas de clubes ya descargadas y declara el resto en `missingHistoricalClubs`; las validaciones demográficas requieren su fuente en caché y nunca se sustituyen por suposiciones.

Las cachés `.cache/football-manager/` y `.cache/football-manager-rosters/` conservan URL, fecha, SHA-256 y respuesta original. Las peticiones son secuenciales, tienen límites temporales y reintentos acotados. Los archivos de fútbol quedan fijados a revisiones Git; las consultas Wikidata guardan consulta, fecha y huella. SPARQL no ofrece revisiones individuales y no se inventan. Las consultas nuevas pueden solicitar `includeEvidence` para recuperar IDs, rango y referencias, que requieren revisión antes de permitir una afiliación. La Action API conserva `lastrevid` y los IDs de declaraciones, también para los casos auditados.

Un fallo de descarga o validación impide publicar la nueva instantánea. Las pruebas comprueban fuentes, fechas, ambigüedad, resolución de clubes, posiciones, edades, consistencia de plantillas, exclusión de secciones femeninas mezcladas, deduplicación, titulares del Barcelona 2012 y los 89 puntos/93–29 goles reales de Manchester City en 2011/12.

## Fuentes investigadas y recursos gráficos

[OpenFootball worldcup](https://github.com/openfootball/worldcup) tiene plantillas de selecciones históricas, pero sus clubes describen el Mundial y no resuelven movimientos estivales antes de una carrera de septiembre. No se copiaron a una fecha distinta. [Fjelstul World Cup](https://github.com/jfjelstul/worldcup) tiene condiciones de atribución y compartir igual; no se mezcló con los artefactos CC0. El acceso público de StatsBomb/Hudl o football-data.org tampoco se trató como licencia de redistribución irrestricta.

Se reutilizan escudos, logos y trofeos locales de Carrera Futbolera cuando coincide la identidad. **CC0 sólo cubre los datos estructurados importados.** No cambia derechos de marcas, fotos ni escudos. Los clubes y ligas nuevos sin recurso existente muestran una reserva tipográfica, sin inventar un logo oficial ni descargar imágenes sin comprobar sus condiciones.
