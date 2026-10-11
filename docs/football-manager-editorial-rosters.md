# Cortes de plantillas contrastados

El archivo `editorial-rosters.js` contiene hechos de afiliación contrastados con fuentes de clubes, federaciones y UEFA. Las posiciones generales, medias, potenciales y valores económicos son estimaciones originales del juego. No se copian bases de atributos comerciales. Las páginas consultadas mantienen sus derechos; no se presenta su contenido editorial ni sus imágenes como CC0.

Las carreras de 2013 empiezan el **3 de septiembre de 2013**, tras el cierre de mercado del día 2. Esto sitúa a Bale en el Madrid, Özil en el Arsenal y Kaká en el Milan. El resto de años mantiene el corte del 1 de septiembre, salvo fuentes etiquetadas expresamente como temporada completa.

| Corte | Alcance | Evidencia |
| --- | --- | --- |
| Madrid 2009 | 24 jugadores sénior; Van Nistelrooy aún estaba en el club antes de su salida invernal | [Informe anual del Real Madrid 2009/10, plantilla](https://static.realmadrid.com/StaticFiles/RealMadrid/img/pdf/InformeRm09_10.pdf) |
| Madrid 2013 | 23 jugadores sénior; excluye bajas de verano y convocatorias posteriores de Castilla | [DFB: plantilla, fechas de altas/bajas y nacimientos](https://datencenter.dfb.de/competitions/champions-league/seasons/2013-2014/teams/real-madrid?datacenter_name=datencenter), [Real Madrid: Bale](https://www.realmadrid.com/en-US/the-club/history/football-legends/gareth-bale/) |
| Barcelona 2013 | 25 jugadores confirmados por el club el 2 de septiembre | [Dorsales del primer equipo](https://www.fcbarcelona.com/en/news/1136247/this-seasons-shirt-numbers-confirmed) |
| Bayern 2013 | 25 jugadores sénior; incluye Badstuber y Kirchhoff, excluye promociones posteriores de cantera | [Archivo del Bayern](https://fcbayern.com/en/club/honours/german-championship/season-2013-2014), [DFB](https://datencenter.dfb.de/competitions/bundesliga/seasons/2013-2014/teams/bayern-muenchen) |
| Arsenal/Milan 2013 | Altas concretas; no plantillas completas | [UEFA: Özil](https://www.uefa.com/uefachampionsleague/news/020d-0e85f8932501-1b949d602154-1000--arsenal-smash-club-record-for-madrid-s-ozil/), [UEFA: Kaká](https://www.uefa.com/uefachampionsleague/news/020d-0e85f4dac4be-c80f8fe0760b-1000--madrid-playmaker-kaka-goes-home-to-milan/) |
| Napoli 2013 | Seis altas de verano, incluidos Higuaín, Callejón y Albiol; selección parcial | [UEFA: incorporaciones de verano](https://www.uefa.com/uefachampionsleague/news/020b-0e856e035468-1cd6c3fc5f43-1000--higuain-and-reina-check-in-at-napoli/) |
| Leeds 1992 | Cantona: el fichaje por Manchester United ocurrió en noviembre | [UEFA: noviembre de 1992](https://www.uefa.com/uefachampionsleague/news/01e8-0e6a0ecfee35-005da267e7f5-1000--football-in-november-1992/) |
| Salzburg 2019 | Haaland: enero a diciembre de 2019 | [DFB: Salzburg 2018/19](https://datencenter.dfb.de/competitions/oesterreichische-bundesliga/seasons/2018-19/teams/red-bull-salzburg) |

La selección existente del Barcelona 2012 se contrasta con el [archivo del club](https://players.fcbarcelona.com/en/chronology/2012), pero conserva precisión de **temporada**, no se declara plantilla sénior completa ni afiliación contrastada a un día exacto.

## Transferencias posteriores al corte

No se anticipan fichajes conocidos que sucedieron después de la fecha de inicio:

- **Luis Suárez, 2020:** permanece en Barcelona al 1 de septiembre. El club anunció su acuerdo con el Atlético el **23 de septiembre de 2020** ([anuncio del Barcelona](https://www.fcbarcelona.com/en/football/first-team/noticias/1837738/acuerdo-con-el-atletico-de-madrid-para-el-traspaso-de-luis-suarez)).
- **Sergio Ramos, 2023:** no recibe afiliación editorial al Sevilla para el 1 de septiembre; el regreso se anunció el **4 de septiembre de 2023** ([anuncio del Sevilla](https://sevillafc.es/actualidad/noticias/fichaje-sergio-ramos-2023)). La lista OpenFootball de temporada completa puede incluirlo con precisión `season`, sin fecha exacta ni verificación del corte.
- **Ronaldinho, 2014:** se omite la afiliación anual a Querétaro al 1 de septiembre. El anuncio fue el **5 de septiembre de 2014**; el [reporte contemporáneo que reproduce el comunicado del club](https://www.infobae.com/2014/09/05/1592843-es-oficial-ronaldinho-se-convirtio-nuevo-jugador-del-queretaro/) sirve para descartar ese fichaje anterior al corte, sin inventar otro club.
- **Maradona, 1993:** se omite la afiliación anual a Newell's al 1 de septiembre. La [historia oficial del club](https://www.newellsoldboys.com.ar/) sitúa su presentación el **13 de septiembre de 1993**. No se deduce de ello un club alternativo para el corte.

## Integración y límites

- Un corte completo tiene prioridad sobre importaciones y segmentos aproximados de carrera. No se añaden jugadores ajenos ni relleno ficticio a esas plantillas.
- `membershipPrecision`, `membershipDate`, `membershipSeason`, `sourceUrl` y `evidenceSources` mantienen la trazabilidad de cada hecho. `initialClubId` conserva el club documentado incluso después de un fichaje simulado.
- `world.coverage.archiveRevision` permite ofrecer la actualización explícita de una partida inicial; las partidas avanzadas conservan su mundo guardado.
- Cuando hay nacimiento completo, la edad respeta el cumpleaños en la fecha de inicio; con solo el año se sigue mostrando una aproximación.
- Estas listas no reproducen todas las inscripciones de cantera, lesiones reales iniciales ni el mundo completo. Badstuber pertenece al Bayern 2013, pero su lesión histórica no se importa. Las lesiones del motor son una simulación.
- Los datos Wikidata brutos no certifican por sí solos una pertenencia. Bergessio e Ibarra eran identidades reales asociadas erróneamente al Madrid por la fuente; no eran personajes generados. La auditoría de proveedores los rechaza y exige evidencia independiente.

Regresión: `editorial-rosters.test.js` comprueba las plantillas completas, el once inicial del Madrid, las salidas de 2013, las identidades, los cortes temporales y la conservación de la procedencia.
