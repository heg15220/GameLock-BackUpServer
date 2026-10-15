import React, { useEffect, useRef, useState } from 'react';
import { PhoneOff, Hourglass, Check, X, Sparkles } from 'lucide-react';
import { useManager } from './context.jsx';
import { Sheet, Stepper, ChoiceRow, Portrait, OvrBadge, Flag, Crest, Meter } from './components.jsx';
import { money, posLabel, teamInfo, teamName, shortDate } from './format.js';
import { L, negotiationLine } from './texts.js';
import { offerToClub, acceptClubAsk, offerToPlayer, acceptPlayerAsk, walkAway, directorOf, agentOf, transferRoom, wageRoom, ROLES, offerWorth } from '../career/transfers.js';
import { windowOpen } from '../career/calendar.js';
import { roundMoney } from '../career/util.js';

const feeStep = (value) => (value >= 50e6 ? 1e6 : value >= 10e6 ? 500000 : value >= 2e6 ? 100000 : value >= 500000 ? 25000 : 5000);
const wageStep = (value) => (value >= 100000 ? 5000 : value >= 20000 ? 1000 : value >= 5000 ? 250 : 50);

/** Hold-to-hang-up, like FC: a ring fills while you keep pressing. */
function HangUp({ onDone, label }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef(null);
  const start = useRef(0);
  const stop = () => { cancelAnimationFrame(frame.current); setProgress(0); };
  const begin = (event) => {
    event.preventDefault();
    start.current = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start.current) / 800);
      setProgress(p);
      if (p >= 1) { onDone(); return; }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return (
    <button type="button" className="mg-hangup" onPointerDown={begin} onPointerUp={stop} onPointerLeave={stop} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onDone(); }} aria-label={label}>
      <svg className="mg-hangup__ring-svg" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" className="mg-hangup__track" /><circle cx="32" cy="32" r="29" className="mg-hangup__ring" style={{ strokeDashoffset: 182 - 182 * progress }} /></svg>
      <PhoneOff size={22} />
      <span>{label}</span>
    </button>
  );
}

function Typewriter({ text }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  return <p className="mg-call__speech" aria-live="polite">«{shown}»</p>;
}

export default function Negotiation({ negotiationId, onClose }) {
  const { career, lang, t, act, setSheet } = useManager();
  const neg = career.transfers.negotiations.find((n) => n.id === negotiationId);
  const [club, setClub] = useState(null);
  const [terms, setTerms] = useState(null);
  const [notice, setNotice] = useState(null);
  const logRef = useRef(null);

  useEffect(() => {
    if (neg?.clubTerms) setClub({ ...neg.clubTerms });
    if (neg?.playerTerms) setTerms({ ...neg.playerTerms });
  }, [neg?.id, neg?.stage, neg?.rounds]);
  useEffect(() => { logRef.current?.scrollTo?.({ top: 99999, behavior: 'smooth' }); }, [neg?.log.length]);

  if (!neg) return null;
  const player = career.world.players[neg.playerId];
  const sellingClub = teamInfo(career, neg.clubId);
  const onPlayerStage = neg.stage === 'player' || neg.stage === 'final' || neg.kind === 'renew';
  const person = onPlayerStage ? agentOf(career, neg.playerId) : directorOf(career, neg.clubId);
  const personRole = onPlayerStage ? t(`Agente de ${player.name}`, `${player.name}'s agent`) : t(`Director deportivo · ${teamName(career, neg.clubId, lang)}`, `Director of football · ${teamName(career, neg.clubId, lang)}`);
  const lastOther = [...neg.log].reverse().find((entry) => entry.who === 'club' || entry.who === 'agent' || entry.who === 'system');
  const lastText = lastOther ? negotiationLine(career, neg, lastOther, lang, neg.log.indexOf(lastOther)).text : '';
  const yourTurn = neg.status === 'your-turn';
  const loan = neg.kind === 'loan-in';
  const budget = transferRoom(career);
  const tension = Math.round(neg.tension);
  const tensionTone = tension < 35 ? 'good' : tension < 70 ? 'warn' : 'bad';
  const roleOptions = ROLES.map((id) => ({ id, label: L[lang].roles[id] }));

  const send = () => {
    setNotice(null);
    const result = onPlayerStage ? act((c) => offerToPlayer(c, neg.id, terms)) : act((c) => offerToClub(c, neg.id, club));
    if (result?.error) setNotice(t('Ahora no es tu turno.', 'It is not your turn.'));
  };
  const accept = () => { setNotice(null); onPlayerStage ? act((c) => acceptPlayerAsk(c, neg.id)) : act((c) => acceptClubAsk(c, neg.id)); };
  const hangUp = () => { act((c) => walkAway(c, neg.id)); };

  const paidNow = club ? roundMoney((club.fee || 0) / Math.max(1, club.instalments || 1)) : 0;
  const worthPct = club && neg.ask && !loan ? Math.min(100, Math.round(offerWorth(club, player.value) / Math.max(1, offerWorth(neg.ask, player.value)) * 100)) : null;
  const titleKey = neg.kind === 'renew' ? t('RENOVACIÓN', 'CONTRACT RENEWAL') : loan ? t('CESIÓN', 'LOAN') : onPlayerStage ? t('CONTRATO DEL JUGADOR', 'PLAYER CONTRACT') : t('TRASPASO DEL JUGADOR', 'TRANSFER PLAYER');

  return (
    <Sheet open onClose={onClose} title={titleKey} wide className="mg-negotiation">
      <div className="mg-nego">
        <section className="mg-nego__terms">
          <h3>{titleKey}</h3>
          {neg.status === 'waiting' && (
            <div className="mg-nego__waiting">
              <Hourglass size={26} className="mg-spin-slow" />
              <strong>{t('Esperando respuesta', 'Waiting for a reply')}</strong>
              <p>{t(`Te contestarán como tarde el ${shortDate(neg.waitUntil, lang)}. Pulsa Continuar para que pasen los días.`, `They will reply by ${shortDate(neg.waitUntil, lang)}. Press Continue to move the days on.`)}</p>
            </div>
          )}
          {neg.status === 'done' && (
            <div className="mg-nego__done">
              <span className="mg-burst" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--i': i }} />)}</span>
              <Sparkles size={30} />
              <strong>{neg.kind === 'renew' ? t('¡Renovado!', 'Renewed!') : t('¡Fichaje cerrado!', 'Deal done!')}</strong>
              <p>{neg.kind === 'renew' ? t(`Contrato hasta junio de ${player.contractEnd}.`, `Contract until June ${player.contractEnd}.`)
                : neg.deal && neg.deal.joinDate > career.date ? t(`Se incorporará el ${shortDate(neg.deal.joinDate, lang)}, cuando abra el mercado.`, `He will join on ${shortDate(neg.deal.joinDate, lang)}, when the window opens.`) : t('Ya entrena con el equipo.', 'He is already training with the squad.')}</p>
              <button type="button" className="mg-btn mg-btn--primary" onClick={() => setSheet({ type: 'player', id: player.id })}>{t('Ver jugador', 'See player')}</button>
            </div>
          )}
          {neg.status === 'failed' && (
            <div className="mg-nego__failed">
              <X size={30} />
              <strong>{t('Negociación terminada', 'Negotiation over')}</strong>
              <p>{lastText}</p>
            </div>
          )}

          {yourTurn && !onPlayerStage && club && (
            <div className="mg-nego__rows">
              {!loan && <ChoiceRow label={t('Incorporación', 'Start date')} value={club.start || 'now'} onChange={(v) => setClub({ ...club, start: v })} options={[{ id: windowOpen(career.date, career.season.dates) ? 'now' : 'window', label: windowOpen(career.date, career.season.dates) ? t('Inmediata', 'Immediate') : t('Próxima ventana', 'Next window') }]} />}
              {!loan && <Stepper label={t('Precio del traspaso', 'Transfer fee')} value={club.fee} display={money(club.fee, lang)} step={feeStep} onChange={(fee) => setClub({ ...club, fee })} max={budget} hint={neg.ask ? t(`Piden ${money(neg.ask.fee, lang)}`, `They want ${money(neg.ask.fee, lang)}`) : null} />}
              {!loan && <Stepper label={t('Plazos', 'Instalments')} value={club.instalments || 1} display={t(`${club.instalments || 1} ${club.instalments > 1 ? 'pagos' : 'pago'}`, `${club.instalments || 1} payment${club.instalments > 1 ? 's' : ''}`)} step={1} min={1} max={4} onChange={(instalments) => setClub({ ...club, instalments })} hint={t('Pagar en varios años', 'Spread over years')} />}
              {!loan && <Stepper label={t('% de futura venta', 'Sell-on clause')} value={club.sellOn || 0} display={`${club.sellOn || 0}%`} step={5} min={0} max={30} onChange={(sellOn) => setClub({ ...club, sellOn })} hint={t('Para ellos si le vendes', 'Theirs if you sell him on')} />}
              {!loan && <Stepper label={t('Variables por objetivos', 'Add-ons')} value={club.bonus || 0} display={money(club.bonus || 0, lang)} step={feeStep} min={0} max={Math.max(0, budget)} onChange={(bonus) => setClub({ ...club, bonus })} hint={t('Si ganáis títulos', 'If you win trophies')} />}
              {loan && <Stepper label={t('Sueldo que pagas', 'Wages you pay')} value={club.wageShare ?? 50} display={`${club.wageShare ?? 50}%`} step={10} min={0} max={100} onChange={(wageShare) => setClub({ ...club, wageShare })} hint={t(`Piden ${neg.ask?.wageShare}%`, `They want ${neg.ask?.wageShare}%`)} />}
              {loan && neg.ask?.option ? <div className="mg-nego__note">{t(`Opción de compra al final: ${money(neg.ask.option, lang)}`, `Option to buy at the end: ${money(neg.ask.option, lang)}`)}</div> : null}
              <dl className="mg-nego__totals">
                {!loan && <div><dt>{t('Pagas ahora / después', 'Paid now / later')}</dt><dd>{money(paidNow, lang)} / {money((club.fee || 0) - paidNow, lang)}</dd></div>}
                {!loan && <div><dt>{t('Variables posibles', 'Potential add-ons')}</dt><dd>{money(club.bonus || 0, lang)}</dd></div>}
                <div><dt>{t('Presupuesto que te queda', 'Budget remaining')}</dt><dd className={budget - (club.fee || 0) < 0 ? 'is-bad' : ''}>{money(budget - (loan ? 0 : club.fee || 0), lang)}</dd></div>
              </dl>
              {worthPct !== null && <div className="mg-nego__closeness"><span>{t('Lo cerca que estás de lo que piden', 'How close you are to their price')}</span><Meter value={worthPct} label="closeness" /></div>}
            </div>
          )}

          {yourTurn && onPlayerStage && terms && (
            <div className="mg-nego__rows">
              {!loan && <Stepper label={t('Sueldo semanal', 'Weekly wage')} value={terms.wage} display={money(terms.wage, lang)} step={wageStep} onChange={(wage) => setTerms({ ...terms, wage })} hint={t(`Pide ${money(neg.playerAsk.wage, lang)}`, `Asks ${money(neg.playerAsk.wage, lang)}`)} />}
              {!loan && <Stepper label={t('Años de contrato', 'Contract length')} value={terms.years} display={t(`${terms.years} años`, `${terms.years} years`)} step={1} min={1} max={5} onChange={(years) => setTerms({ ...terms, years })} />}
              <ChoiceRow label={t('Papel en el equipo', 'Squad role')} value={terms.role} onChange={(role) => setTerms({ ...terms, role })} options={roleOptions} />
              <p className="mg-nego__hint">{L[lang].roleHelp[terms.role]}</p>
              {!loan && <Stepper label={t('Prima de fichaje', 'Signing bonus')} value={terms.signingBonus} display={money(terms.signingBonus, lang)} step={feeStep} onChange={(signingBonus) => setTerms({ ...terms, signingBonus })} hint={t('Un pago único al firmar', 'One payment on signing')} />}
              {!loan && <Stepper label={t('Cláusula de rescisión', 'Release clause')} value={terms.releaseClause || 0} display={terms.releaseClause ? money(terms.releaseClause, lang) : t('Sin cláusula', 'None')} step={(v) => Math.max(feeStep(Math.max(v, player.value)), roundMoney(player.value * 0.25))} min={0} onChange={(releaseClause) => setTerms({ ...terms, releaseClause })} hint={t('Precio fijo al que otro club puede llevárselo', 'Fixed price another club can pay')} />}
              <dl className="mg-nego__totals">
                <div><dt>{t('Margen de sueldos', 'Wage room')}</dt><dd className={wageRoom(career) < (loan ? 0 : terms.wage) ? 'is-bad' : ''}>{money(wageRoom(career), lang)}/{t('sem', 'wk')}</dd></div>
                <div><dt>{t('Presupuesto que te queda', 'Budget remaining')}</dt><dd>{money(budget, lang)}</dd></div>
              </dl>
            </div>
          )}

          {notice && <p className="mg-alert is-warn">{notice}</p>}
          {yourTurn && (
            <div className="mg-nego__buttons">
              <button type="button" className="mg-btn mg-btn--offer" onClick={send}>{onPlayerStage ? (loan ? t('Confirmar papel', 'Confirm role') : t('Hacer oferta', 'Make offer')) : t('Hacer oferta', 'Make offer')}</button>
              <button type="button" className="mg-btn mg-btn--ghost" onClick={accept}><Check size={16} />{t('Aceptar lo que piden', 'Accept their terms')}</button>
            </div>
          )}
        </section>

        <section className="mg-nego__call">
          <span className="mg-kicker">{neg.status === 'your-turn' ? t('En llamada', 'On call') : neg.status === 'waiting' ? t('Esperando', 'Waiting') : t('Llamada terminada', 'Call ended')}</span>
          <div className={`mg-call ${neg.status === 'your-turn' ? 'is-live' : ''}`}>
            <Portrait player={{ id: `${person.role}-${onPlayerStage ? neg.playerId : neg.clubId}`, nat: onPlayerStage ? player.nat : career.world.clubs[neg.clubId]?.country, age: 48 }} size={64} kit="#141d26" />
            <div>
              <small>{neg.status === 'your-turn' ? t('Hablando con', 'On call with') : t('Contacto', 'Contact')}</small>
              <strong>{person.name}</strong>
              <span>{personRole}</span>
            </div>
            <span className="mg-call__wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          </div>
          <div className={`mg-tension is-${tensionTone}`}><span>{L[lang].tension(tension)}</span><Meter value={100 - tension} tone={tensionTone} label="tension" /></div>
          {lastText && <Typewriter text={lastText} />}
          <div className="mg-nego__player">
            <span className="mg-nego__player-name"><Flag country={career.world.countries[player.nat]} size={12} /><b>{player.name.toUpperCase()}</b></span>
            <span className="mg-nego__player-pos">{posLabel(player.pos, lang)}</span>
            <dl>
              <div><dt>{t('Edad', 'Age')}</dt><dd>{player.age}</dd></div>
              <div><dt>{t('Media', 'OVR')}</dt><dd><OvrBadge value={player.ovr} size="sm" /></dd></div>
              <div><dt>{t('Valor', 'Value')}</dt><dd>{money(player.value, lang)}</dd></div>
              <div><dt>{t('Sueldo semanal', 'Weekly wage')}</dt><dd>{money(player.wage, lang)}</dd></div>
            </dl>
            {sellingClub && <span className="mg-nego__from"><Crest team={sellingClub} size={18} />{sellingClub.name}</span>}
          </div>
          <ol className="mg-chat" ref={logRef}>
            {neg.log.map((entry, i) => {
              const line = negotiationLine(career, neg, entry, lang, i);
              return <li key={i} className={`is-${line.who}`}>{line.text}</li>;
            })}
          </ol>
          {['your-turn', 'waiting'].includes(neg.status) && <HangUp onDone={hangUp} label={t('Mantén para colgar', 'Hold to end talks')} />}
        </section>
      </div>
    </Sheet>
  );
}
