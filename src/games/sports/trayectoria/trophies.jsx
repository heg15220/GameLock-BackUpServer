/**
 * The cabinet.
 *
 * Every trophy in this game was a word on a list. A career that ends with eleven of them
 * read exactly like a career that ended with one, which is the wrong way round for the
 * only thing a footballer is remembered by.
 *
 * Two layers, and the order matters:
 *
 *  1. A SILHOUETTE, drawn here, for every trophy the model can award. Filled rather than
 *     stroked - a silhouette is a shape, not an outline - on the same 24-unit grid as
 *     `icons.jsx`, inheriting `currentColor` so the same glyph works as gold on newsprint,
 *     as ink in the cabinet and as a white cut-out in the ceremony. These are committed,
 *     they never fail, and they are what the animation is built on.
 *  2. A PHOTOGRAPH, where we have one. `media.copero.com.ar` - the same CDN the world data
 *     already sources club crests and league marks from - publishes the real trophies at
 *     a predictable path. It covers the leagues, most domestic cups, UEFA, CONMEBOL and
 *     FIFA; it has nothing for CAF, for OFC, or for most national-team continentals. So it
 *     can never be the thing the feature rests on, only the thing that makes it richer
 *     where it happens to reach.
 *
 * `Crest` faces the same problem and answers it the other way round: a club with no crest
 * file draws nothing and lets its name carry the row, because an invented badge says less
 * than a name does. A trophy has no such fallback - the cabinet is the picture - so here
 * the silhouette is drawn rather than omitted. Same cause either way:
 * `public/assets/football/` is gitignored and populated by a script, so on a fresh clone
 * none of it exists and every screen still has to be right.
 */

import React, { useState } from "react";

import { world } from "./world.js";

/**
 * One filled path per trophy, on a 0 0 24 24 grid.
 *
 * Drawn from the real silverware - the shapes are the recognisable ones, because half the
 * pleasure of a cabinet is knowing which cup is which at a glance. The big-eared bowl of
 * the main continental, the globe of the world club title, the two figures holding up the
 * earth on the World Cup: each of those is doing the identifying work that a label would
 * otherwise have to do.
 */
const SILHOUETTES = {
  // The league: a footed cup, tall and plain, with a lid. The one you win by turning up
  // thirty-eight times.
  league: (
    <path d="M12 1.4 13.6 3H16v3.4c0 2.6-1.3 4.5-3.2 5.2v2.6h1.9c.5 0 .9.4.9.9v1.3H8.4v-1.3c0-.5.4-.9.9-.9h1.9v-2.6C9.3 10.9 8 9 8 6.4V3h2.4L12 1.4zM6.9 4.1v2.3c0 1.5.5 2.8 1.4 3.7C7 9.6 6 8.2 6 6.4V4.1h.9zm10.2 0h.9v2.3c0 1.8-1 3.2-2.3 3.7.9-.9 1.4-2.2 1.4-3.7V4.1zM7.6 18.6h8.8c.6 0 1.1.5 1.1 1.1v1.5H6.5v-1.5c0-.6.5-1.1 1.1-1.1z" />
  ),
  // The domestic cup: squatter, two round handles, the one that gets passed around.
  cup: (
    <path d="M7.2 2.6h9.6v4.6c0 2.9-1.6 5-4 5.6v2.3h1.7c.5 0 .9.4.9.9v1.2H8.6v-1.2c0-.5.4-.9.9-.9h1.7v-2.3c-2.4-.6-4-2.7-4-5.6V2.6zM6.1 4.3H4.4c-1 0-1.8.8-1.8 1.8v.6c0 1.9 1.4 3.4 3.2 3.7a8 8 0 0 1-.4-2.4V4.3h.7zm11.8 0h1.7c1 0 1.8.8 1.8 1.8v.6c0 1.9-1.4 3.4-3.2 3.7.3-.8.4-1.6.4-2.4V4.3h-.7zM4.4 5.9h1.1V8c0 .3 0 .6.1.9-.7-.4-1.2-1.1-1.2-2V5.9zm14 0h1.2V7c0 .8-.5 1.5-1.2 1.9V5.9zM7.4 18.6h9.2c.6 0 1.1.5 1.1 1.1v1.5H6.3v-1.5c0-.6.5-1.1 1.1-1.1z" />
  ),
  // The main continental: the big ears. Nothing else in football looks like this.
  continental_a: (
    <path d="M6.6 2.4h10.8v5.1c0 3-1.7 5.3-4.2 6v2.1h1.5c.5 0 .9.4.9.9v1.1H8.4v-1.1c0-.5.4-.9.9-.9h1.5v-2.1c-2.5-.7-4.2-3-4.2-6V2.4zM5.4 3.3c-1.6.3-2.7 1.7-2.7 3.6 0 2 1.2 3.5 2.9 3.8-.5-.9-.8-2-.8-3.2V3.3zm13.2 0v4.2c0 1.2-.3 2.3-.8 3.2 1.7-.3 2.9-1.8 2.9-3.8 0-1.9-1.1-3.3-2.7-3.6zM4.1 5.6v1.3c0 1 .4 1.8 1 2.2a7 7 0 0 1-.2-1.6V5.6h-.8zm15 0h.8v1.9c0 .6-.1 1.1-.2 1.6.6-.4 1-1.2 1-2.2V5.6h-1.6zM7.3 18.5h9.4c.6 0 1.1.5 1.1 1.1v1.5H6.2v-1.5c0-.6.5-1.1 1.1-1.1z" />
  ),
  // The second continental: slim, tall, on a heavy base. Won by the sides who did not
  // reach the other one.
  continental_b: (
    <path d="M9.2 2.2h5.6l-.5 3.4c1.3.9 2.1 2.4 2.1 4.2 0 2.4-1.5 4.3-3.6 4.9v1.6h1.4c.5 0 .9.4.9.9v1H8.9v-1c0-.5.4-.9.9-.9h1.4v-1.6c-2.1-.6-3.6-2.5-3.6-4.9 0-1.8.8-3.3 2.1-4.2l-.5-3.4zm2.8 5.2a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2zM7.1 18.4h9.8c.6 0 1.1.5 1.1 1.1v1.6H6v-1.6c0-.6.5-1.1 1.1-1.1z" />
  ),
  // The world club title: a globe, held up.
  club_world_cup: (
    <path d="M12 1.8a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2zm0 1.5c-.6 0-1.4.7-1.9 2h3.8c-.5-1.3-1.3-2-1.9-2zM9.6 6.8a9 9 0 0 0 0 1.4h4.8a9 9 0 0 0 0-1.4H9.6zm-1.5 0H6.4a4.1 4.1 0 0 0 0 1.4h1.7a11 11 0 0 1 0-1.4zm7.8 0a11 11 0 0 1 0 1.4h1.7a4.1 4.1 0 0 0 0-1.4h-1.7zm-5.8 3a5 5 0 0 0 1.9 2c.6 0 1.4-.7 1.9-2h-3.8zm-3 0a4.2 4.2 0 0 0 2.2 1.7 8 8 0 0 1-.7-1.7H7.1zm8.1 0a8 8 0 0 1-.7 1.7 4.2 4.2 0 0 0 2.2-1.7h-1.5zM7.1 5.3h1.5a8 8 0 0 1 .7-1.7 4.2 4.2 0 0 0-2.2 1.7zm7.6-1.7a8 8 0 0 1 .7 1.7h1.5a4.2 4.2 0 0 0-2.2-1.7zM11 13.4h2v2.3h1.6c.5 0 .9.4.9.9v1.1H8.5v-1.1c0-.5.4-.9.9-.9H11v-2.3zM7.3 18.8h9.4c.6 0 1.1.5 1.1 1.1v1.4H6.2v-1.4c0-.6.5-1.1 1.1-1.1z" />
  ),
  // The continental with your country's name on it: a cup with a lid and a broad foot.
  continental_nt: (
    <path d="M12 1.2l1.9 1.9H16v4.3c0 2.7-1.5 4.7-3.6 5.4v2.1h1.5c.5 0 .9.4.9.9v1.1H9.2v-1.1c0-.5.4-.9.9-.9h1.5v-2.1C9.5 12.1 8 10.1 8 7.4V3.1h2.1L12 1.2zM5.9 4.6v2.8c0 1.4.4 2.6 1.1 3.5-1.4-.5-2.4-1.9-2.4-3.6V4.6h1.3zm12.2 0h1.3v2.7c0 1.7-1 3.1-2.4 3.6.7-.9 1.1-2.1 1.1-3.5V4.6zM7 18.3h10c.6 0 1.1.5 1.1 1.1v1.6H5.9v-1.6c0-.6.5-1.1 1.1-1.1z" />
  ),
  // The World Cup: two figures with the earth on their shoulders. The narrow waist and
  // the sphere are the whole silhouette.
  world_cup: (
    <path d="M12 1.5c1.9 0 3.4 1.5 3.4 3.4 0 1.3-.7 2.4-1.8 3-.5 1.4-.6 2.7-.4 3.9.3 1.6 1 3 1.9 4.2H8.9c.9-1.2 1.6-2.6 1.9-4.2.2-1.2.1-2.5-.4-3.9a3.4 3.4 0 0 1-1.8-3c0-1.9 1.5-3.4 3.4-3.4zm0 1.5a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM8.3 17.4h7.4c.5 0 .9.4.9.9v.8H7.4v-.8c0-.5.4-.9.9-.9zM6.6 20.1h10.8c.6 0 1.1.5 1.1 1.1v1.1H5.5v-1.1c0-.6.5-1.1 1.1-1.1z" />
  ),

  /* ── The individual honours ──────────────────────────────────────────────── */
  // A ball on a plinth.
  ballon_dor: (
    <path d="M12 1.8a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4zm0 1.6-1.6 1.2.6 1.9h2l.6-1.9L12 3.4zM7.6 6.3l-.6 1.9 1.6 1.2 1.6-1.2-.6-1.9H7.6zm8.8 0h-2l-.6 1.9 1.6 1.2 1.6-1.2-.6-1.9zM11 13.4h2v2.6h1.7c.5 0 .9.4.9.9v1H8.4v-1c0-.5.4-.9.9-.9H11v-2.6zM7.2 19h9.6c.6 0 1.1.5 1.1 1.1v1.4H6.1v-1.4c0-.6.5-1.1 1.1-1.1z" />
  ),
  golden_boot: (
    <path d="M4.2 6.5h4.1c.5 0 1 .3 1.2.8l1.4 3.1c.3.6.8 1.1 1.5 1.3l4.6 1.6c1.9.7 3 2.4 3 4.4v.6c0 .7-.6 1.3-1.3 1.3H4.2c-.7 0-1.3-.6-1.3-1.3V7.8c0-.7.6-1.3 1.3-1.3zm.6 2.1v3.1h3.3L6.7 8.6H4.8z" />
  ),
  golden_glove: (
    <path d="M7.5 3.1c.8 0 1.5.7 1.5 1.5v4h.6V3.3c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v5.3h.6v-4c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v4.6c1 .3 1.7 1.2 1.7 2.3v3.1a5.6 5.6 0 0 1-5.6 5.6h-1.6A5.6 5.6 0 0 1 6 14.6V4.6c0-.8.7-1.5 1.5-1.5z" />
  ),
};

export const TROPHY_IDS = Object.keys(SILHOUETTES);
export const hasSilhouette = (id) => Object.hasOwn(SILHOUETTES, id);

/** The silhouette on its own, for the places that never want a photograph. */
export function TrophySilhouette({ id, size = 24, className = "", title = null }) {
  const shape = SILHOUETTES[id] ?? SILHOUETTES.cup;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={`tr-sil ${className}`.trim()}
      role={title ? "img" : "presentation"}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {shape}
    </svg>
  );
}

/* ── The photographs ──────────────────────────────────────────────────────────
   `media.copero.com.ar` publishes the real silverware at a predictable path, and
   `scripts/fetch-football-crests.py --only trophies` mirrors it into
   public/assets/football/trophies/. None of it is committed, so `Trophy` treats a
   missing file as the ordinary case and drops to the silhouette without a flicker. */

/** Exactly what `--only trophies` mirrored, written into world.data.json by the build. */
const MIRRORED = world.trophies ?? {};

/**
 * Where the mirrored photograph of this trophy would be, or null when the model has no
 * real cup to point at - the second continental of a confederation copero does not cover,
 * a national-team final for a country whose tournament it has never photographed.
 *
 * `competition` carries the two paths that are data rather than convention: the league
 * mark and the domestic cup, both resolved by the world build from copero's own URLs.
 */
export function trophyAssetFor(
  trophy,
  { competition = null, confederation = null, mirrored = MIRRORED } = {},
) {
  switch (trophy) {
    // A league with no photographed trophy still has its own mark, already on disk from
    // the competitions fetch. It names the title just as well as a cup would.
    case "league":
      return competition?.trophy ?? competition?.logo ?? null;
    case "cup":
      return competition?.cupTrophy ?? null;
    case "club_world_cup":
    case "world_cup":
      // FIFA's two, whoever you play for.
      return mirrored[`international/FIFA/${FIFA[trophy]}`] ?? null;
    case "continental_a":
    case "continental_b":
    case "continental_nt": {
      const leaf = INTERNATIONAL[trophy][confederation];
      return (leaf && mirrored[`international/${confederation}/${leaf}`]) || null;
    }
    default: {
      const path = AWARDS[trophy];
      return (path && mirrored[`international/${path}`]) || null;
    }
  }
}

/**
 * Which slug each trophy lives under, per confederation.
 *
 * This says what to ASK for; `world.trophies` says what was actually mirrored, and that is
 * the one that decides. Keeping a second hard-coded list of what the CDN has turned out to
 * be a trap - CONCACAF's club trophy answered once on copero and has returned 403 ever
 * since - and a path that stops resolving just falls back to the silhouette, so the drift
 * would be silent. Every confederation is covered here; where copero had nothing the
 * fetch fills it from Wikipedia, which is why CONCACAF now points at `champions-cup`.
 */
const INTERNATIONAL = {
  continental_a: {
    UEFA: "champions-league",
    CONMEBOL: "libertadores",
    CONCACAF: "champions-cup",
    AFC: "champions-league-elite",
    CAF: "champions-league",
    OFC: "champions-league",
  },
  continental_b: {
    UEFA: "europa-league",
    CONMEBOL: "copa-sudamericana",
    CONCACAF: "central-american-cup",
    AFC: "champions-league-two",
    CAF: "confederation-cup",
  },
  continental_nt: {
    UEFA: "euro",
    CONMEBOL: "copa-america",
    CONCACAF: "gold-cup",
    AFC: "asian-cup",
    CAF: "africa-cup-of-nations",
    OFC: "nations-cup",
  },
};

const FIFA = { club_world_cup: "club-world-cup", world_cup: "world-cup" };

/**
 * The three individual honours. Copero files them under confederations rather than in any
 * awards folder - the Golden Boot under UEFA, the Ballon d'Or and the Golden Glove under
 * FIFA - which is not guessable and cost a second round of probing to find.
 */
const AWARDS = {
  ballon_dor: "FIFA/ballon-dor",
  golden_boot: "UEFA/golden-boot",
  golden_glove: "FIFA/golden-glove",
};

/**
 * A trophy, as good as we can draw it: the photograph if it was mirrored locally, the
 * silhouette otherwise. Never both, and never a broken image.
 */
export function Trophy({ id, size = 28, competition = null, confederation = null, title = null }) {
  const src = trophyAssetFor(id, { competition, confederation });
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <TrophySilhouette id={id} size={size} title={title} />;
  }
  return (
    <img
      className="tr-trophy__photo"
      src={src}
      alt={title ?? ""}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default Trophy;
