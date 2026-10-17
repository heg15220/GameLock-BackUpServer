/** Self-contained, lossless snapshots. No dependency on a changing roster archive. */
import { compactCareer, expandCareer } from './save-codec.js';

export const SAVE_FORMAT = 'gamelock-manager';
export const CODE_PREFIX = 'GLM4';
export const MAX_SAVE_BYTES = 80 * 1024 * 1024;
export const MAX_COMPRESSED_BYTES = 24 * 1024 * 1024;
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// Columnar codec 2 (save-codec.js); codec 1 below is kept to read older saves.
export function packSnapshot(career) {
  return { format: SAVE_FORMAT, v: 4, codec: 2, data: compactCareer({ ...career, flags: { ...career.flags, stops: [] } }) };
}

// Codec 1: each object shape is written once. Arrays use tag -1; objects use a
// schema index. Missing properties stay missing (distinct from null).
export function packSnapshotV3(career) {
  const schemas = [], indexes = new Map();
  function pack(value) {
    if (Array.isArray(value)) return [-1, ...value.map(item => pack(item ?? null))];
    if (!object(value)) return value;
    const keys = Object.keys(value).filter(key => value[key] !== undefined);
    if (keys.some(key => forbidden.has(key))) throw Error('invalid-save-key');
    const signature = JSON.stringify(keys);
    let index = indexes.get(signature);
    if (index === undefined) { index = schemas.length; indexes.set(signature, index); schemas.push(keys); }
    return [index, ...keys.map(key => pack(value[key]))];
  }
  const root = pack({ ...career, flags: { ...career.flags, stops: [] } });
  return { format: SAVE_FORMAT, v: 3, codec: 1, schemas, root };
}

export function unpackSnapshot(data) {
  if (data?.format === SAVE_FORMAT && data.v === 4) {
    if (data.codec !== 2) throw Error('invalid-codec');
    return validateCareer(expandCareer(data.data));
  }
  if (data?.format !== SAVE_FORMAT || data.v !== 3) throw Error('invalid-save');
  // Existing .json/.json.gz exports remain importable.
  if (data.codec === undefined && data.career) return validateCareer(data.career);
  if (data.codec !== 1 || !Array.isArray(data.schemas) || data.schemas.length > 100000) throw Error('invalid-codec');
  for (const keys of data.schemas) {
    if (!Array.isArray(keys) || keys.length > 100000 || keys.some(key => typeof key !== 'string' || forbidden.has(key)) || new Set(keys).size !== keys.length) throw Error('invalid-schema');
  }
  let nodes = 0;
  function unpack(value, depth = 0) {
    if (++nodes > 12000000 || depth > 100) throw Error('save-too-complex');
    if (!Array.isArray(value)) {
      if (object(value) || (typeof value === 'number' && !Number.isFinite(value))) throw Error('invalid-value');
      return value;
    }
    const [tag, ...values] = value;
    if (tag === -1) return values.map(item => unpack(item, depth + 1));
    const keys = Number.isInteger(tag) && tag >= 0 ? data.schemas[tag] : null;
    if (!keys || keys.length !== values.length) throw Error('invalid-row');
    return Object.fromEntries(keys.map((key, index) => [key, unpack(values[index], depth + 1)]));
  }
  return validateCareer(unpack(data.root));
}

export function validateCareer(career) {
  if (!object(career) || career.v !== 3 || typeof career.seed !== 'string' || typeof career.managerName !== 'string'
    || !Number.isInteger(career.year) || !Number.isInteger(career.startYear) || career.year < career.startYear
    || !/^\d{4}-\d{2}-\d{2}$/.test(career.date) || !object(career.world)) throw Error('invalid-career');
  const { world, season } = career;
  for (const key of ['players', 'clubs', 'leagues', 'countries']) if (!object(world[key])) throw Error('invalid-world');
  if (!Object.hasOwn(world.clubs, career.clubId) || !object(season) || !object(season.fixtures) || !object(season.comps) || !object(season.byDate)) throw Error('invalid-season');
  for (const key of ['finances', 'transfers', 'scouting', 'academy', 'board', 'serial', 'tactics']) if (!object(career[key])) throw Error('invalid-career');
  for (const key of ['inbox', 'news', 'events', 'promises', 'history', 'trophies', 'lineup', 'bench', 'deepLeagues', 'recentResults']) if (!Array.isArray(career[key])) throw Error('invalid-career');
  for (const [id, player] of Object.entries(world.players)) {
    if (!object(player) || player.id !== id || typeof player.name !== 'string' || !Number.isFinite(player.ovr) || !object(player.attrs)
      || (player.clubId != null && !Object.hasOwn(world.clubs, player.clubId))) throw Error('invalid-player');
  }
  for (const [id, club] of Object.entries(world.clubs)) {
    if (!object(club) || club.id !== id || !Array.isArray(club.playerIds) || club.playerIds.some(pid => !Object.hasOwn(world.players, pid) || world.players[pid].clubId !== id)) throw Error('invalid-club');
  }
  return { ...career, flags: { ...career.flags, stops: [] } };
}

export async function encodeSnapshot(career) {
  // Materialise before the first await: play can continue during compression.
  const text = JSON.stringify(packSnapshot(career));
  const raw = new Blob([text], { type: 'application/json' });
  if (raw.size > MAX_SAVE_BYTES) throw Error('save-too-big');
  if (typeof CompressionStream === 'undefined') return raw;
  const blob = await new Response(raw.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  if (blob.size > MAX_COMPRESSED_BYTES) throw Error('save-too-big');
  return new Blob([blob], { type: 'application/gzip' });
}

export async function decodeSnapshot(blob) {
  if (!blob || blob.size > MAX_SAVE_BYTES) throw Error('save-too-big');
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  const compressed = head[0] === 0x1f && head[1] === 0x8b;
  if (compressed && (blob.size > MAX_COMPRESSED_BYTES || typeof DecompressionStream === 'undefined')) throw Error('compression-unavailable');
  const stream = compressed ? blob.stream().pipeThrough(new DecompressionStream('gzip')) : blob.stream();
  const reader = stream.getReader(), chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_SAVE_BYTES) { await reader.cancel(); throw Error('save-too-big'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const text = await new Blob(chunks).text();
  const data = JSON.parse(text, (key, value) => { if (forbidden.has(key)) throw Error('invalid-save-key'); return value; });
  return unpackSnapshot(data);
}

// CRC detects incomplete/altered copy-pastes without requiring a secure context.
// It is an integrity check, not authentication or anti-cheat.
function checksum(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export async function snapshotCode(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return `${CODE_PREFIX}.${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.${checksum(bytes)}`;
}

export async function importSnapshotCode(input) {
  if (typeof input !== 'string' || input.length > Math.ceil(MAX_SAVE_BYTES * 4 / 3) + 1000) throw Error('save-too-big');
  const code = input.replace(/\s/g, '');
  // GLM3 codes (codec 1) carry the same container and remain importable.
  const match = /^GLM[34]\.([A-Za-z0-9_-]+)\.([a-f0-9]{8})$/.exec(code);
  if (!match) throw Error('invalid-code');
  const binary = atob(match[1].replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (checksum(bytes) !== match[2]) throw Error('damaged-code');
  return decodeSnapshot(new Blob([bytes]));
}
