/**
 * @license
 * FZL Software — Document Reader Web Component
 */
import { LitElement, html, css, svg, unsafeCSS, PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  FzlPdfRect,
  FzlReaderBlock,
  FzlReaderViewMode,
  FzlReaderWidth,
  normalizeReaderBlocks,
  readerBlocksFromText,
  readerBlockOffsets,
  readerPlainText,
} from './document-reader.types';
import { buildTextQuote, FZL_READER_CONTEXT_LENGTH } from './document-reader.anchoring';

export * from './document-reader.types';
export * from './document-reader.anchoring';
export * from './document-reader.pdf';

export type FzlReaderFullscreenMode = 'native' | 'immersive';

export interface FzlReaderFullscreenChangeDetail {
  fullscreen: boolean;
  mode: FzlReaderFullscreenMode | null;
}

/** A highlight drawn over the canonical plain text (`reader.plainText`) or PDF page. */
export interface FzlReaderAnnotation {
  id: string;
  start: number;
  end: number;
  /** Any CSS color. Default: `--fzl-reader-highlight` (yellow). */
  color?: string;
  /** Tooltip. */
  title?: string;
  /** Source page (1-based), e.g. for PDF documents. */
  page?: number;
  /** Normalized bounding boxes (0..1) on the PDF page. */
  rects?: FzlPdfRect[];
}

export interface FzlReaderSelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** `detail` of `fzl-reader-selection`. Offsets refer to `reader.plainText`. */
export interface FzlReaderSelectionDetail {
  text: string;
  start: number;
  end: number;
  prefix: string;
  suffix: string;
  /** Block where the selection starts. */
  blockIndex: number;
  /** Block where the selection ends. */
  endBlockIndex: number;
  /** Page of the first selected character (only when blocks have `page`). */
  page?: number;
  /** Page of the last selected character (only when blocks have `page`). */
  endPage?: number;
  /** Viewport rect of the selection (for positioning UI). */
  rect: FzlReaderSelectionRect | null;
  /** Normalized bounding boxes (0..1) on the PDF page when selected in PDF view. */
  rects?: FzlPdfRect[];
}

export interface FzlReaderAnnotationClickDetail {
  /** The most specific (shortest) annotation under the pointer. */
  id: string;
  /** Every annotation covering the clicked text. */
  ids: string[];
  annotation: FzlReaderAnnotation | undefined;
}

export interface FzlReaderPreferencesChangeDetail {
  fontSize: number;
  readingWidth: FzlReaderWidth;
}

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 36;
const FONT_STEP = 2;
const MIN_PDF_GESTURE_SCALE = 0.3;
const MAX_PDF_SCALE = 2.5;

interface PinchState {
  active: boolean;
  mode: 'pdf' | 'text';
  startDistance: number;
  startScale: number;
  targetScale: number;
  startFontSize: number;
  startMidX: number;
  startMidY: number;
  curMidX: number;
  curMidY: number;
  originX: number;
  originY: number;
}

type FullscreenDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const icon = (path: TemplateResult) =>
  html`<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">${path}</svg>`;
const ICON_ENTER_FS = icon(svg`<path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>`);
const ICON_EXIT_FS = icon(svg`<path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>`);
const ICON_WIDE = icon(svg`<path fill="currentColor" d="M3 5h18v2H3zm0 12h18v2H3zM7 11l-4 1 4 1v-2zm10 0v2l4-1-4-1zM8 11h8v2H8z"/>`);
const ICON_ASIDE = icon(svg`<path fill="currentColor" d="M3 5h18v14H3V5zm2 2v10h9V7H5zm11 0v10h3V7h-3z"/>`);
const ICON_NARROW = icon(svg`<path fill="currentColor" d="M7 5h10v2H7zm0 12h10v2H7zM3 11l4 1-4 1v-2zm18 0v2l-4-1 4-1zM9 11h6v2H9z"/>`);
const ICON_PDF = icon(svg`<path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>`);
const ICON_TEXT = icon(svg`<path fill="currentColor" d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>`);
const ICON_ZOOM_IN = icon(svg`<path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/>`);
const ICON_ZOOM_OUT = icon(svg`<path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/>`);
const ICON_FIT_WIDTH = icon(svg`<path fill="currentColor" d="M4 4h2v16H4zm14 0h2v16h-2zM8 13h8v-2H8zM7 12l3-3v2h4V9l3 3-3 3v-2h-4v2z"/>`);

/**
 * Document Reader (`fzl-document-reader`).
 *
 * Generic reader for long text: renders plain `text` or `blocks`
 * (compatible with `FzlDocxReaderController.blocks`) in a scrollable area that fills
 * the host, with a thin toolbar (title, font size, reading width, fullscreen) and an
 * `actions` slot for app buttons.
 *
 * Fullscreen uses the Fullscreen API on the host; where it is not available
 * (e.g. iPhone Safari) it falls back to an "immersive" CSS overlay (fixed, 100vw × 100dvh)
 * that closes with Esc.
 *
 * Offsets: the canonical plain text of the document is the block texts joined by
 * `'\n\n'` (see `readerPlainText`, available as `reader.plainText`).
 *
 * @customElement fzl-document-reader
 * @tag fzl-document-reader
 *
 * @attr {string} text - Plain text (blank lines separate paragraphs). Ignored when `blocks` is set
 * @attr {string} document-title - Title shown in the toolbar
 * @attr {string} meta - Secondary info shown next to the title (e.g. "DOCX · 3.200 palavras")
 * @attr {number} [font-size=18] - Font size of the text, in px (12–36)
 * @attr {'narrow' | 'wide'} [reading-width='narrow'] - Narrow (~70ch) or wide column
 * @attr {boolean} [compact=false] - 36px toolbar, without `meta`
 * @attr {boolean} [hide-toolbar=false] - Hides the toolbar (fullscreen still available via API)
 *
 * Host attributes set by the component (read-only, for styling):
 * `fullscreen` and `fullscreen-mode="native|immersive"`.
 *
 * @fires {CustomEvent<FzlReaderFullscreenChangeDetail>} fzl-reader-fullscreen-change
 * @fires {CustomEvent<FzlReaderPreferencesChangeDetail>} fzl-reader-preferences-change - A-/A+ or width changed by the user
 * @fires {CustomEvent<FzlReaderSelectionDetail>} fzl-reader-selection - Text selected inside the reader (after the pointer is released)
 * @fires {CustomEvent<void>} fzl-reader-selection-clear - The selection was removed
 * @fires {CustomEvent<FzlReaderAnnotationClickDetail>} fzl-reader-annotation-click - A highlight was clicked
 * @fires {CustomEvent<{ open: boolean }>} fzl-reader-aside-toggle - The side panel was opened/closed by the user
 *
 * @slot actions - Extra buttons in the toolbar
 * @slot empty - Content shown when there is no text
 * @slot selection-popover - Small UI shown under the current selection (e.g. title field + Save)
 * @slot aside - Collapsible side panel (right; below the text on narrow widths), visible in fullscreen too
 *
 * @csspart toolbar - The top bar
 * @csspart title - The title in the toolbar
 * @csspart scroller - The scrollable area
 * @csspart page - The text column
 * @csspart selection-popover - Container of the `selection-popover` slot
 * @csspart annotation - Each highlight `<mark>`
 * @csspart aside - The side panel
 * @csspart page-marker - The "p. N" page marker
 *
 * @cssprop --fzl-reader-height - Host height (default 100%)
 * @cssprop --fzl-reader-font-family - Font of the text
 * @cssprop --fzl-reader-z-index - z-index of the immersive overlay
 * @cssprop --fzl-reader-aside-width - Width of the side panel (default 320px)
 * @cssprop --fzl-reader-aside-height - Height of the side panel on narrow widths (default 40%)
 */
export class FzlDocumentReader extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        height: var(--fzl-reader-height, 100%);
        min-height: 0;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        background: var(--_fzl-color-surface, #ffffff);
        box-sizing: border-box;
      }
      *, *::before, *::after {
        box-sizing: inherit;
      }
      :host([fullscreen]) {
        width: 100%;
        height: 100%;
      }
      :host([fullscreen-mode='immersive']) {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        height: 100dvh;
        z-index: var(--fzl-reader-z-index, 2147483000);
        /* Neutralizes the UA styles of [popover] (top layer). */
        margin: 0;
        padding: 0;
        border: 0;
        max-width: none;
        max-height: none;
        overflow: hidden;
      }

      .bar {
        flex: none;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 2px 4px;
        min-height: 44px;
        padding: 4px 6px 4px 12px;
        border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: var(--_fzl-color-surface, #ffffff);
      }
      :host([compact]) .bar {
        min-height: 36px;
        padding: 2px 4px 2px 10px;
      }
      .heading {
        flex: 1 1 8em;
        min-width: 6em;
        display: flex;
        align-items: baseline;
        gap: 8px;
        overflow: hidden;
      }
      .title {
        font-weight: 600;
        font-size: 0.95rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
      :host([compact]) .title {
        font-size: 0.875rem;
      }
      .meta {
        flex: none;
        font-size: 0.75rem;
        color: var(--_fzl-color-text-muted, #64748b);
        white-space: nowrap;
      }
      :host([compact]) .meta {
        display: none;
      }
      .tools {
        flex: 0 1 auto;
        margin-left: auto;
        min-width: 0;
        flex-wrap: wrap;
        justify-content: flex-end;
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .tools ::slotted(*) {
        flex: 0 1 auto;
        min-width: 0;
        max-width: 100%;
      }
      .sep {
        width: 1px;
        height: 20px;
        margin: 0 4px;
        background: var(--_fzl-color-border, #e2e8f0);
      }
      button.tool {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        padding: 0 6px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      }
      :host([compact]) button.tool {
        min-width: 28px;
        height: 28px;
      }
      button.tool:hover:not(:disabled) {
        background: var(--_fzl-color-surface-muted, #f1f5f9);
      }
      button.tool:focus-visible {
        outline: 2px solid var(--_fzl-color-primary, #2563eb);
        outline-offset: 1px;
      }
      button.tool:disabled {
        opacity: 0.4;
        cursor: default;
      }

      .body {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
        display: flex;
      }
      .zoom-hud {
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        padding: 4px 12px;
        border-radius: 9999px;
        background: rgba(15, 23, 42, 0.82);
        color: #ffffff;
        font-family: var(--_fzl-font-family);
        font-size: 0.8rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        pointer-events: none;
        user-select: none;
        -webkit-user-select: none;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .aside {
        flex: none;
        width: var(--fzl-reader-aside-width, 320px);
        max-width: 50%;
        border-left: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: var(--_fzl-color-surface, #ffffff);
        overflow: auto;
        overscroll-behavior: contain;
      }
      .aside[hidden] {
        display: none;
      }
      :host([data-narrow]) .body {
        flex-direction: column;
      }
      :host([data-narrow]) .aside {
          width: auto;
          max-width: none;
          height: var(--fzl-reader-aside-height, 40%);
          border-left: none;
          border-top: 1px solid var(--_fzl-color-border, #e2e8f0);
      }
      .pg {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 1.2em 0 0.8em;
        font-family: var(--_fzl-font-family);
        font-size: 0.7rem;
        color: var(--_fzl-color-text-muted, #64748b);
        user-select: none;
        -webkit-user-select: none;
      }
      .pg::before {
        content: attr(data-label);
        flex: none;
      }
      .pg::after {
        content: '';
        flex: 1;
        border-top: 1px dashed var(--_fzl-color-border, #e2e8f0);
      }
      .pg:first-child {
        margin-top: 0;
      }
      .scroller {
        position: relative;
        flex: 1 1 auto;
        min-height: 0;
        min-width: 0;
        overflow: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      :host([fullscreen]) .scroller {
        touch-action: pan-x pan-y;
      }
      .scroller:focus-visible {
        outline: 2px solid var(--_fzl-color-primary, #2563eb);
        outline-offset: -2px;
      }
      .page {
        position: relative;
        min-width: 0;
        margin: 0 auto;
        padding: 24px 20px 64px;
        max-width: min(72ch, 100%);
        font-family: var(--fzl-reader-font-family, Georgia, 'Times New Roman', serif);
        line-height: 1.7;
        overflow-wrap: break-word;
        word-break: break-word;
      }
      :host([data-narrow]) .page {
        padding: 16px 12px 64px;
      }
      .page.wide {
        max-width: min(120ch, 100%);
      }
      .blk {
        margin: 0 0 1em;
        white-space: pre-wrap;
      }
      .blk.h {
        font-family: var(--_fzl-font-family);
        line-height: 1.3;
        margin: 1.4em 0 0.6em;
      }
      .blk.h:first-child {
        margin-top: 0;
      }
      h2.blk {
        font-size: 1.5em;
      }
      h3.blk {
        font-size: 1.25em;
      }
      h4.blk {
        font-size: 1.1em;
      }
      .blk.li {
        position: relative;
        padding-left: 1.4em;
        margin-bottom: 0.4em;
      }
      .blk.li::before {
        content: '•';
        position: absolute;
        left: 0.3em;
      }
      .blk.table {
        font-family: ui-monospace, monospace;
        font-size: 0.85em;
        overflow-x: auto;
      }
      mark.ann {
        color: inherit;
        background: color-mix(in srgb, var(--fzl-ann-color, var(--fzl-reader-highlight, #facc15)) 38%, transparent);
        border-radius: 2px;
        cursor: pointer;
      }
      mark.ann.pending {
        background: color-mix(in srgb, var(--fzl-reader-pending, #3b82f6) 22%, transparent);
        outline: 1px dashed var(--fzl-reader-pending, #3b82f6);
        outline-offset: 1px;
        cursor: text;
      }
      mark.ann.multi {
        background: color-mix(in srgb, var(--fzl-ann-color, var(--fzl-reader-highlight, #facc15)) 60%, transparent);
      }
      mark.ann.active {
        box-shadow: 0 0 0 2px var(--fzl-ann-color, var(--fzl-reader-highlight, #facc15));
      }
      mark.ann.flash {
        animation: fzl-ann-flash 1.2s ease-out;
      }
      @keyframes fzl-ann-flash {
        0%, 40% {
          box-shadow: 0 0 0 4px var(--fzl-ann-color, var(--fzl-reader-highlight, #facc15));
        }
        100% {
          box-shadow: 0 0 0 0 transparent;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        mark.ann.flash {
          animation: none;
        }
      }
      .sel-pop {
        position: absolute;
        z-index: 2;
        max-width: calc(100% - 16px);
        transform: translateX(-50%);
        font-family: var(--_fzl-font-family);
        font-size: 0.875rem;
        line-height: 1.4;
      }
      .sel-pop[hidden] {
        display: none;
      }
      .empty {
        padding: 48px 20px;
        text-align: center;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      /* PDF Viewer */
      .pdf-container {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 20px;
        padding: 24px 16px 80px;
        background: var(--_fzl-color-surface-muted, #f1f5f9);
        min-width: 100%;
        width: max-content;
        min-height: 100%;
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
      }
      :host([data-narrow]) .pdf-container {
        padding: 12px 8px 80px;
      }
      .pdf-page {
        position: relative;
        background: #ffffff;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08);
        border-radius: 3px;
        overflow: visible;
        margin: 0 auto;
        user-select: none;
        -webkit-user-select: none;
      }
      .pdf-canvas {
        display: block;
        width: 100%;
        height: 100%;
        user-select: none;
        -webkit-user-select: none;
      }
      .pdf-page-number {
        position: absolute;
        bottom: -22px;
        right: 0;
        font-family: var(--_fzl-font-family);
        font-size: 0.75rem;
        color: var(--_fzl-color-text-muted, #64748b);
        user-select: none;
        -webkit-user-select: none;
      }
      .textLayer {
        position: absolute;
        inset: 0;
        overflow: clip;
        opacity: 1;
        line-height: 1;
        text-size-adjust: none;
        -webkit-text-size-adjust: none;
        forced-color-adjust: none;
        transform-origin: 0 0;
        caret-color: CanvasText;
        user-select: text;
        -webkit-user-select: text;
        z-index: 2;
      }
      .textLayer :is(span, br) {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: text;
        transform-origin: 0% 0%;
      }
      .textLayer > :not(.markedContent):not(.endOfContent),
      .textLayer .markedContent span:not(.markedContent) {
        z-index: 1;
        --font-height: 0;
        font-size: calc(var(--text-scale-factor, var(--total-scale-factor, 1)) * var(--font-height));
        --scale-x: 1;
        --rotate: 0deg;
        transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv, 1));
      }
      .textLayer .markedContent {
        display: contents;
      }
      .textLayer ::selection {
        background: rgba(0, 106, 106, 0.35);
      }
      .textLayer br::selection {
        background: transparent;
      }
      .textLayer .endOfContent {
        display: block;
        position: absolute;
        inset: 100% 0 0;
        z-index: 0;
        cursor: default;
        user-select: none;
        -webkit-user-select: none;
      }
      .textLayer.selecting .endOfContent {
        top: 0;
      }
      .pdf-highlights-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 3;
      }
      .pdf-annotation {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .pdf-highlight {
        position: absolute;
        pointer-events: auto;
        cursor: pointer;
        border-radius: 2px;
        mix-blend-mode: multiply;
        transition: opacity 0.15s ease;
      }
      .pdf-highlight:hover {
        opacity: 0.85;
        outline: 2px solid var(--_fzl-color-primary, #006a6a);
      }
      .pdf-highlight.active {
        opacity: 0.9;
        outline: 2px solid var(--_fzl-color-primary, #006a6a);
      }
      .pdf-highlight.flash {
        animation: fzl-pdf-flash 1.2s ease-out;
      }
      @keyframes fzl-pdf-flash {
        0%, 40% {
          outline: 4px solid var(--_fzl-color-primary, #006a6a);
        }
        100% {
          outline: 0 solid transparent;
        }
      }
    `,
  ];

  /** Plain text. Ignored when `blocks` has items. */
  @property({ type: String }) text = '';

  /** Structured content (`FzlDocxBlock[]` works as is). Takes precedence over `text`. */
  @property({ attribute: false }) blocks: FzlReaderBlock[] | null = null;

  /** Document title (shown in the toolbar). Not named `title` to avoid the native tooltip. */
  @property({ type: String, attribute: 'document-title' }) documentTitle = '';

  @property({ type: String }) meta = '';

  @property({ type: Number, attribute: 'font-size' }) fontSize = 18;

  @property({ type: String, attribute: 'reading-width', reflect: true }) readingWidth: FzlReaderWidth = 'narrow';

  @property({ type: Boolean, reflect: true }) compact = false;

  @property({ type: Boolean, attribute: 'hide-toolbar' }) hideToolbar = false;

  /** Highlights to draw, by offsets in `plainText`. Rendering never changes the text itself. */
  @property({ attribute: false }) annotations: FzlReaderAnnotation[] = [];

  /**
   * Passage being edited (e.g. while the user types its title): drawn as a dashed
   * "pending" highlight, so it stays visible after the native selection is lost.
   * While it overlaps the current selection, the selection is kept.
   */
  @property({ attribute: false }) pendingRange: { start: number; end: number } | null = null;

  /** Id of the annotation shown as active (outlined). */
  @property({ type: String, attribute: 'active-annotation' }) activeAnnotation: string | null = null;

  /** Characters of context kept in `prefix`/`suffix` of `fzl-reader-selection`. */
  @property({ type: Number, attribute: 'context-length' }) contextLength = FZL_READER_CONTEXT_LENGTH;

  /** Focuses the first field of the `selection-popover` slot when it opens. */
  @property({ type: Boolean, attribute: 'popover-autofocus' }) popoverAutofocus = false;

  /** Disables `fzl-reader-selection` events. */
  @property({ type: Boolean, attribute: 'no-selection' }) noSelection = false;

  /** Expands selections to whole words (and updates the visible selection). */
  @property({ type: Boolean, attribute: 'snap-to-words' }) snapToWords = false;

  /** Whether the `aside` panel is open. */
  @property({ type: Boolean, attribute: 'aside-open', reflect: true }) asideOpen = false;

  /** PDF binary source (Blob, File, ArrayBuffer, Uint8Array or URL string). */
  @property({ attribute: false }) pdfSource: Blob | File | ArrayBuffer | Uint8Array | string | null = null;

  /** PDF.js module or a function/promise returning it. */
  @property({ attribute: false }) pdfjs: any = null;

  /** View mode: 'text' (default) or 'pdf' (when pdfSource is present). */
  @property({ type: String, attribute: 'view-mode' }) viewMode: FzlReaderViewMode = 'text';

  /** PDF zoom scale factor. Defaults to 1.15. */
  @property({ type: Number, attribute: 'pdf-scale' }) pdfScale = 1.15;

  @state() private _pdfDoc: any = null;
  @state() private _pdfPageCount = 0;
  @state() private _defaultPageWidth = 595;
  @state() private _defaultPageHeight = 842;
  @state() private _pdfLoading = false;
  @state() private _pdfError: string | null = null;
  private _renderedPages = new Set<number>();
  private _renderingPages = new Set<number>();
  private _pdfObserver: IntersectionObserver | null = null;

  @state() private _hasAsideContent = false;

  @state() private _selection: FzlReaderSelectionDetail | null = null;
  @state() private _popoverPos: { top: number; left: number } | null = null;
  @state() private _hasPopoverContent = false;

  @state() private _fullscreenMode: FzlReaderFullscreenMode | null = null;

  /** `true` while in fullscreen (native or immersive). Mirrored as the `fullscreen` host attribute. */
  get fullscreen(): boolean {
    return this._fullscreenMode !== null;
  }

  /** Current fullscreen mode, or `null`. Mirrored as the `fullscreen-mode` host attribute. */
  get fullscreenMode(): FzlReaderFullscreenMode | null {
    return this._fullscreenMode;
  }

  @state() private _blocks: FzlReaderBlock[] = [];
  @state() private _zoomHudText = '';

  private _offsets: number[] = [];
  private _plainText = '';
  private _savedRootOverflow: string | null = null;
  private _usingPopover = false;
  private _annotations: (FzlReaderAnnotation & { pending?: boolean })[] = [];
  private _pointerSelecting = false;
  private _suppressSnap = false;
  private _resizeObserver: ResizeObserver | null = null;
  private _lastPointerInPopover = false;
  private _selectionTimer: ReturnType<typeof setTimeout> | null = null;
  private _zoomHudTimer: ReturnType<typeof setTimeout> | null = null;
  private _gestureTarget: HTMLElement | null = null;
  private _pinch: PinchState | null = null;
  private _pinchCooldownUntil = 0;
  private _pdfRenderGeneration = 0;
  private _pdfTextLayers = new Map<HTMLElement, HTMLElement>();
  private _prevPdfRange: Range | null = null;
  private _isFirefox: boolean | null = null;

  /** Normalized blocks being rendered. */
  get resolvedBlocks(): readonly FzlReaderBlock[] {
    return this._blocks;
  }

  /** Canonical plain text (blocks joined by `'\n\n'`); all offsets refer to it. */
  get plainText(): string {
    return this._plainText;
  }

  /** Start offset of each block in `plainText`. */
  get blockOffsets(): readonly number[] {
    return this._offsets;
  }

  /** Whether the browser supports the Fullscreen API for this element. */
  get nativeFullscreenSupported(): boolean {
    if (typeof document === 'undefined') return false;
    const doc = document as FullscreenDoc;
    const el = this as FullscreenEl;
    const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
    return !!enabled && (typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    window.addEventListener('keydown', this._onKeydown);
    document.addEventListener('selectionchange', this._onSelectionChange);
    window.addEventListener('pointerup', this._onPointerUp, true);
    window.addEventListener('mouseup', this._onPointerUp, true);
    window.addEventListener('touchend', this._onPointerUp, true);
    window.addEventListener('pointerdown', this._onWindowPointerDown, true);
    window.addEventListener('mousedown', this._onWindowPointerDown, true);
    window.addEventListener('blur', this._onWindowBlur);
    this._bindTouchGestures();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver ??= new ResizeObserver((entries) => {
        const width = entries[entries.length - 1]?.contentRect.width ?? this.clientWidth;
        this.toggleAttribute('data-narrow', width > 0 && width < 640);
      });
      this._resizeObserver.observe(this);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
    window.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('selectionchange', this._onSelectionChange);
    window.removeEventListener('pointerup', this._onPointerUp, true);
    window.removeEventListener('mouseup', this._onPointerUp, true);
    window.removeEventListener('touchend', this._onPointerUp, true);
    window.removeEventListener('pointerdown', this._onWindowPointerDown, true);
    window.removeEventListener('mousedown', this._onWindowPointerDown, true);
    window.removeEventListener('blur', this._onWindowBlur);
    this._unbindTouchGestures();
    this._cancelPinchPreview();
    this._resetPdfTextLayers();
    this._pdfTextLayers.clear();
    if (this._selectionTimer) clearTimeout(this._selectionTimer);
    if (this._zoomHudTimer) clearTimeout(this._zoomHudTimer);
    this._resizeObserver?.disconnect();
    this._pdfObserver?.disconnect();
    this._pdfObserver = null;
    this._pdfDoc?.destroy?.();
    if (this.fullscreenMode === 'immersive') this._setFullscreen(null);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('pdfSource')) {
      if (this.pdfSource && !this.hasAttribute('view-mode')) {
        this.viewMode = 'pdf';
      }
    }
    if (changed.has('blocks') || changed.has('text')) {
      const blocks = normalizeReaderBlocks(this.blocks);
      this._blocks = blocks.length ? blocks : readerBlocksFromText(this.text);
      this._offsets = readerBlockOffsets(this._blocks);
      this._plainText = readerPlainText(this._blocks);
      if (this._selection) this._setSelection(null);
    }
    if (changed.has('annotations') || changed.has('pendingRange') || changed.has('blocks') || changed.has('text')) {
      const max = this._plainText.length;
      const list: (FzlReaderAnnotation & { pending?: boolean })[] = (
        Array.isArray(this.annotations) ? this.annotations : []
      )
        .filter((a) => a && a.id != null && Number.isFinite(a.start) && Number.isFinite(a.end))
        .map((a) => ({ ...a, id: String(a.id), start: Math.max(0, a.start), end: Math.min(max, a.end) }));
      const pending = this.pendingRange;
      if (pending && Number.isFinite(pending.start) && Number.isFinite(pending.end)) {
        list.push({ id: '', pending: true, start: Math.max(0, pending.start), end: Math.min(max, pending.end) });
      }
      this._annotations = list.filter((a) => a.end > a.start);
    }
    if (changed.has('fontSize')) {
      const size = Number(this.fontSize);
      this.fontSize = Number.isFinite(size) ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size)) : 18;
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this._bindTouchGestures();
    if (changed.has('pdfSource') || changed.has('pdfjs')) {
      void this._loadPdf();
    }
    if (this.viewMode === 'pdf' && this._pdfDoc) {
      this._setupPdfIntersectionObserver();
      if (!this._renderedPages.has(1)) void this._renderPage(1);
      if (this._pdfPageCount >= 2 && !this._renderedPages.has(2)) void this._renderPage(2);
    }
  }

  // ---------------------------------------------------------------- fullscreen

  /** Enters fullscreen (native when possible, immersive overlay otherwise). */
  async enterFullscreen(): Promise<void> {
    if (this.fullscreen) return;
    if (this.nativeFullscreenSupported) {
      const el = this as FullscreenEl;
      try {
        if (typeof el.requestFullscreen === 'function') await el.requestFullscreen();
        else await el.webkitRequestFullscreen?.();
        // `fullscreenchange` updates the state; sync now in case the event is late.
        this._syncNativeState();
        if (this.fullscreen) return;
      } catch {
        // Denied (e.g. no user gesture, iframe without allowfullscreen): use the overlay.
      }
    }
    this._setFullscreen('immersive');
  }

  /** Leaves fullscreen/immersive mode. */
  async exitFullscreen(): Promise<void> {
    if (this.fullscreenMode === 'immersive') {
      this._setFullscreen(null);
      return;
    }
    if (this.fullscreenMode === 'native') {
      const doc = document as FullscreenDoc;
      try {
        if (typeof doc.exitFullscreen === 'function') await doc.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
      } catch {
        /* already out */
      }
      this._syncNativeState();
    }
  }

  /** Toggles fullscreen. */
  toggleFullscreen(): Promise<void> {
    return this.fullscreen ? this.exitFullscreen() : this.enterFullscreen();
  }

  private _onFullscreenChange = () => this._syncNativeState();

  private _syncNativeState() {
    const doc = document as FullscreenDoc;
    const current = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (current === this) {
      if (this.fullscreenMode !== 'native') this._setFullscreen('native');
    } else if (this.fullscreenMode === 'native') {
      this._setFullscreen(null);
    }
  }

  private _onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.fullscreenMode === 'immersive') {
      event.preventDefault();
      this._setFullscreen(null);
    }
  };

  private _setFullscreen(mode: FzlReaderFullscreenMode | null) {
    if (mode === this.fullscreenMode) return;
    if (mode === null) this._cancelPinchPreview();
    const root = document.documentElement;
    if (mode === 'immersive') {
      this._savedRootOverflow = root.style.overflow;
      root.style.overflow = 'hidden';
    } else if (this.fullscreenMode === 'immersive') {
      root.style.overflow = this._savedRootOverflow ?? '';
      this._savedRootOverflow = null;
      this._leaveTopLayer();
    }
    this._fullscreenMode = mode;
    this.toggleAttribute('fullscreen', mode !== null);
    if (mode) this.setAttribute('fullscreen-mode', mode);
    else this.removeAttribute('fullscreen-mode');
    if (mode === 'immersive') this._enterTopLayer();
    this.dispatchEvent(
      new CustomEvent<FzlReaderFullscreenChangeDetail>('fzl-reader-fullscreen-change', {
        detail: { fullscreen: this.fullscreen, mode },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Puts the immersive overlay in the browser top layer (Popover API), so it stays
   * above the app shell even when an ancestor creates a stacking context
   * (transform, z-index, contain). Without the API, `position: fixed` + z-index is used.
   */
  private _enterTopLayer() {
    const el = this as HTMLElement & { showPopover?: () => void };
    if (typeof el.showPopover !== 'function' || this.hasAttribute('popover')) return;
    try {
      this.setAttribute('popover', 'manual');
      el.showPopover();
      this._usingPopover = true;
    } catch {
      this.removeAttribute('popover');
    }
  }

  private _leaveTopLayer() {
    if (!this._usingPopover) return;
    this._usingPopover = false;
    try {
      (this as HTMLElement & { hidePopover?: () => void }).hidePopover?.();
    } catch {
      /* already hidden */
    }
    this.removeAttribute('popover');
  }

  // ---------------------------------------------------------------- preferences

  /** Increases (`+1`) or decreases (`-1`) the font size by one step. */
  stepFontSize(direction: 1 | -1): void {
    const next = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, this.fontSize + direction * FONT_STEP));
    if (next === this.fontSize) return;
    this.fontSize = next;
    this._emitPreferences();
  }

  /** Toggles between narrow and wide reading column. */
  toggleReadingWidth(): void {
    this.readingWidth = this.readingWidth === 'wide' ? 'narrow' : 'wide';
    this._emitPreferences();
  }

  private _emitPreferences() {
    this.dispatchEvent(
      new CustomEvent<FzlReaderPreferencesChangeDetail>('fzl-reader-preferences-change', {
        detail: { fontSize: this.fontSize, readingWidth: this.readingWidth },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /** The scrollable element (e.g. to save/restore `scrollTop`). */
  get scrollElement(): HTMLElement | null {
    return this.renderRoot?.querySelector('.scroller') ?? null;
  }

  // ---------------------------------------------------------------- selection

  /** Current selection inside the reader, or `null`. */
  get selection(): FzlReaderSelectionDetail | null {
    return this._selection;
  }

  /** Removes the text selection (DOM and state) and hides the selection popover. */
  clearSelection(): void {
    try {
      document.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }
    this._setSelection(null);
  }

  /**
   * Converts a DOM range inside the reader into canonical offsets and quote.
   * Returns `null` if the range does not cover any text of the document.
   */
  rangeToSelection(range: AbstractRange): FzlReaderSelectionDetail | null {
    const page = this.renderRoot?.querySelector('.page');
    if (!page || !range || range.collapsed) return null;
    const live = toLiveRange(range);
    if (!live) return null;
    const blocks = Array.from(page.querySelectorAll<HTMLElement>('.blk'));
    let first = -1;
    let last = -1;
    blocks.forEach((block, i) => {
      let hit = false;
      try {
        hit = live.intersectsNode(block);
      } catch {
        hit = false;
      }
      if (hit) {
        if (first < 0) first = i;
        last = i;
      }
    });
    if (first < 0) return null;

    const firstIndex = Number(blocks[first].dataset.index);
    const lastIndex = Number(blocks[last].dataset.index);
    let start = this._offsets[firstIndex];
    if (blocks[first].contains(live.startContainer)) {
      start += textLengthBefore(blocks[first], live.startContainer, live.startOffset);
    }
    let end = this._offsets[lastIndex] + this._blocks[lastIndex].text.length;
    if (blocks[last].contains(live.endContainer)) {
      end = this._offsets[lastIndex] + textLengthBefore(blocks[last], live.endContainer, live.endOffset);
    }

    const text = this._plainText;
    while (start < end && /\s/.test(text[start])) start++;
    while (end > start && /\s/.test(text[end - 1])) end--;
    if (end <= start) return null;

    let rectRange: Range = live;
    if (this.snapToWords && !this._suppressSnap) {
      const snapped = snapRangeToWords(text, start, end);
      if (snapped.start !== start || snapped.end !== end) {
        start = snapped.start;
        end = snapped.end;
        rectRange = this.offsetsToRange(start, end) ?? live;
      }
    }

    let rect: FzlReaderSelectionRect | null = null;
    try {
      const r = rectRange.getBoundingClientRect?.();
      if (r) {
        rect = { x: r.x, y: r.y, width: r.width, height: r.height, top: r.top, right: r.right, bottom: r.bottom, left: r.left };
      }
    } catch {
      rect = null;
    }

    return {
      ...buildTextQuote(text, start, end, this.contextLength),
      start,
      end,
      blockIndex: this.blockIndexAt(start),
      endBlockIndex: this.blockIndexAt(end - 1),
      ...this._pageFields(start, end),
      rect,
    };
  }

  private _pageFields(start: number, end: number): { page?: number; endPage?: number } {
    const page = this.pageAt(start);
    if (page === undefined) return {};
    return { page, endPage: this.pageAt(end - 1) ?? page };
  }

  /** Source page of the canonical `offset` (only when blocks have `page`). */
  pageAt(offset: number): number | undefined {
    const page = this._blocks[this.blockIndexAt(offset)]?.page;
    return typeof page === 'number' ? page : undefined;
  }

  /** DOM position (text node + offset) of a canonical offset, or `null`. */
  protected domPointAt(offset: number, preferEnd = false): { node: Node; offset: number } | null {
    const index = this.blockIndexAt(offset);
    const block = this.renderRoot?.querySelector<HTMLElement>(`.blk[data-index="${index}"]`);
    if (!block) return null;
    let local = Math.max(0, Math.min(offset - (this._offsets[index] ?? 0), this._blocks[index]?.text.length ?? 0));
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    let last: Text | null = null;
    while (node) {
      const len = node.data.length;
      if (local < len || (local === len && preferEnd)) return { node, offset: local };
      local -= len;
      last = node;
      node = walker.nextNode() as Text | null;
    }
    return last ? { node: last, offset: last.data.length } : { node: block, offset: 0 };
  }

  /** Builds a DOM range for canonical offsets `[start, end)`. */
  offsetsToRange(start: number, end: number): Range | null {
    const a = this.domPointAt(start);
    const b = this.domPointAt(end, true);
    if (!a || !b) return null;
    try {
      const range = document.createRange();
      range.setStart(a.node, a.offset);
      range.setEnd(b.node, b.offset);
      return range;
    } catch {
      return null;
    }
  }

  /** Selects canonical offsets `[start, end)` in the document (visible selection). */
  selectOffsets(start: number, end: number): boolean {
    const range = this.offsetsToRange(start, end);
    const sel = document.getSelection();
    if (!range || !sel) return false;
    try {
      sel.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
      return true;
    } catch {
      try {
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      } catch {
        return false;
      }
    }
  }

  /** Like `rangeToSelection`, ignoring `snapToWords`. */
  rangeToSelectionRaw(range: AbstractRange): FzlReaderSelectionDetail | null {
    this._suppressSnap = true;
    try {
      return this.rangeToSelection(range);
    } finally {
      this._suppressSnap = false;
    }
  }

  // ---------------------------------------------------------------- aside

  /** Opens/closes the `aside` panel. Emits `fzl-reader-aside-toggle`. */
  toggleAside(force?: boolean): void {
    const open = force ?? !this.asideOpen;
    if (open === this.asideOpen) return;
    this.asideOpen = open;
    this.dispatchEvent(
      new CustomEvent<{ open: boolean }>('fzl-reader-aside-toggle', { detail: { open }, bubbles: true, composed: true }),
    );
  }

  private _onAsideSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    this._hasAsideContent = slot.assignedNodes({ flatten: true }).some(
      (n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim() !== '',
    );
  }

  /** Index of the block containing the canonical `offset`. */
  blockIndexAt(offset: number): number {
    let lo = 0;
    let hi = this._offsets.length - 1;
    let found = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this._offsets[mid] <= offset) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found;
  }

  /** The DOM range of the current document selection inside this reader, if any. */
  protected getSelectionRange(): Range | null {
    const root = this.shadowRoot;
    const sel = typeof document !== 'undefined' ? document.getSelection() : null;
    type ComposedSel = Selection & { getComposedRanges?: (...args: unknown[]) => StaticRange[] };
    const composed = sel as ComposedSel | null;
    if (root && composed && typeof composed.getComposedRanges === 'function') {
      const shadowRoots: ShadowRoot[] = [];
      let n: Node | null = this;
      while (n) {
        const r: Node | null = n instanceof ShadowRoot ? n : (n.getRootNode?.() ?? null);
        if (r instanceof ShadowRoot && !shadowRoots.includes(r)) {
          shadowRoots.push(r);
        }
        n = (r instanceof ShadowRoot && r.host) ? r.host : null;
      }
      if (!shadowRoots.includes(root)) shadowRoots.push(root);

      let ranges: StaticRange[] | undefined;
      try {
        ranges = composed.getComposedRanges({ shadowRoots });
      } catch {
        try {
          ranges = composed.getComposedRanges({ shadowRoots: [root] });
        } catch {
          try {
            ranges = composed.getComposedRanges(root);
          } catch {
            ranges = undefined;
          }
        }
      }
      const r = ranges?.[0];
      if (r && !r.collapsed && root.contains(r.startContainer) && root.contains(r.endContainer)) {
        return toLiveRange(r);
      }
    }
    const rootSel = (root as ShadowRoot & { getSelection?: () => Selection | null } | null)?.getSelection?.();
    if (rootSel && rootSel.rangeCount && !rootSel.isCollapsed) return rootSel.getRangeAt(0);
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const r = sel.getRangeAt(0);
      if (root && root.contains(r.startContainer) && root.contains(r.endContainer)) return r;
    }
    return null;
  }

  private _isInPopover(event: Event): boolean {
    const pop = this.renderRoot?.querySelector('.sel-pop');
    return !!pop && event.composedPath().includes(pop);
  }

  private _onWindowPointerDown = (event: Event) => {
    this._lastPointerInPopover = this._isInPopover(event);
  };

  private _onScrollerPointerDown = (event: Event) => {
    if (this._isInPopover(event) || this._pinch?.active) return;
    this._pointerSelecting = true;
    if (this.viewMode === 'pdf') {
      const textLayer = event
        .composedPath()
        .find((n): n is HTMLElement => n instanceof HTMLElement && n.classList?.contains('textLayer'));
      if (textLayer) {
        textLayer.classList.add('selecting');
      }
    }
  };

  private _onPointerUp = () => {
    this._resetPdfTextLayers();
    if (this._pinch?.active || Date.now() < this._pinchCooldownUntil) {
      this._pointerSelecting = false;
      return;
    }
    this._pointerSelecting = false;
    this._scheduleSelectionRead(10);
  };

  private _onWindowBlur = () => {
    this._pointerSelecting = false;
    this._resetPdfTextLayers();
  };

  private _onSelectionChange = () => {
    if (!this._pinch?.active && Date.now() >= this._pinchCooldownUntil) {
      this._syncPdfTextLayerSelection();
    }
    if (this._pointerSelecting || this._pinch?.active || Date.now() < this._pinchCooldownUntil) return; // read once, when the pointer is released
    if (typeof window !== 'undefined') {
      const mouseEvt = window.event as MouseEvent | undefined;
      if (mouseEvt && (mouseEvt.buttons & 1) === 1) return;
    }
    this._scheduleSelectionRead(150);
  };

  private _resetPdfTextLayerEntry(textLayer: HTMLElement, endDiv: HTMLElement) {
    if (endDiv.parentElement !== textLayer || textLayer.lastElementChild !== endDiv) {
      textLayer.append(endDiv);
    }
    endDiv.style.width = '';
    endDiv.style.height = '';
    endDiv.style.userSelect = '';
    textLayer.classList.remove('selecting');
  }

  private _resetPdfTextLayers() {
    this._prevPdfRange = null;
    for (const [textLayer, endDiv] of this._pdfTextLayers) {
      if (!textLayer.isConnected) {
        this._pdfTextLayers.delete(textLayer);
        continue;
      }
      this._resetPdfTextLayerEntry(textLayer, endDiv);
    }
  }

  private _syncPdfTextLayerSelection() {
    if (this.viewMode !== 'pdf' || !this._pdfTextLayers.size) return;
    const range = this.getSelectionRange();
    if (!range || range.collapsed) {
      this._resetPdfTextLayers();
      return;
    }

    for (const [textLayer, endDiv] of this._pdfTextLayers) {
      if (!textLayer.isConnected) {
        this._pdfTextLayers.delete(textLayer);
        continue;
      }
      let active = false;
      try {
        active = range.intersectsNode(textLayer);
      } catch {
        active = false;
      }
      if (active) {
        textLayer.classList.add('selecting');
      } else {
        this._resetPdfTextLayerEntry(textLayer, endDiv);
      }
    }

    this._isFirefox ??= typeof navigator !== 'undefined' && /Firefox/i.test(navigator.userAgent);
    if (this._isFirefox) return;

    let modifyStart = false;
    if (this._prevPdfRange) {
      try {
        modifyStart =
          range.compareBoundaryPoints(Range.END_TO_END, this._prevPdfRange) === 0 ||
          range.compareBoundaryPoints(Range.START_TO_END, this._prevPdfRange) === 0;
      } catch {
        modifyStart = false;
      }
    }

    let anchor: Node | null = modifyStart ? range.startContainer : range.endContainer;
    if (anchor?.nodeType === Node.TEXT_NODE) {
      anchor = anchor.parentNode;
    }
    const parentTextLayer = (anchor instanceof Element ? anchor.closest('.textLayer') : null) as HTMLElement | null;
    const endDiv = parentTextLayer ? this._pdfTextLayers.get(parentTextLayer) : null;
    if (!parentTextLayer || !endDiv || !anchor || anchor === endDiv) {
      this._prevPdfRange = range.cloneRange();
      return;
    }

    if (!modifyStart && range.endOffset === 0) {
      let cur: Node | null = anchor;
      while (cur && cur !== parentTextLayer) {
        if (cur.previousSibling) {
          cur = cur.previousSibling;
          if (cur !== endDiv && cur.childNodes.length) {
            anchor = cur;
            break;
          }
        } else {
          cur = cur.parentNode;
        }
      }
    }

    if (
      anchor &&
      anchor !== endDiv &&
      anchor !== parentTextLayer &&
      anchor.parentElement &&
      parentTextLayer.contains(anchor.parentElement)
    ) {
      endDiv.style.width = parentTextLayer.style.width;
      endDiv.style.height = parentTextLayer.style.height;
      endDiv.style.userSelect = 'text';
      anchor.parentElement.insertBefore(endDiv, modifyStart ? anchor : anchor.nextSibling);
    }
    this._prevPdfRange = range.cloneRange();
  }

  // ---------------------------------------------------------------- touch pinch zoom

  private _bindTouchGestures() {
    const scroller = this.renderRoot?.querySelector<HTMLElement>('.scroller') ?? null;
    if (!scroller || scroller === this._gestureTarget) return;
    this._unbindTouchGestures();
    this._gestureTarget = scroller;
    scroller.addEventListener('touchstart', this._onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', this._onTouchMove, { passive: false });
    scroller.addEventListener('touchend', this._onTouchEnd, { passive: true });
    scroller.addEventListener('touchcancel', this._onTouchEnd, { passive: true });
    scroller.addEventListener('gesturestart', this._onGestureStart, { passive: false });
    scroller.addEventListener('gesturechange', this._onGestureStart, { passive: false });
  }

  private _unbindTouchGestures() {
    if (!this._gestureTarget) return;
    this._gestureTarget.removeEventListener('touchstart', this._onTouchStart);
    this._gestureTarget.removeEventListener('touchmove', this._onTouchMove);
    this._gestureTarget.removeEventListener('touchend', this._onTouchEnd);
    this._gestureTarget.removeEventListener('touchcancel', this._onTouchEnd);
    this._gestureTarget.removeEventListener('gesturestart', this._onGestureStart);
    this._gestureTarget.removeEventListener('gesturechange', this._onGestureStart);
    this._gestureTarget = null;
  }

  private _onGestureStart = (event: Event) => {
    if (this.fullscreen) event.preventDefault();
  };

  private _onTouchStart = (event: TouchEvent) => {
    if (!this.fullscreen || event.touches.length !== 2 || this._isInPopover(event)) return;
    const t0 = event.touches[0];
    const t1 = event.touches[1];
    if (!t0 || !t1) return;
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    if (dist < 10) return;

    const midX = (t0.clientX + t1.clientX) / 2;
    const midY = (t0.clientY + t1.clientY) / 2;
    const mode: 'pdf' | 'text' = this.viewMode === 'pdf' && this.pdfSource ? 'pdf' : 'text';
    const scroller = this.renderRoot?.querySelector<HTMLElement>('.scroller');
    const pdfContainer = this.renderRoot?.querySelector<HTMLElement>('.pdf-container');
    const originRect = (mode === 'pdf' && pdfContainer ? pdfContainer : scroller)?.getBoundingClientRect();
    const originX = originRect ? midX - originRect.left : 0;
    const originY = originRect ? midY - originRect.top : 0;

    this._pinch = {
      active: true,
      mode,
      startDistance: dist,
      startScale: this.pdfScale,
      targetScale: this.pdfScale,
      startFontSize: this.fontSize,
      startMidX: midX,
      startMidY: midY,
      curMidX: midX,
      curMidY: midY,
      originX,
      originY,
    };
    this._pointerSelecting = false;
    if (this._selectionTimer) {
      clearTimeout(this._selectionTimer);
      this._selectionTimer = null;
    }
  };

  private _onTouchMove = (event: TouchEvent) => {
    if (!this._pinch?.active || !this.fullscreen || event.touches.length !== 2) return;
    event.preventDefault();
    const t0 = event.touches[0];
    const t1 = event.touches[1];
    if (!t0 || !t1) return;
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const ratio = dist / this._pinch.startDistance;
    const midX = (t0.clientX + t1.clientX) / 2;
    const midY = (t0.clientY + t1.clientY) / 2;
    this._pinch.curMidX = midX;
    this._pinch.curMidY = midY;

    if (this._pinch.mode === 'pdf') {
      const nextScale = Math.min(
        MAX_PDF_SCALE,
        Math.max(MIN_PDF_GESTURE_SCALE, Math.round(this._pinch.startScale * ratio * 100) / 100),
      );
      this._pinch.targetScale = nextScale;
      const previewRatio = nextScale / this._pinch.startScale;
      const dx = midX - this._pinch.startMidX;
      const dy = midY - this._pinch.startMidY;
      const pdfContainer = this.renderRoot?.querySelector<HTMLElement>('.pdf-container');
      if (pdfContainer) {
        pdfContainer.style.willChange = 'transform';
        pdfContainer.style.transformOrigin = `${this._pinch.originX}px ${this._pinch.originY}px`;
        pdfContainer.style.transform = `translate(${dx}px, ${dy}px) scale(${previewRatio})`;
      }
      this._showZoomHud(`${Math.round(nextScale * 100)}%`);
    } else {
      const nextFont = Math.round(
        Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, this._pinch.startFontSize * ratio)),
      );
      if (nextFont !== this.fontSize) {
        this.fontSize = nextFont;
      }
      this._showZoomHud(`${nextFont}px`);
    }
  };

  private _onTouchEnd = (event: TouchEvent) => {
    if (!this._pinch?.active || event.touches.length >= 2) return;
    const pinch = this._pinch;
    this._pinch = null;
    this._pinchCooldownUntil = Date.now() + 250;

    if (pinch.mode === 'pdf') {
      const pdfContainer = this.renderRoot?.querySelector<HTMLElement>('.pdf-container');
      if (pdfContainer) {
        pdfContainer.style.transform = '';
        pdfContainer.style.transformOrigin = '';
        pdfContainer.style.willChange = '';
      }
      if (Math.abs(pinch.targetScale - pinch.startScale) >= 0.02) {
        const scroller = this.renderRoot?.querySelector<HTMLElement>('.scroller');
        const scrollerRect = scroller?.getBoundingClientRect();
        const endVpX = scrollerRect ? pinch.curMidX - scrollerRect.left : 0;
        const endVpY = scrollerRect ? pinch.curMidY - scrollerRect.top : 0;
        const scaleRatio = pinch.targetScale / pinch.startScale;

        this.pdfScale = pinch.targetScale;
        this._pdfRenderGeneration++;
        this._renderedPages.clear();
        this.requestUpdate();
        this._showZoomHud(`${Math.round(pinch.targetScale * 100)}%`, 750);

        void this.updateComplete.then(() => {
          const curScroller = this.renderRoot?.querySelector<HTMLElement>('.scroller');
          if (curScroller) {
            curScroller.scrollLeft = Math.max(0, pinch.originX * scaleRatio - endVpX);
            curScroller.scrollTop = Math.max(0, pinch.originY * scaleRatio - endVpY);
          }
          if (this._pdfDoc) {
            this._setupPdfIntersectionObserver();
          }
        });
      } else {
        this._showZoomHud('');
      }
    } else {
      if (this.fontSize !== pinch.startFontSize) {
        this._emitPreferences();
        this._showZoomHud(`${this.fontSize}px`, 750);
      } else {
        this._showZoomHud('');
      }
    }
  };

  private _showZoomHud(text: string, autoHideMs?: number) {
    if (this._zoomHudTimer) {
      clearTimeout(this._zoomHudTimer);
      this._zoomHudTimer = null;
    }
    this._zoomHudText = text;
    if (text && autoHideMs) {
      this._zoomHudTimer = setTimeout(() => {
        this._zoomHudTimer = null;
        this._zoomHudText = '';
      }, autoHideMs);
    }
  }

  private _cancelPinchPreview() {
    this._pinch = null;
    const pdfContainer = this.renderRoot?.querySelector<HTMLElement>('.pdf-container');
    if (pdfContainer) {
      pdfContainer.style.transform = '';
      pdfContainer.style.transformOrigin = '';
      pdfContainer.style.willChange = '';
    }
    this._showZoomHud('');
  }

  private _scheduleSelectionRead(delay: number) {
    if (this._selectionTimer) clearTimeout(this._selectionTimer);
    this._selectionTimer = setTimeout(() => {
      this._selectionTimer = null;
      this._readSelection();
    }, delay);
  }

  private _readSelection() {
    if (this.noSelection || !this.isConnected) return;
    const range = this.getSelectionRange();

    if (this.viewMode === 'pdf' && range && !range.collapsed) {
      const startEl = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
      const endEl = range.endContainer instanceof Element ? range.endContainer : range.endContainer.parentElement;
      const startPageDiv = startEl?.closest('.pdf-page') as HTMLElement | null;
      const endPageDiv = endEl?.closest('.pdf-page') as HTMLElement | null;
      const pageDiv = startPageDiv || endPageDiv;
      if (pageDiv) {
        const pageNum = Number(pageDiv.dataset.pageNumber || '1');
        const endPageNum = Number(endPageDiv?.dataset.pageNumber || String(pageNum));
        const text = extractPdfRangeText(range);
        if (text) {
          const pageRect = pageDiv.getBoundingClientRect();
          const clientRects = Array.from(range.getClientRects()).filter(
            (r) =>
              r.width > 0 &&
              r.height > 0 &&
              !(pageRect.width > 0 && pageRect.height > 0 && r.width >= pageRect.width * 0.9 && r.height >= pageRect.height * 0.9),
          );
          const rects: FzlPdfRect[] =
            pageRect.width > 0 && pageRect.height > 0
              ? clientRects.map((r) => ({
                  left: Math.max(0, (r.left - pageRect.left) / pageRect.width),
                  top: Math.max(0, (r.top - pageRect.top) / pageRect.height),
                  width: Math.min(1, r.width / pageRect.width),
                  height: Math.min(1, r.height / pageRect.height),
                }))
              : [];

          let rect: FzlReaderSelectionRect;
          if (clientRects.length > 0) {
            const top = Math.min(...clientRects.map((r) => r.top));
            const right = Math.max(...clientRects.map((r) => r.right));
            const bottom = Math.max(...clientRects.map((r) => r.bottom));
            const left = Math.min(...clientRects.map((r) => r.left));
            rect = { x: left, y: top, width: right - left, height: bottom - top, top, right, bottom, left };
          } else {
            const selRect = range.getBoundingClientRect();
            rect = {
              x: selRect.x,
              y: selRect.y,
              width: selRect.width,
              height: selRect.height,
              top: selRect.top,
              right: selRect.right,
              bottom: selRect.bottom,
              left: selRect.left,
            };
          }

          const textMatch = this._matchPdfTextInPlainText(text, pageNum, rects[0]?.top);
          const detail: FzlReaderSelectionDetail = textMatch
            ? {
                ...buildTextQuote(this._plainText, textMatch.start, textMatch.end, this.contextLength),
                start: textMatch.start,
                end: textMatch.end,
                blockIndex: this.blockIndexAt(textMatch.start),
                endBlockIndex: this.blockIndexAt(textMatch.end - 1),
                page: pageNum,
                endPage: endPageNum,
                rect,
                rects,
              }
            : {
                text,
                start: 0,
                end: text.length,
                prefix: '',
                suffix: '',
                blockIndex: pageNum - 1,
                endBlockIndex: endPageNum - 1,
                page: pageNum,
                endPage: endPageNum,
                rect,
                rects,
              };

          this._setSelection(detail);
          return;
        }
      }
    }

    const detail = range ? this.rangeToSelection(range) : null;
    if (detail) {
      if (this.snapToWords && range) {
        const raw = this.rangeToSelectionRaw(range);
        if (raw && (raw.start !== detail.start || raw.end !== detail.end)) this.selectOffsets(detail.start, detail.end);
      }
      const prev = this._selection;
      if (!prev || prev.start !== detail.start || prev.end !== detail.end) this._setSelection(detail);
      return;
    }
    if (!this._selection) return;
    // Keep the selection while the user works in slotted UI (popover field, action buttons).
    const active = document.activeElement;
    if (this._lastPointerInPopover || (active && active !== document.body && this.contains(active))) return;
    const pending = this.pendingRange;
    if (pending && pending.start < this._selection.end && pending.end > this._selection.start) return;
    this._setSelection(null);
  }

  private _matchPdfTextInPlainText(
    text: string,
    pageNum: number,
    firstRectTop?: number,
  ): { start: number; end: number } | null {
    if (!this._plainText || !text) return null;
    const matches = findFlexibleWhitespaceMatches(this._plainText, text);
    if (!matches.length) return null;
    if (matches.length === 1) return matches[0];

    let best = matches[0];
    let bestPageDist = Infinity;
    let bestTopDist = Infinity;

    for (const m of matches) {
      const matchPage = this.pageAt(m.start);
      const pageDist = typeof matchPage === 'number' ? Math.abs(matchPage - pageNum) : 0;

      let topDist = 0;
      if (typeof firstRectTop === 'number') {
        let pageStart = 0;
        let pageEnd = this._plainText.length;
        if (typeof matchPage === 'number' && this._blocks.length) {
          let firstIdx = -1;
          let lastIdx = -1;
          for (let i = 0; i < this._blocks.length; i++) {
            if (this._blocks[i].page === matchPage) {
              if (firstIdx < 0) firstIdx = i;
              lastIdx = i;
            }
          }
          if (firstIdx >= 0) {
            pageStart = this._offsets[firstIdx];
            pageEnd = this._offsets[lastIdx] + this._blocks[lastIdx].text.length;
          }
        }
        const span = Math.max(1, pageEnd - pageStart);
        const relPos = Math.max(0, Math.min(1, (m.start - pageStart) / span));
        topDist = Math.abs(relPos - firstRectTop);
      }

      if (pageDist < bestPageDist || (pageDist === bestPageDist && topDist < bestTopDist)) {
        best = m;
        bestPageDist = pageDist;
        bestTopDist = topDist;
      }
    }

    return best;
  }

  private _setSelection(detail: FzlReaderSelectionDetail | null) {
    const had = !!this._selection;
    this._selection = detail;
    this._popoverPos = detail ? this._computePopoverPos(detail) : null;
    if (detail) {
      // Fired after the render that shows the popover, so listeners can focus its fields.
      void this.updateComplete.then(() => {
        if (this._selection !== detail) return;
        this.dispatchEvent(
          new CustomEvent<FzlReaderSelectionDetail>('fzl-reader-selection', { detail, bubbles: true, composed: true }),
        );
        if (this.popoverAutofocus) this.focusSelectionPopover();
      });
    } else if (had) {
      this.dispatchEvent(new CustomEvent('fzl-reader-selection-clear', { bubbles: true, composed: true }));
    }
  }

  /** Focuses the first focusable element of the `selection-popover` slot. Returns `true` on success. */
  focusSelectionPopover(): boolean {
    const slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="selection-popover"]');
    const selector =
      'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [contenteditable=""], [contenteditable="true"], [tabindex]:not([tabindex="-1"])';
    for (const el of slot?.assignedElements({ flatten: true }) ?? []) {
      const target = (el.matches(selector) ? el : el.querySelector(selector)) as HTMLElement | null;
      if (target) {
        target.focus();
        return true;
      }
    }
    return false;
  }

  private _computePopoverPos(detail: FzlReaderSelectionDetail): { top: number; left: number } | null {
    if (this.viewMode === 'pdf') {
      const scroller = this.renderRoot?.querySelector<HTMLElement>('.scroller');
      if (!scroller || !detail.rect) return null;
      const box = scroller.getBoundingClientRect();
      const half = Math.min(140, box.width / 2);
      const center = detail.rect.left + detail.rect.width / 2 - box.left;
      return {
        top: detail.rect.bottom - box.top + scroller.scrollTop + 8,
        left: Math.max(half, Math.min(box.width - half, center)),
      };
    }
    const page = this.renderRoot?.querySelector<HTMLElement>('.page');
    if (!page || !detail.rect) return null;
    const box = page.getBoundingClientRect();
    const half = Math.min(140, box.width / 2);
    const center = detail.rect.left + detail.rect.width / 2 - box.left;
    return {
      top: detail.rect.bottom - box.top + 8,
      left: Math.max(half, Math.min(box.width - half, center)),
    };
  }

  private _onPopoverSlotChange(event: Event) {
    const slot = event.target as HTMLSlotElement;
    this._hasPopoverContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  // ---------------------------------------------------------------- annotations

  /** Scrolls to the canonical `offset` (start of its block, or the exact text when possible). */
  scrollToOffset(offset: number, behavior: ScrollBehavior = 'smooth'): boolean {
    const index = this.blockIndexAt(offset);
    const block = this.renderRoot?.querySelector<HTMLElement>(`.blk[data-index="${index}"]`);
    if (!block) return false;
    block.scrollIntoView?.({ block: 'center', behavior });
    return true;
  }

  /** Scrolls to a specific PDF page (1-based). */
  scrollToPage(pageNumber: number, behavior: ScrollBehavior = 'smooth'): boolean {
    const pageEl = this.renderRoot?.querySelector<HTMLElement>(`.pdf-page[data-page-number="${pageNumber}"]`);
    if (!pageEl) return false;
    pageEl.scrollIntoView?.({ block: 'start', behavior });
    return true;
  }

  /** Scrolls to an annotation and flashes it. Returns `false` if it is not rendered. */
  async scrollToAnnotation(id: string, behavior: ScrollBehavior = 'smooth'): Promise<boolean> {
    await this.updateComplete;
    if (this.viewMode === 'pdf') {
      const ann = this.annotations.find((a) => String(a.id) === String(id));
      if (!ann || typeof ann.page !== 'number') return false;
      this.scrollToPage(ann.page, behavior);
      const pageEl = this.renderRoot?.querySelector<HTMLElement>(`.pdf-page[data-page-number="${ann.page}"]`);
      const marks = Array.from(
        pageEl?.querySelectorAll<HTMLElement>(`.pdf-annotation[data-id="${id}"] .pdf-highlight`) ?? [],
      );
      for (const mark of marks) {
        mark.classList.remove('flash');
        void mark.offsetWidth;
        mark.classList.add('flash');
        setTimeout(() => mark.classList.remove('flash'), 1300);
      }
      return true;
    }
    const marks = Array.from(this.renderRoot?.querySelectorAll<HTMLElement>('mark.ann') ?? []).filter((m) =>
      (m.dataset.ids ?? '').split(' ').includes(String(id)),
    );
    if (!marks.length) return false;
    marks[0].scrollIntoView?.({ block: 'center', behavior });
    for (const mark of marks) {
      mark.classList.remove('flash');
      void mark.offsetWidth;
      mark.classList.add('flash');
      setTimeout(() => mark.classList.remove('flash'), 1300);
    }
    return true;
  }

  private _onPageClick(event: MouseEvent) {
    if (this._isInPopover(event)) return;
    const mark = event
      .composedPath()
      .find((n): n is HTMLElement => n instanceof HTMLElement && n.matches?.('mark.ann'));
    if (!mark) return;
    const sel = document.getSelection();
    if (sel && !sel.isCollapsed && this.getSelectionRange()) return; // the user is selecting text
    const ids = (mark.dataset.ids ?? '').split(' ').filter(Boolean);
    const id = mark.dataset.top || ids[0];
    if (!id) return;
    this.dispatchEvent(
      new CustomEvent<FzlReaderAnnotationClickDetail>('fzl-reader-annotation-click', {
        detail: { id, ids, annotation: (this.annotations ?? []).find((a) => String(a.id) === id) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ---------------------------------------------------------------- render

  /**
   * Renders the text of one block. Subclasses may override (e.g. to add highlights);
   * the rendered text nodes must contain exactly `block.text`.
   */
  protected renderBlockText(block: FzlReaderBlock, _index: number, offset: number): unknown {
    const blockEnd = offset + block.text.length;
    const relevant = this._annotations.filter((a) => a.start < blockEnd && a.end > offset);
    if (!relevant.length) return block.text;

    const cuts = new Set<number>([0, block.text.length]);
    for (const a of relevant) {
      cuts.add(Math.max(0, a.start - offset));
      cuts.add(Math.min(block.text.length, a.end - offset));
    }
    const points = [...cuts].sort((x, y) => x - y);
    const parts: unknown[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      if (to <= from) continue;
      const segment = block.text.slice(from, to);
      const coveringAll = relevant.filter((a) => a.start <= offset + from && a.end >= offset + to);
      if (!coveringAll.length) {
        parts.push(segment);
        continue;
      }
      const isPending = coveringAll.some((a) => a.pending);
      const covering = coveringAll.filter((a) => !a.pending);
      if (!covering.length) {
        parts.push(html`<mark class="ann pending" part="annotation pending">${segment}</mark>`);
        continue;
      }
      // Most specific (shortest) annotation on top.
      const top = covering.reduce((best, a) => (a.end - a.start < best.end - best.start ? a : best));
      const active = this.activeAnnotation != null && covering.some((a) => a.id === String(this.activeAnnotation));
      parts.push(
        html`<mark
          class="ann ${covering.length > 1 ? 'multi' : ''} ${active ? 'active' : ''} ${isPending ? 'pending' : ''}"
          part="annotation${isPending ? ' pending' : ''}"
          data-ids=${covering.map((a) => a.id).join(' ')}
          data-top=${top.id}
          title=${top.title ?? ''}
          style=${styleMap(top.color ? { '--fzl-ann-color': top.color } : {})}
        >${segment}</mark>`,
      );
    }
    return parts;
  }

  protected renderBlock(block: FzlReaderBlock, index: number): TemplateResult {
    const offset = this._offsets[index] ?? 0;
    const content = this.renderBlockText(block, index, offset);
    switch (block.type) {
      case 'heading': {
        const level = Math.min(3, Math.max(1, Number(block.level) || 2));
        if (level === 1) return html`<h2 class="blk h" data-index=${index} data-offset=${offset}>${content}</h2>`;
        if (level === 2) return html`<h3 class="blk h" data-index=${index} data-offset=${offset}>${content}</h3>`;
        return html`<h4 class="blk h" data-index=${index} data-offset=${offset}>${content}</h4>`;
      }
      case 'list-item':
        return html`<p class="blk li" data-index=${index} data-offset=${offset}>${content}</p>`;
      case 'table':
        return html`<p class="blk table" data-index=${index} data-offset=${offset}>${content}</p>`;
      default:
        return html`<p class="blk" data-index=${index} data-offset=${offset}>${content}</p>`;
    }
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'pdf' ? 'text' : 'pdf';
    this._selection = null;
    this.requestUpdate();
  }

  stepPdfScale(delta: number): void {
    const next = Math.min(MAX_PDF_SCALE, Math.max(0.6, Math.round((this.pdfScale + delta) * 100) / 100));
    if (next === this.pdfScale) return;
    this.pdfScale = next;
    this._pdfRenderGeneration++;
    this._renderedPages.clear();
    this.requestUpdate();
  }

  resetPdfScale(): void {
    if (this.pdfScale === 1.15) return;
    this.pdfScale = 1.15;
    this._pdfRenderGeneration++;
    this._renderedPages.clear();
    this.requestUpdate();
  }

  fitPdfWidth(): void {
    const scroller = this.renderRoot?.querySelector<HTMLElement>('.scroller');
    if (!scroller || !this._defaultPageWidth) return;
    const pad = this.hasAttribute('data-narrow') ? 16 : 48;
    const availableWidth = scroller.clientWidth - pad;
    if (availableWidth > 120) {
      this.pdfScale = Math.min(
        MAX_PDF_SCALE,
        Math.max(MIN_PDF_GESTURE_SCALE, Math.round((availableWidth / this._defaultPageWidth) * 100) / 100),
      );
      this._pdfRenderGeneration++;
      this._renderedPages.clear();
      this.requestUpdate();
    }
  }

  private async _loadPdf(): Promise<void> {
    if (!this.pdfSource || !this.pdfjs) {
      this._pdfDoc = null;
      this._pdfPageCount = 0;
      return;
    }
    this._pdfLoading = true;
    this._pdfError = null;
    this._pdfRenderGeneration++;
    this._renderedPages.clear();
    this._pdfTextLayers.clear();
    this._prevPdfRange = null;
    try {
      const pdfjs = typeof this.pdfjs === 'function' ? await this.pdfjs() : await this.pdfjs;
      let data: Uint8Array;
      if (this.pdfSource instanceof Uint8Array) {
        data = this.pdfSource;
      } else if (this.pdfSource instanceof ArrayBuffer) {
        data = new Uint8Array(this.pdfSource);
      } else if (typeof Blob !== 'undefined' && this.pdfSource instanceof Blob) {
        data = new Uint8Array(await this.pdfSource.arrayBuffer());
      } else if (typeof this.pdfSource === 'string') {
        const res = await fetch(this.pdfSource);
        data = new Uint8Array(await res.arrayBuffer());
      } else {
        throw new Error('Formato de pdfSource não suportado');
      }

      const loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;
      this._pdfDoc = doc;
      this._pdfPageCount = doc.numPages;

      if (doc.numPages > 0) {
        const page1 = await doc.getPage(1);
        const vp = page1.getViewport({ scale: 1 });
        this._defaultPageWidth = vp.width;
        this._defaultPageHeight = vp.height;

        if (!this.hasAttribute('pdf-scale')) {
          const scroller = this.renderRoot?.querySelector<HTMLElement>('.scroller');
          const pad = this.hasAttribute('data-narrow') ? 16 : 48;
          const availableWidth = (scroller?.clientWidth ?? 0) - pad;
          if (availableWidth > 120 && this._defaultPageWidth * this.pdfScale > availableWidth) {
            this.pdfScale = Math.min(
              MAX_PDF_SCALE,
              Math.max(MIN_PDF_GESTURE_SCALE, Math.floor((availableWidth / this._defaultPageWidth) * 100) / 100),
            );
          }
        }
      }
    } catch (err: any) {
      console.warn('[fzl-document-reader] Falha ao carregar documento PDF:', err);
      this._pdfError = err?.message || 'Erro ao carregar PDF';
      this._pdfDoc = null;
    } finally {
      this._pdfLoading = false;
      this.requestUpdate();
    }
  }

  private async _renderPage(pageNum: number): Promise<void> {
    if (this._renderedPages.has(pageNum) || this._renderingPages.has(pageNum) || !this._pdfDoc) return;
    const gen = this._pdfRenderGeneration;
    const pageDiv = this.renderRoot?.querySelector(`.pdf-page[data-page-number="${pageNum}"]`) as HTMLElement | null;
    if (!pageDiv) return;
    const canvas = pageDiv.querySelector('canvas') as HTMLCanvasElement | null;
    const textLayerDiv = pageDiv.querySelector('.textLayer') as HTMLElement | null;
    if (!canvas || !textLayerDiv) return;

    this._renderingPages.add(pageNum);
    try {
      const page = await this._pdfDoc.getPage(pageNum);
      if (gen !== this._pdfRenderGeneration) return;
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      const viewport = page.getViewport({ scale: this.pdfScale * dpr });
      const cssViewport = page.getViewport({ scale: this.pdfScale });

      pageDiv.style.width = `${cssViewport.width}px`;
      pageDiv.style.height = `${cssViewport.height}px`;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${cssViewport.width}px`;
      canvas.style.height = `${cssViewport.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (gen !== this._pdfRenderGeneration) return;
      }

      this._pdfTextLayers.delete(textLayerDiv);
      textLayerDiv.innerHTML = '';
      textLayerDiv.style.width = `${cssViewport.width}px`;
      textLayerDiv.style.height = `${cssViewport.height}px`;
      textLayerDiv.style.setProperty('--total-scale-factor', `${this.pdfScale}`);

      const textContent = await page.getTextContent();
      if (gen !== this._pdfRenderGeneration) return;
      const pdfjs = typeof this.pdfjs === 'function' ? await this.pdfjs() : await this.pdfjs;
      if (pdfjs && typeof pdfjs.TextLayer === 'function') {
        const textLayer = new pdfjs.TextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: cssViewport,
        });
        await textLayer.render();
        if (gen !== this._pdfRenderGeneration) return;
      } else if (pdfjs && typeof pdfjs.renderTextLayer === 'function') {
        await pdfjs.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport: cssViewport,
        }).promise;
        if (gen !== this._pdfRenderGeneration) return;
      }

      if (gen === this._pdfRenderGeneration) {
        const endDiv = document.createElement('div');
        endDiv.className = 'endOfContent';
        textLayerDiv.append(endDiv);
        this._pdfTextLayers.set(textLayerDiv, endDiv);
        this._renderedPages.add(pageNum);
      }
    } catch (err) {
      console.warn(`[fzl-document-reader] Erro ao renderizar página ${pageNum}:`, err);
    } finally {
      this._renderingPages.delete(pageNum);
    }
  }

  private _setupPdfIntersectionObserver() {
    this._pdfObserver?.disconnect();
    const scroller = this.renderRoot?.querySelector('.scroller');
    if (!scroller || typeof IntersectionObserver === 'undefined') return;

    this._pdfObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number((entry.target as HTMLElement).dataset.pageNumber || '0');
            if (pageNum > 0) void this._renderPage(pageNum);
          }
        }
      },
      { root: scroller, rootMargin: '400px 0px' }
    );

    const pageEls = this.renderRoot?.querySelectorAll('.pdf-page');
    pageEls?.forEach((el) => this._pdfObserver?.observe(el));
  }

  private _renderPdfContainer(): TemplateResult {
    if (this._pdfLoading) {
      return html`<div class="empty">⏳ Carregando visualização original do PDF…</div>`;
    }
    if (this._pdfError) {
      return html`<div class="empty">⚠️ ${this._pdfError}</div>`;
    }
    if (!this._pdfPageCount) {
      return html`<div class="empty"><slot name="empty">Nenhuma página para exibir.</slot></div>`;
    }

    return html`
      <div class="pdf-container" part="pdf-container">
        ${Array.from({ length: this._pdfPageCount }, (_, i) => i + 1).map((pageNum) => html`
          <div
            class="pdf-page"
            part="pdf-page"
            data-page-number=${pageNum}
            style=${styleMap({
              width: `${this._defaultPageWidth * this.pdfScale}px`,
              minHeight: `${this._defaultPageHeight * this.pdfScale}px`,
            })}
          >
            <canvas class="pdf-canvas"></canvas>
            <div class="textLayer" style=${styleMap({ '--total-scale-factor': `${this.pdfScale}` })}></div>
            <div class="pdf-highlights-layer">
              ${this._renderPdfPageHighlights(pageNum)}
            </div>
            <div class="pdf-page-number" aria-hidden="true">p. ${pageNum}</div>
          </div>
        `)}
      </div>
    `;
  }

  private _renderPdfPageHighlights(pageNum: number) {
    const pageAnns = this.annotations.filter(
      (a) => a.page === pageNum && Array.isArray(a.rects) && a.rects.length > 0,
    );
    if (!pageAnns.length) return null;

    return pageAnns.map((a) => {
      const active = this.activeAnnotation != null && String(this.activeAnnotation) === String(a.id);
      return html`
        <div
          class="pdf-annotation ${active ? 'active' : ''}"
          data-id=${a.id}
          title=${a.title || ''}
          @click=${(e: Event) => this._onPdfAnnotationClick(e, a)}
        >
          ${a.rects!.map(
            (r) => html`
              <div
                class="pdf-highlight ${active ? 'active' : ''}"
                style=${styleMap({
                  left: `${r.left * 100}%`,
                  top: `${r.top * 100}%`,
                  width: `${r.width * 100}%`,
                  height: `${r.height * 100}%`,
                  backgroundColor: a.color ? `${a.color}55` : 'rgba(255, 235, 59, 0.45)',
                  outlineColor: a.color || '#f57f17',
                })}
              ></div>
            `,
          )}
        </div>
      `;
    });
  }

  private _onPdfAnnotationClick(e: Event, a: FzlReaderAnnotation) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent<FzlReaderAnnotationClickDetail>('fzl-reader-annotation-click', {
        detail: {
          id: a.id,
          ids: [a.id],
          annotation: a,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _renderToolbar() {
    if (this.hideToolbar) return null;
    const wide = this.readingWidth === 'wide';
    return html`
      <header class="bar" part="toolbar">
        <div class="heading">
          <span class="title" part="title" title=${this.documentTitle}>${this.documentTitle}</span>
          ${this.meta ? html`<span class="meta">${this.meta}</span>` : null}
        </div>
        <div class="tools">
          <slot name="actions"></slot>
          <span class="sep" aria-hidden="true"></span>
          ${this.pdfSource
            ? html`
                <button
                  class="tool"
                  type="button"
                  aria-pressed=${this.viewMode === 'pdf' ? 'true' : 'false'}
                  aria-label=${this.viewMode === 'pdf' ? 'Ver texto em blocos' : 'Ver PDF original'}
                  title=${this.viewMode === 'pdf' ? 'Alternar para texto em blocos' : 'Alternar para PDF original'}
                  @click=${() => this.toggleViewMode()}
                >${this.viewMode === 'pdf' ? ICON_TEXT : ICON_PDF}</button>
              `
            : null}
          ${this._hasAsideContent
            ? html`<button
                class="tool"
                type="button"
                aria-pressed=${this.asideOpen ? 'true' : 'false'}
                aria-label=${this.asideOpen ? 'Fechar painel' : 'Abrir painel'}
                title=${this.asideOpen ? 'Fechar painel' : 'Abrir painel'}
                @click=${() => this.toggleAside()}
              >${ICON_ASIDE}</button>`
            : null}
          ${this.viewMode === 'pdf' && this.pdfSource
            ? html`
                <button
                  class="tool"
                  type="button"
                  aria-label="Diminuir zoom do PDF"
                  title="Diminuir zoom"
                  ?disabled=${this.pdfScale <= 0.6}
                  @click=${() => this.stepPdfScale(-0.2)}
                >${ICON_ZOOM_OUT}</button>
                <button
                  class="tool"
                  type="button"
                  aria-label="Redefinir zoom"
                  title="Redefinir zoom (100%)"
                  @click=${() => this.resetPdfScale()}
                >${Math.round(this.pdfScale * 100)}%</button>
                <button
                  class="tool"
                  type="button"
                  aria-label="Aumentar zoom do PDF"
                  title="Aumentar zoom"
                  ?disabled=${this.pdfScale >= 2.5}
                  @click=${() => this.stepPdfScale(0.2)}
                >${ICON_ZOOM_IN}</button>
                <button
                  class="tool"
                  type="button"
                  aria-label="Ajustar à largura"
                  title="Ajustar à largura"
                  @click=${() => this.fitPdfWidth()}
                >${ICON_FIT_WIDTH}</button>
              `
            : html`
                <button
                  class="tool"
                  type="button"
                  aria-label="Diminuir fonte"
                  title="Diminuir fonte"
                  ?disabled=${this.fontSize <= MIN_FONT_SIZE}
                  @click=${() => this.stepFontSize(-1)}
                >A−</button>
                <button
                  class="tool"
                  type="button"
                  aria-label="Aumentar fonte"
                  title="Aumentar fonte"
                  ?disabled=${this.fontSize >= MAX_FONT_SIZE}
                  @click=${() => this.stepFontSize(1)}
                >A+</button>
                <button
                  class="tool"
                  type="button"
                  aria-pressed=${wide ? 'true' : 'false'}
                  aria-label=${wide ? 'Coluna estreita' : 'Coluna larga'}
                  title=${wide ? 'Coluna estreita' : 'Coluna larga'}
                  @click=${() => this.toggleReadingWidth()}
                >${wide ? ICON_NARROW : ICON_WIDE}</button>
              `}
          <button
            class="tool"
            type="button"
            aria-pressed=${this.fullscreen ? 'true' : 'false'}
            aria-label=${this.fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title=${this.fullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}
            @click=${() => this.toggleFullscreen()}
          >${this.fullscreen ? ICON_EXIT_FS : ICON_ENTER_FS}</button>
        </div>
      </header>
    `;
  }

  override render() {
    return html`
      ${this._renderToolbar()}
      <div class="body">
      ${this._zoomHudText
        ? html`<div class="zoom-hud" part="zoom-hud" role="status" aria-live="polite">${this._zoomHudText}</div>`
        : null}
      <div
        class="scroller"
        part="scroller"
        tabindex="0"
        role="region"
        aria-label=${this.documentTitle || 'Documento'}
        @pointerdown=${this._onScrollerPointerDown}
        @mousedown=${this._onScrollerPointerDown}
      >
        ${this.viewMode === 'pdf' && this.pdfSource
          ? this._renderPdfContainer()
          : (this._blocks.length
              ? html`<article
                  class="page ${this.readingWidth === 'wide' ? 'wide' : ''}"
                  part="page"
                  style="font-size:${this.fontSize}px"
                  @click=${this._onPageClick}
                >
                  ${this._blocks.map((block, index) => {
                    const page = block.page;
                    const prev = index > 0 ? this._blocks[index - 1].page : undefined;
                    const marker =
                      typeof page === 'number' && page !== prev
                        ? html`<div class="pg" part="page-marker" data-page=${page} data-label=${`p. ${page}`} role="separator" aria-label=${`Página ${page}`}></div>`
                        : null;
                    return html`${marker}${this.renderBlock(block, index)}`;
                  })}
                  <div
                    class="sel-pop"
                    part="selection-popover"
                    ?hidden=${!this._selection || !this._popoverPos || !this._hasPopoverContent}
                    style=${styleMap(
                      this._popoverPos ? { top: `${this._popoverPos.top}px`, left: `${this._popoverPos.left}px` } : {},
                    )}
                  >
                    <slot name="selection-popover" @slotchange=${this._onPopoverSlotChange}></slot>
                  </div>
                </article>`
              : html`<div class="empty"><slot name="empty">Nenhum documento para exibir.</slot></div>`)}

        ${this.viewMode === 'pdf' && this.pdfSource
          ? html`
              <div
                class="sel-pop"
                part="selection-popover"
                ?hidden=${!this._selection || !this._popoverPos || !this._hasPopoverContent}
                style=${styleMap(
                  this._popoverPos ? { top: `${this._popoverPos.top}px`, left: `${this._popoverPos.left}px` } : {},
                )}
              >
                <slot name="selection-popover" @slotchange=${this._onPopoverSlotChange}></slot>
              </div>
            `
          : null}
      </div>
      <aside class="aside" part="aside" ?hidden=${!this.asideOpen || !this._hasAsideContent}>
        <slot name="aside" @slotchange=${this._onAsideSlotChange}></slot>
      </aside>
      </div>
    `;
  }
}

const WORD_CHAR = /[\p{L}\p{N}\p{M}_]/u;
const WORD_JOINER = /['’\-]/;

function isWordAt(text: string, i: number): boolean {
  const ch = text[i];
  if (ch === undefined) return false;
  if (WORD_CHAR.test(ch)) return true;
  // Apostrophe/hyphen inside a word ("d'água", "guarda-chuva").
  return WORD_JOINER.test(ch) && WORD_CHAR.test(text[i - 1] ?? '') && WORD_CHAR.test(text[i + 1] ?? '');
}

/** Expands `[start, end)` so it does not cut words in half. */
export function snapRangeToWords(text: string, start: number, end: number): { start: number; end: number } {
  let s = start;
  let e = end;
  if (isWordAt(text, s)) while (s > 0 && isWordAt(text, s - 1)) s--;
  if (e > 0 && isWordAt(text, e - 1)) while (e < text.length && isWordAt(text, e)) e++;
  return { start: s, end: e };
}

/** Converts a StaticRange (or Range) into a live Range. */
function toLiveRange(range: AbstractRange): Range | null {
  if (typeof Range !== 'undefined' && range instanceof Range) return range;
  try {
    const live = document.createRange();
    live.setStart(range.startContainer, range.startOffset);
    live.setEnd(range.endContainer, range.endOffset);
    return live;
  } catch {
    return null;
  }
}

/** Number of text characters inside `block` before the boundary point (`node`, `offset`). */
function textLengthBefore(block: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  r.setStart(block, 0);
  r.setEnd(node, offset);
  return r.toString().length;
}

/**
 * Extracts selected text from a PDF `.textLayer` DOM range, reconstructing spaces across
 * `<br>` line breaks, vertical line jumps, and horizontal word gaps, while dehyphenating
 * soft line-break hyphens (matching `pdfPagesToBlocks`).
 */
export function extractPdfRangeText(range: Range): string {
  if (!range || range.collapsed) return '';
  if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    return (range.startContainer as Text).data
      .slice(range.startOffset, range.endOffset)
      .replace(/[ \t\r\n]+/g, ' ')
      .trim();
  }

  const root = range.commonAncestorContainer;
  const rootEl = root.nodeType === Node.ELEMENT_NODE ? (root as Element) : root.parentElement;
  const requireTextLayer = Boolean(rootEl?.closest('.textLayer') || rootEl?.querySelector?.('.textLayer'));

  interface Segment {
    text: string;
    rect: DOMRect | null;
    textLayer: Element | null;
    sawBreakBefore: boolean;
  }

  const segments: Segment[] = [];
  let sawBreak = false;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (
        el.classList?.contains('endOfContent') ||
        el.closest?.('.endOfContent') ||
        el.classList?.contains('pdf-page-number') ||
        el.closest?.('.pdf-page-number')
      ) {
        continue;
      }
      if (el.tagName === 'BR') {
        let hit = false;
        try {
          hit = range.intersectsNode(el);
        } catch {
          hit = false;
        }
        if (hit && segments.length > 0) {
          sawBreak = true;
        }
      }
      continue;
    }

    if (node.nodeType !== Node.TEXT_NODE) continue;
    const textNode = node as Text;
    const parentEl = textNode.parentElement;
    if (parentEl?.closest?.('.endOfContent') || parentEl?.closest?.('.pdf-page-number')) continue;
    const textLayer = parentEl?.closest?.('.textLayer') ?? null;
    if (requireTextLayer && !textLayer) continue;

    if (textNode !== range.startContainer && textNode !== range.endContainer) {
      let hit = false;
      try {
        hit = range.intersectsNode(textNode);
      } catch {
        hit = false;
      }
      if (!hit) continue;
    }

    const startOff = textNode === range.startContainer ? range.startOffset : 0;
    const endOff = textNode === range.endContainer ? range.endOffset : textNode.data.length;
    const raw = textNode.data.slice(startOff, endOff);
    if (!raw) continue;

    if (parentEl === textLayer && /^\s+$/.test(raw)) {
      if (/[\r\n]/.test(raw) && segments.length > 0) sawBreak = true;
      continue;
    }

    let rect: DOMRect | null = null;
    try {
      const sub = document.createRange();
      sub.setStart(textNode, startOff);
      sub.setEnd(textNode, endOff);
      const r = sub.getBoundingClientRect?.();
      if (r && r.width > 0 && r.height > 0) rect = r;
    } catch {
      rect = null;
    }
    if (!rect) {
      const pr = parentEl?.getBoundingClientRect?.();
      if (pr && pr.width > 0 && pr.height > 0) rect = pr;
    }

    segments.push({ text: raw, rect, textLayer, sawBreakBefore: sawBreak });
    sawBreak = false;
  }

  if (!segments.length) {
    return range.toString().replace(/[ \t\r\n]+/g, ' ').trim();
  }

  let out = segments[0].text;
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const seg = segments[i];
    let isLineBreak =
      seg.sawBreakBefore || (prev.textLayer != null && seg.textLayer != null && prev.textLayer !== seg.textLayer);
    let needsSpace = false;

    if (!isLineBreak && prev.rect && seg.rect) {
      const lineH = Math.max(prev.rect.height, seg.rect.height);
      const prevMidY = (prev.rect.top + prev.rect.bottom) / 2;
      const segMidY = (seg.rect.top + seg.rect.bottom) / 2;
      if (Math.abs(segMidY - prevMidY) > lineH * 0.5) {
        isLineBreak = true;
      } else if (seg.rect.left - prev.rect.right > lineH * 0.15) {
        needsSpace = true;
      }
    }

    if (isLineBreak) {
      if (/\p{L}-$/u.test(out) && /^\p{Ll}/u.test(seg.text)) {
        out = out.slice(0, -1) + seg.text;
      } else if (!/\s$/.test(out) && !/^\s/.test(seg.text)) {
        out += ` ${seg.text}`;
      } else {
        out += seg.text;
      }
    } else if (needsSpace && !/\s$/.test(out) && !/^\s/.test(seg.text)) {
      out += ` ${seg.text}`;
    } else {
      out += seg.text;
    }
  }

  const normalized = out.replace(/[ \t\r\n]+/g, ' ').trim();
  return normalized || range.toString().replace(/[ \t\r\n]+/g, ' ').trim();
}

/** Finds all occurrences of `needle` inside `haystack`, collapsing runs of whitespace into single spaces. */
function findFlexibleWhitespaceMatches(haystack: string, needle: string): Array<{ start: number; end: number }> {
  const cleanNeedle = needle.replace(/\s+/g, ' ').trim();
  if (!cleanNeedle || !haystack) return [];

  const chars: string[] = [];
  const map: number[] = [];
  let inSpace = false;

  for (let i = 0; i < haystack.length; i++) {
    const ch = haystack[i];
    if (/\s/.test(ch)) {
      if (chars.length > 0 && !inSpace) {
        chars.push(' ');
        map.push(i);
        inSpace = true;
      }
    } else {
      chars.push(ch);
      map.push(i);
      inSpace = false;
    }
  }
  if (inSpace) {
    chars.pop();
    map.pop();
  }

  const norm = chars.join('');
  const results: Array<{ start: number; end: number }> = [];
  let pos = norm.indexOf(cleanNeedle);
  while (pos !== -1) {
    const start = map[pos];
    const end = map[pos + cleanNeedle.length - 1] + 1;
    results.push({ start, end });
    pos = norm.indexOf(cleanNeedle, pos + 1);
  }
  return results;
}

export class FzlLitDocumentReader extends FzlDocumentReader {}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-document-reader')) {
    customElements.define('fzl-document-reader', FzlDocumentReader);
  }
  if (!customElements.get('fzl-lit-document-reader')) {
    customElements.define('fzl-lit-document-reader', FzlLitDocumentReader);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-document-reader': FzlDocumentReader;
    'fzl-lit-document-reader': FzlDocumentReader;
  }
}
