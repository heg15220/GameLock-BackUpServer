import { describe, it, expect, vi } from 'vitest';
import { packSnapshot, packSnapshotV3, unpackSnapshot, encodeSnapshot, decodeSnapshot, snapshotCode, importSnapshotCode } from './save-format.js';
import { pruneUnreferencedRetirees } from './maintenance.js';

function fixture(count = 4) {
  const players = Object.fromEntries(Array.from({ length: count }, (_, i) => [`p${i}`, { id: `p${i}`, name: `Álex ${i}`, clubId: 'club', ovr: 68 + i % 12, attrs: { pac: 71.125, sho: 60 }, stats: {}, real: i % 2 === 0, retired: false }]));
  return { v: 3, seed: 'TEST', managerName: 'Mánager', year: 2040, startYear: 1990, date: '2040-11-06', clubId: 'club',
    world: { players, clubs: { club: { id: 'club', name: 'Equipo', playerIds: Object.keys(players) } }, leagues: {}, countries: {} },
    season: { fixtures: { f: { id: 'f', hg: null, ag: null } }, comps: {}, byDate: {} },
    finances: { balance: 123.456 }, transfers: { pending: [{ player: 'p0', date: '2041-01-01' }] }, scouting: {}, academy: {}, board: {}, serial: {}, tactics: {},
    inbox: [], news: [], events: [], promises: [], history: Array.from({ length: 50 }, (_, i) => ({ year: 1990 + i, topScorer: 'p0', points: 70 })),
    trophies: [{ year: 1999, name: 'Copa' }], lineup: ['p0'], bench: [], deepLeagues: [], recentResults: [],
    live: { clock: 71.37, score: [2, 1], phase: 'playing', ball: { x: 27.54, y: 38.75 }, rng: 47183 }, flags: { stops: [], reveal: { id: 'new-player' } } };
}

describe('portable career snapshots', () => {
  it('preserves all state, numbers, nulls, array shapes and fifty seasons', async () => {
    const career = fixture(500);
    expect(unpackSnapshot(packSnapshot(career))).toEqual(career);
    const blob = await encodeSnapshot(career);
    expect(blob.size).toBeLessThan(JSON.stringify(career).length / 4);
    expect(await decodeSnapshot(blob)).toEqual(career);
    const code = await snapshotCode(blob);
    expect(code).toMatch(/^GLM4\./);
    expect(await importSnapshotCode(`  ${code.slice(0, 60)}\n${code.slice(60)}  `)).toEqual(career);
  });
  it('captures before asynchronous compression so later actions do not alter the save', async () => {
    const career = fixture();
    const encoding = encodeSnapshot(career);
    career.finances.balance = 0;
    expect((await decodeSnapshot(await encoding)).finances.balance).toBe(123.456);
  });
  it('imports the previous JSON and gzip file format', async () => {
    const career = fixture();
    const raw = new Blob([JSON.stringify({ format: 'gamelock-manager', v: 3, career })]);
    expect(await decodeSnapshot(raw)).toEqual(career);
    const compressed = await new Response(raw.stream().pipeThrough(new CompressionStream('gzip'))).blob();
    expect(await decodeSnapshot(compressed)).toEqual(career);
  });
  it('supports browsers without native compression', async () => {
    vi.stubGlobal('CompressionStream', undefined);
    try {
      const career = fixture(), blob = await encodeSnapshot(career);
      expect(blob.type).toBe('application/json');
      expect(await importSnapshotCode(await snapshotCode(blob))).toEqual(career);
    } finally { vi.unstubAllGlobals(); }
  });
  it('rejects truncated, altered, unsupported and malformed saves', async () => {
    const code = await snapshotCode(await encodeSnapshot(fixture()));
    await expect(importSnapshotCode(code.slice(0, -1))).rejects.toThrow();
    await expect(importSnapshotCode(code.slice(0, -8) + '00000000')).rejects.toThrow('damaged-code');
    await expect(decodeSnapshot(new Blob(['{"format":"gamelock-manager","v":3,"career":{"world":{}}}']))).rejects.toThrow();
    const packed = packSnapshot(fixture());
    packed.codec = 99;
    expect(() => unpackSnapshot(packed)).toThrow('invalid-codec');
    const old = packSnapshotV3(fixture());
    old.codec = 99;
    expect(() => unpackSnapshot(old)).toThrow('invalid-codec');
  });
  it('rejects invalid shape references and prototype keys', () => {
    const packed = packSnapshotV3(fixture());
    packed.schemas[0][0] = '__proto__';
    expect(() => unpackSnapshot(packed)).toThrow('invalid-schema');
    const broken = packSnapshotV3(fixture());
    broken.root[0] = 999999;
    expect(() => unpackSnapshot(broken)).toThrow('invalid-row');
    const table = packSnapshot(fixture(100));
    const players = table.data.career.world.players[2];
    players.f[0] = '__proto__';
    expect(() => unpackSnapshot(table)).toThrow('invalid-save-key');
    const short = packSnapshot(fixture(100));
    short.data.career.world.players[2].n = 101;
    expect(() => unpackSnapshot(short)).toThrow();
    const squad = packSnapshot(fixture(100));
    squad.data.career.world.clubs.club.playerIds = [100];
    expect(() => unpackSnapshot(squad)).toThrow('invalid-club');
  });
  it('still opens codes and files written by the previous codec', async () => {
    const career = fixture(300);
    const text = JSON.stringify(packSnapshotV3(career));
    const blob = await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).blob();
    const code = (await snapshotCode(blob)).replace(/^GLM4\./, 'GLM3.');
    expect(await importSnapshotCode(code)).toEqual(career);
    expect(await decodeSnapshot(blob)).toEqual(career);
  });
  it('keeps key order, derived indexes and ids identical through the columnar codec', () => {
    const career = fixture(200);
    career.world.players.p7.name = 'Íñigo Martínez'; career.world.players['inigo-martinez'] = { ...career.world.players.p7, id: 'inigo-martinez' };
    delete career.world.players.p7; career.world.clubs.club.playerIds = Object.keys(career.world.players).reverse();
    career.season.fixtures = Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`L:x:${i}`, { done: i < 5, hg: i < 5 ? 1 : null, ag: null, id: `L:x:${i}`, date: `2040-0${1 + (i % 3)}-01` }]));
    career.season.byDate = {};
    for (const f of Object.values(career.season.fixtures)) (career.season.byDate[f.date] ||= []).push(f.id);
    career.season = { byDate: career.season.byDate, fixtures: career.season.fixtures, comps: {} };
    const restored = unpackSnapshot(JSON.parse(JSON.stringify(packSnapshot(career))));
    expect(JSON.stringify(restored)).toBe(JSON.stringify(career));
  });
  it('does not confuse null with absent fields or interpret literal arrays as tags', () => {
    const career = fixture();
    career.custom = { empty: {}, no: null, missing: undefined, array: [0, [-1, 0], [], null] };
    const restored = unpackSnapshot(packSnapshot(career));
    expect(restored.custom).toEqual({ empty: {}, no: null, array: [0, [-1, 0], [], null] });
  });
});

describe('long-career retention', () => {
  it('preserves indirect references between former players', () => {
    const career = fixture();
    career.world.players.p0.retired = true;
    career.world.players.p1.retired = true;
    career.world.players.p0.mentor = 'p1';
    career.world.clubs.club.playerIds = ['p2', 'p3'];
    expect(pruneUnreferencedRetirees(career)).toBe(0);
    expect(career.world.players.p1).toBeDefined();
  });
  it('removes only retirees without any reference and keeps the whole managerial history', () => {
    const career = fixture();
    for (const id of ['p0', 'p1', 'p2']) career.world.players[id].retired = true;
    career.world.clubs.club.playerIds = ['p3'];
    career.scouting = { reports: { p1: { summary: 'Remember me' } } };
    const history = structuredClone(career.history);
    expect(pruneUnreferencedRetirees(career)).toBe(1);
    expect(Object.keys(career.world.players)).toEqual(['p0', 'p1', 'p3']);
    expect(career.history).toEqual(history);
  });
});
