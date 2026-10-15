import React, { useMemo, useState } from 'react';
import { Binoculars, UserPlus, Star, Globe, Send, X, FileText } from 'lucide-react';
import { useManager } from './context.jsx';
import { Empty, OvrBadge, Portrait, SectionTitle, Sheet, Crest, Pill, Flag } from './components.jsx';
import { money, posLabel, shortDate, teamInfo } from './format.js';
import { L, verdictText } from './texts.js';
import { REGIONS, scoutCandidates, hireScout, fireScout, startMission, cancelMission } from '../career/scouting.js';
import { interestLabel } from '../career/transfers.js';

const REGION_NAME = {
  es: { UEFA: 'Europa', CONMEBOL: 'Sudamérica', CONCACAF: 'Norteamérica y Caribe', AFC: 'Asia', CAF: 'África', world: 'Todo el mundo' },
  en: { UEFA: 'Europe', CONMEBOL: 'South America', CONCACAF: 'North America & Caribbean', AFC: 'Asia', CAF: 'Africa', world: 'Worldwide' },
};

function Stars({ value, label }) {
  return <span className="mg-stars" aria-label={`${label}: ${value}/5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={11} className={i < value ? 'is-on' : ''} />)}</span>;
}

export default function Scouting() {
  const { career, lang, t, act, setSheet } = useManager();
  const [hiring, setHiring] = useState(false);
  const [mission, setMission] = useState(null);
  const reports = Object.entries(career.scouting.reports).map(([id, r]) => ({ id, ...r, player: career.world.players[id] })).filter((r) => r.player && !r.player.retired)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="mg-scouting">
      <SectionTitle kicker={t('Red de ojeadores', 'Scouting network')} title={t('Busca el próximo crack', 'Find the next star')}>
        <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" disabled={career.scouting.scouts.length >= 4} onClick={() => setHiring(true)}><UserPlus size={15} />{t('Contratar ojeador', 'Hire scout')}</button>
      </SectionTitle>
      <div className="mg-scout-grid">
        {career.scouting.scouts.map((scout) => {
          const m = career.scouting.missions.find((x) => x.id === scout.missionId);
          return (
            <article key={scout.id} className={`mg-panel mg-scout ${m ? 'is-busy' : ''}`}>
              <header>
                <Portrait player={{ id: scout.id, age: 50 }} size={48} kit="#1d2a36" />
                <div><strong>{scout.name}</strong><small>{t('Experiencia', 'Experience')} <Stars value={scout.exp} label="exp" /></small><small>{t('Ojo', 'Judgment')} <Stars value={scout.judgment} label="judgment" /></small></div>
              </header>
              {m ? (
                <div className="mg-scout__mission">
                  <span className="mg-radar-ping" aria-hidden="true" />
                  <p>{t('Buscando en', 'Scouting in')} <b>{REGION_NAME[lang][m.region]}</b>{m.line ? ` · ${{ GK: t('porteros', 'keepers'), DF: t('defensas', 'defenders'), MF: t('medios', 'midfielders'), FW: t('delanteros', 'forwards') }[m.line]}` : ''}</p>
                  <small>{t(`Vuelve el ${shortDate(m.end, lang)} · ${m.found.length} encontrados`, `Back on ${shortDate(m.end, lang)} · ${m.found.length} found`)}</small>
                  <button type="button" className="mg-link" onClick={() => act((c) => cancelMission(c, m.id))}>{t('Hacerle volver', 'Recall')}</button>
                </div>
              ) : (
                <div className="mg-scout__idle">
                  <p>{t('Está libre. Mándale a buscar jugadores.', 'Available. Send him to find players.')}</p>
                  <button type="button" className="mg-btn mg-btn--primary mg-btn--sm" onClick={() => setMission({ scoutId: scout.id, region: scout.region || 'UEFA', line: null, age: 'any', months: 1 })}><Send size={14} />{t('Nueva misión', 'New assignment')}</button>
                </div>
              )}
              <footer><small>{money(scout.wage, lang)}/{t('sem', 'wk')}</small><button type="button" className="mg-link is-danger" onClick={() => act((c) => fireScout(c, scout.id))}>{t('Despedir', 'Dismiss')}</button></footer>
            </article>
          );
        })}
        {!career.scouting.scouts.length && <Empty icon={Binoculars} title={t('No tienes ojeadores', 'No scouts')}>{t('Contrata uno para descubrir jugadores.', 'Hire one to discover players.')}</Empty>}
      </div>

      <h3 className="mg-h3"><FileText size={16} />{t('Informes', 'Reports')}</h3>
      <div className="mg-report-list">
        {reports.slice(0, 60).map((r) => {
          const club = teamInfo(career, r.player.clubId);
          return (
            <button type="button" key={r.id} className={`mg-report-row is-${r.verdict}`} onClick={() => setSheet({ type: 'player', id: r.id })}>
              <Portrait player={r.player} size={40} kit={club?.color || '#334'} />
              <span className="mg-row__main"><b>{r.player.name}</b><small>{club ? <><Crest team={club} size={13} />{club.short || club.name}</> : t('Libre', 'Free')} · {posLabel(r.player.pos, lang)} · {r.player.age}</small></span>
              <OvrBadge value={r.player.ovr} range={r.ovr} size="sm" />
              <span className="mg-report-row__pot"><small>POT</small>{r.pot[0]}-{r.pot[1]}</span>
              <span className="mg-report-row__verdict">{verdictText(r.verdict, lang)}</span>
              <span className={`mg-interest-dot is-${interestLabel(r.interest)}`}>{L[lang].interest[interestLabel(r.interest)]}</span>
            </button>
          );
        })}
        {!reports.length && <Empty icon={FileText} title={t('Aún no hay informes', 'No reports yet')}>{t('Los ojeadores mandan informes cada semana mientras están de misión.', 'Scouts send reports every week while on assignment.')}</Empty>}
      </div>

      <HireSheet open={hiring} onClose={() => setHiring(false)} />
      {mission && (
        <Sheet open onClose={() => setMission(null)} title={t('Nueva misión', 'New assignment')}>
          <div className="mg-form">
            <label>{t('¿Dónde busca?', 'Where?')}
              <div className="mg-chips mg-chips--wrap">{[...REGIONS, 'world'].map((r) => <button type="button" key={r} className={mission.region === r ? 'is-active' : ''} onClick={() => setMission({ ...mission, region: r })}><Globe size={13} />{REGION_NAME[lang][r]}</button>)}</div>
            </label>
            <label>{t('¿Qué posición?', 'Which position?')}
              <div className="mg-chips mg-chips--wrap">{[[null, t('Cualquiera', 'Any')], ['GK', t('Porteros', 'Keepers')], ['DF', t('Defensas', 'Defenders')], ['MF', t('Medios', 'Midfielders')], ['FW', t('Delanteros', 'Forwards')]].map(([id, label]) => <button type="button" key={label} className={mission.line === id ? 'is-active' : ''} onClick={() => setMission({ ...mission, line: id })}>{label}</button>)}</div>
            </label>
            <label>{t('¿Qué tipo de jugador?', 'What kind of player?')}
              <div className="mg-chips mg-chips--wrap">{[['any', t('Cualquiera', 'Any')], ['young', t('Jóvenes promesas', 'Young prospects')], ['prime', t('En su mejor momento', 'In their prime')], ['veteran', t('Veteranos', 'Veterans')]].map(([id, label]) => <button type="button" key={id} className={mission.age === id ? 'is-active' : ''} onClick={() => setMission({ ...mission, age: id })}>{label}</button>)}</div>
            </label>
            <label>{t('¿Cuánto tiempo?', 'How long?')}
              <div className="mg-chips">{[1, 3, 6].map((m) => <button type="button" key={m} className={mission.months === m ? 'is-active' : ''} onClick={() => setMission({ ...mission, months: m })}>{t(`${m} ${m === 1 ? 'mes' : 'meses'}`, `${m} month${m > 1 ? 's' : ''}`)}</button>)}</div>
            </label>
            <button type="button" className="mg-btn mg-btn--primary" onClick={() => { act((c) => startMission(c, mission)); setMission(null); }}><Send size={15} />{t('Enviar ojeador', 'Send scout')}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function HireSheet({ open, onClose }) {
  const { career, lang, t, act } = useManager();
  const candidates = useMemo(() => (open ? scoutCandidates(career, 6) : []), [open, career, career.scouting.hired]);
  return (
    <Sheet open={open} onClose={onClose} title={t('Ojeadores disponibles', 'Available scouts')}>
      <div className="mg-list">
        {candidates.map((c) => (
          <div key={c.id} className="mg-row">
            <Portrait player={{ id: c.id, age: 50 }} size={40} kit="#1d2a36" />
            <span className="mg-row__main"><b>{c.name}</b><small>{REGION_NAME[lang][c.region]} · {t('Exp.', 'Exp.')} <Stars value={c.exp} label="exp" /> · {t('Ojo', 'Eye')} <Stars value={c.judgment} label="judgment" /></small></span>
            <span className="mg-row__value">{money(c.wage, lang)}/{t('sem', 'wk')}</span>
            <button type="button" className="mg-btn mg-btn--primary mg-btn--sm" onClick={() => { act((x) => hireScout(x, c)); onClose(); }}>{t('Contratar', 'Hire')}</button>
          </div>
        ))}
      </div>
      <p className="mg-muted">{t('Puedes tener hasta 4 ojeadores. Un buen «ojo» te da informes más precisos.', 'Up to 4 scouts. A better "eye" means more accurate reports.')}</p>
    </Sheet>
  );
}

export { Pill, Flag, X };
