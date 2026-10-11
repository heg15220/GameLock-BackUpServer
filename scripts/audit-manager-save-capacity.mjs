import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { build } from 'esbuild';

// 2019 has the most documented players in the v12 playable archive. Exercise
// the whole season, when player statistics make the self-contained save grow.
const bundle=await build({stdin:{contents:"export {createManagerCareer,managerReducer,serializeManagerCareer,restoreManagerCareer} from './src/games/sports/manager/engine.js';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const engine=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
let career=engine.createManagerCareer({year:2019,clubId:'barcelona',seed:'v12-save-capacity'});
const checks=[];
function check(label){
  const save=engine.serializeManagerCareer(career),utf16Bytes=save.length*2;
  assert.ok(utf16Bytes<5*1024*1024,`${label}: ${utf16Bytes} bytes exceeds the browser save budget`);
  const restored=engine.restoreManagerCareer(save);
  // JSON intentionally omits optional undefined properties, such as a missing
  // shirt number. Compare the persisted facts without printing the full world.
  for(const [field,actual,expected] of [['players',restored.world.players,career.world.players],['finances',restored.finances,career.finances],['statistics',restored.playerStats,career.playerStats]]){
    assert.ok(isDeepStrictEqual(actual,JSON.parse(JSON.stringify(expected))),`${label}: restored ${field} differ`);
  }
  checks.push({label,utf16Bytes,round:career.round,phase:career.phase,players:career.world.players.length});
}
check('initial');
let advances=0;
while(career.phase!=='complete'&&advances++<100){career=engine.managerReducer(career,{type:'PLAY_MATCH',mode:'quick'});assert.equal(career.lastError,null);}
assert.equal(career.phase,'complete');
check('complete-season');
await fs.writeFile('output/manager-v12/save-capacity.json',JSON.stringify({year:2019,checks},null,2)+'\n');
console.log(JSON.stringify({year:2019,checks}));
