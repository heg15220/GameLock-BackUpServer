import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createManagerSaveService, MAX_SAVE_BYTES, SaveError } from "./service.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8794);
const root = process.env.MANAGER_SAVES_DIR || path.join(__dirname, "..", "data", "manager-saves");
const service = createManagerSaveService({ root, retentionDays: Number(process.env.MANAGER_SAVES_RETENTION_DAYS || 365) });

// Writes are the expensive operation: a few per minute and IP is plenty for a person.
const WRITE_LIMIT = Number(process.env.MANAGER_SAVES_WRITES_PER_MIN || 12);
const READ_LIMIT = Number(process.env.MANAGER_SAVES_READS_PER_MIN || 60);
const buckets = new Map();
function allow(ip, kind, limit) {
  const key = `${kind}:${ip}`, minute = Math.floor(Date.now() / 60_000);
  const bucket = buckets.get(key);
  if (!bucket || bucket.minute !== minute) { buckets.set(key, { minute, count: 1 }); return true; }
  bucket.count += 1;
  return bucket.count <= limit;
}
setInterval(() => { const minute = Math.floor(Date.now() / 60_000); for (const [key, bucket] of buckets) if (bucket.minute < minute) buckets.delete(key); }, 60_000).unref();

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};
function json(res, statusCode, payload) {
  res.writeHead(statusCode, { ...headers, "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const declared = Number(req.headers["content-length"] || 0);
  if (declared > MAX_SAVE_BYTES) throw new SaveError(413, "save_too_large");
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_SAVE_BYTES) throw new SaveError(413, "save_too_large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  const ip = String(req.headers["x-real-ip"] || req.socket.remoteAddress || "unknown");
  if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }
  try {
    if (req.method === "GET" && url.pathname === "/health") { json(res, 200, { ok: true, service: "manager-saves-backend" }); return; }
    const slot = /^\/api\/manager-saves\/([0-9A-Za-z-]{16,24})$/.exec(url.pathname);
    const write = req.method !== "GET";
    if ((url.pathname === "/api/manager-saves" || slot) && !allow(ip, write ? "w" : "r", write ? WRITE_LIMIT : READ_LIMIT)) throw new SaveError(429, "rate_limited");
    if (req.method === "POST" && url.pathname === "/api/manager-saves") { json(res, 201, await service.create(await readBody(req))); return; }
    if (slot && req.method === "PUT") { json(res, 200, await service.update(slot[1], await readBody(req))); return; }
    if (slot && req.method === "DELETE") { json(res, 200, await service.remove(slot[1])); return; }
    if (slot && req.method === "GET") {
      const { bytes, version, updatedAt } = await service.load(slot[1]);
      res.writeHead(200, { ...headers, "Content-Type": "application/gzip", "Content-Length": bytes.length, "X-Save-Version": String(version), "X-Save-Updated": new Date(updatedAt).toISOString(), "Access-Control-Expose-Headers": "X-Save-Version, X-Save-Updated" });
      res.end(bytes);
      return;
    }
    json(res, 404, { error: "not_found" });
  } catch (error) {
    const status = error instanceof SaveError ? error.statusCode : 500;
    if (status === 500) console.error(error);
    json(res, status, { error: error.code || "internal_error" });
  }
});

// nginx keeps upstream connections open: Node must not close them first, or a reused socket fails with 502.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;
server.listen(port, process.env.HOST || "0.0.0.0", () => console.log(`manager-saves-backend on ${port}, data in ${root}`));

// A deploy stops the container with SIGTERM: finish the saves in flight before exiting.
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(() => process.exit(0));
    server.closeIdleConnections?.();
    setTimeout(() => process.exit(0), 15_000).unref();
  });
}
// Expired careers are removed once a day.
const sweep = () => service.sweep().then((removed) => removed && console.log(`expired saves removed: ${removed}`)).catch((error) => console.error(error));
setTimeout(sweep, 30_000).unref();
setInterval(sweep, 86_400_000).unref();
