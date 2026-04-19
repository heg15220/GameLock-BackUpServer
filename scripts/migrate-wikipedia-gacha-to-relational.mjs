import path from "node:path";
import { openStateDb, DEFAULT_DB_PATH } from "../server/wikipedia-gacha/db.mjs";
import { createSqliteStore } from "../server/wikipedia-gacha/storage.mjs";

function parseArgs(argv) {
  const options = {
    dbPath: process.env.WIKIPEDIA_GACHA_DB_PATH ?? DEFAULT_DB_PATH,
    limit: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--db") options.dbPath = path.resolve(argv[index + 1] ?? options.dbPath);
    if (arg === "--limit") options.limit = Math.max(0, Number(argv[index + 1]) || 0);
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const db = openStateDb(options.dbPath);
  await db.ready;
  const store = createSqliteStore({ db });

  const rows = await db.all(
    `SELECT browser_token AS browserToken
     FROM user_state
     ORDER BY browser_token ASC`
  );
  const tokens = options.limit > 0
    ? rows.slice(0, options.limit).map((row) => row.browserToken)
    : rows.map((row) => row.browserToken);

  let migrated = 0;
  for (const browserToken of tokens) {
    const state = await store.forToken(browserToken).read();
    if (!state.browserProfiles?.some((profile) => profile.browserToken === browserToken)) {
      continue;
    }
    await store.forToken(browserToken).write(state, { immediate: true });
    migrated += 1;
  }

  await db.close();
  console.log(JSON.stringify({
    dbPath: options.dbPath,
    discoveredLegacyRows: rows.length,
    migrated,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
