import { describe, expect, it, vi } from 'vitest';
vi.mock('./data.js', () => ({ getManagerWorld: () => { throw new Error('Use fixture'); } }));
import { createManagerCareer, getContractOverview, getRecruitmentFinances, managerReducer, serializeManagerCareer, restoreManagerCareer } from './engine.js';
import { addDays, daysBetween, getPlayerHealth } from './health.js';
import { addMonths, clubWageBill, permanentTransfer, settleObligations } from './contract-economy.js';
import { getTransferWindow, getNextSeasonTransferDate } from './transfer-windows.js';
import { progressContractRights } from './contracts.js';

const reduce = (state, type, payload = {}) => managerReducer(state, { type, ...payload });
const save = (state) => restoreManagerCareer(serializeManagerCareer(state));
function career(date = '2024-01-08', foreignDestination = null) {
  const clubs = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, name: `Club ${i}`, shortName: `C${i}`, country: 'ESP', competitionId: 'la-liga', rating: 75, budget: 8000000 }));
  if (foreignDestination) clubs[3] = { ...clubs[3], country: foreignDestination, competitionId: `external:${foreignDestination}`, selectable: false };
  const players = clubs.flatMap((club) => Array.from({ length: 24 }, (_, i) => ({ id: `${club.id}-p${i}`, name: `Player ${club.id}-${i}`, clubId: club.id,
    birthYear: 2000, position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW', rating: 74, potential: 85,
    nationality: 'ESP', value: 200000, wage: 1000, real: false })));
  return createManagerCareer({ year: 2024, clubId: 'c0', seed: 'contracts', world: { year: 2024, clubs, players, countries: [],
    competitions: [{ id: 'la-liga', country_fifa_code: 'ESP', name: 'Liga', tier: 1, confederation: 'UEFA' },
      ...(foreignDestination ? [{ id: `external:${foreignDestination}`, country_fifa_code: foreignDestination, simulated: false, selectable: false }] : [])], coverage: { snapshotDate: date } } });
}
function reach(state, target) {
  let next = state;
  for (let guard = 0; guard < 100 && next.date < target; guard += 1) {
    const advanced = reduce(next, 'ADVANCE_CALENDAR', { days: Math.min(31, daysBetween(next.date, target)) });
    next = advanced.date === next.date ? reduce(next, 'PLAY_MATCH', { mode: 'quick' }) : advanced;
  }
  expect(next.date).toBe(target); return next;
}
function loanAgreement(state, playerId = 'c1-p17', terms = {}, borrowerClubId) {
  let next = reduce(state, 'OPEN_LOAN_NEGOTIATION', { playerId, borrowerClubId });
  expect(next.lastError).toBeNull();
  next = reduce(next, 'ADVANCE_CALENDAR', { days: 2 });
  expect(next.loanNegotiation.stage).toBe('club');
  const offer = { ...next.loanNegotiation.counterTerms, ...terms };
  next = reduce(next, 'OFFER_LOAN_TERMS', offer);
  expect(next.loanNegotiation.stage).toBe('agreed');
  return next;
}
function purchase(state, clauses = {}) {
  let next = reduce(state, 'OPEN_NEGOTIATION', { playerId: 'c1-p17' });
  next = reduce(next, 'ADVANCE_CALENDAR', { days: 2 });
  next = reduce(next, 'OFFER_CLUB', { fee: next.negotiation.askingFee, ...clauses });
  expect(next.negotiation.stage).toBe('contract');
  next = reduce(next, 'ACCEPT_CONTRACT_COUNTER');
  return reduce(next, 'COMPLETE_TRANSFER');
}

describe('executable loans, clauses and financial commitments', () => {
  it('registers an EFL August 2018 loan immediately but defers its permanent purchase', () => {
    const original = career('2018-08-10');
    const state = createManagerCareer({ year: 2018, clubId: 'c0', seed: 'efl-loan-window', world: {
      ...original.world, year: 2018,
      clubs: original.world.clubs.map((club, i) => i !== 1 ? { ...club, country: 'ENG', competitionId: 'championship' } : club),
      competitions: [...original.world.competitions, { id: 'championship', country_fifa_code: 'ENG', name: 'Championship', tier: 2, confederation: 'UEFA' }],
    } });
    expect(getTransferWindow(state).open).toBe(false);
    expect(getTransferWindow(state, { transactionType: 'loan' })).toMatchObject({ open: true, end: '2018-08-31' });
    const loaned = reduce(loanAgreement(state, 'c1-p17', { purchaseType: 'option', purchaseFee: 240000 }), 'COMPLETE_LOAN');
    expect(loaned.lastError).toBeNull();
    expect(loaned.loans[0]).toMatchObject({ status: 'active', startDate: '2018-08-12' });
    const exercised = reduce(loaned, 'EXERCISE_LOAN_OPTION', { loanId: loaned.loans[0].id });
    expect(exercised.lastError).toBeNull();
    expect(exercised.loans[0]).toMatchObject({ status: 'active', purchaseDate: '2019-01-01' });
    expect(save(exercised).loans).toEqual(exercised.loans);
  });
  it.each(['2018-05-18', '2020-10-10'])('honours domestic English registration for CPU buybacks and release clauses on %s', (date) => {
    const original = career(date);
    const clubs = original.world.clubs.map((club, i) => ({ ...club, country: 'ENG', competitionId: i === 1 ? 'premier-league' : 'championship' }));
    const state = createManagerCareer({ year: Number(date.slice(0, 4)), clubId: 'c0', seed: 'cpu-domestic-window', world: {
      ...original.world, year: Number(date.slice(0, 4)), clubs, competitions: [
        { id: 'premier-league', country_fifa_code: 'ENG', name: 'Premier League', tier: 1, confederation: 'UEFA' },
        { id: 'championship', country_fifa_code: 'ENG', name: 'Championship', tier: 2, confederation: 'UEFA' },
      ],
    } });
    expect(getTransferWindow(state, { clubId: 'c1' }).open).toBe(false);
    expect(getTransferWindow(state, { clubId: 'c1', fromClubId: 'c0' }).open).toBe(true);
    const withRight = permanentTransfer(state, { id: 'cpu-retained-buyback', playerId: 'c1-p17', fromClubId: 'c1', toClubId: 'c0', fee: 100000,
      joinDate: date, signingBonus: 0, buybackFee: 120000, buybackYears: 2 });
    const boughtBack = progressContractRights(withRight);
    expect(boughtBack.world.players.find(player => player.id === 'c1-p17').clubId).toBe('c1');
    expect(boughtBack.contractRights[0].status).toBe('used');
    expect(progressContractRights(boughtBack).financialObligations).toEqual(boughtBack.financialObligations);
    let renewed = reduce(state, 'OPEN_CONTRACT_RENEWAL', { playerId: 'c0-p17' });
    renewed = reduce(renewed, 'OFFER_RENEWAL', { ...renewed.renewalNegotiation.demands, releaseClause: 100000 });
    renewed = reduce(renewed, 'COMPLETE_RENEWAL');
    const released = progressContractRights(renewed);
    expect(released.world.players.find(player => player.id === 'c0-p17').clubId).toBe('c1');
    expect(released.transfers.at(-1)).toMatchObject({ clauseType: 'release', fee: 100000, toClubId: 'c1', date });
  });

  it('uses the borrowing and purchasing association even while the owner window is closed', () => {
    const initial = career('2024-02-05', 'BRA');
    expect(getTransferWindow(initial).open).toBe(false);
    expect(getTransferWindow(initial, { clubId: 'c3', fromClubId: 'c0' }).open).toBe(true);
    const loaned = reduce(loanAgreement(initial, 'c0-p17', {}, 'c3'), 'COMPLETE_LOAN');
    expect(loaned.loans[0]).toMatchObject({ status: 'active', borrowerClubId: 'c3', startDate: loaned.date });
    expect(save(loaned).loans).toEqual(loaned.loans);
    let listed = reduce({ ...initial, clubTransferBalances: { c1: 0, c2: 0 } }, 'LIST_FOR_TRANSFER', { playerId: 'c0-p18' });
    listed = reduce(listed, 'ADVANCE_CALENDAR', { days: 3 });
    expect(listed.transferOffers[0].buyerId).toBe('c3');
    const sold = reduce(listed, 'RESPOND_TRANSFER_OFFER', { offerId: listed.transferOffers[0].id, decision: 'accept' });
    expect(sold.lastError).toBeNull(); expect(sold.world.players.find((p) => p.id === 'c0-p18').clubId).toBe('c3');
  });

  it('uses the annual destination season for a deferred loan instead of forcing August', () => {
    const agreed = loanAgreement(career('2024-02-05', 'BRA'), 'c0-p17', {}, 'c3');
    const deferred = reduce(agreed, 'COMPLETE_LOAN', { timing: 'next-season' });
    expect(deferred.lastError).toBeNull();
    expect(deferred.loans[0].startDate).toBe(getNextSeasonTransferDate(agreed, { clubId: 'c3', fromClubId: 'c0' }));
    expect(deferred.loans[0].startDate).toMatch(/^2025-01-/);
    expect(deferred.loans[0].status).toBe('pending');
    expect(save(deferred).loans).toEqual(deferred.loans);
  });

  it('reserves a closed-window loan and starts its duration and wage split only on actual registration', () => {
    const initial = career('2024-03-04');
    const queued = reduce(loanAgreement(initial, 'c1-p17', { purchaseType: 'obligation', purchaseFee: 240000 }), 'COMPLETE_LOAN');
    const loan = queued.loans[0];
    expect(loan.status).toBe('pending'); expect(clubWageBill(queued)).toBe(clubWageBill(initial));
    expect(getRecruitmentFinances(queued).reservedFees).toBe(loan.fee + 240000);
    expect(queued.finances.spent).toBe(0);
    expect(reduce(queued, 'OPEN_NEGOTIATION', { playerId: loan.playerId }).lastError).toMatch(/cesión/);
    const started = reach(save(queued), loan.startDate);
    expect(started.loans[0].status).toBe('active');
    expect(started.finances.spent).toBe(loan.fee); expect(loan.endDate).toBe(addMonths(loan.startDate, 6));
  });

  it('respects an old promised registration date without retroactively applying the new calendar', () => {
    const queued = purchase(career('2024-12-05'));
    expect(queued.pendingTransfers).toHaveLength(1);
    const old = JSON.parse(serializeManagerCareer(queued));
    old.pendingTransfers[0].joinDate = '2025-01-01'; delete old.pendingTransfers[0].windowRevision;
    delete old.transferWindowCalendar;
    for (const field of ['loans', 'contractRights', 'financialObligations', 'loanNegotiation', 'renewalNegotiation']) delete old[field];
    const restored = restoreManagerCareer(old);
    expect(restored.pendingTransfers[0].joinDate).toBe('2025-01-01');
    expect(getTransferWindow(restored, { date: '2025-01-01' }).open).toBe(false);
    const arrived = reach(restored, '2025-01-01');
    expect(arrived.pendingTransfers).toEqual([]);
    expect(arrived.transfers[0].date).toBe('2025-01-01');
  });

  it('returns an option loan at expiry when purchase registration must wait for the next window', () => {
    let state = reduce(loanAgreement(career(), 'c1-p17', { purchaseType: 'option', purchaseFee: 240000 }), 'COMPLETE_LOAN');
    const loan = state.loans[0];
    // Preserve the negotiated loan dates but test a future closed registration
    // interval in the career-owned calendar; this is a simulation fixture.
    const calendar = JSON.parse(JSON.stringify(state.transferWindowCalendar));
    calendar.records = calendar.records.filter((record) => record.country !== 'ESP' || record.year !== 2024);
    calendar.records.push({ country: 'ESP', year: 2024, season: '2024/25', windows: [
      { slot: 'primary', start: '2024-08-01', end: '2024-08-31', precision: 'estimated', sourceIds: calendar.profiles.ESP.sourceIds },
    ] });
    state = reach({ ...state, transferWindowCalendar: calendar }, '2024-06-01');
    state = reduce(state, 'EXERCISE_LOAN_OPTION', { loanId: loan.id });
    expect(state.loans[0].purchaseDate).toBe('2024-08-01');
    const returned = reach(save(state), loan.endDate);
    expect(returned.loans[0].status).toBe('awaiting-purchase');
    expect(returned.world.players.find((p) => p.id === loan.playerId)).toMatchObject({ clubId: 'c1', loanId: null });
    expect(clubWageBill(returned)).toBe(24000);
    const arrived = reach(save(returned), '2024-08-01');
    expect(arrived.loans[0].status).toBe('purchased');
    expect(arrived.finances.spent).toBe(loan.fee + loan.purchaseFee);
  });

  it('keeps ownership separate, splits wages, preserves health and returns an incoming loan exactly once', () => {
    const initial = career();
    let state = reduce(loanAgreement(initial), 'COMPLETE_LOAN');
    const loan = state.loans[0], cost = loan.fee;
    expect(loan.status).toBe('active');
    expect(state.world.players.find((p) => p.id === loan.playerId)).toMatchObject({ clubId: 'c0', ownerClubId: 'c1', loanId: loan.id, wage: 1000 });
    expect(clubWageBill(state)).toBe(clubWageBill(initial) + 700);
    expect(clubWageBill(state, 'c1')).toBe(clubWageBill(initial, 'c1') - 700);
    expect(getContractOverview(state).loans[0].wageContribution).toBe(700);
    expect(save(state)).toEqual(state);
    expect(reduce(state, 'SELL_PLAYER', { playerId: loan.playerId }).lastError).toMatch(/cesión/);
    state = reach(state, addDays(loan.endDate, -1));
    state = { ...state, playerHealth: { ...state.playerHealth, [loan.playerId]: { condition: 60, sharpness: 60, minutesLast7Days: 0,
      lastUpdatedDate: state.date, injury: { name: 'Lesión', daysRemaining: 30, returnDate: addDays(state.date, 30) } } } };
    const returned = reduce(save(state), 'ADVANCE_CALENDAR', { days: 1 });
    const player = returned.world.players.find((p) => p.id === loan.playerId);
    expect(returned.loans[0].status).toBe('returned'); expect(player).toMatchObject({ clubId: 'c1', ownerClubId: 'c1', loanId: null, contract: null });
    expect(getPlayerHealth(returned, player).injury.daysRemaining).toBe(29);
    expect(getPlayerHealth(returned, player).condition).toBe(65.5);
    expect(player.id).toBe(loan.playerId);
    expect(returned.finances.spent).toBe(cost);
    expect(reduce(save(returned), 'ADVANCE_CALENDAR', { days: 1 }).financialObligations.filter((entry) => entry.kind === 'loan-fee')).toHaveLength(1);
  });

  it('reserves mandatory purchase, then executes it once and releases the loan wage split', () => {
    const initial = career();
    const started = reduce(loanAgreement(initial, 'c1-p17', { purchaseType: 'obligation', purchaseFee: 240000 }), 'COMPLETE_LOAN');
    const loan = started.loans[0];
    expect(getRecruitmentFinances(started).loanReserve).toBe(240000);
    expect(getRecruitmentFinances(started).reservedWages).toBe(400);
    const arrived = reach(save(started), loan.purchaseDate);
    expect(arrived.loans[0].status).toBe('purchased');
    expect(arrived.world.players.find((p) => p.id === loan.playerId)).toMatchObject({ clubId: 'c0', ownerClubId: 'c0', loanId: null, wage: 1100, contract: { years: 3 } });
    expect(arrived.finances.spent).toBe(loan.fee + loan.purchaseFee);
    expect(getRecruitmentFinances(arrived).loanReserve).toBe(0);
    expect(save(arrived).transfers.filter((entry) => entry.loanId === loan.id)).toHaveLength(1);
  });

  it('makes options voluntary, executable and protected against repeat purchases or subloans', () => {
    const started = reduce(loanAgreement(career(), 'c1-p17', { purchaseType: 'option', purchaseFee: 240000 }), 'COMPLETE_LOAN');
    expect(getRecruitmentFinances(started).loanReserve).toBe(0);
    expect(reduce(started, 'OPEN_LOAN_NEGOTIATION', { playerId: 'c1-p17', borrowerClubId: 'c2' }).lastError).toMatch(/subceder/);
    const bought = reduce(save(started), 'EXERCISE_LOAN_OPTION', { loanId: started.loans[0].id });
    expect(bought.loans[0].status).toBe('purchased');
    expect(bought.finances.spent).toBe(started.loans[0].fee + 240000);
    expect(reduce(bought, 'EXERCISE_LOAN_OPTION', { loanId: started.loans[0].id }).finances).toEqual(bought.finances);
    const returned = reach(started, started.loans[0].endDate);
    expect(returned.loans[0].status).toBe('returned');
  });

  it('lists an outgoing loan, negotiates it and retains the owner share of wages until return', () => {
    let state = reduce(career(), 'LIST_FOR_TRANSFER', { playerId: 'c0-p17', kind: 'loan', askingFee: 10000 });
    state = reduce(state, 'ADVANCE_CALENDAR', { days: 3 });
    const offer = state.transferOffers[0]; expect(offer.kind).toBe('loan');
    state = reduce(state, 'RESPOND_TRANSFER_OFFER', { offerId: offer.id, decision: 'accept' });
    expect(state.lastError).toBeNull(); expect(state.loans[0].ownerClubId).toBe('c0');
    expect(clubWageBill(state)).toBe(24000 - 700);
    const restored = save(state), returned = reach(restored, state.loans[0].endDate);
    expect(returned.world.players.find((p) => p.id === 'c0-p17').clubId).toBe('c0');
    expect(returned.loans[0].status).toBe('returned');
  });

  it('reserves deferred installments, books each due date once and preserves them after a later sale', () => {
    const initial = career(), signed = purchase(initial, { installments: 2, upfrontPercent: 50 });
    expect(signed.lastError).toBeNull();
    const transfer = signed.transfers[0], first = Math.round(transfer.fee * 0.5);
    expect(signed.finances.spent).toBe(first + transfer.signingBonus);
    expect(getRecruitmentFinances(signed).installmentReserve).toBe(transfer.fee - first);
    expect(getRecruitmentFinances(signed).availableBudget).toBe(initial.finances.budget - transfer.fee - transfer.signingBonus);
    const sold = permanentTransfer(signed, { id: 'later-sale', playerId: transfer.playerId, fromClubId: 'c0', toClubId: 'c2', fee: 210000, signingBonus: 0, joinDate: signed.date });
    expect(getRecruitmentFinances(sold).installmentReserve).toBe(transfer.fee - first);
    const dueDate = addMonths(signed.date, 6), paid = reach(save(sold), dueDate);
    const payment = paid.financialObligations.find((entry) => entry.dealId === transfer.id && entry.dueDate === dueDate);
    expect(payment).toMatchObject({ status: 'paid', paidDate: dueDate });
    expect(settleObligations(paid)).toEqual(paid);
    expect(save(paid).financialObligations).toEqual(paid.financialObligations);
  });

  it('pays sell-on rights on the next gross sale and exposes a buyback that really reacquires the player', () => {
    let state = career();
    state = permanentTransfer(state, { id: 'sell-with-rights', playerId: 'c0-p17', fromClubId: 'c0', toClubId: 'c1', fee: 200000,
      signingBonus: 0, joinDate: state.date, sellOnPercent: 20, buybackFee: 230000, buybackYears: 2 });
    const right = state.contractRights.find((entry) => entry.kind === 'buyback');
    let buyback = reduce(save(state), 'TRIGGER_BUYBACK', { rightId: right.id });
    expect(buyback.negotiation).toMatchObject({ stage: 'contract', clauseType: 'buyback', fee: 230000 });
    buyback = reduce(reduce(buyback, 'ACCEPT_CONTRACT_COUNTER'), 'COMPLETE_TRANSFER');
    expect(buyback.world.players.find((p) => p.id === 'c0-p17').clubId).toBe('c0');
    expect(buyback.contractRights.find((entry) => entry.id === right.id).status).toBe('used');
    expect(buyback.financialObligations.some((entry) => entry.fromClubId === entry.toClubId)).toBe(false);
    expect(buyback.finances.income).toBe(state.finances.income);
    const soldAgain = permanentTransfer(state, { id: 'onward-sale', playerId: 'c0-p17', fromClubId: 'c1', toClubId: 'c2', fee: 300000, signingBonus: 0, joinDate: state.date });
    expect(soldAgain.finances.income - state.finances.income).toBe(60000);
    expect(soldAgain.contractRights.every((entry) => entry.status !== 'active')).toBe(true);
    expect(save(soldAgain).financialObligations.some((entry) => entry.kind === 'sell-on' && entry.amount === 60000 && entry.status === 'paid')).toBe(true);
  });

  it('renews a real contract, executes its release clause with player consent and rejects a forged loan save', () => {
    let state = reduce(career(), 'OPEN_CONTRACT_RENEWAL', { playerId: 'c0-p17' });
    state = reduce(state, 'OFFER_RENEWAL', { ...state.renewalNegotiation.demands, releaseClause: 100000 });
    state = reduce(state, 'COMPLETE_RENEWAL');
    expect(state.world.players.find((p) => p.id === 'c0-p17').contract).toMatchObject({ releaseClause: 100000, years: 3 });
    expect(state.finances.spent).toBe(4000);
    const signed = save(state), triggeredByCpu = reduce(signed, 'ADVANCE_CALENDAR', { days: 1 });
    expect(triggeredByCpu.world.players.find((p) => p.id === 'c0-p17').clubId).not.toBe('c0');
    expect(triggeredByCpu.transfers.some((entry) => entry.clauseType === 'release' && entry.fee === 100000)).toBe(true);
    const loan = reduce(loanAgreement(career()), 'COMPLETE_LOAN');
    const corrupt = JSON.parse(serializeManagerCareer(loan)); corrupt.loans.push({ ...corrupt.loans[0], id: 'duplicate' });
    expect(() => restoreManagerCareer(corrupt)).toThrow(/simultáneas|inscripción/);
    const calendar = JSON.parse(serializeManagerCareer(career())); calendar.transferWindowCalendar = {};
    expect(() => restoreManagerCareer(calendar)).toThrow(/calendario/);
  });
});
