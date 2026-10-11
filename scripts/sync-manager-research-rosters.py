"""Import dated match-sheet evidence from the CC BY 4.0 Pappalardo dataset.

No events, ratings, currentTeamId or national-team lineups are imported.
Run: python scripts/sync-manager-research-rosters.py [--offline]
"""
import datetime, hashlib, io, json, pathlib, re, sys, urllib.request, zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / 'output/manager-v9/wyscout-cache'
CACHE.mkdir(parents=True, exist_ok=True)
BASE = ROOT / 'src/games/sports/manager'
OFFLINE = '--offline' in sys.argv
CUTOFF = '2017-09-01'
LICENSE = 'https://creativecommons.org/licenses/by/4.0/'
ATTRIBUTION = 'Luca Pappalardo, Paolo Cintia, Alessio Rossi, Emanuele Massucco, Paolo Ferragina, Dino Pedreschi and Fosca Giannotti (2019). Wyscout data. Structured adaptation by GameLock.'

def read(path):
    return json.loads(path.read_text(encoding='utf-8'))

def download(url, path):
    if not path.exists():
        if OFFLINE:
            raise RuntimeError('Missing cached file: ' + str(path))
        with urllib.request.urlopen(url, timeout=60) as response:
            path.write_bytes(response.read())
    return path.read_bytes()

sources = []
payloads = {}
for article, filename in [(7765196, 'players.json'), (7765310, 'teams.json'), (7770422, 'matches.zip')]:
    metadata = json.loads(download(f'https://api.figshare.com/v2/articles/{article}', CACHE / f'{article}.json'))
    if metadata['license']['url'].rstrip('/') != LICENSE.rstrip('/'):
        raise RuntimeError('Unexpected license')
    file = next(f for f in metadata['files'] if f['name'] == filename)
    payload = download(file['download_url'], CACHE / filename)
    if hashlib.md5(payload).hexdigest() != file['computed_md5']:
        raise RuntimeError('Checksum mismatch: ' + filename)
    sources.append(dict(articleId=article, file=filename, url=metadata['url'], downloadUrl=file['download_url'],
                        version=metadata['version'], sha256=hashlib.sha256(payload).hexdigest(), license='CC-BY-4.0', licenseUrl=LICENSE))
    payloads[filename] = payload

memberships = read(BASE / 'league-memberships.json')['seasons']['2017']
world = read(ROOT / 'src/games/sports/trayectoria/world.data.json')
countries = {c['iso2']: c['fifa'] for c in world['countries'].values()}
special = {'XEN': 'ENG', 'XWA': 'WAL', 'XSC': 'SCO', 'XNI': 'NIR', 'XKO': 'KVX'}
players = {p['wyId']: p for p in json.loads(payloads['players.json'])}
all_teams = {t['wyId']: t for t in json.loads(payloads['teams.json'])}
teams = {key: t for key, t in all_teams.items() if t['type'] == 'club'}
leagues = {'England': 'premier-league', 'France': 'ligue-1', 'Spain': 'laliga', 'Italy': 'serie-a', 'Germany': 'bundesliga'}
# Explicit crosswalk to the documented domestic participants; never fuzzy-match clubs.
club_ids = {
    1613:'newcastle',1673:'huddersfield-town',1659:'bournemouth',1651:'brighton',1646:'burnley',1631:'leicester-city',1633:'west-ham',1639:'stoke-city',1644:'watford',1623:'everton',1627:'west-brom',1625:'manchester-city',1624:'tottenham',1628:'crystal-palace',1619:'southampton',1612:'liverpool',1610:'chelsea',1611:'manchester-united',1609:'arsenal',10531:'swansea',
    692:'celta-vigo',691:'espanyol',696:'alaves',695:'levante',698:'getafe',678:'athletic-club',679:'atletico-madrid',674:'valencia',675:'real-madrid',676:'barcelona',714:'las-palmas',712:'leganes',701:'sd-eibar',756:'girona',677:'deportivo-la-coruna',684:'real-betis',687:'real-sociedad',680:'sevilla',683:'malaga',682:'villarreal',
    3795:'estac-troyes',3766:'olympique-lyonnais',3767:'paris-saint-germain',3771:'olympique-marseille',3770:'nantes',3775:'nice',3774:'stade-rennais',3779:'rc-strasbourg',3799:'angers',3772:'girondins-bordeaux',3804:'dijon-fco',3777:'metz',3782:'saint-etienne',3776:'lille',3783:'sm-caen',3780:'toulouse',3787:'montpellier',3785:'ea-guingamp',3789:'amiens-sc',19830:'monaco',
    3204:'spal-2013-ferrara',3157:'ac-milan',3159:'juventus',3158:'as-roma',3315:'sassuolo-calcio',3166:'bologna',3164:'sampdoria',3165:'chievo-verona',3162:'lazio',3163:'udinese',3161:'inter',3219:'benevento-calcio',3173:'cagliari',3172:'atalanta',3176:'fiorentina',3185:'torino',3187:'napoli',3197:'fc-crotone',3194:'verona',3193:'genoa',
    2454:'borussia-monchengladbach',2443:'werder-bremen',2446:'bayer-leverkusen',2447:'borussia-dortmund',2444:'bayern-munchen',2445:'vfb-stuttgart',2449:'fc-schalke-04',2455:'hannover-96',2457:'hertha-bsc',2451:'vfl-wolfsburg',2450:'hamburger-sv',2453:'sc-freiburg',2482:'1899-hoffenheim',2481:'fc-augsburg',2460:'fsv-mainz-05',2462:'eintracht-frankfurt',2463:'1-fc-koln',2975:'rb-leipzig',
}

def decode(value):
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m[1], 16)), value or '').strip()

archive, rejected, seen_clubs = {}, [], {}
with zipfile.ZipFile(io.BytesIO(payloads['matches.zip'])) as z:
    for country, league in leagues.items():
        valid = {t['clubId']: t for t in memberships[league]['teams']}
        appearances = {}
        matches = json.loads(z.read('matches_' + country + '.json'))
        # Later sheets are used only to detect ambiguous cross-club identities,
        # never as evidence for an early-season assignment. This deliberately
        # excludes some valid early-season players rather than dating a transfer.
        for match in matches:
            for team in match['teamsData'].values():
                club = club_ids.get(team['teamId'])
                if club in valid:
                    for p in team.get('formation', {}).get('lineup', []) + team.get('formation', {}).get('bench', []):
                        seen_clubs.setdefault(p['playerId'], set()).add(club)
        for match in matches:
            date = match['dateutc'][:10]
            if match['status'] != 'Played' or not ('2017-07-01' <= date <= CUTOFF):
                continue
            for team in match['teamsData'].values():
                team_id = team['teamId']
                club = club_ids.get(team_id)
                if club not in valid or team_id not in teams:
                    raise RuntimeError(f'Unmapped team {team_id}: {teams.get(team_id)}')
                for p in team.get('formation', {}).get('lineup', []) + team.get('formation', {}).get('bench', []):
                    appearances.setdefault(club, {}).setdefault(p['playerId'], []).append(dict(date=date, matchId=match['wyId']))
                    seen_clubs.setdefault(p['playerId'], set()).add(club)
        for club, rows in appearances.items():
            imported = []
            for pid, observations in sorted(rows.items()):
                p = players.get(pid, {})
                birth = p.get('birthDate', '')
                national_team = all_teams.get(p.get('currentNationalTeamId'), {})
                area = national_team.get('area', {}) if national_team.get('type') == 'national' else p.get('passportArea', {})
                nationality = special.get(area.get('alpha3code')) or countries.get(area.get('alpha2code'))
                position = {'GK':'GK', 'DF':'DF', 'MD':'MF', 'FW':'FW'}.get(p.get('role', {}).get('code2'))
                try:
                    age = (datetime.date.fromisoformat(CUTOFF) - datetime.date.fromisoformat(birth)).days / 365.2425
                except ValueError:
                    age = -1
                if not nationality or not position or not 16 <= age < 44:
                    rejected.append(dict(playerId=pid, clubId=club, reason='Missing identity/position/country or age outside game range'))
                    continue
                short = decode(p.get('shortName'))
                full_name = ' '.join(filter(None, [decode(p.get('firstName')), decode(p.get('middleName')), decode(p.get('lastName'))]))
                name = short if short and '.' not in short else full_name
                imported.append(dict(name=name, fullName=full_name, birthDate=birth, birthYear=int(birth[:4]), nationality=nationality, position=position,
                    nationalityEvidence='dataset-national-team' if national_team.get('type') == 'national' else 'dataset-passport',
                    researchPlayerId=pid, identitySource='https://figshare.com/articles/dataset/Players/7765196',
                    observations=sorted(observations, key=lambda x: x['date'])))
            archive[club] = dict(name=valid[club]['name'], competitionId=league, season='2017/18', precision='season', evidenceCutoff=CUTOFF,
                source='https://figshare.com/articles/dataset/Matches/7770422', sourceId='pappalardo-match-sheets',
                sourceSha256=sources[2]['sha256'], revision=str(sources[2]['version']), license='CC-BY-4.0', licenseUrl=LICENSE,
                attribution=ATTRIBUTION, players=imported)

for club, record in archive.items():
    record['players'] = [p for p in record['players'] if len(seen_clubs[p['researchPlayerId']]) == 1]
    if len(record['players']) < 11 or not any(p['position'] == 'GK' for p in record['players']):
        raise RuntimeError('Insufficient match-sheet coverage: ' + club)
result = dict(schemaVersion=1, revision='research-match-sheets-v1', license='CC-BY-4.0', licenseUrl=LICENSE, attribution=ATTRIBUTION,
    sources=sources, seasons={'2017':archive}, coverage=dict(clubSeasons=len(archive), playerSeasonRows=sum(len(r['players']) for r in archive.values()),
    rejectedRows=len(rejected), ambiguousIdentities=sum(len(c)>1 for c in seen_clubs.values())),
    limitations=['Only domestic match sheets on or before 1 September 2017 are used. Injured, absent or newly signed players can be missing.',
        'A dated match sheet proves observation, not continuous registration or a complete opening-day squad. Cross-club identities are excluded.',
        'Later domestic sheets are used only to exclude cross-club ambiguities, not to assign players or date transfers. This can omit valid early-season players.',
        'Country uses the dataset national-team identity where available, otherwise passport. This is not a reconstruction of historical changes of sporting nationality.',
        'No currentTeamId, future appearances, national-team lineups or performance ratings are imported. All gameplay ratings remain estimates.'])
serialized = json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'
for path in [BASE / 'research-season-rosters.json', ROOT / 'public/data/football-manager/research-season-rosters.json']:
    path.write_text(serialized, encoding='utf-8')
(CACHE / 'rejected.json').write_text(json.dumps(rejected, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result['coverage']))
