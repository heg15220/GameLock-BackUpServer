import { describe, it, expect } from "vitest";
import { ALL_CARDS, DECADES, ROLES, cardsInDecade } from "./cards.js";
import { CANDIDATES_PER_ROLL } from "./draft.js";

// Valida el caché real generado por scripts/generate-nba-cards.py.
describe("generated card catalog", () => {
  it("has a healthy pool of cards", () => {
    expect(ALL_CARDS.length).toBeGreaterThan(500);
  });

  it("every card has a valid overall 40-99, role, and attributes", () => {
    for (const c of ALL_CARDS) {
      expect(c.overall).toBeGreaterThanOrEqual(40);
      expect(c.overall).toBeLessThanOrEqual(99);
      expect(ROLES).toContain(c.role);
      expect(c.name).toBeTruthy();
      for (const k of ["anotacion", "tiro3", "pase", "rebote", "defInterior", "defExterior", "tiroLibre"]) {
        expect(c.attrs[k]).toBeGreaterThanOrEqual(0);
        expect(c.attrs[k]).toBeLessThanOrEqual(99);
      }
    }
  });

  it("each decade has enough cards to draw 7 candidates", () => {
    for (const d of DECADES) {
      expect(cardsInDecade(d).length).toBeGreaterThanOrEqual(CANDIDATES_PER_ROLL);
    }
  });

  it("reserves 99 for a tiny elite and stays bottom-heavy", () => {
    const n99 = ALL_CARDS.filter((c) => c.overall >= 99).length;
    const n95 = ALL_CARDS.filter((c) => c.overall >= 95).length;
    const below75 = ALL_CARDS.filter((c) => c.overall < 75).length;
    expect(n99).toBeGreaterThan(0);
    expect(n99).toBeLessThanOrEqual(8); // muy selecto
    expect(n95).toBeLessThanOrEqual(30);
    // Pirámide realista: la mayoría son roleros por debajo de 75.
    expect(below75 / ALL_CARDS.length).toBeGreaterThan(0.6);
  });

  it("the top card is a 99", () => {
    const top = Math.max(...ALL_CARDS.map((c) => c.overall));
    expect(top).toBe(99);
  });
});
