// Limited, explicit natural roles for documented players. Unknown defenders keep
// their generic DF role; a surname or nationality is never used to infer a role.
const DEFENDER_ROLES = {
  'dani-carvajal': ['RB'], 'alvaro-arbeloa': ['RB', 'LB'], marcelo: ['LB'],
  'marcelo-vieira': ['LB'], 'fabio-coentrao': ['LB'], pepe: ['CB'],
  'raphael-varane': ['CB'], 'sergio-ramos': ['CB', 'RB'], 'nacho-fernandez': ['CB', 'RB', 'LB'],
  'raul-albiol': ['CB'], 'ezequiel-garay': ['CB'], 'christoph-metzelder': ['CB'],
  'dani-alves': ['RB'], 'martin-montoya': ['RB'], 'jordi-alba': ['LB'],
  'adriano-correia': ['LB', 'RB'], 'gerard-pique': ['CB'], 'carles-puyol': ['CB', 'RB'],
  'javier-mascherano': ['CB'], 'marc-bartra': ['CB'],
  'philipp-lahm': ['RB', 'LB'], 'rafinha': ['RB'], 'david-alaba': ['LB', 'CB'],
  'jerome-boateng': ['CB', 'RB'], dante: ['CB'], 'holger-badstuber': ['CB', 'LB'],
  'daniel-van-buyten': ['CB'], 'diego-contento': ['LB'],
  'trent-alexander-arnold': ['RB'], 'ferland-mendy': ['LB'], 'fran-garcia': ['LB'],
  'antonio-rudiger': ['CB'], 'eder-militao': ['CB', 'RB'], 'dean-huijsen': ['CB'],
  'alejandro-balde': ['LB'], 'pau-cubarsi': ['CB'], 'ronald-araujo': ['CB', 'RB'],
  'jules-kounde': ['RB', 'CB'], 'andreas-christensen': ['CB'],
};

export function defenderRoles(player) {
  if (Array.isArray(player.roles)) return player.roles.filter((role) => ['RB', 'LB', 'CB'].includes(role));
  const year = Number(player.membershipDate?.slice(0, 4)) || player.birthYear + player.age;
  if (player.id === 'sergio-ramos' && year < 2011) return ['RB', 'CB'];
  if (player.id === 'david-alaba' && year >= 2020) return ['CB', 'LB'];
  return DEFENDER_ROLES[player.id] || [];
}

/** Input is already ranked by fitness-adjusted ability. Preserve that order
 * within natural roles, and retain generic defenders when roles are unknown. */
export function orderDefendersForFormation(sorted, formation) {
  const count = Number(formation.split('-')[0]);
  if (![3, 4, 5].includes(count)) return sorted.slice();
  const slots = count === 3 ? ['CB', 'CB', 'CB'] : ['RB', 'LB', ...Array(count - 2).fill('CB')];
  const chosen = [];
  const used = new Set();
  for (const role of slots) {
    const available = sorted.filter((player) => !used.has(player.id));
    const player = available.find((entry) => defenderRoles(entry)[0] === role)
      || available.find((entry) => defenderRoles(entry).includes(role));
    if (player) { chosen.push(player); used.add(player.id); }
  }
  return [...chosen, ...sorted.filter((player) => !used.has(player.id))];
}
