/**
 * The shadow.
 *
 * A forward born the same year as you, run through the same engine with the same tables,
 * making his club decisions by a simple, competent policy. He is not scripted to beat
 * you and he is not scripted to lose: he is what the model does when someone plays it
 * sensibly, which is exactly what makes him a fair benchmark.
 *
 * His whole career is simulated up front from the seed, then revealed a season at a time
 * alongside yours.
 */

import {
  buildOffers,
  careerSummary,
  createCareer,
  simulateSeason,
  squadLevelFor,
  youthOffers,
} from "./engine.js";
import { createStream, pickWeighted } from "./rng.js";
import { RETIREMENT_AGE, START_AGE } from "./tables.js";

const SURNAMES = {
  CONMEBOL: ["Ferrari", "Quiroga", "Almada", "Villalba", "Cardoso", "Ibarra", "Meneses", "Rojas"],
  UEFA: ["Vasilev", "Moretti", "Lindqvist", "Cabral", "Novak", "Duval", "Keller", "Ricci"],
  CONCACAF: ["Aguilar", "Beltran", "Campos", "Escobar", "Padilla", "Zamora"],
  CAF: ["Diarra", "Mensah", "Nkemi", "Toure", "Ouedraogo", "Abadi"],
  AFC: ["Nakano", "Park", "Farhan", "Osman", "Tanaka", "Rahim"],
  OFC: ["Tuivai", "Ngata", "Kerr", "Palu"],
};

/** Pick a country the shadow could plausibly come from: one with a modelled league. */
function pickHomeCountry(seed, world) {
  const withLeague = new Set(
    Object.values(world.competitions).map((competition) => competition.country_fifa_code),
  );
  const candidates = Object.values(world.countries).filter((country) => withLeague.has(country.fifa));
  const next = createStream(seed, "rival", "country");
  // Weighted towards real football nations so the shadow has somewhere to go.
  return pickWeighted(next, candidates, (country) => 1 + (country.international_reputation ?? 0) * 2);
}

/**
 * How the shadow picks a club: the strongest side where he would still be close enough
 * to the squad level to keep playing. That is the advice any decent agent would give,
 * and it is the strategy the player is implicitly being measured against.
 */
function chooseOffer(offers, state, world) {
  const scored = offers
    .map((offer) => {
      const club = world.clubs[offer.clubId];
      if (!club) return null;
      const delta = state.ovr - squadLevelFor(club, state.ovr);
      // Below -5 he stops developing; above +8 he is wasting himself on a small club.
      const penalty = delta < -4 ? (delta + 4) * 3 : 0;
      const waste = delta > 10 ? (delta - 10) * 1.5 : 0;
      return { offer, score: (club.international_reputation ?? 0) * 4 + penalty - waste };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.offer ?? offers[0] ?? null;
}

export function simulateShadowCareer(seed, world) {
  const rivalSeed = `${seed}:shadow`;
  const country = pickHomeCountry(seed, world);
  const pool = SURNAMES[country?.confederation] ?? SURNAMES.UEFA;
  const nameStream = createStream(rivalSeed, "name");
  const surname = pool[Math.floor(nameStream() * pool.length)].toUpperCase();

  let state = createCareer({
    seed: rivalSeed,
    surname,
    number: 10,
    foot: "right",
    country: country?.fifa ?? "ESP",
    position: "DC",
    mode: "intensa",
  });

  const first = youthOffers(rivalSeed, state, world, 3);
  const opening = chooseOffer(first, state, world);
  if (!opening) return null;
  state = { ...state, clubId: opening.clubId };

  const seasons = [];
  let season = 0;
  while (!state.retired && state.age < RETIREMENT_AGE) {
    const result = simulateSeason(state, world, { season });
    seasons.push(result.record);
    state = result.state;
    season += 1;

    if (state.retired) break;
    // Re-decide every other year, or immediately if the club has had enough.
    if (state.clubWantsOut || season % 2 === 0) {
      const offers = buildOffers(rivalSeed, season, state, world, 4);
      const choice = chooseOffer(offers, state, world);
      if (choice && choice.clubId !== state.clubId) {
        state = { ...state, clubId: choice.clubId, seasonsAtClub: 0, clubWantsOut: false };
      } else {
        state = { ...state, clubWantsOut: false };
      }
    }
  }

  return {
    surname,
    country: country?.fifa ?? null,
    seasons,
    summary: careerSummary(state),
    state,
  };
}

/** What the shadow did in a given career year, for the press and the final comparison. */
export function shadowSeasonAt(shadow, age) {
  if (!shadow) return null;
  return shadow.seasons.find((season) => season.age === age) ?? null;
}

/**
 * Where the two of you stand, right now.
 *
 * The retirement screen has always ended on a comparison against the shadow, and until
 * now the player met him twice: in a footnote on the season page, and then in the verdict
 * on the last screen of his career. Being measured against somebody you were never told
 * about is not a rivalry, it is a scoreboard produced at the end.
 *
 * This is the running version: what he has to today, against what you have, in the three
 * currencies the ending is actually judged in. Everything is `null` before he has played
 * a season, so the panel simply is not there in the first summer.
 */
export function shadowStanding(shadow, state, throughAge) {
  if (!shadow) return null;
  const seasons = shadow.seasons.filter((season) => season.age <= throughAge);
  if (!seasons.length) return null;

  const theirs = seasons.reduce(
    (totals, season) => ({
      goals: totals.goals + season.goals,
      titles: totals.titles + season.titles.length + (season.national?.titles?.length ?? 0),
      awards: totals.awards + season.awards.length,
      ovr: Math.max(totals.ovr, season.ovr),
    }),
    { goals: 0, titles: 0, awards: 0, ovr: 0 },
  );

  const mine = state.history.reduce(
    (totals, season) => ({
      goals: totals.goals + season.goals,
      titles: totals.titles + season.titles.length + (season.national?.titles?.length ?? 0),
      awards: totals.awards + season.awards.length,
      ovr: Math.max(totals.ovr, season.ovr),
    }),
    { goals: 0, titles: 0, awards: 0, ovr: state.ovr },
  );

  const last = seasons[seasons.length - 1];
  return {
    surname: shadow.surname,
    clubId: last.clubId,
    theirs,
    mine,
    // Positive means you are ahead. The panel colours off this and nothing else.
    lead: {
      goals: mine.goals - theirs.goals,
      titles: mine.titles - theirs.titles,
      ovr: mine.ovr - theirs.ovr,
    },
    // One word for the whole thing, which is what a player actually wants at a glance.
    ahead: mine.titles + mine.awards * 2 >= theirs.titles + theirs.awards * 2,
  };
}

export function shadowComparison(shadow, playerSummary) {
  if (!shadow) return null;
  const theirs = shadow.summary;
  return {
    surname: shadow.surname,
    theirs,
    yours: playerSummary,
    verdict: {
      goals: playerSummary.goals - theirs.goals,
      titles: playerSummary.titles - theirs.titles,
      awards: playerSummary.awards - theirs.awards,
      peakOvr: playerSummary.peakOvr - theirs.peakOvr,
    },
  };
}

export const SHADOW_START_AGE = START_AGE;
