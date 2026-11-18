/**
 * @license
 * FZL Software — Document Reader types & helpers
 */

/**
 * A readable block. Compatible with `FzlDocxBlock` (from `FzlDocxReaderController`):
 * extra fields such as `runs` or `rows` are ignored; only `type`, `text` and `level` are used.
 */
export interface FzlReaderBlock {
  type: 'heading' | 'paragraph' | 'list-item' | 'table' | string;
  text: string;
  /** Heading level (1–3). Defaults to 2. */
  level?: number;
}

export type FzlReaderWidth = 'narrow' | 'wide';

/** Separator between blocks in the canonical plain text. */
export const FZL_READER_BLOCK_SEPARATOR = '\n\n';

/**
 * Normalizes `\r\n`/`\r` to `\n`. Every offset produced by the reader refers to
 * text normalized this way.
 */
export function normalizeReaderText(text: string): string {
  return (text ?? '').replace(/\r\n?/g, '\n');
}

/**
 * Splits plain text into paragraph blocks. Blank lines (one or more) separate
 * paragraphs; single line breaks stay inside the paragraph.
 */
export function readerBlocksFromText(text: string): FzlReaderBlock[] {
  const normalized = normalizeReaderText(text).trim();
  if (!normalized) return [];
  return normalized
    .split(/\n[ \t]*\n\s*/)
    .map((chunk) => chunk.replace(/\s+$/, ''))
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => ({ type: 'paragraph', text: chunk }));
}

/** Normalizes the text of every block (keeps the remaining fields). */
export function normalizeReaderBlocks(blocks: readonly FzlReaderBlock[] | null | undefined): FzlReaderBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks
    .filter((block) => block && typeof block.text === 'string')
    .map((block) => ({ ...block, text: normalizeReaderText(block.text) }));
}

/**
 * Canonical plain text of a document: block texts (normalized) joined by `'\n\n'`.
 * List items have no bullet prefix (the bullet is only visual).
 *
 * All `start`/`end` offsets used by `<fzl-document-reader>` refer to this string.
 */
export function readerPlainText(blocks: readonly FzlReaderBlock[]): string {
  return normalizeReaderBlocks(blocks)
    .map((block) => block.text)
    .join(FZL_READER_BLOCK_SEPARATOR);
}

/** Start offset of each block in the canonical plain text. */
export function readerBlockOffsets(blocks: readonly FzlReaderBlock[]): number[] {
  const offsets: number[] = [];
  let cursor = 0;
  for (const block of blocks) {
    offsets.push(cursor);
    cursor += block.text.length + FZL_READER_BLOCK_SEPARATOR.length;
  }
  return offsets;
}
