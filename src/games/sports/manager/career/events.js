/**
 * Press conferences and dressing-room moments (FC 27: fewer, tied to what
 * just happened, two answers and no right one). Each option changes morale,
 * board confidence or the fans' mood.
 */
import { createStream, clamp, weighted, addDays } from './util.js';
import { clubSquad } from './world.js';
import { addInbox } from './inbox.js';
import { listPlayer, openRenewal, contractYearsLeft } from './transfers.js';

const EFFECTS = {
  'press-big-win': { a: { team: 2, fans: 1 }, b: { team: 4, fans: 3, board: -1 } },
  'press-bad-run': { a: { board: 3, team: 1 }, b: { team: -3, board: 1, fans: 1 } },
  'press-trophy': { a: { fans: 6 }, b: { team: 5 } },
  'press-elimination': { a: { board: 2, team: -1 }, b: { team: 2, board: -2 } },
  'press-derby-win': { a: { fans: 5, team: 1 }, b: { team: 3, fans: 2 } },
  'press-derby-loss': { a: { fans: 2, board: 1 }, b: { team: -2, board: 2 } },
  'unhappy-minutes': { a: { player: 15, promise: true }, b: { player: -12, team: 1 } },
  'late-training': { a: { player: -8, team: 1 }, b: { player: 3, team: -1 } },
  'dressing-conflict': { a: { player: 5, other: -10 }, b: { player: -3, other: -3, team: 1 } },
  'wants-renewal': { a: { renew: true, player: 4 }, b: { player: -12 } },
  'wants-out': { a: { list: true, player: 6 }, b: { player: -16 } },
  'fans-protest': { a: { fans: 8, board: -1 }, b: { fans: -4 } },
};

export function addEvent(career, kind, params = {}) {
  if (career.events.some((event) => !event.resolved && event.kind === kind)) return null;
  const event = { id: `ev-${career.serial.events += 1}`, kind, date: career.date, params, resolved: null };
  career.events.unshift(event);
  if (career.events.length > 60) career.events.length = 60;
  addInbox(career, { kind: 'event', event: event.id, eventKind: kind, stop: true, ...params });
  return event;
}

export function resolveEvent(career, eventId, option) {
  const event = career.events.find((e) => e.id === eventId);
  if (!event || event.resolved) return { error: 'closed' };
  const effect = EFFECTS[event.kind]?.[option];
  if (!effect) return { error: 'invalid' };
  event.resolved = option;
  const squad = clubSquad(career.world, career.clubId);
  if (effect.team) for (const p of squad) p.morale = clamp((p.morale ?? 65) + effect.team, 0, 100);
  const player = career.world.players[event.params.player];
  if (effect.player && player) player.morale = clamp((player.morale ?? 65) + effect.player, 0, 100);
  const otherPlayer = career.world.players[event.params.other];
  if (effect.other && otherPlayer) otherPlayer.morale = clamp((otherPlayer.morale ?? 65) + effect.other, 0, 100);
  if (effect.board) career.board.confidence = clamp(career.board.confidence + effect.board, 0, 100);
  if (effect.fans) career.fans = clamp((career.fans ?? 65) + effect.fans, 0, 100);
  if (effect.promise && player) career.promises.push({ player: player.id, until: addDays(career.date, 35), minutes: (player.stats?.mins || 0) + 180 });
  if (effect.list && player) listPlayer(career, player.id, 'sale');
  let negotiation = null;
  if (effect.renew && player) negotiation = openRenewal(career, player.id).negotiation || null;
  return { event, negotiation };
}

/** After an own match: maybe a press conference. */
export function pressAfterMatch(career, fixture, ownGoals, rivalGoals) {
  const random = createStream(career.seed, 'press', fixture.id);
  const recent = career.recentResults.slice(-3);
  const rivalId = fixture.home === career.clubId ? fixture.away : fixture.home;
  const derby = career.world.clubs[rivalId]?.country === career.world.clubs[career.clubId].country
    && Math.abs((career.world.clubs[rivalId]?.rep ?? 0) - career.world.clubs[career.clubId].rep) <= 1
    && career.world.clubs[rivalId]?.leagueId === career.world.clubs[career.clubId].leagueId && career.world.clubs[rivalId]?.rep >= 3;
  if (derby && random() < 0.6) return addEvent(career, ownGoals > rivalGoals ? 'press-derby-win' : ownGoals < rivalGoals ? 'press-derby-loss' : 'press-big-win', { rival: rivalId, score: `${ownGoals}-${rivalGoals}` });
  if (ownGoals - rivalGoals >= 3 && random() < 0.4) return addEvent(career, 'press-big-win', { rival: rivalId, score: `${ownGoals}-${rivalGoals}` });
  if (recent.length === 3 && recent.every((r) => r === 'L') && random() < 0.7) return addEvent(career, 'press-bad-run', {});
  return null;
}

/** Monday mornings: something may be brewing in the dressing room. */
export function weeklyDressingRoom(career) {
  const random = createStream(career.seed, 'dressing', career.date);
  if (random() > 0.13) return null;
  const squad = clubSquad(career.world, career.clubId).filter((p) => !p.loan);
  if (squad.length < 12) return null;
  const sorted = squad.slice().sort((a, b) => b.ovr - a.ovr);
  const options = [];
  const benched = sorted.slice(0, 14).filter((p) => (p.stats?.apps || 0) >= 0 && (p.stats?.mins || 0) < 270 * Math.max(1, monthsPlayed(career)) * 0.35);
  if (benched.length && monthsPlayed(career) >= 2) options.push(['unhappy-minutes', { player: benched[0].id }, 3]);
  options.push(['late-training', { player: sorted[Math.floor(random() * sorted.length)].id }, 1.2]);
  if (sorted.length > 4) {
    const a = sorted[Math.floor(random() * 6)];
    const b = sorted[6 + Math.floor(random() * Math.max(1, sorted.length - 6))];
    if (a && b && a !== b) options.push(['dressing-conflict', { player: a.id, other: b.id }, 0.8]);
  }
  const expiring = sorted.slice(0, 11).find((p) => contractYearsLeft(career, p) <= 1 && !career.transfers.negotiations.some((n) => n.playerId === p.id && n.status !== 'failed'));
  if (expiring) options.push(['wants-renewal', { player: expiring.id }, 2]);
  const star = sorted[0];
  const bigger = Object.values(career.world.clubs).some((c) => c.rep > career.world.clubs[career.clubId].rep && !c.external);
  if (star && bigger && star.age <= 28 && random() < 0.4) options.push(['wants-out', { player: star.id }, 0.6]);
  if ((career.fans ?? 65) < 30) options.push(['fans-protest', {}, 2.5]);
  const [kind, params] = weighted(random, options, (o) => o[2]);
  return addEvent(career, kind, params);
}

function monthsPlayed(career) {
  const [y, m] = career.date.split('-').map(Number);
  return Math.max(0, (y - career.year) * 12 + m - 8);
}

/** Broken promises cost far more than they bought. */
export function checkPromises(career) {
  career.promises = career.promises.filter((promise) => {
    if (promise.until > career.date) return true;
    const p = career.world.players[promise.player];
    if (p && p.clubId === career.clubId && (p.stats?.mins || 0) < promise.minutes) {
      p.morale = clamp((p.morale ?? 60) - 25, 0, 100);
      addInbox(career, { kind: 'promise-broken', player: p.id });
    }
    return false;
  });
}
