# Calendarios de inscripción del modo mánager

Revisión: `2026-10-11-transfer-windows-v3`. Comprobación de fuentes: 11 de octubre de 2026.

El destino de la incorporación determina el mercado: se consulta el país y la competición del comprador o del club que recibe una cesión. Un mercado abierto para el vendedor no habilita una inscripción en el país del comprador. Los acuerdos pueden negociarse antes de la apertura; la incorporación depende del calendario que utiliza el motor de mercado.

## Cobertura real del archivo

El resolver cubre las **51 ligas de 40 asociaciones** del catálogo entre 1990 y 2025 y permite continuar años simulados posteriores. Esto es cobertura funcional, no una afirmación de que se conozca cada fecha histórica.

| Medida | Cantidad |
| --- | ---: |
| Registros de fuente por asociación/temporada o competición/temporada | 532 |
| Combinaciones distintas asociación/año con alguna evidencia | 480 |
| Rangos completos documentados, antes de expandirlos por liga | 1.058 |
| Rangos con cierre acreditado y apertura estimada | 5 |
| Combinaciones liga/año posibles, 51 × 36 | 1.836 |
| Combinaciones con ambas ventanas ordinarias documentadas | 612 |
| Combinaciones parcialmente documentadas | 19 |
| Combinaciones enteramente estimadas | 1.205 |
| Ventanas ordinarias documentadas después de resolver el ámbito por liga | 1.237 |
| Ventanas ordinarias estimadas después de resolver el ámbito por liga | 2.435 |

«Ambas ventanas documentadas» significa que hay fechas en las publicaciones citadas para los dos periodos ordinarios; no certifica todas las excepciones personales, horas límite o trámites de esa liga. El calendario FIFA tiene ámbito de asociación y puede comprender jugadores profesionales de competiciones distintas. Las disposiciones de liga más específicas tienen prioridad cuando se dispone de ellas. Hay ejemplos corregidos en Portugal y Alemania.

Los conteos de rangos fuente incluyen periodos extraordinarios y diferentes ámbitos; no son una suma de años íntegros. Los conteos efectivos de liga/año resuelven primero los overrides y clasifican por separado las aperturas no acreditadas. `getTransferWindowCoverage()` devuelve el detalle y los totales; `completeHistoricalCoverage` es siempre `false`.

El archivo combina el [calendario público FIFA](https://inside.fifa.com/transfer-system/player-transfers) para 2023–25, publicaciones editoriales auditadas y 25 ediciones históricas FIFA/TMS. La ampliación v10 añade 17 tablas HTML archivadas: el archivo histórico pasa de 174 a 365 combinaciones asociación/año. La cobertura efectiva aumenta de 367 a **612 combinaciones liga/año con ambas ventanas documentadas** (+245), y las enteramente estimadas bajan de 1.448 a **1.205**. Las dos diferencias se explican por dos combinaciones previamente parciales que ahora quedan documentadas. No se convierten los huecos en hechos históricos.

## Tablas oficiales recuperadas en v10

Las rutas antiguas FIFA/TMS recuperadas mediante el índice CDX de Internet Archive conservan fechas completas, no inferidas de transacciones de futbolistas. Se incorporan 17 revisiones: 31-05-2014, 04-12-2014, 18-02-2015, 25-08-2015, 03-10-2016, 03-01-2017, 31-01-2017, 26-05-2017, 11-07-2017, 28-08-2017, 01-12-2017, 01-02-2018, 01-03-2018, 01-10-2018, 03-01-2019, 01-03-2019 y 01-07-2019. La fecha publicada se lee de la propia página; la captura archivada puede ser posterior.

- [FIFA/TMS, mayo de 2014](https://web.archive.org/web/20140606205115id_/http://www.fifatms.com:80/en/Data/transfer-windows/) y [agosto de 2015](https://web.archive.org/web/20150924012616id_/http://www.fifatms.com/en/Football-Data/transfer-windows/): rutas anteriores de la tabla internacional.
- [FIFA/TMS, octubre de 2016](https://web.archive.org/web/20161024020031id_/https://www.fifatms.com/itms/worldwide-transfer-windows-calendar/) y [julio de 2019](https://web.archive.org/web/20190709153322id_/https://www.fifatms.com/itms/worldwide-transfer-windows-calendar/): tablas posteriores, con separación explícita por sexo desde las ediciones de 2018.
- [LFP 2009, página PDF 10](https://www.lfp.fr/assets/2008_2009_83_90_c2f8050beb.pdf) y [LFP 2011, página PDF 37](https://www.lfp.fr/assets/LFP_PV_CA_27_mai_2011_77e484dee4.pdf): ventanas de Ligue 1 y Ligue 2 para 2009/10 y 2011/12. Solo se importan las columnas nuevas verificadas, no columnas antiguas con posibles erratas.
- [SJPF 2017](https://sjogadores.pt/?id=8735&op=OP_SHOW_DETAIL&pt=news): añade Primeira Liga 2017/18, 1 de julio–31 de agosto y 1–31 de enero.

Las tablas HTML no publican la etiqueta de temporada. El importador conserva exactamente las cuatro fechas y asigna el año jugable según el final de la primera ventana, con `seasonLabelInferred` y `yearAssignment:primary-window-end-year`. No usa el patrón actual del país para reinterpretar Argentina, Uruguay u otros calendarios cambiantes. Los documentos se guardan con SHA-256 de sus bytes originales, URL original, captura, fecha publicada y fila (`sourceRow`); los PDF conservan página (`sourcePage`).

El parser acepta ISO, DD/MM/AAAA y AAAA.MM.DD; rechaza fechas imposibles, rangos invertidos, secuencias ambiguas y duplicados masculinos contradictorios. Antes de 2018 se exige el ámbito explícito del manifiesto para ITMS masculino profesional; [FIFA confirma que el sistema incorporó obligatoriamente los traspasos femeninos desde enero de 2018](https://inside.fifa.com/media-releases/fifa-publishes-first-ever-report-on-women-s-transfers). Desde 2018 solo se aceptan filas M. Portugal se excluye siempre del volcado mundial para no sustituir sus límites profesionales con los nacionales.

No se ha encontrado un archivo mundial íntegro anterior a 2014. Entre 1990 y 2010 solo las dos divisiones francesas de 2009 tienen ambos periodos confirmados en este archivo. La evidencia y los rechazos reproducibles quedan en `output/manager-v10/windows`; los 25 documentos producen 930 filas de fuente y 365 combinaciones históricas distintas, con 39 asociaciones y años 2014–2023 (no todos los países en cada año).

## Archivos mundiales recuperados en v9

Se han comprobado ocho ediciones históricas: 19-01-2018, 22-12-2020, 17-03-2021, 09-12-2021, 24-01-2022, 23-06-2022, 23-12-2022 y 03-03-2023. Las publicaciones incluyen temporadas anteriores y anuncios futuros; el nombre de un PDF no acredita su fecha. La URL denominada `20211201` fue reutilizada por FIFA hasta 2023: el importador conserva el encabezado real, la captura de Internet Archive, el SHA-256 y la página de cada rango.

Fuentes representativas:

- [FIFA/TMS, impresión del 19 de enero de 2018, copia pública](https://scce36195607ed97f.jimcontent.com/download/version/1516374070/module/13657672032/name/Worldwide%20Transfer%20Windows%20Calendar%20%2819.1.2018%29.pdf): 40 filas masculinas leídas visualmente en ocho páginas. Se conservan 39; Portugal requiere el plazo profesional LPFP.
- [FIFA, 22 de diciembre de 2020, captura oficial archivada](https://web.archive.org/web/20201223215558id_/https://resources.fifa.com/image/upload/transfer-window-calendar-22-dec-2020-update.pdf?cloudid=uepegkugqdr1jxhde5fy): calendario posterior a la revisión COVID; no se utilizaron los anuncios provisionales de mayo/julio de 2020 encontrados durante la búsqueda.
- [FIFA, 17 de marzo de 2021, captura oficial archivada](https://web.archive.org/web/20210319072135id_/https://resources.fifa.com/image/upload/transfer-window-calendar-mfa-s-20210317.pdf?cloudid=vmessewgm0ufm1wtq2qb): recoge revisiones y terceros periodos extraordinarios.
- [FIFA, 24 de enero de 2022, copia pública](https://noorsports.com/wp-content/uploads/2020/08/Transfer-Window-Calendar_MFA_S_v2_20220124.pdf): distingue expresamente categorías masculina profesional, femenina y amateur.
- [FIFA, 23 de diciembre de 2022, captura oficial archivada](https://web.archive.org/web/20230122175213id_/https://digitalhub.fifa.com/m/680099dc838c2961/original/Transfer-Window-Calendar_MFA_S_20211201.pdf): prevalece sobre versiones anteriores de los mismos periodos.

Las 39 asociaciones ampliadas son ALG, ARG, AUS, AUT, BEL, BOL, BRA, CHI, CHN, COL, CRC, DOM, ECU, EGY, ENG, ESP, FRA, GER, GRE, GUA, HON, ITA, JPN, MAR, MEX, NCA, NED, PAN, PAR, PER, POL, RUS, SCO, SLV, SUI, TUR, URU, USA y VEN. Los años jugables de estas ediciones abarcan 2017, 2018 y 2020–2023; no todas las asociaciones tienen cada año. Portugal mantiene sus fuentes profesionales anteriores: no se importó el cierre nacional más amplio como cierre de Primeira Liga.

El parser exige seis columnas válidas, descarta `TBC`, fechas imposibles, filas femeninas/amateur y calendarios masculinos paralelos contradictorios. Una edición posterior sustituye el rango anterior, nunca se unen límites distintos para alargar artificialmente el mercado. Las publicaciones recientes y los overrides de competición tienen prioridad sobre estos archivos. «Documentado» significa publicado por la fuente en esa revisión; no garantiza haber localizado cualquier modificación posterior o excepción individual.

Se conserva `sourceSeason` separada del año jugable. Australia 2020/21 sigue siendo 2020 aunque su primer mercado finalizara en enero de 2021; la temporada administrativa peruana diciembre 2021–diciembre 2022 corresponde al año jugable 2022. La impresión de 2018 no proporciona una columna de temporada: su etiqueta se deriva de los años de las ventanas y se marca `seasonLabelInferred`, sin afirmar que sea la denominación oficial de la liga.

El catálogo reproducible con todas las URLs y hashes está en `scripts/manager-transfer-window-sources.json`; el archivo factual es `transfer-windows.historical.json`. Los PDFs y su texto permanecen como caché de investigación, no se distribuyen dentro del juego. El espejo público `public/data/football-manager/transfer-windows.json` permite auditar los hechos, fuentes y rechazos.

## Épocas históricas comprobadas

| Asociación / temporada | Primera ventana | Segunda ventana | Evidencia y precisión |
| --- | --- | --- | --- |
| España 2011/12 | 01-07–31-08-2011 | 02-01–31-01-2012 | [Memoria LaLiga, p.139](https://assets.laliga.com/assets/2019/12/17/originals/034f999b694c230a6c534bca5664661c.pdf), [comunicación federativa FFCM/RFEF](https://ffcm.es/pnfg/NNws_ShwNewDup?cod_primaria=1000057&cod_secundaria=1000672&codigo=1005176) |
| España 2012/13 | apertura estimada 02-07; cierre 31-08-2012 | apertura estimada 02-01; cierre 31-01-2013 | Solo cierres acreditados por la [memoria LaLiga](https://memorias.laliga.es/2012-2013/es/actividades_generales_2.html). Ambos rangos siguen `estimated` |
| España 2013/14 | 01-07–02-09-2013 | 02-01–31-01-2014 | [Circular 19 RFEF, disposición cuarta](https://rfef.es/sites/default/files/pdf/circulares/circular%2019.pdf), Primera/Segunda |
| Inglaterra 2012/13 | 01-07–31-08-2012 | 01-01–31-01-2013 | Prensa contemporánea: [BBC verano](https://www.bbc.co.uk/sport/0/19076534), [BBC enero](https://www.bbc.co.uk/sport/20878119); metadato `press-report` |
| Inglaterra 2013/14 | 01-07–02-09-2013 | 01-01–31-01-2014 | [BBC julio](https://www.bbc.co.uk/sport/23126803), [BBC cierre](https://www.bbc.co.uk/sport/23904992), [SJPF invierno](https://sjogadores.pt/index.php?id=4749&op=OP_SHOW_DETAIL&pt=gabinetejuridico) |
| Francia 2012/13 | 13-06–04-09-2012 | 01-01–31-01-2013 | [LFP, artículo 212, tabla comparativa pp.14–15](https://www.lfp.fr/assets/PV_CA_13_juin_2013_21f25729de.pdf) |
| Francia 2013/14 | 11-06–02-09-2013 | 01-01–31-01-2014 | Mismo acuerdo LFP, columna de la nueva temporada |
| Italia 2012/13 | 01-07–31-08-2012 | 03-01–31-01-2013 | [FIGC, transferencias profesionales, apartados 6–7](https://files.figc.it/version/c%3AN2I4Mjc0ZWEtMDFhMy00%3AOTFmZTk1MDQtMDAwYi00/C_2_ContenutoGenerico_32007_StrilloComunicatoUfficiale_lstAllegati_Allegato_0_upfAllegato.pdf) |
| Italia 2013/14 | 01-07–02-09-2013 | 03-01–31-01-2014 | [Consejo FIGC](https://www.figc.it/it/federazione/news/approvata-dal-consiglio-federale-la-nuova-stretta-contro-il-razzismo-h7ulo9jf), SJPF para enero; el año erróneo del párrafo invernal FIGC no se importó |
| Italia 2014/15 | 01-07–01-09-2014 | 05-01–02-02-2015 | [Circular FIGC, apartado7](https://www.figc.it/FigcLegacyAssets/Assets/contentresources_2/ContenutoGenerico/101/C_2_ContenutoGenerico_2524402_StrilloComunicatoUfficiale_lstAllegati_0_upfAllegato.pdf) |
| Alemania 2012/13 | apertura estimada 01-07; cierre 31-08-2012 | estimada | [dpa/Welt, cierre](https://www.welt.de/newsticker/dpa_nt/infoline_nt/sport_nt/fussball_nt/article108616873/186-Millionen-Euro-fuer-neue-Spieler.html); la regla ordinaria actual no demuestra la apertura histórica |
| Alemania 2013/14 | apertura estimada 01-07; cierre 02-09-2013 | 01-01–31-01-2014 | [dpa citando DFL](https://www.tagesspiegel.de/sport/transferperiode-endet-zwei-tage-spater-6940915.html), SJPF invierno |
| Portugal 2012/13 | apertura estimada 01-07; cierre 31-08-2012 | estimada | [RTP, cierre](https://www.rtp.pt/noticias/1a-liga/a-crise-no-mercado-de-transferencias_d583932) |
| Portugal 2013/14 | 01-07–02-09-2013 | 02-01–31-01-2014 | [Reglamento LPFP, art. 50](https://sjogadores.pt/uploads/documentos/20130821140507_regulamentodascompeticoes2013-2014.pdf), cierre efectivo [NOS](https://nos.nl/artikel/546914-sluitingstijden-transfermarkt), SJPF enero |
| Japón 2013 | 04-01–29-03-2013 | 19-07–16-08-2013 | [J.League News 201](https://www.jleague.jp/img/aboutj/document/jnews/201/vol0201.pdf) |

La publicación de SJPF de diciembre 2013 también acredita el segundo periodo de 2013/14 para Austria, Bélgica, Grecia, Escocia, Países Bajos, Suiza, Rusia y Polonia. Sus primeras ventanas permanecen estimadas. Es información del sindicato profesional, identificada como `professional-association`, no un comunicado emitido por cada federación.

Otras ampliaciones íntegras: [España 2016/17](https://rfef.es/es/noticias/el-mercado-esta-en-marcha-hasta-cuando-se-pueden-fichar-jugadores), [Portugal 2021/22](https://sjogadores.pt/?id=11576&op=OP_SHOW_DETAIL&pt=news), MLS [2017](https://www.mlssoccer.com/news/what-you-need-know-about-2017-mls-secondary-transfer-window), [2019 retrospectivo](https://www.mlssoccer.com/news/mls-transfer-windows-are-set-2020-preseason-dates-also-released), [2021 revisado](https://www.mlssoccer.com/news/official-2021-mls-primary-transfer-window-dates-amended) y [2022](https://www.mlssoccer.com/news/2022-mls-roster-rules-and-regulations).

## Excepciones que sí cambian el juego

- **Junio 2025:** la [FIFA](https://inside.fifa.com/organisation/media-releases/groundbreaking-transfer-window-club-world-cup-32-teams-sign-new-players?requester=MediaHub) comunicó un periodo extraordinario del 1 al 10 para veinte asociaciones, aplicable a todos sus clubes afiliados. Catorce están en el catálogo. Se conserva como ventana separada: Inglaterra no reabre hasta el 16; España hasta julio. No se abre todo junio.
- **Premier 2018/2019:** [2018](https://www.premierleague.com/en/news/690895) y [2019](https://www.premierleague.com/es/news/1220224) distinguen apertura doméstica e internacional y cierres anticipados. La apertura doméstica exige identificar el club de origen. El cierre 2019 también se aplica a Championship por declaración expresa; League One y League Two mantienen el cierre nacional posterior. La apertura doméstica temprana de EFL no se certifica por copiar la de Premier.
- **EFL 2018:** el [aviso reglamentario de Carlisle United del 8 de agosto](https://www.carlisleunited.co.uk/news/2018/august/eflrulestwoaugust18) distingue cierre de compras el 9 de agosto y cesiones hasta el 31. La extensión del 10–31 solo se activa con `transactionType:loan` para Championship, League One o League Two; las opciones de compra siguen el mercado de operaciones permanentes. No abre el mercado de Premier.
- **Italia 2018:** [FIGC CU32/A, página PDF 5](https://figc.it/media/73440/32-modifiche-comunicato-ufficiale-59-del-01-06-2018.pdf) fija 1 de julio–17 de agosto para Serie A/B y el invierno revisado 3–31 de enero de 2019. No se aplica a esas dos ligas el cierre nacional TMS del 25 de agosto.
- **COVID 2020:** [LaLiga](https://www.laliga.com/noticias/nota-informativa-periodo-inscripcion-2020-21) abre del 4 de agosto al 5 de octubre y del 4 de enero al 1 de febrero de 2021. [Premier/EFL](https://www.premierleague.com/es/news/1725887) tiene del 27 de julio al 5 de octubre y una extensión doméstica hasta el 16 de octubre: esta última requiere al menos un club EFL y excluye un trato Premier↔Premier o internacional. [MLS](https://www.mlssoccer.com/news/mls-two-day-transfer-window-set-july-6-7-secondary-window-open-aug-12-oct-29) conserva del 6 al 7 de julio y del 12 de agosto al 29 de octubre; no certificamos su primera ventana de aquel año.
- **Alemania 2024:** [DFB](https://www.dfb.de/news/detail/besuschkow-und-co-viel-bewegung-im-transferendspurt-der-3-liga-264071) confirma el 30 de agosto para Bundesliga 1/2 y el 2 de septiembre para 3. Liga. La apertura del 1 de julio procede del registro FIFA. El override se limita a las dos primeras divisiones.
- **Portugal 2023–25:** las publicaciones [2023](https://sjogadores.pt/?id=12707&op=OP_SHOW_DETAIL&pt=news), [2024](https://sjogadores.pt/?id=13324&op=OP_SHOW_DETAIL&pt=news) y [2025](https://sjogadores.pt/?id=14006&op=OP_SHOW_DETAIL&pt=news) distinguen expresamente Liga Portugal, FPF no profesional y transferencias internacionales. Primeira Liga usa los plazos de la competición profesional, no los más amplios del calendario nacional TMS.
- **Inglaterra anterior a 2002:** la [Premier](https://www.premierleague.com/en/news/60258) documenta que se fichaba durante la temporada hasta el 31 de marzo. El simulador usa un periodo amplio, marcado estimado. Su reapertura del 1 de julio no está acreditada y no se presenta como dato histórico exacto.

Las aperturas domésticas inglesas ligadas al último partido de cada club en 2012/13 y 2013/14, las cesiones de emergencia EFL y los permisos individuales no están modelados. Los periodos generales de esas temporadas no deben leerse como catálogo exhaustivo de excepciones.

## Estimaciones, año natural y futuro

Cada país tiene un patrón propio derivado de su calendario documentado 2025; Portugal toma el patrón de su liga profesional. El archivo conserva mes/día y desplazamiento de año por separado: por ejemplo, Colombia y Panamá pueden abrir la primera ventana en diciembre del año anterior. Las asociaciones anuales son ARG,BOL,BRA,CHI,CHN,COL,DOM,ECU,JPN,PAN,PAR,PER,URU,USA,VEN; las restantes usan ciclo de dos años.

No se aplica enero/julio universalmente. Entre otros ejemplos, los patrones de MLS, Japón, Australia, Austria, Rusia y Suiza tienen comienzos distintos. Los 40 patrones exactos y sus fuentes están en `profiles` del JSON; se muestran como **estimados** cuando se proyectan a otro año.

La proyección de ENG, ESP, GER, FRA, ITA, SCO y POR desplaza un cierre de fin de semana al lunes. Es una decisión explícita del simulador, no una certificación de la ley de cada temporada. No incorpora festivos. Las fechas documentadas nunca se desplazan. Para Alemania 2002–2022 sin archivo exacto se proyecta la [regla ordinaria DFB](https://www.dfb.de/ueber-uns/der-dfb/internationale-transfers/internationale-transfers), también como estimación, en lugar de arrastrar una excepción moderna.

Desde 2026, salvo los inviernos que pertenecen a temporadas 2025/26 ya documentadas, se usan proyecciones. No se importaron anuncios 2026/27 del calendario público aunque la página consultada los muestre. Los cambios futuros de estructura de temporada, como la transición japonesa a 2026/27, no se pretenden reproducir con esta proyección. Los formatos históricos de año natural tampoco se certifican por extender retrospectivamente el patrón actual.

## Integración y persistencia

`transfer-windows.js` exporta:

```js
getTransferWindow(state, { clubId, date, fromClubId })
getNextTransferDate(state, { clubId, date, fromClubId, includeCurrent })
getNextSeasonTransferDate(state, { clubId, date, fromClubId })
getClubTransferWindows(state, { clubId, date, fromClubId })
createTransferWindowSnapshot(world)
validateTransferWindowSnapshot(snapshot)
getTransferWindowCoverage(snapshot)
```

Los argumentos opcionales usan club y fecha actuales. `getNextTransferDate` devuelve la fecha consultada si hay mercado abierto, salvo `includeCurrent:false`. No considera que una ventana solapada sea una reapertura: busca la siguiente después de terminar la actual. `getNextSeasonTransferDate` usa el ciclo del destino, enero para año natural o julio para ciclo partido.

La respuesta conserva `open/kind/label/start/end/daysRemaining/nextOpenDate/rules`, añade país, asociación, temporada, revisión y fuentes; `currentWindow`, `nextWindow` y cada miembro de `windows` incluyen `precision`, `verified`, `sources`, `sourceUrls`, `evidenceLevels` y una nota cuando procede. Un rango con cierre documentado pero apertura aproximada devuelve `precision:'estimated', endPrecision:'confirmed'`. La precisión principal de un mercado cerrado corresponde al siguiente periodo, no al último conocido.

El calendario se copia en `state.transferWindowCalendar`. El validador comprueba estructura, fechas ISO reales, rangos, ámbitos, fuentes y límites de tamaño. La lectura conserva el archivo guardado y no lo sustituye silenciosamente por el actual. Tratar el snapshot como inmutable una vez validado; las cachés se asocian a su identidad. Una importación inválida se rechaza.

Las reservas heredadas v7 sin `windowRevision` conservan la fecha comprometida por el motor de mercado. Las operaciones nuevas registran la revisión utilizada. El resolver no cambia unilateralmente una promesa guardada ni mueve la fecha de la partida hacia atrás.

## Procedencia, licencias y reproducción

El importador consume el estado público `__NEXT_DATA__` de la página FIFA, exclusivamente `Men's professional`, y acepta dos periodos válidos de temporadas iniciadas 2023–25. Rechaza periodos incompletos, fechas imposibles, rangos anómalos y calendarios profesionales paralelos contradictorios; no los une en una ventana artificial. El archivo registra URL, fecha de consulta, identificadores originales y SHA-256 del HTML consultado. No hay petición de red durante el juego.

```powershell
# Descarga opcional reproducible, requiere requests y pypdf:
python scripts/download-manager-window-archives.py output/manager-v10/windows
node scripts/sync-manager-window-archives.mjs output/manager-v10/windows
node scripts/import-manager-transfer-windows.mjs output/manager-v8/window-research/inside.html
node node_modules/vitest/vitest.mjs run src/games/sports/manager/transfer-windows.test.js --threads=false
```

Los overrides auditados viven en `transfer-window-editorial.js`, se añaden al final de la extracción y prevalecen por competición. Solo se reemplazan los periodos que acredita cada publicación; un anuncio de verano no convierte enero en confirmado. La tabla de cobertura se calcula después de resolver esa prioridad.

**Accesible públicamente no significa licencia abierta.** No se ha verificado una licencia de datos abiertos de esta página FIFA ni de los documentos federativos, prensa o copias alojadas por terceros. Se conservan hechos puntuales, citas y procedencia, sin empaquetar la prosa de esos documentos. Los metadatos distinguen publicación primaria, copia del documento primario, sindicato profesional y prensa. Un alojamiento en SJPF no se presenta como dominio oficial de LPFP. No se atribuye a un espejo la autoridad ni la licencia del organismo original.

Los repositorios de resultados/calendarios y los conjuntos de transferencias de jugadores examinados durante la investigación no aportaron un archivo abierto, completo y comprobable de periodos de inscripción 1990–2025. Una fecha de traspaso no demuestra ni la apertura ni el cierre reglamentario; no se infirieron mercados a partir de transacciones. Tampoco se copiaron rangos de Transfermarkt ni se les asignó una licencia supuesta.

Comprobación focal v10: **28 pruebas aprobadas**, incluyendo las 51 ligas en todos los años de inicio, fechas de Madrid 2013, Francia/Italia históricos, diferencia TMS/Liga Portugal, niveles de evidencia, cierre alemán por división, ventanas extraordinarias, comprador internacional, futuro estimado, snapshot persistente y cuarentena de datos corruptos. El informe de ejecución está en `output/manager-v10/windows/tests.json`; cobertura efectiva en `output/manager-v10/windows/coverage.json`.
