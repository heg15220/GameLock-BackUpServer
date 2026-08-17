// @vitest-environment jsdom
/**
 * Throwaway: drive every mechanic through its real state machine and dump the markup at a
 * few points of its life, so the frames can be looked at rather than reasoned about.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  PHASES, agreeTerms, completeSigning, playChance, resolveEvent, signYouthClub, startCareer,
} from "./career.js";
import { buildChance, CHANCE_MECHANIC } from "./minigames.js";
import { SHOT_TYPES, REPERTOIRE } from "./bigmatch.js";
import { SCREENS } from "./index.jsx";
import { world } from "./world.js";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance", "setTimeout", "clearTimeout", "Date"],
  });
});
afterEach(() => vi.useRealTimers());

function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    html: () => container.innerHTML,
    unmount: () => { act(() => root.unmount()); container.remove(); },
  };
}

const advance = (ms) => act(() => vi.advanceTimersByTime(ms));

function skillDecider(shotType, seed = "shots") {
  let run = startCareer(
    { seed, surname: "MOLINA", number: 9, foot: "left", country: "ESP", position: "DC", mode: "intensa" },
    world,
  );
  run = completeSigning(agreeTerms(signYouthClub(run, run.offers[0].clubId)));
  run = resolveEvent(run, run.event.es.options[0].id);
  const { index, fixtures } = run.matchday;
  const chance = buildChance({
    seed, season: run.season, fixtureId: fixtures[index].id, shotType, ovr: 78,
  });
  return {
    ...run,
    matchday: {
      ...run.matchday,
      fixtures: fixtures.map((f, i) => (i === index ? { ...f, chances: 1 } : f)),
      shot: { ...run.matchday.shot, type: shotType, mode: "skill", chance },
      attempts: [], last: null, broadcast: null,
    },
  };
}

function Harness({ initial }) {
  const [run, setRun] = useState(initial);
  return React.createElement(SCREENS.match, {
    run, locale: "es",
    onShoot: () => {}, onPlay: (i) => setRun((p) => playChance(p, i)),
    onWatch: () => {}, onNext: () => {},
  });
}

/** Who plays what, so the sheet can be read position by position. */
const GROUP_OF = {};
for (const [group, types] of Object.entries(REPERTOIRE)) {
  for (const type of types) (GROUP_OF[type] ??= []).push(group);
}

describe("scratch", () => {
  it("dumps gameplay frames for every action type", () => {
    const css = fs.readFileSync(path.join(__dirname, "styles.css"), "utf8");
    const cards = [];

    for (const shotType of Object.keys(SHOT_TYPES)) {
      const mech = CHANCE_MECHANIC[shotType];
      const groups = (GROUP_OF[shotType] ?? []).join(", ") || "—";
      const view = mount(React.createElement(Harness, { initial: skillDecider(shotType) }));

      const frames = [];
      const shot = (label) => frames.push([label, view.html()]);

      shot("0 · al abrirse");
      advance(320);
      shot("1 · a los 320ms");
      advance(320);
      shot("2 · a los 640ms");

      // Engage the way this mechanic is engaged, then look again.
      const stage = view.container.querySelector("button.tr-chance__stage");
      if (stage) {
        const rect = { left: 0, top: 0, width: 300, height: 180 };
        stage.getBoundingClientRect = () => rect;
        const ev = (type, x, y) => {
          const e = new window.Event(type, { bubbles: true });
          Object.assign(e, { clientX: x, clientY: y, pointerId: 1 });
          stage.dispatchEvent(e);
        };
        act(() => {
          ev("pointerdown", 150, 90);
          stage.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
        });
        shot("3 · con la mano encima");
        advance(300);
        shot("4 · 300ms después");
      }

      cards.push(
        `<section><h2>${shotType} · ${mech} · <em>${groups}</em></h2><div class="row">` +
          frames.map(([label, html]) => `<figure><figcaption>${label}</figcaption>${html}</figure>`).join("") +
          `</div></section>`,
      );
      view.unmount();
    }

    const html = `<!doctype html><meta charset="utf-8"><style>
${css}
body{margin:0;padding:18px;background:#080a0f;font-family:system-ui,sans-serif}
section{margin-bottom:26px;border-top:1px solid #222b3a;padding-top:10px}
h2{color:#eef1f7;font-size:13px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 10px}
h2 em{color:#f2b705;font-style:normal}
.row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;align-items:start}
figure{margin:0}
figcaption{color:#92a2be;font-size:9px;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}
.tr-chance{margin-top:0}
.tr-match{padding:8px}
</style><div class="tr-shell">${cards.join("")}</div>`;

    fs.writeFileSync(path.join(process.cwd(), "play-preview.html"), html);
    expect(cards.length).toBe(Object.keys(SHOT_TYPES).length);
  });
});
