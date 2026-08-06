/**
 * Trayectoria - the screens.
 *
 * All the rules live in career.js; this file only decides what a phase looks like and
 * which action a button sends back. The one piece of real interface design here is the
 * delta meter: the model rests on your OVR minus the level of the squad around you, so
 * every club you are offered is drawn as a position on that track rather than as a name.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import resolveBrowserLanguage from "../../../utils/resolveBrowserLanguage";
import useGameRuntimeBridge from "../../../utils/useGameRuntimeBridge";
import {
  PHASES,
  acceptOffer,
  agreeTerms,
  askFor,
  availableAsks,
  cancelNegotiation,
  completeSigning,
  currentStanding,
  nextFixture,
  openMarket,
  resolveEvent,
  signYouthClub,
  startCareer,
  switchNationality,
  takeShot,
} from "./career.js";
import { CONTRACT, wagePremium } from "./contract.js";
import { roleFor, roleLadder } from "./engine.js";
import Icon, { FIXTURE_ICONS, SHOT_ICONS } from "./icons.jsx";
import ShotScene, { PlacementDiagram } from "./scene.jsx";
import {
  AWARD_LABELS,
  FIXTURE_LABELS,
  IDOLATRY_LABELS,
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
import { POSITIONS, RETIREMENT_AGE, START_AGE } from "./tables.js";
import { crestFallback, playableCountries, world } from "./world.js";
import "./styles.css";

const randomSeed = () => Math.random().toString(36).slice(2, 9).toUpperCase();

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

/** Crest images are fetched locally and are not committed, so the badge must stand alone. */
function Crest({ club, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const fallback = crestFallback(club);
  const style = { width: size, height: size };

  if (!club?.crest || failed) {
    return (
      <span
        className="tr-crest tr-crest--fallback"
        style={{ ...style, background: fallback.background, color: fallback.foreground }}
        aria-hidden="true"
      >
        {fallback.initials}
      </span>
    );
  }
  return (
    <img
      className="tr-crest"
      style={style}
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
function DeltaMeter({ ovr, squadLevel, keeper = false, locale, compact = false }) {
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
        </span>
        <span className={`tr-delta__role tr-delta__role--${role.role}`}>
          {ROLE_LABELS[locale][role.role]}
        </span>
      </div>
    </div>
  );
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

        <label className="tr-field">
          <span>{copy.setup.country}</span>
          <select value={form.country} onChange={(event) => set("country", event.target.value)}>
            {countries.map((country) => (
              <option key={country.fifa} value={country.fifa}>
                {locale === "es" ? country.name_es : country.name_en}
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

function OfferGrid({ offers, ovr, keeper, locale, onPick, actionLabel, stayLabel, currentClubName = "" }) {
  const copy = getCopy(locale);
  return (
    <div className="tr-offers">
      {offers.map((offer, index) => {
        const club = world.clubs[offer.clubId];
        const competition = world.competitions[offer.competitionId] ?? null;
        if (!club) return null;
        const squadLevel = ovr - offer.projectedDelta;
        const reputation = club.international_reputation ?? 0;
        return (
          <article
            key={`${offer.clubId}-${offer.stay ? "stay" : "in"}`}
            className="tr-offer"
            style={{ "--i": index }}
          >
            <header className="tr-offer__head">
              <Crest club={club} size={48} />
              <div className="tr-offer__id">
                <h3>{club.shortName ?? club.name}</h3>
                <p>
                  {competition?.name ?? "—"}
                  {competition?.tier === 2 ? " · 2ª" : ""}
                </p>
              </div>
              {offer.stay ? <span className="tr-tag">{stayLabel}</span> : null}
            </header>

            {/* Reputation is what sets the squad level, so it belongs next to the meter
                rather than buried: five rungs, filled to where this club sits. */}
            <div
              className="tr-offer__rep"
              role="img"
              aria-label={`${club.shortName ?? club.name}: ${reputation}/5`}
            >
              {[0, 1, 2, 3, 4].map((rung) => (
                <span key={rung} className={rung < reputation ? "is-on" : ""} />
              ))}
            </div>
            <DeltaMeter
              ovr={ovr}
              squadLevel={squadLevel}
              keeper={keeper}
              locale={locale}
              compact
            />

            {/* What signing this would cost you with the crowd you are leaving. The genre
                hides this and lets you find out afterwards; the whole point of this game
                is that the number is on the card before you commit. */}
            {offer.exit ? (
              <div className={`tr-exit${offer.exit.betrayal ? " is-betrayal" : ""}`}>
                <span className="tr-exit__head">
                  {fillTemplate(copy.market.exitCost, { club: currentClubName })}
                  <b>{offer.exit.change}</b>
                </span>
                {offer.exit.demotes ? (
                  <small>
                    {fillTemplate(copy.market.exitDemotes, {
                      from: IDOLATRY_LABELS[locale][offer.exit.from],
                      to: IDOLATRY_LABELS[locale][offer.exit.to],
                    })}
                  </small>
                ) : null}
                {offer.exit.betrayal ? <small>{copy.market.exitBetrayal}</small> : null}
              </div>
            ) : null}

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
                <b>{option.label}</b>
                <small>{option.detail}</small>
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

      <section className="tr-context__block">
        <p className="tr-front__label">
          <Icon name="trophy" size={13} /> {copy.context.cabinet}
        </p>
        <p className="tr-context__count">
          <b>{titles}</b> {copy.context.titles}
        </p>
      </section>
    </aside>
  );
}

/**
 * The one screen where the model steps aside.
 *
 * Everywhere else the game asks you to choose a club or a card and then tells you what the
 * football did. Here the football waits: three placements, the keeper drawn before you
 * chose and revealed after, and a line underneath saying exactly what that just decided.
 *
 * The read is shown as a struck-through option rather than a hint in prose, because what
 * a high OVR buys you is literally one fewer place to be wrong.
 */
function MatchScreen({ run, locale, onShoot, onNext }) {
  const copy = getCopy(locale);
  const matchday = run.matchday;
  if (!matchday?.shot) return null;

  const { fixtures, index, shot, last } = matchday;
  const fixture = fixtures[index];
  const club = world.clubs[run.state.clubId] ?? null;
  const opponent = fixture.opponentId ? world.clubs[fixture.opponentId] ?? null : null;
  const placement = (id) => PLACEMENT_LABELS[locale][id] ?? id;
  const outcome = last ? copy.match.decides[last.decides]?.[last.scored ? "yes" : "no"] ?? "" : "";

  return (
    <section className="tr-stage tr-stage--narrow">
      <article className={`tr-match${last ? (last.scored ? " is-scored" : " is-saved") : ""}`}>
        <header className="tr-match__head">
          <p className="tr-eyebrow tr-eyebrow--alert">
            <Icon name={FIXTURE_ICONS[fixture.kind] ?? "ball"} size={14} />
            {copy.match.eyebrow} ·{" "}
            {fillTemplate(copy.match.counter, { n: index + 1, total: fixtures.length })}
          </p>
          {/* What is at stake, as a mark: the trophy, the two arrows of the table, the
              two shields of a derby. It reads before the words do. */}
          <div className="tr-match__title">
            <span className={`tr-match__emblem tr-match__emblem--${fixture.decides}`}>
              <Icon name={FIXTURE_ICONS[fixture.kind] ?? "ball"} size={30} strokeWidth={1.4} />
            </span>
            <h2 className="tr-display tr-display--lg">{FIXTURE_LABELS[locale][fixture.kind]}</h2>
          </div>

          <div className="tr-match__teams">
            {fixture.national ? null : (
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
        </header>

        <p className="tr-match__type">
          <Icon name={SHOT_ICONS[shot.type] ?? "ball"} size={22} />
          {SHOT_LABELS[locale][shot.type]}
        </p>

        {/* The situation itself. Before the shot it shows the chance and nothing else -
            drawing the flight in advance would give away the guess. */}
        <ShotScene type={shot.type} options={shot.options} gap={shot.gap} result={last} />

        {last ? (
          <div className="tr-match__result">
            <p className="tr-match__verdict">
              {last.scored ? copy.match.scored : copy.match.saved}
            </p>
            <p className="tr-match__gap">
              {fillTemplate(copy.match.gapWas, { placement: placement(shot.options[shot.gap]) })}
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
            <p className="tr-match__foot">{copy.match.lede}</p>
          </>
        )}
      </article>
    </section>
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
            {record.bigMatches.map((match, matchIndex) => (
              <li
                key={match.fixtureId}
                className={`tr-front__match${match.scored ? " is-scored" : ""}`}
                style={{ "--i": matchIndex }}
              >
                <b>
                  <Icon name={FIXTURE_ICONS[match.kind] ?? "ball"} size={14} />
                  {FIXTURE_LABELS[locale][match.kind]}
                </b>
                <span>{PLACEMENT_LABELS[locale][match.choice] ?? match.choice}</span>
                <em>{match.scored ? copy.match.scored : copy.match.saved}</em>
              </li>
            ))}
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

        {report.development ? (
          <section className={`tr-front__note${report.development.doubled ? " is-warned" : ""}`}>
            <p className="tr-front__label">{copy.season.development}</p>
            <p>
              {copy.season.developmentRange} {report.development.range[0]} /{" "}
              {report.development.range[1]} OVR
            </p>
            <small>
              {fillTemplate(copy.season.developmentApplied, {
                applied: report.development.applied > 0
                  ? `+${report.development.applied.toFixed(1)}`
                  : report.development.applied.toFixed(1),
              })}
            </small>
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

  return (
    <section className="tr-stage">
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

function MarketScreen({ run, locale, onPick, onSwitchNationality }) {
  const copy = getCopy(locale);
  const outlook = run.outlook;
  const standing = currentStanding(run);
  const currentClubName = standing.club?.shortName ?? standing.club?.name ?? "";

  return (
    <section className="tr-stage">
      <header className="tr-stage__head">
        <p className="tr-eyebrow">{copy.market.heading}</p>
        <p className="tr-lede">{copy.market.lede}</p>
      </header>

      {outlook ? (
        <aside className={`tr-outlook${outlook.atRisk ? " is-risk" : ""}`}>
          <p className="tr-eyebrow">{copy.market.outlookHeading}</p>
          <p>
            {fillTemplate(copy.market.outlookBody, {
              age: outlook.targetAge,
              range: `${outlook.range[0]} / ${outlook.range[1]}`,
            })}
          </p>
          {outlook.atRisk ? <p className="tr-outlook__risk">{copy.market.outlookRisk}</p> : null}
        </aside>
      ) : null}

      {run.state.clubWantsOut || run.state.forceTransfer ? (
        <p className="tr-notice">{copy.market.wantsOut}</p>
      ) : null}

      {standing?.idolatry?.value > 0 ? (
        <aside className="tr-loyalty">
          <IdolatryBar
            value={standing.idolatry.value}
            level={standing.idolatry.level}
            locale={locale}
          />
          <p>{copy.market.loyaltyHint}</p>
        </aside>
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

          <div className="tr-header__club">
            {standing.club ? (
              <>
                <Crest club={standing.club} size={34} />
                <div>
                  <b>{standing.club.shortName ?? standing.club.name}</b>
                  <small>{standing.competition?.name ?? "—"}</small>
                </div>
              </>
            ) : null}
            <div className="tr-header__ovr">
              <span>{copy.common.ovr}</span>
              <b>{run.state.ovr}</b>
            </div>
          </div>
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
          />
        ) : null}
        {run?.phase === PHASES.RETIRED ? (
          <RetiredScreen run={run} locale={locale} onRestart={handleRestart} />
        ) : null}
      </main>
    </div>
  );
}
