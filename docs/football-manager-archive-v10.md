# Archivo histórico del mánager · v10

Ampliación del 11 de octubre de 2026 mediante tres agentes de investigación e integración central. Los datos se distribuyen con el juego y conservan sus fuentes; la simulación no requiere servicios externos en directo.

## Mercados históricos

El archivo de 51 ligas y 36 años contiene **612 combinaciones liga-temporada con ambas ventanas ordinarias documentadas**, 19 parcialmente documentadas y **1.205 estimadas**. Frente a v9 son 245 combinaciones completas adicionales y 243 estimadas menos, una reducción del 16,8 % de las 1.448 estimadas anteriores. Estos conteos cubren la matriz de archivo, incluidas temporadas sin participantes verificados disponibles para empezar una carrera.

Se añadieron 17 ediciones HTML archivadas de FIFA/TMS, principalmente de 2014 a 2019. El conjunto histórico reúne 25 ediciones, 930 filas fuente y 365 combinaciones asociación-temporada. Las fechas conservan publicación, captura, huella SHA-256 y fila o página. En las tablas antiguas sin etiqueta de temporada, la asignación del año se identifica expresamente como inferida; las cuatro fechas proceden del documento.

También se verificaron actas de la LFP francesa, documentación FIGC, publicaciones de la liga inglesa y del sindicato portugués. Las publicaciones oficiales son evidencia pública de fechas; no se presentan como bases con una licencia abierta inexistente. [Fuentes, reglas y reproducción](football-manager-transfer-windows.md).

## Plantillas e identidades

- **Wikimedia, CC BY-SA 4.0:** 879 listas y 24.960 registros jugador-temporada en 42 ligas; +281 listas y +8.935 registros frente a v9. Hay alguna fuente en los 36 años, sin que eso implique todos los clubes de cada año. Se amplió la recuperación de tablas y biografías, conservando revisiones permanentes, atribución y fechas de nacimiento. [Método y cobertura](football-manager-wikimedia-rosters.md).
- **OpenFootball/Wikidata, CC0:** 222 listas y 5.194 registros; +4 listas y +415 registros. Se incorporaron San Jose Earthquakes 2008 y Chivas USA 2012–2014. La recuperación añade 72 identidades, sin utilizar declaraciones actuales de club para reconstruir el pasado. [Fuentes aceptadas, descartadas y desambiguación](football-manager-open-rosters-v10.md).

Los conteos por fuente se solapan. Son listas parciales y registros por temporada, **no plantillas completas ni personas únicas**. La integración excluye afiliaciones ambiguas y mantiene prioridad para los cortes históricos auditados. Los huecos permanecen identificados; las valoraciones deportivas siguen siendo estimaciones del simulador.

El archivo conjunto pasa de 979 a **1.256 combinaciones club-temporada con alguna lista fuente**, entre 20.852 participantes documentados. La auditoría de los 36 mundos iniciales verifica 468.077 registros de jugador; 34.583 corresponden a jugadores reales (antes 25.752). El resto se identifica como generado. Todavía no hay listas fuente de clubes en las ligas de Paraguay, Bolivia, Colombia, Venezuela, Guatemala, El Salvador, Nicaragua, Dominicana y Panamá.

## Excepciones aplicadas a la simulación

En la EFL de 2018 las compras cierran el 9 de agosto y las cesiones continúan hasta el 31. El tipo de operación se consulta al programar la llegada, mostrar sus controles y tramitar ofertas salientes. Una opción u obligación de compra utiliza el mercado de traspasos definitivos: la extensión de cesiones no adelanta esa compra. La interfaz explica la diferencia y enlaza la fuente.

Se corrigieron también los cierres de Championship en 2019, Serie A/B en 2018 y el calendario de Portugal de 2017. Las excepciones se aplican únicamente a los años y divisiones respaldados por la fuente. La resolución es diaria; no reproduce horas límite ni todas las excepciones individuales.

Las partidas existentes conservan sus plantillas y calendarios originales. La revisión nueva se utiliza en nuevas carreras; una carrera sin actividad puede actualizarse mediante el control explícito ya disponible.

## Comprobación reproducible

```powershell
node scripts/export-manager-coverage.mjs
node scripts/compare-manager-coverage.mjs output/manager-v9/dist/data/football-manager/archive-coverage.json public/data/football-manager/archive-coverage.json output/manager-v10/coverage-comparison.json
node scripts/audit-manager-archive.mjs output/manager-v10
```

La matriz consultable sigue disponible en Datos y épocas y en `public/data/football-manager/archive-coverage.json`. La comparación registra mejoras, posibles retrocesos y lagunas por cada liga, evitando sumar dos veces listas de distintas fuentes. La verificación final se registra en `output/manager-v10/verification.json`.

Persisten lagunas importantes de mercados y plantillas, especialmente en épocas antiguas y ligas con poco archivo abierto. No se certifica cobertura completa de las 51 ligas para todos los años.

De las 1.205 combinaciones con mercados estimados, 510 pertenecen a 1990–1999, 508 a 2000–2009, 171 a 2010–2019 y 16 a 2020–2025. Las próximas investigaciones deben priorizar circulares y archivos federativos antiguos; un reglamento actual no acredita las fechas de esas temporadas.

## Verificación final

Compilación de producción correcta; 125 pruebas unitarias aprobadas y 14 grupos de comprobaciones de navegador en escritorio y móvil, sin errores JavaScript ni de consola. Se revisaron visualmente la cobertura, la procedencia de jugadores y la cesión EFL de agosto de 2018 con compra aplazada a enero de 2019. La importación de una partida v6 conserva el partido activo y sus datos. También se ejecutó el cliente de pruebas del skill develop-web-game.

La vista local en el puerto 5191 sirve v10; su archivo público confirma las 1.205 combinaciones estimadas y 1.256 listas club-temporada combinadas. Informes y capturas: `output/manager-v10/verification.json` y sus referencias.
