/**
 * Load test of the Modo mánager stack behind nginx: N simultaneous players
 * open the catalog, start the game (its chunks and one season), browse crests
 * and save their career in the cloud (create, update, load), all at once.
 *
 *   node scripts/load-test-manager.mjs --base https://localhost:8443 --insecure --users 300 --rounds 3
 *
 * Every request must answer with the expected status, and the p95 of each kind
 * must stay under --budget ms (500 by default). Each user gets its own client
 * IP header only when --spread-ips is passed (nginx must trust it to use it).
 */
import { gzipSync } from "node:zlib";
import { Agent, fetch, setGlobalDispatcher } from "undici";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const BASE = arg("base", "https://localhost:8443").replace(/\/$/, "");
const USERS = Number(arg("users", 300));
const ROUNDS = Number(arg("rounds", 3));
const BUDGET = Number(arg("budget", 500));
const SPREAD = process.argv.includes("--spread-ips");
// --insecure only for a local stack with the self-signed certificate of deploy/nginx.
const INSECURE = process.argv.includes("--insecure");

// Browsers keep a handful of connections per host; so does each simulated player.
setGlobalDispatcher(new Agent({ connections: USERS * 4, pipelining: 1, connect: INSECURE ? { rejectUnauthorized: false } : {}, keepAliveTimeout: 30_000 }));

const timings = new Map();
const failures = [];
async function hit(kind, path, init = {}, expect = [200]) {
  const started = performance.now();
  let status = 0;
  try {
    const response = await fetch(BASE + path, { ...init, headers: { "accept-encoding": "gzip", ...(init.headers || {}) } });
    status = response.status;
    const body = Buffer.from(await response.arrayBuffer());
    const ms = performance.now() - started;
    if (!timings.has(kind)) timings.set(kind, []);
    timings.get(kind).push(ms);
    if (!expect.includes(status)) failures.push(`${kind} ${path} -> ${status}`);
    return { status, body, headers: response.headers };
  } catch (error) {
    failures.push(`${kind} ${path} -> ${error.cause?.code || error.message}`);
    return { status, body: Buffer.alloc(0), headers: new Headers() };
  }
}

// What a browser fetches: the page, its entry chunks, the manager's chunks and a season.
const page = await hit("html", "/es/games/sports-manager");
const html = page.body.toString();
const entry = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]);
const listing = await hit("html", "/");
if (!entry.length) throw new Error(`no entry assets in ${BASE} (status ${page.status})`);
const assets = (process.env.MANAGER_ASSETS || "").split(",").filter(Boolean);
const crests = ["real-madrid.svg", "barcelona.svg", "sevilla.svg", "real-betis.svg", "liverpool.svg", "getafe.svg", "valencia.svg", "athletic-club.svg"]
  .flatMap((name) => [`/assets/football/thumbs/crests/${name}.64.webp`, `/assets/football/thumbs/crests/${name}.192.webp`]);
const career = (user, round) => gzipSync(JSON.stringify({ format: "gamelock-manager", v: 4, user, round, filler: "x".repeat(200_000 + (user % 7) * 10_000) }));

async function player(user) {
  const headers = SPREAD ? { "x-forwarded-for": `10.${(user >> 8) & 255}.${user & 255}.1` } : {};
  for (const path of entry) await hit("entry asset", path, { headers });
  await Promise.all(assets.map((path) => hit("game chunk", path, { headers })));
  await Promise.all(crests.map((path) => hit("crest", path, { headers })));
  let code = null;
  for (let round = 0; round < ROUNDS; round += 1) {
    const body = career(user, round);
    const saved = code
      ? await hit("save update (PUT)", `/api/manager-saves/${code}`, { method: "PUT", body, headers: { ...headers, "content-type": "application/gzip" } })
      : await hit("save create (POST)", "/api/manager-saves", { method: "POST", body, headers: { ...headers, "content-type": "application/gzip" } }, [201]);
    if (saved.status < 300) code = JSON.parse(saved.body.toString()).code;
    if (code) {
      const loaded = await hit("save load (GET)", `/api/manager-saves/${code}`, { headers });
      if (loaded.status === 200 && !loaded.body.equals(body)) failures.push(`save load ${code}: bytes differ from the last save`);
    }
  }
}

const started = performance.now();
await Promise.all(Array.from({ length: USERS }, (_, user) => player(user)));
const wall = (performance.now() - started) / 1000;

const pct = (list, p) => { const sorted = list.slice().sort((a, b) => a - b); return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]; };
let over = false;
console.log(`${USERS} simultaneous players, ${ROUNDS} cloud saves each, ${wall.toFixed(1)} s wall time`);
console.log("kind".padEnd(22), "requests".padStart(8), "p50".padStart(8), "p95".padStart(8), "p99".padStart(8), "max".padStart(8));
for (const [kind, list] of timings) {
  const p95 = pct(list, 95);
  if (p95 > BUDGET) over = true;
  console.log(kind.padEnd(22), String(list.length).padStart(8), ...[50, 95, 99, 100].map((p) => `${pct(list, p).toFixed(0)}ms`.padStart(8)));
}
console.log(failures.length ? `${failures.length} failed requests, e.g.\n  ${[...new Set(failures)].slice(0, 8).join("\n  ")}` : "0 failed requests");
if (failures.length || over) process.exitCode = 1;
