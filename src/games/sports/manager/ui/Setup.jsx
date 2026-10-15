import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Flag as FlagIcon, Globe, Play, Search, Star, Trash2, Upload, Users, Wallet, Building2, Sparkles } from 'lucide-react';
import { getAvailableYears, getManagerWorld } from '../data.js';
import { useManager } from './context.jsx';
import { Crest, Flag, Portrait, OvrBadge } from './components.jsx';
import { money, seasonLabel, posLabel } from './format.js';
import { assignPositions } from '../career/positions.js';
import { createStream } from '../career/util.js';

const ERAS = [
  { year: 2025, es: 'La actualidad', en: 'Today' },
  { year: 2018, es: 'La era del VAR', en: 'The VAR era' },
  { year: 2012, es: 'La era de los gigantes', en: 'The era of giants' },
  { year: 2005, es: 'Los galácticos', en: 'The Galácticos' },
  { year: 1998, es: 'Fin de siglo', en: 'Turn of the century' },
];

const CONFS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF'];

function useYearWorld(year) {
  const cache = useRef(new Map());
  const [state, setState] = useState({ year: null, world: null });
  useEffect(() => {
    if (cache.current.has(year)) { setState({ year, world: cache.current.get(year) }); return undefined; }
    setState((s) => ({ ...s, loadingYear: year }));
    const id = setTimeout(() => {
      const world = getManagerWorld(year);
      cache.current.set(year, world);
      setState({ year, world });
    }, 30);
    return () => clearTimeout(id);
  }, [year]);
  return state.year === year ? state.world : null;
}

export default function Setup({ summary, onStart, onResume, onImport, onDelete }) {
  const { lang, t } = useManager();
  const years = useMemo(() => getAvailableYears(), []);
  const [mode, setMode] = useState('home');
  const [step, setStep] = useState(0);
  const [year, setYear] = useState(2025);
  const [leagueId, setLeagueId] = useState(null);
  const [clubId, setClubId] = useState(null);
  const [nation, setNation] = useState(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(0);
  const [conf, setConf] = useState('UEFA');
  const [query, setQuery] = useState('');
  const [deep, setDeep] = useState(null);
  const fileRef = useRef(null);
  const world = useYearWorld(year);

  const leagues = useMemo(() => (world ? world.competitions.filter((c) => c.simulated !== false && c.selectable !== false && world.clubs.some((club) => club.competitionId === c.id)) : []), [world]);
  const confLeagues = leagues.filter((l) => l.confederation === conf).sort((a, b) => (a.tier || 1) - (b.tier || 1) || (b.strength || 0) - (a.strength || 0));
  const league = leagues.find((l) => l.id === leagueId) || null;
  const clubs = useMemo(() => (world && league ? world.clubs.filter((c) => c.competitionId === league.id && c.selectable !== false).sort((a, b) => b.rating - a.rating) : []), [world, league]);
  const club = clubs.find((c) => c.id === clubId) || null;
  const countries = useMemo(() => {
    if (!world) return [];
    const byNat = {};
    for (const p of world.players) (byNat[p.nationality] ||= []).push(p.rating);
    return (world.countries || []).filter((c) => c.confederation && c.confederation !== 'OFC').map((c) => {
      const ratings = (byNat[c.fifa] || []).sort((a, b) => b - a).slice(0, 11);
      const filler = [56, 61, 66, 71, 75, 79][Math.max(0, Math.min(5, c.international_reputation ?? 1))];
      const avg = Math.round(Array.from({ length: 11 }, (_, i) => ratings[i] ?? filler).reduce((a, b) => a + b, 0) / 11);
      return { ...c, avg, players: byNat[c.fifa]?.length || 0 };
    }).filter((c) => c.players >= 3 || (c.international_reputation ?? 0) >= 1).sort((a, b) => b.avg - a.avg);
  }, [world]);

  useEffect(() => { if (leagues.length && !leagues.some((l) => l.id === leagueId)) setLeagueId(null); }, [leagues, leagueId]);

  const steps = [t('Época', 'Era'), t('Liga', 'League'), t('Club', 'Club'), t('Selección', 'Country'), t('Tú', 'You')];
  const canNext = [Boolean(world), Boolean(league), Boolean(club), true, name.trim().length >= 2][step];

  const start = () => onStart({ year, clubId: club.id, managerName: name.trim(), nationFifa: nation, deepLeagues: deep, avatar });

  if (mode === 'home') {
    return (
      <div className="mg-setup mg-setup--home">
        <div className="mg-setup__hero">
          <span className="mg-logo" aria-hidden="true">MC</span>
          <span className="mg-kicker">{t('Modo carrera', 'Career mode')}</span>
          <h1>{t('Tu banquillo te espera', 'Your dugout awaits')}</h1>
          <p>{t('Elige época, club y, si quieres, una selección. Ficha en verano, compite, vuelve al mercado en invierno y pelea por todo hasta el gran torneo del verano.', 'Pick an era, a club and, if you like, a national team. Sign in summer, compete, return to the market in winter and fight for everything up to the big summer tournament.')}</p>
          <div className="mg-season-loop" aria-label={t('Así es cada temporada', 'Every season')}>
            {[t('Mercado de verano', 'Summer window'), t('Primera vuelta', 'First half'), t('Mercado de invierno', 'Winter window'), t('Segunda vuelta', 'Second half'), t('Torneo de selecciones', 'International tournament')].map((label, i) => (
              <span key={label} style={{ '--i': i }}><b>{i + 1}</b>{label}</span>
            ))}
          </div>
        </div>
        <div className="mg-setup__actions">
          {summary && (
            <button type="button" className="mg-save-card" onClick={onResume}>
              <Crest team={{ crest: summary.crest, name: summary.clubName, color: summary.color }} size={54} />
              <span>
                <small>{t('Continuar carrera', 'Continue career')}</small>
                <strong>{summary.clubName}</strong>
                <em>{summary.manager} · {seasonLabel(summary.year)} · {summary.date}</em>
              </span>
              <Play size={22} aria-hidden="true" />
            </button>
          )}
          <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={() => { setMode('wizard'); setStep(0); }}>
            <Sparkles size={18} aria-hidden="true" />{t('Nueva carrera', 'New career')}
          </button>
          <div className="mg-setup__minor">
            <button type="button" className="mg-btn mg-btn--ghost" onClick={() => fileRef.current?.click()}><Upload size={16} />{t('Importar partida', 'Import save')}</button>
            {summary && <button type="button" className="mg-btn mg-btn--ghost" onClick={onDelete}><Trash2 size={16} />{t('Borrar guardado', 'Delete save')}</button>}
          </div>
          <input ref={fileRef} type="file" accept=".json,.gz,application/json,application/gzip" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) onImport(file); e.target.value = ''; }} />
        </div>
      </div>
    );
  }

  return (
    <div className="mg-setup mg-setup--wizard">
      <header className="mg-wizard__head">
        <button type="button" className="mg-icon-btn" onClick={() => (step === 0 ? setMode('home') : setStep(step - 1))} aria-label={t('Atrás', 'Back')}><ArrowLeft size={18} /></button>
        <ol className="mg-wizard__steps">
          {steps.map((label, i) => <li key={label} className={i === step ? 'is-active' : i < step ? 'is-done' : ''}><b>{i < step ? <Check size={12} /> : i + 1}</b><span>{label}</span></li>)}
        </ol>
      </header>

      <div className="mg-wizard__body">
        {step === 0 && (
          <section className="mg-step mg-step--era">
            <h2>{t('¿En qué época empiezas?', 'Which era do you start in?')}</h2>
            <p>{t('Las plantillas salen del archivo histórico de esa temporada. A partir de ahí, la historia la escribes tú.', "Squads come from that season's historical archive. From there, you write the story.")}</p>
            <div className="mg-era-big" aria-live="polite"><b>{seasonLabel(year)}</b>{!world && <span className="mg-spin" aria-hidden="true" />}</div>
            <input className="mg-range" type="range" min={years[0]} max={years[years.length - 1]} value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label={t('Temporada', 'Season')} />
            <div className="mg-era-cards">
              {ERAS.filter((e) => years.includes(e.year)).map((era) => (
                <button type="button" key={era.year} className={year === era.year ? 'is-active' : ''} onClick={() => setYear(era.year)}>
                  <b>{seasonLabel(era.year)}</b><span>{era[lang]}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="mg-step">
            <h2>{t('Elige la liga', 'Choose the league')}</h2>
            <div className="mg-chips" role="tablist">
              {CONFS.map((c) => <button type="button" key={c} className={conf === c ? 'is-active' : ''} onClick={() => setConf(c)}>{c}</button>)}
            </div>
            {!world ? <div className="mg-center"><span className="mg-spin" /></div> : (
              <div className="mg-league-grid">
                {confLeagues.map((l) => {
                  const country = world.countries.find((c) => c.fifa === l.country_fifa_code);
                  const count = world.clubs.filter((c) => c.competitionId === l.id).length;
                  return (
                    <button type="button" key={l.id} className={`mg-league-card ${leagueId === l.id ? 'is-active' : ''}`} onClick={() => { setLeagueId(l.id); setClubId(null); }}>
                      <span className="mg-league-card__logo">{l.logo ? <img src={l.logo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <Globe size={28} />}</span>
                      <strong>{l.name}</strong>
                      <span className="mg-league-card__meta">{country && <Flag country={country} size={12} />}{lang === 'es' ? country?.name_es : country?.name_en} · {t(`${l.tier || 1}.ª división`, `Tier ${l.tier || 1}`)}</span>
                      <span className="mg-league-card__count"><Users size={12} />{count} {t('clubes', 'clubs')}</span>
                    </button>
                  );
                })}
                {!confLeagues.length && <p className="mg-muted">{t('No hay ligas documentadas de esta zona para este año.', 'No documented leagues from this region for this year.')}</p>}
              </div>
            )}
          </section>
        )}

        {step === 2 && world && league && (
          <section className="mg-step mg-step--club">
            <h2>{t('Elige tu club', 'Choose your club')}</h2>
            <div className="mg-club-pick">
              <div className="mg-club-grid">
                {clubs.map((c) => (
                  <button type="button" key={c.id} className={`mg-club-tile ${clubId === c.id ? 'is-active' : ''}`} onClick={() => setClubId(c.id)} style={{ '--club': c.color || '#2a3c4c' }}>
                    <Crest team={{ crest: c.crest, name: c.name, abbr: c.abbreviation, color: c.color }} size={44} />
                    <strong>{c.shortName || c.name}</strong>
                    <span className="mg-stars" aria-label={`${starsFor(c.rating)} / 5`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={10} className={i < starsFor(c.rating) ? 'is-on' : ''} />)}</span>
                  </button>
                ))}
              </div>
              {club && <ClubPreview world={world} club={club} league={league} lang={lang} t={t} />}
            </div>
          </section>
        )}

        {step === 3 && world && (
          <section className="mg-step">
            <h2>{t('¿También seleccionador?', 'National team too?')}</h2>
            <p>{t('Opcional. Dirigirías a una selección en los parones (septiembre, octubre, noviembre y marzo) y en el torneo del verano: Eurocopa, Copa América, Copa de África, Copa de Asia, Copa Oro o Mundial.', 'Optional. You would coach a national team in the international breaks (September, October, November and March) and at the summer tournament: Euro, Copa América, Africa Cup, Asian Cup, Gold Cup or World Cup.')}</p>
            <div className="mg-nation-head">
              <button type="button" className={`mg-btn ${nation === null ? 'mg-btn--primary' : 'mg-btn--ghost'}`} onClick={() => setNation(null)}>{t('Solo mi club', 'Club only')}</button>
              <label className="mg-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('Buscar país', 'Search country')} /></label>
            </div>
            <div className="mg-nation-grid">
              {countries.filter((c) => !query || (lang === 'es' ? c.name_es : c.name_en).toLowerCase().includes(query.toLowerCase())).slice(0, 80).map((c) => (
                <button type="button" key={c.fifa} className={`mg-nation-tile ${nation === c.fifa ? 'is-active' : ''}`} onClick={() => setNation(c.fifa)}>
                  <Flag country={c} size={20} />
                  <strong>{lang === 'es' ? c.name_es : c.name_en}</strong>
                  <OvrBadge value={c.avg} size="sm" />
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 4 && world && club && (
          <section className="mg-step mg-step--you">
            <h2>{t('¿Cómo te llamas, míster?', 'What is your name, boss?')}</h2>
            <input className="mg-input mg-input--big" value={name} maxLength={32} onChange={(e) => setName(e.target.value)} placeholder={t('Tu nombre', 'Your name')} autoFocus />
            <div className="mg-avatar-pick" role="radiogroup" aria-label={t('Tu aspecto', 'Your look')}>
              {Array.from({ length: 6 }, (_, i) => (
                <button type="button" role="radio" aria-checked={avatar === i} key={i} className={avatar === i ? 'is-active' : ''} onClick={() => setAvatar(i)}>
                  <Portrait player={{ id: `manager-${i}`, nat: club.country, age: 44 }} size={64} kit="#1b2733" />
                </button>
              ))}
            </div>
            <DeepPicker world={world} club={club} deep={deep} setDeep={setDeep} t={t} lang={lang} />
            <div className="mg-contract">
              <Crest team={{ crest: club.crest, name: club.name, abbr: club.abbreviation, color: club.color }} size={58} />
              <div>
                <small>{t('Contrato de entrenador', 'Manager contract')}</small>
                <strong>{club.name}</strong>
                <span>{league?.name} · {seasonLabel(year)}{nation ? ` · ${t('Seleccionador de', 'Coach of')} ${lang === 'es' ? countries.find((c) => c.fifa === nation)?.name_es : countries.find((c) => c.fifa === nation)?.name_en}` : ''}</span>
              </div>
            </div>
          </section>
        )}
      </div>

      <footer className="mg-wizard__foot">
        {step < 4
          ? <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" disabled={!canNext} onClick={() => setStep(step + 1)}>{t('Siguiente', 'Next')}<ArrowRight size={18} /></button>
          : <button type="button" className="mg-btn mg-btn--primary mg-btn--xl mg-btn--sign" disabled={!canNext} onClick={start}><FlagIcon size={18} />{t('Firmar contrato', 'Sign contract')}</button>}
      </footer>
    </div>
  );
}

const starsFor = (rating) => Math.max(1, Math.min(5, Math.round((rating - 52) / 8)));

function ClubPreview({ world, club, league, lang, t }) {
  const players = world.players.filter((p) => p.clubId === club.id).sort((a, b) => b.rating - a.rating).slice(0, 5);
  const capacityGuess = 6000 + (club.international_reputation ?? 1) ** 2 * 3600;
  return (
    <aside className="mg-club-preview" style={{ '--club': club.color || '#2a3c4c' }}>
      <div className="mg-club-preview__head">
        <Crest team={{ crest: club.crest, name: club.name, abbr: club.abbreviation, color: club.color }} size={72} />
        <div>
          <h3>{club.name}</h3>
          <span>{league.name}</span>
        </div>
      </div>
      <dl className="mg-facts">
        <div><dt><Star size={13} />{t('Nivel', 'Level')}</dt><dd><OvrBadge value={club.rating} /></dd></div>
        <div><dt><Wallet size={13} />{t('Para fichar', 'Transfer budget')}</dt><dd>{money(club.budget, lang)}</dd></div>
        <div><dt><Building2 size={13} />{t('Estadio', 'Stadium')}</dt><dd>~{Math.round(capacityGuess / 1000)} {t('mil', 'k')}</dd></div>
      </dl>
      <h4>{t('Figuras', 'Key players')}</h4>
      <ul className="mg-preview-players">
        {players.map((p) => {
          const { pos } = assignPositions(p.position, createStream('preview', p.id));
          return <li key={p.id}><OvrBadge value={p.rating} size="sm" /><span>{p.name}</span><em>{posLabel(pos, lang)}</em></li>;
        })}
      </ul>
    </aside>
  );
}

function DeepPicker({ world, club, deep, setDeep, t }) {
  const [open, setOpen] = useState(false);
  const leagues = world.competitions.filter((c) => c.simulated !== false && world.clubs.some((k) => k.competitionId === c.id));
  const own = leagues.find((l) => l.id === club.competitionId);
  const auto = [...new Set([club.competitionId, ...leagues.filter((l) => l.country_fifa_code === own?.country_fifa_code).map((l) => l.id),
    ...leagues.slice().sort((a, b) => (b.strength || 0) - (a.strength || 0) || (a.tier || 1) - (b.tier || 1)).map((l) => l.id)])].slice(0, 10);
  const chosen = deep || auto;
  const toggle = (id) => {
    const list = chosen.slice();
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id].slice(0, 10);
    setDeep(next.includes(club.competitionId) ? next : [club.competitionId, ...next].slice(0, 10));
  };
  return (
    <details className="mg-deep" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{t('Profundidad de simulación', 'Simulation depth')} <small>{deep ? `${chosen.length}/10` : t('Automática', 'Automatic')}</small></summary>
      <p>{t('Elige hasta 10 ligas que se simulan al detalle: goleadores, lesiones, tarjetas y fichajes de la IA. El resto solo calcula resultados (va más rápido).', 'Pick up to 10 leagues simulated in full detail: scorers, injuries, cards and AI transfers. The rest only compute results (faster).')}</p>
      <div className="mg-deep__grid">
        {leagues.map((l) => (
          <label key={l.id} className={chosen.includes(l.id) ? 'is-on' : ''}>
            <input type="checkbox" checked={chosen.includes(l.id)} disabled={l.id === club.competitionId} onChange={() => toggle(l.id)} />
            {l.logo && <img src={l.logo} alt="" width="18" height="18" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
            <span>{l.name}</span>
          </label>
        ))}
      </div>
      {deep && <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" onClick={() => setDeep(null)}>{t('Volver a automática', 'Back to automatic')}</button>}
    </details>
  );
}
