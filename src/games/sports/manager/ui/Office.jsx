import React, { useMemo, useState } from 'react';
import { Briefcase, Wallet, TrendingUp, TrendingDown, Medal, History, Target, ArrowLeftRight, Download, Check, X } from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, Meter, SectionTitle, Tabs, Flag, Pill, Empty, Portrait } from './components.jsx';
import { money, seasonLabel, teamInfo, teamName, stageLabel, shortDate } from './format.js';
import { objectiveText } from './texts.js';
import { objectiveStatus } from '../career/board.js';
import { acceptJobOffer, declineJobOffer, leaveNationalJob } from '../career/career.js';
import { wageBill } from '../career/transfers.js';
import Trophy from '../../trayectoria/trophies.jsx';

const LEDGER_LABEL = {
  es: { wages: 'Sueldos', tv: 'Derechos de TV', commercial: 'Patrocinios', gate: 'Taquilla', prize: 'Premios', 'transfer-in': 'Ventas', 'transfer-out': 'Fichajes', instalment: 'Plazos de fichajes', 'signing-bonus': 'Primas de fichaje', release: 'Rescisiones' },
  en: { wages: 'Wages', tv: 'TV rights', commercial: 'Sponsors', gate: 'Gate receipts', prize: 'Prize money', 'transfer-in': 'Sales', 'transfer-out': 'Signings', instalment: 'Transfer instalments', 'signing-bonus': 'Signing bonuses', release: 'Releases' },
};

export default function Office() {
  const { career, lang, t } = useManager();
  const [tab, setTab] = useState(career.jobOffers?.length ? 'jobs' : 'board');
  const tabs = [
    { id: 'board', label: t('Directiva', 'Board'), icon: Target },
    { id: 'finance', label: t('Finanzas', 'Finances'), icon: Wallet },
    { id: 'manager', label: t('Tu carrera', 'Your career'), icon: Medal },
    { id: 'jobs', label: t('Ofertas', 'Offers'), icon: Briefcase, badge: career.jobOffers?.length || null },
  ];
  return (
    <div className="mg-office">
      <SectionTitle kicker={t('Oficina', 'Office')} title={t('Despacho del entrenador', "Manager's office")} />
      <Tabs tabs={tabs} value={tab} onChange={setTab} label={t('Oficina', 'Office')} />
      {tab === 'board' && <BoardPanel />}
      {tab === 'finance' && <FinancePanel />}
      {tab === 'manager' && <ManagerPanel />}
      {tab === 'jobs' && <JobsPanel />}
    </div>
  );
}

function BoardPanel() {
  const { career, lang, t } = useManager();
  const status = objectiveStatus(career);
  const confidence = Math.round(career.board.confidence);
  const stateLabel = { 'on-track': t('Vas bien', 'On track'), close: t('Cerca', 'Close'), 'off-track': t('Lejos', 'Off track'), done: t('Cumplido', 'Done'), failed: t('Fallado', 'Failed'), pending: t('Por empezar', 'Not started') };
  return (
    <div className="mg-board">
      <div className="mg-panel mg-board__confidence">
        <div className="mg-gauge-big" style={{ '--v': confidence }}>
          <svg viewBox="0 0 120 70" aria-hidden="true"><path d="M10 64a50 50 0 0 1 100 0" className="mg-gauge-big__track" /><path d="M10 64a50 50 0 0 1 100 0" className="mg-gauge-big__value" style={{ strokeDashoffset: 157 - 157 * confidence / 100 }} /></svg>
          <b>{confidence}</b>
        </div>
        <div>
          <h3>{t('Confianza de la directiva', 'Board confidence')}</h3>
          <p>{confidence >= 75 ? t('Están encantados con tu trabajo.', 'They are delighted with your work.') : confidence >= 50 ? t('Confían en ti. Sigue así.', 'They trust you. Keep it up.') : confidence >= 30 ? t('Empiezan a dudar. Necesitan ver resultados.', 'Doubts are growing. They need results.') : t('Tu puesto corre peligro.', 'Your job is in danger.')}</p>
          <p className="mg-muted">{t('Afición', 'Fans')}: <Meter value={career.fans ?? 65} compact label="fans" /> {Math.round(career.fans ?? 65)}</p>
        </div>
      </div>
      <ul className="mg-objectives">
        {status.map((o) => (
          <li key={o.id} className={`is-${o.state}`}>
            <span className="mg-objectives__imp">{{ crucial: t('Clave', 'Crucial'), high: t('Alta', 'High'), medium: t('Media', 'Medium') }[o.importance]}</span>
            <strong>{objectiveText(o, career, lang)}</strong>
            <span className="mg-objectives__now">
              {o.type === 'league' && o.played ? t(`Ahora: ${o.current}.º`, `Now: ${o.current}`) : null}
              {(o.type === 'cup' || o.type === 'continental') && o.reached ? stageLabel(o.reached, lang) : null}
              {o.type === 'wages' ? `${money(o.current, lang)} / ${money(o.limit, lang)}` : null}
              {o.type === 'youth' ? `${o.current} min` : null}
            </span>
            <Pill tone={o.state === 'on-track' || o.state === 'done' ? 'good' : o.state === 'close' || o.state === 'pending' ? 'warn' : 'bad'}>{stateLabel[o.state]}</Pill>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FinancePanel() {
  const { career, lang, t, act } = useManager();
  const f = career.finances;
  const bill = wageBill(career);
  const [move, setMove] = useState(0);
  const totals = useMemo(() => {
    const out = {};
    for (const entry of f.ledger) out[entry.kind] = (out[entry.kind] || 0) + entry.amount;
    return Object.entries(out).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [f.ledger.length, career.version]);
  const max = Math.max(1, ...totals.map(([, v]) => Math.abs(v)));
  const RATIO = 45; // transfer euros per weekly wage euro
  const apply = () => act((c) => {
    if (move > 0) { const amount = Math.min(move, c.finances.transferBudget); c.finances.transferBudget -= amount; c.finances.wageBudget += Math.round(amount / RATIO); }
    else if (move < 0) { const weekly = Math.min(-move / RATIO, c.finances.wageBudget - bill); if (weekly > 0) { c.finances.wageBudget -= Math.round(weekly); c.finances.transferBudget += Math.round(weekly * RATIO); } }
  });
  return (
    <div className="mg-finance">
      <div className="mg-finance__cards">
        <div className="mg-panel"><small>{t('Presupuesto de fichajes', 'Transfer budget')}</small><b>{money(f.transferBudget, lang)}</b></div>
        <div className="mg-panel"><small>{t('Sueldos (semana)', 'Wages (week)')}</small><b>{money(bill, lang)}</b><Meter value={bill} max={f.wageBudget} label="wages" tone={bill > f.wageBudget ? 'bad' : 'good'} /><small>{t('Límite', 'Limit')} {money(f.wageBudget, lang)}</small></div>
        <div className="mg-panel"><small>{t('Caja del club', 'Club balance')}</small><b className={f.balance < 0 ? 'is-bad' : ''}>{money(f.balance, lang)}</b></div>
      </div>
      <div className="mg-panel mg-split">
        <h4><ArrowLeftRight size={15} />{t('Repartir el dinero', 'Rebalance budgets')}</h4>
        <p className="mg-muted">{t('Pasa dinero de fichajes a sueldos (o al revés). 45 € de fichajes equivalen a 1 € de sueldo semanal.', 'Move money between transfers and wages. €45 of transfer budget equals €1 of weekly wages.')}</p>
        <input type="range" className="mg-range" min={-Math.max(0, (f.wageBudget - bill) * RATIO)} max={Math.max(0, f.transferBudget)} step={Math.max(1000, Math.round(f.transferBudget / 200))} value={move} onChange={(e) => setMove(Number(e.target.value))} aria-label={t('Reparto', 'Split')} />
        <div className="mg-split__preview">
          <span>{t('Fichajes', 'Transfers')}: <b>{money(f.transferBudget - Math.max(0, move) + Math.max(0, -move), lang)}</b></span>
          <span>{t('Límite de sueldos', 'Wage limit')}: <b>{money(f.wageBudget + Math.round(move / RATIO), lang)}</b></span>
          <button type="button" className="mg-btn mg-btn--primary mg-btn--sm" disabled={!move} onClick={() => { apply(); setMove(0); }}>{t('Aplicar', 'Apply')}</button>
        </div>
      </div>
      <div className="mg-panel">
        <h4>{t('Ingresos y gastos de la temporada', 'Season income and spending')}</h4>
        <ul className="mg-bars">
          {totals.map(([kind, value]) => (
            <li key={kind}>
              <span>{LEDGER_LABEL[lang][kind] || kind}</span>
              <i className={value >= 0 ? 'is-in' : 'is-out'} style={{ width: `${Math.max(3, Math.abs(value) / max * 100)}%` }} />
              <b className={value >= 0 ? 'mg-up' : 'mg-down'}>{value >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{money(value, lang)}</b>
            </li>
          ))}
          {!totals.length && <li className="mg-muted">{t('Aún no hay movimientos.', 'No movements yet.')}</li>}
        </ul>
      </div>
    </div>
  );
}

function ManagerPanel() {
  const { career, lang, t, exportCareer } = useManager();
  return (
    <div className="mg-manager">
      <div className="mg-panel mg-manager__card">
        <Portrait player={{ id: `manager-${career.avatar || 0}`, nat: career.world.clubs[career.clubId].country, age: 44 }} size={84} kit="#1b2733" />
        <div>
          <h3>{career.managerName}</h3>
          <p>{t('Entrenador del', 'Manager of')} {teamName(career, career.clubId, lang)}{career.national ? ` · ${t('Seleccionador de', 'Coach of')} ${teamName(career, `N:${career.national.fifa}`, lang)}` : ''}</p>
          <div className="mg-rep"><span>{t('Prestigio', 'Reputation')}</span><Meter value={career.reputation} label="reputation" tone="accent" /><b>{Math.round(career.reputation)}</b></div>
        </div>
        <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" onClick={exportCareer}><Download size={15} />{t('Exportar partida', 'Export save')}</button>
      </div>
      <h3 className="mg-h3"><Medal size={16} />{t('Vitrina', 'Trophy cabinet')}</h3>
      <div className="mg-cabinet">
        {career.trophies.map((tr, i) => (
          <div key={i} className="mg-cabinet__item">
            <Trophy id={tr.type === 'league' ? 'league' : tr.type === 'cup' ? 'cup' : tr.type === 'continental' ? (tr.name.includes('Europa') || tr.name.includes('Sudamericana') ? 'continental_b' : 'continental_a') : 'continental_nt'} competition={career.world.leagues[tr.leagueId]} confederation={tr.conf} size={56} />
            <b>{Array.isArray(tr.name) ? tr.name[lang === 'es' ? 0 : 1] : tr.name}</b><small>{seasonLabel(tr.year)}</small>
          </div>
        ))}
        {!career.trophies.length && <Empty icon={Medal} title={t('La vitrina espera su primer trofeo', 'The cabinet awaits its first trophy')} />}
      </div>
      <h3 className="mg-h3"><History size={16} />{t('Temporadas', 'Seasons')}</h3>
      <div className="mg-table-wrap">
        <table className="mg-table">
          <thead><tr><th>{t('Temporada', 'Season')}</th><th>{t('Club', 'Club')}</th><th>{t('Puesto', 'Pos')}</th><th>{t('Pts', 'Pts')}</th><th>{t('Títulos', 'Titles')}</th><th>{t('Máx. goleador', 'Top scorer')}</th></tr></thead>
          <tbody>
            {career.history.slice().reverse().map((h) => (
              <tr key={h.year}><td>{seasonLabel(h.year)}</td><td><span className="mg-cell-team"><Crest team={teamInfo(career, h.clubId)} size={18} />{teamName(career, h.clubId, lang, true)}</span></td><td>{h.position}.º</td><td>{h.points}</td><td>{h.trophies.join(', ') || '—'}</td><td>{h.topScorer ? `${h.topScorer.name} (${h.topScorer.goals})` : '—'}</td></tr>
            ))}
          </tbody>
        </table>
        {!career.history.length && <p className="mg-muted">{t('Tu primera temporada se está escribiendo.', 'Your first season is being written.')}</p>}
      </div>
      {career.national?.history?.length > 0 && (
        <>
          <h3 className="mg-h3"><Flag country={career.world.countries[career.national.fifa]} size={14} />{t('Con la selección', 'With the national team')}</h3>
          <ul className="mg-plain">{career.national.history.map((h, i) => <li key={i}>{h.year}: {Array.isArray(h.name) ? h.name[lang === 'es' ? 0 : 1] : h.name} — <b>{stageLabel(h.reached, lang)}</b></li>)}</ul>
        </>
      )}
    </div>
  );
}

function JobsPanel() {
  const { career, lang, t, act, go } = useManager();
  const offers = career.jobOffers || [];
  return (
    <div className="mg-jobs">
      {career.sacked && <p className="mg-alert is-bad">{t('Te han destituido. Elige una de las ofertas para seguir tu carrera.', 'You have been sacked. Choose an offer to continue your career.')}</p>}
      {offers.map((o) => (
        <div key={o.id} className="mg-panel mg-job">
          {o.type === 'club' ? <Crest team={teamInfo(career, o.clubId)} size={56} /> : <Flag country={career.world.countries[o.fifa]} size={34} />}
          <div>
            <small>{o.type === 'club' ? t('Oferta de club', 'Club offer') : t('Oferta de selección', 'National team offer')}</small>
            <strong>{o.type === 'club' ? teamName(career, o.clubId, lang) : teamName(career, `N:${o.fifa}`, lang)}</strong>
            {o.type === 'club' && <span>{career.world.leagues[career.world.clubs[o.clubId].leagueId]?.name} · {t('Presupuesto', 'Budget')} {money(career.world.clubs[o.clubId].budget, lang)}</span>}
            {o.type === 'nation' && <span>{t('Compatible con tu club actual.', 'Compatible with your current club.')}</span>}
          </div>
          <div className="mg-job__actions">
            <button type="button" className="mg-btn mg-btn--primary mg-btn--sm" onClick={() => { act((c) => acceptJobOffer(c, o.id)); go('central'); }}><Check size={15} />{t('Aceptar', 'Accept')}</button>
            <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" onClick={() => act((c) => declineJobOffer(c, o.id))}><X size={15} />{t('Rechazar', 'Decline')}</button>
          </div>
        </div>
      ))}
      {!offers.length && <Empty icon={Briefcase} title={t('No hay ofertas ahora mismo', 'No offers right now')}>{t('Al final de cada temporada otros clubes y selecciones pueden llamarte si tu prestigio crece.', 'At the end of every season other clubs and countries may call if your reputation grows.')}</Empty>}
      {career.national && (
        <div className="mg-panel mg-job">
          <Flag country={career.world.countries[career.national.fifa]} size={30} />
          <div><small>{t('Tu selección', 'Your national team')}</small><strong>{teamName(career, `N:${career.national.fifa}`, lang)}</strong><span>{t('Desde', 'Since')} {shortDate(career.national.since, lang)}</span></div>
          <button type="button" className="mg-btn mg-btn--danger mg-btn--sm" onClick={() => act((c) => leaveNationalJob(c))}>{t('Dimitir', 'Resign')}</button>
        </div>
      )}
    </div>
  );
}
