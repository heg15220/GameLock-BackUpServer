/**
 * Display copies of the football artwork for Modo mánager.
 *
 * Crests, trophies and league logos are kept as documented originals (their
 * SHA-256 is recorded in artwork-sources.json), but they weigh 195 MB and the
 * game shows them at 13–120 px. This writes two WebP copies of each one,
 * 64 px and 192 px on the long side, to public/assets/football/thumbs/
 * (`<folder>/<original name>.<size>.webp`), which
 * the game's Crest component loads first (the original stays the fallback).
 *
 *   SHARP_FROM=<folder with node_modules/sharp> node scripts/build-manager-thumbnails.mjs
 *
 * Unchanged files are skipped, so it can run again after new artwork arrives.
 */
import { createRequire } from "node:module";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(process.env.SHARP_FROM ? pathToFileURL(path.join(process.env.SHARP_FROM, "x.js")) : import.meta.url);
const sharp = require("sharp");

const art = path.join(root, "public/assets/football");
const out = path.join(art, "thumbs");
const FOLDERS = ["crests", "trophies", "competitions"];
export const THUMB_SIZES = [64, 192];

const jobs = [];
for (const folder of FOLDERS) {
  await mkdir(path.join(out, folder), { recursive: true });
  for (const name of await readdir(path.join(art, folder))) {
    if (!/\.(svg|png|jpe?g|webp|gif)$/i.test(name)) continue;
    jobs.push({ folder, name });
  }
}

let made = 0, skipped = 0;
const failed = [];
async function run({ folder, name }) {
  const source = path.join(art, folder, name);
  const info = await stat(source);
  for (const size of THUMB_SIZES) {
    const target = path.join(out, folder, `${name}.${size}.webp`);
    const done = await stat(target).catch(() => null);
    if (done && done.mtimeMs >= info.mtimeMs) { skipped += 1; continue; }
    // Vector art is rasterised at a density that leaves the resize something to work with.
    const input = /\.svg$/i.test(name) ? sharp(source, { density: 216, limitInputPixels: false }) : sharp(source, { limitInputPixels: false, animated: false });
    await input
      .resize({ width: size, height: size, fit: "inside", withoutEnlargement: false })
      .webp({ quality: 84, alphaQuality: 90, effort: 5 })
      .toFile(target);
    made += 1;
  }
}

const queue = jobs.slice();
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const job = queue.shift();
    try { await run(job); } catch (error) { failed.push(`${job.folder}/${job.name}: ${error.message}`); }
  }
}));
console.log(`thumbnails: ${made} written, ${skipped} up to date, ${failed.length} failed`);
if (failed.length) { console.log(failed.join("\n")); process.exitCode = 1; }
