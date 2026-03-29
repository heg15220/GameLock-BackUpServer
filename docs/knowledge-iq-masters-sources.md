# Knowledge IQ Masters: benchmark + blueprint de implementacion

Fecha de investigacion: 2026-03-29

## Objetivo

Recolectar evidencia externa (producto, ciencia, accesibilidad, politicas de tienda) para implementar en `plataforma-juegos-saas` un juego tipo "brain training" con nivel profesional, buena direccion visual y animacion cuidada.

## Resumen ejecutivo

- El patron de mercado ganador en apps tipo IQ combina: sesiones cortas diarias, evaluacion base, plan personalizado y progreso visible.
- La evidencia cientifica no soporta promesas amplias de "mejora global de inteligencia"; si soporta mejora en tareas entrenadas y uso como estimulo cognitivo.
- Si se incluyen tests tipo ADHD/ansiedad/personalidad, deben tratarse como contenido informativo, no diagnostico.
- Para sensacion de alta calidad: animaciones utiles (no decorativas excesivas), 60 FPS, pipeline de motion por `transform/opacity`, y modo de movimiento reducido.
- A nivel App Store/Google Play, hay riesgo alto con claims de salud enganiosos; hay que explicitar alcance no clinico y disclaimers.

## Hallazgos por fuente

### 1) Benchmark directo de IQ Masters

#### Google Play (IQ Masters - Brain Games)

- Publisher: Deep Flow Apps.
- Metricas visibles: 10M+ descargas, 125K reviews, rating 3.9 (captura en investigacion), update 2026-02-20.
- Propuesta: ejercicios mentales + tests + juegos de logica.
- Contenido declarado: ADHD test, ansiedad, EQ, arquetipos, etc.
- Data safety declarada: no data shared con terceros, pero recoge location/personal info y uso.

#### App Store (IQ Masters: Brain Games, Tests)

- Categoria: Education.
- Rating visible: 4.6 con 63K ratings.
- Modelo comercial propietario de referencia (no aplicable a nuestro producto).

#### Terms/Privacy propios de IQ Masters

- Incluye medical disclaimer explicito: el servicio no se debe usar para diagnostico o tratamiento.
- Indica que el output puede ser inexacto y no sustituye consejo profesional.
- Terms y privacy incluyen terminos comerciales del producto original (no aplicables a nuestro producto).
- Privacy policy detalla recopilacion de rendimiento, respuestas, edad/genero opcional para personalizacion e identificadores de dispositivo.

### 2) Benchmark competitivo (apps lideres)

#### Lumosity

- 40+ juegos adaptativos.
- "Daily workout" + "Fit Test" inicial para baseline y comparativa por edad.
- Patron util: baseline corto + entrenamiento recurrente + feedback longitudinal.

#### Elevate

- Plan personalizado que se ajusta en el tiempo.
- 40+ juegos, foco en habilidades concretas (memoria, matematicas, comprension, etc.).
- Patron util: personalizacion visible y sensacion de plan individual.

#### Peak

- 45+ juegos, "Daily Workouts", y modo "Coffee Break" (<5 min).
- Patron util: sesiones ultra-cortas para adherencia.

#### Impulse

- Fuerte capa de engagement: streaks y reportes de progreso.
- Patron util: bucle diario + progreso narrado + recordatorios.

### 3) Evidencia cientifica y limites de claim

#### Revision APS (2016)

- Resume que el entrenamiento suele mejorar la tarea entrenada.
- La transferencia a habilidades lejanas o rendimiento cotidiano tiene evidencia limitada.
- Recomendacion implicita para producto: no sobre-prometer "aumento de IQ real" o "beneficios clinicos".

#### Cochrane (2019, midlife)

- Baja calidad de evidencia para efectos duraderos de entrenamiento cognitivo computarizado en poblacion sana de mediana edad.
- Recomendacion: estudios mas robustos y de mayor duracion.

#### MedlinePlus IQ testing

- Los tests IQ miden funciones especificas y pueden no capturar talento/potencial total.
- Existen sesgos culturales y deben interpretarse con cautela.

#### WAIS-5 (Pearson)

- Instrumento clinico psicometrico administrado individualmente.
- Implicacion: una app ludica no debe presentarse como sustituto de test clinico profesional.

### 4) Riesgo regulatorio/comercial

#### FTC vs Lumosity

- Caso por claims no respaldados.
- Settlement de $2M y exigencia de evidencia cientifica fiable para futuras afirmaciones.
- Implicacion: toda promesa de beneficio real debe respaldarse o rebajarse a claim de entretenimiento/practica.

#### Apple App Review Guidelines

- Exige transparencia funcional y bloquea patrones de producto enganosos.
- Implicacion: comunicar de forma clara que el juego es de entrenamiento ludico no clinico.

#### Google Play Health Content and Services

- Prohibe funcionalidades de salud enganosas o potencialmente daninas.
- Requiere declaracion de health app y privacidad adecuada; para funciones medicas puede requerir evidencia regulatoria o disclaimer.

### 5) UX, accesibilidad y animacion

#### W3C Cognitive Accessibility

- Priorizar: tiempo suficiente, predictibilidad, ayudas para evitar errores y navegacion clara.

#### Apple Reduced Motion

- Escalados/spins/peripheral motion pueden causar mareo.
- Deben poder desactivarse o tener alternativa.
- Para motion necesario, usar alternativas suaves (fade/dissolve/color shift).

#### Web motion en frontend

- `prefers-reduced-motion` permite adaptar animaciones a usuarios sensibles.
- Para performance, priorizar `transform` y `opacity`.
- Objetivo tecnico: 60 FPS (presupuesto de frame ~16.7ms).

#### Referencia de timing (Material motion)

- Mobile base ~300ms.
- Entrada ~225ms.
- Salida ~195ms.
- Desktop recomendado 150-200ms.

## Blueprint para implementar en esta plataforma (categoria knowledge)

## Nombre de trabajo

`knowledge-iq-masters-protocol`

## Politica de monetizacion del proyecto

- Este proyecto se implementa con monetizacion cero.
- No se incluyen suscripciones, compras integradas, paywalls, trials ni anuncios.
- Toda la progresion y funcionalidades jugables estan disponibles sin pago.

## Propuesta jugable (MVP robusto)

1. Calibracion inicial (3-5 min)
- 3 micropruebas: memoria secuencial, patron visual, razonamiento rapido.
- Salida: perfil inicial en 5 dominios (`memory`, `logic`, `attention`, `speed`, `spatial`).

2. Sesion diaria (5-8 min)
- 4 minijuegos seleccionados segun dominio debil + 1 reto comodin.
- Dificultad dinamica por ELO interno de dominio.

3. Informe post-sesion
- Score por dominio.
- Delta vs media de 7 dias.
- Recomendacion de foco para manana.

4. Meta-loop semanal
- Misiones semanales.
- Streak diario.
- Hitos cosmeticos (marcos, temas, trails UI).

## Reglas de producto para evitar problemas de claims

- No usar copy tipo: "diagnostica ADHD", "sube tu IQ real", "previene demencia".
- Si hay test de bienestar/personality: etiquetar como "autoevaluacion informativa no clinica".
- Mostrar disclaimer en onboarding + pantalla de resultado + ajustes.

## Diseno y animacion (estilo de alta calidad)

1. Direccion visual
- HUD limpio, componentes en capas (glass/gradient soft), tipografia consistente.
- Jerarquia clara: pregunta > accion principal > feedback > progreso.

2. Motion system
- Feedback de accion: 120-180ms.
- Transicion de panel/pantalla: 220-320ms.
- Celebracion de acierto: 300-450ms, max 1.2s total.
- Solo `transform` + `opacity` para transiciones frecuentes.

3. Modo "Reduced Motion"
- Detectar `prefers-reduced-motion`.
- Sustituir zoom/spin por fade/highlight.
- Permitir override en ajustes.

4. Audio-reactividad
- 3 capas: UI click, success accents, ambience discreta.
- Ducking de musica en feedback importante.

## Arquitectura tecnica sugerida (alineada al repo)

- Componente: `src/games/knowledge/IQMastersKnowledgeGame.jsx`
- Submodulos:
  - `src/games/knowledge/iqmasters/engine.js` (loop/dificultad/seed)
  - `src/games/knowledge/iqmasters/contentBank.js` (items por dominio)
  - `src/games/knowledge/iqmasters/progression.js` (xp, streak, niveles)
  - `src/games/knowledge/iqmasters/analytics.js` (eventos)

### Estado minimo

- `sessionId`, `dayIndex`, `selectedChallenges[]`
- `domainRatings` (5 dominios)
- `streakDays`, `weeklyMissions`, `last7Sessions`
- `uiSettings.reduceMotion`, `uiSettings.highContrast`

### Eventos analiticos clave

- `iqm_session_start`
- `iqm_challenge_start`
- `iqm_challenge_complete`
- `iqm_session_complete`
- `iqm_hint_used`

## KPI objetivo para quality bar profesional

- D1 retention >= 35% (objetivo interno inicial, puzzle/cognitive casual competitivo).
- Completion de sesion diaria >= 70%.
- Session length 5-9 min.
- Crash-free sessions >= 99.5%.
- `avg_frame_time` en gameplay principal < 16.7ms en dispositivos objetivo.

## Plan de implementacion (3 fases)

1. Fase 1 (MVP jugable)
- Calibracion + 3 minijuegos base + reporte diario + persistencia local.

2. Fase 2 (Polish pro)
- Motion system completo, audio reactivo, tema visual de alta calidad, reduced motion completo.

3. Fase 3 (Escalado)
- Personalizacion avanzada, misiones semanales, mas bancos de contenido, AB tests de dificultad y onboarding.

## Checklist de cumplimiento antes de publicar

- Disclaimers no-clinicos en onboarding/resultados/ajustes.
- Validar ausencia total de elementos de monetizacion (sin compras, sin paywall, sin ads).
- Politica de privacidad enlazada y consistente con datos reales enviados.
- Controles de accesibilidad: reduced motion, contraste, tamano de texto, tiempo suficiente.
- Validacion legal de claims de marketing.

## Fuentes

- IQ Masters Google Play: https://play.google.com/store/apps/details?hl=en_US&id=com.codeway.brainapp
- IQ Masters App Store: https://apps.apple.com/us/app/iq-masters-brain-games-tests/id6475717895
- IQ Masters Privacy: https://static.iqmasters.app/privacy-en.html
- IQ Masters Terms: https://static.iqmasters.app/terms-conditions-en.html
- Lumosity App Store: https://apps.apple.com/us/app/lumosity-brain-training-games/id577232024
- Elevate App Store: https://apps.apple.com/us/app/elevate-brain-training-games/id875063456
- Peak App Store: https://apps.apple.com/us/app/peak-brain-training/id806223188
- Impulse App Store: https://apps.apple.com/us/app/impulse-brain-training/id1451295827
- APS review summary: https://www.psychologicalscience.org/publications/brain-training.html
- Cochrane (midlife CCT): https://www.cochrane.org/evidence/CD012278_computerised-cognitive-training-maintaining-cognitive-function-cognitively-healthy-people-midlife
- MedlinePlus IQ testing: https://medlineplus.gov/ency/article/001912.htm
- WAIS-5 overview: https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-%26-Neuro/Wechsler-Adult-Intelligence-Scale-%7C-Fifth-Edition/p/P100071002?productId=A103000433999
- FTC Lumosity case: https://www.ftc.gov/news-events/news/press-releases/2016/01/lumosity-pay-2-million-settle-ftc-deceptive-advertising-charges-its-brain-training-program
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Health Content and Services: https://support.google.com/googleplay/android-developer/answer/16679511?hl=en
- W3C Cognitive Accessibility: https://www.w3.org/WAI/cognitive/
- Apple Reduced Motion criteria: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria/
- MDN prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion
- web.dev animation performance overview: https://web.dev/articles/animations-overview
- Material duration/easing reference: https://m1.material.io/motion/duration-easing.html
