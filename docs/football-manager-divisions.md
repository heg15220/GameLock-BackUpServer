# Ascensos y descensos del mánager

`src/games/sports/manager/divisions.js` mantiene un plan serializable de movimientos y eliminatorias. No modifica las tablas de la temporada terminada ni la base histórica: las nuevas divisiones se aplican al crear la temporada siguiente.

## Formatos documentados

El año indica el inicio de temporada. Las fuentes se consultaron el 10 de octubre de 2026; no se debe aplicar retroactivamente un reglamento actual sin comprobar la época.

| Frontera | 2012/13 | 2025/26 |
| --- | --- | --- |
| Inglaterra, niveles 1/2 y 2/3 | Dos directos y promoción 3.º–6.º | Igual; semifinales dobles, final neutral única |
| Inglaterra, niveles 3/4 | Tres directos y promoción 4.º–7.º | Igual |
| España, niveles 1/2 | Dos directos y promoción 3.º–6.º; gol visitante antes de prórroga | Dos directos y promoción 3.º–6.º; sin gol visitante |
| Alemania, niveles 1/2 y 2/3 | Dos directos y barrage antepenúltimo/tercero; gol visitante | Mismas plazas; sin gol visitante |
| Italia, niveles 1/2 | Dos directos y promoción 3.º–6.º; tercero directo si aventaja al cuarto en más de nueve puntos | Dos directos y promoción 3.º–8.º; tercero directo con más de catorce puntos de ventaja |
| Francia, niveles 1/2 | Tres directos | Dos directos; 4.º/5.º, ganador/3.º y barrage contra el antepenúltimo |
| Brasil, niveles 1/2 | Cuatro directos | Cuatro directos para el año natural 2025 |

En España las eliminatorias son a dos partidos; el mejor clasificado pasa si el global sigue empatado tras prórroga. En Italia las rondas dobles no tienen prórroga y decide la clasificación; las previas de 2025 son únicas, con prórroga y sin penaltis. Francia 2025 utiliza penaltis directos en las dos rondas únicas y prórroga/penaltis en el barrage doble.

Fuentes primarias:

- [EFL: formato de los playoffs](https://www.efl.com/competitions/sky-bet-play-offs/about-the-play-offs/).
- [RFEF: bases de Primera y Segunda 2021/22, páginas 19–22](https://rfef.es/sites/default/files/images19/001_primera_y_segunda_division.pdf) y [LaLiga: ascenso del Córdoba en 2014 por gol visitante](https://www.laliga.com/noticias/uli-davila-firma-el-ascenso-del-cordoba).
- [Bundesliga: ascensos y descensos](https://www.bundesliga.com/en/faq/what-are-the-rules-and-regulations-of-soccer/how-does-promotion-and-relegation-work-in-the-bundesliga-10645), [orden de partidos del barrage de segunda](https://www.bundesliga.com/en/2bundesliga/news/eintracht-braunschweig-saarbrucken-bundesliga-2-relegation-promotion-play-off-32290).
- [FIGC: comunicado 37/A, 2012/13](https://www.figc.it/FigcLegacyAssets/Assets/contentresources_2/ContenutoGenerico/212/C_2_ContenutoGenerico_33174_StrilloComunicatoUfficiale_lstAllegati_Allegato_0_upfAllegato.pdf), [Lega B: cuadro y desempates 2025](https://www.legab.it/news/regolamento-e-accoppiamenti-playoff-e-playout), [umbral de catorce puntos desde 2017](https://www.legab.it/news/consiglio-federale-cambiano-playoff-della-b).
- [LFP: artículos 519 y 519 ter, 2025/26](https://www.lfp.fr/assets/25_26_Reglement_Competitions_29_07_2024_5055b664e4.pdf); [FC Nantes: clasificación final 2012/13](https://www.fcnantes.com/articles/article2809.php?num=7956).
- [CBF: documentos de Serie B 2025](https://www.cbf.com.br/futebol-brasileiro/noticias/campeonato-brasileiro/serie-b/cbf-divulga-documentos-da-serie-b).

## Integración

1. `getDivisionRules(world, year)` enlaza divisiones adyacentes del mismo país y devuelve formato, cobertura, tamaño de referencia, notas y fuentes.
2. `createDivisionPlayoffs(state)` se llama al terminar todas las ligas. Devuelve `movements`, `playoffs`, `notes` y `complete`.
3. `getDivisionPlayoffFixtures(plan)` devuelve una tanda. Solo el partido único o la vuelta tienen `knockout: true`. Los campos `aggregateHome`, `aggregateAway`, `awayGoalsHome`, `awayGoalsAway`, `awayGoalsRule`, `awayGoalsExtraTime`, `tieBreak`, `tieWinnerId` y `noExtraTime` gobiernan los desempates.
4. `advanceDivisionPlayoffs(plan, results)` valida resultados, resuelve globales y añade intercambios equilibrados. No vuelve a aceptar un partido jugado.
5. `applyDivisionMovements(world, movements)` aplica de forma atómica y rechaza duplicados, orígenes incompatibles, saltos de categoría e intercambios desequilibrados.

`resolveDivisionMovements(state, { simulateMatch })` sirve para simulaciones sin interfaz y requiere el simulador del motor. La aleatoriedad procede de la semilla y el identificador del encuentro; un guardado entre dos partidos se puede reanudar sin cambiar el resultado.

## Límites expresos

- Se conserva el tamaño de las ligas cargadas. Reestructuraciones, sanciones, insolvencias y licencias administrativas no se reproducen.
- Las tablas utilizan puntos, diferencia general y goles; todavía no reconstruyen los desempates de enfrentamientos directos ni el juego limpio de cada país.
- Las épocas sin regla específica, Argentina y la tabla única austríaca llevan etiqueta de aproximación. No se simulan promedios argentinos ni fases austríacas. Tampoco se inventan conexiones entre grupos regionales o ligas cerradas.
- Los filiales españoles no ascienden a Primera y los alemanes no llegan a los dos primeros niveles. Si baja su primer equipo a su categoría y hay nivel inferior cargado, se fuerza un intercambio adicional. Si falta esa división —por ejemplo, el tercer nivel español— se mantiene el club en el catálogo y se registra explícitamente la excepción.
- Las reglas posteriores a 2025 no equivalen a un calendario oficial futuro: las carreras continuadas usan una extrapolación declarada del formato.
