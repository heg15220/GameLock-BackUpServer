#!/usr/bin/env node
// Daily prune for daily_browser_stats. Only the rolling 90 days are needed
// for missions, trophies, and the dashboard. Older rows can be discarded.
//
// Schedule (cron): 30 4 * * *  /usr/bin/node scripts/maintenance/prune-daily-stats.mjs

import process from "node:process";
import { openPostgresStateDb } from "../../server/wikipedia-gacha/postgres-db.mjs";

const RETAIN_DAYS = Number(process.env.WGC_DAILY_STATS_RETAIN_DAYS || 90);

async function main() {
  const url = process.env.WIKIPEDIA_GACHA_POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("WIKIPEDIA_GACHA_POSTGRES_URL or DATABASE_URL is required.");
    process.exit(2);
  }

  const db = openPostgresStateDb({ connectionString: url, applicationName: "wgc-prune" });
  await db.ready;

  const startedAt = Date.now();
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 24 * 3600 * 1000)
    .toISOString().slice(0, 10);

  const result = await db.run(
    `DELETE FROM daily_browser_stats WHERE stat_date < ?`,
    [cutoff]
  );

  console.log(JSON.stringify({
    job: "prune-daily-stats",
    rowsDeleted: result.changes ?? 0,
    cutoffDate: cutoff,
    retainDays: RETAIN_DAYS,
    durationMs: Date.now() - startedAt,
  }));

  await db.close();
}

main().catch((error) => {
  console.error("[prune-daily-stats] failed:", error);
  process.exit(1);
});
