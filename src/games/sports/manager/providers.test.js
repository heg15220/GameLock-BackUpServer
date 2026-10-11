import { describe, it, expect } from 'vitest';
import historical from './historical-results.json';
import memberships from './player-memberships.json';
import {
  calculateClubRatings, extractCompetitionTeams, extractWikidataPlayer,
  playerClubAtDate, resolveClubId, openFootballUrl,
} from './providers.js';

describe('open football sources', () => {
  it('uses completed prior results, excluding unplayed and future fixtures', () => {
    const data = { matches: [
      { team1: 'A', team2: 'B', date: '2011-09-01', score: { ft: [2, 0] } },
      { team1: 'B', team2: 'A', date: '2012-01-01', score: { ft: [1, 1] } },
      { team1: 'A', team2: 'B', date: '2012-09-01', score: { ft: [20, 0] } },
      { team1: 'A', team2: 'B', date: '2011-08-01', score: {} },
      { team1: 'A', team2: 'B', date: '2011-08-02', score: { ft: [null, null] } },
    ] };
    const result = calculateClubRatings(data, { beforeDate: '2012-07-01' });
    expect(result.matchesUsed).toBe(2);
    expect(result.lastMatchDate).toBe('2012-01-01');
    expect(result.teams.find(team => team.clubId === 'a')).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, points: 4, goalsFor: 3, goalsAgainst: 1, rating: 82 });
    expect(result.teams.reduce((sum, team) => sum + team.goalsFor, 0)).toBe(result.teams.reduce((sum, team) => sum + team.goalsAgainst, 0));
  });

  it('extracts historical membership without looking at scores', () => {
    const data = { rounds: [{ matches: [{ team1: 'FC Barcelona', team2: 'Real Madrid CF' }] }] };
    expect(extractCompetitionTeams(data).map(team => team.clubId)).toEqual(['barcelona', 'real-madrid']);
    expect(resolveClubId('Liverpool FC', { a: { id: 'liverpool', name: 'Liverpool' }, b: { id: 'liverpool-montevideo', name: 'Liverpool' } })).toBe('liverpool');
  });

  it('preserves unknown dates and rejects ambiguous transfer years', () => {
    const entity = { id: 'Q1', labels: { en: { value: 'Example' } }, claims: { P54: [{ id: 'Q1$1', rank: 'normal', mainsnak: { datavalue: { value: { id: 'Q2' } } }, qualifiers: { P580: [{ datavalue: { value: { time: '+2012-00-00T00:00:00Z', precision: 9 } } }] } }] } };
    const player = extractWikidataPlayer(entity, { Q2: 'example-club' });
    expect(player.birthDate).toBeNull();
    expect(player.memberships[0].start).toEqual({ value: '2012', precision: 'year' });
    expect(playerClubAtDate(player, '2012-07-01')).toBeNull();
    expect(playerClubAtDate(player, '2013-07-01')).toBeNull();
    player.memberships[0].verificationStatus='verified';
    player.memberships[0].evidence=[{authority:'primary',sourceUrl:'https://example.org/club-record',from:'2012-01-01',to:'2015-01-01'}];
    expect(playerClubAtDate(player, '2012-07-01')).toBeNull();
    expect(playerClubAtDate(player, '2013-07-01')).toBe('example-club');
    player.memberships.push({clubId:'possible-loan',start:{value:'2013',precision:'year'},end:{value:'2014',precision:'year'}});
    expect(playerClubAtDate(player,'2013-07-01')).toBeNull();
  });

  it('bundles real CC0 results with provenance and no later-season performance', () => {
    for (const [year, competitions] of Object.entries(historical.seasons)) {
      for (const data of Object.values(competitions)) {
        expect(data.license).toBe('CC0-1.0');
        expect(data.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(new Set(data.teams.map(team => team.clubId)).size).toBe(data.teams.length);
        if (data.lastMatchDate) expect(data.lastMatchDate < `${year}-07-01`).toBe(true);
      }
    }
    const england = historical.seasons['2012']['premier-league'];
    expect(england.matchesUsed).toBe(380);
    expect(england.teams.find(team => team.clubId === 'manchester-city')).toMatchObject({ points: 89, goalsFor: 93, goalsAgainst: 29 });
    expect(historical.seasons['2012'].laliga.teams.find(team => team.clubId === 'barcelona').rating).toBeNull();
  });

  it('does not treat the old six-player Wikidata sample as independent verification', () => {
    const expected = [
      ['Q615', '2012-09-01', 'barcelona'], ['Q11571', '2012-09-01', 'real-madrid'],
      ['Q43913', '2012-09-01', 'bayern-munchen'], ['Q21621995', '2025-09-01', 'real-madrid'],
      ['Q113704154', '2025-09-01', 'barcelona'], ['Q28967995', '2025-09-01', 'manchester-city'],
    ];
    for (const [id, date] of expected) expect(playerClubAtDate(memberships.players.find(player => player.wikidataId === id), date)).toBeNull();
  });

  it('retains references and external club identities but never promotes imported-from references',()=>{
    const player=extractWikidataPlayer({id:'Q1',claims:{P54:[{id:'Q1$claim',rank:'normal',mainsnak:{datavalue:{value:{id:'Q99'}}},references:[{hash:'reference',snaks:{P143:[{datavalue:{value:{id:'Q328'}}}]}}]}]}});
    expect(player.memberships[0]).toMatchObject({teamWikidataId:'Q99',clubId:null,verificationStatus:'unverified',references:[{importedFrom:['Q328']}]});
  });

  it('bounds open claims, honors external transfers and rejects unknown-start overlaps',()=>{
    const first={clubId:'club-a',teamWikidataId:'Q2',teamKind:'club',start:{value:'2011',precision:'year'},end:null,verificationStatus:'verified',evidence:[{authority:'primary',sourceUrl:'https://example.org/record',from:'2011-01-01',to:'2015-01-01'}]};
    expect(playerClubAtDate({memberships:[first]},'2013-09-03')).toBe('club-a');
    expect(playerClubAtDate({memberships:[first]},'2025-09-01')).toBeNull();
    const external={clubId:null,teamWikidataId:'Q999',teamKind:'club',start:{value:'2013',precision:'year'},end:null};
    expect(playerClubAtDate({memberships:[first,external]},'2013-09-03')).toBeNull();
    expect(playerClubAtDate({memberships:[first,{...external,start:null}]},'2012-09-01')).toBeNull();
    expect(playerClubAtDate({memberships:[first,{...external,teamKind:'national'}]},'2013-09-03')).toBe('club-a');
    expect(playerClubAtDate({memberships:[{...first,verificationStatus:'rejected'}]},'2013-09-03')).toBeNull();
  });

  it('only resolves a documented loan when its parent identity is explicit',()=>{
    const evidence=[{authority:'primary',sourceUrl:'https://example.org/loan',from:'2013-08-01',to:'2014-07-01'}];
    const parent={clubId:'parent',teamWikidataId:'Q2',start:{value:'2010',precision:'year'},end:{value:'2015',precision:'year'},verificationStatus:'verified',evidence};
    const loan={clubId:'loan',teamWikidataId:'Q3',start:{value:'2013-08-01',precision:'day'},end:{value:'2014-07-01',precision:'day'},verificationStatus:'verified',evidence};
    expect(playerClubAtDate({memberships:[parent,loan]},'2013-09-03')).toBeNull();
    expect(playerClubAtDate({memberships:[parent,{...loan,membershipType:'loan',parentTeamWikidataId:'Q2'}]},'2013-09-03')).toBe('loan');
  });

  it('only constructs known public dataset URLs', () => {
    expect(openFootballUrl('laliga', 2012)).toContain('/2012-13/es.1.json');
    expect(() => openFootballUrl('unknown', 2012)).toThrow();
    expect(() => openFootballUrl('laliga', '../2012')).toThrow();
  });
});
