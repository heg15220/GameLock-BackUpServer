import fs from "node:fs";
const path = "src/games/knowledge/timelineEventBank.js";
const src = fs.readFileSync(path, "utf8");
const lines = src.split(/\r?\n/);

const idLineRe = /^\s*E\("([a-z0-9-]+)"/;
const startMarker = "grammy-awards-first-1959";
let startIdx = lines.findIndex((l) => l.includes(startMarker));
if (startIdx < 0) throw new Error("start marker not found");
// new block starts after the marker line
const newBlockStart = startIdx + 1;
const endIdx = lines.findIndex((l, i) => i > startIdx && /^\];/.test(l));
if (endIdx < 0) throw new Error("end ]; not found");

const existingIds = new Set();
for (let i = 0; i < newBlockStart; i++) {
  const m = lines[i].match(idLineRe);
  if (m) existingIds.add(m[1]);
}

const kept = [];
const removed = [];
const newSeen = new Set();
for (let i = newBlockStart; i < endIdx; i++) {
  const l = lines[i];
  const m = l.match(idLineRe);
  if (!m) {
    kept.push(l);
    continue;
  }
  const id = m[1];
  if (existingIds.has(id) || newSeen.has(id)) {
    removed.push(id);
    continue;
  }
  newSeen.add(id);
  kept.push(l);
}

const out = [
  ...lines.slice(0, newBlockStart),
  ...kept,
  ...lines.slice(endIdx),
].join("\n");

fs.writeFileSync(path, out);
console.log("removed:", removed.length, "kept:", newSeen.size);
console.log("removed ids:", removed.slice(0, 5).join(", "), "...");
