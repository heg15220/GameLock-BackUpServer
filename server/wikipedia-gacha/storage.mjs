/**
 * storage.mjs — SQLite-backed per-user state store.
 *
 * Key design properties for high-concurrency:
 *
 *  1. Per-user write queues — concurrent requests for different users
 *     proceed in parallel; concurrent requests for the *same* user are
 *     automatically serialized, preventing race conditions without a
 *     global lock that would bottleneck every user.
 *
 *  2. No global serial queue — the old approach serialised ALL users
 *     through a single Promise chain while reading/writing a 500 KB+ JSON
 *     file.  With SQLite each user's data is an independent row; writes for
 *     User A never block writes for User B.
 *
 *  3. No application-level cache — data is read from and written to SQLite
 *     on every operation.  SQLite's own page cache (managed by the OS) is
 *     the only caching that occurs, transparently and without application
 *     memory growth.
 *
 *  4. Recovery codes in a separate indexed table — previously embedded
 *     inside the monolithic JSON, cross-user recovery lookup is now an
 *     O(1) indexed lookup by code.
 *
 * The per-user data blob keeps the same shape the service layer already
 * expects ({browserProfiles, browserCollection, …}) so that service.mjs
 * requires only small call-site changes — there is no need to rewrite
 * every mutation path.
 */

import { STORAGE_VERSION } from "./constants.mjs";

const DEFAULT_NEXT_IDS = {
  profile: 1,
  collection: 1,
  packOpening: 1,
  browserMission: 1,
  browserTrophy: 1,
  rewardEvent: 1,
  dailyStat: 1,
};

// ── helpers ──────────────────────────────────────────────────────────────────

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripTransientKeys(value) {
  if (Array.isArray(value)) return value.map(stripTransientKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => !k.startsWith("__"))
        .map(([k, v]) => [k, stripTransientKeys(v)])
    );
  }
  return value;
}

function buildEmptyState() {
  return {
    version: STORAGE_VERSION,
    nextIds: { ...DEFAULT_NEXT_IDS },
    browserProfiles: [],
    browserCollection: [],
    packOpenings: [],
    browserMissions: [],
    browserTrophies: [],
    rewardEvents: [],
    dailyBrowserStats: [],
    recoveries: [],    // kept for draft compatibility; persisted separately
  };
}

// ── store factory ─────────────────────────────────────────────────────────────

/**
 * @param {{ db: ReturnType<import('./db.mjs').openStateDb> }} options
 */
export function createSqliteStore({ db }) {
  // One pending-promise tail per browser token.
  // When the tail settles and no new update has arrived, the entry is removed.
  const queues = new Map();

  // ── internal I/O ────────────────────────────────────────────────────────────

  async function readRaw(browserToken) {
    const row = await db.get(
      "SELECT data_json FROM user_state WHERE browser_token = ?",
      [browserToken]
    );
    if (!row) return buildEmptyState();
    try {
      return { ...buildEmptyState(), ...JSON.parse(row.data_json) };
    } catch {
      return buildEmptyState();
    }
  }

  async function writeRaw(browserToken, state) {
    const clean = stripTransientKeys({ ...state, recoveries: [] });
    await db.run(
      `INSERT INTO user_state (browser_token, data_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT (browser_token) DO UPDATE
         SET data_json = excluded.data_json,
             updated_at = excluded.updated_at`,
      [browserToken, JSON.stringify(clean), new Date().toISOString()]
    );

    // Flush any new recovery codes that the mutator pushed into the draft.
    for (const recovery of state.recoveries ?? []) {
      await db.run(
        `INSERT OR IGNORE INTO recovery_codes
           (code, browser_token, snapshot_json, created_at)
         VALUES (?, ?, ?, ?)`,
        [
          recovery.code,
          browserToken,
          JSON.stringify(recovery.snapshot ?? {}),
          recovery.createdAt ?? new Date().toISOString(),
        ]
      );
    }
  }

  // ── per-user queue management ────────────────────────────────────────────────

  /**
   * Enqueue an async operation for `browserToken` so that concurrent
   * requests for the same user are processed one at a time.
   */
  function enqueue(browserToken, task) {
    const prev = queues.get(browserToken) ?? Promise.resolve();
    const next = prev.then(task);

    // Self-cleaning: remove the entry once this tail settles and nothing
    // newer has been enqueued for this token.
    const tail = next.catch(() => {}).finally(() => {
      if (queues.get(browserToken) === tail) queues.delete(browserToken);
    });
    queues.set(browserToken, tail);

    return next; // Callers receive the real promise (with rejection).
  }

  // ── public API ───────────────────────────────────────────────────────────────

  /**
   * Returns a scoped handle for `browserToken`.
   * All reads and writes are isolated to that user's row.
   */
  function forToken(browserToken) {
    /** Read the current state without queuing. */
    async function read() {
      return readRaw(browserToken);
    }

    /**
     * Read → mutate → write, serialised per user.
     * The mutator receives a mutable draft and may return it (or nothing).
     * Transient keys (starting with "__") are stripped before persisting.
     */
    function update(mutator) {
      return enqueue(browserToken, async () => {
        const current = await readRaw(browserToken);
        const draft = clone(current);
        const next = (await mutator(draft)) ?? draft;
        await writeRaw(browserToken, next);
        return clone(next);
      });
    }

    return { read, update };
  }

  /**
   * Look up a recovery snapshot by its opaque code.
   * O(1) — indexed primary-key lookup, not a sequential scan.
   *
   * @returns {object|null} The stored snapshot, or null if not found.
   */
  async function findRecovery(recoveryCode) {
    const row = await db.get(
      "SELECT snapshot_json FROM recovery_codes WHERE code = ?",
      [recoveryCode]
    );
    if (!row) return null;
    try {
      return JSON.parse(row.snapshot_json);
    } catch {
      return null;
    }
  }

  return { forToken, findRecovery };
}

// Keep legacy export name so that existing imports in service.mjs compile
// after the rename — service.mjs will be updated to call createSqliteStore.
export { createSqliteStore as createJsonStore };
export { buildEmptyState as createEmptyState };
