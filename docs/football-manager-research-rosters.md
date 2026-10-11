# Plantillas basadas en convocatorias abiertas de 2017

La fuente es **Pappalardo et al. (2019), A public data set of spatio-temporal match events in soccer competitions**, [Scientific Data](https://doi.org/10.1038/s41597-019-0247-7). La publicación y las fichas de Figshare acreditan **CC BY 4.0** para estos datos. La licencia del artículo por sí sola no se usó como prueba: el importador verifica también la licencia de cada archivo descargado.

Se usan únicamente [Players](https://figshare.com/articles/dataset/Players/7765196), [Teams](https://figshare.com/articles/dataset/Teams/7765310) y [Matches](https://figshare.com/articles/dataset/Matches/7770422). No se descarga el gran archivo de eventos ni se copian atributos de videojuegos. Se conservan versión, URL, MD5 validado y SHA-256 de los tres archivos. La atribución completa aparece tanto en el JSON público como en las fichas del juego.

## Criterio de afiliación

Se extraen titulares y suplentes de partidos de las cinco primeras divisiones europeas de 2017/18, desde julio hasta **1 de septiembre de 2017**, inclusive. El resultado inicial contiene **98 listas y 1.944 registros de jugador**. Los identificadores de equipos se cruzan expresamente con los participantes domésticos documentados para 2017; un equipo desconocido hace fallar la importación.

Una convocatoria demuestra que un jugador apareció con ese equipo ese día. **No demuestra inscripción continua ni una plantilla completa en la fecha inicial.** Pueden faltar lesionados, jugadores no convocados o fichajes recientes. Los partidos posteriores solo sirven para excluir identidades presentes en más de un club de estas cinco ligas durante la temporada. No se infiere la fecha de traspaso entre apariciones, y esa exclusión conservadora también elimina jugadores válidos del inicio. No garantiza detectar movimientos a ligas externas al conjunto.

No se utiliza `currentTeamId`: es un campo de otra fecha y produciría afiliaciones retrospectivas erróneas. Tampoco se importan convocatorias de selecciones. Las fechas de nacimiento, posiciones amplias y país proceden del conjunto: selección nacional asociada cuando existe, pasaporte en los demás casos; se omiten identidades insuficientes o edades fuera del intervalo del juego. El país no pretende reconstruir cambios históricos de selección nacional; no se equipara automáticamente una nacionalidad de pasaporte a la selección representada.

En el runtime las fichas usan `research-match-sheet`, `CC-BY-4.0`, precisión `season`, atribución y observaciones con fecha/ID de partido. OVR, potencial, precio y salario siguen siendo estimaciones del juego. Los cortes editoriales auditados prevalecen. Cada lista conserva su propia licencia; nunca se fusionan y relicencian sus filas como CC0.

## Reproducción

```powershell
python scripts/sync-manager-research-rosters.py
python scripts/sync-manager-research-rosters.py --offline
node scripts/export-manager-coverage.mjs
```

La caché está en `output/manager-v9/wyscout-cache`. `research-season-rosters.json` y su espejo público son idénticos. El informe público `archive-coverage.json` cruza 51 ligas por 36 años: participantes documentados, clubes con listas fuente y precisión de los mercados se contabilizan por separado. Una lista disponible no equivale a una plantilla real completa ni al número final de futbolistas importados tras resolver conflictos.

La identidad fuerte es el ID de persona, no la URL de un archivo compartido. El nuevo resolvedor también corrige la exclusión accidental de jugadores de OpenFootball cuando una única URL documenta cientos de identidades.
