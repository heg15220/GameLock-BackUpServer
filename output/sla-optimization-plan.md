# Plan Tecnico Para SLA <= 500 ms Con >1000 Concurrentes

- Objetivo operativo: tiempo de respuesta de entrada al juego `<= 500 ms` con `>1000` usuarios concurrentes.
- Base usada: benchmark rapido de entrada con `100` y `3000` concurrentes.
- Alcance de esta evidencia: latencia de carga/entrada del juego. No mide todavia acciones internas durante la partida.

## Regla Tecnica

- Ningun juego `P1` debe depender de `iframe` en produccion para su entrada.
- Presupuesto de arranque por juego: `1 JS lazy` y `0-1 CSS` como maximo.
- Objetivo intermedio de seguridad: `p95 <= 250 ms` a `100` concurrentes y `0` errores.
- Todo recurso de entrada debe ser cacheable y sin cadena `HTML -> JS -> helper -> JS adicional`.

## P1

- `arcade-dig-hole-treasure`
  Motivo: `p95 1670.93 ms`, `268` errores a `100`; `p95 19200.10 ms`, `15000` errores a `3000`.
  Patrón: `iframe` con `/arcade/dig-hole-treasure/index.html` mas helper `syncEmbeddedFrameLayout`.
  Accion: eliminar `iframe` y portar el runtime al bundle React/canvas normal. Mientras exista `iframe`, no cumple SLA.
  Accion: si la migracion completa no entra en el primer sprint, incrustar el runtime como modulo JS directo y quitar la carga de `index.html`.
  Referencia: [src/games/arcade/dig-hole-treasure/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/dig-hole-treasure/index.jsx)

- `arcade-valle-tranquilo`
  Motivo: `p95 1326.29 ms`, `81` errores a `100`; `p95 10421.33 ms`, `9000` errores a `3000`.
  Patrón: `iframe` con `index.html` muy pesado (`265707` bytes) mas helper de sincronizacion.
  Accion: eliminar `iframe` y mover el juego a componente/runtime directo.
  Accion: si no se migra de inmediato, al menos dividir el HTML gigante en assets modulares y evitar que la primera carga dependa del documento embebido completo.
  Referencia: [src/games/arcade/valle-tranquilo/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/valle-tranquilo/index.jsx)

- `arcade-neon-rush`
  Motivo: `p95 659.67 ms`, `88` errores a `100`; `p95 11541.77 ms`, `9000` errores a `3000`.
  Patrón: `iframe` con `index.html` embebido por ruta y helper adicional.
  Accion: mismo tratamiento que `dig-hole` y `valle`: quitar `iframe` del camino critico.
  Accion: compactar entrada a un unico modulo JS del runtime y diferir overlays no esenciales.
  Referencia: [src/games/arcade/neon-rush/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/neon-rush/index.jsx)

- `arcade-stick-brawl-showdown`
  Motivo: `p95 466.82 ms`, `146` errores a `100`; `p95 12300.36 ms`, `6000` errores a `3000`.
  Patrón: `iframe` con `srcDoc` desde `fighting_game.html?raw` y helper extra.
  Accion: quitar `srcDoc` y renderizar el runtime directamente en React/canvas.
  Accion: sacar la publicidad inline del primer render del juego y montarla despues del primer frame interactivo.
  Referencia: [src/games/arcade/stick-brawl-showdown/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/stick-brawl-showdown/index.jsx)

- `arcade-kitchen-rush-2d`
  Motivo: `p95 456.88 ms`, `72` errores a `100`; `p95 6640.73 ms`, `6000` errores a `3000`.
  Patrón: chunk `86664` bytes mas CSS y mucho panel UI antes de jugar.
  Accion: separar runtime de cocina del panel lateral; mostrar solo canvas, stats minimos y CTA al inicio.
  Accion: cargar tutorial, guia de pedidos, estaciones detalladas y listas extensas en un segundo paso tras el primer frame.
  Accion: revisar CSS critico para reducir el coste de la hoja de estilos inicial.
  Referencia: [src/games/arcade/kitchen-rush-2d/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/kitchen-rush-2d/index.jsx)

- `platformer-sky-runner`
  Motivo: `p95 454.02 ms`, `44` errores a `100`; `p95 6409.16 ms`, `3000` errores a `3000`.
  Patrón: chunk unico pesado (`178766` bytes) con mucho HUD y configuracion en la entrada.
  Accion: extraer HUD, ayuda, route strip, mechanics band y touch controls a modulos diferidos.
  Accion: dejar la pantalla inicial con canvas + HUD minimo y cargar paneles secundarios tras `requestIdleCallback` o tras `start`.
  Referencia: [src/games/PlatformerGame.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/PlatformerGame.jsx)

- `arcade-territory-war`
  Motivo: `p95 433.07 ms`, `11` errores a `100`; `p95 8911.70 ms`, `3000` errores a `3000`.
  Patrón: archivo monolitico muy grande con motor, UI, CSS inline y mucho texto.
  Accion: dividir en `engine`, `hud`, `canvas`, `copy/css`.
  Accion: sacar CSS masivo y paneles de roster/control fuera del primer render del juego.
  Referencia: [src/games/arcade/territory-war/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/territory-war/index.jsx)

- `arcade-archery-horizon`
  Motivo: `p95 406.23 ms`, `10` errores a `100`; `p95 6065.46 ms`, `3000` errores a `3000`.
  Accion: reducir payload de arranque y revisar assets/copia inicial.

- `arcade-orchard-match-blast`
  Motivo: `p95 316.55 ms`, `21` errores a `100`; `p95 9982.71 ms`, `3000` errores a `3000`.
  Patrón: mucho motor + render + configuracion en un unico chunk.
  Accion: mover opciones de objetivo, overlays y banda informativa a carga diferida.
  Accion: revisar si el canvas puede arrancar sin construir toda la UI de soporte.
  Referencia: [src/games/arcade/orchard-match-blast/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/orchard-match-blast/index.jsx)

- `arcade-bubble-storm`
  Motivo: `p95 265.86 ms`, `18` errores a `100`; `p95 6404.79 ms`, `3000` errores a `3000`.
  Accion: endurecer carga lazy y revisar cualquier dependencia adicional de entrada.

- `sports-basketball-court`
  Motivo: `p95 262.99 ms`, `45` errores a `100`; `p95 3190.36 ms`, `3000` errores a `3000`.
  Accion: reducir fan-out de entrada y revisar si hay assets 3D/canvas que pueden diferirse.

- `arcade-golf-tour-2d`
  Motivo: `p95 261.16 ms`, `9` errores a `100`; `p95 6476.17 ms`, `3000` errores a `3000`.
  Accion: mismo enfoque que `basketball`.

- `arcade-neon-crypt`
  Motivo: errores ya a `100` concurrentes.
  Accion: estabilizar chunk de entrada y revisar dependencias adicionales de runtime.

- `arcade-cosmic-vanguard`
  Motivo: errores ya a `100` concurrentes.
  Accion: revisar peso de entrada y cualquier inicializacion no critica.

- `arcade-billar-pool-club`
  Motivo: errores ya a `100` concurrentes.
  Accion: revisar carga de entrada y simplificar primer render.

## P2

- `arcade-reactor-toss`
  Motivo: sin errores a `100`, pero `p95 445.64 ms`; a `3000` se rompe.
  Chunk actual: `114747` bytes.
  Accion: bajar el chunk por debajo de `60-70 KB`, separando menu, copy y telemetria del runtime.
  Referencia: [src/games/arcade/reactor-toss/index.jsx](C:/Users/hugoe/Downloads/plataforma-juegos-saas/src/games/arcade/reactor-toss/index.jsx)

- `arcade-pinball-wizard`
  Motivo: sin errores a `100`, pero `p95 305.47 ms`; a `3000` se rompe.
  Accion: adelgazar entrada y precargar el chunk cuando el usuario abre la ficha del juego.

- `arcade-ice-strike-pro`
  Motivo: pasa a `100`, pero a `3000` cae fuera de SLA con errores.
  Accion: consolidar recursos de entrada y validar que el juego no hace fetch extra al arrancar.

- `arcade-bowling-pro-tour`
  Motivo: pasa a `100`, pero a `3000` cae fuera de SLA con errores.
  Accion: mismo enfoque que `ice-strike-pro`.

## P3

- Mantener monitorizados.
- No tocar salvo si se detecta regresion de bundle, assets o fan-out de red.

## Oleadas Recomendadas

- Oleada 1
  `arcade-dig-hole-treasure`, `arcade-valle-tranquilo`, `arcade-neon-rush`, `arcade-stick-brawl-showdown`.
  Motivo: todos dependen de `iframe` y ese patron es incompatible con el SLA.

- Oleada 2
  `arcade-kitchen-rush-2d`, `platformer-sky-runner`, `arcade-territory-war`, `arcade-archery-horizon`, `arcade-orchard-match-blast`.
  Motivo: entrada pesada por chunk/UI.

- Oleada 3
  `arcade-bubble-storm`, `sports-basketball-court`, `arcade-golf-tour-2d`, `arcade-neon-crypt`, `arcade-cosmic-vanguard`, `arcade-billar-pool-club`.

- Oleada 4
  `arcade-reactor-toss`, `arcade-pinball-wizard`, `arcade-ice-strike-pro`, `arcade-bowling-pro-tour`.

## Checklist De Aceptacion

- `0` errores de peticion a `100` concurrentes.
- `p95 <= 250 ms` a `100` concurrentes.
- Sin `iframe` en juegos `P1`.
- Maximo `1 JS lazy` y `1 CSS` para entrar al juego.
- Repetir benchmark rapido a `100`.
- Repetir benchmark rapido a `1000` o `3000` para confirmar margen hacia el SLA.
