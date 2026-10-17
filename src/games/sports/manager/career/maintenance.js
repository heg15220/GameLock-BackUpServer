/** Retain every active player and every historical reference, not unused retirees. */
export function pruneUnreferencedRetirees(career) {
  const players = career.world.players;
  const candidates = new Set(Object.values(players).filter(player => player.retired).map(player => player.id));
  if (!candidates.size) return 0;
  const seen = new WeakSet();
  const retained = [];
  function retain(id) { if (candidates.delete(id)) retained.push(players[id]); }
  function visit(value) {
    if (typeof value === 'string') { retain(value); return; }
    if (!value || typeof value !== 'object' || value === players || seen.has(value)) return;
    seen.add(value);
    for (const [key, item] of Object.entries(value)) { retain(key); visit(item); }
  }
  // History, honours, inbox, scouting, pending deals, lineups and live matches
  // all protect their referenced people. Do not trim the manager's achievements.
  visit(career);
  for (const player of Object.values(players)) if (!player.retired) visit(player);
  // A protected former player can itself reference another former player.
  for (let index = 0; index < retained.length; index++) visit(retained[index]);
  for (const id of candidates) delete players[id];
  return candidates.size;
}
