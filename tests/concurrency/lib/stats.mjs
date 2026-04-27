// Latency stats helpers used by every concurrency runner.
// Operates on plain millisecond arrays — keep math here, presentation in callers.

export function summarize(samples) {
  const xs = samples.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b);
  const count = xs.length;
  if (count === 0) {
    return { count: 0, avg: null, min: null, max: null, p50: null, p95: null, p99: null };
  }
  const sum = xs.reduce((acc, value) => acc + value, 0);
  const pct = (p) => xs[Math.min(count - 1, Math.floor((p / 100) * count))];
  return {
    count,
    avg: round(sum / count),
    min: round(xs[0]),
    max: round(xs[count - 1]),
    p50: round(pct(50)),
    p95: round(pct(95)),
    p99: round(pct(99)),
  };
}

export function round(value) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

export function classify(avgMs, threshold = 500) {
  if (avgMs == null) return "unknown";
  return avgMs <= threshold ? "ok" : "fail";
}

export function formatTable(rows) {
  if (rows.length === 0) return "(empty)";
  const headers = Object.keys(rows[0]);
  const widths = headers.map((header) =>
    Math.max(header.length, ...rows.map((row) => String(row[header] ?? "").length))
  );
  const renderRow = (cells) =>
    "| " + cells.map((cell, index) => String(cell ?? "").padEnd(widths[index])).join(" | ") + " |";
  const sep = "|" + widths.map((width) => "-".repeat(width + 2)).join("|") + "|";
  return [
    renderRow(headers),
    sep,
    ...rows.map((row) => renderRow(headers.map((header) => row[header]))),
  ].join("\n");
}
