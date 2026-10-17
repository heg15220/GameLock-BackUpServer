# Guardados portátiles del modo mánager

## Código de partida (corto)

Al guardar, la partida se sube a `server/manager-saves` y se muestra su código `XXXX-XXXX-XXXX-XXXX` (base32 de Crockford: sin I, L, O ni U; al teclear se aceptan minúsculas, espacios y esas letras confundibles). Los 8 primeros caracteres identifican la partida y los 8 últimos son su clave (el servidor solo guarda su hash). Con el código, cualquier dispositivo carga la carrera y sigue guardando en ella: cada guardado sustituye la versión anterior. El dispositivo recuerda el código de cada carrera. Sin conexión siguen disponibles el código largo autocontenido y el archivo.

El servicio acepta solo instantáneas gzip de hasta 4 MB, limita escrituras y lecturas por IP (además del límite de nginx) y borra a diario las partidas sin abrir en `MANAGER_SAVES_RETENTION_DAYS` días (365). Despliegue: servicio `manager-saves-backend` (puerto interno 8794, volumen `manager_saves_data`) y ruta `/api/manager-saves` en nginx. En desarrollo, `node server/manager-saves/index.mjs`; Vite lo proxifica.

El icono de guardado y la acción **Exportar partida** abren un panel con un código autocontenido y un archivo descargable. En otro navegador o dispositivo, **Modo mánager → Importar partida** acepta cualquiera de los dos. El punto recuperado es el de la exportación: avances posteriores requieren una copia nueva.

Durante un partido, **Guardar** pausa la reproducción y abre ese mismo panel. El rival, marcador, minuto, comentarios y estado de simulación se recuperan al importar.

## Formato y compatibilidad

- Se conserva la versión de carrera `v:3`, la base IndexedDB `gamelock-manager` y la clave `autosave-v3`.
- El almacenamiento contiene un Blob comprimido y un resumen independiente para abrir el menú sin descomprimir el mundo.
- Formato actual (contenedor `v:4`, códec 2, `career/save-codec.js`): cada colección grande (jugadores, clubes, partidos, noticias…) se escribe en columnas, con la forma (orden de campos) de cada fila. Los campos ausentes siguen ausentes y cada objeto conserva el orden de sus claves. Además, sin pérdida: los identificadores de jugador que son el *slug* de su nombre no se repiten y el resto se codifican por prefijo; las plantillas guardan índices de jugador; los atributos se guardan como diferencia con la media; el índice de partidos por fecha se reconstruye. Cada transformación solo se aplica si la reconstrucción es idéntica.
- El códec no depende de la versión del archivo histórico: una partida exportada se abre después de cualquier actualización de datos.
- Se aplica gzip cuando el navegador dispone de CompressionStream. Existe alternativa JSON para navegadores sin compresión nativa.
- El código `GLM4.<base64url>.<crc32>` contiene el mismo archivo. CRC32 detecta copias incompletas o alteradas; no es una firma, cifrado ni protección contra trampas.
- Siguen admitiéndose los códigos `GLM3` y archivos del códec 1, las exportaciones JSON/gzip anteriores y los registros IndexedDB sin comprimir.
- El archivo conserva jugadores, calendarios, finanzas, contratos, historial, trofeos, estado aleatorio y partido en curso. No depende de descargar una versión concreta del archivo histórico para reconstruirlos.

## Crecimiento y consistencia

Cada guardado captura el estado antes de empezar la compresión. Las escrituras se aplican en el orden solicitado; una compresión rápida no puede hacer que una partida antigua sobrescriba una posterior. Borrar el guardado también espera las escrituras anteriores.

Al cambiar de temporada se eliminan únicamente jugadores retirados que no aparecen referenciados en ninguna parte de la carrera. Se mantienen los logros, estadísticas históricas y referencias directas e indirectas a antiguos jugadores. Los jugadores activos nunca se eliminan por esta limpieza.

La importación limita el tamaño comprimido y descomprimido, la profundidad y el número de estructuras, rechaza claves peligrosas y comprueba las relaciones esenciales entre clubes y jugadores antes de abrir la carrera.

## Tamaño medido

El motor guarda el estado fraccionario con precisión fija (progreso de desarrollo a milésimas, forma a centésimas, energía y moral a décimas). Antes se almacenaban dobles de 16 cifras que no se comprimían: una temporada jugada pesaba 0,99 MB con el códec 2 y ahora 0,81 MB (1,53 MB con el códec 1).

Mundo completo de 1999: 1,41 MB con el códec 1 (19.758 jugadores, antes de añadir Segunda B) y 0,75 MB con el códec 2 (21.520 jugadores, Segunda B incluida). Tras 40 ciclos anuales de retiradas y regeneración: 0,80 MB (20.170 jugadores). Una carrera de 2005 con 21.496 jugadores: 1,33 MB → 0,67 MB. El tamaño depende del número de jugadores del mundo, no de las temporadas jugadas: el historial del mánager crece unos pocos bytes por temporada.

## Capacidad de producción

El servidor guarda una sola versión por carrera (~0,7–0,8 MB, ya comprimida) y elimina las que llevan un año sin abrirse, así que el espacio depende de las carreras activas y no de cuántas veces se guarde ni de las temporadas jugadas. Referencias: 100.000 carreras activas ≈ 80 GB; 1 millón ≈ 800 GB; 1.000 millones ≈ 800 TB, que exigiría almacenamiento de objetos y no un disco. El tamaño está dominado por los ~20.000 jugadores del mundo simulado; reducirlo mucho más implicaría guardar solo diferencias respecto al archivo histórico, lo que invalidaría las partidas con cada actualización de datos.

## Verificación reproducible

- `career/save-format.test.js`: compresión, códecs 1 y 2, códigos GLM3/GLM4, integridad, orden de claves, índices derivados, captura consistente y conservación del historial.
- `career/save-integration.test.js`: mundo real completo, continuación determinista, partido en curso y 40 ciclos anuales de retirada/regeneración. Esta última prueba no simula 40 calendarios completos.
- `scripts/test-manager-portable-save.mjs`: navegación real, exportación, importación en un contexto limpio de navegador, comparación íntegra del estado, recuperación desde IndexedDB y orden de autosaves.
- Los tamaños medidos y las capturas de esta ejecución quedan en `output/manager-global/`. Los tamaños dependen del número de ligas y jugadores de la temporada.
