// The fallback 2/7/7/6 distribution is a generation template, not a historical
// registration rule. A documented squad that can field all supported systems
// and a reserve goalkeeper does not need fictional extras to match that ratio.
export function hasPlayableRealDepth(players) {
  if (players.length < 22 || players.some(player => !player.real)) return false;
  const counts = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const player of players) counts[player.position]++;
  return counts.GK >= 2 && counts.DF >= 5 && counts.MF >= 5 && counts.FW >= 3;
}
