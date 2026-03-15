import { createServer } from "node:http";
import { penaltyShootoutService } from "./service.mjs";

const port = Number(process.env.PORT || 8788);

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Idempotency-Key",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body.");
    error.statusCode = 400;
    error.code = "invalid_json_body";
    throw error;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || `127.0.0.1:${port}`}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Idempotency-Key",
    });
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      json(res, 200, { ok: true, service: "penalty-shootout-backend" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/penalty-shootout/teams") {
      json(res, 200, { teams: await penaltyShootoutService.getPublicTeams() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/penalty-shootout/stats") {
      json(res, 200, await penaltyShootoutService.getStats());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/penalty-shootout/matches") {
      json(res, 201, await penaltyShootoutService.createMatch(await readBody(req)));
      return;
    }

    const matchStateMatch = url.pathname.match(/^\/api\/penalty-shootout\/matches\/([^/]+)$/);
    if (req.method === "GET" && matchStateMatch) {
      json(res, 200, await penaltyShootoutService.getMatchState(matchStateMatch[1]));
      return;
    }

    const shotMatch = url.pathname.match(/^\/api\/penalty-shootout\/matches\/([^/]+)\/shots$/);
    if (req.method === "POST" && shotMatch) {
      json(
        res,
        200,
        await penaltyShootoutService.submitShot(shotMatch[1], await readBody(req), {
          idempotencyKey: req.headers["idempotency-key"] ? String(req.headers["idempotency-key"]) : undefined,
        })
      );
      return;
    }

    json(res, 404, { error: "not_found" });
  } catch (error) {
    json(res, error.statusCode || 500, {
      error: error.code || "internal_error",
      message: error.message || "Unexpected server error.",
    });
  }
});

server.listen(port, () => {
  console.log(`Penalty shootout backend listening on http://127.0.0.1:${port}`);
});
