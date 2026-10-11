import { describe, it, expect } from 'vitest';
import { getArchiveCoverage } from './archive-coverage.js';
import { linkedPlayerIdentity, unambiguousSeasonPlayers } from './season-roster-archive.js';
import research from './research-season-rosters.json';
import { getManagerWorld } from './data.js';

describe('historical archive expansion', () => {
  it('publishes the dated Deportivo list with its actual row count and reuse licence', () => {
    const club = getArchiveCoverage(2011).find(r => r.id === 'laliga-2').clubs.find(c => c.id === 'deportivo-la-coruna');
    expect(club).toMatchObject({hasList:true, rows:25, precision:'exact-snapshot', license:'CC-BY-SA-4.0'});
    expect(club.source).toContain('oldid=49439402');
  });
  it('never treats a shared source file as a unique person', () => {
    expect(linkedPlayerIdentity({ identitySource: 'https://raw.githubusercontent.com/openfootball/players/main/fr.players.txt' })).toBeNull();
    expect(linkedPlayerIdentity({ identitySource: 'https://figshare.com/articles/dataset/Players/7765196' })).toBeNull();
    expect(linkedPlayerIdentity({ researchPlayerId: 40810 })).not.toEqual(linkedPlayerIdentity({ researchPlayerId: 3334 }));
    expect(linkedPlayerIdentity({ wikidataId: 'Q615', identityPageId: 42 })).toBe('wikidata:Q615');
    expect(linkedPlayerIdentity({identityWiki:'es',identityPageId:42})).toBe('es.wikipedia.org:42');
    expect(linkedPlayerIdentity({identityWiki:'es',identityPageId:42})).not.toBe(linkedPlayerIdentity({identityPageId:42}));
  });
  it('joins identity bridges without conflating unrelated people with the same birthday', () => {
    const id = p => `${p.name}:${p.birthYear}`;
    const records = [
      ['one', { players: [{ name: 'A', birthYear: 1990, wikidataId: 'Q1', identityPageId: 1 }, { name: 'B', birthYear: 1990 }] }],
      ['two', { players: [{ name: 'Alias', birthYear: 1990, identityPageId: 1 }] }],
      ['one', { license: 'CC0-1.0', players: [{ name: 'C', birthYear: 1990 }] }],
    ];
    const result = unambiguousSeasonPlayers(records, id);
    expect(result.map(p => p.name)).toEqual(['B', 'C']);
    expect(result[1].record.license).toBe('CC0-1.0');
  });
  it('retains every linked identity when a later source supplies the displayed row', () => {
    const records = [
      ['one', { players: [{ name:'A',birthYear:1990,wikidataId:'Q1',identityPageId:12 }] }],
      ['one', { players: [{ name:'A',birthYear:1990,identityWiki:'es',identityPageId:34 }] }],
      ['one', { license:'CC0-1.0',players:[{name:'A',birthYear:1990}] }],
    ];
    const [player] = unambiguousSeasonPlayers(records, p=>`${p.name}:${p.birthYear}`);
    expect(player.record.license).toBe('CC0-1.0');
    expect(player.identityKeys).toEqual(expect.arrayContaining(['wikidata:Q1','en.wikipedia.org:12','es.wikipedia.org:34']));
  });
  it('retains attribution and only imports match-sheet observations before the starting date', () => {
    const records = Object.values(research.seasons[2017]);
    expect(records).toHaveLength(98);
    const owners = new Map();
    for (const [club, record] of Object.entries(research.seasons[2017])) {
      expect(record).toMatchObject({ license: 'CC-BY-4.0', evidenceCutoff: '2017-09-01', precision: 'season' });
      expect(record.attribution).toContain('Pappalardo');
      expect(record.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      for (const player of record.players) {
        expect(owners.has(player.researchPlayerId)).toBe(false);
        owners.set(player.researchPlayerId, club);
        expect(player.observations.length).toBeGreaterThan(0);
        expect(player.observations.every(o => o.date >= '2017-07-01' && o.date <= record.evidenceCutoff && o.matchId > 0)).toBe(true);
      }
    }
    // Guedes appears for PSG and Valencia during the source season. No transfer
    // date is inferred from those appearances; the ambiguous identity is omitted.
    expect(owners.has(237034)).toBe(false);
    expect(owners.get(40810)).toBe('paris-saint-germain');
    const world = getManagerWorld(2017), imported = world.players.filter(p => p.source === 'research-match-sheet');
    expect(imported.length).toBeGreaterThan(1400);
    for (const p of imported) {
      expect(p).toMatchObject({ sourceLicense: 'CC-BY-4.0', membershipPrecision: 'season', ratingSource: 'club-age-model-estimate' });
      expect(p.membershipVerified).not.toBe(true);
      expect(p.sourceAttribution).toContain('Pappalardo');
    }
    expect(world.players.filter(p => p.birthYear === 1984 && /Iniesta/.test(p.name))).toHaveLength(1);
    for (const [id, nationality] of [[3915, 'CRC'], [3433, 'URU'], [3384, 'MEX']]) {
      const fact = records.flatMap(r => r.players).find(p => p.researchPlayerId === id);
      expect(fact.nationality).toBe(nationality);
    }
    expect(world.clubs.find(c => c.id === 'sd-eibar').rosterCoverage.complete).toBe(false);
  });
  it('distinguishes known participants, source lists and transfer dates in all 1836 league-years', () => {
    let count = 0;
    for (let year = 1990; year <= 2025; year++) for (const row of getArchiveCoverage(year)) {
      count++;
      expect(row.clubsWithLists).toBeLessThanOrEqual(row.clubs.length);
      expect(row.windows.year).toBe(year);
      if (!row.membership.available) expect(row.clubs).toHaveLength(0);
    }
    expect(count).toBe(1836);
    const spain = getArchiveCoverage(2017).find(r => r.id === 'laliga');
    expect(spain.clubsWithLists).toBe(20);
    expect(spain.clubs.every(c => c.source && c.license)).toBe(true);
    expect(getArchiveCoverage(1990).find(r => r.id === 'liga-dominicana-de-futbol').clubsWithLists).toBe(0);
  });
});
