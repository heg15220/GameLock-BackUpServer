import { addDays } from './health.js';
import { getTransferWindow } from './transfer-windows.js';
import { activeLoan, addMonths, appendObligations, availableClubBudget, clubCommitments, clubWageBill, contractNews,
  findPlayer, permanentTransfer, registrationProblem, validContractDate, validMoney } from './contract-economy.js';
import { validLoanTerms } from './loans.js';

const ROLES = ['prospect', 'rotation', 'important', 'crucial'];
const fail = (state, text) => ({ ...state, lastError: text });
export const validPersonalTerms = (terms) => terms && validMoney(terms.wage) && terms.wage > 0 && validMoney(terms.signingBonus)
  && Number.isInteger(terms.years) && terms.years >= 1 && terms.years <= 5 && ROLES.includes(terms.role)
  && (terms.releaseClause == null || validMoney(terms.releaseClause) && terms.releaseClause > 0);
export function openContractRenewal(state, { playerId }) {
  const player = findPlayer(state, playerId);
  if (!player || player.retired || player.emergency || player.clubId !== state.clubId || activeLoan(state, playerId)) return fail(state, 'Renueva a un jugador propio que no esté cedido.');
  if (state.renewalNegotiation && state.renewalNegotiation.stage !== 'broken') return fail(state, 'Termina la renovación pendiente.');
  const demands = { wage: Math.ceil(player.wage * 1.1), signingBonus: Math.ceil(player.wage * 4), years: 3,
    role: player.contract?.role || 'rotation', releaseClause: player.contract?.releaseClause ?? null };
  return { ...state, lastError: null, renewalNegotiation: { playerId, stage: 'contract', demands, terms: demands, patience: 4,
    expiresDate: addDays(state.date, 14), message: 'El representante presenta sus condiciones de renovación.' } };
}
export function offerRenewal(state, action, accept = false) {
  const deal = state.renewalNegotiation;
  if (deal?.stage !== 'contract') return fail(state, 'Abre primero una renovación.');
  const terms = accept ? { ...deal.demands } : { wage: Number(action.wage), signingBonus: Number(action.signingBonus), years: Number(action.years), role: action.role,
    releaseClause: action.releaseClause == null || action.releaseClause === '' ? null : Number(action.releaseClause) };
  if (!validPersonalTerms(terms)) return fail(state, 'Las condiciones de renovación no son válidas.');
  const player = findPlayer(state, deal.playerId), maximum = availableClubBudget(state, state.clubId);
  if (!player || player.clubId !== state.clubId || player.retired || activeLoan(state, player.id)) return fail(state, 'El jugador ya no está disponible para renovar.');
  if (terms.signingBonus > maximum || terms.wage - player.wage > state.finances.wageBudget - clubWageBill(state) - clubCommitments(state).reservedWages) return fail(state, 'La renovación excede presupuesto o margen salarial libres.');
  const restrictiveClause = terms.releaseClause && terms.releaseClause > player.value * 3;
  const accepted = terms.wage + terms.signingBonus / (52 * terms.years) >= (deal.demands.wage + deal.demands.signingBonus / (52 * deal.demands.years)) * (restrictiveClause ? 1.05 : 1)
    && ROLES.indexOf(terms.role) >= ROLES.indexOf(deal.demands.role) && terms.years >= 2;
  const patience = accepted ? deal.patience : deal.patience - 1;
  return { ...state, lastError: null, renewalNegotiation: { ...deal, terms, patience, stage: accepted ? 'agreed' : patience ? 'contract' : 'broken',
    message: accepted ? 'Renovación acordada; confirma la firma y la prima.' : patience ? 'El representante mantiene su contraoferta.' : 'El representante se retira de la renovación.' } };
}
export function completeRenewal(state) {
  const deal = state.renewalNegotiation;
  if (deal?.stage !== 'agreed' || deal.expiresDate < state.date) return fail(state, 'No hay una renovación vigente acordada.');
  const checked = offerRenewal({ ...state, renewalNegotiation: { ...deal, stage: 'contract' } }, deal.terms);
  if (checked.lastError || checked.renewalNegotiation.stage !== 'agreed') return fail(state, checked.lastError || 'La renovación ya no es viable.');
  const player = findPlayer(state, deal.playerId), id = `renewal:${player.id}:${state.date}:${state.financialObligations?.length || 0}`;
  const contract = { ...deal.terms, startDate: state.date, endDate: addMonths(state.date, deal.terms.years * 12) };
  const next = { ...state, lastError: null, renewalNegotiation: null, world: { ...state.world,
    players: state.world.players.map((entry) => entry.id === player.id ? { ...entry, wage: deal.terms.wage, contract } : entry) } };
  return contractNews(appendObligations(next, [{ id, dealId: id, playerId: player.id, fromClubId: state.clubId, toClubId: null,
    kind: 'renewal-bonus', amount: deal.terms.signingBonus, dueDate: state.date, status: 'pending' }]), `${player.name} renueva hasta ${contract.endDate}.`);
}

/** CPU buyers execute only recorded, still-active rights; no historical clauses are invented. */
export function progressContractRights(state) {
  let next = state;
  if (next.renewalNegotiation && next.renewalNegotiation.expiresDate < state.date) next = { ...next, renewalNegotiation: { ...next.renewalNegotiation, stage: 'broken', message: 'La renovación ha caducado.' } };
  for (const right of state.contractRights || []) if (right.kind === 'buyback' && right.status === 'active') {
    if ((state.pendingTransfers || []).some((deal) => deal.rightId === right.id)) continue;
    if (right.expiresDate < state.date) { next = { ...next, contractRights: next.contractRights.map((entry) => entry.id === right.id ? { ...entry, status: 'expired' } : entry) }; continue; }
    if (right.holderClubId === state.clubId) continue;
    const player = findPlayer(next, right.playerId), buyer = next.world.clubs.find((club) => club.id === right.holderClubId);
    if (!player || player.retired || player.clubId !== right.currentClubId || activeLoan(next, player.id) || (next.pendingTransfers || []).some((deal) => deal.playerId === player.id)
      || player.value < right.fee * 1.15 || player.rating < buyer.rating - 5 || !getTransferWindow(next, { clubId: buyer.id, fromClubId: player.clubId }).open
      || availableClubBudget(next, buyer.id) < right.fee || registrationProblem(next, player, buyer.id)) continue;
    next = permanentTransfer(next, { id: `execute:${right.id}`, playerId: player.id, fromClubId: player.clubId, toClubId: buyer.id, rightId: right.id,
      joinDate: state.date, fee: right.fee, wage: Math.ceil(player.wage * 1.15), signingBonus: 0, years: 3, role: 'important' });
    next = contractNews(next, `${buyer.name} ejerce la recompra de ${player.name} por ${right.fee.toLocaleString('es-ES')} €.`);
  }
  for (const player of next.world.players.filter((entry) => entry.clubId === state.clubId && !entry.retired && entry.contract?.releaseClause)) {
    const fee = player.contract.releaseClause;
    if (fee > player.value * 0.9 || activeLoan(next, player.id)) continue;
    const buyer = next.world.clubs.filter((club) => club.id !== state.clubId && Math.abs(club.rating - player.rating) <= 12
      && getTransferWindow(next, { clubId: club.id, fromClubId: player.clubId }).open && availableClubBudget(next, club.id) >= fee && !registrationProblem(next, player, club.id))
      .sort((a, b) => Math.abs(a.rating - player.rating) - Math.abs(b.rating - player.rating) || a.id.localeCompare(b.id))[0];
    if (!buyer) continue;
    next = permanentTransfer(next, { id: `release:${player.id}:${state.date}`, playerId: player.id, fromClubId: player.clubId, toClubId: buyer.id,
      joinDate: state.date, fee, wage: Math.ceil(player.wage * 1.15), signingBonus: 0, years: 3, role: 'important', clauseType: 'release' });
    next = contractNews(next, `${buyer.name} paga la cláusula de rescisión de ${player.name}: ${fee.toLocaleString('es-ES')} €.`);
  }
  return next;
}

export function validateContractState(state) {
  const players = new Set(state.world.players.map((player) => player.id)), clubs = new Set(state.world.clubs.map((club) => club.id));
  for (const key of ['loans', 'financialObligations', 'contractRights']) if (!Array.isArray(state[key]) || state[key].length > 20000
    || state[key].some((entry) => !entry || typeof entry.id !== 'string') || new Set(state[key].map((entry) => entry.id)).size !== state[key].length) throw new Error('El registro de contratos no es válido.');
  const activeIds = new Set();
  for (const loan of state.loans) {
    if (!players.has(loan.playerId) || !clubs.has(loan.ownerClubId) || !clubs.has(loan.borrowerClubId) || loan.ownerClubId === loan.borrowerClubId || !validLoanTerms(loan)
      || !['pending', 'active', 'awaiting-purchase', 'returned', 'purchased', 'cancelled'].includes(loan.status)
      || !validContractDate(loan.startDate) || !validContractDate(loan.endDate) || loan.endDate !== addMonths(loan.startDate, loan.months)
      || !validMoney(loan.wage) || !validMoney(loan.purchaseWage) || !Number.isInteger(loan.purchaseYears) || loan.purchaseYears < 1 || loan.purchaseYears > 5 || !ROLES.includes(loan.purchaseRole)
      || loan.purchaseType === 'obligation' && !loan.purchaseDate && ['pending', 'active', 'awaiting-purchase'].includes(loan.status)
      || loan.purchaseDate && (!validContractDate(loan.purchaseDate) || loan.purchaseDate < loan.startDate || loan.purchaseType === 'none')) throw new Error('La cesión guardada no es válida.');
    if (['pending', 'active', 'awaiting-purchase'].includes(loan.status)) {
      if (activeIds.has(loan.playerId)) throw new Error('Hay cesiones simultáneas del mismo jugador.'); activeIds.add(loan.playerId);
      const player = findPlayer(state, loan.playerId);
      if (loan.status === 'pending' && loan.startDate <= state.date || loan.status === 'active' && (loan.startDate > state.date || loan.endDate < state.date)) throw new Error('La cesión no coincide con la fecha de la partida.');
      if (player.clubId !== (loan.status === 'active' ? loan.borrowerClubId : loan.ownerClubId)) throw new Error('Propiedad e inscripción de la cesión no coinciden.');
      if (loan.status === 'active' && player.loanId !== loan.id) throw new Error('La inscripción cedida no coincide con el acuerdo.');
    }
  }
  for (const item of state.financialObligations) if (!players.has(item.playerId) || !clubs.has(item.fromClubId) || item.toClubId !== null && !clubs.has(item.toClubId)
    || !validMoney(item.amount) || !validContractDate(item.dueDate) || !['pending', 'paid'].includes(item.status)
    || item.status === 'paid' && item.paidDate !== item.dueDate) throw new Error('La obligación económica no es válida.');
  for (const right of state.contractRights) if (!players.has(right.playerId) || !clubs.has(right.holderClubId) || !clubs.has(right.currentClubId)
    || !['active', 'used', 'expired'].includes(right.status) || !['sell-on', 'buyback'].includes(right.kind)
    || right.kind === 'sell-on' && (!validMoney(right.percent) || right.percent > 30)
    || right.kind === 'buyback' && (!validMoney(right.fee) || !validContractDate(right.expiresDate))) throw new Error('La cláusula guardada no es válida.');
  const renewal = state.renewalNegotiation;
  if (renewal && (!players.has(renewal.playerId) || !['contract', 'agreed', 'broken'].includes(renewal.stage) || !validPersonalTerms(renewal.demands)
    || !validPersonalTerms(renewal.terms) || !validContractDate(renewal.expiresDate) || !Number.isInteger(renewal.patience) || renewal.patience < 0 || renewal.patience > 4)) throw new Error('La renovación guardada no es válida.');
  const query = state.loanNegotiation;
  if (query && (!players.has(query.playerId) || !clubs.has(query.ownerClubId) || !clubs.has(query.borrowerClubId)
    || !['inquiry', 'club', 'agreed', 'broken'].includes(query.stage) || !validLoanTerms(query.terms) || !validLoanTerms(query.counterTerms)
    || !validContractDate(query.readyDate) || !validContractDate(query.expiresDate) || !Number.isInteger(query.patience) || query.patience < 0 || query.patience > 4)) throw new Error('La negociación de cesión no es válida.');
  for (const player of state.world.players) if (player.contract?.releaseClause != null && (!validMoney(player.contract.releaseClause) || player.contract.releaseClause <= 0)) throw new Error('La cláusula de rescisión no es válida.');
  const debtors = new Set([...state.financialObligations.filter((entry) => entry.status === 'pending').map((entry) => entry.fromClubId),
    ...state.loans.filter((loan) => ['pending', 'active', 'awaiting-purchase'].includes(loan.status)).map((loan) => loan.borrowerClubId)]);
  if ([...debtors].some((clubId) => availableClubBudget(state, clubId) < -1)) throw new Error('Los compromisos contractuales exceden el presupuesto reservado.');
  const commitments = clubCommitments(state);
  if (commitments.reservedWages > 0 && commitments.reservedWages + clubWageBill(state) > state.finances.wageBudget + 1) throw new Error('Los compromisos contractuales exceden el margen salarial.');
}
