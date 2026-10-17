/**
 * Tactics: team instructions, player roles and presets.
 *
 * The vocabulary follows EA SPORTS FC's FC IQ (roles with a focus that change
 * how each player moves with and without the ball; build-up styles and
 * defensive approaches) and the team instructions of Football Manager
 * (passing directness, width, the final third, what happens in the five
 * seconds after winning or losing the ball, the line of engagement, set
 * pieces). Everything here is data: shape.js turns it into positions and
 * match.js into decisions.
 *
 * Role parameters (all multipliers or 0-1 tendencies):
 * - ip: in-possession shift per phase [build-up, progression, final third],
 *   each [depth %, inward %]; inward moves a wide player towards the centre
 *   (negative: towards the touchline).
 * - run (runs in behind), box (arrives in the box), drop (comes short),
 *   roam (drifts towards the ball), track (works back without the ball),
 *   press (closes down), step (a defender stepping out of the line), create,
 *   shoot, cross, dribble, hold (hold-up play), aerial, stamina (energy use).
 */

export const MENTALITIES = ['very-defensive', 'defensive', 'balanced', 'attacking', 'very-attacking'];

/** Every team instruction with its options, in the order the UI shows them. */
export const INSTRUCTIONS = {
  buildUp: ['short', 'balanced', 'counter', 'direct'],
  tempo: ['slow', 'normal', 'fast'],
  width: ['narrow', 'normal', 'wide'],
  focus: ['left', 'balanced', 'center', 'right'],
  finalThird: ['work-box', 'balanced', 'early-cross', 'shoot'],
  crosses: ['low', 'mixed', 'high'],
  dribbling: ['reduced', 'balanced', 'encouraged'],
  onWin: ['counter', 'standard', 'patient'],
  onLoss: ['counter-press', 'standard', 'regroup'],
  block: ['low', 'mid', 'high'],
  pressing: ['low', 'medium', 'high'],
  line: ['deep', 'normal', 'high'],
  offsideTrap: [false, true],
  tackling: ['ease', 'standard', 'aggressive'],
  goalKicks: ['short', 'mixed', 'long'],
  corners: ['near', 'mixed', 'far', 'short'],
  cornerDefence: ['zonal', 'mixed', 'man'],
  setPieceOverload: [false, true],
  timeWasting: [false, true],
};

export const TACTIC_DEFAULTS = {
  mentality: 'balanced', buildUp: 'balanced', tempo: 'normal', width: 'normal', focus: 'balanced', finalThird: 'balanced',
  crosses: 'mixed', dribbling: 'balanced', onWin: 'standard', onLoss: 'standard', block: 'mid', pressing: 'medium', line: 'normal',
  offsideTrap: false, tackling: 'standard', goalKicks: 'mixed', corners: 'mixed', cornerDefence: 'mixed', setPieceOverload: false,
  timeWasting: false, roles: Object.freeze({}),
};

/** Fill gaps and read tactics saved before the instructions existed. */
export function normalizeTactics(tactics = {}) {
  const t = { ...TACTIC_DEFAULTS, ...tactics, roles: { ...(tactics.roles || {}) } };
  // Old saves knew only "pressing": it set the height of the block as well.
  if (!tactics.block && tactics.pressing) t.block = tactics.pressing === 'high' ? 'high' : tactics.pressing === 'low' ? 'low' : 'mid';
  for (const [key, options] of Object.entries(INSTRUCTIONS)) if (!options.includes(t[key])) t[key] = TACTIC_DEFAULTS[key];
  if (!MENTALITIES.includes(t.mentality)) t.mentality = 'balanced';
  return t;
}

/* ── Roles ── */

const BASE = {
  ip: [[0, 0], [0, 0], [0, 0]], run: 0.3, box: 0.2, drop: 0.3, roam: 0.15, track: 0.7, press: 0.5, step: 0,
  create: 1, shoot: 1, cross: 1, dribble: 1, hold: 0, aerial: 1, stamina: 1, sweep: 0, claim: 1, short: 0.5,
};

/** Generic effect of each focus; a role can refine it. */
const FOCUS = {
  defend: { run: -0.15, box: -0.12, track: 0.2, press: -0.05, dp: -5, stamina: -0.05 },
  balanced: {},
  attack: { run: 0.18, box: 0.15, track: -0.2, dp: 5, shootX: 1.1, stamina: 0.05 },
  support: { track: 0.12, drop: 0.1, dp: -2 },
  'build-up': { drop: 0.25, run: -0.1, createX: 1.15, dp: -3 },
  roaming: { roam: 0.35, stamina: 0.06 },
  'ball-winning': { press: 0.3, step: 0.2, stamina: 0.06 },
  aggressive: { press: 0.35, step: 0.35, stamina: 0.05 },
  versatile: { roam: 0.2, run: 0.08, drop: 0.08 },
  wide: { inward: -12 },
};

const ip = (b, p, f) => [b, p, f];

/** The role catalogue: positions it can play, focuses, parameters. */
export const ROLES = {
  goalkeeper: { slots: ['GK'], focuses: ['defend', 'balanced'], sweep: 0.12, short: 0.45, f: { defend: { sweep: 0.05 } } },
  'sweeper-keeper': { slots: ['GK'], focuses: ['balanced', 'build-up'], sweep: 0.55, short: 0.6, f: { 'build-up': { sweep: 0.7, short: 0.75 } } },
  'ball-playing-keeper': { slots: ['GK'], focuses: ['build-up'], sweep: 0.2, short: 0.8 },

  fullback: { slots: ['RB', 'LB'], focuses: ['defend', 'balanced'], ip: ip([-2, 0], [2, 0], [6, 0]), run: 0.25, box: 0.05, track: 0.82, cross: 1, press: 0.45,
    f: { defend: { ip: ip([-6, 9], [-5, 7], [-2, 5]), track: 0.95, run: 0.08 } } },
  wingback: { slots: ['RB', 'LB', 'RWB', 'LWB'], focuses: ['support', 'balanced'], ip: ip([3, -4], [9, -6], [17, -7]), run: 0.45, box: 0.1, track: 0.66, cross: 1.2, stamina: 1.1 },
  'attacking-wingback': { slots: ['RB', 'LB', 'RWB', 'LWB'], focuses: ['balanced', 'attack'], ip: ip([7, -8], [15, -10], [25, -10]), run: 0.6, box: 0.16, track: 0.45, cross: 1.35, dribble: 1.1, stamina: 1.15 },
  falseback: { slots: ['RB', 'LB'], focuses: ['defend', 'balanced'], ip: ip([5, 24], [9, 27], [12, 25]), run: 0.05, box: 0.05, cross: 0.5, track: 0.92, create: 1.1, drop: 0.5,
    f: { defend: { ip: ip([3, 25], [5, 29], [7, 27]) }, balanced: { ip: ip([7, 26], [13, 29], [18, 27]) } } },
  'inverted-wingback': { slots: ['RB', 'LB', 'RWB', 'LWB'], focuses: ['build-up', 'attack'], ip: ip([6, 20], [14, 24], [22, 22]), run: 0.3, box: 0.15, create: 1.15, track: 0.6, cross: 0.8,
    f: { attack: { ip: ip([8, 20], [18, 26], [31, 24]), box: 0.32, shoot: 1.2 } } },

  defender: { slots: ['CB'], focuses: ['defend', 'balanced'], run: 0, box: 0, drop: 0.2, track: 1, press: 0.35, step: 0.1, aerial: 1.12, create: 0.6, shoot: 0.6, dribble: 0.6,
    f: { balanced: { step: 0.22, dp: 2 } } },
  stopper: { slots: ['CB'], focuses: ['defend', 'balanced', 'aggressive'], run: 0, box: 0, track: 1, press: 0.6, step: 0.45, aerial: 1.15, create: 0.6, shoot: 0.6, dribble: 0.6,
    f: { defend: { step: 0.25 }, aggressive: { step: 0.72, press: 0.85 } } },
  'ball-playing-defender': { slots: ['CB'], focuses: ['defend', 'build-up', 'aggressive'], ip: ip([4, -5], [2, 0], [0, 0]), run: 0, box: 0, track: 1, press: 0.4, step: 0.2, aerial: 1.05, create: 0.95, dribble: 0.8,
    f: { 'build-up': { ip: ip([9, -2], [11, 0], [7, 0]), create: 1.1 }, aggressive: { step: 0.5, press: 0.72 } } },
  'wide-back': { slots: ['CB'], focuses: ['defend', 'support', 'aggressive'], ip: ip([2, -10], [6, -10], [8, -8]), run: 0.12, box: 0.02, track: 0.95, cross: 0.6, aerial: 1.08, create: 0.75,
    f: { support: { ip: ip([4, -13], [10, -15], [15, -13]), run: 0.25 }, aggressive: { step: 0.5, press: 0.72 } } },

  holding: { slots: ['CDM', 'CM'], focuses: ['defend', 'roaming', 'ball-winning'], ip: ip([-3, 0], [-3, 0], [-1, 0]), run: 0.05, box: 0.05, drop: 0.45, track: 0.95, press: 0.55, create: 0.8, shoot: 0.5,
    f: { 'ball-winning': { press: 0.82, step: 0.4 } } },
  'centre-half': { slots: ['CDM'], focuses: ['defend'], ip: ip([-15, 0], [-9, 0], [-5, 0]), run: 0, box: 0.02, drop: 0.6, track: 1, press: 0.45, create: 0.85, shoot: 0.45, aerial: 1.08 },
  'deep-lying-playmaker': { slots: ['CDM', 'CM'], focuses: ['defend', 'roaming', 'build-up'], ip: ip([-4, 0], [0, 0], [2, 0]), run: 0.08, box: 0.08, drop: 0.55, track: 0.8, create: 1.3, shoot: 0.75,
    f: { 'build-up': { ip: ip([-6, 0], [3, 0], [7, 0]), createX: 1.08 } } },
  'wide-half': { slots: ['CDM'], focuses: ['defend', 'build-up'], ip: ip([0, -14], [2, -16], [4, -14]), run: 0.1, box: 0.05, track: 0.88, cross: 0.85, create: 1 },
  'box-crasher': { slots: ['CDM', 'CM'], focuses: ['balanced'], ip: ip([2, 0], [10, 0], [21, 0]), run: 0.42, box: 0.62, drop: 0.2, track: 0.5, shoot: 1.4, stamina: 1.1 },

  'box-to-box': { slots: ['CM'], focuses: ['balanced', 'ball-winning'], ip: ip([2, 0], [6, 0], [12, 0]), run: 0.35, box: 0.45, track: 0.78, shoot: 1.1, stamina: 1.12,
    f: { 'ball-winning': { press: 0.75, step: 0.3 } } },
  playmaker: { slots: ['CM', 'CAM'], focuses: ['balanced', 'attack', 'roaming', 'build-up'], ip: ip([4, 4], [10, 4], [14, 6]), run: 0.25, box: 0.25, drop: 0.38, roam: 0.4, track: 0.5, create: 1.45, shoot: 1.1,
    f: { roaming: { roam: 0.72 }, 'build-up': { drop: 0.72, ip: ip([-4, 0], [0, 0], [2, 0]) } } },
  'half-winger': { slots: ['CM', 'CAM'], focuses: ['balanced', 'attack', 'support', 'roaming'], ip: ip([2, -12], [6, -18], [10, -22]), run: 0.35, box: 0.25, track: 0.62, cross: 1.15, create: 1.15 },

  winger: { slots: ['RM', 'LM', 'RW', 'LW'], focuses: ['balanced', 'attack', 'versatile'], ip: ip([0, -6], [4, -8], [8, -9]), run: 0.5, box: 0.25, track: 0.55, cross: 1.35, dribble: 1.25, stamina: 1.05,
    f: { attack: { run: 0.7 } } },
  'wide-midfielder': { slots: ['RM', 'LM'], focuses: ['defend', 'support', 'build-up'], ip: ip([-2, 0], [0, 0], [2, 0]), run: 0.25, box: 0.15, track: 0.86, cross: 1.1, dribble: 0.95,
    f: { defend: { track: 0.97 } } },
  'wide-playmaker': { slots: ['RM', 'LM', 'RW', 'LW'], focuses: ['build-up', 'attack'], ip: ip([0, 8], [2, 14], [4, 16]), run: 0.22, box: 0.25, drop: 0.45, track: 0.5, create: 1.35, cross: 1 },
  'inside-forward': { slots: ['RM', 'LM', 'RW', 'LW'], focuses: ['balanced', 'attack', 'roaming'], ip: ip([2, 8], [6, 14], [10, 18]), run: 0.55, box: 0.45, track: 0.45, shoot: 1.4, dribble: 1.25, cross: 0.7,
    f: { attack: { run: 0.72, box: 0.6 } } },

  'shadow-striker': { slots: ['CAM'], focuses: ['attack'], ip: ip([4, 0], [8, 0], [14, 0]), run: 0.6, box: 0.7, drop: 0.2, track: 0.45, shoot: 1.45, stamina: 1.08 },
  'classic-10': { slots: ['CAM'], focuses: ['attack', 'wide', 'versatile'], ip: ip([0, 0], [4, 0], [6, 0]), run: 0.2, box: 0.3, drop: 0.35, roam: 0.25, track: 0.25, press: 0.3, create: 1.6, shoot: 1.2, stamina: 0.92,
    f: { wide: { roam: 0.45 } } },

  'advanced-forward': { slots: ['ST'], focuses: ['attack', 'versatile', 'support'], run: 0.65, box: 0.85, drop: 0.15, track: 0.3, press: 0.5, shoot: 1.3, hold: 0.3,
    f: { versatile: { roam: 0.35, drop: 0.3 }, support: { press: 0.75, drop: 0.35, track: 0.5, stamina: 0.12 } } },
  poacher: { slots: ['ST'], focuses: ['attack', 'versatile'], run: 0.72, box: 1, drop: 0.05, track: 0.15, press: 0.3, shoot: 1.5, create: 0.75, hold: 0.15,
    f: { versatile: { press: 0.55, roam: 0.3 } } },
  'false-9': { slots: ['ST'], focuses: ['build-up', 'attack'], ip: ip([-12, 0], [-12, 0], [-6, 0]), run: 0.25, box: 0.45, drop: 0.8, track: 0.5, press: 0.55, create: 1.35, shoot: 1.05,
    f: { attack: { ip: ip([-6, 0], [-6, 0], [0, 0]), box: 0.6 } } },
  'target-forward': { slots: ['ST'], focuses: ['balanced', 'attack', 'wide'], run: 0.2, box: 1, drop: 0.3, track: 0.35, press: 0.4, shoot: 1.15, dribble: 0.7, hold: 0.9, aerial: 1.4,
    f: { attack: { drop: 0.1 }, wide: { ip: ip([0, -6], [0, -10], [0, -14]) } } },
};

export const ROLE_LABEL = {
  es: {
    goalkeeper: 'Portero', 'sweeper-keeper': 'Portero líbero', 'ball-playing-keeper': 'Portero con pie',
    fullback: 'Lateral', wingback: 'Carrilero', 'attacking-wingback': 'Carrilero ofensivo', falseback: 'Falso lateral', 'inverted-wingback': 'Lateral invertido',
    defender: 'Central', stopper: 'Central agresivo', 'ball-playing-defender': 'Central con salida', 'wide-back': 'Central abierto',
    holding: 'Pivote defensivo', 'centre-half': 'Mediocentro incrustado', 'deep-lying-playmaker': 'Organizador', 'wide-half': 'Medio cobertura', 'box-crasher': 'Llegador',
    'box-to-box': 'Box to box', playmaker: 'Creador', 'half-winger': 'Interior abierto',
    winger: 'Extremo', 'wide-midfielder': 'Volante', 'wide-playmaker': 'Creador de banda', 'inside-forward': 'Extremo a pierna cambiada',
    'shadow-striker': 'Segundo delantero', 'classic-10': 'Enganche',
    'advanced-forward': 'Delantero', poacher: 'Cazagoles', 'false-9': 'Falso 9', 'target-forward': 'Ariete',
  },
  en: {
    goalkeeper: 'Goalkeeper', 'sweeper-keeper': 'Sweeper keeper', 'ball-playing-keeper': 'Ball-playing keeper',
    fullback: 'Fullback', wingback: 'Wingback', 'attacking-wingback': 'Attacking wingback', falseback: 'Falseback', 'inverted-wingback': 'Inverted wingback',
    defender: 'Defender', stopper: 'Stopper', 'ball-playing-defender': 'Ball-playing defender', 'wide-back': 'Wide back',
    holding: 'Holding', 'centre-half': 'Centre-half', 'deep-lying-playmaker': 'Deep-lying playmaker', 'wide-half': 'Wide half', 'box-crasher': 'Box crasher',
    'box-to-box': 'Box-to-box', playmaker: 'Playmaker', 'half-winger': 'Half-winger',
    winger: 'Winger', 'wide-midfielder': 'Wide midfielder', 'wide-playmaker': 'Wide playmaker', 'inside-forward': 'Inside forward',
    'shadow-striker': 'Shadow striker', 'classic-10': 'Classic 10',
    'advanced-forward': 'Advanced forward', poacher: 'Poacher', 'false-9': 'False 9', 'target-forward': 'Target forward',
  },
};

export const FOCUS_LABEL = {
  es: { defend: 'Defensa', balanced: 'Equilibrio', attack: 'Ataque', support: 'Apoyo', 'build-up': 'Construcción', roaming: 'Libertad', 'ball-winning': 'Recuperación', aggressive: 'Agresivo', versatile: 'Versátil', wide: 'Abierto' },
  en: { defend: 'Defend', balanced: 'Balanced', attack: 'Attack', support: 'Support', 'build-up': 'Build-up', roaming: 'Roaming', 'ball-winning': 'Ball-winning', aggressive: 'Aggressive', versatile: 'Versatile', wide: 'Wide' },
};

/** What each role does, in a sentence (FC IQ descriptions, condensed). */
export const ROLE_HINT = {
  es: {
    goalkeeper: 'Se queda bajo palos y vive de las paradas. Rara vez sale del área.',
    'sweeper-keeper': 'Sale a cortar balones a la espalda de la defensa y se ofrece para el pase.',
    'ball-playing-keeper': 'Opción segura en la salida de balón sin alejarse de la portería.',
    fullback: 'Defiende primero; sube con cautela y da una línea de pase por fuera.',
    wingback: 'Sube la banda para dar amplitud y vuelve a su sitio cuando se pierde el balón.',
    'attacking-wingback': 'Vive en campo rival: dobla al extremo y centra. Le cuesta volver.',
    falseback: 'Con balón se mete por dentro como un mediocentro más.',
    'inverted-wingback': 'Con balón pisa el carril interior y llega a zonas de mediapunta.',
    defender: 'Defiende su zona, mantiene la línea y juega sencillo.',
    stopper: 'Sale de la línea a anticipar y presionar al receptor. Deja huecos a su espalda.',
    'ball-playing-defender': 'Conduce y filtra pases desde atrás; con «Construcción» sube a la medular.',
    'wide-back': 'Central de una línea de tres que abre el campo y cubre la banda.',
    holding: 'Protege a la defensa, tapa líneas de pase y frena contragolpes.',
    'centre-half': 'Se incrusta entre los centrales en la salida y abre a los laterales.',
    'deep-lying-playmaker': 'Organiza desde atrás y marca el ritmo con sus pases.',
    'wide-half': 'Cubre la banda cuando sube el lateral.',
    'box-crasher': 'Llega desde atrás al área en el momento justo. Tarda en volver.',
    'box-to-box': 'Recorre el campo de área a área: llega y ayuda atrás.',
    playmaker: 'El cerebro del equipo: busca espacios entre líneas y el último pase.',
    'half-winger': 'Interior que se abre a la banda para dar amplitud.',
    winger: 'Pegado a la cal, encara, desborda y centra.',
    'wide-midfielder': 'Da amplitud y ayuda mucho en defensa.',
    'wide-playmaker': 'Parte de banda y se mete por dentro para asociarse.',
    'inside-forward': 'Parte de fuera y diagonaliza hacia dentro para tirar o filtrar.',
    'shadow-striker': 'Juega a la espalda del delantero y pisa el área desde segunda línea.',
    'classic-10': 'El enganche de siempre: todo pasa por él. Apenas defiende.',
    'advanced-forward': 'Vive en la última línea y ataca la espalda de los centrales.',
    poacher: 'Merodea el área para cazar cualquier balón. No baja a defender.',
    'false-9': 'Baja a recibir entre líneas, arrastra a los centrales y abre huecos.',
    'target-forward': 'Referencia física: gana duelos, aguanta el balón y remata centros.',
  },
  en: {
    goalkeeper: 'Stays on the line and lives off shot-stopping. Rarely leaves the box.',
    'sweeper-keeper': 'Rushes out behind the defence and offers a passing option.',
    'ball-playing-keeper': 'A safe option in build-up without straying from goal.',
    fullback: 'Defends first; joins in carefully and offers a wide option.',
    wingback: 'Pushes up the flank for width and gets back when the ball is lost.',
    'attacking-wingback': 'Lives in the opposition half: overlaps and crosses. Slow to recover.',
    falseback: 'Steps inside into midfield when his team has the ball.',
    'inverted-wingback': 'Moves into the half-space and arrives in attacking midfield zones.',
    defender: 'Defends his zone, holds the line and keeps it simple.',
    stopper: 'Steps out to intercept and press the receiver. Leaves gaps behind.',
    'ball-playing-defender': 'Carries and breaks lines from the back; on Build-up he steps into midfield.',
    'wide-back': 'Outer centre back of a back three who widens and covers the flank.',
    holding: 'Screens the defence, blocks passing lanes and stops counters.',
    'centre-half': 'Drops between the centre backs in build-up so the full backs can push on.',
    'deep-lying-playmaker': 'Dictates play from deep and sets the tempo.',
    'wide-half': 'Covers the flank when the full back goes forward.',
    'box-crasher': 'Arrives late in the box from deep. Slow to recover.',
    'box-to-box': 'Covers every blade of grass: arrives in the box and helps behind.',
    playmaker: 'The creative hub: finds space between the lines and the final ball.',
    'half-winger': 'A central midfielder who drifts wide to give width.',
    winger: 'Hugs the touchline, takes men on and crosses.',
    'wide-midfielder': 'Gives width and works hard defensively.',
    'wide-playmaker': 'Starts wide and comes inside to combine.',
    'inside-forward': 'Starts wide and cuts inside to shoot or slip a pass.',
    'shadow-striker': 'Plays off the striker and arrives in the box from deep.',
    'classic-10': 'The old-school number 10: everything goes through him. Barely defends.',
    'advanced-forward': 'Lives on the last line and attacks the space behind the centre backs.',
    poacher: 'Lurks in the box to pounce on anything. Does not track back.',
    'false-9': 'Drops between the lines, drags centre backs out and opens gaps.',
    'target-forward': 'A physical reference: wins duels, holds the ball up, attacks crosses.',
  },
};

export function rolesFor(slot) {
  return Object.entries(ROLES).filter(([, r]) => r.slots.includes(slot)).map(([id]) => id);
}

const cache = new Map();
/** Behaviour parameters of "role:focus" (falls back to the slot's default). */
export function roleParams(roleKey, slot = 'CM') {
  const key = `${roleKey}|${slot}`;
  if (cache.has(key)) return cache.get(key);
  let [id, focus] = String(roleKey || '').split(':');
  if (!ROLES[id] || !ROLES[id].slots.includes(slot)) [id, focus] = defaultRole(slot).split(':');
  const role = ROLES[id];
  if (!role.focuses.includes(focus)) focus = role.focuses[0];
  const generic = FOCUS[focus] || {};
  const own = role.f?.[focus] || {};
  const params = { ...BASE, ...role, id, focus };
  delete params.f; delete params.slots; delete params.focuses;
  for (const k of ['run', 'box', 'track', 'press', 'drop', 'roam', 'step', 'stamina']) if (generic[k]) params[k] += generic[k];
  if (generic.shootX) params.shoot *= generic.shootX;
  if (generic.createX) params.create *= generic.createX;
  const dp = generic.dp || 0;
  const inward = generic.inward || 0;
  params.ip = (own.ip || role.ip || BASE.ip).map(([d, i]) => [d + (own.ip ? 0 : dp), i + inward]);
  for (const [k, v] of Object.entries(own)) if (k !== 'ip') params[k] = v;
  for (const k of ['run', 'box', 'track', 'press', 'drop', 'roam', 'step']) params[k] = Math.max(0, Math.min(1.1, params[k]));
  cache.set(key, params);
  return params;
}

export function defaultRole(slot) {
  return {
    GK: 'goalkeeper:defend', RB: 'fullback:balanced', LB: 'fullback:balanced', RWB: 'wingback:balanced', LWB: 'wingback:balanced',
    CB: 'defender:defend', CDM: 'holding:defend', CM: 'box-to-box:balanced', CAM: 'playmaker:balanced',
    RM: 'winger:balanced', LM: 'winger:balanced', RW: 'inside-forward:balanced', LW: 'inside-forward:balanced', ST: 'advanced-forward:attack',
  }[slot] || 'box-to-box:balanced';
}

const a = (p, k, f = p?.ovr ?? 65) => p?.attrs?.[k] ?? f;

/**
 * Roles a coach would give this eleven: by the shape of the formation and by
 * what each player is good at (a slow, strong striker is a target man, a
 * passer at centre back steps into midfield, two pivots split the work).
 */
export function autoRoles(players, slots, style = 'balanced') {
  const roles = {};
  const count = (pos) => slots.filter((s) => s === pos).length;
  const backThree = count('CB') === 3;
  const cbIndexes = slots.map((s, i) => (s === 'CB' ? i : -1)).filter((i) => i >= 0);
  const outerCb = new Set(backThree ? [cbIndexes[0], cbIndexes[cbIndexes.length - 1]] : []);
  let cdmSeen = 0; let cmSeen = 0; let stSeen = 0; let camSeen = 0;
  slots.forEach((slot, i) => {
    const p = players[i];
    let role = defaultRole(slot);
    if (slot === 'GK') role = a(p, 'spd', 60) >= 72 && style !== 'counter' ? 'sweeper-keeper:balanced' : a(p, 'kic', 60) >= 76 && style === 'possession' ? 'ball-playing-keeper:build-up' : 'goalkeeper:defend';
    else if (slot === 'RB' || slot === 'LB') {
      if (style === 'possession' && a(p, 'pas') >= 76) role = 'inverted-wingback:build-up';
      else if (a(p, 'pac') >= 82 && a(p, 'def') < 74) role = 'wingback:balanced';
      else if (style === 'counter') role = 'fullback:defend';
    } else if (slot === 'RWB' || slot === 'LWB') role = a(p, 'pac') >= 80 ? 'attacking-wingback:balanced' : 'wingback:balanced';
    else if (slot === 'CB') {
      if (outerCb.has(i)) role = 'wide-back:defend';
      else if (a(p, 'pas') >= 72 && style !== 'direct') role = 'ball-playing-defender:defend';
      else if (style === 'pressing' && a(p, 'pac') >= 70) role = 'stopper:balanced';
    } else if (slot === 'CDM') {
      cdmSeen += 1;
      if (count('CDM') >= 2) role = cdmSeen === 1 ? (a(p, 'pas') >= a(p, 'def') ? 'deep-lying-playmaker:defend' : 'holding:defend') : (a(p, 'sho') >= 70 ? 'box-crasher:balanced' : 'holding:ball-winning');
      else if (a(p, 'pas') >= 80 && style === 'possession') role = 'deep-lying-playmaker:build-up';
      else if (style === 'possession' && backThree === false && a(p, 'def') >= 76) role = 'centre-half:defend';
    } else if (slot === 'CM') {
      cmSeen += 1;
      const creative = a(p, 'pas') >= 80 && a(p, 'dri') >= 76;
      if (creative && cmSeen === 1) role = 'playmaker:attack';
      else if (a(p, 'def') >= a(p, 'pas') + 4) role = style === 'pressing' ? 'box-to-box:ball-winning' : 'holding:defend';
      else if (count('CDM') === 0 && cmSeen === 2 && count('CM') === 2) role = 'deep-lying-playmaker:build-up';
    } else if (slot === 'CAM') {
      camSeen += 1;
      if (count('CAM') >= 2) role = a(p, 'sho') >= a(p, 'pas') ? 'shadow-striker:attack' : 'playmaker:roaming';
      else if (a(p, 'sho') >= 80 && a(p, 'pas') < 78) role = 'shadow-striker:attack';
      else if (a(p, 'pas') >= 84 && a(p, 'def') < 50) role = 'classic-10:attack';
    } else if (slot === 'RM' || slot === 'LM') {
      if (a(p, 'sho') >= 78) role = 'inside-forward:balanced';
      else if (a(p, 'def') >= 62 || style === 'counter') role = 'wide-midfielder:support';
    } else if (slot === 'RW' || slot === 'LW') {
      if (a(p, 'pas') >= a(p, 'sho') + 6) role = 'wide-playmaker:attack';
      else if (a(p, 'sho') < 72 && a(p, 'pac') >= 82) role = 'winger:attack';
      else if (a(p, 'sho') >= 82) role = 'inside-forward:attack';
    } else if (slot === 'ST') {
      stSeen += 1;
      if (a(p, 'phy') >= 80 && a(p, 'pac') < 74) role = 'target-forward:balanced';
      else if (a(p, 'pas') >= 80 && a(p, 'dri') >= 82 && count('ST') === 1) role = 'false-9:build-up';
      else if (a(p, 'sho') >= 82 && a(p, 'phy') < 72) role = 'poacher:attack';
      else if (count('ST') === 2 && stSeen === 2) role = 'advanced-forward:support';
      else if (style === 'pressing') role = 'advanced-forward:support';
    }
    roles[i] = role;
  });
  return roles;
}

/* ── Presets (FC "smart tactics" names) ── */

export const PRESETS = {
  balanced: {},
  'tiki-taka': { buildUp: 'short', tempo: 'slow', finalThird: 'work-box', crosses: 'low', onWin: 'patient', onLoss: 'counter-press', block: 'high', pressing: 'high', line: 'high', goalKicks: 'short', width: 'normal' },
  gegenpress: { mentality: 'attacking', buildUp: 'balanced', tempo: 'fast', onWin: 'counter', onLoss: 'counter-press', block: 'high', pressing: 'high', line: 'high', offsideTrap: true, tackling: 'aggressive' },
  'counter-attack': { mentality: 'defensive', buildUp: 'counter', tempo: 'fast', onWin: 'counter', onLoss: 'regroup', block: 'low', pressing: 'medium', line: 'deep', goalKicks: 'long', finalThird: 'balanced' },
  'long-ball': { buildUp: 'direct', tempo: 'fast', crosses: 'high', finalThird: 'early-cross', goalKicks: 'long', block: 'mid', onWin: 'standard' },
  'wing-play': { width: 'wide', finalThird: 'early-cross', crosses: 'mixed', dribbling: 'encouraged', buildUp: 'balanced' },
  'park-the-bus': { mentality: 'very-defensive', block: 'low', line: 'deep', pressing: 'low', onLoss: 'regroup', onWin: 'standard', tempo: 'slow', width: 'narrow', timeWasting: true, cornerDefence: 'zonal' },
};

export function applyPreset(tactics, preset) {
  const base = normalizeTactics({ ...TACTIC_DEFAULTS, formation: tactics.formation, roles: tactics.roles, mentality: tactics.mentality });
  return normalizeTactics({ ...base, ...(PRESETS[preset] || {}), formation: tactics.formation, roles: tactics.roles });
}

/** The tactics a CPU club plays with, from its identity. */
export function styleTactics(style = 'balanced') {
  const preset = { possession: 'tiki-taka', direct: 'long-ball', counter: 'counter-attack', pressing: 'gegenpress', balanced: 'balanced' }[style] || 'balanced';
  const t = normalizeTactics({ ...TACTIC_DEFAULTS, ...PRESETS[preset] });
  if (style === 'pressing') t.mentality = 'balanced';
  return t;
}

/* ── Tactical summary ── */

const LEVEL = {
  mentality: { 'very-defensive': -2, defensive: -1, balanced: 0, attacking: 1, 'very-attacking': 2 },
  block: { low: -1, mid: 0, high: 1 }, line: { deep: -1, normal: 0, high: 1 }, pressing: { low: -1, medium: 0, high: 1 },
  width: { narrow: -1, normal: 0, wide: 1 }, tempo: { slow: -1, normal: 0, fast: 1 },
  buildUp: { short: -1, balanced: 0, counter: 1, direct: 1.5 },
};

/**
 * Six ratings (0-100) and the strengths and weaknesses that follow from the
 * tactic, like the FC tactical summary.
 */
export function tacticalSummary(tactics, slots = []) {
  const t = normalizeTactics(tactics);
  const params = slots.map((slot, i) => roleParams(t.roles[i], slot));
  const outfield = params.filter((_, i) => slots[i] !== 'GK');
  const avg = (key) => (outfield.length ? outfield.reduce((s, p) => s + p[key], 0) / outfield.length : 0.5);
  const forward = outfield.reduce((s, p) => s + p.run * 0.6 + p.box * 0.6 + (1 - p.track) * 0.5, 0);
  const rest = outfield.filter((p) => p.track >= 0.8 && p.box < 0.2).length;
  const m = LEVEL.mentality[t.mentality];
  const clamp = (v) => Math.round(Math.max(5, Math.min(98, v)));
  const ratings = {
    attack: clamp(46 + m * 9 + forward * 3.2 + (t.finalThird === 'work-box' ? 2 : 0) + LEVEL.tempo[t.tempo] * 3),
    defence: clamp(56 - m * 8 + rest * 3.5 + avg('track') * 12 - LEVEL.line[t.line] * 4 - (t.offsideTrap ? 3 : 0) - (forward - 6) * 1.6),
    width: clamp(50 + LEVEL.width[t.width] * 16 + (avg('cross') - 1) * 40 - slots.filter((s, i) => ['RW', 'LW', 'RM', 'LM', 'RB', 'LB', 'RWB', 'LWB'].includes(s) && params[i].ip[2][1] > 10).length * 6),
    endurance: clamp(78 - LEVEL.pressing[t.pressing] * 14 - LEVEL.block[t.block] * 6 - (t.onLoss === 'counter-press' ? 10 : 0) - LEVEL.tempo[t.tempo] * 5 - (avg('stamina') - 1) * 120),
    length: clamp(50 + LEVEL.block[t.block] * 12 + LEVEL.line[t.line] * 10 + m * 4),
    buildUp: clamp(50 - LEVEL.buildUp[t.buildUp] * 18 + (avg('create') - 1) * 60 + (t.goalKicks === 'short' ? 6 : t.goalKicks === 'long' ? -6 : 0)),
  };
  const notes = [];
  const add = (tone, key) => notes.push({ tone, key });
  if (t.block === 'high' && t.pressing === 'high') add('good', 'high-recoveries');
  if (t.onLoss === 'counter-press') add('good', 'counter-press');
  if (t.onWin === 'counter' || t.buildUp === 'counter') add('good', 'counter');
  if (t.buildUp === 'short') add('good', 'possession');
  if (t.width === 'wide' || t.finalThird === 'early-cross') add('good', 'crossing');
  if (t.block === 'low' && t.line === 'deep') add('good', 'compact');
  if (rest <= 2 && m >= 0) add('bad', 'exposed-counter');
  if (t.line === 'high' && t.block !== 'low') add('bad', 'space-behind');
  if (ratings.endurance < 45) add('bad', 'tiring');
  if (t.block === 'low') add('bad', 'pinned');
  if (t.buildUp === 'direct') add('bad', 'loses-ball');
  if (t.buildUp === 'short' && t.goalKicks === 'short') add('bad', 'press-risk');
  return { ratings, notes: [...notes.filter((n) => n.tone === 'good').slice(0, 3), ...notes.filter((n) => n.tone === 'bad').slice(0, 3)] };
}
