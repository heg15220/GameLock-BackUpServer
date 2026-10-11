# Mercado y ojeadores: fuentes, alcance y decisiones

Consulta: 10 de octubre de 2026. Investigación para el modo mánager de GameLock. Las páginas siguientes se abrieron y se consultó su cuerpo completo; no se han dado por existentes a partir de resultados de búsqueda. Este documento distingue evidencia publicada, propuestas propias y comprobaciones pendientes.

## Fuentes oficiales comprobadas

| Fuente | Publicación y acceso | Evidencia pertinente |
| --- | --- | --- |
| [EA FC 26: Career Mode Deep Dive](https://www.ea.com/games/ea-sports-fc/fc-26/news/pitch-notes-fc26-career-mode-deep-dive) | 1 agosto 2025; artículo HTML accesible | Las secciones de simulación y ojeo permiten consultar estadísticas desde un informe, compararlas por competición y temporada y seguir futbolistas de ligas simuladas. La sección de renovaciones establece que el futbolista comunica cuándo está dispuesto a negociar y que puede rechazar renovar. Se describe mayor actividad de la IA ante contratos próximos a terminar. No publica ecuaciones de valoración ni fechas universales de mercado. |
| [EA FC 27: análisis del modo Carrera](https://www.ea.com/es/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-career-mode-deep-dive) | 31 julio 2026; artículo HTML accesible | Documenta consultas, permiso y acuerdos por etapas, negociación con club y jugador, delegación y posibles revisiones. Separa ojeo de operaciones. Incluye fecha de incorporación, plazos, primas y derechos de futuras ventas. Los contratos abarcan sueldo, duración, prima, agente y rol. El ojeo ofrece cuatro áreas: encaje táctico, proyección, evaluación financiera y estado. Los atributos se muestran inmediatamente: el artículo elimina su revelación gradual. No publica fórmulas ni una API abierta. |
| [EA Help: Career Mode](https://help.ea.com/en/articles/ea-sports-fc/career-mode/) | Ayuda vigente, sin fecha editorial visible; HTML accesible | Recomienda observar jóvenes, gestionar salarios y primas, consultar agentes libres y enviar ojeadores por regiones. Presenta cesiones y minutos de cantera como herramientas de desarrollo. No especifica costes de misiones, estrellas de ojeadores, duración de informes, negociación numérica ni calendario exacto. |
| [FIFA: Transfer windows](https://inside.fifa.com/transfer-system/player-transfers) | Registro oficial consultado | Cada asociación establece sus periodos de inscripción por temporada y categoría. La tabla no es una regla mundial fija de julio/agosto y enero. El acceso público a esa página no equivale a acceso al sistema TMS de clubes. |

FC 27 está, por tanto, verificado como referencia disponible. La documentación de EA es referencia de producto, no código abierto ni licencia de reutilización de sus datos, textos, imágenes, modelo comercial de valoración o activos. La implementación, los cálculos económicos y las ilustraciones de GameLock deben ser originales. No se presenta el juego como integración con EA, TransferRoom o TMS.

## Calendario: ejemplo oficial y límites históricos

La [Premier League confirmó el verano de 2025](https://www.premierleague.com/en/news/4272739): periodo extraordinario del 1 al 10 de junio y reapertura del 16 de junio al 1 de septiembre, con cierre a las 19:00 BST. Su [guía de cierre](https://www.premierleague.com/en/news/4395463/transfer-deadline-day-everything-you-need-to-know) sitúa el invierno siguiente entre el 1 de enero y el 2 de febrero de 2026, hasta las 19:00 GMT. La propia guía indica que las fechas de otras ligas pueden diferir y permitir salidas posteriores.

Estas fechas son un caso comprobado, no una plantilla para todas las épocas. Un calendario 2013/14, una competición de año natural o una asociación diferente necesita evidencia propia. Una regla simplificada debe mostrarse como tal y guardar su versión. El modelo diario del juego debe explicar que no reproduce horas de cierre ni trámites federativos. Un agente libre no debe utilizarse como excepción universal inventada: las excepciones de inscripción requieren alcance específico o una simplificación explícita.

## Correspondencia propuesta para GameLock

Las decisiones siguientes son diseño propio. Sus constantes, porcentajes, tiempos y probabilidades no proceden de EA ni representan condiciones comerciales históricas verificadas.

| Sistema | Comportamiento propuesto | Invariante comprobable |
| --- | --- | --- |
| Calendario | Consultar el periodo del club comprador y mostrar apertura, cierre, siguiente oportunidad y precisión de la regla. Permitir planificar cuando está cerrado. | Firmar un acuerdo pendiente no cambia anticipadamente el club ni la elegibilidad del futbolista. |
| Negociación | Separar precio entre clubes de salario y compromiso con el jugador; distinguir propuesta, respuesta, contraoferta, rechazo, acuerdo y ejecución. | Aceptar precio no equivale a aceptar contrato; una acción repetida no duplica gasto ni fichaje. |
| Contabilidad | Mostrar desembolso inmediato, reservas y obligaciones futuras implementadas. Validar recursos antes de cerrar y al ejecutar. | Presupuesto y plantilla cambian de forma atómica; nunca quedan parcialmente actualizados. |
| Contrato | Salario, años, prima y rol editables según las capacidades reales del motor. Condiciones imposibles producen una explicación local. | Cancelar no ficha; guardar/restaurar conserva términos, estado y fechas. |
| Ojeo | Encargos con filtro de país/posición/edad, coste, progreso e informe. Señalar qué conclusiones son estimaciones de la simulación. | Un encargo cobra una sola vez, vence con el calendario y no garantiza potencial exacto. |
| Observación | Mostrar rendimiento registrado, encaje, interés estimado y coste previsto cuando estén calculados. | No inventar estadísticas históricas ausentes ni revelar sucesos futuros. |
| Continuidad | Integrar informes, decisiones y obligaciones con el avance diario y la migración de guardados. | Cargar repetidamente no termina encargos, renueva plazos ni altera aleatoriedad. |

No se considera implementada una función por aparecer en esta tabla. Cesiones, agentes, primas variables, plazos, recompra, tanteo, ofertas rivales y renegociación posterior solo se anuncian si existen acciones y persistencia efectivas. Los precios, sueldos, interés y potencial calculados por GameLock deben identificarse como estimaciones del juego, aunque la identidad y la afiliación histórica del futbolista estén documentadas.

## Verificación de la primera versión (v7)

Este apartado conserva el acuerdo y la evidencia de v7. El calendario común descrito a continuación fue sustituido en v8 por [ventanas por asociación y temporada](football-manager-transfer-windows.md). Las [cesiones y cláusulas ejecutables](football-manager-contracts.md) amplían también el alcance original; los resultados vigentes están en `output/manager-v8/verification.json`.

Contrato acordado para esta iteración: ventanas simplificadas del 1 de julio al 31 de agosto y del 1 al 31 de enero. Un archivo inicial de septiembre empieza con el mercado cerrado: permite consultas, negociación y reservas para una incorporación posterior, sin retroceder el calendario ni inventar una apertura inicial. La UI debe identificar el alcance del calendario común. El ejemplo oficial de la Premier League anterior sirve precisamente para demostrar la diferencia. Las rutas de compatibilidad de guardados antiguos pueden conservar sus reglas anteriores; no definen el nuevo flujo.

El motor acordado utiliza `OPEN_NEGOTIATION`, `OFFER_CLUB`, `ACCEPT_CLUB_COUNTER`, `OFFER_CONTRACT`, `ACCEPT_CONTRACT_COUNTER`, `COMPLETE_TRANSFER` y `CANCEL_NEGOTIATION`. Los estados son consulta, club, contrato, acuerdo y ruptura. `COMPLETE_TRANSFER` admite incorporación inmediata, próxima ventana o próxima temporada; `pendingTransfers` conserva el acuerdo y reserva sus recursos. `ADVANCE_CALENDAR` se detiene en el siguiente partido. El ojeo utiliza `START_SCOUTING`, `CANCEL_SCOUTING` y `TOGGLE_SHORTLIST`; las misiones tienen duración elegida de 14, 30 o 60 días y nivel local, profesional o élite. Todos esos plazos, niveles y reglas son parámetros originales del juego.

Las ventas se gestionan con `LIST_FOR_TRANSFER`, `UNLIST_TRANSFER` y `RESPOND_TRANSFER_OFFER`. Publicar un jugador no lo vende inmediatamente. Una oferta identificada permite aceptar, rechazar o contraofertar; la confirmación valida ventana, plantilla y fondos del comprador. Los importes y la identidad de los compradores se generan con las reglas del simulador, sin presentarlos como operaciones históricas reales.

El script `scripts/test-manager-market.mjs` observará la UI y `render_game_to_text`, importando únicamente guardados construidos mediante el motor. Contratos de acciones y selectores se acordarán antes de escribir las interacciones; no se añadirá un atajo de producción para forzar resultados.

Casos necesarios: mercado abierto/cerrado; apertura de invierno después de un cierre; oferta insuficiente y contraoferta; acuerdo de clubes separado del contrato; firma sin duplicación; cancelación; salario inválido y plazo acotado; reservas de presupuesto y salario; publicación de una venta, oferta recibida, contraoferta, ingreso único y rechazo; coste y maduración de ojeo; guardado/restauración durante el proceso; uso de controles en escritorio y móvil; ausencia de errores de consola y desbordamiento horizontal.

## Resultado observado

El 10 de octubre de 2026, `scripts/test-manager-market.mjs` terminó con código 0: siete grupos de comprobaciones aprobados, cero excepciones de navegador y cero errores de consola. Evidencia local: `output/manager-v7/market/verification.json` y sus capturas de escritorio y teléfono de 390 px.

Se comprobó una compra de José Manuel Pinto mediante consulta, contraofertas separadas y contrato; una incorporación aplazada al 1 de enero; y una oferta de Villarreal por Nacho Fernández seguida de contraoferta y venta. Son resultados de las partidas de prueba, no afirmaciones de traspasos históricos. Los encargos de ojeo verificaron filtros, cobro único, informes parciales y completos, seguimiento, cancelación y restauración. El calendario detuvo el avance ante una jornada pendiente, que se jugó antes de entrar en enero. También se revisaron visualmente contratos, fondos reservados, ventas y dossiers de ojeo.

Reproducción: `node scripts/test-manager-market.mjs http://127.0.0.1:5192 output/manager-v7/market`. La prueba requiere el servidor local y el navegador de Playwright instalado. La opción `--fixtures-only` genera el corpus mediante el motor; `--phone-capture-only` vuelve a capturar la pantalla móvil tras terminar su transición, sin sustituir el informe de verificación completo.

La misma auditoría pasó después sobre la compilación final en el puerto 5191, incluidos los controles que limpian el precio de salida al seleccionar otro jugador. Evidencia: `output/manager-v7/production-market/verification.json`. El informe consolidado `output/manager-v7/verification.json` incluye también 185 pruebas unitarias, la comprobación de participantes en la UI, compatibilidad de una partida anterior y la regresión táctica.
