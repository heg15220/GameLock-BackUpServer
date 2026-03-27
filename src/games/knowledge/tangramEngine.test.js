import { describe, expect, it } from "vitest";
import {
  TANGRAM_PIECES,
  buildSolvedTangramPieces,
  buildTangramChallenge,
  computeTangramOverlapPairs,
  doesPieceRotationMatchSlot,
  findSnapCandidateForPiece,
  getBoardPoseFromSlot
} from "./tangramEngine";

const getTypeCounts = (items, field = "type") =>
  items.reduce((accumulator, item) => {
    accumulator[item[field]] = (accumulator[item[field]] ?? 0) + 1;
    return accumulator;
  }, {});

describe("tangramEngine", () => {
  it("genera retos consistentes de 7 piezas para cualquier matchId", () => {
    const sampleMatchIds = [0, 1, 7, 31, 145, 9999];
    for (const matchId of sampleMatchIds) {
      const challenge = buildTangramChallenge(matchId, "es");
      expect(challenge.slots).toHaveLength(7);
      const slotCounts = getTypeCounts(challenge.slots);
      const pieceCounts = getTypeCounts(TANGRAM_PIECES);
      expect(slotCounts).toEqual(pieceCounts);
    }
  });

  it("el estado resuelto de un reto no contiene solapes", () => {
    for (let matchId = 0; matchId < 30; matchId += 1) {
      const challenge = buildTangramChallenge(matchId, "en");
      const solvedPieces = buildSolvedTangramPieces(challenge);
      const overlaps = computeTangramOverlapPairs(solvedPieces);
      expect(overlaps).toHaveLength(0);
      expect(solvedPieces.every((piece) => piece.locked)).toBe(true);
      expect(solvedPieces.every((piece) => piece.targetSlotId)).toBe(true);
    }
  });

  it("respeta simetrias de rotacion por tipo", () => {
    expect(doesPieceRotationMatchSlot("square", 0, 2)).toBe(true);
    expect(doesPieceRotationMatchSlot("square", 0, 1)).toBe(false);
    expect(doesPieceRotationMatchSlot("parallelogram", 1, 5)).toBe(true);
    expect(doesPieceRotationMatchSlot("parallelogram", 1, 3)).toBe(false);
    expect(doesPieceRotationMatchSlot("largeTriangle", 2, 2)).toBe(true);
    expect(doesPieceRotationMatchSlot("largeTriangle", 2, 6)).toBe(false);
  });

  it("encuentra candidato de snap cuando una pieza coincide con su slot", () => {
    const challenge = buildTangramChallenge(18, "es");
    const slot = challenge.slots.find((entry) => entry.type === "parallelogram");
    expect(slot).toBeTruthy();
    const pose = getBoardPoseFromSlot(slot);
    const piece = {
      id: "piece-parallelogram",
      type: "parallelogram",
      x: pose.x + 6,
      y: pose.y - 5,
      rotation: pose.rotation,
      flip: pose.flip
    };

    const candidate = findSnapCandidateForPiece(piece, challenge, new Set());
    expect(candidate).toBeTruthy();
    expect(candidate.slot.slotId).toBe(slot.slotId);
    expect(candidate.distance).toBeGreaterThan(0);
    expect(candidate.distance).toBeLessThanOrEqual(30);
  });
});
