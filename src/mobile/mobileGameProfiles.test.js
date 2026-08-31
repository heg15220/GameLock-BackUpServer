import { describe, expect, it } from "vitest";
import { getMobileControlProfile, getResponsiveMobileShellMode } from "./mobileGameProfiles.js";
import { evaluateCue, resolveRuntimeButton } from "./mobileDeckRuntime.js";

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

describe("la señal de dirección del joystick", () => {
  const liana = (locale = "es") =>
    getMobileControlProfile({ id: "arcade-saltos-selvaticos" }, locale);

  it("Saltos Selváticos se maneja con stick, no con dos botones", () => {
    const profile = liana();
    // El mando resuelve las ranuras del stick por el ID del botón, no por su tecla.
    expect(profile.leftPad.map((button) => button.id)).toEqual(["pumpLeft", "pumpRight"]);
    expect(profile.leftPadMode).toBeUndefined();
  });

  it("el stick no auto-repite: una sacudida es un empujón deliberado", () => {
    expect(liana().leftPadRepeat).toBe(false);
  });

  it("enciende el lado que el juego pide en cada pasada", () => {
    const [izquierda, derecha] = liana().leftPad;
    const conCue = (button, pumpCue) =>
      resolveRuntimeButton(button, { screen: "swing", player: { pumpCue } }).cued;

    expect(conCue(izquierda, -1)).toBe(true);
    expect(conCue(izquierda, 1)).toBe(false);
    expect(conCue(derecha, 1)).toBe(true);
    expect(conCue(derecha, -1)).toBe(false);
  });

  it("sin señal —o sin snapshot todavía— no enciende nada", () => {
    const [izquierda] = liana().leftPad;
    expect(resolveRuntimeButton(izquierda, { screen: "swing", player: { pumpCue: 0 } }).cued).toBe(false);
    // Sin snapshot (el sondeo va cada 220 ms) la señal está apagada, no rota.
    expect(resolveRuntimeButton(izquierda, null).cued).toBe(false);
  });

  it("evaluateCue lee rutas anidadas y no revienta con lo que falta", () => {
    const button = { cue: { path: "player.pumpCue", equals: 1 } };
    expect(evaluateCue(button, { player: { pumpCue: 1 } })).toBe(true);
    expect(evaluateCue(button, { player: {} })).toBe(false);
    expect(evaluateCue(button, {})).toBe(false);
    expect(evaluateCue({}, { player: { pumpCue: 1 } })).toBe(false);
  });
});
