import { describe, it, expect } from 'vitest';
import { canonicalGlobalClub, correctGlobalParticipant } from './global-club-aliases.js';

describe('reviewed historical club identities', () => {
  it('scopes aliases to their country', () => {
    expect(canonicalGlobalClub('ca-colon', 'ARG')).toBe('colon-santa-fe');
    expect(canonicalGlobalClub('ca-colon', 'URU')).toBe('ca-colon');
    expect(canonicalGlobalClub('unknown-club', 'ARG')).toBe('unknown-club');
  });
  it('keeps the original Mandiyú separate from the tribute club', () => {
    const team = { clubId: 'textil-mandiyu', article: 'Textil Mandiyú', name: 'Mandiyú' };
    const corrected = correctGlobalParticipant(team, 'ARG', 1990);
    expect(corrected.clubId).toBe('arg-deportivo-mandiyu');
    expect(corrected.identityCorrection.originalArticle).toBe('Textil Mandiyú');
    expect(correctGlobalParticipant(team, 'ARG', 2000)).toBe(team);
    expect(correctGlobalParticipant(team, 'URU', 1990)).toBe(team);
  });
  it('joins documented Argentine aliases without confusing namesake clubs', () => {
    expect(canonicalGlobalClub('arg-club-de-gimnasia-y-esgrima-la-plata', 'ARG')).toBe('gimnasia-lp');
    expect(canonicalGlobalClub('arg-instituto-atletico-central-cordoba', 'ARG')).toBe('instituto-cordoba');
    expect(canonicalGlobalClub('gimnasia-y-esgrima-de-mendoza', 'ARG')).toBe('gimnasia-y-esgrima-de-mendoza');
    expect(canonicalGlobalClub('talleres-remedios-de-escalada', 'ARG')).toBe('talleres-remedios-de-escalada');
  });
});
