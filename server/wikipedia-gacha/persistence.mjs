import { openStateDb, DEFAULT_DB_PATH } from "./db.mjs";
import { openPostgresStateDb } from "./postgres-db.mjs";
import { createSqliteStore } from "./storage.mjs";
import { createPostgresStore } from "./storage.postgres.mjs";

export const DEFAULT_SQLITE_DB_PATH = DEFAULT_DB_PATH;

export function resolveWikipediaGachaStorageDriver({
  storageDriver,
  postgresUrl,
  env = process.env,
} = {}) {
  const explicitDriver = storageDriver ?? env.WIKIPEDIA_GACHA_STORAGE_DRIVER ?? null;
  const normalizedDriver = explicitDriver ? String(explicitDriver).trim().toLowerCase() : null;
  const resolvedPostgresUrl =
    postgresUrl ??
    env.WIKIPEDIA_GACHA_POSTGRES_URL ??
    env.DATABASE_URL ??
    null;

  if (normalizedDriver) {
    if (!["sqlite", "postgres"].includes(normalizedDriver)) {
      throw new Error(
        `Unsupported wikipedia-gacha storage driver: ${normalizedDriver}`
      );
    }
    if (normalizedDriver === "postgres" && !resolvedPostgresUrl) {
      throw new Error(
        "The postgres storage driver requires WIKIPEDIA_GACHA_POSTGRES_URL or DATABASE_URL."
      );
    }
    return {
      driver: normalizedDriver,
      postgresUrl: resolvedPostgresUrl,
    };
  }

  return {
    driver: resolvedPostgresUrl ? "postgres" : "sqlite",
    postgresUrl: resolvedPostgresUrl,
  };
}

export function createWikipediaGachaPersistence({
  storageDriver,
  postgresUrl,
  dbPath = DEFAULT_SQLITE_DB_PATH,
  env = process.env,
  openSqliteDb = openStateDb,
  openPostgresDb = openPostgresStateDb,
  createSqliteStoreFn = createSqliteStore,
  createPostgresStoreFn = createPostgresStore,
} = {}) {
  const resolved = resolveWikipediaGachaStorageDriver({
    storageDriver,
    postgresUrl,
    env,
  });

  if (resolved.driver === "postgres") {
    const db = openPostgresDb({
      connectionString: resolved.postgresUrl,
    });
    return {
      driver: "postgres",
      db,
      store: createPostgresStoreFn({ db }),
    };
  }

  const db = openSqliteDb(dbPath);
  return {
    driver: "sqlite",
    db,
    store: createSqliteStoreFn({ db }),
  };
}
