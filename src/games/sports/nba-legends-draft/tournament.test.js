import { describe, it, expect } from "vitest";
import {
  buildLeague,
  simulateNonUserGames,
  playGameInstant,
  standings,
  startPlayoffs,
  advancePlayoffs,
  activeUserSeries,
  simulateSeriesInstant,
  userGames,
  TOTAL_TEAMS,
  TEAMS_PER_CONF,
} from "./tournament.js";
import { team } from "./testUtils.js";

function fullLeague() {
  const user = team(1, "Usuario", 84);
  const cpus = [];
  for (let i = 2; i <= TOTAL_TEAMS; i++) cpus.push(team(i, `CPU ${i}`, 90 - i));
  return buildLeague(user, cpus);
}

describe("league", () => {
  it("builds 16 teams, 2 conferences, a full round robin", () => {
    const lg = fullLeague();
    expect(lg.teams.length).toBe(TOTAL_TEAMS);
    // C(16,2) = 120 partidos.
    expect(lg.games.length).toBe(120);
    // El usuario juega contra cada rival una vez.
    expect(userGames(lg).length).toBe(TOTAL_TEAMS - 1);
  });

  it("standings split into two conferences of 8 after all games played", () => {
    const lg = fullLeague();
    simulateNonUserGames(lg);
    for (const g of userGames(lg)) playGameInstant(lg, g);
    const sd = standings(lg);
    expect(sd[0].length).toBe(TEAMS_PER_CONF);
    expect(sd[1].length).toBe(TEAMS_PER_CONF);
    // Cada equipo jugó 15 partidos.
    for (const conf of sd) for (const r of conf) expect(r.w + r.l).toBe(15);
  });
});

describe("playoffs", () => {
  function playedLeague() {
    const lg = fullLeague();
    simulateNonUserGames(lg);
    for (const g of userGames(lg)) playGameInstant(lg, g);
    return lg;
  }

  it("first round has 8 best-of-7 series (4 per conference)", () => {
    const lg = playedLeague();
    const po = startPlayoffs(lg);
    expect(po.rounds[0].length).toBe(8);
    expect(po.rounds[0].filter((s) => s.conf === 0).length).toBe(4);
  });

  it("plays all the way to a single champion", () => {
    const lg = playedLeague();
    startPlayoffs(lg);
    let guard = 0;
    while (!lg.playoffs.champion && guard++ < 20) {
      // Si hay serie del usuario pendiente, simúlala al instante para el test.
      const us = activeUserSeries(lg);
      if (us) simulateSeriesInstant(lg, us);
      advancePlayoffs(lg);
    }
    expect(lg.playoffs.champion).toBeTruthy();
    // Rondas: 8 → 4 → 2 → 1 series.
    expect(lg.playoffs.rounds.map((r) => r.length)).toEqual([8, 4, 2, 1]);
    // El campeón ganó su última serie al mejor de 7.
    const finals = lg.playoffs.rounds[3][0];
    expect(Math.max(finals.winsHi, finals.winsLo)).toBe(4);
    expect(finals.winnerId).toBe(lg.playoffs.champion.id);
  });

  it("every playoff series ends 4-x with x < 4", () => {
    const lg = playedLeague();
    startPlayoffs(lg);
    let guard = 0;
    while (!lg.playoffs.champion && guard++ < 20) {
      const us = activeUserSeries(lg);
      if (us) simulateSeriesInstant(lg, us);
      advancePlayoffs(lg);
    }
    for (const round of lg.playoffs.rounds) {
      for (const s of round) {
        const w = Math.max(s.winsHi, s.winsLo);
        const l = Math.min(s.winsHi, s.winsLo);
        expect(w).toBe(4);
        expect(l).toBeLessThan(4);
        expect(s.games.length).toBe(w + l);
      }
    }
  });
});
