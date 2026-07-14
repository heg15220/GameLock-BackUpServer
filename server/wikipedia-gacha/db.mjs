import fs from "node:fs";
import path from "node:path";
import sqlite3Pkg from "sqlite3";

const { Database } = sqlite3Pkg;
const SQLITE_BUSY_RETRY_LIMIT = 12;
const SQLITE_BUSY_BASE_DELAY_MS = 25;

export const DEFAULT_DB_PATH = path.join(
  process.cwd(),
  "server",
  "data",
  "wikipedia-gacha",
  "state.db"
);

const SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous  = NORMAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS user_state (
    browser_token TEXT PRIMARY KEY NOT NULL,
    data_json     TEXT NOT NULL DEFAULT '{}',
    updated_at    TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS recovery_codes (
    code          TEXT PRIMARY KEY NOT NULL,
    browser_token TEXT NOT NULL,
    snapshot_json TEXT NOT NULL DEFAULT '{}',
    created_at    TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_recovery_token
    ON recovery_codes (browser_token);

  CREATE TABLE IF NOT EXISTS token_aliases (
    legacy_token TEXT PRIMARY KEY NOT NULL,
    current_token TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE INDEX IF NOT EXISTS idx_token_aliases_current
    ON token_aliases (current_token);

  CREATE TABLE IF NOT EXISTS browser_profiles (
    id INTEGER PRIMARY KEY NOT NULL,
    browser_token TEXT NOT NULL UNIQUE,
    display_name TEXT NULL,
    preferred_language TEXT NULL,
    packs_available INTEGER NOT NULL DEFAULT 10,
    max_packs INTEGER NOT NULL DEFAULT 10,
    last_pack_regen_at TEXT NOT NULL DEFAULT '',
    gems INTEGER NOT NULL DEFAULT 0,
    shards INTEGER NOT NULL DEFAULT 0,
    trophies_points INTEGER NOT NULL DEFAULT 0,
    total_pack_opens INTEGER NOT NULL DEFAULT 0,
    pity_counter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT '',
    last_seen_at TEXT NOT NULL DEFAULT '',
    last_pack_opened_at TEXT NULL
  );

  CREATE TABLE IF NOT EXISTS browser_collection (
    id INTEGER PRIMARY KEY NOT NULL,
    browser_profile_id INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    copies INTEGER NOT NULL DEFAULT 0,
    first_obtained_at TEXT NULL,
    last_obtained_at TEXT NULL,
    favorite INTEGER NOT NULL DEFAULT 0,
    best_rarity_code TEXT NULL,
    topic_group TEXT NULL,
    FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_browser_collection_profile_article
    ON browser_collection (browser_profile_id, article_id);
  CREATE INDEX IF NOT EXISTS idx_browser_collection_profile
    ON browser_collection (browser_profile_id);

  CREATE TABLE IF NOT EXISTS pack_openings (
    id INTEGER PRIMARY KEY NOT NULL,
    browser_profile_id INTEGER NOT NULL,
    opened_at TEXT NOT NULL DEFAULT '',
    guaranteed_sr_plus INTEGER NOT NULL DEFAULT 0,
    pack_type TEXT NULL,
    result_summary TEXT NULL,
    FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_pack_openings_profile
    ON pack_openings (browser_profile_id);

  CREATE TABLE IF NOT EXISTS pack_opening_cards (
    pack_opening_id INTEGER NOT NULL,
    slot_number INTEGER NOT NULL,
    article_id INTEGER NOT NULL,
    title TEXT NULL,
    rarity TEXT NULL,
    quality_score INTEGER NOT NULL DEFAULT 0,
    atk INTEGER NOT NULL DEFAULT 0,
    def_stat INTEGER NOT NULL DEFAULT 0,
    image_url TEXT NULL,
    extract_text TEXT NULL,
    long_extract_text TEXT NULL,
    flavor_text TEXT NULL,
    was_new INTEGER NOT NULL DEFAULT 0,
    copies_after_pull INTEGER NOT NULL DEFAULT 0,
    shards_earned INTEGER NOT NULL DEFAULT 0,
    source_url TEXT NULL,
    topic_group TEXT NULL,
    PRIMARY KEY (pack_opening_id, slot_number),
    FOREIGN KEY (pack_opening_id) REFERENCES pack_openings(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS browser_missions (
    id INTEGER PRIMARY KEY NOT NULL,
    browser_profile_id INTEGER NOT NULL,
    mission_id INTEGER NOT NULL,
    progress_value INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    claimed INTEGER NOT NULL DEFAULT 0,
    reset_date TEXT NULL,
    created_at TEXT NULL,
    updated_at TEXT NULL,
    FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_browser_missions_profile_mission_reset
    ON browser_missions (browser_profile_id, mission_id, reset_date);
  CREATE INDEX IF NOT EXISTS idx_browser_missions_profile
    ON browser_missions (browser_profile_id);

  CREATE TABLE IF NOT EXISTS browser_trophies (
    id INTEGER PRIMARY KEY NOT NULL,
    browser_profile_id INTEGER NOT NULL,
    trophy_id INTEGER NOT NULL,
    unlocked_at TEXT NULL,
    FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_browser_trophies_profile_trophy
    ON browser_trophies (browser_profile_id, trophy_id);
  CREATE INDEX IF NOT EXISTS idx_browser_trophies_profile
    ON browser_trophies (browser_profile_id);

  CREATE TABLE IF NOT EXISTS reward_events (
    id INTEGER PRIMARY KEY NOT NULL,
    browser_profile_id INTEGER NOT NULL,
    reward_source TEXT NULL,
    reward_type TEXT NULL,
    reward_amount INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NULL,
    metadata_json TEXT NULL,
    FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_reward_events_profile
    ON reward_events (browser_profile_id);

  CREATE TABLE IF NOT EXISTS daily_browser_stats (
    id INTEGER PRIMARY KEY NOT NULL,
    browser_profile_id INTEGER NOT NULL,
    stat_date TEXT NOT NULL,
    packs_opened INTEGER NOT NULL DEFAULT 0,
    cards_obtained INTEGER NOT NULL DEFAULT 0,
    new_cards_obtained INTEGER NOT NULL DEFAULT 0,
    duplicate_cards_obtained INTEGER NOT NULL DEFAULT 0,
    sr_or_higher_count INTEGER NOT NULL DEFAULT 0,
    ssr_or_higher_count INTEGER NOT NULL DEFAULT 0,
    ur_or_higher_count INTEGER NOT NULL DEFAULT 0,
    wikipedia_clicks INTEGER NOT NULL DEFAULT 0,
    shards_earned INTEGER NOT NULL DEFAULT 0,
    topic_counts_json TEXT NULL,
    FOREIGN KEY (browser_profile_id) REFERENCES browser_profiles(id) ON DELETE CASCADE
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_browser_stats_profile_date
    ON daily_browser_stats (browser_profile_id, stat_date);
  CREATE INDEX IF NOT EXISTS idx_daily_browser_stats_profile
    ON daily_browser_stats (browser_profile_id);
`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSqliteBusy(error) {
  return error?.code === "SQLITE_BUSY" || String(error?.message ?? "").includes("SQLITE_BUSY");
}

export function openStateDb(dbPath = DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  async function withBusyRetry(operation) {
    let attempt = 0;
    for (;;) {
      try {
        return await operation();
      } catch (error) {
        if (!isSqliteBusy(error) || attempt >= SQLITE_BUSY_RETRY_LIMIT) {
          throw error;
        }
        const delayMs = Math.min(400, SQLITE_BUSY_BASE_DELAY_MS * (2 ** attempt));
        attempt += 1;
        await sleep(delayMs);
      }
    }
  }

  function run(sql, params = []) {
    return withBusyRetry(
      () =>
        new Promise((resolve, reject) => {
          db.run(sql, params, function callback(err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
          });
        })
    );
  }

  function get(sql, params = []) {
    return withBusyRetry(
      () =>
        new Promise((resolve, reject) => {
          db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row ?? null);
          });
        })
    );
  }

  function all(sql, params = []) {
    return withBusyRetry(
      () =>
        new Promise((resolve, reject) => {
          db.all(sql, params, (err, rows) => {
            if (err) return reject(err);
            resolve(rows ?? []);
          });
        })
    );
  }

  function exec(sql) {
    return withBusyRetry(
      () =>
        new Promise((resolve, reject) => {
          db.exec(sql, (err) => {
            if (err) return reject(err);
            resolve();
          });
        })
    );
  }

  function close() {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  // Lightweight, idempotent column migrations for databases created by an
  // earlier schema version (CREATE TABLE IF NOT EXISTS never adds new columns).
  async function migrate() {
    const cols = await all("PRAGMA table_info(pack_opening_cards)");
    if (!cols.some((col) => col.name === "title")) {
      // Persist the article title with each pulled card so a collected card's
      // detail can be re-served after the in-memory Wikipedia pool loses it
      // (server restart / rarity-bucket eviction).
      await run("ALTER TABLE pack_opening_cards ADD COLUMN title TEXT NULL");
    }
  }

  const ready = exec(SCHEMA_SQL).then(migrate);

  return { run, get, all, exec, close, ready };
}
