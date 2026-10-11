import {describe,it,expect} from 'vitest';
import {identitiesCompatible,linkedPlayerIdentities,reconcileSeasonPlayerGroups,unambiguousSeasonPlayers} from './player-identity-reconciliation.js';
const identity=p=>`${p.name.toLowerCase()}:${p.birthYear}`;
const row=(name,birthDate,identityPageId,clubId='a',extra={})=>[clubId,{players:[{name,birthDate,birthYear:Number(birthDate?.slice(0,4))||1985,identityPageId,...extra}]}];
describe('compatible player identities',()=>{
  it('keeps three different Scott Browns despite their identical name and birth year',()=>{
    const records=[row('Scott Brown','1985-06-25',2442450,'celtic'),row('Scott Brown','1985-05-08',5984772,'cheltenham'),row('Scott Brown','1985-04-26',12777959,'fleetwood')];
    expect(unambiguousSeasonPlayers(records,identity)).toHaveLength(3);
    expect(identitiesCompatible(records[0][1].players[0],records[1][1].players[0])).toBe(false);
  });
  it('does not collapse different same-provider IDs even when names and exact birthdays coincide',()=>{
    expect(unambiguousSeasonPlayers([row('Homonym','1985-06-25',1),row('Homonym','1985-06-25',2,'b')],identity)).toHaveLength(2);
    expect(identitiesCompatible({wikidataId:'Q1'},{wikidataId:'Q2'})).toBe(false);
  });
  it('namespaces numeric Wikipedia IDs by language',()=>{
    const a={identityPageId:10,identityWiki:'en'},b={identityPageId:10,identityWiki:'es'};
    expect(linkedPlayerIdentities(a)).not.toEqual(linkedPlayerIdentities(b));
    expect(identitiesCompatible(a,b)).toBe(true);
    expect(unambiguousSeasonPlayers([row('Alice','1985-01-01',10),row('Bob','1985-01-01',10,'b',{identityWiki:'es'})],identity)).toHaveLength(2);
  });
  it('retains source priority and accumulated enwiki/Wikidata/Spanish identity bridges',()=>{
    const records=[row('Scott Brown','1985-06-25',2442450,'a',{wikidataId:'Q1'}),row('Scott Brown','1985-06-25',99,'a',{identityWiki:'es',wikidataId:'Q1',position:'MF'})];
    const [player]=unambiguousSeasonPlayers(records,identity);
    expect(player.position).toBe('MF');expect(player.identityKeys).toEqual(expect.arrayContaining(['en.wikipedia.org:2442450','es.wikipedia.org:99','wikidata:Q1']));
  });
  it('quarantines contradictory DOBs on a shared strong identity',()=>{
    expect(unambiguousSeasonPlayers([row('Player','1985-01-01',1),row('Player','1985-02-02',1)],identity)).toEqual([]);
  });
  it('does not allow a birthday-less name match to bridge two homonyms',()=>{
    const records=[row('Scott Brown','1985-06-25',1),row('Scott Brown',null,null,'c'),row('Scott Brown','1985-05-08',2,'b')];
    const players=unambiguousSeasonPlayers(records,identity);
    expect(players).toHaveLength(2);expect(players.map(p=>p.identityPageId).sort()).toEqual([1,2]);
  });
  it('can enrich a uniquely compatible birthday-less record without inventing identities',()=>{
    const players=unambiguousSeasonPlayers([row('Scott Brown',null,null),row('Scott Brown','1985-06-25',1)],identity);
    expect(players).toHaveLength(1);expect(players[0].identityPageId).toBe(1);
  });
  it('keeps cross-club affiliations for the same person quarantined',()=>{
    expect(unambiguousSeasonPlayers([row('Player','1985-01-01',1,'a'),row('Player','1985-01-01',1,'b')],identity)).toEqual([]);
  });
  it('rejects transitive weak-name bridges between incompatible strong IDs',()=>{
    const players=unambiguousSeasonPlayers([row('Player','1985-01-01',1),row('Player','1985-01-01',null,'c'),row('Player','1985-01-01',2,'b')],identity);
    expect(players).toHaveLength(2);
  });
  it('exposes rejected groups and quarantines contradictory saved identity keys',()=>{
    const records=[row('Player','1985-01-01',1,'a',{identityKeys:['en.wikipedia.org:2']})];
    expect(unambiguousSeasonPlayers(records,identity)).toEqual([]);
    expect(reconcileSeasonPlayerGroups(records,identity)[0].reason).toBe('conflicting-provider-identity');
    const other=reconcileSeasonPlayerGroups([row('Player','1985-01-01',1,'a'),row('Player','1985-01-01',1,'b')],identity)[0];
    expect(other.reason).toBe('multiple-clubs');expect(other.clubs).toEqual(['a','b']);expect(other.rows).toHaveLength(2);
  });
  it('an ambiguous weak alias cannot poison a valid strong identity in a later name group',()=>{
    const records=[row('Shared','1985-01-01',1,'a',{fullName:'Unique'}),row('Shared',null,null,'c',{fullName:'Unique'}),row('Shared','1985-02-02',2,'b')];
    expect(unambiguousSeasonPlayers(records,identity).map(p=>p.identityPageId).sort()).toEqual([1,2]);
  });
});

describe('calendar-year career evidence versus a season-long roster',()=>{
  const career=(club='tottenham',extra={})=>{const [id,r]=row('Christian Eriksen','1992-02-14',100,club,{stintFrom:2013,stintTo:2020,careerEvidencePrecision:'year-interior',...extra});return[id,{...r,season:'2019',precision:'year-interior',scope:'individual-career',sourceId:'wikimedia-verified-career',source:'career-biography'}];};
  const seasonal=(club='inter',extra={},record={})=>{const [id,r]=row('Christian Eriksen','1992-02-14',100,club,extra);return[id,{...r,season:'2019/20',precision:'season',source:'season-list',...record}];};
  it('uses the interior career for the starting year and retains its exact provenance',()=>{
    const records=[career(),seasonal('inter',{wikidataId:'Q1',position:'FW'})];
    const [group]=reconcileSeasonPlayerGroups(records,identity);
    expect(group.reason).toBe(null);expect(group.row.clubId).toBe('tottenham');expect(group.row.record.source).toBe('career-biography');expect(group.row.position).toBeUndefined();
    expect(group.row.identityKeys).toContain('wikidata:Q1');expect(group.clubs).toEqual(['tottenham','inter']);expect(group.resolution.type).toBe('whole-calendar-year-career');
  });
  it('keeps two contradictory careers and boundary years quarantined',()=>{
    expect(unambiguousSeasonPlayers([career(),career('inter')],identity)).toHaveLength(0);
    expect(unambiguousSeasonPlayers([career('tottenham',{stintTo:2019}),seasonal()],identity)).toHaveLength(0);
  });
  it('cannot override dated match observations, exact snapshots or annual rosters',()=>{
    for(const other of [seasonal('inter',{observations:[{date:'2019-08-15'}]}),seasonal('inter',{membershipVerified:true}),seasonal('inter',{}, {evidenceCutoff:'2019-09-01'}),seasonal('inter',{}, {precision:'day',snapshotDate:'2019-09-01'}),seasonal('inter',{}, {season:'2019'}),seasonal('inter',{}, {season:'2020/21'})])expect(unambiguousSeasonPlayers([career(),other],identity)).toHaveLength(0);
  });
  it('never overrides a birthday or same-namespace identifier contradiction',()=>{
    expect(reconcileSeasonPlayerGroups([career(),seasonal('inter',{birthDate:'1992-02-15'})],identity)[0].reason).toBe('conflicting-birth-date');
    const a=career('tottenham',{wikidataId:'Q1'}),b=seasonal('inter',{wikidataId:'Q2'});
    expect(reconcileSeasonPlayerGroups([a,b],identity)[0].reason).toBe('conflicting-provider-identity');
  });
  it('does not accept an untrusted source merely declaring year-interior precision',()=>{
    const other=career();other[1].sourceId='unreviewed-career';
    expect(unambiguousSeasonPlayers([other,seasonal()],identity)).toHaveLength(0);
  });
});
