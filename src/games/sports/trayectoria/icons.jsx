/**
 * The icon set.
 *
 * There is no shared icon library in this project, and pulling one in for a single game
 * would drag a font or a package in for nine glyphs. These are drawn here instead, as one
 * 24-unit grid, stroked in `currentColor` so every one of them inherits the colour of the
 * thing it labels - the theme accent on a decision card, the ink on newsprint, the muted
 * grey of a contract term.
 *
 * They are labels, not decoration: every icon in this file names something the model
 * actually has. If a concept is not in `tables.js` or `contract.js`, it does not get a
 * glyph, because an icon that stands for nothing is just noise on a card.
 */

import React from "react";

/* Each entry is the inside of a 0 0 24 24 viewBox, stroked. */
const PATHS = {
  /* ── Decision themes ─────────────────────────────────────────────────────── */
  // Sport: a boot.
  sport: (
    <>
      <path d="M3 15V8h5l4 3h4a5 5 0 0 1 5 5v1H4a1 1 0 0 1-1-1z" />
      <path d="M8 8V6M11 9V7" />
    </>
  ),
  // Tactic: a coach's board.
  tactic: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16M3 12h18" />
      <circle cx="7.5" cy="8.5" r="1.2" />
      <circle cx="16.5" cy="15.5" r="1.2" />
    </>
  ),
  // Pressure: a megaphone.
  pressure: (
    <>
      <path d="M4 10v4a1 1 0 0 0 1 1h3l8 4V5L8 9H5a1 1 0 0 0-1 1z" />
      <path d="M19 9a4 4 0 0 1 0 6" />
    </>
  ),
  // Personal: a door home.
  personal: (
    <>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  // Moral: a balance.
  moral: (
    <>
      <path d="M12 4v16M8 20h8" />
      <path d="M4 9h16M4 9l-2 5a3 3 0 0 0 6 0zM20 9l-2 5a3 3 0 0 0 6 0z" />
    </>
  ),
  // Story: a folded bookmark.
  story: <path d="M6 3h12v18l-6-4-6 4z" />,
  // Directiva: the boardroom briefcase.
  directiva: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" />
    </>
  ),
  // Vestuario: a shirt.
  vestuario: (
    <>
      <path d="M8 3 4 5.5 6 10l2-1v11h8V9l2 1 2-4.5L16 3l-2 2h-4z" />
    </>
  ),
  // Prensa: the microphone on the table, which is the whole room.
  prensa: (
    <>
      <rect x="9" y="3" width="6" height="10" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0" />
      <path d="M12 17v3M8.5 20.5h7" />
    </>
  ),

  /* ── Contract terms ──────────────────────────────────────────────────────── */
  // Years: a calendar.
  years: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  // Wage: a note.
  wage: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  // Role promise: the captain's armband.
  role: (
    <>
      <path d="M7 4h10v9a5 5 0 0 1-10 0z" />
      <path d="M12 7.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 9.8 11 9.5z" />
    </>
  ),
  // Clause: a padlock, because that is exactly what it is.
  clause: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  // Signature: a nib.
  pen: (
    <>
      <path d="M4 20l3-1 11-11-2-2L5 17z" />
      <path d="M14 6l4 4M4 20l1-3" />
    </>
  ),

  // The shadow: the other career, running alongside yours the whole way.
  rival: (
    <>
      <circle cx="8" cy="7" r="3" />
      <path d="M3 20v-1.5A4.5 4.5 0 0 1 7.5 14h1A4.5 4.5 0 0 1 13 18.5V20" />
      <path d="M16 8.5a2.5 2.5 0 1 0 0-.001" opacity=".55" />
      <path d="M14 20v-1a3.5 3.5 0 0 1 3.5-3.5h1A3.5 3.5 0 0 1 22 19v1" opacity=".55" />
    </>
  ),

  /* ── What is on the line ─────────────────────────────────────────────────── */
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />
      <path d="M12 14v4M9 20h6" />
    </>
  ),
  ball: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m12 7.5 3.4 2.5-1.3 4h-4.2l-1.3-4z" />
      <path d="M12 3.5v4M4 10l4.9 0M20 10l-4.9 0M7.4 19.5l2.5-3.5M16.6 19.5l-2.5-3.5" />
    </>
  ),
  // Promotion / relegation: the table, and which way you are going.
  up: <path d="M12 20V5m0 0-6 6m6-6 6 6" />,
  down: <path d="M12 4v15m0 0 6-6m-6 6-6-6" />,
  // The derby: two shields facing off.
  derby: (
    <>
      <path d="M9 3 4 5v5c0 3 2.2 5.3 5 6 2.8-.7 5-3 5-6V5z" />
      <path d="M17 9v6M20 12h-6" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 4.4 3.4 7.9 8 9 4.6-1.1 8-4.6 8-9V6z" />,

  /* ── Kinds of chance ─────────────────────────────────────────────────────── */
  // Penalty: the spot, and the arc of the box behind it.
  penal: (
    <>
      <path d="M3 7h18M3 7v4a9 5 0 0 0 18 0V7" />
      <circle cx="12" cy="17" r="1.6" />
      <path d="M8 20.5h8" />
    </>
  ),
  // One on one: a keeper off his line with the ball at his feet.
  mano_a_mano: (
    <>
      <circle cx="9" cy="5.5" r="2.2" />
      <path d="M5 14 9 9l4 5M5 14l-2 4M13 14l2 4" />
      <circle cx="19" cy="17" r="3" />
    </>
  ),
  // Header: the ball meeting the head, not sitting above it.
  cabezazo: (
    <>
      <circle cx="8" cy="14" r="3" />
      <path d="M11.5 11.5 15 8" />
      <circle cx="17.5" cy="5.5" r="2.8" />
      <path d="M4 20h16" />
    </>
  ),
  // Free kick: the wall, and the ball bending over it.
  falta: (
    <>
      <path d="M13 20V11h3v9M17 20v-7h3v7M9 20v-5h3v5" />
      <circle cx="5" cy="18" r="2" />
      <path d="M6.5 16C9 8 16 4 21 4" strokeDasharray="2.6 2.4" />
    </>
  ),
  // Volley: the ball dropping onto the boot.
  volea: (
    <>
      <circle cx="16" cy="5.5" r="2.5" />
      <path d="M14.6 8.4 8.5 15" strokeDasharray="2.4 2.2" />
      <path d="M3 18v-4h4l3 3h6a3 3 0 0 1 3 3v1H4a1 1 0 0 1-1-1z" />
    </>
  ),

  /* ── Furniture ───────────────────────────────────────────────────────────── */
  crowd: (
    <>
      <circle cx="8" cy="8" r="2.6" />
      <circle cx="16.5" cy="9" r="2.1" />
      <path d="M3 19c0-2.8 2.2-5 5-5s5 2.2 5 5M14 19c0-2.3 1.6-4.2 3.7-4.2S21 16.7 21 19" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4V5z" />,
  handshake: (
    <>
      <path d="M3 12l3-3 4 3 2-1.5L14 12l4-3 3 3" />
      <path d="M6 9V7h4M18 9V7h-4" />
      <path d="M8 15l3 3 2-1.5 3 2" />
    </>
  ),

  /* ── The live feed ───────────────────────────────────────────── */
  /* A narrated match is a list of sentences, and a list of sentences all looks the same.
     These are what the eye reads before the words: one mark per KIND of action, so a goal,
     a save and a corner are told apart at a glance while scrolling. They are drawn on the
     same 24-grid as everything else - see BEAT_ICONS below for which beat gets which. */

  // Kick-off, half time, full time: the whistle.
  whistle: (
    <>
      <path d="M10 8h6.5a4.5 4.5 0 1 1 0 9H10a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2z" />
      <path d="M8 10.5H3.8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1H8" />
      <circle cx="16.4" cy="12.5" r="1.4" />
    </>
  ),
  // A goal: the ball in the net, which is the only picture that means it.
  net: (
    <>
      <path d="M3 20V7h18v13" />
      <path d="M7.5 7v13M16.5 7v13M3 13.5h18" opacity=".35" />
      <circle cx="12" cy="16" r="3" />
    </>
  ),
  // An attempt: the ball and the line it travelled.
  shot: (
    <>
      <circle cx="17.5" cy="6.5" r="2.6" />
      <path d="M3 20c3.5-1.5 7.5-4.5 11-8.5" strokeDasharray="2.6 2.4" />
      <path d="M3 20h4M3 20v-4" />
    </>
  ),
  // A save: the glove.
  glove: (
    <>
      <path d="M7 21v-6l-1.6-1.6a1.9 1.9 0 0 1 2.7-2.7L9 11.7V6.2a1.5 1.5 0 0 1 3 0v3.6" />
      <path d="M12 9.8V5.4a1.5 1.5 0 0 1 3 0v4.6" />
      <path d="M15 10V7.6a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-1.6 4.1L15.2 21" />
    </>
  ),
  // A tackle, a block, an interception: the boot arriving at the ball.
  tackle: (
    <>
      <path d="M3 19v-4h4l3 2h4a4 4 0 0 1 4 4H4a1 1 0 0 1-1-1z" />
      <circle cx="17" cy="7" r="2.6" />
      <path d="M8 15V9" opacity=".45" />
    </>
  ),
  // The pass that breaks a line, which is the one that gets narrated.
  pass: (
    <>
      <path d="M5 4v16M19 4v16" opacity=".45" />
      <path d="M8 12h8M13 9l3 3-3 3" />
    </>
  ),
  // A ball hung into the area from outside.
  centre: (
    <>
      <path d="M3.5 20C5 11.5 11 5.5 19.5 4" />
      <path d="M15.5 3.5 20 4.2 18.8 8.6" />
      <circle cx="4" cy="20" r="1.4" />
    </>
  ),
  // A corner: the flag in the quadrant.
  corner: (
    <>
      <path d="M6 21V4l8 2.6L6 9.2" />
      <path d="M3 21h18" />
      <path d="M3 21a9 9 0 0 1 8-9" opacity=".45" />
    </>
  ),
  // Offside: the linesman's flag, up.
  offside: (
    <>
      <path d="M5 21 14.5 3.5" />
      <path d="M11 10.5 20.5 7.5 16.5 15z" />
    </>
  ),
  // A run: him, gone.
  sprint: (
    <>
      <circle cx="15.5" cy="4.8" r="2.2" />
      <path d="M9 21l3.2-5.2-2.2-3.3L13.2 8l3 2.2 2.3 2.6" />
      <path d="M2.5 9h4M1.5 13.5h4.5M3.5 18h3" opacity=".5" />
    </>
  ),
  // Two players and the ball between them: holding it up, winning it back.
  duel: (
    <>
      <circle cx="6.5" cy="6" r="2.2" />
      <path d="M2.5 19v-4A3.5 3.5 0 0 1 6 11.5h1" />
      <circle cx="17.5" cy="6" r="2.2" />
      <path d="M21.5 19v-4a3.5 3.5 0 0 0-3.5-3.5h-1" />
      <circle cx="12" cy="16.5" r="2.4" />
    </>
  ),
  // The moment it comes down to him.
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 1.8v3.4M12 18.8v3.4M1.8 12h3.4M18.8 12h3.4" />
    </>
  ),
  // And the one that did not go in: over the bar.
  wide: (
    <>
      <path d="M3 21v-9h18v9" opacity=".5" />
      <circle cx="18" cy="4.6" r="2.4" />
      <path d="M4.5 17c2.5-6.5 6-10 11-11.5" strokeDasharray="2.6 2.4" />
    </>
  ),
  // A night the ball never came to him: he watched it.
  watching: (
    <>
      <path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.4" />
    </>
  ),
};

export const ICON_NAMES = Object.keys(PATHS);

/** The five kinds of chance. Named after their ids in bigmatch.js, so the map is direct. */
export const SHOT_ICONS = {
  penal: "penal",
  mano_a_mano: "mano_a_mano",
  cabezazo: "cabezazo",
  falta: "falta",
  // The repertoires that stop it and the one that supplies it borrow the glyph of the
  // chance they are answering: a saved penalty is still a penalty, and an interception is
  // a cross that never arrived. Drawing eight more marks would say less, not more.
  parada_penal: "penal",
  salida_mano_a_mano: "mano_a_mano",
  tiro_lejano: "volea",
  centro_lateral: "cabezazo",
  entrada: "mano_a_mano",
  despeje: "cabezazo",
  pase_gol: "falta",
};

/**
 * Which glyph goes on each answer to a decision card.
 *
 * Keyed by the OPTION ID, which is the one part of an option that both languages share -
 * the label and the detail are written twice, once per locale, and an icon stored beside
 * them would be two things that have to agree and eventually would not.
 *
 * The mapping is deliberately at the level of what KIND of answer it is rather than what
 * the answer is about: a card offers you a way of committing, a way of refusing, a way of
 * holding your ground or a way of saying something, and forty-six cards' worth of fiction
 * collapses onto that. `up` is the one you take, `down` is the one you turn down,
 * `shield` is the one where you do not move, `chat` is the one you say out loud.
 *
 * Where an id genuinely means two different things in two different cards, the card names
 * its own glyph - see `icons` in events.js and `optionIcon` below.
 */
export const OPTION_ICONS = {
  // Take it, push for it, go.
  accept: "up", ask: "up", compete: "up", fight: "up", force: "up", go: "up",
  high: "up", play: "up", switch: "up", take: "up",
  challenge: "up", claim: "up", open: "up", yes: "up",
  // Turn it down, stop, walk away.
  against: "down", cut: "down", decline: "down", leave: "down", low: "down",
  none: "down", off: "down", out: "down", refuse: "down", rest: "down",
  ignore: "down", no: "down", skip: "down",
  // Do not move.
  endure: "shield", half: "shield", hold: "shield", home: "shield", keep: "shield",
  quiet: "shield", resist: "shield", silent: "shield", stay: "shield", watch: "shield",
  commit: "shield", defend: "shield", deflect: "shield", dodge: "shield",
  humble: "shield", limited: "shield", loyal: "shield", measured: "shield",
  neutral: "shield", nothing: "shield", own: "shield",
  // Say it.
  answer: "chat", apologise: "chat", back: "chat", explain: "chat", listen: "chat",
  message: "chat", talk: "chat",
  brief: "chat", deny: "chat", honest: "chat", joke: "chat", praise: "chat",
  promise: "chat", speak: "chat", tell: "chat",
  // Sign it, or take it to a lawyer.
  deal: "pen", sign: "pen", sue: "pen",
  // The people in it.
  family: "personal", mentor: "personal", send: "personal",
  help: "personal",
  in: "vestuario", join: "vestuario", split: "vestuario", group: "vestuario",
  club: "directiva",
  // What is actually being played for.
  continental: "trophy", league: "trophy",
  // The rest name themselves.
  adapt: "tactic", nutrition: "sport", with: "sport", work: "sport",
  push: "wage", money: "wage", wait: "clock", time: "clock", minutes: "clock",
  sing: "crowd", study: "story", explode: "pressure",
  left: "penal", right: "penal", penalty: "penal", pass: "handshake",
};

/**
 * The glyph for one answer: what the card asked for, else what the id usually means, else
 * the theme of the card - so a new option can never render a button with a hole in it.
 */
export function optionIcon(event, optionId) {
  return event?.icons?.[optionId] ?? OPTION_ICONS[optionId] ?? event?.theme ?? "ball";
}

/**
 * Which mark goes on each line of a live match.
 *
 * The narrated deciders are read while they are running - a line lands, the clock stops on
 * it for a beat, and the next one arrives underneath - and a column of sentences in the
 * same size and colour gives the eye nothing to hold on to. A goal, a corner and a
 * clearance all read as "text" until you have read them.
 *
 * So every beat id in `copy.match.beats` gets a glyph, and the glyph is of the ACTION
 * rather than of the beat: the same picture for a shot whoever took it, the same net for a
 * goal whoever scored it. Which side it belongs to is already said in colour by the feed,
 * and saying it twice would be two marks arguing about one line.
 *
 * Keyed by the beat id, which is the language-independent half - see `beatLine` - so a mark
 * can never fall out of step with a sentence that was rewritten in one locale only.
 */
export const BEAT_ICONS = {
  // The whistle: the three moments nobody plays.
  kickoff: "whistle",
  halfTime: "whistle",
  fullTime: "whistle",
  extraTime: "whistle",

  // The ball in the net, from either end, by any boot.
  goalUs: "net",
  goalThem: "net",
  playerGoal: "net",
  scored: "net",
  conceded: "net",

  // Attempts, and the hands that answer them.
  shotUs: "shot",
  shotThem: "shot",
  playerShot: "shot",
  saveUs: "glove",
  saveThem: "glove",
  playerSave: "glove",
  playerClaim: "glove",
  stopped: "glove",

  // The defending half of a match.
  tackleUs: "tackle",
  tackleThem: "tackle",
  playerTackle: "tackle",
  playerBlock: "tackle",
  playerInterception: "tackle",

  // The passing half of it.
  keyPassUs: "pass",
  keyPassThem: "pass",
  playerKeyPass: "pass",
  playerThroughBall: "pass",
  playerLongPass: "pass",
  assisted: "pass",
  playerCross: "centre",

  // Set pieces and the flag.
  cornerUs: "corner",
  cornerThem: "corner",
  offsideUs: "offside",
  offsideThem: "offside",

  // Him, with the ball at his feet or somebody on his back.
  playerRun: "sprint",
  playerCarry: "sprint",
  playerHoldUp: "duel",
  playerRecovery: "duel",

  // What the match is about at that point of it.
  tight: "clock",
  pressing: "up",
  chasing: "up",
  holding: "shield",

  // His moment, and the two ways out of it.
  chance: "target",
  missed: "wide",
  assistMissed: "wide",

  // Nights the ball never arrived.
  untouched: "watching",
  bystander: "watching",

  // From twelve yards, and where the tie ended up.
  shootout: "penal",
  shootoutWon: "trophy",
  shootoutLost: "down",
  tieWon: "trophy",
  tieLost: "down",
};

/**
 * The mark for one beat. `ball` is the fallback rather than nothing, because a feed where
 * some lines are indented under a glyph and others are not reads as broken rather than as
 * quiet - and a beat id added later would be exactly that until somebody noticed.
 */
export const beatIcon = (id) => BEAT_ICONS[id] ?? "ball";

/** Which glyph names a fixture, so the match screen and the report agree. */
export const FIXTURE_ICONS = {
  final_mundial: "trophy",
  final_continental_nt: "trophy",
  final_continental: "trophy",
  ascenso: "up",
  salvacion: "down",
  titulo_liga: "shield",
  final_copa: "trophy",
  semifinal_continental: "ball",
  clasico: "derby",
};

/**
 * One glyph. `size` drives the box; the stroke stays visually constant across sizes
 * because it is expressed in the same 24-unit space the paths are drawn in.
 */
export default function Icon({ name, size = 18, className = "", strokeWidth = 1.6 }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      className={`tr-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path}
    </svg>
  );
}
