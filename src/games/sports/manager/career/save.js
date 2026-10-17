/** Compressed local autosave and self-contained portable files/codes. */
import { encodeSnapshot, decodeSnapshot, snapshotCode, importSnapshotCode, validateCareer } from './save-format.js';
import { looksLikeCloudCode, normalizeCloudCode, uploadCloudSave, downloadCloudSave } from './cloud-save.js';

const DB_NAME = 'gamelock-manager';
const STORE = 'careers';
const KEY = 'autosave-v3';
const SUMMARY_KEY = 'autosave-v3-summary';
const CLOUD_KEY = 'cloud-codes-v1';
let pendingWrite = Promise.resolve();

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no-indexeddb')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction(mode, action) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error('save-aborted'));
    });
  } finally { db.close(); }
}

export function saveCareer(career) {
  const savedAt = new Date().toISOString(), summary = summarize(career);
  // Snapshot now; serialize writes in request order even if compression of a
  // later, smaller snapshot finishes first. A failed save does not poison the queue.
  const encoded = encodeSnapshot(career);
  encoded.catch(() => {});
  const operation = pendingWrite.catch(() => {}).then(async () => {
    const blob = await encoded;
    await transaction('readwrite', store => {
      store.put({ savedAt, summary, blob }, KEY);
      return store.put({ savedAt, ...summary, bytes: blob.size }, SUMMARY_KEY);
    });
    return { bytes: blob.size, savedAt };
  });
  pendingWrite = operation;
  return operation;
}

export async function loadCareer() {
  try {
    await pendingWrite.catch(() => {});
    const record = await transaction('readonly', store => store.get(KEY));
    if (!record) return null;
    const career = record.blob ? await decodeSnapshot(record.blob) : validateCareer(record.career);
    return { savedAt: record.savedAt, summary: record.summary, career };
  } catch { return null; }
}

export async function loadSummary() {
  try {
    await pendingWrite.catch(() => {});
    const summary = await transaction('readonly', store => store.get(SUMMARY_KEY));
    if (summary) return summary;
    // Compatibility with the previous uncompressed IndexedDB record.
    const record = await transaction('readonly', store => store.get(KEY));
    return record?.summary ? { savedAt: record.savedAt, ...record.summary } : null;
  } catch { return null; }
}

export function deleteSave() {
  const operation = pendingWrite.catch(() => {}).then(() => transaction('readwrite', store => {
    store.delete(KEY);
    return store.delete(SUMMARY_KEY);
  }));
  pendingWrite = operation;
  return operation;
}

export function summarize(career) {
  const club = career.world.clubs[career.clubId];
  return { manager: career.managerName, clubId: career.clubId, clubName: club?.name, crest: club?.crest, color: club?.color, date: career.date, year: career.year, startYear: career.startYear };
}

export async function prepareExport(career) {
  const date = career.date, club = career.world.clubs[career.clubId];
  const slug = (club?.short || club?.name || 'club').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const blob = await encodeSnapshot(career);
  return { blob, code: await snapshotCode(blob), name: `manager-${slug}-${date}.json${blob.type === 'application/gzip' ? '.gz' : ''}`, date };
}

export function downloadExport({ blob, name }) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportCareer(career) { downloadExport(await prepareExport(career)); }

/** The short code of each career on this device, by career seed. */
async function cloudCodes() {
  try { return (await transaction('readonly', store => store.get(CLOUD_KEY))) || {}; } catch { return {}; }
}
export async function getCloudCode(career) { return (await cloudCodes())[career.seed] || null; }
async function rememberCloudCode(seed, code) {
  const codes = await cloudCodes();
  codes[seed] = code;
  // A device keeps the codes of its latest careers only.
  const entries = Object.entries(codes).slice(-20);
  await transaction('readwrite', store => store.put(Object.fromEntries(entries), CLOUD_KEY)).catch(() => {});
}

/** Stores the export on the server under the career's short code (created on first use). */
export async function saveToCloud(career, blob) {
  const result = await uploadCloudSave(blob, await getCloudCode(career));
  await rememberCloudCode(career.seed, result.code);
  return result;
}

export async function importCareer(fileOrCode) {
  if (typeof fileOrCode === 'string' && looksLikeCloudCode(fileOrCode)) {
    const code = normalizeCloudCode(fileOrCode.trim());
    const career = await decodeSnapshot(await downloadCloudSave(code));
    // Saving on this device keeps updating the same code.
    await rememberCloudCode(career.seed, code);
    return career;
  }
  return typeof fileOrCode === 'string' ? importSnapshotCode(fileOrCode) : decodeSnapshot(fileOrCode);
}
