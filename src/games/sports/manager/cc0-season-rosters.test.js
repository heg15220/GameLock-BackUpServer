import {describe,it,expect} from 'vitest';
import rosters from './cc0-season-rosters.json';
import memberships from './league-memberships.json';
import world from '../trayectoria/world.data.json';
import {identityKey} from './cc0-roster-parser.js';
describe('published additional CC0 rosters',()=>{
  it('keeps the documented American Michael Thomas distinct from the retired English namesake',()=>{
    for(const [year,clubId] of [[2012,'sporting-kansas-city'],[2013,'toronto-fc']]){
      expect(rosters.seasons[year][clubId].players.find(p=>p.name==='Michael Thomas')).toMatchObject({birthDate:'1988-03-08',nationality:'USA',wikidataId:'Q427832',identityCorrection:{id:'michael-thomas-mls-2012-2013'}});
      expect(rosters.seasons[year][clubId].players.some(p=>p.wikidataId==='Q275823')).toBe(false);
    }
  });
  it('only assigns documented season participants and preserves immutable source evidence',()=>{
    for(const [year,clubs] of Object.entries(rosters.seasons))for(const [clubId,squad] of Object.entries(clubs)){
      expect(memberships.seasons[year][squad.competitionId].teams.some(t=>t.clubId===clubId)).toBe(true);
      expect(squad.precision).toBe('season');
      expect(squad.license).toBe('CC0-1.0');
      expect(squad.source).toContain(`/openfootball/v0-format/${squad.revision}/`);
      expect(squad.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(squad.players.length).toBeGreaterThanOrEqual(11);
      expect(squad.players.some(p=>p.position==='GK')).toBe(true);
    }
  });
  it('preserves dated identities and rejects within-club duplicates and unsupported nationalities',()=>{
    for(const clubs of Object.values(rosters.seasons))for(const squad of Object.values(clubs)){
      const identities=new Set();
      for(const p of squad.players){
        expect(p.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(p.birthDate).toISOString().slice(0,10)).toBe(p.birthDate);
        expect(world.countries[p.nationality]).toBeTruthy();
        const identity=identityKey(p.name)+'|'+p.birthDate;
        expect(identities.has(identity)).toBe(false);identities.add(identity);
      }
    }
  });
  it('covers both complete sets of German clubs for 2015 and keeps explicit birth facts',()=>{
    for(const competitionId of ['bundesliga','2-bundesliga']){
      const expected=memberships.seasons[2015][competitionId].teams.map(t=>t.clubId).sort();
      const actual=Object.entries(rosters.seasons[2015]).filter(([,s])=>s.competitionId===competitionId).map(([id])=>id).sort();
      expect(actual).toEqual(expected);
    }
    expect(rosters.seasons[2015]['fc-augsburg'].players.find(p=>p.name==='Alexander Manninger')).toMatchObject({birthDate:'1977-06-04',nationality:'AUT',position:'GK'});
  });
  it('adds actual MLS season lists across 2005–2014 without extrapolating between years',()=>{
    for(let year=2005;year<=2014;year++)expect(Object.values(rosters.seasons[year]).filter(r=>r.competitionId==='usa-mls').length).toBeGreaterThanOrEqual(11);
    expect(rosters.seasons[2005]['los-angeles-galaxy'].players.find(p=>p.name==='Landon Donovan')).toMatchObject({birthDate:'1982-03-04',nationality:'USA',position:'FW'});
    expect(rosters.seasons[2008]['san-jose-earthquakes'].players.find(p=>p.name==='Joe Cannon')).toMatchObject({birthDate:'1975-01-01',position:'GK',wikidataId:'Q2554583'});
    expect(rosters.seasons[2014]['cd-chivas-usa'].players.find(p=>p.name==='Dan Kennedy')).toMatchObject({birthDate:'1982-07-22',position:'GK',wikidataId:'Q5213798'});
    expect(rosters.seasons[2015]['los-angeles-galaxy']).toBeUndefined();
  });
});
