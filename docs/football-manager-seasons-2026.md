# Selección histórica y temporada 2026/27

Actualización del 15 de octubre de 2026.

## Problema y cambio

El asistente mostraba cinco tarjetas de épocas y un deslizador, pero no un selector explícito de todos los años. Además, iniciaba siempre en 2025 y el motor y los importadores tenían límites fijos en ese año.

Ahora ofrece las **37 temporadas de 1990/91 a 2026/27** en un selector accesible. Las tarjetas siguen siendo accesos rápidos. El deslizador recorre índices del archivo, por lo que no puede elegir un año sin datos si hay huecos. La temporada predeterminada del asistente y de `createCareer` es la más reciente con participantes documentados. Cambiar de temporada reinicia liga, club, selección y ligas de simulación. Se conservan como máximo dos mundos en la caché del asistente.

El motor valida el año contra el archivo de participantes, sin un máximo fijo independiente. Las partidas existentes conservan su mundo y su fecha: esta actualización se aplica al crear una nueva carrera.

## Datos incorporados

- **49 ligas y 878 clubes** con participantes documentados para 2026 o 2026/27, según el calendario de cada competición.
- **468 listas de plantilla y 11.415 filas de jugadores** de esa temporada. Son cifras de las fuentes, antes de las comprobaciones de edad y la resolución de afiliaciones contradictorias que hace el motor.
- Resultados previos para las valoraciones de nueve ligas. El corte sigue siendo anterior al inicio de la carrera; los resultados de 2026/27 no se usan como conocimiento del futuro.
- Todas las temporadas anteriores de participantes, resultados y plantillas permanecen intactas, comprobadas contra Git. Las copias públicas coinciden con los archivos del motor.

La cobertura **no es exhaustiva**. Faltan listas de participantes validadas dentro de este archivo para Costa Rica y República Dominicana en 2026/27. También quedan 410 clubes sin lista propia documentada en esta importación; otros tienen listas parciales. El selector de club muestra los recuentos finales de jugadores reales y generados, y un enlace a la fuente disponible. Las valoraciones, el presupuesto y la simulación son estimaciones del juego.

## Evidencia y correcciones

Los participantes combinan [OpenFootball](https://github.com/openfootball/football.json/tree/e6744429ee395bc86f247348c6184bb08d4eb361/2026-27), con revisión y licencia CC0, y tablas de temporadas de Wikimedia con revisión permanente y atribución CC BY-SA. Las plantillas conservan sus fuentes por club y jugador.

Las páginas generales de clubes solo complementan la temporada actual si su campo `current` identifica expresamente esa campaña, su revisión cae dentro de ella y sus filas pertenecen a una sección de plantilla. Una fecha de revisión por sí sola no acredita una temporada histórica. Estas listas tienen precisión de temporada; no representan una inscripción exacta el 1 de julio.

Se corrigieron la lectura de celdas combinadas en tablas de estadios, la exclusión de tablas de asistencia y totales, la identidad del Racing de Santander, la distinción entre Racing de Avellaneda y Racing de Córdoba y los filiales austríacos. Los importadores conservan los años ajenos al alcance de una actualización.

El parser de fechas reconoce meses escritos dentro de plantillas Wikimedia. Esto permite contrastar el nacimiento de Sidiki Cherif (15/12/2006) con su biografía y con la [FFF](https://www.fff.fr/equipe-nationale/joueur/10595-cherif-sidiki/fiche.html), restaurar la fila histórica correcta y excluir una fila de 2026 que indicaba otra fecha.

## Reproducción

```sh
node scripts/sync-manager-memberships.mjs
node scripts/sync-manager-current-memberships.mjs --year=2026
node scripts/sync-manager-data.mjs --years=2026 --ratings-only
node scripts/sync-manager-wikimedia-rosters.mjs --years=2026 --max-requests=500 --max-jobs=2000 --compress-cache --report-dir=output/manager-2026/rosters
node scripts/sync-manager-wikimedia-rosters.mjs --years=2026 --current-club-pages --max-requests=300 --max-jobs=2000 --compress-cache --report-dir=output/manager-2026/current-squads
```

`--ratings-only` fusiona los años seleccionados y no reemplaza las identidades auditadas. `--offline` permite reutilizar las cachés de cada importador. Las solicitudes Wikimedia respetan el limitador compartido y los tiempos de espera del servidor.

La regresión de navegador está en `scripts/test-manager-seasons.mjs`: selector completo, elección de 2001/02, cambio a 2026/27 sin conservar opciones anteriores, creación de carrera y recuperación del guardado, en escritorio y móvil. Los informes y capturas de esta actualización se guardan en `output/manager-2026/`.
