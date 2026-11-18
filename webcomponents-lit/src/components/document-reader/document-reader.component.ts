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
  FzlReaderBlock,
  FzlReaderWidth,
  normalizeReaderBlocks,
  readerBlocksFromText,
  readerBlockOffsets,
  readerPlainText,
} from './document-reader.types';
import { buildTextQuote, FZL_READER_CONTEXT_LENGTH } from './document-reader.anchoring';

export * from './document-reader.types';
export * from './document-reader.anchoring';

export type FzlReaderFullscreenMode = 'native' | 'immersive';

export interface FzlReaderFullscreenChangeDetail {
  fullscreen: boolean;
  mode: FzlReaderFullscreenMode | null;
}

/** A highlight drawn over the canonical plain text (`reader.plainText`). */
export interface FzlReaderAnnotation {
  id: string;
  start: number;
  end: number;
  /** Any CSS color. Default: `--fzl-reader-highlight` (yellow). */
  color?: string;
  /** Tooltip. */
  title?: string;
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
  /** Viewport rect of the selection (for positioning UI). */
  rect: FzlReaderSelectionRect | null;
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
const ICON_NARROW = icon(svg`<path fill="currentColor" d="M7 5h10v2H7zm0 12h10v2H7zM3 11l4 1-4 1v-2zm18 0v2l-4-1 4-1zM9 11h6v2H9z"/>`);

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
 *
 * @slot actions - Extra buttons in the toolbar
 * @slot empty - Content shown when there is no text
 * @slot selection-popover - Small UI shown under the current selection (e.g. title field + Save)
 *
 * @csspart toolbar - The top bar
 * @csspart title - The title in the toolbar
 * @csspart scroller - The scrollable area
 * @csspart page - The text column
 * @csspart selection-popover - Container of the `selection-popover` slot
 * @csspart annotation - Each highlight `<mark>`
 *
 * @cssprop --fzl-reader-height - Host height (default 100%)
 * @cssprop --fzl-reader-font-family - Font of the text
 * @cssprop --fzl-reader-z-index - z-index of the immersive overlay
 */
export class FzlDocumentReader extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: flex;
        flex-direction: column;
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

      .scroller {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
      }
      .scroller:focus-visible {
        outline: 2px solid var(--_fzl-color-primary, #2563eb);
        outline-offset: -2px;
      }
      .page {
        position: relative;
        margin: 0 auto;
        padding: 24px 20px 64px;
        max-width: 72ch;
        font-family: var(--fzl-reader-font-family, Georgia, 'Times New Roman', serif);
        line-height: 1.7;
        overflow-wrap: break-word;
      }
      .page.wide {
        max-width: 120ch;
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

  private _offsets: number[] = [];
  private _plainText = '';
  private _savedRootOverflow: string | null = null;
  private _usingPopover = false;
  private _annotations: (FzlReaderAnnotation & { pending?: boolean })[] = [];
  private _pointerSelecting = false;
  private _lastPointerInPopover = false;
  private _selectionTimer: ReturnType<typeof setTimeout> | null = null;

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
    window.addEventListener('pointercancel', this._onPointerUp, true);
    window.addEventListener('pointerdown', this._onWindowPointerDown, true);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
    window.removeEventListener('keydown', this._onKeydown);
    document.removeEventListener('selectionchange', this._onSelectionChange);
    window.removeEventListener('pointerup', this._onPointerUp, true);
    window.removeEventListener('pointercancel', this._onPointerUp, true);
    window.removeEventListener('pointerdown', this._onWindowPointerDown, true);
    if (this._selectionTimer) clearTimeout(this._selectionTimer);
    if (this.fullscreenMode === 'immersive') this._setFullscreen(null);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
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

    let rect: FzlReaderSelectionRect | null = null;
    try {
      const r = live.getBoundingClientRect?.();
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
      rect,
    };
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
      let ranges: StaticRange[] | undefined;
      try {
        ranges = composed.getComposedRanges({ shadowRoots: [root] });
      } catch {
        try {
          ranges = composed.getComposedRanges(root);
        } catch {
          ranges = undefined;
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

  private _onWindowPointerDown = (event: PointerEvent) => {
    this._lastPointerInPopover = this._isInPopover(event);
  };

  private _onScrollerPointerDown = (event: PointerEvent) => {
    if (this._isInPopover(event)) return;
    this._pointerSelecting = true;
  };

  private _onPointerUp = () => {
    if (!this._pointerSelecting) return;
    this._pointerSelecting = false;
    this._scheduleSelectionRead(0);
  };

  private _onSelectionChange = () => {
    if (this._pointerSelecting) return; // read once, when the pointer is released
    this._scheduleSelectionRead(150);
  };

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
    const detail = range ? this.rangeToSelection(range) : null;
    if (detail) {
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

  /** Scrolls to an annotation and flashes it. Returns `false` if it is not rendered. */
  async scrollToAnnotation(id: string, behavior: ScrollBehavior = 'smooth'): Promise<boolean> {
    await this.updateComplete;
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
      <div
        class="scroller"
        part="scroller"
        tabindex="0"
        role="region"
        aria-label=${this.documentTitle || 'Documento'}
        @pointerdown=${this._onScrollerPointerDown}
      >
        ${this._blocks.length
          ? html`<article
              class="page ${this.readingWidth === 'wide' ? 'wide' : ''}"
              part="page"
              style="font-size:${this.fontSize}px"
              @click=${this._onPageClick}
            >
              ${this._blocks.map((block, index) => this.renderBlock(block, index))}
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
          : html`<div class="empty"><slot name="empty">Nenhum documento para exibir.</slot></div>`}
      </div>
    `;
  }
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
