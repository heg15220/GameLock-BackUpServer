#!/usr/bin/env node
/** Fill current-season participant gaps with dated, attributed season tables. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { managerCompetitionExtensions } from '../src/games/sports/manager/competitions.js';
import { createMembershipClubResolver } from '../src/games/sports/manager/membership-providers.js';
import { normalizeClubName } from '../src/games/sports/manager/providers.js';
import { parseWikiMembershipTables, selectWikiParticipants } from './lib/wiki-membership-parser.mjs';
import { fetchWikimedia } from './manager-wikimedia-rate-limit.mjs';
import { latestSeasonYear } from './lib/manager-season-range.mjs';

const year = Number(process.argv.find(arg => arg.startsWith('--year='))?.slice(7) || latestSeasonYear());
if (!Number.isInteger(year) || year < 1990 || year > latestSeasonYear()) throw Error('Invalid season');
const offline = process.argv.includes('--offline');
const requestedLeagues = process.argv.find(arg => arg.startsWith('--leagues='))?.slice(10).split(',');
const root = 'src/games/sports/manager';
const read = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const archive = await read(`${root}/league-memberships.json`);
const regional = await read(`${root}/regional-memberships.json`);
const world = await read('src/games/sports/trayectoria/world.data.json');
const ratings = await read(`${root}/historical-results.json`);
const resolveClub = createMembershipClubResolver(world, ratings);
const leagues = [...Object.values(world.competitions), ...managerCompetitionExtensions];
const split = `${year}–${String(year + 1).slice(-2)}`;
const titles = {
  laliga: `${split} La Liga`, 'premier-league': `${split} Premier League`, bundesliga: `${split} Bundesliga`,
  'serie-a': `${split} Serie A`, 'ligue-1': `${split} Ligue 1`, championship: `${split} EFL Championship`,
  eredivisie: `${split} Eredivisie`, 'por-primeira-liga': `${split} Primeira Liga`, brasileirao: `${year} Campeonato Brasileiro Série A`,
  'liga-mx': `${split} Liga MX season`, '2-bundesliga': `${split} 2. Bundesliga`,
  'laliga-2': `${split} Segunda División`, 'liga-profesional': `${year} Argentine Primera División`,
  'ligue-2': `${split} Ligue 2`, 'serie-b': `${split} Serie B`,
  'copa-de-primera': `${year} Copa de Primera`, 'liga-dimayor': `${year} Categoría Primera A season`,
  'primera-division-costa-rica': `Torneo Apertura ${year} (Costa Rica)`,
  'hon-liga-nacional': `Torneo Apertura ${year} (Honduras)`,
  'liga-nacional-guatemala': `Torneo Apertura ${year} (Guatemala)`,
  'slv-primera-division': `${split} Primera División de El Salvador`,
  'liga-dominicana-de-futbol': `Liga Dominicana de Fútbol ${year}-${String(year + 1).slice(-2)}`,
  'ligapro-serie-a': `${year} LigaPro Serie A`, 'usa-mls': `${year} Major League Soccer season`,
  'superliga-turquia': `${split} Süper Lig`, 'liga-premier-de-rusia': `${split} Russian Premier League`,
  ekstraklasa: `${split} Ekstraklasa`, 'england-league-one': `${split} EFL League One`,
  'england-league-two': `${split} EFL League Two`, 'germany-3-liga': `${split} 3. Liga`,
  'austria-bundesliga': `${split} Austrian Football Bundesliga`, 'austria-2-liga': `${split} Austrian Football Second League`,
  'belgium-first-division': `${split} Belgian Pro League`, 'greece-super-league': `${split} Super League Greece`,
  'scotland-premiership': `${split} Scottish Premiership`, 'switzerland-super-league': `${split} Swiss Super League`,
  'brasileirao-serie-b': `${year} Campeonato Brasileiro Série B`, 'japan-j1': `${split} J1 League`,
  'china-super-league': `${year} Chinese Super League`, 'australia-a-league': `${split} A-League Men`,
  'algeria-ligue-1': `${split} Algerian Ligue Professionnelle 1`, 'egypt-premier-league': `${split} Egyptian Premier League`,
  'morocco-botola': `${split} Botola Pro`,
};
const cache = 'output/manager-2026/memberships';
await fs.mkdir(cache, { recursive: true });
const hash = value => createHash('sha256').update(value).digest('hex');
const clubAliases = {
  ARG: { 'Racing Club de Avellaneda': 'racing-club', 'Racing de Córdoba': 'racing-cordoba', 'Estudiantes de Río Cuarto': 'estudiantes-de-rio-cuarto' },
  AUT: { 'Austria Wien II': 'austria-wien-ii', 'FK Austria Wien II': 'austria-wien-ii', 'SK Sturm Graz II': 'sturm-graz-ii', 'Sturm Graz II': 'sturm-graz-ii' },
};
const missing = [], accepted = [];
for (const league of leagues) {
  if (requestedLeagues && !requestedLeagues.includes(league.id)) continue;
  const existing = archive.seasons[year]?.[league.id];
  // Recheck this supplement on reruns. CC0 records retain priority; their linked
  // season-table club articles can still fill roster-discovery gaps.
  const previous = archive.seasons[year - 1]?.[league.id];
  let title = titles[league.id], language = ['primera-division-costa-rica', 'hon-liga-nacional', 'liga-nacional-guatemala', 'liga-dominicana-de-futbol'].includes(league.id) ? 'es' : 'en';
  if (!title && previous?.source.includes('wikipedia.org')) {
    const url = new URL(previous.source);
    language = url.hostname.split('.')[0];
    title = url.searchParams.get('title')?.replace(new RegExp(`${year - 1}[–-]${String(year).slice(-2)}`), split).replace(new RegExp(`\\b${year - 1}\\b`, 'g'), String(year));
  }
  if (!title) { missing.push({ id: league.id, reason: 'no-season-title' }); continue; }
  const url = `https://${language}.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'parse', page: title, prop: 'text|revid', redirects: '1', format: 'json' })}`;
  let response;
  try {
    const path = `${cache}/${hash(url)}.json`;
    try { response = await read(path); } catch (error) {
      if (error.code !== 'ENOENT' || offline) throw error;
      const result = await fetchWikimedia(url);
      if (!result.ok) throw Error(`HTTP ${result.status}`);
      const text = await result.text();
      response = { url, text, sha256: hash(text), fetchedAt: new Date().toISOString() };
      await fs.writeFile(path, JSON.stringify(response));
    }
    const payload = JSON.parse(response.text), page = payload.parse;
    if (!page?.text?.['*'] || !page.revid || Number(/\b(\d{4})\b/.exec(page.title)?.[1]) !== year) throw Error(payload.error?.code || 'season-mismatch');
    if (/women|femenin|reserve|relegation|promotion/i.test(page.title)) throw Error('wrong-competition');
    const selected = selectWikiParticipants(parseWikiMembershipTables(page.text['*']), { maxTeams: league.id === 'primera-nacional' ? 48 : 32 });
    if (!selected.valid) { missing.push({ id: league.id, title, ...selected }); continue; }
    // Reuse linked identities within the country before resolving new entrants.
    const known = new Map();
    for (const seasons of Object.values(archive.seasons)) for (const [id, record] of Object.entries(seasons)) {
      if (leagues.find(item => item.id === id)?.country_fifa_code !== league.country_fifa_code) continue;
      for (const team of record.teams) for (const name of [team.article, team.name].filter(Boolean)) {
        const key = normalizeClubName(name);
        if (!known.has(key)) known.set(key, new Set());
        known.get(key).add(team.clubId);
      }
    }
    const teams = selected.teams.map(team => {
      const explicit = clubAliases[league.country_fifa_code]?.[team.article] || clubAliases[league.country_fifa_code]?.[team.name];
      const linked = known.get(normalizeClubName(team.article)), named = known.get(normalizeClubName(team.name));
      const ids = linked?.size === 1 ? linked : named?.size === 1 ? named : null;
      return { ...team, clubId: explicit || (ids ? [...ids][0] : resolveClub(team.article, league.country_fifa_code, league.id)) };
    });
    if (new Set(teams.map(team => team.clubId)).size !== teams.length) throw Error('duplicate-club');
    const others = new Set(Object.entries(archive.seasons[year] || {}).filter(([id]) => id !== league.id).flatMap(([,record]) => record.teams.map(team => team.clubId)));
    if (teams.some(team => others.has(team.clubId))) throw Error(`club-in-another-league: ${teams.filter(team => others.has(team.clubId)).map(team => `${team.name} (${team.clubId})`).join(', ')}`);
    const isSplit = new RegExp(`${year}[–-]${String(year + 1).slice(-2)}`).test(page.title) || /Apertura|Invierno/.test(page.title);
    const source = `https://${language}.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&oldid=${page.revid}`;
    const record = {
      season: isSplit ? `${year}-${String(year + 1).slice(-2)}` : String(year),
      sourceId: 'wikimedia-regional-seasons', source, revision: String(page.revid), sha256: response.sha256,
      license: 'CC-BY-SA-4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: `Contributors to ${language}.wikipedia.org: ${page.title}`,
      historyUrl: `https://${language}.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&action=history`,
      teams, tableContext: selected.tableContext, validation: selected.validation,
      edition: /Apertura|Clausura|Invierno|Verano/i.exec(page.title)?.[0] || null,
    };
    if (existing?.license === 'CC0-1.0') {
      for (const team of existing.teams) {
        const match = teams.find(candidate => candidate.clubId === team.clubId || normalizeClubName(candidate.name) === normalizeClubName(team.name));
        if (match) { team.article = match.article; team.articleSource = source; }
      }
    } else {
      (regional.seasons[year] ||= {})[league.id] = record;
      (archive.seasons[year] ||= {})[league.id] = record;
    }
    accepted.push({ id: league.id, clubs: teams.length, source });
    console.log(`${league.id}: ${teams.length} participants`);
  } catch (error) { missing.push({ id: league.id, title, reason: error.message }); }
}
regional.revision = `${year}-current-participants-v1`;
archive.range.last = Math.max(...Object.keys(archive.seasons).map(Number));
archive.coverage = leagues.map(league => ({ competitionId: league.id, years: Object.keys(archive.seasons).filter(y => archive.seasons[y][league.id]).map(Number) }));
for (const [name, value] of [['regional-memberships.json', regional], ['league-memberships.json', archive]]) {
  for (const directory of [root, 'public/data/football-manager']) {
    const path = `${directory}/${name}`;
    await fs.writeFile(`${path}.tmp`, JSON.stringify(value) + '\n');
    await fs.rename(`${path}.tmp`, path);
  }
}
await fs.writeFile(`${cache}/report.json`, JSON.stringify({ year, accepted, missing }, null, 2));
console.log(JSON.stringify({ added: accepted.length, available: Object.keys(archive.seasons[year] || {}).length, missing }, null, 2));
