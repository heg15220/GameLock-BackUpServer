import {describe,it,expect} from 'vitest';
import {parseBirthDate,parsePlayerIdentities,createIdentityIndex,resolveIdentity,parseArchivedSquad} from './cc0-roster-parser.js';
const player=(name,birthDate,nationality='USA')=>({name,birthDate,birthYear:Number(birthDate.slice(0,4)),nationality,identitySource:'https://example.test/identity'});
describe('CC0 dated season roster import',()=>{
  it('validates exact dates and never derives birth dates from ages or squad years',()=>{
    expect(parseBirthDate(' 4 Jun 1977 (38)')).toBe('1977-06-04');
    expect(parseBirthDate('31 Feb 1977')).toBeNull();
    expect(parseBirthDate('99 Jan 1977')).toBeNull();
    expect(parseBirthDate('age: 24')).toBeNull();
    expect(parseBirthDate('2012-')).toBeNull();
  });
  it('extracts only explicitly dated player profiles',()=>{
    expect(parsePlayerIdentities('Alec Kann, G, 1.90 m, b. 8 Aug 1990 @ Atlanta\nUnknown, G, - , age 24','USA','source')).toEqual([{...player('Alec Kann','1990-08-08'),position:'GK',identitySource:'source'}]);
  });
  it('rejects ambiguous names and mononyms even if only one local identity exists',()=>{
    const index=createIdentityIndex([player('Chris Brown','1981-01-01'),player('Chris Brown','1984-02-02'),player('Thiago','1991-04-11'),player('Matt Pickens','1982-04-05')]);
    expect(resolveIdentity('Chris Brown',index)).toBeNull();
    expect(resolveIdentity('Thiago',index)).toBeNull();
    expect(resolveIdentity('Matt Pickens',index)?.birthDate).toBe('1982-04-05');
  });
  it('parses German lists with inline birthdays and explicit foreign nationalities',()=>{
    const result=parseArchivedSquad('1 Manninger, Alexander (AUT) GK 2012- # 4 Jun 1977 (38)\n3 Missing, Person DF 2015-', {format:'rows',country:'GER',identities:new Map(),year:2015});
    expect(result.players).toEqual([{name:'Alexander Manninger',birthDate:'1977-06-04',birthYear:1977,nationality:'AUT',position:'GK',shirtNumber:1}]);
    expect(result.unresolved).toHaveLength(1);
  });
  it('uses MLS listed positions but excludes unverified birth dates and misleading age zero',()=>{
    const identities=createIdentityIndex([player('Alec Kann','1990-08-08')]);
    const result=parseArchivedSquad('(1) Alec Kann\n#$$ pos: G, age: 0\n(9) Unknown Name\n#$$ pos: F, age: 28', {format:'mls',identities,year:2014});
    expect(result.players).toHaveLength(1);
    expect(result.players[0]).toMatchObject({name:'Alec Kann',birthDate:'1990-08-08',position:'GK',nationality:'USA'});
    expect(result.unresolved).toEqual([{name:'Unknown Name',reason:'missing-or-ambiguous-dated-identity'}]);
  });
  it('reads Champions League positional sections without importing staff or unmatched names',()=>{
    const identities=createIdentityIndex([player('Jasper Cillessen','1989-04-22','NED'),player('Joël Veltman','1992-01-15','NED'),player('Jan Oblak','1993-01-07','SVN')]);
    const result=parseArchivedSquad('# Ajax\n## Goalkeepers\n22 Jasper Cillessen\n13 Jan Oblak (SLO)\n## Defenders\n3 Joël Veltman', {format:'sections',identities,year:2014});
    expect(result.players.map(p=>[p.name,p.position])).toEqual([['Jasper Cillessen','GK'],['Jan Oblak','GK'],['Joël Veltman','DF']]);
  });
});
