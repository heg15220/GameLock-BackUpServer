import { describe, it, expect } from 'vitest';
import { hasPlayableRealDepth } from './roster-depth.js';

const squad = counts => Object.entries(counts).flatMap(([position, count]) =>
  Array.from({ length: count }, () => ({ position, real: true })));

describe('documented squad depth', () => {
  it('does not add fictitious forwards just to force a six-forward template', () => {
    expect(hasPlayableRealDepth(squad({ GK: 3, DF: 8, MF: 8, FW: 4 }))).toBe(true);
  });
  it('still needs cover when a large archive lacks a goalkeeper or a supported midfield', () => {
    expect(hasPlayableRealDepth(squad({ GK: 1, DF: 8, MF: 8, FW: 6 }))).toBe(false);
    expect(hasPlayableRealDepth(squad({ GK: 3, DF: 10, MF: 4, FW: 6 }))).toBe(false);
  });
  it('does not treat a small partial list or generated reserves as documented depth', () => {
    expect(hasPlayableRealDepth(squad({ GK: 2, DF: 7, MF: 7, FW: 5 }))).toBe(false);
    const players = squad({ GK: 2, DF: 7, MF: 7, FW: 6 });
    players[0].real = false;
    expect(hasPlayableRealDepth(players)).toBe(false);
  });
});
