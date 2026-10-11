import {describe,it,expect} from 'vitest';
import {explicitRosterSeason,multilingualBirthDate,multilingualBiography,parseMultilingualRoster} from './multilingual-roster-parser.js';
import {verifiedMultilingualBirthCorrection,verifiedMultilingualSourceExclusion} from './multilingual-roster-corrections.js';

const row=(name='[[Luis García (futbolista)|Luis García]]',birthday='{{edad|4|2|1990}}')=>`{{Jugador de fútbol|no='''1'''|nat=España|pos=POR|name=${name}|edad=${birthday}}}`;
const roster=(heading='Plantilla 2012/13',rows=row(),options='')=>`=== ${heading} ===\n{{Equipo de fútbol inicio${options}}}\n${rows}\n{{Equipo de fútbol fin}}`;
const parse=text=>parseMultilingualRoster(text,{espana:'ESP'});
describe('multilingual historical roster grammar',()=>{
 it('reads an explicit squad season and Spanish day/month/year',()=>{
  const [result]=parse(roster());expect(result.year).toBe(2012);expect(result.season).toBe('2012/13');
  expect(result.players[0]).toMatchObject({name:'Luis García',article:'Luis García (futbolista)',birthDate:'1990-02-04',nationality:'ESP',position:'GK',shirtNumber:1});
 });
 it('never infers a season from an edit or unrelated history',()=>{
  expect(parse('== Fundación 2012 ==\n'+roster('Jugadores'))).toEqual([]);
 });
 it('accepts template season but rejects a contradictory heading year',()=>{
  expect(parse(roster('Jugadores',row(),'|temporada=2025'))[0].year).toBe(2025);
  expect(parse(roster('Plantilla 2024',row(),'|temporada=2025'))).toEqual([]);
 });
 it('rejects nonsequential multi-year intervals',()=>{
  expect(explicitRosterSeason('Plantilla 2012-2015')).toBeNull();
  expect(explicitRosterSeason('Plantilla Apertura 2025')).toMatchObject({year:2025});
 });
 it('removes commented rows, imagery and captain decorations',()=>{
  const [result]=parse(roster('Plantilla 2025',`<!--${row('Otro jugador')}-->`+row('[[Luis García]] {{Capitán|12px}}')));
  expect(result.players).toHaveLength(1);expect(result.players[0].name).toBe('Luis García');
 });
 it('quarantines duplicate names with contradictory dates',()=>{
  const [result]=parse(roster('Plantilla 2025',row()+row(undefined,'{{edad|4|2|1991}}')));
  expect(result.players).toEqual([]);expect(result.conflictingIdentities).toHaveLength(1);
 });
 it('does not import reserves, women, outgoing loans or external identities',()=>{
  for(const heading of ['Plantilla femenina 2025','Jugadores cedidos 2025','Plantilla del filial 2025'])expect(parse(roster(heading))).toEqual([]);
  expect(parse(roster('Plantilla 2025',row('[https://commercial.example/profile Luis García]')))[0].players).toEqual([]);
 });
 it('requires a closed roster and never absorbs the coaching staff',()=>{
  expect(parse('=== Plantilla 2025 ===\n{{Equipo de fútbol inicio}}'+row())).toEqual([]);
  expect(parse(roster()+'\n'+row('Entrenador fuera de tabla'))[0].players).toHaveLength(1);
 });
 it('validates dates and does not turn integer age into a birth date',()=>{
  expect(multilingualBirthDate('{{edad|29|2|2000}}')).toBe('2000-02-29');
  expect(multilingualBirthDate('{{edad|29|2|2001}}')).toBeNull();
  expect(multilingualBirthDate('25')).toBeNull();
  expect(multilingualBirthDate('{{fecha|23|10|1982|edad}}')).toBe('1982-10-23');
 });
 it('scopes biography births to football infobox fields and rejects other sports',()=>{
  expect(multilingualBiography('{{Ficha de deportista|deporte=[[Fútbol]]|nombre=Miguel|fecha nacimiento={{fecha|23|10|1982|edad}}}}')).toMatchObject({birthDate:'1982-10-23'});
  expect(multilingualBiography('{{Ficha de deportista|deporte=[[Béisbol]]|fecha nacimiento={{edad|27|7|1975}}}}')).toBeNull();
  expect(multilingualBiography('{{Ficha de deportista|deporte=[[Fútbol]]}} {{edad|1|1|1980}}').birthDate).toBeNull();
 });
 it('fails closed on unsupported language date grammars',()=>{
  expect(parseMultilingualRoster(roster(),{espana:'ESP'},'pt')).toEqual([]);
  expect(multilingualBirthDate('{{edad|4|2|1990}}','pt')).toBeNull();
 });
 it('accepts explicit football biography introductions without accepting a relative or another sport',()=>{
  expect(multilingualBiography("'''Pablo Vázquez Pérez''' ([[Gandía]], [[Valencia]]; 7 de octubre de 1994) es un futbolista que juega como defensa.")).toMatchObject({birthDate:'1994-10-07'});
  expect(multilingualBiography("{{Ficha de deportista|deporte=|fecha nacimiento={{fecha|17|8|1998}}}}\n'''Iván Martínez''' es un futbolista español.")).toMatchObject({birthDate:'1998-08-17'});
  expect(multilingualBiography("'''Juan Pérez''' es un actor. Su hermano es un futbolista.")).toBeNull();
  expect(multilingualBiography("{{Ficha de deportista|deporte=Béisbol}}\n'''Juan Pérez''' es un futbolista.")).toBeNull();
 });
 it('accepts a season article title without using an arbitrary page year',()=>{
  const title='Anexo:Temporada 2019-20 del Real Club Celta de Vigo';
  expect(parseMultilingualRoster(roster('Jugadores'),{espana:'ESP'},'es',{pageTitle:title})[0].year).toBe(2019);
  expect(parseMultilingualRoster(roster('Plantilla 2025'),{espana:'ESP'},'es',{pageTitle:title})).toEqual([]);
  expect(parseMultilingualRoster(roster('Jugadores'),{espana:'ESP'},'es',{pageTitle:'Real Club Celta de Vigo 2019'})).toEqual([]);
 });
 it('reads a dated manual squad table with labelled football position icons',()=>{
  const table='=== Plantilla Apertura 2012 ===\n{| class="wikitable"\n!No.\n!Nombre\n!Nacionalidad\n!Posición\n!Edad\n|-\n|1\n|[[Luis García]]\n|{{Bandera|España}}\n|[[Archivo:Ficha portero.jpg|30px]]\n|{{edad|4|2|1990}}\n|}';
  expect(parse(table)[0].players[0]).toMatchObject({name:'Luis García',birthDate:'1990-02-04',position:'GK',nationality:'ESP'});
  expect(parse(table.replace('Plantilla Apertura 2012','Goleadores 2012'))).toEqual([]);
  expect(parse(table.replace('!Nombre','!Equipo'))).toEqual([]);
  expect(parse(table.replace('=== Plantilla Apertura 2012 ===','=== Plantilla Apertura 2012 ===\n==== Bajas ==== '))).toEqual([]);
 });
 it('distinguishes literal names from an explicit biography link',()=>{
  expect(parse(roster('Plantilla 2025',row('Thierry Henry','')))[0].players[0]).toMatchObject({linkedIdentity:false,birthDate:null});
  expect(parse(roster('Plantilla 2025',row('Thierry Henry','{{edad|1|1|2000}}')))[0].players[0]).toMatchObject({linkedIdentity:false,birthDate:'2000-01-01'});
  expect(parse(roster('Plantilla 2025',row('[[Thierry Henry (futbolista brasileño)|Thierry Henry]]','')))[0].players[0]).toMatchObject({linkedIdentity:true,article:'Thierry Henry (futbolista brasileño)'});
 });
 it('reads the documented con esquema variant with its explicit season',()=>{
  const source='=== Plantilla ===\n{{Equipo de fútbol inicio con esquema|temporada=2024/25}}'+row().replace('Jugador de fútbol','Jugador de fútbol con esquema')+'{{Equipo de fútbol fin con esquema|entrenador=[[Otro nombre]]}}';
  expect(parse(source)[0]).toMatchObject({year:2024,season:'2024/25'});
  expect(parse(source)[0].players).toHaveLength(1);
  expect(parse(source.replace('|temporada=2024/25',''))).toEqual([]);
 });
 it('excludes loan-out rows and sections inside a squad table',()=>{
  const outgoing=row('[[Otro jugador]]').replace('|edad=','|nota={{Cedido|OUT}}|edad=');
  expect(parse(roster('Plantilla 2024/25',row()+outgoing))[0].players).toHaveLength(1);
  expect(parse(roster('Plantilla 2024/25',row()+'{{Cesiones equipo de fútbol}}'+row('[[Otro jugador]]')))[0].players).toHaveLength(1);
  expect(parse(roster('Plantilla 2024/25',row()+"\n| colspan=10 | '''Jugadores del filial'''\n"+row('[[Otro jugador]]')))[0].players).toHaveLength(1);
 });
 it('excludes Millonarios youth-team and unregistered groups but keeps a senior row with an age-category note',()=>{
  const senior=row('[[Jugador del primer equipo]]').replace('|edad=','|nota=Categoría sub-20|edad=');
  const source=roster('Plantilla 2024-II',senior+"\n| colspan=14 | '''Jugadores con contrato profesional en equipo sub-20'''\n"+row('[[Jugador del sub-20]]')+"\n| colspan=14 | '''Jugadores sin inscribir ante Dimayor'''\n"+row('[[Jugador no inscrito]]'));
  expect(parse(source)[0].players.map(p=>p.article)).toEqual(['Jugador del primer equipo']);
 });
 it('corrects only the documented Dani Barcia source row and preserves official evidence',()=>{
  const context={clubId:'deportivo-la-coruna',year:2024,sourceRevision:'162190034',article:'Daniel Barcia Rama',identityWiki:'es',identityPageId:10835156,wikidataId:'Q116760254',rowBirthDate:'2003-01-17',biographyBirthDate:'2003-01-19'};
  const correction=verifiedMultilingualBirthCorrection(context);
  expect(correction).toMatchObject({from:'2003-01-17',to:'2003-01-19',identityPageId:10835156,sourceRevision:'162190034'});
  expect(correction.sources).toHaveLength(2);expect(correction.sources.every(url=>url.startsWith('https://www.rcdeportivo.es/'))).toBe(true);
 });
 it('never turns a documented correction into a general birth-conflict override',()=>{
  const context={clubId:'deportivo-la-coruna',year:2024,sourceRevision:'162190034',article:'Daniel Barcia Rama',identityWiki:'es',identityPageId:10835156,wikidataId:'Q116760254',rowBirthDate:'2003-01-17',biographyBirthDate:'2003-01-19'};
  for(const [key,value]of Object.entries(context))expect(verifiedMultilingualBirthCorrection({...context,[key]:typeof value==='number'?value+1:`${value}-different`})).toBeNull();
  expect(verifiedMultilingualBirthCorrection({...context,biographyBirthDate:null})).toBeNull();
 });
 it('quarantines only the documented stale Bolívar source without assigning it to 2012',()=>{
  const context={clubId:'bolivar',year:2011,sourceRevision:'59216527'};
  expect(verifiedMultilingualSourceExclusion(context)).toMatchObject({id:'bolivar-2011-stale-season-heading',declaredSeason:'2011/12'});
  expect(verifiedMultilingualSourceExclusion(context).sources).toHaveLength(2);
  expect(verifiedMultilingualSourceExclusion({...context,year:2012})).toBeNull();
  expect(verifiedMultilingualSourceExclusion({...context,sourceRevision:'59216528'})).toBeNull();
 });
});
