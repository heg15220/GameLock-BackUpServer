/**
 * Inbox (messages that may need a decision) and news (what the world is
 * talking about). Both store a kind and parameters, never sentences: the
 * interface writes them in plain language in the player's language.
 */
import { hash01 } from './util.js';

export function addInbox(career, item) {
  const id = `msg-${career.serial.inbox += 1}`;
  career.inbox.unshift({ id, date: career.date, read: false, ...item });
  if (career.inbox.length > 160) career.inbox.length = 160;
  if (item.stop) career.flags.stops = [...(career.flags.stops || []), { kind: item.kind, id }];
  return id;
}

export function addNews(career, item) {
  const id = `news-${career.serial.news += 1}`;
  const weight = item.kind === 'trophy' || item.kind === 'signing' ? 3 : item.kind === 'match' ? 1.6 : 1;
  const likes = Math.round((200 + hash01(career.seed, id) * 4800) * weight * (1 + (career.world.clubs[career.clubId]?.rep ?? 1) * 0.6));
  const comments = Math.round(likes * (0.015 + hash01(id, 'c') * 0.03));
  career.news.unshift({ id, date: career.date, likes, comments, ...item });
  if (career.news.length > 140) career.news.length = 140;
  return id;
}

export function markRead(career, id) {
  const item = career.inbox.find((entry) => entry.id === id);
  if (item) item.read = true;
}

export function unreadCount(career) {
  return career.inbox.filter((entry) => !entry.read).length;
}
