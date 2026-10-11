import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import { LayoutDashboard, Users, Activity, ArrowLeftRight, ScanSearch, Trophy as TrophyIcon, Mic, Medal, Library, Radio, CalendarDays, Save, Download, Upload, Plus, ArrowUpRight } from "lucide-react";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import Trophy from "../trayectoria/trophies.jsx";
import { world as sharedWorld } from "../trayectoria/world.js";
import { getAvailableYears, getManagerWorld } from "./data.js";
import {
  createManagerCareer, managerReducer, getStandings, getNextFixture, getSquad,
  getManagerSummary, serializeManagerCareer, restoreManagerCareer, getTransferWindow, getRecruitmentFinances,
  refreshInitialManagerCareer,
} from "./engine.js";
import { readManagerSave, writeManagerSave, downloadManagerSave } from "./storage.js";
import PreparationPanel, { Fitness, MedicalRibbon, displayDate } from "./preparation.jsx";
import DivisionPanel, { getStandingZones, ZoneLabel } from "./division-panel.jsx";
import PlayerProvenance from "./player-provenance.jsx";
import ArchiveCoverage from "./archive-coverage.jsx";
import ArchiveRefresh from "./archive-refresh.jsx";
import { getPlayerAge } from "./player-age.js";
import { StudioBackdrop, SquadPitch, DashboardHero } from "./studio-ui.jsx";
import MatchCenter from "./match-center.jsx";
import MatchReport from "./match-report.jsx";
import MarketPanel from "./market-panel.jsx";
import ScoutingPanel from "./scouting-panel.jsx";
import "./styles.css";

const TAB_KEYS = ["office", "squad", "preparation", "market", "scouting", "competitions", "press", "honours", "sources"];
const TAB_ICONS = [LayoutDashboard, Users, Activity, ArrowLeftRight, ScanSearch, TrophyIcon, Mic, Medal, Library];
const TAB_LABELS = {
  es: ["Despacho", "Plantilla", "Preparación", "Mercado", "Ojeadores", "Competiciones", "Prensa", "Palmarés", "Datos y épocas"],
  en: ["Office", "Squad", "Preparation", "Transfers", "Scouting", "Competitions", "Press", "Honours", "Data & eras"],
};
const positions = { GK: "POR", DF: "DEF", MF: "MED", FW: "DEL" };
const money = (value, locale = "es") => new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-GB", {
  style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1,
}).format(Number(value) || 0);
const seasonLabel = (year, competition) => competition?.calendar === "annual" ? String(year) : `${year}/${String(Number(year) + 1).slice(-2)}`;

// Read the interpolated frame shown on screen, without making every animation
// frame re-render the career, its tables, or its autosave.
function visiblePitchFrame() {
  if (typeof document === "undefined") return null;
  const pitch = document.querySelector('[data-testid="live-pitch"]');
  if (!pitch) return null;
  try {
    return { ...JSON.parse(pitch.dataset.frame || "null"), running: pitch.dataset.running === "true" };
  } catch { return null; }
}

function Badge({ item, size = 36 }) {
  const [broken, setBroken] = useState(false);
  const src = item?.crest || item?.logo || item?.flag;
  useEffect(() => setBroken(false), [src]);
  return src && !broken
    ? <img className="fm-badge" width={size} height={size} src={src} alt="" onError={() => setBroken(true)} />
    : <span className="fm-monogram" style={{ width: size, height: size }} aria-hidden="true">{item?.abbreviation || item?.name?.slice(0, 3)?.toUpperCase() || "FC"}</span>;
}

function Stat({ label, children, detail }) {
  return <div className="fm-stat"><span>{label}</span><strong>{children}</strong>{detail && <small>{detail}</small>}</div>;
}

function RosterCoverage({ club, players, snapshotDate, t }) {
  const squad = players.filter((p) => p.clubId === club?.id && !p.retired);
  const real = squad.filter((p) => p.real).length;
  if (!real) return <div className="fm-roster-coverage" data-testid="roster-coverage"><strong>{t("Sin futbolistas reales documentados para este club y año", "No documented real players for this club and year")}</strong><p>{t("Esta selección empieza con una plantilla ficticia. La clasificación histórica acredita al club, pero no a sus jugadores.", "This selection starts with a fictional squad. Historical standings verify the club, but not its players.")}</p><span>0 {t("reales", "real")} · {squad.length} {t("generados", "generated")}</span></div>;
  return <div className="fm-roster-coverage"><strong>{real} {t("reales", "real")} · {squad.length - real} {t("generados", "generated")}</strong><br />{club?.rosterCoverage?.evidenceCutoff ? <>{t("Convocatorias documentadas hasta", "Documented match sheets through")} {club.rosterCoverage.evidenceCutoff}. {t("Puede haber jugadores ausentes; no es una lista completa de inscritos.", "Players may be missing; this is not a complete registration list.")}</> : club?.rosterCoverage?.precision === "season" ? t("Lista documentada de la temporada: puede incluir movimientos del mercado de invierno.", "Documented season list: may include winter transfers.") : <>{snapshotDate && <>{t("Fecha del archivo inicial", "Starting archive date")}: {snapshotDate}. </>}{t("Consulta la procedencia de cada futbolista en Plantilla. Las valoraciones y el potencial son estimaciones del juego.", "View each player's provenance in Squad. Ratings and potential are game estimates.")}</>}</div>;
}

function SourcePanel({ t, data }) {
  const realCount = data.players.filter((p) => p.real).length;
  const leagues = data.competitions.filter(item => item.simulated !== false && item.selectable !== false);
  const unavailable = data.coverage?.unavailableLeagues || [];
  return <section className="fm-panel fm-source-panel">
    <span className="fm-kicker">{t("EL ARCHIVO DEL FÚTBOL", "THE FOOTBALL ARCHIVE")}</span>
    <h2>{t("Cada época, con sus límites a la vista.", "Every era, with its coverage in view.")}</h2>
    <p>{t("Las carreras parten de una selección histórica de jugadores reales y completan las plantillas con futbolistas generados, identificados en cada ficha. A partir del primer partido, los resultados escriben tu propia historia.", "Careers start with a historical selection of real players and fill squads with generated footballers, identified on every profile. From the first match, results write your own history.")}</p>
    {data.coverage?.snapshotDate && <p><strong>{t("Fecha del archivo inicial", "Starting archive date")}: {data.coverage.snapshotDate}</strong>. {t("En el archivo actualizado se excluyen afiliaciones con fechas ambiguas o sin corroboración suficiente. Una lista de temporada completa se identifica por separado en la plantilla.", "The updated archive excludes affiliations with ambiguous dates or insufficient corroboration. Full-season lists are identified separately in the squad.")}</p>}
    <div className="fm-stats"><Stat label={t("Ligas disponibles", "Available leagues")}>{leagues.length}</Stat><Stat label={t("Clubes", "Clubs")}>{data.clubs.length}</Stat><Stat label={t("Jugadores reales", "Real players")}>{realCount}</Stat></div>
    <p>{t("Participantes históricos documentados", "Documented historical participants")}: <strong>{data.coverage?.historicalCompetitions || 0} / {leagues.length}</strong> · {seasonLabel(Number(data.coverage?.snapshotDate?.slice(0, 4)) || data.year)}. {t("Plantillas reales completas", "Complete real squads")}: <strong>{data.coverage?.rostersComplete ? t("sí", "yes") : t("cobertura parcial", "partial coverage")}</strong>. {Boolean(data.coverage?.rosterClubs) && <>{data.coverage.rosterClubs} {t("clubes con jugadores reales", "clubs with real players")} · {data.coverage.importedRealPlayers || 0} {t("jugadores del archivo abierto", "players from the open archive")}.</>}</p>
    <div className="fm-coverage-leagues">{leagues.map((item) => <span key={item.id} className={item.historicalMembership ? "is-documented" : ""}>{item.membershipSource ? <a href={item.membershipSource} target="_blank" rel="noreferrer">{item.name} · {item.seasonLabel || data.year} · {item.membershipCoverage?.clubCount} {t("clubes", "clubs")}</a> : <>{item.name} · {item.historicalMembership ? t("participantes históricos", "historical participants") : t("aproximación", "approximate")}</>}</span>)}</div>
    {unavailable.length > 0 && <details className="fm-archive-gaps"><summary>{unavailable.length} {t("ligas sin archivo verificado para este año", "leagues without a verified archive for this year")}</summary><p>{t("No se ofrecen para iniciar una carrera en esta temporada. Elige otro año para consultar su disponibilidad.", "They are not offered for a new career in this season. Choose another year to check availability.")}</p><div>{unavailable.map(item => <p key={item.id}><strong>{item.name}</strong><span>{item.reason}</span></p>)}</div></details>}
    <ArchiveCoverage year={data.year} t={t} />
    <ul className="fm-source-list">
      <li><strong>{t("Trayectorias y archivos en varios idiomas", "Career histories and multilingual archives")} · CC BY-SA 4.0</strong><p>{t("Las biografías aportan afiliaciones individuales durante años interiores de etapas cerradas. Se excluyen años de entrada y salida y solapamientos de cesiones. Las listas en otros idiomas requieren una temporada explícita; ninguna de estas fuentes se presenta automáticamente como una plantilla completa.", "Biographies supply individual affiliations in interior years of closed spells. Arrival and departure years and overlapping loans are excluded. Lists in other languages require an explicit season; neither source automatically establishes a complete squad.")}</p><p><a href="/data/football-manager/verified-player-careers.json" target="_blank" rel="noreferrer">{t("Trayectorias, fuentes y atribuciones", "Career histories, sources and attributions")} ↗</a></p><a href="/data/football-manager/multilingual-season-rosters.json" target="_blank" rel="noreferrer">{t("Plantillas en otros idiomas y atribuciones", "Multilingual squads and attributions")} ↗</a></li>
      <li><a href="https://doi.org/10.1038/s41597-019-0247-7" target="_blank" rel="noreferrer">Pappalardo et al. · CC BY 4.0</a><p>{t("Convocatorias de 98 clubes de 2017/18, limitadas a partidos anteriores al 1 de septiembre de 2017. Adaptación de GameLock; autores y evidencias en el archivo. No son plantillas completas de inscritos.", "Match sheets for 98 clubs in 2017/18, limited to matches before 1 September 2017. GameLock adaptation; authors and evidence in the archive. These are not complete registration lists.")}</p><a href="/data/football-manager/research-season-rosters.json" target="_blank" rel="noreferrer">{t("Archivo y atribuciones", "Archive and attributions")} ↗</a></li>
      <li><a href="https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use/en#7._Licensing_of_Content" target="_blank" rel="noreferrer">Wikimedia · CC BY-SA 4.0</a><p>{t('Participantes y listas de jugadores extraídos de artículos de temporada. Adaptación estructurada de GameLock a partir de aportaciones de los colaboradores de Wikipedia. Cada registro conserva revisión, atribución e historial; las listas de temporada no acreditan por sí solas la afiliación en un día concreto.', 'Participants and player lists extracted from season articles. Structured adaptation by GameLock from Wikipedia contributors. Each record retains revision, attribution and history; a season list alone does not establish membership on a specific day.')}</p><a href="/data/football-manager/wikimedia-rosters.json" target="_blank" rel="noreferrer">{t('Consultar archivo de plantillas y atribuciones','View squad archive and attributions')} ↗</a></li>
      <li><a href="https://github.com/openfootball/v0-format" target="_blank" rel="noreferrer">OpenFootball v0-format · CC0</a><p>{t("Archivo histórico 2005–2015: MLS, clubes europeos y las dos primeras divisiones alemanas. Listas parciales con identidades documentadas; los huecos se mantienen visibles.", "Historical archive 2005–2015: MLS, European clubs and the top two German divisions. Partial lists with documented identities; gaps remain visible.")}</p><a href="/data/football-manager/cc0-season-rosters.json" target="_blank" rel="noreferrer">{t("Consultar archivo y fuentes", "View archive and sources")} ↗</a></li>
      <li><a href="https://github.com/openfootball/football.json" target="_blank" rel="noreferrer">OpenFootball · CC0</a><p>{t("Resultados abiertos y participantes por temporada. Los repositorios nacionales también aportan plantillas de temporadas concretas. Cuando hay cobertura, el nivel inicial de los clubes usa resultados de la temporada anterior.", "Open results and season participants. National repositories also provide squads for specific seasons. Where available, initial club strength uses previous-season results.")}</p></li>
      <li><a href="https://www.wikidata.org/wiki/Wikidata:Licensing" target="_blank" rel="noreferrer">Wikidata · CC0</a><p>{t("Identidades y trayectorias con fechas. La cobertura histórica depende de las declaraciones disponibles; las valoraciones, potenciales y presupuestos son estimaciones del juego.", "Identities and dated career records. Historical coverage depends on available statements; ratings, potentials and budgets are game estimates.")}</p></li>
      <li><strong>{t("Escudos y trofeos de Carrera futbolera", "Football Career crests and trophies")}</strong><p>{t("Se reutilizan los recursos del juego. Las marcas y las imágenes conservan sus derechos originales; CC0 de los datos no se aplica a los logos.", "The existing game's assets are reused. Trademarks and images retain their original rights; the data's CC0 license does not cover logos.")}</p></li>
      <li><a href="https://www.ea.com/es/games/ea-sports-fc/fc-27/news/pitch-notes-fc27-career-mode-deep-dive" target="_blank" rel="noreferrer">{t("Referencia de diseño: Carrera de EA SPORTS FC 27", "Design reference: EA SPORTS FC 27 Career")}</a><p>{t("Consultas previas, acuerdos con club y jugador y áreas de ojeo documentadas por EA. Los cálculos, misiones y reglas económicas de esta simulación son propios; no se utilizan sus activos ni sus datos propietarios.", "EA documents enquiries, club and player agreements and scouting areas. This simulation uses its own calculations, assignments and financial rules; no proprietary EA assets or datasets are used.")}</p></li>
    </ul>
    <div className="fm-note">{t("Cobertura parcial: este catálogo no incluye todas las ligas del mundo ni plantillas históricas completas. Las nuevas carreras solo ofrecen ligas con participantes documentados para el año elegido. Las partidas antiguas conservan su archivo inicial. Los torneos usan formatos simplificados y las valoraciones no son estadísticas oficiales.", "Partial coverage: this catalogue does not include every world league or complete historical squads. New careers only offer leagues with documented participants for the selected year. Older saves retain their starting archive. Tournaments use simplified formats and ratings are not official statistics.")}</div>
  </section>;
}

function Standings({ state, competitionId, t }) {
  const rows = getStandings(state, competitionId);
  const zones = getStandingZones(state, competitionId, rows);
  const clubs = new Map(state.world.clubs.map((club) => [club.id, club]));
  return <div className="fm-table-scroll"><table className="fm-table fm-standings"><thead><tr><th>#</th><th>{t("Club", "Club")}</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>PTS</th></tr></thead><tbody>
    {rows.map((row, i) => <tr className={row.clubId === state.clubId ? "is-own" : ""} key={row.clubId}><td><span className="fm-rank">{i + 1}<ZoneLabel zone={zones.get(row.clubId)} t={t} /></span></td><td><span className="fm-club-cell"><Badge item={clubs.get(row.clubId)} size={24} />{clubs.get(row.clubId)?.name || row.clubId}</span></td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.gd > 0 ? "+" : ""}{row.gd}</td><td><strong>{row.points}</strong></td></tr>)}
  </tbody></table></div>;
}

function CompetitionCard({ cup, state, t }) {
  const team = (id) => id?.startsWith("nation:")
    ? { ...sharedWorld.countries[id.slice(7)], name: sharedWorld.countries[id.slice(7)]?.name_es || id.slice(7) }
    : state.world.clubs.find((item) => item.id === id);
  return <article className="fm-panel fm-cup">
    <Trophy id={cup.trophyId || "cup"} competition={state.world.competitions.find((item) => item.id === state.world.clubs.find((item) => item.id === state.clubId)?.competitionId)} confederation={cup.confederation} size={42} />
    <h3>{cup.name}</h3>
    {cup.winnerId ? <p className="fm-cup-winner"><Badge item={team(cup.winnerId)} size={28} /><strong>{team(cup.winnerId)?.name || cup.winnerId}</strong></p> : <p>{t("En competición", "Still competing")}: {cup.remaining?.length || 0} · {t("Ronda", "Round")} {(cup.round || 0) + 1}</p>}
    <small>{cup.formatNote || t("Eliminatorias simplificadas de la simulación.", "Simplified simulation knockout format.")}</small>
    {cup.results?.length > 0 && <details><summary>{t("Ver resultados", "View results")} ({cup.results.length})</summary><div className="fm-cup-results">{cup.results.map((result) => <p key={result.fixture.id}><span>{team(result.fixture.homeId)?.name}</span><b>{result.homeGoals}–{result.awayGoals}{result.penalties ? ` (${result.penalties.home}–${result.penalties.away} p.)` : ""}</b><span>{team(result.fixture.awayId)?.name}</span></p>)}</div></details>}
  </article>;
}

export default function ManagerGame({ locale = "es" }) {
  const lang = locale === "en" ? "en" : "es";
  const t = (es, en) => lang === "es" ? es : en;
  const [year, setYear] = useState(2012);
  const [leagueId, setLeagueId] = useState("laliga");
  const [clubId, setClubId] = useState("barcelona");
  const [managerName, setManagerName] = useState("");
  const [seed, setSeed] = useState("HISTORIA-2012");
  const [career, setCareer] = useState(null);
  const [saved, setSaved] = useState(() => readManagerSave(restoreManagerCareer));
  const [tab, setTab] = useState("office");
  const [setupSources, setSetupSources] = useState(false);
  const [message, setMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);



  const [targetId, setTargetId] = useState("");
  const [marketView, setMarketView] = useState("all");



  const [viewLeague, setViewLeague] = useState("");
  const [confirmNew, setConfirmNew] = useState(false);
  const importRef = useRef(null);
  const navigationRef = useRef(null);
  const data = useMemo(() => getManagerWorld(year), [year]);
  const clubMap = useMemo(() => new Map((career?.world.clubs || []).map((club) => [club.id, club])), [career?.world]);
  const playerMap = useMemo(() => new Map((career?.world.players || []).map((player) => [player.id, player])), [career?.world]);
  const selectableLeagues = data.competitions.filter((competition) => competition.selectable !== false && competition.simulated !== false && data.clubs.some((club) => club.competitionId === competition.id));
  const league = selectableLeagues.find((item) => item.id === leagueId) || selectableLeagues[0];
  const clubs = data.clubs.filter((club) => club.competitionId === league?.id).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const selectedClub = clubs.find((club) => club.id === clubId) || clubs[0];
  const previewPlayers = data.players.filter((p) => p.clubId === selectedClub?.id).sort((a, b) => Number(b.real) - Number(a.real) || b.rating - a.rating).slice(0, 6);

  const dispatch = (action) => { setMessage(""); setCareer((state) => managerReducer(state, action)); };
  useEffect(() => { if (career) setSaveFailed(!writeManagerSave(career, serializeManagerCareer)); }, [career]);
  useEffect(() => { if (tab === "match" && !career?.activeMatch && !career?.lastMatch) setTab("office"); }, [tab, career?.activeMatch, career?.lastMatch]);
  useEffect(() => {
    const navigation = navigationRef.current;
    const active = navigation?.querySelector('[aria-current="page"]');
    if (navigation && active && navigation.scrollWidth > navigation.clientWidth) {
      const parentRect = navigation.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      navigation.scrollTo({ left: navigation.scrollLeft + activeRect.left - parentRect.left - (parentRect.width - activeRect.width) / 2 });
    }
    navigation?.closest('.launch-body')?.scrollTo({ top: 0 });
  }, [tab, Boolean(career)]);
  useGameRuntimeBridge({ career, tab, year, clubId: selectedClub?.id }, (snapshot) => snapshot.career ? {
    mode: "manager", tab: snapshot.tab, ...getManagerSummary(snapshot.career), year: snapshot.career.year,
    phase: snapshot.career.phase, round: snapshot.career.round, morale: snapshot.career.morale,
    activeMatch: snapshot.career.activeMatch ? Object.fromEntries([
      "minute", "fixture", "events", "homeGoals", "awayGoals", "period", "pausedFor", "autoSubstitutions",
      "homeLineup", "awayLineup", "homeBench", "awayBench", "ownSide", "tactics",
      "substitutionsUsed", "maxSubstitutions", "minutes", "condition", "injuredIds", "stats", "actions",
      "presentation", "modelVersion", "homeTactics", "awayTactics",
    ].map((key) => [key, snapshot.career.activeMatch[key]])) : null, lastMatch: snapshot.career.lastMatch,
    squad: getSquad(snapshot.career).map((p) => ({ id: p.id, name: p.name, clubId: p.clubId, ownerClubId: p.ownerClubId, wage: p.wage, contract: p.contract, position: p.position, rating: p.rating, age: p.age, birthDate: p.birthDate, birthDateCorrection: p.birthDateCorrection, real: p.real, source: p.source, sourceUrl: p.sourceUrl, initialClubId: p.initialClubId, membershipDate: p.membershipDate, membershipPrecision: p.membershipPrecision, stintFrom: p.stintFrom, stintTo: p.stintTo, identityPageId: p.identityPageId, identityWiki: p.identityWiki, wikidataId: p.wikidataId, nationality: p.nationality, selected: p.selected, condition: p.condition, sharpness: p.sharpness, injury: p.injury, available: p.available, minutes: p.stats?.minutes ?? 0 })),
    archiveRevision: snapshot.career.world.coverage?.archiveRevision, snapshotDate: snapshot.career.world.coverage?.snapshotDate,
    autoLineup: snapshot.career.autoLineup, trainingIntensity: snapshot.career.trainingIntensity, divisionPlan: snapshot.career.divisionPlan, divisionChanges: snapshot.career.divisionChanges,
    negotiation: snapshot.career.negotiation, scoutReports: snapshot.career.scoutReports,
    transferWindow: getTransferWindow(snapshot.career), recruitmentFinances: getRecruitmentFinances(snapshot.career),
    scoutMissions: snapshot.career.scoutMissions, shortlist: snapshot.career.shortlist, pendingTransfers: snapshot.career.pendingTransfers,
    transferListings: snapshot.career.transferListings, transferOffers: snapshot.career.transferOffers, transfers: snapshot.career.transfers,
    loanNegotiation: snapshot.career.loanNegotiation, renewalNegotiation: snapshot.career.renewalNegotiation,
    loans: snapshot.career.loans, contractRights: snapshot.career.contractRights, financialObligations: snapshot.career.financialObligations,
    awards: snapshot.career.awards, visiblePitch: visiblePitchFrame(), coordinates: "Animated tactical pitch: percentages 0–100, origin top-left, x right, y down. Choreography follows simulated plays; positions are not tracking data.",
  } : { mode: "manager-setup", year: snapshot.year, clubId: snapshot.clubId }, (ms) => {
    if (ms >= 1000) setCareer((current) => current?.activeMatch ? managerReducer(current, { type: "ADVANCE_MATCH", minutes: Math.min(15, Math.floor(ms / 1000)) }) : current);
  });

  async function importSave(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("size");
      const next = restoreManagerCareer(await file.text());
      if (!next) throw new Error("invalid");
      setCareer(next); setTab(next.activeMatch ? "match" : "office"); setMessage(t("Carrera importada.", "Career imported."));
    } catch { setMessage(t("No se pudo abrir esa partida. Comprueba que es un archivo de Modo mánager válido.", "Could not open this save. Check that it is a valid Manager Mode file.")); }
    event.target.value = "";
  }

  const fileInput = <input ref={importRef} type="file" accept=".json,application/json" className="fm-file-input" aria-label={t("Importar partida", "Import save")} onChange={importSave} />;
  if (!career) return <div className="fm-game fm-setup" lang={lang}>
    {fileInput}
    <header className="fm-hero"><StudioBackdrop /><div className="fm-hero-copy"><span className="fm-kicker">GameLock Football</span><h1>{t("Tu sitio está", "Your place is")}<br />{t("en el banquillo.", "on the touchline.")}</h1><p>{t("Elige tu época y tu club. Prepara el once, lee el partido y decide cuándo cambiarlo todo.", "Choose your era and your club. Prepare your XI, read the match and decide when to change everything.")}</p><div className="fm-hero-features"><span><Users size={15} />{t("Construye tu equipo", "Build your team")}</span><span><Radio size={15} />{t("Dirige en directo", "Coach live")}</span></div></div><div className="fm-hero-mark" aria-hidden="true"><Trophy id="continental_a" size={95} /><span>MANAGER<br /><b>LEGACY</b></span></div></header>
    <div className="fm-setup-toolbar"><span className="fm-live-dot" />{t("Tu próxima carrera empieza aquí", "Your next career starts here")}<button className="fm-text-button" onClick={() => setSetupSources(!setupSources)}>{t("Datos y cobertura", "Data & coverage")}</button></div>
    {message && <p className="fm-notice" role="status">{message}</p>}
    {saved.error && <p className="fm-notice">{t("El guardado local no se pudo leer. Puedes importar una copia o crear otra carrera.", "The local save could not be read. Import a backup or create another career.")}</p>}
    {setupSources ? <SourcePanel t={t} data={data} /> : <div className="fm-setup-grid">
      <form className="fm-panel fm-new-career" onSubmit={(event) => { event.preventDefault(); try { if (!selectedClub) throw new Error(t("No hay participantes verificados para esta selección.", "No verified participants are available for this selection.")); setCareer(createManagerCareer({ year, clubId: selectedClub.id, managerName: managerName.trim() || "Mánager", seed: seed || `MANAGER-${year}` })); setTab("office"); } catch (error) { setMessage(error.message); } }}>
        <span className="fm-kicker">{t("Nueva carrera", "New career")}</span><h2>{t("Todo empieza con un club", "It starts with a club")}</h2>
        <div className="fm-era-shortcuts">{[2012, 2023, 2025].map((value) => <button type="button" className={year === value ? "is-active" : ""} onClick={() => setYear(value)} key={value}><b>{seasonLabel(value)}</b><span>{value === 2012 ? t("La era de los gigantes", "The era of giants") : value === 2023 ? t("Plantillas del archivo", "Archive squads") : t("La nueva generación", "The next generation")}</span></button>)}</div>
        <div className="fm-fields"><label>{t("Temporada inicial", "Starting season")}<select value={year} onChange={(event) => setYear(Number(event.target.value))}>{getAvailableYears().map((value) => <option key={value} value={value}>{seasonLabel(value, league)}</option>)}</select></label><label>{t("Tu nombre", "Your name")}<input maxLength={40} value={managerName} onChange={(event) => setManagerName(event.target.value)} placeholder={t("Nombre del mánager", "Manager name")} /></label></div>
        <label>{t("Liga", "League")}<select aria-label={t("Liga", "League")} value={league?.id} onChange={(event) => { setLeagueId(event.target.value); setClubId(""); }}>{selectableLeagues.map((competition) => <option key={competition.id} value={competition.id}>{sharedWorld.countries[competition.country_fifa_code]?.[lang === "es" ? "name_es" : "name_en"] || competition.country_fifa_code} · {competition.name}{competition.historicalMembership ? " ✓" : " ≈"}</option>)}</select></label>
        <label>{t("Tu club", "Your club")}<select aria-label={t("Tu club", "Your club")} value={selectedClub?.id} onChange={(event) => setClubId(event.target.value)}>{clubs.map((club) => <option key={club.id} value={club.id}>{club.name}</option>)}</select></label>
        <p className="fm-coverage-status">{league?.historicalMembership ? t("✓ Participantes de esta temporada documentados. Plantillas parciales.", "✓ Documented season participants. Partial squads.") : t("No hay participantes verificados para esta selección.", "No verified participants are available for this selection.")}</p><p className="fm-note">{selectableLeagues.length} {t("ligas documentadas para este año", "documented leagues for this year")}{data.coverage?.catalogLeagues ? ` / ${data.coverage.catalogLeagues}` : ""}. {t("Las ligas sin archivo no se sustituyen por clubes de otra época.", "Missing archives are not replaced with clubs from another era.")}</p><details className="fm-seed"><summary>{t("Semilla de simulación", "Simulation seed")}</summary><input aria-label={t("Semilla", "Seed")} value={seed} maxLength={40} onChange={(event) => setSeed(event.target.value)} /><small>{t("Mismas decisiones y semilla: misma carrera.", "Same decisions and seed: same career.")}</small></details>
        <button type="submit" className="fm-button fm-primary fm-start" disabled={!selectedClub}>{t("Firmar y empezar", "Sign & start")} <ArrowUpRight size={18} /></button>
        <div className="fm-save-actions">{saved.career && <button type="button" onClick={() => { setCareer(saved.career); setTab(saved.career.activeMatch ? "match" : "office"); }} className="fm-text-button"><Save size={15} />{t("Continuar partida", "Continue save")} · {saved.career.year}</button>}<button type="button" className="fm-text-button" onClick={() => importRef.current?.click()}><Upload size={15} />{t("Importar partida", "Import save")}</button></div>
      </form>
      <div className="fm-club-preview"><span className="fm-kicker">02 / {t("TU PRÓXIMO ESCUDO", "YOUR NEXT CREST")}</span><div className="fm-preview-identity"><Badge item={selectedClub} size={84} /><h2>{selectedClub?.name}</h2><span><Badge item={league} size={22} />{league?.name} · {seasonLabel(year, league)}</span></div><div className="fm-stats"><Stat label={t("Nivel estimado", "Estimated rating")}>{selectedClub?.rating}<small>/ 100</small></Stat><Stat label={t("Para fichajes", "Transfer budget")}>{money(selectedClub?.budget, lang)}</Stat></div><RosterCoverage club={selectedClub} players={data.players} snapshotDate={data.coverage?.snapshotDate} t={t} /><h3>{t("Nombres de esta época", "Names from this era")}</h3><div className="fm-preview-players">{previewPlayers.map((player) => <div key={player.id}><span className="fm-position">{positions[player.position] || player.position}</span><span>{player.name}<small>{player.real ? t("Jugador real", "Real player") : t("Jugador generado", "Generated player")}</small></span><b>{player.rating}</b></div>)}</div><p className="fm-note">{t("El archivo combina plantillas documentadas, trayectorias reales y futbolistas generados donde faltan datos. Nivel, potencial y presupuesto estimados.", "The archive combines documented squads, real careers and generated players where data is missing. Ratings, potential and budgets are estimates.")}</p></div>
    </div>}
    <footer className="fm-footer"><span>{selectableLeagues.length} {t("ligas disponibles", "available leagues")} · {data.clubs.length} {t("clubes", "clubs")}</span><span>{t("Datos abiertos. Historias nuevas.", "Open data. New stories.")}</span></footer>
  </div>;

  const summary = getManagerSummary(career);
  const ownClub = clubMap.get(career.clubId);
  const ownLeague = career.world.competitions.find((competition) => competition.id === ownClub?.competitionId);
  const squad = getSquad(career);
  const fixture = getNextFixture(career);
  const fixtureCompetition = career.world.competitions.find((competition) => competition.id === fixture?.competitionId)
    || career.tournaments?.find((competition) => competition.id === fixture?.competitionId)
    || career.divisionPlan?.playoffs?.find((competition) => competition.id === fixture?.competitionId) || ownLeague;
  const disabledActions = Boolean(career.activeMatch) || career.phase === "complete";

  const actionBar = <div className="fm-match-actions">{career.activeMatch ? <button className="fm-button fm-primary" onClick={() => setTab("match")}><Radio size={17} />{t("Volver al partido", "Back to the match")}</button> : career.phase === "complete" ? <button className="fm-button fm-primary" onClick={() => dispatch({ type: "NEXT_SEASON" })}>{t("Empezar próxima temporada", "Start next season")} <ArrowUpRight size={17} /></button> : <><button className="fm-button fm-primary" onClick={() => { dispatch({ type: "PLAY_MATCH", mode: "deep" }); setTab("match"); }}><Radio size={17} />{career.phase === "tournaments" ? t("Siguiente ronda de copas", "Next cup round") : career.phase === "playoffs" ? t("Dirigir promoción", "Manage playoff") : t("Dirigir partido", "Manage match")}</button><button className="fm-button" onClick={() => { setTab("office"); dispatch({ type: "PLAY_MATCH", mode: "quick" }); }}>{t("Simulación rápida", "Quick simulation")}</button></>}</div>;
  const shownMatch = career.activeMatch || career.lastMatch;
  const matchFixture = shownMatch?.fixture || shownMatch || fixture;
  const matchHeader = tab === "match" && Number.isInteger(matchFixture?.round)
    ? `${matchFixture.knockout ? t("Ronda", "Round") : t("Jornada", "Matchday")} ${matchFixture.round + 1}` : null;

  return <MotionConfig reducedMotion="user"><div className="fm-game fm-career fm-studio-layout" lang={lang}>
    {fileInput}
    <header className="fm-career-header"><div className="fm-header-identity"><Badge item={ownClub} size={52} /><div><span className="fm-kicker">Manager Legacy / {seasonLabel(career.year, ownLeague)}</span><h1>{ownClub?.name}</h1><small>{career.managerName} · {ownLeague?.name}</small></div></div><div className="fm-header-season"><span><CalendarDays size={14} />{displayDate(tab === "match" ? matchFixture?.date || career.date : career.date, lang)}</span><b>{matchHeader || (career.phase === "complete" ? t("Finalizada", "Completed") : career.phase === "tournaments" ? t("Copas internacionales", "International cups") : career.phase === "playoffs" ? t("Promociones", "Playoffs") : `${t("Jornada", "Matchday")} ${Math.min(career.round + 1, summary.totalRounds || 99)}`)}</b></div></header>
    <nav className="fm-tabs" ref={navigationRef} aria-label={t("Secciones del mánager", "Manager sections")}>
      {TAB_KEYS.map((key, i) => { const Icon = TAB_ICONS[i]; return <button key={key} className={tab === key ? "is-active" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}><Icon size={18} aria-hidden="true" /><span>{TAB_LABELS[lang][i]}</span></button>; })}
      {shownMatch && <button className={`fm-match-tab ${tab === "match" ? "is-active" : ""}`} aria-current={tab === "match" ? "page" : undefined} onClick={() => setTab("match")}><Radio size={18} aria-hidden="true" /><span>{t("Partido", "Match")} {career.activeMatch ? `${career.activeMatch.minute}′` : t("· Final", "· Full time")}</span></button>}
    </nav>
    <motion.main className="fm-career-body" key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .16 }}>
      {saveFailed && <p className="fm-notice" role="alert">{t("No hay espacio para guardar en este navegador. Exporta la partida para conservarla.", "This browser could not save. Export your career to keep it.")}</p>}
      {message && <p className="fm-notice" role="status">{message}</p>}
      {career.lastError && <p className="fm-notice" role="alert">{career.lastError}</p>}
      {career.activeMatch && tab !== "match" && <button className="fm-live-return" onClick={() => setTab("match")}><Radio size={17} /><span>{t("Partido en curso", "Match in progress")} · {career.activeMatch.minute}′ · {career.activeMatch.homeGoals}–{career.activeMatch.awayGoals}</span><b>{t("Volver al banquillo", "Return to the touchline")}</b><ArrowUpRight size={16} /></button>}
      {tab === "match" && shownMatch && <><MatchCenter career={career} dispatch={dispatch} t={t} lang={lang} />{!career.activeMatch && <button type="button" className="fm-button" onClick={() => setTab("office")}>{t("Volver al despacho", "Return to the office")} <ArrowUpRight size={16} /></button>}</>}
      {['office', 'squad', 'sources'].includes(tab) && <ArchiveRefresh career={career} currentRevision={data.coverage?.archiveRevision} t={t} onExport={() => downloadManagerSave(career, serializeManagerCareer)} onRefresh={() => {
        try {
          const refreshed = refreshInitialManagerCareer(career);
          if (refreshed.lastError) throw new Error(refreshed.lastError);
          setCareer(refreshed); setTargetId(""); setMessage(t("Plantilla inicial actualizada con el archivo corregido.", "Starting squad updated with the corrected archive."));
        } catch (error) { setMessage(error.message); }
      }} />}
      {tab === "office" && <>
        <div className="fm-section-heading"><div><span className="fm-kicker">{t("Despacho del entrenador", "Manager's office")}</span><h2>{t("Prepara tu próximo capítulo.", "Prepare your next chapter.")}</h2></div><span className="fm-pill">{t("Moral", "Morale")} {career.morale}%</span></div>
        <MedicalRibbon summary={summary} onOpen={() => setTab("preparation")} t={t} lang={lang} />
        <div className="fm-stats fm-stats-four"><Stat label={t("Posición en liga", "League position")}>{getStandings(career).find((row) => row.clubId === career.clubId)?.played ? summary.position : "—"}<small> / {getStandings(career).length}</small></Stat><Stat label={t("Disponible para fichajes", "Available transfer budget")}>{money(summary.availableTransferBudget ?? summary.budget, lang)}</Stat><Stat label={t("Salarios / semana", "Wages / week")}>{money(summary.wageBill, lang)}</Stat><Stat label={t("Margen salarial", "Wage headroom")}>{money(summary.availableWages ?? summary.remainingWages, lang)}</Stat></div>
        <div className="fm-office-grid">
          <DashboardHero home={clubMap.get(fixture?.homeId)} away={clubMap.get(fixture?.awayId)} competition={fixtureCompetition} date={displayDate(summary.nextMatchDate, lang)} round={career.phase === 'season' ? career.round + 1 : null} activeMatch={career.activeMatch} phase={career.phase} actions={actionBar} t={t}
            lastResult={career.lastMatch && <><span>{t("Último resultado", "Last result")}</span><strong>{clubMap.get(matchFixture?.homeId)?.name} {shownMatch.homeGoals} – {shownMatch.awayGoals} {clubMap.get(matchFixture?.awayId)?.name}</strong></>} />
          <SquadPitch squad={squad} formation={career.tactics.formation} t={t} club={ownClub} onSelectPlayer={() => setTab("squad")} />
        </div>
        {!career.activeMatch && <MatchReport match={career.lastMatch} clubs={clubMap} t={t} />}
        <section className="fm-panel fm-desk-news"><div className="fm-section-heading"><h3>{t("En la mesa del despacho", "On your desk")}</h3><span className="fm-kicker">{t("Últimas noticias", "Latest news")}</span></div><div className="fm-news">{(career.news || []).slice(0, 5).map((item, i) => <article key={item.id || i}><Radio size={16} aria-hidden="true" /><p>{item.text}</p></article>)}{!career.news?.length && <p>{t("Revisa tu once, encarga un informe y prepara el primer partido.", "Review your lineup, commission a scouting report and prepare for kickoff.")}</p>}</div></section>
      </>}
      {tab === "squad" && <><div className="fm-section-heading"><div><span className="fm-kicker">{t("PIZARRA Y VESTUARIO", "TACTICS & DRESSING ROOM")}</span><h2>{t("Tu idea de fútbol", "Your football philosophy")}</h2></div><span className="fm-pill">{squad.filter((p) => p.selected).length}/11 {t("titulares", "starters")}</span></div><span className="fm-pill">{career.autoLineup ? t("Rotación automática activa", "Automatic rotation on") : t("Once seleccionado manualmente", "Manually selected XI")}</span><RosterCoverage club={ownClub} players={career.world.players} snapshotDate={career.world.coverage?.snapshotDate} t={t} /><div className="fm-tactics"><label>{t("Formación", "Formation")}<select aria-label={t("Formación", "Formation")} value={career.tactics.formation} disabled={disabledActions} onChange={(event) => dispatch({ type: "SET_TACTICS", formation: event.target.value })}>{["4-3-3", "4-4-2", "3-5-2", "4-2-3-1", "5-3-2"].map((value) => <option key={value}>{value}</option>)}</select></label><label>{t("Mentalidad", "Mentality")}<select aria-label={t("Mentalidad", "Mentality")} value={career.tactics.mentality} disabled={disabledActions} onChange={(event) => dispatch({ type: "SET_TACTICS", mentality: event.target.value })}><option value="balanced">{t("Equilibrada", "Balanced")}</option><option value="attacking">{t("Ofensiva", "Attacking")}</option><option value="defensive">{t("Defensiva", "Defensive")}</option></select></label><button className="fm-button fm-small" disabled={disabledActions} onClick={() => dispatch({ type: "AUTO_LINEUP" })}>{t("Mejor once", "Best XI")}</button><p>{t("Mejor once activa la rotación automática según condición. Al marcar titulares pasas a selección manual. Posición, táctica y fatiga influyen en el rendimiento.", "Best XI enables automatic fitness-based rotation. Selecting starters switches to a manual lineup. Position, tactics and fatigue affect performance.")}</p></div><div className="fm-table-scroll"><table className="fm-table"><thead><tr><th>XI</th><th>{t("Jugador", "Player")}</th><th>{t("Edad", "Age")}</th><th>OVR</th><th>POT</th><th>{t("Condición", "Condition")}</th><th>{t("Goles", "Goals")}</th><th>{t("Salario", "Wage")}</th><th /></tr></thead><tbody>{squad.map((p) => <tr key={p.id}><td><input type="checkbox" aria-label={`${t("Titular", "Start")} ${p.name}`} checked={Boolean(p.selected)} disabled={disabledActions || p.available === false} onChange={() => dispatch({ type: "TOGGLE_STARTER", playerId: p.id })} /></td><td><span className="fm-player-name"><span className="fm-position">{positions[p.position]}</span><span>{p.name}<PlayerProvenance player={p} world={career.world} t={t} /></span></span></td><td>{p.age}</td><td><b className="fm-rating">{p.rating}</b></td><td>{p.potential}</td><td><Fitness player={p} t={t} /></td><td>{p.stats?.goals || 0}</td><td>{money(p.wage, lang)}</td><td><button className="fm-text-button" disabled={disabledActions} onClick={() => { dispatch({ type: "LIST_FOR_TRANSFER", playerId: p.id }); setTargetId(""); setMarketView("sales"); setTab("market"); }}>{t("Ofrecer", "List")}</button></td></tr>)}</tbody></table></div></>}
      {tab === "preparation" && <PreparationPanel state={career} squad={squad} summary={summary} dispatch={dispatch} t={t} lang={lang} />}
      {tab === "market" && <MarketPanel state={career} summary={summary} dispatch={dispatch} t={t} lang={lang} Badge={Badge} initialTargetId={targetId} initialView={marketView} />}
      {tab === "scouting" && <ScoutingPanel state={career} summary={summary} dispatch={dispatch} t={t} lang={lang} Badge={Badge} onTarget={(id) => { setTargetId(id); setMarketView("all"); setTab("market"); }} />}
      {tab === "competitions" && <><div className="fm-section-heading"><div><span className="fm-kicker">{t("EL FÚTBOL NO PARA", "FOOTBALL NEVER STOPS")}</span><h2>{t("La carrera por los títulos", "The race for silverware")}</h2></div><Trophy id="league" competition={ownLeague} size={48} /></div><label>{t("Clasificación de liga", "League standings")}<select value={viewLeague || ownClub.competitionId} onChange={(event) => setViewLeague(event.target.value)}>{career.world.competitions.filter((item) => career.leagues[item.id]).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><DivisionPanel state={career} competitionId={viewLeague || ownClub.competitionId} t={t} Badge={Badge} /><Standings state={career} competitionId={viewLeague || ownClub.competitionId} t={t} /><div className="fm-report-grid">{Object.values(career.tournaments || {}).map((cup) => <CompetitionCard key={cup.id} cup={cup} state={career} t={t} />)}</div></>}
      {tab === "press" && <section className="fm-panel fm-press"><span className="fm-kicker">{t("RUEDA DE PRENSA", "PRESS CONFERENCE")}</span><h2>“{t("Míster, ¿qué mensaje le da a la afición?", "Boss, what is your message to the fans?") }”</h2><p>{t("Tus palabras cambian la moral. Hay una comparecencia por jornada.", "Your words affect morale. One press conference per matchday.")}</p><div className="fm-press-options">{[["calm", t("Paso a paso", "One step at a time"), t("Confío en el trabajo del equipo. No vamos a perder la calma.", "I trust this team's work. We will keep our composure.")], ["ambitious", t("Miramos hacia arriba", "Looking to the top"), t("Este escudo nos exige competir para ganar.", "This crest demands that we compete to win.")], ["critical", t("Hay que dar más", "We need more"), t("Podemos mejorar. Aquí nadie tiene el puesto asegurado.", "We can improve. Nobody's place is guaranteed.")]].map(([tone, title, description]) => <button key={tone} disabled={disabledActions} onClick={() => dispatch({ type: "PRESS", tone })}><strong>{title}</strong><span>{description}</span><b>↗</b></button>)}</div><p className="fm-pill">{t("Moral del vestuario", "Dressing room morale")}: {career.morale}%</p></section>}
      {tab === "honours" && <><div className="fm-section-heading"><div><span className="fm-kicker">{t("EL LEGADO", "THE LEGACY")}</span><h2>{t("Los nombres que quedan.", "The names that remain.")}</h2></div></div><div className="fm-honours">{[["ballon_dor", t("Balón de Oro", "Ballon d’Or")], ["golden_boot", t("Bota de Oro", "Golden Boot")], ["golden_glove", t("Guante de Oro", "Golden Glove")]].map(([id, label]) => { const award = Array.isArray(career.awards) ? career.awards.find((item) => (item.id || item.type)?.replaceAll("-", "_") === id) : career.awards?.[id]; return <article className="fm-panel" key={id}><Trophy id={id} size={80} /><h3>{label}</h3><strong>{playerMap.get(award?.playerId)?.name || award?.name || t("Por decidir", "To be decided")}</strong><p>{t("Se otorga al terminar la temporada según el rendimiento simulado.", "Awarded at season end based on simulated performance.")}</p></article>; })}</div><section className="fm-panel"><h3>{t("Historial de temporadas", "Season history")}</h3>{(career.history || []).map((item, i) => <p key={i}>{seasonLabel(item.year)} · {t("Posición", "Position")}: {item.position || item.leaguePosition || "—"}</p>)}{!career.history?.length && <p>{t("Tu primera página todavía se está escribiendo.", "Your first page is still being written.")}</p>}</section></>}
      {tab === "sources" && <SourcePanel t={t} data={career.world} />}
      {!["office", "match"].includes(tab) && career.news?.length > 0 && <p className="fm-status" role="status">{career.news[0].text}</p>}
    </motion.main>
    <footer className="fm-footer"><span><Save size={14} aria-hidden="true" />{saveFailed ? t("Guardado pendiente", "Not saved") : t("Guardado automático en este dispositivo", "Autosaved on this device")}</span><div><button className="fm-text-button" onClick={() => downloadManagerSave(career, serializeManagerCareer)}><Download size={14} />{t("Exportar", "Export")}</button><button className="fm-text-button" onClick={() => importRef.current?.click()}><Upload size={14} />{t("Importar", "Import")}</button><button className="fm-text-button" onClick={() => setConfirmNew(!confirmNew)}><Plus size={14} />{t("Nueva carrera", "New career")}</button></div></footer>
    {confirmNew && <div className="fm-confirm"><p>{t("Al iniciar otra carrera se sustituirá el guardado automático. Puedes exportar esta antes.", "Starting another career will replace the autosave. You can export this one first.")}</p><button className="fm-button" onClick={() => { setSaved({ career, error: null }); setCareer(null); setConfirmNew(false); }}>{t("Ir al selector", "Go to setup")}</button><button className="fm-text-button" onClick={() => setConfirmNew(false)}>{t("Seguir aquí", "Stay here")}</button></div>}
  </div></MotionConfig>;
}
