import { describe, it, expect } from "vitest";
import { createCache, __cacheInternals } from "./cache.mjs";

const { compress, decompress, COMPRESS_THRESHOLD_BYTES } = __cacheInternals;

class FakeRedis {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
    this.eventHandlers = {};
    this.disconnected = false;
  }
  on(event, handler) {
    (this.eventHandlers[event] ??= []).push(handler);
    if (event === "ready") setTimeout(() => handler(), 0);
  }
  emit(event, ...args) {
    (this.eventHandlers[event] ?? []).forEach((h) => h(...args));
  }
  isExpired(key) {
    const exp = this.expirations.get(key);
    return exp != null && exp <= Date.now();
  }
  read(key) {
    if (this.isExpired(key)) {
      this.store.delete(key);
      this.expirations.delete(key);
      return null;
    }
    return this.store.get(key) ?? null;
  }
  async getBuffer(key) {
    const v = this.read(key);
    return v == null ? null : Buffer.isBuffer(v) ? v : Buffer.from(String(v));
  }
  async get(key) {
    const v = this.read(key);
    if (v == null) return null;
    return Buffer.isBuffer(v) ? v.toString("binary") : String(v);
  }
  async set(key, value, mode, ttlSeconds) {
    if (mode === "NX") {
      if (this.store.has(key) && !this.isExpired(key)) return null;
    }
    this.store.set(key, value);
    if ((mode === "EX" || mode === "NX") && ttlSeconds) {
      this.expirations.set(key, Date.now() + Number(ttlSeconds) * 1000);
    }
    if (mode === "EX" && Number(ttlSeconds)) {
      this.expirations.set(key, Date.now() + Number(ttlSeconds) * 1000);
    }
    return "OK";
  }
  async del(...keys) {
    let n = 0;
    for (const k of keys.flat()) {
      if (this.store.delete(k)) n += 1;
      this.expirations.delete(k);
    }
    return n;
  }
  async unlink(...keys) { return this.del(...keys); }
  async expire(key, seconds) {
    if (!this.store.has(key)) return 0;
    this.expirations.set(key, Date.now() + Number(seconds) * 1000);
    return 1;
  }
  async incr(key) {
    const cur = Number(this.read(key) ?? 0);
    const next = cur + 1;
    this.store.set(key, String(next));
    return next;
  }
  pipeline() {
    const ops = [];
    const wrapper = {
      incr: (k) => { ops.push(["incr", k]); return wrapper; },
      expire: (k, s) => { ops.push(["expire", k, s]); return wrapper; },
      exec: async () => {
        const results = [];
        for (const [op, ...args] of ops) {
          try {
            const r = await this[op](...args);
            results.push([null, r]);
          } catch (err) { results.push([err, null]); }
        }
        return results;
      },
    };
    return wrapper;
  }
  scanStream() {
    const data = Array.from(this.store.keys());
    return {
      [Symbol.asyncIterator]() {
        let yielded = false;
        return {
          async next() {
            if (yielded) return { done: true };
            yielded = true;
            return { value: data, done: false };
          },
        };
      },
    };
  }
  async eval(_script, _numKeys, key, lockKey, lockValue, ttlSeconds) {
    const cached = await this.getBuffer(key);
    if (cached) return [0, cached];
    const lock = await this.set(lockKey, lockValue, "NX", ttlSeconds);
    if (lock) return [1, null];
    return [2, null];
  }
  async ping() { return "PONG"; }
  async quit() { this.disconnected = true; return "OK"; }
  disconnect() { this.disconnected = true; }
}

function makeCache() {
  const fake = new FakeRedis();
  function Ctor() { return fake; }
  return {
    cache: createCache({ redisUrl: "redis://fake", RedisCtor: Ctor, keyPrefix: "" }),
    fake,
  };
}

describe("cache layer", () => {
  it("compresses payloads above the threshold and round-trips them", () => {
    const big = { items: Array.from({ length: 500 }, (_, i) => ({ i, title: `Article ${i}` })) };
    const compressed = compress(big);
    expect(compressed.length).toBeGreaterThan(0);
    expect(decompress(compressed)).toEqual(big);
  });

  it("does not compress small payloads but still round-trips them", () => {
    const small = { hi: 1 };
    const buf = compress(small);
    expect(buf.length).toBeLessThan(COMPRESS_THRESHOLD_BYTES);
    expect(decompress(buf)).toEqual(small);
  });

  it("returns no-op cache when disabled", async () => {
    const noop = createCache({ disabled: true, redisUrl: "redis://x" });
    expect(noop.enabled).toBe(false);
    expect(await noop.get("k")).toBeNull();
    expect(await noop.getOrSet("k", 60, async () => 42)).toBe(42);
  });

  it("getOrSet caches and returns from cache on hit", async () => {
    const { cache, fake } = makeCache();
    let calls = 0;
    const fetcher = async () => { calls += 1; return { hello: "world" }; };
    const a = await cache.getOrSet("greeting", 60, fetcher);
    const b = await cache.getOrSet("greeting", 60, fetcher);
    expect(a).toEqual({ hello: "world" });
    expect(b).toEqual({ hello: "world" });
    expect(calls).toBe(1);
    expect(fake.store.has("greeting")).toBe(true);
  });

  it("invalidateUser deletes the canonical user keys", async () => {
    const { cache, fake } = makeCache();
    await cache.set("state:abc", { x: 1 }, 60);
    await cache.set("me:abc", { x: 2 }, 60);
    await cache.set("packs:abc", { x: 3 }, 60);
    await cache.invalidateUser("abc");
    expect(fake.store.has("state:abc")).toBe(false);
    expect(fake.store.has("me:abc")).toBe(false);
    expect(fake.store.has("packs:abc")).toBe(false);
  });

  it("incrRateLimit returns post-increment counter", async () => {
    const { cache } = makeCache();
    expect(await cache.incrRateLimit("test", "user-1", 60)).toBe(1);
    expect(await cache.incrRateLimit("test", "user-1", 60)).toBe(2);
    expect(await cache.incrRateLimit("test", "user-1", 60)).toBe(3);
  });

  it("idempotency stores and retrieves payloads", async () => {
    const { cache } = makeCache();
    expect(await cache.takeIdempotency("token", "key1")).toBeNull();
    await cache.storeIdempotency("token", "key1", { ok: true, packId: 42 });
    expect(await cache.takeIdempotency("token", "key1")).toEqual({ ok: true, packId: 42 });
  });

  it("withSingleFlight runs fetcher exactly once per cold key", async () => {
    const { cache } = makeCache();
    let calls = 0;
    const fetcher = async () => { calls += 1; await new Promise((r) => setTimeout(r, 10)); return { v: calls }; };
    const result = await cache.withSingleFlight("hot-key", 60, fetcher);
    expect(result).toEqual({ v: 1 });
    expect(calls).toBe(1);

    // Second call should hit the cache
    const cached = await cache.withSingleFlight("hot-key", 60, fetcher);
    expect(cached).toEqual({ v: 1 });
    expect(calls).toBe(1);
  });
});
