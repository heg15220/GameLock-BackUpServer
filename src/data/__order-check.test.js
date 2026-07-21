import { describe, expect, it } from "vitest";
import { games } from "./games.js";

describe("catalog order", () => {
  it("keeps all 76 games, unique ids", () => {
    expect(games.length).toBe(76);
    expect(new Set(games.map((g) => g.id)).size).toBe(76);
  });
  it("puts Trilero first in Arcade", () => {
    expect(games.filter((g) => g.category === "Arcade")[0].id).toBe("arcade-shell-game");
  });
  it("puts Cronologia Maestra first in Conocimiento", () => {
    expect(games.filter((g) => g.category === "Conocimiento")[0].id).toBe("knowledge-cronologia-maestra");
  });
  it("every entry still has id, category, title, image", () => {
    for (const g of games) {
      expect(g.id, `id missing`).toBeTruthy();
      expect(g.category, `category missing on ${g.id}`).toBeTruthy();
      expect(g.title, `title missing on ${g.id}`).toBeTruthy();
      expect(g.image, `image missing on ${g.id}`).toBeTruthy();
    }
  });
});
