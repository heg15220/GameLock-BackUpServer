import { getPlayerHealth } from './health.js';
import { getPlayerAge } from './player-age.js';

export const LIVE_LOAN_STATUSES = ['pending', 'active', 'awaiting-purchase'];
export const validMoney = (value) => Number.isFinite(value) && value >= 0;
export const validContractDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value))
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
export function addMonths(date, months) {
  const d = new Date(`${date}T12:00:00Z`), day = d.getUTCDate();
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last)); return d.toISOString().slice(0, 10);
}
export const findPlayer = (state, id) => state.world.players.find((player) => player.id === id);
export const activeLoan = (state, id) => (state.loans || []).find((loan) => loan.playerId === id && LIVE_LOAN_STATUSES.includes(loan.status));
export const clubBudget = (state, id) => id === state.clubId ? state.finances.budget
  : state.clubTransferBalances?.[id] ?? state.world.clubs.find((club) => club.id === id)?.budget ?? 0;

export function clubCommitments(state, clubId = state.clubId, excludingId = null) {
  const obligations = (state.financialObligations || []).filter((item) => item.status === 'pending' && item.fromClubId === clubId && item.dealId !== excludingId);
  const installmentReserve = obligations.reduce((sum, item) => sum + item.amount, 0);
  const pending = clubId === state.clubId ? (state.pendingTransfers || []).filter((item) => item.id !== excludingId) : [];
  const transferReserve = pending.reduce((sum, item) => sum + item.fee + item.signingBonus, 0);
  const loans = (state.loans || []).filter((loan) => loan.id !== excludingId && loan.borrowerClubId === clubId && LIVE_LOAN_STATUSES.includes(loan.status));
  const loanReserve = loans.reduce((sum, loan) => sum + (loan.status === 'pending' ? loan.fee : 0)
    + (loan.purchaseType === 'obligation' || loan.purchaseDate ? loan.purchaseFee : 0), 0);
  const returnWages = (state.loans || []).filter((loan) => loan.id !== excludingId && loan.ownerClubId === clubId && loan.status === 'active'
    && loan.purchaseType !== 'obligation' && !loan.purchaseDate).reduce((sum, loan) => sum + loan.wage * loan.wageShare / 100, 0);
  const reservedWages = returnWages + pending.reduce((sum, item) => sum + item.wage, 0) + loans.reduce((sum, loan) => {
    const permanent = loan.purchaseType === 'obligation' || loan.purchaseDate;
    if (loan.status === 'pending') return sum + (permanent ? loan.purchaseWage : loan.wage * loan.wageShare / 100);
    if (loan.status === 'awaiting-purchase') return sum + loan.purchaseWage;
    return sum + (permanent ? Math.max(0, loan.purchaseWage - loan.wage * loan.wageShare / 100) : 0);
  }, 0);
  return { installmentReserve, loanReserve, transferReserve, reservedFees: installmentReserve + loanReserve + transferReserve, reservedWages, obligations };
}
export const availableClubBudget = (state, clubId, excludingId = null) => clubBudget(state, clubId) - clubCommitments(state, clubId, excludingId).reservedFees;
export function clubWageBill(state, clubId = state.clubId) {
  let total = state.world.players.filter((player) => player.clubId === clubId && !player.retired).reduce((sum, player) => sum + player.wage, 0);
  for (const loan of state.loans || []) if (loan.status === 'active') {
    if (loan.borrowerClubId === clubId) total -= loan.wage * (1 - loan.wageShare / 100);
    if (loan.ownerClubId === clubId) total += loan.wage * (1 - loan.wageShare / 100);
  }
  return Math.round(total);
}
export function registrationProblem(state, player, clubId, excludingId = null) {
  const ids = new Set(state.world.players.filter((entry) => entry.clubId === clubId && !entry.retired && entry.id !== player.id).map((entry) => entry.id));
  if (clubId === state.clubId) for (const deal of state.pendingTransfers || []) if (deal.id !== excludingId && deal.playerId !== player.id) ids.add(deal.playerId);
  for (const loan of state.loans || []) if (loan.id !== excludingId && loan.playerId !== player.id && LIVE_LOAN_STATUSES.includes(loan.status)
    && (loan.ownerClubId === clubId || (loan.borrowerClubId === clubId && ['pending', 'awaiting-purchase'].includes(loan.status)))) ids.add(loan.playerId);
  const squad = state.world.players.filter((entry) => ids.has(entry.id) && !entry.retired);
  if (squad.length >= 80) return 'La plantilla, las llegadas y los retornos reservados alcanzan 80 jugadores.';
  if (getPlayerAge(player, state.date, state.year) >= 21 && squad.filter((entry) => getPlayerAge(entry, state.date, state.year) >= 21).length >= 30) return 'Se alcanza el límite de 30 jugadores sénior: se cuentan también las llegadas y retornos reservados.';
  return null;
}

export function moveContractPlayer(state, player, clubId, updates = {}, date = state.date) {
  const healthDate = [date, state.playerHealth?.[player.id]?.lastUpdatedDate || '', state.seasonStartDate || ''].sort().at(-1);
  const players = state.world.players.map((entry) => entry.id === player.id ? { ...entry, clubId, ...updates } : entry);
  const world = { ...state.world, players, clubs: state.world.clubs.map((club) => [player.clubId, clubId].includes(club.id)
    ? { ...club, playerIds: players.filter((entry) => entry.clubId === club.id && !entry.retired).map((entry) => entry.id) } : club) };
  const leavingOwn = player.clubId === state.clubId && clubId !== state.clubId;
  return { ...state, world, ...(leavingOwn ? { lineup: state.lineup.filter((id) => id !== player.id), autoLineup: true } : {}),
    playerHealth: { ...state.playerHealth, [player.id]: getPlayerHealth({ ...state, date: healthDate }, player) } };
}
export function contractNews(state, text) {
  return { ...state, news: [{ id: `contract:${state.date}:${text}`, type: 'transfer', text }, ...state.news].slice(0, 30) };
}
function book(state, clubId, amount) {
  if (!clubId || !amount) return state;
  if (clubId === state.clubId) return { ...state, finances: { ...state.finances, budget: state.finances.budget + amount,
    income: state.finances.income + Math.max(0, amount), spent: state.finances.spent + Math.max(0, -amount) } };
  return { ...state, clubTransferBalances: { ...state.clubTransferBalances, [clubId]: clubBudget(state, clubId) + amount } };
}
export function settleObligations(state) {
  let next = state;
  for (const obligation of (state.financialObligations || []).filter((entry) => entry.status === 'pending' && entry.dueDate <= state.date)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id))) {
    // All commitments were reserved in full when signed; no speculative borrowing.
    next = book(book(next, obligation.fromClubId, -obligation.amount), obligation.toClubId, obligation.amount);
    next = { ...next, financialObligations: next.financialObligations.map((entry) => entry.id === obligation.id ? { ...entry, status: 'paid', paidDate: obligation.dueDate } : entry) };
  }
  return next;
}
export function appendObligations(state, entries) {
  const existing = new Set((state.financialObligations || []).map((entry) => entry.id));
  return settleObligations({ ...state, financialObligations: [...(state.financialObligations || []), ...entries.filter((entry) => !existing.has(entry.id))] });
}

export function permanentTransfer(state, deal) {
  const player = findPlayer(state, deal.playerId), date = deal.joinDate || state.date, id = deal.id;
  if ((state.transfers || []).some((transfer) => transfer.id === id)) return state;
  const seller = deal.fromClubId, buyer = deal.toClubId;
  const clauses = (state.contractRights || []).filter((right) => right.playerId === player.id && right.currentClubId === seller && right.status === 'active');
  const royalty = clauses.find((right) => right.kind === 'sell-on');
  const royaltyAmount = royalty ? Math.round(deal.fee * royalty.percent / 100) : 0;
  const installmentCount = deal.installments || 0;
  const upfront = installmentCount ? Math.round(deal.fee * (deal.upfrontPercent ?? 100) / 100) : deal.fee;
  const payments = [{ amount: upfront, dueDate: date }];
  let allocated = upfront;
  for (let i = 1; i <= installmentCount; i += 1) {
    const amount = i === installmentCount ? deal.fee - allocated : Math.floor((deal.fee - upfront) / installmentCount);
    allocated += amount; payments.push({ amount, dueDate: addMonths(date, i * 6) });
  }
  const obligations = []; let royaltiesAllocated = 0;
  payments.forEach((payment, i) => {
    const share = royalty ? i === payments.length - 1 ? royaltyAmount - royaltiesAllocated : Math.floor(payment.amount * royalty.percent / 100) : 0;
    royaltiesAllocated += share;
    const common = { dealId: id, playerId: player.id, fromClubId: buyer, dueDate: payment.dueDate, status: 'pending' };
    if (payment.amount - share) obligations.push({ ...common, id: `${id}:fee:${i}`, amount: payment.amount - share, toClubId: seller, kind: 'transfer-installment' });
    // When the buyer also owns the sell-on right (e.g. a buyback), its share
    // offsets the price rather than inventing a payment to itself.
    if (share && royalty.holderClubId !== buyer) obligations.push({ ...common, id: `${id}:sell-on:${i}`, amount: share, toClubId: royalty.holderClubId, kind: 'sell-on' });
  });
  if (deal.signingBonus) obligations.push({ id: `${id}:bonus`, dealId: id, playerId: player.id, fromClubId: buyer, toClubId: null,
    amount: deal.signingBonus, dueDate: date, status: 'pending', kind: 'signing-bonus' });
  let rights = (state.contractRights || []).map((right) => clauses.includes(right) ? { ...right, status: right.kind === 'sell-on' || right.id === deal.rightId ? 'used' : 'expired', resolvedDate: date } : right);
  if (deal.sellOnPercent) rights.push({ id: `${id}:sell-on`, kind: 'sell-on', playerId: player.id, holderClubId: seller, currentClubId: buyer, percent: deal.sellOnPercent, status: 'active' });
  if (deal.buybackFee) rights.push({ id: `${id}:buyback`, kind: 'buyback', playerId: player.id, holderClubId: seller, currentClubId: buyer, fee: deal.buybackFee, expiresDate: addMonths(date, (deal.buybackYears || 2) * 12), status: 'active' });
  const contract = deal.years ? { startDate: date, endDate: addMonths(date, deal.years * 12), years: deal.years, role: deal.role,
    signingBonus: deal.signingBonus || 0, releaseClause: deal.releaseClause ?? null } : { ...player.contract, releaseClause: null };
  let next = moveContractPlayer(state, player, buyer, { wage: deal.wage ?? player.wage, contract, ownerClubId: buyer, loanId: null }, date);
  next = { ...next, contractRights: rights, transfers: [...state.transfers, { ...deal, date, year: state.year, status: 'completed' }] };
  return appendObligations(next, obligations);
}

export function getContractOverview(state) {
  const loans = (state.loans || []).filter((loan) => loan.ownerClubId === state.clubId || loan.borrowerClubId === state.clubId)
    .map((loan) => ({ ...loan, wageContribution: Math.round(loan.wage * (loan.borrowerClubId === state.clubId ? loan.wageShare : 100 - loan.wageShare) / 100) }));
  const owned = new Set(loans.filter((loan) => LIVE_LOAN_STATUSES.includes(loan.status) && loan.ownerClubId === state.clubId).map((loan) => loan.playerId));
  const finances = clubCommitments(state);
  return { loans, contracts: state.world.players.filter((player) => !player.retired && (owned.has(player.id)
    || player.clubId === state.clubId && (!activeLoan(state, player.id) || activeLoan(state, player.id).ownerClubId === state.clubId))),
    rights: (state.contractRights || []).filter((right) => right.holderClubId === state.clubId || right.currentClubId === state.clubId),
    obligations: (state.financialObligations || []).filter((entry) => entry.fromClubId === state.clubId || entry.toClubId === state.clubId),
    finances: { ...finances, availableBudget: clubBudget(state, state.clubId) - finances.reservedFees, wageBill: clubWageBill(state) } };
}
