/**
 * FULGOR — el reparto hablante, en un solo objeto.
 *
 * Cinco archivos, veintiún personas, y ni una frase compartida entre dos de ellas. El corte
 * es por sitio y no por importancia, porque el sitio es lo que fija el registro: en casa se
 * habla de cenas y de turnos, en el instituto de exámenes y de pasillos, en el muelle de
 * material y de horas, en la ciudad de expedientes y de portadas, y al otro lado del cofre
 * de lo que cuesta seguir de pie.
 *
 * Añadir a alguien es añadirlo a su barrio y nada más: `dialogueBank.js` no conoce nombres.
 */

import { FAMILIA } from "./familia.js";
import { INSTITUTO } from "./instituto.js";
import { BARRIO } from "./barrio.js";
import { CIUDAD } from "./ciudad.js";
import { ELEGIDOS } from "./elegidos.js";

export const VOCES = { ...FAMILIA, ...INSTITUTO, ...BARRIO, ...CIUDAD, ...ELEGIDOS };

export { FAMILIA, INSTITUTO, BARRIO, CIUDAD, ELEGIDOS };
