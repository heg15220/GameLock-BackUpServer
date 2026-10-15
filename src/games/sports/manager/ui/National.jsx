import React, { useMemo, useState } from 'react';
import { Users, LayoutGrid, Trophy as TrophyIcon, Wand2, Check } from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, Flag, Meter, OvrBadge, Portrait, SectionTitle, Tabs, Pill } from './components.jsx';
import { compName, posLabel, shortDate, teamInfo, teamName, fixtureLabel } from './format.js';
import Tactics from './Tactics.jsx';
import { nationPool, autoCallUp } from '../career/national.js';
import { dynamicOvr, isInjured } from '../career/world.js';
import { POSITION_LINE } from '../career/positions.js';
import { nationId } from '../career/competitions.js';
import { compTrophy } from './Competitions.jsx';

export default function National() {
  const { career, lang, t, act, go } = useManager();
  const [tab, setTab] = useState('squad');
  const nat = career.national;
  if (!nat) return null;
  const country = career.world.countries[nat.fifa];
  const team = nationId(nat.fifa);
  const comps = Object.values(career.season.comps).filter((c) => c.teams?.includes(team));
  const next = Object.values(career.season.fixtures).filter((f) => !f.done && !f.cancelled && (f.home === team || f.away === team)).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  return (
    <div className="mg-national">
      <div className="mg-national__hero" style={{ '--nat': country?.color || '#c9a227' }}>
        <Flag country={country} size={46} />
        <div>
          <span className="mg-kicker">{t('Seleccionador', 'National coach')}</span>
          <h2>{lang === 'es' ? country?.name_es : country?.name_en}</h2>
          <div className="mg-rep"><span>{t('Confianza de la federación', 'Federation confidence')}</span><Meter value={nat.confidence ?? 60} label="confidence" /></div>
        </div>
        {next && (
          <div className="mg-national__next">
            <small>{t('Próximo partido', 'Next match')}</small>
            <span><Crest team={teamInfo(career, next.home === team ? next.away : next.home)} size={30} /><b>{teamName(career, next.home === team ? next.away : next.home, lang)}</b></span>
            <em>{shortDate(next.date, lang)} · {fixtureLabel(career, next, lang)}</em>
          </div>
        )}
      </div>
      <div className="mg-comp-chips">
        {comps.map((c) => <button type="button" key={c.id} onClick={() => go('competitions', { comp: c.id })}>{compTrophy(career, c, 22)}<span>{compName(c, lang)}</span></button>)}
        {!comps.length && <Pill tone="muted">{t('Este año solo hay amistosos', 'Only friendlies this year')}</Pill>}
      </div>
      <Tabs tabs={[{ id: 'squad', label: t('Convocatoria', 'Squad'), icon: Users }, { id: 'tactics', label: t('Alineación', 'Line-up'), icon: LayoutGrid }]} value={tab} onChange={setTab} label="national" />
      {tab === 'squad' && <CallUp />}
      {tab === 'tactics' && <Tactics scope="national" />}
    </div>
  );
}

function CallUp() {
  const { career, lang, t, act, setSheet } = useManager();
  const nat = career.national;
  const pool = useMemo(() => nationPool(career.world, nat.fifa, career.date.slice(0, 7)).slice(0, 70), [career.version, nat.fifa]);
  const size = Object.values(career.season.comps).some((c) => c.type === 'tournament' && c.teams.includes(nationId(nat.fifa)) && !c.finished) && career.date >= `${career.year + 1}-05-01` ? 26 : 23;
  const selected = new Set(nat.squad);
  const toggle = (id) => act((c) => {
    const list = c.national.squad.slice();
    const index = list.indexOf(id);
    if (index >= 0) list.splice(index, 1); else if (list.length < size) list.push(id);
    c.national.squad = list;
    c.national.autoSquad = false;
    c.national.autoLineup = true;
  });
  const lines = ['GK', 'DF', 'MF', 'FW'];
  const count = (line) => nat.squad.filter((id) => POSITION_LINE[career.world.players[id]?.pos] === line).length;
  return (
    <div className="mg-callup">
      <div className="mg-callup__bar">
        <b>{nat.squad.length}/{size}</b><span>{t('convocados', 'called up')}</span>
        {lines.map((line) => <Pill key={line} tone="muted">{{ GK: t('POR', 'GK'), DF: t('DEF', 'DEF'), MF: t('MED', 'MID'), FW: t('DEL', 'FWD') }[line]} {count(line)}</Pill>)}
        <button type="button" className={`mg-btn ${nat.autoSquad ? 'mg-btn--primary' : 'mg-btn--ghost'} mg-btn--sm`} onClick={() => act((c) => { c.national.squad = autoCallUp(c.world, c.national.fifa, c.date, size); c.national.autoSquad = true; c.national.autoLineup = true; })}><Wand2 size={14} />{t('Convocatoria automática', 'Auto squad')}</button>
      </div>
      <ul className="mg-callup__list">
        {pool.map((p) => {
          const club = teamInfo(career, p.clubId);
          const on = selected.has(p.id);
          return (
            <li key={p.id} className={on ? 'is-on' : ''}>
              <button type="button" className="mg-callup__check" onClick={() => toggle(p.id)} aria-pressed={on} aria-label={p.name}>{on && <Check size={14} />}</button>
              <button type="button" className="mg-callup__player" onClick={() => setSheet({ type: 'player', id: p.id })}>
                <Portrait player={p} size={32} kit={career.world.countries[nat.fifa]?.color} />
                <span className="mg-row__main"><b>{p.name}</b><small>{club ? <><Crest team={club} size={13} />{club.short || club.name}</> : t('Liga no simulada', 'Unsimulated league')}{isInjured(p, career.date) ? ` · ${t('lesionado', 'injured')}` : ''}</small></span>
                <span className="mg-pos">{posLabel(p.pos, lang)}</span>
                <OvrBadge value={dynamicOvr(p, career.date)} size="sm" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export { TrophyIcon };
