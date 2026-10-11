import {describe,it,expect} from 'vitest';
import archive from './wikimedia-rosters.json';
import {getManagerWorld} from './data.js';

describe('licensed historical squad integration',()=>{
  it('does not import retired namesakes or technical staff as historical players',()=>{
    for(const [year,name,birthYear] of [[1990,'Manuel Sanchís',1938],[1993,'Francisco Molina',1930],[2006,'Paul Hinshelwood',1956],[2012,'Michael Thomas',1967],[2013,'Michael Thomas',1967],[2020,'Herbert Ilsanker',1967],[2025,'Shigetatsu Matsunaga',1962]]){
      expect(getManagerWorld(year).players.some(player=>player.real&&player.name===name&&player.birthYear===birthYear),`${year}: ${name}`).toBe(false);
    }
  });
  it('preserves an ordinary name when only a birth year is documented and no dated alias exists',()=>{
    const player=getManagerWorld(2012).players.find(row=>row.name==='Sergio Busquets');
    expect(player).toMatchObject({name:'Sergio Busquets',birthYear:1988,clubId:'barcelona',real:true});
    expect(player.birthDate).toBeUndefined();
  });
  it('retains provenance and exact birth facts separately from estimated game attributes',()=>{
    expect(archive.license).toBe('CC-BY-SA-4.0');
    for(const clubs of Object.values(archive.seasons))for(const record of Object.values(clubs)){
      expect(record.source).toMatch(/^https:\/\/en\.wikipedia\.org\/w\/index\.php\?.*oldid=\d+/);
      expect(record.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(record.attribution).toContain('Contributors');expect(record.licenseUrl).toContain('/by-sa/4.0/');
      for(const player of record.players){
        expect(player.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(player.birthYear).toBe(Number(player.birthDate.slice(0,4)));
        expect(['GK','DF','MF','FW']).toContain(player.position);
      }
    }
    const snapshot=getManagerWorld(2012),imported=snapshot.players.filter(player=>player.source==='wikimedia-season-squad');
    expect(imported.length).toBeGreaterThan(250);
    const sourceOwners=new Map(),ambiguousPages=new Set();
    for(const [clubId,record]of Object.entries(archive.seasons[2012]))for(const player of record.players){
      if(!player.identityPageId)continue;
      const previous=sourceOwners.get(player.identityPageId);
      if(previous&&previous!==clubId)ambiguousPages.add(player.identityPageId);
      sourceOwners.set(player.identityPageId,clubId);
    }
    // A season transfer/loan can put one biography in two lists. Neither list
    // alone proves the club at the initial date, even if its displayed name differs.
    expect(ambiguousPages.size).toBeGreaterThan(0);
    for(const player of imported){
      expect(player).toMatchObject({real:true,sourceLicense:'CC-BY-SA-4.0',membershipPrecision:'season',ratingSource:'club-age-model-estimate'});
      expect(player.membershipVerified).not.toBe(true);expect(player.sourceAttribution).toContain('Contributors');
      expect(ambiguousPages.has(player.identityPageId)).toBe(false);
    }
    const importedPages=imported.map(player=>player.identityPageId).filter(Boolean);
    expect(new Set(importedPages).size).toBe(importedPages.length);
    expect(snapshot.players.find(player=>player.name==='Hélder Postiga')).toMatchObject({clubId:'real-zaragoza',birthDate:'1982-08-02',real:true});
    expect(snapshot.players.filter(player=>player.birthYear===1991&&/^Thiago(?: Alcântara)?$/.test(player.name))).toHaveLength(1);
    expect(snapshot.players.filter(player=>player.birthYear===1981&&/^Joaquín(?: Sánchez)?$/.test(player.name))).toHaveLength(1);
  });
  it('does not overwrite the exact audited Madrid 2013 squad or revive a departed player',()=>{
    const snapshot=getManagerWorld(2013),madrid=snapshot.players.filter(player=>player.clubId==='real-madrid');
    expect(madrid).toHaveLength(23);expect(madrid.every(player=>player.membershipVerified&&player.membershipDate==='2013-09-03')).toBe(true);
    expect(madrid.some(player=>/Bergessio|Ibarra|Özil|Higuaín/.test(player.name))).toBe(false);
    expect(madrid.find(player=>player.name==='Gareth Bale')).toBeTruthy();
    expect(new Set(snapshot.players.map(player=>player.id)).size).toBe(snapshot.players.length);
  });
});
