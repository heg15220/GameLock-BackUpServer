/**
 * Balance tables for FULGOR.
 *
 * NO LOGIC LIVES HERE. This file is the set of numbers the design document argues for,
 * written down once so that tuning is an edit to a table and never an edit to a rule.
 * `suspicion.js`, `duel.js`, `intervention.js`, `suit.js`, `bonds.js`, `calendar.js` and
 * `progress.js` all read from here and none of them writes back.
 *
 * NO TEXT LIVES HERE EITHER, beyond proper nouns. Technique names, character
 * descriptions, district blurbs and every other string are in `copy.js` in `es` and `en`
 * (§13.1). What is here is ids and numbers. Proper nouns — Marés, Dani Vela, Sabater —
 * are the one exception, because §13.2 fixes them as identical in both versions.
 *
 * ─── ONE CONTRADICTION IN THE DESIGN, RESOLVED ──────────────────────────────────────
 * §5.3 writes the affinity cycle as "Rayo → Materia → Sombra → Luz → Rayo", which reads
 * as Rayo beating Materia. §9, chapter 3, says the opposite in so many words: El Tasador
 * is an affinity lesson and "Materia vence a Rayo".
 *
 * Chapter 3 wins, because it is a designed lesson with a scene attached and the arrow
 * chain is a notation choice. So the chain is read as "loses to", and the resulting
 * `beats` graph is the one that also happens to be thematically legible in all four
 * directions:
 *
 *     Materia vence a Rayo     — el metal y la tierra se llevan la corriente
 *     Rayo    vence a Luz      — la fuerza bruta atropella a la percepción
 *     Luz     vence a Sombra   — iluminar es exactamente lo contrario de esconderse
 *     Sombra  vence a Materia  — apagar una máquina la deja en nada
 */

/* ── Los siete atributos (§5.1) ──────────────────────────────────────────────────── */

export const STATS = ["potencia", "cuerpo", "control", "guardia", "velocidad", "aguante", "temple"];

/**
 * What each stat governs, and which stat resists it in a duel. `duel.js` reads
 * `opposedBy` rather than hardcoding pairs, so a rebalance that says Control should be
 * resisted by Velocidad is one character here.
 */
export const STAT_ROLES = {
  potencia:  { governs: "impacto",    opposedBy: "guardia" },
  cuerpo:    { governs: "agarre",     opposedBy: "cuerpo" },
  control:   { governs: "precision",  opposedBy: "velocidad" },
  guardia:   { governs: "defensa",    opposedBy: "potencia" },
  velocidad: { governs: "ruta",       opposedBy: "control" },
  aguante:   { governs: "carga",      opposedBy: "aguante" },
  temple:    { governs: "compostura", opposedBy: "temple" },
};

/** Dani at the end of chapter 1: an ordinary fifteen-year-old who has been hit by lightning. */
export const START_STATS = {
  potencia: 12, cuerpo: 10, control: 8, guardia: 9, velocidad: 11, aguante: 12, temple: 10,
};

export const STAT_MIN = 1;
export const STAT_MAX = 99;
/** Free points awarded per level (§5.1). */
export const POINTS_PER_LEVEL = 3;
export const MAX_LEVEL = 40;

/** XP needed to reach level n from n-1. Grows so that the 8-hour curve lands near 30. */
export const XP_CURVE = (level) => Math.round(40 + level * level * 5.5);

/* Carga and Compostura ceilings are stats, not constants: Aguante buys battery and
   Temple buys nerve, which is the whole reason those two stats exist (§5.2). */
export const CARGA_BASE = 40;
export const CARGA_PER_AGUANTE = 2.4;
export const COMPOSTURA_BASE = 55;
export const COMPOSTURA_PER_TEMPLE = 2.2;
/** Carga regenerated per duel turn on Doble vida; the other two modes override it (§10). */
export const CARGA_REGEN_BASE = 8;
/** A turn spent touching a live source refills the battery completely (§5.2). */
export const CARGA_SOURCE_REFILL = 1.0;

/* ── Afinidades (§5.3) ───────────────────────────────────────────────────────────── */

export const AFFINITIES = ["rayo", "luz", "sombra", "materia"];

/** See the header note. `AFFINITY_BEATS[a] === b` means a has the advantage over b. */
export const AFFINITY_BEATS = {
  materia: "rayo",
  rayo: "luz",
  luz: "sombra",
  sombra: "materia",
};

/** §5.3: advantage ×1.35, disadvantage ×0.75 — expressed as the ±0.13 term of §5.4. */
export const AFFINITY_BONUS = 0.13;

/** Chapter in which each affinity becomes available (§5.3). Rayo is the starting one. */
export const AFFINITY_UNLOCK_CHAPTER = { rayo: 1, luz: 6, materia: 9, sombra: 11 };

/* ── Pistas y expedientes (§3) ───────────────────────────────────────────────────── */

export const CLUE_TYPES = ["testimonial", "fisica", "temporal", "digital", "intima"];

/**
 * Per-type properties. `minBond` is §3.2's rule that Íntima is invisible below bond 3;
 * `removable` and `removalCost` are what the Contramedidas block action charges to lift
 * one. Íntima is deliberately the one type no block can buy back: "casi imposible: sólo
 * tiempo y distancia".
 */
export const CLUE_RULES = {
  testimonial: { minBond: 0, removable: true,  removalCost: 1, weight: 1.0 },
  fisica:      { minBond: 0, removable: true,  removalCost: 1, weight: 1.15 },
  temporal:    { minBond: 0, removable: true,  removalCost: 1, weight: 0.9, bondCost: 1 },
  digital:     { minBond: 0, removable: true,  removalCost: 2, weight: 1.2 },
  intima:      { minBond: 3, removable: false, removalCost: Infinity, weight: 1.35 },
};

export const DOSSIER_STATES = ["latente", "activo", "obsesivo", "cerrado"];
/** §3.4. Interest thresholds that move a dossier between states. */
export const DOSSIER_STATE_AT = { activo: 20, obsesivo: 60 };
/** An obsessive character lowers their own threshold by one (§3.4). */
export const OBSESSIVE_THRESHOLD_RELIEF = 1;
/** Interest decays this much per day with no stimulus, down to the character's floor. */
export const INTEREST_DECAY_PER_DAY = 2;
/** A roll that fails by less than this leaves no clue but raises interest (§3.3). */
export const NEAR_MISS_BAND = 0.15;
export const NEAR_MISS_INTEREST = 5;
/** Every witness present at a Sucio result gains this much interest (§4.5). */
export const DIRTY_RESULT_INTEREST = 10;

export const OUTCOMES = ["aliado", "amenaza", "ruina"];

/**
 * §3.5's guard: a ruina outcome cannot fire in the opening act, whatever the numbers say.
 * The difficulty rows move this (Sin máscara opens it at 6, Leyenda urbana at 11).
 */
export const RUIN_UNLOCK_CHAPTER_BASE = 4;

/**
 * Context multipliers for clue generation (§3.3). Time of day and weather multiply;
 * district camera density multiplies on top of them.
 */
export const CLUE_CONTEXT = {
  hora: { manana: 1.15, tarde: 1.0, noche: 0.6 },
  clima: { despejado: 1.0, nublado: 0.85, lluvia: 0.5, niebla: 0.45 },
};

/* ── El reparto con expediente (§8) ──────────────────────────────────────────────── */

/**
 * Thirteen dossiers. `sesgos` is the hard gate of §3.2 — a character can never receive a
 * clue of a type they cannot perceive, and `suspicion.test.js` exists mostly to hold that
 * line.
 *
 * `interesSuelo` is §3.4's floor: Sabater never drops below 30, because looking for you
 * is her job and she does not stop when you have a quiet week.
 */
export const DOSSIERS = {
  nuria:    { nombre: "Nuria Vela",       orbita: "civil",   sesgos: ["intima", "temporal"],            umbral: 3, interesSuelo: 0,  desenlace: "aliado",  abreEnCapitulo: 2, vinculoInicial: 4 },
  isma:     { nombre: "Ismael Doblas",    orbita: "civil",   sesgos: ["digital", "testimonial"],        umbral: 4, interesSuelo: 10, desenlace: "aliado",  abreEnCapitulo: 2, vinculoInicial: 4, cierreGuionizado: 8 },
  pilar:    { nombre: "Doña Pilar",       orbita: "civil",   sesgos: ["temporal", "testimonial"],       umbral: 4, interesSuelo: 5,  desenlace: "amenaza", abreEnCapitulo: 2, vinculoInicial: 1 },
  carmen:   { nombre: "Carmen Ferrer",    orbita: "civil",   sesgos: ["intima", "fisica"],              umbral: 5, interesSuelo: 0,  desenlace: "aliado",  abreEnCapitulo: 3, vinculoInicial: 4 },
  requena:  { nombre: "Emiliano Requena", orbita: "civil",   sesgos: ["fisica", "intima"],              umbral: 5, interesSuelo: 8,  desenlace: "aliado",  abreEnCapitulo: 3, vinculoInicial: 2 },
  oscar:    { nombre: "Óscar Nieto",      orbita: "civil",   sesgos: ["testimonial"],                   umbral: 4, interesSuelo: 0,  desenlace: "amenaza", abreEnCapitulo: 3, vinculoInicial: 0 },
  julia:    { nombre: "Julia Reig",       orbita: "civil",   sesgos: ["digital", "testimonial"],        umbral: 5, interesSuelo: 0,  desenlace: "aliado",  abreEnCapitulo: 4, vinculoInicial: 1 },
  tomas:    { nombre: "Tomás Vela",       orbita: "civil",   sesgos: ["fisica", "temporal"],            umbral: 6, interesSuelo: 0,  desenlace: "aliado",  abreEnCapitulo: 4, vinculoInicial: 3 },
  marga:    { nombre: "Marga Ossorio",    orbita: "heroica", sesgos: ["testimonial", "digital"],        umbral: 6, interesSuelo: 20, desenlace: "amenaza", abreEnCapitulo: 4, vinculoInicial: 0 },
  sabater:  { nombre: "Elena Sabater",    orbita: "heroica", sesgos: ["digital", "temporal", "fisica"], umbral: 8, interesSuelo: 30, desenlace: "ruina",   abreEnCapitulo: 4, vinculoInicial: 0 },
  yusuf:    { nombre: "Yusuf Benali",     orbita: "mixta",   sesgos: ["fisica"],                        umbral: 7, interesSuelo: 0,  desenlace: "aliado",  abreEnCapitulo: 3, vinculoInicial: 2 },
  ezequiel: { nombre: "Ezequiel Reig",    orbita: "heroica", sesgos: ["digital", "fisica"],             umbral: 7, interesSuelo: 15, desenlace: "amenaza", abreEnCapitulo: 7, vinculoInicial: 0 },
  iria:     { nombre: "Iria Lem",         orbita: "heroica", sesgos: ["fisica"],                        umbral: 6, interesSuelo: 0,  desenlace: "aliado",  abreEnCapitulo: 9, vinculoInicial: 0 },
};

/** Sabater's interest climbs with the hero's public standing, not only with his mistakes (§8.2). */
export const SABATER_INTEREST_PER_RANK = 6;

/**
 * §2's paradox, as a number. A witness who loves you looks harder: attention rises with
 * bond as well as with interest, which is what makes every confidant a new way out for
 * the truth.
 */
export const ATTENTION = {
  base: 0.35,
  fromInteres: 0.006, // +0.6 attention at interest 100
  fromVinculo: 0.09,  // +0.45 attention at bond 5
};

export const BOND_MIN = 0;
export const BOND_MAX = 5;
/** Íntima clues need this bond to be perceptible at all (§3.2). */
export const INTIMATE_BOND_GATE = 3;

/* ── Las cinco familias y las cuarenta técnicas (§5.6, §5.7) ─────────────────────── */

export const TECH_FAMILIES = ["impacto", "velocidad", "luz", "escudo", "sentido"];

/**
 * `stat` is which of the seven a family rolls with. Sentido rolls Control because reading
 * a room is precision, not force — and it is the one family that is never opposed, because
 * it buys information rather than winning anything.
 *
 * `ofensiva` means the family deals damage. It deliberately does NOT mean "ends the duel":
 * a duel ends when the opponent's Composure runs out, or when a technique whose `efecto` is
 * `resuelveDuelo` lands. Conflating the two made every Impact technique a finisher, which
 * emptied §5.7's promise that Puño de Tormenta is the one that settles it in a single blow —
 * and made every duel exactly one action long.
 */
export const FAMILY_RULES = {
  impacto:   { stat: "potencia",  ofensiva: true,  opposed: true },
  velocidad: { stat: "velocidad", ofensiva: false, opposed: true },
  luz:       { stat: "control",   ofensiva: true,  opposed: true },
  escudo:    { stat: "guardia",   ofensiva: false, opposed: true },
  sentido:   { stat: "control",   ofensiva: false, opposed: false },
};

/**
 * The catalogue. Twenty-four are §5.7 verbatim; the remaining sixteen are the advanced
 * unlocks that section promises, each tied to the affinity, mentor or defeated villain
 * that hands it over.
 *
 *   carga    cost in battery
 *   vis      visibility 0-3 — the dots the player sees BEFORE choosing (§5.5)
 *   poder    technique power, the `potenciaTécnica` term of §5.4
 *   unlock   how it enters the book: start | afinidad:x | mentor:x | villano:x | historia:cN
 */
export const TECHNIQUES = {
  /* Impacto */
  chispazo:      { familia: "impacto",   afinidad: "rayo",    carga: 8,  vis: 1, poder: 14, unlock: "start" },
  arcoVoltaico:  { familia: "impacto",   afinidad: "rayo",    carga: 22, vis: 3, poder: 34, unlock: "historia:c4", efecto: "dosRivales" },
  punoTormenta:  { familia: "impacto",   afinidad: "rayo",    carga: 30, vis: 3, poder: 46, unlock: "historia:c5", efecto: "resuelveDuelo" },
  yunque:        { familia: "impacto",   afinidad: "materia", carga: 26, vis: 2, poder: 36, unlock: "afinidad:materia", efecto: "derribaEstructura" },
  sobrecarga:    { familia: "impacto",   afinidad: "materia", carga: 18, vis: 2, poder: 24, unlock: "afinidad:materia", efecto: "inutilizaAparato" },
  truenoSeco:    { familia: "impacto",   afinidad: "rayo",    carga: 14, vis: 2, poder: 22, unlock: "villano:hierro" },
  martillo:      { familia: "impacto",   afinidad: "materia", carga: 34, vis: 3, poder: 50, unlock: "villano:tasador", efecto: "ignoraGuardia" },
  chispaFria:    { familia: "impacto",   afinidad: "luz",     carga: 20, vis: 1, poder: 28, unlock: "mentor:vigia" },
  descargaCero:  { familia: "impacto",   afinidad: "sombra",  carga: 38, vis: 1, poder: 52, unlock: "villano:cero", efecto: "resuelveDuelo" },

  /* Velocidad */
  pasoCorto:     { familia: "velocidad", afinidad: "rayo",    carga: 6,  vis: 0, poder: 0,  unlock: "start", efecto: "mueveGratis" },
  relampago:     { familia: "velocidad", afinidad: "rayo",    carga: 20, vis: 3, poder: 0,  unlock: "historia:c5", efecto: "cruzaEscenario" },
  vaho:          { familia: "velocidad", afinidad: "sombra",  carga: 12, vis: 0, poder: 0,  unlock: "afinidad:sombra", efecto: "rompeDuelo" },
  fuga:          { familia: "velocidad", afinidad: "sombra",  carga: 15, vis: 0, poder: 0,  unlock: "afinidad:sombra", efecto: "borraTestimonial" },
  estela:        { familia: "velocidad", afinidad: "luz",     carga: 10, vis: 1, poder: 0,  unlock: "afinidad:luz", efecto: "iniciativa" },
  cortocircuito: { familia: "velocidad", afinidad: "rayo",    carga: 16, vis: 2, poder: 12, unlock: "historia:c9", efecto: "apagaNodo" },
  sombraLarga:   { familia: "velocidad", afinidad: "sombra",  carga: 24, vis: 0, poder: 0,  unlock: "villano:larga", efecto: "cruzaEscenario" },

  /* Luz */
  destello:      { familia: "luz",       afinidad: "luz",     carga: 10, vis: 3, poder: 18, unlock: "afinidad:luz", efecto: "pierdeTurno" },
  espejismo:     { familia: "luz",       afinidad: "luz",     carga: 16, vis: 1, poder: 12, unlock: "afinidad:luz", efecto: "testigoConfundido" },
  prisma:        { familia: "luz",       afinidad: "luz",     carga: 24, vis: 2, poder: 30, unlock: "mentor:vigia", efecto: "tresRivales" },
  fulgor:        { familia: "luz",       afinidad: "luz",     carga: 40, vis: 3, poder: 60, unlock: "historia:c12", efecto: "resuelveNodo", pistaGarantizada: "digital" },
  cortina:       { familia: "luz",       afinidad: "sombra",  carga: 14, vis: 0, poder: 0,  unlock: "afinidad:sombra", efecto: "apagaLuces" },
  aurora:        { familia: "luz",       afinidad: "luz",     carga: 28, vis: 2, poder: 34, unlock: "mentor:vigia", efecto: "dosRivales" },
  reflejo:       { familia: "luz",       afinidad: "materia", carga: 18, vis: 1, poder: 20, unlock: "afinidad:materia", efecto: "devuelveAtaque" },
  alba:          { familia: "luz",       afinidad: "luz",     carga: 32, vis: 1, poder: 26, unlock: "mentor:vigia", efecto: "revelaTodo" },

  /* Escudo */
  pararrayos:    { familia: "escudo",    afinidad: "rayo",    carga: 12, vis: 1, poder: 20, unlock: "start", efecto: "absorbeYCarga" },
  malla:         { familia: "escudo",    afinidad: "materia", carga: 18, vis: 2, poder: 24, unlock: "afinidad:materia", efecto: "protegeCivil" },
  aguanteTec:    { familia: "escudo",    afinidad: "materia", carga: 10, vis: 0, poder: 0,  unlock: "historia:c3", efecto: "recuperaCompostura" },
  jaula:         { familia: "escudo",    afinidad: "rayo",    carga: 20, vis: 2, poder: 28, unlock: "historia:c4", efecto: "contieneMejorado" },
  tierra:        { familia: "escudo",    afinidad: "materia", carga: 22, vis: 1, poder: 30, unlock: "villano:tasador", efecto: "anulaAfinidad" },
  cupula:        { familia: "escudo",    afinidad: "luz",     carga: 26, vis: 1, poder: 32, unlock: "mentor:vigia", efecto: "protegeNodo" },
  ancla:         { familia: "escudo",    afinidad: "rayo",    carga: 16, vis: 1, poder: 22, unlock: "villano:hierro", efecto: "resisteAgarre" },

  /* Sentido — la familia del jugador experto. Visibilidad nula, siempre. */
  escucha:       { familia: "sentido",   afinidad: "sombra",  carga: 6,  vis: 0, poder: 0,  unlock: "mentor:requena", efecto: "revelaAdyacentes" },
  lectura:       { familia: "sentido",   afinidad: "luz",     carga: 8,  vis: 0, poder: 0,  unlock: "mentor:requena", efecto: "revelaAccionRival" },
  barrido:       { familia: "sentido",   afinidad: "luz",     carga: 10, vis: 0, poder: 0,  unlock: "mentor:requena", efecto: "marcaCamarasTestigos" },
  pulso:         { familia: "sentido",   afinidad: "rayo",    carga: 12, vis: 0, poder: 0,  unlock: "start", efecto: "revelaPlano" },
  anticipo:      { familia: "sentido",   afinidad: "sombra",  carga: 16, vis: 0, poder: 0,  unlock: "afinidad:sombra", efecto: "bonoProximaAccion" },
  silencio:      { familia: "sentido",   afinidad: "sombra",  carga: 22, vis: 0, poder: 0,  unlock: "afinidad:sombra", efecto: "sinPistasDosTurnos" },
  rastro:        { familia: "sentido",   afinidad: "materia", carga: 14, vis: 0, poder: 0,  unlock: "afinidad:materia", efecto: "revelaPruebasFisicas" },
  eco:           { familia: "sentido",   afinidad: "sombra",  carga: 18, vis: 0, poder: 0,  unlock: "villano:larga", efecto: "revelaRutasOcultas" },
  presagio:      { familia: "sentido",   afinidad: "luz",     carga: 20, vis: 0, poder: 0,  unlock: "mentor:vigia", efecto: "revelaProximoAgravamiento" },
};

/** Six equipped slots, exactly the hissatsu slots of the reference (§5.5). */
export const TECHNIQUE_SLOTS = 6;

/** Techniques the player owns from the moment the suit exists, so chapter 2 is playable. */
export const STARTING_TECHNIQUES = ["chispazo", "pasoCorto", "pararrayos", "pulso"];

/** §16.1's mitigation: five family templates, eight signature animations. */
export const SIGNATURE_CUTS = [
  "punoTormenta", "fulgor", "relampago", "silencio",
  "martillo", "descargaCero", "alba", "sombraLarga",
];

/** Basic actions, always available, zero Carga (§5.5). */
export const BASIC_ACTIONS = ["golpear", "esquivar", "agarrar", "retirarse"];
export const BASIC_ACTION_RULES = {
  golpear:   { stat: "potencia",  poder: 8, vis: 1, ofensiva: true },
  esquivar:  { stat: "velocidad", poder: 0, vis: 0, ofensiva: false },
  agarrar:   { stat: "cuerpo",    poder: 6, vis: 1, ofensiva: false },
  retirarse: { stat: "velocidad", poder: 0, vis: 0, ofensiva: false },
};
/** Contener: end a duel without winning it. Costs turns, gives no XP, leaves no clue (§5.5). */
export const CONTAIN = { turnos: 2, vis: 0, xp: 0, stat: "cuerpo", poder: 10 };

/* ── Compostura (§5.2) ───────────────────────────────────────────────────────────── */

/**
 * Qualitative, stepped punishment — never a health bar. Read top-down: the first tier
 * whose `min` the value clears is the one in force. The difficulty rows shift every `min`
 * by a single offset, which is how "los escalones empiezan más arriba/abajo" is expressed
 * without a second table.
 */
export const COMPOSURE_TIERS = [
  { id: "normal",  min: 70, exito:  0,    rutaExtra: 0, visExtra: 0, bloquea: [], torpeza: 0 },
  { id: "tocado",  min: 40, exito: -0.15, rutaExtra: 1, visExtra: 0, bloquea: [], torpeza: 0 },
  { id: "roto",    min: 15, exito: -0.15, rutaExtra: 1, visExtra: 1, bloquea: ["luz", "sentido"], torpeza: 0 },
  { id: "agotado", min: 1,  exito: -0.30, rutaExtra: 1, visExtra: 1, bloquea: ["luz", "sentido", "impacto", "escudo", "velocidad"], torpeza: 0.25 },
  { id: "caido",   min: 0,  exito: -1,    rutaExtra: 0, visExtra: 0, bloquea: TECH_FAMILIES, torpeza: 0 },
];

/** §5.4's Temple bonus, and the composure level that earns it. */
export const TEMPLE_BONUS = 0.08;
export const TEMPLE_BONUS_AT = 80;

/* ── Resolución de duelo (§5.4) ──────────────────────────────────────────────────── */

export const DUEL = {
  base: 0.50,
  porStat: 0.012,
  porPoder: 0.020,
  sueloExito: 0.05,
  techoExito: 0.95,
};

/** Node advantages the scenario can grant (§5.4's `bonoPosición`). */
export const POSITION_BONUS = {
  altura: 0.10,
  agua: 0.08,
  sombra: 0.06,
  cobertura: 0.05,
  ninguna: 0,
  descubierto: -0.08,
};

/* ── El traje (§6) ───────────────────────────────────────────────────────────────── */

export const SUIT_SLOTS = ["mascara", "torso", "guantes", "botas", "cinturon", "manto"];

/**
 * Each slot's characteristic trade: what it buys and what it charges (§6.1). `da` and
 * `quita` name stat keys; `ocultacion` is the §3.3 term, summing to at most 0.85 across
 * the six pieces.
 */
export const SUIT_SLOT_RULES = {
  mascara:  { da: "ocultacion", quita: "control" },
  torso:    { da: "cargaMax",   quita: "ocultacion" },
  guantes:  { da: "potencia",   quita: null, riesgoIntimo: 0.15 },
  botas:    { da: "velocidad",  quita: "ocultacion" },
  cinturon: { da: "utilidad",   quita: "velocidad" },
  manto:    { da: "guardia",    quita: null, fuentePistaFisica: 1.6 },
};

/** The ceiling of §3.3: no combination of pieces can hide more than 85% of an action. */
export const OCCULTATION_CAP = 0.85;

/**
 * Five generations, tied to the story (§6.3). The fifth is deliberately incomplete here:
 * `porConfidente` is what each confidant the player earned adds to every stat, which is
 * the mechanical payment of the bond paradox and the reason the last suit cannot be
 * written as a fixed row.
 */
export const SUIT_GENERATIONS = {
  improvisado: { capitulo: 2,  ocultacion: 0.10, potencia: 1,  guardia: 1,  velocidad: 0, cargaMax: 0,  control: -2, integridadMax: 60 },
  taller:      { capitulo: 4,  ocultacion: 0.28, potencia: 3,  guardia: 3,  velocidad: 2, cargaMax: 8,  control: -1, integridadMax: 80 },
  aislado:     { capitulo: 6,  ocultacion: 0.45, potencia: 5,  guardia: 5,  velocidad: 3, cargaMax: 18, control: 0,  integridadMax: 90 },
  conductor:   { capitulo: 9,  ocultacion: 0.30, potencia: 11, guardia: 8,  velocidad: 6, cargaMax: 34, control: 2,  integridadMax: 100 },
  fulgor:      { capitulo: 11, ocultacion: 0.55, potencia: 12, guardia: 10, velocidad: 8, cargaMax: 40, control: 3,  integridadMax: 100, porConfidente: 2 },
};

export const SUIT_GENERATION_ORDER = ["improvisado", "taller", "aislado", "conductor", "fulgor"];

/** §6.2. Integrity bands and what each one costs you. */
export const INTEGRITY_BANDS = [
  { id: "intacta",      min: 60, reconocible: false, fragmentoP: 0,    statFactor: 1.0 },
  { id: "reconocible",  min: 30, reconocible: true,  fragmentoP: 0,    statFactor: 0.85 },
  { id: "comprometida", min: 1,  reconocible: true,  fragmentoP: 0.40, statFactor: 0.6 },
  { id: "destruida",    min: 0,  reconocible: true,  fragmentoP: 0,    statFactor: 0 },
];

/** Integrity lost per duel, before Guardia reduces it. */
export const WEAR_PER_DUEL = 4;
export const WEAR_PER_HIT_TAKEN = 3;

export const MATERIALS = ["cobre", "fibra", "ceramica", "neodimio", "optica", "nucleo"];

/** What one generation of the whole suit costs to build. */
export const SUIT_COST = {
  improvisado: { cobre: 1,  fibra: 1 },
  taller:      { cobre: 3,  fibra: 3, ceramica: 1 },
  aislado:     { cobre: 5,  fibra: 4, ceramica: 3, neodimio: 1 },
  conductor:   { cobre: 8,  fibra: 6, ceramica: 4, neodimio: 3, optica: 2 },
  fulgor:      { cobre: 12, fibra: 9, ceramica: 6, neodimio: 5, optica: 4, nucleo: 1 },
};
/** Repairing costs a fraction of the build cost, rounded up, plus one block (§6.2). */
export const REPAIR_COST_FACTOR = 0.35;

/* ── Marés (§7.3) ────────────────────────────────────────────────────────────────── */

/**
 * Nine districts. `camara` is §3.3's context multiplier — the Centro at 1.4 and the
 * Puerto at 0.7 are the two numbers the design names outright, and the rest are set
 * relative to them. `entrena` is which stat that district's training point raises (§5.1).
 */
export const DISTRICTS = {
  aguas:      { camara: 0.9, abreEnCapitulo: 1,  entrena: null,        afinidadFavor: null },
  instituto:  { camara: 1.0, abreEnCapitulo: 1,  entrena: "velocidad", afinidadFavor: null },
  concha:     { camara: 1.4, abreEnCapitulo: 1,  entrena: "control",   afinidadFavor: "luz" },
  puerto:     { camara: 0.7, abreEnCapitulo: 3,  entrena: "cuerpo",    afinidadFavor: "sombra" },
  financiero: { camara: 1.5, abreEnCapitulo: 7,  entrena: null,        afinidadFavor: "materia" },
  faro:       { camara: 0.5, abreEnCapitulo: 6,  entrena: "temple",    afinidadFavor: "luz" },
  poligono:   { camara: 0.8, abreEnCapitulo: 1,  entrena: "aguante",   afinidadFavor: "rayo" },
  hospital:   { camara: 1.1, abreEnCapitulo: 2,  entrena: null,        afinidadFavor: null },
  tolvas:     { camara: 0.4, abreEnCapitulo: 10, entrena: null,        afinidadFavor: "sombra" },
};

/** Training points, keyed by district (§5.1). */
export const TRAINING_GAIN = 1;
/** After this many visits to the same point, a point of stat costs two blocks. */
export const TRAINING_DIMINISH_AT = 6;

/* ── El calendario (§7.1, §7.2) ──────────────────────────────────────────────────── */

export const BLOCKS = ["manana", "tarde", "noche"];

export const BLOCK_ACTIONS = [
  "obligacion", "quedar", "entrenar", "taller", "trabajar",
  "investigar", "contramedidas", "patrullar", "descansar",
];

/**
 * `soloEn` is the blocks in which an action is legal — patrolling is a night thing and
 * the morning is spoken for unless you skip it, which is itself a decision with a price.
 */
export const BLOCK_ACTION_RULES = {
  obligacion:    { soloEn: ["manana", "tarde"], vinculo: 1, evitaTemporal: true },
  quedar:        { soloEn: ["tarde", "noche"], vinculo: 2 },
  entrenar:      { soloEn: ["manana", "tarde", "noche"] },
  taller:        { soloEn: ["tarde", "noche"] },
  trabajar:      { soloEn: ["tarde"], dinero: 25 },
  investigar:    { soloEn: ["tarde", "noche"] },
  contramedidas: { soloEn: ["tarde", "noche"] },
  patrullar:     { soloEn: ["noche"], escaramuzas: [1, 3] },
  descansar:     { soloEn: ["manana", "tarde", "noche"], compostura: 30, interes: -3 },
};

/** Skipping the morning obligation (§7.1). */
export const SKIPPED_MORNING = { vinculo: -1, pistaTemporalSiHeroe: true };

/** Consecutive nights on patrol cost the next day's starting Composure (§7.1). */
export const PATROL_FATIGUE = [0, 0, 15, 30, 40];

/** Days per chapter (§7.1: between 6 and 12, with the short opening and finale). */
export const CHAPTER_DAYS = [3, 4, 6, 6, 7, 7, 8, 8, 9, 9, 10, 6];

/* ── La Intervención (§4) ────────────────────────────────────────────────────────── */

export const INTERVENTION_RESULTS = ["impecable", "limpio", "sucio", "parcial", "fallido"];

/** §4.5's table, as data. `pistasMax` is the ceiling of clues that still earns that grade. */
export const RESULT_RULES = {
  impecable: { objetivo: true,  pistasMax: 0,        rango: 2,  materiales: 2.0,  prensa: "favorable" },
  limpio:    { objetivo: true,  pistasMax: 1,        rango: 1,  materiales: 1.0,  prensa: "neutra" },
  sucio:     { objetivo: true,  pistasMax: Infinity, rango: 1,  materiales: 1.0,  prensa: "negativa", interesTestigos: DIRTY_RESULT_INTEREST },
  parcial:   { objetivo: false, pistasMax: Infinity, rango: 0,  materiales: 0.5,  prensa: "neutra" },
  fallido:   { objetivo: false, pistasMax: Infinity, rango: -1, materiales: 0.25, prensa: "negativa" },
};

/** Scenario size by kind (§4.3, §4.4). */
export const SCENARIO_SIZE = {
  escaramuza: { nodos: [3, 4],   turnos: [3, 5],   objetivos: [1, 1] },
  estandar:   { nodos: [6, 9],   turnos: [7, 10],  objetivos: [1, 2] },
  decisiva:   { nodos: [10, 14], turnos: [12, 16], objetivos: [1, 3] },
};

/** Route cost in turns, before Velocidad discounts it (§4.2). */
export const ROUTE_COST = {
  visible: { turnos: 1, visibilidad: 2 },
  sombra:  { turnos: 2, visibilidad: 0 },
};
/** Velocidad this high makes a shadow route cost what a visible one does. */
export const ROUTE_SPEED_DISCOUNT_AT = 30;

/** Hero rank: what the city thinks it knows. Feeds Sabater and the press (§4.5, §8.2). */
export const RANK_MIN = 0;
export const RANK_MAX = 20;

/* ── Dificultad (§10) ────────────────────────────────────────────────────────────── */

/**
 * The three modes, and the rule that defines them: the cerco moves, the enemy never does.
 * There is no `enemyStats` column here and there must never be one — §10.1 is explicit
 * that El Tasador has the same numbers in all three, and a mode that changed his numbers
 * would be hardening the part of the game that matters least.
 *
 * §10.5: no pure module ever reads the mode's name. `resolveDifficulty` hands them the
 * numbers, so a fourth mode — or a player tuning single axes — costs nothing.
 */
export const DIFFICULTY = {
  facil: {
    pistaFactor: 0.6,
    umbralDelta: 2,
    decaimientoFactor: 2,
    sueloDelta: 0,
    contramedidasPorBloque: 2,
    contramedidaFalloP: 0,
    relojDelta: 2,
    cargaRegen: 12,
    composturaOffset: -15,
    techoExito: 0.95,
    caerEnEscaramuza: false,
    falloSeVuelveParcial: true,
    ruinaDesdeCapitulo: 11,
    testigoMovilObsesivo: false,
    avisos: "completos",
  },
  medio: {
    pistaFactor: 1.0,
    umbralDelta: 0,
    decaimientoFactor: 1,
    sueloDelta: 0,
    contramedidasPorBloque: 1,
    contramedidaFalloP: 0,
    relojDelta: 0,
    cargaRegen: CARGA_REGEN_BASE,
    composturaOffset: 0,
    techoExito: DUEL.techoExito,
    caerEnEscaramuza: true,
    falloSeVuelveParcial: false,
    ruinaDesdeCapitulo: RUIN_UNLOCK_CHAPTER_BASE,
    testigoMovilObsesivo: false,
    avisos: "estado",
  },
  dificil: {
    pistaFactor: 1.4,
    umbralDelta: -1,
    decaimientoFactor: 0.5,
    sueloDelta: 10,
    contramedidasPorBloque: 1,
    contramedidaFalloP: 0.25,
    relojDelta: -1,
    cargaRegen: 5,
    composturaOffset: 10,
    techoExito: 0.90,
    caerEnEscaramuza: true,
    falloSeVuelveParcial: false,
    ruinaDesdeCapitulo: 6,
    testigoMovilObsesivo: true,
    avisos: "ninguno",
  },
};

export const DIFFICULTY_MODES = Object.keys(DIFFICULTY);
export const DEFAULT_DIFFICULTY = "medio";

/**
 * The only door between the mode's name and the rest of the game. Everything downstream
 * receives this object and never the string.
 */
export function resolveDifficulty(mode = DEFAULT_DIFFICULTY) {
  return { ...(DIFFICULTY[mode] ?? DIFFICULTY[DEFAULT_DIFFICULTY]) };
}

/* ── Los siete finales (§9.1) ────────────────────────────────────────────────────── */

/**
 * Not ordered, not labelled good or bad (§17). `story.js` reads `requiere`; keeping it
 * here is what lets `story.test.js` prove every ending is reachable without importing the
 * whole campaign.
 */
export const ENDINGS = {
  secretoIntacto:   { requiere: { cerradosNoElegidos: 0 } },
  laVigia:          { requiere: { confidentes: 0, vinculoMaximo: 1 } },
  aCaraDescubierta: { requiere: { desenmascaradoVoluntario: true } },
  desenmascarado:   { requiere: { sabaterCerrado: true } },
  elRelevo:         { requiere: { relevoAceptado: true } },
  losDos:           { requiere: { confidentes: 4 } },
  ciudadAOscuras:   { requiere: { capitulo12: "fallido" } },
};

export const TOTAL_CHAPTERS = 12;
