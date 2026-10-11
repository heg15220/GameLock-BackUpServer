import { addDays } from './health.js';
import { createStream } from '../trayectoria/rng.js';
import { getNextTransferDate, getNextSeasonTransferDate } from './transfer-windows.js';
import { LIVE_LOAN_STATUSES, activeLoan, addMonths, appendObligations, availableClubBudget, clubCommitments, clubWageBill,
  contractNews, findPlayer, moveContractPlayer, permanentTransfer, registrationProblem, validMoney } from './contract-economy.js';

const fail = (state, text) => ({ ...state, lastError: text });
export function validLoanTerms(terms) {
  return terms && [6, 12].includes(terms.months) && validMoney(terms.fee) && Number.isFinite(terms.wageShare) && terms.wageShare >= 0 && terms.wageShare <= 100
    && ['none', 'option', 'obligation'].includes(terms.purchaseType) && validMoney(terms.purchaseFee) && (terms.purchaseType === 'none' || terms.purchaseFee > 0);
}
export function loanQuote(state, player, borrowerClubId) {
  const random = createStream(state.seed, state.date, player.id, borrowerClubId, 'loan-terms');
  return { months: 6, fee: Math.round(player.value * (0.035 + random() * 0.025) / 1000) * 1000,
    wageShare: 70, purchaseType: 'none', purchaseFee: Math.round(player.value * 1.2 / 1000) * 1000,
    purchaseWage: Math.round(player.wage * 1.1), purchaseYears: 3, purchaseRole: 'rotation' };
}
function loanError(state, playerId, borrowerClubId, excludingId = null) {
  const player = findPlayer(state, playerId), borrower = state.world.clubs.find((club) => club.id === borrowerClubId);
  if (!player || player.retired || player.emergency || !borrower || player.clubId === borrowerClubId) return 'No es posible acordar esa cesión.';
  if (activeLoan(state, playerId)?.id !== excludingId && activeLoan(state, playerId)) return 'El jugador ya tiene una cesión vigente o reservada; no se permite subcederlo.';
  if ((state.pendingTransfers || []).some((deal) => deal.playerId === playerId)) return 'El jugador ya tiene una incorporación acordada.';
  const reserved = new Set([...(state.loans || []).filter((loan) => loan.id !== excludingId && loan.status === 'pending').map((loan) => loan.playerId),
    ...(state.pendingTransfers || []).map((deal) => deal.playerId)]);
  const squad = state.world.players.filter((entry) => entry.clubId === player.clubId && !entry.retired && !reserved.has(entry.id));
  const owner = state.world.clubs.find((club) => club.id === player.clubId);
  const external = state.world.competitions.find((league) => league.id === owner.competitionId)?.simulated === false;
  if (!external && (squad.length <= 16 || (player.position === 'GK' && squad.filter((entry) => entry.position === 'GK').length <= 2))) return 'El propietario necesita conservar 16 jugadores y dos porteros.';
  if (Math.abs(player.rating - borrower.rating) > 17) return 'El jugador no acepta ese proyecto deportivo para su cesión.';
  return registrationProblem(state, player, borrowerClubId, excludingId);
}
export function openLoanNegotiation(state, { playerId, borrowerClubId = state.clubId }) {
  if (state.loanNegotiation && state.loanNegotiation.stage !== 'broken') return fail(state, 'Cierra la conversación de cesión activa.');
  const error = loanError(state, playerId, borrowerClubId);
  if (error) return fail(state, error);
  if (state.marketCooldowns?.[playerId] > state.date) return fail(state, `El representante no volverá a negociar hasta ${state.marketCooldowns[playerId]}.`);
  const player = findPlayer(state, playerId), terms = loanQuote(state, player, borrowerClubId);
  if (![player.clubId, borrowerClubId].includes(state.clubId)) return fail(state, 'Solo puedes negociar cesiones de tu club.');
  return { ...state, lastError: null, loanNegotiation: { playerId, ownerClubId: player.clubId, borrowerClubId, stage: 'inquiry', status: 'waiting',
    purchaseWage: terms.purchaseWage, purchaseYears: terms.purchaseYears, purchaseRole: terms.purchaseRole,
    readyDate: addDays(state.date, 2), expiresDate: addDays(state.date, 16), patience: 4, terms, counterTerms: terms,
    message: 'Consulta de cesión enviada. El club y el jugador responderán en dos días.' } };
}
export function offerLoanTerms(state, action, accept = false) {
  const deal = state.loanNegotiation;
  if (!deal || deal.stage !== 'club') return fail(state, 'Espera la respuesta a la consulta de cesión.');
  const terms = accept ? { ...deal.counterTerms } : { months: Number(action.months), fee: Number(action.fee), wageShare: Number(action.wageShare),
    purchaseType: action.purchaseType, purchaseFee: Number(action.purchaseFee || 0) };
  if (!validLoanTerms(terms)) return fail(state, 'Indica 6 o 12 meses, tarifa, reparto salarial y compra válidos.');
  const quote = deal.counterTerms, incoming = deal.borrowerClubId === state.clubId;
  const minimumFee = quote.fee * terms.months / quote.months;
  const fair = (incoming ? terms.fee >= minimumFee * 0.85 && terms.wageShare >= quote.wageShare - 10
    : terms.fee <= minimumFee * 1.2 && terms.wageShare <= quote.wageShare + 10)
    && (terms.purchaseType === 'none' || (incoming ? terms.purchaseFee >= findPlayer(state, deal.playerId).value : terms.purchaseFee <= findPlayer(state, deal.playerId).value * 1.3));
  if (fair) return { ...state, lastError: null, loanNegotiation: { ...deal, terms, stage: 'agreed', status: 'accepted', message: 'Club y jugador aceptan la cesión. Revisa y confirma la incorporación.' } };
  const patience = deal.patience - 1;
  return { ...state, lastError: null, loanNegotiation: { ...deal, terms, patience, stage: patience ? 'club' : 'broken', status: patience ? 'counter' : 'rejected',
    message: patience ? 'La otra parte mantiene su contrapropuesta.' : 'Se rompe la negociación de cesión.' },
    ...(patience ? {} : { marketCooldowns: { ...state.marketCooldowns, [deal.playerId]: addDays(state.date, 14) } }) };
}
export function cancelLoanNegotiation(state) { return { ...state, lastError: null, loanNegotiation: null }; }

export function arrangeLoan(state, deal, timing = 'immediate') {
  const player = findPlayer(state, deal.playerId), terms = deal.terms;
  const error = loanError(state, deal.playerId, deal.borrowerClubId);
  if (error) return fail(state, error);
  if (player.clubId !== deal.ownerClubId) return fail(state, 'El propietario ya no coincide con el acuerdo de cesión.');
  if (!validLoanTerms(terms) || !['immediate', 'next-window', 'next-season'].includes(timing)) return fail(state, 'Las condiciones de cesión no son válidas.');
  const loanWindow = { clubId: deal.borrowerClubId, fromClubId: deal.ownerClubId, transactionType: 'loan' };
  const startDate = timing === 'next-season' ? getNextSeasonTransferDate(state, loanWindow)
    : getNextTransferDate(state, { ...loanWindow, includeCurrent: timing !== 'next-window' });
  const endDate = addMonths(startDate, terms.months);
  if (player.contract?.endDate && player.contract.endDate < endDate) return fail(state, 'El contrato del propietario vence antes de terminar la cesión. Renueva antes de cederlo.');
  const purchaseWage = Math.round(player.wage * 1.1), mandatory = terms.purchaseType === 'obligation';
  const cost = terms.fee + (mandatory ? terms.purchaseFee : 0);
  if (availableClubBudget(state, deal.borrowerClubId) < cost) return fail(state, 'El receptor no puede reservar la tarifa y la compra obligatoria.');
  if (deal.borrowerClubId === state.clubId && state.finances.wageBudget - clubWageBill(state) - clubCommitments(state).reservedWages
    < (mandatory ? purchaseWage : player.wage * terms.wageShare / 100)) return fail(state, 'No queda margen salarial para la cesión y sus compromisos.');
  const loan = { ...terms, id: `loan:${player.id}:${state.date}:${(state.loans || []).length}`, playerId: player.id, ownerClubId: deal.ownerClubId,
    borrowerClubId: deal.borrowerClubId, agreedDate: state.date, startDate, endDate, status: 'pending', wage: player.wage,
    ownerContract: player.contract || null, purchaseWage, purchaseYears: 3, purchaseRole: 'rotation',
    purchaseDate: mandatory ? getNextTransferDate(state, { clubId: deal.borrowerClubId, fromClubId: deal.ownerClubId, date: endDate }) : null };
  return progressLoans({ ...state, lastError: null, loanNegotiation: null, loans: [...(state.loans || []), loan] });
}
export function completeLoan(state, { timing = 'immediate' } = {}) {
  if (state.loanNegotiation?.stage !== 'agreed') return fail(state, 'Primero debes acordar las condiciones de cesión.');
  return arrangeLoan(state, state.loanNegotiation, timing);
}
export function exerciseLoanOption(state, { loanId }) {
  const loan = (state.loans || []).find((entry) => entry.id === loanId);
  if (!loan || loan.purchaseType !== 'option' || loan.status !== 'active' || loan.purchaseDate || loan.borrowerClubId !== state.clubId || state.date > loan.endDate)
    return fail(state, 'No hay una opción de compra propia ejecutable.');
  if (availableClubBudget(state, state.clubId) < loan.purchaseFee) return fail(state, 'No puedes reservar el precio de la opción de compra.');
  if (state.finances.wageBudget - clubWageBill(state) - clubCommitments(state).reservedWages < loan.purchaseWage - loan.wage * loan.wageShare / 100)
    return fail(state, 'No queda margen para el salario permanente acordado.');
  return progressLoans({ ...state, lastError: null, loans: state.loans.map((entry) => entry.id === loanId
    ? { ...entry, purchaseDate: getNextTransferDate(state, { clubId: loan.borrowerClubId, fromClubId: loan.ownerClubId }), optionExercisedDate: state.date } : entry) });
}
function patchLoan(state, loan, patch) { return { ...state, loans: state.loans.map((entry) => entry.id === loan.id ? { ...entry, ...patch } : entry) }; }
export function progressLoans(state) {
  let next = state;
  const query = state.loanNegotiation;
  if (query && query.stage !== 'broken' && state.date > query.expiresDate) next = { ...next, loanNegotiation: { ...query, stage: 'broken', status: 'rejected', message: 'La negociación de cesión ha caducado.' } };
  else if (query?.stage === 'inquiry' && state.date >= query.readyDate) next = { ...next, loanNegotiation: { ...query,
    stage: 'club', status: 'ready', message: 'Puedes negociar tarifa, plazo, reparto salarial y compra.' } };
  for (const original of (state.loans || []).filter((loan) => LIVE_LOAN_STATUSES.includes(loan.status))) {
    let loan = next.loans.find((entry) => entry.id === original.id), player = findPlayer(next, loan.playerId);
    if (player.retired && ['active', 'awaiting-purchase'].includes(loan.status)) {
      next = moveContractPlayer(next, player, loan.ownerClubId, { ownerClubId: loan.ownerClubId, loanId: null, contract: loan.ownerContract }, state.date);
      next = patchLoan(next, loan, { status: 'returned', purchaseDate: null, returnedDate: state.date, resolutionReason: 'retired' });
      next = contractNews(next, `${player.name} se retira: finaliza la cesión y se libera la compra pendiente.`); continue;
    }
    if (loan.status === 'pending' && loan.startDate <= state.date) {
      const error = loanError(next, loan.playerId, loan.borrowerClubId, loan.id);
      if (error || player.clubId !== loan.ownerClubId) { next = contractNews(patchLoan(next, loan, { status: 'cancelled' }), `Cesión cancelada: ${error || 'el jugador cambió de club'}. Se liberan sus reservas.`); continue; }
      next = moveContractPlayer(next, player, loan.borrowerClubId, { ownerClubId: loan.ownerClubId, loanId: loan.id }, loan.startDate);
      next = patchLoan(next, loan, { status: 'active' });
      next = appendObligations(next, [{ id: `${loan.id}:fee`, dealId: loan.id, playerId: player.id, fromClubId: loan.borrowerClubId, toClubId: loan.ownerClubId,
        amount: loan.fee, dueDate: loan.startDate, status: 'pending', kind: 'loan-fee' }]);
      next = contractNews(next, `${player.name} se incorpora cedido hasta ${loan.endDate}.`);
      loan = next.loans.find((entry) => entry.id === loan.id); player = findPlayer(next, loan.playerId);
    }
    // CPU receivers decide optional purchases once, at expiry, on quality and means.
    if (loan.status === 'active' && loan.endDate <= state.date && loan.purchaseType === 'option' && !loan.purchaseDate && loan.borrowerClubId !== state.clubId) {
      const buyer = next.world.clubs.find((club) => club.id === loan.borrowerClubId);
      if (!player.retired && player.rating >= buyer.rating - 5 && availableClubBudget(next, buyer.id) >= loan.purchaseFee)
        next = patchLoan(next, loan, { purchaseDate: getNextTransferDate(next, { clubId: buyer.id, fromClubId: loan.ownerClubId, date: loan.endDate }), optionExercisedDate: loan.endDate });
      loan = next.loans.find((entry) => entry.id === loan.id);
    }
    if (loan.purchaseDate && loan.purchaseDate <= state.date && !player.retired) {
      next = patchLoan(next, loan, { status: 'purchased', resolvedDate: loan.purchaseDate });
      next = permanentTransfer(next, { id: `${loan.id}:purchase`, playerId: player.id, fromClubId: loan.ownerClubId, toClubId: loan.borrowerClubId,
        joinDate: loan.purchaseDate, fee: loan.purchaseFee, wage: loan.purchaseWage, years: loan.purchaseYears, role: loan.purchaseRole, signingBonus: 0, loanId: loan.id });
      next = contractNews(next, `${player.name}: compra ${loan.purchaseType === 'obligation' ? 'obligatoria' : 'opcional'} ejecutada por ${loan.purchaseFee.toLocaleString('es-ES')} €.`);
    } else if (loan.status === 'active' && loan.endDate <= state.date) {
      next = moveContractPlayer(next, player, loan.ownerClubId, { ownerClubId: loan.ownerClubId, loanId: null, wage: loan.wage, contract: loan.ownerContract }, loan.endDate);
      next = patchLoan(next, loan, { status: loan.purchaseDate && !player.retired ? 'awaiting-purchase' : 'returned', returnedDate: loan.endDate });
      next = contractNews(next, `${player.name} regresa al club propietario al finalizar su cesión.`);
    } else if (player.retired && loan.status === 'awaiting-purchase') next = patchLoan(next, loan, { status: 'returned' });
  }
  return next;
}
