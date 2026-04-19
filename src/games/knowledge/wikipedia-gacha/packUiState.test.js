import { describe, expect, it } from "vitest";
import { canShowRewardedAdCta } from "./packUiState";

describe("canShowRewardedAdCta", () => {
  it("shows the ad CTA when there are no packs and no special pack pending", () => {
    expect(
      canShowRewardedAdCta({
        loading: false,
        busy: false,
        packHeroAnimState: "idle",
        packStatus: {
          packsAvailable: 0,
          pityCounter: 0,
          nextPackGuaranteedSrPlus: false,
        },
      })
    ).toBe(true);
  });

  it("hides the ad CTA while a special pack is still waiting to be opened", () => {
    expect(
      canShowRewardedAdCta({
        loading: false,
        busy: false,
        packHeroAnimState: "idle",
        packStatus: {
          packsAvailable: 0,
          pityCounter: 10,
          nextPackGuaranteedSrPlus: true,
        },
      })
    ).toBe(false);
  });

  it("shows the ad CTA after the last opened pack was the special one", () => {
    expect(
      canShowRewardedAdCta({
        loading: false,
        busy: false,
        packHeroAnimState: "idle",
        latestGuaranteedPackOpened: true,
        packStatus: {
          packsAvailable: 0,
          pityCounter: 0,
          nextPackGuaranteedSrPlus: false,
        },
      })
    ).toBe(true);
  });

  it("keeps the ad CTA available if the UI still carries a stale special-pack flag after consuming it", () => {
    expect(
      canShowRewardedAdCta({
        loading: false,
        busy: false,
        packHeroAnimState: "idle",
        latestGuaranteedPackOpened: true,
        packStatus: {
          packsAvailable: 0,
          pityCounter: 10,
          nextPackGuaranteedSrPlus: true,
        },
      })
    ).toBe(true);
  });
});
