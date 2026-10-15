import React, { useMemo, useState } from 'react';
import { LayoutGrid, List, HeartPulse, Ban, TrendingUp, TrendingDown, Minus, Tag } from 'lucide-react';
import { useManager } from './context.jsx';
import { OvrBadge, PlayerCard, Meter, SectionTitle, Tabs, Portrait, Flag } from './components.jsx';
import { money, posLabel, teamInfo } from './format.js';
import { L } from './texts.js';
import { clubSquad, dynamicOvr, energyAt, isInjured, moraleLabel } from '../career/world.js';
import { POSITION_LINE } from '../career/positions.js';
import { contractYearsLeft, wageBill } from '../career/transfers.js';

const LINES = ['GK', 'DF', 'MF', 'FW'];

export function FormArrow({ form }) {
  if (form > 0.8) return <TrendingUp size={14} className="mg-up" aria-label="+" />;
  if (form < -0.8) return <TrendingDown size={14} className="mg-down" aria-label="-" />;
  return <Minus size={14} className="mg-flat" aria-label="=" />;
}

export default function Squad() {
  const { career, lang, t, setSheet } = useManager();
  const [view, setView] = useState('cards');
  const [line, setLine] = useState('all');
  const [sort, setSort] = useState('pos');
  const club = teamInfo(career, career.clubId);
  const squad = clubSquad(career.world, career.clubId);
  const listed = career.transfers.listed;
  const rows = useMemo(() => {
    const list = squad.filter((p) => line === 'all' || POSITION_LINE[p.pos] === line);
    const order = { pos: (a, b) => LINES.indexOf(POSITION_LINE[a.pos]) - LINES.indexOf(POSITION_LINE[b.pos]) || b.ovr - a.ovr, ovr: (a, b) => b.ovr - a.ovr, age: (a, b) => a.age - b.age, value: (a, b) => b.value - a.value, goals: (a, b) => (b.stats?.g || 0) - (a.stats?.g || 0) };
    return list.sort(order[sort] || order.pos);
  }, [squad, line, sort]);
  const bill = wageBill(career);
  const avgAge = (squad.reduce((s, p) => s + p.age, 0) / Math.max(1, squad.length)).toFixed(1);

  const lineTabs = [
    { id: 'all', label: t('Todos', 'All') }, { id: 'GK', label: t('Porteros', 'Keepers') }, { id: 'DF', label: t('Defensas', 'Defenders') },
    { id: 'MF', label: t('Medios', 'Midfielders') }, { id: 'FW', label: t('Delanteros', 'Forwards') },
  ];

  return (
    <div className="mg-squad">
      <SectionTitle kicker={t('Plantilla', 'Squad')} title={`${squad.length} ${t('jugadores', 'players')}`}>
        <div className="mg-seg" role="group" aria-label={t('Vista', 'View')}>
          <button type="button" className={view === 'cards' ? 'is-active' : ''} onClick={() => setView('cards')} aria-label={t('Cartas', 'Cards')}><LayoutGrid size={16} /></button>
          <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label={t('Lista', 'List')}><List size={16} /></button>
        </div>
      </SectionTitle>
      <div className="mg-squad__summary">
        <div><small>{t('Sueldos por semana', 'Weekly wages')}</small><b>{money(bill, lang)}</b><Meter value={bill} max={career.finances.wageBudget} compact label="wages" tone={bill > career.finances.wageBudget ? 'bad' : 'good'} /><small>{t('de', 'of')} {money(career.finances.wageBudget, lang)}</small></div>
        <div><small>{t('Edad media', 'Average age')}</small><b>{avgAge}</b></div>
        <div><small>{t('Lesionados', 'Injured')}</small><b>{squad.filter((p) => isInjured(p, career.date)).length}</b></div>
        <div><small>{t('Cedidos con nosotros', 'On loan here')}</small><b>{squad.filter((p) => p.loan).length}</b></div>
      </div>
      <Tabs tabs={lineTabs} value={line} onChange={setLine} label={t('Líneas', 'Lines')} />

      {view === 'cards' ? (
        <div className="mg-card-grid">
          {rows.map((p) => (
            <div key={p.id} className="mg-card-wrap">
              <PlayerCard player={p} lang={lang} kit={club.color} dynamic={dynamicOvr(p, career.date, career.training)} onClick={() => setSheet({ type: 'player', id: p.id })} />
              <div className="mg-card-wrap__meta">
                <Meter value={energyAt(p, career.date, career.training)} compact label="energy" />
                {isInjured(p, career.date) && <HeartPulse size={13} className="is-bad" aria-label={t('Lesionado', 'Injured')} />}
                {p.susp > 0 && <Ban size={13} className="is-warn" aria-label={t('Sancionado', 'Suspended')} />}
                {listed[p.id] && <Tag size={13} className="is-accent" aria-label={t('Transferible', 'Listed')} />}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mg-table-wrap">
          <table className="mg-table mg-table--squad">
            <thead>
              <tr>
                <th><button type="button" onClick={() => setSort('pos')}>{t('Pos', 'Pos')}</button></th>
                <th>{t('Jugador', 'Player')}</th>
                <th><button type="button" onClick={() => setSort('ovr')}>{t('Media', 'OVR')}</button></th>
                <th>POT</th>
                <th><button type="button" onClick={() => setSort('age')}>{t('Edad', 'Age')}</button></th>
                <th>{t('Energía', 'Energy')}</th>
                <th>{t('Ánimo', 'Morale')}</th>
                <th><button type="button" onClick={() => setSort('goals')}>{t('G/A', 'G/A')}</button></th>
                <th>{t('Contrato', 'Contract')}</th>
                <th><button type="button" onClick={() => setSort('value')}>{t('Valor', 'Value')}</button></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const dyn = dynamicOvr(p, career.date, career.training);
                const years = contractYearsLeft(career, p);
                return (
                  <tr key={p.id} onClick={() => setSheet({ type: 'player', id: p.id })} className="is-clickable">
                    <td><span className={`mg-pos mg-pos--${POSITION_LINE[p.pos]}`}>{posLabel(p.pos, lang)}</span></td>
                    <td>
                      <span className="mg-cell-player">
                        <Portrait player={p} size={30} kit={club.color} />
                        <span><b>{p.name}</b><small><Flag country={career.world.countries[p.nat]} size={9} /> #{p.number}{p.loan ? ` · ${t('cedido', 'loan')}` : ''}{listed[p.id] ? ` · ${t('en venta', 'listed')}` : ''}</small></span>
                      </span>
                    </td>
                    <td><span className="mg-ovr-cell"><OvrBadge value={dyn} size="sm" delta={dyn - p.ovr} /><FormArrow form={p.form} /></span></td>
                    <td>{p.pot}</td>
                    <td>{p.age}</td>
                    <td>{isInjured(p, career.date) ? <span className="is-bad">{L[lang].fitness.injured}</span> : <Meter value={energyAt(p, career.date, career.training)} compact label="energy" />}</td>
                    <td>{L[lang].morale[moraleLabel(p.morale ?? 65)]}</td>
                    <td>{p.stats?.g || 0}/{p.stats?.a || 0}</td>
                    <td className={years === 0 ? 'is-warn' : ''}>{years === 0 ? t('Último año', 'Final year') : `${years + 1} ${t('años', 'yrs')}`}</td>
                    <td>{money(p.value, lang)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
