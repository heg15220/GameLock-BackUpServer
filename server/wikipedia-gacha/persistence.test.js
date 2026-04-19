import { describe, expect, it, vi } from "vitest";
import {
  createWikipediaGachaPersistence,
  resolveWikipediaGachaStorageDriver,
} from "./persistence.mjs";

describe("wikipedia gacha persistence selection", () => {
  it("defaults to sqlite when no postgres URL is configured", () => {
    expect(
      resolveWikipediaGachaStorageDriver({
        env: {},
      })
    ).toEqual({
      driver: "sqlite",
      postgresUrl: null,
    });
  });

  it("switches to postgres automatically when a postgres URL is present", () => {
    expect(
      resolveWikipediaGachaStorageDriver({
        env: {
          WIKIPEDIA_GACHA_POSTGRES_URL: "postgres://user:pass@localhost:5432/wiki",
        },
      })
    ).toEqual({
      driver: "postgres",
      postgresUrl: "postgres://user:pass@localhost:5432/wiki",
    });
  });

  it("lets an explicit sqlite driver override a configured postgres URL", () => {
    expect(
      resolveWikipediaGachaStorageDriver({
        storageDriver: "sqlite",
        env: {
          WIKIPEDIA_GACHA_POSTGRES_URL: "postgres://user:pass@localhost:5432/wiki",
        },
      })
    ).toEqual({
      driver: "sqlite",
      postgresUrl: "postgres://user:pass@localhost:5432/wiki",
    });
  });

  it("rejects postgres when no connection string is available", () => {
    expect(() =>
      resolveWikipediaGachaStorageDriver({
        storageDriver: "postgres",
        env: {},
      })
    ).toThrow(/requires WIKIPEDIA_GACHA_POSTGRES_URL or DATABASE_URL/i);
  });

  it("creates the postgres backend through the postgres factory only", () => {
    const openSqliteDb = vi.fn(() => ({ engine: "sqlite-db" }));
    const openPostgresDb = vi.fn(() => ({ engine: "postgres-db" }));
    const createSqliteStoreFn = vi.fn(() => ({ kind: "sqlite-store" }));
    const createPostgresStoreFn = vi.fn(() => ({ kind: "postgres-store" }));

    const persistence = createWikipediaGachaPersistence({
      storageDriver: "postgres",
      postgresUrl: "postgres://user:pass@localhost:5432/wiki",
      openSqliteDb,
      openPostgresDb,
      createSqliteStoreFn,
      createPostgresStoreFn,
    });

    expect(persistence.driver).toBe("postgres");
    expect(openSqliteDb).not.toHaveBeenCalled();
    expect(createSqliteStoreFn).not.toHaveBeenCalled();
    expect(openPostgresDb).toHaveBeenCalledWith({
      connectionString: "postgres://user:pass@localhost:5432/wiki",
    });
    expect(createPostgresStoreFn).toHaveBeenCalledWith({
      db: { engine: "postgres-db" },
    });
  });
});
