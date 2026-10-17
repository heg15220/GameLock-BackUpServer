/**
 * Identities of Spanish third-tier clubs (Segunda B / Primera Federación).
 *
 * Season tables link reserve sides ("Villarreal CF B", "Real Madrid Castilla")
 * by their own article; a fuzzy name match would merge them with the first
 * team. Only an identical set of significant name tokens, with the same
 * reserve status, links a table entry to an existing club.
 */
const GENERIC = new Set(['cf', 'fc', 'cd', 'ud', 'sd', 'rcd', 'rc', 'ad', 'sad', 'club', 'de', 'la', 'el', 'del', 'futbol', 'cp', 'ue', 'ce', 'sc', 'scd', 'cdf', 'ca', 'agd', 'rsd', 'real', 'spain']);
const fold = (text) => String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const nameTokens = (name) => fold(name).replace(/\([^)]*\)/g, ' ').split(/[^a-z0-9]+/).filter((token) => token && !GENERIC.has(token));
const genericTokens = (name) => fold(name).split(/[^a-z0-9]+/).filter((token) => GENERIC.has(token) && token !== 'de' && token !== 'la' && token !== 'el' && token !== 'del').sort().join(' ');
export const spanishSlug = (name) => fold(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Reserve sides with their own names, mapped to the first team's name. */
const NAMED_RESERVES = [
  [/\bcastilla\b|real madrid (?:b|c)\b/, 'Real Madrid'], [/\bmestalla\b/, 'Valencia'], [/bilbao athletic|athletic (?:club|bilbao) b\b/, 'Athletic Club'],
  [/atletico madrilen|atletico (?:de )?madrid b\b/, 'Atlético Madrid'], [/sevilla atletico|sevilla (?:fc )?b\b/, 'Sevilla'],
  [/betis deportivo|real betis b\b|betis b\b/, 'Real Betis'], [/deportivo aragon|real zaragoza b\b/, 'Real Zaragoza'],
  [/vetusta|real oviedo b\b/, 'Real Oviedo'], [/atletico levante|levante (?:ud )?b\b/, 'Levante'],
  [/barcelona atletic|barcelona b\b/, 'Barcelona'], [/celta fortuna|celta (?:de vigo )?b\b|celta turista/, 'Celta de Vigo'],
  [/\bfabril\b|deportivo (?:de )?la coruna b\b/, 'Deportivo La Coruña'], [/atletico malaguen|malaga (?:cf )?b\b/, 'Málaga'],
  [/murcia imperial|real murcia b\b/, 'Real Murcia'], [/\bilicitano\b/, 'Elche'], [/las palmas atletico|las palmas b\b/, 'Las Palmas'],
  [/valladolid promesas|valladolid b\b/, 'Real Valladolid'], [/osasuna (?:promesas|b)\b/, 'Osasuna'], [/real sociedad b\b|sanse\b/, 'Real Sociedad'],
  [/sporting (?:de )?gijon b\b|sporting atletico/, 'Sporting de Gijón'], [/racing (?:de )?santander b\b|rayo cantabria/, 'Racing de Santander'],
  [/villarreal (?:cf )?b\b/, 'Villarreal'], [/espanyol b\b/, 'Espanyol'], [/getafe (?:cf )?b\b/, 'Getafe'], [/alaves b\b/, 'Alavés'],
  [/mallorca b\b/, 'Mallorca'], [/rayo vallecano b\b/, 'Rayo Vallecano'], [/tenerife b\b/, 'Tenerife'], [/cadiz (?:cf )?b\b|cadiz mirandilla/, 'Cádiz'],
  [/cordoba (?:cf )?b\b/, 'Córdoba'], [/granada (?:cf )?b\b|recreativo granada/, 'Granada CF'], [/almeria b\b/, 'Almería'],
  [/recreativo (?:de huelva )?b\b/, 'Recreativo de Huelva'], [/albacete (?:balompie )?b\b/, 'Albacete'], [/logrones b\b/, 'CD Logroñés'],
  [/numancia b\b/, 'Numancia'], [/leganes b\b/, 'Leganés'], [/girona b\b/, 'Girona'], [/hercules b\b/, 'Hércules CF'],
  [/eibar b\b|vitoria\b/, 'Eibar'], [/ponferradina b\b/, 'Ponferradina'], [/xerez b\b/, 'Xerez'], [/salamanca b\b/, 'UD Salamanca'],
];

/** The first team's name when `name` is a reserve side, otherwise null. */
export function reserveParentName(name) {
  const text = fold(name);
  for (const [pattern, parent] of NAMED_RESERVES) if (pattern.test(text)) return parent;
  const generic = /^(.*?)\s+(?:b|c|ii|promesas)$/.exec(text.replace(/\([^)]*\)/g, '').trim());
  return generic ? generic[1] : null;
}

/**
 * Pick the identity of a table entry among known Spanish clubs, or a new one.
 * `candidates` maps clubId → names known for it (world catalogue, archives).
 */
/** Homonyms a shortened table label would merge: Andorra CF (Teruel) is not FC Andorra. */
const EXPLICIT = { 'andorra cf': 'andorra-cf' };

export function resolveSpanishClub(article, candidates, taken = new Set(), used = new Set()) {
  const explicit = EXPLICIT[fold(article).trim()];
  if (explicit) return explicit;
  const reserve = Boolean(reserveParentName(article));
  const full = fold(article).replace(/[^a-z0-9]+/g, ' ').trim();
  const tokens = nameTokens(article).sort().join(' ');
  const exact = new Set(), loose = new Set();
  for (const [id, names] of candidates) for (const name of names) {
    if (used.has(id) || Boolean(reserveParentName(name)) !== reserve) continue;
    if (fold(name).replace(/[^a-z0-9]+/g, ' ').trim() === full) exact.add(id);
    // "Andorra CF" and "FC Andorra" are two clubs: differing club-type prefixes never match loosely.
    else if (tokens && nameTokens(name).sort().join(' ') === tokens && (!genericTokens(name) || !genericTokens(article) || genericTokens(name) === genericTokens(article))) loose.add(id);
  }
  if (exact.size === 1) return [...exact][0];
  if (!exact.size && loose.size === 1) return [...loose][0];
  let id = spanishSlug(article);
  if (taken.has(id) || used.has(id)) id = `esp-${id}`;
  return id;
}

/** A table that links a reserve side to the first team's article ("Villarreal B" → [[Villarreal CF]]). */
export function spanishIdentityName(team) {
  if (reserveParentName(team.article) || !reserveParentName(team.name ?? '')) return team.article;
  const suffix = /\bc\s*$/.test(fold(team.name)) ? 'C' : 'B';
  return `${team.article} ${suffix}`;
}
