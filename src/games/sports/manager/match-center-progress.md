# Match centre implementation

Original prompt: Crear un centro de partido de fútbol con campo ilustrativo animado, marcador, eventos reales de la simulación, reproducción, avances, tácticas y sustituciones funcionales, coordinado con el motor multiagente.

- `MatchCenter` is a named and default export. Props: `{career, dispatch, t, lang}`.
- Uses the `activeMatch` incremental contract from `live-match.js`; it never reads a precomputed future report.
- Scoped `.fm-live-*` CSS, container breakpoints down to a 390 px viewport, reduced-motion support, keyboard-selectable personnel and tactics.
- Autoplay is opt-in, pauses on half-time/extra-time, new injuries, hidden tab, unmount and tactical/personnel interactions. The dispatch reference does not restart its interval on every render.
- Existing actions remain discoverable: “Siguientes 15 minutos”, “Ver resultado”. Tests can use `manager-match-center`, `live-pitch`, `live-event-feed`, `live-starters`, `live-bench` IDs.
- Root owns index integration, browser and visual verification. Per coordination this subagent does not launch builds or browser sessions. Parent should run the develop-web-game action/screenshot loop after integration and inspect console errors, desktop, 390 px mobile, substitution persistence, the 45-minute pause and speed controls.
- `match-center-model.test.js` covers future-event exclusion, preserving personnel after formation changes, pitch bounds, final substitutions, and national team labels.
- Assistant toggle dispatches `SET_MATCH_AUTOSUBS`; manual mode pauses for injury and leaves the player selectable for replacement. Continuing without a replacement explicitly means playing with fewer active players.
- Formations now allocate eleven fixed slots, filling natural roles first and remaining outfield slots with the same personnel. A mismatch warning explains the performance cost. No duplicate extra column can overlap players after a tactical change.
- Lightweight validation passed: JSX syntax parsed with esbuild transform only (no build/output); five direct Node checks for visibility/layout; all five formation layouts preserve eleven unique participants in distinct, bounded slots. Browser screenshots and interaction QA remain with root.

- Visual QA refinement: playback controls precede the pitch; Pizarra/Cambios shortcuts pause playback and move focus to their panels. Scoreboard typography is scoped above dashboard heading styles; desktop pitch height is capped, with a compact mobile header. Last-event highlights are below the pitch and never cover names. Bench names are 13 px / 12 px on narrow screens.
- Injured players remain selectable for replacement but their pitch slot is empty; the existing injury pause banner explains substitution or resuming in inferior numbers. Invalid goalkeeper/outfield substitutions are disabled with an adjacent explanation.
- JSX/CSS syntax and lightweight control-order/navigation structure checks passed. No build, browser or Vitest run was started during root QA.
