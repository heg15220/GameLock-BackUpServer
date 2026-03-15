import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createPenaltyShootoutService, determineWinner } from "./service.mjs";

describe("penalty shootout service", () => {
  it("creates a match, resolves a shot, and keeps idempotency stable", async () => {
    const statsFile = path.join(os.tmpdir(), `penalty-stats-${Date.now()}-${Math.round(Math.random() * 9999)}.json`);
    const service = createPenaltyShootoutService({
      statsFile,
      randomFn: () => 0.5,
    });

    const match = await service.createMatch({
      rivalTeamId: "harbor-athletic",
      difficultyId: "competitive",
    });

    expect(match.matchId).toBeTruthy();
    expect(match.phase).toBe("awaiting_player_shot");
    expect(match.turnMode).toBe("attack");

    const first = await service.submitShot(
      match.matchId,
      { selectedZone: "top-left", actionType: "ATTACK" },
      { idempotencyKey: "same-shot-key" }
    );
    const repeated = await service.submitShot(
      match.matchId,
      { selectedZone: "top-left", actionType: "ATTACK" },
      { idempotencyKey: "same-shot-key" }
    );

    expect(first.playerShot.zoneId).toBe("top-left");
    expect(first.scoreboard.playerShotsTaken).toBe(1);
    expect(first.scoreboard.rivalShotsTaken).toBe(0);
    expect(first.turnMode).toBe("save");
    expect(repeated.playerShot.zoneId).toBe(first.playerShot.zoneId);
    expect(repeated.scoreboard.playerShotsTaken).toBe(first.scoreboard.playerShotsTaken);

    const defense = await service.submitShot(match.matchId, {
      selectedZone: "top-left",
      actionType: "SAVE",
    });
    expect(defense.rivalShot.actor).toBe("RIVAL");
    expect(defense.scoreboard.rivalShotsTaken).toBe(1);
    expect(defense.turnMode).toBe("attack");
  });

  it("can start with the rival shooting first", async () => {
    const statsFile = path.join(os.tmpdir(), `penalty-stats-${Date.now()}-${Math.round(Math.random() * 9999)}.json`);
    const service = createPenaltyShootoutService({
      statsFile,
      randomFn: () => 0.1,
    });

    const match = await service.createMatch({
      rivalTeamId: "harbor-athletic",
      difficultyId: "competitive",
    });

    expect(match.phase).toBe("awaiting_player_save");
    expect(match.turnMode).toBe("save");
    expect(match.scoreboard.playerShotsTaken).toBe(0);
    expect(match.scoreboard.rivalShotsTaken).toBe(0);

    const defense = await service.submitShot(match.matchId, {
      selectedZone: "top-left",
      actionType: "SAVE",
    });

    expect(defense.rivalShot.actor).toBe("RIVAL");
    expect(defense.scoreboard.playerShotsTaken).toBe(0);
    expect(defense.scoreboard.rivalShotsTaken).toBe(1);
    expect(defense.turnMode).toBe("attack");
  });

  it("waits for the rival shot before deciding sudden death", () => {
    expect(
      determineWinner({
        playerShotsTaken: 6,
        rivalShotsTaken: 5,
        playerGoals: 6,
        rivalGoals: 5,
      })
    ).toBeNull();

    expect(
      determineWinner({
        playerShotsTaken: 6,
        rivalShotsTaken: 6,
        playerGoals: 6,
        rivalGoals: 5,
      })
    ).toBe("PLAYER");
  });
});
