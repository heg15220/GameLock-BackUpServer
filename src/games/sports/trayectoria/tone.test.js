/**
 * The press room, and the two people listening to it.
 *
 * A press card used to be three sentences with a number bolted to each: read the numbers,
 * take the biggest, move on. The words were flavour. What a footballer says in that room is
 * one of the few things about a career that is entirely his, and it should be a decision
 * rather than a sum - so an answer has a TONE, the question has an appetite, and the two
 * audiences in the room very often want opposite things.
 */

import { describe, expect, it } from "vitest";

import {
  TONE,
  TONES,
  TRUST,
  TRUST_LEVELS,
  applyTrust,
  settleTrust,
  toneEffect,
  toneFit,
  trustAt,
  trustLevelOf,
} from "./tone.js";
import { TONE_LABELS, TONE_WANTS, TRUST_LABELS } from "./copy.js";
import { EVENTS } from "./events.js";

describe("how an answer lands", () => {
  it("is worth most when it is exactly what the room wanted", () => {
    for (const tone of TONES) {
      expect(toneFit(tone, tone)).toBe(1);
      for (const other of TONES) {
        if (other === tone) continue;
        expect(toneFit(tone, other), `${tone} vs ${other}`).toBeLessThan(1);
      }
    }
  });

  /**
   * The four sit on one line, from the club's voice to your own. A step off what the room
   * wanted is a shrug; the other end of the line is the thing that gets replayed all week.
   */
  it("costs more the further it is from what the room wanted", () => {
    expect(toneFit("institucional", "profesional")).toBeGreaterThan(
      toneFit("institucional", "sincero"),
    );
    expect(toneFit("institucional", "sincero")).toBeGreaterThan(
      toneFit("institucional", "chulesco"),
    );
    expect(toneFit("institucional", "chulesco")).toBe(-1);
  });

  it("says nothing about a question neither audience had an appetite for", () => {
    for (const tone of TONES) {
      const heard = toneEffect(tone, {});
      expect(heard.idolatry).toBe(TONE.neutral.idolatry);
      expect(heard.trust).toBe(TONE.neutral.trust);
    }
  });

  /**
   * THE POINT OF THE WHOLE THING. The stand and the board are two audiences, and pleasing
   * one is very often the thing that costs you the other.
   */
  it("lets one answer delight the stand and cost him the board", () => {
    const room = { stand: "chulesco", board: "institucional" };
    const headline = toneEffect("chulesco", room);
    expect(headline.idolatry).toBeGreaterThan(0);
    expect(headline.trust).toBeLessThan(0);

    const companyLine = toneEffect("institucional", room);
    expect(companyLine.idolatry).toBeLessThan(0);
    expect(companyLine.trust).toBeGreaterThan(0);
  });

  it("rewards the one answer that suits a room that agrees with itself", () => {
    const room = { stand: "institucional", board: "institucional" };
    const both = toneEffect("institucional", room);
    expect(both.idolatry).toBeGreaterThan(0);
    expect(both.trust).toBeGreaterThan(0);
  });

  it("punishes a wrong answer harder than it pays a right one", () => {
    // Nobody remembers the answer that went down well.
    expect(Math.abs(TONE.miss.trust)).toBeGreaterThan(TONE.hit.trust);
    expect(Math.abs(TONE.miss.idolatry)).toBeGreaterThan(0);
  });
});

describe("what the board makes of him", () => {
  it("starts in the middle and never leaves its own bounds", () => {
    expect(trustAt({})).toBe(TRUST.start);
    expect(applyTrust(TRUST.start, 900)).toBe(TRUST.max);
    expect(applyTrust(TRUST.start, -900)).toBe(TRUST.min);
  });

  /** A club forgets faster than a crowd does, and slower than the player would like. */
  it("walks back towards the middle every season, from either side", () => {
    expect(settleTrust(TRUST.start)).toBe(TRUST.start);
    expect(settleTrust(10)).toBeGreaterThan(10);
    expect(settleTrust(10)).toBeLessThanOrEqual(TRUST.start);
    expect(settleTrust(95)).toBeLessThan(95);
    expect(settleTrust(95)).toBeGreaterThanOrEqual(TRUST.start);
    // And it lands exactly on the middle rather than stepping past it.
    expect(settleTrust(TRUST.start - 1)).toBe(TRUST.start);
  });

  it("has a name for every reading, in both languages", () => {
    for (let trust = 0; trust <= 100; trust += 1) {
      const level = trustLevelOf(trust);
      expect(level, `no band for ${trust}`).toBeTruthy();
      expect(TRUST_LABELS.es[level.key], `no Spanish name for ${level.key}`).toBeTruthy();
      expect(TRUST_LABELS.en[level.key], `no English name for ${level.key}`).toBeTruthy();
    }
    expect(TRUST_LEVELS.map((level) => level.key)).toContain("sentenciado");
  });

  /**
   * A season of headlines nobody at the club asked for has to be able to end a stay - it is
   * the reason every dressing room in football loses people, and until now the only way a
   * club gave up on a player was leaving him on the bench.
   */
  it("can be talked all the way down to the point the club has decided", () => {
    const room = { stand: "chulesco", board: "institucional" };
    let trust = TRUST.start;
    let answers = 0;
    while (trust >= TRUST.breaking && answers < 40) {
      trust = applyTrust(trust, toneEffect("chulesco", room).trust);
      answers += 1;
    }
    expect(trust, "a career of headlines never cost him anything").toBeLessThan(TRUST.breaking);
    // Not in one afternoon, either: it takes a habit.
    expect(answers).toBeGreaterThan(2);
  });
});

describe("every press card knows what kind of question it is", () => {
  const press = EVENTS.filter((event) => event.theme === "prensa");

  it("names a tone for every answer it offers, in a register both languages have", () => {
    expect(press.length).toBeGreaterThan(5);
    for (const event of press) {
      expect(event.tones, `${event.id} has no tones`).toBeTruthy();
      for (const option of event.es.options) {
        const tone = event.tones[option.id];
        expect(TONES, `${event.id}/${option.id}: ${tone}`).toContain(tone);
        expect(TONE_LABELS.es[tone]).toBeTruthy();
        expect(TONE_LABELS.en[tone]).toBeTruthy();
      }
      // The same answers in both languages, so a tone can never be orphaned.
      expect(event.en.options.map((option) => option.id)).toEqual(
        event.es.options.map((option) => option.id),
      );
    }
  });

  it("gives every answer a different register, so the card is a real choice", () => {
    for (const event of press) {
      const tones = new Set(Object.values(event.tones));
      expect(tones.size, `${event.id} offers the same register twice`).toBe(
        event.es.options.length,
      );
    }
  });

  it("says what each room is after, and can be said out loud", () => {
    for (const event of press) {
      expect(event.room, `${event.id} has no room`).toBeTruthy();
      for (const side of ["stand", "board"]) {
        const wanted = event.room[side];
        if (!wanted) continue;
        expect(TONES, `${event.id}: ${side} wants ${wanted}`).toContain(wanted);
        expect(TONE_WANTS.es[wanted]).toBeTruthy();
        expect(TONE_WANTS.en[wanted]).toBeTruthy();
      }
    }
  });

  /**
   * The claim the whole feature rests on: the right answer is not the same answer every
   * time. A room where the board always wanted the same thing would be one rule with ten
   * coats of paint.
   */
  it("does not want the same thing every week", () => {
    const stands = new Set(press.map((event) => event.room.stand));
    const boards = new Set(press.map((event) => event.room.board));
    expect(stands.size, "the stand always wants the same answer").toBeGreaterThan(1);
    expect(boards.size, "the board always wants the same answer").toBeGreaterThan(1);
    // And they disagree on most nights, which is where the decision lives.
    const split = press.filter((event) => event.room.stand !== event.room.board);
    expect(split.length).toBeGreaterThan(press.length / 2);
  });

  it("always leaves one answer that is right for somebody", () => {
    for (const event of press) {
      const offered = new Set(Object.values(event.tones));
      const reachable =
        (!event.room.stand || offered.has(event.room.stand)) &&
        (!event.room.board || offered.has(event.room.board));
      expect(reachable, `${event.id}: the room wants something nobody can say`).toBe(true);
    }
  });
});
