import React, { useEffect, useState } from 'react';
import { ArrowRightLeft, FileSignature, Receipt, RotateCcw } from 'lucide-react';
import { getContractOverview, getTransferWindow } from './engine.js';
import { displayDate } from './preparation.jsx';
import { formatMoney } from './recruitment-utils.js';
import { AmountField } from './recruitment-terms.jsx';

const roles = [['prospect','Promesa','Prospect'],['rotation','Rotación','Rotation'],['important','Importante','Important'],['crucial','Crucial','Crucial']];
function RenewalDesk({ state, dispatch, t, lang }) {
  const deal = state.renewalNegotiation;
  const player = state.world.players.find(p => p.id === deal?.playerId);
  const [terms, setTerms] = useState({ wage: 1000, signingBonus: 0, years: 3, role: 'rotation', releaseClause: null });
  useEffect(() => { if (deal) setTerms({ ...deal.demands, ...(deal.terms || {}) }); }, [deal?.playerId]);
  if (!deal || !player) return null;
  const disabled = Boolean(state.activeMatch);
  const set = (key, value) => setTerms({ ...terms, [key]: value });
  return <section className="fm-panel fm-transfer-desk" data-testid="renewal-desk"><div className="fm-section-heading"><div><span className="fm-kicker">{t('CONVERSACIÓN CONTRACTUAL', 'CONTRACT TALKS')}</span><h3>{player.name}</h3></div><FileSignature size={24}/></div>
    <div className="fm-deal-reply" role="status"><p>{deal.message}</p></div>
    {deal.stage === 'contract' && <form className="fm-offer-form" onSubmit={e => { e.preventDefault(); dispatch({ type: 'OFFER_RENEWAL', ...terms }); }}>
      <div className="fm-deal-terms"><span>{t('Salario solicitado', 'Requested wage')}<strong>{formatMoney(deal.demands?.wage, lang)}</strong></span><span>{t('Prima solicitada', 'Requested bonus')}<strong>{formatMoney(deal.demands?.signingBonus, lang)}</strong></span></div>
      <div className="fm-offer-fields"><AmountField label={t('Salario de renovación (€)', 'Renewal weekly wage (€)')} min={1} value={terms.wage} onChange={v => set('wage',v)} disabled={disabled}/><AmountField label={t('Prima de renovación (€)', 'Renewal bonus (€)')} value={terms.signingBonus} onChange={v => set('signingBonus',v)} disabled={disabled}/>
        <label>{t('Años del nuevo contrato', 'New contract years')}<select disabled={disabled} value={terms.years} onChange={e => set('years',Number(e.target.value))}>{[1,2,3,4,5].map(n => <option value={n} key={n}>{n}</option>)}</select></label>
        <label>{t('Rol del nuevo contrato', 'New contract role')}<select disabled={disabled} value={terms.role} onChange={e => set('role',e.target.value)}>{roles.map(([id,es,en]) => <option key={id} value={id}>{t(es,en)}</option>)}</select></label>
        <AmountField label={t('Rescisión del nuevo contrato (€)', 'New release clause (€)')} nullable value={terms.releaseClause} onChange={v => set('releaseClause',v)} disabled={disabled}/>
      </div><div className="fm-deal-buttons"><button className="fm-button fm-primary" type="submit" disabled={disabled}>{t('Proponer renovación', 'Propose renewal')}</button><button type="button" className="fm-button" disabled={disabled} onClick={() => dispatch({ type:'ACCEPT_RENEWAL_COUNTER' })}>{t('Aceptar condiciones de renovación', 'Accept renewal terms')}</button></div>
    </form>}
    {deal.stage === 'agreed' && <><div className="fm-deal-terms"><span>{t('Salario / semana', 'Weekly wage')}<strong>{formatMoney(deal.terms?.wage, lang)}</strong></span><span>{t('Prima', 'Bonus')}<strong>{formatMoney(deal.terms?.signingBonus, lang)}</strong></span><span>{t('Duración', 'Duration')}<strong>{deal.terms?.years} {t('años','years')}</strong></span><span>{t('Rescisión', 'Release clause')}<strong>{deal.terms?.releaseClause ? formatMoney(deal.terms.releaseClause, lang) : t('Sin cláusula','No clause')}</strong></span></div><button className="fm-button fm-primary" disabled={disabled} onClick={() => dispatch({ type:'COMPLETE_RENEWAL' })}>{t('Firmar renovación', 'Sign renewal')}</button></>}
    <button className="fm-text-button fm-withdraw" disabled={disabled} onClick={() => dispatch({ type:'CANCEL_RENEWAL' })}>{t('Retirar renovación', 'Withdraw renewal')}</button>
  </section>;
}

export default function ContractsPanel({ state, dispatch, t, lang, Badge, onTarget }) {
  const overview = getContractOverview(state);
  const disabled = Boolean(state.activeMatch);
  const [selectedId, setSelectedId] = useState('');
  const contracts = overview.contracts || [];
  const player = contracts.find(p => p.id === selectedId) || contracts[0];
  const club = id => state.world.clubs.find(c => c.id === id);
  const name = id => state.world.players.find(p => p.id === id)?.name || id;
  const status = {pending:t('Acordada','Agreed'),active:t('En curso','Active'),'awaiting-purchase':t('Compra pendiente','Purchase pending'),returned:t('De vuelta','Returned'),purchased:t('Compra ejecutada','Purchased'),cancelled:t('Cancelada','Cancelled')};
  return <div className="fm-recruitment" data-testid="contracts-panel">
    <RenewalDesk {...{state,dispatch,t,lang}}/>
    <section className="fm-panel fm-contract-selection"><div className="fm-section-heading"><div><span className="fm-kicker">{t('CONTRATOS DE TU CLUB','YOUR CLUB CONTRACTS')}</span><h3>{t('Planifica su continuidad.','Plan their future.')}</h3></div><FileSignature size={25}/></div>
      <label>{t('Futbolista con contrato','Contracted player')}<select value={player?.id || ''} onChange={e => setSelectedId(e.target.value)}>{contracts.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      {player && <><div className="fm-deal-terms"><span>{t('Salario nominal / semana','Contractual weekly wage')}<strong>{formatMoney(player.wage, lang)}</strong></span><span>{t('Fin del contrato registrado','Recorded contract end')}<strong>{player.contract?.endDate ? displayDate(player.contract.endDate,lang) : t('Sin fecha registrada','No recorded date')}</strong></span><span>{t('Cláusula de rescisión','Release clause')}<strong>{player.contract?.releaseClause ? formatMoney(player.contract.releaseClause,lang) : t('Sin cláusula','No clause')}</strong></span><span>{t('Club actual','Current club')}<strong>{club(player.clubId)?.name}</strong></span></div>
      <button className="fm-button fm-primary" disabled={disabled || Boolean(state.renewalNegotiation) || player.clubId !== state.clubId} onClick={() => dispatch({ type:'OPEN_CONTRACT_RENEWAL',playerId:player.id })}>{t('Negociar renovación','Negotiate renewal')}</button>{player.clubId !== state.clubId && <p className="fm-note">{t('Puedes negociar su renovación cuando regrese de la cesión.','You can negotiate renewal when the player returns from loan.')}</p>}</>}
    </section>
    <div className="fm-section-heading"><h3>{t('Cesiones e incorporaciones temporales','Loans and temporary arrivals')}</h3><ArrowRightLeft size={23}/></div>
    <div className="fm-report-grid">{(overview.loans || []).map(loan => <article className="fm-panel fm-contract-card" key={loan.id} data-loan-id={loan.id}><span className="fm-kicker">{status[loan.status] || loan.status}</span><h3>{name(loan.playerId)}</h3>
      <div className="fm-loan-route"><span><Badge item={club(loan.ownerClubId)} size={30}/>{club(loan.ownerClubId)?.name}</span><ArrowRightLeft size={16}/><span><Badge item={club(loan.borrowerClubId)} size={30}/>{club(loan.borrowerClubId)?.name}</span></div>
      <dl className="fm-report-dossier"><div><dt>{t('Inicio','Start')}</dt><dd>{displayDate(loan.startDate,lang)}</dd></div><div><dt>{t('Fin de cesión','Loan end')}</dt><dd>{displayDate(loan.endDate,lang)}</dd></div><div><dt>{t('Tarifa','Loan fee')}</dt><dd>{formatMoney(loan.fee,lang)}</dd></div><div><dt>{t('Salario receptor','Borrower wages')}</dt><dd>{loan.wageShare}%</dd></div><div><dt>{t('Compra','Purchase')}</dt><dd>{loan.purchaseType === 'none' ? t('Sin compra acordada','No purchase agreed') : `${loan.purchaseType === 'option' ? t('Opcional','Optional') : t('Obligatoria','Mandatory')} · ${formatMoney(loan.purchaseFee,lang)}`}</dd></div></dl>
      {loan.purchaseDate && <p className="fm-note">{t('Compra prevista','Planned purchase')}: {displayDate(loan.purchaseDate,lang)}</p>}
      {loan.purchaseType !== 'none' && <p className="fm-note">{t('Contrato de compra acordado','Agreed purchase contract')}: {loan.purchaseYears} {t('años','years')} · {t('Rotación','Rotation')} · {formatMoney(loan.purchaseWage,lang)} / {t('semana','week')}</p>}
      {loan.borrowerClubId === state.clubId && loan.purchaseType === 'option' && loan.status === 'active' && !loan.purchaseDate && <><button className="fm-button fm-primary" disabled={disabled} onClick={() => dispatch({ type:'EXERCISE_LOAN_OPTION',loanId:loan.id })}>{t('Ejecutar opción de compra','Exercise purchase option')}</button>{!getTransferWindow(state, {fromClubId: loan.ownerClubId}).open && <p className="fm-note">{t('El ejercicio reserva la compra para la próxima ventana del receptor.','Exercising reserves the purchase for the receiving club’s next window.')}</p>}</>}
    </article>)}</div>{!overview.loans?.length && <p className="fm-empty">{t('Todavía no hay cesiones acordadas. Puedes solicitarlas desde la ficha de mercado o escuchar ofertas de cesión por tu plantilla.','No loans agreed yet. Request a loan from a player profile or list your own players for loan offers.')}</p>}
    <div className="fm-section-heading"><h3>{t('Derechos sobre próximos traspasos','Rights on future transfers')}</h3><RotateCcw size={23}/></div>
    <div className="fm-report-grid">{(overview.rights || []).map(right => <article key={right.id} className="fm-panel fm-contract-card"><span className="fm-kicker">{right.kind === 'buyback' ? t('RECOMPRA','BUYBACK') : t('FUTURA VENTA','SELL-ON')}</span><h3>{name(right.playerId)}</h3><p>{t('Beneficiario','Right holder')}: {club(right.holderClubId)?.name}</p><strong className="fm-contract-amount">{right.kind === 'buyback' ? formatMoney(right.fee,lang) : `${right.percent}%`}</strong><p>{right.expiresDate ? `${t('Vigente hasta','Valid until')} ${displayDate(right.expiresDate,lang)}` : t('Sobre el próximo traspaso acordado','On the agreed subsequent transfer')}</p><span className="fm-pill">{right.status === 'active' ? t('Vigente','Active') : right.status === 'used' ? t('Ejecutado','Used') : t('Caducado','Expired')}</span>
      {right.kind === 'buyback' && right.holderClubId === state.clubId && right.status === 'active' && <button className="fm-button" disabled={disabled} onClick={() => {dispatch({type:'TRIGGER_BUYBACK',rightId:right.id});onTarget(right.playerId);}}>{t('Iniciar recompra','Start buyback')}</button>}
    </article>)}</div>{!overview.rights?.length && <p className="fm-empty">{t('Las cláusulas de futura venta y recompra aparecerán aquí cuando se firme una operación.','Sell-on and buyback rights appear here when a deal is signed.')}</p>}
    <section className="fm-panel fm-contract-payments"><div className="fm-section-heading"><h3>{t('Calendario de pagos','Payment schedule')}</h3><Receipt size={23}/></div><p className="fm-note">{t('Los compromisos pendientes se descuentan del presupuesto libre. El calendario procesa cada pago una vez y conserva su historial.','Pending commitments reduce available funds. The calendar processes each payment once and retains its history.')}</p>
      {(overview.obligations || []).map(payment => <article key={payment.id}><div><strong>{name(payment.playerId)}</strong><p>{club(payment.fromClubId)?.name} → {club(payment.toClubId)?.name || t('Futbolista','Player')}</p><time>{displayDate(payment.dueDate,lang)}</time></div><div><strong>{payment.fromClubId === state.clubId ? '−' : '+'}{formatMoney(payment.amount,lang)}</strong><span className="fm-pill">{payment.status === 'paid' ? t('Abonado','Paid') : t('Pendiente','Pending')}</span></div></article>)}
      {!overview.obligations?.length && <p className="fm-empty">{t('No hay pagos aplazados registrados.','No deferred payments recorded.')}</p>}
    </section>
  </div>;
}
