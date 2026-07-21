import { describe, expect, it } from "vitest";

// Import smoke test: verifies the whole module graph resolves and compiles
// (engine → moles → ai → scene → audio → copy), and that the game is reachable
// from the registry the launcher actually uses. Catches import-path and syntax
// errors without needing the full app build.
describe("topos a mazazos module wiring", () => {
  it("engine module resolves the full graph", async () => {
    const mod = await import("./engine.js");
    expect(typeof mod.ToposRuntime).toBe("function");
    expect(mod.TEAM_COLORS).toHaveLength(4);
  });

  it("scene module exports its palette and renderer", async () => {
    const mod = await import("./scene.js");
    expect(typeof mod.drawWorld).toBe("function");
    expect(mod.PALETTE).toBeTruthy();
  });

  it("copy exposes both locales with the agreed names", async () => {
    const { getCopy } = await import("./copy.js");
    expect(getCopy("es").title).toBe("Topos a Mazazos");
    expect(getCopy("en").title).toBe("Mallet Moles");
    expect(getCopy("en").whack).toBe("Whack");
  });

  it("is registered in the canonical game registry (GameLaunchModal path)", async () => {
    const { getGameComponent } = await import("../../registry.jsx");
    expect(getGameComponent("arcade-topos-mazazos")).toBeTruthy();
  });

  it("is listed in the catalog under Arcade, in both locales", async () => {
    const { games } = await import("../../../data/games.js");
    const game = games.find((g) => g.id === "arcade-topos-mazazos");
    expect(game).toBeTruthy();
    expect(game.category).toBe("Arcade");
    expect(game.title).toBe("Topos a Mazazos");
    expect(game.title_en).toBe("Mallet Moles");
    expect(game.image).toBeTruthy();
  });

  it("has a short catalog card description in both locales", async () => {
    const mod = await import("../../../data/gameCatalogDescriptions.js");
    const map = mod.default ?? mod.GAME_CATALOG_DESCRIPTIONS ?? mod.gameCatalogDescriptions;
    expect(map["arcade-topos-mazazos"].es).toBeTruthy();
    expect(map["arcade-topos-mazazos"].en).toBeTruthy();
  });

  it("exposes a mobile control profile with a joystick and a whack tap", async () => {
    const { getMobileControlProfile } = await import("../../../mobile/mobileGameProfiles.js");
    const profile = getMobileControlProfile({ id: "arcade-topos-mazazos" }, "es");
    expect(profile.leftPad.length).toBeGreaterThan(0);
    expect(profile.rightPad.some((c) => c.id === "whack")).toBe(true);
  });
});
