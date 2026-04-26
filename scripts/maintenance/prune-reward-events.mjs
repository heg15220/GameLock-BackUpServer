#!/usr/bin/env node
// Daily prune for reward_events. The user-facing dashboard only shows the
// recent reward stream; older rows just take space. 60-day rolling window.
//
// Schedule (cron): 0 5 * * *  /usr/bin/node scripts/maintenance/prune-reward-events.mjs

import process from "node:process";
import { openPostgresStateDb } from "../../server/wikipedia-gacha/postgres-db.mjs";

const RETAIN_DAYS = Number(process.env.WGC_REWARD_EVENTS_RETAIN_DAYS || 60);

async function main() {
  const url = process.env.WIKIPEDIA_GACHA_POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("WIKIPEDIA_GACHA_POSTGRES_URL or DATABASE_URL is required.");
    process.exit(2);
  }

  const db = openPostgresStateDb({ connectionString: url, applicationName: "wgc-prune" });
  await db.ready;

  const startedAt = Date.now();
  const cutoffIso = new Date(Date.now() - RETAIN_DAYS * 24 * 3600 * 1000).toISOString();

  const result = await db.run(
    `DELETE FROM reward_events WHERE created_at IS NOT NULL AND created_at < ?`,
    [cutoffIso]
  );

  console.log(JSON.stringify({
    job: "prune-reward-events",
    rowsDeleted: result.changes ?? 0,
    cutoffIso,
    retainDays: RETAIN_DAYS,
    durationMs: Date.now() - startedAt,
  }));

  await db.close();
}

main().catch((error) => {
  console.error("[prune-reward-events] failed:", error);
  process.exit(1);
});
