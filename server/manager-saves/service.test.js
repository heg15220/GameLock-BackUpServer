import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import os from 'node:os';
import path from 'node:path';
import { createManagerSaveService, parseCode, MAX_SAVE_BYTES } from './service.mjs';

const blob = (text = 'career') => gzipSync(JSON.stringify({ format: 'gamelock-manager', v: 4, text }));

describe('manager cloud saves', () => {
  let root, clock, service;
  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'manager-saves-'));
    clock = 1_000_000;
    service = createManagerSaveService({ root, retentionDays: 10, now: () => clock });
  });
  afterEach(() => rm(root, { recursive: true, force: true }));
  const slotDir = (code) => { const { id } = parseCode(code); return { id, dir: path.join(root, id.slice(0, 2), id.slice(2, 4)) }; };
  const blobs = async (dir) => (await readdir(dir)).filter((name) => name.endsWith('.gz')).sort();

  it('creates a short code that loads and keeps saving the same career from anywhere', async () => {
    const { code } = await service.create(blob('a'));
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect((await service.load(code)).bytes).toEqual(blob('a'));
    // Typed by hand on another device: lower case, no dashes, O for 0.
    const typed = code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o');
    const saved = await service.update(typed, blob('b'));
    expect(saved.version).toBe(2);
    expect((await service.load(code)).bytes).toEqual(blob('b'));
  });

  it('needs the key half of the code and rejects anything that is not a compressed save', async () => {
    const { code } = await service.create(blob());
    const { id } = parseCode(code);
    await expect(service.load(`${id}00000000`)).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.update(code, Buffer.from('{"plain":"json"}'.repeat(4)))).rejects.toMatchObject({ statusCode: 415 });
    await expect(service.create(Buffer.alloc(MAX_SAVE_BYTES + 1, 0x1f))).rejects.toMatchObject({ statusCode: 413 });
    await expect(service.load('not a code')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('expires careers nobody opens, and opening one keeps it alive', async () => {
    const kept = (await service.create(blob('kept'))).code;
    const left = (await service.create(blob('left'))).code;
    clock += 9 * 86_400_000;
    await service.load(kept);
    clock += 2 * 86_400_000;
    expect(await service.sweep()).toBe(1);
    await expect(service.load(left)).rejects.toMatchObject({ statusCode: 404 });
    expect((await service.load(kept)).bytes).toEqual(blob('kept'));
  });

  it('serialises saves of one career from many devices at once: no write is lost or interleaved', async () => {
    const { code } = await service.create(blob('v1'));
    const results = await Promise.all(Array.from({ length: 40 }, (_, i) => service.update(code, blob(`v${i + 2}`))));
    expect(results.map((r) => r.version).sort((a, b) => a - b)).toEqual(Array.from({ length: 40 }, (_, i) => i + 2));
    expect((await service.load(code)).bytes).toEqual(blob('v41'));
    // Reads in the middle of writes always get one whole, valid version.
    const mixed = await Promise.all(Array.from({ length: 30 }, (_, i) => (i % 2 ? service.update(code, blob(`w${i}`)) : service.load(code))));
    for (const r of mixed) if (Buffer.isBuffer(r.bytes)) expect(r.bytes.subarray(0, 2)).toEqual(Buffer.from([0x1f, 0x8b]));
    expect(await blobs(slotDir(code).dir)).toHaveLength(2);
  });

  it('keeps the previous version and serves it when the current file is damaged', async () => {
    const { code } = await service.create(blob('first'));
    await service.update(code, blob('second'));
    const { id, dir } = slotDir(code);
    expect(await blobs(dir)).toEqual([`${id}.v1.gz`, `${id}.v2.gz`]);
    await writeFile(path.join(dir, `${id}.v2.gz`), Buffer.from('torn write'));
    const loaded = await service.load(code);
    expect(loaded.bytes).toEqual(blob('first'));
    expect(loaded.version).toBe(1);
    // A third save drops the oldest file, never the one before the current.
    await service.update(code, blob('third'));
    expect(await blobs(dir)).toEqual([`${id}.v2.gz`, `${id}.v3.gz`]);
    expect((await service.load(code)).bytes).toEqual(blob('third'));
  });

  it('still opens and updates careers saved before versioned files', async () => {
    const { code } = await service.create(blob('old'));
    const { id, dir } = slotDir(code);
    const meta = JSON.parse(await readFile(path.join(dir, `${id}.json`), 'utf8'));
    delete meta.file;
    await rename(path.join(dir, `${id}.v1.gz`), path.join(dir, `${id}.gz`));
    await writeFile(path.join(dir, `${id}.json`), JSON.stringify(meta));
    expect((await service.load(code)).bytes).toEqual(blob('old'));
    await service.update(code, blob('new'));
    expect((await service.load(code)).bytes).toEqual(blob('new'));
    expect(await blobs(dir)).toEqual([`${id}.gz`, `${id}.v2.gz`]);
  });
});
