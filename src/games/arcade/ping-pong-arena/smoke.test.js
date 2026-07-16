import { describe, expect, it } from "vitest";

// Import smoke test: verifies the whole module graph resolves and compiles
// (engine → scene → ai → rules → physics → copy). Catches import-path and syntax
// errors without needing the heavy full app build.
describe("ping-pong module wiring", () => {
  it("engine module resolves the full graph", async () => {
    const mod = await import("./engine.js");
    expect(typeof mod.PingPongRuntime).toBe("function");
  });

  it("scene module exports its palette", async () => {
    const mod = await import("./scene.js");
    expect(typeof mod.drawWorld).toBe("function");
    expect(mod.PALETTE).toBeTruthy();
  });

  it("copy exposes both locales", async () => {
    const { getCopy } = await import("./copy.js");
    expect(getCopy("es").title).toBe("Ping Pong Arena");
    expect(getCopy("en").serve).toBe("Serve");
  });

  it("is registered in the canonical game registry (GameLaunchModal path)", async () => {
    const { getGameComponent } = await import("../../registry.jsx");
    expect(getGameComponent("sports-ping-pong-arena")).toBeTruthy();
  });
});
