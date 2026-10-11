# Ojeadores y mercado de GameLock

Implementación original inspirada en los flujos documentados de Carrera de FC 26 y FC 27. Las fuentes, las diferencias entre ambos y las reglas que no están publicadas se detallan en [la investigación](football-manager-market-research.md). No se importa código, contenido gráfico ni una base de datos propietaria de EA.

## Flujo de contratación

1. **Seguimiento y consulta.** Se puede buscar y guardar candidatos durante todo el año. La consulta al club y al representante tiene un plazo de respuesta. La disponibilidad considera el nivel deportivo y las necesidades del vendedor; una consulta no garantiza permiso.
2. **Acuerdo con el club.** El mánager ofrece una cantidad, recibe respuesta y puede mejorarla o aceptar la contraoferta. Las relaciones entre clubes influyen en la valoración. Las propuestas demasiado alejadas y las rondas fallidas agotan la paciencia. La ruptura impone un plazo antes de volver a contactar.
3. **Contrato del jugador.** Se negocian por separado salario semanal, prima, duración de uno a cinco años, papel de promesa, rotación, importante o crucial y cláusula de rescisión. Aceptar el precio entre clubes no mueve al futbolista ni acepta su contrato.
4. **Firma e inscripción.** Con ambos acuerdos se elige incorporación inmediata, próxima ventana o próxima temporada. Una firma futura reserva traspaso, prima y margen salarial; el jugador sigue perteneciendo a su club hasta la fecha de incorporación. La operación se vuelve a validar y se cobra una sola vez al ejecutarse.

El centro de mercado muestra dinero disponible después de reservas, margen salarial y llegadas pendientes. Si una incorporación ya no puede ejecutarse, el motor cancela el acuerdo y libera las reservas. La inscripción utiliza los límites propios del juego: 30 jugadores de 21 años o más y 80 en total. No reproduce los cupos federativos, extracomunitarios o de cantera de cada competición.

## Calendario y ventas

El calendario v8 consulta la asociación, temporada y división del receptor, además del origen cuando hay una excepción doméstica. Las fechas documentadas, los cierres con apertura estimada y las ventanas completamente estimadas se distinguen en pantalla, junto con sus fuentes. La cobertura y las reglas están en [ventanas de inscripción](football-manager-transfer-windows.md). Una carrera conserva su calendario al guardar; las llegadas ya comprometidas en partidas antiguas mantienen su fecha. Se puede negociar fuera de ventana y reservar la incorporación posterior, sin abrir un mercado ficticio ni retroceder la fecha.

Durante la temporada, los controles diarios avanzan como máximo hasta el siguiente encuentro. Al terminarla permiten seguir negociando, recibiendo informes y tramitando incorporaciones antes de iniciar la siguiente. Preparar y disputar el partido respeta ese avance previo. Las llegadas se procesan en su fecha, antes de los partidos posteriores; los informes y respuestas avanzan con el mismo calendario.

Para vender se pone un jugador en el mercado con un precio de salida. Los clubes responden después de valorar presupuesto, nivel y necesidades de posición. El mánager puede contraofertar, rechazar o aceptar cuando la inscripción esté abierta. Una oferta puede caducar. El equipo vendedor debe conservar suficientes jugadores y porteros; el comprador debe poder financiar e inscribir la operación.

Las [cesiones y contratos](football-manager-contracts.md) añaden préstamos de seis o doce meses con reparto salarial, tarifa y opción u obligación de compra; cuotas semestrales, futura venta, recompra, rescisión y renovaciones. Sus compromisos económicos se reservan y ejecutan por fecha. La pestaña Contratos y cesiones muestra derechos, retornos y pagos pendientes.

## Red de ojeadores

Se contratan misiones de 14, 30 o 60 días con una red local, profesional o de élite. Experiencia y juicio son parámetros propios de la simulación: afectan al descubrimiento de candidatos y a la precisión de las estimaciones. Hay hasta tres misiones activas.

Los filtros son nacionalidad, posición, edad mínima y máxima, valor máximo y objetivo de promesa o primer equipo. La misión se paga al encargarla. Cancelarla libera el puesto sin devolver el coste; los informes parciales pueden reobservarse en otro encargo.

Los informes progresan por encaje, proyección, evaluación financiera e informe completo. Incluyen estimaciones de nivel y potencial, necesidad de posición, riesgos y valoración económica. Los atributos de juego visibles no se ocultan: los intervalos representan la opinión del ojeador, no información histórica oficial ni una garantía del futuro de una promesa. Los futbolistas generados conservan su identificación.

## Guardado y compatibilidad

Los módulos `transfer-market.js`, `scouting.js`, `transfer-windows.js`, `loans.js`, `contracts.js` y `contract-economy.js` se conectan al reducer y a la restauración del motor. Las vistas principales son `market-panel.jsx`, `loan-desk.jsx`, `contracts-panel.jsx`, `transfer-sales.jsx` y `scouting-panel.jsx`.

Las partidas conservan negociaciones, plazos, relaciones, ofertas, reservas, misiones, informes y seguimiento. La restauración valida referencias, importes y estados. Los flujos antiguos de negociación quedan disponibles para terminar acuerdos guardados; las nuevas fichas emplean siempre la negociación por etapas.

La selección inicial de liga pertenece a otro archivo: [participantes históricos](football-manager-participants.md). Las carreras que ya tienen progreso conservan su universo; las temporadas siguientes derivan de sus resultados y ascensos, no importan los futuros fichajes o clasificaciones reales.

## Alcance

Este sistema no reproduce íntegramente FC 27. Quedan fuera comisiones de agentes, tanteo, pujas concurrentes, delegación automática, liberación automática al vencer un contrato y conflictos por minutos. Los límites federativos, impuestos y compensaciones tampoco se reproducen íntegramente. El rol y los años afectan a la aceptación y se guardan en el contrato. Los precios, salarios, presupuestos, respuestas y probabilidades son estimaciones del juego.

Las comprobaciones automatizadas y capturas v8 se registran en `output/manager-v8/verification.json`. Los scripts de navegador son `scripts/test-manager-market.mjs` y `scripts/test-manager-contracts.mjs`; sus escenarios usan guardados producidos por el reducer y controles públicos.

Resultado de la compilación v7: 185/185 pruebas del mánager y 20/20 grupos en navegador, sin errores de página ni consola. La regresión de verano confirma que una llegada en julio mantiene su fecha contractual y no vuelve a aplicar descanso o recuperación de lesiones ya contabilizados al comenzar la siguiente temporada.
