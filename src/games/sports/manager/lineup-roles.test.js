import { describe, expect, it } from 'vitest';
import { defenderRoles, orderDefendersForFormation } from './lineup-roles.js';

const madrid = ['sergio-ramos', 'pepe', 'marcelo', 'raphael-varane', 'dani-carvajal', 'fabio-coentrao']
  .map((id) => ({ id, membershipDate: '2013-09-03' }));

describe('natural defensive roles', () => {
  it('keeps a right and left back in a back four even when three centre backs rate higher', () => {
    const selected = orderDefendersForFormation(madrid, '4-3-3').slice(0, 4).map((player) => player.id);
    expect(selected).toEqual(['dani-carvajal', 'marcelo', 'sergio-ramos', 'pepe']);
    expect(new Set(selected).size).toBe(4);
  });
  it('selects three centre backs and includes fullbacks in a back five', () => {
    expect(orderDefendersForFormation(madrid, '3-5-2').slice(0, 3).map((player) => player.id)).toEqual(['sergio-ramos', 'pepe', 'raphael-varane']);
    expect(orderDefendersForFormation(madrid, '5-3-2').slice(0, 5).map((player) => player.id)).toEqual(['dani-carvajal', 'marcelo', 'sergio-ramos', 'pepe', 'raphael-varane']);
  });
  it('keeps generic defenders usable, does not mutate input and accounts for role changes', () => {
    const generic = Array.from({ length: 6 }, (_, index) => ({ id: `unknown-${index}` }));
    expect(orderDefendersForFormation(generic, '4-4-2')).toEqual(generic);
    expect(orderDefendersForFormation(madrid.slice(0, 4), '4-4-2')).toHaveLength(4);
    expect(madrid[0].id).toBe('sergio-ramos');
    expect(defenderRoles({ id: 'sergio-ramos', membershipDate: '2009-09-01' })[0]).toBe('RB');
    expect(defenderRoles({ id: 'sergio-ramos', membershipDate: '2013-09-03' })[0]).toBe('CB');
  });
});
