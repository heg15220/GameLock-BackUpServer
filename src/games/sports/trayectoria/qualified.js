/**
 * Who is actually in the draw.
 *
 * `simulateTournamentRun` used to take every club in the confederation as its pool. That is
 * not a Champions League: it is a list of four hundred European sides, and it drew Elversberg
 * in a quarter-final and Rodina Moscow in a semi. The tournament had the right shape - the
 * formats in tournaments.js are correct to the last group - and the wrong names in it, which
 * is the one error a football simulation cannot get away with, because the names are the only
 * part of it the player already knows the answer to.
 *
 * So the field is data, not derivation: the sides that really qualified for the edition each
 * competition is modelled on. Two rules make that safe to hard-code:
 *
 *  1. THE WORLD DECIDES WHAT SURVIVES. `world.data.json` models 574 clubs across 35 leagues,
 *     and a real Champions League has nine sides in it whose league is not modelled at all.
 *     Every id here is looked up before it is used and silently dropped when the world has
 *     no such club, so the list can name the real field without the data having to carry it.
 *  2. THE FORMAT DECIDES HOW MANY. Whatever the lookup leaves, `entrantsFor` tops the field
 *     back up to the number the format wants, from the strongest eligible sides not already
 *     in it. A Champions League missing Bodø/Glimt and Pafos is filled by Milan and Porto,
 *     which is both a plausible edition and obviously the right kind of wrong.
 *
 * Nothing here simulates anything. This is a guest list.
 */

import { TOURNAMENTS } from "./tournaments.js";

/**
 * The fields, as they were really drawn.
 *
 * `edition` is there to be checked rather than read: it is the thing that goes stale, and a
 * list nobody can date is a list nobody can correct. Club competitions carry world club ids;
 * national-team ones carry FIFA codes, which is what `world.countries` is keyed by.
 */
export const QUALIFIED = {
  /**
   * UEFA Champions League 2025-26, the 36 of the league phase.
   *
   * Nine of them play in leagues this world does not model - Club Brugge, Union
   * Saint-Gilloise, Bodø/Glimt, Copenhagen, Olympiacos, Slavia Praha, Qarabağ, Pafos and
   * Kairat - so twenty-seven survive the lookup and the format tops the rest up.
   */
  champions: {
    edition: "2025-26",
    teams: [
      // England
      "arsenal", "liverpool", "tottenham", "chelsea", "manchester-city", "newcastle",
      // Spain
      "real-madrid", "barcelona", "atletico-madrid", "villarreal", "athletic-club",
      // Germany
      "bayern-munchen", "borussia-dortmund", "bayer-leverkusen", "eintracht-frankfurt",
      // Italy
      "inter", "juventus", "atalanta", "napoli",
      // France
      "paris-saint-germain", "olympique-de-marseille", "monaco",
      // Portugal
      "benfica", "sporting-lisboa",
      // Netherlands
      "psv", "ajax",
      // Türkiye
      "galatasaray",
    ],
  },

  /**
   * Copa Libertadores 2026, the twenty-eight sides that entered straight into the groups.
   * The other four places go to the winners of the qualifying stages, who are not known
   * when a draw is published either - the top-up stands in for them.
   */
  libertadores: {
    edition: "2026",
    teams: [
      // Brazil
      "flamengo", "corinthians", "palmeiras", "cruzeiro", "mirassol", "fluminense",
      // Argentina
      "lanus", "platense", "estudiantes", "independiente-rivadavia", "rosario-central",
      "boca-juniors",
      // Bolivia
      "always-ready", "bolivar",
      // Chile
      "coquimbo-unido", "u-catolica",
      // Colombia
      "santa-fe", "junior",
      // Ecuador
      "independiente-del-valle", "ldu-de-quito",
      // Paraguay
      "cerro-porteno", "libertad-asuncion",
      // Peru
      "universitario", "cusco",
      // Uruguay
      "club-nacional", "penarol",
      // Venezuela
      "ucv", "deportivo-la-guaira",
    ],
  },

  /** FIFA World Cup 2026: the first forty-eight, and every one of them modelled. */
  world_cup: {
    edition: "2026",
    teams: [
      // CONCACAF
      "CAN", "MEX", "USA", "PAN", "CUW", "HAI",
      // CONMEBOL
      "ARG", "BRA", "ECU", "PAR", "URU", "COL",
      // AFC
      "JPN", "IRN", "KOR", "AUS", "UZB", "JOR", "QAT", "KSA", "IRQ",
      // CAF
      "MAR", "TUN", "EGY", "ALG", "GHA", "CPV", "SEN", "RSA", "CIV", "COD",
      // UEFA
      "ENG", "FRA", "CRO", "POR", "NOR", "GER", "NED", "SUI", "SCO", "ESP",
      "AUT", "BEL", "BIH", "SWE", "TUR", "CZE",
      // OFC
      "NZL",
    ],
  },

  /** UEFA Euro 2024, the twenty-four of the finals in Germany. */
  euro: {
    edition: "2024",
    teams: [
      "GER", "ALB", "AUT", "BEL", "CRO", "CZE", "DEN", "ENG", "FRA", "GEO", "HUN", "ITA",
      "NED", "POL", "POR", "ROU", "SCO", "SRB", "SVK", "SVN", "ESP", "SUI", "TUR", "UKR",
    ],
  },

  /** Copa América 2024, the sixteen of the finals in the United States. */
  copa_america: {
    edition: "2024",
    teams: [
      "ARG", "BOL", "BRA", "CAN", "CHI", "COL", "CRC", "ECU", "JAM", "MEX", "PAN", "PAR",
      "PER", "USA", "URU", "VEN",
    ],
  },
};

const idOf = (entry) => entry?.id ?? entry?.fifa ?? null;

/** The real field, minus whatever this world has never heard of. */
export function realFieldFor(id, world) {
  const listed = QUALIFIED[id]?.teams ?? [];
  const table = TOURNAMENTS[id]?.club === false ? world?.countries : world?.clubs;
  if (!table) return [];
  return listed.map((key) => table[key]).filter(Boolean);
}

/**
 * Who could plausibly have taken the places the lookup could not fill.
 *
 * A club competition draws on its own confederation and a national-team one on the whole
 * world, ordered by the reputation the world already carries and broken by id so a career
 * replays with the same edition. Nothing seeded goes into it: the field of a tournament is
 * not a thing that should change because the player's surname did.
 */
function eligibleFor(id, world) {
  const spec = TOURNAMENTS[id];
  if (!spec) return [];
  if (!spec.club) {
    const pool = Object.values(world?.countries ?? {});
    return pool
      .filter((country) => !spec.confederation || country.confederation === spec.confederation)
      .sort(
        (a, b) =>
          (b.fifa_reputation ?? 0) - (a.fifa_reputation ?? 0) ||
          (b.international_reputation ?? 0) - (a.international_reputation ?? 0) ||
          String(a.fifa).localeCompare(String(b.fifa)),
      );
  }
  return Object.values(world?.clubs ?? {})
    .filter(
      (club) =>
        world?.competitions?.[club.competitionId]?.confederation === spec.confederation &&
        (world.competitions[club.competitionId]?.tier ?? 1) === 1,
    )
    .sort(
      (a, b) =>
        (b.continental_reputation ?? 0) - (a.continental_reputation ?? 0) ||
        (b.international_reputation ?? 0) - (a.international_reputation ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    );
}

/**
 * The whole field of one edition: the real qualifiers, the player's own side if the season
 * put it there, and enough of the strongest eligible sides to fill the format out.
 *
 * `include` is how a career that has just taken a mid-table club into the Champions League
 * for the first time gets to be in its own tournament: the real list obviously does not
 * name them, and dropping them would leave the run with no player in it.
 */
export function entrantsFor(id, world, { include = [] } = {}) {
  const spec = TOURNAMENTS[id];
  if (!spec || !world) return [];

  const field = [];
  const seen = new Set();
  const push = (entry) => {
    const key = idOf(entry);
    if (!entry || !key || seen.has(key)) return;
    seen.add(key);
    field.push(entry);
  };

  for (const entry of include) push(entry);
  for (const entry of realFieldFor(id, world)) push(entry);
  for (const entry of eligibleFor(id, world)) {
    if (field.length >= spec.teams) break;
    push(entry);
  }
  return field.slice(0, Math.max(spec.teams, include.length));
}
