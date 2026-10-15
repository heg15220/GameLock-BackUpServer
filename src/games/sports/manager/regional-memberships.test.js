import {describe,it,expect} from 'vitest';
import {parseWikiMembershipTables,selectWikiParticipants} from '../../../../scripts/lib/wiki-membership-parser.mjs';

const teams=(count,prefix='Club')=>Array.from({length:count},(_,i)=>({name:`${prefix} ${i}`,article:`${prefix} ${i}`}));
const table=(count,context,kind='standings',prefix='Club')=>({context,kind,teams:teams(count,prefix)});
const htmlTable=(count,heading='Regular season')=>`<h2>${heading}</h2><table class="wikitable"><tr><th>Pos</th><th>Team</th><th>Pts</th></tr>${teams(count).map((team,i)=>`<tr><td>${i+1}</td><td><a href="/wiki/${team.article.replaceAll(' ','_')}">${team.name}</a><sup>1</sup></td><td>12</td></tr>`).join('')}</table>`;

describe('attributed regional participant extraction',()=>{
  it('keeps team columns aligned across shared stadiums and excludes attendance totals',()=>{
    const html='<h2>Teams</h2><table><tr><th>Team</th><th>Stadium</th><th>City</th></tr>'+
      Array.from({length:4},(_,i)=>`<tr><td><a href="/wiki/Club_${i*2}">Club ${i*2}</a></td><td rowspan="2">Shared ground</td><td>City</td></tr><tr><td><a href="/wiki/Club_${i*2+1}">Club ${i*2+1}</a></td><td><a href="/wiki/City">City</a></td></tr>`).join('')+'</table>';
    const selected=selectWikiParticipants(parseWikiMembershipTables(html));
    expect(selected.teams).toHaveLength(8);
    expect(selected.teams.map(team=>team.article)).not.toContain('City');
    const attendance=htmlTable(8,'Attendance').replace('</table>','<tr><td>9</td><td>League total</td><td>100</td></tr></table>');
    expect(parseWikiMembershipTables(attendance).tables).toEqual([]);
  });
  it('excludes season details navigation without discarding grouped or numeric clubs',()=>{
    const html=htmlTable(12,'Teams').replace('>Club 0</a>','>LDU Quito</a> (<a href="/wiki/2011_LDU_Quito_season">details</a>)')
      .replace('/wiki/Club_0','/wiki/LDU_Quito').replaceAll('Club_1"','1899_Hoffenheim"').replace('>Club 1</a>','>1899 Hoffenheim</a>');
    const selected=selectWikiParticipants(parseWikiMembershipTables(html));
    expect(selected.teams).toHaveLength(12);
    expect(selected.teams.map(team=>team.article)).toContain('1899 Hoffenheim');
    expect(selected.teams.map(team=>team.article)).not.toContain('2011 LDU Quito season');
    const grouped=html.replace('>LDU Quito</a>','>LDU Quito</a><br><a href="/wiki/LDU_Loja">LDU Loja</a>');
    expect(selectWikiParticipants(parseWikiMembershipTables(grouped)).teams).toHaveLength(13);
  });
  it('reads only a complete labelled table and keeps linked identities',()=>{
    const selected=selectWikiParticipants(parseWikiMembershipTables(htmlTable(12)));
    expect(selected.valid).toBe(true);expect(selected.teams).toEqual(teams(12));
    expect(selectWikiParticipants(parseWikiMembershipTables(htmlTable(12).replace('class="wikitable"',''))).teams).toEqual(teams(12));
  });
  it('requires the participant count stated by the source',()=>{
    const parsed=parseWikiMembershipTables('<table class="infobox"><tr><th>Teams</th><td>12</td></tr></table>'+htmlTable(10));
    expect(parsed.expectedCount).toBe(12);expect(selectWikiParticipants(parsed).valid).toBe(false);
  });
  it('retains a declared French participant count instead of accepting a truncated list',()=>{
    const parsed=parseWikiMembershipTables(htmlTable(12,'Les 12 clubs participants').replace('>Team<','>Club<'));
    expect(parsed.expectedCount).toBe(12);expect(selectWikiParticipants(parsed).teams).toHaveLength(12);
    expect(selectWikiParticipants(parseWikiMembershipTables(htmlTable(10,'Les 12 clubs participants'))).valid).toBe(false);
  });
  it('does not read top scorers or the final six as the entire league',()=>{
    expect(parseWikiMembershipTables(htmlTable(12,'Top scorers')).tables).toEqual([]);
    expect(parseWikiMembershipTables(htmlTable(6,'Liguilla')).tables).toEqual([]);
    expect(parseWikiMembershipTables(htmlTable(14,'Championship Group')).tables).toEqual([]);
    expect(parseWikiMembershipTables('<h2>Teams</h2>'+htmlTable(19,'Managerial changes')).tables).toEqual([]);
    expect(parseWikiMembershipTables('<h2>Equipos participantes</h2>'+htmlTable(8,'Relevos')).tables).toEqual([]);
  });
  it('retains newly created clubs whose article is a red link',()=>{
    const html=htmlTable(8).replace('/wiki/Club_0','/w/index.php?title=Club_0&action=edit&redlink=1');
    expect(selectWikiParticipants(parseWikiMembershipTables(html)).teams[0]).toEqual({name:'Club 0',article:'Club 0'});
  });
  it('keeps a complete stadium list with a coach column, excluding appointment histories',()=>{
    const geography=htmlTable(8,'Teams').replace('>Pts<','>City / Stadium / Manager<');
    expect(selectWikiParticipants(parseWikiMembershipTables(geography)).teams).toHaveLength(8);
    expect(parseWikiMembershipTables(geography.replace('>City / Stadium / Manager<','>City / Outgoing manager / Replaced by<')).tables).toEqual([]);
  });
  it('reads old team headers after removing their navigation controls',()=>{
    const spanish=htmlTable(10,'Clasificación').replace('>Team<','>Equipos de fútbol<');
    const navigation=htmlTable(12).replace('>Team<','>Team<div class="navbar">vte</div><');
    expect(selectWikiParticipants(parseWikiMembershipTables(spanish)).teams).toHaveLength(10);
    expect(selectWikiParticipants(parseWikiMembershipTables(navigation)).teams).toHaveLength(12);
  });
  it('uses explicit group captions and keeps the two Argentine geographic zones complete',()=>{
    const first=htmlTable(6,'Invierno 2008').replace('<tr>','<caption>Group A</caption><tr>');
    const second=htmlTable(6,'Invierno 2008').replaceAll('Club','Other').replace('<tr>','<caption>Group B</caption><tr>');
    expect(selectWikiParticipants(parseWikiMembershipTables(first+second)).teams).toHaveLength(12);
    const groups=[table(16,'Interior Zone Standings','standings','Interior'),table(18,'Metropolitana Zone Standings','standings','Metropolitana')];
    expect(selectWikiParticipants({tables:groups},{maxTeams:48}).teams).toHaveLength(34);
    expect(selectWikiParticipants({tables:[groups[0]]},{maxTeams:48}).valid).toBe(false);
  });
  it('recovers a misnested explicit standings section without accepting personnel tables',()=>{
    const html='<h2>Apertura</h2><h2>Managerial changes</h2>'+htmlTable(10,'Standings').replace('<h2>Standings</h2>','<h3>Standings</h3>');
    const selected=selectWikiParticipants(parseWikiMembershipTables(html));
    expect(selected.teams).toHaveLength(10);expect(selected.tableContext).toBe('Apertura / Standings');
    expect(parseWikiMembershipTables(html.replace('>Pts<','>Manager<')).tables).toEqual([]);
    const salvador='<h2>Ascenso y descenso</h2>'+htmlTable(10,'Tabla de posiciones').replace('<h2>Tabla de posiciones</h2>','<h3>Tabla de posiciones</h3>');
    expect(selectWikiParticipants(parseWikiMembershipTables(salvador)).teams).toHaveLength(10);
    expect(parseWikiMembershipTables(htmlTable(10,'Relegation / Standings')).tables).toEqual([]);
  });
  it('prefers the full regular field to a stale stadium table',()=>{
    const selected=selectWikiParticipants({tables:[table(10,'Teams','participants'),table(11,'Apertura / Regular season')]},{preferredStage:'Apertura'});
    expect(selected.teams).toHaveLength(11);expect(selected.tableContext).toContain('Apertura');
  });
  it('keeps Apertura and Clausura separate instead of unioning seasonal replacements',()=>{
    const selected=selectWikiParticipants({tables:[table(12,'Apertura'),table(12,'Clausura','standings','Other')]},{preferredStage:'Clausura'});
    expect(selected.teams).toEqual(teams(12,'Other'));expect(selected.stages).toHaveLength(2);
  });
  it('joins complementary conferences from the same phase, never a lone conference',()=>{
    const east=table(6,'Clausura / Conferencia Este','standings','East'),west=table(6,'Clausura / Conferencia Oeste','standings','West');
    expect(selectWikiParticipants({tables:[east]}).valid).toBe(false);
    expect(selectWikiParticipants({tables:[table(12,'Regional I / Zona Metropolitana')]}).valid).toBe(false);
    const selected=selectWikiParticipants({tables:[east,west],expectedCount:12});
    expect(selected.teams).toHaveLength(12);expect(selected.validation.combinedGroups).toHaveLength(2);
    expect(selectWikiParticipants({tables:[east,{...west,context:'Apertura / Conferencia Oeste'}]}).valid).toBe(false);
  });
  it('refuses repeated identities across complementary groups',()=>{
    expect(selectWikiParticipants({tables:[table(6,'Regular / Group A'),table(6,'Regular / Group B')]}).valid).toBe(false);
  });
});
