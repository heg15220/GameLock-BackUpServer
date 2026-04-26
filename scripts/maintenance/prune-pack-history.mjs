#!/usr/bin/env node
// Daily safety prune for pack history.
//
// The application code already trims pack_openings to the last 24 per profile
// at write time (see trimProfilePackHistory in service.mjs), but a long-lived
// process or a crash between writes can leave older rows behind. This script
// is the safety net: it deletes any pack_openings beyond the 24 most recent
// per browser_profile_id and cascades to pack_opening_cards.
//
// Schedule (cron): 0 4 * * *  /usr/bin/node scripts/maintenance/prune-pack-history.mjs

import process from "node:process";
import { openPostgresStateDb } from "../../server/wikipedia-gacha/postgres-db.mjs";

const RETAIN_PER_PROFILE = Number(process.env.WGC_PACK_HISTORY_RETAIN || 24);

async function main() {
  const url = process.env.WIKIPEDIA_GACHA_POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("WIKIPEDIA_GACHA_POSTGRES_URL or DATABASE_URL is required.");
    process.exit(2);
  }

  const db = openPostgresStateDb({ connectionString: url, applicationName: "wgc-prune" });
  await db.ready;

  const startedAt = Date.now();
  const result = await db.run(
    `WITH ranked AS (
       SELECT id, browser_profile_id,
              ROW_NUMBER() OVER (
                PARTITION BY browser_profile_id
                ORDER BY opened_at DESC, id DESC
              ) AS rn
       FROM pack_openings
     )
     DELETE FROM pack_openings p
     USING ranked r
     WHERE p.id = r.id AND r.rn > ?`,
    [RETAIN_PER_PROFILE]
  );

  console.log(JSON.stringify({
    job: "prune-pack-history",
    rowsDeleted: result.changes ?? 0,
    retainPerProfile: RETAIN_PER_PROFILE,
    durationMs: Date.now() - startedAt,
  }));

  await db.close();
}

main().catch((error) => {
  console.error("[prune-pack-history] failed:", error);
  process.exit(1);
});
