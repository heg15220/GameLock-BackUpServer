/**
 * Era-aware strength of leagues, clubs and national teams.
 *
 * League levels are the typical rating of a mid-table starting eleven in that
 * competition, at five anchor years (1990, 2000, 2010, 2020, 2026) and
 * interpolated in between. They are editorial estimates informed by the
 * relative standing of each league in its era (European coefficients, results
 * in continental competition); they are not official ratings.
 */
const ANCHORS = [1990, 2000, 2010, 2020, 2026];
export const LEAGUE_LEVEL = {
  'premier-league': [72, 75, 77, 78, 78], laliga: [73, 75.5, 76, 76, 76], 'serie-a': [76, 76.5, 74, 75, 75.5], bundesliga: [73, 73, 74, 75, 75],
  'ligue-1': [70.5, 72, 72, 73, 73], eredivisie: [70, 70, 69, 69, 69], 'por-primeira-liga': [69, 70, 70, 70, 70],
  'superliga-turquia': [66, 68, 69, 69, 68], 'scotland-premiership': [68, 67, 65, 65, 65], 'belgium-first-division': [68, 67, 67, 68, 68],
  'greece-super-league': [66, 67, 67, 66, 66], 'liga-premier-de-rusia': [66, 67, 70, 70, 68], 'austria-bundesliga': [64, 65, 65, 66, 66],
  'switzerland-super-league': [64, 65, 66, 66, 66], ekstraklasa: [62, 62, 63, 64, 64],
  championship: [67, 68, 69, 70, 71], 'england-league-one': [62, 63, 64, 65, 66], 'england-league-two': [58, 59, 60, 61, 62],
  'laliga-2': [65, 66, 66, 67, 68], 'spain-segunda-b': [59, 60, 60.5, 61.5, 62.5], 'serie-b': [66, 67, 66, 66, 67], '2-bundesliga': [65, 65, 66, 67, 68], 'germany-3-liga': [60, 60, 61, 62, 63],
  'ligue-2': [63, 64, 64, 65, 65], 'austria-2-liga': [56, 57, 57, 58, 58],
  brasileirao: [71, 71.5, 71, 72, 73], 'brasileirao-serie-b': [63, 63, 64, 65, 66], 'liga-profesional': [70, 70, 70, 70, 70],
  'primera-nacional': [61, 61, 62, 62, 62], 'liga-uruguaya': [65, 64, 64, 64, 64], 'liga-de-primera': [63, 63, 64, 64, 64],
  'liga-dimayor': [64, 64, 65, 65, 65], liga1: [60, 60, 61, 61, 61], 'ligapro-serie-a': [61, 62, 63, 64, 65],
  'copa-de-primera': [62, 62, 63, 63, 63], 'liga-bolivia': [58, 58, 58, 58, 58], 'liga-futve': [56, 57, 58, 59, 59],
  'liga-mx': [67, 68, 70, 71, 71], 'usa-mls': [60, 62, 64, 67, 69], 'primera-division-costa-rica': [58, 59, 60, 60, 61],
  'hon-liga-nacional': [56, 57, 58, 58, 58], 'liga-nacional-guatemala': [55, 56, 56, 57, 57], 'slv-primera-division': [54, 55, 55, 55, 55],
  'pan-primera-division': [53, 54, 55, 56, 56], 'liga-primera-de-nicaragua': [50, 51, 52, 53, 53], 'liga-dominicana-de-futbol': [50, 50, 51, 52, 52],
  'japan-j1': [64, 65, 66, 67, 68], 'china-super-league': [58, 60, 63, 66, 64], 'australia-a-league': [60, 61, 63, 64, 64],
  'algeria-ligue-1': [58, 58, 59, 59, 60], 'egypt-premier-league': [60, 60, 61, 62, 62], 'morocco-botola': [59, 60, 61, 62, 63],
};

export function interpolate(values, year) {
  if (year <= ANCHORS[0]) return values[0];
  for (let i = 1; i < ANCHORS.length; i += 1) {
    if (year <= ANCHORS[i]) {
      const t = (year - ANCHORS[i - 1]) / (ANCHORS[i] - ANCHORS[i - 1]);
      return values[i - 1] + (values[i] - values[i - 1]) * t;
    }
  }
  return values[values.length - 1];
}

export const leagueLevel = (leagueId, year) => interpolate(LEAGUE_LEVEL[leagueId] || [60, 60, 61, 61, 61], year);

/**
 * National team weight of a senior cap, 0.3 (minnow) – 1.6 (world power), by
 * era. A cap for Brazil or France says more about a player than one for
 * Andorra; Greece 2004 or Czechia in the late 90s rank higher than today.
 */
const NATION = {
  BRA: [1.6, 1.6, 1.55, 1.5, 1.5], ARG: [1.5, 1.5, 1.5, 1.55, 1.6], GER: [1.55, 1.45, 1.55, 1.5, 1.45], ITA: [1.55, 1.55, 1.45, 1.35, 1.35],
  FRA: [1.3, 1.6, 1.45, 1.6, 1.6], ESP: [1.35, 1.4, 1.6, 1.5, 1.55], ENG: [1.4, 1.35, 1.4, 1.5, 1.5], NED: [1.5, 1.45, 1.45, 1.35, 1.4],
  POR: [1.1, 1.35, 1.4, 1.5, 1.5], BEL: [1.15, 1.1, 1.15, 1.45, 1.35], CRO: [0.9, 1.3, 1.25, 1.4, 1.35], URU: [1.15, 1.1, 1.3, 1.3, 1.3],
  COL: [1.2, 1.1, 1.1, 1.25, 1.3], MEX: [1.0, 1.1, 1.15, 1.15, 1.1], USA: [0.85, 1.0, 1.05, 1.05, 1.1], DEN: [1.15, 1.2, 1.15, 1.25, 1.25],
  SWE: [1.25, 1.2, 1.1, 1.05, 1.05], NOR: [1.05, 1.1, 0.9, 0.95, 1.1], SUI: [0.95, 1.0, 1.1, 1.2, 1.2], CZE: [1.2, 1.35, 1.1, 1.0, 1.0],
  RUS: [1.3, 1.1, 1.15, 1.0, 0.9], UKR: [0.9, 1.15, 1.05, 1.1, 1.05], POL: [0.95, 1.0, 1.0, 1.1, 1.05], SRB: [1.35, 1.2, 1.15, 1.1, 1.1],
  ROU: [1.25, 1.2, 0.95, 0.95, 1.0], BUL: [1.2, 1.0, 0.85, 0.75, 0.75], TUR: [0.9, 1.25, 1.05, 1.1, 1.2], GRE: [0.85, 1.05, 1.15, 0.95, 1.0],
  CHI: [0.95, 1.0, 1.25, 1.1, 0.95], PAR: [1.0, 1.15, 1.15, 0.95, 1.0], PER: [0.8, 0.85, 0.9, 1.05, 0.95], ECU: [0.8, 1.0, 1.0, 1.05, 1.15],
  NGA: [1.1, 1.15, 1.05, 1.05, 1.05], CMR: [1.15, 1.2, 1.1, 1.0, 1.0], CIV: [0.9, 1.05, 1.25, 1.15, 1.15], SEN: [0.85, 1.1, 1.0, 1.25, 1.3],
  GHA: [0.9, 1.0, 1.15, 1.05, 1.0], MAR: [1.0, 1.0, 0.95, 1.2, 1.4], EGY: [0.9, 0.95, 1.05, 1.0, 1.0], ALG: [0.85, 0.8, 0.95, 1.1, 1.05],
  TUN: [0.85, 0.95, 0.95, 0.95, 0.95], JPN: [0.7, 1.0, 1.05, 1.15, 1.25], KOR: [0.95, 1.05, 1.1, 1.1, 1.15], AUS: [0.75, 0.95, 1.05, 1.0, 1.0],
  IRN: [0.8, 0.95, 0.95, 1.05, 1.05], SCO: [1.05, 1.0, 0.95, 1.0, 1.05], IRL: [1.15, 1.1, 1.05, 0.95, 0.9], WAL: [0.9, 0.9, 0.95, 1.1, 1.05],
  NIR: [0.8, 0.75, 0.8, 0.9, 0.85], AUT: [1.0, 0.95, 0.95, 1.15, 1.25], HUN: [0.9, 0.8, 0.85, 1.0, 1.05], SVK: [0.9, 0.95, 1.0, 1.0, 0.95],
  SVN: [0.7, 0.95, 0.95, 0.95, 0.95], BIH: [0.7, 0.85, 1.05, 1.0, 0.9], ISR: [0.8, 0.85, 0.85, 0.85, 0.85], FIN: [0.75, 0.85, 0.85, 0.9, 0.85],
  ISL: [0.6, 0.7, 0.8, 1.0, 0.9], CRC: [0.85, 0.9, 0.9, 1.0, 0.95], HON: [0.75, 0.8, 0.85, 0.8, 0.75], JAM: [0.6, 0.8, 0.75, 0.75, 0.8],
  BOL: [0.8, 0.75, 0.7, 0.7, 0.7], VEN: [0.5, 0.65, 0.8, 0.85, 0.9], RSA: [0.6, 1.0, 0.9, 0.85, 0.85], MLI: [0.6, 0.85, 1.0, 1.0, 1.05],
  KSA: [0.85, 0.9, 0.85, 0.85, 0.85], QAT: [0.6, 0.65, 0.7, 0.9, 0.9], CHN: [0.7, 0.8, 0.75, 0.7, 0.65], GEO: [0.6, 0.75, 0.75, 0.85, 1.0],
  MNE: [0.6, 0.6, 0.9, 0.9, 0.85], MKD: [0.6, 0.75, 0.8, 0.85, 0.85], ALB: [0.55, 0.65, 0.8, 0.9, 0.95], NZL: [0.5, 0.6, 0.7, 0.65, 0.7],
};
export function nationWeight(fifa, year, reputation = 1) {
  const values = NATION[fifa];
  if (values) return interpolate(values, year);
  return 0.45 + Math.min(5, Math.max(0, reputation)) * 0.14;
}

/**
 * One club season's performance as a rating: league level plus points per game
 * and goal difference per game relative to that league's average.
 */
export function seasonPerformance(row, table, level) {
  const [, played, won, drawn, , gf, ga] = row;
  if (!played) return null;
  let points = 0; let games = 0;
  for (const r of table) { points += r[2] * 3 + r[3]; games += r[1]; }
  const avgPpg = games ? points / games : 1.37;
  const ppg = (won * 3 + drawn) / played;
  const gdpg = (gf - ga) / played;
  return level + 6.3 * (ppg - avgPpg) + 2.1 * gdpg;
}
