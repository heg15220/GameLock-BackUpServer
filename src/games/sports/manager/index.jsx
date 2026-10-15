import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import useGameRuntimeBridge from '../../../utils/useGameRuntimeBridge';
import { ManagerContext } from './ui/context.jsx';
import Setup from './ui/Setup.jsx';
import Hub from './ui/Hub.jsx';
import { Backdrop, LoadingScreen } from './ui/Backdrop.jsx';
import { createCareer, continueCareer, userFixtureToday } from './career/career.js';
import { saveCareer, loadCareer, loadSummary, exportCareer, importCareer, deleteSave } from './career/save.js';
import { unreadCount } from './career/inbox.js';
import './ui/manager.css';

/** Fit the game to the space its host gives it (launch modal, page, phone). */
function useFitHeight(rootRef) {
  const [height, setHeight] = useState(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const measure = () => {
      const body = root.closest('.launch-body');
      if (body) {
        const style = getComputedStyle(body);
        const padBottom = parseFloat(style.paddingBottom) || 0;
        const bodyRect = body.getBoundingClientRect();
        const offset = root.getBoundingClientRect().top - bodyRect.top + body.scrollTop;
        const available = body.clientHeight - padBottom - offset - 6;
        setHeight(Math.max(200, Math.round(available)));
      } else {
        setHeight(Math.max(520, Math.min(window.innerHeight - 24, 1000)));
      }
    };
    measure();
    const body = root.closest('.launch-body');
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (body && observer) observer.observe(body);
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    const late = setTimeout(measure, 350);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('orientationchange', measure); clearTimeout(late); };
  }, [rootRef]);
  return height;
}

export default function ManagerGame({ locale = 'es' }) {
  const lang = locale === 'en' ? 'en' : 'es';
  const t = useCallback((es, en) => (lang === 'es' ? es : en), [lang]);
  const rootRef = useRef(null);
  const careerRef = useRef(null);
  const [version, setVersion] = useState(0);
  const [screen, setScreen] = useState('setup');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const [advancing, setAdvancing] = useState(null);
  const [moments, setMoments] = useState([]);
  const [section, setSection] = useState({ id: 'central', params: {} });
  const [sheet, setSheet] = useState(null);
  const [matchFixture, setMatchFixture] = useState(null);
  const [error, setError] = useState(null);
  const height = useFitHeight(rootRef);
  const saveTimer = useRef(null);
  const stopRef = useRef(false);

  useEffect(() => { loadSummary().then(setSummary); }, []);
  useEffect(() => {
    // Condensed display face for headings, loaded once for the whole page.
    if (document.getElementById('mg-font')) return;
    const link = document.createElement('link');
    link.id = 'mg-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  const persist = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!careerRef.current) return;
      setSaveState('saving');
      try { await saveCareer(careerRef.current); setSaveState('saved'); } catch { setSaveState('failed'); }
    }, 1200);
  }, []);

  useEffect(() => {
    const flush = () => { if (document.visibilityState === 'hidden' && careerRef.current) saveCareer(careerRef.current).catch(() => {}); };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, []);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const act = useCallback((fn) => {
    const career = careerRef.current;
    if (!career) return undefined;
    const result = fn(career);
    career.version = (career.version || 0) + 1;
    bump();
    persist();
    return result;
  }, [bump, persist]);

  const go = useCallback((id, params = {}) => {
    setSection({ id, params });
    rootRef.current?.querySelector('.mg-main')?.scrollTo?.({ top: 0 });
  }, []);

  const pushMoments = useCallback((list) => setMoments((current) => [...current, ...list]), []);

  /** Turn the stops of a continue step into on-screen moments. */
  const momentsFromStops = useCallback((career, result) => {
    const list = [];
    const latestInbox = career.inbox.slice(0, 12);
    for (const stop of result.stops || []) {
      if (stop.kind === 'trophy') { if (career.flags.celebration) list.push({ type: 'celebration', ...career.flags.celebration }); continue; }
      const item = latestInbox.find((entry) => entry.id === stop.id);
      if (!item) continue;
      if (item.kind === 'event') list.push({ type: 'event', event: item.event, inbox: item.id });
      else if (item.kind === 'offer') list.push({ type: 'offer', offer: item.offer, inbox: item.id });
      else if (item.kind === 'stage') list.push({ type: 'stage', stage: item.stage, inbox: item.id });
      else if (item.kind === 'deadline-day') list.push({ type: 'toast', inbox: item.id, tone: 'warn' });
      else list.push({ type: 'toast', inbox: item.id });
    }
    if (career.flags.reveal) list.push({ type: 'reveal', ...career.flags.reveal });
    if (result.stop === 'season-review') list.push({ type: 'review' });
    if (result.stop === 'new-season') list.push({ type: 'new-season', year: career.year });
    if (result.stop === 'sacked' || career.sacked) list.push({ type: 'sacked' });
    return list;
  }, []);

  /** The Continue button: day by day, so the calendar visibly turns. */
  const advance = useCallback(async () => {
    const career = careerRef.current;
    if (!career || advancing) return;
    const today = userFixtureToday(career);
    if (today) { setMatchFixture(today.id); return; }
    stopRef.current = false;
    setAdvancing({ from: career.date, date: career.date });
    let result = null;
    for (let i = 0; i < 400; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, i === 0 ? 30 : 16)));
      result = continueCareer(career, { single: true });
      setAdvancing({ from: career.date, date: career.date });
      if (result.stop !== 'day' || stopRef.current) break;
    }
    setAdvancing(null);
    bump();
    persist();
    if (!result) return;
    const list = momentsFromStops(career, result);
    if (list.length) pushMoments(list);
    if (result.stop === 'match') setMatchFixture(result.fixture.id);
  }, [advancing, bump, persist, momentsFromStops, pushMoments]);

  const startCareer = useCallback((options) => {
    setLoading({ kind: 'create' });
    setTimeout(() => {
      try {
        const career = createCareer(options);
        careerRef.current = career;
        setScreen('hub');
        setSection({ id: 'central', params: {} });
        setMoments([{ type: 'welcome' }]);
        bump();
        persist();
      } catch (e) {
        setError(String(e?.message || e));
      }
      setLoading(null);
    }, 60);
  }, [bump, persist]);

  const resumeCareer = useCallback(async () => {
    setLoading({ kind: 'load' });
    const record = await loadCareer();
    if (record?.career) {
      careerRef.current = record.career;
      setScreen('hub');
      setSection({ id: 'central', params: {} });
      if (record.career.live && !record.career.live.complete) setMatchFixture(record.career.live.id);
      bump();
    } else setError('load');
    setLoading(null);
  }, [bump]);

  const importFile = useCallback(async (file) => {
    setLoading({ kind: 'load' });
    try {
      const career = await importCareer(file);
      careerRef.current = career;
      setScreen('hub');
      setSection({ id: 'central', params: {} });
      bump();
      persist();
    } catch { setError('import'); }
    setLoading(null);
  }, [bump, persist]);

  const leave = useCallback(async () => {
    if (careerRef.current) await saveCareer(careerRef.current).catch(() => {});
    careerRef.current = null;
    setScreen('setup');
    setMoments([]);
    setMatchFixture(null);
    setSummary(await loadSummary());
  }, []);

  const career = careerRef.current;
  const value = useMemo(() => ({
    career, version, lang, t, act, go, section, setSheet, sheet, advance, advancing, stopAdvance: () => { stopRef.current = true; },
    moments, setMoments, matchFixture, setMatchFixture, rootEl: rootRef.current, saveState, bump, persist,
    exportCareer: () => careerRef.current && exportCareer(careerRef.current), leave, unread: career ? unreadCount(career) : 0,
  }), [career, version, lang, t, act, go, section, sheet, advance, advancing, moments, matchFixture, saveState, bump, persist, leave]);

  useGameRuntimeBridge({ version, screen, section }, () => {
    const c = careerRef.current;
    if (!c) return { mode: 'manager-setup', save: Boolean(summary) };
    const club = c.world.clubs[c.clubId];
    return {
      mode: 'manager', date: c.date, stage: c.stage, club: club?.name, section: section.id, match: c.live ? { minute: c.live.clock, score: c.live.score, phase: c.live.phase } : null,
      budget: c.finances.transferBudget, inbox: unreadCount(c), confidence: Math.round(c.board.confidence),
    };
  });

  return (
    <ManagerContext.Provider value={value}>
      <div ref={rootRef} className={`mg-root ${screen === 'setup' ? 'is-setup' : 'is-hub'}`} lang={lang} style={height ? { '--mg-h': `${height}px` } : undefined} data-testid="manager-root">
        <Backdrop tint={career?.world.clubs[career.clubId]?.color} />
        {screen === 'setup' || !career
          ? <Setup summary={summary} onStart={startCareer} onResume={resumeCareer} onImport={importFile} onDelete={async () => { await deleteSave(); setSummary(null); }} />
          : <Hub />}
        {loading && <LoadingScreen kind={loading.kind} />}
        {error && (
          <div className="mg-toast mg-toast--bad" role="alert">
            <span>{error === 'import' ? t('No se pudo abrir ese archivo de partida.', 'Could not open that save file.') : error === 'load' ? t('No se pudo cargar la partida guardada.', 'Could not load the saved career.') : t('Algo ha fallado al crear la carrera.', 'Something went wrong creating the career.')}</span>
            <button type="button" onClick={() => setError(null)}>OK</button>
          </div>
        )}
      </div>
    </ManagerContext.Provider>
  );
}
