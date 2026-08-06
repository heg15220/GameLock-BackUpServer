import { describe, expect, it } from "vitest";

// Import smoke test: verifies the whole module graph resolves and compiles
// (engine → scene → choreography → levels → rules → copy), and that the game is
// reachable from the registry the launcher actually uses. Catches import-path
// and syntax errors without needing the full app build.
describe("shell game module wiring", () => {
  it("engine module resolves the full graph", async () => {
    const mod = await import("./engine.js");
    expect(typeof mod.ShellGameRuntime).toBe("function");
  });

  it("scene module exports its palette and layout", async () => {
    const mod = await import("./scene.js");
    expect(typeof mod.drawWorld).toBe("function");
    expect(typeof mod.layoutFor).toBe("function");
    expect(mod.PALETTE).toBeTruthy();
  });

  it("copy exposes both locales with the agreed names", async () => {
    const { getCopy } = await import("./copy.js");
    expect(getCopy("es").title).toBe("Trilero");
    expect(getCopy("en").title).toBe("Shell Game");
    expect(getCopy("en").start).toBe("Start");
  });

  it("is registered in the canonical game registry (GameLaunchModal path)", async () => {
    const { getGameComponent } = await import("../../registry.jsx");
    expect(getGameComponent("arcade-shell-game")).toBeTruthy();
  });

  // games.js pulls in an asset import per catalogue entry, so this dynamic import is
  // slow and gets slower with every game added. Under a full parallel run it was
  // tripping the default 5s budget intermittently; the assertions are instant, so give
  // the import room rather than let an unrelated new game turn this red.
  it(
    "is listed in the catalog under Arcade, in both locales",
    async () => {
      const { games } = await import("../../../data/games.js");
      const game = games.find((g) => g.id === "arcade-shell-game");
      expect(game).toBeTruthy();
      expect(game.category).toBe("Arcade");
      expect(game.title).toBe("Trilero");
      expect(game.title_en).toBe("Shell Game");
      expect(game.image).toBeTruthy();
    },
    20000,
  );
});
