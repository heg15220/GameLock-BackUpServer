import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Mail, Tag } from 'lucide-react';
import { getTransferWindow } from './engine.js';
import { formatMoney } from './recruitment-utils.js';
import { displayDate } from './preparation.jsx';
import { ClubClauseFields, emptyClubTerms, emptyLoanTerms, LoanTermsFields, LoanTermsSummary } from './recruitment-terms.jsx';

function SaleOffer({ offer, state, dispatch, t, lang, Badge }) {
  const player = state.world.players.find(item => item.id === offer.playerId);
  const buyer = state.world.clubs.find(item => item.id === offer.buyerId);
  const [fee, setFee] = useState(Math.round(player?.value || offer.fee));
  const [clubTerms, setClubTerms] = useState({ ...emptyClubTerms, ...Object.fromEntries(Object.keys(emptyClubTerms).filter(key => offer[key] != null).map(key => [key,offer[key]])) });
  const [loanTerms, setLoanTerms] = useState({ ...emptyLoanTerms, ...offer.loanTerms });
  const isLoan = offer.kind === 'loan';
  const active = ['pending', 'counter'].includes(offer.status);
  const disabled = Boolean(state.activeMatch);
  const window = getTransferWindow(state, { clubId: offer.buyerId, fromClubId: state.clubId, transactionType: isLoan ? 'loan' : 'permanent' });
  const status = { pending: t('Oferta recibida', 'Offer received'), counter: t('Condiciones acordadas', 'Terms agreed'), accepted: t('Operación cerrada', 'Deal completed'), rejected: t('Rechazada', 'Rejected'), expired: t('Caducada', 'Expired') };
  return <article className="fm-panel fm-sale-offer" data-offer-id={offer.id}>
    <div className="fm-section-heading"><span className="fm-kicker">{status[offer.status] || offer.status}</span><time>{displayDate(offer.date, lang)}</time></div><h3>{player?.name || offer.playerId}</h3>
    <div className="fm-transfer-player"><Badge item={buyer} size={36}/><div><strong>{buyer?.name}</strong><p>{isLoan ? t('Oferta de cesión', 'Loan offer') : t('Oferta de compra', 'Purchase offer')}</p></div><b>{formatMoney(isLoan ? offer.loanTerms?.fee : offer.fee, lang)}</b></div><p>{offer.message}</p>
    {isLoan ? <LoanTermsSummary terms={offer.loanTerms} {...{t,lang}}/> : <div className="fm-contract-conditions">{offer.sellOnPercent > 0 && <span>{t('Tu porcentaje de futura venta', 'Your sell-on share')}: {offer.sellOnPercent}%</span>}{offer.buybackFee > 0 && <span>{t('Tu recompra', 'Your buyback')}: {formatMoney(offer.buybackFee,lang)}</span>}{offer.installments > 0 && <span>{offer.upfrontPercent}% {t('al inicio', 'initially')} · {offer.installments} {t('plazos', 'instalments')}</span>}</div>}
    {active && <>
      <form className="fm-offer-form" onSubmit={event => { event.preventDefault(); dispatch({ type: 'RESPOND_TRANSFER_OFFER', offerId: offer.id, decision: 'counter', fee: Number(fee), ...clubTerms, ...(isLoan ? {loanTerms} : {}) }); }}>
        {isLoan ? <LoanTermsFields value={loanTerms} onChange={setLoanTerms} {...{t,disabled}}/> : <><label>{t('Tu contraoferta (€)', 'Your counteroffer (€)')}<input type="number" min="0" step="1" value={fee} required onChange={event => setFee(event.target.value)}/></label><ClubClauseFields value={clubTerms} onChange={setClubTerms} {...{t,disabled}}/></>}
        <button type="submit" disabled={disabled} className="fm-button">{isLoan ? t('Contraofertar cesión', 'Counter loan offer') : t('Contraofertar venta', 'Counter sale offer')}</button>
      </form>
      <div className="fm-deal-buttons"><button className="fm-button fm-primary" disabled={disabled || !window.open} onClick={() => dispatch({ type: 'RESPOND_TRANSFER_OFFER', offerId: offer.id, decision: 'accept' })}>{isLoan ? t('Aceptar cesión saliente', 'Accept outgoing loan') : t('Aceptar venta', 'Accept sale')}<ArrowUpRight size={15}/></button><button className="fm-button" disabled={disabled} onClick={() => dispatch({ type: 'RESPOND_TRANSFER_OFFER', offerId: offer.id, decision: 'reject' })}>{t('Rechazar oferta', 'Reject offer')}</button></div>
      <small>{t('Mercado del club receptor', 'Receiving club window')}: {window.country || buyer?.name} · {window.open ? `${t('Abierto hasta','Open until')} ${displayDate(window.end,lang)}` : `${t('Próxima apertura','Next opening')} ${displayDate(window.nextOpenDate,lang)}`} · {window.precision === 'confirmed' ? t('Documentado','Documented') : t('Estimado','Estimated')}</small>
    </>}
  </article>;
}

export default function TransferSales({ state, dispatch, t, lang, Badge }) {
  const listings = state.transferListings || [];
  const loaned = new Set((state.loans || []).filter(l => ['active','pending','awaiting-purchase'].includes(l.status)).map(l => l.playerId));
  const squad = state.world.players.filter(player => player.clubId === state.clubId && !player.retired && !player.emergency && !loaned.has(player.id) && !listings.some(listing => listing.playerId === player.id));
  const [playerId, setPlayerId] = useState(''), [askingFee, setAskingFee] = useState(''), [kind, setKind] = useState('sale');
  const [loanTerms, setLoanTerms] = useState({ ...emptyLoanTerms });
  const player = squad.find(item => item.id === playerId) || squad[0];
  useEffect(() => { setAskingFee(''); setLoanTerms({ ...emptyLoanTerms, fee: Math.round((player?.value || 0) * .08), purchaseFee: Math.round(player?.value || 0) }); }, [player?.id]);
  const disabled = Boolean(state.activeMatch);
  return <div className="fm-recruitment">
    <section className="fm-panel fm-scout-assignment"><div className="fm-section-heading"><h3>{t('Escucha ofertas por tu plantilla.', 'Listen to offers for your squad.')}</h3><Tag size={23}/></div>
      <p className="fm-note">{t('Elige venta o cesión y plantea tus condiciones. Los clubes valoran sus necesidades y responden con el paso de los días.', 'Choose a sale or loan and set your terms. Clubs assess their needs and respond over the following days.')}</p>
      <form className="fm-offer-form" onSubmit={event => { event.preventDefault(); if (player) dispatch({ type: 'LIST_FOR_TRANSFER', playerId: player.id, kind, askingFee: kind === 'loan' ? loanTerms.fee : askingFee === '' ? player.value : Number(askingFee), ...(kind === 'loan' ? {loanTerms} : {}) }); }}>
        <div className="fm-sale-listing-form"><label>{t('Jugador a ofrecer', 'Player to offer')}<select value={player?.id || ''} onChange={event => setPlayerId(event.target.value)}>{squad.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{t('Modalidad de salida', 'Departure type')}<select value={kind} onChange={e => setKind(e.target.value)}><option value="sale">{t('Venta', 'Sale')}</option><option value="loan">{t('Cesión', 'Loan')}</option></select></label>
        {kind === 'sale' && <label>{t('Precio de salida (€)', 'Asking price (€)')}<input type="number" min="0" step="1" value={askingFee} placeholder={String(Math.round(player?.value || 0))} onChange={event => setAskingFee(event.target.value)}/></label>}</div>
        {kind === 'loan' && <LoanTermsFields value={loanTerms} onChange={setLoanTerms} {...{t,disabled}}/>}<button className="fm-button fm-primary" type="submit" disabled={disabled || !player}>{kind === 'loan' ? t('Ofrecer en cesión','List for loan') : t('Ofrecer en el mercado','List for transfer')}</button>
      </form>
    </section>
    {listings.length > 0 && <section className="fm-panel fm-pending-deals"><h3>{t('Jugadores en el mercado', 'Transfer listed players')}</h3>{listings.map(listing => <article key={listing.playerId}><Tag size={17}/><div><strong>{state.world.players.find(item => item.id === listing.playerId)?.name}</strong><p>{listing.kind === 'loan' ? `${t('Cesión','Loan')} · ` : ''}{formatMoney(listing.askingFee,lang)} · {listing.responded ? t('Consulta resuelta','Enquiry resolved') : `${t('Respuesta prevista','Expected response')}: ${displayDate(listing.responseDate,lang)}`}</p></div><button className="fm-text-button" disabled={disabled} onClick={() => dispatch({ type:'UNLIST_TRANSFER',playerId:listing.playerId })}>{t('Retirar del mercado','Remove listing')}</button></article>)}</section>}
    <div className="fm-section-heading"><h3>{t('Ofertas de otros clubes','Offers from other clubs')}</h3><Mail size={23}/></div><div className="fm-report-grid">{(state.transferOffers || []).slice(0,20).map(offer => <SaleOffer key={offer.id} {...{offer,state,dispatch,t,lang,Badge}}/>)}</div>{!state.transferOffers?.length && <p className="fm-empty">{t('Todavía no has recibido ofertas. Los clubes necesitan tiempo para responder.','No offers received yet. Clubs need time to respond.')}</p>}
  </div>;
}
