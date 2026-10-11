import { describe, expect, it, vi } from 'vitest';
vi.mock('./data.js', () => ({ getManagerWorld: () => { throw new Error('Use the supplied fixture'); } }));
import { createManagerCareer, getManagerSummary, getNextFixture, getRecruitmentFinances, getTransferWindow, managerReducer, serializeManagerCareer, restoreManagerCareer } from './engine.js';
import { addDays, daysBetween, getPlayerHealth } from './health.js';

function career(date = '2012-09-01') {
  const clubs = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, name: `Club ${i}`, shortName: `C${i}`, competitionId: 'league', country: 'ESP', rating: 76, budget: 5000000 }));
  const players = clubs.flatMap((club) => Array.from({ length: 24 }, (_, i) => ({ id: `${club.id}-p${i}`, clubId: club.id,
    name: `Player ${club.id}-${i}`, nationality: i % 2 ? 'ESP' : 'GER', birthYear: 1992, age: 20,
    position: i < 2 ? 'GK' : i < 10 ? 'DF' : i < 17 ? 'MF' : 'FW', rating: 73 + i % 5, potential: 84 + i % 4,
    value: 200000, wage: 1000, real: false })));
  return createManagerCareer({ year: 2012, clubId: 'c0', seed: 'market-fixture', world: { year: 2012, clubs, players,
    competitions: [{ id: 'league', name: 'League', country_fifa_code: 'ESP', confederation: 'UEFA' }], countries: [], coverage: { snapshotDate: date } } });
}
const reduce = (state, type, action = {}) => managerReducer(state, { type, ...action });
const advance = (state, days) => reduce(state, 'ADVANCE_CALENDAR', { days });
const roundtrip = (state) => restoreManagerCareer(serializeManagerCareer(state));
function agreement(state, playerId = 'c1-p17') {
  let next = reduce(state, 'OPEN_NEGOTIATION', { playerId });
  next = advance(next, 2);
  expect(next.negotiation.stage).toBe('club');
  next = reduce(next, 'ACCEPT_CLUB_COUNTER');
  expect(next.negotiation.stage).toBe('contract');
  next = reduce(next, 'ACCEPT_CONTRACT_COUNTER');
  expect(next.negotiation.stage).toBe('agreed');
  return next;
}

describe('dated transfer market and scouting', () => {
  it('uses the dated association calendar without an initial setup exception', () => {
    const state = career('2012-10-01'), window = getTransferWindow(state);
    expect(window).toMatchObject({ open: false, initialSetup: false, country: 'ESP' });
    expect(window.nextOpenDate).toMatch(/^2013-01-/);
    expect(getTransferWindow(state, { date: window.nextOpenDate })).toMatchObject({ open: true, kind: 'winter' });
    expect(roundtrip(state).transferWindowCalendar).toEqual(state.transferWindowCalendar);
  });

  it('advances calendar days without moving or skipping the scheduled fixture and restores its anchor', () => {
    const state = career(), date = getManagerSummary(state).nextMatchDate;
    const original = JSON.parse(JSON.stringify(state));
    const partial = advance(state, 7);
    expect(partial.date).toBe('2012-09-08'); expect(partial.round).toBe(0);
    expect(getManagerSummary(partial).nextMatchDate).toBe(date);
    expect(roundtrip(partial)).toEqual(partial);
    const onDate = advance(advance(partial, 31), 31);
    expect(onDate.date).toBe(date); expect(onDate.round).toBe(0);
    expect(advance(onDate, 1).lastError).toMatch(/encuentro/);
    const played = reduce(onDate, 'PLAY_MATCH', { mode: 'quick' });
    expect(played.round).toBe(1); expect(played.date).toBe(date);
    expect(state).toEqual(original);
  });

  it('requires permission, both agreements and explicit confirmation before changing membership or money', () => {
    const initial = career('2012-01-01');
    const inquiry = reduce(initial, 'OPEN_NEGOTIATION', { playerId: 'c1-p17' });
    expect(inquiry.negotiation.stage).toBe('inquiry');
    expect(reduce(inquiry, 'OFFER_CLUB', { fee: 200000 }).lastError).toMatch(/permiso/);
    const club = advance(inquiry, 2);
    expect(roundtrip(club)).toEqual(club);
    const counter = reduce(club, 'OFFER_CLUB', { fee: Math.round(club.negotiation.askingFee * 0.8) });
    expect(counter.negotiation.status).toBe('counter'); expect(counter.negotiation.patience).toBeLessThan(4);
    const contract = reduce(counter, 'ACCEPT_CLUB_COUNTER');
    expect(reduce(contract, 'COMPLETE_TRANSFER').lastError).toBeTruthy();
    const terms = reduce(contract, 'OFFER_CONTRACT', { wage: 1000, signingBonus: 0, years: 1, role: 'prospect' });
    expect(terms.negotiation.status).toBe('counter');
    const agreed = reduce(terms, 'ACCEPT_CONTRACT_COUNTER');
    expect(agreed.world).toBe(initial.world); expect(agreed.finances.budget).toBe(initial.finances.budget);
    const saved = roundtrip(agreed), cost = agreed.negotiation.fee + agreed.negotiation.signingBonus;
    const signed = reduce(saved, 'COMPLETE_TRANSFER');
    expect(signed.lastError).toBeNull(); expect(signed.finances.budget).toBe(initial.finances.budget - cost);
    expect(signed.world.players.find((player) => player.id === 'c1-p17')).toMatchObject({ clubId: 'c0', contract: { years: agreed.negotiation.years, role: agreed.negotiation.role } });
    expect(signed.world.clubs.find((clubEntry) => clubEntry.id === 'c0').playerIds).toContain('c1-p17');
    expect(signed.world.clubs.find((clubEntry) => clubEntry.id === 'c1').playerIds).not.toContain('c1-p17');
    expect(reduce(signed, 'COMPLETE_TRANSFER').finances.budget).toBe(signed.finances.budget);
    expect(roundtrip(signed)).toEqual(signed);
  });

  it('reserves a closed-window deal, protects commitments and charges exactly once on its January arrival', () => {
    const agreed = agreement(career('2012-10-01')), cost = agreed.negotiation.fee + agreed.negotiation.signingBonus;
    const arrivalDate = getTransferWindow(agreed).nextOpenDate;
    let state = reduce(agreed, 'COMPLETE_TRANSFER');
    expect(state.pendingTransfers[0].joinDate).toBe(arrivalDate);
    expect(state.world.players.find((player) => player.id === 'c1-p17').clubId).toBe('c1');
    expect(getRecruitmentFinances(state).reservedFees).toBe(cost);
    expect(state.finances.budget).toBe(agreed.finances.budget);
    expect(roundtrip(state)).toEqual(state);
    expect(reduce(state, 'OPEN_NEGOTIATION', { playerId: 'c1-p17' }).lastError).toMatch(/reservada/);
    const poor = { ...state, finances: { ...state.finances, budget: cost + 1 } };
    expect(reduce(poor, 'START_SCOUTING', { level: 'elite', duration: 30 }).lastError).toMatch(/presupuesto/);
    while (state.date < arrivalDate) {
      const next = advance(state, 31);
      state = next.date === state.date ? reduce(state, 'PLAY_MATCH', { mode: 'quick' }) : next;
    }
    expect(state.pendingTransfers).toHaveLength(0);
    const transferred = state.transfers.find((entry) => entry.playerId === 'c1-p17');
    expect(transferred.date).toBe(arrivalDate);
    expect(state.finances.spent).toBe(cost);
    expect(state.world.players.find((player) => player.id === 'c1-p17').clubId).toBe('c0');
    const later = advance(state, 1);
    expect(later.finances.spent).toBe(cost);
    expect(later.transfers.filter((entry) => entry.playerId === 'c1-p17')).toHaveLength(1);
    expect(roundtrip(later).pendingTransfers).toEqual([]);
  });

  it('enforces negotiation patience, recontact dates and seller goalkeeper cover', () => {
    const query = advance(reduce(career(), 'OPEN_NEGOTIATION', { playerId: 'c1-p17' }), 2);
    const broken = reduce(query, 'OFFER_CLUB', { fee: 1 });
    expect(broken.negotiation.stage).toBe('broken');
    expect(reduce(broken, 'OPEN_NEGOTIATION', { playerId: 'c1-p17' }).lastError).toMatch(/volverá/);
    expect(broken.clubRelationships.c1).toBeLessThan(0);
    const withdrawn = reduce(broken, 'CANCEL_NEGOTIATION');
    expect(withdrawn.marketCooldowns['c1-p17']).toBe(broken.marketCooldowns['c1-p17']);
    expect(reduce(advance(withdrawn, 3), 'OPEN_NEGOTIATION', { playerId: 'c1-p17' }).lastError).toMatch(/volverá/);
    const keeperQuery = advance(reduce(career(), 'OPEN_NEGOTIATION', { playerId: 'c1-p0' }), 2);
    expect(keeperQuery.negotiation.stage).toBe('broken'); expect(keeperQuery.negotiation.message).toMatch(/porteros/);
    const expired = advance(query, 20);
    expect(expired.negotiation.stage).toBe('broken'); expect(expired.negotiation.message).toMatch(/caducado/);
  });

  it('does not recover a summer arrival twice when advancing directly to the next preseason', () => {
    let state = career();
    for (let guard = 0; guard < 40 && state.phase !== 'complete'; guard += 1) state = reduce(state, 'PLAY_MATCH', { mode: 'quick' });
    expect(state.phase).toBe('complete');
    expect(state.date < '2013-07-01').toBe(true);
    state = agreement(state);
    const injuredDate = state.date;
    state = { ...state, playerHealth: { ...state.playerHealth, 'c1-p17': {
      condition: 50, sharpness: 50, minutesLast7Days: 0, lastMatchDate: null, lastUpdatedDate: injuredDate,
      injury: { name: 'Lesión de rodilla', daysRemaining: 180, returnDate: addDays(injuredDate, 180) },
    } } };
    const queued = reduce(state, 'COMPLETE_TRANSFER');
    expect(queued.pendingTransfers[0].joinDate).toBe('2013-07-01');
    const cost = queued.pendingTransfers[0].fee + queued.pendingTransfers[0].signingBonus;
    const next = reduce(roundtrip(queued), 'NEXT_SEASON');
    expect(next.date).toBe('2013-08-17');
    expect(next.pendingTransfers).toEqual([]);
    expect(next.transfers.find((transfer) => transfer.playerId === 'c1-p17').date).toBe('2013-07-01');
    const player = next.world.players.find((entry) => entry.id === 'c1-p17');
    expect(player.clubId).toBe(next.clubId);
    expect(next.playerHealth[player.id].lastUpdatedDate).toBe(next.date);
    expect(getPlayerHealth(next, player).injury.daysRemaining).toBe(180 - daysBetween(injuredDate, next.date));
    const restored = roundtrip(next), tomorrow = advance(restored, 1);
    expect(getPlayerHealth(tomorrow, player).injury.daysRemaining).toBe(179 - daysBetween(injuredDate, next.date));
    expect(tomorrow.finances.spent).toBe(cost);
    expect(tomorrow.transfers.filter((transfer) => transfer.playerId === player.id)).toHaveLength(1);
  });

  it('runs paid scouting progressively by actual days with filters, improving reports and a persistent shortlist', () => {
    const initial = career();
    let state = reduce(initial, 'START_SCOUTING', { level: 'professional', duration: 14, country: 'GER', position: 'FW', maxAge: 21, maxValue: 250000 });
    expect(state.scoutReports).toHaveLength(0); expect(state.finances.spent).toBe(56000);
    state = advance(state, 4);
    expect(state.scoutReports.length).toBeGreaterThan(0);
    expect(state.scoutReports.every((report) => state.world.players.find((player) => player.id === report.playerId).nationality === 'GER')).toBe(true);
    const early = state.scoutReports[0];
    state = reduce(state, 'TOGGLE_SHORTLIST', { playerId: early.playerId });
    expect(roundtrip(state)).toEqual(state);
    state = advance(state, 10);
    expect(state.scoutMissions[0]).toMatchObject({ status: 'complete', progress: 100 });
    const final = state.scoutReports.find((report) => report.playerId === early.playerId);
    expect(final.stage).toBe('complete'); expect(final.potentialMax - final.potentialMin).toBeLessThan(early.potentialMax - early.potentialMin);
    expect(state.shortlist).toContain(early.playerId); expect(state.finances.spent).toBe(56000);
    expect(advance(state, 1).finances.spent).toBe(56000);
    expect(final.fitSummary).toMatch(/4-3-3.*FW.*disponibles/);
    expect(final.financialSummary).toMatch(/sueldo orientativo/);
    expect(final.riskSummary).toMatch(/lesión activa/);
  });

  it('keeps scouting results independent of day-step size and permits paid re-observation after cancellation', () => {
    const started = reduce(career(), 'START_SCOUTING', { level: 'local', duration: 14, country: 'GER', position: 'FW' });
    let daily = started;
    for (let day = 0; day < 30; day += 1) daily = advance(daily, 1);
    const jumped = advance(started, 30);
    expect(jumped.scoutReports).toEqual(daily.scoutReports);
    expect(jumped.scoutMissions).toEqual(daily.scoutMissions);
    expect(roundtrip(jumped).scoutReports).toEqual(jumped.scoutReports);
    const partial = advance(started, 4);
    expect(partial.scoutReports[0].stage).toBe('fit');
    const cancelled = reduce(partial, 'CANCEL_SCOUTING', { missionId: partial.scoutMissions[0].id });
    const again = reduce(roundtrip(cancelled), 'START_SCOUTING', { level: 'elite', duration: 14, country: 'GER', position: 'FW' });
    expect(again.lastError).toBeNull();
    expect(again.scoutMissions[1].candidateIds).toContain(partial.scoutReports[0].playerId);
    expect(again.finances.spent).toBe(started.finances.spent + 140000);
    expect(advance(again, 14).scoutReports.find((report) => report.playerId === partial.scoutReports[0].playerId).stage).toBe('complete');
  });

  it('uses the asking price to attract or deter funded sale offers and preserves offers until a closed window opens', () => {
    const listed = reduce(career('2012-10-01'), 'LIST_FOR_TRANSFER', { playerId: 'c0-p17', askingFee: 200000 });
    const offers = advance(listed, 3);
    expect(offers.transferOffers[0].expiresDate).toBe(addDays(getTransferWindow(offers).nextOpenDate, 7));
    expect(reduce(offers, 'RESPOND_TRANSFER_OFFER', { offerId: offers.transferOffers[0].id, decision: 'accept' }).lastError).toMatch(/ventana/);
    const expensive = advance(reduce(career(), 'LIST_FOR_TRANSFER', { playerId: 'c0-p17', askingFee: 1000000 }), 3);
    expect(expensive.transferOffers).toEqual([]);
    expect(expensive.transferListings[0].responded).toBe(true);
  });

  it('keeps sparse external clubs out of leagues and emergency squads while allowing their documented market players', () => {
    const original = career('2012-01-01');
    const externalClub = { ...original.world.clubs[1], id: 'external-club', competitionId: 'external:ESP', selectable: false, playerIds: ['external-player'] };
    const externalPlayer = { ...original.world.players.find((player) => player.id === 'c1-p17'), id: 'external-player', clubId: externalClub.id };
    const state = createManagerCareer({ year: 2012, clubId: original.clubId, seed: original.seed, world: { ...original.world,
      clubs: [...original.world.clubs, externalClub], players: [...original.world.players, externalPlayer],
      competitions: [...original.world.competitions, { id: 'external:ESP', country_fifa_code: 'ESP', simulated: false, selectable: false }] } });
    expect(state.leagues['external:ESP']).toBeUndefined();
    expect(roundtrip(state).world).toEqual(state.world);
    const signed = reduce(agreement(state, externalPlayer.id), 'COMPLETE_TRANSFER');
    expect(signed.lastError).toBeNull();
    expect(signed.world.players.find((player) => player.id === externalPlayer.id).clubId).toBe(state.clubId);
    const played = reduce(signed, 'PLAY_MATCH', { mode: 'quick' });
    expect(played.world.players.filter((player) => player.clubId === externalClub.id && player.emergency)).toEqual([]);
    expect(roundtrip(played).world).toEqual(played.world);
  });

  it('presents a sale offer without moving the player and requires a funded acceptance', () => {
    let state = reduce(career('2012-01-01'), 'LIST_FOR_TRANSFER', { playerId: 'c0-p17', askingFee: 200000 });
    expect(state.transferOffers).toHaveLength(0);
    state = advance(state, 3);
    const offer = state.transferOffers[0]; expect(offer).toBeTruthy();
    expect(state.world.players.find((player) => player.id === offer.playerId).clubId).toBe('c0');
    expect(roundtrip(state)).toEqual(state);
    const rejected = reduce(state, 'RESPOND_TRANSFER_OFFER', { offerId: offer.id, decision: 'reject' });
    expect(rejected.world).toBe(state.world);
    const counter = reduce(state, 'RESPOND_TRANSFER_OFFER', { offerId: offer.id, decision: 'counter', fee: offer.maxFee });
    expect(counter.transferOffers[0].status).toBe('counter');
    const sold = reduce(counter, 'RESPOND_TRANSFER_OFFER', { offerId: offer.id, decision: 'accept' });
    expect(sold.finances.budget).toBe(state.finances.budget + offer.maxFee);
    expect(sold.world.players.find((player) => player.id === offer.playerId).clubId).toBe(offer.buyerId);
    expect(reduce(sold, 'RESPOND_TRANSFER_OFFER', { offerId: offer.id, decision: 'accept' }).finances).toBe(sold.finances);
  });

  it('rejects corrupt reservations and calendar anchors while accepting old saves without recruitment fields', () => {
    const queued = reduce(agreement(career('2012-10-01')), 'COMPLETE_TRANSFER');
    const saved = JSON.parse(serializeManagerCareer(queued));
    expect(() => restoreManagerCareer({ ...saved, pendingTransfers: [...saved.pendingTransfers, saved.pendingTransfers[0]] })).toThrow(/pendientes/);
    expect(() => restoreManagerCareer({ ...saved, calendarNextDate: '2012-01-01' })).toThrow(/calendario/);
    const old = JSON.parse(serializeManagerCareer(career()));
    for (const key of ['pendingTransfers', 'marketCooldowns', 'clubTransferBalances', 'clubRelationships', 'transferListings', 'transferOffers', 'scoutMissions', 'shortlist', 'scoutingSerial', 'calendarNextDate']) delete old[key];
    const restored = restoreManagerCareer(old);
    expect(restored.pendingTransfers).toEqual([]); expect(restored.scoutMissions).toEqual([]);
    expect(getNextFixture(restored)).toEqual(getNextFixture(career()));
  });
});
