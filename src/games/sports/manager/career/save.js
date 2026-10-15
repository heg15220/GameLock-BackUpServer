/**
 * Saving. A career holds the whole world (~18,000 players and every fixture of
 * the season), far beyond localStorage, so it lives in IndexedDB. Export and
 * import use a gzip-compressed JSON file when the browser supports it.
 */
import { CAREER_VERSION } from './career.js';

const DB_NAME = 'gamelock-manager';
const STORE = 'careers';
const KEY = 'autosave-v3';

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function strip(career) {
  const { live, flags, ...rest } = career;
  return { ...rest, live: live || null, flags: { stops: [] } };
}

export async function saveCareer(career) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ savedAt: new Date().toISOString(), summary: summarize(career), career: strip(career) }, KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

export async function loadCareer() {
  try {
    const db = await openDb();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!record?.career || record.career.v !== CAREER_VERSION) return null;
    return { ...record, career: { ...record.career, flags: { stops: [] } } };
  } catch {
    return null;
  }
}

export async function loadSummary() {
  const record = await loadCareer();
  return record ? { savedAt: record.savedAt, ...record.summary } : null;
}

export async function deleteSave() {
  try {
    const db = await openDb();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
    db.close();
  } catch { /* nothing saved */ }
}

export function summarize(career) {
  const club = career.world.clubs[career.clubId];
  return { manager: career.managerName, clubId: career.clubId, clubName: club?.name, crest: club?.crest, color: club?.color, date: career.date, year: career.year, startYear: career.startYear };
}

async function gzip(text) {
  if (typeof CompressionStream === 'undefined') return new Blob([text], { type: 'application/json' });
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

async function gunzip(blob) {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (head[0] === 0x1f && head[1] === 0x8b && typeof DecompressionStream !== 'undefined') {
    return new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  return blob.text();
}

export async function exportCareer(career) {
  const text = JSON.stringify({ format: 'gamelock-manager', v: CAREER_VERSION, career: strip(career) });
  const blob = await gzip(text);
  const compressed = blob.type !== 'application/json';
  const club = career.world.clubs[career.clubId];
  const name = `manager-${(club?.short || club?.name || 'club').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${career.date}.json${compressed ? '.gz' : ''}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function importCareer(file) {
  if (file.size > 80 * 1024 * 1024) throw new Error('too-big');
  const text = await gunzip(file);
  const data = JSON.parse(text);
  if (data?.format !== 'gamelock-manager' || data.v !== CAREER_VERSION || !data.career?.world) throw new Error('invalid');
  return { ...data.career, flags: { stops: [] } };
}
