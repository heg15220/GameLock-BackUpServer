import { createStream, pickWeighted } from '../trayectoria/rng.js';
import { effectiveRating, injuryProbability, matchHealth, sampleInjury } from './health.js';
import { TACTICAL_KEYS, normalizeTacticalInstructions, validateTacticalInstructions, tacticalMatchup, planPassRoute, tacticalEffort } from './tactical-model.js';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const shapes = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2'];
const mentalities = ['balanced', 'attacking', 'defensive'];
const pressingOptions = ['low', 'balanced', 'high'];
const other = (side) => side === 'home' ? 'away' : 'home';
const sideKey = (side, key) => `${side}${key}`;

function copy(match) {
  return { ...match, events: match.events.slice(), actions: match.actions.slice(), minutes: { ...match.minutes },
    condition: { ...match.condition }, injuries: { ...match.injuries }, injuredIds: match.injuredIds.slice(),
    goalsAgainstWhileOnPitch: { ...match.goalsAgainstWhileOnPitch }, stats: { ...match.stats },
    homeLineup: match.homeLineup.slice(), awayLineup: match.awayLineup.slice(), homeBench: match.homeBench.slice(), awayBench: match.awayBench.slice(),
    homeUsed: match.homeUsed.slice(), awayUsed: match.awayUsed.slice(),
    homeTactics: { ...match.homeTactics }, awayTactics: { ...match.awayTactics },
    substitutions: { ...match.substitutions } };
}

function expose(match) {
  match.tactics = { ...match[sideKey(match.ownSide, 'Tactics')] };
  match.substitutionsUsed = match.substitutions[match.ownSide];
  match.period = match.pausedFor === 'half-time' ? 'half-time' : match.minute < 45 ? 'first-half' : match.duration > 90 ? 'extra-time' : 'second-half';
  return match;
}

export function createLiveMatch({ fixture, seed, year, ownSide, morale, teams, players, modelVersion = 3 }) {
  const minute = 0;
  const tactics = (side) => ({ formation: '4-3-3', mentality: 'balanced', pressing: 'balanced',
    ...Object.fromEntries(Object.entries(teams[side].tactics || {}).filter(([key]) => modelVersion >= 3 || !TACTICAL_KEYS.includes(key))),
    ...(modelVersion >= 3 ? normalizeTacticalInstructions(teams[side].tactics) : {}) });
  return expose({ modelVersion, fixture, seed, year, ownSide, morale, minute, duration: 90, complete: false,
    pausedFor: null, homeGoals: 0, awayGoals: 0, winnerId: null, penalties: null,
    events: [{ minute, type: 'kickoff', text: 'Comienza el partido.' }], actions: [], players,
    homeInitialLineup: teams.home.lineup.slice(), awayInitialLineup: teams.away.lineup.slice(),
    homeLineup: teams.home.lineup.slice(), awayLineup: teams.away.lineup.slice(),
    homeBench: teams.home.bench.slice(), awayBench: teams.away.bench.slice(),
    homeUsed: teams.home.lineup.slice(), awayUsed: teams.away.lineup.slice(),
    homeTactics: tactics('home'), awayTactics: tactics('away'),
    substitutions: { home: 0, away: 0 }, maxSubstitutions: year >= 2020 ? 5 : 3, autoSubstitutions: true,
    minutes: {}, condition: Object.fromEntries(Object.values(players).map((player) => [player.id, player.health.condition])),
    injuries: {}, injuredIds: [], goalsAgainstWhileOnPitch: {},
    ...(modelVersion >= 3 ? { lastTurnover: null } : {}),
    ...(modelVersion >= 2 ? { possessionSide: null, carrierId: null,
      presentation: { id: `${fixture.id}:0`, minute: 0, possessionSide: null, scoreBefore: { home: 0, away: 0 }, scoreAfter: { home: 0, away: 0 },
        onPitch: { home: teams.home.lineup.slice(), away: teams.away.lineup.slice() }, sequences: [] } } : {}),
    stats: { shotsHome: 0, shotsAway: 0, xgHome: 0, xgAway: 0, possessionHome: 50,
      ...(modelVersion >= 2 ? { shotsOnTargetHome: 0, shotsOnTargetAway: 0, shotXgHome: 0, shotXgAway: 0,
        cornersHome: 0, cornersAway: 0, foulsHome: 0, foulsAway: 0, penaltiesHome: 0, penaltiesAway: 0,
        recoveriesHome: 0, recoveriesAway: 0, countersHome: 0, countersAway: 0, savesHome: 0, savesAway: 0 } : {}) }, possessionTotal: 0 });
}

function power(match, side) {
  const lineup = match[sideKey(side, 'Lineup')].filter((id) => !match.injuredIds.includes(id)).map((id) => match.players[id]);
  const mean = (position) => {
    const rows = lineup.filter((player) => player.position === position);
    return rows.length ? rows.reduce((sum, player) => sum + effectiveRating(player, { ...player.health, condition: match.condition[player.id] }), 0) / rows.length : 25;
  };
  const motivation = side === match.ownSide ? (match.morale - 65) / 12 : 0;
  let attack = mean('FW') * 0.53 + mean('MF') * 0.32 + mean('DF') * 0.15 + motivation;
  let defense = mean('GK') * 0.28 + mean('DF') * 0.52 + mean('MF') * 0.2 + motivation;
  const tactic = match[sideKey(side, 'Tactics')];
  if (tactic.mentality === 'attacking') { attack += 5; defense -= 4; }
  if (tactic.mentality === 'defensive') { attack -= 4; defense += 5; }
  if (tactic.pressing === 'high') { attack += 2.5; defense += 1.5; }
  if (tactic.pressing === 'low') { attack -= 1.5; defense -= 1; }
  const shape = tactic.formation === '4-2-3-1' ? [4, 5, 1] : tactic.formation.split('-').map(Number);
  const mismatch = ['DF', 'MF', 'FW'].reduce((sum, position, i) => sum + Math.abs(lineup.filter((player) => player.position === position).length - shape[i]), 0);
  attack -= mismatch * 1.5; defense -= mismatch * 1.5;
  if (shape[0] === 3) { attack += 2; defense -= 2; }
  if (shape[0] === 5) { attack -= 2; defense += 2; }
  return { attack: attack - Math.max(0, 11 - lineup.length) * 4, defense: defense - Math.max(0, 11 - lineup.length) * 4 };
}

function replace(match, side, outId, inId, automatic = false) {
  const lineup = match[sideKey(side, 'Lineup')];
  const bench = match[sideKey(side, 'Bench')];
  lineup.splice(lineup.indexOf(outId), 1, inId);
  bench.splice(bench.indexOf(inId), 1);
  match[sideKey(side, 'Used')].push(inId);
  match.substitutions[side] += 1;
  match.events.push({ minute: match.minute, type: 'substitution', side, playerOutId: outId, playerInId: inId, automatic,
    text: `Cambio: entra ${match.players[inId].name} por ${match.players[outId].name}.` });
}

export function changeLiveTactics(current, changes) {
  if (current.modelVersion < 3 && TACTICAL_KEYS.some((key) => changes[key] !== undefined)) throw new Error('Estas instrucciones estarán disponibles en el siguiente partido; este encuentro conserva su modelo anterior.');
  const keys = ['formation', 'mentality', 'pressing', ...(current.modelVersion >= 3 ? TACTICAL_KEYS : [])];
  const tactics = { ...current.tactics, ...Object.fromEntries(keys.filter((key) => changes[key] !== undefined).map((key) => [key, changes[key]])) };
  if (current.complete || !shapes.includes(tactics.formation) || !mentalities.includes(tactics.mentality) || !pressingOptions.includes(tactics.pressing)) throw new Error('Esa táctica de partido no es válida.');
  if (current.modelVersion >= 3 && !validateTacticalInstructions(tactics)) throw new Error('Esa instrucción táctica no es válida.');
  if (current.actions.length >= 256) throw new Error('Se ha alcanzado el límite de decisiones del partido.');
  const next = copy(current);
  next[sideKey(next.ownSide, 'Tactics')] = tactics;
  next.actions.push({ type: 'SET_MATCH_TACTICS', minute: next.minute, ...tactics });
  next.events.push({ minute: next.minute, type: 'tactics', side: next.ownSide, ...tactics,
    ...(current.modelVersion >= 3 ? { changedKeys: keys.filter((key) => tactics[key] !== current.tactics[key]) } : {}),
    text: `Cambio táctico: ${tactics.formation}, ${tactics.mentality}, presión ${tactics.pressing}.` });
  return expose(next);
}

export function substituteLivePlayer(current, outId, inId) {
  if (current.complete || !current[sideKey(current.ownSide, 'Lineup')].includes(outId)
    || !current[sideKey(current.ownSide, 'Bench')].includes(inId) || current.injuredIds.includes(inId)) throw new Error('Selecciona un jugador en el campo y un suplente disponible; no se permite reingresar.');
  if (current.substitutionsUsed >= current.maxSubstitutions) throw new Error('Se han agotado los cambios permitidos.');
  if (current.actions.length >= 256) throw new Error('Se ha alcanzado el límite de decisiones del partido.');
  const nextLineup = current[sideKey(current.ownSide, 'Lineup')].filter((id) => id !== outId).concat(inId);
  if (nextLineup.filter((id) => current.players[id].position === 'GK').length !== 1) throw new Error('El equipo debe conservar exactamente un portero.');
  const next = copy(current);
  replace(next, next.ownSide, outId, inId);
  next.actions.push({ type: 'SUBSTITUTE_PLAYER', minute: next.minute, outId, inId });
  if (next.pausedFor === 'injury' && !next[sideKey(next.ownSide, 'Lineup')].some((id) => next.injuredIds.includes(id))) next.pausedFor = null;
  return expose(next);
}

export function setLiveAutoSubstitutions(current, enabled) {
  if (current.complete || typeof enabled !== 'boolean') throw new Error('Selecciona si deseas sustituciones automáticas.');
  if (current.actions.length >= 256) throw new Error('Se ha alcanzado el límite de decisiones del partido.');
  const next = copy(current);
  next.autoSubstitutions = enabled;
  next.actions.push({ type: 'SET_MATCH_AUTOSUBS', minute: next.minute, enabled });
  next.events.push({ minute: next.minute, type: 'tactics', side: next.ownSide, autoSubstitutions: enabled, text: enabled ? 'Sustituciones automáticas activadas.' : 'El entrenador dirigirá las sustituciones.' });
  if (enabled) {
    for (const id of next[sideKey(next.ownSide, 'Lineup')].filter((id) => next.injuredIds.includes(id))) automaticReplacement(next, next.ownSide, id, true);
    if (next.pausedFor === 'injury') next.pausedFor = null;
  }
  return expose(next);
}

function automaticReplacement(match, side, outId, injured) {
  const out = match.players[outId];
  const bench = match[sideKey(side, 'Bench')];
  const inId = bench.find((id) => match.players[id].position === out.position)
    || (out.position !== 'GK' ? bench.find((id) => match.players[id].position !== 'GK') : null);
  if (inId && match.substitutions[side] < match.maxSubstitutions) replace(match, side, outId, inId, true);
  else if (injured) match[sideKey(side, 'Lineup')] = match[sideKey(side, 'Lineup')].filter((id) => id !== outId);
}

function regulationWinner(match, afterExtra = false) {
  const fixture = match.fixture;
  const home = match.homeGoals + (fixture.aggregateHome || 0);
  const away = match.awayGoals + (fixture.aggregateAway || 0);
  if (home !== away) return home > away ? fixture.homeId : fixture.awayId;
  if (fixture.awayGoalsRule && (!afterExtra || fixture.awayGoalsExtraTime !== false)) {
    const homeAway = fixture.awayGoalsHome || 0;
    const awayAway = (fixture.awayGoalsAway || 0) + match.awayGoals;
    if (homeAway !== awayAway) return homeAway > awayAway ? fixture.homeId : fixture.awayId;
  }
  return null;
}

function finalWhistle(match) {
  match.winnerId = regulationWinner(match, match.duration > 90);
  if (match.fixture.knockout && !match.winnerId) {
    if (match.fixture.tieBreak === 'higher-seed') match.winnerId = match.fixture.tieWinnerId;
    else {
      const random = createStream(match.seed, match.year, 'live-penalties', match.fixture.id);
      const homeWins = random() < clamp(0.5 + (power(match, 'home').attack - power(match, 'away').attack) / 140, 0.3, 0.7);
      const losingScore = 2 + Math.floor(random() * 3);
      match.penalties = { home: losingScore + Number(homeWins), away: losingScore + Number(!homeWins) };
      match.winnerId = homeWins ? match.fixture.homeId : match.fixture.awayId;
      match.events.push({ minute: match.minute, type: 'penalties', text: `Tanda de penaltis: ${match.penalties.home}–${match.penalties.away}.` });
    }
  }
  match.complete = true; match.pausedFor = null;
  match.events.push({ minute: match.minute, type: 'full-time', text: `Final: ${match.homeGoals}–${match.awayGoals}.` });
}

/** One resolved possession per played minute. Descriptors are evidence of that
 * possession, not decorative events added by the renderer or future plans. */
function playPossession(match, homePower, awayPower, rates) {
  const minute = match.minute;
  const tactical = match.modelVersion >= 3;
  const random = createStream(match.seed, match.year, match.fixture.id, tactical ? 'live-play-v3' : 'live-play-v2', minute);
  const onPitch = Object.fromEntries(['home', 'away'].map((side) => [side,
    match[sideKey(side, 'Lineup')].filter((id) => !match.injuredIds.includes(id))]));
  const scoreBefore = { home: match.homeGoals, away: match.awayGoals };
  const presentation = { id: `${match.fixture.id}:${minute}`, minute, possessionSide: null,
    scoreBefore, scoreAfter: { ...scoreBefore }, onPitch, sequences: [] };
  match.presentation = presentation;
  const homeShare = clamp(0.5 + (homePower.attack - awayPower.attack) * 0.006, 0.27, 0.73);
  let side = match.possessionSide || (random() < homeShare ? 'home' : 'away');
  if (!onPitch[side].length) side = other(side);
  if (!onPitch[side].length) return;
  const tacticalSnapshot = tactical ? { home: { ...match.homeTactics }, away: { ...match.awayTactics } } : null;
  const qualities = tactical ? Object.fromEntries(['home', 'away'].map((team) => [team, {
    quality: onPitch[team].reduce((sum, id) => sum + effectiveRating(match.players[id], { ...match.players[id].health, condition: match.condition[id] }), 0) / Math.max(1, onPitch[team].length),
    condition: onPitch[team].reduce((sum, id) => sum + match.condition[id], 0) / Math.max(1, onPitch[team].length),
  }])) : null;
  const recentlyLost = (team) => match.lastTurnover?.lostSide === team && match.lastTurnover.minute >= minute - 1;
  const matchupFor = (team) => tacticalMatchup(tacticalSnapshot[team], tacticalSnapshot[other(team)], qualities[team].quality,
    qualities[other(team)].quality, qualities[team].condition, qualities[other(team)].condition, recentlyLost(other(team)));
  const contextFor = (team, kind, counter = false) => {
    const profile = matchupFor(team), instructions = tacticalSnapshot[team];
    const intent = ['corner', 'free-kick', 'penalty'].includes(kind) ? 'set-piece' : kind === 'recovery'
      ? instructions.transition === 'counter' ? 'counter' : instructions.transition === 'hold' ? 'circulate' : 'support' : counter || kind === 'counter' ? 'counter'
        : instructions.passing === 'direct' ? 'direct' : instructions.passing === 'short' ? 'support' : 'circulate';
    return { ...tacticalSnapshot, intent, pressure: profile.pressure, space: profile.space };
  };
  const chooseLane = (team) => {
    const draw = random(), width = tacticalSnapshot[team].width;
    const central = width === 'narrow' ? 0.75 : width === 'wide' ? 0.12 : 0.4;
    return draw < central ? 'center' : draw < central + (1 - central) / 2 ? 'left' : 'right';
  };
  let lane = tactical ? chooseLane(side) : ['left', 'center', 'right'][Math.floor(random() * 3)];
  const attackId = `${presentation.id}:attack`;
  const pick = (team, weights, except = null) => {
    const eligible = onPitch[team].filter((id) => id !== except);
    return pickWeighted(random, eligible.length ? eligible : onPitch[team], (id) => (weights[match.players[id].position] || 0.01)
      * (effectiveRating(match.players[id], { ...match.players[id].health, condition: match.condition[id] }) / 70) ** 2) || null;
  };
  const passerWeights = { GK: 0.2, DF: 2, MF: 4, FW: 1 };
  const scorerWeights = { GK: 0.01, DF: 0.5, MF: 1.8, FW: 4.8 };
  const defenderWeights = { GK: 0.2, DF: 4, MF: 2, FW: 0.6 };
  const bump = (key, team, amount = 1) => { match.stats[`${key}${team === 'home' ? 'Home' : 'Away'}`] += amount; };
  const event = (type, fields, text) => {
    const id = `${attackId}:event:${match.events.length}`;
    match.events.push({ id, playId: attackId, minute, type, ...fields, text });
    return id;
  };
  const sequence = (kind, actorId, fields = {}) => {
    const descriptor = { id: `${attackId}:${presentation.sequences.length}`, attackId, minute, side, kind, actorId,
      receiverId: null, assistId: null, keeperId: null, defenderId: null, lane,
      source: 'open-play', outcome: null, eventId: null,
      ...(tactical ? { tacticalContext: contextFor(fields.side || side, kind, fields.source === 'counter') } : {}), ...fields };
    presentation.sequences.push(descriptor);
    return descriptor;
  };
  let carrier = onPitch[side].includes(match.carrierId) ? match.carrierId : pick(side, passerWeights);
  let counter = tactical && match.lastTurnover?.wonSide === side && match.lastTurnover.minute === minute - 1
    && random() < matchupFor(side).counterChance;
  const opponentShare = side === 'home' ? 1 - homeShare : homeShare;
  const pressure = match[sideKey(other(side), 'Tactics')].pressing;
  const turnover = tactical ? clamp(0.16 + opponentShare * 0.22 + matchupFor(side).pressure * 0.18, 0.14, 0.58)
    : clamp(opponentShare * 0.8 + (pressure === 'high' ? 0.05 : pressure === 'low' ? -0.04 : 0), 0.15, 0.7);
  if (match.possessionSide && onPitch[other(side)].length && random() < turnover) {
    const dispossessedId = carrier;
    side = other(side); carrier = pick(side, defenderWeights);
    if (tactical) { match.lastTurnover = { lostSide: other(side), wonSide: side, minute }; lane = chooseLane(side); }
    bump('recoveries', side);
    sequence('recovery', carrier, { defenderId: dispossessedId,
      eventId: event('recovery', { side, playerId: carrier, dispossessedId }, `${match.players[carrier].name} recupera el balón.`) });
    counter = random() < (tactical ? matchupFor(side).counterChance : match[sideKey(other(side), 'Tactics')].mentality === 'attacking' ? 0.62 : 0.42);
    if (counter && !tactical) {
      const runner = pick(side, scorerWeights, carrier);
      bump('counters', side);
      sequence('counter', carrier, { receiverId: runner, source: 'counter',
        eventId: event('counter', { side, playerId: carrier, receiverId: runner }, `${match.players[carrier].name} inicia el contraataque.`) });
      carrier = runner;
    }
  }
  match.possessionSide = side; presentation.possessionSide = side;
  match.possessionTotal += Number(side === 'home') * 100;
  match.stats.possessionHome = Math.round(match.possessionTotal / minute);
  const defending = other(side);
  const matchup = tactical ? matchupFor(side) : null;
  if (tactical) presentation.tacticalContext = contextFor(side, counter ? 'counter' : 'buildup', counter);
  let receiver;
  if (tactical) {
    const planned = planPassRoute({ random, ids: onPitch[side], players: match.players, carrierId: carrier, tactics: tacticalSnapshot[side], counter });
    const route = [carrier];
    let interceptedById = null;
    for (const nextId of planned.slice(1)) {
      route.push(nextId);
      if (onPitch[defending].length && random() < matchup.interception) { interceptedById = pick(defending, defenderWeights); break; }
    }
    receiver = route.at(-1);
    if (counter) bump('counters', side);
    const descriptor = sequence(counter ? 'counter' : 'buildup', carrier, { receiverId: receiver, passRoute: route,
      source: counter ? 'counter' : 'open-play',
      ...(counter ? { eventId: event('counter', { side, playerId: carrier, receiverId: receiver }, `${match.players[carrier].name} inicia el contraataque.`) } : {}) });
    if (interceptedById) {
      descriptor.interceptedById = interceptedById; descriptor.interceptedPassIndex = route.length - 2;
      descriptor.resultSide = defending; descriptor.resultCarrierId = interceptedById;
      bump('recoveries', defending);
      match.lastTurnover = { lostSide: side, wonSide: defending, minute };
      sequence('recovery', interceptedById, { side: defending, defenderId: receiver, source: counter ? 'counter' : 'open-play', interception: true,
        eventId: event('recovery', { side: defending, playerId: interceptedById, dispossessedId: receiver, interception: true }, `${match.players[interceptedById].name} intercepta el pase.`) });
      match.possessionSide = defending; match.carrierId = interceptedById;
      return;
    }
  } else {
    receiver = pick(side, passerWeights, carrier);
    sequence('buildup', carrier, { receiverId: receiver, source: counter ? 'counter' : 'open-play' });
  }
  match.carrierId = receiver;
  const keeperId = onPitch[defending].find((id) => match.players[id].position === 'GK') || null;
  function shot(source, shooterId, assistId, baseQuality, allowCorner = false) {
    const defenderId = pick(defending, defenderWeights);
    const keeperRating = keeperId ? effectiveRating(match.players[keeperId], { ...match.players[keeperId].health, condition: match.condition[keeperId] }) : 25;
    const shooterRating = effectiveRating(match.players[shooterId], { ...match.players[shooterId].health, condition: match.condition[shooterId] });
    const tacticalQuality = tactical && ['counter', 'open-play'].includes(source)
      ? matchup.quality + (source === 'counter' ? (matchup.space - 0.46) * 0.085 : 0) : 0;
    const quality = clamp(baseQuality + tacticalQuality + (shooterRating - keeperRating) * (source === 'penalty' ? 0.0018 : 0.0012), source === 'penalty' ? 0.6 : 0.03, source === 'penalty' ? 0.9 : 0.34);
    const goal = random() < quality;
    const miss = random();
    const outcome = goal ? 'goal' : source === 'penalty' ? (miss < 0.65 && keeperId ? 'saved' : 'wide')
      : miss < 0.43 && keeperId ? 'saved' : miss < 0.7 ? 'wide' : 'blocked';
    bump('shots', side); bump('shotXg', side, quality);
    if (goal || outcome === 'saved') bump('shotsOnTarget', side);
    if (outcome === 'saved') bump('saves', defending);
    const descriptor = sequence('shot', shooterId, { assistId, keeperId, defenderId, source, outcome,
      ...(tactical ? { expectedGoals: quality } : {}) });
    if (goal) {
      match[`${side}Goals`] += 1;
      for (const id of onPitch[defending]) match.goalsAgainstWhileOnPitch[id] = (match.goalsAgainstWhileOnPitch[id] || 0) + 1;
      const eventId = event('goal', { side, playerId: shooterId, assistId, keeperId, source, outcome }, `¡Gol de ${match.players[shooterId].name}!${assistId ? ` Asistencia de ${match.players[assistId].name}.` : ''}`);
      descriptor.eventId = eventId;
      sequence('goal', shooterId, { assistId, keeperId, source, outcome, eventId, scoreAfter: { home: match.homeGoals, away: match.awayGoals } });
      match.possessionSide = defending; match.carrierId = null;
      if (tactical) match.lastTurnover = null;
    } else {
      descriptor.eventId = event('chance', { side, playerId: shooterId, keeperId, defenderId, source, outcome }, `Remate de ${match.players[shooterId].name}: ${outcome === 'saved' ? 'parada del portero' : outcome === 'blocked' ? 'bloqueado por la defensa' : 'fuera'}.`);
      if (allowCorner && ((outcome === 'blocked' && random() < 0.65) || (outcome === 'saved' && random() < 0.22))) corner();
      else {
        match.possessionSide = defending; match.carrierId = outcome === 'blocked' ? defenderId : keeperId || defenderId;
        if (tactical && outcome === 'blocked') match.lastTurnover = { lostSide: side, wonSide: defending, minute };
        descriptor.resultSide = defending; descriptor.resultCarrierId = match.carrierId;
      }
    }
  }
  function corner() {
    const taker = pick(side, { GK: 0.01, DF: 0.8, MF: 4, FW: 1.4 });
    const target = pick(side, { GK: 0.01, DF: 3, MF: 1, FW: 3 }, taker);
    bump('corners', side);
    sequence('corner', taker, { receiverId: target, source: 'corner',
      eventId: event('corner', { side, playerId: taker, receiverId: target }, `Córner que ejecuta ${match.players[taker].name}.`) });
    if (random() < 0.48) shot('corner', target, taker === target ? null : taker, 0.11);
    else {
      match.possessionSide = defending; match.carrierId = pick(defending, defenderWeights);
      if (tactical) match.lastTurnover = { lostSide: side, wonSide: defending, minute };
      if (match.carrierId) {
        bump('recoveries', defending);
        sequence('recovery', match.carrierId, { side: defending, source: 'corner', defenderId: target,
          eventId: event('recovery', { side: defending, playerId: match.carrierId, source: 'corner' }, `${match.players[match.carrierId].name} despeja el córner y recupera la posesión.`) });
      }
    }
  }
  const foulChance = 0.235 + (match[sideKey(defending, 'Tactics')].pressing === 'high' ? 0.035 : 0);
  if (onPitch[defending].length && random() < foulChance) {
    const offender = pick(defending, defenderWeights);
    const penalty = random() < 0.015;
    bump('fouls', defending);
    event('foul', { side: defending, playerId: offender, victimId: receiver, attackingSide: side, penalty }, `${match.players[offender].name} comete falta sobre ${match.players[receiver].name}.`);
    const taker = pick(side, { GK: 0.01, DF: 0.3, MF: 3, FW: 4 });
    if (penalty) {
      bump('penalties', side);
      sequence('penalty', taker, { keeperId, defenderId: offender, source: 'penalty',
        eventId: event('penalty', { side, playerId: taker, keeperId, offenderId: offender }, `Penalti: lanzará ${match.players[taker].name}.`) });
      shot('penalty', taker, null, 0.76);
    } else {
      const dangerous = random() < 0.28;
      sequence('free-kick', taker, { receiverId: receiver === taker ? null : receiver, defenderId: offender, source: 'free-kick',
        dangerous, zone: dangerous ? 'attacking-third' : 'midfield',
        eventId: event('free-kick', { side, playerId: taker, offenderId: offender, dangerous }, `Falta a balón parado para ${match.players[taker].name}.`) });
      if (random() < (dangerous ? 0.65 : 0.08)) shot('free-kick', taker, null, dangerous ? 0.085 : 0.04);
      else match.carrierId = receiver;
    }
  } else if (random() < (tactical ? matchup.cornerChance : 0.09)) corner();
  else {
    const share = side === 'home' ? homeShare : 1 - homeShare;
    const threat = clamp(rates[side] * (tactical ? 8.6 : 7) / (90 * share) * (counter ? 1.2 : 1) * (tactical ? matchup.threat : 1), 0.025, 0.82);
    if (random() < threat) {
      const shooter = random() < 0.74 ? pick(side, scorerWeights) : receiver;
      const assistId = receiver === shooter ? null : receiver;
      sequence('buildup', receiver, { receiverId: shooter, source: counter ? 'counter' : 'open-play',
        ...(tactical ? { passRoute: receiver === shooter ? [receiver] : [receiver, shooter] } : {}) });
      shot(counter ? 'counter' : 'open-play', shooter, assistId, counter ? 0.17 : 0.145, true);
    }
  }
  presentation.scoreAfter = { home: match.homeGoals, away: match.awayGoals };
}

/** Archived v1 shots have no recorded shooter. Mark their visual attribution
 * illustrative; actual goals retain their recorded scorer/assist. This stream
 * never participates in match results, possession statistics or injuries. */
function presentLegacyMinute(match, onPitch) {
  const events = match.events.filter((event) => event.minute === match.minute && ['goal', 'chance'].includes(event.type));
  const scoreBefore = { home: match.homeGoals - events.filter((event) => event.type === 'goal' && event.side === 'home').length,
    away: match.awayGoals - events.filter((event) => event.type === 'goal' && event.side === 'away').length };
  const random = createStream(match.seed, match.year, match.fixture.id, 'legacy-presentation-only', match.minute);
  const sequences = [];
  const id = `${match.fixture.id}:${match.minute}`;
  let possessionSide = events[0]?.side || (random() * 100 < match.stats.possessionHome ? 'home' : 'away');
  const score = { ...scoreBefore };
  const chanceActor = (side) => pickWeighted(random, onPitch[side], (playerId) => ({ GK: 0.01, DF: 0.5, MF: 2, FW: 4 }[match.players[playerId]?.position] || 1)) || null;
  const describe = (kind, side, actorId, fields = {}) => sequences.push({ id: `${id}:${sequences.length}`, attackId: `${id}:legacy`, minute: match.minute,
    side, kind, actorId, receiverId: null, assistId: null, keeperId: null, defenderId: null, lane: ['left', 'center', 'right'][Math.floor(random() * 3)],
    source: 'open-play', outcome: null, eventId: null, illustrative: true, ...fields });
  if (match.minute > 0 && !events.length && onPitch[possessionSide].length) {
    const actor = chanceActor(possessionSide);
    describe('buildup', possessionSide, actor, { receiverId: onPitch[possessionSide].find((entry) => entry !== actor) || actor });
  }
  for (const event of events) {
    const side = event.side;
    const actor = event.playerId || chanceActor(side);
    if (!actor) continue;
    possessionSide = side;
    const passer = event.assistId || onPitch[side].find((entry) => entry !== actor) || actor;
    const keeperId = onPitch[other(side)].find((entry) => match.players[entry]?.position === 'GK') || null;
    const eventId = event.id || `${id}:legacy-event:${match.events.indexOf(event)}`;
    describe('buildup', side, passer, { receiverId: actor });
    describe('shot', side, actor, { keeperId, assistId: event.assistId || null, outcome: event.type === 'goal' ? 'goal' : 'wide', eventId,
      illustrative: event.type !== 'goal' });
    if (event.type === 'goal') {
      score[side] += 1;
      describe('goal', side, actor, { keeperId, assistId: event.assistId || null, outcome: 'goal', eventId, illustrative: false, scoreAfter: { ...score } });
    }
  }
  match.presentation = { id, minute: match.minute, legacy: true, possessionSide, scoreBefore, scoreAfter: { home: match.homeGoals, away: match.awayGoals }, onPitch, sequences };
}

function tick(match) {
  match.minute += 1;
  const minute = match.minute;
  const legacyOnPitch = match.modelVersion === 1 ? Object.fromEntries(['home', 'away'].map((side) => [side,
    match[sideKey(side, 'Lineup')].filter((id) => !match.injuredIds.includes(id))])) : null;
  const homePower = power(match, 'home');
  const awayPower = power(match, 'away');
  const rates = {
    home: clamp((match.fixture.national || match.fixture.neutral ? 1.3 : 1.48) * Math.exp((homePower.attack - awayPower.defense) / 30), 0.15, 5.5),
    away: clamp((match.fixture.neutral ? 1.3 : 1.14) * Math.exp((awayPower.attack - homePower.defense) / 30), 0.12, 5),
  };
  if (match.modelVersion >= 2) playPossession(match, homePower, awayPower, rates);
  else {
    match.possessionTotal += clamp(50 + (homePower.attack - awayPower.attack) * 0.6, 27, 73);
    match.stats.possessionHome = Math.round(match.possessionTotal / minute);
  }
  for (const side of ['home', 'away']) {
    const cap = side === 'home' ? 'Home' : 'Away';
    const ids = match[sideKey(side, 'Lineup')].filter((id) => !match.injuredIds.includes(id));
    const rate = rates[side];
    match.stats[`xg${cap}`] += rate / 90;
    const random = createStream(match.seed, match.year, match.fixture.id, 'live-minute', minute, side);
    const shot = match.modelVersion === 1 && random() < rate * 5 / 90;
    if (shot) {
      match.stats[`shots${cap}`] += 1;
      if (random() < 0.2 && ids.length) {
        const scorer = pickWeighted(random, ids, (id) => ({ GK: 0.01, DF: 0.55, MF: 1.9, FW: 4.8 }[match.players[id].position]) * (match.players[id].rating / 60) ** 2);
        const assistant = random() < 0.74 ? pickWeighted(random, ids.filter((id) => id !== scorer), (id) => ({ GK: 0.02, DF: 0.6, MF: 3, FW: 2 }[match.players[id].position])) : null;
        match[`${side}Goals`] += 1;
        for (const id of match[sideKey(other(side), 'Lineup')].filter((id) => !match.injuredIds.includes(id))) match.goalsAgainstWhileOnPitch[id] = (match.goalsAgainstWhileOnPitch[id] || 0) + 1;
        match.events.push({ minute, type: 'goal', side, playerId: scorer, assistId: assistant, text: `¡Gol de ${match.players[scorer].name}!${assistant ? ` Asistencia de ${match.players[assistant].name}.` : ''}` });
      } else match.events.push({ minute, type: 'chance', side, text: 'Ocasión que termina sin gol.' });
    }
    const pressing = match[sideKey(side, 'Tactics')].pressing;
    for (const id of ids) {
      const player = match.players[id];
      match.minutes[id] = (match.minutes[id] || 0) + 1;
      const loss = (player.position === 'GK' ? 11 : 24 + Math.max(0, player.age - 30) * 0.5) / 90;
      const tacticalCost = match.modelVersion >= 3 && player.position !== 'GK' ? tacticalEffort(match[sideKey(side, 'Tactics')], {
        hasBall: match.presentation.possessionSide === side,
        recentLoss: match.lastTurnover?.lostSide === side && match.lastTurnover.minute >= minute - 1,
        counter: match.presentation.sequences.some((seq) => seq.side === side && seq.kind === 'counter'),
      }) : 1;
      match.condition[id] = clamp(match.condition[id] - loss * (pressing === 'high' ? 1.3 : pressing === 'low' ? 0.8 : 1) * tacticalCost, 10, 100);
      const injuryRandom = createStream(match.seed, match.year, match.fixture.id, 'live-injury', minute, id);
      const health = { ...player.health, condition: match.condition[id], minutesLast7Days: player.health.minutesLast7Days + match.minutes[id] };
      if (minute < match.duration && injuryRandom() < injuryProbability(player, health) / 90) {
        const injury = sampleInjury(injuryRandom);
        match.injuries[id] = injury; match.injuredIds.push(id);
        match.events.push({ minute, type: 'injury', side, playerId: id, injury, text: `${player.name} abandona por ${injury.name.toLowerCase()}. Baja estimada: ${injury.daysRemaining} días.` });
        if (side === match.ownSide && !match.autoSubstitutions) match.pausedFor = 'injury';
        else automaticReplacement(match, side, id, true);
      }
    }
    if ([64, 76].includes(minute) && !(side === match.ownSide && !match.autoSubstitutions)) {
      const eligible = match[sideKey(side, 'Lineup')].filter((id) => !match.injuredIds.includes(id) && match[sideKey(side, 'InitialLineup')].includes(id) && match.players[id].position !== 'GK');
      eligible.sort((a, b) => match.condition[a] - match.condition[b] || match.players[a].rating - match.players[b].rating);
      if (eligible[0]) automaticReplacement(match, side, eligible[0], false);
    }
  }
  if (minute === 45) { match.pausedFor = 'half-time'; match.events.push({ minute, type: 'half-time', text: 'Descanso. Puedes dar instrucciones y hacer cambios.' }); }
  if (minute === 90 && match.fixture.knockout && !regulationWinner(match) && !match.fixture.noExtraTime) {
    match.duration = 120; match.pausedFor = 'extra-time';
    match.events.push({ minute, type: 'extra-time', text: 'Empate: se juega la prórroga.' });
  } else if (minute >= match.duration) finalWhistle(match);
  if (legacyOnPitch) presentLegacyMinute(match, legacyOnPitch);
}

/** No future event is calculated or stored. Per-minute streams make chunk size irrelevant. */
export function advanceLiveMatch(current, minutes = 15, ignorePauses = false) {
  const next = copy(current);
  next.pausedFor = null;
  const target = Math.min(120, next.minute + Math.max(1, Math.floor(minutes)));
  while (!next.complete && next.minute < target) {
    if (ignorePauses) next.pausedFor = null;
    tick(next);
    if (next.pausedFor && !ignorePauses) break;
  }
  return expose(next);
}

export function liveMatchReport(match) {
  return { fixture: match.fixture, homeGoals: match.homeGoals, awayGoals: match.awayGoals, winnerId: match.winnerId,
    penalties: match.penalties, duration: match.minute, events: match.events,
    homeLineup: match.homeInitialLineup, awayLineup: match.awayInitialLineup,
    homeParticipants: match.homeUsed.filter((id) => (match.minutes[id] || 0) > 0), awayParticipants: match.awayUsed.filter((id) => (match.minutes[id] || 0) > 0),
    minutes: { ...match.minutes }, conditionAfter: Object.fromEntries(Object.keys(match.minutes).map((id) => [id, +match.condition[id].toFixed(1)])),
    goalsAgainstWhileOnPitch: { ...match.goalsAgainstWhileOnPitch }, actions: match.actions,
    xgHome: +match.stats.xgHome.toFixed(2), xgAway: +match.stats.xgAway.toFixed(2), shotsHome: match.stats.shotsHome,
    shotsAway: match.stats.shotsAway, possessionHome: match.stats.possessionHome,
    ...(match.presentation ? { modelVersion: match.modelVersion, minute: match.minute, presentation: match.presentation,
      stats: { ...match.stats }, ownSide: match.ownSide, homeTactics: { ...match.homeTactics }, awayTactics: { ...match.awayTactics },
      homeInitialLineup: match.homeInitialLineup, awayInitialLineup: match.awayInitialLineup,
      homeFinalLineup: match.homeLineup.slice(), awayFinalLineup: match.awayLineup.slice(), injuredIds: match.injuredIds.slice() } : {}) };
}

/** Import the already observed prefix from a pre-interactive save. */
export function importLegacyMatchPrefix(current, report, minute) {
  const next = copy(current);
  next.minute = minute; next.legacyMinute = minute;
  next.duration = minute >= 90 ? 120 : 90;
  next.events = report.events.filter((event) => event.minute <= minute && event.type !== 'full-time');
  next.homeGoals = next.events.filter((event) => event.type === 'goal' && event.side === 'home').length;
  next.awayGoals = next.events.filter((event) => event.type === 'goal' && event.side === 'away').length;
  for (const side of ['home', 'away']) {
    const initial = report[sideKey(side, 'Lineup')];
    next[sideKey(side, 'Lineup')] = initial.slice(); next[sideKey(side, 'InitialLineup')] = initial.slice(); next[sideKey(side, 'Used')] = initial.slice();
    for (const event of next.events.filter((entry) => entry.type === 'substitution' && entry.side === side)) {
      if (!next.players[event.playerInId]) throw new Error('El suplente de la partida anterior no está disponible.');
      const index = next[sideKey(side, 'Lineup')].indexOf(event.playerOutId);
      next[sideKey(side, 'Lineup')].splice(index, 1, event.playerInId);
      next[sideKey(side, 'Bench')] = next[sideKey(side, 'Bench')].filter((id) => id !== event.playerInId);
      next[sideKey(side, 'Used')].push(event.playerInId); next.substitutions[side] += 1;
    }
    for (const id of next[sideKey(side, 'Used')]) {
      const start = initial.includes(id) ? 0 : next.events.find((event) => event.type === 'substitution' && event.playerInId === id).minute;
      const exit = next.events.find((event) => (event.type === 'substitution' && event.playerOutId === id) || (event.type === 'injury' && event.playerId === id));
      const end = exit?.minute ?? minute;
      next.minutes[id] = Math.max(0, end - start);
      next.condition[id] = matchHealth(next.players[id], next.players[id].health, next.minutes[id], next.fixture.date).condition;
      next.goalsAgainstWhileOnPitch[id] = next.events.filter((event) => event.type === 'goal' && event.side !== side && event.minute >= start && (exit ? event.minute < end : event.minute <= end)).length;
    }
  }
  for (const event of next.events.filter((entry) => entry.type === 'injury')) {
    next.injuries[event.playerId] = event.injury; next.injuredIds.push(event.playerId);
    next.homeLineup = next.homeLineup.filter((id) => id !== event.playerId); next.awayLineup = next.awayLineup.filter((id) => id !== event.playerId);
  }
  next.stats = { shotsHome: next.homeGoals, shotsAway: next.awayGoals, xgHome: report.xgHome * minute / report.duration,
    xgAway: report.xgAway * minute / report.duration, possessionHome: report.possessionHome };
  next.possessionTotal = next.stats.possessionHome * minute;
  next.pausedFor = minute === 45 ? 'half-time' : minute === 90 ? 'extra-time' : null;
  // The aggregate archive assigns goals after its scheduled substitutions at
  // that minute. Its already reconstructed lineup is therefore the shot lineup.
  const onPitch = Object.fromEntries(['home', 'away'].map((side) => [side, next[sideKey(side, 'Lineup')].slice()]));
  presentLegacyMinute(next, onPitch);
  return expose(next);
}
