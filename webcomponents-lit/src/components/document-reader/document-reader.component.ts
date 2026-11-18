/**
 * @license
 * FZL Software — Document Reader Web Component
 */
import { LitElement, html, css, svg, unsafeCSS, PropertyValues, TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
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

export * from './document-reader.types';

export type FzlReaderFullscreenMode = 'native' | 'immersive';

export interface FzlReaderFullscreenChangeDetail {
  fullscreen: boolean;
  mode: FzlReaderFullscreenMode | null;
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
 *
 * @slot actions - Extra buttons in the toolbar
 * @slot empty - Content shown when there is no text
 *
 * @csspart toolbar - The top bar
 * @csspart title - The title in the toolbar
 * @csspart scroller - The scrollable area
 * @csspart page - The text column
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
        align-items: center;
        gap: 4px;
        height: 44px;
        padding: 0 6px 0 12px;
        border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0);
        background: var(--_fzl-color-surface, #ffffff);
      }
      :host([compact]) .bar {
        height: 36px;
        padding-left: 10px;
      }
      .heading {
        flex: 1 1 auto;
        min-width: 0;
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
        flex: none;
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .tools ::slotted(*) {
        flex: none;
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
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
    window.removeEventListener('keydown', this._onKeydown);
    if (this.fullscreenMode === 'immersive') this._setFullscreen(null);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('blocks') || changed.has('text')) {
      const blocks = normalizeReaderBlocks(this.blocks);
      this._blocks = blocks.length ? blocks : readerBlocksFromText(this.text);
      this._offsets = readerBlockOffsets(this._blocks);
      this._plainText = readerPlainText(this._blocks);
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

  // ---------------------------------------------------------------- render

  /**
   * Renders the text of one block. Subclasses may override (e.g. to add highlights);
   * the rendered text nodes must contain exactly `block.text`.
   */
  protected renderBlockText(block: FzlReaderBlock, _index: number, _offset: number): unknown {
    return block.text;
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
      >
        ${this._blocks.length
          ? html`<article
              class="page ${this.readingWidth === 'wide' ? 'wide' : ''}"
              part="page"
              style="font-size:${this.fontSize}px"
            >
              ${this._blocks.map((block, index) => this.renderBlock(block, index))}
            </article>`
          : html`<div class="empty"><slot name="empty">Nenhum documento para exibir.</slot></div>`}
      </div>
    `;
  }
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
