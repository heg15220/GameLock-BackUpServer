/**
 * Writes `<file>.gz` next to every compressible file of the build, at the
 * highest gzip level, so nginx (`gzip_static on`) sends them without
 * compressing anything per request: less CPU under load and smaller transfers
 * than on-the-fly gzip. Originals stay for clients that do not accept gzip.
 *
 *   node scripts/precompress-dist.mjs [dist]
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { constants, gzip } from "node:zlib";
import { promisify } from "node:util";

const gz = promisify(gzip);
const dist = path.resolve(process.argv[2] || "dist");
const COMPRESSIBLE = /\.(js|mjs|css|html|json|svg|txt|xml|webmanifest|map|wasm|ttf|otf|ico)$/i;
const MIN_BYTES = 1024;

const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (COMPRESSIBLE.test(entry.name)) files.push(full);
  }
}
await walk(dist);

let written = 0, before = 0, after = 0;
const queue = files.slice();
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) {
    const file = queue.shift();
    const info = await stat(file);
    if (info.size < MIN_BYTES) continue;
    const target = `${file}.gz`;
    const done = await stat(target).catch(() => null);
    if (done && done.mtimeMs >= info.mtimeMs) continue;
    const data = await readFile(file);
    const packed = await gz(data, { level: constants.Z_BEST_COMPRESSION, memLevel: 9 });
    // Only worth serving when it saves something.
    if (packed.length >= data.length * 0.95) continue;
    await writeFile(target, packed);
    written += 1; before += data.length; after += packed.length;
  }
}));
console.log(`precompressed ${written} files: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB`);
