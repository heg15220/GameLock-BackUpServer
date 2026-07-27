import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import { NBALD_CSS } from "./ui.css.js";
import { DECADES, decadeLabel } from "./cards.js";
import {
  createDraft, rollForCandidates, choosePick, defaultStarterIds,
  buildTeam, ROSTER_SIZE, STARTERS,
} from "./draft.js";
import { makeRng } from "./rng.js";
import { pickRivalTeams } from "./teamSeasons.js";
import { simulateGame, quickResult } from "./simulation.js";
import {
  buildLeague, simulateNonUserGames, playGameInstant, recordGame, gameSeed,
  userGames, standings, startPlayoffs, advancePlayoffs, activeUserSeries,
  recordSeriesGame, seriesGameSeed, roundLabel,
} from "./tournament.js";
import { t, roleLabel, ROLE_SHORT, describeEvent, periodLabel } from "./copy.js";

// Inyecta la hoja de estilos una sola vez.
let cssInjected = false;
function useInjectCss() {
  useEffect(() => {
    if (cssInjected) return;
    const el = document.createElement("style");
    el.id = "nbald-css";
    el.textContent = NBALD_CSS;
    document.head.appendChild(el);
    cssInjected = true;
  }, []);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ─── Tarjeta de jugador ───────────────────────────────────────────────────────
function PlayerCard({ card, lang, onPick, selected, staticCard }) {
  const Tag = onPick ? "button" : "div";
  return (
    <Tag
      type={onPick ? "button" : undefined}
      className={`nbald-card${staticCard ? " is-static" : ""}${selected ? " is-sel" : ""}`}
      onClick={onPick ? () => onPick(card) : undefined}
      aria-pressed={onPick ? !!selected : undefined}
    >
      <span className="nbald-ovr">{card.overall}<small>{t(lang, "overall")}</small></span>
      <span className="nbald-role">{roleLabel(card.role, lang)}</span>
      <div className="nbald-cname">{card.name}</div>
      <div className="nbald-cdecade">{card.decadeLabel} · {card.height ? `${card.height}"` : ""}</div>
      <div className="nbald-cstats">
        <span><b>{card.stats.ppg}</b> {t(lang, "pts").toLowerCase()}</span>
        <span><b>{card.stats.rpg}</b> {t(lang, "reb").toLowerCase()}</span>
        <span><b>{card.stats.apg}</b> {t(lang, "ast").toLowerCase()}</span>
      </div>
    </Tag>
  );
}

// ─── Cancha de draft: huecos por posición + banquillo ─────────────────────────
const COURT_ROLES = ["BASE", "ESCOLTA", "ALERO", "ALA_PIVOT", "PIVOT"];
const SPOT_POS = {
  PIVOT: { top: "17%", left: "38%" },
  ALA_PIVOT: { top: "29%", left: "71%" },
  ALERO: { top: "44%", left: "20%" },
  ESCOLTA: { top: "56%", left: "80%" },
  BASE: { top: "70%", left: "47%" },
};

// Coloca cartas en los 5 huecos por su rol; si dos comparten rol, el sobrante
// ocupa el siguiente hueco libre (juega "fuera de posición").
function arrangeToSpots(cards) {
  const spots = { BASE: null, ESCOLTA: null, ALERO: null, ALA_PIVOT: null, PIVOT: null };
  const leftover = [];
  [...cards].sort((a, b) => b.overall - a.overall).forEach((c) => {
    if (spots[c.role] === null) spots[c.role] = c;
    else leftover.push(c);
  });
  for (const c of leftover) {
    const empty = COURT_ROLES.find((r) => spots[r] === null);
    if (empty) spots[empty] = c;
    else break;
  }
  return spots;
}

function Token({ card, lang, onClick, on }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined}
      className={`nbald-tok${onClick ? " click" : ""}${on ? " on" : ""}`}
      onClick={onClick} title={`${card.name} · ${roleLabel(card.role, lang)} · ${card.overall}`}>
      <span className="o">{card.overall}</span>
      <span className="rc">{ROLE_SHORT[card.role]}</span>
      <span className="n">{card.name}</span>
    </Tag>
  );
}

function CourtLineup({ roster, lang, interactive = false, starterIds, onToggle, benchSize = 3 }) {
  const onCourt = interactive
    ? roster.filter((c) => starterIds.has(c.id))
    : Object.values(arrangeToSpots(roster)).filter(Boolean);
  const onCourtIds = new Set(onCourt.map((c) => c.id));
  const spots = arrangeToSpots(onCourt);
  const bench = roster.filter((c) => !onCourtIds.has(c.id));
  const benchHoles = Math.max(0, benchSize - bench.length);
  return (
    <div className="nbald-courtwrap">
      <div className="nbald-court" aria-label={lang === "es" ? "Cancha" : "Court"}>
        <div className="nbald-3pt" /><div className="nbald-key" /><div className="nbald-hoop" />
        {COURT_ROLES.map((role) => {
          const c = spots[role];
          return (
            <div key={role} className="nbald-spot" style={SPOT_POS[role]}>
              {c ? (
                <Token card={c} lang={lang}
                  onClick={interactive ? () => onToggle(c.id) : undefined} on={interactive} />
              ) : (
                <div className="nbald-hole">{roleLabel(role, lang)}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="nbald-benchzone">
        <span className="lbl">{t(lang, "bench")}</span>
        <div className="nbald-benchslots">
          {bench.map((c) => (
            <Token key={c.id} card={c} lang={lang}
              onClick={interactive ? () => onToggle(c.id) : undefined} />
          ))}
          {Array.from({ length: benchHoles }, (_, i) => (
            <div key={`h${i}`} className="nbald-benchhole">+</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tabla de clasificación ───────────────────────────────────────────────────
function StandingsTable({ conf, lang, userId, title }) {
  return (
    <div className="nbald-panelbox">
      <h5 className="nbald-eyebrow" style={{ marginBottom: 6 }}>{title}</h5>
      <div className="nbald-scroll">
        <table className="nbald-table">
          <thead>
            <tr>
              <th className="l">#</th><th className="l">{lang === "es" ? "Equipo" : "Team"}</th>
              <th>{t(lang, "wins")}</th><th>{t(lang, "losses")}</th><th>+/-</th>
            </tr>
          </thead>
          <tbody>
            {conf.map((r, i) => (
              <tr key={r.team.id} className={r.team.id === userId ? "is-user" : ""}>
                <td className="l">{i + 1}</td>
                <td className="l">{r.team.name}</td>
                <td>{r.w}</td><td>{r.l}</td>
                <td>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Box score ────────────────────────────────────────────────────────────────
function BoxTable({ team, box, lang }) {
  return (
    <div className="nbald-panelbox">
      <div className="nbald-between" style={{ marginBottom: 6 }}>
        <h5 style={{ fontSize: "1rem" }}>{team.name}</h5>
      </div>
      <div className="nbald-scroll">
        <table className="nbald-table">
          <thead>
            <tr>
              <th className="l">{t(lang, "min")}</th>
              <th>{t(lang, "pts")}</th><th>{t(lang, "reb")}</th><th>{t(lang, "ast")}</th>
              <th>{t(lang, "stl")}</th><th>{t(lang, "blk")}</th>
              <th>{t(lang, "fg")}</th><th>{t(lang, "tp")}</th>
            </tr>
          </thead>
          <tbody>
            {box.map((p, i) => (
              <tr key={p.id} className={i === 0 ? "mvp" : ""}>
                <td className="l">{p.name} <span className="nbald-muted">{ROLE_SHORT[p.role]} {p.min}′</span></td>
                <td>{p.pts}</td><td>{p.reb}</td><td>{p.ast}</td>
                <td>{p.stl}</td><td>{p.blk}</td>
                <td>{p.fgm}/{p.fga}</td><td>{p.tpm}/{p.tpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Cuadro de playoffs ───────────────────────────────────────────────────────
function Bracket({ playoffs, byId, userId, lang }) {
  const labelFor = (count) => {
    const key = { "primera-ronda": "firstRound", "semis-conferencia": "confSemis",
      "finales-conferencia": "confFinals", "finales": "finals" }[roundLabel(count)];
    return t(lang, key);
  };
  return (
    <div className="nbald-bracket">
      {playoffs.rounds.map((round, ri) => (
        <div className="nbald-round" key={ri}>
          <h5>{labelFor(round.length)}</h5>
          {round.map((s) => {
            const hi = byId.get(s.hiId), lo = byId.get(s.loId);
            const hiW = s.winnerId === s.hiId, loW = s.winnerId === s.loId;
            return (
              <div key={s.id} className={`nbald-series${s.isUser ? " is-user" : ""}`}>
                <div className={`t${hiW ? " w" : ""}`}>
                  <span><span className="sd">{s.hiSeed}</span> {hi.name}</span><b>{s.winsHi}</b>
                </div>
                <div className={`t${loW ? " w" : ""}`}>
                  <span><span className="sd">{s.loSeed}</span> {lo.name}</span><b>{s.winsLo}</b>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function NbaLegendsDraftGame() {
  useInjectCss();
  const [lang, setLang] = useState(() => (resolveBrowserLanguage() === "es" ? "es" : "en"));
  const [phase, setPhase] = useState("menu");
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((n) => n + 1), []);

  const rngRef = useRef(null);
  const leagueRef = useRef(null);

  const [teamName, setTeamName] = useState("");
  const [draft, setDraft] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [dieFace, setDieFace] = useState("");
  const [starterSel, setStarterSel] = useState(new Set());
  const [matchView, setMatchView] = useState(null);
  const [boxView, setBoxView] = useState(null);
  const rollTimer = useRef(null);

  useEffect(() => () => clearInterval(rollTimer.current), []);

  const defaultName = lang === "es" ? "Mis Leyendas" : "My Legends";

  // ── Draft ──
  const startDraft = useCallback(() => {
    rngRef.current = makeRng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    setDraft(createDraft());
    setPhase("draft");
  }, []);

  const rollDie = useCallback(() => {
    if (rolling || !draft || draft.phase !== "roll") return;
    const finish = () => {
      setDraft(rollForCandidates(draft, rngRef.current));
      setRolling(false);
    };
    if (prefersReducedMotion()) return finish();
    setRolling(true);
    let n = 0;
    clearInterval(rollTimer.current);
    rollTimer.current = setInterval(() => {
      setDieFace(decadeLabel(DECADES[Math.floor(Math.random() * DECADES.length)]));
      if (++n > 11) {
        clearInterval(rollTimer.current);
        finish();
      }
    }, 55);
  }, [rolling, draft]);

  const pickCard = useCallback((card) => {
    const d = choosePick(draft, card);
    setDraft(d);
    if (d.phase === "done") {
      setStarterSel(defaultStarterIds(d.picks));
      setPhase("lineup");
    }
  }, [draft]);

  // ── Quinteto ──
  const toggleStarter = useCallback((id) => {
    setStarterSel((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else if (s.size < STARTERS) s.add(id);
      return s;
    });
  }, []);

  const confirmLineup = useCallback(() => {
    const userTeam = buildTeam("user", teamName.trim() || defaultName, draft.picks, starterSel);
    // Rivales = 15 equipos REALES de temporadas reales al azar (nombre y plantilla
    // reales), elegidos del caché de temporadas-equipo.
    const rivals = pickRivalTeams(rngRef.current, 15);
    const league = buildLeague(userTeam, rivals);
    simulateNonUserGames(league);
    leagueRef.current = league;
    setPhase("season");
    bump();
  }, [teamName, defaultName, draft, starterSel, bump]);

  // ── Reproducción de partido ──
  const openMatch = useCallback((teamA, teamB, seed, ref, context) => {
    const result = simulateGame(teamA, teamB, { seed, wantEvents: true });
    setMatchView({
      events: result.events, idx: 0, result, teamA, teamB, ref, context,
      speed: 1, playing: true, recorded: false,
    });
    setPhase("game");
  }, []);

  // Avance temporizado del play-by-play.
  useEffect(() => {
    if (phase !== "game" || !matchView?.playing) return undefined;
    const len = matchView.events.length;
    if (matchView.idx >= len - 1) return undefined;
    const delay = matchView.speed === 2 ? 105 : 230;
    const id = setInterval(() => {
      setMatchView((mv) => {
        if (!mv) return mv;
        if (mv.idx >= mv.events.length - 1) return { ...mv, playing: false };
        return { ...mv, idx: mv.idx + 1 };
      });
    }, delay);
    return () => clearInterval(id);
  }, [phase, matchView?.playing, matchView?.speed, matchView?.idx, matchView?.events.length]);

  // Registra el resultado cuando termina la reproducción.
  useEffect(() => {
    if (phase !== "game" || !matchView) return;
    const atEnd = matchView.idx >= matchView.events.length - 1;
    if (!atEnd || matchView.recorded) return;
    const { ref, result } = matchView;
    if (ref.type === "game") recordGame(ref.game, result);
    else recordSeriesGame(ref.series, result, leagueRef.current);
    setMatchView((mv) => ({ ...mv, recorded: true, playing: false }));
    bump();
  }, [phase, matchView, bump]);

  const skipToEnd = useCallback(() => {
    setMatchView((mv) => (mv ? { ...mv, idx: mv.events.length - 1, playing: false } : mv));
  }, []);

  const openBox = useCallback(() => {
    setBoxView({
      result: matchView.result, teamA: matchView.teamA, teamB: matchView.teamB,
      ref: matchView.ref, context: matchView.context,
    });
    setPhase("box");
  }, [matchView]);

  // ── Playoffs ──
  const advancePlayoffState = useCallback(() => {
    const league = leagueRef.current;
    let guard = 0;
    while (guard++ < 30) {
      if (league.playoffs.champion) { setPhase("champion"); bump(); return; }
      if (activeUserSeries(league)) { setPhase("playoffs"); bump(); return; }
      advancePlayoffs(league);
    }
    bump();
  }, [bump]);

  const beginPlayoffs = useCallback(() => {
    startPlayoffs(leagueRef.current);
    advancePlayoffState();
  }, [advancePlayoffState]);

  // ── Continuar desde el box score ──
  const continueFromBox = useCallback(() => {
    const { context, ref } = boxView;
    setBoxView(null);
    setMatchView(null);
    if (context === "season") {
      setPhase("season");
    } else if (ref.series.winnerId) {
      advancePlayoffState();
    } else {
      setPhase("playoffs");
    }
  }, [boxView, advancePlayoffState]);

  // ── Acciones de temporada / serie ──
  const league = leagueRef.current;
  const byId = league?.byId;

  const watchUserGame = useCallback((game) => {
    const a = byId.get(game.homeId), b = byId.get(game.awayId);
    openMatch(a, b, gameSeed(game), { type: "game", game }, "season");
  }, [byId, openMatch]);

  const simUserGame = useCallback((game) => { playGameInstant(league, game); bump(); }, [league, bump]);
  const simAllUserGames = useCallback(() => {
    for (const g of userGames(league)) if (!g.result) playGameInstant(league, g);
    bump();
  }, [league, bump]);

  const watchSeriesGame = useCallback((s) => {
    const a = byId.get(s.hiId), b = byId.get(s.loId);
    openMatch(a, b, seriesGameSeed(s), { type: "series", series: s }, "playoff");
  }, [byId, openMatch]);
  const simSeriesGame = useCallback((s) => {
    const a = byId.get(s.hiId), b = byId.get(s.loId);
    recordSeriesGame(s, quickResult(a, b, seriesGameSeed(s)), league);
    if (s.winnerId) advancePlayoffState();
    else bump();
  }, [byId, league, advancePlayoffState, bump]);

  // ── Render ──
  const langToggle = (
    <div className="nbald-seg" role="group" aria-label="idioma">
      <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>ES</button>
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
    </div>
  );

  return (
    <div className="mini-game nbald">
      <div className="mini-head">
        <div>
          <h4>{t(lang, "title")}</h4>
          <p>{t(lang, "tagline")}</p>
        </div>
        <div className="nbald-row">{langToggle}</div>
      </div>

      <div className="nbald-stage">
        {phase === "menu" && (
          <div className="nbald-hero">
            <div className="nbald-ball" aria-hidden="true">🏀</div>
            <h3>{t(lang, "title")}</h3>
            <p className="nbald-muted">{t(lang, "howto")}</p>
            <div className="nbald-field">
              <label htmlFor="nbald-name">{lang === "es" ? "Nombre de tu equipo" : "Your team name"}</label>
              <input id="nbald-name" className="nbald-input" maxLength={22}
                placeholder={defaultName} value={teamName}
                onChange={(e) => setTeamName(e.target.value)} />
            </div>
            <div><button type="button" className="nbald-btn nbald-btn--primary" onClick={startDraft}>
              🎲 {t(lang, "play")}
            </button></div>
          </div>
        )}

        {phase === "draft" && draft && (
          <div className="nbald-draftlayout">
            <div>
              <span className="nbald-eyebrow">{t(lang, "yourRoster")} · {draft.picks.length}/{ROSTER_SIZE}</span>
              <CourtLineup roster={draft.picks} lang={lang} />
            </div>
            <div>
              <div className="nbald-draftbar">
                <div>
                  <span className="nbald-eyebrow">{t(lang, "round")} {Math.min(draft.round + 1, ROSTER_SIZE)}/{ROSTER_SIZE}</span>
                  <div className="nbald-pips">
                    {Array.from({ length: ROSTER_SIZE }, (_, i) => (
                      <span key={i} className={`nbald-pip${i < draft.picks.length ? " is-done" : i === draft.picks.length ? " is-now" : ""}`} />
                    ))}
                  </div>
                </div>
              </div>

              {draft.phase === "roll" ? (
                <div className="nbald-die-wrap">
                  <div className={`nbald-die${rolling ? " is-rolling" : ""}`}>
                    <b>{rolling ? dieFace : "🎲"}</b>
                  </div>
                  <p className="nbald-decadetag">
                    {lang === "es" ? "Tira el dado para revelar una década" : "Roll the die to reveal a decade"}
                  </p>
                  <button type="button" className="nbald-btn nbald-btn--primary" onClick={rollDie} disabled={rolling}>
                    {rolling ? t(lang, "rolling") : t(lang, "rollDie")}
                  </button>
                </div>
              ) : (
                <>
                  <div className="nbald-between" style={{ margin: "6px 0 10px" }}>
                    <span className="nbald-eyebrow">{t(lang, "decade")}: {decadeLabel(draft.decade)} · {t(lang, "pickOne")}</span>
                  </div>
                  <div className="nbald-cardgrid">
                    {draft.candidates.map((c) => (
                      <PlayerCard key={c.id} card={c} lang={lang} onPick={pickCard} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {phase === "lineup" && draft && (() => {
          const ready = starterSel.size === STARTERS;
          return (
            <div className="nbald-draftlayout">
              <div>
                <span className="nbald-eyebrow">{t(lang, "starters")} {starterSel.size}/{STARTERS}</span>
                <CourtLineup roster={draft.picks} lang={lang} interactive
                  starterIds={starterSel} onToggle={toggleStarter} />
              </div>
              <div>
                <span className="nbald-eyebrow">{t(lang, "chooseStarters")}</span>
                <h3 style={{ fontSize: "1.3rem", margin: "4px 0 8px" }}>{teamName.trim() || defaultName}</h3>
                <p className="nbald-muted" style={{ fontSize: ".88rem" }}>
                  {lang === "es"
                    ? "Toca un jugador para moverlo entre la cancha y el banquillo. El motor usa el rol real de cada carta."
                    : "Tap a player to move them between court and bench. The engine uses each card's real role."}
                </p>
                <button type="button" className="nbald-btn nbald-btn--primary"
                  style={{ marginTop: 12 }} onClick={confirmLineup} disabled={!ready}>
                  {ready ? t(lang, "confirmLineup") : t(lang, "need5")}
                </button>
              </div>
            </div>
          );
        })()}

        {phase === "season" && league && (() => {
          const sd = standings(league);
          const games = userGames(league);
          const next = games.find((g) => !g.result);
          const remaining = games.filter((g) => !g.result).length;
          const oppOf = (g) => byId.get(g.homeId === league.userId ? g.awayId : g.homeId);
          return (
            <>
              <div className="nbald-between" style={{ marginBottom: 12 }}>
                <span className="nbald-eyebrow">{t(lang, "regularSeason")} · {games.length - remaining}/{games.length}</span>
                {next ? (
                  <div className="nbald-row">
                    <span className="nbald-muted">{t(lang, "nextGame")}: {oppOf(next).name}</span>
                    <button type="button" className="nbald-btn nbald-btn--primary" onClick={() => watchUserGame(next)}>▶ {t(lang, "watch")}</button>
                    <button type="button" className="nbald-btn" onClick={() => simUserGame(next)}>⏩ {lang === "es" ? "Simular" : "Sim"}</button>
                    <button type="button" className="nbald-btn nbald-btn--ghost" onClick={simAllUserGames}>{lang === "es" ? "Simular todos" : "Sim all"}</button>
                  </div>
                ) : (
                  <button type="button" className="nbald-btn nbald-btn--primary" onClick={beginPlayoffs}>🏆 {t(lang, "startPlayoffs")}</button>
                )}
              </div>
              <div className="nbald-grid2">
                <StandingsTable conf={sd[0]} lang={lang} userId={league.userId} title={`${t(lang, "conference")} A`} />
                <StandingsTable conf={sd[1]} lang={lang} userId={league.userId} title={`${t(lang, "conference")} B`} />
              </div>
            </>
          );
        })()}

        {phase === "game" && matchView && (() => {
          const ev = matchView.events[matchView.idx] || {};
          const done = matchView.idx >= matchView.events.length - 1;
          const feed = matchView.events.slice(0, matchView.idx + 1)
            .filter((e) => e.kind !== "period")
            .slice(-9);
          return (
            <>
              <div className="nbald-scoreboard">
                <div className="nbald-sb-team">
                  <div className="nm">{matchView.teamA.name}</div>
                  <div className="nbald-sb-score">{ev.sa ?? 0}</div>
                </div>
                <div className="nbald-sb-mid">
                  <b>{periodLabel(ev.period || 1, lang)}</b>
                  {ev.clock || "12:00"}
                </div>
                <div className="nbald-sb-team">
                  <div className="nm">{matchView.teamB.name}</div>
                  <div className="nbald-sb-score">{ev.sb ?? 0}</div>
                </div>
              </div>
              <div className="nbald-feed">
                {feed.reverse().map((e, i) => {
                  const txt = describeEvent(e, lang);
                  if (!txt) return null;
                  return (
                    <p key={matchView.idx - i} className={e.kind === "make3" ? "is-3" : e.kind === "steal" || e.kind === "block" ? "is-d" : ""}>
                      <span className="sc">{e.sa}-{e.sb}</span>{txt}
                    </p>
                  );
                })}
              </div>
              <div className="nbald-row" style={{ marginTop: 12, justifyContent: "center" }}>
                {!done ? (
                  <>
                    <div className="nbald-seg" role="group" aria-label={t(lang, "simSpeed")}>
                      <button type="button" aria-pressed={matchView.speed === 1} onClick={() => setMatchView((m) => ({ ...m, speed: 1, playing: true }))}>×1</button>
                      <button type="button" aria-pressed={matchView.speed === 2} onClick={() => setMatchView((m) => ({ ...m, speed: 2, playing: true }))}>×2</button>
                    </div>
                    <button type="button" className="nbald-btn" onClick={skipToEnd}>⏭ {t(lang, "skipToEnd")}</button>
                  </>
                ) : (
                  <button type="button" className="nbald-btn nbald-btn--primary" onClick={openBox}>{t(lang, "boxScore")} →</button>
                )}
              </div>
            </>
          );
        })()}

        {phase === "box" && boxView && (() => {
          const userIsA = boxView.teamA.id === league.userId;
          return (
            <>
              <div className="nbald-scoreboard" style={{ marginBottom: 12 }}>
                <div className="nbald-sb-team"><div className="nm">{boxView.teamA.name}</div>
                  <div className="nbald-sb-score">{boxView.result.scoreA}</div></div>
                <div className="nbald-sb-mid"><b>{t(lang, "finalScore")}</b>{boxView.result.overtimes ? `OT×${boxView.result.overtimes}` : ""}</div>
                <div className="nbald-sb-team"><div className="nm">{boxView.teamB.name}</div>
                  <div className="nbald-sb-score">{boxView.result.scoreB}</div></div>
              </div>
              <div className="nbald-grid2">
                <BoxTable team={boxView.teamA} box={boxView.result.box.A} lang={lang} />
                <BoxTable team={boxView.teamB} box={boxView.result.box.B} lang={lang} />
              </div>
              <div className="nbald-row" style={{ marginTop: 12, justifyContent: "center" }}>
                <span className="nbald-muted">
                  {t(lang, "yourResult")}: {(userIsA ? boxView.result.winner === "A" : boxView.result.winner === "B") ? `✅ ${t(lang, "won")}` : `❌ ${t(lang, "lost")}`}
                </span>
                <button type="button" className="nbald-btn nbald-btn--primary" onClick={continueFromBox}>{t(lang, "continue")} →</button>
              </div>
            </>
          );
        })()}

        {phase === "playoffs" && league?.playoffs && (() => {
          const us = activeUserSeries(league);
          const oppOf = (s) => byId.get(s.hiId === league.userId ? s.loId : s.hiId);
          return (
            <>
              <div className="nbald-between" style={{ marginBottom: 12 }}>
                <span className="nbald-eyebrow">{t(lang, "playoffs")} · {t(lang, "bracket")}</span>
                {us ? (
                  <div className="nbald-row">
                    <span className="nbald-muted">{t(lang, "series")} vs {oppOf(us).name} · {us.winsHi}-{us.winsLo}</span>
                    <button type="button" className="nbald-btn nbald-btn--primary" onClick={() => watchSeriesGame(us)}>▶ {t(lang, "watch")}</button>
                    <button type="button" className="nbald-btn" onClick={() => simSeriesGame(us)}>⏩ {lang === "es" ? "Simular" : "Sim"}</button>
                  </div>
                ) : (
                  <button type="button" className="nbald-btn nbald-btn--primary" onClick={advancePlayoffState}>{t(lang, "advanceRound")} →</button>
                )}
              </div>
              <Bracket playoffs={league.playoffs} byId={byId} userId={league.userId} lang={lang} />
            </>
          );
        })()}

        {phase === "champion" && league?.playoffs?.champion && (() => {
          const champ = league.playoffs.champion;
          const isUser = champ.id === league.userId;
          return (
            <div className="nbald-champ">
              <div className="nbald-trophy" aria-hidden="true">🏆</div>
              <span className="nbald-eyebrow">{t(lang, "finals")}</span>
              <h3>{t(lang, "champion")}</h3>
              <p style={{ fontSize: "1.3rem", fontWeight: 700 }}>{champ.name} {t(lang, "championMsg")}</p>
              <p className="nbald-muted">
                {isUser
                  ? (lang === "es" ? "¡Tus leyendas levantan el anillo!" : "Your legends lift the ring!")
                  : (lang === "es" ? "Fuiste eliminado en el camino." : "You were eliminated along the way.")}
              </p>
              <button type="button" className="nbald-btn nbald-btn--primary" onClick={() => { leagueRef.current = null; setDraft(null); setPhase("menu"); }}>
                🔄 {t(lang, "playAgain")}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
