import { describe, expect, it } from 'vitest';
import { getPlayerAge } from './player-age.js';

describe('dated player age', () => {
  it('does not make Benzema 26 before his December birthday in the 2013 archive', () => {
    const player = { birthDate: '1987-12-19', birthYear: 1987 };
    expect(getPlayerAge(player, '2013-09-03', 2013)).toBe(25);
    expect(getPlayerAge(player, '2013-12-18', 2013)).toBe(25);
    expect(getPlayerAge(player, '2013-12-19', 2013)).toBe(26);
    expect(getPlayerAge(player, '2014-01-01', 2013)).toBe(26);
  });
  it('retains a year estimate when no exact birth date exists', () => {
    expect(getPlayerAge({ birthYear: 1993 }, '2013-09-03', 2013)).toBe(20);
    expect(getPlayerAge({ birthYear: 1993 }, null, 2014)).toBe(21);
  });
});
