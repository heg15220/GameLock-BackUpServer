import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import useGameRuntimeBridge from '../../../utils/useGameRuntimeBridge';
import { ManagerContext } from './ui/context.jsx';
import Setup from './ui/Setup.jsx';
import SaveTransfer from './ui/SaveTransfer.jsx';
import Hub from './ui/Hub.jsx';
import { Backdrop, LoadingScreen } from './ui/Backdrop.jsx';
import { createCareer, continueCareer, userFixtureToday } from './career/career.js';
import { loadSeasonEvidence } from './evidence-archive.js';
import { loadSeasonArchives } from './season-archives.js';
import { saveCareer, loadCareer, loadSummary, prepareExport, importCareer, deleteSave, saveToCloud } from './career/save.js';
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
  const [transfer, setTransfer] = useState(null);
  const transferRequest = useRef(0);
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
  // Development only: lets layout audits open moments without playing a season.
  useEffect(() => {
    if (!import.meta.env?.DEV || typeof window === 'undefined') return undefined;
    window.__managerDebug = { career: () => careerRef.current, pushMoments, bump: () => bump?.(), start: (options) => startCareer(options), openMatch: (id) => setMatchFixture(id) };
    return () => { delete window.__managerDebug; };
  });

  /** Turn the stops of a continue step into on-screen moments. */
  const momentsFromStops = useCallback((career, result) => {
    const list = [];
    const latestInbox = career.inbox.slice(0, 12);
    for (const stop of result.stops || []) {
      if (stop.kind === 'trophy') { const won = stop.celebration || career.flags.celebration; if (won) list.push({ type: 'celebration', ...won }); continue; }
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
    setTimeout(async () => {
      try {
        // The season's career evidence (squads and ratings) must be in memory.
        await Promise.all([loadSeasonEvidence(options.year), loadSeasonArchives(options.year)]);
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
      setMoments([]);
      setSheet(null);
      setMatchFixture(career.live && !career.live.complete ? career.live.id : null);
      setScreen('hub');
      setSection({ id: 'central', params: {} });
      bump();
      persist();
    } catch (failure) {
      // Short codes: an unknown code and a missing connection need different advice.
      setError(failure?.status === 404 || failure?.message === 'invalid_code' ? 'import-code' : failure instanceof TypeError ? 'import-offline' : 'import');
    }
    setLoading(null);
  }, [bump, persist]);

  const openExport = useCallback(async () => {
    if (!careerRef.current) return;
    clearTimeout(saveTimer.current);
    setSaveState('saving');
    saveCareer(careerRef.current).then(() => setSaveState('saved'), () => setSaveState('failed'));
    const request = ++transferRequest.current;
    setTransfer({});
    try {
      const career = careerRef.current;
      const prepared = await prepareExport(career);
      if (request !== transferRequest.current) return;
      setTransfer({ ...prepared, cloud: { state: 'saving' } });
      // The short code needs the server; the long code and the file work without it.
      try {
        const cloud = await saveToCloud(career, prepared.blob);
        if (request === transferRequest.current) setTransfer({ ...prepared, cloud: { state: 'saved', ...cloud } });
      } catch (error) {
        if (request === transferRequest.current) setTransfer({ ...prepared, cloud: { state: 'failed', error: error.message } });
      }
    } catch {
      if (request === transferRequest.current) { setTransfer(null); setError('export'); }
    }
  }, []);
  const closeExport = useCallback(() => { transferRequest.current++; setTransfer(null); }, []);

  const leave = useCallback(async () => {
    clearTimeout(saveTimer.current);
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
    exportCareer: openExport, leave, unread: career ? unreadCount(career) : 0,
  }), [career, version, lang, t, act, go, section, sheet, advance, advancing, moments, matchFixture, saveState, bump, persist, leave, openExport]);

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
        {transfer && <SaveTransfer transfer={transfer} onClose={closeExport} />}
        {error && (
          <div className="mg-toast mg-toast--bad" role="alert">
            <span>{error === 'import-code' ? t('Ese código de partida no existe o ha caducado. Revisa que esté completo.', 'That career code does not exist or has expired. Check it is complete.') : error === 'import-offline' ? t('No hay conexión con el servidor. Prueba más tarde o usa el código largo o el archivo.', 'The server cannot be reached. Try later or use the long code or the file.') : error === 'import' ? t('No se pudo abrir la partida. Comprueba que el código o archivo esté completo y sea compatible.', 'Could not open the save. Check that the code or file is complete and compatible.') : error === 'export' ? t('No se pudo preparar la exportación. Tu partida sigue abierta; inténtalo de nuevo.', 'Could not prepare the export. Your career is still open; try again.') : error === 'load' ? t('No se pudo cargar la partida guardada.', 'Could not load the saved career.') : t('Algo ha fallado al crear la carrera.', 'Something went wrong creating the career.')}</span>
            <button type="button" onClick={() => setError(null)}>OK</button>
          </div>
        )}
      </div>
    </ManagerContext.Provider>
  );
}
