import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(__dirname, "results");
const LATEST = path.join(RESULTS_DIR, "latest.json");

if (!fs.existsSync(LATEST)) {
  console.error("No results found. Run `npm run test:bench` first.");
  process.exit(2);
}

const data = JSON.parse(fs.readFileSync(LATEST, "utf-8"));

const color = (cls) => {
  switch (cls) {
    case "ok": return "#44d17a";
    case "warn": return "#f4b431";
    case "fail": return "#ef4444";
    default: return "#777";
  }
};

const fmt = (v, unit = "ms") => {
  if (v == null) return "—";
  return `${Number(v).toFixed(1)} ${unit}`;
};

const rows = data.games
  .slice()
  .sort((a, b) => (a.category === b.category ? a.id.localeCompare(b.id) : a.category.localeCompare(b.category)))
  .map((g) => {
    const cell = (value, cls, unit) =>
      `<td class="cell cell-${cls}" style="background:${color(cls)}1a;color:${color(cls)};">${fmt(value, unit)}</td>`;
    return `
<tr>
  <td>${g.category}</td>
  <td class="id">${g.id}</td>
  ${cell(g.metric1_ms, g.classification.metric1, "ms")}
  ${cell(g.metric2_ms, g.classification.metric2, "ms")}
  ${cell(g.metric3_input_p95_ms, g.classification.metric3, "ms")}
  ${cell(g.metric4_frame_p95_ms, g.classification.metric4, "ms")}
  <td>${g.passed ? "PASS" : `FAIL: ${g.failures.join(", ")}`}</td>
</tr>`;
  })
  .join("");

const totals = data.games.reduce(
  (acc, g) => {
    acc.total += 1;
    if (g.passed) acc.passed += 1;
    else acc.failed += 1;
    for (const m of ["metric1", "metric2", "metric3", "metric4"]) {
      acc.perMetric[m][g.classification[m]] = (acc.perMetric[m][g.classification[m]] || 0) + 1;
    }
    return acc;
  },
  {
    total: 0,
    passed: 0,
    failed: 0,
    perMetric: {
      metric1: { ok: 0, warn: 0, fail: 0, unknown: 0 },
      metric2: { ok: 0, warn: 0, fail: 0, unknown: 0 },
      metric3: { ok: 0, warn: 0, fail: 0, unknown: 0 },
      metric4: { ok: 0, warn: 0, fail: 0, unknown: 0 },
    },
  }
);

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Arcade + Deportes bench report</title>
<style>
  body { font: 14px/1.5 system-ui, sans-serif; background: #0f0f12; color: #e7e7e7; margin: 24px; }
  h1 { margin: 0 0 6px; }
  h2 { font-size: 14px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.6; margin: 24px 0 8px; }
  .meta { opacity: 0.7; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; background: #18181c; border-radius: 8px; overflow: hidden; }
  th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #24242a; }
  th { background: #1f1f24; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.8; }
  td.id { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
  td.cell { font-variant-numeric: tabular-nums; text-align: right; font-weight: 600; }
  .summary { display: flex; gap: 16px; margin: 12px 0 24px; flex-wrap: wrap; }
  .pill { padding: 6px 12px; border-radius: 6px; background: #24242a; }
  .pill.ok { color: #44d17a; }
  .pill.warn { color: #f4b431; }
  .pill.fail { color: #ef4444; }
</style>
</head>
<body>
  <h1>Arcade + Deportes · bench report</h1>
  <p class="meta">
    ${data.games.length} games · sampled ${data.sampleMs}ms each · hard fail ≥ ${data.hardFailMs}ms ·
    generated ${data.startedAt}
  </p>

  <h2>Summary</h2>
  <div class="summary">
    <span class="pill ${totals.failed === 0 ? "ok" : "fail"}">${totals.passed}/${totals.total} games pass</span>
    <span class="pill">Metric 1 (arrancar partida): ${totals.perMetric.metric1.ok} ok · ${totals.perMetric.metric1.warn} warn · ${totals.perMetric.metric1.fail} fail</span>
    <span class="pill">Metric 2 (time-to-match): ${totals.perMetric.metric2.ok} ok · ${totals.perMetric.metric2.warn} warn · ${totals.perMetric.metric2.fail} fail</span>
    <span class="pill">Metric 3 (input p95): ${totals.perMetric.metric3.ok} ok · ${totals.perMetric.metric3.warn} warn · ${totals.perMetric.metric3.fail} fail</span>
    <span class="pill">Metric 4 (frame p95): ${totals.perMetric.metric4.ok} ok · ${totals.perMetric.metric4.warn} warn · ${totals.perMetric.metric4.fail} fail</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Game</th>
        <th>M1 · arrancar</th>
        <th>M2 · to match</th>
        <th>M3 · input p95</th>
        <th>M4 · frame p95</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

const out = path.join(RESULTS_DIR, "latest.html");
fs.writeFileSync(out, html);
console.log(`Report written to ${out}`);
console.log(`Pass: ${totals.passed}/${totals.total}  |  Fail: ${totals.failed}`);
process.exit(totals.failed > 0 ? 1 : 0);
