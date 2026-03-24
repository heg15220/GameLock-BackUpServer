/**
 * migrate-store-to-sqlite.mjs
 *
 * One-time migration tool: reads the legacy store.json and writes each
 * user's data into the new SQLite state.db.
 *
 * Usage:
 *   node scripts/migrate-store-to-sqlite.mjs
 *
 * Environment variables (all optional — defaults match the server defaults):
 *   WIKIPEDIA_GACHA_STORE_FILE  — path to the legacy store.json
 *   WIKIPEDIA_GACHA_DB_PATH     — target SQLite database
 *
 * The migration is idempotent: users that already have a row in the SQLite
 * database are skipped unless --force is passed.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { openStateDb, DEFAULT_DB_PATH } from "../server/wikipedia-gacha/db.mjs";
import { createSqliteStore } from "../server/wikipedia-gacha/storage.mjs";

const STORE_FILE =
  process.env.WIKIPEDIA_GACHA_STORE_FILE ??
  path.join(process.cwd(), "server", "data", "wikipedia-gacha", "store.json");

const DB_PATH =
  process.env.WIKIPEDIA_GACHA_DB_PATH ?? DEFAULT_DB_PATH;

const FORCE = process.argv.includes("--force");

// ── load legacy state ────────────────────────────────────────────────────────

let legacyState;
try {
  const raw = await fs.readFile(STORE_FILE, "utf8");
  legacyState = JSON.parse(raw);
} catch (err) {
  if (err.code === "ENOENT") {
    console.log("[migrate] No legacy store.json found at", STORE_FILE);
    console.log("[migrate] Nothing to migrate.");
    process.exit(0);
  }
  throw err;
}

const profiles = legacyState.browserProfiles ?? [];
if (!profiles.length) {
  console.log("[migrate] No profiles found in legacy store. Nothing to migrate.");
  process.exit(0);
}

console.log(`[migrate] Found ${profiles.length} profile(s) in legacy store.`);

// ── open target database ─────────────────────────────────────────────────────

const db = openStateDb(DB_PATH);
await db.ready;
const store = createSqliteStore({ db });

// ── migrate each profile ─────────────────────────────────────────────────────

let skipped = 0;
let migrated = 0;
let errors = 0;

for (const profile of profiles) {
  const token = profile.browserToken;
  if (!token) continue;

  // Check if already migrated.
  if (!FORCE) {
    const existing = await db.get(
      "SELECT 1 FROM user_state WHERE browser_token = ?",
      [token]
    );
    if (existing) {
      skipped++;
      continue;
    }
  }

  try {
    // Collect all data that belongs to this profile from the flat arrays.
    const profileId = profile.id;

    const browserCollection = (legacyState.browserCollection ?? []).filter(
      (e) => e.browserProfileId === profileId
    );
    const packOpenings = (legacyState.packOpenings ?? []).filter(
      (e) => e.browserProfileId === profileId
    );
    const browserMissions = (legacyState.browserMissions ?? []).filter(
      (e) => e.browserProfileId === profileId
    );
    const browserTrophies = (legacyState.browserTrophies ?? []).filter(
      (e) => e.browserProfileId === profileId
    );
    const rewardEvents = (legacyState.rewardEvents ?? []).filter(
      (e) => e.browserProfileId === profileId
    );
    const dailyBrowserStats = (legacyState.dailyBrowserStats ?? []).filter(
      (e) => e.browserProfileId === profileId
    );

    // Compute next IDs from the per-user data.
    const maxCollectionId = Math.max(0, ...browserCollection.map((e) => e.id ?? 0));
    const maxOpeningId = Math.max(0, ...packOpenings.map((e) => e.id ?? 0));
    const maxMissionId = Math.max(0, ...browserMissions.map((e) => e.id ?? 0));
    const maxTrophyId = Math.max(0, ...browserTrophies.map((e) => e.id ?? 0));
    const maxRewardId = Math.max(0, ...rewardEvents.map((e) => e.id ?? 0));
    const maxStatId = Math.max(0, ...dailyBrowserStats.map((e) => e.id ?? 0));

    const userState = {
      version: legacyState.version ?? 1,
      nextIds: {
        profile: (profile.id ?? 0) + 1,
        collection: maxCollectionId + 1,
        packOpening: maxOpeningId + 1,
        browserMission: maxMissionId + 1,
        browserTrophy: maxTrophyId + 1,
        rewardEvent: maxRewardId + 1,
        dailyStat: maxStatId + 1,
      },
      browserProfiles: [profile],
      browserCollection,
      packOpenings,
      browserMissions,
      browserTrophies,
      rewardEvents,
      dailyBrowserStats,
      recoveries: [],
    };

    // Write to SQLite via the store (handles serialization + recovery codes).
    await store.forToken(token).update((draft) => {
      Object.assign(draft, userState);
      return draft;
    });

    // Migrate recovery codes that belonged to this profile.
    const ownRecoveries = (legacyState.recoveries ?? []).filter(
      (r) => r.snapshot?.profile != null
    );
    for (const recovery of ownRecoveries) {
      await db.run(
        `INSERT OR IGNORE INTO recovery_codes
           (code, browser_token, snapshot_json, created_at)
         VALUES (?, ?, ?, ?)`,
        [
          recovery.code,
          token,
          JSON.stringify(recovery.snapshot ?? {}),
          recovery.createdAt ?? new Date().toISOString(),
        ]
      );
    }

    migrated++;
    if (migrated % 50 === 0) {
      console.log(`[migrate] Migrated ${migrated} profiles so far…`);
    }
  } catch (err) {
    console.error(`[migrate] Error migrating token ${token.slice(0, 8)}…:`, err.message);
    errors++;
  }
}

await db.close();

console.log(
  `[migrate] Done. migrated=${migrated} skipped=${skipped} errors=${errors}`
);
