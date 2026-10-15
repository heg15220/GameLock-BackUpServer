import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, BatteryCharging, Moon, Dumbbell, Plane, Repeat } from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, ChoiceRow, Sheet } from './components.jsx';
import { compName, fixtureLabel, monthName, teamInfo, teamName, weekdayNames, shortDate } from './format.js';
import { L } from './texts.js';
import { userTeams } from '../career/career.js';
import { windowOpen } from '../career/calendar.js';
import { addDays, iso, weekday } from '../career/util.js';
import { FixtureList } from './Competitions.jsx';

export default function Calendar() {
  const { career, lang, t, act } = useManager();
  const [cursor, setCursor] = useState(() => career.date.slice(0, 7));
  const [selected, setSelected] = useState(null);
  const [y, m] = cursor.split('-').map(Number);
  const teams = userTeams(career);
  const mine = useMemo(() => {
    const map = {};
    for (const f of Object.values(career.season.fixtures)) {
      if (f.cancelled || !(teams.includes(f.home) || teams.includes(f.away))) continue;
      (map[f.date] ||= []).push(f);
    }
    return map;
  }, [career.version, career.season]);
  const first = iso(y, m, 1);
  const offset = (weekday(first) + 6) % 7; // Monday first
  const start = addDays(first, -offset);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const shift = (d) => {
    const date = new Date(Date.UTC(y, m - 1 + d, 1));
    setCursor(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  };
  const names = weekdayNames(lang);
  const header = [1, 2, 3, 4, 5, 6, 0].map((i) => names[i].slice(0, 3));
  const dates = career.season.dates;
  const club = teamInfo(career, career.clubId);

  const dayKind = (date) => {
    if (mine[date]) return null;
    if (mine[addDays(date, -1)]) return 'recovery';
    if (mine[addDays(date, 1)]) return 'rest';
    return 'training';
  };

  return (
    <div className="mg-calendar">
      <div className="mg-calendar__main">
        <div className="mg-calendar__head">
          <h2>{t('CALENDARIO', 'CALENDAR')}</h2>
          <Crest team={club} size={34} />
          <div className="mg-calendar__nav">
            <button type="button" className="mg-icon-btn" onClick={() => shift(-1)} aria-label="prev"><ChevronLeft size={18} /></button>
            <b>{monthName(m - 1, lang)} {y}</b>
            <button type="button" className="mg-icon-btn" onClick={() => shift(1)} aria-label="next"><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="mg-month" role="grid">
          {header.map((h) => <span key={h} className="mg-month__wd" role="columnheader">{h}</span>)}
          {days.map((date) => {
            const inMonth = date.slice(0, 7) === cursor;
            const fixtures = mine[date] || [];
            const kind = dayKind(date);
            const isToday = date === career.date;
            const window = windowOpen(date, dates);
            return (
              <button type="button" key={date} role="gridcell" className={`mg-day ${inMonth ? '' : 'is-out'} ${isToday ? 'is-today' : ''} ${fixtures.length ? 'has-match' : ''} ${window ? 'is-window' : ''} ${date < career.date ? 'is-past' : ''}`}
                onClick={() => fixtures.length && setSelected(fixtures[0].id)} style={fixtures.length ? { '--tile': fixtures[0].comp.startsWith('N') || fixtures[0].national ? '#c9a227' : club.color } : undefined}>
                <span className="mg-day__n">{Number(date.slice(8))}</span>
                {fixtures.map((f) => {
                  const own = teams.includes(f.home) ? f.home : f.away;
                  const rival = f.home === own ? f.away : f.home;
                  const comp = career.season.comps[f.comp];
                  return (
                    <span key={f.id} className="mg-day__match">
                      <Crest team={teamInfo(career, rival)} size={26} />
                      <small>{f.home === own ? t('Local', 'Home') : t('Visitante', 'Away')}</small>
                      <em>{f.done ? `${f.hg}-${f.ag}` : (comp?.type === 'league' ? t('LIGA', 'LEAGUE') : comp?.type === 'cup' ? t('COPA', 'CUP') : comp?.type === 'friendly' ? t('AMIST.', 'FRIENDLY') : (compName(comp, lang) || '').slice(0, 10).toUpperCase())}</em>
                    </span>
                  );
                })}
                {!fixtures.length && inMonth && kind && (
                  <span className="mg-day__icon" title={kind}>{kind === 'recovery' ? <BatteryCharging size={14} /> : kind === 'rest' ? <Moon size={14} /> : <Dumbbell size={14} />}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <aside className="mg-calendar__side">
        <span className="mg-calendar__year">{y}</span>
        <strong>{monthName(m - 1, lang).toUpperCase()}</strong>
        <p className={windowOpen(career.date, dates) ? 'is-open' : ''}><Repeat size={14} />{windowOpen(career.date, dates) ? t('Mercado de fichajes abierto', 'Transfer window open') : t('Mercado de fichajes cerrado', 'Transfer window closed')}</p>
        <h4>{t('PLAN DE ENTRENAMIENTO', 'TRAINING PLAN')}</h4>
        <ChoiceRow label={t('Plan semanal', 'Weekly plan')} value={career.training} onChange={(v) => act((c) => { c.training = v; })} options={['recovery', 'balanced', 'intensive'].map((id) => ({ id, label: L[lang].training[id] }))} />
        <p className="mg-muted">{L[lang].trainingHelp[career.training]}</p>
        <ul className="mg-calendar__legend">
          <li><BatteryCharging size={14} />{t('Día de recuperación', 'Recovery day')}</li>
          <li><Moon size={14} />{t('Descanso antes del partido', 'Rest before the match')}</li>
          <li><Dumbbell size={14} />{t('Entrenamiento', 'Training')}</li>
          <li><span className="mg-swatch is-window" />{t('Mercado abierto', 'Window open')}</li>
        </ul>
        <h4>{t('FECHAS CLAVE', 'KEY DATES')}</h4>
        <ul className="mg-calendar__keys">
          <li><b>{shortDate(dates.summerClose, lang)}</b>{t('Cierre del mercado de verano', 'Summer window closes')}</li>
          <li><b>{shortDate(dates.winterOpen, lang)} – {shortDate(dates.winterClose, lang)}</b>{t('Mercado de invierno', 'Winter window')}</li>
          <li><b>{shortDate(dates.cupFinal, lang)}</b>{t('Final de copa', 'Cup final')}</li>
          <li><b>{shortDate(dates.continentalFinal, lang)}</b>{t('Final continental', 'Continental final')}</li>
          {career.national && <li><b>{shortDate(dates.tournament.groups[0], lang)} – {shortDate(dates.tournament.final, lang)}</b>{t('Torneo de selecciones', 'International tournament')}</li>}
        </ul>
      </aside>
      {selected && (() => {
        const f = career.season.fixtures[selected];
        return (
          <Sheet open onClose={() => setSelected(null)} title={fixtureLabel(career, f, lang)}>
            <FixtureList fixtures={[f]} />
            {f.done && f.ev?.length > 0 && <ul className="mg-scorers">{f.ev.map((e, i) => <li key={i} className={`is-${e.s}`}><b>{e.m}'</b> {career.world.players[e.p]?.name || '—'}</li>)}</ul>}
            {f.attendance && <p className="mg-muted">{t('Espectadores', 'Attendance')}: {f.attendance.toLocaleString(lang === 'es' ? 'es-ES' : 'en-GB')}</p>}
            {!f.done && <p className="mg-muted">{t('Partido contra', 'Match against')} {teamName(career, teams.includes(f.home) ? f.away : f.home, lang)}.</p>}
          </Sheet>
        );
      })()}
    </div>
  );
}

export { Plane };
