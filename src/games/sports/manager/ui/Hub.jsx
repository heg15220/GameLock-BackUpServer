import React, { useEffect, useMemo, useState } from 'react';
import {
  House, Mail, Users, LayoutGrid, ArrowLeftRight, Binoculars, GraduationCap, Trophy, CalendarDays, Briefcase, Flag as FlagIcon,
  Play, Square, MoreHorizontal, Download, LogOut, Save, Radio,
} from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, Sheet } from './components.jsx';
import { longDate, teamInfo, seasonLabel } from './format.js';
import { L } from './texts.js';
import { userFixtureToday, isTournamentRunning } from '../career/career.js';
import { STAGES } from '../career/calendar.js';
import { daysBetween } from '../career/util.js';
import Central from './Central.jsx';
import Inbox from './Inbox.jsx';
import Squad from './Squad.jsx';
import Tactics from './Tactics.jsx';
import Transfers from './Transfers.jsx';
import Scouting from './Scouting.jsx';
import Academy from './Academy.jsx';
import Competitions from './Competitions.jsx';
import Calendar from './Calendar.jsx';
import Office from './Office.jsx';
import National from './National.jsx';
import PlayerSheet from './PlayerSheet.jsx';
import Negotiation from './Negotiation.jsx';
import Moments from './Moments.jsx';
import MatchFlow from './match/MatchFlow.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

export const SECTIONS = [
  { id: 'central', icon: House, es: 'Central', en: 'Home' },
  { id: 'inbox', icon: Mail, es: 'Bandeja', en: 'Inbox' },
  { id: 'squad', icon: Users, es: 'Plantilla', en: 'Squad' },
  { id: 'tactics', icon: LayoutGrid, es: 'Táctica', en: 'Tactics' },
  { id: 'transfers', icon: ArrowLeftRight, es: 'Fichajes', en: 'Transfers' },
  { id: 'scouting', icon: Binoculars, es: 'Ojeadores', en: 'Scouting' },
  { id: 'academy', icon: GraduationCap, es: 'Cantera', en: 'Academy' },
  { id: 'competitions', icon: Trophy, es: 'Competiciones', en: 'Competitions' },
  { id: 'calendar', icon: CalendarDays, es: 'Calendario', en: 'Calendar' },
  { id: 'office', icon: Briefcase, es: 'Oficina', en: 'Office' },
  { id: 'national', icon: FlagIcon, es: 'Selección', en: 'National team', national: true },
];

const PHONE_NAV = ['central', 'squad', 'transfers', 'competitions'];

export function ContinueButton({ size = 'md' }) {
  const { career, advance, advancing, stopAdvance, t, setMatchFixture } = useManager();
  const today = userFixtureToday(career);
  if (advancing) {
    return (
      <button type="button" className={`mg-continue is-running mg-continue--${size}`} onClick={stopAdvance} aria-live="polite">
        <span className="mg-continue__flip" key={advancing.date}>{advancing.date.slice(8)}/{advancing.date.slice(5, 7)}</span>
        <Square size={14} aria-hidden="true" />
        <span className="mg-continue__label">{t('Detener', 'Stop')}</span>
      </button>
    );
  }
  if (career.sacked) return null;
  if (today) {
    return (
      <button type="button" className={`mg-continue is-match mg-continue--${size}`} onClick={() => setMatchFixture(today.id)}>
        <Radio size={size === 'lg' ? 20 : 17} aria-hidden="true" />
        <span className="mg-continue__label">{t('¡Día de partido!', 'Match day!')}</span>
      </button>
    );
  }
  return (
    <button type="button" className={`mg-continue mg-continue--${size}`} onClick={advance}>
      <span className="mg-continue__key" aria-hidden="true"><Play size={12} /></span>
      <span className="mg-continue__label">{t('Continuar', 'Continue')}</span>
    </button>
  );
}

function StageBar() {
  const { career, lang } = useManager();
  const dates = career.season.dates;
  const running = career.national && isTournamentRunning(career);
  const stages = STAGES.filter((s) => s !== 'season-end' && (s !== 'international' || career.national));
  const bounds = {
    'summer-window': [dates.start, dates.summerClose], 'first-half': [dates.summerClose, dates.winterOpen],
    'winter-window': [dates.winterOpen, dates.winterClose], 'second-half': [dates.winterClose, dates.seasonEnd],
    international: [dates.seasonEnd, dates.nextStart],
  };
  const current = career.stage;
  return (
    <ol className="mg-stagebar" aria-label={lang === 'es' ? 'Etapas de la temporada' : 'Season stages'}>
      {stages.map((stage) => {
        const [a, b] = bounds[stage];
        const total = Math.max(1, daysBetween(a, b));
        const done = Math.max(0, Math.min(1, daysBetween(a, career.date) / total));
        const state = career.date > b ? 'done' : career.date >= a ? 'now' : 'next';
        const isWindow = stage.includes('window');
        return (
          <li key={stage} className={`is-${state} ${isWindow ? 'is-window' : ''} ${stage === current ? 'is-current' : ''} ${stage === 'international' && !running && state !== 'done' ? 'is-optional' : ''}`} style={{ '--p': state === 'done' ? 1 : state === 'now' ? done : 0 }}>
            <span>{L[lang].stages[stage]}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function Hub() {
  const { career, lang, t, section, go, sheet, setSheet, matchFixture, setMatchFixture, setMoments, unread, saveState, exportCareer, leave } = useManager();
  const [more, setMore] = useState(false);
  const club = teamInfo(career, career.clubId);
  const sections = useMemo(() => SECTIONS.filter((s) => !s.national || career.national), [career.national]);
  useEffect(() => { if (section.id === 'national' && !career.national) go('central'); }, [section.id, career.national, go]);

  const Body = {
    central: Central, inbox: Inbox, squad: Squad, tactics: Tactics, transfers: Transfers, scouting: Scouting, academy: Academy,
    competitions: Competitions, calendar: Calendar, office: Office, national: National,
  }[section.id] || Central;

  return (
    <div className="mg-hub" style={{ '--club': club?.color || '#2ee6b0' }}>
      <header className="mg-top">
        <button type="button" className="mg-top__brand" onClick={() => go('central')} aria-label={t('Ir a la central', 'Go home')}>
          <span className="mg-logo" aria-hidden="true">MC</span>
          <Crest team={club} size={34} />
          <span className="mg-top__club">
            <strong>{club?.short || club?.name}</strong>
            <small>{career.managerName} · {seasonLabel(career.year)}</small>
          </span>
        </button>
        <div className="mg-top__date">
          <strong>{longDate(career.date, lang)}</strong>
          <small>{L[lang].stages[career.stage]}</small>
        </div>
        <div className="mg-top__actions">
          <span className={`mg-save-dot is-${saveState}`} title={saveState === 'failed' ? t('No se pudo guardar', 'Save failed') : t('Guardado automático', 'Autosave')}><Save size={13} /></span>
          <ContinueButton />
        </div>
      </header>
      <nav className="mg-nav" aria-label={t('Secciones', 'Sections')}>
        {sections.map((s) => (
          <button type="button" key={s.id} className={section.id === s.id ? 'is-active' : ''} aria-current={section.id === s.id ? 'page' : undefined} onClick={() => go(s.id)}>
            <s.icon size={16} aria-hidden="true" />
            <span>{s[lang]}</span>
            {s.id === 'inbox' && unread > 0 && <b className="mg-badge">{unread}</b>}
          </button>
        ))}
      </nav>
      <StageBar />
      <main className="mg-main" key={section.id}>
        <div className="mg-main__inner mg-enter">
          <ErrorBoundary key={section.id} lang={lang} onReset={() => go('central')}><Body params={section.params} /></ErrorBoundary>
        </div>
      </main>
      <nav className="mg-bottom" aria-label={t('Navegación', 'Navigation')}>
        {PHONE_NAV.map((id) => {
          const s = SECTIONS.find((x) => x.id === id);
          return (
            <button type="button" key={id} className={section.id === id ? 'is-active' : ''} onClick={() => go(id)} aria-current={section.id === id ? 'page' : undefined}>
              <s.icon size={20} aria-hidden="true" />
              <span>{s[lang]}</span>
            </button>
          );
        })}
        <button type="button" className={!PHONE_NAV.includes(section.id) ? 'is-active' : ''} onClick={() => setMore(true)}>
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>{t('Más', 'More')}</span>
          {unread > 0 && <b className="mg-badge">{unread}</b>}
        </button>
      </nav>
      <div className="mg-fab"><ContinueButton size="lg" /></div>

      <Sheet open={more} onClose={() => setMore(false)} title={t('Más secciones', 'More sections')}>
        <div className="mg-more-grid">
          {sections.filter((s) => !PHONE_NAV.includes(s.id)).map((s) => (
            <button type="button" key={s.id} onClick={() => { setMore(false); go(s.id); }} className={section.id === s.id ? 'is-active' : ''}>
              <s.icon size={22} aria-hidden="true" /><span>{s[lang]}</span>
              {s.id === 'inbox' && unread > 0 && <b className="mg-badge">{unread}</b>}
            </button>
          ))}
          <button type="button" onClick={() => { setMore(false); exportCareer(); }}><Download size={22} /><span>{t('Exportar partida', 'Export save')}</span></button>
          <button type="button" onClick={() => { setMore(false); leave(); }}><LogOut size={22} /><span>{t('Menú principal', 'Main menu')}</span></button>
        </div>
      </Sheet>

      <ErrorBoundary key={`sheet-${sheet?.type}-${sheet?.id}`} lang={lang} onReset={() => setSheet(null)}>
        {sheet?.type === 'player' && <PlayerSheet playerId={sheet.id} onClose={() => setSheet(null)} />}
        {sheet?.type === 'negotiation' && <Negotiation negotiationId={sheet.id} onClose={() => setSheet(null)} />}
      </ErrorBoundary>
      <ErrorBoundary lang={lang} onReset={() => setMoments([])}><Moments /></ErrorBoundary>
      {matchFixture && <ErrorBoundary lang={lang} onReset={() => setMatchFixture(null)}><MatchFlow fixtureId={matchFixture} /></ErrorBoundary>}
    </div>
  );
}
