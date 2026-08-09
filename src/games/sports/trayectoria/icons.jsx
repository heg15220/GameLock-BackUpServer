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
};

export const ICON_NAMES = Object.keys(PATHS);

/** The five kinds of chance. Named after their ids in bigmatch.js, so the map is direct. */
export const SHOT_ICONS = {
  penal: "penal",
  mano_a_mano: "mano_a_mano",
  cabezazo: "cabezazo",
  falta: "falta",
  volea: "volea",
};

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
