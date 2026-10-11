import {describe,it,expect} from 'vitest';
import {getManagerWorld,getManagerSnapshotDate} from './data.js';
import {createManagerCareer} from './engine.js';
import {careerSeeds} from './rosters.js';
import {editorialRosters} from './editorial-rosters.js';

const squad=(world,clubId)=>world.players.filter(player=>player.clubId===clubId);
const named=(world,name)=>world.players.find(player=>player.name===name);

describe('independently checked initial historical squads',()=>{
  it('retains documented veterans beyond the old 43-year import cutoff',()=>{
    // Fábio is imported, so this exercises the import guard rather than a seed.
    const world=getManagerWorld(2025);
    expect(named(world,'Fábio')).toMatchObject({real:true,clubId:'fluminense',birthDate:'1980-09-30',age:44,source:'wikimedia-season-squad'});
    // Buffon's editorial seed intentionally documents only the birth year.
    expect(named(getManagerWorld(2022),'Gianluigi Buffon')).toMatchObject({real:true,clubId:'parma',birthYear:1978,age:44});
  });

  it('keeps Deportivo birth and identity evidence individual and separate from its shared squad source',()=>{
    const evidence=editorialRosters[2011]['deportivo-la-coruna'];
    const world=getManagerWorld(2011),players=squad(world,'deportivo-la-coruna');
    expect(Object.keys(evidence.playerEvidence)).toHaveLength(25);
    expect(new Set(players.map(player=>player.identityPageId)).size).toBe(25);
    for(const player of players){
      const identity=evidence.playerEvidence[player.name];
      expect(identity).toBeDefined();
      expect(player.birthDate).toBe(identity.birthDate);
      expect(player.identityPageId).toBe(identity.identityPageId);
      expect(player.identityWiki).toBe('en');
      expect(world.players.filter(other=>other.identityPageId===player.identityPageId)).toHaveLength(1);
      expect(Number.isInteger(player.identityPageId)).toBe(true);
      expect(player.identitySourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/w\/index\.php\?oldid=\d+$/);
      expect(player.sourceUrl).toContain('oldid=49439402');
      expect(player.sourceLicense).toBe('CC-BY-SA-4.0');
      expect(player.sourceAttribution).toContain('Colaboradores de Wikipedia');
      expect(player.attributionUrl).toContain('action=history');
    }
  });

  it('starts Deportivo 2011 with the dated September squad, not generated substitutes or summer departures',()=>{
    const world=getManagerWorld(2011),players=squad(world,'deportivo-la-coruna');
    expect(getManagerSnapshotDate(2011)).toBe('2011-09-01');
    expect(world.clubs.find(club=>club.id==='deportivo-la-coruna').competitionId).toBe('laliga-2');
    expect(players).toHaveLength(25);
    expect(players.every(player=>player.real&&player.membershipVerified&&player.membershipPrecision==='exact-snapshot'
      &&player.membershipDate==='2011-09-01'&&player.initialClubId==='deportivo-la-coruna')).toBe(true);
    expect(new Set(players.map(player=>player.id)).size).toBe(25);
    expect(players.filter(player=>player.position==='GK')).toHaveLength(2);
    expect(players.map(player=>player.name)).toEqual(expect.arrayContaining(['Daniel Aranzubia','Juan Carlos Valerón',
      'Andrés Guardado','Bruno Gama','Lassad Nouioui','Riki','Xisco','Borja Fernández','Diogo Salomão',
      'David Rochela','Juan Domínguez','Diego Seoane']));
    for(const name of ['Adrián López','Albert Lopo','Juan Rodríguez','Rubén Pérez','Iván Pérez','José Sand','Javito',
      'Pizzi','Nélson Oliveira','Sílvio','Paulo Assunção','Marc Martínez','Juan Carlos Real'])
      expect(players.some(player=>player.name===name)).toBe(false);
    expect(players.find(player=>player.name==='Álex Bergantiños')).toMatchObject({birthDate:'1985-06-07',age:26});
    expect(players.find(player=>player.name==='Andrés Guardado')).toMatchObject({birthDate:'1986-09-28',age:24,nationality:'MEX'});
    expect(players.find(player=>player.name==='Rodolfo Bodipo').nationality).toBe('EQG');
    expect(world.clubs.find(club=>club.id==='deportivo-la-coruna').rosterCoverage).toMatchObject({complete:true,
      realPlayers:25,generatedPlayers:0,precision:'exact-snapshot',snapshotDate:'2011-09-01'});
    const evidence=editorialRosters[2011]['deportivo-la-coruna'];
    expect(evidence.sourceLicense).toBe('CC-BY-SA-4.0');
    expect(evidence.sourceAttribution).toContain('49439402');
    expect(evidence.sources).toEqual(expect.arrayContaining([expect.stringContaining('oldid=49439402'),
      expect.stringContaining('action=history'),'https://www.rcdeportivo.es/es/protagonistas-plantillas-historicas']));
    expect(players.every(player=>player.ratingSource==='editorial-estimate')).toBe(true);
    const career=createManagerCareer({year:2011,clubId:'deportivo-la-coruna',seed:'deportivo-2011-cut'});
    expect(career.lineup).toHaveLength(11);
    expect(career.lineup.every(id=>career.world.players.find(player=>player.id===id)?.real)).toBe(true);
  });

  it('reconstructs Madrid after the 2013 deadline without fabricated affiliations or fillers',()=>{
    const world=getManagerWorld(2013),players=squad(world,'real-madrid');
    expect(world.coverage).toMatchObject({snapshotDate:'2013-09-03',archiveRevision:'2026-10-10-participants-v2-rosters-v12'});
    expect(players).toHaveLength(23);
    expect(players.every(player=>player.real&&player.membershipVerified&&player.initialClubId==='real-madrid')).toBe(true);
    for(const name of ['Gareth Bale','Dani Carvajal','Isco','Xabi Alonso','Asier Illarramendi','Casemiro'])expect(players.some(player=>player.name===name)).toBe(true);
    for(const name of ['Gonzalo Bergessio','Renato Ibarra','Gonzalo Higuaín','Mesut Özil','Kaká','Antonio Adán'])expect(players.some(player=>player.name===name)).toBe(false);
    expect(named(world,'Marcelo')).toMatchObject({nationality:'BRA',birthDate:'1988-05-12',source:'curated-verified',membershipPrecision:'exact-snapshot',membershipDate:'2013-09-03'});
    expect(named(world,'Pepe').birthYear).toBe(1983);
    expect(named(world,'Gareth Bale').rating).toBeGreaterThan(named(world,'Álvaro Morata').rating);
    expect(named(world,'Mesut Özil')).toMatchObject({clubId:'arsenal',membershipDate:'2013-09-03'});
    expect(named(world,'Kaká')).toMatchObject({clubId:'ac-milan',membershipDate:'2013-09-03'});
    expect(named(world,'Gonzalo Higuaín').clubId).toBe('napoli');
    expect(named(world,'José Callejón').clubId).toBe('napoli');
    expect(named(world,'Raúl Albiol').clubId).toBe('napoli');
    expect(named(world,'Karim Benzema').age).toBe(25);
    expect(named(world,'Luka Modrić').age).toBe(27);
    expect(world.clubs.find(club=>club.id==='real-madrid').rosterCoverage).toMatchObject({complete:true,realPlayers:23,generatedPlayers:0,precision:'exact-snapshot',snapshotDate:'2013-09-03'});
    const career=createManagerCareer({year:2013,clubId:'real-madrid',seed:1314});
    const xi=career.lineup.map(id=>career.world.players.find(player=>player.id===id));
    expect(xi.every(player=>player.real)).toBe(true);
    expect(xi.map(player=>player.name)).toEqual(expect.arrayContaining(['Cristiano Ronaldo','Karim Benzema','Gareth Bale','Luka Modrić','Xabi Alonso','Sergio Ramos','Marcelo']));
  });

  it('keeps the 2013 Barcelona and Bayern senior squads real and respects their summer moves',()=>{
    const world=getManagerWorld(2013);
    for(const clubId of ['barcelona','bayern-munchen']){
      const players=squad(world,clubId);
      expect(players).toHaveLength(25);
      expect(players.every(player=>player.real&&player.membershipPrecision==='exact-snapshot')).toBe(true);
      expect(new Set(players.map(player=>player.id)).size).toBe(25);
    }
    expect(named(world,'Neymar').clubId).toBe('barcelona');
    expect(named(world,'Thiago Alcântara').clubId).toBe('bayern-munchen');
    expect(named(world,'Mario Götze').clubId).toBe('bayern-munchen');
    expect(named(world,'Robert Lewandowski').clubId).toBe('borussia-dortmund');
    expect(named(world,'Sergi Roberto')).toMatchObject({age:21,potential:84});
    expect(named(world,'Pierre-Emile Højbjerg')).toMatchObject({age:18,rating:65,potential:84});
  });

  it('keeps the 2009 Madrid generation separate from 2013',()=>{
    const world=getManagerWorld(2009),players=squad(world,'real-madrid');
    expect(getManagerSnapshotDate(2009)).toBe('2009-09-01');
    expect(players).toHaveLength(24);
    expect(players.every(player=>player.real)).toBe(true);
    expect(players.map(player=>player.name)).toEqual(expect.arrayContaining(['Raúl González','Kaká','Cristiano Ronaldo','Ruud van Nistelrooy','Xabi Alonso']));
    expect(players.map(player=>player.name)).not.toEqual(expect.arrayContaining(['Gareth Bale','Isco']));
    expect(named(world,'Arjen Robben').clubId).toBe('bayern-munchen');
    expect(world.coverage.snapshotDate).toBe('2009-09-01');
  });

  it('does not put late or winter transfers in a club before the initial cutoff',()=>{
    const early=getManagerWorld(1992),later=getManagerWorld(2019);
    expect(named(early,'Eric Cantona')).toMatchObject({clubId:'leeds',membershipDate:'1992-09-01'});
    expect(squad(early,'sevilla').some(player=>player.name==='Diego Maradona')).toBe(false);
    expect(named(later,'Erling Haaland')).toMatchObject({clubId:'rb-salzburg',age:19,membershipDate:'2019-09-01'});
    expect(named(getManagerWorld(2020),'Erling Haaland').clubId).toBe('borussia-dortmund');
  });

  it('separates season evidence from an exact cut and always preserves the initial real club',()=>{
    const world=getManagerWorld(2012);
    expect(named(world,'Lionel Messi')).toMatchObject({source:'curated-verified',membershipPrecision:'season',membershipSeason:'2012/13',initialClubId:'barcelona'});
    expect(named(world,'Lionel Messi').membershipDate).toBeUndefined();
    expect(named(world,'Gonzalo Bergessio')).toMatchObject({clubId:'catania',initialClubId:'catania',membershipPrecision:'season'});
    for(const player of world.players.filter(player=>player.real))expect(player.initialClubId).toBe(player.clubId);
    const refreshed=getManagerWorld(2013);
    named(refreshed,'Gareth Bale').clubId='barcelona';
    expect(named(refreshed,'Gareth Bale').initialClubId).toBe('real-madrid');
    expect(named(getManagerWorld(2013),'Gareth Bale').clubId).toBe('real-madrid');
  });

  it('rejects known post-cutoff career assignments while retaining explicitly whole-season records',()=>{
    expect(named(getManagerWorld(2020),'Luis Suárez')).toMatchObject({clubId:'barcelona',membershipPrecision:'exact-snapshot',membershipDate:'2020-09-01'});
    expect(named(getManagerWorld(2021),'Luis Suárez').clubId).toBe('atletico-madrid');
    const ramosSeed=careerSeeds.find(row=>row[0]==='Sergio Ramos');
    expect(ramosSeed[6].some(([from,to])=>from<=2023&&to>=2023)).toBe(false);
    const ramos=named(getManagerWorld(2023),'Sergio Ramos');
    // Full-season OpenFootball may contain his September arrival, but must not
    // claim an independently verified affiliation on the initial date.
    if(ramos){
      expect(ramos).toMatchObject({clubId:'sevilla',source:'openfootball-squad',membershipPrecision:'season'});
      expect(ramos.membershipDate).toBeUndefined();
      expect(ramos.membershipVerified).not.toBe(true);
    }
    expect(named(getManagerWorld(2014),'Ronaldinho')).toBeUndefined();
    expect(named(getManagerWorld(1993),'Diego Maradona')).toBeUndefined();
  });
});
