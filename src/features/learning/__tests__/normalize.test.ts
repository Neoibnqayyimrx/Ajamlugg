/**
 * Normalization is where a grading bug would be least visible: it fails on one
 * language, for one class of learner, and looks like the learner being wrong.
 * So these tests name every character by codepoint rather than pasting a
 * glyph — a pasted RTL literal can reorder in an editor without changing, and
 * an assertion you cannot read is not an assertion.
 */

import {
  DEFAULT_MATCHING_POLICY,
  matchesAcceptedAnswer,
  normalizeAnswer,
} from "../normalize";

/** Build a string from codepoints. */
const cp = (...codes: number[]): string => String.fromCodePoint(...codes);

// Arabic
const ALEF = 0x0627;
const ALEF_HAMZA_ABOVE = 0x0623;
const ALEF_WASLA = 0x0671;
const ALEF_MAQSURA = 0x0649;
const YA = 0x064a;
const BA = 0x0628;
const FATHA = 0x064e;
const TATWEEL = 0x0640;
const TA_MARBUTA = 0x0629;
const HA = 0x0647;

// Latin letters used by Hausa / Wolof orthographies
const B_HOOK = 0x0253; // b-hook
const D_HOOK = 0x0257; // d-hook
const K_HOOK = 0x0199; // k-hook
const N_TILDE = 0x00f1;
const N_TILDE_UPPER = 0x00d1;
const ENG = 0x014b;

describe("normalizeAnswer", () => {
  it("lowercases by default", () => {
    expect(normalizeAnswer("BaBa")).toBe("baba");
  });

  it("trims and collapses runs of whitespace", () => {
    expect(normalizeAnswer("  salaam   aleekum \n ")).toBe("salaam aleekum");
  });

  it("strips Arabic harakat", () => {
    // "baba" fully vowelled -> the same word with the fathas removed
    const vowelled = cp(BA, FATHA, ALEF, BA, FATHA, ALEF);
    const bare = cp(BA, ALEF, BA, ALEF);
    expect(normalizeAnswer(vowelled)).toBe(bare);
  });

  it("folds alef-with-hamza onto plain alef via the NFD pass", () => {
    expect(normalizeAnswer(cp(ALEF_HAMZA_ABOVE))).toBe(cp(ALEF));
  });

  it("folds the atomic alef wasla and alef maqsura, which NFD cannot reach", () => {
    expect(normalizeAnswer(cp(ALEF_WASLA))).toBe(cp(ALEF));
    expect(normalizeAnswer(cp(ALEF_MAQSURA))).toBe(cp(YA));
  });

  it("drops tatweel, which is decoration rather than a letter", () => {
    expect(normalizeAnswer(cp(BA, TATWEEL, TATWEEL, ALEF))).toBe(cp(BA, ALEF));
  });

  it("does NOT fold ta marbuta onto ha — that is a real spelling distinction", () => {
    expect(normalizeAnswer(cp(TA_MARBUTA))).not.toBe(cp(HA));
  });

  // The regression that motivated the private-use sentinels: n-tilde
  // decomposes under NFD, so a naive mark-strip turns Wolof "nyam" into "nam"
  // and silently accepts a different word.
  it("preserves n-tilde through the NFD pass", () => {
    const nyam = cp(N_TILDE) + "am";
    expect(normalizeAnswer(nyam)).toBe(nyam);
    expect(normalizeAnswer(nyam)).not.toBe("nam");
  });

  it("preserves n-tilde when it arrives uppercase", () => {
    expect(normalizeAnswer(cp(N_TILDE_UPPER) + "AM")).toBe(cp(N_TILDE) + "am");
  });

  it("preserves the atomic Hausa and Wolof letters", () => {
    for (const code of [B_HOOK, D_HOOK, K_HOOK, ENG]) {
      expect(normalizeAnswer(cp(code))).toBe(cp(code));
    }
  });

  it("keeps hooked letters distinct from their plain counterparts", () => {
    // "bera" written with b-hook must not collapse into plain "bera".
    expect(normalizeAnswer(cp(B_HOOK) + "era")).not.toBe("bera");
  });

  it("replaces punctuation with a space rather than deleting it", () => {
    // Deleting would give "wellknown" and wrongly reject the spaced spelling.
    expect(normalizeAnswer("well-known")).toBe(normalizeAnswer("well known"));
  });

  it("respects caseSensitive", () => {
    expect(normalizeAnswer("Baba", { caseSensitive: true })).toBe("Baba");
  });

  it("respects stripDiacritics: false", () => {
    const vowelled = cp(BA, FATHA, ALEF);
    expect(normalizeAnswer(vowelled, { stripDiacritics: false })).toBe(vowelled);
  });

  it("respects stripPunctuation: false", () => {
    expect(normalizeAnswer("well-known", { stripPunctuation: false })).toBe(
      "well-known"
    );
  });

  it("defaults to the lenient policy", () => {
    expect(DEFAULT_MATCHING_POLICY).toEqual({
      caseSensitive: false,
      stripDiacritics: true,
      stripPunctuation: true,
    });
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeAnswer("   \n\t ")).toBe("");
  });
});

describe("matchesAcceptedAnswer", () => {
  it("matches an exact answer", () => {
    expect(matchesAcceptedAnswer("baba", ["baba"])).toBe(true);
  });

  it("matches ignoring case, spacing and harakat", () => {
    const vowelled = cp(BA, FATHA, ALEF, BA, FATHA, ALEF);
    const bare = cp(BA, ALEF, BA, ALEF);
    expect(matchesAcceptedAnswer(`  ${vowelled} `, [bare])).toBe(true);
  });

  it("matches any entry in the accepted list, not just the first", () => {
    // How an author admits the plain-keyboard spelling of a hooked letter.
    const accepted = [cp(B_HOOK) + "era", "bera"];
    expect(matchesAcceptedAnswer("bera", accepted)).toBe(true);
    expect(matchesAcceptedAnswer(cp(B_HOOK) + "era", accepted)).toBe(true);
  });

  it("rejects a wrong answer", () => {
    expect(matchesAcceptedAnswer("mama", ["baba"])).toBe(false);
  });

  it("rejects empty and whitespace-only input even if an accepted answer is blank", () => {
    expect(matchesAcceptedAnswer("", ["baba"])).toBe(false);
    expect(matchesAcceptedAnswer("   ", ["baba"])).toBe(false);
    // Guards against a malformed document turning "type nothing" into a pass.
    expect(matchesAcceptedAnswer("", [""])).toBe(false);
  });

  it("honours a stricter policy when the author sets one", () => {
    expect(
      matchesAcceptedAnswer("baba", ["Baba"], { caseSensitive: true })
    ).toBe(false);
  });
});
