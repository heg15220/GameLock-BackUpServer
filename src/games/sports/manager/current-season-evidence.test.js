import { describe, expect, it } from 'vitest';
import { currentClubSeasonEvidence } from '../../../../scripts/lib/current-club-season.mjs';
import { latestSeasonYear } from '../../../../scripts/lib/manager-season-range.mjs';

describe('current-season source boundaries', () => {
  it('requires an explicitly matching current season and an in-season source revision', () => {
    const source = { text: '{{Infobox football club\n| current = 2026–27 Example FC season\n}}', timestamp: '2026-10-12T10:00:00Z' };
    expect(currentClubSeasonEvidence(source, '2026/27')).toContain('2026–27');
    expect(currentClubSeasonEvidence(source, '2025/26')).toBeNull();
    expect(currentClubSeasonEvidence({ ...source, text: 'The club played in 2026–27.\n==Current squad==' }, '2026/27')).toBeNull();
    expect(currentClubSeasonEvidence({ ...source, timestamp: '2025-10-01T00:00:00Z' }, '2026/27')).toBeNull();
    expect(currentClubSeasonEvidence({ ...source, timestamp: '2027-08-01T00:00:00Z' }, '2026/27')).toBeNull();
  });
  it('rolls the import range over in July without advertising unverified years at runtime', () => {
    expect(latestSeasonYear(new Date('2026-06-30T23:59:59Z'))).toBe(2025);
    expect(latestSeasonYear(new Date('2026-07-01T00:00:00Z'))).toBe(2026);
  });
});
