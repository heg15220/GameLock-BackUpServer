import React from 'react';
import { getDivisionRules, isPromotionEligible } from './divisions.js';

export function getStandingZones(state, competitionId, rows) {
  const clubs = new Map(state.world.clubs.map((club) => [club.id, club]));
  const zones = new Map();
  for (const rule of getDivisionRules(state.world, state.year)) {
    if (rule.upperId === competitionId) {
      for (const row of rows.slice(-Math.min(rule.automaticRelegation, rows.length))) zones.set(row.clubId, 'relegation');
      if (['relegation', 'french'].includes(rule.playoff?.format)) {
        const row = rows[rows.length - rule.automaticRelegation - 1];
        if (row) zones.set(row.clubId, 'barrage');
      }
    }
    if (rule.lowerId === competitionId) {
      const upper = state.world.competitions.find((c) => c.id === rule.upperId);
      const eligible = rows.filter((row) => isPromotionEligible(clubs.get(row.clubId), upper, state.world));
      eligible.slice(0, rule.automaticPromotion).forEach((row) => zones.set(row.clubId, 'promotion'));
      eligible.slice(rule.automaticPromotion, rule.automaticPromotion + (rule.playoff?.entrants || 0)).forEach((row) => zones.set(row.clubId, 'playoff'));
    }
  }
  return zones;
}

const zoneLabel = (zone, t) => ({ promotion: t('Ascenso directo', 'Direct promotion'), playoff: t('Promoción de ascenso', 'Promotion playoff'), relegation: t('Descenso directo', 'Direct relegation'), barrage: t('Promoción de permanencia', 'Relegation playoff') }[zone]);
export function ZoneLabel({ zone, t }) {
  return zone ? <span className={`fm-zone fm-zone-${zone}`} title={zoneLabel(zone, t)} aria-label={zoneLabel(zone, t)}>{({ promotion: '↑', playoff: '↗', relegation: '↓', barrage: '↔' })[zone]}</span> : null;
}

export default function DivisionPanel({ state, competitionId, t, Badge }) {
  const rules = getDivisionRules(state.world, state.year).filter((r) => r.upperId === competitionId || r.lowerId === competitionId);
  const competitions = new Map(state.world.competitions.map((c) => [c.id, c]));
  const clubs = new Map(state.world.clubs.map((c) => [c.id, c]));
  const playoffs = (state.divisionPlan?.playoffs || []).filter((p) => p.upperId === competitionId || p.lowerId === competitionId);
  const movements = (state.divisionPlan?.movements || state.divisionChanges || []).filter((m) => m.fromId === competitionId || m.toId === competitionId);
  return <section className="fm-division-panel">
    <div className="fm-division-heading"><h3>{t('Ascensos y descensos', 'Promotion & relegation')}</h3><span className="fm-kicker">{t('LA PIRÁMIDE', 'THE PYRAMID')}</span></div>
    {!rules.length ? <p className="fm-note">{['USA', 'AUS', 'CAN'].includes(competitions.get(competitionId)?.country_fifa_code) ? t('Liga cerrada: no hay ascensos ni descensos.', 'Closed league: no promotion or relegation.') : t('No hay una división adyacente cargada para esta liga. El club permanece en esta categoría.', 'No adjacent division is loaded for this league. Clubs remain in this division.')}</p> : <>
      <div className="fm-division-rules">{rules.map((rule) => <details key={rule.id}><summary><span>{competitions.get(rule.lowerId)?.name} <b>↔</b> {competitions.get(rule.upperId)?.name}</span><small>{rule.automaticPromotion} {t('ascensos directos', 'direct promotions')} · {rule.automaticRelegation} {t('descensos directos', 'direct relegations')}{rule.playoff ? ` + ${t('promoción', 'playoff')}` : ''}</small></summary><p>{rule.coverage === 'documented-format' ? t('Formato deportivo documentado para esta época.', 'Sporting format documented for this era.') : t('Formato aproximado para esta época.', 'Approximate format for this era.')}</p>{rule.notes.map((note, i) => <p key={i}>{note}</p>)}{rule.sources.map((url, i) => <a href={url} key={url} target="_blank" rel="noreferrer">{t('Reglamento y fuente', 'Rules & source')} {i + 1} ↗</a>)}</details>)}</div>
      <p className="fm-zone-legend">{['promotion', 'playoff', 'barrage', 'relegation'].map((zone) => <span key={zone}><ZoneLabel zone={zone} t={t} />{zoneLabel(zone, t)}</span>)}</p>
      <p className="fm-note">{t('Las zonas son orientativas durante la liga. Los filiales no elegibles se omiten; los desempates, las promociones y los márgenes reglamentarios se resuelven al terminar.', 'Table zones are indicative during the league. Ineligible reserves are skipped; tiebreaks, playoffs and regulatory point gaps are resolved at season end.')}</p>
    </>}
    {(state.divisionPlan?.notes || []).length > 0 && <details className="fm-division-movements"><summary>{t('Excepciones de esta temporada', 'Exceptions this season')}</summary>{state.divisionPlan.notes.map((note, i) => <p key={i}>{note}</p>)}</details>}
    {playoffs.length > 0 && <div className="fm-playoff-grid">{playoffs.map((playoff) => <article className="fm-playoff-card" key={playoff.id}><span className="fm-kicker">{playoff.complete ? t('PROMOCIÓN RESUELTA', 'PLAYOFF COMPLETE') : t('PROMOCIÓN EN CURSO', 'PLAYOFF IN PROGRESS')}</span><h4>{playoff.name}</h4>{playoff.winnerId && <p><Badge item={clubs.get(playoff.winnerId)} size={24} /><strong>{clubs.get(playoff.winnerId)?.name}</strong>{playoff.winnerId === playoff.incumbentId ? t(' conserva la categoría', ' stays up') : t(' asciende', ' promoted')}</p>}{playoff.ties.map((tie) => <div className="fm-playoff-tie" key={tie.id}><b>{({ preliminary: t('Previa', 'Preliminary'), qualifier: t('Eliminatoria', 'Qualifier'), barrage: t('Permanencia', 'Relegation'), final: t('Final', 'Final') })[tie.id.split(':').at(-1)] || (tie.stage === 0 && playoff.format === 'italian-six' ? t('Previa', 'Preliminary') : t('Semifinal', 'Semi-final'))}</b>{tie.results.length ? tie.results.map((result) => <p key={result.fixture.id}><span>{clubs.get(result.fixture.homeId)?.name}</span><strong>{result.homeGoals}–{result.awayGoals}{result.penalties ? ` (${result.penalties.home}–${result.penalties.away} p.)` : ''}</strong><span>{clubs.get(result.fixture.awayId)?.name}</span></p>) : <p>{clubs.get(tie.a)?.name || t('Por decidir', 'TBD')} · {clubs.get(tie.b)?.name || t('Por decidir', 'TBD')}</p>}</div>)}</article>)}</div>}
    {movements.length > 0 && <details className="fm-division-movements"><summary>{state.divisionPlan ? t('Cambios confirmados para la próxima temporada', 'Confirmed moves for next season') : t('Cambios de categoría de esta temporada', 'Division moves this season')} ({movements.length})</summary>{movements.map((m) => <p key={m.clubId}><Badge item={clubs.get(m.clubId)} size={22} /><strong>{clubs.get(m.clubId)?.name}</strong><span>{competitions.get(m.fromId)?.name} → {competitions.get(m.toId)?.name}</span></p>)}</details>}
  </section>;
}
