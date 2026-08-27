/**
 * src/features/learning/normalize.ts
 *
 * Text normalization for grading typed answers. Pure, synchronous, and with
 * no imports beyond the schema types — this runs on-device every time an
 * answer is submitted and must never need the network.
 *
 * The guiding rule: a learner who KNEW the answer should not be marked wrong
 * for something their keyboard did. Missing harakat, a trailing space,
 * capitalisation, a stray comma — none of those are knowledge failures, so all
 * of them are normalized away by default.
 *
 * ─── Why this file has no Arabic characters in it ────────────────────────────
 * Every special character is built with `ch()` from its codepoint, and every
 * character class is built from a string of escapes. Source that mixes RTL
 * literals into regex ranges reorders visually in editors and diffs, so a
 * range can LOOK like one thing and mean another — exactly the sort of bug
 * that would silently mis-grade one language and nothing else. ASCII-only
 * source reads the same everywhere.
 *
 * What is deliberately NOT normalized:
 *
 *  - Ta marbuta (U+0629) is not folded to ha (U+0647). It is a real
 *    orthographic distinction, and folding it would silently accept a genuine
 *    spelling error — leniency about keyboards must not become leniency about
 *    facts.
 *
 *  - Hausa b-hook/d-hook/k-hook and Wolof n-tilde/eng survive untouched. They
 *    are letters, not accented Latin ones, and merging them into b/d/k/n would
 *    accept a wrong word. When the plain-keyboard spelling ("bera" for the
 *    b-hook spelling of "rat") should also pass, the author adds it to
 *    `acceptedAnswers` — which keeps a pedagogical judgement in the content,
 *    where an editor can see it, instead of buried in this file.
 */

import type { MatchingPolicy } from "@/types/content";

/** One character from its codepoint. Keeps this file ASCII-only. */
const ch = (codePoint: number): string => String.fromCodePoint(codePoint);

/**
 * Combining marks removed when `stripDiacritics` is on.
 *
 *  - U+0300-U+036F  Latin combining marks, exposed by the NFD pass
 *  - U+064B-U+065F  Arabic harakat plus the combining hamzas. NFD turns
 *                   U+0623/U+0625/U+0624/U+0626 into a bare letter plus one of
 *                   these, so this range is what folds those onto alef, waw
 *                   and ya.
 *  - U+0670         superscript (dagger) alef
 *  - U+06D6-U+06ED  Quranic annotation marks, which turn up in Ajami text
 *                   copied from religious sources
 */
const COMBINING_MARKS = new RegExp(
  "[\\u0300-\\u036F\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]",
  "gu"
);

/**
 * Arabic-script letters carrying a built-in mark that does NOT decompose under
 * NFD, so the mark-stripping pass cannot reach them. Folded explicitly to the
 * bare form a learner is most likely to type.
 */
const ATOMIC_LETTER_FOLDS: readonly (readonly [string, string])[] = [
  [ch(0x0671), ch(0x0627)], // alef wasla   -> alef
  [ch(0x0649), ch(0x064a)], // alef maqsura -> ya
];

/** Punctuation, replaced by a space so that separated words stay separated. */
const PUNCTUATION = new RegExp("\\p{P}", "gu");

/**
 * Tatweel (U+0640) is a typographic stretch inserted INSIDE a word to justify
 * it. It has no phonetic value, so it is removed — but deleted outright rather
 * than spaced like other punctuation, since spacing it would split one word
 * into two and turn a correct answer into a wrong one.
 */
const TATWEEL = new RegExp("\\u0640", "gu");

/**
 * N-tilde (U+00F1) is the one letter in our languages that NFD would destroy:
 * it decomposes to "n" + U+0303, and the mark-stripping pass would then leave
 * a bare "n", turning Wolof "nyam" (written with n-tilde) into "nam". It is
 * swapped for a private-use sentinel before NFD runs and swapped back after.
 *
 * Substitution rather than a cleverer regex because by the time mark-stripping
 * sees the text, NFD has already split the letter from its tilde — there is no
 * longer an n-tilde left to match on. The sentinels are private-use codepoints
 * (U+E000/U+E001), which no real lesson content can contain.
 *
 * Eng (U+014B), b-hook (U+0253), d-hook (U+0257) and k-hook (U+0199) need no
 * protection: they are atomic codepoints that NFD leaves alone.
 */
const PROTECTED_LETTERS: readonly (readonly [string, string])[] = [
  [ch(0x00f1), ch(0xe000)], // n-tilde
  [ch(0x00d1), ch(0xe001)], // N-tilde
];

function swapAll(
  input: string,
  pairs: readonly (readonly [string, string])[],
  reverse = false
): string {
  return pairs.reduce((text, [from, to]) => {
    const [search, replacement] = reverse ? [to, from] : [from, to];
    return text.split(search).join(replacement);
  }, input);
}

/** Policy applied when a lesson document does not specify one. */
export const DEFAULT_MATCHING_POLICY: Required<MatchingPolicy> = {
  caseSensitive: false,
  stripDiacritics: true,
  stripPunctuation: true,
};

/**
 * Reduce an answer to the form used for comparison.
 *
 * Order matters. Case folding runs first, so the protected-letter swap only
 * has to handle the two cases it declares. Punctuation becomes a space rather
 * than nothing, so "well-known" and "well known" agree instead of collapsing
 * to "wellknown". Whitespace is collapsed last, so no earlier removal can
 * leave a double space behind.
 */
export function normalizeAnswer(
  input: string,
  policy: MatchingPolicy = {}
): string {
  const { caseSensitive, stripDiacritics, stripPunctuation } = {
    ...DEFAULT_MATCHING_POLICY,
    ...policy,
  };

  let text = input;

  if (!caseSensitive) {
    text = text.toLowerCase();
  }

  if (stripDiacritics) {
    text = swapAll(text, PROTECTED_LETTERS);
    text = text.normalize("NFD").replace(COMBINING_MARKS, "");
    text = swapAll(text, PROTECTED_LETTERS, true);
    text = swapAll(text, ATOMIC_LETTER_FOLDS);
  }

  if (stripPunctuation) {
    // Tatweel first, and deleted rather than spaced — see its declaration.
    text = text.replace(TATWEEL, "");
    text = text.replace(PUNCTUATION, " ");
  }

  // Collapse every run of whitespace — including the newlines and
  // non-breaking spaces that arrive from a paste — into one plain space.
  text = text.replace(/\s+/gu, " ").trim();

  return text.normalize("NFC");
}

/**
 * True when `input` matches any accepted spelling under `policy`.
 *
 * "Exact match after normalization" — no edit distance, no partial credit, no
 * model in the loop. Every accepted variant is one an author wrote down, which
 * is what makes a grade explainable and identical on every device.
 */
export function matchesAcceptedAnswer(
  input: string,
  acceptedAnswers: readonly string[],
  policy: MatchingPolicy = {}
): boolean {
  const normalized = normalizeAnswer(input, policy);
  if (normalized.length === 0) return false;

  return acceptedAnswers.some(
    (accepted) => normalizeAnswer(accepted, policy) === normalized
  );
}
