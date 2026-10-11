import { createStream } from '../trayectoria/rng.js';
import { addDays, daysBetween, getPlayerHealth } from './health.js';
import { getPlayerAge } from './player-age.js';
import { getRecruitmentFinances } from './transfer-market.js';

export const SCOUT_LEVELS = Object.freeze([
  { id: 'local', label: 'Local', experience: 1, judgment: 1, costPerDay: 1200 },
  { id: 'professional', label: 'Profesional', experience: 3, judgment: 3, costPerDay: 4000 },
  { id: 'elite', label: 'Élite', experience: 5, judgment: 5, costPerDay: 10000 },
]);
const fail = (state, message) => ({ ...state, lastError: message });
const finite = (value) => Number.isFinite(value) && value >= 0;
const validDate = (date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date));

export function startScouting(state, action) {
  const level = SCOUT_LEVELS.find((entry) => entry.id === (action.level || 'professional'));
  const duration = Number(action.duration || 30);
  const filters = { country: action.country && action.country !== 'all' ? String(action.country) : null,
    minAge: Number(action.minAge || 16), maxAge: Number(action.maxAge || (action.focus === 'first-team' ? 34 : 21)),
    position: action.position && action.position !== 'all' ? action.position : null,
    maxValue: action.maxValue === undefined || action.maxValue === '' ? null : Number(action.maxValue), focus: action.focus || 'prospect' };
  if (!level || ![14, 30, 60].includes(duration) || !Number.isInteger(filters.minAge) || !Number.isInteger(filters.maxAge)
    || filters.minAge < 16 || filters.maxAge > 45 || filters.maxAge < filters.minAge || (filters.position && !['GK', 'DF', 'MF', 'FW'].includes(filters.position))
    || (filters.maxValue !== null && !finite(filters.maxValue)) || !['prospect', 'first-team'].includes(filters.focus)) return fail(state, 'Selecciona nivel, duración y filtros válidos para la misión.');
  if ((state.scoutMissions || []).filter((mission) => mission.status === 'active').length >= 3) return fail(state, 'La red admite hasta tres misiones activas.');
  const cost = level.costPerDay * duration;
  if (cost > getRecruitmentFinances(state).availableBudget) return fail(state, 'No hay presupuesto libre para esta misión después de los fichajes reservados.');
  const seen = new Set([...(state.scoutReports || []).filter((report) => !report.missionId || report.stage === 'complete').map((report) => report.playerId),
    ...(state.scoutMissions || []).filter((mission) => mission.status === 'active').flatMap((mission) => mission.candidateIds)]);
  const candidates = state.world.players.filter((player) => !player.retired && !player.emergency && player.clubId !== state.clubId && !seen.has(player.id)
    && getPlayerAge(player, state.date, state.year) >= filters.minAge && getPlayerAge(player, state.date, state.year) <= filters.maxAge
    && (!filters.country || player.nationality === filters.country) && (!filters.position || player.position === filters.position)
    && (filters.maxValue === null || player.value <= filters.maxValue));
  if (!candidates.length) return fail(state, 'No hay jugadores disponibles que cumplan esos filtros.');
  const id = `mission:${state.date}:${state.scoutingSerial || 0}`;
  const random = createStream(state.seed, id, 'scouting-v2');
  const candidateIds = candidates.map((player) => ({ id: player.id, score: (filters.focus === 'prospect' ? player.potential * 0.65 + player.rating * 0.35 : player.rating)
    + random() * (22 - level.experience * 2) })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 3 + level.experience).map((entry) => entry.id);
  const mission = { id, level: level.id, experience: level.experience, judgment: level.judgment, filters, cost,
    startDate: state.date, endDate: addDays(state.date, duration), duration, status: 'active', progress: 0, discoveredCount: 0, candidateIds };
  return { ...state, lastError: null, scoutingSerial: (state.scoutingSerial || 0) + 1, scoutMissions: [...(state.scoutMissions || []), mission].slice(-30),
    finances: { ...state.finances, budget: state.finances.budget - cost, spent: state.finances.spent + cost },
    news: [{ id, type: 'scout', text: `Misión de ojeo contratada hasta ${mission.endDate}. Coste total: ${cost.toLocaleString('es-ES')} €; los informes llegarán por etapas.` }, ...state.news].slice(0, 30) };
}

export function progressScouting(state) {
  if (!(state.scoutMissions || []).some((mission) => mission.status === 'active')) return state;
  const players = new Map(state.world.players.map((player) => [player.id, player]));
  const reports = new Map((state.scoutReports || []).map((report) => [report.playerId, report]));
  const ownRating = state.world.clubs.find((club) => club.id === state.clubId).rating;
  const ownSquad = state.world.players.filter((player) => player.clubId === state.clubId && !player.retired);
  const formation = state.tactics.formation === '4-2-3-1' ? [4, 5, 1] : state.tactics.formation.split('-').map(Number);
  const needed = { GK: 1, DF: formation[0], MF: formation[1], FW: formation[2] };
  const scoutMissions = state.scoutMissions.map((mission) => {
    if (mission.status !== 'active') return mission;
    const reportDate = state.date < mission.endDate ? state.date : mission.endDate;
    const reportState = reportDate === state.date ? state : { ...state, date: reportDate };
    const elapsed = Math.min(mission.duration, Math.max(0, daysBetween(mission.startDate, state.date)));
    const progress = Math.min(100, Math.floor(elapsed / mission.duration * 100));
    const interval = Math.max(2, 5 - mission.experience);
    const discoveredCount = Math.min(mission.candidateIds.length, Math.floor(elapsed / interval));
    for (const [i, id] of mission.candidateIds.slice(0, discoveredCount).entries()) {
      const player = players.get(id);
      if (!player || player.retired) continue;
      const reportProgress = progress === 100 ? 100 : Math.min(99, Math.floor(Math.max(0, elapsed - (i + 1) * interval + 1) / Math.max(1, mission.duration - (i + 1) * interval + 1) * 100));
      const uncertainty = Math.max(1, Math.round((12 - mission.judgment) * (1 - reportProgress / 125)));
      const stage = reportProgress >= 100 ? 'complete' : reportProgress >= 65 ? 'financial' : reportProgress >= 35 ? 'potential' : 'fit';
      const spread = Math.max(0.08, (0.5 - mission.judgment * 0.055) * (1 - reportProgress / 140));
      const peers = ownSquad.filter((entry) => entry.position === player.position);
      const healthyCount = peers.filter((entry) => getPlayerHealth(reportState, entry).available).length;
      const depthNeeded = healthyCount < needed[player.position] + 1;
      const improves = !peers.length || player.rating > Math.max(...peers.map((entry) => entry.rating));
      const fitSummary = `${state.tactics.formation}: ${needed[player.position]} plazas titulares de ${player.position} y ${healthyCount} jugadores disponibles. ${improves ? 'Mejoraría la calidad actual en esa posición.' : depthNeeded ? 'Aporta una alternativa en una posición con poca cobertura.' : 'Competiría por una posición ya cubierta.'}`;
      const injury = getPlayerHealth(reportState, player).injury;
      reports.set(id, { id: `${mission.id}:${id}`, missionId: mission.id, playerId: id, scoutedYear: state.year, updatedDate: reportDate,
        stage, progress: reportProgress, cost: i === 0 ? mission.cost : 0, ratingMin: Math.max(1, player.rating - uncertainty), ratingMax: Math.min(99, player.rating + uncertainty),
        potentialMin: Math.max(player.rating, player.potential - uncertainty), potentialMax: Math.min(99, player.potential + uncertainty),
        valueMin: Math.round(player.value * (1 - spread)), valueMax: Math.round(player.value * (1 + spread)), wageEstimate: Math.round(player.wage * 1.2),
        confidence: reportProgress === 100 ? 'Informe completo · valoración del ojeador' : 'Informe en curso · valoración provisional',
        fitSummary, riskSummary: injury ? `Baja actual: ${injury.daysRemaining} días estimados.` : 'Sin lesión activa en la fecha del informe.',
        financialSummary: ['financial', 'complete'].includes(stage) ? `Valor estimado ${Math.round(player.value * (1 - spread)).toLocaleString('es-ES')}–${Math.round(player.value * (1 + spread)).toLocaleString('es-ES')} €; sueldo orientativo ${Math.round(player.wage * 1.2).toLocaleString('es-ES')} €/semana.` : null,
        recommendation: player.rating >= ownRating - 5 ? 'Puede ayudar al primer equipo' : 'Proyecto para desarrollar', real: player.real, age: getPlayerAge(player, reportDate, state.year) });
    }
    return { ...mission, progress, discoveredCount, status: progress >= 100 ? 'complete' : 'active' };
  });
  return { ...state, scoutMissions, scoutReports: [...reports.values()].slice(-200) };
}

export function cancelScouting(state, { missionId }) {
  if (!(state.scoutMissions || []).some((mission) => mission.id === missionId && mission.status === 'active')) return fail(state, 'Esa misión no está activa.');
  return { ...state, lastError: null, scoutMissions: state.scoutMissions.map((mission) => mission.id === missionId ? { ...mission, status: 'cancelled', cancelledDate: state.date } : mission) };
}

export function toggleShortlist(state, { playerId }) {
  const player = state.world.players.find((entry) => entry.id === playerId);
  if (!player || player.retired || player.emergency) return fail(state, 'Ese jugador no está disponible para seguimiento.');
  const current = state.shortlist || [];
  if (!current.includes(playerId) && current.length >= 200) return fail(state, 'La lista de seguimiento admite hasta 200 jugadores.');
  return { ...state, lastError: null, shortlist: current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId] };
}

export function validateScoutingState(state) {
  const ids = new Set(state.world.players.map((player) => player.id));
  if (!Array.isArray(state.shortlist) || state.shortlist.length > 200 || new Set(state.shortlist).size !== state.shortlist.length || state.shortlist.some((id) => !ids.has(id))) throw new Error('La lista de seguimiento no es válida.');
  if (!Array.isArray(state.scoutMissions) || state.scoutMissions.length > 30 || state.scoutMissions.filter((mission) => mission.status === 'active').length > 3
    || state.scoutMissions.some((mission) => !mission || typeof mission.id !== 'string' || !SCOUT_LEVELS.some((level) => level.id === mission.level)
      || !['active', 'complete', 'cancelled'].includes(mission.status) || !validDate(mission.startDate) || !validDate(mission.endDate) || mission.endDate < mission.startDate
      || ![14, 30, 60].includes(mission.duration) || !finite(mission.cost) || !finite(mission.progress) || mission.progress > 100
      || !Number.isInteger(mission.experience) || mission.experience < 1 || mission.experience > 5 || !Number.isInteger(mission.judgment) || mission.judgment < 1 || mission.judgment > 5
      || !Array.isArray(mission.candidateIds) || mission.candidateIds.length > 8 || mission.candidateIds.some((id) => !ids.has(id)))) throw new Error('Las misiones de ojeo no son válidas.');
  if (!Number.isInteger(state.scoutingSerial) || state.scoutingSerial < 0) throw new Error('La secuencia de ojeo no es válida.');
  // Completed reports can outlive the bounded mission history.
  if (state.scoutReports.some((report) => report.missionId && (typeof report.missionId !== 'string'
    || !['fit', 'potential', 'financial', 'complete'].includes(report.stage) || !finite(report.progress) || report.progress > 100 || !validDate(report.updatedDate)))) throw new Error('El progreso de los informes no es válido.');
}
