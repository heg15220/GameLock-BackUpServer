import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWikiSeniorCareer,unambiguousCareerClub} from './wiki-career-parser.mjs';
const source=rows=>`{{Infobox football biography|birth_date={{birth date and age|1980|3|1}}|position=[[Midfielder]]|${rows}}}`;
const resolveClub=article=>({'Club A':'a','Club B':'b'}[article]||null);
test('only strict interior years of closed senior careers qualify',()=>{
  const p=parseWikiSeniorCareer(source('years1=2000–2005|clubs1=[[Club A]]|years2=2005–2010|clubs2=[[Club B]]'));
  assert.equal(p.valid,true);assert.equal(unambiguousCareerClub(p,2003,resolveClub).clubId,'a');
  for(const y of [2000,2005,2010])assert.equal(unambiguousCareerClub(p,y,resolveClub),null);
});
test('loan overlap and its boundary years block parent registration',()=>{
  const p=parseWikiSeniorCareer(source('years1=2000–2010|clubs1=[[Club A]]|years2=2003–2005|clubs2=→ [[Club B]] (loan)'));
  for(const y of [2003,2004,2005])assert.equal(unambiguousCareerClub(p,y,resolveClub),null);
  assert.equal(unambiguousCareerClub(p,2006,resolveClub).clubId,'a');
});
test('unknown and unlinked senior clubs block overlap even outside catalogue',()=>{
  const p=parseWikiSeniorCareer(source('years1=2000–2010|clubs1=[[Club A]]|years2=2004–2006|clubs2=Unlinked reserve team'));
  assert.equal(p.valid,true);assert.equal(unambiguousCareerClub(p,2005,resolveClub),null);
  assert.equal(unambiguousCareerClub(p,2007,resolveClub).clubId,'a');
});
test('national youth and managerial careers do not create senior membership',()=>{
  const p=parseWikiSeniorCareer(source('years1=2000–2010|clubs1=[[Club A]]|nationalyears1=2000–2010|nationalteam1=[[Country]]|youthyears1=2000–2010|youthclubs1=[[Other]]|manageryears1=2000–2010|managerclubs1=[[Club B]]'));
  assert.equal(p.stints.length,1);assert.equal(unambiguousCareerClub(p,2005,resolveClub).clubId,'a');
});
test('open career is not extrapolated, and unresolved date quarantines biography',()=>{
  const p=parseWikiSeniorCareer(source('years1=2000–|clubs1=[[Club A]]'));
  assert.equal(unambiguousCareerClub(p,2020,resolveClub),null);
  assert.equal(parseWikiSeniorCareer(source('years1=?–2010|clubs1=[[Club A]]')).valid,false);
});
test('single-year and same-year loan spells block the whole uncertain year',()=>{
  const p=parseWikiSeniorCareer(source('years1=2000–2010|clubs1=[[Club A]]|years2=2005|clubs2=[[Club B]]'));
  assert.equal(unambiguousCareerClub(p,2005,resolveClub),null);
});
test('current club and unqualified birth dates are never used as evidence',()=>{
  assert.equal(parseWikiSeniorCareer(source('currentclub=[[Club A]]')).valid,false);
  assert.equal(parseWikiSeniorCareer(source('years1=2000–2010|clubs1=[[Club A]]').replace('birth_date=','other_date=')).valid,false);
});
