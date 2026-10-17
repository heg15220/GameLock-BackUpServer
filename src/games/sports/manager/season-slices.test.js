import { describe, expect, it } from 'vitest';
import historical from './historical-rosters.json';
import wikimedia from './wikimedia-rosters.json';
import cc0 from './cc0-season-rosters.json';
import research from './research-season-rosters.json';
import multilingual from './multilingual-season-rosters.json';
import verified from './verified-player-careers.json';
import { sliceSeason, seasonYears } from './season-slices.js';
import { playerClubAtDate } from './providers.js';
import { getManagerSnapshotDate } from './data.js';
import { getVerifiedCareerRecords } from './verified-career-provider.js';
import { isPublishableCareerStint } from './career-affiliation.js';

const archives = { historical, wikimedia, cc0, research, multilingual, verified };

describe('season slices', () => {
  it('keep everything each season reads from the full archives', () => {
    const years = seasonYears(archives);
    for (let year = 1985; year <= 2030; year += 1) {
      const slice = sliceSeason(archives, year);
      for (const key of ['historical', 'wikimedia', 'cc0', 'research', 'multilingual']) expect(slice.seasons[key] ?? undefined).toEqual(archives[key].seasons?.[year]);
      // The career records a season gets are the ones the full biographies gave.
      const before = [];
      for (const player of verified.players) {
        const membership = player.eligibleSeasons.find((row) => row.year === year);
        if (!membership) continue;
        const stint = player.careerStints.find((row) => row.index === membership.stintIndex);
        if (isPublishableCareerStint(stint, year)) before.push([membership.clubId, player.name, player.source, stint.from, stint.to, player.wikidataId]);
      }
      expect(getVerifiedCareerRecords(year).map(([club, r]) => [club, r.players[0].name, r.source, r.players[0].stintFrom, r.players[0].stintTo, r.players[0].wikidataId])).toEqual(before);
      // Every player the full-archive loop would place must be in the slice.
      const kept = new Set(slice.historicalPlayers);
      for (const row of historical.historicalPlayers) {
        const memberships = row.memberships.filter((m) => m.end || Number(m.start?.value.slice(0, 4)) >= year - 12);
        if (playerClubAtDate({ memberships }, getManagerSnapshotDate(year))) expect(kept.has(row)).toBe(true);
      }
    }
    expect(years.length).toBeGreaterThan(30);
  });
});
