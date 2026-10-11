import React from 'react';

export function displayDate(value, lang = 'es') {
  if (!value) return '—';
  return new Date(`${value.slice(0, 10)}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function Fitness({ player, t }) {
  const condition = Math.max(0, Math.min(100, Math.round(player.condition ?? 100)));
  const injured = player.injury?.daysRemaining > 0;
  return <span className={`fm-fitness ${injured ? 'is-injured' : condition < 60 ? 'is-exhausted' : condition < 80 ? 'is-tired' : ''}`}>
    <span className="fm-fitness-value">{injured ? '✚ ' : ''}{condition}%</span>
    <span className="fm-fitness-track" aria-hidden="true"><i style={{ width: `${condition}%` }} /></span>
    <small>{injured ? `${player.injury.name} · ${player.injury.daysRemaining} ${t('días', 'days')}` : condition < 60 ? t('Fatiga alta', 'High fatigue') : condition < 80 ? t('Cansado', 'Tired') : t('Disponible', 'Available')}</small>
  </span>;
}

export function MedicalRibbon({ summary, onOpen, t, lang }) {
  return <div className="fm-medical-ribbon">
    <span><b>{displayDate(summary.date, lang)}</b>{summary.nextMatchDate && <small>{t('Próximo partido', 'Next match')}: {displayDate(summary.nextMatchDate, lang)}</small>}</span>
    <span><b>{summary.nextMatchDate ? `${summary.restDays} ${t('días', 'days')}` : '—'}</b><small>{summary.nextMatchDate ? t('hasta el próximo partido', 'until the next match') : t('Sin partido asignado', 'No match scheduled')}</small></span>
    <button onClick={onOpen}><b>{Math.round(summary.averageCondition ?? 100)}% · {summary.injuredCount ?? 0} {t('bajas', 'injuries')}</b><small>{t('Ver preparación y parte médico', 'View training & medical report')} ↗</small></button>
  </div>;
}

export default function PreparationPanel({ state, squad, summary, dispatch, t, lang }) {
  const injured = squad.filter((p) => p.injury?.daysRemaining > 0);
  const tired = squad.filter((p) => !p.injury?.daysRemaining && p.condition < 80);
  const plans = [
    ['recovery', t('Recuperación', 'Recovery'), t('Prioriza el descanso y la recuperación física. El ritmo competitivo mejora menos.', 'Prioritises rest and physical recovery. Match sharpness improves less.')],
    ['balanced', t('Equilibrado', 'Balanced'), t('Combina recuperación y preparación para mantener al equipo en forma.', 'Combines recovery and preparation to keep the team ready.')],
    ['intensive', t('Intensivo', 'Intensive'), t('Trabaja el ritmo competitivo a costa de más carga física y riesgo de lesión.', 'Builds match sharpness at the cost of more workload and injury risk.')],
  ];
  return <>
    <div className="fm-section-heading"><div><span className="fm-kicker">{t('CIENCIA DEL DEPORTE', 'SPORTS SCIENCE')}</span><h2>{t('Llegar a tiempo. Llegar bien.', 'Ready for the next whistle.')}</h2></div><span className="fm-pill">{displayDate(summary.date, lang)}</span></div>
    <div className="fm-stats fm-stats-four">
      <div className="fm-stat"><span>{t('Condición media', 'Average condition')}</span><strong>{Math.round(summary.averageCondition ?? 100)}%</strong></div>
      <div className="fm-stat"><span>{t('En recuperación', 'Recovering')}</span><strong>{injured.length}</strong></div>
      <div className="fm-stat"><span>{t('Necesitan descanso', 'Need rest')}</span><strong>{tired.length}</strong></div>
      <div className="fm-stat"><span>{t('Próximo partido', 'Next match')}</span><strong>{summary.nextMatchDate ? `${summary.restDays} ${t('días', 'days')}` : '—'}</strong><small>{displayDate(summary.nextMatchDate, lang)}</small></div>
    </div>
    <section className="fm-panel fm-training"><div className="fm-section-heading"><h3>{t('Plan de entrenamiento', 'Training plan')}</h3><span className="fm-kicker">{t('ENTRE PARTIDOS', 'BETWEEN MATCHES')}</span></div><p>{t('La carga se aplica al avanzar el calendario. Los minutos disputados, el descanso, la edad y el ritmo competitivo afectan al rendimiento y al riesgo de lesión.', 'Training load applies as the calendar advances. Minutes played, rest, age and match sharpness affect performance and injury risk.')}</p>
      <div className="fm-training-plans" role="group" aria-label={t('Intensidad de entrenamiento', 'Training intensity')}>{plans.map(([intensity, name, description]) => <button key={intensity} aria-pressed={state.trainingIntensity === intensity} className={state.trainingIntensity === intensity ? 'is-active' : ''} disabled={Boolean(state.activeMatch) || state.phase === 'complete'} onClick={() => dispatch({ type: 'SET_TRAINING', intensity })}><span>{name}</span><small>{description}</small><b aria-hidden="true">{state.trainingIntensity === intensity ? '✓' : '↗'}</b></button>)}</div>
    </section>
    <section className="fm-panel fm-medical"><div className="fm-section-heading"><h3>{t('Parte médico', 'Medical report')}</h3><span className="fm-pill">{injured.length ? `${injured.length} ${t('bajas', 'unavailable')}` : t('Sin lesionados', 'No injuries')}</span></div>
      {injured.length ? <div className="fm-injury-list">{injured.map((p) => <article key={p.id}><span className="fm-medical-cross" aria-hidden="true">+</span><div><strong>{p.name}</strong><p>{p.injury.name}</p></div><span><b>{p.injury.daysRemaining} {t('días', 'days')}</b><small>{t('de recuperación', 'recovery remaining')}</small></span></article>)}</div> : <p>{t('Toda la plantilla está disponible. Alterna titulares y suplentes para gestionar la carga.', 'The whole squad is available. Rotate starters and substitutes to manage workload.')}</p>}
      <p className="fm-note">{t('El plazo indica la recuperación física simulada. Tras el alta, el jugador puede necesitar descanso y minutos para recuperar condición y ritmo.', 'The estimate reflects simulated physical recovery. After returning, players may need rest and minutes to rebuild condition and sharpness.')}</p>
    </section>
    <div className="fm-section-heading"><h3>{t('Carga de la plantilla', 'Squad workload')}</h3><button className="fm-button fm-small" disabled={Boolean(state.activeMatch) || state.phase === 'complete'} onClick={() => dispatch({ type: 'AUTO_LINEUP' })}>{t('Alinear según condición', 'Select fit XI')}</button></div>
    <div className="fm-table-scroll"><table className="fm-table fm-health-table"><thead><tr><th>{t('Jugador', 'Player')}</th><th>{t('Condición', 'Condition')}</th><th>{t('Ritmo', 'Sharpness')}</th><th>{t('Minutos', 'Minutes')}</th><th>XI</th></tr></thead><tbody>{[...squad].sort((a, b) => Number(Boolean(b.injury?.daysRemaining)) - Number(Boolean(a.injury?.daysRemaining)) || (a.condition ?? 100) - (b.condition ?? 100)).map((p) => <tr key={p.id}><td><strong>{p.name}</strong><small className="fm-cell-detail">{p.real ? t('Jugador real', 'Real player') : t('Jugador generado', 'Generated player')}</small></td><td><Fitness player={p} t={t} /></td><td>{Math.round(p.sharpness ?? 75)}%</td><td>{p.stats?.minutes ?? 0}′</td><td>{p.selected ? '✓' : '—'}</td></tr>)}</tbody></table></div>
  </>;
}
