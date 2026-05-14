# Playforge Studio

Frontend en React + JavaScript + CSS para una plataforma SaaS de juegos.

## Backend penalties game

 npm run backend:penalty-shootout

 ## Backend wiki game

npm run backend:wikipedia-gacha

## Caché wiki
npm run generate:wikipedia-gacha-catalog -- --target 1000000 --sleep-ms 400

#Comandos de regeneración crucigrama:    
1. npm run generate:crossword-repo-bank
2. 2. npm run generate:crossword-match-cache

## Que incluye

- Catalogo de juegos por tematica en formato tarjetas (imagen + titulo).
- Vista de detalle con informacion y panel jugable por cada juego.
- Juegos completos en categorias: aventura, accion, carreras, conocimiento y RPG.
- Aventura, accion, carreras y RPG implementados con mapas 2D con sprites (personajes, coche, bosque, cielo y escenarios).
- Vertical slices arcade:
  - `Sky Runner DX` (plataformas estilo Mario con motor Canvas modular por tiles).
  - `Neon Dojo Clash` (fighting 2D estilo Street Fighter).
  - `Head Soccer Pro` (futbol 1v1 arcade reconstruido con fisica determinista, HUD competitivo e IA por niveles).
- Conocimiento con diseno visual mejorado y banco masivo de preguntas (>10k).
- Seleccion de quiz balanceada para mezclar categorias en cada ronda.
- Direccion artistica por categoria inspirada en referencias arcade/plataformas, con HUD y telemetria mejorados.
- Exposicion de estado de juego para QA (`window.render_game_to_text`) y avance temporal controlado (`window.advanceTime`).
- Diseno responsive para movil, tablet y escritorio.

## Stack

- React 18
- Vite 4
- Phaser 3
- Howler
- CSS puro (sin frameworks)

## Roadmap tecnico

- Ver `docs/2d-engine-roadmap.md` para la arquitectura objetivo y fases de migracion (fundacion, plataformas, fighting y produccion).
- Ver `docs/platformer-arcade-architecture.md` para la arquitectura y extensibilidad del platformer.

## Arranque local

```bash
npm install
npm run dev
```

## Build de produccion

```bash
SITE_URL=https://tu-dominio.com npm run build
npm run preview
```

En PowerShell:

```powershell
$env:SITE_URL="https://tu-dominio.com"; npm run build; npm run preview
```

`SITE_URL` o `VITE_SITE_URL` se usa para generar `public/sitemap.xml`,
anadir la directiva absoluta `Sitemap:` en `public/robots.txt` y fijar las
URLs canonicas de las paginas en produccion.

El SEO publico usa URLs estables por idioma: `/en/` y `/es/`, con juegos en
`/{idioma}/games/{id}` y categorias en `/{idioma}/categories/{categoria}`.
Las rutas sin prefijo siguen funcionando por compatibilidad, pero canonizan a
ingles como idioma principal.

## Estructura

```text
src/
  assets/games/        # Portadas SVG de juegos
  components/          # Tarjetas, grid y vista detalle
  games/               # Minijuegos jugables por categoria
  games/platformer/    # Motor modular del platformer (input, fisicas, render, niveles)
  data/questionBank.js # Banco masivo de preguntas y topicos para conocimiento
  data/games.js        # Datos del catalogo
  App.jsx
  main.jsx
  styles.css
```

