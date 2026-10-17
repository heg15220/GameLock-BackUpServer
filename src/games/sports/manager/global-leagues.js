/** Discoverable season archives; a league becomes playable only with a full team list. */
export const globalLeagueSources = [
  ['spain-segunda-b', 'Segunda División B', 'ESP', 'UEFA', 3, 'Segunda División B seasons', 'Primera Federación seasons'],
  ['liga-profesional', 'Primera División de Argentina', 'ARG', 'CONMEBOL', 1, 'Argentine Primera División seasons'],
  ['japan-j1', 'J1 League', 'JPN', 'AFC', 1, 'J1 League seasons', 'J.League seasons'],
  ['japan-j2', 'J2 League', 'JPN', 'AFC', 2, 'J2 League seasons'],
  ['china-super-league', 'Superliga de China', 'CHN', 'AFC', 1, 'Chinese Super League seasons', 'Chinese Jia-A League seasons'],
  ['china-league-one', 'China League One', 'CHN', 'AFC', 2, 'China League One seasons'],
  ['australia-a-league', 'A-League', 'AUS', 'AFC', 1, 'A-League Men seasons', 'A-League seasons'],
  ['korea-k1', 'K League 1', 'KOR', 'AFC', 1, 'K League 1 seasons', 'K League Classic seasons', 'K League seasons'],
  ['korea-k2', 'K League 2', 'KOR', 'AFC', 2, 'K League 2 seasons', 'K League Challenge seasons'],
  ['saudi-pro-league', 'Saudi Pro League', 'KSA', 'AFC', 1, 'Saudi Pro League seasons'],
  ['saudi-first-division', 'Primera División de Arabia Saudí', 'KSA', 'AFC', 2, 'Saudi First Division League seasons'],
  ['qatar-stars-league', 'Qatar Stars League', 'QAT', 'AFC', 1, 'Qatar Stars League seasons'],
  ['uae-pro-league', 'UAE Pro League', 'UAE', 'AFC', 1, 'UAE Pro League seasons'],
  ['iran-pro-league', 'Persian Gulf Pro League', 'IRN', 'AFC', 1, 'Persian Gulf Pro League seasons'],
  ['india-super-league', 'Indian Super League', 'IND', 'AFC', 1, 'Indian Super League seasons'],
  ['thailand-league-one', 'Thai League 1', 'THA', 'AFC', 1, 'Thai League 1 seasons'],
  ['indonesia-liga-one', 'Primera División de Indonesia', 'IDN', 'AFC', 1, 'Super League (Indonesia) seasons', 'Liga 1 (Indonesia) seasons', 'Indonesia Super League seasons'],
  ['malaysia-super-league', 'Malaysia Super League', 'MAS', 'AFC', 1, 'Malaysia Super League seasons'],
  ['vietnam-league-one', 'V.League 1', 'VIE', 'AFC', 1, 'V.League 1 seasons'],
  ['uzbekistan-super-league', 'Superliga de Uzbekistán', 'UZB', 'AFC', 1, 'Uzbekistan Super League seasons'],
  ['algeria-ligue-1', 'Ligue 1 de Argelia', 'ALG', 'CAF', 1, 'Algerian Ligue Professionnelle 1 seasons'],
  ['algeria-ligue-2', 'Ligue 2 de Argelia', 'ALG', 'CAF', 2, 'Algerian Ligue 2 seasons'],
  ['egypt-premier-league', 'Premier League de Egipto', 'EGY', 'CAF', 1, 'Egyptian Premier League seasons'],
  ['egypt-second-division', 'Segunda División de Egipto', 'EGY', 'CAF', 2, 'Egyptian Second Division A seasons'],
  ['morocco-botola', 'Botola de Marruecos', 'MAR', 'CAF', 1, 'Botola seasons'],
  ['morocco-botola-2', 'Botola 2', 'MAR', 'CAF', 2, 'Botola seasons', 'Botola 2 seasons'],
  ['south-africa-premiership', 'Premiership de Sudáfrica', 'RSA', 'CAF', 1, 'Premier Soccer League seasons', 'South African Premier Division seasons'],
  ['south-africa-first-division', 'National First Division', 'RSA', 'CAF', 2, 'National First Division seasons'],
  ['tunisia-ligue-1', 'Ligue 1 de Túnez', 'TUN', 'CAF', 1, 'Tunisian Ligue Professionnelle 1 seasons'],
  ['nigeria-premier-league', 'Premier League de Nigeria', 'NGA', 'CAF', 1, 'Nigeria Professional Football League seasons'],
  ['ghana-premier-league', 'Premier League de Ghana', 'GHA', 'CAF', 1, 'Ghana Premier League seasons'],
  ['kenya-premier-league', 'Premier League de Kenia', 'KEN', 'CAF', 1, 'Kenyan Premier League seasons'],
  ['tanzania-premier-league', 'Premier League de Tanzania', 'TAN', 'CAF', 1, 'Tanzanian Premier League', 'Tanzanian Premier League seasons'],
  ['zambia-super-league', 'Superliga de Zambia', 'ZAM', 'CAF', 1, 'Zambia Super League', 'Zambia Super League seasons'],
  ['angola-girabola', 'Girabola', 'ANG', 'CAF', 1, 'Girabola seasons'],
  ['dr-congo-linafoot', 'Linafoot', 'COD', 'CAF', 1, 'Linafoot seasons'],
  ['senegal-ligue-1', 'Ligue 1 de Senegal', 'SEN', 'CAF', 1, 'Senegal Premier League seasons'],
  ['senegal-ligue-2', 'Ligue 2 de Senegal', 'SEN', 'CAF', 2],
  ['ivory-coast-ligue-1', 'Ligue 1 de Costa de Marfil', 'CIV', 'CAF', 1, 'Ligue 1 (Ivory Coast) seasons'],
  ['cameroon-elite-one', 'Elite One de Camerún', 'CMR', 'CAF', 1, 'Elite One seasons'],
].map(([id, name, country_fifa_code, confederation, tier, ...categories]) => ({ id, name, country_fifa_code, confederation, tier, categories }));

export const globalFrenchSeasonPrefixes = {
  'senegal-ligue-1': 'Championnat du Sénégal de football ',
  'senegal-ligue-2': 'Championnat du Sénégal de football de deuxième division ',
  'morocco-botola': 'Championnat du Maroc de football ',
  'morocco-botola-2': 'Championnat du Maroc de football de deuxième division ',
};

/** Leagues whose seasons are played in parallel regional groups. */
export const groupedLeagueIds = new Set(['spain-segunda-b']);

/** The third Spanish tier was renamed when the RFEF reorganised it in 2021. */
export function globalLeagueSeasonName(id, year) {
  if (id !== 'spain-segunda-b') return null;
  return year >= 2022 ? 'Primera Federación' : year === 2021 ? 'Primera División RFEF' : 'Segunda División B';
}

export function globalMembershipOptions(id, year) {
  if (id === 'spain-segunda-b') return { minTeams: 36, maxTeams: 110, preferredStage: null, groupSets: [['1','2','3','4'],['1','2','3','4','5'],['i','ii','iii','iv']] };
  const groupSets = id === 'algeria-ligue-2'
    ? [['Centre-east','Centre-west'],['East','Centre','West'],['Est','Ouest'],['Central East','Central West']]
    : id === 'liga-profesional' && year === 2020 ? [['1','2','3','4','5','6']]
    : id === 'dr-congo-linafoot' ? [['de développement Est','de développement Ouest','de développement Centre-Sud'],['de développement Est','de développement Ouest','de développement Centre Sud'],['A','B','C']] : [];
  return { minTeams: id === 'korea-k1' && year <= 1994 ? 6 : 8, maxTeams:48, preferredStage:'Apertura|First stage|Regular season', groupSets };
}
