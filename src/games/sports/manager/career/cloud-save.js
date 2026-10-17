/**
 * Short codes for careers kept on the GameLock server (server/manager-saves).
 * The code is the career's key: with it, any device loads the career and keeps
 * saving it. The long self-contained code and the file still work offline.
 */
const BASE = String(import.meta.env?.VITE_MANAGER_SAVES_BACKEND_URL ?? '').replace(/\/$/, '');
const ENDPOINT = `${BASE}/api/manager-saves`;

/** XXXX-XXXX-XXXX-XXXX in any case, with or without dashes or spaces. */
export const looksLikeCloudCode = (input) => typeof input === 'string' && /^[0-9a-z]{4}[\s-]*[0-9a-z]{4}[\s-]*[0-9a-z]{4}[\s-]*[0-9a-z]{4}$/i.test(input.trim());

export function normalizeCloudCode(input) {
  const clean = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  return clean.match(/.{4}/g).join('-');
}

async function failure(response) {
  let code = `http-${response.status}`;
  try { code = (await response.json()).error || code; } catch { /* not json */ }
  const error = Error(code);
  error.status = response.status;
  return error;
}

/** Uploads a compressed snapshot. Updates `code` when given; creates a new slot otherwise or when it no longer exists. */
export async function uploadCloudSave(blob, code = null) {
  if (blob.type !== 'application/gzip') throw Error('compression-unavailable');
  if (code) {
    const response = await fetch(`${ENDPOINT}/${encodeURIComponent(code)}`, { method: 'PUT', headers: { 'Content-Type': 'application/gzip' }, body: blob });
    if (response.ok) return response.json();
    if (response.status !== 404) throw await failure(response);
  }
  const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/gzip' }, body: blob });
  if (!response.ok) throw await failure(response);
  return response.json();
}

export async function downloadCloudSave(code) {
  const response = await fetch(`${ENDPOINT}/${encodeURIComponent(normalizeCloudCode(code))}`);
  if (!response.ok) throw await failure(response);
  return new Blob([await response.arrayBuffer()], { type: 'application/gzip' });
}
