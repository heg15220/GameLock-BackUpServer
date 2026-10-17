/**
 * Modo mánager: one lazy chunk per season instead of ~70 MB of archives in the
 * game's bundle (see src/games/sports/manager/season-slices.js).
 *
 * `virtual:manager-season-archives` exports the archives' metadata, the
 * seasons covered and a loader per season. Under Vitest it imports the full
 * JSON files instead and cuts slices on demand, synchronously, so tests keep
 * calling the data layer for any year without preloading.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { archiveMeta, seasonYears, sliceSeason } from "../src/games/sports/manager/season-slices.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "src/games/sports/manager");
const FILES = {
  historical: "historical-rosters.json",
  wikimedia: "wikimedia-rosters.json",
  cc0: "cc0-season-rosters.json",
  research: "research-season-rosters.json",
  multilingual: "multilingual-season-rosters.json",
  verified: "verified-player-careers.json",
};
const INDEX = "virtual:manager-season-archives";
const SEASON = "virtual:manager-season/";
const posix = (file) => file.split(path.sep).join("/");

export default function managerSeasons() {
  let archives = null;
  const load = () => {
    archives ??= Object.fromEntries(Object.entries(FILES).map(([key, file]) => [key, JSON.parse(readFileSync(path.join(dir, file), "utf8"))]));
    return archives;
  };
  const test = Boolean(process.env.VITEST);
  return {
    name: "manager-season-archives",
    resolveId(id) {
      if (id === INDEX || id.startsWith(SEASON)) return `\0${id}`;
      return null;
    },
    load(id) {
      if (!id.startsWith("\0virtual:manager-season")) return null;
      for (const file of Object.values(FILES)) this.addWatchFile(path.join(dir, file));
      if (id === `\0${INDEX}`) {
        if (test) {
          const imports = Object.entries(FILES).map(([key, file]) => `import ${key} from ${JSON.stringify(posix(path.join(dir, file)))};`).join("\n");
          return `${imports}
import { archiveMeta, seasonYears, sliceSeason } from ${JSON.stringify(posix(path.join(dir, "season-slices.js")))};
const archives = { ${Object.keys(FILES).join(", ")} };
export const meta = archiveMeta(archives);
export const years = seasonYears(archives);
const cache = new Map();
export const eager = (year) => { const y = Number(year); if (!cache.has(y)) cache.set(y, sliceSeason(archives, y)); return cache.get(y); };
export const loaders = null;`;
        }
        const data = load();
        const years = seasonYears(data);
        const loaders = years.map((year) => `  ${year}: () => import(${JSON.stringify(SEASON + year)})`).join(",\n");
        return `export const meta = JSON.parse(${JSON.stringify(JSON.stringify(archiveMeta(data)))});
export const years = ${JSON.stringify(years)};
export const eager = null;
export const loaders = {
${loaders}
};`;
      }
      const year = Number(id.slice(`\0${SEASON}`.length));
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(sliceSeason(load(), year)))});`;
    },
  };
}
