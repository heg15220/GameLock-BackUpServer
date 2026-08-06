/**
 * Build the world dataset Trayectoria ships with.
 *
 * Reads the raw competition/country tables plus the crest manifest produced by
 * scripts/fetch-football-crests.py, and emits a single compact JSON keyed by id:
 * competitions, clubs and countries with their reputations and local asset paths.
 *
 *   node scripts/build-trayectoria-world.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "scripts", "data");
const ASSETS = path.join(ROOT, "public", "assets", "football");
const OUT = path.join(ROOT, "src", "games", "sports", "trayectoria", "world.data.json");

const readJson = (file, fallback = null) => {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
};

const competitionsRaw = readJson(path.join(DATA, "football-world.competitions.json"), []);
const countriesRaw = readJson(path.join(DATA, "football-world.countries.json"), []);
const manifest = readJson(path.join(ASSETS, "manifest.json"), { clubs: {}, competitions: {}, flags: {} });

/**
 * Index what is actually on disk, by basename. The manifest is only written when a fetch
 * run finishes, so trusting it alone would drop every crest from an interrupted or
 * still-running download.
 */
const indexBucket = (bucket) => {
  const dir = path.join(ASSETS, bucket);
  if (!fs.existsSync(dir)) return {};
  return Object.fromEntries(
    fs.readdirSync(dir).filter((f) => !f.startsWith(".")).map((f) => [path.parse(f).name, f]),
  );
};

const onDisk = {
  crests: indexBucket("crests"),
  competitions: indexBucket("competitions"),
  flags: indexBucket("flags"),
};

const assetPath = (bucket, key, record) => {
  const file = onDisk[bucket][key] ?? record?.file;
  return file ? `/assets/football/${bucket}/${file}` : null;
};

/**
 * League strength 0-5, from the mean international reputation of its clubs. It scales
 * the Golden Boot so that goals in a weak league still count, just for less.
 */
const strengthOf = (teams) => {
  if (!teams.length) return 0;
  const mean =
    teams.reduce((sum, team) => sum + (team.international_reputation ?? 0), 0) / teams.length;
  return Math.max(0, Math.min(5, Math.round(mean)));
};

const competitions = {};
const clubs = {};

for (const comp of competitionsRaw) {
  competitions[comp.id] = {
    id: comp.id,
    name: comp.name,
    country_fifa_code: comp.country_fifa_code,
    confederation: comp.confederation,
    tier: comp.tier ?? 1,
    strength: strengthOf(comp.teams ?? []),
    domesticCupId: comp.domestic_cup_id ?? null,
    logo: assetPath("competitions", comp.id, manifest.competitions?.[comp.id]),
  };

  for (const team of comp.teams ?? []) {
    clubs[team.id] = {
      id: team.id,
      name: team.name,
      shortName: team.short_name ?? team.name,
      abbreviation: team.abbreviation ?? team.name.slice(0, 3).toUpperCase(),
      color: team.primary_color ?? "#1f2937",
      competitionId: comp.id,
      domestic_reputation: team.domestic_reputation ?? 0,
      continental_reputation: team.continental_reputation ?? 0,
      international_reputation: team.international_reputation ?? 0,
      crest: assetPath("crests", team.id, manifest.clubs?.[team.id]),
    };
  }
}

const countries = {};
for (const country of countriesRaw) {
  countries[country.fifa_code] = {
    fifa: country.fifa_code,
    iso2: country.iso_alpha2,
    name_es: country.name_es,
    name_en: country.name_en,
    confederation: country.confederation,
    continental_reputation: country.continental_reputation ?? 0,
    fifa_reputation: country.fifa_reputation ?? 0,
    international_reputation: country.international_reputation ?? 0,
    color: country.primary_color ?? "#1f2937",
    kit: [
      country.kit_primary_color ?? country.primary_color ?? "#1f2937",
      country.kit_secondary_color ?? "#ffffff",
      country.kit_tertiary_color ?? "#111827",
    ],
    flag: assetPath("flags", country.slug, manifest.flags?.[country.fifa_code]),
  };
}

const world = { competitions, clubs, countries };
fs.writeFileSync(OUT, `${JSON.stringify(world)}\n`, "utf8");

const withCrest = Object.values(clubs).filter((c) => c.crest).length;
const withLogo = Object.values(competitions).filter((c) => c.logo).length;
const withFlag = Object.values(countries).filter((c) => c.flag).length;
const playable = Object.values(countries).filter((c) =>
  Object.values(competitions).some((comp) => comp.country_fifa_code === c.fifa),
).length;

console.log(`competitions ${Object.keys(competitions).length} (${withLogo} with logo)`);
console.log(`clubs        ${Object.keys(clubs).length} (${withCrest} with crest)`);
console.log(`countries    ${Object.keys(countries).length} (${withFlag} with flag, ${playable} with a league)`);
console.log(`-> ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
