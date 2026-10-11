import React from 'react';
import { ArrowLeftRight, ChevronDown, ClipboardList, Goal, HeartPulse, SlidersHorizontal } from 'lucide-react';
import './match-report.css';

export default function MatchReport({ match, clubs, t }) {
  if (!match) return null;
  const home = clubs.get(match.fixture.homeId)?.name || match.fixture.homeId;
  const away = clubs.get(match.fixture.awayId)?.name || match.fixture.awayId;
  const events = match.events.filter((event) => ['goal', 'substitution', 'injury', 'tactics'].includes(event.type));
  const metrics = [
    [t('Tiros', 'Shots'), match.shotsHome, match.shotsAway],
    [t('Goles esperados', 'Expected goals'), match.stats?.shotXgHome ?? match.xgHome, match.stats?.shotXgAway ?? match.xgAway],
    [t('Córners', 'Corners'), match.stats?.cornersHome, match.stats?.cornersAway],
    [t('Faltas', 'Fouls'), match.stats?.foulsHome, match.stats?.foulsAway],
    [t('Posesión', 'Possession'), match.possessionHome, Number.isFinite(match.possessionHome) ? 100 - match.possessionHome : null, '%'],
  ].filter(([, left, right]) => Number.isFinite(left) && Number.isFinite(right));
  return <details className="fm-recap">
    <summary><ClipboardList size={19} /><span>{t('Informe del último partido', 'Last match report')}<strong>{home} {match.homeGoals}–{match.awayGoals} {away}{match.penalties && ` (${match.penalties.home}–${match.penalties.away} p.)`}</strong></span><ChevronDown size={18} /></summary>
    <div className="fm-recap-content">
      <section className="fm-recap-metrics" aria-label={t('Estadísticas del partido', 'Match statistics')}>
        {metrics.map(([label, left, right, suffix = '']) => <div key={label}><span><b>{Number(left.toFixed(2))}{suffix}</b>{label}<b>{Number(right.toFixed(2))}{suffix}</b></span><div className="fm-recap-bar" aria-hidden="true"><i style={{ width: `${left + right ? left / (left + right) * 100 : 50}%` }} /></div></div>)}
        <p>{t('Estadísticas de este encuentro simulado. Revisa el relato para ver cuándo se aplicaron tus decisiones.', 'Statistics from this simulated match. Review the timeline to see when your decisions took effect.')}</p>
      </section>
      <ol className="fm-recap-events">{events.map((event, i) => {
        const Icon = event.type === 'goal' ? Goal : event.type === 'injury' ? HeartPulse : event.type === 'tactics' ? SlidersHorizontal : ArrowLeftRight;
        return <li key={`${event.minute}-${i}`}><time>{event.minute}′</time><Icon size={16} /><span>{event.text}</span></li>;
      })}{!events.length && <li>{t('Sin goles ni cambios registrados.', 'No goals or substitutions recorded.')}</li>}</ol>
    </div>
  </details>;
}
