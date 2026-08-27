import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve("public/assets/fulgor");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
const entries = Object.entries(manifest.assets);

describe("biblioteca visual profesional de FULGOR", () => {
  it("contiene cientos de recursos versionados", () => {
    expect(entries.length).toBeGreaterThanOrEqual(350);
  });

  it("cada entrada del manifiesto existe en disco", () => {
    for (const [id, relative] of entries) {
      expect(fs.existsSync(path.join(ROOT, relative)), `${id}: ${relative}`).toBe(true);
    }
  });

  it("cubre reparto, expresiones, técnicas, traje, escenarios, utilería y pruebas", () => {
    const count = (prefix) => entries.filter(([id]) => id.startsWith(prefix)).length;
    expect(count("portrait:")).toBe(88);
    expect(count("silhouette:")).toBe(22);
    expect(count("technique:")).toBe(40);
    expect(count("suit:")).toBe(30);
    expect(count("district:")).toBe(9);
    expect(count("scene:")).toBe(12);
    expect(count("prop:")).toBeGreaterThanOrEqual(60);
    expect(count("evidence:")).toBeGreaterThanOrEqual(25);
  });

  it("no deja SVG vacíos o sin etiqueta accesible", () => {
    for (const [id, relative] of entries.filter(([, file]) => file.endsWith(".svg"))) {
      const source = fs.readFileSync(path.join(ROOT, relative), "utf8");
      expect(source.length, id).toBeGreaterThan(250);
      expect(source, id).toContain("aria-label=");
    }
  });
});
