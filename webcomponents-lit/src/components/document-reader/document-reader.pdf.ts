/**
 * @license
 * FZL Software — PDF text extraction for <fzl-document-reader>
 *
 * Turns the text layer of a PDF into reader blocks (paragraphs/headings with `page`).
 * pdf.js is NOT a dependency of this module: pass the loaded `pdfjs-dist` module
 * (or a loader) in `options.pdfjs`. The layout logic (`pdfPagesToBlocks`) is pure.
 */
import { FzlReaderBlock, readerPlainText } from './document-reader.types';

/** One positioned text run, as in pdf.js `TextContent.items` (only the fields used). */
export interface FzlPdfTextItem {
  str: string;
  /** [a, b, c, d, e, f] — e = x, f = y (PDF space, y grows upwards). */
  transform: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

export interface FzlPdfPageText {
  /** 1-based page number. */
  page: number;
  items: FzlPdfTextItem[];
  /** Page height (PDF units), used to tell header/footer zones apart. */
  height?: number;
}

export interface FzlPdfLayoutOptions {
  /** Removes lines repeated at the top/bottom of most pages and lone page numbers. Default `true`. */
  removeHeadersFooters?: boolean;
  /** Joins "pala-\nvra" into "palavra" when the next line starts lowercase. Default `true`. */
  dehyphenate?: boolean;
  /** Continues a paragraph on the next page when it did not end a sentence. Default `true`. */
  mergeAcrossPages?: boolean;
  /** Detects headings by font size. Default `true`. */
  detectHeadings?: boolean;
}

export interface FzlPdfExtractOptions extends FzlPdfLayoutOptions {
  /**
   * The pdf.js module (`await import('pdfjs-dist')`) or a function returning it.
   * Configure its worker before (e.g. `GlobalWorkerOptions.workerSrc`).
   */
  pdfjs: FzlPdfjsLike | (() => Promise<FzlPdfjsLike> | FzlPdfjsLike);
  password?: string;
  /** Stops after this many pages (0 = all). */
  maxPages?: number;
  signal?: AbortSignal;
  onProgress?: (page: number, pageCount: number) => void;
}

export interface FzlPdfExtractResult {
  blocks: FzlReaderBlock[];
  /** Canonical plain text (`readerPlainText(blocks)`). */
  text: string;
  pageCount: number;
  /** Pages actually read (≤ pageCount when `maxPages` is used). */
  pagesRead: number;
  /** `true` when the PDF has (almost) no text layer — scanned document; needs OCR. */
  needsOcr: boolean;
  /** Document title from the PDF metadata, if any. */
  title?: string;
}

/** Minimal shape of the pdf.js module used here. */
export interface FzlPdfjsLike {
  getDocument(src: { data: Uint8Array; password?: string; [key: string]: unknown }): {
    promise: Promise<FzlPdfDocumentLike>;
    destroy?: () => Promise<void> | void;
  };
}

interface FzlPdfDocumentLike {
  numPages: number;
  getPage(n: number): Promise<{
    getTextContent(params?: Record<string, unknown>): Promise<{ items: unknown[] }>;
    getViewport?(params: { scale: number }): { height: number };
    cleanup?: () => void;
  }>;
  getMetadata?: () => Promise<{ info?: Record<string, unknown> } | null>;
  destroy?: () => Promise<void> | void;
}

// ------------------------------------------------------------------ layout

interface Line {
  text: string;
  x: number;
  y: number;
  size: number;
  page: number;
  pageHeight?: number;
}

const SENTENCE_END = /[.!?…:;"”»)\]]$/;
const PAGE_NUMBER = /^(?:p(?:á|a)g(?:ina)?\.?\s*)?[-–—]?\s*\d{1,4}\s*(?:(?:\/|de|of)\s*\d{1,4})?\s*[-–—]?$/i;

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function itemSize(item: FzlPdfTextItem): number {
  const t = item.transform ?? [];
  const size = Math.hypot(t[2] ?? 0, t[3] ?? 0) || Math.abs(t[3] ?? 0) || item.height || 0;
  return size > 0 ? size : 10;
}

/** Groups the text runs of one page into visual lines. */
function pageLines(page: FzlPdfPageText): Line[] {
  const lines: Line[] = [];
  let current: { parts: string[]; x: number; y: number; size: number; endX: number } | null = null;

  const flush = () => {
    if (!current) return;
    const text = current.parts.join('').replace(/\s+/g, ' ').trim();
    if (text) lines.push({ text, x: current.x, y: current.y, size: current.size, page: page.page, pageHeight: page.height });
    current = null;
  };

  for (const item of page.items ?? []) {
    if (!item || typeof item.str !== 'string') continue;
    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const size = itemSize(item);
    if (current && Math.abs(y - current.y) > Math.max(current.size, size) * 0.5) flush();
    if (!current) {
      if (item.str.trim() === '' && !item.hasEOL) continue;
      current = { parts: [], x, y, size, endX: x };
    } else {
      const gap = x - current.endX;
      const prev = current.parts[current.parts.length - 1] ?? '';
      if (gap > size * 0.15 && !/\s$/.test(prev) && !/^\s/.test(item.str)) current.parts.push(' ');
      current.size = Math.max(current.size, size);
    }
    current.parts.push(item.str);
    current.endX = x + (item.width ?? item.str.length * size * 0.5);
    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

function normalizeForRepeat(text: string): string {
  return text.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

/** Removes running headers/footers and lone page numbers. */
function stripHeadersFooters(pages: Line[][]): Line[][] {
  const edge = 2;
  const counts = new Map<string, number>();
  for (const lines of pages) {
    const seen = new Set<string>();
    const edges = [...lines.slice(0, edge), ...lines.slice(-edge)];
    for (const line of edges) {
      const key = normalizeForRepeat(line.text);
      if (!seen.has(key)) {
        seen.add(key);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  const minRepeats = Math.max(2, Math.ceil(pages.length * 0.5));
  return pages.map((lines) =>
    lines.filter((line, i) => {
      const atEdge = i < edge || i >= lines.length - edge;
      if (!atEdge) return true;
      if (PAGE_NUMBER.test(line.text)) return false;
      return !(pages.length >= 3 && (counts.get(normalizeForRepeat(line.text)) ?? 0) >= minRepeats);
    }),
  );
}

function joinLines(a: string, b: string, dehyphenate: boolean): string {
  if (dehyphenate && /\p{L}-$/u.test(a) && /^\p{Ll}/u.test(b)) return a.slice(0, -1) + b;
  return `${a} ${b}`;
}

/**
 * Converts the text layer of PDF pages into reader blocks.
 * Pure function: accepts pdf.js `getTextContent()` items (or equivalent).
 */
export function pdfPagesToBlocks(pages: FzlPdfPageText[], options: FzlPdfLayoutOptions = {}): FzlReaderBlock[] {
  const { removeHeadersFooters = true, dehyphenate = true, mergeAcrossPages = true, detectHeadings = true } = options;

  let linesByPage = pages.map(pageLines);
  if (removeHeadersFooters) linesByPage = stripHeadersFooters(linesByPage);

  const all = linesByPage.flat();
  const bodySize = median(all.map((l) => l.size)) || 10;
  const blocks: FzlReaderBlock[] = [];
  let para: { text: string; page: number; size: number; lastY: number; lastLen: number } | null = null;
  let typicalLen = median(all.map((l) => l.text.length)) || 60;
  typicalLen = Math.max(typicalLen, 30);

  const flush = () => {
    if (para?.text.trim()) blocks.push({ type: 'paragraph', text: para.text.trim(), page: para.page });
    para = null;
  };

  for (const lines of linesByPage) {
    const gaps: number[] = [];
    for (let i = 1; i < lines.length; i++) {
      const d = lines[i - 1].y - lines[i].y;
      if (d > 0) gaps.push(d);
    }
    const lineGap = median(gaps) || bodySize * 1.2;

    lines.forEach((line, i) => {
      const ratio = line.size / bodySize;
      if (detectHeadings && ratio >= 1.25 && line.text.length <= 120) {
        const level = ratio >= 1.6 ? 1 : 2;
        const prev = blocks[blocks.length - 1];
        const lastWasSameHeading =
          !para && prev?.type === 'heading' && prev.level === level && prev.page === line.page && i > 0 &&
          lines[i - 1].y - line.y <= line.size * 1.6;
        flush();
        if (lastWasSameHeading) prev.text = `${prev.text} ${line.text}`;
        else blocks.push({ type: 'heading', level, text: line.text, page: line.page });
        return;
      }

      if (para) {
        const samePage = para.page === line.page && i > 0;
        const p: { text: string; page: number; size: number; lastY: number; lastLen: number } = para;
        let breakPara: boolean;
        if (samePage) {
          const gap = p.lastY - line.y;
          const bigGap = gap > lineGap * 1.45 || gap < 0;
          const shortEnd = SENTENCE_END.test(p.text) && p.lastLen < typicalLen * 0.7;
          const sizeChange = Math.abs(line.size - p.size) > bodySize * 0.2;
          breakPara = bigGap || shortEnd || sizeChange;
        } else {
          // First line of a new page.
          breakPara = !mergeAcrossPages || SENTENCE_END.test(p.text) || !/^\p{Ll}/u.test(line.text);
        }
        if (breakPara) {
          flush();
        } else {
          p.text = joinLines(p.text, line.text, dehyphenate);
          p.lastY = line.y;
          p.lastLen = line.text.length;
          return;
        }
      }
      para = { text: line.text, page: line.page, size: line.size, lastY: line.y, lastLen: line.text.length };
    });
  }
  flush();
  return blocks;
}

// ------------------------------------------------------------------ extraction

async function toUint8Array(source: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (typeof (source as Blob).arrayBuffer === 'function') return new Uint8Array(await (source as Blob).arrayBuffer());
  return new Uint8Array(
    await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(source as Blob);
    }),
  );
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError');
  }
}

/**
 * Extracts reader blocks from a PDF (File/Blob/ArrayBuffer/Uint8Array) with pdf.js.
 *
 * ```ts
 * import * as pdfjs from 'pdfjs-dist';
 * import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; // Vite
 * pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
 * const { blocks, needsOcr } = await extractPdfBlocks(file, { pdfjs });
 * reader.blocks = blocks;
 * ```
 */
export async function extractPdfBlocks(
  source: Blob | ArrayBuffer | Uint8Array,
  options: FzlPdfExtractOptions,
): Promise<FzlPdfExtractResult> {
  if (!options?.pdfjs) {
    throw new Error('extractPdfBlocks: informe options.pdfjs (o módulo pdfjs-dist ou uma função que o carregue).');
  }
  const pdfjs = typeof options.pdfjs === 'function' ? await options.pdfjs() : options.pdfjs;
  throwIfAborted(options.signal);
  const data = await toUint8Array(source);
  const task = pdfjs.getDocument({
    data,
    password: options.password,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const onAbort = () => void task.destroy?.();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  let doc: FzlPdfDocumentLike | null = null;
  try {
    doc = await task.promise;
    const pageCount = doc.numPages;
    const limit = options.maxPages && options.maxPages > 0 ? Math.min(options.maxPages, pageCount) : pageCount;
    const pages: FzlPdfPageText[] = [];
    let chars = 0;
    for (let n = 1; n <= limit; n++) {
      throwIfAborted(options.signal);
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const items = (content.items as FzlPdfTextItem[]).filter((it) => typeof it?.str === 'string');
      for (const it of items) chars += it.str.trim().length;
      pages.push({ page: n, items, height: page.getViewport?.({ scale: 1 }).height });
      page.cleanup?.();
      options.onProgress?.(n, pageCount);
    }

    let title: string | undefined;
    try {
      const meta = await doc.getMetadata?.();
      const raw = meta?.info?.['Title'];
      if (typeof raw === 'string' && raw.trim()) title = raw.trim();
    } catch {
      title = undefined;
    }

    const blocks = pdfPagesToBlocks(pages, options);
    const needsOcr = limit > 0 && chars / limit < 20;
    return { blocks, text: readerPlainText(blocks), pageCount, pagesRead: limit, needsOcr, title };
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    try {
      await (doc?.destroy?.() ?? task.destroy?.());
    } catch {
      /* ignore */
    }
  }
}
