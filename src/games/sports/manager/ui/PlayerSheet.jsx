import React, { useState } from 'react';
import { Star, Handshake, Tag, FileSignature, UserMinus, Repeat, Binoculars, Eye, HeartPulse } from 'lucide-react';
import { useManager } from './context.jsx';
import { Sheet, PlayerCard, OvrBadge, Meter, Pill, Crest, Flag } from './components.jsx';
import { money, posLabel, posName, teamInfo, teamName, shortDate } from './format.js';
import { L, injuryName, verdictText } from './texts.js';
import { dynamicOvr, energyAt, fitnessLabel, isInjured, moraleLabel } from '../career/world.js';
import { ATTRIBUTE_KEYS, GK_ATTRIBUTE_KEYS } from '../career/positions.js';
import {
  askingPrice, canApproach, contractYearsLeft, enquire, interestLabel, listPlayer, openRenewal, playerInterest, releasePlayer, toggleShortlist, unlistPlayer,
} from '../career/transfers.js';
import { knowledge, writeReport } from '../career/scouting.js';
import { windowOpen } from '../career/calendar.js';

const ATTR_LABEL = {
  es: { pac: 'Ritmo', sho: 'Tiro', pas: 'Pase', dri: 'Regate', def: 'Defensa', phy: 'Físico', div: 'Estirada', han: 'Manos', kic: 'Saque', ref: 'Reflejos', spd: 'Velocidad', gkp: 'Colocación' },
  en: { pac: 'Pace', sho: 'Shooting', pas: 'Passing', dri: 'Dribbling', def: 'Defending', phy: 'Physical', div: 'Diving', han: 'Handling', kic: 'Kicking', ref: 'Reflexes', spd: 'Speed', gkp: 'Positioning' },
};

export function Radar({ player, lang, hidden = false, size = 190 }) {
  const keys = player.pos === 'GK' ? GK_ATTRIBUTE_KEYS : ATTRIBUTE_KEYS;
  const c = size / 2;
  const radius = size * 0.36;
  const point = (i, value) => {
    const angle = -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
    const r = radius * (value / 99);
    return [c + Math.cos(angle) * r, c + Math.sin(angle) * r];
  };
  const shape = keys.map((key, i) => point(i, hidden ? 50 : player.attrs?.[key] ?? 50).join(',')).join(' ');
  return (
    <svg className="mg-radar" viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="radar">
      {[0.25, 0.5, 0.75, 1].map((f) => <polygon key={f} points={keys.map((_, i) => point(i, 99 * f).join(',')).join(' ')} className="mg-radar__ring" />)}
      {keys.map((_, i) => { const [x, y] = point(i, 99); return <line key={i} x1={c} y1={c} x2={x} y2={y} className="mg-radar__axis" />; })}
      <polygon points={shape} className={`mg-radar__shape ${hidden ? 'is-hidden' : ''}`} />
      {keys.map((key, i) => {
        const [x, y] = point(i, 122);
        return <text key={key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="mg-radar__label">{ATTR_LABEL[lang][key].slice(0, 3).toUpperCase()} {hidden ? '?' : player.attrs?.[key]}</text>;
      })}
    </svg>
  );
}

export default function PlayerSheet({ playerId, onClose }) {
  const { career, lang, t, act, setSheet, go } = useManager();
  const [message, setMessage] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const player = career.world.players[playerId];
  if (!player) return null;
  const mine = player.clubId === career.clubId;
  const club = teamInfo(career, player.clubId);
  const known = knowledge(career, player);
  const date = career.date;
  const dyn = dynamicOvr(player, date, career.training);
  const energy = energyAt(player, date, career.training);
  const fit = fitnessLabel(player, date, career.training);
  const years = contractYearsLeft(career, player);
  const listed = career.transfers.listed[player.id];
  const shortlisted = career.transfers.shortlist.includes(player.id);
  const interest = !mine ? playerInterest(career, player) : null;
  const report = career.scouting.reports[player.id];
  const country = career.world.countries[player.nat];
  const open = windowOpen(date, career.season.dates);

  const startTalks = (kind) => {
    const result = act((c) => enquire(c, player.id, kind));
    if (result?.negotiation) setSheet({ type: 'negotiation', id: result.negotiation.id });
    else setMessage({ already: t('Ya estás negociando por él.', 'You are already negotiating for him.'), cooldown: t('Cortaron las negociaciones hace poco. Espera unas semanas.', 'Talks broke down recently. Wait a few weeks.'), pending: t('Ya tiene un traspaso cerrado.', 'He already has a deal agreed.'), unavailable: t('No se puede fichar a este jugador.', 'This player cannot be signed.') }[result?.error] || t('No es posible ahora.', 'Not possible right now.'));
  };
  const approach = canApproach(career, player);

  const breakdown = [
    [t('Media base', 'Base rating'), player.ovr],
    [t('Forma', 'Form'), Math.round(Math.max(-3, Math.min(3, player.form || 0)))],
    [t('Ánimo', 'Morale'), Math.round(Math.max(-2.5, Math.min(1.5, ((player.morale ?? 65) - 62) / 14)))],
    [t('Forma física', 'Match fitness'), -Math.round(energy >= 80 ? 0 : (80 - energy) / 6)],
  ];

  return (
    <Sheet open onClose={onClose} title={player.name} wide className="mg-player-sheet">
      <div className="mg-player">
        <div className="mg-player__card">
          <PlayerCard player={player} lang={lang} kit={club?.color || '#334'} dynamic={known.exact ? dyn : null} known={known} />
          <div className="mg-player__club">
            {club ? <><Crest team={club} size={22} /><span>{club.name}</span></> : <span>{player.generated === 'national' ? t('Juega en una liga no simulada', 'Plays in an unsimulated league') : t('Sin equipo', 'Free agent')}</span>}
          </div>
          {!player.real && <Pill tone="muted">{t('Jugador generado', 'Generated player')}</Pill>}
        </div>
        <div className="mg-player__info">
          <dl className="mg-facts mg-facts--grid">
            <div><dt>{t('Posición', 'Position')}</dt><dd>{posName(player.pos, lang)}{player.alt?.length ? <small> · {player.alt.map((p) => posLabel(p, lang)).join(', ')}</small> : null}</dd></div>
            <div><dt>{t('Edad', 'Age')}</dt><dd>{player.age} {t('años', 'yrs')}</dd></div>
            <div><dt>{t('País', 'Country')}</dt><dd><Flag country={country} size={12} /> {lang === 'es' ? country?.name_es : country?.name_en}</dd></div>
            <div><dt>{t('Pie', 'Foot')}</dt><dd>{player.foot === 'L' ? t('Zurdo', 'Left') : t('Diestro', 'Right')}</dd></div>
            <div><dt>{t('Potencial', 'Potential')}</dt><dd>{known.pot ? (known.pot[0] === known.pot[1] ? known.pot[0] : `${known.pot[0]}-${known.pot[1]}`) : t('Desconocido', 'Unknown')}</dd></div>
            <div><dt>{t('Valor', 'Value')}</dt><dd>{money(player.value, lang)}</dd></div>
            <div><dt>{t('Sueldo', 'Wage')}</dt><dd>{player.wage ? `${money(player.wage, lang)}/${t('sem', 'wk')}` : '—'}</dd></div>
            <div><dt>{t('Contrato', 'Contract')}</dt><dd className={years === 0 ? 'is-warn' : ''}>{player.clubId ? (years === 0 ? t('Acaba este junio', 'Ends this June') : t(`Hasta junio de ${player.contractEnd}`, `Until June ${player.contractEnd}`)) : '—'}</dd></div>
            {player.releaseClause ? <div><dt>{t('Cláusula', 'Release clause')}</dt><dd>{money(player.releaseClause, lang)}</dd></div> : null}
            {mine && player.growth && <div><dt>{t('Desarrollo', 'Growth')}</dt><dd>{L[lang].growth[player.growth]}</dd></div>}
          </dl>
          {known.exact ? <Radar player={player} lang={lang} /> : <Radar player={player} lang={lang} hidden />}
        </div>
      </div>

      {(mine || known.exact) && (
        <div className="mg-player__state">
          <div className="mg-dyn">
            <span className="mg-dyn__total"><small>{t('Media hoy', 'Rating today')}</small><OvrBadge value={dyn} size="lg" delta={dyn - player.ovr} /></span>
            <ul>{breakdown.map(([label, value], i) => <li key={label}><span>{label}</span><b className={i > 0 ? (value > 0 ? 'mg-up' : value < 0 ? 'mg-down' : '') : ''}>{i > 0 && value > 0 ? '+' : ''}{value}</b></li>)}</ul>
          </div>
          <div className="mg-player__gauges">
            <div><span>{L[lang].fitness[fit]}</span><Meter value={isInjured(player, date) ? 0 : energy} label="energy" /></div>
            <div><span>{L[lang].morale[moraleLabel(player.morale ?? 65)]}</span><Meter value={player.morale ?? 65} label="morale" /></div>
            {isInjured(player, date) && <p className="mg-alert"><HeartPulse size={15} />{t(`Tiene ${injuryName(player.injury.name, lang)}. Vuelve el ${shortDate(player.injury.until, lang)}.`, `Has ${injuryName(player.injury.name, lang)}. Back on ${shortDate(player.injury.until, lang)}.`)}</p>}
            {player.susp > 0 && <p className="mg-alert is-warn">{t(`Sancionado ${player.susp} partido(s).`, `Suspended for ${player.susp} match(es).`)}</p>}
          </div>
        </div>
      )}

      {(player.stats?.apps || player.natStats?.apps) ? (
        <div className="mg-player__stats">
          {[[t('Partidos', 'Apps'), player.stats?.apps || 0], [t('Goles', 'Goals'), player.stats?.g || 0], [t('Asistencias', 'Assists'), player.stats?.a || 0], [t('Nota media', 'Avg rating'), player.stats?.apps ? (player.stats.rs / player.stats.apps).toFixed(1) : '—'], [t('Minutos', 'Minutes'), player.stats?.mins || 0], [t('Amarillas', 'Yellows'), player.stats?.yc || 0], ...(player.natStats?.apps ? [[t('Con su selección', 'For his country'), `${player.natStats.apps} / ${player.natStats.g || 0} ${t('goles', 'goals')}`]] : [])].map(([label, value]) => <div key={label}><b>{value}</b><small>{label}</small></div>)}
        </div>
      ) : null}

      {!mine && (
        <div className="mg-player__scout">
          {report ? (
            <>
              <h4><Binoculars size={15} />{t('Informe del ojeador', 'Scout report')} <small>{report.scout} · {shortDate(report.date, lang)}</small></h4>
              <div className="mg-report-blocks">
                <div><small>{t('Encaje', 'Fit')}</small><b>{verdictText(report.verdict, lang)}</b><span>{t(`Sería tu ${report.rank}.º mejor en su línea.`, `Would be your no. ${report.rank} in his line.`)}</span></div>
                <div><small>{t('Futuro', 'Future')}</small><b>{report.pot[0]}-{report.pot[1]}</b><span>{t('Potencial estimado', 'Estimated potential')}</span></div>
                <div><small>{t('Coste', 'Cost')}</small><b>{report.fee ? money(report.fee, lang) : t('Gratis', 'Free')}</b><span>{t(`Pediría unos ${money(report.wage, lang)}/sem`, `Would ask ~${money(report.wage, lang)}/wk`)}</span></div>
                <div><small>{t('Disposición', 'Willingness')}</small><b>{L[lang].interest[interestLabel(report.interest)]}</b><span>{L[lang].roles[report.role]}</span></div>
              </div>
            </>
          ) : (
            <div className="mg-player__noreport">
              <span>{known.exact ? t('Es un jugador conocido, pero no tienes informe completo.', 'A known player, but you have no full report.') : t('Tus ojeadores aún no le han visto: su nivel es una estimación.', 'Your scouts have not seen him: his level is an estimate.')}</span>
              {career.scouting.scouts.length > 0 && <button type="button" className="mg-btn mg-btn--ghost mg-btn--sm" onClick={() => act((c) => writeReport(c, player, c.scouting.scouts.slice().sort((a, b) => b.judgment - a.judgment)[0]))}><Eye size={15} />{t('Pedir informe', 'Request report')}</button>}
            </div>
          )}
          {interest !== null && <p className="mg-interest"><Star size={14} />{t('Interés en venir', 'Interest in joining')}: <b>{L[lang].interest[interestLabel(interest)]}</b></p>}
        </div>
      )}

      {message && <p className="mg-alert is-warn" role="status">{message}</p>}

      <div className="mg-actions">
        {mine ? (
          <>
            {!player.loan && <button type="button" className="mg-btn mg-btn--primary" onClick={() => { const r = act((c) => openRenewal(c, player.id)); if (r?.negotiation) setSheet({ type: 'negotiation', id: r.negotiation.id }); else setMessage(t('Ya hay una negociación abierta con él.', 'There is already an open negotiation.')); }}><FileSignature size={16} />{t('Renovar contrato', 'Renew contract')}</button>}
            {!player.loan && (listed ? (
              <button type="button" className="mg-btn mg-btn--ghost" onClick={() => act((c) => unlistPlayer(c, player.id))}><Tag size={16} />{t('Quitar de la lista', 'Remove from list')}</button>
            ) : (
              <>
                <button type="button" className="mg-btn mg-btn--ghost" onClick={() => act((c) => listPlayer(c, player.id, 'sale'))}><Tag size={16} />{t('Poner en venta', 'Transfer list')}</button>
                <button type="button" className="mg-btn mg-btn--ghost" onClick={() => act((c) => listPlayer(c, player.id, 'loan'))}><Repeat size={16} />{t('Ofrecer cedido', 'Loan list')}</button>
              </>
            ))}
            {!player.loan && <button type="button" className="mg-btn mg-btn--danger" onClick={() => setConfirm('release')}><UserMinus size={16} />{t('Rescindir', 'Release')}</button>}
            {listed && <Pill tone="accent">{listed.type === 'loan' ? t('En la lista de cedibles', 'On the loan list') : t('En la lista de transferibles', 'On the transfer list')}</Pill>}
          </>
        ) : (
          <>
            <button type="button" className={`mg-btn ${shortlisted ? 'mg-btn--primary' : 'mg-btn--ghost'}`} onClick={() => act((c) => toggleShortlist(c, player.id))}><Star size={16} />{shortlisted ? t('En seguimiento', 'Shortlisted') : t('Seguir', 'Shortlist')}</button>
            {player.generated !== 'national' && (
              player.clubId ? (
                <>
                  <button type="button" className="mg-btn mg-btn--primary" disabled={approach !== 'ok'} onClick={() => startTalks('buy')}><Handshake size={16} />{contractYearsLeft(career, player) === 0 && career.date >= `${career.year + 1}-01-01` ? t('Ofrecer precontrato', 'Offer pre-contract') : t('Preguntar por su fichaje', 'Enquire to buy')}</button>
                  <button type="button" className="mg-btn mg-btn--ghost" disabled={approach !== 'ok'} onClick={() => startTalks('loan-in')}><Repeat size={16} />{t('Pedir cesión', 'Ask for a loan')}</button>
                </>
              ) : (
                <button type="button" className="mg-btn mg-btn--primary" disabled={approach !== 'ok'} onClick={() => startTalks('buy')}><FileSignature size={16} />{t('Ofrecer contrato', 'Offer contract')}</button>
              )
            )}
            {player.clubId && <span className="mg-muted mg-actions__price">{t('Piden aprox.', 'Asking approx.')} <b>{money(askingPrice(career, player), lang)}</b>{!open && <> · {t('llegaría en la próxima ventana', 'would join next window')}</>}</span>}
          </>
        )}
      </div>

      {confirm === 'release' && (
        <div className="mg-confirm">
          <p>{t(`Rescindir a ${player.name} costará ${money(Math.round(player.wage * 52 * (years + 0.5) * 0.5), lang)} (la mitad de lo que le queda de contrato). ¿Seguro?`, `Releasing ${player.name} costs ${money(Math.round(player.wage * 52 * (years + 0.5) * 0.5), lang)} (half of his remaining deal). Sure?`)}</p>
          <button type="button" className="mg-btn mg-btn--danger" onClick={() => { const r = act((c) => releasePlayer(c, player.id)); if (r?.ok) onClose(); else setMessage(t('No tienes presupuesto para rescindir.', 'Not enough budget to release him.')); setConfirm(null); }}>{t('Sí, rescindir', 'Yes, release')}</button>
          <button type="button" className="mg-btn mg-btn--ghost" onClick={() => setConfirm(null)}>{t('Cancelar', 'Cancel')}</button>
        </div>
      )}
      {!mine && player.clubId && <button type="button" className="mg-link" onClick={() => { onClose(); go('competitions', { team: player.clubId }); }}>{t(`Ver al ${teamName(career, player.clubId, lang)}`, `See ${teamName(career, player.clubId, lang)}`)}</button>}
    </Sheet>
  );
}
