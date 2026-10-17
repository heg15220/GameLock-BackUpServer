/** Explicit identities, scoped to country. Never fuzzy-match historical clubs. */
export const GLOBAL_CLUB_ALIASES = {
  ARG: {
    'club-atletico-san-lorenzo-de-almagro': 'san-lorenzo',
    'gimnasia-y-tiro-de-salta': 'gimnasia-y-tiro',
    'huracan-de-corrientes': 'arg-club-atletico-huracan-corrientes',
    'olimpo-de-bahia-blanca': 'arg-club-olimpo',
    'ca-colon': 'colon-santa-fe',
    'club-atletico-tucuman': 'atletico-tucuman',
    'atl-tucuman': 'atletico-tucuman',
    'atl-rafaela': 'atletico-de-rafaela',
    'talleres-cordoba': 'talleres',
    'arg-club-de-gimnasia-y-esgrima-la-plata': 'gimnasia-lp',
    'central-cordoba': 'central-cordoba-de-santiago',
    'arg-instituto-atletico-central-cordoba': 'instituto-cordoba',
    instituto: 'instituto-cordoba',
    'arg-club-atletico-sarmiento-junin': 'sarmiento-junin',
    'club-atletico-sarmiento': 'sarmiento-junin',
    'olimpo-bahia-blanca': 'arg-club-olimpo',
    'arg-crucero-del-norte': 'crucero-del-norte',
    'arg-club-atletico-brown': 'arg-brown-de-adrogue',
    'arg-club-y-biblioteca-ramon-santamarina': 'arg-deportivo-santamarina',
  },
};
export function canonicalGlobalClub(id, country) { return GLOBAL_CLUB_ALIASES[country]?.[id] || id; }

// Some old season tables mistakenly link the 1998 tribute club. AFA identifies
// the 1988–1995 first-division participant as the original Deportivo Mandiyú.
export function correctGlobalParticipant(team, country, year) {
  if (country === 'ARG' && year <= 1994 && team.clubId === 'textil-mandiyu') return {
    ...team, clubId: 'arg-deportivo-mandiyu', name: 'Deportivo Mandiyú', article: 'Deportivo Mandiyú',
    identityCorrection: { originalClubId: team.clubId, originalArticle: team.article,
      source: 'https://www.afa.com.ar/7/posts/subiquetellevo-deportivo-mandiyu', reason: 'The original 1988–1995 top-flight club, not the tribute club founded in 1998.' },
  };
  const id = canonicalGlobalClub(team.clubId, country);
  return id === team.clubId ? team : { ...team, clubId: id, originalClubId: team.clubId };
}
