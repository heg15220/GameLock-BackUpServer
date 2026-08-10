/**
 * Trayectoria - the screens.
 *
 * All the rules live in career.js; this file only decides what a phase looks like and
 * which action a button sends back. The one piece of real interface design here is the
 * delta meter: the model rests on your OVR minus the level of the squad around you, so
 * every club you are offered is drawn as a position on that track rather than as a name.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import {
  PHASES,
  acceptClause,
  acceptOffer,
  agreeTerms,
  askFor,
  availableAsks,
  cancelNegotiation,
  completeSigning,
  currentStanding,
  nextFixture,
  openMarket,
  playChance,
  refuseClause,
  resolveEvent,
  signYouthClub,
  startCareer,
  switchNationality,
  takeShot,
  watchMatch,
} from "./career.js";
import { CONTRACT, wagePremium } from "./contract.js";
import { roleFor, roleLadder } from "./engine.js";
import Icon, { FIXTURE_ICONS, SHOT_ICONS, optionIcon } from "./icons.jsx";
import ShotScene, { PlacementDiagram } from "./scene.jsx";
import { conversionRecord } from "./bigmatch.js";
import { MODES } from "./matchmode.js";
import { MECHANICS } from "./minigames.js";
import { FULL_TIME } from "./narration.js";
import { shadowStanding } from "./rival.js";
import Trophy, { TrophySilhouette } from "./trophies.jsx";
import {
  AWARD_LABELS,
  FIXTURE_LABELS,
  IDOLATRY_LABELS,
  NT_TOURNAMENT,
  PLACEMENT_LABELS,
  POSITION_LABELS,
  PROFILE_LABELS,
  REASON_LABELS,
  ROLE_LABELS,
  SHOT_LABELS,
  THEME_LABELS,
  TROPHY_LABELS,
  WAGE_ROLE_LABELS,
  fillTemplate,
  formatDelta,
  formatValue,
  getCopy,
} from "./copy.js";
import {
  careerToDate,
  gridLines,
  ovrSeries,
  peakSeason,
  projectPoint,
  seasonReport,
  seriesBounds,
  seriesPath,
} from "./report.js";
import { GROWTH, POSITIONS, RETIREMENT_AGE, START_AGE } from "./tables.js";
import { playableCountries, world } from "./world.js";
import "./styles.css";

const randomSeed = () => Math.random().toString(36).slice(2, 9).toUpperCase();

/** An OVR change, always signed, so a gain and a loss are told apart at a glance. */
const signedOvr = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`;

/** The delta window the meter draws. Wide enough to hold every club worth signing for. */
const DELTA_MIN = -16;
const DELTA_MAX = 12;
const deltaToPercent = (delta) =>
  ((Math.max(DELTA_MIN, Math.min(DELTA_MAX, delta)) - DELTA_MIN) / (DELTA_MAX - DELTA_MIN)) * 100;

/* ── Motion ───────────────────────────────────────────────────────────────── */

/**
 * Motion here is never decoration: the delta marker travels out from zero because that is
 * the measurement being made, and the numbers count because a season is an accumulation.
 * Anyone who has asked not to see that gets the final value immediately.
 */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    setReduced(query.matches);
    const onChange = (event) => setReduced(event.matches);
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

/** Count a number up on arrival. Eased out, so it lands rather than stops. */
function useCountUp(target, { duration = 900, delay = 0, enabled = true } = {}) {
  const reduced = usePrefersReducedMotion();
  const numeric = Number(target) || 0;
  const [shown, setShown] = useState(enabled && !reduced ? 0 : numeric);

  useEffect(() => {
    if (!enabled || reduced) {
      setShown(numeric);
      return undefined;
    }
    let frame = 0;
    let start = 0;
    const tick = (now) => {
      if (!start) start = now;
      const elapsed = now - start - delay;
      if (elapsed < 0) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - progress) ** 3;
      setShown(Math.round(numeric * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric, duration, delay, enabled, reduced]);

  return shown;
}

/** A headline number that counts up, with its movement against last season beside it. */
function StatValue({ value, change, delay = 0, format }) {
  const counted = useCountUp(value, { delay, enabled: typeof value === "number" });
  const shown = typeof value === "number" ? counted : value;
  return (
    <>
      {format ? format(shown) : shown}
      {typeof change === "number" && change !== 0 ? (
        <i className={`tr-move ${change > 0 ? "is-up" : "is-down"}`}>
          {change > 0 ? "▲" : "▼"}
          {Math.abs(change)}
        </i>
      ) : null}
    </>
  );
}

/* ── Small pieces ─────────────────────────────────────────────────────────── */

/**
 * A club's badge, or nothing at all.
 *
 * Crest images are fetched locally and are not committed, so a club without one is the
 * normal case rather than the exception. It used to draw a coloured tile with the club's
 * initials in it, which reads as a badge from a distance and is not one - a wall of
 * invented shields says less than the names alone do. So a missing crest renders nothing
 * and the name beside it carries the row on its own; every caller pairs the two.
 */
function Crest({ club, size = 44 }) {
  const [failed, setFailed] = useState(false);
  if (!club?.crest || failed) return null;
  return (
    <img
      className="tr-crest"
      style={{ width: size, height: size }}
      src={club.crest}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function Flag({ country, size = 20 }) {
  const [failed, setFailed] = useState(false);
  if (!country) return null;
  if (!country.flag || failed) {
    return (
      <span
        className="tr-flag tr-flag--fallback"
        style={{ width: size, height: size, background: country.color ?? "#31394a" }}
        aria-hidden="true"
      />
    );
  }
  return (
    <img
      className="tr-flag"
      style={{ width: size, height: size }}
      src={country.flag}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Idolatría as a filled bar with its rung named. The five levels are the whole reading:
 * the exact number matters far less than whether the stand calls you one of theirs.
 */
function IdolatryBar({ value, level, locale, compact = false }) {
  const copy = getCopy(locale);
  return (
    <div className={`tr-idol${compact ? " tr-idol--compact" : ""}`}>
      <div className="tr-idol__head">
        <span className="tr-idol__label">{copy.season.idolatry}</span>
        <span className={`tr-idol__level tr-idol__level--${level}`}>
          {IDOLATRY_LABELS[locale][level]}
        </span>
      </div>
      <div
        className="tr-idol__track"
        role="img"
        aria-label={`${copy.season.idolatry}: ${Math.round(value)} / 100`}
      >
        <span
          className={`tr-idol__fill tr-idol__fill--${level}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
        {/* The rungs, so the next one is always visible as a target. */}
        {[25, 50, 75, 95].map((mark) => (
          <span key={mark} className="tr-idol__mark" style={{ left: `${mark}%` }} />
        ))}
      </div>
    </div>
  );
}

/**
 * The signature element. Zero is the squad you would be joining; where you land between
 * the band boundaries is the role you will get. Choosing a club is choosing a spot here.
 */
function DeltaMeter({ ovr, squadLevel, keeper = false, locale, compact = false, reputation = null }) {
  const copy = getCopy(locale);
  const delta = ovr - squadLevel;
  const role = roleFor(delta, keeper);
  const stops = roleLadder({ keeper, min: DELTA_MIN, max: DELTA_MAX });

  // The marker starts at the squad's own level and travels out to where you actually sit,
  // so the distance is watched being measured rather than simply stated.
  const reduced = usePrefersReducedMotion();
  const [settled, setSettled] = useState(reduced);
  useEffect(() => {
    if (reduced) {
      setSettled(true);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  return (
    <div className={`tr-delta${compact ? " tr-delta--compact" : ""}`}>
      <div className="tr-delta__track" role="img" aria-label={`${copy.delta.legend}: ${formatDelta(delta)}`}>
        {stops.map((stop) => (
          <span
            key={stop.role}
            className={`tr-delta__band tr-delta__band--${stop.role}${
              stop.role === role.role ? " is-active" : ""
            }`}
            style={{
              left: `${deltaToPercent(stop.from)}%`,
              width: `${deltaToPercent(stop.to) - deltaToPercent(stop.from)}%`,
            }}
          />
        ))}
        <span className="tr-delta__zero" style={{ left: `${deltaToPercent(0)}%` }} />
        <span
          className={`tr-delta__marker${settled ? " is-settled" : ""}`}
          style={{ left: `${deltaToPercent(settled ? delta : 0)}%` }}
        >
          <b>{formatDelta(delta)}</b>
        </span>
      </div>
      <div className="tr-delta__foot">
        <span className="tr-delta__squad">
          {copy.common.squad} {squadLevel}
          {/* A club's stature IS its squad level, so the rungs belong on the same line as
              the number they set rather than as a separate read-out above it. */}
          {reputation !== null ? (
            <span
              className="tr-delta__rep"
              role="img"
              aria-label={`${copy.common.squad}: ${reputation}/5`}
            >
              {[0, 1, 2, 3, 4].map((rung) => (
                <i key={rung} className={rung < reputation ? "is-on" : ""} />
              ))}
            </span>
          ) : null}
        </span>
        <span className={`tr-delta__role tr-delta__role--${role.role}`}>
          {ROLE_LABELS[locale][role.role]}
        </span>
      </div>
    </div>
  );
}

/* ── The HUD ──────────────────────────────────────────────────────────────────
   Four numbers run this game - your rating, your distance from the squad around
   you, how long the club is tied to you and what the stand thinks - and until now
   only the first was ever on screen. The other three lived in a side panel that
   appeared on one phase out of eight, so most of the game was played blind to the
   state it turns on. The rail puts all four in the masthead, in one visual
   language that the offer cards and the market strip then reuse.               */

/** Flash a cell when its number moves, so a change is noticed rather than looked up. */
function useChangePulse(value) {
  const [pulsing, setPulsing] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (previous.current === value) return undefined;
    previous.current = value;
    setPulsing(true);
    const timer = setTimeout(() => setPulsing(false), 900);
    return () => clearTimeout(timer);
  }, [value]);
  return pulsing;
}

/**
 * One reading: a label nobody has to parse, one number in the display face, and an
 * optional word underneath saying what the number means. `fill` draws a hairline along
 * the bottom for the readings that are a position on a scale rather than a quantity.
 */
function StatCell({ label, value, note, tone, fill = null }) {
  const pulsing = useChangePulse(value);
  return (
    <div
      className={`tr-rail__cell${tone ? ` is-${tone}` : ""}${pulsing ? " is-changed" : ""}`}
    >
      <span className="tr-rail__label">{label}</span>
      <b className="tr-rail__value">{value}</b>
      {note ? <small className="tr-rail__note">{note}</small> : null}
      {fill !== null ? (
        <span className="tr-rail__fill">
          <i style={{ "--fill": `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
        </span>
      ) : null}
    </div>
  );
}

/**
 * The rating, drawn the way this genre draws a rating: as a card.
 *
 * It was a number in a column beside three other numbers, which is exactly what it is
 * not - the other three describe your situation and change every summer, while this one
 * is you. Giving it the card the genre reserves for a player separates the two without a
 * word of explanation, and it is the one place in this interface where borrowing the
 * convention wholesale is the right call.
 *
 * The tiers are the genre's too, but drawn in this game's materials rather than in foil:
 * the dark panel throughout, with the metal only in the edge, the rating and the corner.
 * Red stays reserved for the masthead and the delta marker, so the top tier is gold with
 * a sheen rather than a colour of its own.
 */
const OVR_TIERS = [
  { min: 85, key: "elite" },
  { min: 75, key: "oro" },
  { min: 65, key: "plata" },
  { min: 0, key: "bronce" },
];

export const ovrTier = (ovr) =>
  (OVR_TIERS.find((tier) => ovr >= tier.min) ?? OVR_TIERS[OVR_TIERS.length - 1]).key;

function PlayerCard({ ovr, position, country, locale, size = "sm" }) {
  const copy = getCopy(locale);
  const tier = ovrTier(ovr);
  const pulsing = useChangePulse(ovr);
  return (
    <div
      className={`tr-pcard tr-pcard--${size} is-${tier}${pulsing ? " is-changed" : ""}`}
      role="img"
      aria-label={`${copy.common.ovr} ${ovr} · ${POSITION_LABELS[locale][position] ?? position}`}
    >
      <b className="tr-pcard__rating">{ovr}</b>
      <span className="tr-pcard__pos">{position}</span>
      {/* The nation and not the club: the card is what you are, and the crest beside it
          in the rail is already saying where you happen to be this year. */}
      <span className="tr-pcard__badge">
        <Flag country={country} size={14} />
      </span>
    </div>
  );
}

/**
 * The cabinet, wherever you are.
 *
 * One entry per kind of cup with a count, in the order the first of each was won, so the
 * shelf grows to the right as the career runs. It lives in the masthead rather than in the
 * decision panel because it is the one part of a player's profile that is true on every
 * screen - what he has actually won does not depend on which phase he is in.
 */
function TrophyShelf({ trophies, locale, size = 20 }) {
  const shelf = useMemo(() => {
    const byTrophy = new Map();
    for (const trophy of trophies) {
      const key = `${trophy.trophy}${trophy.national ? ":nt" : ""}`;
      const seen = byTrophy.get(key);
      if (seen) seen.count += 1;
      else {
        byTrophy.set(key, {
          key,
          trophy: trophy.trophy,
          national: Boolean(trophy.national),
          count: 1,
        });
      }
    }
    return [...byTrophy.values()];
  }, [trophies]);

  if (!shelf.length) return null;
  return (
    <ul className="tr-shelf">
      {shelf.map((entry, index) => (
        <li
          key={entry.key}
          className={`tr-shelf__item${entry.national ? " is-national" : ""}`}
          style={{ "--i": index }}
          title={`${TROPHY_LABELS[locale][entry.trophy] ?? entry.trophy}${
            entry.count > 1 ? ` ×${entry.count}` : ""
          }`}
        >
          <TrophySilhouette id={entry.trophy} size={size} />
          {entry.count > 1 ? <b>{entry.count}</b> : null}
        </li>
      ))}
    </ul>
  );
}

function StatRail({ run, standing, locale }) {
  const copy = getCopy(locale);
  const keeper = run.state.position === "POR";
  const role = standing.delta == null ? null : roleFor(standing.delta, keeper);
  const contract = standing.contract;
  const idolatry = standing.idolatry;

  return (
    <div className="tr-rail">
      {/* Who you are, then where you are, then what that is currently worth. */}
      <PlayerCard
        ovr={run.state.ovr}
        position={run.state.position}
        country={standing.country}
        locale={locale}
      />

      {standing.club ? (
        <div className="tr-rail__club">
          <Crest club={standing.club} size={34} />
          <div>
            <b>{standing.club.shortName ?? standing.club.name}</b>
            <small>
              {standing.competition?.name ?? "—"}
              {standing.division?.tier === 2 ? ` · ${copy.hud.secondTier}` : ""}
            </small>
          </div>
        </div>
      ) : null}

      <StatCells>
      {/* The number the whole model turns on, finally on screen at all times. The role
          under it is the same number in words, because that is what it buys. */}
      {role ? (
        <StatCell
          label={copy.hud.delta}
          value={formatDelta(standing.delta)}
          note={ROLE_LABELS[locale][role.role]}
          tone={`role-${role.role}`}
        />
      ) : null}

      <StatCell
        label={copy.hud.deal}
        value={contract && contract.yearsLeft > 0 ? contract.yearsLeft : "—"}
        note={
          contract && contract.yearsLeft > 0 ? copy.hud.years : copy.hud.free
        }
        tone={contract && contract.yearsLeft > 0 ? null : "warn"}
      />

      {idolatry ? (
        <StatCell
          label={copy.hud.crowd}
          value={idolatry.value}
          note={IDOLATRY_LABELS[locale][idolatry.level]}
          tone={`idol-${idolatry.level}`}
          fill={idolatry.value / 100}
        />
      ) : null}
      </StatCells>

      {/* The vitrina, on its own line so it never squeezes the four readings above it. */}
      <TrophyShelf trophies={run.state.trophies} locale={locale} />
    </div>
  );
}

/**
 * The readings, grouped so that narrow screens have one obvious place to break: the card
 * and the crest keep the first line and the numbers drop to their own. Left as loose
 * children they wrapped wherever they happened to fit, which is different on every phone.
 */
function StatCells({ children }) {
  return <div className="tr-rail__cells">{children}</div>;
}

/**
 * The age spine: the career's only real clock, from signing to retirement.
 *
 * Seasons that produced something are marked on it, so the bar doubles as the shape of
 * the career - long grey stretches with a few bright years is exactly what most of them
 * look like, and seeing that while you still have seasons left is the point.
 */
function AgeSpine({ age, history = [], locale }) {
  const copy = getCopy(locale);
  const marks = useMemo(() => {
    const byAge = new Map();
    for (const season of history) {
      const won = season.awards.length
        ? "award"
        : season.titles.length || season.national?.titles?.length
          ? "title"
          : null;
      if (won) byAge.set(season.age, won);
    }
    return byAge;
  }, [history]);

  const years = [];
  for (let year = START_AGE; year <= RETIREMENT_AGE; year += 1) years.push(year);

  return (
    <div className="tr-spine" aria-label={`${copy.common.age} ${age}`}>
      {years.map((year) => {
        const mark = marks.get(year);
        return (
          <span
            key={year}
            className={`tr-spine__tick${year < age ? " is-past" : ""}${
              year === age ? " is-now" : ""
            }${mark ? ` has-${mark}` : ""}`}
          >
            {year % 4 === 0 || year === age ? <i>{year}</i> : null}
          </span>
        );
      })}
    </div>
  );
}

/* ── Screens ──────────────────────────────────────────────────────────────── */

function SetupScreen({ locale, onStart }) {
  const copy = getCopy(locale);
  const countries = useMemo(() => playableCountries(), []);
  const [form, setForm] = useState(() => ({
    surname: "",
    number: 9,
    foot: "left",
    country: "ESP",
    position: "DC",
    mode: "intensa",
    seed: randomSeed(),
  }));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    onStart({
      ...form,
      surname: (form.surname.trim() || copy.setup.surnamePlaceholder).toUpperCase(),
      number: Math.max(1, Math.min(99, Number(form.number) || 9)),
    });
  };

  return (
    <form className="tr-setup" onSubmit={submit}>
      <header className="tr-setup__head">
        <p className="tr-eyebrow">{copy.setup.heading}</p>
        <h2 className="tr-display tr-display--xl">{copy.title}</h2>
        <p className="tr-lede">{copy.setup.lede}</p>
      </header>

      <div className="tr-setup__grid">
        <label className="tr-field tr-field--wide">
          <span>{copy.setup.surname}</span>
          <input
            type="text"
            value={form.surname}
            maxLength={14}
            placeholder={copy.setup.surnamePlaceholder}
            onChange={(event) => set("surname", event.target.value)}
          />
        </label>

        <label className="tr-field tr-field--narrow">
          <span>{copy.setup.number}</span>
          <input
            type="number"
            min="1"
            max="99"
            value={form.number}
            onChange={(event) => set("number", event.target.value)}
          />
        </label>

        <label className="tr-field">
          <span>{copy.setup.position}</span>
          <select value={form.position} onChange={(event) => set("position", event.target.value)}>
            {Object.keys(POSITIONS).map((position) => (
              <option key={position} value={position}>
                {position} · {POSITION_LABELS[locale][position]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="tr-field tr-field--choice">
          <legend>{copy.setup.foot}</legend>
          <div className="tr-choice">
            {["left", "right"].map((foot) => (
              <button
                key={foot}
                type="button"
                className={`tr-chip${form.foot === foot ? " is-on" : ""}`}
                aria-pressed={form.foot === foot}
                onClick={() => set("foot", foot)}
              >
                {copy.setup[foot]}
              </button>
            ))}
          </div>
        </fieldset>

        {/* The country you play for, picked by its flag.
            It was a <select>, and a native option cannot carry an image - so the one
            field on this screen that is about where you are from was the one field with
            nothing to look at. Twenty-nine of them fit in a scroll box, and a flag is
            read faster than a name in either language. */}
        <fieldset className="tr-field tr-field--full">
          <legend>{copy.setup.country}</legend>
          <div className="tr-flags">
            {countries.map((country) => {
              const on = form.country === country.fifa;
              return (
                <button
                  key={country.fifa}
                  type="button"
                  className={`tr-flagpick${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => set("country", country.fifa)}
                >
                  <Flag country={country} size={20} />
                  <span>{locale === "es" ? country.name_es : country.name_en}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="tr-field tr-field--wide">
          <span>{copy.setup.seed}</span>
          <div className="tr-seed">
            <input
              type="text"
              value={form.seed}
              maxLength={16}
              onChange={(event) => set("seed", event.target.value.toUpperCase())}
            />
            <button type="button" className="tr-btn tr-btn--ghost" onClick={() => set("seed", randomSeed())}>
              {copy.setup.randomSeed}
            </button>
          </div>
          <small>{copy.setup.seedHint}</small>
        </label>
      </div>

      <fieldset className="tr-modes">
        <legend>
          {copy.setup.mode} <small>{copy.setup.modeHint}</small>
        </legend>
        <div className="tr-modes__row">
          {["intensa", "normal", "expres"].map((mode) => (
            <button
              key={mode}
              type="button"
              className={`tr-mode${form.mode === mode ? " is-on" : ""}`}
              aria-pressed={form.mode === mode}
              onClick={() => set("mode", mode)}
            >
              <b>{copy.setup.modes[mode].label}</b>
              <small>{copy.setup.modes[mode].detail}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <p className="tr-thesis">{copy.setup.thesis}</p>
      <button type="submit" className="tr-btn tr-btn--primary tr-btn--block">
        {copy.setup.start}
      </button>
    </form>
  );
}

/** Below this a term is not what decided the season, and saying so would be noise. */
const GROWTH_DRIVER_FLOOR = 0.04;

/**
 * The one sentence that explains a development factor: whichever of the three terms is
 * furthest from neutral, named. `drivers` arrives already sorted by that distance.
 */
function growthDriverLine(growth, copy) {
  const top = growth?.drivers?.[0];
  if (!top || Math.abs(top.value - 1) < GROWTH_DRIVER_FLOOR) return "";
  return copy.season.growthDriver[`${top.key}${top.value >= 1 ? "High" : "Low"}`] ?? "";
}

export const growthBandOf = (factor) =>
  factor >= GROWTH.thrivingFrom ? "thriving" : factor <= GROWTH.stallBelow ? "stalled" : "neutral";

/**
 * One of the two verdicts under an offer.
 *
 * The card used to stack four separate read-outs - reputation rungs, the meter, a growth
 * tag and an exit box - each with its own shape, so comparing three clubs meant reading
 * three paragraphs in three different formats. These are two fixed slots in the same
 * place on every card, in the same language as the header rail: a label, one word, and a
 * bar where there is a scale behind it. Comparing offers is now scanning a column.
 */
function Verdict({ label, value, detail, tone, fill = null }) {
  return (
    <div className={`tr-verdict${tone ? ` is-${tone}` : ""}`}>
      <span className="tr-verdict__label">{label}</span>
      <b className="tr-verdict__value">{value}</b>
      {fill !== null ? (
        <span className="tr-verdict__bar">
          <i style={{ "--fill": `${Math.max(0, Math.min(1, fill)) * 100}%` }} />
        </span>
      ) : null}
      {detail ? <small className="tr-verdict__detail">{detail}</small> : null}
    </div>
  );
}

/**
 * `showCost` is off on the youth screen, where there is no crowd to leave yet. It is a
 * per-grid switch rather than a per-card one so every card in a grid keeps the same
 * height and the same slots - the moment one card has a row its neighbour lacks, the
 * comparison stops being a glance.
 */
function OfferGrid({
  offers,
  ovr,
  keeper,
  locale,
  onPick,
  actionLabel,
  stayLabel,
  currentClubName = "",
  showCost = true,
}) {
  const copy = getCopy(locale);
  return (
    <div className="tr-offers">
      {offers.map((offer, index) => {
        const club = world.clubs[offer.clubId];
        const competition = world.competitions[offer.competitionId] ?? null;
        if (!club) return null;
        const squadLevel = ovr - offer.projectedDelta;
        const exit = offer.exit;
        const band = offer.growth ? growthBandOf(offer.growth.factor) : null;
        return (
          <article
            key={`${offer.clubId}-${offer.stay ? "stay" : "in"}`}
            className={`tr-offer${offer.stay ? " is-stay" : ""}`}
            style={{ "--i": index }}
          >
            <header className="tr-offer__head">
              <Crest club={club} size={44} />
              <div className="tr-offer__id">
                <h3>{club.shortName ?? club.name}</h3>
                <p>
                  {competition?.name ?? "—"}
                  {competition?.tier === 2 ? ` · ${copy.hud.secondTier}` : ""}
                </p>
              </div>
              {offer.stay ? <span className="tr-tag">{stayLabel}</span> : null}
            </header>

            {/* The signature element stays the hero of the card: where you land on this
                track is the role you get. The club's stature is folded into its foot,
                because the squad level printed there is exactly what stature means. */}
            <DeltaMeter
              ovr={ovr}
              squadLevel={squadLevel}
              keeper={keeper}
              locale={locale}
              reputation={club.international_reputation ?? 0}
              compact
            />

            <div className="tr-verdicts">
              {offer.growth ? (
                <Verdict
                  label={copy.market.growth}
                  value={copy.market.growthBand[band]}
                  tone={band}
                  fill={(offer.growth.factor - GROWTH.min) / (GROWTH.max - GROWTH.min)}
                />
              ) : null}

              {/* What signing this would cost you with the crowd you are leaving. The
                  genre hides this and lets you find out afterwards; the whole point of
                  this game is that the number is on the card before you commit. */}
              {showCost ? (
                <Verdict
                  label={fillTemplate(copy.market.exitCost, { club: currentClubName })}
                  value={exit ? exit.change : copy.market.exitFree}
                  tone={exit ? (exit.betrayal ? "betrayal" : "cost") : "free"}
                  detail={
                    exit?.betrayal
                      ? copy.market.exitBetrayalShort
                      : exit?.demotes
                        ? fillTemplate(copy.market.exitDemotes, {
                            from: IDOLATRY_LABELS[locale][exit.from],
                            to: IDOLATRY_LABELS[locale][exit.to],
                          })
                        : null
                  }
                />
              ) : null}
            </div>

            <button type="button" className="tr-btn tr-btn--primary" onClick={() => onPick(offer)}>
              {offer.stay ? stayLabel : actionLabel}
            </button>
          </article>
        );
      })}
    </div>
  );
}

function YouthScreen({ run, locale, onSign }) {
  const copy = getCopy(locale);
  return (
    <section className="tr-stage">
      <header className="tr-stage__head">
        <p className="tr-eyebrow">{copy.youth.heading}</p>
        <p className="tr-lede">{copy.youth.lede}</p>
      </header>
      <OfferGrid
        offers={run.offers}
        ovr={run.state.ovr}
        keeper={run.state.position === "POR"}
        locale={locale}
        actionLabel={copy.youth.sign}
        stayLabel={copy.market.stay}
        onPick={(offer) => onSign(offer.clubId)}
        showCost={false}
      />
    </section>
  );
}

function EventScreen({ run, locale, onResolve }) {
  const copy = getCopy(locale);
  const event = run.event;
  const text = event?.[locale] ?? event?.es;
  if (!text) return null;

  return (
    <section className="tr-stage tr-desk">
      <div className="tr-desk__main">
        {run.injury ? (
          <aside className="tr-injury">
            <p className="tr-eyebrow tr-eyebrow--alert">{copy.event.injuryEyebrow}</p>
            <h3>{run.injury[locale] ?? run.injury.es}</h3>
            <p>
              {Math.abs(run.injury.matches)} {copy.event.matchesLost} · {run.injury.ovr} OVR
            </p>
            <small>{copy.event.injuryNote}</small>
          </aside>
        ) : null}

        <article className={`tr-card tr-card--${event.theme}`}>
          <p className="tr-eyebrow">
            <Icon name={event.theme} size={14} />
            {copy.event.eyebrow} · {THEME_LABELS[locale][event.theme] ?? event.theme}
          </p>
          <h2 className="tr-display tr-display--lg">{text.title}</h2>
          <p className="tr-card__body">{text.body}</p>
          <div className="tr-card__options">
            {text.options.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className="tr-option"
                style={{ "--i": index }}
                onClick={() => onResolve(option.id)}
              >
                {/* What kind of answer this is, before you have read which one it is:
                    take it, turn it down, stand still, say something. Three cards deep
                    into a career the glyph is faster than the sentence. */}
                <span className="tr-option__mark">
                  <Icon name={optionIcon(event, option.id)} size={17} />
                </span>
                <span className="tr-option__text">
                  <b>{option.label}</b>
                  <small>{option.detail}</small>
                </span>
              </button>
            ))}
          </div>
        </article>
      </div>

      <ContextPanel run={run} locale={locale} />
    </section>
  );
}

/* ── The contract ─────────────────────────────────────────────────────────── */

/**
 * The four terms, laid out as the sheet they are.
 *
 * The wage line is the one that matters and it is deliberately not a number first: it is a
 * ROLE, because that is the standard the crowd will hold it to. The euros are underneath,
 * where they belong - the player never spends them.
 */
function ContractSheet({ terms, locale, opening = null, compact = false }) {
  const copy = getCopy(locale);
  const changed = (key) => opening && opening[key] !== terms[key];

  // A band rounds the wage to a role, which is what makes it readable - and hides the
  // difference between a starter's wage and the biggest one at the club. Say it out loud.
  const premium = wagePremium(terms.wage, terms.pay ?? { reputation: terms.reputation ?? 0 });
  const premiumNote =
    premium > 0.15 ? copy.contract.wageAbove : premium < -0.15 ? copy.contract.wageBelow : null;

  const rows = [
    {
      key: "years",
      icon: "years",
      label: copy.contract.years,
      value:
        terms.years === 1
          ? copy.contract.yearsOne
          : fillTemplate(copy.contract.yearsValue, { years: terms.years }),
    },
    {
      key: "wage",
      icon: "wage",
      label: copy.contract.wage,
      value: WAGE_ROLE_LABELS[locale][terms.wageRole] ?? terms.wageRole,
      note: `${formatValue(terms.wage, locale)} · ${premiumNote ?? copy.contract.wagePer}`,
      warn: premium > 0.15,
    },
    {
      key: "rolePromise",
      icon: "role",
      label: copy.contract.role,
      value: terms.rolePromise
        ? fillTemplate(copy.contract.rolePromised, {
            role: ROLE_LABELS[locale][terms.rolePromise] ?? terms.rolePromise,
          })
        : copy.contract.roleNone,
      muted: !terms.rolePromise,
    },
    {
      key: "clause",
      icon: "clause",
      label: copy.contract.clause,
      value: formatValue(terms.clause, locale),
      note: compact ? null : copy.contract.clauseNote,
    },
  ];

  const reasons = compact ? [] : terms.reasons ?? [];

  return (
    <>
      {reasons.length ? (
        <ul className="tr-why">
          {reasons.map((reason) => (
            <li key={reason} className={`tr-why__tag tr-why__tag--${reason}`}>
              {REASON_LABELS[locale][reason] ?? reason}
            </li>
          ))}
        </ul>
      ) : null}
      <dl className={`tr-terms${compact ? " is-compact" : ""}`}>
        {rows.map((row, index) => (
          <div
            key={row.key}
            className={`tr-term${changed(row.key) ? " is-changed" : ""}${row.muted ? " is-muted" : ""}${row.warn ? " is-warned" : ""}`}
            style={{ "--i": index }}
          >
            <dt>
              <Icon name={row.icon} size={compact ? 14 : 16} />
              {row.label}
            </dt>
            <dd>
              <b>{row.value}</b>
              {row.note ? <small>{row.note}</small> : null}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

/**
 * The negotiation.
 *
 * Built out of the same grammar as a decision card on purpose: every ask prints the odds
 * it is granted and those are the odds that get rolled. What is new is that the odds are
 * not a property of the card, they are a property of you - the same delta the rest of the
 * game turns on, read back as how much this club has to listen to you.
 */
function NegotiationScreen({ run, locale, onAsk, onAgree, onBack }) {
  const copy = getCopy(locale);
  const deal = run.deal;
  if (!deal) return null;

  const club = world.clubs[deal.clubId];
  const competition = world.competitions[club?.competitionId] ?? null;
  const asks = availableAsks(run);
  const spent = deal.round >= CONTRACT.maxAsks;
  const reply = deal.last;

  return (
    <section className="tr-stage tr-talks">
      <article className="tr-talks__room">
        <header className="tr-talks__head">
          <p className="tr-eyebrow">
            <Icon name="directiva" size={14} /> {copy.talks.eyebrow}
          </p>
          <div className="tr-talks__club">
            <Crest club={club} size={52} />
            <div>
              <h2 className="tr-display tr-display--lg">{club?.shortName ?? club?.name}</h2>
              <p>{competition?.name ?? "—"}</p>
            </div>
          </div>
          <p className="tr-lede">
            {deal.leverage < 0.2
              ? copy.talks.noLeverage
              : fillTemplate(copy.talks.lede, { asks: CONTRACT.maxAsks })}
          </p>

          <div className="tr-leverage">
            <span className="tr-leverage__label">{copy.talks.leverage}</span>
            <span className="tr-leverage__track">
              <i style={{ width: `${Math.round(deal.leverage * 100)}%` }} />
            </span>
          </div>
        </header>

        {reply ? (
          <aside className={`tr-reply${reply.granted ? " is-granted" : ""}`} key={deal.round}>
            <Icon name="chat" size={16} />
            <div>
              <b>{reply.granted ? copy.talks.granted : copy.talks.refused}</b>
              <p>
                {(reply.granted ? copy.talks.repliesGranted : copy.talks.repliesRefused)[
                  reply.askId
                ]}
              </p>
            </div>
          </aside>
        ) : null}

        <div className="tr-talks__asks">
          {spent || !asks.length ? (
            <p className="tr-talks__spent">{copy.talks.spent}</p>
          ) : (
            asks.map((ask, index) => (
              <button
                key={ask.id}
                type="button"
                className="tr-ask"
                style={{ "--i": index }}
                disabled={ask.odds <= 0}
                onClick={() => onAsk(ask.id)}
              >
                <Icon name={ask.icon} size={18} />
                <span>
                  <b>{copy.talks.asks[ask.id].label}</b>
                  <small>{copy.talks.asks[ask.id].detail}</small>
                </span>
                <em>{Math.round(ask.odds * 100)}%</em>
              </button>
            ))
          )}
        </div>

        <div className="tr-talks__actions">
          <button type="button" className="tr-btn tr-btn--primary" onClick={onAgree}>
            <Icon name="pen" size={16} />
            {deal.round === 0 ? copy.talks.signNow : copy.talks.sign}
          </button>
          <button type="button" className="tr-btn tr-btn--ghost" onClick={onBack}>
            {copy.talks.back}
          </button>
        </div>
      </article>

      <aside className="tr-talks__paper">
        <p className="tr-front__cardhead">{copy.talks.onTheTable}</p>
        <ContractSheet terms={deal.terms} opening={deal.opening} locale={locale} />

        <p className="tr-terms__note">
          {fillTemplate(copy.contract.expectationNote, {
            role: (WAGE_ROLE_LABELS[locale][deal.terms.wageRole] ?? "").toLowerCase(),
          })}
        </p>

        {deal.exit ? (
          <div className={`tr-exit${deal.exit.betrayal ? " is-betrayal" : ""}`}>
            <span className="tr-exit__head">
              {fillTemplate(copy.market.exitCost, {
                club: world.clubs[run.state.clubId]?.shortName ?? "",
              })}
              <b>{Math.round(deal.exit.change)}</b>
            </span>
            {deal.exit.breachYears ? (
              <small>
                {fillTemplate(copy.contract.breach, { years: deal.exit.breachYears })}
              </small>
            ) : null}
          </div>
        ) : null}
      </aside>
    </section>
  );
}

/**
 * The signature.
 *
 * The one purely ceremonial screen in the game, and it earns its place: every other beat
 * here is a number, and a career needs one moment that is just a name going onto paper.
 * The stroke is a wipe rather than a traced glyph, because a traced glyph would depend on
 * font metrics we do not control - this reads the same in every locale.
 */
function SigningScreen({ run, locale, onDone }) {
  const copy = getCopy(locale);
  const reduced = usePrefersReducedMotion();
  const signing = run.signing;
  if (!signing) return null;

  const club = world.clubs[signing.clubId];
  const competition = world.competitions[club?.competitionId] ?? null;
  const gained = ["years", "wage", "rolePromise", "clause"].filter(
    (key) => signing.opening[key] !== signing.terms[key],
  );

  return (
    <section className="tr-stage tr-stage--narrow">
      <article className={`tr-sign${reduced ? " is-still" : ""}`}>
        <header className="tr-sign__head">
          <p className="tr-front__cardhead">{copy.signing.eyebrow}</p>
          <div className="tr-sign__club">
            <Crest club={club} size={46} />
            <div>
              <h2 className="tr-display tr-display--lg">{club?.shortName ?? club?.name}</h2>
              <p>{competition?.name ?? "—"}</p>
            </div>
          </div>
        </header>

        <ContractSheet terms={signing.terms} locale={locale} />

        <section className="tr-sign__gained">
          <p className="tr-front__label">{copy.signing.gained}</p>
          {gained.length ? (
            <ul>
              {gained.map((key) => (
                <li key={key}>
                  <Icon
                    name={key === "rolePromise" ? "role" : key === "clause" ? "clause" : key}
                    size={14}
                  />
                  {copy.talks.asks[
                    key === "rolePromise" ? "role" : key === "years" ? "short" : key
                  ].label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="tr-sign__none">{copy.signing.nothingGained}</p>
          )}
        </section>

        <div className="tr-sign__paper">
          <span className="tr-sign__by">{copy.signing.by}</span>
          <span className="tr-sign__name">{run.state.surname}</span>
          <svg className="tr-sign__flourish" viewBox="0 0 260 40" aria-hidden="true">
            <path
              d="M6 30c40-18 78-22 110-12 30 9 62 6 96-14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="tr-sign__season">
            {fillTemplate(copy.signing.season, { season: run.season + 1 })}
          </span>
        </div>

        <button type="button" className="tr-btn tr-btn--primary tr-btn--block" onClick={onDone}>
          {copy.signing.done}
        </button>
      </article>
    </section>
  );
}

/**
 * Where you stand, printed beside whatever you are being asked.
 *
 * The decision screen used to be one card floating in a lot of empty space, which on a
 * desktop read as an unfinished page - and, worse, meant the player answered questions
 * about a club without the terms of his own deal in front of him.
 */
function ContextPanel({ run, locale }) {
  const copy = getCopy(locale);
  const standing = currentStanding(run);
  const contract = standing.contract;
  const titles = run.state.trophies.filter((trophy) => !trophy.national).length;

  const rival = useMemo(
    () => shadowStanding(run.shadow, run.state, run.state.age - 1),
    [run.shadow, run.state],
  );

  // The rail in the masthead carries these too, and they were taken out of here for that
  // reason - but the two are not saying the same thing at the same size. The rail is a
  // glance: a crest, a number, a word. This is the panel you actually read while deciding,
  // so it gets the badge at a size you can see and the full idolatría ladder with its
  // rungs, which is the only place the next one up is visible as a target.
  return (
    <aside className="tr-context">
      <p className="tr-front__cardhead">{copy.context.heading}</p>

      <div className="tr-context__club">
        <Crest club={standing.club} size={40} />
        <div>
          <b>{standing.club?.shortName ?? standing.club?.name ?? copy.context.noClub}</b>
          <small>{standing.competition?.name ?? "—"}</small>
        </div>
      </div>

      <DeltaMeter
        ovr={run.state.ovr}
        squadLevel={standing.squadLevel ?? run.state.ovr}
        keeper={run.state.position === "POR"}
        locale={locale}
        compact
      />

      <section className="tr-context__block">
        <p className="tr-front__label">
          <Icon name="years" size={13} /> {copy.context.deal}
        </p>
        {contract && contract.yearsLeft > 0 ? (
          <>
            <ContractSheet terms={contract} locale={locale} compact />
            <small className="tr-context__note">
              {fillTemplate(copy.contract.yearsLeft, {
                years:
                  contract.yearsLeft === 1
                    ? copy.contract.yearsOne
                    : fillTemplate(copy.contract.yearsValue, { years: contract.yearsLeft }),
              })}
            </small>
          </>
        ) : (
          <p className="tr-context__free">{copy.context.freeAgent}</p>
        )}
      </section>

      <section className="tr-context__block">
        <p className="tr-front__label">
          <Icon name="crowd" size={13} /> {copy.context.crowd}
        </p>
        {standing.idolatry ? (
          <IdolatryBar
            value={standing.idolatry.value}
            level={standing.idolatry.level}
            locale={locale}
            compact
          />
        ) : null}
        <small className="tr-context__note">
          {run.state.seasonsAtClub === 0
            ? copy.context.firstSeasonHere
            : fillTemplate(copy.context.seasonsHere, { seasons: run.state.seasonsAtClub })}
        </small>
      </section>

      {/* The cabinet as it fills, not a running total of it. This is the player's profile
          in career mode: every cup he has actually lifted, in the order he lifted them,
          building up along the shelf as the years go by. A number said the same thing and
          said nothing - twelve is a fact, twelve shapes is a career. */}
      {/* The man the ending will measure you against, kept in front of you the whole way.
          A comparison produced only on the last screen of a career is a scoreboard; this
          is what makes it a rivalry. */}
      {rival ? (
        <section className={`tr-context__block tr-rival${rival.ahead ? " is-ahead" : " is-behind"}`}>
          <p className="tr-front__label">
            <Icon name="rival" size={13} /> {copy.context.rival}
          </p>
          <div className="tr-rival__id">
            <Crest club={world.clubs[rival.clubId]} size={22} />
            <b>{rival.surname}</b>
          </div>
          <dl className="tr-rival__grid">
            {[
              ["ovr", copy.common.ovr, rival.mine.ovr, rival.theirs.ovr],
              ["titles", copy.context.titles, rival.mine.titles, rival.theirs.titles],
              ["goals", copy.season.goals, rival.mine.goals, rival.theirs.goals],
            ].map(([key, label, mine, theirs]) => (
              <div key={key} className={mine >= theirs ? "is-up" : "is-down"}>
                <dt>{label}</dt>
                <dd>
                  <b>{mine}</b>
                  <span>{theirs}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/* The shelf itself is in the masthead now - it belongs to the profile, and a
          profile is true on every screen. What is worth repeating here is the count. */}
      <section className="tr-context__block">
        <p className="tr-front__label">
          <Icon name="trophy" size={13} /> {copy.context.cabinet}
        </p>
        <p className="tr-context__count">
          {titles ? (
            <>
              <b>{titles}</b> {copy.context.titles}
            </>
          ) : (
            copy.context.cabinetEmpty
          )}
        </p>
      </section>
    </aside>
  );
}

/* ── The moments that are yours ───────────────────────────────────────────────
   `matchmode.js` decides whether the ball is at your feet or the match is playing
   out around you. These draw the first case: one moving marker, one track, and a
   target you can only hit by looking. Three mechanics share the component because
   they share the geometry - see minigames.js for why that matters.            */

/**
 * A marker sweeping a track, stopped by the player.
 *
 * `mode` changes what the track means, not how it behaves: a sweep runs back and forth
 * across the goalmouth, a window runs once and closes. Both come down to a position in
 * 0..1 at the instant of the press, which is the only thing `judgeChance` wants.
 */
function ChanceTrack({ chance, locale, onSettle }) {
  const copy = getCopy(locale);
  const reduced = usePrefersReducedMotion();
  const [position, setPosition] = useState(0);
  const [gate, setGate] = useState(0);
  const [locked, setLocked] = useState([]);
  const frame = useRef({ start: 0, raf: 0 });

  const gates = chance.gates ?? [chance.target];
  const closing = chance.mechanic === MECHANICS.WINDOW;

  useEffect(() => {
    // Reduced motion gets a still track and a tap: the same decision without the chase.
    if (reduced) return undefined;
    frame.current.start = performance.now();
    let raf = 0;
    const step = (now) => {
      const elapsed = ((now - frame.current.start) / 1000) % chance.period;
      const phase = elapsed / chance.period;
      // A sweep bounces; a window runs once and is gone.
      setPosition(closing ? phase : phase < 0.5 ? phase * 2 : 2 - phase * 2);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [chance.period, closing, reduced, gate]);

  const settle = useCallback(
    (value) => {
      const next = [...locked, value];
      if (next.length >= gates.length) {
        onSettle(gates.length > 1 ? next : next[0]);
        return;
      }
      setLocked(next);
      setGate(next.length);
      frame.current.start = performance.now();
    },
    [gates.length, locked, onSettle],
  );

  return (
    <div className="tr-chance">
      <p className="tr-chance__prompt">
        {gates.length > 1
          ? fillTemplate(copy.match.chanceGate, { n: gate + 1, total: gates.length })
          : copy.match.chancePrompt[chance.mechanic]}
      </p>

      <button
        type="button"
        className={`tr-chance__track is-${chance.mechanic}`}
        onClick={() => settle(reduced ? gates[gate] : position)}
        aria-label={copy.match.chancePrompt[chance.mechanic]}
      >
        {/* The target is drawn: this is a test of timing, never of guessing where. */}
        <span
          className="tr-chance__target"
          style={{
            "--from": `${Math.max(0, gates[gate] - chance.tolerance) * 100}%`,
            "--size": `${chance.tolerance * 200}%`,
          }}
        />
        <span
          className="tr-chance__marker"
          style={{ "--at": `${(reduced ? gates[gate] : position) * 100}%` }}
        />
        {locked.map((value, i) => (
          <span key={i} className="tr-chance__locked" style={{ "--at": `${value * 100}%` }} />
        ))}
      </button>

      <p className="tr-chance__hint">{copy.match.chanceHint}</p>
    </div>
  );
}

/**
 * One beat's line. Every id now carries several ways of saying it (copy.js) and the beat
 * arrives with a seed-drawn `variant`, so a match reads the same way twice and two similar
 * matches do not.
 */
function beatLine(beat, copy) {
  const lines = copy.match.beats[beat.id];
  if (!lines) return "";
  const list = Array.isArray(lines) ? lines : [lines];
  const text = list[(beat.variant ?? 0) % list.length];
  return fillTemplate(text, { us: beat.ourName, them: beat.theirName || copy.match.opponent });
}

/* How the ninety minutes are paced on screen. */
const MINUTES_PER_SECOND = 10;
/** A goal has to land. The clock stops dead on every beat for this long. */
const BEAT_HOLD = 660;

/**
 * The ninety minutes, on a clock.
 *
 * The whole broadcast is already built - narration.js is pure, and the result is not in it
 * yet - so nothing here decides anything. What it does is run the match: the minute counts
 * up from kick-off, beats appear as their minute arrives, and the clock stops dead for a
 * beat or two on each one so a goal reads as a goal instead of scrolling past.
 *
 * It stops on the chance and hands over to the placements. Once he has called it, the same
 * clock carries on from that minute to full time - `finished` simply extends where it is
 * allowed to run to, so the match never restarts and never jumps.
 */
function Broadcast({ broadcast, locale, finished, attempt = 0, onReach }) {
  const copy = getCopy(locale);
  const reduced = usePrefersReducedMotion();

  const beats = useMemo(
    () => [...broadcast.beats, ...(finished?.beats ?? [])],
    [broadcast.beats, finished],
  );
  /*
   * Where the clock is allowed to run to right now: the NEXT chance he has not taken yet,
   * or full time once they are all done.
   *
   * This used to stop at `broadcast.moment`, which is the LAST chance of the match. On a
   * night worth two, the clock ran straight past the first one to the second, asked there,
   * and then hung: `stopAt` had not changed, so the "we have arrived" announcement - which
   * is keyed on it - could never fire a second time, and the screen sat on "the match is
   * still going" for ever with a decision it would not accept.
   */
  const stopAt = finished ? FULL_TIME : broadcast.moments?.[attempt] ?? broadcast.moment;

  const clock = useRef(0);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (reduced) {
      clock.current = stopAt;
      setMinute(stopAt);
      return undefined;
    }

    let raf = 0;
    let last = performance.now();
    let holdUntil = 0;

    const run = (now) => {
      const delta = now - last;
      last = now;

      if (now >= holdUntil && clock.current < stopAt) {
        const from = clock.current;
        const to = Math.min(stopAt, from + (delta / 1000) * MINUTES_PER_SECOND);
        // Crossing a beat stops the clock on it, so the feed is punctuated rather than
        // scrolled. Kick-off is excluded: nobody needs a pause before it starts.
        if (beats.some((beat) => beat.minute > from && beat.minute <= to && beat.minute > 0)) {
          holdUntil = now + BEAT_HOLD;
        }
        clock.current = to;
        if (Math.floor(to) !== Math.floor(from)) setMinute(Math.floor(to));
      }
      raf = requestAnimationFrame(run);
    };

    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [beats, reduced, stopAt]);

  const skip = useCallback(() => {
    clock.current = stopAt;
    setMinute(stopAt);
  }, [stopAt]);

  // Tell the screen when the match has actually got there, once per stage. Until it has,
  // there are no placements to press - the chance has not happened yet.
  const announced = useRef(null);
  useEffect(() => {
    if (minute >= stopAt && announced.current !== stopAt) {
      announced.current = stopAt;
      onReach?.(stopAt);
    }
  }, [minute, stopAt, onReach]);

  const visible = beats.filter((beat) => beat.minute <= minute);
  const latest = visible[visible.length - 1];
  const running = minute < stopAt;

  return (
    <div className="tr-live">
      <div className="tr-live__scoreline">
        <b>{broadcast.ourName}</b>
        <span className="tr-live__score">
          {latest?.home ?? 0} – {latest?.away ?? 0}
        </span>
        <b>{broadcast.theirName || copy.match.opponent}</b>
      </div>

      <div className="tr-live__clock">
        <span className={`tr-live__minute${running ? " is-running" : ""}`}>{minute}'</span>
        {running ? (
          <button type="button" className="tr-live__skip" onClick={skip}>
            {copy.match.skip}
          </button>
        ) : null}
      </div>

      <ol className="tr-live__feed">
        {visible.map((beat, i) => (
          <li
            key={`${beat.minute}-${beat.id}-${i}`}
            className={`tr-live__beat${beat.decisive ? " is-decisive" : ""}${
              beat.id === "goalUs" ? " is-us" : beat.id === "goalThem" ? " is-them" : ""
            }`}
          >
            <i>{beat.minute}'</i>
            <span>{beatLine(beat, copy)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The one screen where the model steps aside.
 *
 * Everywhere else the game asks you to choose a club or a card and then tells you what the
 * football did. Here the football waits - and how it waits is no longer always the same.
 * Half the time the ball is at your feet and there is something to be good at; the rest of
 * the time the match plays out live around you and you call the last of it blind. Which
 * one you get is `matchmode.js`, and it tilts towards you as the side comes to depend on
 * you, so the arc of a career is also the arc of who takes the important ones.
 */
function MatchScreen({ run, locale, onShoot, onPlay, onWatch, onNext }) {
  const copy = getCopy(locale);
  const matchday = run.matchday;
  if (!matchday?.shot) return null;

  const { fixtures, index, shot, last } = matchday;
  const fixture = fixtures[index];
  const club = world.clubs[run.state.clubId] ?? null;
  const country = world.countries[run.state.country] ?? null;
  const opponent = fixture.opponentId ? world.clubs[fixture.opponentId] ?? null : null;
  const placement = (id) => PLACEMENT_LABELS[locale][id] ?? id;
  // A decider has three endings, not two. `absent` - the ball never came to him - settles
  // its trophy at DECIDES.absent and is neither his doing nor his fault, so it gets its own
  // verdict rather than borrowing the keeper's.
  const verdict = last ? (last.absent ? "none" : last.scored ? "yes" : "no") : null;
  const mark = last ? (last.absent ? "absent" : last.scored ? "scored" : "saved") : null;
  const outcome = verdict ? copy.match.decides[last.decides]?.[verdict] ?? "" : "";
  const record = conversionRecord(run.state.conversion, run.state.ovr);
  // What coming through meant here. A keeper who guessed the corner did not score.
  const verdicts = copy.match.verdicts[shot.produces] ?? copy.match.verdicts.goal;

  // A narrated decider builds its build-up on arrival, once per fixture.
  useEffect(() => {
    if (shot.mode === MODES.MATCH && !matchday.broadcast) onWatch();
  }, [shot.mode, matchday.broadcast, onWatch]);

  const live = shot.mode === MODES.MATCH;
  const owed = fixture.chances ?? 1;
  const attempt = matchday.attempts?.length ?? 0;

  // Where the broadcast has got to. The placements do not exist until the match reaches
  // the chance, and the result is not read out until it reaches full time - otherwise the
  // clock is decoration and the player is answering a question the match has not asked.
  const [reached, setReached] = useState({ chance: false, end: false });
  useEffect(() => {
    setReached({ chance: false, end: false });
  }, [shot.fixtureId]);
  const handleReach = useCallback((at) => {
    setReached((prev) => (at >= FULL_TIME ? { chance: true, end: true } : { ...prev, chance: true }));
  }, []);
  // Each chance is its own stop. Once one is taken the clock is released to the next.
  useEffect(() => {
    if (live && attempt > 0 && !matchday.last) setReached((prev) => ({ ...prev, chance: false }));
  }, [attempt, live, matchday.last]);

  const atChance = !live || reached.chance;
  const atEnd = !live || reached.end;

  // A continental final is the Eurocopa or the Copa América, never "the continental" -
  // the fixture is named after the cup that is actually being lifted.
  const title =
    fixture.kind === "final_continental_nt"
      ? fillTemplate(copy.match.ntFinal, {
          cup: NT_TOURNAMENT[locale][country?.confederation] ?? FIXTURE_LABELS[locale][fixture.kind],
        })
      : FIXTURE_LABELS[locale][fixture.kind];

  return (
    <section className="tr-stage tr-stage--narrow">
      <article className={`tr-match${mark ? ` is-${mark}` : ""}`}>
        <header className="tr-match__head">
          <div className="tr-match__bar">
            <p className="tr-eyebrow tr-eyebrow--alert">
              <Icon name={FIXTURE_ICONS[fixture.kind] ?? "ball"} size={14} />
              {copy.match.eyebrow}
            </p>
            {/* "2 de 3" is a fact you have to read. This is the same fact plus what
                happened in the first one, which is what the player actually wants to
                know as he steps up to the second. */}
            <span
              className="tr-match__pips"
              role="img"
              aria-label={fillTemplate(copy.match.counter, {
                n: index + 1,
                total: fixtures.length,
              })}
            >
              {fixtures.map((entry, pip) => {
                const played = pip < index ? matchday.results[pip] : pip === index ? last : null;
                const state = played
                  ? played.absent
                    ? "absent"
                    : played.scored
                      ? "scored"
                      : "saved"
                  : pip === index
                    ? "now"
                    : "next";
                return <i key={entry.id} className={`is-${state}`} />;
              })}
            </span>
          </div>
          {/* What is at stake, as a mark: the trophy, the two arrows of the table, the
              two shields of a derby. It reads before the words do. */}
          <div className="tr-match__title">
            <span className={`tr-match__emblem tr-match__emblem--${fixture.decides}`}>
              <Icon name={FIXTURE_ICONS[fixture.kind] ?? "ball"} size={30} strokeWidth={1.4} />
            </span>
            <h2 className="tr-display tr-display--lg">{title}</h2>
          </div>

          <div className="tr-match__teams">
            {/* A national final used to show nothing at all: the club crest was correctly
                suppressed and nothing took its place, so the biggest night of a career
                was the one screen with no badge on it. It is the country you are playing
                for, so it is the flag. */}
            {fixture.national ? (
              <span className="tr-match__team">
                <Flag country={country} size={28} />
                <b>{locale === "es" ? country?.name_es : country?.name_en}</b>
              </span>
            ) : (
              <span className="tr-match__team">
                <Crest club={club} size={30} />
                <b>{club?.shortName ?? club?.name ?? ""}</b>
              </span>
            )}
            {opponent ? (
              <>
                <span className="tr-match__vs">{copy.match.versus}</span>
                <span className="tr-match__team">
                  <Crest club={opponent} size={30} />
                  <b>{opponent.shortName ?? opponent.name}</b>
                </span>
              </>
            ) : null}
          </div>

          {/* A final drawn against the club the derby was going to be against is both
              things at once, and the second one is why the stadium sold out. */}
          {fixture.derby ? (
            <p className="tr-match__alsoderby">
              <Icon name={FIXTURE_ICONS.clasico ?? "ball"} size={13} />
              {copy.match.alsoDerby}
            </p>
          ) : null}
        </header>

        <p className="tr-match__type">
          <Icon name={SHOT_ICONS[shot.type] ?? "ball"} size={22} />
          {SHOT_LABELS[locale][shot.type]}
          <span className="tr-match__mode">
            {shot.mode === MODES.SKILL ? copy.match.modeSkill : copy.match.modeWatch}
          </span>
        </p>

        {/* The match around the moment, when this is one of the ones being played out.
            It stops on the chance; the placements below finish it. */}
        {shot.mode === MODES.MATCH && matchday.broadcast ? (
          <Broadcast
            broadcast={matchday.broadcast}
            locale={locale}
            finished={matchday.broadcast.finish}
            attempt={attempt}
            onReach={handleReach}
          />
        ) : null}

        {/* The situation itself. Before the shot it shows the chance and nothing else -
            drawing the flight in advance would give away the guess. */}
        <ShotScene type={shot.type} options={shot.options} gap={shot.gap} result={last} />

        {last && atEnd ? (
          <div className="tr-match__result">
            <p className="tr-match__verdict">
              {last.absent ? copy.match.absent : last.scored ? verdicts.won : verdicts.lost}
            </p>
            {/* The gap is only worth naming if somebody shot at it. Printing where the
                keeper was not, on a night no shot was taken, reads as a verdict on a
                moment the match has just spent ninety minutes saying never happened. */}
            <p className={last.absent ? "tr-match__untouched" : "tr-match__gap"}>
              {last.absent
                ? copy.match.absentNote
                : fillTemplate(verdicts.gap, { placement: placement(shot.options[shot.gap]) })}
            </p>
            {last.nailedIt ? <p className="tr-match__nailed">{copy.match.nailed}</p> : null}
            <p className="tr-match__decides">{outcome}</p>
            <button
              type="button"
              className="tr-btn tr-btn--primary tr-btn--block"
              onClick={onNext}
            >
              {copy.match.next}
            </button>
          </div>
        ) : last ? null : (
          <>
            {/* His record in these, printed before he takes another one. The season
                planner prices its deciders off exactly this number, so it is the same
                promise the delta meter and the exit cost already make: the game shows
                you the figure it is about to use. */}
            {record.taken > 0 ? (
              <p className="tr-match__record">
                {fillTemplate(copy.match.record, {
                  scored: record.scored,
                  taken: record.taken,
                  rate: Math.round(record.rate * 100),
                })}
              </p>
            ) : null}
            {/* The ball is at his feet: no placements, no guess, just the track and how
                steady his hand is. */}
            {owed > 1 ? (
              <p className="tr-match__tally">
                {fillTemplate(copy.match.ofChances, { n: attempt + 1, total: owed })}
              </p>
            ) : null}
            {shot.mode === MODES.SKILL ? (
              <ChanceTrack
                key={attempt}
                chance={shot.chance}
                locale={locale}
                onSettle={onPlay}
              />
            ) : !atChance ? (
              <p className="tr-match__waiting">{copy.match.waiting}</p>
            ) : (
              <>
                    <p className="tr-match__prompt">{copy.match.choose}</p>
                <div className="tr-match__options">
                  {shot.options.map((option, optionIndex) => {
                    const ruled = shot.ruledOut === optionIndex;
                    return (
                      <button
                        key={option}
                        type="button"
                        className={`tr-shot${ruled ? " is-ruled" : ""}`}
                        style={{ "--i": optionIndex }}
                        disabled={ruled}
                        onClick={() => onShoot(option)}
                      >
                        <PlacementDiagram type={shot.type} placement={option} />
                        <b>{placement(option)}</b>
                        {ruled ? <small>{copy.match.read}</small> : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <p className="tr-match__foot">{copy.match.lede}</p>
          </>
        )}
      </article>
    </section>
  );
}

/* ── The ceremony ─────────────────────────────────────────────────────────────
   The one moment the game had no picture of. A trophy arrived as a word in a list
   on the season page, so winning three of them in a year read exactly like winning
   one - and the cabinet is the only thing a footballer is actually remembered by.

   It plays over the report rather than inside it, because the report is a newspaper
   and a newspaper is printed the morning after. This is the night itself: the cups
   land one at a time, and then you read about them.                              */

/** How long each trophy holds the screen before the next one lands. */
const CEREMONY_STAGGER = 620;
const CEREMONY_TAIL = 1400;

/**
 * Attach what a trophy needs to find its photograph: which competition it was won in, and
 * which confederation to look under. `report.js` builds the honours but is deliberately
 * world-agnostic, so the lookup happens here, where the world is already in scope.
 *
 * A national-team trophy keys off the player's own confederation rather than his club's -
 * he wins the Copa América with Argentina whether he plays in Spain or not.
 */
function honoursOf(record, country) {
  const competition = world.competitions[record.competitionId] ?? null;
  const homeConfederation = country?.confederation ?? null;
  return seasonReport(record).honours.map((honour) => ({
    ...honour,
    competition,
    confederation: honour.kind === "national" ? homeConfederation : competition?.confederation,
  }));
}

function TrophyCeremony({ honours, locale, onDone }) {
  const copy = getCopy(locale);
  const reduced = usePrefersReducedMotion();

  // Dismisses itself once the last cup has landed, and on any input before that - the
  // player who has seen it forty times must never be made to wait for it.
  useEffect(() => {
    if (reduced) {
      onDone();
      return undefined;
    }
    const timer = setTimeout(
      onDone,
      honours.length * CEREMONY_STAGGER + CEREMONY_TAIL,
    );
    return () => clearTimeout(timer);
  }, [honours.length, onDone, reduced]);

  useEffect(() => {
    const skip = () => onDone();
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [onDone]);

  return (
    <div
      className="tr-ceremony"
      role="dialog"
      aria-label={copy.season.honours}
      onClick={onDone}
    >
      <div className="tr-ceremony__inner">
        <p className="tr-ceremony__eyebrow">{copy.season.ceremony}</p>
        <ul className="tr-ceremony__row">
          {honours.map((honour, index) => (
            <li
              key={`${honour.kind}-${honour.id}`}
              className={`tr-ceremony__item tr-ceremony__item--${honour.kind}`}
              style={{ "--i": index }}
            >
              <span className="tr-ceremony__cup">
                <Trophy
                  id={honour.id}
                  size={honours.length > 2 ? 88 : 116}
                  competition={honour.competition}
                  confederation={honour.confederation}
                />
              </span>
              <b>
                {honour.kind === "award"
                  ? AWARD_LABELS[locale][honour.id]
                  : TROPHY_LABELS[locale][honour.id]}
              </b>
            </li>
          ))}
        </ul>
        <p className="tr-ceremony__skip">{copy.season.ceremonySkip}</p>
      </div>
    </div>
  );
}

/** One honour, stamped onto the page the way a paper prints a result. */
function Honour({ honour, locale, index }) {
  const copy = getCopy(locale);
  const label =
    honour.kind === "award" ? AWARD_LABELS[locale][honour.id] : TROPHY_LABELS[locale][honour.id];
  return (
    <li
      className={`tr-honour tr-honour--${honour.kind}${honour.earned ? " is-earned" : ""}`}
      style={{ "--i": index }}
    >
      {/* The same shape that just landed in the ceremony, stamped into the newsprint.
          One cup, two sizes: the night, and the morning after. */}
      <TrophySilhouette id={honour.id} size={17} />
      <span>{label}</span>
      {honour.kind === "title" ? (
        <small>{honour.earned ? copy.season.earned : copy.season.attended}</small>
      ) : null}
    </li>
  );
}

/**
 * The front page.
 *
 * Laid out as a real portada: the headline and its story take the lead column, and the
 * numbers sit in a card beside it, because the record and the story are two readings of
 * the same season. Everything the engine worked out gets printed - the delta, the call-up,
 * the development cycle - since a report that hides its own workings is just a score.
 */
function SeasonFront({ result, previous, careerTotals, keeper, locale, index }) {
  const copy = getCopy(locale);
  const { record, headline, shadowNote } = result;
  const club = world.clubs[record.clubId];
  const competition = world.competitions[record.competitionId] ?? null;
  const report = seasonReport(record, previous);

  const stats = [
    { key: "matches", label: copy.season.matches, value: record.matches, change: report.changes.matches },
    { key: "goals", label: copy.season.goals, value: record.goals, change: report.changes.goals },
    { key: "assists", label: copy.season.assists, value: record.assists, change: report.changes.assists },
    {
      key: "perMatch",
      label: copy.season.perMatch,
      value: report.perMatch.toFixed(2),
    },
  ];

  return (
    <article className="tr-front" style={{ "--i": index }}>
      <header className="tr-front__masthead">
        <span className="tr-front__logo">{copy.title}</span>
        <span className="tr-front__dateline">
          {copy.season.eyebrow} · {copy.common.age} {record.age} ·{" "}
          {competition?.name ?? club?.name ?? ""}
        </span>
      </header>

      {/* The year he had inside the year the club had, as a stamp rather than a panel.
          It only appears at the two extremes, where it explains a tally that otherwise
          reads as a step up or a collapse when it was neither. See fortune.js. */}
      {report.form === "inspirado" || report.form === "gris" ? (
        <span className={`tr-front__form is-${report.form}`}>
          {copy.season.formBand[report.form]}
        </span>
      ) : null}

      <div className="tr-front__lead">
        <div className="tr-front__story">
          <h2 className="tr-display tr-display--xl tr-front__head">{headline.head}</h2>
          <p className="tr-front__body">{headline.body}</p>

          <dl className="tr-front__stats">
            {stats.map((stat, statIndex) => (
              <div key={stat.key}>
                <dt>{stat.label}</dt>
                <dd>
                  <StatValue value={stat.value} change={stat.change} delay={statIndex * 90} />
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <aside className="tr-front__card">
          <p className="tr-front__cardhead">{copy.season.ficha}</p>
          <div className="tr-front__club">
            <Crest club={club} size={38} />
            <div>
              <b>{club?.shortName ?? club?.name}</b>
              <small>{report.movedClub ? copy.season.newClub : competition?.name ?? ""}</small>
            </div>
          </div>

          <DeltaMeter
            ovr={record.ovr}
            squadLevel={record.ovr - record.delta}
            keeper={keeper}
            locale={locale}
            compact
          />

          {record.idolatry ? (
            <IdolatryBar
              value={record.idolatry.after}
              level={record.idolatry.level}
              locale={locale}
              compact
            />
          ) : null}

          <dl className="tr-front__vitals">
            <div>
              <dt>{copy.common.ovr}</dt>
              <dd>
                <StatValue value={record.ovr} change={report.changes.ovr} delay={220} />
              </dd>
            </div>
            <div>
              <dt>{copy.season.value}</dt>
              <dd>{formatValue(record.value, locale)}</dd>
            </div>
          </dl>
        </aside>
      </div>

      {record.suspended ? <p className="tr-front__flag">{copy.season.suspended}</p> : null}
      {record.promoted ? (
        <p className="tr-front__flag tr-front__flag--good">{copy.season.promoted}</p>
      ) : null}
      {record.relegated ? (
        <p className="tr-front__flag tr-front__flag--bad">{copy.season.relegated}</p>
      ) : null}
      {/* Going down used to change nothing: the club was still first division in August.
          Now it stays down until it plays its way back, and this is the season that says
          so - the badge on the fixture list is the only thing that did not move. */}
      {report.division?.demoted && !record.relegated ? (
        <p className="tr-front__flag tr-front__flag--bad">{copy.season.demoted}</p>
      ) : null}

      {report.honours.length ? (
        <section className="tr-front__section">
          <p className="tr-front__label">{copy.season.honours}</p>
          <ul className="tr-front__honours">
            {report.honours.map((honour, honourIndex) => (
              <Honour
                key={`${honour.kind}-${honour.id}`}
                honour={honour}
                locale={locale}
                index={honourIndex}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {record.bigMatches?.length ? (
        <section className="tr-front__section">
          <p className="tr-front__label">{copy.match.summary}</p>
          <ul className="tr-front__matches">
            {record.bigMatches.map((match, matchIndex) => {
              // The same three-way verdict the match screen printed, kept in step with it.
              const said = copy.match.verdicts[match.produces] ?? copy.match.verdicts.goal;
              return (
                <li
                  key={match.fixtureId}
                  className={`tr-front__match${
                    match.absent ? " is-absent" : match.scored ? " is-scored" : ""
                  }`}
                  style={{ "--i": matchIndex }}
                >
                  <b>
                    <Icon name={FIXTURE_ICONS[match.kind] ?? "ball"} size={14} />
                    {FIXTURE_LABELS[locale][match.kind]}
                  </b>
                  {/* Where he put it - and on a night he never got one, nothing to put. */}
                  <span>
                    {match.absent ? "" : PLACEMENT_LABELS[locale][match.choice] ?? match.choice}
                  </span>
                  <em>
                    {match.absent ? copy.match.absent : match.scored ? said.won : said.lost}
                  </em>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="tr-front__notes">
        {report.national ? (
          <section className="tr-front__note">
            <p className="tr-front__label">{copy.season.nationalTeam}</p>
            <p>{fillTemplate(copy.season.nationalCaps, { caps: report.national.caps })}</p>
            {report.national.playedWorldCup ? <small>{copy.season.playedWorldCup}</small> : null}
            {report.national.forced ? <small>{copy.season.forcedCallup}</small> : null}
          </section>
        ) : null}

        {/* Development leads with what actually landed on the rating, because that is the
            only part of it the reader came for. What was on offer and how much of it the
            season collected are the footnote, not the headline - which is the opposite of
            how this panel read when the growth factor was first wired in. */}
        {report.development ? (
          <section
            className={`tr-front__note${
              report.development.doubled || report.development.growth?.stalled ? " is-warned" : ""
            }`}
          >
            <p className="tr-front__label">{copy.season.development}</p>
            <p className="tr-front__note-big">{signedOvr(report.development.applied)} OVR</p>
            <small>
              {fillTemplate(copy.season.developmentShare, {
                range: report.development.seasonRange.map(signedOvr).join(" / "),
                percent: Math.round(report.development.rate * 100),
              })}
            </small>
            {report.development.growth ? (
              <small>{growthDriverLine(report.development.growth, copy)}</small>
            ) : null}
            {report.development.doubled ? <small>{copy.season.doubled}</small> : null}
          </section>
        ) : null}

        {shadowNote ? (
          <section className="tr-front__note tr-front__note--shadow">
            <p className="tr-front__label">{copy.season.shadow}</p>
            <p>{shadowNote}</p>
          </section>
        ) : null}
      </div>

      <footer className="tr-front__foot">
        <span className="tr-front__label">{copy.season.careerToDate}</span>
        <span>
          {careerTotals.seasons} {copy.retired.seasons.toLowerCase()} · {careerTotals.matches}{" "}
          {copy.season.matches.toLowerCase()} · {careerTotals.goals}{" "}
          {copy.season.goals.toLowerCase()} · {careerTotals.titles}{" "}
          {copy.season.titles.toLowerCase()}
        </span>
      </footer>
    </article>
  );
}

function SeasonScreen({ run, locale, onNext }) {
  const copy = getCopy(locale);
  // The step's own seasons are not in state.history yet, so the run-up to the first one
  // comes from what was already recorded.
  const before = run.state.history.slice(0, run.state.history.length - run.seasonResults.length);

  // Everything won across the step - an `exprés` step is three seasons, and they are all
  // celebrated at once, before any of the front pages are read.
  const country = world.countries[run.state.country] ?? null;
  const won = useMemo(
    () => run.seasonResults.flatMap((result) => honoursOf(result.record, country)),
    [run.seasonResults, country],
  );
  // Mounts fresh every time the phase opens, so the ceremony plays once per step and the
  // player is never shown last year's cups again.
  const [celebrated, setCelebrated] = useState(false);
  const finish = useCallback(() => setCelebrated(true), []);

  return (
    <section className="tr-stage">
      {won.length && !celebrated ? (
        <TrophyCeremony honours={won} locale={locale} onDone={finish} />
      ) : null}
      {run.seasonResults.map((result, index) => {
        const previous = index === 0 ? before[before.length - 1] ?? null : run.seasonResults[index - 1].record;
        return (
          <SeasonFront
            key={`${result.record.season}-${result.record.age}`}
            result={result}
            previous={previous}
            careerTotals={careerToDate(run.state.history, result.record.season)}
            keeper={run.state.position === "POR"}
            locale={locale}
            index={index}
          />
        );
      })}
      <button type="button" className="tr-btn tr-btn--primary tr-btn--block" onClick={onNext}>
        {copy.season.next}
      </button>
    </section>
  );
}

function MarketScreen({
  run,
  locale,
  onPick,
  onSwitchNationality,
  onAcceptClause,
  onRefuseClause,
}) {
  const copy = getCopy(locale);
  const outlook = run.outlook;
  const standing = currentStanding(run);
  const currentClubName = standing.club?.shortName ?? standing.club?.name ?? "";
  // Under a running deal the grid holds one card. The notice below says why.
  const locked =
    !run.state.forceTransfer &&
    standing.contract?.clubId === run.state.clubId &&
    standing.contract.yearsLeft > 0;

  return (
    <section className="tr-stage">
      <header className="tr-stage__head">
        <p className="tr-eyebrow">{copy.market.heading}</p>
        <p className="tr-lede">{copy.market.lede}</p>
      </header>

      {/* Three sentences of prose about development cycles used to sit between the player
          and the only decision on this screen, and a fourth panel repeated the idolatría
          that now lives permanently in the header. What is left is one strip in the same
          label/number language as the rail: what is coming, when, and how much of it he
          is currently collecting. */}
      {outlook ? (
        <aside className={`tr-outlook${outlook.atRisk ? " is-risk" : ""}`}>
          <span className="tr-outlook__cell">
            <small>{copy.market.outlookHeading}</small>
            <b>{fillTemplate(copy.market.outlookAge, { age: outlook.targetAge })}</b>
          </span>
          <span className="tr-outlook__cell">
            <small>{copy.market.outlookCycle}</small>
            <b>
              {outlook.range[0]} / {outlook.range[1]} OVR
            </b>
          </span>
          {outlook.growth ? (
            <span className="tr-outlook__cell is-rate">
              <small>{copy.market.outlookRate}</small>
              <b>
                {outlook.effective.map((bound) => bound.toFixed(1)).join(" / ")} OVR
              </b>
            </span>
          ) : null}
          {outlook.atRisk ? (
            <span className="tr-outlook__risk" title={copy.market.outlookRisk}>
              {copy.market.outlookRiskShort}
            </span>
          ) : null}
        </aside>
      ) : null}

      {run.state.clubWantsOut || run.state.forceTransfer ? (
        <p className="tr-notice">{copy.market.wantsOut}</p>
      ) : null}

      {/* A deal still running is the whole of the summer: the only door out is the
          buy-out, and that is somebody else's decision to make. Said plainly, because
          otherwise a market with one card on it looks like a bug. */}
      {locked ? (
        <p className="tr-notice tr-notice--locked">
          {fillTemplate(copy.market.locked, { years: standing.contract.yearsLeft })}
        </p>
      ) : null}

      {/* Somebody met the buy-out. Not another card in the grid: the grid is three clubs
          asking, and this is one that has already paid and is waiting for an answer. The
          only screen in the market with two buttons on it. */}
      {run.clauseOffer ? (
        <aside className="tr-clause">
          <div className="tr-clause__body">
            <p className="tr-eyebrow tr-eyebrow--alert">{copy.market.clauseHeading}</p>
            <div className="tr-clause__club">
              <Crest club={world.clubs[run.clauseOffer.clubId]} size={44} />
              <h3 className="tr-display tr-display--lg">
                {world.clubs[run.clauseOffer.clubId]?.shortName ??
                  world.clubs[run.clauseOffer.clubId]?.name}
              </h3>
            </div>
            <p className="tr-clause__text">
              {fillTemplate(copy.market.clauseBody, {
                club:
                  world.clubs[run.clauseOffer.clubId]?.shortName ??
                  world.clubs[run.clauseOffer.clubId]?.name ??
                  "",
                fee: formatValue(run.clauseOffer.fee, locale),
              })}
            </p>
            <p className="tr-clause__free">{copy.market.clauseFree}</p>
          </div>
          <div className="tr-clause__actions">
            <button type="button" className="tr-btn tr-btn--primary" onClick={onAcceptClause}>
              {fillTemplate(copy.market.clauseAccept, {
                club:
                  world.clubs[run.clauseOffer.clubId]?.shortName ??
                  world.clubs[run.clauseOffer.clubId]?.name ??
                  "",
              })}
            </button>
            <button type="button" className="tr-btn" onClick={onRefuseClause}>
              {copy.market.clauseRefuse}
            </button>
          </div>
        </aside>
      ) : null}

      {run.refusedClause ? (
        <p className="tr-notice tr-notice--good">
          {fillTemplate(copy.market.clauseRefused, { club: currentClubName })}
          {" +"}
          {Math.round(run.refusedClause.change)}
        </p>
      ) : null}

      {run.nationalityChoices?.length ? (
        <aside className="tr-nationality">
          <p className="tr-eyebrow">{copy.market.nationality}</p>
          <p className="tr-lede">{copy.market.nationalityLede}</p>
          <div className="tr-nationality__row">
            {run.nationalityChoices.map((fifa) => {
              const country = world.countries[fifa];
              return (
                <button
                  key={fifa}
                  type="button"
                  className="tr-chip tr-chip--flag"
                  onClick={() => onSwitchNationality(fifa)}
                >
                  <Flag country={country} size={18} />
                  {locale === "es" ? country?.name_es : country?.name_en}
                </button>
              );
            })}
            <button type="button" className="tr-chip" onClick={() => onSwitchNationality(null)}>
              {copy.market.keepNationality}
            </button>
          </div>
        </aside>
      ) : null}

      <OfferGrid
        offers={run.offers}
        ovr={run.state.ovr}
        keeper={run.state.position === "POR"}
        locale={locale}
        actionLabel={copy.market.sign}
        stayLabel={copy.market.stay}
        currentClubName={currentClubName}
        onPick={(offer) => onPick(offer.clubId)}
      />
    </section>
  );
}

/**
 * The career as a curve, against the shadow's.
 *
 * A list of seasons hides the only thing that matters at the end: whether you kept
 * climbing, and where you stopped. The club changes are marked because those are the
 * seasons that bent the line - a career is made of four or five of them.
 */
function CareerChart({ run, locale }) {
  const copy = getCopy(locale);
  const reduced = usePrefersReducedMotion();
  const box = { width: 640, height: 220, padX: 34, padY: 18 };

  const mine = useMemo(() => ovrSeries(run.state.history), [run.state.history]);
  const theirs = useMemo(() => ovrSeries(run.shadow?.seasons ?? []), [run.shadow]);
  const bounds = useMemo(() => seriesBounds([mine, theirs]), [mine, theirs]);
  if (!bounds || mine.length < 2) return null;

  const peak = peakSeason(run.state.history);
  const peakPoint = peak ? projectPoint({ age: peak.age, ovr: peak.ovr }, bounds, box) : null;

  return (
    <section className="tr-chart">
      <p className="tr-eyebrow">{copy.retired.curve}</p>
      <p className="tr-lede">{copy.retired.curveLede}</p>

      <svg
        className={`tr-chart__svg${reduced ? " is-static" : ""}`}
        viewBox={`0 0 ${box.width} ${box.height}`}
        role="img"
        aria-label={`${copy.retired.curve}: ${copy.retired.peakOvr} ${peak?.ovr ?? ""}`}
      >
        {gridLines(bounds, box).map((line) => (
          <g key={line.ovr}>
            <line
              className="tr-chart__grid"
              x1={box.padX}
              x2={box.width - box.padX}
              y1={line.y}
              y2={line.y}
            />
            <text className="tr-chart__gridlabel" x={4} y={line.y + 4}>
              {line.ovr}
            </text>
          </g>
        ))}

        {theirs.length > 1 ? (
          <path className="tr-chart__line tr-chart__line--shadow" d={seriesPath(theirs, bounds, box)} />
        ) : null}
        <path className="tr-chart__line tr-chart__line--mine" d={seriesPath(mine, bounds, box)} />

        {mine
          .filter((point) => point.changedClub)
          .map((point) => {
            const { x, y } = projectPoint(point, bounds, box);
            return <circle key={`${point.age}-${point.clubId}`} className="tr-chart__move" cx={x} cy={y} r="4" />;
          })}

        {peakPoint ? (
          <>
            <circle className="tr-chart__peak" cx={peakPoint.x} cy={peakPoint.y} r="5" />
            <text
              className="tr-chart__peaklabel"
              x={Math.min(peakPoint.x, box.width - box.padX - 60)}
              y={Math.max(peakPoint.y - 12, 14)}
            >
              {peak.ovr} · {fillTemplate(copy.retired.peak, { age: peak.age })}
            </text>
          </>
        ) : null}
      </svg>

      <div className="tr-chart__legend">
        <span className="tr-chart__key tr-chart__key--mine">{run.state.surname}</span>
        {theirs.length > 1 ? (
          <span className="tr-chart__key tr-chart__key--shadow">{run.shadow.surname}</span>
        ) : null}
        <span className="tr-chart__key tr-chart__key--move">{copy.retired.clubs}</span>
      </div>
    </section>
  );
}

function RetiredScreen({ run, locale, onRestart }) {
  const copy = getCopy(locale);
  const { summary, verdict, comparison } = run;
  const trophies = run.state.trophies;

  const counted = trophies.reduce((acc, trophy) => {
    acc[trophy.trophy] = (acc[trophy.trophy] ?? 0) + 1;
    return acc;
  }, {});

  const totals = [
    { label: copy.retired.seasons, value: summary.seasons },
    { label: copy.retired.matches, value: summary.matches },
    { label: copy.retired.goals, value: summary.goals },
    { label: copy.retired.assists, value: summary.assists },
    { label: copy.retired.peakOvr, value: summary.peakOvr },
    { label: copy.retired.peakValue, value: formatValue(summary.peakValue, locale) },
    { label: copy.retired.clubs, value: summary.clubs.length },
    { label: copy.retired.caps, value: summary.caps },
  ];

  return (
    <section className="tr-stage">
      <article className="tr-front tr-front--final">
        <header className="tr-front__masthead">
          <span>{copy.title}</span>
          <span>{copy.retired.eyebrow}</span>
        </header>
        <h2 className="tr-display tr-display--xl tr-front__head">{verdict.head}</h2>
        <p className="tr-front__body">{verdict.body}</p>
      </article>

      <dl className="tr-totals">
        {totals.map((total, index) => (
          <div key={total.label} style={{ "--i": index }}>
            <dt>{total.label}</dt>
            <dd>
              <StatValue value={total.value} delay={index * 70} />
            </dd>
          </div>
        ))}
      </dl>

      <CareerChart run={run} locale={locale} />

      <section className="tr-cabinet">
        <p className="tr-eyebrow">{copy.retired.cabinet}</p>
        {trophies.length ? (
          <>
            <ul>
              {Object.entries(counted).map(([trophy, count], index) => (
                <li key={trophy} style={{ "--i": index }}>
                  <TrophySilhouette id={trophy} size={30} />
                  <b>{count}</b>
                  <span>{TROPHY_LABELS[locale][trophy]}</span>
                </li>
              ))}
              {run.state.awards.length ? (
                <li className="is-award" style={{ "--i": Object.keys(counted).length }}>
                  <b>{run.state.awards.length}</b>
                  <span>{copy.season.awards}</span>
                </li>
              ) : null}
            </ul>
            <p className="tr-cabinet__note">
              {fillTemplate(copy.retired.earnedNote, {
                earned: summary.titlesEarned,
                attended: summary.titlesFromBench,
              })}
            </p>
          </>
        ) : (
          <p className="tr-cabinet__empty">{copy.retired.cabinetEmpty}</p>
        )}
      </section>

      <section className="tr-crowds">
        <p className="tr-eyebrow">{copy.retired.idolatry}</p>
        <p className="tr-lede">{copy.retired.idolatryLede}</p>
        {summary.idolatry?.clubs?.length ? (
          <ul>
            {summary.idolatry.clubs.map((club, index) => (
              <li key={club.clubId} style={{ "--i": index }}>
                <Crest club={world.clubs[club.clubId]} size={30} />
                <div className="tr-crowds__id">
                  <b>{club.name}</b>
                  {club.betrayed ? <small>{copy.retired.betrayed}</small> : null}
                </div>
                <div className="tr-crowds__bar">
                  <IdolatryBar value={club.value} level={club.level} locale={locale} compact />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tr-crowds__empty">{copy.retired.noIdolatry}</p>
        )}
      </section>

      {comparison ? (
        <section className="tr-compare">
          <p className="tr-eyebrow">{copy.retired.comparison}</p>
          <p className="tr-lede">
            {fillTemplate(copy.retired.comparisonLede, { surname: comparison.surname })}
          </p>
          <table>
            <thead>
              <tr>
                <th />
                <th>{copy.retired.you}</th>
                <th>{comparison.surname}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["goals", copy.retired.goals],
                ["titles", copy.season.titles],
                ["awards", copy.season.awards],
                ["peakOvr", copy.retired.peakOvr],
              ].map(([key, label]) => (
                <tr key={key} className={comparison.verdict[key] >= 0 ? "is-ahead" : "is-behind"}>
                  <th scope="row">{label}</th>
                  <td>{comparison.yours[key]}</td>
                  <td>{comparison.theirs[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <button type="button" className="tr-btn tr-btn--primary tr-btn--block" onClick={onRestart}>
        {copy.retired.again}
      </button>
    </section>
  );
}

/* ── Shell ────────────────────────────────────────────────────────────────── */

/**
 * The screens, by phase, exported so the suite can render them.
 *
 * Nothing else in this project mounts a component: there is no jsdom and no testing
 * library, so every one of these files is checked as pure logic and the JSX is checked by
 * being looked at. That gap has now shipped three bugs in a row that only exist at render
 * time - a `useEffect` reading a `const` declared below it, a reveal timer that skipped its
 * own build-up, a copy key that did not exist. `render.test.js` server-renders each of
 * these against a real run, which needs no DOM and catches all three shapes.
 */
export const SCREENS = {
  setup: SetupScreen,
  youth: YouthScreen,
  event: EventScreen,
  negotiation: NegotiationScreen,
  signing: SigningScreen,
  match: MatchScreen,
  season: SeasonScreen,
  market: MarketScreen,
  retired: RetiredScreen,
};

export default function TrayectoriaGame() {
  const locale = useMemo(() => (resolveBrowserLanguage() === "es" ? "es" : "en"), []);
  const copy = getCopy(locale);
  const [run, setRun] = useState(null);

  const handleStart = useCallback(
    (form) => setRun(startCareer(form, world)),
    [],
  );
  const handleSign = useCallback((clubId) => setRun((prev) => signYouthClub(prev, clubId)), []);
  const handleAsk = useCallback((askId) => setRun((prev) => askFor(prev, askId)), []);
  const handleAgree = useCallback(() => setRun((prev) => agreeTerms(prev)), []);
  const handleLeaveTable = useCallback(() => setRun((prev) => cancelNegotiation(prev)), []);
  const handleSigned = useCallback(() => setRun((prev) => completeSigning(prev)), []);
  const handleResolve = useCallback(
    (optionId) => setRun((prev) => resolveEvent(prev, optionId, locale)),
    [locale],
  );
  const handleShoot = useCallback((choice) => setRun((prev) => takeShot(prev, choice)), []);
  const handlePlay = useCallback((inputs) => setRun((prev) => playChance(prev, inputs)), []);
  const handleWatch = useCallback(
    () => setRun((prev) => watchMatch(prev, locale)),
    [locale],
  );
  const handleNextFixture = useCallback(
    () => setRun((prev) => nextFixture(prev, locale)),
    [locale],
  );
  const handleNext = useCallback(() => setRun((prev) => openMarket(prev, locale)), [locale]);
  const handleOffer = useCallback((clubId) => setRun((prev) => acceptOffer(prev, clubId)), []);
  const handleNationality = useCallback(
    (fifa) =>
      setRun((prev) =>
        fifa ? switchNationality(prev, fifa) : { ...prev, nationalityChoices: null },
      ),
    [],
  );
  const handleAcceptClause = useCallback(() => setRun((prev) => acceptClause(prev)), []);
  const handleRefuseClause = useCallback(() => setRun((prev) => refuseClause(prev)), []);
  const handleRestart = useCallback(() => setRun(null), []);

  // The bench harness reads a text payload rather than pixels, so describe the phase.
  const payload = useCallback(
    (current) => {
      if (!current) return { mode: "setup" };
      const standing = currentStanding(current);
      return {
        mode: current.phase,
        age: current.state.age,
        ovr: current.state.ovr,
        club: standing.club?.name ?? null,
        delta: standing.delta,
        step: current.step,
        options:
          current.phase === PHASES.EVENT
            ? (current.event?.[locale] ?? current.event?.es)?.options.map((o) => o.id) ?? []
            : current.phase === PHASES.MATCH
              ? current.matchday?.shot?.options ?? []
              : current.phase === PHASES.NEGOTIATION
                ? availableAsks(current).map((ask) => ask.id)
                : current.offers?.map((offer) => offer.clubId) ?? [],
        fixture: current.matchday?.fixtures?.[current.matchday.index]?.kind ?? null,
        contract: current.state.contract
          ? {
              years: current.state.contract.yearsLeft,
              wageRole: current.state.contract.wageRole,
              promise: current.state.contract.rolePromise,
            }
          : null,
      };
    },
    [locale],
  );
  useGameRuntimeBridge(run, payload, undefined);

  const standing = run ? currentStanding(run) : null;

  return (
    <div className="tr-shell">
      {run ? (
        <header className="tr-header">
          <div className="tr-header__player">
            <span className="tr-header__number">{run.state.number}</span>
            <div>
              <h1 className="tr-display">{run.state.surname}</h1>
              <p>
                {run.state.position} · {POSITION_LABELS[locale][run.state.position]} ·{" "}
                <Flag country={standing.country} size={14} />{" "}
                {locale === "es" ? standing.country?.name_es : standing.country?.name_en}
                {" · "}
                {copy.common.profile}: {PROFILE_LABELS[locale][run.state.profile]}
              </p>
            </div>
          </div>

          <StatRail run={run} standing={standing} locale={locale} />
        </header>
      ) : null}

      {run ? (
        <AgeSpine age={run.state.age} history={run.state.history} locale={locale} />
      ) : null}

      <main className="tr-main">
        {!run ? <SetupScreen locale={locale} onStart={handleStart} /> : null}
        {run?.phase === PHASES.YOUTH ? (
          <YouthScreen run={run} locale={locale} onSign={handleSign} />
        ) : null}
        {run?.phase === PHASES.EVENT ? (
          <EventScreen run={run} locale={locale} onResolve={handleResolve} />
        ) : null}
        {run?.phase === PHASES.NEGOTIATION ? (
          <NegotiationScreen
            run={run}
            locale={locale}
            onAsk={handleAsk}
            onAgree={handleAgree}
            onBack={handleLeaveTable}
          />
        ) : null}
        {run?.phase === PHASES.SIGNING ? (
          <SigningScreen run={run} locale={locale} onDone={handleSigned} />
        ) : null}
        {run?.phase === PHASES.MATCH ? (
          <MatchScreen
            run={run}
            locale={locale}
            onShoot={handleShoot}
            onPlay={handlePlay}
            onWatch={handleWatch}
            onNext={handleNextFixture}
          />
        ) : null}
        {run?.phase === PHASES.SEASON ? (
          <SeasonScreen run={run} locale={locale} onNext={handleNext} />
        ) : null}
        {run?.phase === PHASES.MARKET ? (
          <MarketScreen
            run={run}
            locale={locale}
            onPick={handleOffer}
            onSwitchNationality={handleNationality}
            onAcceptClause={handleAcceptClause}
            onRefuseClause={handleRefuseClause}
          />
        ) : null}
        {run?.phase === PHASES.RETIRED ? (
          <RetiredScreen run={run} locale={locale} onRestart={handleRestart} />
        ) : null}
      </main>
    </div>
  );
}
