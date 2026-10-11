/** Small original LZW codec for self-contained JSON snapshots in localStorage.
 * Codes avoid control characters and UTF-16 surrogate ranges. No remote baseline
 * is needed to restore an old career after the shipped dataset changes.
 */
const RESET = 54000;
export function packSnapshot(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (!bytes.length) return '';
  let dictionary = new Map();
  let next = 256;
  let prefix = bytes[0];
  const output = [];
  for (let i = 1; i < bytes.length; i += 1) {
    const byte = bytes[i];
    const key = prefix * 256 + byte;
    const existing = dictionary.get(key);
    if (existing !== undefined) { prefix = existing; continue; }
    output.push(String.fromCharCode(prefix + 256));
    if (next < RESET) dictionary.set(key, next++);
    else { output.push(String.fromCharCode(RESET + 256)); dictionary = new Map(); next = 256; }
    prefix = byte;
  }
  output.push(String.fromCharCode(prefix + 256));
  return output.join('');
}
export function unpackSnapshot(packed) {
  if (typeof packed !== 'string' || packed.length > 12000000) throw new Error('La instantánea guardada no es válida.');
  let dictionary = Array.from({ length: 256 }, (_, i) => [i]);
  let next = 256;
  let previous = null;
  const output = [];
  for (const char of packed) {
    const code = char.charCodeAt(0) - 256;
    if (code === RESET) { dictionary = Array.from({ length: 256 }, (_, i) => [i]); next = 256; previous = null; continue; }
    const entry = dictionary[code] || (code === next && previous ? [...previous, previous[0]] : null);
    if (!entry) throw new Error('La instantánea guardada está dañada.');
    for (const byte of entry) output.push(byte);
    if (output.length > 50000000) throw new Error('La instantánea guardada supera el tamaño admitido.');
    if (previous && next < RESET) dictionary[next++] = [...previous, entry[0]];
    previous = entry;
  }
  return JSON.parse(new TextDecoder().decode(new Uint8Array(output)));
}
