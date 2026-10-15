import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Trophy as TrophyIcon, Goal, ListOrdered, GitBranch } from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, Empty, OvrBadge, SectionTitle, Sheet, Tabs, Portrait, FormGuide } from './components.jsx';
import { compName, money, posLabel, shortDate, stageLabel, teamInfo, teamName } from './format.js';
import { sortTable, isNation } from '../career/competitions.js';
import { relegationSpots, promotionSpots } from '../career/board.js';
import { clubSquad } from '../career/world.js';
import Trophy from '../../trayectoria/trophies.jsx';

export function compTrophy(career, comp, size = 40) {
  if (!comp) return null;
  if (comp.type === 'league') return <Trophy id="league" competition={career.world.leagues[comp.leagueId]} size={size} />;
  if (comp.type === 'cup') return <Trophy id="cup" competition={career.world.leagues[comp.trophyLeagueId]} size={size} />;
  if (comp.type === 'continental') return <Trophy id={comp.level === 1 ? 'continental_a' : 'continental_b'} confederation={comp.conf} size={size} />;
  if (comp.type === 'tournament') return <Trophy id={comp.key === 'world' ? 'world_cup' : 'continental_nt'} confederation={comp.key === 'copa' ? 'CONMEBOL' : comp.conf} size={size} />;
  return <TrophyIcon size={size * 0.6} />;
}

export default function Competitions({ params }) {
  const { career, lang, t } = useManager();
  const season = career.season;
  const ownLeagueComp = `L:${career.world.clubs[career.clubId].leagueId}`;
  const [compId, setCompId] = useState(params?.comp || ownLeagueComp);
  const [team, setTeam] = useState(params?.team || null);
  useEffect(() => { if (params?.team) setTeam(params.team); }, [params?.team]);
  const comp = season.comps[compId] || season.comps[ownLeagueComp];
  const mine = Object.values(season.comps).filter((c) => c.type !== 'friendly' && (c.teams?.includes(career.clubId) || (career.national && c.teams?.includes(`N:${career.national.fifa}`))));
  const groups = useMemo(() => {
    const list = Object.values(season.comps).filter((c) => c.type !== 'friendly');
    return [
      [t('Tus competiciones', 'Your competitions'), mine],
      [t('Internacional', 'International'), list.filter((c) => (c.type === 'continental' || c.type === 'tournament' || c.type === 'qualifiers') && !mine.includes(c))],
      [t('Ligas', 'Leagues'), list.filter((c) => c.type === 'league' && !mine.includes(c)).sort((a, b) => a.name.localeCompare(b.name))],
      [t('Copas', 'Cups'), list.filter((c) => c.type === 'cup' && !mine.includes(c)).sort((a, b) => a.name.localeCompare(b.name))],
    ];
  }, [season, mine.length, lang]);

  return (
    <div className="mg-competitions">
      <SectionTitle kicker={t('Competiciones', 'Competitions')} title={compName(comp, lang)}>
        <select className="mg-select" value={comp.id} onChange={(e) => setCompId(e.target.value)} aria-label={t('Competición', 'Competition')}>
          {groups.map(([label, list]) => list.length ? <optgroup key={label} label={label}>{list.map((c) => <option key={c.id} value={c.id}>{compName(c, lang)}</option>)}</optgroup> : null)}
        </select>
      </SectionTitle>
      <div className="mg-comp-chips">
        {mine.map((c) => <button type="button" key={c.id} className={c.id === comp.id ? 'is-active' : ''} onClick={() => setCompId(c.id)}>{compTrophy(career, c, 22)}<span>{compName(c, lang)}</span></button>)}
      </div>
      {comp.type === 'league' && <LeagueView comp={comp} onTeam={setTeam} />}
      {comp.type === 'cup' && <CupView comp={comp} onTeam={setTeam} />}
      {(comp.type === 'continental' || comp.type === 'tournament' || comp.type === 'qualifiers') && <GroupsKoView comp={comp} onTeam={setTeam} />}
      {team && <TeamSheet teamId={team} onClose={() => setTeam(null)} />}
    </div>
  );
}

function zoneOf(career, comp, position, size) {
  const league = career.world.leagues[comp.leagueId];
  const down = relegationSpots(career, league);
  const up = promotionSpots(career, league);
  if (position <= up) return 'promotion';
  if (league.tier === 1) {
    const slots = league.strength >= 2 ? 4 : league.strength === 1 ? 2 : 1;
    if (position <= slots) return 'continental';
    if (position <= slots + (league.strength >= 2 ? 2 : 1)) return 'continental-b';
  }
  if (down && position > size - down) return 'relegation';
  return null;
}

function LeagueView({ comp, onTeam }) {
  const { career, lang, t } = useManager();
  const [tab, setTab] = useState('table');
  const table = sortTable(Object.values(comp.table));
  const fixtures = Object.values(career.season.fixtures).filter((f) => f.comp === comp.id);
  const rounds = comp.rounds;
  const playedRounds = Math.max(0, ...fixtures.filter((f) => f.done).map((f) => f.round + 1));
  const [round, setRound] = useState(Math.min(rounds - 1, playedRounds > 0 ? playedRounds - 1 : 0));
  const nextOpponent = (team) => {
    const next = fixtures.filter((f) => !f.done && (f.home === team || f.away === team)).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
    return next ? (next.home === team ? next.away : next.home) : null;
  };
  const scorers = useMemo(() => Object.values(career.world.players).filter((p) => (p.stats?.lg || 0) > 0 && career.world.clubs[p.clubId]?.leagueId === comp.leagueId)
    .sort((a, b) => b.stats.lg - a.stats.lg || (b.stats.la || 0) - (a.stats.la || 0)).slice(0, 20), [career.version, comp.leagueId]);
  return (
    <>
      <Tabs tabs={[{ id: 'table', label: t('Clasificación', 'Table'), icon: ListOrdered }, { id: 'results', label: t('Jornadas', 'Matchdays') }, { id: 'scorers', label: t('Goleadores', 'Scorers'), icon: Goal }]} value={tab} onChange={setTab} label="league" />
      {tab === 'table' && (
        <div className="mg-table-wrap mg-standings">
          <table className="mg-table mg-table--standings">
            <thead><tr><th>#</th><th>{t('Club', 'Club')}</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th className="mg-hide-sm">GF</th><th className="mg-hide-sm">GC</th><th>DG</th><th>{t('Pts', 'Pts')}</th><th className="mg-hide-sm">{t('Racha', 'Form')}</th><th className="mg-hide-sm">{t('Próx.', 'Next')}</th></tr></thead>
            <tbody>
              {table.map((row, i) => {
                const zone = zoneOf(career, comp, i + 1, table.length);
                const next = nextOpponent(row.team);
                return (
                  <tr key={row.team} className={`${row.team === career.clubId ? 'is-own' : ''} ${zone ? `zone-${zone}` : ''} is-clickable`} onClick={() => onTeam(row.team)}>
                    <td><span className="mg-rank">{i + 1}</span></td>
                    <td><span className="mg-cell-team"><Crest team={teamInfo(career, row.team)} size={22} /><span>{teamName(career, row.team, lang)}</span></span></td>
                    <td>{row.p}</td><td>{row.w}</td><td>{row.d}</td><td>{row.l}</td><td className="mg-hide-sm">{row.gf}</td><td className="mg-hide-sm">{row.ga}</td>
                    <td>{row.gf - row.ga > 0 ? '+' : ''}{row.gf - row.ga}</td><td><b>{row.pts}</b></td>
                    <td className="mg-hide-sm"><FormGuide results={row.form.map((r) => (lang === 'es' ? { W: 'V', D: 'E', L: 'D' }[r] : r))} /></td>
                    <td className="mg-hide-sm">{next ? <Crest team={teamInfo(career, next)} size={18} /> : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mg-legend">
            <span className="zone-continental">{t('Copa continental', 'Continental cup')}</span><span className="zone-continental-b">{t('2.ª competición', 'Second competition')}</span>
            <span className="zone-promotion">{t('Ascenso', 'Promotion')}</span><span className="zone-relegation">{t('Descenso', 'Relegation')}</span>
          </div>
        </div>
      )}
      {tab === 'results' && (
        <div className="mg-matchday">
          <div className="mg-matchday__nav">
            <button type="button" className="mg-icon-btn" disabled={round <= 0} onClick={() => setRound(round - 1)} aria-label="prev"><ChevronLeft size={18} /></button>
            <b>{t('Jornada', 'Matchday')} {round + 1}</b>
            <button type="button" className="mg-icon-btn" disabled={round >= rounds - 1} onClick={() => setRound(round + 1)} aria-label="next"><ChevronRight size={18} /></button>
          </div>
          <FixtureList fixtures={fixtures.filter((f) => f.round === round)} />
        </div>
      )}
      {tab === 'scorers' && (
        <div className="mg-list">
          {scorers.map((p, i) => (
            <div key={p.id} className="mg-row">
              <span className="mg-rank">{i + 1}</span>
              <Portrait player={p} size={32} kit={career.world.clubs[p.clubId]?.color} />
              <span className="mg-row__main"><b>{p.name}</b><small><Crest team={teamInfo(career, p.clubId)} size={13} />{teamName(career, p.clubId, lang, true)}</small></span>
              <span className="mg-row__value"><b>{p.stats.lg}</b> {t('goles', 'goals')}</span>
            </div>
          ))}
          {!scorers.length && <Empty icon={Goal} title={career.deepLeagues.includes(comp.leagueId) ? t('Aún no hay goles', 'No goals yet') : t('Esta liga no se simula al detalle', 'This league is not simulated in detail')} />}
        </div>
      )}
    </>
  );
}

export function FixtureList({ fixtures }) {
  const { career, lang } = useManager();
  return (
    <ul className="mg-fixtures">
      {fixtures.map((f) => {
        const home = teamInfo(career, f.home);
        const away = teamInfo(career, f.away);
        const winner = f.done ? (f.pens ? (f.pens.home > f.pens.away ? 'home' : 'away') : f.hg > f.ag ? 'home' : f.ag > f.hg ? 'away' : null) : null;
        const mine = [f.home, f.away].includes(career.clubId) || (career.national && [f.home, f.away].includes(`N:${career.national.fifa}`));
        return (
          <li key={f.id} className={mine ? 'is-own' : ''}>
            <span className={`mg-fixtures__team is-home ${winner === 'home' ? 'is-win' : ''}`}><span>{home?.short || home?.name}</span><Crest team={home} size={22} /></span>
            <span className="mg-fixtures__score">{f.done ? <>{f.hg} - {f.ag}{f.pens && <small>({f.pens.home}-{f.pens.away} p.)</small>}</> : <small>{shortDate(f.date, lang)}</small>}</span>
            <span className={`mg-fixtures__team ${winner === 'away' ? 'is-win' : ''}`}><Crest team={away} size={22} /><span>{away?.short || away?.name}</span></span>
          </li>
        );
      })}
    </ul>
  );
}

function CupView({ comp }) {
  const { career, lang, t } = useManager();
  const [round, setRound] = useState(Math.max(0, comp.rounds.length - 1));
  const current = comp.rounds[Math.min(round, comp.rounds.length - 1)];
  return (
    <div className="mg-cup">
      <div className="mg-cup__head">{compTrophy(career, comp, 64)}<div><b>{compName(comp, lang)}</b><small>{comp.winner ? `${t('Campeón', 'Winner')}: ${teamName(career, comp.winner, lang)}` : `${comp.alive.length} ${t('equipos vivos', 'teams left')}`}</small></div></div>
      <div className="mg-chips mg-chips--scroll">
        {comp.rounds.map((r, i) => <button type="button" key={r.stage + i} className={i === round ? 'is-active' : ''} onClick={() => setRound(i)}>{stageLabel(r.stage, lang)}</button>)}
      </div>
      {current && <><p className="mg-muted">{shortDate(current.date, lang)} · {current.fixtures.length} {t('partidos', 'matches')}{current.byes.length ? ` · ${current.byes.length} ${t('exentos', 'byes')}` : ''}</p><FixtureList fixtures={current.fixtures.map((id) => career.season.fixtures[id])} /></>}
    </div>
  );
}

function GroupsKoView({ comp, onTeam }) {
  const { career, lang, t } = useManager();
  const [view, setView] = useState(comp.phase === 'ko' || comp.phase === 'done' ? 'ko' : 'groups');
  const teamLabel = (id) => (isNation(id) ? teamName(career, id, lang) : teamName(career, id, lang, true));
  return (
    <div className="mg-groups">
      <div className="mg-cup__head">{compTrophy(career, comp, 64)}<div><b>{compName(comp, lang)}</b><small>{comp.winner ? `${t('Campeón', 'Winner')}: ${teamLabel(comp.winner)}` : comp.type === 'qualifiers' ? t(`Se clasifican ${comp.slots}`, `${comp.slots} qualify`) : comp.phase === 'groups' ? t('Fase de grupos', 'Group stage') : t('Eliminatorias', 'Knockouts')}</small></div></div>
      {comp.type !== 'qualifiers' && comp.groups?.length > 0 && (
        <Tabs tabs={[{ id: 'groups', label: t('Grupos', 'Groups') }, { id: 'ko', label: t('Eliminatorias', 'Knockouts'), icon: GitBranch }]} value={view} onChange={setView} label="view" />
      )}
      {(view === 'groups' || comp.type === 'qualifiers') && (
        <div className="mg-group-grid">
          {comp.groups.map((group, g) => {
            const rows = sortTable(Object.values(group.table));
            return (
              <div key={group.name} className="mg-panel mg-group">
                <h4>{t('Grupo', 'Group')} {group.name}</h4>
                <table className="mg-table mg-table--compact">
                  <thead><tr><th>#</th><th /><th>PJ</th><th>DG</th><th>Pts</th></tr></thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row.team} className={`${[career.clubId, `N:${career.national?.fifa}`].includes(row.team) ? 'is-own' : ''} ${i < 2 ? 'zone-continental' : ''} is-clickable`} onClick={() => !isNation(row.team) && onTeam(row.team)}>
                        <td>{i + 1}</td><td><span className="mg-cell-team"><Crest team={teamInfo(career, row.team)} size={18} />{teamLabel(row.team)}</span></td>
                        <td>{row.p}</td><td>{row.gf - row.ga}</td><td><b>{row.pts}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <FixtureList fixtures={(comp.groupFixtures || []).map((id) => career.season.fixtures[id]).filter((f) => f.group === g && f.done).slice(-3)} />
              </div>
            );
          })}
        </div>
      )}
      {view === 'ko' && comp.type !== 'qualifiers' && (
        comp.ko?.length ? (
          <div className="mg-bracket">
            {comp.ko.map((round) => (
              <div key={round.stage} className="mg-bracket__round">
                <h4>{stageLabel(round.stage, lang)}</h4>
                {round.ties.map((tie) => {
                  const legs = tie.legs.map((id) => career.season.fixtures[id]);
                  const agg = (team) => legs.reduce((s, f) => s + (f.done ? (f.home === team ? f.hg : f.ag) : 0), 0);
                  const done = legs.every((f) => f.done);
                  return (
                    <div key={tie.id} className="mg-tie">
                      {[tie.a, tie.b].map((team) => (
                        <span key={team} className={`${tie.winner === team ? 'is-win' : ''} ${tie.winner && tie.winner !== team ? 'is-out' : ''}`}>
                          <Crest team={teamInfo(career, team)} size={18} /><em>{teamLabel(team)}</em><b>{legs.some((f) => f.done) ? agg(team) : ''}</b>
                        </span>
                      ))}
                      {!done && <small>{shortDate(legs[legs.length - 1].date, lang)}</small>}
                      {done && legs[legs.length - 1].pens && <small>{t('Penaltis', 'Penalties')} {legs[legs.length - 1].pens.home}-{legs[legs.length - 1].pens.away}</small>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : <Empty icon={GitBranch} title={t('Las eliminatorias se sortean al acabar los grupos', 'Knockouts are drawn after the groups')} />
      )}
    </div>
  );
}

function TeamSheet({ teamId, onClose }) {
  const { career, lang, t, setSheet } = useManager();
  const club = teamInfo(career, teamId);
  const squad = clubSquad(career.world, teamId).sort((a, b) => b.ovr - a.ovr);
  const c = career.world.clubs[teamId];
  if (!club) return null;
  return (
    <Sheet open onClose={onClose} title={club.name} wide>
      <div className="mg-team-head"><Crest team={club} size={64} /><div><b>{club.name}</b><small>{career.world.leagues[c?.leagueId]?.name || t('Liga no simulada', 'Unsimulated league')}</small><span><OvrBadge value={c?.rating || 60} /> {t('Presupuesto', 'Budget')}: {money(c?.budget || 0, lang)}</span></div></div>
      <div className="mg-list">
        {squad.map((p) => (
          <button type="button" key={p.id} className="mg-row" onClick={() => setSheet({ type: 'player', id: p.id })}>
            <Portrait player={p} size={30} kit={club.color} />
            <span className="mg-row__main"><b>{p.name}</b><small>{posLabel(p.pos, lang)} · {p.age}</small></span>
            <OvrBadge value={p.ovr} size="sm" />
            <span className="mg-row__value">{money(p.value, lang)}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
