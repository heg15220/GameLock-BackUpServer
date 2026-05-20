import { brotliCompressSync, brotliDecompressSync, constants as zlibConstants } from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Default TTLs in seconds, tuned for the access patterns described in the
// caching strategy doc. Each is overridable via env vars at runtime.
const DEFAULT_TTLS = {
  state:        Number(process.env.WGC_CACHE_TTL_STATE        || 600),
  collection:   Number(process.env.WGC_CACHE_TTL_COLLECTION   || 60),
  packStatus:   Number(process.env.WGC_CACHE_TTL_PACK_STATUS  || 5),
  sessionMe:    Number(process.env.WGC_CACHE_TTL_SESSION_ME   || 30),
  missions:     Number(process.env.WGC_CACHE_TTL_MISSIONS     || 60),
  trophies:     Number(process.env.WGC_CACHE_TTL_TROPHIES     || 600),
  article:      Number(process.env.WGC_CACHE_TTL_ARTICLE      || 6 * 3600),
  search:       Number(process.env.WGC_CACHE_TTL_SEARCH       || 5 * 60),
  idempotency:  Number(process.env.WGC_CACHE_TTL_IDEMPOTENCY  || 3600),
  rateLimit:    Number(process.env.WGC_CACHE_TTL_RATE_LIMIT   || 60),
};

const COMPRESS_HEADER = Buffer.from("WGCCv1");
const COMPRESS_THRESHOLD_BYTES = 1024;
const SINGLE_FLIGHT_LOCK_TTL_MS = 5_000;
const SINGLE_FLIGHT_RETRY_DELAYS_MS = [50, 100, 200];

// Atomic single-flight script. Returns {0, value} on cache hit,
// {1, null} when the caller wins the lock and must hydrate, or
// {2, null} when another caller already holds the lock.
const SINGLE_FLIGHT_SCRIPT = `
local cached = redis.call('GET', KEYS[1])
if cached then return {0, cached} end
local lock = redis.call('SET', KEYS[2], ARGV[1], 'NX', 'EX', ARGV[2])
if lock then return {1, false} end
return {2, false}
`;

function compress(value) {
  const json = Buffer.from(JSON.stringify(value), "utf8");
  if (json.length < COMPRESS_THRESHOLD_BYTES) {
    return json;
  }
  const compressed = brotliCompressSync(json, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 },
  });
  return Buffer.concat([COMPRESS_HEADER, compressed]);
}

function decompress(buffer) {
  if (!buffer) return null;
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length >= COMPRESS_HEADER.length && buf.slice(0, COMPRESS_HEADER.length).equals(COMPRESS_HEADER)) {
    const decompressed = brotliDecompressSync(buf.slice(COMPRESS_HEADER.length));
    return JSON.parse(decompressed.toString("utf8"));
  }
  return JSON.parse(buf.toString("utf8"));
}

function loadIoredis() {
  try {
    return require("ioredis");
  } catch (error) {
    const wrapped = new Error(
      "Redis cache requires the 'ioredis' package. Install it with `npm install ioredis` or unset REDIS_URL to disable caching."
    );
    wrapped.cause = error;
    throw wrapped;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// No-op cache used when REDIS_URL is unset (tests, dev without Redis). Every
// `get` misses, every `set` is silently dropped — the service still functions,
// just without the latency benefit.
function createNoopCache() {
  return {
    enabled: false,
    health: () => ({ status: "disabled" }),
    async get() { return null; },
    async set() {},
    async del() {},
    async invalidateUser() {},
    async invalidateUserScoped() {},
    async getOrSet(_key, _ttl, fetchFn) { return fetchFn(); },
    async withSingleFlight(_key, _ttl, fetchFn) { return fetchFn(); },
    async takeIdempotency() { return null; },
    async storeIdempotency() {},
    async incrRateLimit() { return 1; },
    async ping() { return false; },
    async close() {},
    ttls: { ...DEFAULT_TTLS },
  };
}

export function createCache({
  redisUrl = process.env.REDIS_URL,
  keyPrefix = process.env.WGC_REDIS_PREFIX ?? "wgc:",
  disabled = process.env.WIKIPEDIA_GACHA_CACHE_DISABLED === "1",
  RedisCtor = null,
} = {}) {
  if (disabled || !redisUrl) {
    return createNoopCache();
  }

  const Redis = RedisCtor ?? loadIoredis().default ?? loadIoredis();
  const client = new Redis(redisUrl, {
    keyPrefix,
    enableAutoPipelining: true,
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 2_000),
  });

  let healthState = "connecting";
  client.on("ready", () => { healthState = "ok"; });
  client.on("error", () => { healthState = "degraded"; });
  client.on("end", () => { healthState = "closed"; });
  // Avoid unhandled-rejection noise when Redis is unreachable. The service
  // continues to function via the fail-open path in get/set wrappers.
  client.on("error", () => {});

  async function get(key) {
    try {
      const raw = await client.getBuffer(key);
      if (!raw) return null;
      return decompress(raw);
    } catch {
      return null;
    }
  }

  async function set(key, value, ttlSeconds) {
    try {
      const payload = compress(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await client.set(key, payload, "EX", ttlSeconds);
      } else {
        await client.set(key, payload);
      }
    } catch { /* fail-open */ }
  }

  async function del(...keys) {
    if (!keys.length) return;
    try {
      await client.unlink(...keys);
    } catch {
      try { await client.del(...keys); } catch { /* fail-open */ }
    }
  }

  // Deletes by SCAN+UNLINK so a hot user with many cached collection pages is
  // invalidated atomically without blocking Redis (no KEYS *).
  async function delByPattern(pattern) {
    try {
      const stream = client.scanStream({
        match: keyPrefix ? `${keyPrefix}${pattern}` : pattern,
        count: 100,
      });
      const pending = [];
      for await (const keys of stream) {
        if (!keys.length) continue;
        // ioredis prepends keyPrefix automatically on writes but SCAN returns
        // raw keys. Strip prefix before passing back to UNLINK so it does not
        // get double-prefixed.
        const stripped = keys.map((k) =>
          keyPrefix && k.startsWith(keyPrefix) ? k.slice(keyPrefix.length) : k
        );
        pending.push(client.unlink(...stripped).catch(() => {}));
      }
      await Promise.all(pending);
    } catch { /* fail-open */ }
  }

  async function invalidateUser(browserToken) {
    if (!browserToken) return;
    await del(
      `state:${browserToken}`,
      `me:${browserToken}`,
      `packs:${browserToken}`,
      `troph:${browserToken}`,
      `hist:${browserToken}`,
    );
    await delByPattern(`col:${browserToken}:*`);
    await delByPattern(`colitem:${browserToken}:*`);
    await delByPattern(`hist:${browserToken}:*`);
    await delByPattern(`miss:${browserToken}:*`);
  }

  async function invalidateUserScoped(browserToken, scope) {
    if (!browserToken || !scope) return;
    await delByPattern(`${scope}:${browserToken}:*`);
  }

  async function getOrSet(key, ttlSeconds, fetchFn) {
    const cached = await get(key);
    if (cached !== null) return cached;
    const fresh = await fetchFn();
    if (fresh !== undefined && fresh !== null) {
      set(key, fresh, ttlSeconds).catch(() => {});
    }
    return fresh;
  }

  async function withSingleFlight(key, ttlSeconds, fetchFn) {
    const lockKey = `lock:${key}`;
    let attempt = 0;
    while (true) {
      let result;
      try {
        result = await client.eval(
          SINGLE_FLIGHT_SCRIPT,
          2,
          key,
          lockKey,
          "1",
          String(Math.ceil(SINGLE_FLIGHT_LOCK_TTL_MS / 1000)),
        );
      } catch {
        return fetchFn();
      }

      const status = Number(result?.[0]);
      const cachedRaw = result?.[1];

      if (status === 0 && cachedRaw) {
        try {
          const buf = Buffer.isBuffer(cachedRaw)
            ? cachedRaw
            : Buffer.from(String(cachedRaw), "binary");
          return decompress(buf);
        } catch {
          // fall through to refetch
        }
      }

      if (status === 1) {
        try {
          const fresh = await fetchFn();
          if (fresh !== undefined && fresh !== null) {
            await set(key, fresh, ttlSeconds);
          }
          return fresh;
        } finally {
          client.del(lockKey).catch(() => {});
        }
      }

      if (status === 2 && attempt < SINGLE_FLIGHT_RETRY_DELAYS_MS.length) {
        await delay(SINGLE_FLIGHT_RETRY_DELAYS_MS[attempt]);
        attempt += 1;
        continue;
      }

      // Lock contention exceeded retry budget — hydrate ourselves rather than
      // blocking the request indefinitely.
      return fetchFn();
    }
  }

  async function takeIdempotency(token, key) {
    if (!token || !key) return null;
    return get(`idem:${token}:${key}`);
  }

  async function storeIdempotency(token, key, value) {
    if (!token || !key) return;
    await set(`idem:${token}:${key}`, value, DEFAULT_TTLS.idempotency);
  }

  // INCR + EX in a single round-trip via pipelining. Returns the post-incr count.
  async function incrRateLimit(scope, identity, ttlSeconds = DEFAULT_TTLS.rateLimit) {
    if (!identity) return 0;
    const key = `rl:${scope}:${identity}`;
    try {
      const pipeline = client.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, ttlSeconds);
      const results = await pipeline.exec();
      return Number(results?.[0]?.[1] ?? 0);
    } catch {
      return 0;
    }
  }

  async function ping() {
    try {
      const reply = await client.ping();
      return reply === "PONG";
    } catch {
      return false;
    }
  }

  async function close() {
    try {
      await client.quit();
    } catch {
      try { client.disconnect(); } catch { /* ignore */ }
    }
  }

  return {
    enabled: true,
    health: () => ({ status: healthState }),
    get,
    set,
    del,
    delByPattern,
    invalidateUser,
    invalidateUserScoped,
    getOrSet,
    withSingleFlight,
    takeIdempotency,
    storeIdempotency,
    incrRateLimit,
    ping,
    close,
    ttls: { ...DEFAULT_TTLS },
  };
}

export const __cacheInternals = {
  compress,
  decompress,
  DEFAULT_TTLS,
  COMPRESS_HEADER,
  COMPRESS_THRESHOLD_BYTES,
};
