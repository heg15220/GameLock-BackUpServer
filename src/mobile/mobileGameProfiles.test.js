import { describe, expect, it } from "vitest";
import { getMobileControlProfile, getResponsiveMobileShellMode } from "./mobileGameProfiles.js";
import { resolveRuntimeButton } from "./mobileDeckRuntime.js";

const phone = { isMobile: true, formFactor: "phone", orientation: "portrait" };

// Setup panels and header toolbars of these games sit outside the isolated
// stage, so the shell hides them on a phone: the deck is the only place their
// buttons can exist. Each one must reach a real target and carry a name.
const SETUP_BUTTONS = {
  "arcade-terror-zombi": [
    ["mapCementerio", ".tz-act-map--cementerio"],
    ["mapCamposanto", ".tz-act-map--camposanto"],
    ["mapNecropolis", ".tz-act-map--necropolis"],
    ["diff-facil", ".tz-act-diff--facil"],
    ["diff-dificil", ".tz-act-diff--dificil"],
    ["changeSetup", ".tz-act-back"],
  ],
  "arcade-brile": [
    ["diff-facil", ".brile-act-diff--facil"],
    ["diff-normal", ".brile-act-diff--normal"],
    ["changeSetup", ".brile-act-back"],
  ],
  "arcade-distancia-justa": [
    ["diff-facil", ".dj-diff--facil"],
    ["diff-dificil", ".dj-diff--dificil"],
    ["changeSetup", ".dj-act-back"],
  ],
  "arcade-saltos-selvaticos": [
    ["diff-facil", ".ss-diff--facil"],
    ["diff-dificil", ".ss-diff--dificil"],
    ["changeSetup", ".ss-act-back"],
  ],
  "sports-padel-arena": [
    ["diffEasy", ".padel-arena-seg-btn--easy"],
    ["diffHard", ".padel-arena-seg-btn--hard"],
    ["format1", ".padel-arena-seg-btn--best1"],
    ["format3", ".padel-arena-seg-btn--best3"],
    ["startMatch", ".padel-arena-start"],
  ],
};

describe("mobile control decks for the newer arcade and sports games", () => {
  Object.entries(SETUP_BUTTONS).forEach(([gameId, expected]) => {
    it(`${gameId} exposes its pre-match setup buttons by name`, () => {
      const profile = getMobileControlProfile({ id: gameId }, "es");
      expected.forEach(([id, targetSelector]) => {
        const button = profile.rightPad.find((entry) => entry.id === id);
        expect(button, `${gameId} → ${id}`).toBeTruthy();
        expect(button.targetSelector).toBe(targetSelector);
        // Those targets live in DOM the shell hides, so a visibility-checked
        // click would never resolve them.
        expect(button.action).toBe("click-any-target");
        expect(button.hideWhenUnavailable).toBe(true);
        expect(button.label.length).toBeGreaterThan(0);
      });
    });
  });

  it("hides padel shots on the menu and shows setup instead", () => {
    const profile = getMobileControlProfile({ id: "sports-padel-arena" }, "es");
    const volley = profile.rightPad.find((entry) => entry.id === "volea");
    expect(resolveRuntimeButton(volley, { screen: "menu" }).hiddenRuntime).toBe(true);
    expect(resolveRuntimeButton(volley, { screen: "rally" }).hiddenRuntime).toBeUndefined();
  });

  it("gives pulso exacto a deck whose main button renames itself per screen", () => {
    expect(getResponsiveMobileShellMode({ id: "arcade-pulso-exacto", category: "Arcade" }, phone))
      .toBe("dual-screen");

    const profile = getMobileControlProfile({ id: "arcade-pulso-exacto" }, "es");
    const primary = profile.rightPad.find((entry) => entry.id === "primary");
    expect(resolveRuntimeButton(primary, { screen: "menu" }).label).toBe("▶ Empezar");
    expect(resolveRuntimeButton(primary, { screen: "running" }).label).toBe("¡PARAR!");
    expect(resolveRuntimeButton(primary, { screen: "gameover" }).label).toBe("▶ Otra vez");
  });

  it("keeps every deck button labelled and never leaves a game without controls", () => {
    Object.keys(SETUP_BUTTONS).concat("arcade-pulso-exacto").forEach((gameId) => {
      const profile = getMobileControlProfile({ id: gameId }, "en");
      const buttons = [...profile.leftPad, ...profile.rightPad, ...profile.utilities];
      buttons.forEach((button) => {
        expect(String(button.label ?? "").trim(), `${gameId} → ${button.id}`).not.toBe("");
        // No snapshot yet (the poll runs every 220ms) must not blank the deck.
        expect(resolveRuntimeButton(button, null).hiddenRuntime).toBeUndefined();
      });
    });
  });
});
