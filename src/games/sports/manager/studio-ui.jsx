import React, { useEffect, useId, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, Radio, Shield, Sparkles, Users } from 'lucide-react';
import { provenanceLabel } from './player-provenance.jsx';
import { defenderRoles } from './lineup-roles.js';

const fallbackTranslate = (es) => es;

/** Original stadium illustration. Decorative architecture, not a named real venue. */
export function StudioBackdrop({ variant = 'setup', className = '' }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`fm-stadium-art fm-stadium-art--${variant} ${className}`} viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#181e19" /><stop offset="1" stopColor="#475844" /></linearGradient>
      <linearGradient id={`${id}-grass`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#415d35" /><stop offset="1" stopColor="#172f23" /></linearGradient>
      <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f0ffd3" stopOpacity=".24" /><stop offset="1" stopColor="#f0ffd3" stopOpacity="0" /></linearGradient>
      <radialGradient id={`${id}-glow`}><stop stopColor="#d7efa9" stopOpacity=".34" /><stop offset="1" stopColor="#d7efa9" stopOpacity="0" /></radialGradient>
      <pattern id={`${id}-seats`} width="13" height="11" patternUnits="userSpaceOnUse"><rect x="2" y="3" width="7" height="3" rx="1" fill="#9fad80" opacity=".3" /></pattern>
    </defs>
    <rect width="1200" height="600" fill={`url(#${id}-sky)`} />
    <ellipse cx="860" cy="290" rx="480" ry="280" fill={`url(#${id}-glow)`} />
    <path d="M370 243Q812 72 1260 244L1260 390Q802 312 365 383Z" fill="#1b281f" />
    <path d="M380 253Q820 99 1220 253L1220 368Q805 302 380 372Z" fill={`url(#${id}-seats)`} />
    {[0, 1, 2, 3].map((n) => <path key={n} d={`M370 ${272 + n * 26}Q810 ${139 + n * 51} 1250 ${272 + n * 26}`} fill="none" stroke="#7c9163" strokeWidth="2" opacity=".3" />)}
    <path d="M324 225Q816 20 1263 224L1250 245Q822 72 360 247Z" fill="#101913" />
    <path d="M324 225Q816 20 1263 224" fill="none" stroke="#7c8b6d" strokeWidth="5" />
    {[430, 580, 730, 880, 1030, 1180].map((x, i) => <path key={x} d={`M${x} ${i === 0 || i === 5 ? 193 : 136}L${x + 18} 351`} fill="none" stroke="#a0ae84" strokeWidth="3" opacity=".25" />)}
    <path d="M385 387Q811 310 1190 383L1360 625H161Z" fill={`url(#${id}-grass)`} />
    {[0, 1, 2, 3, 4].map((n) => <path key={n} d={`M${393 - n * 39} ${398 + n * 42}L${1200 + n * 30} ${398 + n * 42}L${1215 + n * 30} ${419 + n * 42}L${374 - n * 39} ${419 + n * 42}Z`} fill="#90aa63" opacity=".09" />)}
    <g fill="none" stroke="#d7e8bb" strokeWidth="2" opacity=".35">
      <path d="M459 396L1121 396L1258 576H280Z" /><path d="M818 396L810 576" /><ellipse cx="814" cy="464" rx="83" ry="25" />
      <path d="M475 428H529L492 505H369M1100 428H1047L1080 505H1205" />
    </g>
    <g stroke="#a9b895" strokeWidth="5"><path d="M520 93V236M1122 93V236" /></g>
    <path d="M490 95L359 489H848L553 95Z" fill={`url(#${id}-beam)`} /><path d="M1090 95L823 509H1334L1154 95Z" fill={`url(#${id}-beam)`} />
    <g fill="#ecffcf">{[490, 505, 520, 535, 550, 1090, 1105, 1120, 1135, 1150].map((x) => <rect key={x} x={x} y="86" width="10" height="7" rx="2" />)}</g>
    <path d="M0 589Q648 465 1200 584V600H0Z" fill="#101713" />
  </svg>;
}

function StudioCrest({ item, size = 76 }) {
  const source = item?.crest || item?.logo || item?.flag;
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [source]);
  return source && !broken
    ? <img src={source} width={size} height={size} alt="" className="fm-badge" onError={() => setBroken(true)} />
    : <span className="fm-studio-crest-fallback" aria-hidden="true"><Shield size={size * .65} strokeWidth={1} /><b>{item?.abbreviation || item?.name?.slice(0, 3).toUpperCase() || 'FC'}</b></span>;
}

export function DashboardHero({ home, away, competition, date, round, activeMatch, phase, actions, lastResult, t = fallbackTranslate, children }) {
  const hasFixture = Boolean(home && away);
  return <section className={`fm-match-card fm-dashboard-hero ${activeMatch ? 'is-live' : ''}`}>
    <StudioBackdrop variant="match" />
    <div className="fm-dashboard-heading"><span className="fm-card-label">{activeMatch ? <Radio size={14} /> : <span className="fm-live-dot" />}{activeMatch ? t('En directo', 'Live match') : phase === 'complete' ? t('Temporada completada', 'Season complete') : t('Próximo partido', 'Next match')}</span>{date && <span className="fm-fixture-date"><CalendarDays size={13} />{date}</span>}</div>
    {hasFixture ? <>
      <div className="fm-match-competition">{competition && <StudioCrest item={competition} size={21} />}<span>{competition?.name || t('Calendario de la carrera', 'Career schedule')}{round ? ` · ${t('Jornada', 'Matchday')} ${round}` : ''}</span></div>
      <div className="fm-match-teams"><div><StudioCrest item={home} size={82} /><strong>{home.name}</strong><small>{t('Local', 'Home')}</small></div><div className="fm-score">{activeMatch ? `${activeMatch.homeGoals} : ${activeMatch.awayGoals}` : <span className="fm-match-versus">VS</span>}<small>{activeMatch ? `${activeMatch.minute}′` : t('El siguiente capítulo', 'The next chapter')}</small></div><div><StudioCrest item={away} size={82} /><strong>{away.name}</strong><small>{t('Visitante', 'Away')}</small></div></div>
    </> : <div className="fm-season-message"><Sparkles size={30} strokeWidth={1.2} /><h3>{phase === 'complete' ? t('Una temporada para recordar.', 'A season to remember.') : t('El fútbol sigue.', 'Football goes on.')}</h3><p>{phase === 'complete' ? t('Tu próximo desafío empieza desde aquí.', 'Your next challenge starts here.') : t('Avanza al siguiente compromiso de tu carrera.', 'Move on to the next stage of your career.')}</p></div>}
    <div className="fm-dashboard-actions">{actions}</div>
    {children}
    {lastResult && <div className="fm-dashboard-last-result">{lastResult}</div>}
  </section>;
}

const roleLabel = (position, t) => ({ GK: t('POR', 'GK'), DF: t('DEF', 'DEF'), MF: t('MED', 'MID'), FW: t('DEL', 'FWD') }[position] || position);
function contrastColor(value) {
  const hex = /^#[a-f\d]{6}$/i.test(value || '') ? value.slice(1) : 'c8ff5f';
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return r * .299 + g * .587 + b * .114 > 145 ? '#172315' : '#ffffff';
}

// Visual placement only: retain the selected XI and use documented roles.
function defendersLeftToRight(players) {
  if (players.length < 4) return players;
  const left = players.find((player) => defenderRoles(player)[0] === 'LB')
    || players.find((player) => defenderRoles(player).includes('LB'));
  const available = players.filter((player) => player !== left);
  const right = available.find((player) => defenderRoles(player)[0] === 'RB')
    || available.find((player) => defenderRoles(player).includes('RB'));
  return [left, ...players.filter((player) => player !== left && player !== right), right].filter(Boolean);
}

export function SquadPitch({ squad = [], formation, t = fallbackTranslate, club, onSelectPlayer }) {
  const reducedMotion = useReducedMotion();
  const grassId = useId().replace(/:/g, '');
  const selected = squad.filter((player) => player.selected);
  const shirtColor = /^#[a-f\d]{6}$/i.test(club?.color || '') ? club.color : '#e8eed5';
  const rows = ['FW', 'MF', 'DF', 'GK'];
  return <section className="fm-squad-pitch" aria-label={t('Alineación en el campo', 'Starting lineup on the pitch')}>
    <div className="fm-squad-pitch-heading"><div><span className="fm-kicker">{t('Tu once', 'Your starting XI')}</span><strong>{formation}</strong></div><span><Users size={14} />{selected.length}/11</span></div>
    <div className="fm-pitch-surface">
      <svg className="fm-pitch-drawing" viewBox="0 0 600 650" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><pattern id={grassId} width="600" height="100" patternUnits="userSpaceOnUse"><rect width="600" height="50" fill="#ffffff" opacity=".025" /></pattern></defs><rect width="600" height="650" fill={`url(#${grassId})`} /><g fill="none" stroke="#c4d7b5" strokeWidth="1.5" opacity=".35"><rect x="27" y="24" width="546" height="602" rx="2" /><path d="M27 325H573" /><circle cx="300" cy="325" r="73" /><path d="M173 24V111H427V24M237 24V60H363V24M173 626V539H427V626M237 626V590H363V626" /><path d="M243 111Q300 167 357 111M243 539Q300 483 357 539" /></g><g fill="#dbe8cc" opacity=".45"><circle cx="300" cy="325" r="3" /><circle cx="300" cy="88" r="2.5" /><circle cx="300" cy="562" r="2.5" /></g></svg>
      {rows.map((position, rowIndex) => {
        const rowPlayers = selected.filter((player) => player.position === position);
        const players = position === 'DF' ? defendersLeftToRight(rowPlayers) : rowPlayers;
        return players.map((player, index) => {
          const condition = Math.max(0, Math.min(100, Math.round(player.condition ?? 100)));
          const unavailable = player.available === false;
          const label = `${player.name} · ${provenanceLabel(player, t)} · ${t('Valoración estimada', 'Estimated rating')} ${player.rating} · ${unavailable ? t('No disponible', 'Unavailable') : `${t('Condición', 'Condition')} ${condition}%`}`;
          return <motion.div key={player.id} initial={reducedMotion ? false : { opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2, delay: reducedMotion ? 0 : index * .025 }} className={`fm-kit-marker ${unavailable ? 'is-unavailable' : ''}`} style={{ left: `${9 + (index + .5) * 82 / players.length}%`, top: `${[15, 38, 62, 85][rowIndex]}%`, '--fm-row-count': players.length, '--kit-color': position === 'GK' ? '#d4b568' : shirtColor, '--kit-ink': contrastColor(position === 'GK' ? '#d4b568' : shirtColor) }} title={label}>
            <button type="button" className="fm-kit-button" aria-label={label} onClick={() => onSelectPlayer?.(player)} disabled={!onSelectPlayer}>
              <span className="fm-kit"><svg viewBox="0 0 58 55" aria-hidden="true"><path d="M18 3L5 10L0 24L12 28L17 18V53H41V18L46 28L58 24L53 10L40 3L34 7H24Z" /><path className="fm-kit-collar" d="M23 4Q29 14 35 4" /></svg><b>{player.shirtNumber || roleLabel(position, t)}</b><span className="fm-kit-rating">{player.rating}</span></span>
              <span className="fm-kit-name">{player.shortName || player.name}</span>
              <span className={`fm-kit-condition ${condition < 70 ? 'is-tired' : ''}`}><i style={{ width: `${condition}%` }} /></span>
              <small>{unavailable ? t('Baja', 'Injured') : `${condition}%`}{!player.real && ` · ${t('Generado', 'Generated')}`}</small>
            </button>
          </motion.div>;
        });
      })}
      {selected.length === 0 && <p className="fm-pitch-empty">{t('Selecciona tu once en Plantilla.', 'Choose your starting XI in Squad.')}</p>}
    </div>
    <div className="fm-pitch-caption"><span>{t('OVR estimado · condición física', 'Estimated OVR · fitness')}</span><span>{club?.shortName || club?.name}</span></div>
  </section>;
}
