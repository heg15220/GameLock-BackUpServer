import React, { useCallback, useEffect, useState } from 'react';
import { Mail, ArrowRight, Check, X, Handshake, Trophy as TrophyIcon, Sparkles, Star } from 'lucide-react';
import { useManager } from './context.jsx';
import { Crest, PlayerCard, Stepper, Flag, OvrBadge, Pill } from './components.jsx';
import { compName, money, seasonLabel, stageLabel, teamInfo, teamName } from './format.js';
import { L, eventText, inboxText, objectiveText } from './texts.js';
import { resolveEvent } from '../career/events.js';
import { respondOffer } from '../career/transfers.js';
import { markRead } from '../career/inbox.js';
import { objectiveStatus } from '../career/board.js';
import { compTrophy } from './Competitions.jsx';

export default function Moments() {
  const { moments, setMoments } = useManager();
  const current = moments[0];
  if (current && !current._id) current._id = `m${Math.random().toString(36).slice(2)}`;
  const id = current?._id;
  const done = useCallback(() => setMoments((list) => list.filter((m) => m._id !== id)), [setMoments, id]);
  if (!current) return null;
  const C = {
    welcome: Welcome, toast: Toast, stage: StageBanner, event: EventModal, offer: OfferModal, celebration: Celebration,
    reveal: Reveal, review: Review, 'new-season': NewSeason, sacked: Sacked,
  }[current.type];
  return C ? <C key={`${current.type}-${current.inbox || current.event || current.offer || current.comp || current.playerId || ''}`} moment={current} onDone={done} /> : null;
}

function Overlay({ children, onClose, className = '' }) {
  return (
    <div className={`mg-moment ${className}`} role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      {children}
    </div>
  );
}

function Toast({ moment, onDone }) {
  const { career, lang, t, act, go, setSheet } = useManager();
  const item = career.inbox.find((m) => m.id === moment.inbox);
  useEffect(() => { const id = setTimeout(onDone, item ? 4200 : 0); return () => clearTimeout(id); }, [onDone, item]);
  if (!item) return null;
  const text = inboxText(career, item, lang);
  const open = () => {
    act((c) => markRead(c, item.id));
    if (text.cta === 'negotiation') setSheet({ type: 'negotiation', id: text.negotiation });
    else go(text.cta || 'inbox');
    onDone();
  };
  return (
    <div className={`mg-toast mg-toast--${moment.tone || 'info'}`} role="status">
      <Mail size={18} aria-hidden="true" />
      <span><small>{text.from}</small><b>{text.subject}</b></span>
      <button type="button" onClick={open}>{t('Ver', 'View')}<ArrowRight size={14} /></button>
      <button type="button" className="mg-toast__x" onClick={onDone} aria-label="x"><X size={14} /></button>
    </div>
  );
}

function StageBanner({ moment, onDone }) {
  const { lang } = useManager();
  useEffect(() => { const id = setTimeout(onDone, 3200); return () => clearTimeout(id); }, [onDone]);
  return (
    <div className={`mg-stage-banner is-${moment.stage}`} onClick={onDone} role="status">
      <span className="mg-stage-banner__sweep" aria-hidden="true" />
      <small>{lang === 'es' ? 'Nueva etapa' : 'New stage'}</small>
      <strong>{L[lang].stages[moment.stage]}</strong>
      <p>{L[lang].stageHelp[moment.stage]}</p>
    </div>
  );
}

function Welcome({ onDone }) {
  const { career, lang, t } = useManager();
  const club = teamInfo(career, career.clubId);
  const status = objectiveStatus(career);
  return (
    <Overlay onClose={onDone} className="mg-moment--welcome">
      <div className="mg-welcome" style={{ '--club': club.color }}>
        <div className="mg-welcome__crest"><Crest team={club} size={110} /></div>
        <small>{t('Bienvenido, míster', 'Welcome, boss')}</small>
        <h2>{club.name}</h2>
        <p>{t('La afición te espera. Esto es lo que la directiva quiere de ti esta temporada:', 'The fans are waiting. This is what the board expects this season:')}</p>
        <ul className="mg-objectives-mini">{status.map((o) => <li key={o.id}><i />{objectiveText(o, career, lang)}</li>)}</ul>
        <div className="mg-season-loop is-compact">
          {['summer-window', 'first-half', 'winter-window', 'second-half'].map((s, i) => <span key={s} style={{ '--i': i }}><b>{i + 1}</b>{L[lang].stages[s]}</span>)}
          {career.national && <span style={{ '--i': 4 }}><b>5</b>{L[lang].stages.international}</span>}
        </div>
        <p className="mg-muted">{t('Empiezas en el mercado de verano: revisa la plantilla, ficha y pulsa «Continuar» para avanzar.', 'You start in the summer window: review the squad, sign players and press "Continue" to move on.')}</p>
        <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={onDone}>{t('¡A trabajar!', "Let's get to work!")}</button>
      </div>
    </Overlay>
  );
}

function EventModal({ moment, onDone }) {
  const { career, lang, t, act, setSheet } = useManager();
  const event = career.events.find((e) => e.id === moment.event);
  const missing = !event || event.resolved;
  useEffect(() => { if (missing) onDone(); }, [missing, onDone]);
  if (missing) return null;
  const text = eventText(career, event, lang);
  const choose = (option) => {
    const result = act((c) => resolveEvent(c, event.id, option));
    onDone();
    if (result?.negotiation) setSheet({ type: 'negotiation', id: result.negotiation.id });
  };
  const player = career.world.players[event.params.player];
  return (
    <Overlay className="mg-moment--event">
      <div className="mg-event">
        <span className="mg-kicker">{text.from}</span>
        <h2>{text.title}</h2>
        {player && <div className="mg-event__player"><PlayerCard player={player} lang={lang} kit={teamInfo(career, career.clubId).color} compact /></div>}
        <p>{text.body}</p>
        <div className="mg-event__options">
          {['a', 'b'].map((key) => (
            <button type="button" key={key} onClick={() => choose(key)}>
              <strong>{text.options[key].label}</strong>
              <span>{text.options[key].hint}</span>
            </button>
          ))}
        </div>
        <p className="mg-muted">{t('No hay respuesta correcta: cada opción tiene sus consecuencias.', 'There is no right answer: each option has consequences.')}</p>
      </div>
    </Overlay>
  );
}

function OfferModal({ moment, onDone }) {
  const { career, lang, t, act } = useManager();
  const offer = career.transfers.offers.find((o) => o.id === moment.offer);
  const [counter, setCounter] = useState(offer ? Math.round(offer.fee * 1.2 / 100000) * 100000 : 0);
  const [reply, setReply] = useState(null);
  useEffect(() => { if (!offer) onDone(); }, [offer, onDone]);
  if (!offer) return null;
  const player = career.world.players[offer.playerId];
  const buyer = teamInfo(career, offer.clubId);
  const closed = offer.status !== 'open';
  const respond = (decision) => {
    const result = act((c) => respondOffer(c, offer.id, decision, decision === 'counter' ? counter : null));
    setReply(result?.offer?.reply || decision);
    if (decision !== 'counter' || result?.offer?.status !== 'open') setTimeout(onDone, decision === 'counter' ? 1800 : 900);
  };
  const replyText = {
    'accept-counter': t('¡Aceptan tu precio! Trato hecho.', 'They accept your price! Deal done.'),
    improve: t(`Suben su oferta a ${money(offer.fee, lang)}. ¿Aceptas?`, `They raise their bid to ${money(offer.fee, lang)}. Accept?`),
    withdraw: t('Se retiran: les parece demasiado.', 'They pull out: too expensive for them.'),
    accept: t('Oferta aceptada.', 'Offer accepted.'), reject: t('Oferta rechazada.', 'Offer rejected.'),
  }[reply];
  return (
    <Overlay onClose={onDone} className="mg-moment--offer">
      <div className="mg-offer">
        <header><Crest team={buyer} size={54} /><div><small>{t('Oferta recibida', 'Offer received')}</small><h2>{buyer.name}</h2></div></header>
        <div className="mg-offer__body">
          <PlayerCard player={player} lang={lang} kit={teamInfo(career, career.clubId).color} compact />
          <div>
            <p>{offer.loan ? t(`Quieren a ${player.name} cedido y pagarían el ${offer.wageShare}% de su sueldo.`, `They want ${player.name} on loan and would pay ${offer.wageShare}% of his wages.`) : t(`Ofrecen ${money(offer.fee, lang)} por ${player.name}${offer.instalments > 1 ? ` en ${offer.instalments} plazos` : ''}.`, `They offer ${money(offer.fee, lang)} for ${player.name}${offer.instalments > 1 ? ` in ${offer.instalments} instalments` : ''}.`)}</p>
            <dl className="mg-facts">
              <div><dt>{t('Valor de mercado', 'Market value')}</dt><dd>{money(player.value, lang)}</dd></div>
              <div><dt>{t('Su media', 'Rating')}</dt><dd><OvrBadge value={player.ovr} size="sm" /></dd></div>
              {career.transfers.listed[player.id] && <div><dt>{t('Situación', 'Status')}</dt><dd><Pill tone="accent">{t('En venta', 'Listed')}</Pill></dd></div>}
            </dl>
          </div>
        </div>
        {replyText && <p className="mg-offer__reply">«{replyText}»</p>}
        {!closed && !offer.loan && (
          <Stepper label={t('Tu contraoferta', 'Your counter')} value={counter} display={money(counter, lang)} step={(v) => (v >= 20e6 ? 1e6 : v >= 2e6 ? 250000 : 50000)} min={offer.fee} onChange={setCounter} />
        )}
        <div className="mg-offer__actions">
          {!closed ? (
            <>
              <button type="button" className="mg-btn mg-btn--primary" onClick={() => respond('accept')}><Check size={16} />{t('Aceptar', 'Accept')}</button>
              {!offer.loan && <button type="button" className="mg-btn mg-btn--ghost" onClick={() => respond('counter')}><Handshake size={16} />{t('Pedir más', 'Ask for more')}</button>}
              <button type="button" className="mg-btn mg-btn--danger" onClick={() => respond('reject')}><X size={16} />{t('Rechazar', 'Reject')}</button>
            </>
          ) : <button type="button" className="mg-btn mg-btn--ghost" onClick={onDone}>{t('Cerrar', 'Close')}</button>}
        </div>
      </div>
    </Overlay>
  );
}

function Confetti({ color = '#ffd34d', count = 70 }) {
  return (
    <span className="mg-confetti" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <i key={i} style={{ '--x': `${(i * 37) % 100}%`, '--d': `${(i % 10) * 0.12}s`, '--r': `${(i * 53) % 360}deg`, '--c': i % 3 === 0 ? color : i % 3 === 1 ? '#ffffff' : '#ffd34d' }} />)}
    </span>
  );
}

function Celebration({ moment, onDone }) {
  const { career, lang, t } = useManager();
  const comp = career.season.comps[moment.comp];
  const team = teamInfo(career, moment.winner);
  return (
    <Overlay onClose={onDone} className="mg-moment--celebration">
      <Confetti color={team?.color} />
      <div className="mg-celebration" style={{ '--club': team?.color }}>
        <span className="mg-celebration__rays" aria-hidden="true" />
        <div className="mg-celebration__trophy">{compTrophy(career, comp, 170)}</div>
        <small>{compName(comp, lang)} · {seasonLabel(career.year)}</small>
        <h2>{t('¡CAMPEONES!', 'CHAMPIONS!')}</h2>
        <div className="mg-celebration__team"><Crest team={team} size={48} /><b>{team?.name}</b></div>
        <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={onDone}><TrophyIcon size={18} />{t('¡A celebrarlo!', "Let's celebrate!")}</button>
      </div>
    </Overlay>
  );
}

function Reveal({ moment, onDone }) {
  const { career, lang, t } = useManager();
  const player = career.world.players[moment.playerId];
  const [flipped, setFlipped] = useState(false);
  useEffect(() => { const id = setTimeout(() => setFlipped(true), 900); return () => clearTimeout(id); }, []);
  useEffect(() => { if (!player) onDone(); }, [player, onDone]);
  if (!player) return null;
  const club = teamInfo(career, career.clubId);
  return (
    <Overlay onClose={onDone} className={`mg-moment--reveal ${moment.big ? 'is-big' : ''}`}>
      {moment.big && <Confetti color={club.color} count={50} />}
      <div className="mg-reveal" style={{ '--club': club.color }}>
        <span className="mg-reveal__spot" aria-hidden="true" />
        <small>{moment.big ? t('Presentación en el estadio', 'Stadium unveiling') : t('Nuevo fichaje', 'New signing')}</small>
        <div className={`mg-reveal__card ${flipped ? 'is-flipped' : ''}`}>
          <div className="mg-reveal__back"><Crest team={club} size={90} /></div>
          <div className="mg-reveal__front"><PlayerCard player={player} lang={lang} kit={club.color} /></div>
        </div>
        <h2>{t('¡Bienvenido', 'Welcome')}, {player.name.split(' ').slice(-1)[0]}!</h2>
        <p>{moment.kind === 'loan-in' ? t('Llega cedido hasta final de temporada.', 'Joins on loan until the end of the season.') : moment.fee ? t(`Traspaso: ${money(moment.fee, lang)}`, `Fee: ${money(moment.fee, lang)}`) : t('Llega con la carta de libertad.', 'Arrives on a free transfer.')}{moment.joinDate > career.date ? ` · ${t('se incorpora cuando abra el mercado', 'joins when the window opens')}` : ''}</p>
        <button type="button" className="mg-btn mg-btn--primary" onClick={onDone}><Sparkles size={16} />{t('Genial', 'Great')}</button>
      </div>
    </Overlay>
  );
}

function Review({ onDone }) {
  const { career, lang, t } = useManager();
  const review = career.review || career.history[career.history.length - 1];
  useEffect(() => { if (!review) onDone(); }, [review, onDone]);
  if (!review) return null;
  const stateLabel = { 'on-track': t('Cumplido', 'Met'), done: t('Cumplido', 'Met'), close: t('Casi', 'Almost'), 'off-track': t('No cumplido', 'Missed'), failed: t('No cumplido', 'Missed'), pending: '—' };
  const awards = review.awards || {};
  const awardRow = (key, label) => awards[key] && <li><Star size={14} /><span>{label}</span><b>{awards[key].name}</b><small>{teamName(career, awards[key].club, lang, true)}</small></li>;
  return (
    <Overlay onClose={onDone} className="mg-moment--review">
      <div className="mg-review">
        <span className="mg-kicker">{t('Balance de la temporada', 'Season review')} · {seasonLabel(review.year)}</span>
        <h2>{t(`${review.position}.º en liga`, `Finished ${review.position}`)}</h2>
        <div className="mg-review__record">{review.record && <><b>{review.record.w}</b>{t('V', 'W')} <b>{review.record.d}</b>{t('E', 'D')} <b>{review.record.l}</b>{t('D', 'L')} · {review.record.gf}:{review.record.ga} · <b>{review.points}</b> pts</>}</div>
        {review.trophies?.length > 0 && <div className="mg-review__trophies"><TrophyIcon size={18} />{review.trophies.join(' · ')}</div>}
        {review.status && (
          <ul className="mg-objectives">{review.status.map((o) => <li key={o.id} className={`is-${o.state}`}><strong>{objectiveText(o, career, lang)}</strong><Pill tone={['on-track', 'done'].includes(o.state) ? 'good' : o.state === 'close' ? 'warn' : 'bad'}>{stateLabel[o.state]}</Pill></li>)}</ul>
        )}
        <ul className="mg-awards">
          {awardRow('ballon', t('Balón de Oro', "Ballon d'Or"))}
          {awardRow('boot', t('Bota de Oro', 'Golden Boot'))}
          {awardRow('glove', t('Guante de Oro', 'Golden Glove'))}
          {awardRow('young', t('Mejor joven', 'Best young player'))}
        </ul>
        {review.comps?.length > 0 && <p className="mg-muted">{review.comps.map((c) => `${c.name}: ${stageLabel(c.reached, lang)}`).join(' · ')}</p>}
        <div className="mg-review__next">
          <span>{t('Confianza de la directiva', 'Board confidence')} <b className={review.confidenceDelta >= 0 ? 'mg-up' : 'mg-down'}>{review.confidenceDelta >= 0 ? '+' : ''}{review.confidenceDelta ?? 0}</b></span>
          {review.budgets && <span>{t('Presupuesto el año que viene', 'Next year budget')} <b>{money(review.budgets.transferBudget, lang)}</b></span>}
        </div>
        <p className="mg-muted">{career.national ? t('Ahora llega el verano internacional. Después, nueva temporada.', 'Now comes the international summer. Then a new season.') : t('Pulsa Continuar para empezar la próxima temporada.', 'Press Continue to start next season.')}</p>
        <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={onDone}>{t('Seguir', 'Continue')}</button>
      </div>
    </Overlay>
  );
}

function NewSeason({ onDone }) {
  const { career, lang, t } = useManager();
  const club = teamInfo(career, career.clubId);
  const status = objectiveStatus(career);
  return (
    <Overlay onClose={onDone} className="mg-moment--season">
      <div className="mg-new-season" style={{ '--club': club.color }}>
        <small>{t('Comienza la temporada', 'Season begins')}</small>
        <h2>{seasonLabel(career.year)}</h2>
        <Crest team={club} size={80} />
        <p>{career.world.leagues[career.world.clubs[career.clubId].leagueId]?.name}</p>
        <ul className="mg-objectives-mini">{status.map((o) => <li key={o.id}><i />{objectiveText(o, career, lang)}</li>)}</ul>
        <p>{t('Presupuesto para fichar', 'Transfer budget')}: <b>{money(career.finances.transferBudget, lang)}</b></p>
        <button type="button" className="mg-btn mg-btn--primary mg-btn--xl" onClick={onDone}>{t('¡Vamos!', "Let's go!")}</button>
      </div>
    </Overlay>
  );
}

function Sacked({ onDone }) {
  const { t, go } = useManager();
  return (
    <Overlay className="mg-moment--sacked">
      <div className="mg-event">
        <h2>{t('Te han destituido', 'You have been sacked')}</h2>
        <p>{t('La directiva ha perdido la confianza. Pero tu carrera no acaba aquí: hay clubes interesados.', 'The board has lost faith. But your career is not over: there are clubs interested.')}</p>
        <button type="button" className="mg-btn mg-btn--primary" onClick={() => { go('office'); onDone(); }}>{t('Ver ofertas', 'See offers')}</button>
      </div>
    </Overlay>
  );
}

export { Flag };
