import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { createCareer, continueCareer, startUserMatch } from './career.js';
import { seasonTurnover } from './development.js';
import { advanceMatch } from './match.js';
import { pruneUnreferencedRetirees } from './maintenance.js';
import { encodeSnapshot, decodeSnapshot, snapshotCode, importSnapshotCode } from './save-format.js';
import { loadSeasonEvidence } from '../evidence-archive.js';

const normal = career => JSON.parse(JSON.stringify({ ...career, flags: { ...career.flags, stops: [] } }));

describe('real-world career save compatibility', () => {
  it('restores a full historical world and produces identical next-day simulation', async () => {
    await loadSeasonEvidence(1999);
    const career = createCareer({ year: 1999, clubId: 'boca-juniors', managerName: 'Prueba portátil', seed: 'SAVE-1999' });
    const blob = await encodeSnapshot(career);
    const restored = await decodeSnapshot(blob);
    expect(restored).toEqual(normal(career));
    const a = continueCareer(career, { single: true }), b = continueCareer(restored, { single: true });
    expect(a).toEqual(b);
    expect(normal(restored)).toEqual(normal(career));
    const fixture = Object.values(career.season.fixtures).find(f => f.home === career.clubId || f.away === career.clubId);
    career.date = fixture.date;
    startUserMatch(career, fixture.id);
    career.live = advanceMatch(career.live, 37, { ignorePauses: true });
    const resumed = await importSnapshotCode(await snapshotCode(await encodeSnapshot(career)));
    expect(resumed).toEqual(normal(career));
    expect(advanceMatch(resumed.live, 1)).toEqual(advanceMatch(career.live, 1));
    fs.mkdirSync('output/manager-global', { recursive: true });
    fs.writeFileSync('output/manager-global/save-initial-metrics.json', JSON.stringify({ year: career.year, players: Object.keys(career.world.players).length,
      clubs: Object.keys(career.world.clubs).length, fixtures: Object.keys(career.season.fixtures).length,
      rawBytes: Buffer.byteLength(JSON.stringify(normal(career))), compressedBytes: blob.size }, null, 2));
  }, 300000);

  it('keeps long careers bounded across forty annual turnovers without losing honours', async () => {
    const career = createCareer({ year: 1999, clubId: 'boca-juniors', managerName: 'Larga carrera', seed: 'SAVE-LONG' });
    const initialPlayers = Object.keys(career.world.players).length;
    const initialBlob = await encodeSnapshot(career);
    const checkpoints = [{ season: 0, players: initialPlayers, bytes: initialBlob.size }];
    // Exercise the actual retirement/regeneration lifecycle. This is an annual
    // turnover benchmark, not a claim to have played forty full match calendars.
    for (let season = 1; season <= 40; season++) {
      seasonTurnover(career);
      career.history.push({ year: career.year, clubId: career.clubId, position: 1, topScorer: career.lineup[0] });
      career.trophies.push({ year: career.year, type: 'league', leagueId: 'liga-profesional', name: 'Liga Profesional' });
      career.year++; career.world.year = career.year; career.date = `${career.year}-07-01`;
      pruneUnreferencedRetirees(career);
      if (season % 10 === 0) {
        const blob = await encodeSnapshot(career), restored = await decodeSnapshot(blob);
        expect(restored).toEqual(normal(career));
        expect(restored.history).toHaveLength(season);
        expect(restored.trophies).toHaveLength(season);
        checkpoints.push({ season, players: Object.keys(career.world.players).length, bytes: blob.size });
      }
    }
    // World size depends on active squads, rather than accumulating every retiree.
    expect(checkpoints.at(-1).players).toBeLessThan(initialPlayers * 3);
    expect(checkpoints.at(-1).bytes).toBeLessThan(initialBlob.size * 4);
    fs.writeFileSync('output/manager-global/save-long-career-metrics.json', JSON.stringify({ method: '40 actual annual turnover cycles; full world; no match results fabricated', checkpoints }, null, 2));
  }, 600000);
});
