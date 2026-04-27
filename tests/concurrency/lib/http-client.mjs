// Shared HTTP client with keep-alive Agents per host:port.
// Concurrency runners reuse this so we measure the server, not Node socket churn.

import http from "node:http";
import { performance } from "node:perf_hooks";

const agents = new Map();

function getAgent(parsedUrl) {
  const key = `${parsedUrl.hostname}:${parsedUrl.port}`;
  let agent = agents.get(key);
  if (!agent) {
    agent = new http.Agent({ keepAlive: true, maxSockets: 1024, maxFreeSockets: 256 });
    agents.set(key, agent);
  }
  return agent;
}

export function destroyAllAgents() {
  for (const agent of agents.values()) agent.destroy();
  agents.clear();
}

export function request({ url, method = "GET", headers = {}, body = null, timeoutMs = 10_000 }) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const start = performance.now();
    const payload = body == null ? null : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    const reqOptions = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: `${parsedUrl.pathname}${parsedUrl.search}`,
      agent: getAgent(parsedUrl),
      headers: {
        Accept: "application/json",
        Connection: "keep-alive",
        ...(payload ? { "Content-Type": "application/json", "Content-Length": payload.length } : {}),
        ...headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const durationMs = performance.now() - start;
        const buffer = Buffer.concat(chunks);
        let parsed = null;
        if (buffer.length > 0) {
          try { parsed = JSON.parse(buffer.toString("utf8")); } catch { parsed = buffer.toString("utf8"); }
        }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, durationMs, body: parsed });
      });
      res.on("error", (err) => {
        resolve({ ok: false, status: 0, durationMs: performance.now() - start, error: String(err) });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", (err) => {
      resolve({ ok: false, status: 0, durationMs: performance.now() - start, error: String(err) });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

export async function waitForHealth(url, { timeoutMs = 30_000, intervalMs = 250 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    const result = await request({ url, method: "GET", timeoutMs: 2_000 });
    if (result.ok) return true;
    lastError = result.error || `status ${result.status}`;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Health check at ${url} did not return ok within ${timeoutMs}ms (last: ${lastError})`);
}
