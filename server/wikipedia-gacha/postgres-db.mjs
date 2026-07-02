import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const DEFAULT_POSTGRES_POOL_MAX = Math.max(
  2,
  Number(process.env.WIKIPEDIA_GACHA_POSTGRES_POOL_MAX || 8) || 8
);
const DEFAULT_POSTGRES_POOL_MIN = Math.max(
  0,
  Number(process.env.WIKIPEDIA_GACHA_POSTGRES_POOL_MIN || 2) || 2
);
const DEFAULT_POSTGRES_IDLE_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.WIKIPEDIA_GACHA_POSTGRES_IDLE_TIMEOUT_MS || 30_000) || 30_000
);
const DEFAULT_POSTGRES_CONNECT_TIMEOUT_MS = Math.max(
  500,
  Number(process.env.WIKIPEDIA_GACHA_POSTGRES_CONNECT_TIMEOUT_MS || 2_000) || 2_000
);
const DEFAULT_POSTGRES_STATEMENT_TIMEOUT_MS = Math.max(
  500,
  Number(process.env.WIKIPEDIA_GACHA_POSTGRES_STATEMENT_TIMEOUT_MS || 3_000) || 3_000
);

const SCHEMA_SQL = fs.readFileSync(
  new URL("./schema.postgres.sql", import.meta.url),
  "utf8"
);
const POSTGRES_SCHEMA_LOCK_NAMESPACE = 0x77676163;
const POSTGRES_SCHEMA_LOCK_ID = 0x686131;

function loadPg() {
  try {
    return require("pg");
  } catch (error) {
    const wrapped = new Error(
      "Postgres storage requires the 'pg' package. Install it with `npm install` before enabling the postgres driver."
    );
    wrapped.cause = error;
    throw wrapped;
  }
}

function translateSql(sql) {
  let index = 0;
  return String(sql).replace(/\?/g, () => `$${++index}`);
}

function normalizeSslConfig(ssl) {
  if (ssl == null || ssl === false) {
    return undefined;
  }
  if (ssl === true) {
    return { rejectUnauthorized: false };
  }
  if (typeof ssl === "object") {
    return ssl;
  }
  const normalized = String(ssl).trim().toLowerCase();
  if (!normalized || normalized === "disable" || normalized === "false" || normalized === "0") {
    return undefined;
  }
  if (normalized === "require" || normalized === "true" || normalized === "1") {
    return { rejectUnauthorized: false };
  }
  if (normalized === "verify-full" || normalized === "verify-ca") {
    return { rejectUnauthorized: true };
  }
  return undefined;
}

function createQueryApi(executor) {
  async function run(sql, params = []) {
    const result = await executor.query(translateSql(sql), params);
    return {
      lastID: null,
      changes: result.rowCount ?? 0,
      rows: result.rows ?? [],
    };
  }

  async function get(sql, params = []) {
    const result = await executor.query(translateSql(sql), params);
    return result.rows?.[0] ?? null;
  }

  async function all(sql, params = []) {
    const result = await executor.query(translateSql(sql), params);
    return result.rows ?? [];
  }

  async function exec(sql) {
    await executor.query(sql);
  }

  return { run, get, all, exec };
}

async function initializeSchema(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock($1, $2)",
      [POSTGRES_SCHEMA_LOCK_NAMESPACE, POSTGRES_SCHEMA_LOCK_ID]
    );
    await client.query(SCHEMA_SQL);
    // Advance the id sequence above the current global max across every table
    // that draws from it, without ever moving it backwards (safe across
    // restarts and replicas). GREATEST includes the sequence's own value so a
    // reseed can only raise it.
    await client.query(
      `SELECT setval('wgc_entity_id_seq', GREATEST(
         (SELECT last_value FROM wgc_entity_id_seq),
         (SELECT COALESCE(MAX(id), 0) FROM browser_profiles),
         (SELECT COALESCE(MAX(id), 0) FROM browser_collection),
         (SELECT COALESCE(MAX(id), 0) FROM pack_openings),
         (SELECT COALESCE(MAX(id), 0) FROM browser_missions),
         (SELECT COALESCE(MAX(id), 0) FROM browser_trophies),
         (SELECT COALESCE(MAX(id), 0) FROM reward_events),
         (SELECT COALESCE(MAX(id), 0) FROM daily_browser_stats),
         1
       ), true)`
    );
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback failure
    }
    throw error;
  } finally {
    client.release();
  }
}

export function openPostgresStateDb({
  connectionString,
  poolMax = DEFAULT_POSTGRES_POOL_MAX,
  poolMin = DEFAULT_POSTGRES_POOL_MIN,
  idleTimeoutMillis = DEFAULT_POSTGRES_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis = DEFAULT_POSTGRES_CONNECT_TIMEOUT_MS,
  statementTimeoutMs = DEFAULT_POSTGRES_STATEMENT_TIMEOUT_MS,
  ssl = process.env.WIKIPEDIA_GACHA_POSTGRES_SSL,
  applicationName = process.env.WIKIPEDIA_GACHA_POSTGRES_APP_NAME ?? "wgc-worker",
} = {}) {
  if (!connectionString) {
    throw new Error("A Postgres connection string is required.");
  }

  const { Pool } = loadPg();
  const pool = new Pool({
    connectionString,
    max: poolMax,
    min: poolMin,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    allowExitOnIdle: true,
    ssl: normalizeSslConfig(ssl),
    application_name: applicationName,
    // statement_timeout cap on the server side. Each connection inherits this
    // when it joins the pool, so even slow planner regressions can not pin a
    // worker indefinitely.
    statement_timeout: statementTimeoutMs,
    query_timeout: statementTimeoutMs,
    // 1s is enough for healthy Postgres locks; if a row is held longer we
    // would rather fail fast than queue requests behind it.
    lock_timeout: 1_000,
  });

  const poolApi = createQueryApi(pool);
  const ready = initializeSchema(pool).then(() => undefined);

  async function transaction(callback) {
    const client = await pool.connect();
    const tx = createQueryApi(client);
    try {
      await client.query("BEGIN");
      const result = await callback(tx);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ignore rollback failure
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async function close() {
    await pool.end();
  }

  return {
    ...poolApi,
    transaction,
    close,
    ready,
  };
}
