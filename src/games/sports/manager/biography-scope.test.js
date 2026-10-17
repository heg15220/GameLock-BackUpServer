import { describe, it, expect } from 'vitest';
import { isWomensPlayingCareer, isOtherSport } from '../../../../scripts/lib/football-biography-scope.mjs';
describe('men’s historical squad evidence', () => {
  it('recognises explicitly labelled women’s playing teams and national teams', () => {
    for (const article of ['Argentina women’s national football team', 'Boca Juniors (fútbol femenino)', 'FC Bayern München (Frauen)']) {
      expect(isWomensPlayingCareer({ stints: [{ article }] })).toBe(true);
      expect(isWomensPlayingCareer({ national: [{ article }] })).toBe(true);
    }
    expect(isWomensPlayingCareer({}, { infobox: '{{Infobox Fußballspieler\n| mw = w\n}}' })).toBe(true);
  });
  it('does not infer participation from a name or a later coaching job', () => {
    expect(isWomensPlayingCareer({ name: 'Example', stints: [{ article: 'Boca Juniors' }] }, { infobox: '{{Infobox football biography\n| managerclubs1 = Argentina women\n}}' })).toBe(false);
  });
  it('keeps explicitly different sports out of football rosters', () => {
    for (const sport of ['[[Baloncesto]]', 'Fútbol sala', 'Fútbol playa', 'American football']) expect(isOtherSport({ infobox: `{{Ficha de deportista\n| deporte = ${sport}\n}}` })).toBe(true);
    expect(isOtherSport({ infobox: '{{Ficha de deportista\n| deporte = [[Fútbol]]\n}}' })).toBe(false);
    expect(isOtherSport({ infobox: '{{Ficha de futbolista\n| nombre = Example\n}}' })).toBe(false);
  });
});
