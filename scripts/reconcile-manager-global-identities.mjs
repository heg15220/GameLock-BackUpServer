/** Apply reviewed aliases to new worlds, preserving saved careers and source rows. */
import fs from 'node:fs/promises';
import { managerCompetitionExtensions } from '../src/games/sports/manager/competitions.js';
import { correctGlobalParticipant } from '../src/games/sports/manager/global-club-aliases.js';
const root = 'src/games/sports/manager';
const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const world = await read('src/games/sports/trayectoria/world.data.json');
const catalog = [...Object.values(world.competitions), ...managerCompetitionExtensions];
const country = new Map(catalog.map(league => [league.id, league.country_fifa_code]));
const changes = [];
const aliasesOnly = process.argv.includes('--aliases-only');
for (const name of ['league-memberships', 'regional-memberships']) {
  const archive = await read(`${root}/${name}.json`);
  for (const [year, leagues] of Object.entries(archive.seasons)) {
    for (const [id, record] of Object.entries(leagues)) {
      if (!aliasesOnly && record.modifications?.startsWith('Names and linked') && !record.validation?.combinedGroups
        && (/\bstream\b|Central (?:East|West)|\b(?:Groupe|Poule)\s+(?!unique\b)\S+/i.test(record.tableContext || '') || /\bU19\b/i.test(record.tableContext || ''))) {
        changes.push({ archive: name, year, league: id, reason: 'Re-import complete senior field instead of a single geographic stream or youth table', previous: record });
        delete leagues[id];
      }
    }
    // The broad Botola category also contains second-division seasons.
    // Preserve those verified participants under their actual division.
    const morocco = leagues['morocco-botola'];
    if (!aliasesOnly && morocco && /Botola 2/i.test(new URL(morocco.source).searchParams.get('title') || '')) {
      const second = leagues['morocco-botola-2'];
      if (second && JSON.stringify(second.teams.map(t=>t.clubId).sort()) !== JSON.stringify(morocco.teams.map(t=>t.clubId).sort())) throw Error(`Conflicting Botola 2 sources: ${year}`);
      leagues['morocco-botola-2'] = second || morocco;
      delete leagues['morocco-botola'];
      changes.push({ archive: name, year, from: 'morocco-botola', to: 'morocco-botola-2', reason: 'Source article explicitly identifies the second division' });
    }
    const seen = new Set();
    for (const [id, record] of Object.entries(leagues)) {
      const aliases = new Map();
      record.teams = record.teams.map(team => {
        const corrected = correctGlobalParticipant(team, country.get(id), Number(year));
        if (corrected.clubId !== team.clubId) { changes.push({ archive: name, year, league: id, from: team.clubId, to: corrected.clubId }); aliases.set(team.clubId, corrected.clubId); }
        if (seen.has(corrected.clubId)) throw Error(`Duplicate ${year}: ${corrected.clubId}`);
        seen.add(corrected.clubId); return corrected;
      });
      for (const stage of record.stages || []) stage.clubIds = stage.clubIds.map(id => aliases.get(id) || id);
    }
  }
  for (const directory of [root, 'public/data/football-manager']) {
    const path = `${directory}/${name}.json`;
    await fs.writeFile(`${path}.tmp`, JSON.stringify(archive) + '\n');
    for (let attempt=0;;attempt++) {
      try { await fs.rename(`${path}.tmp`, path); break; }
      catch (error) { if (!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=9) throw error; await new Promise(resolve=>setTimeout(resolve,250*(attempt+1))); }
    }
  }
}
await fs.writeFile('output/manager-global/identity-corrections.json', JSON.stringify(changes, null, 2));
console.log(`Reviewed ${changes.length} historical identity aliases`);
