import React, { useMemo, useState } from 'react';
import { GraduationCap, UserPlus, ArrowUpCircle, X, Check, MapPin } from 'lucide-react';
import { useManager } from './context.jsx';
import { Empty, OvrBadge, Portrait, SectionTitle, Sheet, Flag, Meter } from './components.jsx';
import { money, posLabel, shortDate, teamInfo } from './format.js';
import { youthScoutCandidates, hireYouthScout, signProspect, dismissProspect, promoteYouth, releaseYouth } from '../career/scouting.js';

function YouthRow({ youth, actions }) {
  const { career, lang } = useManager();
  const country = career.world.countries[youth.nat];
  const club = teamInfo(career, career.clubId);
  const spread = Math.max(2, 8 - Math.round((youth.age - 14) * 1.2));
  return (
    <div className="mg-youth">
      <Portrait player={youth} size={46} kit={club.color} />
      <span className="mg-row__main"><b>{youth.name}</b><small><Flag country={country} size={9} /> {youth.age} {lang === 'es' ? 'años' : 'yrs'} · {posLabel(youth.pos, lang)}</small></span>
      <OvrBadge value={youth.ovr} size="sm" />
      <span className="mg-youth__pot"><small>{lang === 'es' ? 'Potencial' : 'Potential'}</small><b>{Math.max(youth.ovr, youth.pot - spread)}-{Math.min(99, youth.pot + spread)}</b><Meter value={youth.pot} max={99} compact label="potential" tone="accent" /></span>
      <span className="mg-youth__actions">{actions}</span>
    </div>
  );
}

export default function Academy() {
  const { career, lang, t, act, setSheet } = useManager();
  const [hiring, setHiring] = useState(false);
  const [notice, setNotice] = useState(null);
  const academy = career.academy;
  return (
    <div className="mg-academy">
      <SectionTitle kicker={t('Cantera', 'Academy')} title={t('Los jugadores del mañana', 'Tomorrow\'s players')}>
        <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" disabled={academy.scouts.length >= 3} onClick={() => setHiring(true)}><UserPlus size={15} />{t('Ojeador de cantera', 'Youth scout')}</button>
      </SectionTitle>
      <p className="mg-intro">{t('Los ojeadores de cantera recorren un país y cada mes te proponen chavales de 15-16 años. Fíchalos para la cantera, déjalos crecer y súbelos al primer equipo cuando estén listos (desde los 16).', 'Youth scouts travel a country and propose 15-16 year olds every month. Bring them in, let them grow, and promote them to the first team when ready (from 16).')}</p>

      <div className="mg-youth-scouts">
        {academy.scouts.map((s) => (
          <div key={s.id} className="mg-chip-card"><MapPin size={14} /><b>{s.name}</b><span><Flag country={career.world.countries[s.country]} size={10} /> {lang === 'es' ? career.world.countries[s.country]?.name_es : career.world.countries[s.country]?.name_en}</span><small>{t('Próximo informe', 'Next report')}: {s.next ? shortDate(s.next, lang) : '—'}</small></div>
        ))}
      </div>

      {academy.prospects.length > 0 && (
        <>
          <h3 className="mg-h3">{t('Propuestas de los ojeadores', 'Scout proposals')}</h3>
          <div className="mg-list">
            {academy.prospects.map((y) => (
              <YouthRow key={y.id} youth={y} actions={<>
                <button type="button" className="mg-btn mg-btn--primary mg-btn--sm" onClick={() => { const r = act((c) => signProspect(c, y.id)); if (r?.error === 'full') setNotice(t('La cantera está llena (14). Libera a alguien primero.', 'The academy is full (14). Release someone first.')); }}><Check size={14} />{t('A la cantera', 'Sign')}</button>
                <button type="button" className="mg-icon-btn" onClick={() => act((c) => dismissProspect(c, y.id))} aria-label={t('Descartar', 'Dismiss')}><X size={16} /></button>
              </>} />
            ))}
          </div>
        </>
      )}
      {notice && <p className="mg-alert is-warn">{notice}</p>}

      <h3 className="mg-h3"><GraduationCap size={16} />{t('En la cantera', 'In the academy')} <small>{academy.players.length}/14</small></h3>
      <div className="mg-list">
        {academy.players.slice().sort((a, b) => b.pot - a.pot).map((y) => (
          <YouthRow key={y.id} youth={y} actions={<>
            <button type="button" className="mg-btn mg-btn--primary mg-btn--sm" disabled={y.age < 16} onClick={() => { const r = act((c) => promoteYouth(c, y.id)); if (r?.player) setSheet({ type: 'player', id: r.player.id }); }}><ArrowUpCircle size={14} />{t('Subir al primer equipo', 'Promote')}</button>
            <button type="button" className="mg-icon-btn" onClick={() => act((c) => releaseYouth(c, y.id))} aria-label={t('Dejar ir', 'Release')}><X size={16} /></button>
          </>} />
        ))}
        {!academy.players.length && <Empty icon={GraduationCap} title={t('La cantera está vacía', 'The academy is empty')} />}
      </div>
      <HireYouthSheet open={hiring} onClose={() => setHiring(false)} />
    </div>
  );
}

function HireYouthSheet({ open, onClose }) {
  const { career, lang, t, act } = useManager();
  const candidates = useMemo(() => (open ? youthScoutCandidates(career, 5) : []), [open, career, career.academy.hired]);
  const [country, setCountry] = useState(null);
  const countries = Object.values(career.world.countries).filter((c) => c.confederation && c.confederation !== 'OFC').sort((a, b) => (lang === 'es' ? a.name_es : a.name_en).localeCompare(lang === 'es' ? b.name_es : b.name_en));
  return (
    <Sheet open={open} onClose={onClose} title={t('Ojeadores de cantera', 'Youth scouts')}>
      <label className="mg-form">{t('País donde buscará', 'Country to scout')}
        <select value={country || ''} onChange={(e) => setCountry(e.target.value || null)}>
          <option value="">{t('El que propone el ojeador', "The scout's choice")}</option>
          {countries.map((c) => <option key={c.fifa} value={c.fifa}>{lang === 'es' ? c.name_es : c.name_en}</option>)}
        </select>
      </label>
      <div className="mg-list">
        {candidates.map((c) => (
          <div key={c.id} className="mg-row">
            <Portrait player={{ id: c.id, nat: c.country, age: 45 }} size={40} kit="#1d2a36" />
            <span className="mg-row__main"><b>{c.name}</b><small>{t('Calidad', 'Quality')} {'★'.repeat(c.quality)}{'☆'.repeat(5 - c.quality)} · {lang === 'es' ? career.world.countries[c.country]?.name_es : career.world.countries[c.country]?.name_en}</small></span>
            <span className="mg-row__value">{money(c.wage, lang)}/{t('sem', 'wk')}</span>
            <button type="button" className="mg-btn mg-btn--primary mg-btn--sm" onClick={() => { act((x) => hireYouthScout(x, c, country || c.country)); onClose(); }}>{t('Contratar', 'Hire')}</button>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
