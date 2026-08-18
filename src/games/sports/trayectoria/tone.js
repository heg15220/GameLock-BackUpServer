/**
 * How you answer, and who is listening.
 *
 * A press conference in this game used to be three sentences with a number bolted to each:
 * pick the one that says +7 idolatría and move on. The words were flavour and the choice
 * was arithmetic, which is the wrong way round - what a footballer says in that room is one
 * of the few things about his career that is entirely his, and it should be read rather
 * than added up.
 *
 * So an answer has a TONE, and a room has an appetite. Both are named, both are visible
 * before you commit, and neither is always right:
 *
 *   INSTITUCIONAL  The club line, word for word. The board sleeps well; the stand hears a
 *                  press release and switches off.
 *   PROFESIONAL    Work, the group, the next match. Nobody is thrilled and nobody is angry,
 *                  which on most days is exactly what the job needs.
 *   SINCERO        What he actually thinks. The stand can tell, and so can the board, and
 *                  only one of them tends to enjoy it.
 *   CHULESCO       A headline. Says the thing everyone was waiting for somebody to say,
 *                  and hands the directors a morning they did not ask for.
 *
 * TWO AUDIENCES, and they are the point. `idolatry` is the stand and it already ran a whole
 * career; `trust` is the board, and it is new here because a club that keeps reading its
 * player picking fights in the paper eventually stops renewing him - see `clubWantsOut` in
 * career.js. An answer that delights one of them very often costs you the other, and which
 * is worth more depends on where you are: a favourite of the stand can afford to be a
 * nuisance, a newcomer cannot.
 *
 * WHAT THE ROOM WANTS CHANGES WITH THE QUESTION, which is the whole reason this is a table
 * and not a rule. Asked whether the referee robbed you, the stand wants blood and the board
 * wants a fine avoided. Asked about a team-mate who is having a terrible time, the stand
 * wants loyalty too. Every press card in events.js names its own `room`, so the same
 * cheeky answer is a hero's line one week and a disciplinary the next.
 *
 * Peninsular Spanish throughout: `chulesco` rather than the Río de la Plata `canchero`, and
 * the answers themselves are written the way somebody would actually speak in that room in
 * Madrid or Sevilla.
 */

export const TONES = ["institucional", "profesional", "sincero", "chulesco"];

export const TONE = {
  /**
   * What landing the tone the room wanted is worth, and what missing it costs.
   *
   * Deliberately asymmetric. Saying the right thing is worth less than saying the wrong
   * thing costs, because that is how a press room works: nobody remembers the answer that
   * went down well.
   */
  hit: { idolatry: 6, trust: 9 },
  miss: { idolatry: -5, trust: -11 },
  /** And the tones nobody asked for: neither a moment nor a mistake. */
  neutral: { idolatry: 0, trust: -1 },

  /**
   * How far apart two tones are, so a near miss is not the same as the opposite.
   *
   * They sit on one line from the club's voice to your own: institucional, profesional,
   * sincero, chulesco. Answering one step off what the room wanted is a shrug; answering
   * from the other end of the line is the thing that gets replayed all week.
   */
  step: 0.5,
};

const at = (tone) => TONES.indexOf(tone);

/**
 * How well an answer landed with one audience, from -1 (the opposite of what it wanted) to
 * 1 (exactly it). A room with no appetite of its own returns 0: it was not that kind of
 * question.
 */
export function toneFit(tone, wanted) {
  if (!wanted || !TONES.includes(tone) || !TONES.includes(wanted)) return 0;
  const apart = Math.abs(at(tone) - at(wanted));
  return Math.max(-1, 1 - apart * (1 / (TONES.length - 1)) * 2);
}

/**
 * What an answer did to the two audiences.
 *
 * `room` is what this particular question wanted - `{ stand, board }`, either of which may
 * be null when that audience did not care. The event's own `effects` are applied on top by
 * `resolve`, so a card can still say "this one costs you the armband" and mean it; this is
 * the part that comes from HOW it was said rather than from what was decided.
 */
export function toneEffect(tone, room = {}) {
  const scale = (fit, hit, miss) => (fit >= 0 ? fit * hit : -fit * miss);
  const stand = toneFit(tone, room.stand);
  const board = toneFit(tone, room.board);
  return {
    idolatry: Math.round(
      (room.stand ? scale(stand, TONE.hit.idolatry, TONE.miss.idolatry) : TONE.neutral.idolatry) *
        10,
    ) / 10,
    trust: Math.round(
      (room.board ? scale(board, TONE.hit.trust, TONE.miss.trust) : TONE.neutral.trust) * 10,
    ) / 10,
  };
}

/* ── The board's patience ─────────────────────────────────────────────────────
   One number, 0 to 100, and it is not a mood: it is whether the people who pay
   you still think you are worth the trouble. It drifts back towards the middle
   every season, because a club forgets a bad answer faster than a crowd does and
   slower than the player would like.                                          */

export const TRUST = {
  /*
   * A signing arrives with the benefit of the doubt - they paid for him - which is why this
   * sits inside `respaldado` rather than on the line. Everything after that he says himself.
   */
  start: 62,
  min: 0,
  max: 100,
  /** How far it walks back towards `start` over a season nobody said anything in. */
  drift: 5,
  /** Below this the club has decided, whatever the stand thinks. */
  breaking: 22,
  /** And above this it will forgive a season out of the side. */
  backing: 78,
};

const clamp = (value) => Math.max(TRUST.min, Math.min(TRUST.max, value));

export const trustAt = (state) => clamp(state?.trust ?? TRUST.start);

/** A season passes: the board's memory fades towards the middle. */
export function settleTrust(trust = TRUST.start) {
  const now = clamp(trust);
  if (now === TRUST.start) return now;
  const step = Math.min(TRUST.drift, Math.abs(now - TRUST.start));
  return clamp(now + (now < TRUST.start ? step : -step));
}

export const applyTrust = (trust, change = 0) => clamp(clamp(trust) + change);

/** What the panel calls it. Five bands, so the player can read it without a number. */
export const TRUST_LEVELS = [
  { min: 78, key: "intocable" },
  { min: 58, key: "respaldado" },
  { min: 38, key: "vigilado" },
  { min: 22, key: "cuestionado" },
  { min: 0, key: "sentenciado" },
];

export const trustLevelOf = (trust = TRUST.start) =>
  TRUST_LEVELS.find((level) => clamp(trust) >= level.min) ?? TRUST_LEVELS[TRUST_LEVELS.length - 1];
