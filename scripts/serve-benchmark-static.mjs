import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const HOST = process.env.BENCH_SERVER_HOST || "127.0.0.1";
const PORT = Number(process.env.BENCH_SERVER_PORT || 4173);

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

function resolveRequestPath(urlPathname) {
  const normalized = urlPathname === "/" ? "/index.html" : decodeURIComponent(urlPathname);
  const safePath = path.normalize(normalized).replace(/^(\.\.[/\\])+/, "");
  return path.join(DIST_DIR, safePath.replace(/^\//, ""));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  const filePath = resolveRequestPath(url.pathname);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": stats.size,
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end("Read error");
    });
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Benchmark static server listening on http://${HOST}:${PORT}`);
});
