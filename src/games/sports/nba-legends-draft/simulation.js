// Draft de Leyendas NBA — motor de simulación de partido. El cerebro del juego.
// Puro y con RNG semilleable: resuelve el partido por POSESIONES comparando los
// atributos del atacante contra la defensa rival mediante probabilidad ponderada,
// con rebote, pérdidas, tapones, tiros libres y rotación/fatiga del banquillo.
// Produce marcador, box score por jugador y un play-by-play estructurado.

import { makeRng, weightedPick, pick } from "./rng.js";

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const logistic = (x) => 1 / (1 + Math.exp(-x));

// ─── Constantes del modelo ────────────────────────────────────────────────────
const BASE_POSSESSIONS = 96; // por equipo; se le suma ruido
const POSSESSION_NOISE = 17;
const OT_POSSESSIONS = 9; // por equipo en la prórroga
const MAX_PUTBACKS = 3; // segundas oportunidades por posesión (evita bucles)

const FATIGUE_UP = 0.011; // sube por posesión en pista
const FATIGUE_DOWN = 0.022; // baja al descansar en el banquillo
const FATIGUE_PENALTY = 0.16; // recorte de rendimiento por fatiga máxima
const STARTER_BONUS = 6; // ventaja de los titulares para mantener la pista

// ─── Utilidades de atributos ──────────────────────────────────────────────────
function effAttr(card, attr, fatigue) {
  const f = fatigue[card.id] || 0;
  return card.attrs[attr] * (1 - FATIGUE_PENALTY * f);
}

function usageWeight(card) {
  return card.attrs.anotacion + 0.3 * card.attrs.pase + 0.2 * card.overall;
}

function ftProbOf(card) {
  // Invierte el atributo tiroLibre (≈ 30 + FT%·68) a probabilidad.
  return clamp((card.attrs.tiroLibre - 30) / 68, 0.4, 0.95);
}

function threeTendency(card) {
  const base = (card.attrs.tiro3 - 45) / 220;
  const roleBias = card.role === "BASE" || card.role === "ESCOLTA" ? 0.14
    : card.role === "ALERO" ? 0.1
    : card.role === "ALA_PIVOT" ? 0.05
    : 0.02;
  return clamp(0.14 + base + roleBias, 0.03, 0.62);
}

// ─── Runtime por equipo ───────────────────────────────────────────────────────
function initBox(card) {
  return {
    id: card.id, name: card.name, role: card.role, overall: card.overall,
    min: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
    oreb: 0, dreb: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, onCourt: 0,
  };
}

function makeTeamRT(team) {
  const players = [
    ...team.starters.map((card) => ({ card, starter: true })),
    ...(team.bench || []).map((card) => ({ card, starter: false })),
  ];
  const fatigue = {};
  const box = {};
  for (const p of players) {
    fatigue[p.card.id] = 0;
    box[p.card.id] = initBox(p.card);
  }
  return { team, players, fatigue, box, score: 0 };
}

function onCourt(rt) {
  return rt.players
    .map((p) => ({
      card: p.card,
      s: p.card.overall + (p.starter ? STARTER_BONUS : 0) - 45 * rt.fatigue[p.card.id],
    }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 5)
    .map((o) => o.card);
}

function tickFatigue(rt, court) {
  const onIds = new Set(court.map((c) => c.id));
  for (const p of rt.players) {
    const id = p.card.id;
    if (onIds.has(id)) {
      rt.fatigue[id] = Math.min(1, rt.fatigue[id] + FATIGUE_UP);
      rt.box[id].onCourt += 1;
    } else {
      rt.fatigue[id] = Math.max(0, rt.fatigue[id] - FATIGUE_DOWN);
    }
  }
}

function teamDefense(court, fatigue) {
  const perim = mean(court.map((c) => effAttr(c, "defExterior", fatigue)));
  const intMean = mean(court.map((c) => effAttr(c, "defInterior", fatigue)));
  const intMax = Math.max(...court.map((c) => effAttr(c, "defInterior", fatigue)));
  const reb = mean(court.map((c) => effAttr(c, "rebote", fatigue)));
  return { perim, interior: 0.5 * intMean + 0.5 * intMax, reb };
}

function makeProb(attack, defense, base, spread, lo, hi) {
  return clamp(base + spread * (logistic((attack - defense) / 12) - 0.5), lo, hi);
}

// ─── Resolución de una posesión ───────────────────────────────────────────────
// Devuelve los puntos anotados y actualiza box scores + eventos.
function playPossession(offRt, defRt, rng, ctx) {
  const offCourt = onCourt(offRt);
  const defCourt = onCourt(defRt);
  tickFatigue(offRt, offCourt);
  tickFatigue(defRt, defCourt);

  const def = teamDefense(defCourt, defRt.fatigue);
  const offReb = mean(offCourt.map((c) => effAttr(c, "rebote", offRt.fatigue)));

  let points = 0;
  let live = true;
  let putbacks = 0;

  while (live) {
    const shooter = weightedPick(rng, offCourt, usageWeight);
    const sbox = offRt.box[shooter.id];

    // Pérdida de balón.
    const pTO = clamp(0.12 + (def.perim - effAttr(shooter, "pase", offRt.fatigue)) / 500, 0.06, 0.22);
    if (rng() < pTO) {
      sbox.tov += 1;
      if (rng() < 0.55) {
        const thief = weightedPick(rng, defCourt, (c) => c.attrs.defExterior);
        defRt.box[thief.id].stl += 1;
        emit(ctx, defRt, thief, "steal", 0);
      }
      break;
    }

    const is3 = rng() < threeTendency(shooter);

    // Falta de tiro → a la línea (no cuenta como intento de campo).
    const pFoul = is3 ? 0.03 : 0.11;
    if (rng() < pFoul) {
      const nft = is3 ? 3 : 2;
      const p = ftProbOf(shooter);
      let made = 0;
      for (let i = 0; i < nft; i++) if (rng() < p) made += 1;
      sbox.fta += nft;
      sbox.ftm += made;
      sbox.pts += made;
      points += made;
      offRt.score += made;
      if (made > 0) emit(ctx, offRt, shooter, "ft", made);
      break;
    }

    // Intento de campo.
    sbox.fga += 1;
    if (is3) sbox.tpa += 1;

    // Tapón (solo en tiros de 2).
    if (!is3) {
      const pBlock = clamp((def.interior - 50) / 360, 0.02, 0.15);
      if (rng() < pBlock) {
        const blocker = weightedPick(rng, defCourt, (c) => c.attrs.defInterior);
        defRt.box[blocker.id].blk += 1;
        emit(ctx, defRt, blocker, "block", 0);
        if (!rebound(offCourt, defCourt, offRt, defRt, rng, offReb, def.reb, ctx, putbacks)) break;
        putbacks += 1;
        if (putbacks > MAX_PUTBACKS) break;
        continue;
      }
    }

    const p = is3
      ? makeProb(effAttr(shooter, "tiro3", offRt.fatigue), def.perim, 0.35, 0.26, 0.24, 0.46)
      : makeProb(effAttr(shooter, "anotacion", offRt.fatigue), def.interior, 0.485, 0.3, 0.3, 0.66);

    if (rng() < p) {
      const val = is3 ? 3 : 2;
      sbox.fgm += 1;
      if (is3) sbox.tpm += 1;
      sbox.pts += val;
      points += val;
      offRt.score += val;
      let assistName = null;
      const pAst = is3 ? 0.85 : 0.55;
      const mates = offCourt.filter((c) => c.id !== shooter.id);
      if (mates.length && rng() < pAst) {
        const passer = weightedPick(rng, mates, (c) => c.attrs.pase);
        offRt.box[passer.id].ast += 1;
        assistName = passer.name;
      }
      emit(ctx, offRt, shooter, is3 ? "make3" : "make2", val, assistName);
      break;
    }

    // Fallo: rebote.
    if (!rebound(offCourt, defCourt, offRt, defRt, rng, offReb, def.reb, ctx, putbacks)) break;
    putbacks += 1;
    if (putbacks > MAX_PUTBACKS) break;
  }

  return points;
}

// Resuelve el rebote tras un fallo. Devuelve true si el ataque coge rebote
// ofensivo (sigue la posesión), false si el rebote es defensivo (posesión acaba).
function rebound(offCourt, defCourt, offRt, defRt, rng, offReb, defReb, ctx, putbacks) {
  const pOReb = clamp(0.26 + (offReb - defReb) / 500 - putbacks * 0.05, 0.1, 0.42);
  if (rng() < pOReb) {
    const r = weightedPick(rng, offCourt, (c) => c.attrs.rebote);
    offRt.box[r.id].oreb += 1;
    offRt.box[r.id].reb += 1;
    return true;
  }
  const r = weightedPick(rng, defCourt, (c) => c.attrs.rebote);
  defRt.box[r.id].dreb += 1;
  defRt.box[r.id].reb += 1;
  return false;
}

// ─── Play-by-play ─────────────────────────────────────────────────────────────
function emit(ctx, rt, actor, kind, points, assistName = null) {
  if (!ctx.wantEvents) return;
  ctx.events.push({
    period: ctx.period,
    clock: ctx.clock,
    team: rt === ctx.rtA ? "A" : "B",
    teamName: rt.team.name,
    actor: actor.name,
    kind,
    points,
    assist: assistName,
    sa: ctx.rtA.score,
    sb: ctx.rtB.score,
  });
}

// Reloj descendente falso dentro del periodo, a partir del progreso de posesiones.
function formatClock(idxInPeriod, perPeriod) {
  const frac = clamp(idxInPeriod / perPeriod, 0, 1);
  const secs = Math.round((1 - frac) * 12 * 60);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Partido completo ─────────────────────────────────────────────────────────
export function simulateGame(teamA, teamB, { seed = 1, wantEvents = true } = {}) {
  const rng = makeRng(seed >>> 0);
  const rtA = makeTeamRT(teamA);
  const rtB = makeTeamRT(teamB);

  const perTeam = BASE_POSSESSIONS + Math.floor(rng() * POSSESSION_NOISE);
  const ctx = { events: [], wantEvents, rtA, rtB, period: 1, clock: "12:00" };

  const runPeriods = (numPeriods, perPeriodPoss, startPeriod) => {
    for (let q = 0; q < numPeriods; q++) {
      ctx.period = startPeriod + q;
      for (let i = 0; i < perPeriodPoss; i++) {
        ctx.clock = formatClock(i, perPeriodPoss);
        playPossession(rtA, rtB, rng, ctx);
        playPossession(rtB, rtA, rng, ctx);
      }
      if (wantEvents) {
        ctx.events.push({
          period: ctx.period, clock: "0:00", team: null, kind: "period",
          sa: rtA.score, sb: rtB.score,
        });
      }
    }
  };

  const perQuarter = Math.round(perTeam / 4);
  runPeriods(4, perQuarter, 1);

  // Prórrogas hasta desempatar (los playoffs no admiten empate).
  let ot = 0;
  while (rtA.score === rtB.score) {
    ot += 1;
    runPeriods(1, OT_POSSESSIONS, 4 + ot);
    if (ot > 10) break; // salvaguarda
  }

  const totalPoss = 2 * (perQuarter * 4 + ot * OT_POSSESSIONS);
  finalizeBox(rtA, totalPoss);
  finalizeBox(rtB, totalPoss);

  return {
    scoreA: rtA.score,
    scoreB: rtB.score,
    winner: rtA.score > rtB.score ? "A" : "B",
    overtimes: ot,
    possessions: perQuarter * 4,
    box: {
      A: sortBox(rtA),
      B: sortBox(rtB),
    },
    events: ctx.events,
  };
}

function finalizeBox(rt, totalPoss) {
  for (const p of rt.players) {
    const b = rt.box[p.card.id];
    b.min = Math.round((b.onCourt / totalPoss) * 48 * 10) / 10;
  }
}

function sortBox(rt) {
  return rt.players
    .map((p) => rt.box[p.card.id])
    .sort((a, b) => b.pts - a.pts);
}

// Simulación rápida sin play-by-play (para partidos/series que el usuario no ve).
export function quickResult(teamA, teamB, seed) {
  const r = simulateGame(teamA, teamB, { seed, wantEvents: false });
  return { scoreA: r.scoreA, scoreB: r.scoreB, winner: r.winner };
}
