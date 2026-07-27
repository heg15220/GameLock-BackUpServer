// Draft de Leyendas NBA — equipos REALES de temporadas REALES (nombre y plantilla
// reales), generados por scripts/generate-nba-cards.py. Se usan como rivales del
// torneo. Cada temporada-equipo:
//   { key, season, label ("1995-96"), name ("Chicago Bulls"), rating,
//     players: [ { id, name, role, overall, min, attrs, stats } ] (orden: minutos ↓) }

import data from "./data/team-seasons.generated.json";
import { buildTeam } from "./draft.js";
import { randInt } from "./rng.js";

export const ALL_TEAM_SEASONS = data.teams;
export const TEAM_SEASON_COUNT = data.count;

// Construye el equipo jugable: los 5 de más minutos son titulares, los 3 siguientes
// el banquillo (8 en total, como el equipo del usuario).
export function buildRealTeam(ts) {
  const roster = ts.players.slice(0, 8);
  const starterIds = new Set(roster.slice(0, 5).map((p) => p.id));
  const team = buildTeam(ts.key, `${ts.label} ${ts.name}`, roster, starterIds);
  team.realKey = ts.key;
  team.rating = ts.rating;
  team.seasonName = ts.name;
  team.seasonLabel = ts.label;
  return team;
}

// `n` temporadas-equipo distintas al azar del catálogo.
export function pickRivalTeams(rng, n) {
  const pool = ALL_TEAM_SEASONS.slice();
  const out = [];
  let guard = 0;
  while (out.length < n && pool.length && guard++ < 10000) {
    const ts = pool.splice(randInt(rng, pool.length), 1)[0];
    out.push(buildRealTeam(ts));
  }
  return out;
}
