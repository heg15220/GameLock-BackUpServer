import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const DEFAULT_POSTGRES_POOL_MAX = Math.max(
  16,
  Number(process.env.WIKIPEDIA_GACHA_POSTGRES_POOL_MAX || 24) || 24
);
const DEFAULT_POSTGRES_IDLE_TIMEOUT_MS = Math.max(
  1_000,
  Number(process.env.WIKIPEDIA_GACHA_POSTGRES_IDLE_TIMEOUT_MS || 30_000) || 30_000
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
  idleTimeoutMillis = DEFAULT_POSTGRES_IDLE_TIMEOUT_MS,
  ssl = process.env.WIKIPEDIA_GACHA_POSTGRES_SSL,
} = {}) {
  if (!connectionString) {
    throw new Error("A Postgres connection string is required.");
  }

  const { Pool } = loadPg();
  const pool = new Pool({
    connectionString,
    max: poolMax,
    idleTimeoutMillis,
    allowExitOnIdle: true,
    ssl: normalizeSslConfig(ssl),
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
