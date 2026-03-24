/**
 * db.mjs — SQLite connection and schema for Wikipedia Gacha player state.
 *
 * Uses the `sqlite3` npm package (async, prebuilt binaries available).
 * WAL journal mode enables concurrent reads without blocking writers.
 * Catalog data lives in the existing catalog.ndjson + index file — this
 * database only stores per-user game state and recovery codes.
 *
 * Schema:
 *   user_state      — one JSON-blob row per browser token
 *   recovery_codes  — indexed by code for O(1) cross-user lookup
 */

import sqlite3Pkg from "sqlite3";
import path from "node:path";
import fs from "node:fs";

const { Database } = sqlite3Pkg;

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
`;

/**
 * Open (or create) the state database and ensure the schema exists.
 * Returns a promisified wrapper so callers can use async/await.
 */
export function openStateDb(dbPath = DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);

  // Promisified helpers — the sqlite3 package is callback-based.
  function run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function callback(err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row ?? null);
      });
    });
  }

  function exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  function close() {
    return new Promise((resolve, reject) => {
      db.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  // Apply schema. PRAGMA statements must be individual statements when
  // using db.exec, which is fine — sqlite3 executes them sequentially.
  const ready = exec(SCHEMA_SQL);

  return { run, get, exec, close, ready };
}
