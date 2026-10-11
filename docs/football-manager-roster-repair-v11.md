# Plantillas históricas: corrección v11

## Causa del Deportivo 2011/12

El club figuraba correctamente en los participantes de Segunda, pero ninguna fuente de jugadores instalada cubría su temporada 2011/12. Tampoco había jugadores editoriales para ese club y año. El generador completaba por ello los 22 huecos de la plantilla. No era una confusión con el Deportivo de otro país ni una plantilla existente que se hubiese perdido al cargar una partida.

El importador no había consultado esa combinación por su orden y presupuesto de peticiones. Al consultarla, se comprobó que el artículo inglés de esa temporada no existe. Reintentar esa misma URL no bastaba: era necesario acudir a otra fuente. La temporada 2010/11 sí tiene artículo, pero su tabla agrupada por posiciones no era reconocida por el lector anterior.

## Correcciones

- Se reconstruye el Deportivo con **25 futbolistas reales al 1 de septiembre de 2011**, a partir de una revisión contemporánea expresamente fechada. Se contrastan identidades y fechas de nacimiento y se conservan revisión, licencia e historial. No se copian jugadores de 2012/13 ni se añaden incorporaciones posteriores. [Evidencia detallada](football-manager-deportivo-2011-v11.md).
- El lector Wikimedia admite tablas organizadas por grupos de posición, sin arrastrar posiciones a otra tabla. Se reimportan fuentes españolas e internacionales afectadas.
- El manifiesto de importación distingue las combinaciones nunca consultadas de páginas inexistentes y tablas rechazadas. Se puede priorizar un club y un año concretos; una página general encontrada por búsqueda no se convierte automáticamente en plantilla histórica.
- El selector advierte expresamente cuando un club y año no tienen ningún futbolista real documentado. La ficha de procedencia conserva también la atribución y las biografías contrastadas de los cortes editoriales.
- Se corrige otro error descubierto en la auditoría: el enlace «details» de LDU Quito había generado un participante ficticio en Ecuador 2010 y 2011. Ambas listas vuelven a sus 12 clubes; se conserva LDU Quito y se protege el extractor frente a enlaces de navegación.

## Partidas y límites

Las partidas guardadas no se reescriben al cargar. Una carrera inicial sin progreso puede aplicar **Actualizar plantilla inicial**, conservando club, entrenador, semilla y preferencias. La operación reconstruye el mundo inicial, las plantillas y las finanzas; el botón de exportación permite conservar una copia. Las carreras que ya tienen actividad mantienen su historia.

La auditoría de v10 encontró 19.361 clubes-temporada sin jugadores reales entre 20.852 participantes documentados. Todos esos casos carecían de lista fuente y de jugadores editoriales; ninguno de los clubes-temporada con una lista disponible quedaba totalmente vacío por los filtros. La auditoría reproduce el conteo de jugadores reales de los 36 mundos de v10 y separa afiliaciones ambiguas, listas solapadas y huecos de fuente.

Esta corrección resuelve el Deportivo y amplía casos adicionales, pero no convierte las 51 ligas y 36 años en un archivo exhaustivo. Una lista de temporada puede contener movimientos de invierno y se etiqueta como tal; solo los cortes con evidencia de fecha se presentan como plantillas del día inicial. Valoraciones, potenciales, salarios y presupuestos siguen siendo estimaciones del juego.

## Reproducción

```powershell
node scripts/audit-manager-roster-gaps.mjs output/manager-v11/audit-after
node scripts/export-manager-coverage.mjs
node scripts/audit-manager-archive.mjs output/manager-v11
node scripts/test-manager-deportivo.mjs http://127.0.0.1:5193 output/manager-v11/browser-deportivo
```

La prueba de navegador utiliza una copia de prueba del Deportivo v10, creada antes de modificar los datos, y comprueba tanto nuevas carreras como la actualización explícita de ese guardado. No utiliza ni modifica la partida del navegador del usuario.

## Ampliación publicada

El archivo Wikimedia v4 contiene 972 listas, 27.803 registros jugador-temporada y 13.039 identidades documentadas: 93 listas y 2.843 registros más que v10. No se eliminó ninguna lista anterior. Incluye fuentes en 42 ligas y algún registro en cada año de 1990 a 2025; esto no equivale a cubrir todos los clubes de esas ligas y años. El corte editorial de 25 jugadores del Deportivo se contabiliza aparte de estas listas Wikimedia estacionales.

La reconstrucción revisó 4.094 artículos almacenados sin nuevas peticiones de red. Se optimizó la reutilización de biografías y se descartaron antes las tablas sin información de posición para evitar lecturas redundantes. El manifiesto deja 6.212 candidatos sin consultar y 2.867 páginas canónicas ausentes; una ausencia en Wikipedia en inglés no demuestra que la plantilla real no exista.

## Resultado verificado

La integración final pasa de 34.583 a 37.198 registros reales de jugador-temporada en los 36 mundos iniciales. Se recuperan jugadores reales en 82 clubes-temporada antes totalmente generados; ningún club-temporada previamente no vacío queda sin reales. Muestras de 2011/12: Deportivo 25, Getafe 19, Sabadell 23 y Kaiserslautern 36 jugadores reales aceptados. Los conteos pueden ser menores que la lista original porque se conservan las exclusiones por afiliaciones ambiguas.

El archivo conjunto tiene 1.348 clubes-temporada con alguna lista fuente entre 20.850 participantes, después de retirar los dos falsos participantes ecuatorianos. Persisten 19.277 clubes-temporada sin jugadores reales. Se mantienen 612 combinaciones con ambos mercados documentados, 19 parciales y 1.205 estimadas.

Validación: 43 pruebas unitarias aprobadas, auditoría de 468.768 registros en 36 mundos sin identificadores de persona duplicados, 10 grupos de comprobaciones de navegador, escritorio y móvil sin errores JavaScript ni de consola. Se revisaron visualmente el once real, la procedencia y el aviso de plantilla ficticia. La copia de prueba v10 se actualiza explícitamente y conserva plantilla y finanzas al recargar. También se ejecutó el cliente del skill develop-web-game.

Compilación final correcta con el límite de memoria habitual del proyecto (8 GB), tras fallar un intento limitado a 4 GB. Vista local v11 activa en el puerto 5191 y verificada por HTTP, incluyendo los 25 registros del Deportivo. Informe completo: `output/manager-v11/verification.json`.
