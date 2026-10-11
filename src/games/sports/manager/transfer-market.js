import { createStream } from '../trayectoria/rng.js';
import { addDays, getPlayerHealth } from './health.js';
import { getPlayerAge } from './player-age.js';
import { getTransferWindow, getNextSeasonTransferDate } from './transfer-windows.js';
import { activeLoan, availableClubBudget, clubCommitments, clubWageBill, permanentTransfer, registrationProblem, validMoney } from './contract-economy.js';
import { arrangeLoan, loanQuote, validLoanTerms } from './loans.js';
export { getTransferWindow };

export const CONTRACT_ROLES = ['prospect', 'rotation', 'important', 'crucial'];
export function validDealClauses(deal) {
  return [0, 2, 4].includes(deal.installments ?? 0) && Number.isFinite(deal.upfrontPercent ?? 100) && (deal.upfrontPercent ?? 100) >= 25 && (deal.upfrontPercent ?? 100) <= 100
    && validMoney(deal.sellOnPercent ?? 0) && (deal.sellOnPercent ?? 0) <= 30
    && (deal.buybackFee == null || validMoney(deal.buybackFee) && deal.buybackFee > 0) && [1, 2, 3].includes(deal.buybackYears ?? 2)
    && (deal.releaseClause == null || validMoney(deal.releaseClause) && deal.releaseClause > 0);
}
const money = (value) => Math.round(value / 1000) * 1000;
const playerById = (state, id) => state.world.players.find((player) => player.id === id);
const ownPlayers = (state) => state.world.players.filter((player) => player.clubId === state.clubId && !player.retired);
const terminal = (deal) => !deal || deal.stage === 'broken';
const validDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date));
const fail = (state, message) => ({ ...state, lastError: message });
function news(state, text) {
  return { ...state, news: [{ id: `market:${state.date}:${state.transfers.length}:${text.slice(0, 30)}`, type: 'transfer', text }, ...state.news].slice(0, 30) };
}

export function getRecruitmentFinances(state, excludingId = null) {
  const commitments = clubCommitments(state, state.clubId, excludingId), wageBill = clubWageBill(state);
  return { ...commitments, wageBill, availableBudget: state.finances.budget - commitments.reservedFees,
    availableWages: state.finances.wageBudget - wageBill - commitments.reservedWages };
}

export function registrationError(state, player) {
  const problem = registrationProblem(state, player, state.clubId);
  if (problem) return problem;
  const reserved = (state.pendingTransfers || []).filter((deal) => deal.playerId !== player.id).map((deal) => playerById(state, deal.playerId)).filter(Boolean);
  const squad = [...ownPlayers(state), ...reserved];
  if (squad.length >= 80) return 'La plantilla y las incorporaciones reservadas alcanzan el máximo de 80 jugadores.';
  if (getPlayerAge(player, state.date, state.year) >= 21 && squad.filter((entry) => getPlayerAge(entry, state.date, state.year) >= 21).length >= 30)
    return 'Ya hay 30 jugadores sénior inscritos o reservados; los sub-21 no ocupan esas plazas.';
  return null;
}

function sellerNeedsPlayer(state, player) {
  const club = state.world.clubs.find((entry) => entry.id === player.clubId);
  // External clubs have only their documented market players, not a complete roster.
  if (state.world.competitions.find((entry) => entry.id === club?.competitionId)?.simulated === false) return false;
  const reserved = new Set([...(state.pendingTransfers || []).filter((deal) => deal.playerId !== player.id).map((deal) => deal.playerId),
    ...(state.loans || []).filter((loan) => loan.status === 'pending' && loan.playerId !== player.id).map((loan) => loan.playerId)]);
  const remaining = state.world.players.filter((entry) => entry.clubId === player.clubId && !entry.retired && !reserved.has(entry.id));
  return remaining.length <= 16 || (player.position === 'GK' && remaining.filter((entry) => entry.position === 'GK').length <= 2);
}

function termsFor(state, player) {
  const club = state.world.clubs.find((entry) => entry.id === state.clubId);
  const random = createStream(state.seed, state.year, 'staged-transfer-v1', player.id);
  const age = getPlayerAge(player, state.date, state.year);
  const wage = Math.max(500, Math.round(player.wage * (1.1 + random() * 0.18)));
  const years = age < 25 ? 5 : age < 31 ? 3 : 2;
  const role = age < 22 && player.rating < club.rating - 8 ? 'prospect' : player.rating >= club.rating + 3 ? 'crucial'
    : player.rating >= club.rating - 4 ? 'important' : 'rotation';
  const relationship = state.clubRelationships?.[player.clubId] || 0;
  const protectedSquad = sellerNeedsPlayer(state, player);
  return { askingFee: money(player.value * (1.05 + random() * 0.2) * (1 - relationship * 0.0004)), demands: { wage, signingBonus: money(wage * 8), years, role },
    interested: !protectedSquad && relationship > -60 && player.rating <= club.rating + 17,
    refusalReason: protectedSquad ? 'El club no vende porque debe mantener su plantilla mínima y dos porteros.' : 'El representante no considera adecuado el salto deportivo o la relación entre clubes.' };
}

function record(deal, state, message, patch = {}) {
  return { ...deal, ...patch, message, history: [...(deal.history || []), { date: state.date, stage: patch.stage || deal.stage, message }].slice(-20) };
}
function broken(state, deal, message) {
  return { ...state, lastError: null, negotiation: record(deal, state, message, { stage: 'broken', status: 'rejected', patience: 0 }),
    clubRelationships: { ...state.clubRelationships, [deal.fromClubId]: Math.max(-100, (state.clubRelationships?.[deal.fromClubId] || 0) - (deal.stage === 'inquiry' ? 0 : 6)) },
    marketCooldowns: { ...state.marketCooldowns, [deal.playerId]: addDays(state.date, 14) } };
}
function eligible(state, playerId) {
  const player = playerById(state, playerId);
  if (!player || player.retired || player.emergency || player.clubId === state.clubId) return 'El jugador no está disponible para un traspaso.';
  if (activeLoan(state, playerId)) return 'El jugador está sujeto a una cesión; utiliza su opción de compra o espera el retorno.';
  if ((state.pendingTransfers || []).some((deal) => deal.playerId === playerId)) return 'Ese jugador ya tiene una incorporación reservada.';
  return registrationError(state, player);
}

export function openNegotiation(state, { playerId }) {
  if (!terminal(state.negotiation)) return fail(state, 'Cierra o retira la negociación activa antes de iniciar otra.');
  const error = eligible(state, playerId);
  if (error) return fail(state, error);
  if ((state.marketCooldowns?.[playerId] || '') > state.date) return fail(state, `El representante no volverá a negociar hasta ${state.marketCooldowns[playerId]}.`);
  const player = playerById(state, playerId), terms = termsFor(state, player);
  return { ...state, lastError: null, negotiation: { version: 2, stage: 'inquiry', status: 'waiting', playerId, fromClubId: player.clubId,
    ...terms, fee: terms.askingFee, ...terms.demands, clubAttempts: 0, contractAttempts: 0, patience: 4,
    readyDate: addDays(state.date, 2), expiresDate: addDays(state.date, 16), injury: getPlayerHealth(state, player).injury,
    message: 'Consulta enviada al club y al representante. La respuesta llegará en dos días.', history: [{ date: state.date, stage: 'inquiry', message: 'Consulta inicial enviada.' }] } };
}

export function offerClub(state, action, accept = false) {
  const deal = state.negotiation;
  if (deal?.version !== 2 || deal.stage !== 'club') return fail(state, 'Espera el permiso del club antes de negociar el precio.');
  const amount = accept ? deal.askingFee : Number(action.fee), available = getRecruitmentFinances(state);
  const clauses = accept ? { installments: deal.installments || 0, upfrontPercent: deal.upfrontPercent ?? 100, sellOnPercent: deal.sellOnPercent || 0,
    buybackFee: deal.buybackFee ?? null, buybackYears: deal.buybackYears || 2 } : {
    installments: Number(action.installments || 0), upfrontPercent: Number(action.upfrontPercent ?? 100), sellOnPercent: Number(action.sellOnPercent || 0),
    buybackFee: action.buybackFee == null || action.buybackFee === '' ? null : Number(action.buybackFee), buybackYears: Number(action.buybackYears || 2) };
  if (!validDealClauses(clauses) || clauses.buybackFee && clauses.buybackFee < amount * 1.1) return fail(state, 'Los plazos o las cláusulas propuestas no son válidos; la recompra debe superar el precio al menos un 10%.');
  if (!Number.isFinite(amount) || amount < 0 || amount > available.availableBudget) return fail(state, 'El precio supera el presupuesto libre o no es válido.');
  const attempts = deal.clubAttempts + 1;
  if (amount < deal.askingFee * 0.45 || attempts > 4) return broken(state, deal, 'El club se retira: la propuesta está demasiado lejos de su valoración.');
  const target = deal.askingFee * (1 - clauses.sellOnPercent * 0.002 - (clauses.buybackFee ? 0.025 : 0)) * (clauses.installments ? 1.025 : 1);
  if (amount >= target * 0.93) return { ...state, lastError: null, negotiation: record(deal, state,
    'Hay acuerdo con el club. Ahora debes negociar el contrato del jugador.', { ...clauses, fee: Math.round(amount), stage: 'contract', status: 'ready', clubAttempts: attempts, patience: 4, expiresDate: addDays(state.date, 14) }) };
  const patience = deal.patience - (amount < deal.askingFee * 0.7 ? 2 : 1);
  if (patience <= 0) return broken(state, deal, 'El club ha agotado su paciencia y cierra las conversaciones.');
  const askingFee = money(deal.askingFee * 0.985);
  return { ...state, lastError: null, negotiation: record(deal, state, 'El club responde con una contraoferta.',
    { ...clauses, offeredFee: amount, askingFee, fee: askingFee, status: 'counter', clubAttempts: attempts, patience }) };
}

export function offerContract(state, action, accept = false) {
  const deal = state.negotiation;
  if (deal?.version !== 2 || deal.stage !== 'contract') return fail(state, 'Primero debes alcanzar un acuerdo con el club.');
  const terms = accept ? { ...deal.demands, releaseClause: deal.releaseClause ?? null } : { wage: Number(action.wage), signingBonus: Number(action.signingBonus), years: Number(action.years), role: action.role,
    releaseClause: action.releaseClause == null || action.releaseClause === '' ? null : Number(action.releaseClause) };
  if (!Number.isFinite(terms.wage) || terms.wage <= 0 || !Number.isFinite(terms.signingBonus) || terms.signingBonus < 0
    || !Number.isInteger(terms.years) || terms.years < 1 || terms.years > 5 || !CONTRACT_ROLES.includes(terms.role)
    || terms.releaseClause !== null && (!validMoney(terms.releaseClause) || terms.releaseClause <= 0)) return fail(state, 'Introduce salario, prima, duración de 1 a 5 años, rol y cláusula válidos.');
  const available = getRecruitmentFinances(state);
  if (deal.fee + terms.signingBonus > available.availableBudget || terms.wage > available.availableWages) return fail(state, 'El contrato supera el presupuesto libre o el margen salarial después de reservas.');
  const attempts = deal.contractAttempts + 1;
  const roleGap = CONTRACT_ROLES.indexOf(deal.demands.role) - CONTRACT_ROLES.indexOf(terms.role);
  const equivalentWage = terms.wage + terms.signingBonus / (52 * terms.years);
  const demandPackage = deal.demands.wage + deal.demands.signingBonus / (52 * deal.demands.years);
  const restrictiveClause = terms.releaseClause && terms.releaseClause > playerById(state, deal.playerId).value * 3;
  const agreed = equivalentWage >= demandPackage * (roleGap === 1 ? 1.15 : 1) * (restrictiveClause ? 1.05 : 1) && roleGap <= 1 && terms.years >= Math.max(1, deal.demands.years - 1);
  if (agreed) return { ...state, lastError: null, negotiation: record(deal, state,
    'El jugador acepta. Revisa la incorporación y confirma el acuerdo.', { ...terms, stage: 'agreed', status: 'accepted', contractAttempts: attempts, expiresDate: addDays(state.date, 14) }) };
  const patience = deal.patience - (terms.wage < deal.demands.wage * 0.55 || roleGap >= 2 ? 2 : 1);
  if (patience <= 0 || attempts >= 4) return broken(state, deal, 'El representante se retira por las condiciones ofrecidas.');
  return { ...state, lastError: null, negotiation: record(deal, state, 'El representante presenta una contraoferta de salario, prima, duración y rol.',
    { offeredContract: terms, ...deal.demands, releaseClause: null, status: 'counter', contractAttempts: attempts, patience }) };
}

export function cancelNegotiation(state) {
  const deal = state.negotiation;
  const cooldown = deal?.version === 2 ? [state.marketCooldowns?.[deal.playerId] || '', addDays(state.date, 3)].sort().at(-1) : null;
  return { ...state, lastError: null, negotiation: null, marketCooldowns: deal?.version === 2
    ? { ...state.marketCooldowns, [deal.playerId]: cooldown } : state.marketCooldowns || {} };
}

export function triggerContractClause(state, { playerId, rightId }) {
  const right = rightId ? (state.contractRights || []).find((entry) => entry.id === rightId) : null;
  if (rightId && (!right || right.kind !== 'buyback' || right.status !== 'active' || right.holderClubId !== state.clubId || right.expiresDate < state.date)) return fail(state, 'No hay un derecho de recompra propio vigente.');
  const player = playerById(state, right?.playerId || playerId);
  if (!player || right && player.clubId !== right.currentClubId) return fail(state, 'El jugador ya no pertenece al club sujeto a la recompra.');
  const fee = right ? right.fee : player.contract?.releaseClause;
  if (!fee) return fail(state, 'El jugador no tiene cláusula de rescisión registrada.');
  const opened = openNegotiation(state, { playerId: player.id });
  if (opened.lastError) return opened;
  if (player.rating > state.world.clubs.find((club) => club.id === state.clubId).rating + 17) return fail(state, 'El jugador no acepta negociar ese proyecto deportivo.');
  return { ...opened, negotiation: { ...opened.negotiation, stage: 'contract', status: 'ready', fee, askingFee: fee,
    clauseType: right ? 'buyback' : 'release', rightId: right?.id || null, interested: true,
    message: 'Precio contractual fijado. Negocia ahora las condiciones del jugador y confirma su incorporación.' } };
}

function joinTransfer(state, deal) {
  const player = playerById(state, deal.playerId);
  const without = { ...state, pendingTransfers: (state.pendingTransfers || []).filter((entry) => entry.id !== deal.id) };
  if (!player || player.retired || player.clubId !== deal.fromClubId) return news(without, 'Se cancela una incorporación pendiente: el jugador ya no está disponible; se liberan sus reservas.');
  const funds = getRecruitmentFinances(state, deal.id);
  if (deal.fee + deal.signingBonus > funds.availableBudget || deal.wage > funds.availableWages || registrationError(without, player) || !deal.clauseType && sellerNeedsPlayer(state, player))
    return news(without, `No se puede inscribir a ${player.name}; se cancela el acuerdo y se liberan las reservas.`);
  const moved = permanentTransfer(without, { ...deal, toClubId: state.clubId });
  return news({ ...moved, clubRelationships: { ...state.clubRelationships, [deal.fromClubId]: Math.min(100, (state.clubRelationships?.[deal.fromClubId] || 0) + 4) } },
  `${player.name} se incorpora por ${deal.fee.toLocaleString('es-ES')} €; prima ${deal.signingBonus.toLocaleString('es-ES')} € y salario ${deal.wage.toLocaleString('es-ES')} €/semana.`);
}

export function completeTransfer(state, { timing = 'immediate' } = {}) {
  const deal = state.negotiation;
  if (deal?.version !== 2 || deal.stage !== 'agreed') return fail(state, 'Necesitas los acuerdos del club y del jugador.');
  if (!['immediate', 'next-window', 'next-season'].includes(timing)) return fail(state, 'Selecciona cuándo se incorporará el jugador.');
  const error = eligible(state, deal.playerId), funds = getRecruitmentFinances(state);
  if (error) return fail(state, error);
  if (!deal.clauseType && sellerNeedsPlayer(state, playerById(state, deal.playerId))) return fail(state, 'El vendedor necesita conservar su plantilla mínima y dos porteros, contando las salidas ya acordadas.');
  if (deal.fee + deal.signingBonus > funds.availableBudget || deal.wage > funds.availableWages) return fail(state, 'Ya no hay presupuesto o margen salarial suficientes para reservar este acuerdo.');
  const window = getTransferWindow(state, { clubId: state.clubId, fromClubId: deal.fromClubId });
  const nextSeason = getNextSeasonTransferDate(state, { clubId: state.clubId, fromClubId: deal.fromClubId });
  let joinDate = timing === 'next-season' ? nextSeason : timing === 'next-window' || !window.open ? window.nextOpenDate : state.date;
  if (timing === 'next-season' && !getTransferWindow(state, { clubId: state.clubId, fromClubId: deal.fromClubId, date: joinDate }).open) joinDate = getTransferWindow(state, { clubId: state.clubId, fromClubId: deal.fromClubId, date: joinDate }).nextOpenDate;
  const pending = { id: `transfer:${deal.playerId}:${state.date}`, playerId: deal.playerId, fromClubId: deal.fromClubId,
    fee: deal.fee, wage: deal.wage, signingBonus: deal.signingBonus, years: deal.years, role: deal.role, agreedDate: state.date, joinDate, timing,
    installments: deal.installments || 0, upfrontPercent: deal.upfrontPercent ?? 100, sellOnPercent: deal.sellOnPercent || 0,
    buybackFee: deal.buybackFee ?? null, buybackYears: deal.buybackYears || 2, releaseClause: deal.releaseClause ?? null,
    clauseType: deal.clauseType || null, rightId: deal.rightId || null, windowRevision: window.revision };
  const next = { ...state, lastError: null, negotiation: null, pendingTransfers: [...(state.pendingTransfers || []), pending] };
  return joinDate === state.date ? joinTransfer(next, pending) : news(next, `Incorporación reservada para ${joinDate}. Precio, prima y salario quedan comprometidos sin cambiar todavía al jugador de club.`);
}

export function listForTransfer(state, { playerId, askingFee, kind = 'sale', loanTerms }) {
  const player = playerById(state, playerId), squad = ownPlayers(state);
  if (!player || player.clubId !== state.clubId || player.retired || player.emergency) return fail(state, 'Ese jugador no se puede poner a la venta.');
  if (activeLoan(state, playerId) || !['sale', 'loan'].includes(kind)) return fail(state, 'No puedes vender ni subceder a un jugador con cesión vigente.');
  if (squad.length <= 16 || (player.position === 'GK' && squad.filter((entry) => entry.position === 'GK').length <= 2)) return fail(state, 'Debes conservar al menos 16 jugadores y dos porteros.');
  const fee = askingFee === undefined ? kind === 'loan' ? Math.round(player.value * 0.05) : player.value : Number(askingFee);
  if (!Number.isFinite(fee) || fee < 0) return fail(state, 'Introduce un precio de salida válido.');
  if (kind === 'loan' && loanTerms && !validLoanTerms(loanTerms)) return fail(state, 'Las condiciones de cesión anunciadas no son válidas.');
  if ((state.transferListings || []).some((entry) => entry.playerId === playerId)) return fail(state, 'El jugador ya está anunciado.');
  return { ...state, lastError: null, transferListings: [...(state.transferListings || []), { playerId, kind, ...(kind === 'loan' && loanTerms ? { loanTerms: { ...loanTerms, fee: Math.round(fee) } } : {}), askingFee: Math.round(fee), listedDate: state.date, responseDate: addDays(state.date, 3), responded: false }] };
}

export function unlistTransfer(state, { playerId }) {
  return { ...state, lastError: null, transferListings: (state.transferListings || []).filter((entry) => entry.playerId !== playerId),
    transferOffers: (state.transferOffers || []).map((offer) => offer.playerId === playerId && ['pending', 'counter'].includes(offer.status) ? { ...offer, status: 'rejected' } : offer) };
}

export function respondTransferOffer(state, { offerId, decision, fee, loanTerms, sellOnPercent = 0, buybackFee = null, buybackYears = 2, installments = 0, upfrontPercent = 100 }) {
  const offer = (state.transferOffers || []).find((entry) => entry.id === offerId);
  if (!offer || !['pending', 'counter'].includes(offer.status) || !['accept', 'reject', 'counter'].includes(decision)) return fail(state, 'Selecciona una oferta pendiente y una respuesta válida.');
  const player = playerById(state, offer.playerId), buyer = state.world.clubs.find((club) => club.id === offer.buyerId);
  const patchOffer = (next, patch) => ({ ...next, transferOffers: next.transferOffers.map((entry) => entry.id === offer.id ? { ...entry, ...patch } : entry), lastError: null });
  if (decision === 'reject') return patchOffer(state, { status: 'rejected' });
  if (offer.kind === 'loan') {
    if (decision === 'counter') {
      const terms = loanTerms || { ...offer.loanTerms, fee: Number(fee) };
      if (!validLoanTerms(terms)) return fail(state, 'La contraoferta de cesión no es válida.');
      if (terms.fee > offer.maxFee || terms.wageShare > 90 || terms.purchaseType !== 'none' && terms.purchaseFee > player.value * 1.3 || offer.attempts >= 2)
        return patchOffer(state, { status: 'rejected', message: 'El receptor rechaza las condiciones de cesión.' });
      return patchOffer(state, { loanTerms: terms, fee: terms.fee, attempts: offer.attempts + 1, status: 'counter', message: 'El receptor acepta las condiciones de cesión.' });
    }
    const arranged = arrangeLoan(state, { playerId: player.id, ownerClubId: state.clubId, borrowerClubId: buyer.id, terms: offer.loanTerms });
    return arranged.lastError ? arranged : patchOffer({ ...arranged, transferListings: arranged.transferListings.filter((entry) => entry.playerId !== player.id) }, { status: 'accepted' });
  }
  if (decision === 'counter') {
    const amount = Number(fee);
    if (!Number.isFinite(amount) || amount < 0) return fail(state, 'Introduce una contraoferta válida.');
    const clauses = { sellOnPercent: Number(sellOnPercent), buybackFee: buybackFee == null || buybackFee === '' ? null : Number(buybackFee), buybackYears: Number(buybackYears), installments: Number(installments), upfrontPercent: Number(upfrontPercent) };
    if (!validDealClauses(clauses)) return fail(state, 'Las cláusulas de la venta no son válidas.');
    if (clauses.buybackFee && clauses.buybackFee < amount * 1.1) return patchOffer(state, { status: 'rejected', message: 'El comprador exige una recompra al menos un 10% superior al precio.' });
    if (amount > offer.maxFee || offer.attempts >= 2) return patchOffer(state, { status: 'rejected', message: 'El comprador se retira por el precio solicitado.' });
    if (amount > offer.maxFee * (1 - clauses.sellOnPercent * 0.002 - (clauses.buybackFee ? 0.025 : 0))) return patchOffer(state, { status: 'rejected', message: 'Precio y cláusulas superan la valoración del comprador.' });
    return patchOffer(state, { ...clauses, fee: Math.round(amount), attempts: offer.attempts + 1, status: 'counter', message: 'El comprador acepta ese precio. Puedes confirmar la venta.' });
  }
  if (!getTransferWindow(state, { clubId: buyer.id, fromClubId: state.clubId }).open) return fail(state, 'La venta debe inscribirse durante una ventana abierta del comprador.');
  const squad = ownPlayers(state);
  if (!player || player.retired || player.clubId !== state.clubId || squad.length <= 16 || (player.position === 'GK' && squad.filter((entry) => entry.position === 'GK').length <= 2)) return fail(state, 'La plantilla ya no permite esta venta.');
  if (activeLoan(state, player.id)) return fail(state, 'Ese jugador tiene una cesión vigente.');
  const balance = availableClubBudget(state, buyer.id);
  if (offer.fee > balance) return fail(state, 'El comprador ya no dispone de ese presupuesto.');
  const buyerSquad = state.world.players.filter((entry) => entry.clubId === buyer.id && !entry.retired);
  if (buyerSquad.length >= 80 || (getPlayerAge(player, state.date, state.year) >= 21 && buyerSquad.filter((entry) => getPlayerAge(entry, state.date, state.year) >= 21).length >= 30)) return fail(state, 'El comprador ya no tiene una plaza de inscripción disponible.');
  const moved = permanentTransfer(state, { ...offer, id: `sale:${offer.id}`, fromClubId: state.clubId, toClubId: buyer.id, joinDate: state.date, signingBonus: 0 });
  return news(patchOffer({ ...moved, transferListings: state.transferListings.filter((entry) => entry.playerId !== player.id) }, { status: 'accepted' }),
  `${player.name} ficha por ${buyer.name}. Venta confirmada por ${offer.fee.toLocaleString('es-ES')} €.`);
}

/** Called after a real calendar advance; pending deals charge exactly once on arrival. */
export function progressTransferMarket(state) {
  let next = state;
  const deal = state.negotiation;
  if (deal?.version === 2 && deal.stage !== 'broken') {
    const player = playerById(state, deal.playerId);
    if (!player || player.retired || player.clubId !== deal.fromClubId) next = broken(next, deal, 'El jugador ha dejado de estar disponible.');
    else if (state.date > deal.expiresDate) next = broken(next, deal, 'La negociación ha caducado por falta de respuesta.');
    else if (deal.stage === 'inquiry' && state.date >= deal.readyDate) next = deal.interested
      ? { ...next, negotiation: record(deal, state, 'El club permite negociar y el jugador está dispuesto a escuchar el proyecto.', { stage: 'club', status: 'ready' }) }
      : broken(next, deal, deal.refusalReason || 'La consulta ha sido rechazada.');
  }
  for (const pending of (next.pendingTransfers || []).slice().sort((a, b) => a.joinDate.localeCompare(b.joinDate))) if (pending.joinDate <= next.date) next = joinTransfer(next, pending);
  const due = (next.transferListings || []).filter((entry) => !entry.responded && entry.responseDate <= next.date);
  if (due.length) {
    const offers = [];
    for (const listing of due) {
      const player = playerById(next, listing.playerId);
      if (!player || player.clubId !== next.clubId || player.retired) continue;
      const random = createStream(next.seed, 'incoming-transfer-v1', listing.playerId, listing.listedDate);
      const byClub = new Map();
      for (const entry of next.world.players) if (!entry.retired) { const rows = byClub.get(entry.clubId) || []; rows.push(entry); byClub.set(entry.clubId, rows); }
      const buyer = next.world.clubs.filter((club) => club.id !== next.clubId && Math.abs(club.rating - player.rating) < 15
        && availableClubBudget(next, club.id) >= player.value * (listing.kind === 'loan' ? 0.03 : 0.65) && (byClub.get(club.id)?.length || 0) < 80
        && (getPlayerAge(player, next.date, next.year) < 21 || (byClub.get(club.id) || []).filter((entry) => getPlayerAge(entry, next.date, next.year) >= 21).length < 30))
        .map((club) => ({ club, score: -Math.abs(club.rating - player.rating) * 2
          + Math.max(0, ({ GK: 2, DF: 8, MF: 7, FW: 5 }[player.position]) - (byClub.get(club.id) || []).filter((entry) => entry.position === player.position).length) * 4
          + createStream(next.seed, listing.listedDate, player.id, club.id, 'buyer-fit')() * 6 }))
        .sort((a, b) => b.score - a.score || a.club.id.localeCompare(b.club.id))[0]?.club;
      if (!buyer) continue;
      const maxFee = Math.min(availableClubBudget(next, buyer.id), money(player.value * (listing.kind === 'loan' ? 0.06 + random() * 0.04 : 1 + random() * 0.25)));
      if (listing.askingFee > maxFee * 1.25) continue;
      const proposedLoan = listing.kind === 'loan' ? { ...loanQuote(next, player, buyer.id), ...listing.loanTerms, fee: Math.min(maxFee, Math.round(listing.askingFee * 0.88)) } : null;
      if (proposedLoan && (proposedLoan.wageShare > 90 || proposedLoan.purchaseType !== 'none' && proposedLoan.purchaseFee > player.value * 1.3
        || proposedLoan.purchaseType === 'obligation' && proposedLoan.fee + proposedLoan.purchaseFee > availableClubBudget(next, buyer.id))) continue;
      const window = getTransferWindow(next, { clubId: buyer.id, fromClubId: next.clubId, date: listing.responseDate, transactionType: listing.kind === 'loan' ? 'loan' : 'permanent' });
      const expiresDate = window.open ? addDays(listing.responseDate, 14) : addDays(window.nextOpenDate, 7);
      offers.push({ id: `offer:${listing.playerId}:${listing.listedDate}`, playerId: listing.playerId, buyerId: buyer.id,
        kind: listing.kind || 'sale', ...(proposedLoan ? { loanTerms: proposedLoan } : {}),
        fee: Math.min(maxFee, Math.round(listing.askingFee * 0.88)), maxFee, attempts: 0, date: listing.responseDate, expiresDate, status: 'pending', message: 'Oferta recibida: revisa las condiciones antes de aceptar.' });
    }
    next = { ...next, transferListings: next.transferListings.map((entry) => due.includes(entry) ? { ...entry, responded: true } : entry), transferOffers: [...offers, ...(next.transferOffers || [])].slice(0, 100) };
  }
  if ((next.transferOffers || []).some((offer) => ['pending', 'counter'].includes(offer.status) && offer.expiresDate < next.date))
    next = { ...next, transferOffers: next.transferOffers.map((offer) => ['pending', 'counter'].includes(offer.status) && offer.expiresDate < next.date ? { ...offer, status: 'rejected', message: 'La oferta ha caducado.' } : offer) };
  return next;
}

export function validateRecruitmentState(state) {
  const ids = new Set(state.world.players.map((player) => player.id)), clubs = new Set(state.world.clubs.map((club) => club.id));
  const validTerms = (deal) => Number.isFinite(deal.fee) && deal.fee >= 0 && Number.isFinite(deal.wage) && deal.wage > 0
    && Number.isFinite(deal.signingBonus) && deal.signingBonus >= 0 && Number.isInteger(deal.years) && deal.years >= 1 && deal.years <= 5 && CONTRACT_ROLES.includes(deal.role);
  if (!Array.isArray(state.pendingTransfers) || state.pendingTransfers.length > 80 || new Set(state.pendingTransfers.map((deal) => deal?.playerId)).size !== state.pendingTransfers.length
    || new Set(state.pendingTransfers.map((deal) => deal?.id)).size !== state.pendingTransfers.length
    || state.pendingTransfers.some((deal) => !deal || typeof deal.id !== 'string' || !ids.has(deal.playerId) || !clubs.has(deal.fromClubId) || playerById(state, deal.playerId).clubId !== deal.fromClubId
      || !validTerms(deal) || !validDate(deal.joinDate) || !validDate(deal.agreedDate) || deal.joinDate < deal.agreedDate || deal.joinDate < state.date
      || !validDealClauses(deal) || deal.windowRevision && !getTransferWindow(state, { clubId: state.clubId, fromClubId: deal.fromClubId, date: deal.joinDate }).open)) throw new Error('Las incorporaciones pendientes no son válidas.');
  const deal = state.negotiation;
  if (deal?.version === 2 && (!ids.has(deal.playerId) || !clubs.has(deal.fromClubId) || !validTerms(deal)
    || !['inquiry', 'club', 'contract', 'agreed', 'broken'].includes(deal.stage) || !['waiting', 'ready', 'counter', 'accepted', 'rejected'].includes(deal.status)
    || !validDate(deal.readyDate) || !validDate(deal.expiresDate) || !Number.isInteger(deal.patience) || deal.patience < 0 || deal.patience > 4
    || !Number.isFinite(deal.askingFee) || deal.askingFee < 0 || !deal.demands || !validTerms({ ...deal.demands, fee: 0 })
    || !Number.isInteger(deal.clubAttempts) || !Number.isInteger(deal.contractAttempts) || deal.clubAttempts < 0 || deal.contractAttempts < 0
    || !validDealClauses(deal) || !Array.isArray(deal.history) || deal.history.length > 20 || typeof deal.interested !== 'boolean'
    || !({ inquiry: ['waiting'], club: ['ready', 'counter'], contract: ['ready', 'counter'], agreed: ['accepted'], broken: ['rejected'] }[deal.stage] || []).includes(deal.status))) throw new Error('La negociación por etapas no es válida.');
  if (!state.marketCooldowns || Object.entries(state.marketCooldowns).some(([id, date]) => !ids.has(id) || !validDate(date))
    || !state.clubTransferBalances || Object.entries(state.clubTransferBalances).some(([id, value]) => !clubs.has(id) || !Number.isFinite(value) || value < 0)) throw new Error('Los compromisos del mercado no son válidos.');
  if (!Array.isArray(state.transferListings) || state.transferListings.length > 80 || state.transferListings.some((entry) => !ids.has(entry.playerId) || !validDate(entry.responseDate) || !validDate(entry.listedDate) || !Number.isFinite(entry.askingFee) || entry.askingFee < 0)
    || !Array.isArray(state.transferOffers) || state.transferOffers.length > 100 || state.transferOffers.some((entry) => !entry || !ids.has(entry.playerId) || !clubs.has(entry.buyerId) || !['pending', 'counter', 'accepted', 'rejected'].includes(entry.status) || !validDate(entry.date) || !validDate(entry.expiresDate) || entry.expiresDate < entry.date || !Number.isFinite(entry.fee) || entry.fee < 0 || !Number.isFinite(entry.maxFee) || entry.maxFee < entry.fee || !Number.isInteger(entry.attempts) || entry.attempts < 0)) throw new Error('Las ofertas de venta no son válidas.');
  if (!state.clubRelationships || Object.entries(state.clubRelationships).some(([id, value]) => !clubs.has(id) || !Number.isFinite(value) || value < -100 || value > 100)) throw new Error('Las relaciones entre clubes no son válidas.');
  if (state.transferListings.some((entry) => entry.kind && !['sale', 'loan'].includes(entry.kind) || entry.loanTerms && !validLoanTerms(entry.loanTerms))
    || state.transferOffers.some((entry) => !validDealClauses(entry) || entry.kind === 'loan' && !validLoanTerms(entry.loanTerms))) throw new Error('Las cláusulas de las ofertas guardadas no son válidas.');
  if (state.pendingTransfers.length && (getRecruitmentFinances(state).availableBudget < -1 || getRecruitmentFinances(state).availableWages < -1)) throw new Error('Las reservas de fichajes exceden el presupuesto disponible.');
}
