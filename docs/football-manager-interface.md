# Modo mánager (v3): interfaz, temporada y simulación

Rehecho desde cero en octubre de 2026. Se conservan los datos históricos (`data.js` y los archivos de plantillas y participantes); el motor de carrera, el motor de partido y toda la interfaz son nuevos.

## Estructura

- `career/` — motor puro (sin React), con pruebas en `career/*.test.js`.
  - `world.js`: mundo de la carrera a partir del archivo del año (clubes, ligas, ~18.000 jugadores), posiciones detalladas, alineación óptima, forma física y media dinámica.
  - `known-positions.js`: posiciones reales de ~450 futbolistas conocidos; para el resto, el dorsal del archivo y, si no hay, un sorteo ponderado.
  - `calendar.js`, `competitions.js`: calendario de la temporada, ligas, copas, competiciones continentales, clasificación y torneos de selecciones.
  - `match.js`: motor minuto a minuto (posesión, ocasiones con xG, córners, faltas, tarjetas, fueras de juego, VAR, lesiones, cambios, prórroga y penaltis, notas de jugadores) y resultado rápido para los partidos que nadie mira.
  - `simulate.js`: alineaciones de cada partido y consecuencias para los jugadores.
  - `transfers.js`, `scouting.js`, `development.js`, `board.js`, `events.js`, `national.js`, `inbox.js`, `economy.js`.
  - `career.js`: creación, botón «Continuar» día a día, paradas, fin de temporada y cambio de temporada.
  - `save.js`: guardado automático en IndexedDB (la carrera no cabe en localStorage) y exportación/importación en JSON comprimido.
- `ui/` — interfaz React. `match/pitch.js` (render del campo en canvas) y `match/director.js` (escenas animadas a partir de cada minuto simulado).

## Flujo de la temporada

1. **Mercado de verano** (1 jul–31 ago): pretemporada con cuatro amistosos; la liga empieza a mediados de agosto con el mercado aún abierto.
2. **Primera vuelta** (sep–dic): fase de grupos continental, rondas de copa entre semana, parones de selecciones.
3. **Mercado de invierno** (enero).
4. **Segunda vuelta** (feb–may): eliminatorias a doble partido, final de copa y final continental; balance de la directiva el 31 de mayo.
5. **Verano internacional** (junio): si el mánager es seleccionador y su país se ha clasificado, Eurocopa, Copa América, Copa de África, Copa de Asia, Copa Oro o Mundial. Las clasificaciones se juegan en los parones de otoño y los torneos se sortean el 1 de diciembre.

El 1 de julio: contratos que terminan, retiradas, regens, ascensos y descensos, presupuestos y nuevo calendario. Las ligas de año natural se adaptan a este mismo calendario (simplificación declarada).

## Decisiones de diseño

- Inspiración en la Carrera de EA SPORTS FC 27 (consulta previa, negociación por etapas con tensión, pujas rivales, plazos, porcentaje de futura venta, media dinámica por forma/ánimo/forma física, informes de ojeo en cuatro bloques, prensa con dos respuestas sin opción correcta). No se usa ningún recurso ni dato de EA.
- Todos los textos (noticias, mensajes, negociaciones, comentarios) se generan en `ui/texts.js` en lenguaje llano, en español e inglés.
- Diseño adaptable por consultas de contenedor (`@container mg`): pestañas en escritorio y tableta; barra inferior y botón «Continuar» flotante en móvil.

## Publicidad por dispositivo

- Escritorio: raíles laterales de 200 px reservados junto al juego.
- Tableta horizontal: raíles de 132 px con el juego desplazado para no tapar nada.
- Tableta vertical y móvil vertical: banner inferior; el juego mide su altura descontando ese espacio.
- Móvil horizontal: banner fino de 50 px y navegación solo con iconos.

## Calibración (pruebas del motor)

Partidos igualados: ~2,7 goles, 26 tiros, 9,5 a puerta, 11 córners, 3,8 amarillas y 41 % de victorias locales. Una temporada completa (con selección y Mundial) se simula en ~14 s de cálculo repartidos entre las paradas.
