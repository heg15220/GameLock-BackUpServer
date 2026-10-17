/**
 * Every sentence the player reads: news, inbox, negotiations, live commentary
 * and dressing-room moments. Plain, everyday language on purpose - the kind a
 * friend would use to tell you what happened. Spanish first, English second.
 */
import { hash01 } from '../career/util.js';
import { money, teamName, compName, stageLabel, posName, shortDate } from './format.js';
import { isNation } from '../career/competitions.js';

const pick = (list, ...seed) => list[Math.floor(hash01(...seed) * list.length)];
const P = (career, id) => career.world.players[id] || career.academy?.players?.find((p) => p.id === id) || career.academy?.prospects?.find((p) => p.id === id);
const pname = (career, id) => P(career, id)?.name || '—';
const surname = (name = '') => { const parts = name.split(' '); return parts.length > 1 ? parts.slice(1).join(' ') : name; };

export const L = {
  es: {
    roles: { star: 'Estrella', important: 'Importante', rotation: 'Rotación', backup: 'Suplente', prospect: 'Promesa' },
    roleHelp: { star: 'Juega casi siempre', important: 'Titular habitual', rotation: 'Juega a menudo', backup: 'Juega poco', prospect: 'Joven en formación' },
    fitness: { peak: 'En plena forma', good: 'Bien', low: 'Cansado', unfit: 'Agotado', injured: 'Lesionado' },
    morale: { 'very-high': 'Encantado', high: 'Contento', normal: 'Normal', low: 'Molesto', 'very-low': 'Muy molesto' },
    interest: { high: 'Muy interesado', medium: 'Se lo piensa', low: 'Poco interesado', none: 'No quiere venir' },
    tension: (v) => (v < 35 ? 'Ambiente tranquilo' : v < 70 ? 'Hay algo de tensión' : 'A punto de colgar'),
    training: { recovery: 'Descanso', balanced: 'Equilibrado', intensive: 'Intenso' },
    trainingHelp: { recovery: 'Recuperan más energía, mejoran algo menos.', balanced: 'Lo normal: recuperan y mejoran a buen ritmo.', intensive: 'Mejoran más rápido pero llegan más cansados.' },
    mentality: { 'very-defensive': 'Encerrarse', defensive: 'Defensiva', balanced: 'Equilibrada', attacking: 'Ofensiva', 'very-attacking': 'Todo al ataque' },
    pressing: { low: 'Esperar atrás', medium: 'Presión normal', high: 'Presión arriba' },
    tempo: { slow: 'Toque lento', normal: 'Ritmo normal', fast: 'Ritmo rápido' },
    stages: { 'summer-window': 'Mercado de verano', 'first-half': 'Primera vuelta', 'winter-window': 'Mercado de invierno', 'second-half': 'Segunda vuelta', international: 'Verano internacional', 'season-end': 'Fin de temporada' },
    stageHelp: {
      'summer-window': 'Ficha y vende antes del 31 de agosto. La liga empieza a mediados de agosto.',
      'first-half': 'El mercado está cerrado. Toca competir hasta el parón de Navidad.',
      'winter-window': 'Enero: el mercado vuelve a abrir durante un mes.',
      'second-half': 'Mercado cerrado. Se deciden la liga y las eliminatorias.',
      international: 'Las selecciones juegan su gran torneo del verano.',
      'season-end': 'La temporada ha terminado. Pronto empieza la siguiente.',
    },
    growth: { early: 'Madura pronto', standard: 'Normal', late: 'Tardío', steady: 'Constante', explosive: 'Explosivo', durable: 'Longevo' },
  },
  en: {
    roles: { star: 'Star', important: 'Important', rotation: 'Rotation', backup: 'Backup', prospect: 'Prospect' },
    roleHelp: { star: 'Plays almost every game', important: 'Regular starter', rotation: 'Plays often', backup: 'Plays little', prospect: 'Young, still developing' },
    fitness: { peak: 'Peak fitness', good: 'Good', low: 'Tired', unfit: 'Exhausted', injured: 'Injured' },
    morale: { 'very-high': 'Delighted', high: 'Happy', normal: 'Okay', low: 'Unhappy', 'very-low': 'Very unhappy' },
    interest: { high: 'Very interested', medium: 'Thinking about it', low: 'Not very keen', none: 'Not interested' },
    tension: (v) => (v < 35 ? 'Calm talks' : v < 70 ? 'Some tension' : 'About to hang up'),
    training: { recovery: 'Rest', balanced: 'Balanced', intensive: 'Intense' },
    trainingHelp: { recovery: 'More recovery, slightly slower growth.', balanced: 'Normal recovery and growth.', intensive: 'Faster growth, but players arrive more tired.' },
    mentality: { 'very-defensive': 'Park the bus', defensive: 'Defensive', balanced: 'Balanced', attacking: 'Attacking', 'very-attacking': 'All-out attack' },
    pressing: { low: 'Sit back', medium: 'Normal press', high: 'High press' },
    tempo: { slow: 'Slow build-up', normal: 'Normal tempo', fast: 'Fast tempo' },
    stages: { 'summer-window': 'Summer window', 'first-half': 'First half', 'winter-window': 'Winter window', 'second-half': 'Second half', international: 'International summer', 'season-end': 'Season end' },
    stageHelp: {
      'summer-window': 'Buy and sell before 31 August. The league starts in mid-August.',
      'first-half': 'The window is shut. Compete until the Christmas break.',
      'winter-window': 'January: the window reopens for a month.',
      'second-half': 'Window shut. Leagues and knockouts are decided.',
      international: 'National teams play their big summer tournament.',
      'season-end': 'The season is over. The next one is coming.',
    },
    growth: { early: 'Early bloomer', standard: 'Standard', late: 'Late bloomer', steady: 'Steady', explosive: 'Explosive', durable: 'Long-lasting' },
  },
};

/* ── News feed ── */

export function newsText(career, item, lang) {
  const es = lang === 'es';
  const team = (id, short) => teamName(career, id, lang, short);
  const fee = (value) => (value ? money(value, lang) : es ? 'gratis' : 'free');
  switch (item.kind) {
    case 'signing': return {
      source: 'club', title: es ? `¡${pname(career, item.player)} ya es nuestro!` : `${pname(career, item.player)} is ours!`,
      body: item.loan ? (es ? `Llega cedido desde el ${team(item.from)} hasta final de temporada.` : `Joins on loan from ${team(item.from)} until the end of the season.`)
        : es ? `Llega desde ${item.from ? `el ${team(item.from)}` : 'sin equipo'} por ${fee(item.fee)}. La afición ya se frota las manos.` : `Arrives from ${item.from ? team(item.from) : 'free agency'} for ${fee(item.fee)}. The fans are buzzing.`,
    };
    case 'renewal': return { source: 'club', title: es ? `${pname(career, item.player)} renueva` : `${pname(career, item.player)} signs a new deal`, body: es ? `Seguirá con nosotros hasta junio de ${item.until}.` : `He stays with us until June ${item.until}.` };
    case 'departure': return { source: 'club', title: es ? `${pname(career, item.player)} se despide` : `${pname(career, item.player)} says goodbye`, body: es ? `Se marcha al ${team(item.to)} por ${fee(item.fee)}.` : `Leaves for ${team(item.to)} for ${fee(item.fee)}.` };
    case 'loan-out': return { source: 'club', title: es ? `${pname(career, item.player)}, cedido` : `${pname(career, item.player)} loaned out`, body: es ? `Jugará esta temporada en el ${team(item.to)} para tener minutos.` : `Will play this season at ${team(item.to)} to get minutes.` };
    case 'ai-transfer': return {
      source: 'rumour', title: es ? `${pname(career, item.player)} ficha por el ${team(item.to, true)}` : `${pname(career, item.player)} joins ${team(item.to, true)}`,
      body: (es ? `El ${team(item.from)} lo vende por ${fee(item.fee)}.` : `${team(item.from)} sell him for ${fee(item.fee)}.`) + (item.shortlisted ? (es ? ' Estaba en tu lista de seguimiento.' : ' He was on your shortlist.') : ''),
    };
    case 'match': {
      const mine = item.side;
      const own = mine === 'home' ? item.hg : item.ag;
      const other = mine === 'home' ? item.ag : item.hg;
      const rival = mine === 'home' ? item.away : item.home;
      const comp = compName(career.season?.comps?.[item.comp], lang);
      const verdict = own > other ? (es ? pick(['Victoria trabajada', 'Tres puntos de oro', 'Gran noche', 'El equipo cumple'], item.fixture) : pick(['Hard-fought win', 'Three precious points', 'A great night', 'Job done'], item.fixture))
        : own < other ? (es ? pick(['Tropiezo', 'Noche para olvidar', 'Derrota dolorosa'], item.fixture) : pick(['A stumble', 'A night to forget', 'Painful defeat'], item.fixture))
          : (es ? pick(['Reparto de puntos', 'Empate con sabor agridulce'], item.fixture) : pick(['Points shared', 'A bittersweet draw'], item.fixture));
      const motm = item.motm ? (es ? ` Mejor jugador: ${pname(career, item.motm)}.` : ` Player of the match: ${pname(career, item.motm)}.`) : '';
      const pens = item.pens ? (es ? ` (penaltis ${item.pens.home}-${item.pens.away})` : ` (penalties ${item.pens.home}-${item.pens.away})`) : '';
      return { source: 'press', title: `${verdict}: ${team(item.home, true)} ${item.hg}-${item.ag} ${team(item.away, true)}${pens}`, body: (es ? `${comp}. Contra el ${team(rival)}.` : `${comp}. Against ${team(rival)}.`) + motm };
    }
    case 'trophy': {
      const comp = career.season?.comps?.[item.comp];
      return item.mine
        ? { source: 'club', title: es ? `¡CAMPEONES! ${compName(comp, lang)}` : `CHAMPIONS! ${compName(comp, lang)}`, body: es ? 'La ciudad está de fiesta. Un título que quedará para siempre en la historia.' : 'The city is partying. A title that will live forever.' }
        : { source: 'press', title: es ? `${team(item.winner)} gana ${withArticle(compName(comp, lang))}` : `${team(item.winner)} win the ${compName(comp, lang)}`, body: es ? 'Se acabó la competición con un nuevo campeón.' : 'The competition has a new champion.' };
    }
    case 'eliminated': {
      const comp = career.season?.comps?.[item.comp];
      return { source: 'press', title: es ? `Adiós a ${withArticle(compName(comp, lang))}` : `Out of the ${compName(comp, lang)}`, body: es ? `${team(item.team)} cae en ${stageLabel(item.stage, lang).toLowerCase()}.` : `${team(item.team)} go out in the ${stageLabel(item.stage, lang).toLowerCase()}.` };
    }
    case 'through-groups': return { source: 'press', title: es ? '¡Pasamos de fase!' : 'Through to the knockouts!', body: es ? `${team(item.team)} sigue vivo en ${compName(career.season?.comps?.[item.comp], lang)}.` : `${team(item.team)} are still alive in ${compName(career.season?.comps?.[item.comp], lang)}.` };
    case 'out-groups': return { source: 'press', title: es ? 'Eliminados en la fase de grupos' : 'Knocked out in the groups', body: es ? `${team(item.team)} se despide de ${compName(career.season?.comps?.[item.comp], lang)}.` : `${team(item.team)} are out of ${compName(career.season?.comps?.[item.comp], lang)}.` };
    case 'new-manager': return { source: 'press', title: es ? `${item.manager}, nuevo entrenador del ${team(item.club, true)}` : `${item.manager} takes charge of ${team(item.club, true)}`, body: es ? 'Llega con ilusión y un mensaje claro: «Vengo a ganar».' : 'He arrives with one clear message: "I am here to win".' };
    case 'national-job': return { source: 'press', title: es ? `${item.manager}, nuevo seleccionador de ${teamName(career, `N:${item.fifa}`, lang)}` : `${item.manager} named ${teamName(career, `N:${item.fifa}`, lang)} coach`, body: es ? 'Compaginará el banquillo de su club con el de la selección.' : 'He will combine the club job with the national team.' };
    case 'season-end': return { source: 'club', title: es ? `Temporada cerrada en el ${item.position}.º puesto` : `Season finished in position ${item.position}`, body: es ? 'Toca hacer balance con la directiva.' : 'Time to review the season with the board.' };
    case 'award': {
      const names = { ballon: es ? 'el Balón de Oro' : "the Ballon d'Or", boot: es ? 'la Bota de Oro' : 'the Golden Boot', glove: es ? 'el Guante de Oro' : 'the Golden Glove', young: es ? 'el premio al mejor joven' : 'the best young player award' };
      return { source: 'club', title: es ? `¡${pname(career, item.player)} gana ${names[item.award]}!` : `${pname(career, item.player)} wins ${names[item.award]}!`, body: es ? 'Un premio que también es del equipo.' : 'An award the whole squad shares.' };
    }
    case 'top-scorer': return { source: 'press', title: es ? `${pname(career, item.player)}, máximo goleador` : `${pname(career, item.player)} finishes top scorer`, body: es ? `${item.goals} goles en liga.` : `${item.goals} league goals.` };
    case 'club-prestige': return { source: 'club', title: es ? 'EL CLUB CRECE' : 'THE CLUB IS GROWING', body: es ? `Los resultados han disparado el prestigio de ${career.world.clubs[item.club]?.name}: más ingresos, más socios y más atractivo para los fichajes. Ya hablan de nosotros como un club de nivel ${item.rep} de 5.` : `Results have lifted ${career.world.clubs[item.club]?.name}'s standing: more income, more members, more pull in the market. We are now talked about as a level ${item.rep} of 5 club.` };
    case 'promoted': return { source: 'club', title: es ? '¡ASCENSO!' : 'PROMOTED!', body: es ? `La próxima temporada jugaremos en ${career.world.leagues[item.league]?.name}.` : `Next season we play in ${career.world.leagues[item.league]?.name}.` };
    case 'relegated': return { source: 'club', title: es ? 'Descenso' : 'Relegated', body: es ? `Toca levantarse: jugaremos en ${career.world.leagues[item.league]?.name}.` : `Time to bounce back: we will play in ${career.world.leagues[item.league]?.name}.` };
    case 'window-open': return { source: 'press', title: es ? '¡Arranca el mercado de verano!' : 'The summer window is open!', body: es ? 'Los clubes ya pueden fichar hasta el 31 de agosto.' : 'Clubs can sign players until 31 August.' };
    case 'sacked': return { source: 'press', title: es ? `El ${team(item.club, true)} destituye a ${item.manager || 'su entrenador'}` : `${team(item.club, true)} sack ${item.manager || 'their manager'}`, body: es ? 'La directiva ha perdido la paciencia.' : 'The board has run out of patience.' };
    default: return { source: 'press', title: item.kind, body: '' };
  }
}

/* ── Inbox ── */

export function inboxText(career, item, lang) {
  const es = lang === 'es';
  const team = (id) => teamName(career, id, lang);
  const club = career.world.clubs[career.clubId];
  switch (item.kind) {
    case 'welcome': return { from: es ? 'Presidencia' : 'Chairman', subject: es ? `Bienvenido al ${team(item.club)}` : `Welcome to ${team(item.club)}`, body: es ? `Estamos muy contentos de tenerte aquí. La plantilla, la afición y la directiva confían en ti. Revisa a tus jugadores, mira el mercado y prepara la pretemporada. Cuando estés listo, pulsa «Continuar» para avanzar en el calendario.` : `We are delighted to have you. The squad, the fans and the board trust you. Check your players, look at the market and prepare pre-season. When you are ready, press "Continue" to move through the calendar.` };
    case 'board-objectives': return { from: es ? 'Directiva' : 'Board', subject: es ? 'Lo que esperamos esta temporada' : 'What we expect this season', body: es ? 'Te hemos dejado los objetivos de la temporada en la Oficina. El más importante es el de liga. Si los cumples, tendrás más dinero para fichar el año que viene.' : 'Your season objectives are in the Office. The league one matters most. Meet them and you will have more money to spend next year.', cta: 'office' };
    case 'negotiation': {
      const neg = career.transfers.negotiations.find((n) => n.id === item.negotiation);
      const player = pname(career, item.player);
      if (!neg) return { from: es ? 'Secretaría técnica' : 'Recruitment', subject: player, body: '' };
      if (item.status === 'failed') return { from: es ? 'Secretaría técnica' : 'Recruitment', subject: es ? `Se acabó lo de ${player}` : `${player}: talks are over`, body: lastLine(career, neg, lang), cta: 'transfers' };
      if (neg.stage === 'player') return { from: es ? 'Agente del jugador' : "Player's agent", subject: es ? `${player} quiere hablar de su contrato` : `${player} wants to talk terms`, body: lastLine(career, neg, lang), cta: 'negotiation', negotiation: neg.id };
      return { from: es ? `Director deportivo · ${team(neg.clubId)}` : `Director · ${team(neg.clubId)}`, subject: es ? `Respuesta sobre ${player}` : `Reply about ${player}`, body: lastLine(career, neg, lang), cta: 'negotiation', negotiation: neg.id };
    }
    case 'offer': {
      const offer = career.transfers.offers.find((o) => o.id === item.offer);
      return { from: es ? `Director deportivo · ${team(item.club)}` : `Director · ${team(item.club)}`, subject: es ? `Oferta por ${pname(career, item.player)}` : `Offer for ${pname(career, item.player)}`, body: item.loan
        ? (es ? `Nos gustaría llevarnos a ${pname(career, item.player)} cedido esta temporada. Pagaríamos el ${offer?.wageShare ?? 50}% de su sueldo. ¿Qué te parece?` : `We would like ${pname(career, item.player)} on loan this season. We would pay ${offer?.wageShare ?? 50}% of his wages. What do you think?`)
        : (es ? `Ofrecemos ${money(item.fee, lang)} por ${pname(career, item.player)}. Creemos que es una cifra justa. Tienes unos días para respondernos.` : `We offer ${money(item.fee, lang)} for ${pname(career, item.player)}. We think it is a fair price. You have a few days to answer.`), cta: 'offer', offer: item.offer };
    }
    case 'scout-report': return { from: es ? 'Red de ojeadores' : 'Scouting network', subject: es ? `${item.players.length} jugador${item.players.length > 1 ? 'es' : ''} para ti` : `${item.players.length} player${item.players.length > 1 ? 's' : ''} for you`, body: es ? `Te mando informes de: ${item.players.map((id) => pname(career, id)).join(', ')}. Échales un vistazo en Ojeadores.` : `Reports on: ${item.players.map((id) => pname(career, id)).join(', ')}. Have a look in Scouting.`, cta: 'scouting' };
    case 'mission-done': return { from: es ? 'Red de ojeadores' : 'Scouting network', subject: es ? 'Misión terminada' : 'Assignment finished', body: es ? `El ojeador ha vuelto. Ha encontrado ${item.count} jugadores. Puedes mandarle a otra misión cuando quieras.` : `The scout is back after finding ${item.count} players. Send him somewhere else whenever you like.`, cta: 'scouting' };
    case 'youth-report': return { from: es ? 'Cantera' : 'Academy', subject: es ? 'Nuevos chavales a la vista' : 'New youngsters spotted', body: es ? `Hemos visto a ${item.players.length === 1 ? 'un chico' : `${item.players.length} chicos`} con muy buena pinta. Decide si los traes a la cantera.` : `We have seen ${item.players.length === 1 ? 'a youngster' : `${item.players.length} youngsters`} with real promise. Decide whether to bring them in.`, cta: 'academy' };
    case 'stage': return { from: es ? 'Calendario' : 'Calendar', subject: L[lang].stages[item.stage], body: L[lang].stageHelp[item.stage] };
    case 'deadline-day': return { from: es ? 'Secretaría técnica' : 'Recruitment', subject: es ? '¡Último día de mercado!' : 'Deadline day!', body: es ? 'Hoy se cierra el mercado. Lo que no cierres hoy tendrá que esperar a la siguiente ventana.' : 'The window closes today. Anything you do not close today waits for the next window.', cta: 'transfers' };
    case 'expiring-contracts': return { from: es ? 'Secretaría técnica' : 'Recruitment', subject: es ? 'Contratos que terminan en junio' : 'Contracts ending in June', body: es ? `Estos jugadores se irán gratis en verano si no renuevas: ${item.players.map((id) => pname(career, id)).join(', ')}. Ojo: desde ahora otros clubes pueden ficharlos con un precontrato.` : `These players will leave for free in the summer unless you renew: ${item.players.map((id) => pname(career, id)).join(', ')}. Other clubs can now sign them on pre-contracts.`, cta: 'squad' };
    case 'injury': {
      const p = P(career, item.player);
      const days = p?.injury ? Math.max(1, Math.round((Date.parse(p.injury.until) - Date.parse(career.date)) / 86400000)) : 0;
      return { from: es ? 'Servicios médicos' : 'Medical team', subject: es ? `${pname(career, item.player)}, lesionado` : `${pname(career, item.player)} injured`, body: es ? `Tiene ${injuryName(p?.injury?.name, lang)}. Estará fuera unos ${days} días.` : `He has ${injuryName(p?.injury?.name, lang)}. Out for about ${days} days.` };
    }
    case 'board-warning': return { from: es ? 'Presidencia' : 'Chairman', subject: es ? 'Tenemos que hablar' : 'We need to talk', body: es ? 'Los resultados no están llegando y la paciencia se acaba. Necesitamos ver una reacción ya o tendremos que tomar decisiones.' : 'Results are not coming and patience is running out. We need a reaction now or we will have to act.' };
    case 'sacked': return { from: es ? 'Presidencia' : 'Chairman', subject: es ? 'Fin de tu etapa' : 'Your time is up', body: es ? 'Lo sentimos, pero hemos decidido prescindir de ti. Gracias por tu trabajo. Hay clubes que se han interesado por ti: mira las ofertas.' : 'We are sorry, but we have decided to let you go. Thank you for your work. Other clubs are interested: check your offers.', cta: 'office' };
    case 'job-offer': return item.fifa
      ? { from: es ? 'Federación' : 'Federation', subject: es ? `${teamName(career, `N:${item.fifa}`, lang)} quiere que seas su seleccionador` : `${teamName(career, `N:${item.fifa}`, lang)} want you as coach`, body: es ? 'Podrías compaginarlo con tu club: dirigirías a la selección en los parones y en el gran torneo del verano.' : 'You could do both jobs: you would lead the national team in the breaks and at the summer tournament.', cta: 'office' }
      : { from: es ? `Presidente · ${team(item.club)}` : `Chairman · ${team(item.club)}`, subject: es ? `El ${team(item.club)} quiere ficharte` : `${team(item.club)} want you`, body: es ? 'Nos gusta mucho tu trabajo y nos encantaría que fueras nuestro entrenador. La oferta está en la Oficina.' : 'We like your work a lot and would love you as our manager. The offer is in the Office.', cta: 'office' };
    case 'season-review': return { from: es ? 'Directiva' : 'Board', subject: es ? 'Balance de la temporada' : 'Season review', body: es ? 'Ha terminado la temporada de clubes. Mira el resumen con lo que ha salido bien y lo que no.' : 'The club season is over. Look at the summary of what went well and what did not.', cta: 'review' };
    case 'new-season': return { from: es ? 'Directiva' : 'Board', subject: es ? `Empieza la temporada ${item.year}/${String(item.year + 1).slice(-2)}` : `Season ${item.year}/${String(item.year + 1).slice(-2)} begins`, body: (es ? 'Se abre el mercado de verano. Tienes nuevos objetivos y presupuesto en la Oficina.' : 'The summer window is open. New objectives and budget are in the Office.') + (item.freed?.length ? (es ? ` Se han ido libres: ${item.freed.map((id) => pname(career, id)).join(', ')}.` : ` Left on free transfers: ${item.freed.map((id) => pname(career, id)).join(', ')}.`) : ''), cta: 'office' };
    case 'call-up': {
      const f = career.season.fixtures[item.fixture];
      return { from: es ? 'Federación' : 'Federation', subject: es ? 'Toca dar la convocatoria' : 'Squad announcement due', body: es ? `Se acerca el partido contra ${team(f?.home === `N:${career.national?.fifa}` ? f?.away : f?.home)} (${f ? shortDate(f.date, lang) : ''}). Revisa la lista de convocados en Selección.` : `The match against ${team(f?.home === `N:${career.national?.fifa}` ? f?.away : f?.home)} is coming (${f ? shortDate(f.date, lang) : ''}). Review your squad in National team.`, cta: 'national' };
    }
    case 'tournament-draw': return { from: es ? 'Federación' : 'Federation', subject: es ? '¡Ya conocemos nuestro grupo!' : 'We know our group!', body: es ? `Se ha hecho el sorteo de ${compName(career.season.comps[item.comp], lang)}. Míralo en Selección.` : `The draw for ${compName(career.season.comps[item.comp], lang)} is done. See it in National team.`, cta: 'national' };
    case 'qualified': return { from: es ? 'Federación' : 'Federation', subject: es ? '¡Estamos clasificados!' : 'We have qualified!', body: es ? 'El país entero celebra. Nos vemos en el torneo del verano.' : 'The whole country celebrates. See you at the summer tournament.', cta: 'national' };
    case 'not-qualified': return { from: es ? 'Federación' : 'Federation', subject: es ? 'No nos hemos clasificado' : 'We did not qualify', body: es ? 'Un golpe duro. Este verano no habrá torneo para nosotros.' : 'A heavy blow. No tournament for us this summer.', cta: 'national' };
    case 'promise-broken': return { from: es ? 'Vestuario' : 'Dressing room', subject: es ? `${pname(career, item.player)} está muy enfadado` : `${pname(career, item.player)} is furious`, body: es ? 'Le prometiste más minutos y no ha jugado. Se siente engañado.' : 'You promised him more minutes and he has not played. He feels misled.' };
    case 'event': {
      const event = career.events.find((e) => e.id === item.event);
      const text = event ? eventText(career, event, lang) : null;
      return { from: text?.from || '', subject: text?.title || '', body: text?.body || '', cta: 'event', event: item.event };
    }
    default: return { from: club?.name || '', subject: item.kind, body: '' };
  }
}

export function injuryName(name, lang) {
  const es = { knock: 'un golpe', sprain: 'un esguince leve', bruise: 'una contusión', tightness: 'una sobrecarga', hamstring: 'una rotura en el isquiotibial', groin: 'una lesión en el aductor', calf: 'una lesión en el gemelo', ankle: 'un esguince de tobillo', 'knee-ligament': 'una rotura de ligamentos de la rodilla', fracture: 'una fractura', achilles: 'una lesión en el tendón de Aquiles', meniscus: 'una lesión de menisco' };
  const en = { knock: 'a knock', sprain: 'a mild sprain', bruise: 'a bruise', tightness: 'muscle tightness', hamstring: 'a torn hamstring', groin: 'a groin injury', calf: 'a calf injury', ankle: 'a sprained ankle', 'knee-ligament': 'a torn knee ligament', fracture: 'a fracture', achilles: 'an Achilles injury', meniscus: 'a meniscus injury' };
  return (lang === 'es' ? es : en)[name] || (lang === 'es' ? 'una lesión' : 'an injury');
}

/* ── Negotiations: who says what ── */

export function lastLine(career, neg, lang) {
  const entry = neg.log[neg.log.length - 1];
  return entry ? negotiationLine(career, neg, entry, lang, neg.log.length - 1).text : '';
}

export function negotiationLine(career, neg, entry, lang, index = 0) {
  const es = lang === 'es';
  const p = entry.params || {};
  const player = pname(career, neg.playerId);
  const club = teamName(career, neg.clubId, lang);
  const m = (v) => money(v, lang);
  const role = (r) => L[lang].roles[r] || r || '';
  const roleLower = (r) => String(role(r)).toLowerCase();
  const seed = [neg.id, index];
  const lines = {
    enquiry: es ? [`Has preguntado al ${club} si dejarían salir a ${player}. Te contestarán en ${p.days} día${p.days === 1 ? '' : 's'}.`] : [`You asked ${club} whether they would let ${player} go. They will answer in ${p.days} day${p.days === 1 ? '' : 's'}.`],
    'enquiry-loan': es ? [`Has preguntado al ${club} por la cesión de ${player}. Te dirán algo en ${p.days} día${p.days === 1 ? '' : 's'}.`] : [`You asked ${club} about loaning ${player}. Expect an answer in ${p.days} day${p.days === 1 ? '' : 's'}.`],
    open: es ? [`Podemos hablar. Pero ${surname(player)} es importante para nosotros: por menos de ${m(p.fee)} no sale.`, `Escuchamos ofertas por ${surname(player)}. Nuestra idea está alrededor de ${m(p.fee)}.`, `Sí, podemos negociar. Pedimos ${m(p.fee)} por ${surname(player)}.`]
      : [`We can talk. But ${surname(player)} matters to us: he does not leave for less than ${m(p.fee)}.`, `We are listening to offers for ${surname(player)}. We are thinking around ${m(p.fee)}.`, `Yes, we can negotiate. We want ${m(p.fee)} for ${surname(player)}.`],
    'open-clause': es ? [`${surname(player)} tiene una cláusula de ${m(p.clause)}. Si la pagas, no podemos impedir que se vaya.`] : [`${surname(player)} has a release clause of ${m(p.clause)}. If you pay it, we cannot stop him.`],
    'not-for-sale': es ? [`Lo siento, ${surname(player)} no está en venta. Es una pieza clave y no vamos a negociar.`, `Ni lo intentes: ${surname(player)} no se mueve de aquí.`] : [`Sorry, ${surname(player)} is not for sale. He is key for us and we will not negotiate.`, `Don't even try: ${surname(player)} is going nowhere.`],
    'player-not-interested': es ? [`He hablado con ${surname(player)} y, sinceramente, no le interesa tu proyecto ahora mismo.`] : [`I spoke to ${surname(player)} and, honestly, your project does not interest him right now.`],
    'loan-refused-starter': es ? [`${surname(player)} es titular para nosotros. No lo vamos a ceder.`] : [`${surname(player)} is a starter for us. We will not loan him out.`],
    'loan-open': es ? [`Lo cederíamos, pero queremos que pagues el ${p.share}% de su sueldo.`] : [`We would loan him, but you must pay ${p.share}% of his wages.`],
    offer: es ? [`Ofreces ${m(p.fee)}${p.instalments > 1 ? ` en ${p.instalments} plazos` : ''}${p.sellOn ? `, con un ${p.sellOn}% de una futura venta` : ''}${p.bonus ? ` y ${m(p.bonus)} en variables` : ''}.`] : [`You offer ${m(p.fee)}${p.instalments > 1 ? ` in ${p.instalments} instalments` : ''}${p.sellOn ? `, with ${p.sellOn}% of a future sale` : ''}${p.bonus ? ` plus ${m(p.bonus)} in add-ons` : ''}.`],
    'offer-loan': es ? [`Ofreces pagar el ${p.wageShare}% de su sueldo durante la cesión.`] : [`You offer to pay ${p.wageShare}% of his wages during the loan.`],
    'club-accept': es ? [`Trato hecho. Aceptamos ${m(p.fee)}. Ahora tendrás que convencer al jugador.`, `Nos parece bien. ${m(p.fee)} y es tuyo… si él quiere ir.`] : [`Deal. We accept ${m(p.fee)}. Now you need to convince the player.`, `Fine by us. ${m(p.fee)} and he is yours… if he wants to go.`],
    counter: es ? [`Nos acercamos, pero no es suficiente. Por ${m(p.fee)} cerramos.`, `Buen intento. Si llegas a ${m(p.fee)}, hay acuerdo.`, `Casi lo tenemos. Danos ${m(p.fee)} y es tuyo.`] : [`We are getting closer, but it is not enough. ${m(p.fee)} and it's done.`, `Nice try. Reach ${m(p.fee)} and we have a deal.`, `Almost there. Give us ${m(p.fee)} and he is yours.`],
    'counter-far': es ? [`Todavía estamos lejos. Nuestra cifra es ${m(p.fee)}.`, `Así no llegamos a un acuerdo. Pedimos ${m(p.fee)}.`] : [`We are still apart. Our number is ${m(p.fee)}.`, `That will not get a deal done. We want ${m(p.fee)}.`],
    'counter-sellon': es ? [`Aceptaríamos ${m(p.fee)} si nos guardas un ${p.sellOn}% de una futura venta.`] : [`We would accept ${m(p.fee)} if we keep ${p.sellOn}% of a future sale.`],
    lowball: es ? [`Con todo el respeto, esa cifra no es seria. Seguimos pidiendo ${m(p.fee)}.`, `¿Es una broma? Por ese dinero ni nos sentamos.`] : [`With respect, that figure is not serious. We still want ${m(p.fee)}.`, `Is this a joke? We will not even sit down for that.`],
    'hang-up': es ? ['Así no vamos a ninguna parte. Hablamos en otro momento.', 'Hemos terminado. No nos llames en unas semanas.'] : ['This is going nowhere. We will talk another time.', 'We are done here. Do not call us for a few weeks.'],
    'rival-bid': es ? [`Ha llegado una oferta del ${teamName(career, p.rival, lang)} de ${m(p.fee)}. Si quieres a ${surname(player)}, tendrás que igualarla.`] : [`${teamName(career, p.rival, lang)} have bid ${m(p.fee)}. If you want ${surname(player)}, you must match it.`],
    'loan-accept': es ? [`De acuerdo con el ${p.share}% del sueldo. Ahora habla con su agente.`] : [`Agreed at ${p.share}% of his wages. Now talk to his agent.`],
    'loan-counter': es ? [`Necesitamos que pagues al menos el ${p.share}%.`] : [`We need you to pay at least ${p.share}%.`],
    'agent-open': es ? [`A ${surname(player)} le apetece el cambio. Quiere ${m(p.wage)} a la semana, ${p.years} años de contrato y ser ${roleLower(p.role)} en el equipo.`, `Mi cliente está abierto a escucharte. Pedimos ${m(p.wage)} semanales y un papel de ${roleLower(p.role)}.`]
      : [`${surname(player)} fancies the move. He wants ${m(p.wage)} a week, ${p.years} years and a ${roleLower(p.role)} role.`, `My client is open to it. We ask ${m(p.wage)} a week and a ${roleLower(p.role)} role.`],
    'agent-loan-open': es ? [`Para la cesión, ${surname(player)} solo quiere jugar. Confirma su papel en el equipo y listo.`] : [`For the loan, ${surname(player)} just wants to play. Confirm his role and we are done.`],
    'offer-contract': es ? [`Ofreces ${m(p.wage)} a la semana, ${p.years} años, papel de ${roleLower(p.role)} y ${m(p.signingBonus)} de prima de fichaje.`] : [`You offer ${m(p.wage)} a week, ${p.years} years, a ${roleLower(p.role)} role and a ${m(p.signingBonus)} signing bonus.`],
    'agent-accept': es ? [`¡Hecho! ${surname(player)} está deseando empezar.`, `Trato cerrado. Bienvenido al club, ${surname(player)}.`] : [`Done! ${surname(player)} can't wait to start.`, `Deal closed. Welcome to the club, ${surname(player)}.`],
    'agent-counter': es ? [`Nos acercamos. Con ${m(p.wage)} a la semana firmamos.`, `Casi. Sube a ${m(p.wage)} semanales y tenemos acuerdo.`] : [`Getting close. At ${m(p.wage)} a week we sign.`, `Almost. Go up to ${m(p.wage)} a week and we have a deal.`],
    'agent-insulted': es ? [`Eso es muy poco para un jugador como ${surname(player)}. Pedimos ${m(p.wage)}.`] : [`That is far too little for a player like ${surname(player)}. We ask ${m(p.wage)}.`],
    'role-too-low': es ? [`${surname(player)} no viene para ser ${'suplente'}. Quiere ser ${roleLower(p.role)}.`] : [`${surname(player)} is not coming to sit on the bench. He wants to be ${roleLower(p.role)}.`],
    'agent-walks': es ? ['Lo dejamos aquí. Mi cliente buscará otro destino.'] : ['We will leave it there. My client will look elsewhere.'],
    'walk-away': es ? ['Has cortado la negociación.'] : ['You ended the talks.'],
    'moved-elsewhere': es ? [`${player} ya no está disponible: ha cambiado de equipo.`] : [`${player} is no longer available: he has moved clubs.`],
    'no-budget': es ? [`No tienes presupuesto suficiente para pagar ${m(p.fee)}.`] : [`You do not have the budget to pay ${m(p.fee)}.`],
    'no-wage-room': es ? [`La directiva no aprueba un sueldo de ${m(p.wage)}: no cabe en el límite salarial.`] : [`The board will not approve ${m(p.wage)} a week: it does not fit the wage budget.`],
    'renew-open': es ? [`${surname(player)} está a gusto aquí. Para renovar pedimos ${m(p.wage)} a la semana.`] : [`${surname(player)} is happy here. To renew we ask ${m(p.wage)} a week.`],
    'renew-open-unhappy': es ? [`${surname(player)} no está contento. Si queréis que renueve, tendréis que pagarle ${m(p.wage)} a la semana.`] : [`${surname(player)} is not happy. If you want him to renew, it will cost ${m(p.wage)} a week.`],
  };
  const list = lines[entry.key] || [entry.key];
  const who = entry.who === 'club' ? 'club' : entry.who === 'agent' ? 'agent' : entry.who === 'you' ? 'you' : 'system';
  return { who, text: pick(list, ...seed) };
}

/* ── Dressing room and press ── */

export function eventText(career, event, lang) {
  const es = lang === 'es';
  const p = event.params || {};
  const player = pname(career, p.player);
  const other = pname(career, p.other);
  const rival = teamName(career, p.rival, lang);
  const comp = compName(career.season?.comps?.[p.comp], lang);
  const T = {
    'press-big-win': { from: es ? 'Rueda de prensa' : 'Press conference', title: es ? '«Míster, ¿este equipo es candidato a todo?»' : '"Boss, can this team win everything?"', body: es ? `Tras el ${p.score} al ${rival}, los periodistas quieren titulares.` : `After the ${p.score} against ${rival}, the press wants headlines.`,
      a: [es ? 'Pies en el suelo' : 'Feet on the ground', es ? '«Solo es un partido. Mañana, a trabajar.» El vestuario lo agradece.' : '"It is just one game. Back to work tomorrow." The players like it.'],
      b: [es ? 'Sacar pecho' : 'Talk it up', es ? '«Este equipo puede con cualquiera.» Ilusiona a todos, pero sube la presión.' : '"This team can beat anyone." Everyone gets excited, but pressure rises.'] },
    'press-bad-run': { from: es ? 'Rueda de prensa' : 'Press conference', title: es ? '«¿Está en peligro su puesto?»' : '"Is your job at risk?"', body: es ? 'Tres derrotas seguidas. La prensa aprieta.' : 'Three defeats in a row. The press is circling.',
      a: [es ? 'Asumir la culpa' : 'Take the blame', es ? '«La responsabilidad es mía.» La directiva valora tu honestidad.' : '"The responsibility is mine." The board values your honesty.'],
      b: [es ? 'Exigir a los jugadores' : 'Demand more from players', es ? '«Algunos tienen que dar mucho más.» La afición lo aplaude; el vestuario, no tanto.' : '"Some of them must give much more." The fans love it; the players, less so.'] },
    'press-trophy': { from: es ? 'Rueda de prensa' : 'Press conference', title: es ? '«¿A quién le dedica el título?»' : '"Who do you dedicate the title to?"', body: es ? `Acabáis de ganar ${comp}. ¡Enhorabuena!` : `You have just won ${comp}. Congratulations!`,
      a: [es ? 'A la afición' : 'To the fans', es ? 'La grada se vuelve loca contigo.' : 'The stands go wild for you.'], b: [es ? 'A los jugadores' : 'To the players', es ? 'El vestuario se siente valorado.' : 'The squad feels appreciated.'] },
    'press-elimination': { from: es ? 'Rueda de prensa' : 'Press conference', title: es ? '«¿Qué ha fallado?»' : '"What went wrong?"', body: es ? `Fuera de ${comp}.` : `Knocked out of ${comp}.`,
      a: [es ? 'Reconocer el fracaso' : 'Admit the failure', es ? '«Era un objetivo y no lo hemos cumplido.» La directiva lo valora.' : '"It was a target and we missed it." The board appreciates it.'], b: [es ? 'Mirar adelante' : 'Look ahead', es ? '«Toca pasar página y centrarse en la liga.» Los jugadores se animan.' : '"Time to move on and focus on the league." The players perk up.'] },
    'press-derby-win': { from: es ? 'Rueda de prensa' : 'Press conference', title: es ? '«¡Derbi ganado! ¿Qué le dice a los rivales?»' : '"Derby won! A message for the rivals?"', body: es ? `${p.score} al ${rival}.` : `${p.score} against ${rival}.`,
      a: [es ? 'Celebrar con la afición' : 'Celebrate with fans', es ? 'La afición se siente escuchada.' : 'The fans feel heard.'], b: [es ? 'Elogiar al equipo' : 'Praise the team', es ? 'Los jugadores salen reforzados.' : 'The players grow in confidence.'] },
    'press-derby-loss': { from: es ? 'Rueda de prensa' : 'Press conference', title: es ? '«Duele perder el derbi, ¿verdad?»' : '"Losing the derby hurts, right?"', body: es ? `${p.score} contra el ${rival}.` : `${p.score} against ${rival}.`,
      a: [es ? 'Pedir perdón a la afición' : 'Apologise to the fans', es ? 'Calma a la grada.' : 'Calms the stands.'], b: [es ? 'Señalar errores del equipo' : 'Point out the mistakes', es ? 'La directiva lo ve bien, el vestuario no tanto.' : 'The board approves; the squad less so.'] },
    'unhappy-minutes': { from: player, title: es ? `${player} quiere jugar más` : `${player} wants more minutes`, body: es ? `«Míster, entreno bien y casi no juego. Necesito minutos.»` : `"Boss, I train well and I hardly play. I need minutes."`,
      a: [es ? 'Prometerle minutos' : 'Promise him minutes', es ? 'Se pondrá contento… pero tendrás que cumplir en las próximas semanas.' : 'He will be happy… but you must keep your word in the coming weeks.'], b: [es ? '«Gánate el puesto»' : '"Earn your place"', es ? 'Le sentará mal, aunque al vestuario le gusta la exigencia.' : 'He will not like it, though the squad likes high standards.'] },
    'late-training': { from: es ? 'Cuerpo técnico' : 'Coaching staff', title: es ? `${player} llega tarde al entrenamiento` : `${player} late for training`, body: es ? 'Es la segunda vez este mes.' : 'It is the second time this month.',
      a: [es ? 'Multarle' : 'Fine him', es ? 'Él se enfadará; el grupo verá que hay normas.' : 'He will be upset; the group sees there are rules.'], b: [es ? 'Dejarlo pasar' : 'Let it go', es ? 'Él te lo agradecerá; a otros no les gustará.' : 'He will thank you; others will not like it.'] },
    'dressing-conflict': { from: es ? 'Capitán' : 'Captain', title: es ? `Bronca entre ${player} y ${other}` : `Row between ${player} and ${other}`, body: es ? 'Discutieron fuerte en el entrenamiento.' : 'They argued badly at training.',
      a: [es ? `Dar la razón a ${surname(player)}` : `Side with ${surname(player)}`, es ? `${surname(player)} contento, ${surname(other)} dolido.` : `${surname(player)} happy, ${surname(other)} hurt.`], b: [es ? 'Hablar con los dos' : 'Talk to both', es ? 'Nadie sale del todo contento, pero el grupo se calma.' : 'Nobody is fully happy, but the group calms down.'] },
    'wants-renewal': { from: player, title: es ? `${player} quiere renovar` : `${player} wants a new deal`, body: es ? '«Quiero seguir aquí muchos años. ¿Hablamos de mi contrato?»' : '"I want to stay here for years. Can we talk about my contract?"',
      a: [es ? 'Abrir negociación' : 'Open talks', es ? 'Empezáis a hablar de números.' : 'You start talking numbers.'], b: [es ? '«Ahora no»' : '"Not now"', es ? 'Se quedará con mal sabor de boca.' : 'He will be disappointed.'] },
    'wants-out': { from: player, title: es ? `${player} quiere irse` : `${player} wants to leave`, body: es ? '«Ha llegado una oportunidad en un club más grande. Me gustaría escucharla.»' : '"There is a chance at a bigger club. I would like to listen."',
      a: [es ? 'Ponerle en venta' : 'Put him up for sale', es ? 'Le harás feliz y llegarán ofertas.' : 'He will be happy and offers will come.'], b: [es ? 'Negarse' : 'Refuse', es ? 'Se queda, pero muy molesto.' : 'He stays, but very unhappy.'] },
    'fans-protest': { from: es ? 'Peñas' : 'Supporters', title: es ? 'La afición protesta' : 'The fans are protesting', body: es ? 'Pancartas en el estadio pidiendo cambios.' : 'Banners at the stadium demanding change.',
      a: [es ? 'Reunirse con las peñas' : 'Meet the supporters', es ? 'Escucharles calma los ánimos.' : 'Listening calms things down.'], b: [es ? 'Ignorarlo' : 'Ignore it', es ? 'La afición se enfada más.' : 'The fans get angrier.'] },
  };
  const entry = T[event.kind] || { from: '', title: event.kind, body: '', a: ['A', ''], b: ['B', ''] };
  return { from: entry.from, title: entry.title, body: entry.body, options: { a: { label: entry.a[0], hint: entry.a[1] }, b: { label: entry.b[0], hint: entry.b[1] } } };
}

/* ── Live commentary ── */

export function commentary(match, event, lang) {
  const es = lang === 'es';
  const P2 = (id) => match.players[id];
  const n = (id) => (P2(id)?.name ? surname(P2(id).name) : '');
  const side = (s) => match.sides[s]?.short || match.sides[s]?.name || '';
  const seed = [match.id, event.minute, event.type, event.player];
  switch (event.type) {
    case 'kick-off': return es ? '¡Echa a rodar el balón!' : 'And we are under way!';
    case 'goal': {
      const how = { volley: es ? 'de volea' : 'with a volley', cutback: es ? 'tras un pase de la muerte' : 'from a cut-back', rebound: es ? 'aprovechando el rechace' : 'from the rebound', header: es ? 'de cabeza' : 'with a header', 'corner-header': es ? 'de cabeza tras un córner' : 'with a header from a corner', long: es ? 'con un disparo lejano' : 'from long range', penalty: es ? 'de penalti' : 'from the spot', freekick: es ? 'de falta directa' : 'from a free kick', counter: es ? 'al contragolpe' : 'on the counter', 'one-on-one': es ? 'en un mano a mano' : 'one on one', 'tap-in': es ? 'a placer en el área pequeña' : 'with a tap-in' }[event.kind] || (es ? 'con un buen disparo' : 'with a fine finish');
      const assist = event.assist ? (es ? ` Pase de ${n(event.assist)}.` : ` Assisted by ${n(event.assist)}.`) : '';
      return (es ? pick(['¡GOOOOL! ', '¡GOL, GOL, GOL! ', '¡Al fondo de la red! '], ...seed) : pick(['GOAL! ', 'GOAL, GOAL, GOAL! ', 'In the back of the net! '], ...seed)) + `${n(event.player)} (${side(event.side)}) ${how}.${assist}`;
    }
    case 'shot': {
      if (event.outcome === 'post') return es ? pick([`¡Al palo! El disparo de ${n(event.player)} se estrella en la madera.`, `¡Uyyy! ${n(event.player)} manda el balón al poste.`, `¡La madera salva al ${side(event.side === 'home' ? 'away' : 'home')}! Remate de ${n(event.player)} al palo.`], ...seed)
        : pick([`Off the post! ${n(event.player)} hits the woodwork.`, `Ooh! ${n(event.player)} rattles the post.`, `${n(event.player)} is denied by the frame of the goal!`], ...seed);
      if (event.outcome === 'saved' && event.xg >= 0.3) return es ? pick([`¡Paradón de ${n(event.keeper)}! ${n(event.player)} lo tenía y no ha podido ser.`, `¡Increíble ${n(event.keeper)}! Le saca un mano a mano a ${n(event.player)}.`], ...seed)
        : pick([`What a save by ${n(event.keeper)}! ${n(event.player)} had it all to score.`, `Incredible from ${n(event.keeper)}, denying ${n(event.player)} one on one.`], ...seed);
      if (event.outcome === 'wide' && event.xg >= 0.3) return es ? pick([`¡Increíble lo que ha fallado ${n(event.player)}! Solo ante el portero y fuera.`, `¡No puede ser! ${n(event.player)} perdona una ocasión clarísima.`], ...seed)
        : pick([`How has ${n(event.player)} missed that? Clean through and wide.`, `${n(event.player)} wastes a glorious chance!`], ...seed);
      if (event.outcome === 'saved') return es ? pick([`Disparo de ${n(event.player)}… ¡y gran parada de ${n(event.keeper)}!`, `${n(event.player)} lo intenta, pero ${n(event.keeper)} está atento.`, `¡Uy! ${n(event.keeper)} saca una mano salvadora ante ${n(event.player)}.`], ...seed)
        : pick([`${n(event.player)} shoots… great save by ${n(event.keeper)}!`, `${n(event.player)} tries it, but ${n(event.keeper)} is alert.`, `Ooh! ${n(event.keeper)} with a huge save from ${n(event.player)}.`], ...seed);
      if (event.outcome === 'blocked') return es ? `El tiro de ${n(event.player)} se estrella en un defensa.` : `${n(event.player)}'s shot is blocked.`;
      return es ? pick([`${n(event.player)} dispara… ¡fuera por poco!`, `Ocasión para ${n(event.player)}, pero el balón se marcha desviado.`, `${n(event.player)} remata alto. No era su momento.`], ...seed)
        : pick([`${n(event.player)} shoots… just wide!`, `Chance for ${n(event.player)}, but it goes wide.`, `${n(event.player)} blazes over.`], ...seed);
    }
    case 'var-offside': return es ? `¡Gol de ${n(event.player)}! …Un momento: el VAR lo revisa. Fuera de juego, gol anulado.` : `${n(event.player)} scores! …Hold on, VAR is checking. Offside, goal ruled out.`;
    case 'corner': return es ? `Córner para el ${side(event.side)}.` : `Corner to ${side(event.side)}.`;
    case 'foul': {
      if (event.inBox) return es ? `¡Penalti! ${n(event.player)} derriba a ${n(event.victim)} dentro del área.` : `Penalty! ${n(event.player)} brings down ${n(event.victim)} in the box.`;
      if (event.dogso) return es ? `¡Falta de último hombre! ${n(event.player)} derriba a ${n(event.victim)}, que se iba solo hacia la portería.` : `Last-man foul! ${n(event.player)} brings down ${n(event.victim)}, who was clean through.`;
      if (event.tactical) return es ? `Falta táctica de ${n(event.player)} para cortar la contra de ${n(event.victim)}.` : `Tactical foul by ${n(event.player)} to stop ${n(event.victim)} on the break.`;
      if (event.dangerous) return es ? `Falta de ${n(event.player)} sobre ${n(event.victim)} al borde del área. Ojo a este balón parado.` : `Foul by ${n(event.player)} on ${n(event.victim)} on the edge of the box. Dangerous set piece.`;
      return es ? `Falta de ${n(event.player)} sobre ${n(event.victim)}.` : `Foul by ${n(event.player)} on ${n(event.victim)}.`;
    }
    case 'penalty-awarded': return es ? '¡El árbitro señala el punto de penalti!' : 'The referee points to the spot!';
    case 'card': return event.card === 'yellow' ? (es ? `Tarjeta amarilla para ${n(event.player)}.` : `Yellow card for ${n(event.player)}.`)
      : event.card === 'second-yellow' ? (es ? `¡Segunda amarilla para ${n(event.player)}! Se va a la calle.` : `Second yellow for ${n(event.player)}! He is off.`)
        : (es ? `¡Roja directa para ${n(event.player)}!` : `Straight red for ${n(event.player)}!`);
    case 'offside': return es ? `${n(event.player)} estaba en fuera de juego.` : `${n(event.player)} was offside.`;
    case 'injury': return es ? `${n(event.player)} se duele y tiene que retirarse.` : `${n(event.player)} is hurt and has to come off.`;
    case 'sub': return es ? `Cambio en el ${side(event.side)}: entra ${n(event.player)}, sale ${n(event.out)}.` : `Change for ${side(event.side)}: ${n(event.player)} on, ${n(event.out)} off.`;
    case 'period-end': return event.ended === 0 ? (es ? 'Descanso. Los equipos se van al vestuario.' : 'Half time. The teams head to the dressing rooms.') : event.ended === 1 ? (es ? 'Final del tiempo reglamentario.' : 'End of normal time.') : event.ended === 2 ? (es ? 'Descanso de la prórroga.' : 'Extra-time break.') : (es ? 'Se acaba la prórroga.' : 'Extra time is over.');
    case 'extra-time': return es ? '¡Vamos a la prórroga!' : 'We are going to extra time!';
    case 'shootout': return es ? `¡Tanda de penaltis! Termina ${event.pens.home}-${event.pens.away}.` : `Penalty shoot-out! It ends ${event.pens.home}-${event.pens.away}.`;
    case 'full-time': return es ? '¡Final del partido!' : 'Full time!';
    case 'tactics': {
      if (!event.cpu || !event.reason) return es ? `Cambio táctico del ${side(event.side)}.` : `Tactical change by ${side(event.side)}.`;
      // What the CPU coach has seen, in a sentence.
      const why = {
        'focus-left': ['carga el juego por la izquierda, por donde le está haciendo daño', 'loads the play down the left, where it is hurting you'],
        'focus-right': ['carga el juego por la derecha, por donde le está haciendo daño', 'loads the play down the right, where it is hurting you'],
        'focus-center': ['busca más el juego por dentro', 'looks to play through the middle'],
        crosses: ['empieza a colgar balones al área en cuanto puede', 'starts swinging balls into the box early'],
        'in-behind': ['busca una y otra vez la espalda de la defensa', 'keeps looking for the space behind the defence'],
        'beat-the-press': ['deja de salir jugando y busca en largo para saltar la presión', 'stops playing out and goes long to beat the press'],
        'line-down': ['retrasa su línea defensiva para no conceder espacio a la espalda', 'drops its defensive line to deny the space behind'],
        'protect-box': ['cierra el centro para proteger su área', 'narrows up to protect its box'],
        'sit-and-break': ['se repliega y espera para salir a la contra', 'sits back and waits to break'],
        'plan-gegenpress': ['adelanta líneas y presiona arriba', 'pushes up and presses high'],
        'plan-wing-play': ['abre el campo y busca las bandas', 'goes wide and looks for the flanks'],
        'plan-long-ball': ['juega en largo buscando a su delantero', 'goes long to its striker'],
        'plan-counter-attack': ['se encierra para salir a la contra', 'sits deep to hit on the break'],
        'plan-park-the-bus': ['se encierra atrás para defender el resultado', 'parks the bus to protect the result'],
        'plan-tiki-taka': ['se dedica a tener el balón', 'settles down to keep the ball'],
        'plan-balanced': ['vuelve a un planteamiento equilibrado', 'goes back to a balanced approach'],
      };
      const first = String(event.reason).split(',').find((r) => why[r]);
      if (!first) return es ? `Cambio táctico del ${side(event.side)}.` : `Tactical change by ${side(event.side)}.`;
      return es ? `Ajuste en el ${side(event.side)}: ${why[first][0]}.` : `${side(event.side)} adjust: ${why[first][1]}.`;
    }
    default: return '';
  }
}

const withArticle = (name) => (/^(Copa|Liga|Coppa|Coupe|Taça|FA Cup|Eurocopa|Supercopa|Primera|Premier|Bundesliga|Serie|Ligue|Eredivisie)/.test(name) ? `la ${name}` : /^(Mundial|DFB|US Open|Trofeo)/.test(name) ? `el ${name}` : name);

export function objectiveText(objective, career, lang) {
  const es = lang === 'es';
  const comp = career.season?.comps?.[objective.comp];
  switch (objective.type) {
    case 'league': return {
      'win-league': es ? 'Ganar la liga' : 'Win the league',
      promotion: es ? `Ascender (acabar entre los ${objective.target} primeros)` : `Win promotion (top ${objective.target})`,
      'top-four': es ? 'Acabar entre los 4 primeros' : 'Finish in the top four',
      'top-half': es ? `Acabar en la mitad de arriba (top ${objective.target})` : `Finish in the top half (top ${objective.target})`,
      'avoid-relegation': es ? `Evitar el descenso (acabar ${objective.target}.º o mejor)` : `Avoid relegation (finish ${objective.target}th or better)`,
      respectable: es ? 'Hacer una temporada digna' : 'Have a respectable season',
    }[objective.key];
    case 'cup': case 'continental': return objective.stage === 'winner'
      ? (es ? `Ganar ${withArticle(compName(comp, lang))}` : `Win the ${compName(comp, lang)}`)
      : (es ? `Llegar a ${stageLabel(objective.stage, lang).toLowerCase()} en ${withArticle(compName(comp, lang))}` : `Reach the ${stageLabel(objective.stage, lang).toLowerCase()} of the ${compName(comp, lang)}`);
    case 'wages': return es ? 'No pasarse del límite de sueldos' : 'Stay within the wage budget';
    case 'youth': return es ? `Dar ${objective.minutes} minutos a menores de 21` : `Give ${objective.minutes} minutes to under-21s`;
    default: return '';
  }
}

export function verdictText(verdict, lang) {
  const es = lang === 'es';
  return {
    starter: es ? 'Sería titular en tu equipo.' : 'Would start in your team.',
    future: es ? 'Ahora no, pero puede ser un crack en unos años.' : 'Not yet, but could be a star in a few years.',
    depth: es ? 'Daría más fondo de armario.' : 'Would add depth to the squad.',
    'not-needed': es ? 'No mejora lo que ya tienes.' : 'Not better than what you have.',
  }[verdict] || '';
}

export function positionSentence(pos, lang) { return posName(pos, lang); }
export const isNationId = isNation;
