import {describe,it,expect} from 'vitest';
import {selectDatedFootballIdentity,verifiedCC0RosterIdentity} from './cc0-identity-disambiguation.js';
import {parseArchivedSquad,createIdentityIndex} from './cc0-roster-parser.js';
const claim=value=>({rank:'normal',mainsnak:{datavalue:{value}}});
const person=(id='Q1',birth='1982-06-21')=>({id,lastrevid:123,claims:{P106:[claim({id:'Q937857'})],P21:[claim({id:'Q6581097'})],P569:[claim({time:`+${birth}T00:00:00Z`,precision:11})]}});
const resolve=entities=>selectDatedFootballIdentity('Test Player',[2005,2014],entities,()=> 'USA');
describe('dated CC0 identity disambiguation',()=>{
  const context={name:'Michael Thomas',year:2012,clubId:'sporting-kansas-city',shirtNumber:88,source:'https://raw.githubusercontent.com/openfootball/v0-format/2516506e10a26a2d3b805f87368cf938a81fa08f/major-league-soccer/2012/squads/kansascity-2012.txt'};
  it('corrects the evidenced MLS namesake before the global name index can select the retired English player',()=>{
    const wrong={name:'Michael Thomas',birthDate:'1967-08-24',nationality:'ENG',wikidataId:'Q275823',identitySource:'https://www.wikidata.org/wiki/Q275823'};
    const result=parseArchivedSquad('(88) Michael Thomas\n#$$ pos: M',{...context,format:'mls',identities:createIdentityIndex([wrong])});
    expect(result.players).toHaveLength(1);
    expect(result.players[0]).toMatchObject({birthDate:'1988-03-08',nationality:'USA',wikidataId:'Q427832',identityCorrection:{from:{wikidataId:'Q275823'},to:{wikidataId:'Q427832'}}});
  });
  it('requires the exact name, year, club, shirt number and pinned source for a correction',()=>{
    expect(verifiedCC0RosterIdentity(context)?.birthDate).toBe('1988-03-08');
    for(const patch of [{name:'Mike Thomas'},{year:2011},{clubId:'arsenal'},{shirtNumber:8},{source:context.source.replace('2516506e','00000000')}])expect(verifiedCC0RosterIdentity({...context,...patch})).toBeNull();
    expect(verifiedCC0RosterIdentity({...context,year:2013,clubId:'toronto-fc',shirtNumber:18,source:context.source.replace('/2012/squads/kansascity-2012.txt','/2013/squads/toronto-2013.txt')})?.wikidataId).toBe('Q427832');
  });
  it('accepts a unique dated footballer and pins the identity revision',()=>{
    expect(resolve([person()]).player).toMatchObject({wikidataId:'Q1',birthDate:'1982-06-21',identityRevision:123,identitySource:'https://www.wikidata.org/w/index.php?title=Q1&oldid=123'});
  });
  it('never chooses one of two plausible footballers with the same name',()=>{
    expect(resolve([person(),person('Q2','1984-01-02')])).toMatchObject({player:null,reason:'multiple-valid-footballer-identities'});
  });
  it('does not treat missing nationality on a rival candidate as proof of a unique identity',()=>{
    expect(selectDatedFootballIdentity('Test Player',[2005,2014],[person(),person('Q2','1984-01-02')],e=>e.id==='Q1'?'USA':null)).toMatchObject({player:null,reason:'multiple-valid-footballer-identities'});
  });
  it('uses all documented seasons to reject an impossible age',()=>{
    expect(resolve([person(),person('Q2','1957-01-02')]).player?.wikidataId).toBe('Q1');
    expect(selectDatedFootballIdentity('Test Player',[1990,2014],[person()],()=> 'USA').player).toBeNull();
  });
  it('rejects invalid, imprecise, or conflicting birth dates',()=>{
    expect(resolve([person('Q1','1982-02-31')]).player).toBeNull();
    const imprecise=person();imprecise.claims.P569[0].mainsnak.datavalue.value.precision=9;
    expect(resolve([imprecise]).player).toBeNull();
    const conflicting=person();conflicting.claims.P569.push(claim({time:'+1983-06-21T00:00:00Z',precision:11}));
    expect(resolve([conflicting]).player).toBeNull();
  });
  it('requires active occupation and gender facts, without using a club to break a tie',()=>{
    const deprecated=person();deprecated.claims.P106[0].rank='deprecated';
    expect(resolve([deprecated]).player).toBeNull();
    const unverified=person();unverified.claims.P54=[claim({id:'QFAKECLUB'})];
    expect(resolve([unverified,person('Q2')]).player).toBeNull();
    delete unverified.claims.P21;expect(resolve([unverified]).player).toBeNull();
  });
});
