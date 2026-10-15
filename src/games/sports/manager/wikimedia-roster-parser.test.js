import {describe,it,expect} from 'vitest';
import {parseWikiRoster,wikiBirthDate,wikiPlayerBirthDate,wikiPlayerName,wikiPlayerCareerEvidence,wikiPlayerSeniorPeriods,wikiPlayerFootballFacts,splitWikiFields} from './wikimedia-roster-parser.js';
describe('open season squad facts',()=>{
 it('reads Deportivo-style group-position tables and resets at unknown groups and table boundaries',()=>{
  const row=name=>`|1||[[${name}]]||{{birth date|1980|1|1}}||{{flagicon|ESP}}`;
  const text=`==Squad information==\n{|\n!Number\n!Name\n!Date of birth\n!Nationality\n|-\n|colspan="6" bgcolor="#eee"|'''Goalkeepers'''\n|-\n${row('A Keeper')}\n|-\n|colspan="6"|'''Defenders'''\n|-\n${row('A Defender')}\n|-\n|colspan="6"|Unclassified\n|-\n${row('Unknown Role')}\n|}\n{|\n!Number!!Name!!Date of birth!!Nationality\n|-\n${row('Other Table')}\n|}`;
  expect(parseWikiRoster(text)).toMatchObject([{name:'A Keeper',position:'GK'},{name:'A Defender',position:'DF'}]);
 });
 it('keeps nested names and links together, including mononyms and disambiguation',()=>{
  expect(splitWikiFields('x|p={{sortname|Diego|López|Diego López Rodríguez}}|n=25')).toHaveLength(3);
  expect(wikiPlayerName('{{sortname||Pepe|Pepe (footballer, born 1983)}}')).toEqual({name:'Pepe',article:'Pepe (footballer, born 1983)'});
  expect(wikiPlayerName('[[Nacho (footballer, born 1990)|Nacho]]')).toEqual({name:'Nacho',article:'Nacho (footballer, born 1990)'});
  expect(wikiPlayerName('{{sortname|Kevin|Müller|dab=footballer}}')).toEqual({name:'Kevin Müller',article:'Kevin Müller (footballer)'});
 });
 it('reads actual birth dates rather than a career or match date elsewhere',()=>{
  expect(wikiBirthDate('{{Birth date and age|2006|December|15|df=y}}')).toBe('2006-12-15');
  expect(wikiBirthDate('{{Birth date and age|2006|unknown|12|15}}')).toBeNull();
  expect(wikiBirthDate('{{Age|1993|04|25|2013|8|31}}')).toBe('1993-04-25');
  expect(wikiBirthDate('{{birth date and age2|2013|6|30|1981|1|1|df=y}}')).toBe('1981-01-01');
  expect(wikiBirthDate('{{Age|1993|02|31}}')).toBeNull();
  expect(wikiPlayerBirthDate('{{Infobox football biography|birth_date={{birth date and age|df=yes|1990|1|18}}|name=Nacho}}')).toBe('1990-01-18');
  expect(wikiPlayerBirthDate('{{birth date|1980|2|2}} {{Infobox football biography|name=Unknown}}')).toBeNull();
  expect(wikiPlayerBirthDate('{{Infobox football biography|birth_date=17 October 1960}}')).toBe('1960-10-17');
  expect(wikiBirthDate('{{birth-date and age|October 17, 1960}}')).toBe('1960-10-17');
  expect(wikiBirthDate('1/2/1980')).toBeNull();
  expect(wikiBirthDate('Played a match on 17 October 1960')).toBeNull();
 });
 it('does not guess biography identities from plain homonymous names',()=>{
  expect(wikiPlayerName('Thierry Henry')).toBeNull();expect(wikiPlayerName('Patrick Vieira')).toBeNull();
  expect(wikiPlayerName('{{sortname|Thierry|Henry|nolink=y}}')).toBeNull();
  expect(parseWikiRoster('==Squad==\n{{Fs player|name=Thierry Henry|pos=FW|nat=BRA}}\n{{Fs player|name=[[Patrick Vieira (Brazilian footballer)|Patrick Vieira]]|pos=MF|nat=BRA}}')).toMatchObject([{article:'Patrick Vieira (Brazilian footballer)',nationality:'BRA'}]);
  expect(parseWikiRoster('{{fb si player|p=Thierry Henry|pos=FW|ni=BRA}}\n{{Efs player|name=Patrick Vieira|pos=MF|nat=BRA}}')).toEqual([]);
  expect(parseWikiRoster('{{Efs player|name=Thierry Henry|pos=FW|nat=BRA|age={{birth date|2006|1|2}}}}')).toMatchObject([{name:'Thierry Henry',article:null,birthDate:'2006-01-02',nationality:'BRA'}]);
  expect(parseWikiRoster('==Players==\n{|\n!Name!!Position!!Nationality!!Date of birth\n|-\n|Literal Player||MF||BRA||{{birth date|1990|3|4}}\n|}')).toMatchObject([{name:'Literal Player',article:null,birthDate:'1990-03-04'}]);
  expect(parseWikiRoster('{{Football squad player sort|name=Brad|last=Evans|dab=Brad Evans (soccer)|pos=MF|nat=USA}}\n{{Football squad player sort|first=Thierry|last=Henry|nolink=y|pos=FW|nat=BRA}}')).toMatchObject([{name:'Brad Evans',article:'Brad Evans (soccer)'}]);
 });
 it('records fully closed senior careers without depending on former wording',()=>{
  const box='{{Infobox football biography|years1=1994–1999|years2=1999–2014|youthyears1=1989–1994|manageryears1=2018–}}';
  expect(wikiPlayerCareerEvidence(`${box}\nA French former professional footballer.`)).toEqual({allSeniorPeriodsClosed:true,lastSeniorYear:2014});
  expect(wikiPlayerCareerEvidence(`${box}\nA football manager.`)).toEqual({allSeniorPeriodsClosed:true,lastSeniorYear:2014});
  expect(wikiPlayerCareerEvidence('{{Infobox football biography|birth_date={{birth date|1938|3|26}}|years1=1957–1961|years2=1961–1964|years3=1964–1971}}\nHe was a footballer.')).toMatchObject({lastSeniorYear:1971});
  expect(wikiPlayerCareerEvidence('{{Infobox football biography|years1=1994–1999|years2=2024–}}\nA former footballer who returned to playing.')).toBeNull();
 });
 it('preserves later playing returns and veterans rather than extrapolating retirement from age',()=>{
  expect(wikiPlayerCareerEvidence('{{Infobox football biography|years1=1970–1997|years2=2004–2005|years3=2020–2021|manageryears1=1998–2025}}')).toMatchObject({lastSeniorYear:2021});
  expect(wikiPlayerFootballFacts('{{Infobox football biography|birth_date={{birth date|1978|1|28}}|years1=1995–2001|years2=2001–2018|years3=2018–2019|years4=2019–2021|years5=2021–2023}}')).toMatchObject({birthDate:'1978-01-28',careerEvidence:{lastSeniorYear:2023}});
  expect(wikiPlayerCareerEvidence('{{Infobox football biography|years1=1997–2000|years2=2000–2022|years3=2022–}}')).toBeNull();
  expect(wikiPlayerCareerEvidence('{{Infobox football biography|years1=1990–2000|years2=?}}')).toBeNull();
  expect(wikiPlayerCareerEvidence('{{Infobox football biography|years1=2000–1990}}')).toBeNull();
 });
 it('does not let undated clubs certify a veteran season but preserves a documented player-coach return',()=>{
  const undated='{{Infobox football biography|years1=1973–1983|years2=1983–1984|years3=1984–1986|years4=1986–1988|years5=|clubs5=Unknown dates|manageryears1=2000–2025}}';
  expect(wikiPlayerCareerEvidence(undated)).toBeNull();
  expect(wikiPlayerSeniorPeriods(undated).some(p=>p.from<=2006&&(p.to===null||p.to>=2006))).toBe(false);
  const returned='{{Infobox football biography|years1=1981–1991|years2=1991–1998|years3=1998–2002|years4=2003|years5=|clubs5=Undated spell|years6=2007–2008|clubs6=AFC Bournemouth|manageryears1=2006–2008}}';
  expect(wikiPlayerSeniorPeriods(returned).some(p=>p.from<=2007&&(p.to===null||p.to>=2007))).toBe(true);
  expect(wikiPlayerSeniorPeriods('{{Infobox football biography|years1=2022–present}}')).toEqual([{from:2022,to:null}]);
 });
 it('does not borrow birth or identity facts from a homonym in another sport',()=>{
  expect(wikiPlayerFootballFacts('{{Infobox sportsperson|name=Alex Smith|birth_date={{birth date|1990|1|1}}|sport=Cricket}}')).toBeNull();
  expect(wikiPlayerFootballFacts('{{Infobox football biography|name=Alex Smith|birth_date={{birth date|1990|1|1}}}}')).toMatchObject({birthDate:'1990-01-01'});
 });
 it('excludes explicit technical staff while retaining a documented player-coach in the playing squad',()=>{
  const player=(name,extra='')=>`{{Fs player|name=[[${name}]]|pos=GK|nat=ENG${extra}}}`;
  expect(parseWikiRoster(`==Squad==\n${player('Active Veteran','|other=player-coach')}\n===Coaching staff===\n${player('Active Veteran')}\n${player('Recent Retiree')}\n==Playing staff==\n${player('Another Player')}\n${player('Only Coach','|role=Goalkeeping coach')}`)).toMatchObject([{name:'Active Veteran'},{name:'Another Player'}]);
  expect(parseWikiRoster(`==Squad & coaching staff==\n===Current squad===\n${player('Active Veteran')}\n===Coaching staff===\n${player('Only Coach')}`)).toMatchObject([{name:'Active Veteran'}]);
  const grouped=`==Squad==\n{|\n!Name!!Position!!Nationality\n|-\n|[[Active Veteran]]||GK||ENG\n|-\n!colspan="3"|Goalkeeping coach\n|-\n|[[Recent Retiree]]||GK||ENG\n|-\n!colspan="3"|Goalkeepers\n|-\n|[[Another Player]]||GK||ENG\n|}`;
  expect(parseWikiRoster(grouped)).toMatchObject([{name:'Active Veteran'},{name:'Another Player'}]);
  expect(parseWikiRoster(`==Squad==\n{|\n!colspan="3"|Staff\n|-\n${player('Staff Member')}\n|}`)).toEqual([]);
  expect(parseWikiRoster('==Squad==\n{|\n!Name!!Position!!Nationality!!Role\n|-\n|[[Coach Only]]||GK||ENG||Goalkeeping coach\n|-\n|[[Player Coach]]||GK||ENG||Player-coach\n|}')).toMatchObject([{name:'Player Coach'}]);
 });
 it('excludes outgoing loans and requires explicit identity, position and nationality',()=>{
  const text='==Squad==\n{{football squad player|name=[[Test A]]|pos=DF|nat=Spain|no=4}}\n{{football squad player|name=[[Test B]]|nat=Spain}}\n===Out on loan===\n{{football squad player|name=[[Loaned Out]]|pos=MF|nat=ESP}}\n====Second loan====\n{{football squad player|name=[[Loaned Again]]|pos=MF|nat=ESP}}\n==First-team statistics==\n{{fb si player|p={{sortname|Test|C}}|pos=ST|ni=ARG|nb=ESP|age={{Age|1991|1|2}}}}';
  expect(parseWikiRoster(text,{spain:'ESP'})).toMatchObject([{name:'Test A',position:'DF',nationality:'ESP',birthDate:null},{name:'Test C',position:'FW',nationality:'ARG',birthDate:'1991-01-02'}]);
 });
 it('requires an explicit senior squad section when recovering a small fragment',()=>{
  const player=name=>`{{Fs player|name=[[${name}]]|pos=MF|nat=ESP}}`;
  const text=`${player('Unlabelled')}\n==Awards==\n${player('Award Winner')}\n==First-team squad==\n${player('Documented Senior')}\n===Out on loan===\n${player('Away')}\n===Youth squad===\n${player('Youth')}\n==Transfers==\n${player('Arrival')}`;
  expect(parseWikiRoster(text,{}, {requireSquadSection:true})).toMatchObject([{name:'Documented Senior'}]);
  expect(parseWikiRoster(`==Players==\n===Top scorers===\n${player('Scorer')}`,{}, {requireSquadSection:true})).toEqual([]);
  const table='{|\n!Name!!Position!!Nat.\n|-\n|[[Documented Defender]]||DF||ESP\n|}';
  expect(parseWikiRoster(`==Statistics==\n${table}`,{}, {requireSquadSection:true})).toEqual([]);
  expect(parseWikiRoster(`==Players==\n${table}`,{}, {requireSquadSection:true})).toMatchObject([{name:'Documented Defender'}]);
 });
 it('normalizes legacy nationality codes when the source dictionary supplies their equivalence',()=>{
  expect(parseWikiRoster('{{football squad player|name=[[A Player]]|pos=MF|nat=SPA}}',{spa:'ESP'})).toMatchObject([{nationality:'ESP'}]);
 });
 it('reads labelled historical tables, inline flags and nested name templates without taking transfers or scorers',()=>{
  const text='==Squad==\n{| class="wikitable"\n|-\n!rowspan="2"|No.\n! Pos.\n! Name\n! Apps\n|-\n!League\n!Cup\n|-\n|1||GK||align="left"|{{flagicon|ESP}} [[Test Keeper]]\n|20||2\n|-\n|4||DF||{{flagicon|ARG}} {{sortname|Test|Defender|Test Defender (footballer)}}\n|22||1\n|-\n|7||FW||{{flagicon|URU}} [[Outgoing Player]]\n| on loan to [[Other Club]]\n|}\n==Transfers==\n{|\n|-\n!No.!!Pos.!!Name\n|-\n|8||MF||{{flagicon|ENG}} [[Wrong Club Player]]\n|}';
  expect(parseWikiRoster(text)).toMatchObject([{name:'Test Keeper',nationality:'ESP',position:'GK',shirtNumber:1},{name:'Test Defender',article:'Test Defender (footballer)',nationality:'ARG',position:'DF',shirtNumber:4}]);
 });
 it('reads distinct nationality and birth columns and rejects unlabelled match tables',()=>{
  const text='==First-team squad==\n{|\n|-\n! Number !! Position !! Nat. !! Player !! Date of birth\n|-\n| 13 || {{abbr|GK|Goalkeeper}} || {{flag|Spain}} || [[Test Keeper]] || {{birth date|1981|1|1}}\n|}\n==Matches==\n{|\n|-\n! Time !! Home !! Away\n|-\n| GK || {{flagicon|ENG}} [[Not a player]] || 2\n|}';
  expect(parseWikiRoster(text,{spain:'ESP'})).toEqual([{name:'Test Keeper',article:'Test Keeper',birthDate:'1981-01-01',birthYear:1981,nationality:'ESP',position:'GK',shirtNumber:13}]);
 });
 it('never imports reserve teams, generic outgoing-loan sections or transfer templates',()=>{
  const player=name=>`{{Fs player|name=[[${name}]]|pos=MF|nat=FRA}}`;
  expect(parseWikiRoster(`==Squad==\n${player('First Team')}\n===Reserve Team===\n${player('Reserve')}\n===On loan===\n${player('Loan')}\n==Transfers==\n===Summer===\n${player('Former Player')}\n==Statistics==\n${player('Another Senior')}`)).toMatchObject([{name:'First Team'},{name:'Another Senior'}]);
 });
 it('supports explicitly positioned extended-statistics rows and sorted MLS squad names',()=>{
  expect(parseWikiRoster('{{Extended football squad player|no=1|name=[[Jon McLaughlin (footballer)|Jon McLaughlin]]|pos=GK|nat=SCO|46|0}}\n{{Football squad player sort|no=3|nat=USA|pos=MF|first=Brad|last=Evans|dab=Brad Evans (soccer)}}\n{{Efs player3|no=2|nat=GRE|name=[[Unknown Position]]|5|0}}')).toMatchObject([{name:'Jon McLaughlin',position:'GK',nationality:'SCO'},{name:'Brad Evans',article:'Brad Evans (soccer)',position:'MF',nationality:'USA'}]);
 });
 it('accepts explicit position group labels in older squads without leaking across table boundaries',()=>{
  expect(parseWikiRoster('{|\n! colspan="13"|Goalkeepers\n{{Efs player3|name=[[A Keeper]]|nat=GRE|8|0}}\n! colspan="13"|Defenders\n{{Efs player3|name=[[A Defender]]|nat=GRE|8|0}}\n|}\n{{Efs player3|name=[[No Position]]|nat=GRE|8|0}}')).toMatchObject([{name:'A Keeper',position:'GK'},{name:'A Defender',position:'DF'}]);
 });
 it('excludes outgoing loans grouped inside a squad table even when statistics repeat the player',()=>{
  const text='==Players==\n{|\n!No.!!Player!!Position!!Nationality\n|-\n|1||[[Senior Keeper]]||GK||{{flagicon|ENG}}\n|-\n!colspan="4"|Out on loan\n|-\n|2||[[Borrowed Away]]||DF||{{flagicon|ENG}}\n|}\n==Squad statistics==\n{{Efs player|name=[[Borrowed Away]]|pos=DF|nat=ENG}}';
  expect(parseWikiRoster(text)).toMatchObject([{name:'Senior Keeper',position:'GK'}]);
 });
 it('does not inherit a position across an outgoing-loan group of Efs templates',()=>{
  const text='==Squad==\n{|\n! colspan="13"|Goalkeepers\n{{Efs player3|name=[[Senior Keeper]]|nat=ESP}}\n! colspan="13"|Out on loan\n{{Efs player3|name=[[Outgoing Keeper]]|nat=ESP}}\n{{Efs player3|name=[[Outgoing Defender]]|nat=ESP|pos=DF}}\n! colspan="13"|Defenders\n{{Efs player3|name=[[Senior Defender]]|nat=ESP}}\n|}\n==Squad statistics==\n{{Efs player|name=[[Outgoing Keeper]]|nat=ESP|pos=GK}}';
  expect(parseWikiRoster(text)).toMatchObject([{name:'Senior Keeper',position:'GK'},{name:'Senior Defender',position:'DF'}]);
 });
 it('reads date of birth instead of birthplace and enriches an earlier statistics identity',()=>{
  const text='==Players==\n{|\n!Player!!Position!!Nationality!!Place of birth!!Date of birth (age)\n|-\n|[[A Keeper]]||GK||{{flagicon|ARG}}||[[A City]]||{{birth date and age2|2013|6|30|1981|1|1}}\n|}\n==Squad statistics==\n{{Efs player|name=[[A Keeper]]|pos=GK|nat=ARG}}';
  expect(parseWikiRoster(text)).toMatchObject([{name:'A Keeper',birthDate:'1981-01-01',birthYear:1981}]);
 });
 it('reads abbreviated sortable headers and excludes outgoing groups expressed as data cells',()=>{
  const text='==Players==\n{|\n!{{ abbr |No.|Squad number}}!!Player!!{{abbr|Nat|Nationality}}!!{{abbr|Pos|Position}}!!Age\n|-\n|1||{{sortname|Kevin|Müller|dab=footballer}}||{{flagicon|GER}}||{{sort|1|GK}}||{{age|1991|3|15|2025|7|1}}\n|-class="sortbottom"\n|colspan="5"|Out on loan\n|-\n|2||[[Outgoing]]||{{flagicon|GER}}||DF||{{age|1991|1|1}}\n|}';
  expect(parseWikiRoster(text)).toEqual([{name:'Kevin Müller',article:'Kevin Müller (footballer)',birthDate:'1991-03-15',birthYear:1991,nationality:'GER',position:'GK',shirtNumber:1}]);
 });
});
