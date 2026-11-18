/**
 * @license
 * FZL Software — Document Reader text anchoring
 *
 * Model inspired by W3C Web Annotation selectors:
 * TextPositionSelector (`start`/`end`) + TextQuoteSelector (`text`, `prefix`, `suffix`).
 */

/** Default number of context characters kept before/after a quote. */
export const FZL_READER_CONTEXT_LENGTH = 32;

export interface FzlTextQuote {
  /** Exact selected text. */
  text: string;
  /** Up to `contextLength` characters immediately before the quote. */
  prefix: string;
  /** Up to `contextLength` characters immediately after the quote. */
  suffix: string;
}

export interface FzlTextAnchor extends Partial<FzlTextQuote> {
  start?: number;
  end?: number;
}

export interface FzlTextRange {
  start: number;
  end: number;
}

/** Builds the quote (text + prefix/suffix context) for `fullText.slice(start, end)`. */
export function buildTextQuote(
  fullText: string,
  start: number,
  end: number,
  contextLength = FZL_READER_CONTEXT_LENGTH,
): FzlTextQuote {
  const s = Math.max(0, Math.min(start, fullText.length));
  const e = Math.max(s, Math.min(end, fullText.length));
  return {
    text: fullText.slice(s, e),
    prefix: fullText.slice(Math.max(0, s - contextLength), s),
    suffix: fullText.slice(e, e + contextLength),
  };
}

/** Length of the common suffix of `a` and `b`. */
function commonSuffixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

/** Length of the common prefix of `a` and `b`. */
function commonPrefixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Finds where a saved passage is in `fullText` now.
 *
 * 1. If `fullText.slice(start, end) === text` (or `text` is missing), the offsets are kept.
 * 2. Otherwise every occurrence of `text` is scored by how much of `prefix`/`suffix`
 *    matches around it (and, as a tie-breaker, by distance to the old `start`).
 *
 * Returns `null` when the text no longer exists in the document.
 */
export function anchorSelection(fullText: string, anchor: FzlTextAnchor): FzlTextRange | null {
  const text = anchor.text ?? '';
  const { start, end } = anchor;
  const hasPosition =
    typeof start === 'number' && typeof end === 'number' && start >= 0 && end > start && end <= fullText.length;

  if (hasPosition && (!text || fullText.slice(start, end) === text)) {
    return { start: start!, end: end! };
  }
  if (!text) return null;

  const prefix = anchor.prefix ?? '';
  const suffix = anchor.suffix ?? '';
  let best: FzlTextRange | null = null;
  let bestScore = -Infinity;
  let index = fullText.indexOf(text);
  while (index !== -1) {
    const before = fullText.slice(Math.max(0, index - prefix.length), index);
    const after = fullText.slice(index + text.length, index + text.length + suffix.length);
    let score = commonSuffixLength(before, prefix) + commonPrefixLength(after, suffix);
    if (typeof start === 'number') {
      // Tie-breaker: closer to the old position wins (always < 1).
      score += 1 / (2 + Math.abs(index - start));
    }
    if (score > bestScore) {
      bestScore = score;
      best = { start: index, end: index + text.length };
    }
    index = fullText.indexOf(text, index + 1);
  }
  return best;
}
