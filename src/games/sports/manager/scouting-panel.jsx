import React, { useState } from 'react';
import { Radar, ScanSearch, Star, MapPin, Clock3 } from 'lucide-react';
import { SCOUT_LEVELS, getRecruitmentFinances } from './engine.js';
import { getPlayerAge } from './player-age.js';
import { displayDate } from './preparation.jsx';
import { RecruitmentCalendar, formatMoney } from './market-panel.jsx';

const stages = ['fit', 'potential', 'financial', 'complete'];
const levelLabels = { local: ['Red local', 'Local network'], professional: ['Red profesional', 'Professional network'], elite: ['Red de élite', 'Elite network'] };
const stageLabels = { fit: ['Encaje táctico', 'Tactical fit'], potential: ['Proyección', 'Future development'], financial: ['Evaluación financiera', 'Financial assessment'], complete: ['Informe completo', 'Full report'] };

export default function ScoutingPanel({ state, summary, dispatch, t, lang, Badge, onTarget }) {
  const [level, setLevel] = useState('professional');
  const [country, setCountry] = useState('all');
  const [focus, setFocus] = useState('prospect');
  const [position, setPosition] = useState('all');
  const [minAge, setMinAge] = useState(16);
  const [maxAge, setMaxAge] = useState(21);
  const [duration, setDuration] = useState(30);
  const [maxValue, setMaxValue] = useState('');
  const [reportFilter, setReportFilter] = useState('all');
  const missions = state.scoutMissions || [];
  const activeMissions = missions.filter(mission => mission.status === 'active');
  const disabled = Boolean(state.activeMatch);
  const config = SCOUT_LEVELS.find(item => item.id === level);
  const cost = (config?.costPerDay || 0) * duration;
  const countries = [...(state.world.countries || [])].sort((a, b) => (a.name_es || '').localeCompare(b.name_es || ''));
  const clubMap = new Map(state.world.clubs.map(club => [club.id, club]));
  const playerMap = new Map(state.world.players.map(player => [player.id, player]));
  const reports = (state.scoutReports || []).filter(report => reportFilter === 'all' || (state.shortlist || []).includes(report.playerId));
  return <div className="fm-recruitment">
    <div className="fm-section-heading"><div><span className="fm-kicker">{t('LA RED DE TALENTO', 'THE TALENT NETWORK')}</span><h2>{t('Ve más allá del nombre.', 'Look beyond the name.')}</h2></div><Radar size={33} /></div>
    <RecruitmentCalendar {...{state, summary, dispatch, t, lang}} />
    <section className="fm-panel fm-scout-assignment">
      <div className="fm-section-heading"><h3>{t('Encarga una misión', 'Commission an assignment')}</h3><span className="fm-pill">{activeMissions.length}/3 {t('en curso', 'active')}</span></div>
      <p className="fm-note">{t('Elige una red y un perfil. Con los días llegarán el análisis táctico, la proyección y la valoración económica. La experiencia ayuda a encontrar candidatos; el juicio mejora la precisión del informe.', 'Choose a network and a profile. Tactical analysis, development outlook and financial assessment arrive over time. Experience helps discover candidates; judgment improves the report’s precision.')}</p>
      <div className="fm-scout-staff" role="group" aria-label={t('Nivel de la red de ojeo', 'Scouting network level')}>{SCOUT_LEVELS.map(scout => <button key={scout.id} aria-pressed={level === scout.id} disabled={disabled} onClick={() => setLevel(scout.id)}><strong>{t(...levelLabels[scout.id])}</strong><span className="fm-scout-stars" aria-label={`${scout.judgment} ${t('de 5 estrellas', 'out of 5 stars')}`}>{'★'.repeat(scout.judgment)}{'☆'.repeat(Math.max(0, 5 - scout.judgment))}</span><small>{t('Experiencia', 'Experience')} {scout.experience}/5 · {t('Juicio', 'Judgment')} {scout.judgment}/5<br />{formatMoney(scout.costPerDay, lang)} / {t('día', 'day')}</small></button>)}</div>
      <form className="fm-scout-assignment" onSubmit={event => { event.preventDefault(); dispatch({ type: 'START_SCOUTING', country, position, minAge: Number(minAge), maxAge: Number(maxAge), maxValue: maxValue === '' ? undefined : Number(maxValue), focus, level, duration: Number(duration) }); }}>
        <div className="fm-scout-filters">
          <label>{t('Objetivo del ojeo', 'Scouting focus')}<select value={focus} onChange={event => { setFocus(event.target.value); setMaxAge(event.target.value === 'prospect' ? 21 : 34); }}><option value="prospect">{t('Jóvenes promesas', 'Young prospects')}</option><option value="first-team">{t('Primer equipo', 'First team')}</option></select></label>
          <label>{t('Nacionalidad del jugador', 'Player nationality')}<select value={country} onChange={event => setCountry(event.target.value)}><option value="all">{t('Todo el mundo', 'Worldwide')}</option>{countries.map(item => <option key={item.fifa} value={item.fifa}>{item[lang === 'es' ? 'name_es' : 'name_en'] || item.fifa}</option>)}</select></label>
          <label>{t('Posición buscada', 'Target position')}<select value={position} onChange={event => setPosition(event.target.value)}>{[['all', 'Cualquiera', 'Any'], ['GK', 'Portero', 'Goalkeeper'], ['DF', 'Defensa', 'Defender'], ['MF', 'Centrocampista', 'Midfielder'], ['FW', 'Delantero', 'Forward']].map(([id, es, en]) => <option key={id} value={id}>{t(es, en)}</option>)}</select></label>
          <label>{t('Edad mínima', 'Minimum age')}<input type="number" min="16" max="45" value={minAge} required onChange={event => setMinAge(event.target.value)} /></label>
          <label>{t('Edad máxima', 'Maximum age')}<input type="number" min="16" max="45" value={maxAge} required onChange={event => setMaxAge(event.target.value)} /></label>
          <label>{t('Duración de la misión', 'Assignment duration')}<select value={duration} onChange={event => setDuration(Number(event.target.value))}>{[14,30,60].map(days => <option key={days} value={days}>{days} {t('días', 'days')}</option>)}</select></label>
          <label>{t('Valor máximo (€)', 'Maximum value (€)')}<input type="number" min="0" step="100000" value={maxValue} placeholder={t('Sin límite', 'No limit')} onChange={event => setMaxValue(event.target.value)} /></label>
        </div>
        <div className="fm-section-heading"><p className="fm-note">{t('Se abona al iniciar la misión. Cancelarla libera la red, sin reembolso.', 'Paid when the assignment starts. Cancelling frees the network, without a refund.')}</p><button type="submit" className="fm-button fm-primary" disabled={disabled || activeMissions.length >= 3 || cost > getRecruitmentFinances(state).availableBudget}><ScanSearch size={17} />{t('Iniciar misión de ojeo', 'Start scouting assignment')} · {formatMoney(cost, lang)}</button></div>
      </form>
    </section>
    {missions.length > 0 && <section className="fm-scout-missions" aria-label={t('Misiones de ojeo', 'Scouting assignments')}>{missions.slice(0, 9).map(mission => <article className="fm-scout-mission" key={mission.id}><div><strong><MapPin size={14} /> {t(...(levelLabels[mission.level] || levelLabels.local))} · {mission.filters?.country === 'all' || !mission.filters?.country ? t('Todo el mundo', 'Worldwide') : countries.find(item => item.fifa === mission.filters.country)?.[lang === 'es' ? 'name_es' : 'name_en'] || mission.filters.country}</strong><span className="fm-pill">{mission.status === 'active' ? `${Math.round(mission.progress || 0)}%` : mission.status === 'cancelled' ? t('Cancelada', 'Cancelled') : t('Terminada', 'Completed')}</span></div><progress max="100" value={mission.progress || 0} aria-label={t('Progreso de la misión', 'Assignment progress')} /><div><p>{displayDate(mission.startDate, lang)} → {displayDate(mission.endDate, lang)}<br />{mission.discoveredCount || 0} {t('candidatos localizados', 'candidates found')} · {formatMoney(mission.cost, lang)}</p>{mission.status === 'active' && <button className="fm-text-button" disabled={disabled} onClick={() => dispatch({ type: 'CANCEL_SCOUTING', missionId: mission.id })}>{t('Cancelar misión', 'Cancel assignment')}</button>}</div></article>)}</section>}
    <div className="fm-section-heading"><h3>{t('Informes de la red', 'Scouting reports')} · {reports.length}</h3><label>{t('Mostrar informes', 'Show reports')}<select value={reportFilter} onChange={event => setReportFilter(event.target.value)}><option value="all">{t('Todos', 'All')}</option><option value="shortlist">{t('En seguimiento', 'Shortlisted')}</option></select></label></div>
    <div className="fm-report-grid">{reports.map(report => { const player = playerMap.get(report.playerId); if (!player) return null; const stage = report.stage || 'complete'; const step = stages.indexOf(stage); const followed = (state.shortlist || []).includes(player.id); return <article className="fm-panel fm-scout-report" key={report.id}>
      <div className="fm-section-heading"><span className="fm-kicker">{t(...(stageLabels[stage] || stageLabels.complete))}</span><Badge item={clubMap.get(player.clubId)} size={30} /></div><div className="fm-report-stages" aria-label={`${t('Fase', 'Stage')} ${step + 1}/4`}>{stages.map((id, i) => <span key={id} className={i <= step ? 'is-complete' : ''} />)}</div>
      <h3>{player.name}</h3><p>{clubMap.get(player.clubId)?.name || t('Libre', 'Free agent')} · {getPlayerAge(player, state.date, state.year)} {t('años', 'years')} · {player.position}<br />{player.real ? t('Jugador real de la época', 'Real player from this era') : t('Jugador generado', 'Generated player')}</p>
      <div className="fm-deal-terms"><span>{t('Nivel estimado por el ojeador', 'Scout rating estimate')}<strong>{report.ratingMin ?? player.rating}–{report.ratingMax ?? player.rating}</strong></span><span>{t('Potencial estimado', 'Potential estimate')}<strong>{step >= 1 ? `${report.potentialMin}–${report.potentialMax}` : t('En estudio', 'Under review')}</strong></span></div>
      <p>{report.fitSummary || report.recommendation}</p><dl className="fm-report-dossier">{report.riskSummary && <div><dt>{t("Estado observado", "Observed status")}</dt><dd>{report.riskSummary}</dd></div>}<div><dt>{t('Valoración económica', 'Financial estimate')}</dt><dd>{step >= 2 ? `${formatMoney(report.valueMin ?? player.value, lang)}–${formatMoney(report.valueMax ?? player.value, lang)}` : t('Pendiente de análisis', 'Analysis pending')}</dd></div><div><dt>{t('Salario estimado', 'Expected wage')}</dt><dd>{step >= 2 ? `${formatMoney(report.wageEstimate ?? player.wage, lang)} / ${t('semana', 'week')}` : '—'}</dd></div><div><dt>{t('Confianza', 'Confidence')}</dt><dd>{typeof report.confidence === 'number' ? `${report.confidence}%` : report.confidence || t('Parcial', 'Partial')}</dd></div><div><dt>{t('Actualizado', 'Updated')}</dt><dd>{displayDate(report.updatedDate, lang)}</dd></div></dl>
      <div className="fm-deal-buttons"><button className="fm-button fm-small" disabled={disabled || player.clubId === state.clubId} onClick={() => onTarget(player.id)}>{t('Estudiar fichaje', 'Consider signing')}</button><button className="fm-button fm-small" aria-pressed={followed} disabled={disabled} onClick={() => dispatch({ type: 'TOGGLE_SHORTLIST', playerId: player.id })}><Star size={14} fill={followed ? 'currentColor' : 'none'} />{followed ? t('En seguimiento', 'Shortlisted') : t('Seguir jugador', 'Shortlist player')}</button></div>
    </article>; })}</div>
    {!reports.length && <p className="fm-empty"><Clock3 size={21} /><br />{activeMissions.length ? t('Tu red está trabajando. Avanza el calendario para recibir los primeros informes.', 'Your network is working. Advance the calendar to receive the first reports.') : t('Define el perfil que necesita tu equipo y envía a tus ojeadores.', 'Define the profile your team needs and send your scouts.')}</p>}
    <p className="fm-note">{t('Las fases y los intervalos reflejan la opinión simulada del ojeador. El potencial no garantiza una carrera futura y no convierte a un jugador generado en histórico.', 'Stages and ranges reflect the simulated scout’s opinion. Potential does not guarantee future development or turn a generated player into a historical one.')}</p>
  </div>;
}
