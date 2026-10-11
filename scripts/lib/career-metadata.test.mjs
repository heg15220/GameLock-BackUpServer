import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCareerMetadata} from './career-metadata.mjs';
import {isPublishableCareerStint} from '../../src/games/sports/manager/career-affiliation.js';
import {unambiguousCareerClub} from './wiki-career-parser.mjs';
const parsed={valid:true,birthDate:'1977-08-17',stints:[{article:'Arsenal F.C.',from:1999,to:2007},{article:'Arsenal F.C.',from:2012,to:2012,loan:true},{article:'New York Red Bulls',from:2010,to:2014}]};
const resolve=article=>({'Arsenal F.C.':'arsenal','New York Red Bulls':'new-york-rb'}[article]||null);
const observation=(clubId,year,nationality='FRA',season=String(year),birthDate=parsed.birthDate)=>({clubId,year,season,source:`source:${year}`,player:{birthDate,nationality,position:'FW'}});
test('wrong-club namesake cannot poison validated career metadata',()=>{
 const valid=observation('arsenal',2001),wrong=observation('sao-paulo',2024,'BRA');
 const result=validateCareerMetadata(parsed,[valid,wrong],resolve);
 assert.equal(result.valid,true);assert.equal(result.selected,valid);assert.deepEqual(result.excluded,[wrong]);
});
test('a legitimate dual-country discrepancy remains explicit and unresolved',()=>{
 const result=validateCareerMetadata(parsed,[observation('arsenal',2001),observation('arsenal',2002,'ENG')],resolve);
 assert.equal(result.valid,false);assert.equal(result.reason,'conflicting-nationality');assert.equal(result.observations.length,2);
});
test('season-long winter-loan metadata is compatible without implying initial affiliation',()=>{
 const result=validateCareerMetadata(parsed,[observation('arsenal',2011,'FRA','2011/12')],resolve);
 assert.equal(result.valid,true);assert(!('eligibleSeasons' in result));
 assert.equal(validateCareerMetadata(parsed,[observation('arsenal',2011)],resolve).valid,false);
});
test('exact birthday conflicts still quarantine identity and unmatched context is rejected',()=>{
 assert.equal(validateCareerMetadata(parsed,[observation('arsenal',2001),observation('arsenal',2002,'FRA','2002','1978-08-17')],resolve).reason,'conflicting-birth-date');
 assert.equal(validateCareerMetadata(parsed,[observation('sao-paulo',2024)],resolve).reason,'no-career-compatible-metadata');
});
test('unqualified club homonyms cannot validate roster metadata',()=>{
 const ambiguous={...parsed,stints:[{article:'Nacional',from:2000,to:2005}]};
 assert.equal(validateCareerMetadata(ambiguous,[observation('club-nacional',2002)],()=> 'club-nacional').reason,'no-career-compatible-metadata');
});

test('a sole senior loan interval cannot become permanent registration',()=>{
 const loan={index:1,article:'C.S. Emelec',from:2013,to:2015,loan:true};
 const choice=unambiguousCareerClub({valid:true,stints:[loan]},2014,()=> 'emelec');
 assert(choice,'A playing club can be unambiguous without its contract owner being known');
 assert.equal(isPublishableCareerStint(choice.stint,2014),false);
 assert.equal(isPublishableCareerStint({...loan,loan:false},2014),true);
 assert.equal(isPublishableCareerStint({...loan,loan:false},2013),false);
});
