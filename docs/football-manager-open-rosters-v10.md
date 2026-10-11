# Ampliación de fuentes y recuperación de identidades CC0 v10

La investigación separa la licencia del software, la licencia declarada por un recopilador y las condiciones del proveedor original. El catálogo no incorpora un archivo masivo solo porque aparezca en GitHub o admita descargas sin clave.

La recuperación añade **4 listas de club-temporada y 415 registros jugador-temporada** al archivo CC0: pasa de 218 listas y 4.779 registros a **222 listas y 5.194 registros**. Se validaron 74 identidades de los 140 nombres examinados; 72 eran nuevas y dos ya estaban publicadas. El archivo de identidades pasa de 1.019 a 1.091 entradas. Las alternativas todavía ambiguas siguen excluidas; por ejemplo, no se elige entre los dos futbolistas llamados Eddie Johnson.

## Fuentes revisadas y decisión

| Fuente | Evidencia comprobada | Decisión |
| --- | --- | --- |
| [footballcsv/cache.footballsquads](https://github.com/footballcsv/cache.footballsquads) | 16.581 archivos `.txt` en el árbol inventariado; README reconoce que copia nombres y fechas desde FootballSquads. La raíz declara CC0, pero las [condiciones originales](https://www.footballsquads.co.uk/tou.htm) permiten uso no comercial con atribución y requieren permiso expreso para uso comercial. | No se importa como una nueva base abierta redistribuible. La etiqueta del espejo no resuelve la restricción del origen. |
| [Hudl/StatsBomb open-data](https://github.com/hudl/open-data) | El [contrato original](https://github.com/hudl/open-data/blob/master/LICENSE.pdf), actualizado el 8 de septiembre de 2023, restringe la distribución a terceros en 1.2.1 y la explotación comercial en 1.2.2. Se descargó y leyó el PDF, no solo el README. | No se incorpora a los archivos distribuidos del juego. |
| [OpenFootball worldcup](https://github.com/openfootball/worldcup) y euro | Convocatorias históricas con clubes indicados para una fecha de torneo; licencia CC0 del repositorio. | No se extrapolan a una plantilla de agosto ni a toda la temporada anterior. Un fichaje puede estar anunciado antes del torneo y otro cerrarse después. |
| [Cornerflick](https://cornerflick.com/data) | La página aplica CC BY 4.0 a su compilación, pero mantiene condiciones separadas para los hechos procedentes de proveedores y pide consultar antes de redistribuir a escala. | No se considera autorización suficiente para importar masivamente las plantillas del proveedor. |
| [OpenFootball v0-format](https://github.com/openfootball/v0-format), [players](https://github.com/openfootball/players) y [Wikidata](https://www.wikidata.org/wiki/Wikidata:Licensing) | Listas de club-temporada CC0 ya inventariadas, cumpleaños explícitos o identidades CC0 separadas. | Se recuperan filas previamente excluidas cuando existe una única identidad futbolística fechada compatible. No se utilizan afiliaciones P54. |

Los archivos de investigación y el PDF original están en `output/manager-v10/open-sources`. No se descargó el contenido de las 16.581 plantillas del espejo FootballSquads: solo su árbol de archivos para inventariar el volumen disponible.

## Recuperación de jugadores sin confundir homónimos

El importador anterior consultaba el título directo de Wikipedia. Nombres como «Dan Kennedy» o «Joe Cannon» remiten a páginas de desambiguación o a otra persona, y por ello quedaban excluidos. La ampliación consulta títulos que coinciden exactamente con el nombre completo normalizado, conserva todas las alternativas y valida sus entidades de Wikidata.

Se exige ocupación explícita de futbolista de asociación, género masculino para este catálogo, una única fecha de nacimiento exacta, nacionalidad soportada y edad entre 14 y 48 años en **cada** temporada documentada donde aparece ese nombre. Si quedan dos candidatos compatibles, ninguno se incorpora. No se elige el resultado más popular, ni se usan sus clubes declarados para justificar la pertenencia. Las alternativas se obtienen de los enlaces de la página del nombre y sus desambiguaciones, siguiendo toda la paginación de la API. Este conjunto documentado no pretende demostrar que no exista ningún otro homónimo en el mundo.

La afiliación procede exclusivamente de la lista histórica CC0 ya verificada. El perfil nuevo aporta identidad y nacimiento; su QID, revisión permanente y método de resolución quedan publicados. Las identidades nuevas se añaden a las anteriores y no reemplazan silenciosamente una fecha contradictoria.

Se contrastaron también las identidades recuperadas de [Dan Kennedy](https://www.mlssoccer.com/players/dan-kennedy/), [Joe Cannon](https://www.mlssoccer.com/players/joe-cannon/) y [Alan Gordon](https://www.mlssoccer.com/players/alan-gordon/) con sus perfiles oficiales MLS. Esas páginas sirven de comprobación; el archivo distribuido conserva los hechos y las revisiones de las fuentes CC0, sin copiar biografías o imágenes de MLS.

Los monónimos siguen excluidos sin evidencia adicional en la fuente. La recuperación no convierte una lista parcial en una plantilla completa, no añade jugadores que no aparecen en ella y no importa estadísticas, edades calculadas, habilidades o valores de mercado del proveedor.

## Reproducción y auditoría

```sh
node scripts/sync-manager-cc0-disambiguation.mjs
node scripts/sync-manager-cc0-rosters.mjs --offline
```

El primer comando conserva respuestas y objetivos en `output/manager-v10/open-sources`; admite `--offline` después de la descarga inicial. El informe `disambiguation-audit.json` conserva las alternativas y exclusiones. El segundo reconstruye `cc0-season-rosters.json` y su espejo público a partir de las fuentes fijadas a una revisión. Los recuentos finales se registran en el resumen de cobertura del archivo y en la auditoría CC0.
