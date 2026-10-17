#!/usr/bin/env node
/** Add only missing league-seasons, from versioned labelled tables. Resumable. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { globalLeagueSources, globalFrenchSeasonPrefixes, globalMembershipOptions, groupedLeagueIds, globalLeagueSeasonName } from '../src/games/sports/manager/global-leagues.js';
import { managerCompetitionExtensions } from '../src/games/sports/manager/competitions.js';
import { createMembershipClubResolver } from '../src/games/sports/manager/membership-providers.js';
import { normalizeClubName } from '../src/games/sports/manager/providers.js';
import { parseWikiMembershipTables, selectWikiParticipants } from './lib/wiki-membership-parser.mjs';
import { fetchWikimedia } from './manager-wikimedia-rate-limit.mjs';
import { correctGlobalParticipant } from '../src/games/sports/manager/global-club-aliases.js';
import { resolveSpanishClub, reserveParentName, spanishIdentityName } from '../src/games/sports/manager/spanish-clubs.js';

const root = 'src/games/sports/manager', cache = 'output/manager-global/memberships';
await fs.mkdir(cache, { recursive: true });
const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const archive = await read(`${root}/league-memberships.json`), regional = await read(`${root}/regional-memberships.json`);
// Recover a run interrupted between the two archive replacements.
for (const [year, leagues] of Object.entries(archive.seasons)) for (const [id, record] of Object.entries(leagues)) {
  if (record.modifications?.startsWith('Names and linked club identities from complete labelled season tables.')) (regional.seasons[year] ||= {})[id] = record;
}
const world = await read('src/games/sports/trayectoria/world.data.json');
const resolveClub = createMembershipClubResolver(world, await read(`${root}/historical-results.json`));
const catalog = [...Object.values(world.competitions), ...managerCompetitionExtensions];
const countryFor = new Map(catalog.map(league => [league.id, league.country_fifa_code]));
const filter = process.argv.find(arg => arg.startsWith('--leagues='))?.slice(10).split(',');
const offline = process.argv.includes('--offline');
const report = { accepted: [], missing: [], discovered: [], checkedAt: new Date().toISOString() };
const hash = text => createHash('sha256').update(text).digest('hex');
async function query(params, language = 'en') {
  const url = `https://${language}.wikipedia.org/w/api.php?${new URLSearchParams({ ...params, format: 'json', maxlag: '5' })}`;
  const path = `${cache}/${hash(url)}.json`;
  try { return await read(path); } catch (error) { if (error.code !== 'ENOENT' || offline) throw error; }
  const response = await fetchWikimedia(url);
  if (!response.ok) throw Error(`HTTP ${response.status}`);
  const text = await response.text(), record = { url, sha256: hash(text), fetchedAt: new Date().toISOString(), text };
  const data = JSON.parse(text);
  if (data.error && data.error.code !== 'missingtitle') throw Error(data.error.code);
  await fs.writeFile(path, JSON.stringify(record));
  return record;
}
async function publish() {
  archive.coverage = catalog.map(league => ({ competitionId: league.id, years: Object.keys(archive.seasons).filter(year => archive.seasons[year][league.id]).map(Number) }));
  archive.revision = '2026-10-16-global-participants-v4';
  regional.revision = '2026-10-16-global-participants-v4';
  for (const [name, value] of [['league-memberships', archive], ['regional-memberships', regional]]) {
    for (const directory of [root, 'public/data/football-manager']) {
      const path = `${directory}/${name}.json`;
      await fs.writeFile(`${path}.tmp`, JSON.stringify(value) + '\n');
      for (let attempt = 0; ; attempt++) {
        try { await fs.rename(`${path}.tmp`, path); break; }
        catch (error) { if (!['EPERM', 'EBUSY', 'EACCES'].includes(error.code) || attempt >= 9) throw error; await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1))); }
      }
    }
  }
  await fs.writeFile(`${cache}/report.json`, JSON.stringify(report, null, 2));
}
for (const league of globalLeagueSources.filter(item => !filter || filter.includes(item.id))) {
  const candidates = new Map();
  const languages = new Map();
  // AFA retained all 24 top-flight clubs in the exceptional 2020 tournament.
  // Keep the edition explicit instead of presenting a cancelled league as played.
  if (league.id === 'liga-profesional') candidates.set('2020 Copa de la Liga Profesional', 2020);
  for (const category of league.categories) {
    try {
      let continuation = {};
      do {
        const response = await query({ action: 'query', list: 'categorymembers', cmtitle: `Category:${category}`, cmnamespace: '0', cmlimit: '500', ...continuation });
        const payload = JSON.parse(response.text);
        for (const item of payload.query?.categorymembers || []) {
          const year = Number(/^(\d{4})\b/.exec(item.title)?.[1]);
          const otherDivision = (league.id === 'morocco-botola' && /Botola 2/i.test(item.title))
            || (league.id === 'morocco-botola-2' && !/Botola 2/i.test(item.title))
            || (league.id === 'korea-k1' && /K League (?:2|Challenge)/i.test(item.title))
            || (league.id === 'japan-j1' && /J2|J3/i.test(item.title));
          if (year >= 1990 && year <= 2026 && !otherDivision && !/women|femenin|play.off|finals|statistics|all.star/i.test(item.title)) candidates.set(item.title, year);
        }
        continuation = payload.continue;
      } while (continuation);
    } catch (error) { report.missing.push({ league: league.id, category, reason: error.message }); }
  }
  const frenchPrefix = globalFrenchSeasonPrefixes[league.id];
  if (frenchPrefix) {
    let continuation = {};
    do {
      const response = await query({ action: 'query', list: 'allpages', apprefix: frenchPrefix, apnamespace: '0', aplimit: '500', ...continuation }, 'fr');
      const payload = JSON.parse(response.text);
      for (const page of payload.query?.allpages || []) {
        const suffix = page.title.slice(frenchPrefix.length), match = /^(\d{4})(?:[–-]\d{2,4})?$/.exec(suffix);
        if (!match || Number(match[1]) < 1990 || Number(match[1]) > 2026) continue;
        candidates.set(page.title, Number(match[1])); languages.set(page.title, 'fr');
      }
      continuation = payload.continue;
    } while (continuation);
  }
  report.discovered.push({ league: league.id, articles: candidates.size });
  console.log(`${league.id}: ${candidates.size} season articles`);
  const known = new Map();
  function remember(team) {
    for (const name of [team.article, team.name].filter(Boolean)) {
      const key = normalizeClubName(name);
      if (!known.has(key)) known.set(key, new Set());
      known.get(key).add(team.clubId);
    }
  }
  for (const entries of Object.values(archive.seasons)) for (const [id, record] of Object.entries(entries)) if (countryFor.get(id) === league.country_fifa_code) record.teams.forEach(remember);
  // Split seasons take precedence over transition tournaments in the same year.
  const ordered = [...candidates].sort(([a, ay], [b, by]) => by - ay || Number(/^\d{4}[–-]/.test(b)) - Number(/^\d{4}[–-]/.test(a)) || a.localeCompare(b));
  for (const [title, year] of ordered) {
    if (archive.seasons[year]?.[league.id]) continue;
    try {
      const language = languages.get(title) || 'en';
      const response = await query({ action: 'parse', page: title, prop: 'text|revid', redirects: '1' }, language);
      const payload = JSON.parse(response.text), page = payload.parse;
      const pageYear = language === 'fr' ? /(\d{4})(?:[–-]\d{2,4})?$/.exec(page?.title)?.[1] : /^(\d{4})\b/.exec(page?.title)?.[1];
      if (!page?.revid || !page.text?.['*'] || Number(pageYear) !== year) throw Error(payload.error?.code || 'wrong-season');
      const parsed = parseWikiMembershipTables(page.text['*']);
      const selected = selectWikiParticipants(parsed, globalMembershipOptions(league.id, year));
      if (!selected.valid) { report.missing.push({ league: league.id, year, title, ...selected }); continue; }
      const translated = new Map();
      if (language !== 'en') {
        const translation = JSON.parse((await query({ action: 'query', titles: selected.teams.map(team => team.article).join('|'), redirects: '1', prop: 'langlinks', lllang: 'en', lllimit: '500' }, language)).text);
        const aliases = new Map([...(translation.query?.normalized || []), ...(translation.query?.redirects || [])].map(row => [row.from, row.to]));
        for (const team of selected.teams) {
          let canonical = team.article; const seen = new Set();
          while (aliases.has(canonical) && !seen.has(canonical)) { seen.add(canonical); canonical = aliases.get(canonical); }
          const page = Object.values(translation.query?.pages || {}).find(page => page.title === canonical);
          const english = page?.langlinks?.find(link => link.lang === 'en')?.['*'];
          translated.set(team.article, english ? { ...team, article: english, originalArticle: team.article, originalWiki: language } : { ...team, articleWiki: language });
        }
      }
      // Grouped Spanish third tier: strict identities, reserve sides kept apart.
      let spanish = null;
      if (league.country_fifa_code === 'ESP') {
        spanish = new Map();
        const add = (id, name) => { if (!id || !name) return; if (!spanish.has(id)) spanish.set(id, new Set()); spanish.get(id).add(name); };
        for (const club of Object.values(world.clubs)) if (countryFor.get(club.competitionId) === 'ESP') add(club.id, club.name);
        for (const entries of Object.values(archive.seasons)) for (const [id, record] of Object.entries(entries)) if (countryFor.get(id) === 'ESP') for (const team of record.teams) { if (!team.article) add(team.clubId, team.name); add(team.clubId, team.identityName ?? team.article); }
      }
      const foreignIds = new Set(Object.values(world.clubs).filter(club => countryFor.get(club.competitionId) !== league.country_fifa_code).map(club => club.id));
      // Exact names claim their identity first, so "FC Andorra" keeps its club and
      // "Andorra CF" cannot take it by a looser token match.
      const used = new Set();
      const resolvedSpanish = new Map();
      if (spanish) for (const exactPass of [true, false]) for (const original of selected.teams) {
        const team = translated.get(original.article) || original;
        if (resolvedSpanish.has(team)) continue;
        const name = spanishIdentityName(team);
        const clubId = resolveSpanishClub(name, spanish, foreignIds, used);
        const isExact = [...(spanish.get(clubId) || [])].some(known => normalizeClubName(known) === normalizeClubName(name));
        if (exactPass && !isExact) continue;
        used.add(clubId);
        const parentName = reserveParentName(name);
        const parent = parentName ? resolveSpanishClub(parentName, spanish, foreignIds) : null;
        resolvedSpanish.set(team, { ...team, identityName: name, clubId, ...(parent && spanish.has(parent) && parent !== clubId ? { reserveOf: parent } : {}) });
      }
      const teams = selected.teams.map(original => {
        const team = translated.get(original.article) || original;
        if (spanish) return resolvedSpanish.get(team);
        const linked = known.get(normalizeClubName(team.article));
        // A linked identity wins; ambiguous shortened labels never merge two clubs.
        let clubId = linked?.size === 1 ? [...linked][0] : resolveClub(team.article, league.country_fifa_code, league.id);
        if (world.clubs[clubId] && countryFor.get(world.clubs[clubId].competitionId) !== league.country_fifa_code) clubId = `${league.country_fifa_code.toLowerCase()}-${clubId}`;
        return correctGlobalParticipant({ ...team, clubId }, league.country_fifa_code, year);
      });
      if (new Set(teams.map(team => team.clubId)).size !== teams.length) throw Error('duplicate-club-identity');
      const others = new Set(Object.entries(archive.seasons[year] || {}).filter(([id]) => id !== league.id).flatMap(([,record]) => record.teams.map(team => team.clubId)));
      if (teams.some(team => others.has(team.clubId))) throw Error(`club-in-another-league:${teams.filter(team => others.has(team.clubId)).map(team => team.clubId).join(',')}`);
      const split = new RegExp(`${year}[–-](?:${year + 1}|${String(year + 1).slice(-2)})\\b`).test(page.title);
      const source = `https://${language}.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${page.revid}`;
      const record = { season: split ? `${year}-${String(year + 1).slice(-2)}` : String(year), sourceId: 'wikimedia-regional-seasons', source,
        revision: String(page.revid), sha256: response.sha256, license: 'CC-BY-SA-4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
        attribution: `Contributors to ${language}.wikipedia.org: ${page.title}`, historyUrl: `https://${language}.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&action=history`,
        teams, tableContext: selected.tableContext, validation: selected.validation,
        modifications: 'Names and linked club identities from complete labelled season tables. Does not establish complete player squads.',
        stages: selected.stages.map(stage => ({ name: stage.name, clubIds: stage.teams.map(team => teams.find(t => t.article === team.article || t.originalArticle === team.article)?.clubId).filter(Boolean) })) };
      if (league.id === 'liga-profesional' && year === 2020) {
        record.edition = 'Copa de la Liga Profesional · torneo extraordinario';
        record.validation.formatEvidence = 'https://www.afa.com.ar/upload/NewFolder/NewFolder/NewFolder/5803%20-%20Reglamento%20Copa%20LPF%202020.pdf';
        if (teams.length !== 24) throw Error('expected-24-top-flight-clubs');
      }
      if (/Transition League/i.test(page.title)) record.edition = 'Torneo de transición';
      if (groupedLeagueIds.has(league.id)) {
        if (!selected.groups?.length) throw Error('expected-regional-groups');
        record.groups = selected.groups.map(group => ({ name: `Grupo ${group.label.toUpperCase()}`, sourceContext: group.name,
          clubIds: group.teams.map(team => teams.find(t => t.article === team.article || t.originalArticle === team.article)?.clubId).filter(Boolean) }));
        if (record.groups.reduce((sum, group) => sum + group.clubIds.length, 0) !== teams.length) throw Error('incomplete-regional-groups');
      }
      const seasonName = globalLeagueSeasonName(league.id, year);
      if (seasonName) record.leagueName = seasonName;
      (archive.seasons[year] ||= {})[league.id] = record;
      (regional.seasons[year] ||= {})[league.id] = record;
      teams.forEach(remember);
      report.accepted.push({ league: league.id, year, clubs: teams.length, source });
      console.log(`  ${year}: ${teams.length} clubs`);
      if (report.accepted.length % 20 === 0) await publish();
    } catch (error) { report.missing.push({ league: league.id, year, title, reason: error.message }); }
  }
  await publish();
}
console.log(JSON.stringify({ accepted: report.accepted.length, missing: report.missing.length }));
