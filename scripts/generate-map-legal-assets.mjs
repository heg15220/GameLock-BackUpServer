import fs from "node:fs";
import path from "node:path";
import { MAP_COUNTRY_GROUPS } from "../src/games/knowledge/mapsCountryGroupsData.js";

const ROOT = process.cwd();
const OUTPUT_DIRECTORY = path.join(ROOT, "public", "legal");
const OUTPUT_PATH = path.join(OUTPUT_DIRECTORY, "map-country-metadata-odbl.json");

fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
fs.writeFileSync(
  OUTPUT_PATH,
  `${JSON.stringify({
    name: "GameLock map country metadata",
    source: "https://github.com/mledoze/countries",
    license: "ODbL-1.0",
    licenseUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
    description: "Country names, translations, aliases and regional groupings used by the map games.",
    data: MAP_COUNTRY_GROUPS
  }, null, 2)}\n`,
  "utf8"
);

console.log(`Map legal data generated: ${path.relative(ROOT, OUTPUT_PATH)}`);
