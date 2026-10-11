import React, { useEffect, useRef, useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { getTransferWindow } from './engine.js';
import { displayDate } from './preparation.jsx';
import { ArrivalField, emptyLoanTerms, LoanTermsFields, LoanTermsSummary } from './recruitment-terms.jsx';

export default function LoanDesk({ state, player, dispatch, t, lang, Badge, clubMap, onClose }) {
  const ref = useRef(null);
  const deal = state.loanNegotiation?.playerId === player.id ? state.loanNegotiation : null;
  const [terms, setTerms] = useState({ ...emptyLoanTerms, fee: Math.round((player.value || 0) * .08), purchaseFee: Math.round(player.value || 0) });
  const window = getTransferWindow(state, { clubId: deal?.borrowerClubId || state.clubId, fromClubId: deal?.ownerClubId || player.clubId, transactionType: 'loan' });
  const [timing, setTiming] = useState(window.open ? 'immediate' : 'next-window');
  const disabled = Boolean(state.activeMatch);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'start' }); }, [player.id]);
  const blocked = Boolean(!deal && ((state.loanNegotiation && state.loanNegotiation.stage !== 'broken') || (state.negotiation && state.negotiation.stage !== 'broken')));
  return <section ref={ref} className="fm-panel fm-transfer-desk" data-testid="loan-desk">
    <div className="fm-section-heading"><div><span className="fm-kicker">{t('NEGOCIACIÓN DE CESIÓN', 'LOAN NEGOTIATION')}</span><h2>{player.name}</h2></div><button className="fm-icon-button" aria-label={t('Cerrar cesión', 'Close loan')} onClick={onClose}><X size={19}/></button></div>
    <div className="fm-transfer-player"><Badge item={clubMap.get(deal?.ownerClubId || player.clubId)} size={42}/><div><strong>{clubMap.get(deal?.ownerClubId || player.clubId)?.name}</strong><p>{t('El contrato y la propiedad permanecen en el club de origen durante la cesión.', 'The original club retains the contract and ownership during the loan.')}</p></div><ArrowRightLeft size={24}/></div>
    {window.currentWindow?.eligibility === 'english-efl-loan' && <p className="fm-note" role="status">{t('Periodo exclusivo de cesiones de la EFL hasta', 'EFL loan-only period until')} {displayDate(window.end, lang)}. {t('La compra definitiva debe esperar a su propia ventana.', 'Permanent purchases must wait for their own window.')} <a href={window.sourceUrls[0]} target="_blank" rel="noreferrer">{t('Fuente', 'Source')} ↗</a></p>}
    {!deal ? <><p className="fm-note">{t('Consulta si el club y el futbolista aceptan una cesión. Después podrás negociar plazo, tarifa, reparto salarial y compra.', 'Ask whether the club and player are open to a loan. Then negotiate duration, fee, wage share and purchase terms.')}</p><button className="fm-button fm-primary" disabled={disabled || blocked} onClick={() => dispatch({ type: 'OPEN_LOAN_NEGOTIATION', playerId: player.id })}>{t('Consultar cesión', 'Enquire about loan')}</button>{blocked && <p className="fm-note">{t('Termina la negociación abierta para iniciar esta consulta.', 'Finish the open negotiation before this enquiry.')}</p>}</> : <>
      <div className={`fm-deal-reply ${deal.stage === 'broken' ? 'is-broken' : ''}`} role="status"><strong>{t('Respuesta sobre la cesión', 'Loan response')}</strong><p>{deal.message}</p>{deal.stage === 'inquiry' && <small>{t('Respuesta prevista', 'Expected response')}: {displayDate(deal.readyDate, lang)}</small>}</div>
      {deal.stage === 'club' && <form className="fm-offer-form" onSubmit={e => { e.preventDefault(); dispatch({ type: 'OFFER_LOAN_TERMS', ...terms }); }}>
        <LoanTermsSummary terms={{...deal, ...(deal.counterTerms || deal.terms)}} {...{t, lang}}/><LoanTermsFields value={terms} onChange={setTerms} {...{t, disabled}}/>
        <div className="fm-deal-buttons"><button type="submit" className="fm-button fm-primary" disabled={disabled}>{t('Proponer cesión', 'Propose loan')}</button>{deal.counterTerms && <button type="button" className="fm-button" disabled={disabled} onClick={() => dispatch({ type: 'ACCEPT_LOAN_COUNTER' })}>{t('Aceptar condiciones de cesión', 'Accept loan terms')}</button>}</div>
      </form>}
      {deal.stage === 'agreed' && <div className="fm-deal-confirm"><LoanTermsSummary terms={{...deal, ...deal.terms}} {...{t, lang}}/><ArrivalField window={window} value={timing} onChange={setTiming} t={t}/><p className="fm-note">{t('La fecha de llegada respeta el mercado del club receptor. El préstamo y sus compromisos quedarán en Contratos y cesiones.', 'Arrival follows the borrowing club’s transfer window. The loan and commitments will appear in Contracts & loans.')}</p><button className="fm-button fm-primary" disabled={disabled} onClick={() => dispatch({ type: 'COMPLETE_LOAN', timing: !window.open && timing === 'immediate' ? 'next-window' : timing })}>{t('Confirmar cesión', 'Confirm loan')}</button></div>}
      <button className="fm-text-button fm-withdraw" disabled={disabled} onClick={() => dispatch({ type: 'CANCEL_LOAN_NEGOTIATION' })}>{t('Retirar negociación de cesión', 'Withdraw loan negotiation')}</button>
    </>}
  </section>;
}
