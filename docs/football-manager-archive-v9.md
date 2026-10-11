# Archivo histórico del mánager · v9

Actualizado el 11 de octubre de 2026 mediante tres agentes de investigación y una integración/revisión central. Los datos se empaquetan con el juego: la simulación no depende de llamadas de red a terceros.

## Cobertura comprobada

| Medida | Resultado |
| --- | ---: |
| Ligas del catálogo / años iniciales | 51 / 1990–2025 |
| Combinaciones liga-temporada | 1.836 |
| Con participantes documentados | 1.223 |
| Con ambas ventanas ordinarias documentadas | 367 (antes: 185) |
| Con mercados parcialmente documentados | 21 |
| Con mercados estimados | 1.448 |
| Club-temporada con alguna lista fuente | 979 de 20.852 participantes |

Las listas son evidencia parcial, **no 979 plantillas iniciales completas**. El panel Datos y épocas permite recorrer todas las ligas y años, consultar clubes faltantes, fechas y enlaces de evidencia, y descargar la matriz completa. Las partidas existentes conservan su archivo original; solo las carreras sin actividad pueden actualizarlo mediante una acción expresa.

## Nuevas fuentes e importadores

- **Wikimedia — CC BY-SA 4.0:** 598 listas / 16.025 registros jugador-temporada, 34 ligas y 34 años (1992–2025). Antes: 86 / 2.418. Se conservan revisiones, atribución e historial. El parser recupera tablas y evita incorporar reservas, secciones de traspasos y cesiones salientes. [Método y reproducción](football-manager-wikimedia-rosters.md).
- **OpenFootball v0-format / players y Wikidata — CC0:** 218 listas / 4.779 registros de 2005–2015, incluidas 152 listas MLS y las 36 de primera y segunda alemanas de 2015/16. 1.019 identidades nuevas, sin utilizar las afiliaciones Wikidata en cuarentena. [Fuentes y límites](football-manager-open-rosters-v9.md).
- **Pappalardo et al. / Wyscout — CC BY 4.0:** 98 listas / 1.944 registros de 2017/18. Solo convocatorias hasta el 1 de septiembre de 2017; partidos posteriores exclusivamente para excluir afiliaciones ambiguas. No se usa `currentTeamId` para reconstruir el pasado. [Procedencia y reproducción](football-manager-research-rosters.md).
- **Calendarios FIFA/TMS:** ocho ediciones archivadas aportan 174 combinaciones asociación-año. Son documentos públicos; **no se afirma una licencia abierta que no se haya verificado**. Cada rango conserva fuente, fecha del documento, página y huella. [Fechas, excepciones y reproducción](football-manager-transfer-windows.md).

Los conteos por fuente pueden solaparse. Los registros no equivalen a personas únicas ni al número de jugadores que sobreviven a los filtros de la simulación.

## Correcciones de integración

Se reconcilian todos los identificadores disponibles para una persona; una URL de archivo compartida no cuenta como identidad individual. Las filas complementarias mantienen su procedencia y licencia. Las afiliaciones a varios clubes en una misma temporada quedan excluidas cuando no hay un corte editorial o intervalo corroborado que resuelva el conflicto.

Se corrigieron la duplicación de Iniesta, la confusión entre pasaporte y selección de Navas/Godín/Guardado, y la etiqueta de plantilla completa para listas parciales. Los cortes auditados de Madrid y Barcelona conservan prioridad. Las valoraciones y finanzas siguen siendo estimaciones del juego.

## Verificación y continuación

`scripts/audit-manager-archive.mjs` recorre los 36 mundos iniciales y registra huellas de los archivos definitivos, pertenencia a clubes, unicidad de identificadores, licencias y cortes de fecha. El resultado final inspeccionó 465.366 registros de jugador en mundos simulados; 25.752 son registros de jugadores reales. Los demás están identificados como generados.

```powershell
node scripts/audit-manager-archive.mjs
node scripts/export-manager-coverage.mjs
node scripts/test-manager-archive.mjs http://127.0.0.1:5191 output/manager-v9/browser-archive
```

La matriz pública está en `public/data/football-manager/archive-coverage.json`. Las cachés y manifiestos de solicitudes pendientes permiten continuar importaciones con un presupuesto de red explícito. Permanecen lagunas grandes, especialmente en épocas antiguas y ligas fuera de las fuentes disponibles. No se extrapolan clubes modernos, fechas de mercado ni nacimientos para aparentar cobertura histórica.
