import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const publicDir = path.join(repoRoot, "public");
const gamesSource = path.join(repoRoot, "src", "data", "games.js");
const locales = ["en", "es"];

const categorySlugs = {
  Accion: { en: "action", es: "accion" },
  Arcade: { en: "arcade", es: "arcade" },
  Aventura: { en: "adventure", es: "aventura" },
  Carreras: { en: "racing", es: "carreras" },
  Conocimiento: { en: "knowledge", es: "conocimiento" },
  Deportes: { en: "sports", es: "deportes" },
  Estrategia: { en: "strategy", es: "estrategia" },
  Juegos: { en: "games", es: "juegos" },
  RPG: { en: "rpg", es: "rpg" },
};

function normalizeSiteUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";
  return url.replace(/\/+$/, "");
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractGames(source) {
  const games = [];
  const seen = new Set();
  const gamePattern = /\{\s*id:\s*"([^"]+)"[\s\S]*?\bcategory:\s*"([^"]+)"/g;
  let match;

  while ((match = gamePattern.exec(source))) {
    const id = match[1];
    if (seen.has(id)) continue;
    seen.add(id);
    games.push({ id, category: match[2] });
  }

  return games;
}

function buildSitemap(siteUrl, games) {
  const lastmod = process.env.SEO_LASTMOD || new Date().toISOString().slice(0, 10);
  const categories = [...new Set(games.map((game) => game.category))].filter((category) => categorySlugs[category]);
  const urls = [
    ...locales.map((locale) => ({
      loc: `${siteUrl}/${locale}/`,
      priority: locale === "en" ? "1.0" : "0.9",
      changefreq: "weekly",
    })),
    ...locales.flatMap((locale) => categories.map((category) => ({
      loc: `${siteUrl}/${locale}/categories/${categorySlugs[category][locale]}`,
      priority: "0.7",
      changefreq: "weekly",
    }))),
    ...locales.flatMap((locale) => games.map((game) => ({
      loc: `${siteUrl}/${locale}/games/${encodeURIComponent(game.id)}`,
      priority: "0.8",
      changefreq: "monthly",
    }))),
  ];

  const urlEntries = urls
    .map(
      (entry) => `  <url>
    <loc>${xmlEscape(entry.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

function buildRobots(siteUrl) {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
  ];

  if (siteUrl) {
    lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);
  } else {
    lines.push("# Set SITE_URL or VITE_SITE_URL before building to publish an absolute Sitemap URL.");
  }

  return `${lines.join("\n")}\n`;
}

await mkdir(publicDir, { recursive: true });

const siteUrl = normalizeSiteUrl(process.env.SITE_URL || process.env.VITE_SITE_URL);
const source = await readFile(gamesSource, "utf8");
const games = extractGames(source);

await writeFile(path.join(publicDir, "robots.txt"), buildRobots(siteUrl), "utf8");

if (siteUrl) {
  await writeFile(path.join(publicDir, "sitemap.xml"), buildSitemap(siteUrl, games), "utf8");
}

const categoryCount = new Set(games.map((game) => game.category)).size;
const sitemapStatus = siteUrl
  ? `${(games.length + categoryCount + 1) * locales.length} URLs`
  : "skipped without SITE_URL/VITE_SITE_URL";
console.log(`SEO assets generated: robots.txt, sitemap ${sitemapStatus}`);
