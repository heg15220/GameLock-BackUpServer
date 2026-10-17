import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, AlertTriangle, HeartPulse, Ban, Battery, Handshake, Inbox as InboxIcon, Binoculars, Clock, Trophy as TrophyIcon, CalendarDays, Repeat } from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, FormGuide, Meter, Pill, SectionTitle } from './components.jsx';
import { ContinueButton } from './Hub.jsx';
import { longDate, shortDate, teamInfo, teamName, fixtureLabel, money, seasonLabel, weekdayShort } from './format.js';
import { L, newsText, objectiveText } from './texts.js';
import { daysToSeasonEnd, nextUserFixtures, transferWindowInfo, ownLeagueComp } from '../career/career.js';
import { leagueTable, leagueGroupIndex } from '../career/competitions.js';
import { clubSquad, energyAt, isInjured } from '../career/world.js';
import { objectiveStatus } from '../career/board.js';

export default function Central() {
  const { career, lang, t, go, setSheet, setMatchFixture } = useManager();
  const upcoming = nextUserFixtures(career, 6);
  const next = upcoming[0];
  const window = transferWindowInfo(career);
  const days = daysToSeasonEnd(career);

  return (
    <div className="mg-central">
      <section className="mg-hero-day">
        <div className="mg-hero-day__date">
          <h1>{longDate(career.date, lang).toUpperCase()}</h1>
          <p>{days > 0 ? t(`La temporada ${seasonLabel(career.year)} acaba en ${days} días`, `Season ${seasonLabel(career.year)} ends in ${days} days`) : t('La temporada de clubes ha terminado', 'The club season is over')}</p>
        </div>
        {next ? <NextMatch fixture={next} onOpen={() => (next.date === career.date ? setMatchFixture(next.id) : go('calendar'))} /> : <div className="mg-nomatch">{t('NO HAY PARTIDOS PROGRAMADOS', 'NO MATCHES SCHEDULED')}</div>}
        <div className="mg-hero-day__actions">
          <ContinueButton size="lg" />
          <button type="button" className="mg-btn mg-btn--dark" onClick={() => go('tactics')}>{t('Alineación y táctica', 'Line-up & tactics')}</button>
        </div>
        <div className={`mg-window-strip ${window.open ? 'is-open' : ''}`}>
          <Repeat size={16} aria-hidden="true" />
          {window.open
            ? <span>{t('Mercado abierto', 'Window open')} · <b>{window.daysLeft === 0 ? t('¡último día!', 'last day!') : t(`cierra en ${window.daysLeft} días`, `closes in ${window.daysLeft} days`)}</b></span>
            : <span>{t('Mercado cerrado', 'Window closed')} · {t(`abre en ${window.daysLeft} días`, `opens in ${window.daysLeft} days`)}</span>}
          <button type="button" className="mg-link" onClick={() => go('transfers')}>{t('Ir a fichajes', 'Go to transfers')}</button>
        </div>
      </section>

      <NewsCarousel />

      <div className="mg-central__grid">
        <Tasks />
        <MiniTable />
        <SquadStatus onOpen={(id) => setSheet({ type: 'player', id })} />
        <BoardCard />
        <Upcoming fixtures={upcoming} />
      </div>
    </div>
  );
}

function NextMatch({ fixture, onOpen }) {
  const { career, lang, t } = useManager();
  const home = teamInfo(career, fixture.home);
  const away = teamInfo(career, fixture.away);
  const today = fixture.date === career.date;
  const daysAway = Math.round((Date.parse(fixture.date) - Date.parse(career.date)) / 86400000);
  return (
    <button type="button" className={`mg-next ${today ? 'is-today' : ''}`} onClick={onOpen}>
      <span className="mg-next__label">{fixtureLabel(career, fixture, lang)}</span>
      <span className="mg-next__teams">
        <span><Crest team={home} size={54} /><b>{home?.short || home?.name}</b></span>
        <em>{today ? t('HOY', 'TODAY') : 'VS'}</em>
        <span><Crest team={away} size={54} /><b>{away?.short || away?.name}</b></span>
      </span>
      <span className="mg-next__when">{today ? t('Pulsa para preparar el partido', 'Tap to prepare the match') : `${weekdayShort(fixture.date, lang)} ${shortDate(fixture.date, lang)} · ${t(`en ${daysAway} días`, `in ${daysAway} days`)}`}</span>
    </button>
  );
}

function NewsCarousel() {
  const { career, lang, t } = useManager();
  const [index, setIndex] = useState(0);
  const items = career.news.slice(0, 12);
  if (!items.length) return null;
  const item = items[Math.min(index, items.length - 1)];
  const text = newsText(career, item, lang);
  const sourceLabel = { club: t('Club', 'Club'), press: t('Prensa', 'Press'), rumour: t('Rumores', 'Rumours') }[text.source] || text.source;
  const focusTeam = item.club || item.to || item.winner || item.home || career.clubId;
  return (
    <section className={`mg-news-card is-${text.source}`} aria-roledescription="carousel">
      <header>
        <span className="mg-news-card__source">{sourceLabel}</span>
        <small>{shortDate(item.date, lang)}</small>
      </header>
      <div className="mg-news-card__visual" key={item.id}>
        <Crest team={teamInfo(career, focusTeam)} size={86} />
      </div>
      <div className="mg-news-card__text" key={`${item.id}-t`}>
        <strong>{text.title}</strong>
        <p>{text.body}</p>
      </div>
      <footer>
        <span><Heart size={14} />{item.likes >= 1000 ? `${(item.likes / 1000).toFixed(1)} mil` : item.likes}</span>
        <span><MessageCircle size={14} />{item.comments}</span>
        <span className="mg-news-card__nav">
          <button type="button" onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)} aria-label={t('Anterior', 'Previous')}><ChevronLeft size={16} /></button>
          <i>{index + 1}/{items.length}</i>
          <button type="button" onClick={() => setIndex((i) => (i + 1) % items.length)} aria-label={t('Siguiente', 'Next')}><ChevronRight size={16} /></button>
        </span>
      </footer>
    </section>
  );
}

function Tasks() {
  const { career, lang, t, go, setSheet, setMoments } = useManager();
  const tasks = [];
  for (const neg of career.transfers.negotiations.filter((n) => n.status === 'your-turn')) {
    tasks.push({ id: neg.id, icon: Handshake, text: t(`Responder en la negociación de ${career.world.players[neg.playerId]?.name}`, `Reply in talks for ${career.world.players[neg.playerId]?.name}`), action: () => setSheet({ type: 'negotiation', id: neg.id }), tone: 'accent' });
  }
  for (const offer of career.transfers.offers.filter((o) => o.status === 'open')) {
    tasks.push({ id: offer.id, icon: InboxIcon, text: t(`Oferta del ${teamName(career, offer.clubId, lang)} por ${career.world.players[offer.playerId]?.name}`, `${teamName(career, offer.clubId, lang)} bid for ${career.world.players[offer.playerId]?.name}`), action: () => setMoments((m) => [...m, { type: 'offer', offer: offer.id }]) });
  }
  for (const event of career.events.filter((e) => !e.resolved).slice(0, 3)) {
    tasks.push({ id: event.id, icon: AlertTriangle, text: t('Tienes un asunto pendiente en el vestuario', 'Something in the dressing room needs you'), action: () => setMoments((m) => [...m, { type: 'event', event: event.id }]), tone: 'warn' });
  }
  const idleScouts = career.scouting.scouts.filter((s) => !s.missionId).length;
  if (idleScouts) tasks.push({ id: 'scouts', icon: Binoculars, text: t(`${idleScouts} ojeador${idleScouts > 1 ? 'es' : ''} sin misión`, `${idleScouts} idle scout${idleScouts > 1 ? 's' : ''}`), action: () => go('scouting') });
  if (career.academy.prospects.length) tasks.push({ id: 'prospects', icon: Binoculars, text: t(`${career.academy.prospects.length} chavales esperan respuesta para la cantera`, `${career.academy.prospects.length} youngsters await an academy decision`), action: () => go('academy') });
  if (career.jobOffers?.length) tasks.push({ id: 'jobs', icon: TrophyIcon, text: t('Tienes ofertas de trabajo', 'You have job offers'), action: () => go('office'), tone: 'accent' });
  const unread = career.inbox.filter((m) => !m.read).length;
  if (unread) tasks.push({ id: 'inbox', icon: InboxIcon, text: t(`${unread} mensajes sin leer`, `${unread} unread messages`), action: () => go('inbox') });
  return (
    <section className="mg-panel mg-tasks">
      <SectionTitle kicker={t('Pendiente', 'To do')} title={t('Tu mesa', 'Your desk')} />
      {tasks.length ? (
        <ul>{tasks.slice(0, 6).map((task) => <li key={task.id}><button type="button" className={`is-${task.tone || 'default'}`} onClick={task.action}><task.icon size={16} aria-hidden="true" /><span>{task.text}</span><ChevronRight size={15} aria-hidden="true" /></button></li>)}</ul>
      ) : <p className="mg-muted">{t('Todo en orden. Pulsa Continuar para avanzar.', 'All clear. Press Continue to move on.')}</p>}
    </section>
  );
}

function MiniTable() {
  const { career, lang, t, go } = useManager();
  const comp = ownLeagueComp(career);
  if (!comp) return null;
  const table = leagueTable(comp, career.clubId);
  const group = comp.groups?.[leagueGroupIndex(comp, career.clubId)]?.name;
  const index = table.findIndex((row) => row.team === career.clubId);
  const start = Math.max(0, Math.min(table.length - 5, index - 2));
  const rows = table.slice(start, start + 5);
  return (
    <section className="mg-panel mg-mini-table">
      <SectionTitle kicker={group ? `${comp.name} · ${lang === 'es' ? group : group.replace('Grupo', 'Group')}` : comp.name} title={t('Clasificación', 'Standings')}><button type="button" className="mg-link" onClick={() => go('competitions')}>{t('Ver todo', 'See all')}</button></SectionTitle>
      <table className="mg-table">
        <thead><tr><th>#</th><th>{t('Club', 'Club')}</th><th>PJ</th><th>DG</th><th>{t('Pts', 'Pts')}</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const pos = table.indexOf(row) + 1;
            return (
              <tr key={row.team} className={row.team === career.clubId ? 'is-own' : ''}>
                <td>{pos}</td>
                <td><span className="mg-cell-team"><Crest team={teamInfo(career, row.team)} size={20} />{teamName(career, row.team, lang, true)}</span></td>
                <td>{row.p}</td><td>{row.gf - row.ga > 0 ? '+' : ''}{row.gf - row.ga}</td><td><b>{row.pts}</b></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mg-mini-table__form"><span>{t('Racha', 'Form')}</span><FormGuide results={table[index]?.form || []} lang={lang} /></div>
    </section>
  );
}

function SquadStatus({ onOpen }) {
  const { career, lang, t, go } = useManager();
  const squad = clubSquad(career.world, career.clubId);
  const injured = squad.filter((p) => isInjured(p, career.date));
  const suspended = squad.filter((p) => p.susp > 0);
  const tired = squad.filter((p) => !isInjured(p, career.date) && energyAt(p, career.date, career.training) < 70);
  const avg = Math.round(squad.reduce((s, p) => s + energyAt(p, career.date, career.training), 0) / Math.max(1, squad.length));
  const morale = Math.round(squad.reduce((s, p) => s + (p.morale ?? 65), 0) / Math.max(1, squad.length));
  return (
    <section className="mg-panel mg-squad-status">
      <SectionTitle kicker={t('Vestuario', 'Dressing room')} title={t('Estado del equipo', 'Squad status')}><button type="button" className="mg-link" onClick={() => go('squad')}>{t('Plantilla', 'Squad')}</button></SectionTitle>
      <div className="mg-gauges">
        <div><span><Battery size={14} />{t('Energía media', 'Average energy')}</span><Meter value={avg} label="energy" /><b>{avg}%</b></div>
        <div><span><HeartPulse size={14} />{t('Ánimo del grupo', 'Team morale')}</span><Meter value={morale} label="morale" /><b>{L[lang].morale[morale >= 82 ? 'very-high' : morale >= 66 ? 'high' : morale >= 48 ? 'normal' : morale >= 30 ? 'low' : 'very-low']}</b></div>
      </div>
      <ul className="mg-status-list">
        {injured.map((p) => <li key={p.id}><button type="button" onClick={() => onOpen(p.id)}><HeartPulse size={14} className="is-bad" />{p.name}<em>{t('hasta', 'until')} {shortDate(p.injury.until, lang)}</em></button></li>)}
        {suspended.map((p) => <li key={p.id}><button type="button" onClick={() => onOpen(p.id)}><Ban size={14} className="is-warn" />{p.name}<em>{t(`sancionado ${p.susp} partido${p.susp > 1 ? 's' : ''}`, `banned ${p.susp} match${p.susp > 1 ? 'es' : ''}`)}</em></button></li>)}
        {tired.slice(0, 4).map((p) => <li key={p.id}><button type="button" onClick={() => onOpen(p.id)}><Battery size={14} className="is-warn" />{p.name}<em>{Math.round(energyAt(p, career.date, career.training))}% {t('energía', 'energy')}</em></button></li>)}
        {!injured.length && !suspended.length && !tired.length && <li className="mg-muted">{t('Todos disponibles y frescos.', 'Everyone available and fresh.')}</li>}
      </ul>
    </section>
  );
}

function BoardCard() {
  const { career, lang, t, go } = useManager();
  const status = objectiveStatus(career);
  const confidence = Math.round(career.board.confidence);
  return (
    <section className="mg-panel mg-board-card">
      <SectionTitle kicker={t('Directiva', 'Board')} title={t('Confianza', 'Confidence')}><button type="button" className="mg-link" onClick={() => go('office')}>{t('Oficina', 'Office')}</button></SectionTitle>
      <div className="mg-confidence">
        <b>{confidence}</b>
        <Meter value={confidence} label="confidence" />
        <span>{confidence >= 75 ? t('Están encantados contigo', 'They love you') : confidence >= 50 ? t('Confían en ti', 'They trust you') : confidence >= 30 ? t('Empiezan a dudar', 'Doubts are growing') : t('Tu puesto peligra', 'Your job is at risk')}</span>
      </div>
      <ul className="mg-objectives-mini">
        {status.slice(0, 3).map((o) => <li key={o.id} className={`is-${o.state}`}><i />{objectiveText(o, career, lang)}</li>)}
      </ul>
    </section>
  );
}

function Upcoming({ fixtures }) {
  const { career, lang, t, go } = useManager();
  return (
    <section className="mg-panel mg-upcoming">
      <SectionTitle kicker={t('Próximos', 'Next up')} title={t('Partidos', 'Fixtures')}><button type="button" className="mg-link" onClick={() => go('calendar')}><CalendarDays size={14} />{t('Calendario', 'Calendar')}</button></SectionTitle>
      <ul>
        {fixtures.slice(0, 5).map((f) => {
          const rival = f.home === career.clubId || f.home === `N:${career.national?.fifa}` ? f.away : f.home;
          const home = f.home === career.clubId || f.home === `N:${career.national?.fifa}`;
          return (
            <li key={f.id}>
              <span className="mg-upcoming__date"><b>{shortDate(f.date, lang)}</b><small>{weekdayShort(f.date, lang)}</small></span>
              <Crest team={teamInfo(career, rival)} size={26} />
              <span className="mg-upcoming__team"><b>{teamName(career, rival, lang, true)}</b><small>{fixtureLabel(career, f, lang)}</small></span>
              <Pill tone={home ? 'home' : 'away'}>{home ? t('Casa', 'Home') : t('Fuera', 'Away')}</Pill>
            </li>
          );
        })}
        {!fixtures.length && <li className="mg-muted">{t('Sin partidos a la vista.', 'No fixtures ahead.')}</li>}
      </ul>
    </section>
  );
}

export { Clock, money };
