/**
 * Guardado y transferencia entre dispositivos (§15).
 *
 * In an eight-hour game this stops being a convenience and becomes a condition of
 * existence: nobody finishes a campaign in the browser they started it in. You begin on the
 * laptop and carry on with the phone on the bus, or the other way round.
 *
 * THE MECHANISM IS VALLE TRANQUILO'S, and its four compression techniques are lifted
 * wholesale because they are the ones that work (§15.2):
 *
 *  1. DIFF AGAINST A CLEAN BASE, not a dump. `applyCode` resets to a clean new game and
 *     then lays the snapshot on top, so anything still at its default costs nothing.
 *  2. ONE-LETTER KEYS AND INDEX TABLES. A dossier is `[9,42,[[3,7,4]]]`, not sixty bytes
 *     of `{"expedientes":{"sabater":{"interes":42}}}`.
 *  3. OMIT WHAT IS EMPTY. A chapter-2 save produces a tiny code that grows with the campaign.
 *  4. FLAG SETS AS INDEX LISTS, never objects full of booleans.
 *
 * TWO THINGS VALLE TRANQUILO DOES NOT HAVE, AND THIS NEEDS. Its save is one slot and it has
 * no checksum — `VT1.` plus `[1,2].includes(payload.v)` is the whole validation. Neither is
 * good enough for a campaign this long: §15.1 asks for three slots so the player can compare
 * two routes, and §15.3 asks that a badly pasted code cannot silently destroy eight hours.
 * So both are written here, new.
 *
 * WHY A SNAPSHOT AND NOT A REPLAY (§15.5). FULGOR is deterministic under its seed, so the
 * campaign could be *reproduced* from the seed plus the decision list, and the code would be
 * far shorter. It is rejected because a replayer is fragile against any balance change: touch
 * one row of `tables.js` and every code exported until then reproduces a different campaign
 * from the one the player actually lived — and sometimes an impossible one. A snapshot
 * describes the state and survives rebalancing.
 */

import { hashSeed } from "./rng.js";
import {
  AFFINITIES,
  BLOCKS,
  CLUE_TYPES,
  DIFFICULTY_MODES,
  DISTRICTS,
  DOSSIERS,
  MATERIALS,
  OUTCOMES,
  STATS,
  STARTING_TECHNIQUES,
  START_STATS,
  SUIT_GENERATION_ORDER,
  SUIT_SLOTS,
  TECHNIQUES,
} from "./tables.js";
import { CHAPTER_LIST } from "./story.js";

/* ── Formato ─────────────────────────────────────────────────────────────────────── */

export const SAVE_PREFIX = "FG";
export const SAVE_VERSION = 1;
export const CODE_PREFIX = `${SAVE_PREFIX}${SAVE_VERSION}.`;
export const STORAGE_KEY = "fulgor:save";
export const SLOTS = 3;
/** §15.2's budget. `save.test.js` measures a synthetic end-of-campaign state against it. */
export const CODE_BUDGET = 1400;

/* ── Tablas de índices ───────────────────────────────────────────────────────────── */

/**
 * Every identifier travels as its position in an ordered table. These lists are APPEND-ONLY:
 * inserting in the middle silently reinterprets every code ever exported, which is the one
 * way this system can corrupt a save without anybody noticing. New entries go at the end.
 */
export const SAVE_DOSSIER_KEYS = Object.keys(DOSSIERS);
export const SAVE_TECHNIQUE_KEYS = Object.keys(TECHNIQUES);
export const SAVE_DISTRICT_KEYS = Object.keys(DISTRICTS);
export const SAVE_STAT_KEYS = [...STATS];
export const SAVE_MATERIAL_KEYS = [...MATERIALS];
export const SAVE_SLOT_KEYS = [...SUIT_SLOTS];
export const SAVE_GENERATION_KEYS = [...SUIT_GENERATION_ORDER];
export const SAVE_AFFINITY_KEYS = [...AFFINITIES];
export const SAVE_CLUE_KEYS = [...CLUE_TYPES];
export const SAVE_OUTCOME_KEYS = [...OUTCOMES];
export const SAVE_MENTOR_KEYS = ["requena", "vigia", "yusuf"];
export const SAVE_VILLAIN_KEYS = ["tasador", "hierro", "larga", "cero"];

/** Derived from `story.js` rather than written twice: a flag list that drifts is a bug factory. */
export const SAVE_FLAG_KEYS = (() => {
  const seen = [];
  for (const c of CHAPTER_LIST) for (const f of c.escribe) if (!seen.includes(f)) seen.push(f);
  return seen;
})();

/**
 * Clue origins. A clue's exact runtime id is not saved — §15.2's own advice about dropping
 * resolved historical detail applies here: what a dossier needs on reload is which KINDS of
 * evidence it holds and where each came from, not the session-local string that deduplicated
 * it. Ids are regenerated deterministically on import.
 */
export const SAVE_ORIGIN_KEYS = [
  "llaveAlmacen", "descargaIncendio", "manosQuemadas", "ausenciaTarde", "camaraConcha",
  "fragmento.mascara", "fragmento.torso", "fragmento.guantes",
  "fragmento.botas", "fragmento.cinturon", "fragmento.manto",
];

/* ── Conjuntos densos: mapas de bits ─────────────────────────────────────────────── */

/**
 * §15.2's fourth technique is "flag sets travel as index lists, not objects full of
 * booleans", and it is right — but only while the set is sparse. By chapter 12 the player
 * has all forty techniques and every story flag, and `[0,1,2,…,39]` is a hundred and ten
 * characters of JSON describing "all of them".
 *
 * MEASURED, NOT ASSUMED: with index lists an end-of-campaign code came out at 1463
 * characters, over the 1400 budget. A bitmap in base36 says the same thing in eight. This
 * is the same idea one step further, applied only where the set is dense — dossiers and
 * bonds stay as pairs, because those are genuinely sparse and carry values.
 */
export function packBits(indices = []) {
  let bits = 0n;
  for (const i of indices) {
    if (i >= 0) bits |= 1n << BigInt(i);
  }
  return bits === 0n ? "" : bits.toString(36);
}

export function unpackBits(text, list = []) {
  if (!text) return [];
  let bits;
  try {
    bits = BigInt(`0x${BigInt(parseIntBase36(text)).toString(16)}`);
  } catch {
    return [];
  }
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    if ((bits >> BigInt(i)) & 1n) out.push(list[i]);
  }
  return out;
}

/** BigInt has no base-36 parser, so one is written here rather than losing precision via Number. */
function parseIntBase36(text) {
  let value = 0n;
  for (const ch of String(text)) {
    const digit = parseInt(ch, 36);
    if (Number.isNaN(digit)) return 0n;
    value = value * 36n + BigInt(digit);
  }
  return value;
}

/* ── base64url ───────────────────────────────────────────────────────────────────── */

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = typeof btoa === "function"
    ? btoa(binary)
    : Buffer.from(bytes).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code) {
  const base64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  if (typeof atob === "function") {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(padded, "base64").toString("utf8");
}

/** Short checksum, base36. Its job is to catch a truncation or a one-character mangling. */
export function checksum(text) {
  return hashSeed(text).toString(36);
}

/* ── Empaquetado ─────────────────────────────────────────────────────────────────── */

const idx = (list, key) => list.indexOf(key);
const keyAt = (list, i) => list[i];

/**
 * The whole campaign, compressed. The shape is positional and undocumented on purpose —
 * the documentation is this function and its inverse, sitting next to each other, which is
 * the only arrangement that survives a rename.
 */
export function buildPayload(state) {
  const { calendario, progreso, sospecha, vinculos, traje, dificultad, banderas, mentores, villanos } = state;

  const payload = {
    v: SAVE_VERSION,
    g: [
      calendario.capitulo,
      calendario.dia,
      calendario.bloque,
      progreso.nivel,
      progreso.xp,
      progreso.puntosLibres,
      progreso.rango,
      progreso.dinero,
      Math.max(0, DIFFICULTY_MODES.indexOf(dificultad)),
      calendario.nochesSeguidas,
      calendario.interrupcionesCapitulo,
    ],
  };

  // Regla 1 del §15.2 aplicada de verdad: sólo viaja lo que se ha desviado de una partida
  // nueva. Las estadísticas van como diferencia contra START_STATS, así que un héroe recién
  // creado no gasta un solo carácter en describirse.
  const statDelta = SAVE_STAT_KEYS.map((k) => (progreso.stats[k] ?? 0) - (START_STATS[k] ?? 0));
  if (statDelta.some((n) => n !== 0)) payload.s = statDelta;

  // Expedientes abiertos: [idx, interes, [[tipoIdx, origenIdx, capitulo], …]]
  const abiertos = Object.values(sospecha.abiertos)
    .map((d) => {
      const pistas = d.pistas.map((p) => [
        idx(SAVE_CLUE_KEYS, p.tipo),
        idx(SAVE_ORIGIN_KEYS, p.origen),
        p.capitulo ?? 0,
      ]);
      const interes = Math.round(d.interes);
      const base = DOSSIERS[d.id].interesSuelo;
      // Un expediente en su estado de fábrica no ocupa nada.
      if (!pistas.length && interes === base) return null;
      return [idx(SAVE_DOSSIER_KEYS, d.id), interes, pistas];
    })
    .filter(Boolean);

  // Cerrados: sólo desenlace y capítulo. La lista de pistas ya no hace nada (§15.2).
  const cerrados = Object.entries(sospecha.cerrados).map(([id, c]) => [
    idx(SAVE_DOSSIER_KEYS, id),
    idx(SAVE_OUTCOME_KEYS, c.desenlace),
    c.capitulo,
  ]);

  const vinculosPares = Object.entries(vinculos.vinculos)
    .filter(([id, v]) => v !== DOSSIERS[id]?.vinculoInicial)
    .map(([id, v]) => [idx(SAVE_DOSSIER_KEYS, id), v]);

  // Densos → mapa de bits. Las técnicas equipadas siguen siendo una lista porque su ORDEN
  // es la asignación de ranura y un mapa de bits lo perdería.
  // Lo mismo con el libro de técnicas y las afinidades: sólo lo aprendido POR ENCIMA de lo
  // que trae toda partida nueva. Al leer se vuelve a unir con el arranque.
  const tecnicas = packBits(
    progreso.aprendidas.filter((t) => !STARTING_TECHNIQUES.includes(t)).map((t) => idx(SAVE_TECHNIQUE_KEYS, t)),
  );
  const equipadas = progreso.equipadas.map((t) => idx(SAVE_TECHNIQUE_KEYS, t)).filter((i) => i >= 0);
  const afinidades = packBits(
    progreso.afinidades.filter((a) => a !== "rayo").map((a) => idx(SAVE_AFFINITY_KEYS, a)),
  );
  const materiales = SAVE_MATERIAL_KEYS.map((m) => progreso.materiales[m] ?? 0);
  const entrenamientos = Object.entries(progreso.entrenamientos ?? {})
    .map(([d, n]) => [idx(SAVE_DISTRICT_KEYS, d), n])
    .filter(([i]) => i >= 0);
  const flags = packBits([...(banderas ?? [])].map((f) => idx(SAVE_FLAG_KEYS, f)));
  const mentoresIdx = packBits((mentores ?? []).map((m) => idx(SAVE_MENTOR_KEYS, m)));
  const villanosIdx = packBits((villanos ?? []).map((v) => idx(SAVE_VILLAIN_KEYS, v)));

  if (abiertos.length) payload.e = abiertos;
  if (cerrados.length) payload.c = cerrados;
  if (vinculosPares.length) payload.b = vinculosPares;
  if (tecnicas) payload.t = tecnicas;
  const equipadasPorDefecto = STARTING_TECHNIQUES.slice(0, 6).map((t) => idx(SAVE_TECHNIQUE_KEYS, t));
  if (equipadas.length && equipadas.join() !== equipadasPorDefecto.join()) payload.q = equipadas;
  if (afinidades) payload.a = afinidades;
  if (materiales.some((n) => n > 0)) payload.m = materiales;
  if (entrenamientos.length) payload.n = entrenamientos;
  if (flags) payload.h = flags;
  if (mentoresIdx) payload.w = mentoresIdx;
  if (villanosIdx) payload.x = villanosIdx;
  if (traje) {
    payload.j = [
      idx(SAVE_GENERATION_KEYS, traje.generacion),
      ...SAVE_SLOT_KEYS.map((s) => Math.round(traje.piezas[s]?.integridad ?? 0)),
    ];
  }
  return payload;
}

/** Turns a payload back into the parts `game.js` needs to lay over a clean state. */
export function readPayload(payload) {
  const g = payload.g ?? [];
  const out = {
    capitulo: g[0] ?? 1,
    dia: g[1] ?? 1,
    bloque: g[2] ?? 0,
    nivel: g[3] ?? 1,
    xp: g[4] ?? 0,
    puntosLibres: g[5] ?? 0,
    rango: g[6] ?? 0,
    dinero: g[7] ?? 0,
    dificultad: DIFFICULTY_MODES[g[8] ?? 1] ?? "medio",
    nochesSeguidas: g[9] ?? 0,
    interrupcionesCapitulo: g[10] ?? 0,
    stats: {},
    abiertos: [],
    cerrados: [],
    vinculos: [],
    aprendidas: [],
    equipadas: [],
    afinidades: [],
    materiales: {},
    entrenamientos: {},
    banderas: [],
    mentores: [],
    villanos: [],
    traje: null,
  };

  // El lector devuelve valores ABSOLUTOS: quien llama recibe un estado, no una diferencia.
  SAVE_STAT_KEYS.forEach((k, i) => { out.stats[k] = (START_STATS[k] ?? 0) + (payload.s?.[i] ?? 0); });
  SAVE_MATERIAL_KEYS.forEach((m, i) => { out.materiales[m] = payload.m?.[i] ?? 0; });

  for (const [i, interes, pistas] of payload.e ?? []) {
    const id = keyAt(SAVE_DOSSIER_KEYS, i);
    if (!id) continue;
    out.abiertos.push({
      id,
      interes,
      pistas: (pistas ?? []).map(([t, o, cap], n) => {
        const tipo = keyAt(SAVE_CLUE_KEYS, t) ?? "testimonial";
        const origen = keyAt(SAVE_ORIGIN_KEYS, o) ?? "descargaIncendio";
        // El id se regenera de forma determinista: sólo servía para no duplicar en sesión.
        return { id: `${tipo}:${origen}:${id}:${n}`, tipo, origen, capitulo: cap, dia: 0 };
      }),
    });
  }

  for (const [i, d, cap] of payload.c ?? []) {
    const id = keyAt(SAVE_DOSSIER_KEYS, i);
    if (id) out.cerrados.push({ id, desenlace: keyAt(SAVE_OUTCOME_KEYS, d) ?? "aliado", capitulo: cap });
  }
  for (const [i, v] of payload.b ?? []) {
    const id = keyAt(SAVE_DOSSIER_KEYS, i);
    if (id) out.vinculos.push([id, v]);
  }
  out.aprendidas = [...new Set([...STARTING_TECHNIQUES, ...unpackBits(payload.t, SAVE_TECHNIQUE_KEYS)])];
  out.afinidades = [...new Set(["rayo", ...unpackBits(payload.a, SAVE_AFFINITY_KEYS)])];
  out.banderas = unpackBits(payload.h, SAVE_FLAG_KEYS);
  out.mentores = unpackBits(payload.w, SAVE_MENTOR_KEYS);
  out.villanos = unpackBits(payload.x, SAVE_VILLAIN_KEYS);
  // El equipamiento sí es una lista: su orden ES la asignación de las seis ranuras.
  if (payload.q) {
    for (const i of payload.q) { const t = keyAt(SAVE_TECHNIQUE_KEYS, i); if (t) out.equipadas.push(t); }
  } else {
    out.equipadas = STARTING_TECHNIQUES.slice(0, 6);
  }
  for (const [i, n] of payload.n ?? []) { const d = keyAt(SAVE_DISTRICT_KEYS, i); if (d) out.entrenamientos[d] = n; }

  if (payload.j) {
    const [gen, ...integridades] = payload.j;
    const generacion = keyAt(SAVE_GENERATION_KEYS, gen) ?? "improvisado";
    out.traje = {
      generacion,
      piezas: Object.fromEntries(
        SAVE_SLOT_KEYS.map((s, i) => [s, { slot: s, generacion, integridad: integridades[i] ?? 0 }]),
      ),
    };
  }
  return out;
}

/* ── El código ───────────────────────────────────────────────────────────────────── */

export function encodeCode(state) {
  const payload = buildPayload(state);
  const json = JSON.stringify(payload);
  const body = toBase64Url(json);
  const code = `${CODE_PREFIX}${body}.${checksum(body)}`;
  return { code, payload, json, caracteres: code.length };
}

/**
 * Decoding refuses rather than half-importing. §15.3: a badly pasted code must not quietly
 * destroy eight hours of play, so a truncation, a changed character or a code from another
 * game all come back as a named reason and never as a partial state.
 */
export function decodeCode(raw) {
  const texto = String(raw ?? "").trim().replace(/\s+/g, "");
  if (!texto) return { ok: false, motivo: "vacio" };

  const marca = texto.slice(0, SAVE_PREFIX.length);
  if (marca !== SAVE_PREFIX) return { ok: false, motivo: "otroJuego" };

  const punto = texto.indexOf(".");
  if (punto < 0) return { ok: false, motivo: "danado" };

  const version = Number(texto.slice(SAVE_PREFIX.length, punto));
  if (!Number.isFinite(version) || version < 1) return { ok: false, motivo: "danado" };
  if (version > SAVE_VERSION) return { ok: false, motivo: "versionFutura" };

  const resto = texto.slice(punto + 1);
  const corte = resto.lastIndexOf(".");
  if (corte < 0) return { ok: false, motivo: "danado" };

  const body = resto.slice(0, corte);
  const suma = resto.slice(corte + 1);
  if (!body || checksum(body) !== suma) return { ok: false, motivo: "danado" };

  let payload;
  try {
    payload = JSON.parse(fromBase64Url(body));
  } catch {
    return { ok: false, motivo: "danado" };
  }
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.g)) {
    return { ok: false, motivo: "danado" };
  }

  return { ok: true, payload: migrate(payload, version), version };
}

/* ── Migraciones ─────────────────────────────────────────────────────────────────── */

/**
 * From day one, even with nothing to migrate yet (§14.2). A save representing eight hours,
 * broken by a format change, is the worst way there is to lose a player — so the ladder
 * exists before it is needed and every step is exercised by `save.test.js` against a code
 * exported by the previous version.
 *
 * The rule when the format changes: OLD CODES MIGRATE, THEY ARE NEVER REJECTED.
 */
export const MIGRATIONS = {
  // 1 → 2 goes here when it exists. Each entry takes a payload at v(n) and returns v(n+1).
};

export function migrate(payload, desde = payload.v ?? 1) {
  let actual = { ...payload };
  for (let v = desde; v < SAVE_VERSION; v += 1) {
    const paso = MIGRATIONS[v];
    if (!paso) break;
    actual = paso(actual);
    actual.v = v + 1;
  }
  return actual;
}

/* ── localStorage: tres ranuras ──────────────────────────────────────────────────── */

const slotKey = (n) => `${STORAGE_KEY}:${n}`;

function safeStorage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readSlot(n) {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(slotKey(n));
    if (!raw) return null;
    const guardado = JSON.parse(raw);
    return { ...guardado, payload: migrate(guardado.payload, guardado.payload?.v ?? 1) };
  } catch {
    return null;
  }
}

export function writeSlot(n, state, meta = {}) {
  const store = safeStorage();
  if (!store) return null;
  try {
    const payload = buildPayload(state);
    const registro = {
      payload,
      guardadoEn: meta.ahora ?? 0,
      capitulo: state.calendario.capitulo,
      dia: state.calendario.dia,
      dificultad: state.dificultad,
    };
    store.setItem(slotKey(n), JSON.stringify(registro));
    return registro;
  } catch {
    return null;
  }
}

export function clearSlot(n) {
  const store = safeStorage();
  if (!store) return false;
  try {
    store.removeItem(slotKey(n));
    return true;
  } catch {
    return false;
  }
}

/** What the save screen lists: three rows, empty ones included so the shape never jumps. */
export function listSlots() {
  return Array.from({ length: SLOTS }, (_, i) => {
    const guardado = readSlot(i);
    return guardado
      ? { n: i, vacia: false, capitulo: guardado.capitulo, dia: guardado.dia, dificultad: guardado.dificultad, guardadoEn: guardado.guardadoEn }
      : { n: i, vacia: true };
  });
}

export function firstFreeSlot() {
  return listSlots().find((s) => s.vacia)?.n ?? null;
}

/* ── Autoguardado con rebote ─────────────────────────────────────────────────────── */

/**
 * Valle Tranquilo's `queueAutosave(320)` with its `SAVE_SUSPENDED` flag, for the same reason
 * and with more of it: saving mid-transition there left a half state, and saving in the
 * middle of a duel here would leave a hero with the Carga already spent and the roll not yet
 * made. The suspension is not an optimisation — it is what makes the autosave safe.
 */
export function createAutosaver(guardar, { retardo = 320 } = {}) {
  let timer = null;
  let suspendido = false;

  return {
    suspender() { suspendido = true; },
    reanudar() { suspendido = false; },
    get suspendido() { return suspendido; },
    encolar(state, meta) {
      if (suspendido) return false;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; guardar(state, meta); }, retardo);
      return true;
    },
    ahora(state, meta) {
      if (suspendido) return false;
      if (timer) { clearTimeout(timer); timer = null; }
      guardar(state, meta);
      return true;
    },
    cancelar() { if (timer) { clearTimeout(timer); timer = null; } },
  };
}
