import { describe, expect, it } from "vitest";
import { LEVELS } from "./index";

describe("platformer level catalog", () => {
  it("expande la campana con 132 mapas y variedad estructural", () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(132);

    const verticalLevels = LEVELS.filter((level) => level.layoutType === "vertical");
    expect(verticalLevels.length).toBeGreaterThanOrEqual(25);

    const hybridLevels = LEVELS.filter((level) => level.layoutType === "hybrid");
    expect(hybridLevels.length).toBeGreaterThanOrEqual(45);
  });

  it("incluye multiples bosses nuevos y un unico jefe final fijo", () => {
    const bossLevels = LEVELS.filter((level) => Boolean(level.boss));
    expect(bossLevels.length).toBeGreaterThanOrEqual(16);

    const finalBossLevels = bossLevels.filter((level) => Boolean(level.boss?.finalBoss));
    expect(finalBossLevels).toHaveLength(1);

    const bossVariants = new Set(
      bossLevels.map((level) => level.boss?.variant).filter(Boolean)
    );
    expect(bossVariants.size).toBeGreaterThanOrEqual(8);

    bossLevels.forEach((level) => {
      const hasBossSpawn = (level.enemySpawns || []).some((spawn) => spawn.type === "boss");
      expect(hasBossSpawn, `boss spawn missing in ${level.id}`).toBe(true);
    });
  });

  it("cubre biomas y mecanicas ampliadas", () => {
    const styles = new Set(LEVELS.map((level) => level.visualStyle).filter(Boolean));
    ["forest", "sunset", "storm", "toxic", "celestial", "aurora", "clockwork", "reef", "void", "ember"].forEach((style) => {
      expect(styles.has(style), `missing visual style ${style}`).toBe(true);
    });

    const mechanics = new Set(
      LEVELS.flatMap((level) => level.mechanics || []).map((mechanic) => String(mechanic).toLowerCase())
    );
    ["wind", "springs", "checkpoint routing", "hazards", "time shards", "shield routing", "gem routes"].forEach((keyword) => {
      const present = Array.from(mechanics).some((mechanic) => mechanic.includes(keyword.replace(" routing", "")));
      expect(present, `missing mechanic keyword ${keyword}`).toBe(true);
    });
  });
});
