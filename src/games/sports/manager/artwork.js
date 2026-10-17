import archive from './artwork.json';

export const clubArtwork = id => archive.crests[id] || null;
export function leagueArtwork(league) {
  return { ...league, logo: archive.competitions[league.id] || league.logo || null,
    trophy: archive.trophies[`league__${league.id}`] || league.trophy || null,
    cupTrophy: archive.trophies[`cup__${league.domesticCupId}`] || league.cupTrophy || null };
}

/** Logo of a league in a given season, when its identity changed over time. */
export function seasonLeagueLogo(id, year) {
  if (id === 'spain-segunda-b' && Number(year) <= 2020) return archive.competitions['spain-segunda-b-legacy'] || null;
  return null;
}
