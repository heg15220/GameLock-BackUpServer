# Ampliación del archivo mundial del modo mánager

## Alcance y fuentes

El selector muestra la temporada elegida y hasta cuatro temporadas anteriores disponibles. Los accesos se reconstruyen al cambiar el desplegable, el deslizador o cualquiera de las tarjetas. Al llegar a 1990/91 no se inventan años anteriores al archivo.

La ampliación documenta los participantes de la primera división argentina en las 37 temporadas seleccionables, de 1990 a 2026. Para 2020 se identifica expresamente el torneo extraordinario de la Copa de la Liga Profesional y sus 24 clubes. Se ha corregido la identidad del Deportivo Mandiyú original, distinta del posterior Textil Mandiyú.

Las ligas asiáticas y africanas se configuran en `global-leagues.js`. Solo aparecen como jugables en un año cuando existe una lista de participantes aceptada. La incorporación incluye primeras y segundas divisiones; no supone que estén documentadas todas las divisiones de todos los países ni todos sus años.

Cada lista incorporada conserva la revisión de la fuente, su URL permanente, SHA-256, atribución, licencia del texto y validación de participantes. Las competiciones por grupos requieren grupos complementarios completos; se excluyen tablas juveniles y listas parciales. Las identidades de clubes se resuelven dentro de su país y se comprueba que no aparezcan simultáneamente en dos divisiones.

La evidencia de jugadores reutiliza el trabajo previo de Claude: artículos de clubes verificados, biografías en inglés, español y alemán, extracción de trayectorias y ventanas de cinco temporadas. Añadir clubes permite aprovechar más de esas biografías. Una trayectoria documentada no equivale a una plantilla oficial completa: el juego mantiene la distinción entre jugadores reales y generados, y las valoraciones siguen siendo estimaciones de juego.

La preparación vuelve a validar los enlaces de otros idiomas cuando la identidad inglesa fue corregida en la recopilación anterior. Esto evita conservar asociaciones antiguas con clubes distintos después de una reparación de identidad.

## Imágenes

Los escudos y logotipos proceden de campos explícitos de las fichas de los clubes y ligas. La alternativa de Wikidata acepta únicamente la propiedad de logotipo P154, después de verificar la identidad deportiva. No se asignan fotografías genéricas a partir de una búsqueda por nombre.

`public/data/football-manager/artwork-sources.json` conserva origen, revisión, descripción del archivo, licencia indicada, autor y hash de cada imagen nueva. Los logotipos conservan sus derechos y marcas propios; la licencia del texto de Wikipedia no licencia sus imágenes. El escudo disponible puede ser el actual y no necesariamente el diseño que se utilizaba en la temporada histórica.

Todos los tipos de trofeo que el juego puede otorgar tienen una ilustración SVG de reserva, con variantes por confederación. Las fotografías de trofeos ya disponibles se conservan. El logotipo de una liga ya no se utiliza como si fuese la fotografía de su trofeo.

## Reproducción y auditoría

Ejecutar en este orden, evitando otros procesos que escriban los mismos archivos:

1. `node scripts/sync-manager-global-memberships.mjs`: incorpora listas documentadas; admite `--leagues=id,id` y `--offline`.
2. `node scripts/verify-manager-global-memberships.mjs`: vuelve a analizar las revisiones descargadas y compara exactamente sus participantes. `--repair` elimina registros rechazados para permitir su reconstrucción; no debe utilizarse sin revisar el informe.
3. `node scripts/prepare-manager-global-evidence.mjs` y `node scripts/build-manager-player-evidence.mjs`: enlazan identidades y reconstruyen la evidencia de plantillas desde la caché existente.
4. `node scripts/sync-manager-artwork.mjs`: descarga las imágenes explícitas pendientes; `--retry-missing` revisa también ausencias ya comprobadas.
5. `node scripts/sync-manager-wikidata-artwork.mjs`: intenta la alternativa P154 y conserva los pendientes si el servicio comunica retraso temporal.
6. `node scripts/audit-manager-global-coverage.mjs`: comprueba identidades, participantes, copias públicas y archivos de imagen; escribe `output/manager-global/coverage.json`.

El informe de cobertura enumera los años disponibles y ausentes de cada liga, los clubes, los escudos y la evidencia de jugadores. Un año ausente puede ser anterior a la creación de la competición o carecer de documentación suficiente; no se interpreta automáticamente como un fallo de importación.

La prueba `global-coverage.test.js` recorre todas las temporadas argentinas y comprueba que cada participante tenga jugadores reales en el mundo construido. Las pruebas de participantes comprueban todo el intervalo seleccionable. Las pruebas del navegador revisan también las vistas de AFC y CAF, Argentina, la selección de temporadas y el traslado de partidas entre contextos independientes.

Los detalles del formato de guardado y de su capacidad están en [football-manager-portable-saves.md](football-manager-portable-saves.md).
