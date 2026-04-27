// Orchestrator: builds (if needed), spins up the preview server + 3 backends,
// runs backend and frontend concurrency tests, then tears everything down.
//
// Designed to be safe to re-run: ports are configurable via env vars and the
// wikipedia-gacha SQLite store is pointed to a tmp dir to avoid polluting the
// real store.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { waitForHealth } from "./lib/http-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

const PREVIEW_PORT = Number(process.env.PREVIEW_PORT || 4173);
const COSMIC_PORT = Number(process.env.COSMIC_PORT || 8787);
const PENALTY_PORT = Number(process.env.PENALTY_PORT || 8788);
const GACHA_PORT = Number(process.env.GACHA_PORT || 8791);

function startProc(name, command, args, env, logName) {
  const logPath = path.join(REPO_ROOT, `concurrency-${logName}.log`);
  return fs.open(logPath, "w").then((fh) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", fh.fd, fh.fd],
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      console.log(`[${name}] exited with code ${code}`);
    });
    return { name, child, logPath, fh };
  });
}

async function killProc(proc) {
  return new Promise((resolve) => {
    if (!proc.child || proc.child.killed) {
      proc.fh?.close().catch(() => {});
      resolve();
      return;
    }
    proc.child.once("exit", () => {
      proc.fh?.close().catch(() => {});
      resolve();
    });
    if (process.platform === "win32") {
      // SIGTERM is unreliable on Windows; use taskkill /T /F.
      spawn("taskkill", ["/PID", String(proc.child.pid), "/T", "/F"], { shell: true });
    } else {
      proc.child.kill("SIGTERM");
    }
    setTimeout(() => {
      try { proc.child.kill("SIGKILL"); } catch { /* ignore */ }
      resolve();
    }, 5_000);
  });
}

async function ensureBuild() {
  const indexPath = path.join(REPO_ROOT, "dist", "index.html");
  try {
    await fs.access(indexPath);
    console.log("✓ dist/ already built — reusing.");
  } catch {
    console.log("Building production bundle (vite build) …");
    await new Promise((resolve, reject) => {
      const child = spawn("npm", ["run", "build"], {
        cwd: REPO_ROOT,
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build failed ${code}`))));
    });
  }
}

async function main() {
  await ensureBuild();

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "concurrency-"));
  const gachaDb = path.join(tmpRoot, "wikipedia-gacha.sqlite");
  console.log(`Using temp wikipedia-gacha DB at ${gachaDb}`);

  const procs = [];
  const cleanup = async () => {
    console.log("\nShutting down …");
    await Promise.all(procs.map(killProc));
  };
  process.once("SIGINT", async () => { await cleanup(); process.exit(130); });
  process.once("SIGTERM", async () => { await cleanup(); process.exit(143); });

  try {
    procs.push(await startProc("preview", "npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", String(PREVIEW_PORT)], {}, "preview"));
    procs.push(await startProc("cosmic-vanguard", "node", ["server/cosmic-vanguard-backend.mjs"], { PORT: String(COSMIC_PORT) }, "cosmic"));
    procs.push(await startProc("penalty-shootout", "node", ["server/penalty-shootout/index.mjs"], { PORT: String(PENALTY_PORT) }, "penalty"));
    procs.push(await startProc("wikipedia-gacha", "node", ["server/wikipedia-gacha/index.mjs"], {
      PORT: String(GACHA_PORT),
      WIKIPEDIA_GACHA_DB_PATH: gachaDb,
      // Bump rate-limit so 500 distinct sessions can each open a pack within
      // the test window without tripping the per-token limiter.
      WIKIPEDIA_GACHA_RATE_LIMIT_PER_MIN: "10000",
    }, "gacha"));

    console.log("Waiting for health checks …");
    await Promise.all([
      waitForHealth(`http://127.0.0.1:${COSMIC_PORT}/health`),
      waitForHealth(`http://127.0.0.1:${PENALTY_PORT}/health`),
      waitForHealth(`http://127.0.0.1:${GACHA_PORT}/health`),
      waitForHealth(`http://127.0.0.1:${PREVIEW_PORT}/`, { timeoutMs: 30_000 }),
    ]);
    console.log("✓ All services up.");

    const env = {
      COSMIC_BASE: `http://127.0.0.1:${COSMIC_PORT}`,
      PENALTY_BASE: `http://127.0.0.1:${PENALTY_PORT}`,
      GACHA_BASE: `http://127.0.0.1:${GACHA_PORT}`,
      PREVIEW_BASE: `http://127.0.0.1:${PREVIEW_PORT}`,
    };

    const runOne = (script) =>
      new Promise((resolve, reject) => {
        const child = spawn("node", [script], {
          cwd: REPO_ROOT,
          stdio: "inherit",
          env: { ...process.env, ...env },
        });
        child.on("exit", (code) => (code === 0 ? resolve(0) : resolve(code)));
        child.on("error", reject);
      });

    const backendCode = await runOne("tests/concurrency/run-backend-load.mjs");
    const frontendCode = await runOne("tests/concurrency/run-frontend-load.mjs");

    const finalCode = (backendCode === 0 && frontendCode === 0) ? 0 : 1;
    await cleanup();
    process.exit(finalCode);
  } catch (err) {
    console.error(err);
    await cleanup();
    process.exit(2);
  }
}

main();
