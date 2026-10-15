import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, FastForward, SkipForward, Repeat, LayoutGrid, MessageSquare, BarChart3, Users, X, Zap, Shield, Sparkles, Flag as FlagIcon } from 'lucide-react';
import { useManager } from '../context.jsx';
import { Crest, OvrBadge, Portrait, ChoiceRow, FormGuide, Pill } from '../components.jsx';
import { fixtureLabel, posLabel, teamInfo, teamName, compName, matchRatingTone } from '../format.js';
import { L, commentary } from '../texts.js';
import { startUserMatch, finishUserMatch, simulateUserMatch, userTeams } from '../../career/career.js';
import { advanceMatch, userSubstitute, userSetTactics, userSetAutoSubs, userReplaceInjured, pendingInjuries, sideStrength, teamTalk, MENTALITIES, displayMinute } from '../../career/match.js';
import { FORMATION_KEYS } from '../../career/positions.js';
import { PitchRenderer, chooseKits } from './pitch.js';
import { Director } from './director.js';
import { createStream } from '../../career/util.js';
import { generateName } from '../../career/names.js';
import { lastName } from '../components.jsx';

export default function MatchFlow({ fixtureId }) {
  const { career, act, setMatchFixture, setMoments, go, bump, persist } = useManager();
  const fixture = career.season.fixtures[fixtureId];
  const [phase, setPhase] = useState(career.live && career.live.id === fixtureId && !career.live.complete ? 'live' : 'pre');
  const [result, setResult] = useState(null);

  const close = useCallback(() => {
    const stops = career.flags.stops || [];
    const celebration = career.flags.celebration;
    career.flags = { stops: [] };
    setMatchFixture(null);
    const list = [];
    for (const stop of stops) {
      const item = career.inbox.find((m) => m.id === stop.id);
      if (stop.kind === 'trophy' && celebration) list.push({ type: 'celebration', ...celebration });
      if (item?.kind === 'event') list.push({ type: 'event', event: item.event });
    }
    if (list.length) setMoments((m) => [...m, ...list]);
    bump();
  }, [career, setMatchFixture, setMoments, bump]);

  if (!fixture) return null;
  if (phase === 'pre') {
    return (
      <PreMatch fixture={fixture}
        onPlay={() => { act((c) => { c.flags = { stops: [] }; startUserMatch(c, fixtureId); }); setPhase('live'); }}
        onSim={() => { const match = act((c) => { c.flags = { stops: [] }; return simulateUserMatch(c, fixtureId); }); setResult(match); setPhase('post'); }}
        onTactics={() => { setMatchFixture(null); go(fixture.home.startsWith('N:') || fixture.away.startsWith('N:') ? 'national' : 'tactics'); }} />
    );
  }
  if (phase === 'live') {
    return <LiveMatch fixture={fixture} onFinish={(match) => { act((c) => finishUserMatch(c, match)); persist(); setResult(match); setPhase('post'); }} />;
  }
  return <PostMatch fixture={fixture} match={result} onClose={close} />;
}

/* ── Pre-match ── */

function probabilities(match) {
  const h = sideStrength(match, 'home');
  const a = sideStrength(match, 'away');
  const lh = 1.25 * Math.exp((h.att * 0.55 + h.mid * 0.45 + (match.neutral ? 0 : 2.8) - (a.def * 0.62 + a.mid * 0.25 + a.gk * 0.13)) / 27);
  const la = 1.25 * Math.exp((a.att * 0.55 + a.mid * 0.45 - (h.def * 0.62 + h.mid * 0.25 + h.gk * 0.13 + (match.neutral ? 0 : 1.4))) / 27);
  const pois = (l, k) => Math.exp(-l) * Math.pow(l, k) / [1, 1, 2, 6, 24, 120, 720, 5040][k];
  let home = 0; let draw = 0; let away = 0;
  for (let i = 0; i < 8; i += 1) for (let j = 0; j < 8; j += 1) { const p = pois(lh, i) * pois(la, j); if (i > j) home += p; else if (i === j) draw += p; else away += p; }
  const total = home + draw + away;
  return { home: home / total, draw: draw / total, away: away / total };
}

function formOf(career, team) {
  return Object.values(career.season.fixtures).filter((f) => f.done && !f.friendly && (f.home === team || f.away === team)).sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-5)
    .map((f) => { const own = f.home === team ? f.hg : f.ag; const rival = f.home === team ? f.ag : f.hg; return own > rival ? 'W' : own < rival ? 'L' : 'D'; });
}

function PreMatch({ fixture, onPlay, onSim, onTactics }) {
  const { career, lang, t } = useManager();
  const preview = useMemo(() => startUserMatchPreview(career, fixture), [fixture.id, career.version]);
  const home = teamInfo(career, fixture.home);
  const away = teamInfo(career, fixture.away);
  const odds = probabilities(preview);
  const userSide = preview.userSide;
  const stadiumOwner = career.world.clubs[fixture.home];
  const referee = generateName(createStream(career.seed, 'ref', fixture.id), career.world.clubs[fixture.home]?.country || 'ENG', 'UEFA');
  const es = lang === 'es';
  const formDisplay = (list) => list.map((r) => (es ? { W: 'V', D: 'E', L: 'D' }[r] : r));
  return (
    <div className="mg-matchflow mg-prematch">
      <div className="mg-prematch__head">
        <span className="mg-kicker">{fixtureLabel(career, fixture, lang)}</span>
        <div className="mg-prematch__teams">
          <div className={userSide === 'home' ? 'is-user' : ''}><Crest team={home} size={96} /><b>{home.name}</b><FormGuide results={formDisplay(formOf(career, fixture.home))} /><OvrBadge value={Math.round(avgOvr(preview, 'home'))} /></div>
          <div className="mg-prematch__vs"><span>VS</span><small>{fixture.neutral ? t('Campo neutral', 'Neutral venue') : stadiumOwner ? t(`Estadio del ${stadiumOwner.short}`, `${stadiumOwner.short} stadium`) : ''}</small><small>{t('Árbitro', 'Referee')}: {referee}</small></div>
          <div className={userSide === 'away' ? 'is-user' : ''}><Crest team={away} size={96} /><b>{away.name}</b><FormGuide results={formDisplay(formOf(career, fixture.away))} /><OvrBadge value={Math.round(avgOvr(preview, 'away'))} /></div>
        </div>
        <div className="mg-odds" aria-label={t('Probabilidades', 'Probabilities')}>
          <span style={{ flex: odds.home }}><b>{Math.round(odds.home * 100)}%</b><small>{home.short || home.name}</small></span>
          <span style={{ flex: odds.draw }}><b>{Math.round(odds.draw * 100)}%</b><small>{t('Empate', 'Draw')}</small></span>
          <span style={{ flex: odds.away }}><b>{Math.round(odds.away * 100)}%</b><small>{away.short || away.name}</small></span>
        </div>
      </div>
      <div className="mg-prematch__lineups">
        {['home', 'away'].map((side) => (
          <div key={side} className={`mg-panel ${side === userSide ? 'is-user' : ''}`}>
            <h4><Crest team={side === 'home' ? home : away} size={20} />{preview.sides[side].formation}</h4>
            <ol>
              {preview.sides[side].lineup.map((id) => {
                const p = preview.players[id];
                return <li key={id}><span className="mg-pos">{posLabel(p.slot, lang)}</span><b>{p.number}</b><span>{p.name}</span><OvrBadge value={p.ovr} size="xs" /></li>;
              })}
            </ol>
          </div>
        ))}
      </div>
      <div className="mg-prematch__actions">
        <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={onPlay}><Play size={18} />{t('Jugar el partido', 'Play the match')}</button>
        <button type="button" className="mg-btn mg-btn--dark" onClick={onSim}><FastForward size={16} />{t('Simular resultado', 'Simulate result')}</button>
        <button type="button" className="mg-btn mg-btn--ghost" onClick={onTactics}><LayoutGrid size={16} />{t('Cambiar alineación', 'Change line-up')}</button>
      </div>
    </div>
  );
}

function avgOvr(match, side) {
  const ids = match.sides[side].lineup;
  return ids.reduce((s, id) => s + match.players[id].ovr, 0) / Math.max(1, ids.length);
}

function startUserMatchPreview(career, fixture) {
  const saved = career.live;
  const match = startUserMatch(career, fixture.id);
  career.live = saved;
  return match;
}

/* ── Live ── */

const SPEEDS = [{ id: 1, label: '1×' }, { id: 2, label: '2×' }, { id: 4, label: '4×' }, { id: 'hl', label: '⚡' }];

function LiveMatch({ fixture, onFinish }) {
  const { career, lang, t } = useManager();
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rendererRef = useRef(null);
  const directorRef = useRef(null);
  const matchRef = useRef(null);
  const [match, setMatchState] = useState(() => career.live && career.live.id === fixture.id ? career.live : startUserMatch(career, fixture.id));
  const [shown, setShown] = useState(() => ({ ...match.score }));
  const [clock, setClock] = useState({ minute: displayMinute(match).minute, added: 0 });
  const [feed, setFeed] = useState([]);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState(null);
  const [tab, setTab] = useState('feed');
  const [splash, setSplash] = useState(null);
  const [subOut, setSubOut] = useState(null);
  const [directorIdle, setDirectorIdle] = useState(true);
  const playingRef = useRef(playing);
  const idleRef = useRef(true);
  const speedRef = useRef(speed);
  playingRef.current = playing && !panel;
  speedRef.current = speed;
  matchRef.current = match;
  const userSide = match.userSide;
  const homeTeam = teamInfo(career, fixture.home);
  const awayTeam = teamInfo(career, fixture.away);

  const setMatch = useCallback((next) => {
    matchRef.current = next;
    career.live = next;
    setMatchState(next);
  }, [career]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = new PitchRenderer(canvas);
    const kits = chooseKits({ color: homeTeam.color, kit: homeTeam.kit }, { color: awayTeam.color, kit: awayTeam.kit });
    renderer.setTeams(matchRef.current, kits, [homeTeam.name.toUpperCase(), 'GAMELOCK', awayTeam.name.toUpperCase(), lang === 'es' ? 'MODO MÁNAGER' : 'MANAGER MODE']);
    rendererRef.current = renderer;
    const director = new Director(renderer, {
      lang,
      onEvent: (event, scene) => {
        const text = commentary(matchRef.current, event, lang);
        if (text) setFeed((list) => [{ id: `${scene.minute}-${list.length}`, minute: scene.minute ?? event.minute, added: scene.added, text, type: event.type, side: event.side, card: event.card }, ...list].slice(0, 80));
        if (event.type === 'sub' || event.type === 'card' || event.type === 'injury') renderer.setTeams(matchRef.current, kits);
      },
      onGoal: (event) => {
        if (event.disallowed) { setSplash({ kind: 'var', event }); return; }
        setShown((s) => ({ ...s, [event.side]: s[event.side] + 1 }));
        setSplash({ kind: 'goal', event });
      },
    });
    director.sync(matchRef.current);
    directorRef.current = director;
    // Place everyone in shape for kick-off.
    const targets = director.shapeTargets({ x: 52.5, y: 34 }, null);
    for (const [id, target] of Object.entries(targets)) { const body = renderer.bodies.get(id); if (body) { body.x = target.x; body.y = target.y; } }
    renderer.setTargets(targets, { x: 52.5, y: 34, z: 0, snap: true }, 16);
    let last = performance.now();
    let frame;
    const loop = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      const current = matchRef.current;
      if (playingRef.current && !director.busy && !current.complete && !current.pausedFor) {
        const next = advanceMatch(current, 1);
        director.enqueue(current, next);
        setMatch(next);
      }
      const sp = speedRef.current;
      const factor = sp === 'hl' ? (director.scene?.kind === 'ambient' ? 9 : 2.2) : sp;
      const active = playingRef.current || director.busy;
      const scene = active ? director.update(dt, playingRef.current ? factor : 0.0001) : null;
      if (scene?.minute !== undefined) setClock((c) => (c.minute === scene.minute && c.added === scene.added ? c : { minute: scene.minute, added: scene.added || 0 }));
      const idleNow = !director.busy;
      if (idleNow !== idleRef.current) { idleRef.current = idleNow; setDirectorIdle(idleNow); }
      renderer.step(dt, playingRef.current ? Math.min(factor, 3) : 0.25);
      renderer.draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const observer = new ResizeObserver(() => renderer.resize());
    observer.observe(canvas);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (!splash) return undefined;
    const id = setTimeout(() => setSplash(null), speed === 'hl' ? 1800 : 2600 / Math.min(2, speed));
    return () => clearTimeout(id);
  }, [splash, speed]);

  const director = directorRef.current;
  const idle = directorIdle && !director?.busy;
  const finished = match.complete && idle;
  const pausedFor = !match.complete && idle ? match.pausedFor : null;
  const injuries = pendingInjuries(match);

  useEffect(() => {
    if (finished) setShown({ ...match.score });
  }, [finished]);
  useEffect(() => { if (pausedFor === 'injury' && injuries.length) setPanel('subs'); }, [pausedFor]);

  const resume = () => { if (match.pausedFor) setMatch({ ...match, pausedFor: null }); setPlaying(true); };
  const decide = (fn) => { try { const next = fn(matchRef.current); setMatch(next); directorRef.current?.sync(next); rendererRef.current?.setTeams(next, rendererRef.current.kits); } catch { /* invalid choice */ } };
  const toEnd = () => {
    const next = advanceMatch(matchRef.current, 200, { ignorePauses: true });
    directorRef.current?.skip();
    setMatch(next);
    setShown({ ...next.score });
    setFeed((list) => [{ id: 'skip', minute: displayMinute(next).minute, text: t('Has saltado hasta el final.', 'You skipped to the end.'), type: 'info' }, ...next.events.filter((e) => e.type === 'goal').reverse().map((e, i) => ({ id: `g${i}`, minute: e.minute, text: commentary(next, e, lang), type: 'goal', side: e.side })), ...list]);
    setPlaying(false);
  };

  const own = match.sides[userSide];
  const subsLeft = match.maxSubs - own.subs;

  return (
    <div className="mg-matchflow mg-live">
      <div className="mg-scorebug">
        <span className="mg-scorebug__comp">{compName(career.season.comps[fixture.comp], lang)}</span>
        <div className="mg-scorebug__main">
          <span className="mg-scorebug__team is-home" style={{ '--c': homeTeam.color }}><Crest team={homeTeam} size={30} /><b>{homeTeam.abbr || homeTeam.name.slice(0, 3).toUpperCase()}</b></span>
          <span className="mg-scorebug__score"><b key={`h${shown.home}`}>{shown.home}</b><i>-</i><b key={`a${shown.away}`}>{shown.away}</b></span>
          <span className="mg-scorebug__team is-away" style={{ '--c': awayTeam.color }}><b>{awayTeam.abbr || awayTeam.name.slice(0, 3).toUpperCase()}</b><Crest team={awayTeam} size={30} /></span>
          <span className="mg-scorebug__clock">{clock.minute}{clock.added ? `+${clock.added}` : ''}'</span>
        </div>
        {match.aggregate && <span className="mg-scorebug__agg">{t('Global', 'Agg.')} {match.aggregate.home + shown.home}-{match.aggregate.away + shown.away}</span>}
      </div>

      <div className="mg-live__stage">
        <div className="mg-live__pitch" ref={wrapRef}>
          <canvas ref={canvasRef} className="mg-canvas" aria-label={t('Campo animado', 'Animated pitch')} />
          {splash?.kind === 'goal' && (
            <div className={`mg-goal-splash ${splash.event.side === userSide ? 'is-user' : ''}`} style={{ '--c': splash.event.side === 'home' ? homeTeam.color : awayTeam.color }}>
              <span className="mg-goal-splash__word">{t('¡GOOOL!', 'GOAL!')}</span>
              <span className="mg-goal-splash__who"><Crest team={splash.event.side === 'home' ? homeTeam : awayTeam} size={34} />{match.players[splash.event.player]?.name} <small>{splash.event.minute}'</small></span>
              {splash.event.assist && <small>{t('Asistencia de', 'Assist by')} {match.players[splash.event.assist]?.name}</small>}
            </div>
          )}
          {splash?.kind === 'var' && <div className="mg-goal-splash is-var"><span className="mg-goal-splash__word">VAR</span><span>{t('Gol anulado por fuera de juego', 'Goal ruled out for offside')}</span></div>}
        </div>

        <aside className="mg-live__side">
          <div className="mg-seg mg-seg--tabs" role="tablist">
            <button type="button" className={tab === 'feed' ? 'is-active' : ''} onClick={() => setTab('feed')}><MessageSquare size={14} />{t('Directo', 'Live')}</button>
            <button type="button" className={tab === 'stats' ? 'is-active' : ''} onClick={() => setTab('stats')}><BarChart3 size={14} />{t('Datos', 'Stats')}</button>
            <button type="button" className={tab === 'lineups' ? 'is-active' : ''} onClick={() => setTab('lineups')}><Users size={14} />{t('Notas', 'Ratings')}</button>
          </div>
          {tab === 'feed' && (
            <ol className="mg-feed">
              {feed.map((item) => <li key={item.id} className={`is-${item.type} ${item.side === userSide ? 'is-user' : ''} ${item.card ? `card-${item.card}` : ''}`}><b>{item.minute}{item.added ? `+${item.added}` : ''}'</b><span>{item.text}</span></li>)}
              {!feed.length && <li className="mg-muted">{t('Los jugadores saltan al campo…', 'The players walk out…')}</li>}
            </ol>
          )}
          {tab === 'stats' && <StatsPanel match={match} />}
          {tab === 'lineups' && <RatingsPanel match={match} />}
          <Momentum match={match} />
        </aside>
      </div>

      <div className="mg-live__overlay">
          {!playing && !finished && !pausedFor && match.phase === 'pre' && (
            <button type="button" className="mg-kickoff" onClick={() => setPlaying(true)}><Play size={26} /><span>{t('Comenzar partido', 'Kick off')}</span></button>
          )}
          {pausedFor === 'half-time' && <HalfTime match={match} onTalk={(tone) => decide((m) => teamTalk(m, tone))} onResume={resume} onSubs={() => setPanel('subs')} onTactics={() => setPanel('tactics')} />}
          {pausedFor === 'extra-time' && (
            <div className="mg-ht"><h3>{t('¡Prórroga!', 'Extra time!')}</h3><p>{t('Treinta minutos más. Revisa el cansancio de tus jugadores.', 'Thirty more minutes. Check your players\' fitness.')}</p><button type="button" className="mg-btn mg-btn--primary" onClick={resume}><Play size={16} />{t('Seguir', 'Continue')}</button></div>
          )}
          {finished && (
            <div className="mg-ht mg-ft">
              <small>{t('FINAL', 'FULL TIME')}</small>
              <h3><Crest team={homeTeam} size={36} /> {match.score.home} - {match.score.away} <Crest team={awayTeam} size={36} /></h3>
              {match.pens && <p>{t('Penaltis', 'Penalties')}: {match.pens.home}-{match.pens.away}</p>}
              <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={() => onFinish(match)}>{t('Ver resumen', 'See summary')}</button>
            </div>
          )}
      </div>
      <div className="mg-live__controls">
        <button type="button" className="mg-btn mg-btn--round mg-btn--primary" onClick={() => (playing ? setPlaying(false) : resume())} disabled={finished} aria-label={playing ? t('Pausa', 'Pause') : t('Jugar', 'Play')}>{playing ? <Pause size={20} /> : <Play size={20} />}</button>
        <div className="mg-seg" role="group" aria-label={t('Velocidad', 'Speed')}>
          {SPEEDS.map((s) => <button type="button" key={s.id} className={speed === s.id ? 'is-active' : ''} onClick={() => setSpeed(s.id)} title={s.id === 'hl' ? t('Solo ocasiones', 'Highlights only') : undefined}>{s.label}</button>)}
        </div>
        <button type="button" className="mg-btn mg-btn--dark" onClick={() => { setPlaying(false); setPanel('subs'); }} disabled={match.complete}><Repeat size={16} />{t('Cambios', 'Subs')} <small>{subsLeft}</small></button>
        <button type="button" className="mg-btn mg-btn--dark" onClick={() => { setPlaying(false); setPanel('tactics'); }} disabled={match.complete}><LayoutGrid size={16} />{t('Táctica', 'Tactics')}</button>
        <button type="button" className="mg-btn mg-btn--ghost" onClick={toEnd} disabled={match.complete}><SkipForward size={16} />{t('Ir al final', 'Skip to end')}</button>
      </div>

      {panel === 'subs' && (
        <div className="mg-live-panel" role="dialog" aria-label={t('Cambios', 'Substitutions')}>
          <header><h3>{t('Cambios', 'Substitutions')} <small>{own.subs}/{match.maxSubs}</small></h3><button type="button" className="mg-icon-btn" onClick={() => { setPanel(null); setSubOut(null); }}><X size={18} /></button></header>
          <label className="mg-check"><input type="checkbox" checked={match.autoSubs} onChange={(e) => decide((m) => userSetAutoSubs(m, e.target.checked))} />{t('Que el segundo entrenador haga los cambios', 'Let the assistant make substitutions')}</label>
          {injuries.length > 0 && <p className="mg-alert is-bad">{t(`${injuries[0].name} está lesionado. Elige quién entra.`, `${injuries[0].name} is injured. Choose who comes on.`)}</p>}
          <div className="mg-subs">
            <div>
              <h4>{t('Sale', 'Off')}</h4>
              <ul>
                {(injuries.length ? injuries : own.lineup.map((id) => match.players[id])).map((p) => (
                  <li key={p.id}><button type="button" className={subOut === p.id ? 'is-selected' : ''} onClick={() => setSubOut(p.id)}>
                    <span className="mg-pos">{posLabel(p.slot, lang)}</span><span>{p.name}</span><span className={`mg-rating is-${matchRatingTone(p.rating)}`}>{p.rating.toFixed(1)}</span><i className="mg-energy" style={{ '--e': `${p.energy}%` }} />{p.yc ? <span className="mg-card-icon is-yellow" /> : null}
                  </button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>{t('Entra', 'On')}</h4>
              <ul>
                {own.bench.map((id) => match.players[id]).filter((p) => p && !p.injured).map((p) => (
                  <li key={p.id}><button type="button" disabled={!subOut || subsLeft <= 0} onClick={() => { decide((m) => (injuries.some((x) => x.id === subOut) ? userReplaceInjured(m, subOut, p.id) : userSubstitute(m, subOut, p.id))); setSubOut(null); }}>
                    <span className="mg-pos">{posLabel(p.pos, lang)}</span><span>{p.name}</span><OvrBadge value={p.ovr} size="xs" />
                  </button></li>
                ))}
              </ul>
            </div>
          </div>
          <button type="button" className="mg-btn mg-btn--primary" onClick={() => { setPanel(null); resume(); }}><Play size={16} />{t('Volver al partido', 'Back to the match')}</button>
        </div>
      )}
      {panel === 'tactics' && (
        <div className="mg-live-panel" role="dialog" aria-label={t('Táctica', 'Tactics')}>
          <header><h3>{t('Táctica', 'Tactics')}</h3><button type="button" className="mg-icon-btn" onClick={() => setPanel(null)}><X size={18} /></button></header>
          <div className="mg-formations">{FORMATION_KEYS.map((f) => <button type="button" key={f} className={own.formation === f ? 'is-active' : ''} onClick={() => decide((m) => userSetTactics(m, { formation: f }))}>{f}</button>)}</div>
          <ChoiceRow label={t('Mentalidad', 'Mentality')} value={own.tactics.mentality} onChange={(v) => decide((m) => userSetTactics(m, { mentality: v }))} options={MENTALITIES.map((id) => ({ id, label: L[lang].mentality[id] }))} />
          <ChoiceRow label={t('Presión', 'Pressing')} value={own.tactics.pressing} onChange={(v) => decide((m) => userSetTactics(m, { pressing: v }))} options={['low', 'medium', 'high'].map((id) => ({ id, label: L[lang].pressing[id] }))} />
          <ChoiceRow label={t('Ritmo', 'Tempo')} value={own.tactics.tempo} onChange={(v) => decide((m) => userSetTactics(m, { tempo: v }))} options={['slow', 'normal', 'fast'].map((id) => ({ id, label: L[lang].tempo[id] }))} />
          <div className="mg-quick-tactics">
            <button type="button" onClick={() => decide((m) => userSetTactics(m, { mentality: 'very-attacking', pressing: 'high', tempo: 'fast' }))}><Zap size={16} />{t('¡A por el partido!', 'Go for it!')}</button>
            <button type="button" onClick={() => decide((m) => userSetTactics(m, { mentality: 'defensive', pressing: 'low', tempo: 'slow' }))}><Shield size={16} />{t('Proteger el resultado', 'Protect the lead')}</button>
            <button type="button" onClick={() => decide((m) => userSetTactics(m, { mentality: 'balanced', pressing: 'medium', tempo: 'normal' }))}><FlagIcon size={16} />{t('Equilibrio', 'Balanced')}</button>
          </div>
          <button type="button" className="mg-btn mg-btn--primary" onClick={() => { setPanel(null); resume(); }}><Play size={16} />{t('Volver al partido', 'Back to the match')}</button>
        </div>
      )}
    </div>
  );
}

function HalfTime({ match, onTalk, onResume, onSubs, onTactics }) {
  const { lang, t } = useManager();
  const talked = match.talked?.[match.period];
  const s = match.stats;
  return (
    <div className="mg-ht">
      <small>{t('DESCANSO', 'HALF TIME')}</small>
      <h3>{match.score.home} - {match.score.away}</h3>
      <div className="mg-ht__stats"><span>{t('Tiros', 'Shots')} {s.home.shots}-{s.away.shots}</span><span>xG {s.home.xg.toFixed(1)}-{s.away.xg.toFixed(1)}</span><span>{t('Posesión', 'Possession')} {Math.round(s.home.poss / Math.max(1, s.home.poss + s.away.poss) * 100)}%</span></div>
      {!talked ? (
        <>
          <p>{t('Charla en el vestuario:', 'Dressing-room talk:')}</p>
          <div className="mg-ht__talk">
            <button type="button" onClick={() => onTalk('calm')}>{t('«Tranquilos, seguid así»', '"Calm, keep it up"')}</button>
            <button type="button" onClick={() => onTalk('encourage')}>{t('«Creed en vosotros»', '"Believe in yourselves"')}</button>
            <button type="button" onClick={() => onTalk('demand')}>{t('«Esto no vale, quiero más»', '"Not good enough, I want more"')}</button>
          </div>
        </>
      ) : <p className={talked.delta > 0 ? 'mg-up' : 'mg-down'}>{talked.delta > 0 ? t('Los jugadores salen enchufados.', 'The players come out fired up.') : t('La charla no ha sentado bien.', 'The talk did not go down well.')}</p>}
      <div className="mg-ht__actions">
        <button type="button" className="mg-btn mg-btn--dark" onClick={onSubs}><Repeat size={15} />{t('Cambios', 'Subs')}</button>
        <button type="button" className="mg-btn mg-btn--dark" onClick={onTactics}><LayoutGrid size={15} />{t('Táctica', 'Tactics')}</button>
        <button type="button" className="mg-btn mg-btn--primary" onClick={onResume}><Play size={15} />{t('Segunda parte', 'Second half')}</button>
      </div>
    </div>
  );
}

function StatsPanel({ match }) {
  const { t } = useManager();
  const s = match.stats;
  const poss = Math.round(s.home.poss / Math.max(1, s.home.poss + s.away.poss) * 100);
  const rows = [
    [t('Posesión', 'Possession'), poss, 100 - poss, '%'],
    [t('Tiros', 'Shots'), s.home.shots, s.away.shots],
    [t('A puerta', 'On target'), s.home.sot, s.away.sot],
    ['xG', +s.home.xg.toFixed(2), +s.away.xg.toFixed(2)],
    [t('Ocasiones claras', 'Big chances'), s.home.bigChances, s.away.bigChances],
    [t('Córners', 'Corners'), s.home.corners, s.away.corners],
    [t('Faltas', 'Fouls'), s.home.fouls, s.away.fouls],
    [t('Fueras de juego', 'Offsides'), s.home.offsides, s.away.offsides],
    [t('Paradas', 'Saves'), s.home.saves, s.away.saves],
    [t('Precisión de pase', 'Pass accuracy'), Math.round(s.home.passOk / Math.max(1, s.home.passes) * 100), Math.round(s.away.passOk / Math.max(1, s.away.passes) * 100), '%'],
    [t('Amarillas', 'Yellow cards'), s.home.yc, s.away.yc],
    [t('Rojas', 'Red cards'), s.home.rc, s.away.rc],
  ];
  return (
    <ul className="mg-stat-bars">
      {rows.map(([label, a, b, unit = '']) => {
        const total = Math.max(0.0001, a + b);
        return (
          <li key={label}>
            <span className="mg-stat-bars__v">{a}{unit}</span>
            <span className="mg-stat-bars__label">{label}</span>
            <span className="mg-stat-bars__v">{b}{unit}</span>
            <span className="mg-stat-bars__bar"><i className="is-home" style={{ width: `${(a / total) * 100}%` }} /><i className="is-away" style={{ width: `${(b / total) * 100}%` }} /></span>
          </li>
        );
      })}
    </ul>
  );
}

function RatingsPanel({ match }) {
  const { lang } = useManager();
  return (
    <div className="mg-ratings">
      {['home', 'away'].map((side) => (
        <ul key={side}>
          {match.sides[side].used.map((id) => match.players[id]).filter(Boolean).map((p) => (
            <li key={p.id} className={p.off !== null && p.off !== undefined ? 'is-off' : ''}>
              <span className="mg-pos">{posLabel(p.slot || p.pos, lang)}</span>
              <span className="mg-ratings__name">{lastName(p.name)}{p.goals ? ` ${'⚽'.repeat(p.goals)}` : ''}{p.yc ? ' 🟨' : ''}{p.rc ? ' 🟥' : ''}{p.injured ? ' ✚' : ''}</span>
              <span className={`mg-rating is-${matchRatingTone(p.rating)}`}>{p.minutes ? p.rating.toFixed(1) : '–'}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

export function Momentum({ match, height = 46 }) {
  const bars = match.timeline;
  const width = 300;
  if (!bars.length) return <div className="mg-momentum is-empty" />;
  const maxMinute = Math.max(90, bars[bars.length - 1].m);
  const goals = match.events.filter((e) => e.type === 'goal');
  return (
    <svg className="mg-momentum" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="mg-momentum__mid" />
      {bars.map((b, i) => {
        const x = (b.m + (b.a ? b.a * 0.2 : 0)) / maxMinute * width;
        const v = (b.x * 0.9 + b.p * 0.35) * (height / 2 - 2);
        return <rect key={i} x={x} width={Math.max(1.5, width / maxMinute - 0.6)} y={v > 0 ? height / 2 - v : height / 2} height={Math.abs(v)} className={v > 0 ? 'is-home' : 'is-away'} />;
      })}
      {goals.map((g, i) => <circle key={i} cx={g.minute / maxMinute * width} cy={g.side === 'home' ? 4 : height - 4} r="3" className="mg-momentum__goal" />)}
      <line x1={width / 2} y1="0" x2={width / 2} y2={height} className="mg-momentum__half" />
    </svg>
  );
}

/* ── Post-match ── */

function PostMatch({ fixture, match, onClose }) {
  const { career, lang, t, setSheet } = useManager();
  const home = teamInfo(career, fixture.home);
  const away = teamInfo(career, fixture.away);
  const userSide = match ? match.userSide : (userTeams(career).includes(fixture.home) ? 'home' : 'away');
  if (!match) return null;
  const goals = match.events.filter((e) => e.type === 'goal');
  const motm = match.players[match.motm];
  const shots = match.events.filter((e) => e.type === 'shot' || e.type === 'goal');
  const own = Object.values(match.players).filter((p) => p.side === userSide && p.minutes > 0).sort((a, b) => b.rating - a.rating);
  const won = match.winner === userSide;
  const lost = match.winner && match.winner !== userSide;
  return (
    <div className={`mg-matchflow mg-post ${won ? 'is-win' : lost ? 'is-loss' : 'is-draw'}`}>
      <div className="mg-post__score">
        <span className="mg-kicker">{fixtureLabel(career, fixture, lang)} · {t('Final', 'Full time')}</span>
        <div className="mg-post__line">
          <span><Crest team={home} size={64} /><b>{home.name}</b></span>
          <strong>{match.score.home}<i>-</i>{match.score.away}</strong>
          <span><Crest team={away} size={64} /><b>{away.name}</b></span>
        </div>
        {match.pens && <p>{t('Penaltis', 'Penalties')}: {match.pens.home}-{match.pens.away}</p>}
        <div className="mg-post__scorers">
          <ul>{goals.filter((g) => g.side === 'home').map((g, i) => <li key={i}>{match.players[g.player]?.name} {g.minute}'{g.kind === 'penalty' ? ` (${t('p', 'pen')})` : ''}</li>)}</ul>
          <ul>{goals.filter((g) => g.side === 'away').map((g, i) => <li key={i}>{match.players[g.player]?.name} {g.minute}'{g.kind === 'penalty' ? ` (${t('p', 'pen')})` : ''}</li>)}</ul>
        </div>
        <div className="mg-post__verdict">{won ? t('¡Victoria!', 'Victory!') : lost ? t('Derrota', 'Defeat') : t('Empate', 'Draw')}</div>
      </div>
      <div className="mg-post__grid">
        {motm && (
          <div className="mg-panel mg-motm">
            <span className="mg-kicker"><Sparkles size={13} />{t('Mejor jugador', 'Player of the match')}</span>
            <Portrait player={motm} size={72} kit={motm.side === 'home' ? home.color : away.color} />
            <b>{motm.name}</b>
            <span className={`mg-rating is-${matchRatingTone(motm.rating)}`}>{motm.rating.toFixed(1)}</span>
          </div>
        )}
        <div className="mg-panel"><h4>{t('Estadísticas', 'Stats')}</h4><StatsPanel match={match} /></div>
        <div className="mg-panel">
          <h4>{t('Mapa de tiros', 'Shot map')}</h4>
          <ShotMap shots={shots} />
          <h4>{t('Dominio', 'Momentum')}</h4>
          <Momentum match={match} height={60} />
        </div>
        <div className="mg-panel">
          <h4>{t('Notas de tu equipo', 'Your ratings')}</h4>
          <ul className="mg-post__ratings">
            {own.map((p) => (
              <li key={p.id}><button type="button" onClick={() => career.world.players[p.id] && setSheet({ type: 'player', id: p.id })}>
                <span className="mg-pos">{posLabel(p.slot || p.pos, lang)}</span><span>{p.name}</span>
                <small>{p.goals ? `⚽${p.goals > 1 ? `×${p.goals}` : ''} ` : ''}{p.assists ? `🅰${p.assists > 1 ? `×${p.assists}` : ''} ` : ''}{p.injured ? '✚ ' : ''}{p.minutes}'</small>
                <span className={`mg-rating is-${matchRatingTone(p.rating)}`}>{p.rating.toFixed(1)}</span>
              </button></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mg-post__actions">
        <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={onClose}>{t('Continuar', 'Continue')}</button>
      </div>
    </div>
  );
}

function ShotMap({ shots }) {
  return (
    <svg className="mg-shotmap" viewBox="0 0 210 100" aria-hidden="true">
      <rect x="1" y="1" width="208" height="98" rx="3" className="mg-shotmap__pitch" />
      <line x1="105" y1="1" x2="105" y2="99" className="mg-shotmap__line" />
      <rect x="1" y="30" width="20" height="40" className="mg-shotmap__line" /><rect x="189" y="30" width="20" height="40" className="mg-shotmap__line" />
      {shots.map((s, i) => {
        const across = s.x ?? 50;
        const progress = s.y ?? 85;
        const x = s.side === 'home' ? progress / 100 * 210 : 210 - progress / 100 * 210;
        const y = s.side === 'home' ? across : 100 - across;
        const r = 2.5 + (s.xg || 0.05) * 12;
        return <circle key={i} cx={x} cy={y} r={r} className={`mg-shotmap__shot is-${s.side} ${s.type === 'goal' ? 'is-goal' : s.outcome === 'saved' ? 'is-saved' : ''}`} />;
      })}
    </svg>
  );
}

export { Pill };
