export function canShowRewardedAdCta({
  loading,
  busy,
  packHeroAnimState,
  packStatus,
  pityTarget = 10,
  latestGuaranteedPackOpened = false,
}) {
  const packsAvailable = Math.max(0, Number(packStatus?.packsAvailable) || 0);
  const pityCounter = Math.max(0, Number(packStatus?.pityCounter) || 0);
  const specialPackPending =
    Boolean(packStatus?.nextPackGuaranteedSrPlus) || pityCounter >= pityTarget;

  return !loading
    && !busy
    && packHeroAnimState === "idle"
    && packsAvailable <= 0
    && (!specialPackPending || latestGuaranteedPackOpened);
}
