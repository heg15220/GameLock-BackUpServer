import { describe, it, expect } from "vitest";
import { ALL_TEAM_SEASONS, buildRealTeam, pickRivalTeams } from "./teamSeasons.js";
import { ROLES } from "./cards.js";
import { makeRng } from "./rng.js";
import { buildLeague, simulateNonUserGames, standings } from "./tournament.js";
import { team } from "./testUtils.js";

describe("real team-seasons catalog", () => {
  it("has a healthy pool of real team-seasons", () => {
    expect(ALL_TEAM_SEASONS.length).toBeGreaterThan(200);
  });

  it("each team-season has a real name, season label, and a valid roster", () => {
    for (const ts of ALL_TEAM_SEASONS) {
      expect(ts.name).toBeTruthy();
      expect(ts.label).toMatch(/^\d{4}-\d{2}$/);
      expect(ts.players.length).toBeGreaterThanOrEqual(8);
      for (const p of ts.players) {
        expect(ROLES).toContain(p.role);
        expect(p.overall).toBeGreaterThanOrEqual(40);
        expect(p.overall).toBeLessThanOrEqual(99);
        expect(p.attrs.anotacion).toBeGreaterThan(0);
      }
      // El roster viene ordenado por minutos (titulares primero).
      for (let i = 1; i < ts.players.length; i++) {
        expect(ts.players[i - 1].min).toBeGreaterThanOrEqual(ts.players[i].min);
      }
    }
  });

  it("buildRealTeam yields 5 starters + 3 bench with a real name", () => {
    const t = buildRealTeam(ALL_TEAM_SEASONS[0]);
    expect(t.starters.length).toBe(5);
    expect(t.bench.length).toBe(3);
    expect(t.name).toContain(ALL_TEAM_SEASONS[0].name);
    expect(t.name).toContain(ALL_TEAM_SEASONS[0].label);
  });

  it("pickRivalTeams returns 15 distinct real teams", () => {
    const rivals = pickRivalTeams(makeRng(2024), 15);
    expect(rivals.length).toBe(15);
    expect(new Set(rivals.map((r) => r.id)).size).toBe(15);
    for (const r of rivals) expect(r.starters.length).toBe(5);
  });

  it("real rosters plug into the league and simulate a full season", () => {
    const user = team(999, "Usuario", 84);
    const rivals = pickRivalTeams(makeRng(7), 15);
    const lg = buildLeague(user, rivals);
    simulateNonUserGames(lg);
    for (const g of lg.games) if (!g.result) {
      // el resto (partidos del usuario) también, para poblar la tabla
      const home = lg.byId.get(g.homeId), away = lg.byId.get(g.awayId);
      g.result = { scoreHome: 100, scoreAway: 99, winnerId: home.id };
    }
    const sd = standings(lg);
    expect(sd[0].length + sd[1].length).toBe(16);
  });
});
