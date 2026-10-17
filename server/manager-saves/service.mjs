/**
 * Cloud slots for Modo mánager careers.
 *
 * One code per career: `XXXX-XXXX-XXXX-XXXX` (Crockford base32). The first
 * eight characters name the slot, the last eight are its key; whoever has the
 * whole code can load and keep saving the career from any device. Only the
 * latest version is served, already compressed by the client (gzip, codec 2),
 * and the one before it is kept as a fallback, so storage grows with active
 * careers, not with saves made. Slots nobody opens for `retentionDays` are
 * deleted by `sweep()`.
 *
 * Durability: every version is its own file, written to a temporary name,
 * flushed to disk and renamed; the slot's metadata is the commit point and is
 * replaced the same way. A crash at any moment leaves the previous version
 * intact and reachable. Operations on one slot run one after another, so two
 * devices saving at once never interleave their writes. A version whose bytes
 * no longer match their SHA-256 is never served: the previous one is.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, rename, rm, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const MAX_SAVE_BYTES = 4 * 1024 * 1024;
const DAY = 86_400_000;

export class SaveError extends Error {
  constructor(statusCode, code, message = code) { super(message); this.statusCode = statusCode; this.code = code; }
}

function token(length) {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte & 31];
  return out;
}

/** Normalises user input: case, spaces, dashes and the usual look-alikes (O→0, I/L→1). */
export function parseCode(input) {
  const clean = String(input || "").toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(clean)) throw new SaveError(400, "invalid_code");
  return { id: clean.slice(0, 8), key: clean.slice(8) };
}

export const formatCode = (id, key) => `${id}${key}`.match(/.{4}/g).join("-");

const keyHash = (id, key) => createHash("sha256").update(`${id}:${key}`).digest();
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

function checkBlob(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 20) throw new SaveError(400, "empty_save");
  if (bytes.length > MAX_SAVE_BYTES) throw new SaveError(413, "save_too_large");
  // Only compressed career snapshots are accepted.
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new SaveError(415, "save_not_gzip");
}

/** Runs tasks on the same key one after another; different keys run in parallel. */
function keyedQueue() {
  const tails = new Map();
  return (key, task) => {
    const previous = tails.get(key) || Promise.resolve();
    const run = previous.then(task, task);
    const tail = run.catch(() => {});
    tails.set(key, tail);
    tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
    return run;
  };
}

export function createManagerSaveService({ root, retentionDays = 365, now = () => Date.now() } = {}) {
  if (!root) throw new Error("root is required");
  const slotDir = (id) => path.join(root, id.slice(0, 2), id.slice(2, 4));
  const metaPath = (id) => path.join(slotDir(id), `${id}.json`);
  // Slots written before versioned files kept their bytes in `<id>.gz`.
  const blobPath = (id, version) => path.join(slotDir(id), version == null ? `${id}.gz` : `${id}.v${version}.gz`);
  const serial = keyedQueue();

  async function readMeta(id) {
    try { return JSON.parse(await readFile(metaPath(id), "utf8")); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  /** Temporary file, flushed to disk, then renamed over the target: readers see the old file or the new one, whole. */
  async function durableWrite(file, data) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${token(6)}.tmp`;
    const handle = await open(temporary, "w");
    try {
      await handle.writeFile(data);
      await handle.sync();
    } finally {
      await handle.close();
    }
    try { await rename(temporary, file); }
    catch (error) { await rm(temporary, { force: true }); throw error; }
  }
  async function authorise(code) {
    const { id, key } = parseCode(code);
    const meta = await readMeta(id);
    if (!meta || meta.expiresAt < now()) throw new SaveError(404, "save_not_found");
    const expected = Buffer.from(meta.keyHash, "hex");
    if (!timingSafeEqual(expected, keyHash(id, key))) throw new SaveError(404, "save_not_found");
    return { id, key, meta };
  }
  const expiry = () => now() + retentionDays * DAY;
  const fileOf = (meta) => (meta.file === undefined ? null : meta.file);

  /** The bytes of the current version, or of the previous one if the current file is missing or damaged. */
  async function readVersion(id, meta) {
    const candidates = [{ version: fileOf(meta), sha256: meta.sha256, number: meta.version }];
    if (meta.previous) candidates.push({ version: meta.previous.file, sha256: meta.previous.sha256, number: meta.previous.version });
    for (const candidate of candidates) {
      try {
        const bytes = await readFile(blobPath(id, candidate.version));
        if (!candidate.sha256 || sha(bytes) === candidate.sha256) return { bytes, version: candidate.number };
        console.error(`manager-saves: ${id} version ${candidate.number} does not match its checksum`);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    throw new SaveError(500, "save_unreadable");
  }

  return {
    async create(bytes) {
      checkBlob(bytes);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const id = token(8), key = token(8);
        const created = await serial(id, async () => {
          if (await readMeta(id)) return null;
          await durableWrite(blobPath(id, 1), bytes);
          const meta = { keyHash: keyHash(id, key).toString("hex"), bytes: bytes.length, sha256: sha(bytes), file: 1,
            createdAt: now(), updatedAt: now(), expiresAt: expiry(), version: 1 };
          await durableWrite(metaPath(id), JSON.stringify(meta));
          return meta;
        });
        if (created) return { code: formatCode(id, key), bytes: bytes.length, version: 1, expiresAt: created.expiresAt };
      }
      throw new SaveError(503, "code_space_busy");
    },
    async update(code, bytes) {
      checkBlob(bytes);
      const { id } = parseCode(code);
      return serial(id, async () => {
        const { key, meta } = await authorise(code);
        const sha256 = sha(bytes);
        const version = meta.version + 1;
        let next;
        if (sha256 === meta.sha256) {
          next = { ...meta, updatedAt: now(), expiresAt: expiry(), version };
        } else {
          // New file first; the metadata switch below is the commit.
          await durableWrite(blobPath(id, version), bytes);
          next = { ...meta, bytes: bytes.length, sha256, file: version, updatedAt: now(), expiresAt: expiry(), version,
            previous: { file: fileOf(meta), sha256: meta.sha256, version: meta.version, bytes: meta.bytes } };
        }
        await durableWrite(metaPath(id), JSON.stringify(next));
        // Only the current version and the one before it are kept.
        if (next.previous && meta.previous && meta.previous.file !== next.file && meta.previous.file !== next.previous.file) {
          await rm(blobPath(id, meta.previous.file), { force: true });
        }
        return { code: formatCode(id, key), bytes: next.bytes, version, expiresAt: next.expiresAt };
      });
    },
    async load(code) {
      const { id } = parseCode(code);
      return serial(id, async () => {
        const { meta } = await authorise(code);
        const { bytes, version } = await readVersion(id, meta);
        // Opening a career keeps it alive; once a day is enough to rewrite the metadata.
        if (expiry() - meta.expiresAt > DAY) await durableWrite(metaPath(id), JSON.stringify({ ...meta, expiresAt: expiry() }));
        return { bytes, version, updatedAt: meta.updatedAt };
      });
    },
    async remove(code) {
      const { id } = parseCode(code);
      return serial(id, async () => {
        const { meta } = await authorise(code);
        await rm(metaPath(id), { force: true });
        await rm(blobPath(id, fileOf(meta)), { force: true });
        if (meta.previous) await rm(blobPath(id, meta.previous.file), { force: true });
        return { removed: true };
      });
    },
    /** Deletes expired slots; returns how many. */
    async sweep() {
      let removed = 0;
      const walk = async (dir, depth) => {
        let entries;
        try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory() && depth < 2) await walk(full, depth + 1);
          else if (entry.isFile() && entry.name.endsWith(".json")) {
            const id = entry.name.slice(0, -5);
            await serial(id, async () => {
              try {
                const meta = JSON.parse(await readFile(full, "utf8"));
                if (meta.expiresAt >= now()) return;
                await rm(full, { force: true });
                await rm(blobPath(id, fileOf(meta)), { force: true });
                if (meta.previous) await rm(blobPath(id, meta.previous.file), { force: true });
                removed += 1;
              } catch { /* unreadable right now: next sweep */ }
            });
          } else if (entry.isFile() && entry.name.endsWith(".tmp")) {
            const info = await stat(full).catch(() => null);
            if (info && now() - info.mtimeMs > DAY) await rm(full, { force: true });
          }
        }
      };
      await walk(root, 0);
      return removed;
    },
  };
}
