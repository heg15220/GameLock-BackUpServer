/**
 * Decision catalogue for Trayectoria.
 *
 * Three families, deliberately mixed so no single reading of a card is always right:
 *
 *  1. Symmetric bets - odds shown on the card, and the card never lies: the percentages
 *     printed are the percentages rolled.
 *  2. Deferred trades - give up OVR now, get it back next period. These model the
 *     "transition season" and are the signature shape of the genre.
 *  3. Role-for-trophy swaps - minutes traded for title odds. Since our title model does
 *     penalise sitting on the bench, these are a real dilemma rather than free money.
 *
 * Effects vocabulary (see applyEffects):
 *   ovr             permanent OVR change
 *   ovrTemp         applied this period, reversed the next (pairs with ovrReturn)
 *   matchesDelta    matches added to or taken off the season (how injuries land)
 *   roleShift       rungs down the role ladder (negative) or up (positive)
 *   forceRole       pin the role for one season
 *   titleMultiplier map of trophy -> multiplier, or { all: n }
 *   suspended       no matches, no titles, no awards this season
 *   forceCallup     ignore the national-team OVR threshold
 *   changeCountry   opens the nationality switch
 *   wageFactor      multiply the running contract's wage - and with it what the crowd expects
 *   yearsDelta      add or remove years from the running contract
 *   clauseFactor    multiply the buy-out, which is how many clubs come looking next summer
 */

import { chance, createStream } from "./rng.js";
import { wageBand } from "./contract.js";

export const EVENT_THEMES = [
  "sport",
  "tactic",
  "pressure",
  "personal",
  "moral",
  "story",
  /** The office: everything decided by people who never get changed. */
  "directiva",
  /** The dressing room: the only place in the game with other players in it. */
  "vestuario",
];

/**
 * The catalogue.
 *
 * `weight` is the relative frequency of the draw: the everyday football ones dominate,
 * and the tabloid ones are rare on purpose - a career where you are offered a bribe every
 * other year stops being a career.
 *
 * A weight may be a number or a function of the career so far. A fixed number deals a
 * thirty-four-year-old on the bench the same hand as a seventeen-year-old breaking
 * through, which is the fastest way to make a decision game feel like it is not reading
 * what you did. `when` is the same idea taken to its end: some cards make no sense at all
 * outside their moment, and returning 0 keeps them out of the deck entirely.
 *
 * The context (see `eventContext` in career.js) carries: age, ovr, delta, role, seasons
 * at the club, club and competition, whether you are abroad, and your idolatría here.
 */
export const EVENTS = [
  {
    id: "doble-sesion",
    weight: (c) => (c.age <= 25 ? 130 : c.age <= 30 ? 90 : 45),
    theme: "sport",
    es: {
      title: "Doble sesión",
      body: "El preparador te ofrece quedarte por las tardes. Nadie te obliga y nadie te lo va a agradecer si sale mal.",
      options: [
        { id: "accept", label: "Quedarte", detail: "70% +3 OVR · 30% −2 OVR" },
        { id: "decline", label: "Irte a casa", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "Double session",
      body: "The fitness coach offers you the afternoons as well. Nobody is making you, and nobody will thank you if it backfires.",
      options: [
        { id: "accept", label: "Stay on", detail: "70% +3 OVR · 30% −2 OVR" },
        { id: "decline", label: "Go home", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option !== "accept") return { effects: {}, outcome: "declined" };
      return chance(next, 0.7)
        ? { effects: { ovrTemp: 3 }, outcome: "good" }
        : { effects: { ovrTemp: -2 }, outcome: "bad" };
    },
  },
  {
    id: "preparador-personal",
    weight: (c) => (c.ovr >= 70 ? 120 : 70),
    theme: "sport",
    es: {
      title: "Preparador propio",
      body: "Un preparador que trabaja por libre quiere llevarte. Cobra caro y su método no lo avala nadie del club.",
      options: [
        { id: "accept", label: "Contratarlo", detail: "50% +2 OVR · 50% −2 OVR · permanente" },
        { id: "nutrition", label: "Solo el plan de nutrición", detail: "60% +3 OVR · 40% −2 OVR · permanente" },
        { id: "decline", label: "Seguir con el club", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "Your own coach",
      body: "A freelance trainer wants to take you on. He is expensive and nobody at the club vouches for his methods.",
      options: [
        { id: "accept", label: "Hire him", detail: "50% +2 OVR · 50% −2 OVR · permanent" },
        { id: "nutrition", label: "Just the nutrition plan", detail: "60% +3 OVR · 40% −2 OVR · permanent" },
        { id: "decline", label: "Stick with the club", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option === "accept") {
        return chance(next, 0.5)
          ? { effects: { ovr: 2 }, outcome: "good" }
          : { effects: { ovr: -2 }, outcome: "bad" };
      }
      if (option === "nutrition") {
        return chance(next, 0.6)
          ? { effects: { ovr: 3 }, outcome: "good" }
          : { effects: { ovr: -2 }, outcome: "bad" };
      }
      return { effects: {}, outcome: "declined" };
    },
  },
  {
    id: "carga-de-temporada",
    weight: 100,
    theme: "sport",
    es: {
      title: "La carga",
      body: "El cuerpo técnico te deja elegir cuánto vas a apretar este año. La respuesta honesta y la respuesta cómoda no son la misma.",
      options: [
        { id: "high", label: "A tope", detail: "70% titular · 30% suplente" },
        { id: "low", label: "Dosificar", detail: "Bajas un escalón, garantizado" },
      ],
    },
    en: {
      title: "The load",
      body: "The staff let you choose how hard you push this year. The honest answer and the comfortable one are not the same.",
      options: [
        { id: "high", label: "Flat out", detail: "70% starter · 30% benched" },
        { id: "low", label: "Manage it", detail: "One rung down, guaranteed" },
      ],
    },
    resolve(next, option) {
      if (option === "low") return { effects: { roleShift: -1 }, outcome: "safe" };
      return chance(next, 0.7)
        ? { effects: { forceRole: "titular" }, outcome: "good" }
        : { effects: { forceRole: "suplente" }, outcome: "bad" };
    },
  },
  {
    id: "cambio-de-posicion",
    weight: (c) => (c.age >= 31 ? 0 : c.delta < 0 ? 150 : 70),
    theme: "sport",
    es: {
      title: "Te quieren de otro",
      body: "El entrenador te ve en otra posición. Dice que ahí jugarías todo. También dice que tardarás un año en entenderla.",
      options: [
        { id: "accept", label: "Aceptar el cambio", detail: "Titular fijo · −2 OVR que se devuelven" },
        { id: "decline", label: "Negarte", detail: "Bajas un escalón" },
      ],
    },
    en: {
      title: "They want you elsewhere",
      body: "The manager sees you in another role. He says you would play every week. He also says it will take you a year to read it.",
      options: [
        { id: "accept", label: "Take the switch", detail: "Guaranteed starter · −2 OVR, returned later" },
        { id: "decline", label: "Refuse", detail: "One rung down" },
      ],
    },
    resolve(_next, option) {
      if (option === "accept") {
        return { effects: { forceRole: "titular", ovrTemp: -2, ovrReturn: 2 }, outcome: "accepted" };
      }
      return { effects: { roleShift: -1 }, outcome: "declined" };
    },
  },
  {
    id: "competencia-por-el-puesto",
    weight: (c) => 70 + Math.max(0, c.clubReputation - 2) * 40,
    theme: "sport",
    es: {
      title: "Han fichado a otro",
      body: "Llega uno para tu puesto. El club dice que hay sitio para los dos, que es lo que se dice siempre.",
      options: [{ id: "compete", label: "Pelearlo", detail: "50% titular · 50% rotación baja" }],
    },
    en: {
      title: "They signed someone",
      body: "A new arrival for your position. The club says there is room for both of you, which is what clubs always say.",
      options: [{ id: "compete", label: "Fight for it", detail: "50% starter · 50% fringe" }],
    },
    resolve(next) {
      return chance(next, 0.5)
        ? { effects: { forceRole: "titular" }, outcome: "good" }
        : { effects: { forceRole: "rotacion_baja" }, outcome: "bad" };
    },
  },
  {
    id: "prioridad-del-club",
    weight: (c) => (c.clubReputation >= 3 ? 130 : 25),
    theme: "tactic",
    es: {
      title: "Dónde ponemos la temporada",
      body: "La directiva pregunta en el vestuario qué torneo vale más. Tu voto cuenta y se nota en la rotación.",
      options: [
        { id: "league", label: "La liga", detail: "Liga ×2 · continental ×0,5" },
        { id: "continental", label: "La continental", detail: "Continental ×2 · liga ×0,5" },
      ],
    },
    en: {
      title: "Where the season goes",
      body: "The board asks the dressing room which competition matters more. Your vote counts, and the rotation shows it.",
      options: [
        { id: "league", label: "The league", detail: "League ×2 · continental ×0.5" },
        { id: "continental", label: "The continental", detail: "Continental ×2 · league ×0.5" },
      ],
    },
    resolve(_next, option) {
      const effects =
        option === "league"
          ? { titleMultiplier: { league: 2, continental_a: 0.5, continental_b: 0.5 } }
          : { titleMultiplier: { league: 0.5, continental_a: 2, continental_b: 2 } };
      return { effects, outcome: option };
    },
  },
  {
    id: "la-grada-se-harta",
    weight: (c) => (c.seasonsAtClub >= 2 && c.delta < 0 ? 150 : 40),
    theme: "pressure",
    es: {
      title: "Silbidos",
      body: "Tu nombre por megafonía y una grada que contesta. Dura seis meses y no hay forma de acortarlo.",
      options: [{ id: "endure", label: "Aguantar", detail: "−2 OVR ahora · +2 después" }],
    },
    en: {
      title: "Whistles",
      body: "Your name over the tannoy, and a stand that answers back. It lasts six months and there is no shortcut.",
      options: [{ id: "endure", label: "Ride it out", detail: "−2 OVR now · +2 later" }],
    },
    resolve() {
      return { effects: { ovrTemp: -2, ovrReturn: 2 }, outcome: "endured" };
    },
  },
  {
    id: "oferta-del-rival",
    weight: (c) => (c.age < 22 ? 0 : 80),
    theme: "tactic",
    es: {
      title: "Te llama el vecino",
      body: "El rival de la ciudad te quiere. Jugarías menos y te insultarían más, pero ellos ganan cosas.",
      options: [
        { id: "accept", label: "Cruzar la calle", detail: "Rotación alta fija · ×2 en los cinco títulos de club" },
        { id: "decline", label: "Quedarte", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The neighbours call",
      body: "The city rivals want you. You would play less and be insulted more, but they win things.",
      options: [
        { id: "accept", label: "Cross the street", detail: "Locked to squad rotation · ×2 on all five club trophies" },
        { id: "decline", label: "Stay put", detail: "No effect" },
      ],
    },
    resolve(_next, option) {
      if (option !== "accept") return { effects: {}, outcome: "declined" };
      return {
        effects: { forceRole: "rotacion_alta", titleMultiplier: { all: 2 } },
        outcome: "accepted",
      };
    },
  },
  {
    id: "regreso-al-barrio",
    weight: (c) => (c.age >= 30 && !c.atFirstClub ? 140 : 0),
    theme: "story",
    es: {
      title: "Vuelve donde empezaste",
      body: "Tu primer club te ofrece cerrar el círculo. De titular, con tu número, y sin preguntarte por el OVR.",
      options: [
        { id: "accept", label: "Volver", detail: "Titular garantizado, sin tirada" },
        { id: "decline", label: "Todavía no", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "Back where you started",
      body: "Your first club offers to close the circle. Starting, with your number, and without asking about your OVR.",
      options: [
        { id: "accept", label: "Go back", detail: "Guaranteed starter, no roll" },
        { id: "decline", label: "Not yet", detail: "No effect" },
      ],
    },
    resolve(_next, option) {
      if (option !== "accept") return { effects: {}, outcome: "declined" };
      return { effects: { forceRole: "titular", returnToFirstClub: true }, outcome: "accepted" };
    },
  },
  {
    id: "crisis-en-el-club",
    weight: (c) => (c.clubReputation <= 1 ? 110 : 20),
    theme: "pressure",
    es: {
      title: "No llegan las nóminas",
      body: "Tres meses sin cobrar, el presidente imputado y media plantilla buscando salida. Puedes rescindir.",
      options: [
        { id: "stay", label: "Quedarte", detail: "×0,1 en todos los títulos" },
        { id: "leave", label: "Rescindir", detail: "Sales al mercado ya" },
      ],
    },
    en: {
      title: "The wages stopped",
      body: "Three months unpaid, the president under investigation and half the squad looking for a way out. You can tear up the contract.",
      options: [
        { id: "stay", label: "Stay", detail: "×0.1 on every trophy" },
        { id: "leave", label: "Terminate", detail: "Straight to the market" },
      ],
    },
    resolve(_next, option) {
      if (option === "leave") return { effects: { forceTransfer: true }, outcome: "left" };
      return { effects: { titleMultiplier: { all: 0.1 } }, outcome: "stayed" };
    },
  },
  {
    id: "el-chico-de-la-cantera",
    weight: (c) => (c.age >= 28 ? 90 : 0),
    theme: "tactic",
    es: {
      title: "El chaval",
      body: "Ha subido uno de dieciocho que juega a lo que tú jugabas. Te piden que lo lleves; también te piden el sitio.",
      options: [
        { id: "mentor", label: "Apadrinarlo", detail: "Bajas un escalón · ×2 en los cinco títulos" },
        { id: "decline", label: "Que se busque la vida", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The kid",
      body: "An eighteen-year-old is up from the academy playing the way you used to. They ask you to guide him. They also ask for your place.",
      options: [
        { id: "mentor", label: "Take him under your wing", detail: "One rung down · ×2 on all five trophies" },
        { id: "decline", label: "Let him work it out", detail: "No effect" },
      ],
    },
    resolve(_next, option) {
      if (option !== "mentor") return { effects: {}, outcome: "declined" };
      return { effects: { roleShift: -1, titleMultiplier: { all: 2 } }, outcome: "accepted" };
    },
  },
  {
    id: "la-llamada-de-casa",
    weight: (c) => (c.abroad ? 110 : 30),
    theme: "personal",
    es: {
      title: "Llaman de casa",
      body: "Alguien está enfermo y estás a nueve mil kilómetros. El club te da permiso si lo pides; nadie te va a decir que lo pidas.",
      options: [
        { id: "go", label: "Coger el avión", detail: "−5 OVR ahora · +5 después" },
        { id: "stay", label: "Quedarte a jugar", detail: "Sin efecto mecánico" },
      ],
    },
    en: {
      title: "A call from home",
      body: "Someone is ill and you are nine thousand kilometres away. The club will grant leave if you ask. Nobody is going to tell you to ask.",
      options: [
        { id: "go", label: "Get on the plane", detail: "−5 OVR now · +5 later" },
        { id: "stay", label: "Stay and play", detail: "No mechanical effect" },
      ],
    },
    resolve(_next, option) {
      if (option !== "go") return { effects: {}, outcome: "stayed" };
      return { effects: { ovrTemp: -5, ovrReturn: 5 }, outcome: "went" };
    },
  },
  {
    id: "microfono-abierto",
    weight: (c) => (c.ovr >= 75 ? 90 : 35),
    theme: "pressure",
    es: {
      title: "Micrófono abierto",
      body: "Dijiste en zona mixta lo que piensa todo el vestuario. Ahora está en portada y sin el contexto.",
      options: [
        { id: "apologise", label: "Rectificar", detail: "Bajas un escalón" },
        { id: "hold", label: "Mantenerlo", detail: "Bajas dos escalones · ×1,3 en títulos" },
      ],
    },
    en: {
      title: "Open mic",
      body: "In the mixed zone you said what the whole dressing room thinks. Now it is the front page, without the context.",
      options: [
        { id: "apologise", label: "Walk it back", detail: "One rung down" },
        { id: "hold", label: "Stand by it", detail: "Two rungs down · ×1.3 on trophies" },
      ],
    },
    resolve(_next, option) {
      if (option === "hold") {
        return { effects: { roleShift: -2, titleMultiplier: { all: 1.3 } }, outcome: "held" };
      }
      return { effects: { roleShift: -1 }, outcome: "apologised" };
    },
  },
  {
    id: "el-tatuaje",
    weight: (c) => (c.age <= 26 ? 70 : 15),
    theme: "personal",
    es: {
      title: "El tatuaje",
      body: "Doce horas de aguja en la espalda, en pretemporada, y el club se entera por Instagram.",
      options: [
        { id: "accept", label: "Hacértelo", detail: "70% +2 OVR permanente · 30% al banquillo" },
        { id: "decline", label: "Dejarlo estar", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The tattoo",
      body: "Twelve hours under the needle, in pre-season, and the club finds out from Instagram.",
      options: [
        { id: "accept", label: "Get it done", detail: "70% +2 OVR permanent · 30% benched" },
        { id: "decline", label: "Leave it", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option !== "accept") return { effects: {}, outcome: "declined" };
      return chance(next, 0.7)
        ? { effects: { ovr: 2 }, outcome: "good" }
        : { effects: { forceRole: "suplente" }, outcome: "bad" };
    },
  },
  {
    id: "terminar-los-estudios",
    weight: (c) => (c.age <= 24 ? 80 : 0),
    theme: "personal",
    es: {
      title: "Los estudios",
      body: "Te quedaron dos asignaturas hace años. Las clases son por la mañana, que es cuando se entrena.",
      options: [
        { id: "study", label: "Terminarlos", detail: "+1 OVR permanente · bajas un escalón" },
        { id: "decline", label: "Ya habrá tiempo", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "Unfinished school",
      body: "You left two subjects hanging years ago. The classes are in the morning, which is when training happens.",
      options: [
        { id: "study", label: "Finish them", detail: "+1 OVR permanent · one rung down" },
        { id: "decline", label: "There will be time", detail: "No effect" },
      ],
    },
    resolve(_next, option) {
      if (option !== "study") return { effects: {}, outcome: "declined" };
      return { effects: { ovr: 1, roleShift: -1 }, outcome: "studied" };
    },
  },
  {
    id: "el-posteo-de-tu-hermano",
    weight: 35,
    theme: "personal",
    es: {
      title: "Lo que escribió tu hermano",
      body: "Un mensaje suyo sobre el entrenador con tu apellido debajo. Él no va a borrarlo y el club quiere un comunicado.",
      options: [
        { id: "family", label: "Con la familia", detail: "Bajas uno o dos escalones" },
        { id: "club", label: "Con el club", detail: "−2 OVR ahora · +2 después" },
      ],
    },
    en: {
      title: "What your brother posted",
      body: "A post of his about the manager, with your surname underneath it. He will not delete it and the club wants a statement.",
      options: [
        { id: "family", label: "Back your family", detail: "One or two rungs down" },
        { id: "club", label: "Back the club", detail: "−2 OVR now · +2 later" },
      ],
    },
    resolve(next, option) {
      if (option === "club") return { effects: { ovrTemp: -2, ovrReturn: 2 }, outcome: "club" };
      return { effects: { roleShift: chance(next, 0.5) ? -1 : -2 }, outcome: "family" };
    },
  },
  {
    id: "hacienda",
    weight: (c) => (c.age >= 28 && c.ovr >= 72 ? 70 : 0),
    theme: "pressure",
    es: {
      title: "Una carta de Hacienda",
      body: "Tu asesor de hace seis años montó algo que ya no se puede montar. La cifra no cabe en una temporada.",
      options: [{ id: "deal", label: "Pactar y pagar", detail: "−3 OVR ahora · +3 después" }],
    },
    en: {
      title: "A letter from the tax office",
      body: "Something your adviser set up six years ago that nobody sets up any more. The figure does not fit inside one season.",
      options: [{ id: "deal", label: "Settle and pay", detail: "−3 OVR now · +3 later" }],
    },
    resolve() {
      return { effects: { ovrTemp: -3, ovrReturn: 3 }, outcome: "settled" };
    },
  },
  {
    id: "el-abuelo",
    weight: (c) => (c.age >= 21 && !c.calledUp ? 90 : 0),
    theme: "tactic",
    es: {
      title: "El abuelo del pasaporte",
      body: "Una federación ha encontrado a tu abuelo en un registro civil. Te quieren y tu selección no te llama.",
      options: [
        { id: "switch", label: "Cambiar de selección", detail: "Reescribe tu umbral de convocatoria" },
        { id: "decline", label: "Esperar la llamada", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The grandfather in the paperwork",
      body: "A federation has found your grandfather in a civil registry. They want you, and your own country is not calling.",
      options: [
        { id: "switch", label: "Switch allegiance", detail: "Rewrites your call-up threshold" },
        { id: "decline", label: "Wait for the call", detail: "No effect" },
      ],
    },
    resolve(_next, option) {
      if (option !== "switch") return { effects: {}, outcome: "declined" };
      return { effects: { changeCountry: true }, outcome: "switched" };
    },
  },
  {
    id: "la-ampolla",
    weight: (c) => (c.delta < -2 ? 45 : 15),
    theme: "moral",
    es: {
      title: "La ampolla",
      body: "Un compañero te deja un vial en la taquilla y no te dice qué lleva. Dice que todo el mundo lo usa.",
      options: [
        { id: "take", label: "Usarla", detail: "75% +5 OVR · 25% sanción de un año" },
        { id: "decline", label: "Devolverla", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The vial",
      body: "A team-mate leaves a vial in your locker and does not say what is in it. He says everyone uses it.",
      options: [
        { id: "take", label: "Use it", detail: "75% +5 OVR · 25% one-year ban" },
        { id: "decline", label: "Give it back", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option !== "take") return { effects: {}, outcome: "declined" };
      return chance(next, 0.75)
        ? { effects: { ovr: 5 }, outcome: "good" }
        : { effects: { suspended: true }, outcome: "banned" };
    },
  },
  {
    id: "el-sobre",
    weight: (c) => (c.clubReputation <= 1 && c.ovr < 75 ? 50 : 12),
    theme: "moral",
    es: {
      title: "El sobre",
      body: "Alguien que no se presenta te explica lo que tiene que pasar en el minuto ochenta. Lo dice como si ya estuviera hecho.",
      options: [
        { id: "accept", label: "Cogerlo", detail: "50% +2 OVR · 50% sanción de un año" },
        { id: "decline", label: "Levantarte de la mesa", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The envelope",
      body: "Someone who does not give a name explains what has to happen in the eightieth minute. He says it like it is already done.",
      options: [
        { id: "accept", label: "Take it", detail: "50% +2 OVR · 50% one-year ban" },
        { id: "decline", label: "Get up and leave", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option !== "accept") return { effects: {}, outcome: "declined" };
      return chance(next, 0.5)
        ? { effects: { ovr: 2 }, outcome: "good" }
        : { effects: { suspended: true }, outcome: "banned" };
    },
  },
  {
    id: "club-contra-seleccion",
    weight: (c) => (c.calledUp ? 70 : 0),
    theme: "tactic",
    es: {
      title: "Club contra selección",
      body: "La convocatoria cae en semana de liga y el club te dice, sin decirlo, que si vas no vuelves al once.",
      options: [
        { id: "go", label: "Ir igualmente", detail: "Suplente en el club · convocatoria garantizada" },
        { id: "stay", label: "Quedarte", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "Club versus country",
      body: "The call-up lands on a league week and the club tells you, without saying it, that if you go you do not come back to the eleven.",
      options: [
        { id: "go", label: "Go anyway", detail: "Benched at your club · call-up guaranteed" },
        { id: "stay", label: "Stay", detail: "No effect" },
      ],
    },
    resolve(_next, option) {
      if (option !== "go") return { effects: {}, outcome: "stayed" };
      return { effects: { forceRole: "suplente", forceCallup: true }, outcome: "went" };
    },
  },
  {
    id: "lesion-en-el-peor-momento",
    weight: (c) => 20 + Math.max(0, c.age - 28) * 9,
    theme: "pressure",
    es: {
      title: "El tobillo, ahora no",
      body: "Se te ha ido el tobillo en el peor mes posible. El médico dice tres semanas; el calendario dice que no las tienes.",
      options: [
        { id: "force", label: "Forzar", detail: "80% llegas · −1 OVR" },
        { id: "rest", label: "Parar", detail: "30% llegas a tiempo" },
      ],
    },
    en: {
      title: "The ankle, not now",
      body: "Your ankle has gone in the worst possible month. The doctor says three weeks; the calendar says you do not have three weeks.",
      options: [
        { id: "force", label: "Play through it", detail: "80% you make it · −1 OVR" },
        { id: "rest", label: "Stop", detail: "30% you make it back in time" },
      ],
    },
    resolve(next, option) {
      if (option === "force") {
        return chance(next, 0.8)
          ? { effects: { ovr: -1 }, outcome: "good" }
          : { effects: { ovr: -1, roleShift: -1 }, outcome: "bad" };
      }
      return chance(next, 0.3)
        ? { effects: {}, outcome: "good" }
        : { effects: { roleShift: -1 }, outcome: "bad" };
    },
  },
  {
    id: "el-penalti",
    weight: (c) => (c.role === 'titular' || c.role === 'rotacion_alta' ? 55 : 15),
    theme: "story",
    es: {
      title: "El penalti",
      body: "Último minuto, y la pelota es tuya porque nadie más la ha querido. El portero espera. No hay información que valga.",
      options: [
        { id: "left", label: "A su izquierda", detail: "50%" },
        { id: "right", label: "A su derecha", detail: "50%" },
      ],
    },
    en: {
      title: "The penalty",
      body: "Last minute, and the ball is yours because nobody else wanted it. The keeper waits. There is no information to have.",
      options: [
        { id: "left", label: "To his left", detail: "50%" },
        { id: "right", label: "To his right", detail: "50%" },
      ],
    },
    resolve(next, option) {
      const keeperDives = chance(next, 0.5) ? "left" : "right";
      return option === keeperDives
        ? { effects: { ovrTemp: -1 }, outcome: "saved" }
        : { effects: { ovrTemp: 1, titleMultiplier: { cup: 1.5 } }, outcome: "scored" };
    },
  },

  /* ── The office ──────────────────────────────────────────────────────────────
     Cards that rewrite the contract. They only make sense once there is a contract
     to rewrite, so every one of them is gated on the deal you are actually on.   */

  {
    id: "renovacion-anticipada",
    weight: (c) => (c.contractYearsLeft > 0 && c.contractYearsLeft <= 2 && c.seasonsAtClub >= 1 ? 110 : 0),
    theme: "directiva",
    es: {
      title: "Renovación anticipada",
      body: "Te quedan pocos meses de contrato y el club quiere cerrarlo ya. Firmar ahora es tranquilidad; esperar es apostar a que el año siguiente vales más.",
      options: [
        { id: "sign", label: "Firmar la renovación", detail: "+2 años · ficha −10%" },
        { id: "push", label: "Pedir una subida", detail: "55% +2 años y ficha +35% · 45% nada" },
        { id: "wait", label: "Esperar al verano", detail: "Sin efecto: llegas libre" },
      ],
    },
    en: {
      title: "Early renewal",
      body: "You are months from the end and the club wants it closed now. Signing today is peace of mind; waiting is a bet that you are worth more next year.",
      options: [
        { id: "sign", label: "Sign the extension", detail: "+2 years · wage −10%" },
        { id: "push", label: "Ask for a rise", detail: "55% +2 years and wage +35% · 45% nothing" },
        { id: "wait", label: "Wait for the summer", detail: "No effect: you run it down" },
      ],
    },
    resolve(next, option) {
      if (option === "sign") return { effects: { yearsDelta: 2, wageFactor: 0.9 }, outcome: "signed" };
      if (option === "push") {
        return chance(next, 0.55)
          ? { effects: { yearsDelta: 2, wageFactor: 1.35 }, outcome: "good" }
          : { effects: {}, outcome: "refused" };
      }
      return { effects: {}, outcome: "waited" };
    },
  },
  {
    id: "bajarte-la-ficha",
    weight: (c) => (c.contractYearsLeft > 0 && c.clubReputation <= 2 ? 80 : 0),
    theme: "directiva",
    es: {
      title: "Las cuentas no salen",
      body: "El club no llega a fin de mes y tu ficha es de las tres más altas. Te lo piden de buenas maneras, que es como se piden estas cosas cuando no hay alternativa.",
      options: [
        { id: "accept", label: "Bajarte la ficha", detail: "Ficha −25% · la grada lo sabrá" },
        { id: "refuse", label: "Negarte", detail: "Un escalón menos de rol" },
      ],
    },
    en: {
      title: "The books do not balance",
      body: "The club cannot make the month and your wage is one of the three biggest. They ask nicely, which is how these things are asked when there is no alternative.",
      options: [
        { id: "accept", label: "Take the cut", detail: "Wage −25% · the stand will hear" },
        { id: "refuse", label: "Refuse", detail: "One rung down the role ladder" },
      ],
    },
    resolve(next, option) {
      return option === "accept"
        ? { effects: { wageFactor: 0.75 }, outcome: "accepted" }
        : { effects: { roleShift: -1 }, outcome: "refused" };
    },
  },
  {
    id: "pagan-tu-clausula",
    weight: (c) => (c.contractYearsLeft > 0 && c.ovr >= 76 && c.seasonsAtClub >= 1 ? 60 : 0),
    theme: "directiva",
    es: {
      title: "Alguien ha pagado",
      body: "Un club ha depositado tu cláusula entera. Legalmente ya no hay nada que discutir: solo queda si te vas tú o si te quedas y el dinero vuelve.",
      options: [
        { id: "go", label: "Forzar la salida", detail: "Sales seguro este verano" },
        { id: "stay", label: "Quedarte igualmente", detail: "Cláusula ×1.6 · la grada no lo olvida" },
      ],
    },
    en: {
      title: "Somebody paid it",
      body: "A club has deposited your buy-out in full. Legally there is nothing left to argue: only whether you go, or stay and the money goes back.",
      options: [
        { id: "go", label: "Force the move", detail: "You leave this summer, guaranteed" },
        { id: "stay", label: "Stay anyway", detail: "Clause ×1.6 · the stand remembers" },
      ],
    },
    resolve(next, option) {
      return option === "go"
        ? { effects: { forceTransfer: true }, outcome: "left" }
        : { effects: { clauseFactor: 1.6, ovrTemp: 1 }, outcome: "stayed" };
    },
  },
  {
    id: "el-nuevo-presidente",
    weight: (c) => (c.seasonsAtClub >= 2 ? 70 : 20),
    theme: "directiva",
    es: {
      title: "Presidente nuevo",
      body: "Ha ganado las elecciones prometiendo limpiar el vestuario. En la primera rueda de prensa no dice tu nombre ni una vez, que es una manera de decirlo.",
      options: [
        { id: "back", label: "Salir a apoyarle", detail: "60% un escalón más de rol · 40% nada" },
        { id: "quiet", label: "No decir nada", detail: "Sin efecto" },
        { id: "against", label: "Marcar distancias", detail: "Cláusula ×0.6 · un escalón menos de rol" },
      ],
    },
    en: {
      title: "A new president",
      body: "He won on a promise to clean out the dressing room. In his first press conference he does not say your name once, which is a way of saying it.",
      options: [
        { id: "back", label: "Back him publicly", detail: "60% one rung up · 40% nothing" },
        { id: "quiet", label: "Say nothing", detail: "No effect" },
        { id: "against", label: "Keep your distance", detail: "Clause ×0.6 · one rung down" },
      ],
    },
    resolve(next, option) {
      if (option === "back") {
        return chance(next, 0.6)
          ? { effects: { roleShift: 1 }, outcome: "good" }
          : { effects: {}, outcome: "ignored" };
      }
      if (option === "against") {
        return { effects: { clauseFactor: 0.6, roleShift: -1 }, outcome: "cold" };
      }
      return { effects: {}, outcome: "quiet" };
    },
  },
  {
    id: "el-patrocinador",
    weight: (c) => (c.ovr >= 72 ? 65 : 15),
    theme: "directiva",
    es: {
      title: "La marca",
      body: "Una marca deportiva te quiere en su cartel. Pagan bien y a cambio existes en sitios donde no se juega al fútbol.",
      options: [
        { id: "sign", label: "Firmar el contrato", detail: "Ficha +20% · sube lo que se te exige" },
        { id: "decline", label: "Dejarlo pasar", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The brand",
      body: "A sportswear company wants you on the billboard. It pays well, and in exchange you exist in places where no football is played.",
      options: [
        { id: "sign", label: "Sign the deal", detail: "Wage +20% · and what is expected of you" },
        { id: "decline", label: "Let it go", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      return option === "sign"
        ? { effects: { wageFactor: 1.2 }, outcome: "signed" }
        : { effects: {}, outcome: "declined" };
    },
  },
  {
    id: "venta-del-club",
    weight: (c) => (c.clubReputation <= 3 ? 55 : 25),
    theme: "directiva",
    es: {
      title: "Cambio de dueño",
      body: "El club tiene propietario nuevo y un plan de tres años que empieza fichando a gente de tu puesto. Nadie te ha dicho nada, que ya es decir bastante.",
      options: [
        { id: "fight", label: "Pelear el puesto", detail: "50% +2 OVR · 50% un escalón menos" },
        { id: "adapt", label: "Ponerte a su disposición", detail: "Odds de título ×1.25 · rol sin cambios" },
        { id: "out", label: "Pedir salir", detail: "Sales seguro este verano" },
      ],
    },
    en: {
      title: "New owners",
      body: "The club has been bought, with a three-year plan that starts by signing players in your position. Nobody has told you anything, which tells you plenty.",
      options: [
        { id: "fight", label: "Fight for the shirt", detail: "50% +2 OVR · 50% one rung down" },
        { id: "adapt", label: "Make yourself useful", detail: "Trophy odds ×1.25 · role unchanged" },
        { id: "out", label: "Ask to leave", detail: "You leave this summer, guaranteed" },
      ],
    },
    resolve(next, option) {
      if (option === "fight") {
        return chance(next, 0.5)
          ? { effects: { ovr: 2 }, outcome: "good" }
          : { effects: { roleShift: -1 }, outcome: "bad" };
      }
      if (option === "out") return { effects: { forceTransfer: true }, outcome: "left" };
      return { effects: { titleMultiplier: { all: 1.25 } }, outcome: "adapted" };
    },
  },

  /* ── The dressing room ───────────────────────────────────────────────────────
     The only cards with other players in them. They pay in role and in standing,
     never in OVR alone, because a dressing room decides who plays and not how good
     anybody is.                                                                  */

  {
    id: "el-capitan-se-va",
    weight: (c) => (c.seasonsAtClub >= 2 && c.age >= 24 ? 95 : 0),
    theme: "vestuario",
    es: {
      title: "El brazalete libre",
      body: "El capitán se ha ido y el brazalete está encima de una silla. Hay tres candidatos y dos llevan más años que tú.",
      options: [
        { id: "ask", label: "Pedirlo", detail: "45% un escalón más de rol · 55% queda raro" },
        { id: "wait", label: "No moverte", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The armband is free",
      body: "The captain has gone and the armband is sitting on a chair. There are three candidates and two of them have been here longer than you.",
      options: [
        { id: "ask", label: "Ask for it", detail: "45% one rung up · 55% it lands badly" },
        { id: "wait", label: "Stay put", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option !== "ask") return { effects: {}, outcome: "waited" };
      return chance(next, 0.45)
        ? { effects: { roleShift: 1 }, outcome: "captain" }
        : { effects: { ovrTemp: -1 }, outcome: "awkward" };
    },
  },
  {
    id: "pelea-en-el-vestuario",
    weight: 85,
    theme: "vestuario",
    es: {
      title: "Se lían a las manos",
      body: "Dos compañeros, media hora después de un partido malo. En treinta segundos esto sale de aquí y lo cuenta alguien que no estaba.",
      options: [
        { id: "split", label: "Separarlos", detail: "70% odds de título ×1.2 · 30% te llevas un golpe" },
        { id: "join", label: "Meterte de parte de uno", detail: "Un escalón menos de rol · el otro no lo olvida" },
        { id: "watch", label: "Mirar y callar", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "It comes to blows",
      body: "Two team-mates, half an hour after a bad game. In thirty seconds this leaves the room and gets told by somebody who was not in it.",
      options: [
        { id: "split", label: "Break it up", detail: "70% trophy odds ×1.2 · 30% you take one" },
        { id: "join", label: "Take a side", detail: "One rung down · the other one remembers" },
        { id: "watch", label: "Watch and say nothing", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option === "split") {
        return chance(next, 0.7)
          ? { effects: { titleMultiplier: { all: 1.2 } }, outcome: "good" }
          : { effects: { ovrTemp: -2, matchesDelta: -3 }, outcome: "hurt" };
      }
      if (option === "join") return { effects: { roleShift: -1 }, outcome: "sided" };
      return { effects: {}, outcome: "watched" };
    },
  },
  {
    id: "el-veterano",
    weight: (c) => (c.age <= 24 ? 110 : 25),
    theme: "vestuario",
    es: {
      title: "El veterano te corrige",
      body: "Delante de todos, y no del todo sin razón. Lo que decidas ahora es lo que va a ser tu sitio en esa habitación durante dos años.",
      options: [
        { id: "listen", label: "Agachar la cabeza", detail: "+2 OVR el año que viene" },
        { id: "answer", label: "Responderle", detail: "50% +2 OVR ya · 50% un escalón menos" },
      ],
    },
    en: {
      title: "The senior pro corrects you",
      body: "In front of everyone, and not entirely without reason. What you do next is what your place in that room will be for two years.",
      options: [
        { id: "listen", label: "Take it", detail: "+2 OVR next year" },
        { id: "answer", label: "Answer back", detail: "50% +2 OVR now · 50% one rung down" },
      ],
    },
    resolve(next, option) {
      if (option === "listen") return { effects: { ovrReturn: 2 }, outcome: "listened" };
      return chance(next, 0.5)
        ? { effects: { ovr: 2 }, outcome: "stood" }
        : { effects: { roleShift: -1 }, outcome: "marked" };
    },
  },
  {
    id: "el-grupito",
    weight: (c) => (c.seasonsAtClub <= 2 ? 90 : 35),
    theme: "vestuario",
    // `out` is "ask to leave the club" on every other card and "eat with the kids" on this
    // one, so this one says so rather than wearing the wrong glyph.
    icons: { out: "personal" },
    es: {
      title: "Los de siempre",
      body: "En el vestuario hay un grupo que decide dónde se come, quién habla en las reuniones y a quién se le pasa el balón. Te han hecho sitio.",
      options: [
        { id: "in", label: "Sentarte con ellos", detail: "Un escalón más de rol · odds de título ×0.85" },
        { id: "out", label: "Comer con los jóvenes", detail: "+2 OVR el año que viene" },
        { id: "none", label: "Ir a tu aire", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The inner circle",
      body: "There is a group in that dressing room that decides where they eat, who speaks in meetings and who gets the ball. They have made room for you.",
      options: [
        { id: "in", label: "Sit with them", detail: "One rung up · trophy odds ×0.85" },
        { id: "out", label: "Eat with the kids", detail: "+2 OVR next year" },
        { id: "none", label: "Keep to yourself", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option === "in") {
        return { effects: { roleShift: 1, titleMultiplier: { all: 0.85 } }, outcome: "inside" };
      }
      if (option === "out") return { effects: { ovrReturn: 2 }, outcome: "outside" };
      return { effects: {}, outcome: "alone" };
    },
  },
  {
    id: "companero-lesionado",
    weight: 70,
    theme: "vestuario",
    es: {
      title: "Al que le tocó",
      body: "Cruzado. Ocho meses. Es el que te enseñó dónde estaba todo cuando llegaste, y ahora entrena solo a las nueve de la mañana en un campo vacío.",
      options: [
        { id: "with", label: "Entrenar con él por las mañanas", detail: "Odds de título ×1.15 · −4 partidos" },
        { id: "message", label: "Escribirle y ya", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The one it happened to",
      body: "Cruciate. Eight months. He is the one who showed you where everything was when you arrived, and now he trains alone at nine in the morning on an empty pitch.",
      options: [
        { id: "with", label: "Train with him in the mornings", detail: "Trophy odds ×1.15 · −4 matches" },
        { id: "message", label: "Send a message and leave it", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      return option === "with"
        ? { effects: { titleMultiplier: { all: 1.15 }, matchesDelta: -4 }, outcome: "went" }
        : { effects: {}, outcome: "texted" };
    },
  },
  {
    id: "novatada",
    weight: (c) => (c.age <= 20 ? 120 : 0),
    theme: "vestuario",
    es: {
      title: "Cantar en la comida",
      body: "Encima de una silla, delante de cincuenta personas, sin música. Es ridículo y todos los que se ríen pasaron por ahí.",
      options: [
        { id: "sing", label: "Cantar", detail: "+1 OVR · un escalón más de rol si sale bien (60%)" },
        { id: "refuse", label: "Negarte", detail: "Un escalón menos de rol" },
      ],
    },
    en: {
      title: "Sing at the lunch",
      body: "On a chair, in front of fifty people, no music. It is ridiculous, and everyone laughing went through it themselves.",
      options: [
        { id: "sing", label: "Sing", detail: "+1 OVR · 60% one rung up as well" },
        { id: "refuse", label: "Refuse", detail: "One rung down the role ladder" },
      ],
    },
    resolve(next, option) {
      if (option !== "sing") return { effects: { roleShift: -1 }, outcome: "refused" };
      return chance(next, 0.6)
        ? { effects: { ovr: 1, roleShift: 1 }, outcome: "great" }
        : { effects: { ovr: 1 }, outcome: "fine" };
    },
  },

  /* ── More of the everyday ────────────────────────────────────────────────── */

  {
    id: "especialista-balon-parado",
    weight: (c) => (c.role === "titular" || c.role === "rotacion_alta" ? 100 : 20),
    theme: "sport",
    es: {
      title: "Quedarte los libres",
      body: "El que los tiraba se ha ido. Quedarte las faltas y los penaltis es firmar por adelantado que si fallas uno grande, lo fallaste tú.",
      options: [
        { id: "take", label: "Quedártelos", detail: "Odds de copa ×1.4 · odds de liga ×1.1" },
        { id: "leave", label: "Dejárselos a otro", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "Take the set pieces",
      body: "The man who hit them has left. Taking the free kicks and the penalties is signing up in advance to be the one who missed the big one.",
      options: [
        { id: "take", label: "Take them", detail: "Cup odds ×1.4 · league odds ×1.1" },
        { id: "leave", label: "Leave them to somebody else", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      return option === "take"
        ? { effects: { titleMultiplier: { cup: 1.4, league: 1.1 } }, outcome: "took" }
        : { effects: {}, outcome: "left" };
    },
  },
  {
    id: "gimnasio-en-vacaciones",
    weight: (c) => (c.age <= 30 ? 95 : 45),
    theme: "sport",
    es: {
      title: "Las tres semanas",
      body: "Es lo único que hay en todo el año que es tuyo. Y es exactamente donde se decide en qué estado llegas a agosto.",
      options: [
        { id: "work", label: "Volver antes a entrenar", detail: "+3 OVR · −3 partidos por sobrecarga" },
        { id: "half", label: "Mantenerte a medias", detail: "+1 OVR" },
        { id: "off", label: "Desconectar del todo", detail: "70% +2 OVR el año que viene · 30% nada" },
      ],
    },
    en: {
      title: "The three weeks",
      body: "It is the only thing all year that belongs to you. It is also exactly where the condition you turn up in August with gets decided.",
      options: [
        { id: "work", label: "Come back early", detail: "+3 OVR · −3 matches from overload" },
        { id: "half", label: "Tick over", detail: "+1 OVR" },
        { id: "off", label: "Switch off completely", detail: "70% +2 OVR next year · 30% nothing" },
      ],
    },
    resolve(next, option) {
      if (option === "work") return { effects: { ovr: 3, matchesDelta: -3 }, outcome: "worked" };
      if (option === "half") return { effects: { ovr: 1 }, outcome: "steady" };
      return chance(next, 0.7)
        ? { effects: { ovrReturn: 2 }, outcome: "rested" }
        : { effects: {}, outcome: "flat" };
    },
  },
  {
    id: "el-entrenador-nuevo",
    weight: 105,
    theme: "tactic",
    es: {
      title: "Entrenador nuevo",
      body: "Trae un sistema en el que tu posición no existe tal y como la juegas. Tienes una pretemporada para convencerle o para convencerte.",
      options: [
        { id: "adapt", label: "Aprender su sistema", detail: "−2 OVR ahora · +4 OVR el año que viene" },
        { id: "resist", label: "Jugar a lo tuyo", detail: "45% titular fijo · 55% un escalón menos" },
        { id: "talk", label: "Hablar con él a solas", detail: "Odds de título ×1.2 · sin cambios de rol" },
      ],
    },
    en: {
      title: "A new manager",
      body: "He brings a system your position does not exist in, not the way you play it. You have one pre-season to convince him or to convince yourself.",
      options: [
        { id: "adapt", label: "Learn his system", detail: "−2 OVR now · +4 OVR next year" },
        { id: "resist", label: "Play your own game", detail: "45% pinned as a starter · 55% one rung down" },
        { id: "talk", label: "Speak to him alone", detail: "Trophy odds ×1.2 · role unchanged" },
      ],
    },
    resolve(next, option) {
      if (option === "adapt") return { effects: { ovrTemp: -2, ovrReturn: 4 }, outcome: "adapted" };
      if (option === "talk") return { effects: { titleMultiplier: { all: 1.2 } }, outcome: "talked" };
      return chance(next, 0.45)
        ? { effects: { forceRole: "titular" }, outcome: "won" }
        : { effects: { roleShift: -1 }, outcome: "lost" };
    },
  },
  {
    id: "jugar-tocado",
    weight: (c) => (c.role === "titular" ? 95 : 35),
    theme: "tactic",
    es: {
      title: "Jugar tocado",
      body: "El médico dice que no y el entrenador dice tu nombre en la pizarra. Los dos están haciendo su trabajo y el que decide eres tú.",
      options: [
        { id: "play", label: "Jugar igualmente", detail: "Odds de título ×1.3 · 55% −2 OVR y −6 partidos" },
        { id: "rest", label: "Parar dos semanas", detail: "−4 partidos" },
      ],
    },
    en: {
      title: "Play through it",
      body: "The doctor says no and the manager writes your name on the board. Both are doing their job, and the one who decides is you.",
      options: [
        { id: "play", label: "Play anyway", detail: "Trophy odds ×1.3 · 55% −2 OVR and −6 matches" },
        { id: "rest", label: "Stop for two weeks", detail: "−4 matches" },
      ],
    },
    resolve(next, option) {
      if (option !== "play") return { effects: { matchesDelta: -4 }, outcome: "rested" };
      return chance(next, 0.55)
        ? { effects: { titleMultiplier: { all: 1.3 }, ovr: -2, matchesDelta: -6 }, outcome: "broke" }
        : { effects: { titleMultiplier: { all: 1.3 } }, outcome: "held" };
    },
  },
  {
    id: "la-portada",
    weight: (c) => (c.ovr >= 74 ? 90 : 30),
    theme: "pressure",
    es: {
      title: "La portada",
      body: "Un diario abre con una foto tuya saliendo de un sitio a las cuatro de la mañana. La foto es real y la historia que cuentan no.",
      options: [
        { id: "explain", label: "Dar la cara", detail: "60% sin efecto · 40% −1 OVR" },
        { id: "silent", label: "No contestar", detail: "Un escalón menos de rol" },
        { id: "sue", label: "Denunciar al diario", detail: "Cláusula ×1.3 · odds de título ×0.9" },
      ],
    },
    en: {
      title: "The front page",
      body: "A paper leads with a photograph of you leaving somewhere at four in the morning. The photograph is real and the story they tell around it is not.",
      options: [
        { id: "explain", label: "Front up", detail: "60% no effect · 40% −1 OVR" },
        { id: "silent", label: "Say nothing", detail: "One rung down the role ladder" },
        { id: "sue", label: "Sue the paper", detail: "Clause ×1.3 · trophy odds ×0.9" },
      ],
    },
    resolve(next, option) {
      if (option === "explain") {
        return chance(next, 0.6)
          ? { effects: {}, outcome: "handled" }
          : { effects: { ovr: -1 }, outcome: "worse" };
      }
      if (option === "sue") {
        return { effects: { clauseFactor: 1.3, titleMultiplier: { all: 0.9 } }, outcome: "sued" };
      }
      return { effects: { roleShift: -1 }, outcome: "silent" };
    },
  },
  {
    id: "el-arbitro",
    weight: 75,
    theme: "pressure",
    es: {
      title: "Lo que dijiste en el túnel",
      body: "Se lo dijiste al árbitro cuando ya no había cámaras, o eso creías. El acta lo recoge entero y con comillas.",
      options: [
        { id: "apologise", label: "Pedir perdón por escrito", detail: "−2 partidos" },
        { id: "hold", label: "Mantenerlo", detail: "45% sanción de temporada · 55% −6 partidos" },
      ],
    },
    en: {
      title: "What you said in the tunnel",
      body: "You said it to the referee once the cameras were gone, or so you thought. The match report has all of it, in quotation marks.",
      options: [
        { id: "apologise", label: "Apologise in writing", detail: "−2 matches" },
        { id: "hold", label: "Stand by it", detail: "45% banned for the season · 55% −6 matches" },
      ],
    },
    resolve(next, option) {
      if (option === "apologise") return { effects: { matchesDelta: -2 }, outcome: "sorry" };
      return chance(next, 0.45)
        ? { effects: { suspended: true }, outcome: "banned" }
        : { effects: { matchesDelta: -6 }, outcome: "fined" };
    },
  },
  {
    id: "paternidad",
    weight: (c) => (c.age >= 24 && c.age <= 34 ? 105 : 0),
    theme: "personal",
    es: {
      title: "Vas a ser padre",
      body: "En febrero, en mitad de la temporada, y el club juega fuera ese fin de semana. Nadie te va a decir que no vayas.",
      options: [
        { id: "stay", label: "Quedarte en casa esas semanas", detail: "−6 partidos · +3 OVR el año que viene" },
        { id: "play", label: "Volver al día siguiente", detail: "Sin efecto en el campo" },
      ],
    },
    en: {
      title: "You are going to be a father",
      body: "In February, mid-season, and the club is away that weekend. Nobody is going to tell you not to go.",
      options: [
        { id: "stay", label: "Stay home for those weeks", detail: "−6 matches · +3 OVR next year" },
        { id: "play", label: "Be back the next day", detail: "No effect on the pitch" },
      ],
    },
    resolve(next, option) {
      return option === "stay"
        ? { effects: { matchesDelta: -6, ovrReturn: 3 }, outcome: "home" }
        : { effects: {}, outcome: "back" };
    },
  },
  {
    id: "la-mudanza",
    weight: (c) => (c.abroad ? 110 : 0),
    theme: "personal",
    es: {
      title: "No se adaptan",
      body: "Tú estás bien: entrenas, juegas y te acuestas pronto. En casa llevan ocho meses en una ciudad cuyo idioma no hablan y sin nadie a quien llamar.",
      options: [
        { id: "home", label: "Mandarlos de vuelta y quedarte solo", detail: "+2 OVR · −1 OVR el año que viene" },
        { id: "stay", label: "Aguantar todos juntos", detail: "−2 OVR" },
        { id: "leave", label: "Pedir la vuelta a casa", detail: "Sales seguro este verano" },
      ],
    },
    en: {
      title: "They have not settled",
      body: "You are fine: you train, you play, you go to bed early. At home they have spent eight months in a city whose language they do not speak with nobody to call.",
      options: [
        { id: "home", label: "Send them back and stay alone", detail: "+2 OVR · −1 OVR next year" },
        { id: "stay", label: "All of you stick it out", detail: "−2 OVR" },
        { id: "leave", label: "Ask to go home", detail: "You leave this summer, guaranteed" },
      ],
    },
    resolve(next, option) {
      if (option === "home") return { effects: { ovr: 2, ovrReturn: -1 }, outcome: "alone" };
      if (option === "leave") return { effects: { forceTransfer: true }, outcome: "home" };
      return { effects: { ovr: -2 }, outcome: "together" };
    },
  },
  {
    id: "el-agente",
    weight: (c) => (c.age >= 22 ? 80 : 25),
    theme: "moral",
    es: {
      title: "Tu agente te ha mentido",
      body: "Descubres que cobró de las dos partes en tu último traspaso. Lleva contigo desde los quince y es el único que te llamaba cuando no jugabas.",
      options: [
        { id: "cut", label: "Romper con él", detail: "Cláusula ×1.4 · un club menos te mira" },
        { id: "keep", label: "Seguir con él", detail: "Cláusula ×0.7 · lo sabes y él sabe que lo sabes" },
      ],
    },
    en: {
      title: "Your agent lied to you",
      body: "You find out he took a fee from both sides of your last transfer. He has been with you since you were fifteen, and he was the only one who called when you were not playing.",
      options: [
        { id: "cut", label: "Cut him loose", detail: "Clause ×1.4 · one fewer club looking" },
        { id: "keep", label: "Keep him", detail: "Clause ×0.7 · you know, and he knows you know" },
      ],
    },
    resolve(next, option) {
      return option === "cut"
        ? { effects: { clauseFactor: 1.4 }, outcome: "cut" }
        : { effects: { clauseFactor: 0.7, ovrTemp: -1 }, outcome: "kept" };
    },
  },
  {
    id: "el-dorsal",
    weight: (c) => (c.seasonsAtClub >= 1 ? 70 : 0),
    theme: "story",
    es: {
      title: "El dorsal",
      body: "Queda libre el número que lleva en ese club cincuenta años. Lo han llevado cuatro jugadores y a tres se les recuerda por eso.",
      options: [
        { id: "take", label: "Pedirlo", detail: "Odds de título ×1.15 · 40% −1 OVR por la presión" },
        { id: "keep", label: "Quedarte el tuyo", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The number",
      body: "The shirt that has meant something at this club for fifty years is free. Four players have worn it and three of them are remembered for it.",
      options: [
        { id: "take", label: "Ask for it", detail: "Trophy odds ×1.15 · 40% −1 OVR from the weight" },
        { id: "keep", label: "Keep your own", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      if (option !== "take") return { effects: {}, outcome: "kept" };
      return chance(next, 0.4)
        ? { effects: { titleMultiplier: { all: 1.15 }, ovr: -1 }, outcome: "heavy" }
        : { effects: { titleMultiplier: { all: 1.15 } }, outcome: "worn" };
    },
  },
  {
    id: "la-carta",
    weight: (c) => (c.idolatry >= 40 ? 85 : 25),
    theme: "story",
    es: {
      title: "La carta",
      body: "Un niño te escribe que va a tu campo con su padre desde hace seis años y que nunca han conseguido que le firmes nada. Da la dirección del colegio.",
      options: [
        { id: "go", label: "Presentarte en el colegio", detail: "−2 partidos · la ciudad se entera" },
        { id: "send", label: "Mandarle una camiseta", detail: "Sin efecto" },
      ],
    },
    en: {
      title: "The letter",
      body: "A boy writes that he has been coming to your ground with his father for six years and has never once got you to sign anything. He gives the address of his school.",
      options: [
        { id: "go", label: "Turn up at the school", detail: "−2 matches · the city hears about it" },
        { id: "send", label: "Send a shirt", detail: "No effect" },
      ],
    },
    resolve(next, option) {
      return option === "go"
        ? { effects: { matchesDelta: -2 }, outcome: "went" }
        : { effects: {}, outcome: "sent" };
    },
  },
];

export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map((event) => [event.id, event]));

/** Injuries are not decisions: they happen, you are told, you carry on. */
export const INJURY_CHANCE = 0.02;
export const MAX_INJURIES = 2;

export const INJURIES = [
  { id: "hamstring", ovr: -1, matches: -8, es: "Rotura del isquiotibial", en: "Hamstring tear" },
  { id: "ankle", ovr: -1, matches: -6, es: "Esguince grave de tobillo", en: "Bad ankle sprain" },
  { id: "knee", ovr: -3, matches: -20, es: "Ligamento cruzado", en: "Cruciate ligament" },
  { id: "metatarsal", ovr: -2, matches: -12, es: "Metatarsiano", en: "Metatarsal" },
];

/**
 * The weight of one card for one career. A plain number is used as-is; a function is
 * asked. Anything that comes back zero, negative or unusable is out of the deck.
 */
export function weightOf(event, context = {}) {
  const raw = typeof event.weight === "function" ? event.weight(context) : event.weight;
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

/**
 * Pick the event for a period. Personal events are spread across the career with at
 * least two years between them, so they read as punctuation rather than a stream.
 *
 * With state-dependent weights the pool can legitimately come out empty - a seventeen
 * year old is not eligible for half the catalogue - so the caller has to handle null.
 */
export function drawEvent(seed, step, usedIds = [], context = {}) {
  const pool = EVENTS.filter((event) => !usedIds.includes(event.id)).map((event) => ({
    event,
    weight: weightOf(event, context),
  }));
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;

  const next = createStream(seed, "event", step);
  let target = next() * total;
  for (const entry of pool) {
    if (entry.weight <= 0) continue;
    target -= entry.weight;
    if (target <= 0) return entry.event;
  }
  return pool.filter((entry) => entry.weight > 0).pop()?.event ?? null;
}

export function drawInjury(seed, step) {
  const next = createStream(seed, "injury", step);
  if (!chance(next, INJURY_CHANCE)) return null;
  return INJURIES[Math.floor(next() * INJURIES.length)];
}

/**
 * Fold an event's effects into the state. Permanent OVR lands immediately; temporary
 * OVR lands as a modifier for the coming season and is queued to be returned after.
 */
export function applyEffects(state, effects = {}) {
  const modifiers = { ...(state.modifiers ?? {}), titleMultipliers: { ...(state.modifiers?.titleMultipliers ?? {}) } };

  if (effects.ovrTemp) modifiers.ovrTemp = (modifiers.ovrTemp ?? 0) + effects.ovrTemp;
  if (effects.matchesDelta) {
    modifiers.matchesDelta = (modifiers.matchesDelta ?? 0) + effects.matchesDelta;
  }
  if (effects.roleShift) modifiers.roleShift = (modifiers.roleShift ?? 0) + effects.roleShift;
  if (effects.forceRole) modifiers.forceRole = effects.forceRole;
  if (effects.suspended) modifiers.suspended = true;
  if (effects.forceCallup) modifiers.forceCallup = true;
  if (effects.titleMultiplier) {
    for (const [trophy, multiplier] of Object.entries(effects.titleMultiplier)) {
      modifiers.titleMultipliers[trophy] = (modifiers.titleMultipliers[trophy] ?? 1) * multiplier;
    }
  }

  return {
    ...state,
    ovr: Math.max(40, Math.min(99, state.ovr + (effects.ovr ?? 0))),
    pendingOvr: (state.pendingOvr ?? 0) + (effects.ovrReturn ?? 0),
    modifiers,
    contract: applyToContract(state.contract, effects),
    pendingCountryChange: effects.changeCountry ? true : state.pendingCountryChange,
    forceTransfer: effects.forceTransfer ? true : state.forceTransfer,
    returnToFirstClub: effects.returnToFirstClub ? true : state.returnToFirstClub,
  };
}

/**
 * Cards that rewrite the deal you are on.
 *
 * A wage change is never only a wage change: the band it lands in is what the crowd will
 * hold you to, so it is recomputed here rather than left stale on the contract.
 */
export function applyToContract(contract, effects = {}) {
  if (!contract) return contract;
  if (!effects.wageFactor && !effects.yearsDelta && !effects.clauseFactor) return contract;

  const wage = effects.wageFactor
    ? Math.round(contract.wage * effects.wageFactor)
    : contract.wage;
  const years = Math.max(1, contract.years + (effects.yearsDelta ?? 0));

  return {
    ...contract,
    wage,
    wageRole: wageBand(wage, contract.pay ?? { reputation: contract.reputation ?? 0 }),
    years,
    yearsLeft: Math.max(0, Math.min(years, contract.yearsLeft + (effects.yearsDelta ?? 0))),
    clause: effects.clauseFactor
      ? Math.round(contract.clause * effects.clauseFactor)
      : contract.clause,
  };
}
