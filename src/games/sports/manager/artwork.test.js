import { describe, it, expect } from 'vitest';
import { footballArtwork } from '../../../../scripts/lib/wiki-artwork.mjs';
describe('explicit football artwork', () => {
  it('supports image modifiers, comments, indentation and GIF crests', () => {
    expect(footballArtwork('{{Infobox football league\n| image = Premier League Logo.svg{{!}}class=skin-invert\n}}', 'competitions').file).toBe('File:Premier League Logo.svg');
    expect(footballArtwork('{{Infobox football club\n  | image = <!-- badge --> SulaLaLima.gif\n}}', 'crests').file).toBe('File:SulaLaLima.gif');
  });
  it('never borrows a photograph from another infobox', () => {
    const text = '{{Infobox football club\n| founded = {{start date|1900}}\n| image =\n}}\n{{Infobox stadium\n| image = ground.jpg\n}}';
    expect(footballArtwork(text, 'crests').reason).toBe('no-explicit-crest-image');
    expect(footballArtwork('{{Infobox person\n| image = person.jpg\n}}', 'crests').reason).toBe('no-football-infobox');
  });
  it('uses the explicit badge in French club and league infoboxes', () => {
    expect(footballArtwork('{{Infobox Club de football\n| logo = [[Fichier:Club sénégalais.svg|100px]]\n}}', 'crests').file).toBe('File:Club sénégalais.svg');
    expect(footballArtwork('{{Infobox Compétition sportive\n| image = Ligue du Sénégal.png\n}}', 'competitions').file).toBe('File:Ligue du Sénégal.png');
  });
  it('rejects explicitly labelled squad, flag and stadium photographs', () => {
    for (const file of ['Team_photo.jpg', 'Stadium.jpg', 'Flag_of_country.svg']) expect(footballArtwork(`{{Infobox football club\n| image = ${file}\n}}`, 'crests').file).toBeUndefined();
  });
});
