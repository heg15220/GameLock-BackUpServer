/**
 * Lossless columnar layout of a career for compact saves (codec 2).
 *
 * A career is mostly large maps of similar objects (players, clubs, fixtures,
 * news…). Each such collection is written as a table: one list of values per
 * field, plus the field order of every row ("shape"), so missing fields stay
 * missing and every object keeps its key order. Similar values end up next to
 * each other, which is what makes gzip effective. Squads reference players by
 * index and the fixture index by date is rebuilt, both only when the rebuilt
 * value is identical. Nothing depends on the roster archive version: a save
 * opens after any data update.
 */
const TABLE = '\u0001T';
const ARRAY = '\u0001A';
const MIN_ROWS = 24;
const forbidden = new Set(['__proto__', 'constructor', 'prototype']);
// Same slug as the roster archive (data.js) uses for player ids.
const slugOf = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const definedKeys = (value) => Object.keys(value).filter((key) => value[key] !== undefined);

function checkKey(key) { if (forbidden.has(key)) throw Error('invalid-save-key'); }

function encodeTable(rows) {
  const fields = new Map(); // field → column index
  const columns = [];
  const shapes = []; const shapeIndex = new Map(); const rowShapes = [];
  for (const row of rows) {
    const keys = definedKeys(row);
    const signature = keys.join('\u0000');
    let shape = shapeIndex.get(signature);
    if (shape === undefined) {
      shape = shapes.length; shapeIndex.set(signature, shape);
      shapes.push(keys.map((key) => {
        checkKey(key);
        if (!fields.has(key)) { fields.set(key, columns.length); columns.push([]); }
        return fields.get(key);
      }));
    }
    rowShapes.push(shape);
    for (const key of keys) columns[fields.get(key)].push(row[key]);
  }
  return {
    n: rows.length, f: [...fields.keys()], s: shapes, r: shapes.length === 1 ? 0 : rowShapes,
    c: columns.map((values) => encode(values)),
  };
}

export function encode(value) {
  if (Array.isArray(value)) {
    if (value.length >= MIN_ROWS && value.every(plain)) return [TABLE, 0, encodeTable(value)];
    const items = value.map((item) => encode(item === undefined ? null : item));
    return typeof items[0] === 'string' && items[0].startsWith('\u0001') ? [ARRAY, ...items] : items;
  }
  if (!plain(value)) return value;
  const keys = definedKeys(value);
  if (keys.length >= MIN_ROWS && keys.every((key) => plain(value[key]))) {
    keys.forEach(checkKey);
    const rows = keys.map((key) => value[key]);
    // Maps keyed by their rows' own id do not repeat the keys; the ids are
    // front-coded, or left out when they are the slug of the row's name.
    if (keys.every((key, i) => rows[i].id === key)) {
      let previous = '';
      const coded = rows.map((row) => {
        const id = row.id;
        let token;
        if (typeof row.name === 'string' && slugOf(row.name) === id) token = '';
        else {
          let common = 0;
          while (common < previous.length && common < id.length && previous[common] === id[common]) common += 1;
          token = `${common}:${id.slice(common)}`;
        }
        previous = id;
        return { ...row, id: token };
      });
      return [TABLE, 3, encodeTable(coded)];
    }
    return [TABLE, 1, keys, encodeTable(rows)];
  }
  const out = {};
  for (const key of keys) { checkKey(key); out[key] = encode(value[key]); }
  return out;
}

function decodeTable(table, budget, depth) {
  if (!plain(table) || !Array.isArray(table.f) || !Array.isArray(table.s) || !Array.isArray(table.c) || table.c.length !== table.f.length) throw Error('invalid-table');
  table.f.forEach((field) => { if (typeof field !== 'string') throw Error('invalid-table'); checkKey(field); });
  const columns = table.c.map((column) => decode(column, budget, depth + 1));
  if (columns.some((column) => !Array.isArray(column))) throw Error('invalid-table');
  const shapes = table.s.map((shape) => {
    if (!Array.isArray(shape) || shape.some((index) => !Number.isInteger(index) || index < 0 || index >= table.f.length)) throw Error('invalid-table');
    return shape;
  });
  const cursor = new Array(columns.length).fill(0);
  const count = table.n;
  if (!Number.isInteger(count) || count < 0 || count > 5000000 || (table.r !== 0 && (!Array.isArray(table.r) || table.r.length !== count))) throw Error('invalid-table');
  const rows = new Array(count);
  for (let i = 0; i < count; i += 1) {
    const shape = shapes[table.r === 0 ? 0 : table.r[i]];
    if (!shape) throw Error('invalid-table');
    const row = {};
    for (const index of shape) {
      if (cursor[index] >= columns[index].length) throw Error('invalid-table');
      row[table.f[index]] = columns[index][cursor[index]++];
    }
    rows[i] = row;
  }
  if (cursor.some((used, index) => used !== columns[index].length)) throw Error('invalid-table');
  budget.nodes += count;
  return rows;
}

export function decode(value, budget = { nodes: 0 }, depth = 0) {
  if ((budget.nodes += 1) > 15000000 || depth > 120) throw Error('save-too-complex');
  if (Array.isArray(value)) {
    if (value[0] === TABLE) {
      const [, kind] = value;
      if (kind === 0) return decodeTable(value[2], budget, depth);
      if (kind === 3) {
        const rows = decodeTable(value[2], budget, depth);
        const out = {};
        let previous = '';
        for (const row of rows) {
          if (typeof row.id !== 'string') throw Error('invalid-table');
          if (row.id === '') {
            if (typeof row.name !== 'string') throw Error('invalid-table');
            row.id = slugOf(row.name);
          } else {
            const colon = row.id.indexOf(':');
            const common = Number(row.id.slice(0, colon));
            if (colon < 1 || !Number.isInteger(common) || common > previous.length) throw Error('invalid-table');
            row.id = previous.slice(0, common) + row.id.slice(colon + 1);
          }
          checkKey(row.id);
          if (Object.hasOwn(out, row.id)) throw Error('invalid-table');
          previous = row.id;
          out[row.id] = row;
        }
        return out;
      }
      if (kind === 1) {
        const keys = value[2]; const rows = decodeTable(value[3], budget, depth);
        if (!Array.isArray(keys) || keys.length !== rows.length) throw Error('invalid-table');
        const out = {};
        keys.forEach((key, i) => { if (typeof key !== 'string') throw Error('invalid-table'); checkKey(key); out[key] = rows[i]; });
        return out;
      }
      throw Error('invalid-table');
    }
    const items = value[0] === ARRAY ? value.slice(1) : value;
    return items.map((item) => decode(item, budget, depth + 1));
  }
  if (plain(value)) {
    const out = {};
    for (const key of Object.keys(value)) { checkKey(key); out[key] = decode(value[key], budget, depth + 1); }
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw Error('invalid-value');
  return value;
}

const sameList = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);

function rebuildByDate(fixtures) {
  const byDate = {};
  for (const fixture of Object.values(fixtures)) (byDate[fixture.date] ||= []).push(fixture.id);
  return byDate;
}

/** Plain JSON for a career, before compression. */
export function compactCareer(career) {
  const world = career.world;
  const playerKeys = Object.keys(world.players);
  const playerIndex = new Map(playerKeys.map((id, i) => [id, i]));
  const squadsByIndex = Object.values(world.clubs).every((club) => Array.isArray(club.playerIds) && club.playerIds.every((id) => playerIndex.has(id)));
  const clubs = squadsByIndex
    ? Object.fromEntries(Object.entries(world.clubs).map(([id, club]) => [id, { ...club, playerIds: club.playerIds.map((pid) => playerIndex.get(pid)) }]))
    : world.clubs;
  // Attributes sit close to the overall rating: storing the difference halves their entropy.
  const relativeAttrs = Object.values(world.players).every((p) => Number.isInteger(p.ovr) && (p.attrs === undefined || (plain(p.attrs) && Object.values(p.attrs).every(Number.isInteger))));
  const players = relativeAttrs
    ? Object.fromEntries(Object.entries(world.players).map(([id, p]) => [id, p.attrs ? { ...p, attrs: Object.fromEntries(Object.entries(p.attrs).map(([k, v]) => [k, v - p.ovr])) } : p]))
    : world.players;
  const season = career.season;
  const rebuilt = season?.fixtures && season.byDate ? rebuildByDate(season.fixtures) : null;
  const byDateDerived = Boolean(rebuilt) && sameList(Object.keys(rebuilt), Object.keys(season.byDate))
    && Object.keys(rebuilt).every((date) => sameList(rebuilt[date], season.byDate[date]));
  // When the index cannot be rebuilt as is, it still references fixtures by position.
  const fixtureKeys = season?.fixtures ? Object.keys(season.fixtures) : [];
  const fixtureIndex = new Map(fixtureKeys.map((id, i) => [id, i]));
  const byDateIndexed = !byDateDerived && season?.byDate && Object.values(season.byDate).every((ids) => Array.isArray(ids) && ids.every((id) => fixtureIndex.has(id)));
  const compacted = {
    ...career,
    world: { ...world, players, clubs },
    ...(season ? { season: byDateDerived ? { ...season, byDate: undefined }
      : byDateIndexed ? { ...season, byDate: Object.fromEntries(Object.entries(season.byDate).map(([date, ids]) => [date, ids.map((id) => fixtureIndex.get(id))])) } : season } : {}),
  };
  return { squads: squadsByIndex ? 'index' : 'id', attrs: relativeAttrs ? 'relative' : 'absolute', byDate: byDateDerived ? 'derived' : byDateIndexed ? 'indexed' : 'stored', ...(byDateDerived ? { seasonKeys: Object.keys(season) } : {}), career: encode(compacted) };
}

/** Inverse of compactCareer. Structural validation happens afterwards. */
export function expandCareer(data) {
  if (!plain(data) || !['index', 'id'].includes(data.squads) || !['derived', 'indexed', 'stored'].includes(data.byDate)) throw Error('invalid-codec');
  const career = decode(data.career);
  if (!plain(career?.world) || !plain(career.world.players) || !plain(career.world.clubs)) throw Error('invalid-world');
  if (data.attrs === 'relative') {
    for (const player of Object.values(career.world.players)) {
      if (player.attrs === undefined) continue;
      if (!plain(player.attrs) || !Number.isInteger(player.ovr)) throw Error('invalid-player');
      for (const key of Object.keys(player.attrs)) player.attrs[key] += player.ovr;
    }
  } else if (data.attrs !== undefined && data.attrs !== 'absolute') throw Error('invalid-codec');
  if (data.squads === 'index') {
    const keys = Object.keys(career.world.players);
    for (const club of Object.values(career.world.clubs)) {
      if (!Array.isArray(club.playerIds)) throw Error('invalid-club');
      club.playerIds = club.playerIds.map((index) => {
        if (!Number.isInteger(index) || index < 0 || index >= keys.length) throw Error('invalid-club');
        return keys[index];
      });
    }
  }
  if (data.byDate === 'indexed') {
    if (!plain(career.season?.byDate) || !plain(career.season.fixtures)) throw Error('invalid-season');
    const keys = Object.keys(career.season.fixtures);
    for (const [date, list] of Object.entries(career.season.byDate)) {
      if (!Array.isArray(list)) throw Error('invalid-season');
      career.season.byDate[date] = list.map((index) => {
        if (!Number.isInteger(index) || index < 0 || index >= keys.length) throw Error('invalid-season');
        return keys[index];
      });
    }
  }
  if (data.byDate === 'derived') {
    if (!plain(career.season) || !plain(career.season.fixtures)) throw Error('invalid-season');
    // Restore the key where it stood, so the career is identical to the one saved.
    const { byDate: _ignored, ...rest } = career.season;
    const order = data.seasonKeys;
    career.season = { ...rest, byDate: rebuildByDate(career.season.fixtures) };
    if (Array.isArray(order) && order.every((key) => typeof key === 'string' && !forbidden.has(key))) career.season = Object.fromEntries(order.filter((key) => key in career.season).map((key) => [key, career.season[key]]));
  }
  return career;
}
