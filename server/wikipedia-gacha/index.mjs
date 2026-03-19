import { createServer } from "node:http";
import { URL } from "node:url";
import { wikipediaGachaService } from "./service.mjs";

const port = Number(process.env.PORT || 8791);

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type,X-Browser-Token,Accept,Idempotency-Key",
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

function parseBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value === "true" || value === true;
}

function getBrowserToken(req, body = {}) {
  return (
    req.headers["x-browser-token"] ||
    body.browserToken ||
    body.token ||
    null
  );
}

const server = createServer(async (req, res) => {
  const url = new URL(
    req.url || "/",
    `http://${req.headers.host || `127.0.0.1:${port}`}`
  );

  if (req.method === "OPTIONS") {
    writeJson(res, 204, {});
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      writeJson(res, 200, { ok: true, service: "wikipedia-gacha-backend" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/wikipedia-gacha/session/bootstrap") {
      writeJson(
        res,
        201,
        await wikipediaGachaService.bootstrapSession(await readBody(req))
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/session/me") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getSessionMe(getBrowserToken(req))
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/packs/status") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getPackStatus(getBrowserToken(req))
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/wikipedia-gacha/packs/open") {
      const body = await readBody(req);
      writeJson(
        res,
        200,
        await wikipediaGachaService.openPack(getBrowserToken(req, body))
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/packs/history") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getPackHistory(getBrowserToken(req))
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/collection") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getCollection(getBrowserToken(req), {
          page: url.searchParams.get("page"),
          pageSize: url.searchParams.get("pageSize"),
          query: url.searchParams.get("q"),
          rarity: url.searchParams.get("rarity"),
          sortBy: url.searchParams.get("sortBy"),
          topicGroup: url.searchParams.get("topicGroup"),
          favorite: parseBoolean(url.searchParams.get("favorite")),
          duplicatesOnly: parseBoolean(url.searchParams.get("duplicatesOnly")),
          newOnly: parseBoolean(url.searchParams.get("newOnly")),
        })
      );
      return;
    }

    const collectionItemMatch = url.pathname.match(
      /^\/api\/wikipedia-gacha\/collection\/(\d+)$/
    );
    if (req.method === "GET" && collectionItemMatch) {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getCollectionItem(
          getBrowserToken(req),
          Number(collectionItemMatch[1])
        )
      );
      return;
    }

    const favoriteMatch = url.pathname.match(
      /^\/api\/wikipedia-gacha\/collection\/(\d+)\/favorite$/
    );
    if (req.method === "PATCH" && favoriteMatch) {
      const body = await readBody(req);
      writeJson(
        res,
        200,
        await wikipediaGachaService.toggleFavorite(
          getBrowserToken(req, body),
          Number(favoriteMatch[1]),
          body.favorite
        )
      );
      return;
    }

    const articleMatch = url.pathname.match(
      /^\/api\/wikipedia-gacha\/articles\/(\d+)$/
    );
    if (req.method === "GET" && articleMatch) {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getArticle(
          Number(articleMatch[1]),
          req.headers["x-browser-token"] ? String(req.headers["x-browser-token"]) : null
        )
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/articles/search") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.searchArticles(url.searchParams.get("q"))
      );
      return;
    }

    const articleClickMatch = url.pathname.match(
      /^\/api\/wikipedia-gacha\/articles\/(\d+)\/click$/
    );
    if (req.method === "POST" && articleClickMatch) {
      const body = await readBody(req);
      writeJson(
        res,
        200,
        await wikipediaGachaService.registerArticleClick(
          getBrowserToken(req, body),
          Number(articleClickMatch[1])
        )
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/missions") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getMissions(getBrowserToken(req))
      );
      return;
    }

    const missionClaimMatch = url.pathname.match(
      /^\/api\/wikipedia-gacha\/missions\/(\d+)\/claim$/
    );
    if (req.method === "POST" && missionClaimMatch) {
      const body = await readBody(req);
      writeJson(
        res,
        200,
        await wikipediaGachaService.claimMission(
          getBrowserToken(req, body),
          Number(missionClaimMatch[1])
        )
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/trophies") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getTrophies(getBrowserToken(req))
      );
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/wikipedia-gacha/trophies/unlocked") {
      writeJson(
        res,
        200,
        await wikipediaGachaService.getTrophies(getBrowserToken(req), {
          unlockedOnly: true,
        })
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/wikipedia-gacha/recovery/export") {
      const body = await readBody(req);
      writeJson(
        res,
        200,
        await wikipediaGachaService.exportRecoveryCode(getBrowserToken(req, body))
      );
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/wikipedia-gacha/recovery/import") {
      const body = await readBody(req);
      writeJson(
        res,
        200,
        await wikipediaGachaService.importRecoveryCode(
          getBrowserToken(req, body),
          body.recoveryCode
        )
      );
      return;
    }

    writeJson(res, 404, { error: "not_found" });
  } catch (error) {
    writeJson(res, error.statusCode || 500, {
      error: error.code || "internal_error",
      message: error.message || "Unexpected server error.",
    });
  }
});

server.listen(port, () => {
  console.log(`Wikipedia Gacha backend listening on http://127.0.0.1:${port}`);
});
