/**
 * The press.
 *
 * A season record is a row of numbers. This turns it into the one line a sports daily
 * would have run, which is the difference between reading a spreadsheet and remembering
 * a career.
 *
 * Rules, not templates-at-random: each season we find the most newsworthy true thing
 * that happened and report that. Nothing here invents facts.
 */

import { PRODUCES } from "./bigmatch.js";
import { shadowSeasonAt } from "./rival.js";
import { GROWTH } from "./tables.js";

const TROPHY_NAMES = {
  es: {
    league: "la liga",
    cup: "la copa",
    continental_a: "la continental",
    continental_b: "la segunda continental",
    club_world_cup: "el Mundial de Clubes",
    continental_nt: "el continental",
    world_cup: "el Mundial",
  },
  en: {
    league: "the league",
    cup: "the cup",
    continental_a: "the continental",
    continental_b: "the secondary continental",
    club_world_cup: "the Club World Cup",
    continental_nt: "the continental",
    world_cup: "the World Cup",
  },
};

const AWARD_NAMES = {
  es: { ballon_dor: "el Balón de Oro", golden_boot: "la Bota de Oro", golden_glove: "el Guante de Oro" },
  en: { ballon_dor: "the Ballon d'Or", golden_boot: "the Golden Boot", golden_glove: "the Golden Glove" },
};

/**
 * The big matches, named the way a match report would name them rather than the way the
 * fixture table does.
 */
const FIXTURE_NAMES = {
  es: {
    final_mundial: "la final del Mundial",
    final_continental_nt: "la final continental",
    final_continental: "la final continental",
    ascenso: "el partido del ascenso",
    salvacion: "la final por la permanencia",
    titulo_liga: "la final de liga",
    final_copa: "la final de copa",
    semifinal_continental: "la semifinal continental",
    clasico: "el partido de la temporada",
  },
  en: {
    final_mundial: "the World Cup final",
    final_continental_nt: "the continental final",
    final_continental: "the continental final",
    ascenso: "the promotion play-off",
    salvacion: "the survival decider",
    titulo_liga: "the title decider",
    final_copa: "the cup final",
    semifinal_continental: "the continental semi-final",
    clasico: "the match of the season",
  },
};

/** What a shot has to settle for the paper to lead with it. A derby settles nothing. */
const DECISIVE = ["league", "cup", "continental_a", "world_cup", "continental_nt", "promotion", "survival"];

/**
 * The shot the paper leads with. A decider the ball never reached him in is deliberately
 * not one: `scored` is false there because nothing went in, not because he missed, and a
 * back page reading "HE MISSED IT" over a night he never got a kick is the one accusation
 * the model explicitly refuses to make (see DECIDES.absent).
 */
const decisiveShot = (record, scored, produces = PRODUCES.GOAL) =>
  record.bigMatches?.find(
    (match) =>
      !match.absent &&
      match.scored === scored &&
      (match.produces ?? PRODUCES.GOAL) === produces &&
      DECISIVE.includes(match.decides),
  ) ?? null;

const capitalise = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

const fill = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_match, key) => String(values[key] ?? ""));

/**
 * Ordered rules. The first that matches writes the headline, so the list is a priority
 * ranking of what a paper would actually lead with.
 */
const RULES = [
  {
    id: "banned",
    when: (s) => s.suspended,
    es: { head: "UN AÑO FUERA", body: "{surname} queda apartado toda la temporada. Ni un partido, ni un título, ni una línea en la clasificación." },
    en: { head: "A YEAR OUT", body: "{surname} is suspended for the full season. Not one match, not one trophy, not one line in the table." },
  },
  // A season the player decided himself outranks anything the model handed him, in both
  // directions: the paper leads with the moment that came off, and with the one that did
  // not. Which moment it was depends on where he plays - a paper does not write "the
  // keeper read him" about the keeper - so each direction has a stopper's variant, ranked
  // first because `decisiveShot` is asked for that one specifically.
  {
    id: "stopped-it",
    when: (s) => Boolean(decisiveShot(s, true, PRODUCES.STOP)),
    es: { head: "LA PARÓ ÉL", body: "{fixture}, la última que llegó, y ahí estaba {surname}. {club} no la gana sin esa mano." },
    en: { head: "HE STOPPED IT", body: "{fixture}, the last one that arrived, and {surname} was there. {club} do not win it without that hand." },
  },
  {
    id: "decided-it",
    when: (s) => Boolean(decisiveShot(s, true)),
    es: { head: "LA DECIDIÓ ÉL", body: "{fixture}, el balón en los pies de {surname}, y dentro. {club} no la gana sin ese segundo." },
    en: { head: "HE DECIDED IT", body: "{fixture}, the ball at {surname}'s feet, and in. {club} do not win it without that second." },
  },
  {
    id: "let-it-in",
    when: (s) => Boolean(decisiveShot(s, false, PRODUCES.STOP)),
    es: { head: "SE LE FUE", body: "{fixture} y la que decidía se le escapó a {surname} por un palmo. Nadie va a preguntar por el resto del año." },
    en: { head: "IT GOT PAST HIM", body: "{fixture}, and the one that decided it beat {surname} by a hand. Nobody is going to ask about the rest of the year." },
  },
  {
    id: "missed-it",
    when: (s) => Boolean(decisiveShot(s, false)),
    es: { head: "LA FALLÓ ÉL", body: "{fixture} y el portero adivinó el lado de {surname}. Nadie va a preguntar por los otros {goals} goles." },
    en: { head: "HE MISSED IT", body: "{fixture}, and the keeper read {surname}. Nobody is going to ask about the other {goals} goals." },
  },
  {
    id: "ballon",
    when: (s) => s.awards.some((a) => a.award === "ballon_dor" || a.award === "golden_glove"),
    es: { head: "EL MEJOR DEL MUNDO", body: "{surname} se lleva {award} a los {age}. {club} no había tenido uno desde hacía mucho." },
    en: { head: "BEST IN THE WORLD", body: "{surname} takes {award} at {age}. It has been a long time since {club} had one." },
  },
  {
    id: "world-cup",
    when: (s) => s.national?.titles?.some((t) => t.trophy === "world_cup"),
    es: { head: "CAMPEONES DEL MUNDO", body: "{surname}, {age} años, vuelve a casa con la copa. Se acabó la discusión sobre su carrera." },
    en: { head: "WORLD CHAMPIONS", body: "{surname}, {age}, comes home with the cup. The argument about his career is over." },
  },
  // A club's trophies are drawn off one shared season now, so they arrive together or
  // not at all. When they arrive together that is the story, above any one of them.
  {
    id: "treble",
    when: (s) => s.titles.length >= 3,
    es: { head: "EL AÑO PERFECTO", body: "Tres títulos para {club} en una sola temporada. {surname}, {goals} goles, estuvo en todos." },
    en: { head: "THE PERFECT YEAR", body: "Three trophies for {club} in one season. {surname}, {goals} goals, was in all of them." },
  },
  {
    id: "double",
    when: (s) => s.titles.length === 2,
    es: { head: "DOBLETE", body: "{club} se lleva dos. {surname} {roleLine}: {matches} partidos, {goals} goles, y un año que no se repite." },
    en: { head: "THE DOUBLE", body: "{club} take two. {surname} {roleLine}: {matches} matches, {goals} goals, and a year that does not come round twice." },
  },
  {
    id: "continental-club",
    when: (s) => s.titles.some((t) => t.trophy === "continental_a"),
    es: { head: "LA NOCHE GRANDE", body: "{club} conquista {trophy} con {surname} {roleLine}. {goals} goles en la temporada." },
    en: { head: "THE BIG NIGHT", body: "{club} win {trophy} with {surname} {roleLine}. {goals} goals on the season." },
  },
  {
    id: "boot",
    when: (s) => s.awards.some((a) => a.award === "golden_boot"),
    es: { head: "NADIE METIÓ MÁS", body: "{goals} goles y {award} para {surname}. Da igual dónde se marquen: se marcaron." },
    en: { head: "NOBODY SCORED MORE", body: "{goals} goals and {award} for {surname}. It does not matter where they were scored: they were scored." },
  },
  {
    id: "league",
    when: (s) => s.titles.some((t) => t.trophy === "league"),
    es: { head: "CAMPEÓN", body: "{club} levanta {trophy}. {surname} {roleLine}: {matches} partidos y {goals} goles." },
    en: { head: "CHAMPIONS", body: "{club} lift {trophy}. {surname} {roleLine}: {matches} matches and {goals} goals." },
  },
  {
    id: "promoted",
    when: (s) => s.promoted,
    es: { head: "ARRIBA", body: "{club} sube de categoría. En segunda el que decide es el futbolista, y esta vez decidió {surname}." },
    en: { head: "UP", body: "{club} go up. In the second tier the player is the difference, and this time {surname} was." },
  },
  {
    id: "relegated",
    when: (s) => s.relegated,
    es: { head: "ABAJO", body: "{club} desciende y la temporada de {surname} —{goals} goles— se va al cajón con ella." },
    en: { head: "DOWN", body: "{club} are relegated, and {surname}'s season — {goals} goals — goes down with them." },
  },
  {
    id: "goal-glut",
    when: (s) => s.goals >= 20,
    es: { head: "ESTÁ EN TODAS", body: "{goals} goles en {matches} partidos. A los {age} años, {surname} vive su mejor momento en {club}." },
    en: { head: "HE IS EVERYWHERE", body: "{goals} goals in {matches} matches. At {age}, {surname} is at his peak with {club}." },
  },
  {
    id: "reborn",
    when: (s, previous) => previous && s.goals >= previous.goals * 3 && s.goals >= 8,
    es: { head: "OTRO JUGADOR", body: "El mismo futbolista que el año pasado, otro estanque: {goals} goles en {club}. No mejoró. Cambió de sitio." },
    en: { head: "A DIFFERENT PLAYER", body: "The same footballer as last year, a different pond: {goals} goals at {club}. He did not improve. He moved." },
  },
  {
    id: "benched",
    when: (s) => s.role === "suplente",
    es: { head: "SIN SITIO", body: "{matches} partidos en todo el año. {surname} entrena, viaja y mira. A los {age} eso cuesta caro." },
    en: { head: "NO PLACE", body: "{matches} matches all year. {surname} trains, travels and watches. At {age} that is expensive." },
  },
  // The one warning the model used to keep to itself. A player can be playing, scoring,
  // perfectly content - and standing still, because nothing at this club is asking him a
  // question. It is worth a headline precisely because nothing visible went wrong.
  {
    id: "stalled",
    when: (s) =>
      s.growth?.factor <= GROWTH.stallBelow &&
      s.development?.range?.[1] > 0 &&
      s.matches > 0,
    es: { head: "SE HA PARADO", body: "{age} años y el mismo futbolista que en agosto. En {club} nadie le pide nada que no sepa hacer ya." },
    en: { head: "HE HAS STOPPED", body: "{age} years old and the same player he was in August. Nobody at {club} asks him anything he cannot already do." },
  },
  {
    id: "called-up",
    when: (s) => s.national?.calledUp,
    es: { head: "LLAMADO", body: "Primera convocatoria para {surname}. {caps} partidos con la selección esta temporada." },
    en: { head: "CALLED UP", body: "A call-up for {surname}. {caps} international matches this season." },
  },
  {
    id: "quiet",
    when: () => true,
    es: { head: "TEMPORADA DE OFICIO", body: "{matches} partidos, {goals} goles, {assists} asistencias en {club}. Ni titular indiscutible ni descarte." },
    en: { head: "A WORKING SEASON", body: "{matches} matches, {goals} goals, {assists} assists at {club}. Neither undroppable nor discarded." },
  },
];

const ROLE_LINE = {
  es: {
    titular: "de titular",
    rotacion_alta: "entrando y saliendo del once",
    rotacion_baja: "desde la rotación",
    suplente: "desde el banquillo",
  },
  en: {
    titular: "as a starter",
    rotacion_alta: "in and out of the eleven",
    rotacion_baja: "on the fringe",
    suplente: "from the bench",
  },
};

export function headlineFor({ record, previous, state, world, locale = "es" }) {
  const club = world.clubs[record.clubId];
  const rule = RULES.find((candidate) => candidate.when(record, previous)) ?? RULES[RULES.length - 1];
  const copy = rule[locale] ?? rule.es;

  const trophy = record.titles[0]?.trophy;
  const award = record.awards[0]?.award;
  // The four shot-led rules each need the very match they matched on, or `{fixture}` is
  // filled from a different night than the one the headline is about.
  const SHOT_RULES = {
    "decided-it": [true, PRODUCES.GOAL],
    "missed-it": [false, PRODUCES.GOAL],
    "stopped-it": [true, PRODUCES.STOP],
    "let-it-in": [false, PRODUCES.STOP],
  };
  const shot = SHOT_RULES[rule.id] ? decisiveShot(record, ...SHOT_RULES[rule.id]) : null;
  const values = {
    surname: state.surname,
    club: club?.shortName ?? club?.name ?? "",
    age: record.age,
    matches: record.matches,
    goals: record.goals,
    assists: record.assists,
    caps: record.national?.caps ?? 0,
    roleLine: ROLE_LINE[locale]?.[record.role] ?? "",
    trophy: TROPHY_NAMES[locale]?.[trophy] ?? "",
    award: AWARD_NAMES[locale]?.[award] ?? "",
    // The name opens the sentence, so it is capitalised here rather than in the table.
    fixture: shot ? capitalise(FIXTURE_NAMES[locale]?.[shot.kind] ?? "") : "",
  };

  return { id: rule.id, head: copy.head, body: fill(copy.body, values) };
}

/**
 * A second, smaller item about the shadow - printed only when his season is genuinely
 * more notable than yours, which is what makes him sting.
 */
export function shadowNoteFor({ shadow, age, record, world, locale = "es" }) {
  const theirs = shadowSeasonAt(shadow, age);
  if (!theirs) return null;

  const club = world.clubs[theirs.clubId];
  const clubName = club?.shortName ?? club?.name ?? "";
  const wonBallon = theirs.awards.some((a) => a.award === "ballon_dor");
  const wonBig = theirs.titles.some((t) => t.trophy === "continental_a" || t.trophy === "league");
  const outscored = theirs.goals >= record.goals + 10;

  if (!wonBallon && !wonBig && !outscored) return null;

  if (locale === "en") {
    if (wonBallon) return `${shadow.surname} wins the Ballon d'Or with ${clubName}.`;
    if (wonBig) return `${shadow.surname} wins again at ${clubName}: ${theirs.goals} goals.`;
    return `${shadow.surname} finishes on ${theirs.goals} goals at ${clubName}.`;
  }
  if (wonBallon) return `${shadow.surname} gana el Balón de Oro en el ${clubName}.`;
  if (wonBig) return `${shadow.surname} vuelve a ganar en el ${clubName}: ${theirs.goals} goles.`;
  return `${shadow.surname} cierra el año con ${theirs.goals} goles en el ${clubName}.`;
}

/**
 * The closing verdict. The original model's thesis is that you can play a good career
 * and retire with nothing; we keep that, but we say it out loud instead of leaving the
 * player to work out that the empty cabinet was the point.
 */
export function retirementVerdict({ summary, locale = "es" }) {
  const { goals, matches, titles, titlesEarned, titlesFromBench, awards, caps, idolatry } = summary;
  const perMatch = matches ? (goals / matches).toFixed(2) : "0";
  const club = idolatry?.clubName ?? "";

  if (locale === "en") {
    // The statue outranks everything: it is the one thing a cabinet cannot buy.
    if (idolatry?.level === "leyenda") {
      return {
        head: "THEY BUILT YOU A STATUE",
        body: `${matches} matches, ${goals} goals, and one crowd that never had to be convinced. At ${club} you are not a former player — you are furniture. Whatever else the cabinet says, that part is settled.`,
      };
    }
    if (!titles && !awards && !caps && idolatry?.level === "idolo") {
      return {
        head: "NOTHING WON, SOMETHING LEFT",
        body: `Not one trophy in ${matches} matches. And yet ${club} still sing your name, because you stayed when leaving was the obvious move. The shelf is empty and the stand is not.`,
      };
    }
    if (!titles && !awards && !caps) {
      return {
        head: "AN EMPTY CABINET",
        body: `${matches} matches. ${goals} goals. Nothing on the shelf. That is not the simulation failing you — it is the thing it was built to say: you can choose well, play well, and still retire with nothing to show a stranger.`,
      };
    }
    if (titles >= 3 && (idolatry?.value ?? 0) < 40) {
      return {
        head: "A WELL-TRAVELLED WINNER",
        body: `${titles} trophies across ${idolatry?.clubs?.length ?? 0} clubs, and not one of them your own. You were always the signing, never the shirt. A full cabinet and nowhere that would call you theirs.`,
      };
    }
    if (titlesFromBench > titlesEarned) {
      return {
        head: "THE TROPHIES YOU ATTENDED",
        body: `${titles} club trophies, but only ${titlesEarned} of them won while you were playing. The cabinet is full and it is honest about how it filled up.`,
      };
    }
    if (awards >= 3) {
      return {
        head: "ONE OF THE GREATS",
        body: `${goals} goals in ${matches} matches (${perMatch} per game), ${titles} trophies and ${awards} individual awards. Very few careers look like this.`,
      };
    }
    return {
      head: "A CAREER",
      body: `${matches} matches, ${goals} goals, ${titlesEarned} trophies earned on the pitch. Not a legend, not a footnote — a footballer.`,
    };
  }

  if (idolatry?.level === "leyenda") {
    return {
      head: "TE HICIERON UNA ESTATUA",
      body: `${matches} partidos, ${goals} goles y una afición que nunca hubo que convencer. En el ${club} ya no eres un exjugador: eres parte del mobiliario. Diga lo que diga la vitrina, eso está cerrado.`,
    };
  }
  if (!titles && !awards && !caps && idolatry?.level === "idolo") {
    return {
      head: "SIN GANAR NADA, DEJANDO ALGO",
      body: `Ni un título en ${matches} partidos. Y aun así en el ${club} siguen cantando tu nombre, porque te quedaste cuando irse era lo evidente. El estante está vacío; la grada no.`,
    };
  }
  if (!titles && !awards && !caps) {
    return {
      head: "LA VITRINA VACÍA",
      body: `${matches} partidos. ${goals} goles. Nada en el estante. Eso no es que el simulador te haya fallado: es exactamente lo que vino a decir. Se puede elegir bien, jugar bien y retirarse sin nada que enseñarle a un desconocido.`,
    };
  }
  if (titles >= 3 && (idolatry?.value ?? 0) < 40) {
    return {
      head: "UN GANADOR DE PASO",
      body: `${titles} títulos en ${idolatry?.clubs?.length ?? 0} clubes, y ninguno tuyo. Siempre fuiste el fichaje, nunca la camiseta. La vitrina llena y ni un sitio que te llame suyo.`,
    };
  }
  if (titlesFromBench > titlesEarned) {
    return {
      head: "LOS TÍTULOS A LOS QUE ASISTISTE",
      body: `${titles} títulos de club, pero solo ${titlesEarned} ganados jugando. La vitrina está llena y es honesta sobre cómo se llenó.`,
    };
  }
  if (awards >= 3) {
    return {
      head: "DE LOS GRANDES",
      body: `${goals} goles en ${matches} partidos (${perMatch} por partido), ${titles} títulos y ${awards} premios individuales. Hay muy pocas carreras así.`,
    };
  }
  return {
    head: "UNA CARRERA",
    body: `${matches} partidos, ${goals} goles, ${titlesEarned} títulos ganados en el campo. Ni leyenda ni nota al pie: un futbolista.`,
  };
}
