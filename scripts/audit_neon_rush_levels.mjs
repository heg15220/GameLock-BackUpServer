import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const GAME_HTML = path.resolve("src/arcade/neon-rush/index.html");

function loadGameBuilders() {
  const html = fs.readFileSync(GAME_HTML, "utf8");
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) {
    throw new Error("No se encontro bloque <script> en Neon Rush.");
  }
  const script = scriptMatch[1];
  const cutIndex = script.indexOf("// ── GAME STATE");
  if (cutIndex === -1) {
    throw new Error("No se encontro seccion GAME STATE en Neon Rush.");
  }

  const bootstrap = `
${script.slice(0, cutIndex)}
globalThis.__NEON_EXPORTS__ = {
  W, H, GR, T, S, B,
  GV, JF, MS, JPF, TERMINAL_VY,
  COYOTE_FRAMES, JUMP_BUFFER_FRAMES,
  AIR_JUMPS_MAX, AIR_JUMP_FORCE,
  ASSIST_MIN,
  META,
  levelLengthFor,
  buildLv,
};
`;
  const context = { Math };
  vm.createContext(context);
  vm.runInContext(bootstrap, context, { filename: "neon-rush-builders.js" });
  return context.__NEON_EXPORTS__;
}

function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function quantize(state) {
  const qY = Math.round(state.y * 4) / 4;
  const qVy = Math.round(state.vy * 20) / 20;
  return [
    qY,
    qVy,
    state.onGround ? 1 : 0,
    state.coyoteFrames,
    state.airJumpsUsed,
    state.jumpBuffer,
  ].join("|");
}

function compactStates(map, maxSize) {
  if (map.size <= maxSize) return map;
  const buckets = new Map();
  for (const state of map.values()) {
    const yBucket = Math.floor(state.y / 6);
    const vyBucket = Math.floor((state.vy + 24) / 1.5);
    const key = `${yBucket}|${vyBucket}|${state.onGround ? 1 : 0}|${state.airJumpsUsed}`;
    const prev = buckets.get(key);
    if (!prev) {
      buckets.set(key, state);
      continue;
    }
    const prevScore = prev.jumpBuffer + prev.coyoteFrames * 0.8;
    const nextScore = state.jumpBuffer + state.coyoteFrames * 0.8;
    if (nextScore > prevScore) buckets.set(key, state);
  }

  if (buckets.size <= maxSize) {
    return new Map(Array.from(buckets.entries()).map(([k, v]) => [k, v]));
  }

  const sorted = Array.from(buckets.values()).sort((a, b) => {
    if (a.onGround !== b.onGround) return a.onGround ? -1 : 1;
    if (a.airJumpsUsed !== b.airJumpsUsed) return a.airJumpsUsed - b.airJumpsUsed;
    return a.y - b.y;
  });

  const limited = sorted.slice(0, maxSize);
  const next = new Map();
  for (let i = 0; i < limited.length; i += 1) {
    next.set(`k${i}`, limited[i]);
  }
  return next;
}

function stepFrame({
  state,
  pressJump,
  objects,
  constants,
  speed,
}) {
  const next = { ...state };
  const { T, S, GR, H, GV, JF, JPF, TERMINAL_VY, COYOTE_FRAMES, JUMP_BUFFER_FRAMES, AIR_JUMPS_MAX, AIR_JUMP_FORCE } = constants;

  if (next.dead || next.win) return next;

  if (next.jumpBuffer > 0) next.jumpBuffer -= 1;
  if (next.coyoteFrames > 0) next.coyoteFrames -= 1;
  if (pressJump) next.jumpBuffer = Math.max(next.jumpBuffer, JUMP_BUFFER_FRAMES);

  const tryBufferedJump = () => {
    if (next.jumpBuffer <= 0) return;
    if (next.onGround || next.coyoteFrames > 0) {
      next.vy = JF;
      next.onGround = false;
      next.coyoteFrames = 0;
      next.jumpBuffer = 0;
      return;
    }
    if (next.airJumpsUsed >= AIR_JUMPS_MAX) return;
    next.vy = Math.min(next.vy, AIR_JUMP_FORCE);
    next.onGround = false;
    next.coyoteFrames = 0;
    next.jumpBuffer = 0;
    next.airJumpsUsed += 1;
  };

  tryBufferedJump();

  next.vy = Math.min(next.vy + GV, TERMINAL_VY);
  next.y += next.vy;
  next.x += speed;
  next.onGround = false;

  if (next.y + T >= GR) {
    next.y = GR - T;
    next.vy = 0;
    next.onGround = true;
    next.coyoteFrames = COYOTE_FRAMES;
    next.airJumpsUsed = 0;
  }

  if (next.y < 0) {
    next.y = 0;
    next.vy = Math.abs(next.vy) * 0.4;
  }
  if (next.y > H + 120) {
    next.dead = true;
    return next;
  }

  const px = next.x;
  const py = next.y;
  const pw = T;
  const ph = T;

  for (let i = 0; i < objects.length; i += 1) {
    const obj = objects[i];
    const ow = obj.w ?? S;
    const oh = obj.h ?? S;
    const ox = obj.x;
    const oy = obj.y;
    if (ox + ow < px - 90) continue;
    if (ox > px + pw + 120) break;

    if (obj.t === "s") {
      if (overlaps(px + 8, py + 8, pw - 16, ph - 10, ox + 8, oy + 12, ow - 16, oh - 14)) {
        next.dead = true;
        return next;
      }
    } else if (obj.t === "i") {
      if (overlaps(px + 8, py + 5, pw - 16, ph - 10, ox + 8, oy, ow - 16, oh - 14)) {
        next.dead = true;
        return next;
      }
    } else if (obj.t === "b" || obj.t === "pl") {
      if (overlaps(px, py, pw, ph, ox, oy, ow, oh)) {
        const oL = (px + pw) - ox;
        const oR = (ox + ow) - px;
        const oT = (py + ph) - oy;
        const oB = (oy + oh) - py;
        if (Math.min(oT, oB) < Math.min(oL, oR)) {
          if (oT < oB) {
            next.y = oy - ph;
            next.vy = 0;
            next.onGround = true;
            next.coyoteFrames = COYOTE_FRAMES;
            next.airJumpsUsed = 0;
          } else {
            next.y = oy + oh;
            next.vy = Math.abs(next.vy) * 0.3;
          }
        } else {
          next.dead = true;
          return next;
        }
      }
    } else if (obj.t === "j") {
      if (overlaps(px, py + ph - 5, pw, 5, ox, oy, ow, oh)) {
        next.vy = JPF;
        next.onGround = false;
        next.coyoteFrames = 0;
        next.jumpBuffer = 0;
        next.airJumpsUsed = 0;
      }
    } else if (obj.t === "o") {
      const d = Math.hypot((px + pw / 2) - ox, (py + ph / 2) - oy);
      if (d < obj.r + 17 && next.jumpBuffer > 0) {
        next.vy = JF * 1.1;
        next.onGround = false;
        next.coyoteFrames = 0;
        next.jumpBuffer = 0;
        next.airJumpsUsed = 0;
      }
    } else if (obj.t === "p") {
      if (overlaps(px, py, pw, ph, ox, oy, ow, oh)) {
        next.win = true;
        return next;
      }
    }
  }

  tryBufferedJump();
  return next;
}

function canBeatLevel({ levelIndex, builders, assistScale = 1, maxStates = 4500 }) {
  const objects = builders.buildLv(levelIndex)
    .map((o) => ({ ...o }))
    .sort((a, b) => a.x - b.x);
  const length = builders.levelLengthFor(levelIndex);
  const speed = builders.MS * assistScale;

  let states = new Map();
  const start = {
    x: 120,
    y: builders.GR - builders.T,
    vy: 0,
    onGround: true,
    coyoteFrames: builders.COYOTE_FRAMES,
    airJumpsUsed: 0,
    jumpBuffer: 0,
    dead: false,
    win: false,
  };
  states.set(quantize(start), start);

  const maxFrames = Math.ceil((length - 20) / Math.max(0.0001, speed)) + 240;

  for (let frame = 0; frame <= maxFrames; frame += 1) {
    const nextStates = new Map();
    for (const state of states.values()) {
      for (let action = 0; action <= 1; action += 1) {
        const next = stepFrame({
          state,
          pressJump: action === 1,
          objects,
          constants: builders,
          speed,
        });
        if (next.win) {
          return { beatable: true, frame, assistScale };
        }
        if (next.dead) continue;
        const key = quantize(next);
        if (!nextStates.has(key)) nextStates.set(key, next);
      }
    }
    if (!nextStates.size) {
      return { beatable: false, frame, assistScale };
    }
    states = compactStates(nextStates, maxStates);
  }

  return { beatable: false, frame: maxFrames, assistScale };
}

function runAudit() {
  const builders = loadGameBuilders();
  const total = builders.META.length;
  const startLevel = Math.max(1, Number.parseInt(process.env.NEON_AUDIT_START ?? "1", 10) || 1);
  const endLevel = Math.min(total, Number.parseInt(process.env.NEON_AUDIT_END ?? String(total), 10) || total);
  const maxStates = Number.parseInt(process.env.NEON_AUDIT_MAX_STATES ?? "5000", 10) || 5000;
  const assistMaxStates = Number.parseInt(process.env.NEON_AUDIT_ASSIST_MAX_STATES ?? "6000", 10) || 6000;
  const results = [];
  for (let i = startLevel - 1; i < endLevel; i += 1) {
    let res = canBeatLevel({ levelIndex: i, builders, assistScale: 1, maxStates });
    if (!res.beatable) {
      res = canBeatLevel({ levelIndex: i, builders, assistScale: builders.ASSIST_MIN, maxStates: assistMaxStates });
    }
    results.push({ level: i + 1, name: builders.META[i].n, difficulty: builders.META[i].d, ...res });
    if (process.env.NEON_AUDIT_PROGRESS === "1" && ((i + 1) % 10 === 0 || i + 1 === endLevel)) {
      console.log(`Audit progress: L${i + 1}/${endLevel}`);
    }
  }

  const impossible = results.filter((r) => !r.beatable);
  const onlyWithAssist = results.filter((r) => r.beatable && r.assistScale < 1);
  console.log(`Niveles auditados: ${results.length} (L${startLevel}-L${endLevel} de ${total})`);
  console.log(`Completables: ${results.length - impossible.length}`);
  console.log(`Imposibles: ${impossible.length}`);
  console.log(`Solo completables con assist (${builders.ASSIST_MIN}): ${onlyWithAssist.length}`);

  if (impossible.length) {
    console.log("\nNiveles imposibles detectados:");
    for (const row of impossible) {
      console.log(`- L${String(row.level).padStart(3, "0")} [${row.difficulty}] ${row.name}`);
    }
  }

  if (onlyWithAssist.length) {
    console.log("\nNiveles completables solo con assist:");
    for (const row of onlyWithAssist) {
      console.log(`- L${String(row.level).padStart(3, "0")} [${row.difficulty}] ${row.name}`);
    }
  }

  const reportPath = path.resolve("output/neon-rush-audit-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  console.log(`\nReporte JSON: ${reportPath}`);
  return { results, impossible, onlyWithAssist };
}

runAudit();
