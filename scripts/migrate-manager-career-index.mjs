#!/usr/bin/env node
// Certify cache reuse after unrelated squad-parser functions change. This is
// not an override: the old full hash and all imported primitives must match.
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const previousPath=process.argv.find(arg=>arg.startsWith('--previous-parser='))?.slice('--previous-parser='.length);
if(!previousPath)throw Error('Provide the exact previous roster parser via --previous-parser=path');
const directory='output/manager-v12/careers',indexPath=`${directory}/parsed-biographies-index.json`;
const [oldRoster,currentRoster,career,indexText]=await Promise.all([
  previousPath,'src/games/sports/manager/wikimedia-roster-parser.js','scripts/lib/wiki-career-parser.mjs',indexPath,
].map(path=>fs.readFile(path,'utf8')));
const index=JSON.parse(indexText),hash=text=>createHash('sha256').update(text).digest('hex');
assert.equal(hash(career+oldRoster),index.parserFingerprint,'Prior complete source must reproduce the index fingerprint');
const primitives=source=>{
  const boundary=source.indexOf('export function wikiPlayerBirthDate');
  assert(boundary>=0,'Shared dependency boundary must exist');
  const slice=source.slice(0,boundary);
  for(const name of ['splitWikiFields','wikiTemplates','wikiBirthDate'])assert(slice.includes(`export function ${name}`));
  assert(slice.includes('const clean ='));
  return slice;
};
assert.equal(primitives(oldRoster),primitives(currentRoster),'An imported parsing primitive changed; full reparse required');
index.dependencyFingerprint=hash(career+primitives(currentRoster));
await fs.writeFile(`${indexPath}.tmp`,JSON.stringify(index)+'\n');await fs.rename(`${indexPath}.tmp`,indexPath);
const certificate={oldFullFingerprint:index.parserFingerprint,currentFullFingerprint:hash(career+currentRoster),dependencyFingerprint:index.dependencyFingerprint,previousPath,unchangedImportedPrimitives:true};
await fs.writeFile(`${directory}/index-dependency-migration.json`,JSON.stringify(certificate,null,2)+'\n');
console.log(JSON.stringify(certificate,null,2));
