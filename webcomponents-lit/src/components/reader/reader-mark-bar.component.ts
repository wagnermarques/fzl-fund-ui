import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

export type FzlMarkBarMode = 'floating' | 'top' | 'bubble';

export interface MarkColorItem {
  id: string;
  name: string;
  bg: string;
  border: string;
  text?: string;
}

export const DEFAULT_MARK_COLORS: MarkColorItem[] = [
  { id: 'yellow', name: 'Amarelo', bg: '#fef08a', border: '#eab308', text: '#713f12' },
  { id: 'green', name: 'Verde', bg: '#bbf7d0', border: '#22c55e', text: '#14532d' },
  { id: 'blue', name: 'Azul', bg: '#bfdbfe', border: '#3b82f6', text: '#1e3a8a' },
  { id: 'pink', name: 'Rosa', bg: '#fbcfe8', border: '#ec4899', text: '#831843' },
  { id: 'purple', name: 'Roxo', bg: '#e9d5ff', border: '#a855f7', text: '#581c87' },
  { id: 'orange', name: 'Laranja', bg: '#fed7aa', border: '#f97316', text: '#7c2d12' },
];

/**
 * Mobile-friendly Reader Selection & Highlight Toolbar Component.
 *
 * Designed to prevent UX conflicts with mobile/Android OS touch-to-search panels,
 * system gesture areas, and native copy popovers by offering 3 ergonomic modes:
 *
 * 1. `floating` (Draggable Floating Island): Elevated pill positioned at `bottom: 76px`
 *    with touch/mouse drag handle and fast vertical flip button (`swap_vert`).
 * 2. `top` (Top Action Bar): Fixed at the top below application headers.
 * 3. `bubble` (Bubble Popover): Anchored dynamically above or below the selection range.
 *
 * @customElement fzl-reader-mark-bar
 * @tag fzl-reader-mark-bar
 */
export class FzlReaderMarkBar extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        position: fixed;
        z-index: 9999;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        user-select: none;
        -webkit-user-select: none;
        pointer-events: none;
        transition: opacity 180ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);
        opacity: 0;
        visibility: hidden;
        transform: scale(0.94);
      }

      :host([visible]) {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
        transform: scale(1);
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      /* Base Toolbar Pill / Island */
      .mark-bar {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        background: rgba(255, 255, 255, 0.94);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border: 1px solid rgba(203, 213, 225, 0.85);
        border-radius: 9999px;
        box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.15),
                    0 4px 10px -2px rgba(0, 0, 0, 0.08);
      }

      /* Mode: Top Bar */
      :host([mode='top']) {
        top: 16px;
        left: 50%;
        transform: translate(-50%, -10px);
      }
      :host([mode='top'][visible]) {
        transform: translate(-50%, 0);
      }

      /* Mode: Floating Island (initial position bottom elevated) */
      :host([mode='floating']) {
        /* Positioned via inline style (top/left) or defaults */
      }

      /* Drag handle */
      .drag-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 28px;
        cursor: grab;
        color: #94a3b8;
        padding: 0 2px;
        border-radius: 6px;
        touch-action: none;
      }

      .drag-handle:active {
        cursor: grabbing;
        color: #475569;
      }

      .drag-handle svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }

      /* Color Swatches Container */
      .colors-group {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .color-btn {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        cursor: pointer;
        padding: 0;
        outline: none;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }

      .color-btn:hover {
        transform: scale(1.18);
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.28);
      }

      .color-btn:active {
        transform: scale(0.95);
      }

      .color-btn:focus-visible {
        box-shadow: 0 0 0 3px var(--_fzl-color-primary, #0284c7);
      }

      /* Separator */
      .divider {
        width: 1px;
        height: 20px;
        background: #e2e8f0;
        margin: 0 2px;
      }

      /* Action Buttons */
      .actions-group {
        display: flex;
        align-items: center;
        gap: 2px;
      }

      .action-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: #475569;
        cursor: pointer;
        font-size: 1rem;
        transition: background-color 140ms ease, color 140ms ease;
        position: relative;
      }

      .action-btn:hover {
        background: #f1f5f9;
        color: #0f172a;
      }

      .action-btn:active {
        background: #e2e8f0;
      }

      .action-btn:focus-visible {
        outline: 2px solid var(--_fzl-color-primary, #0284c7);
      }

      .action-btn svg {
        width: 17px;
        height: 17px;
        fill: currentColor;
      }

      /* Tooltip feedback */
      .feedback-badge {
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: #0f172a;
        color: #ffffff;
        font-size: 0.75rem;
        padding: 3px 8px;
        border-radius: 6px;
        white-space: nowrap;
        pointer-events: none;
        animation: fadeInOut 1.5s forwards;
      }

      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, 4px); }
        15% { opacity: 1; transform: translate(-50%, 0); }
        85% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -4px); }
      }

      /* Bubble Arrow */
      .bubble-arrow {
        display: none;
        position: absolute;
        width: 10px;
        height: 10px;
        background: rgba(255, 255, 255, 0.94);
        border-right: 1px solid rgba(203, 213, 225, 0.85);
        border-bottom: 1px solid rgba(203, 213, 225, 0.85);
        transform: rotate(45deg);
      }

      :host([mode='bubble']) .bubble-arrow {
        display: block;
      }
      :host([mode='bubble'][arrow='bottom']) .bubble-arrow {
        bottom: -6px;
        left: calc(50% - 5px);
      }
      :host([mode='bubble'][arrow='top']) .bubble-arrow {
        top: -6px;
        left: calc(50% - 5px);
        transform: rotate(225deg);
      }

      /* High Contrast */
      @media (forced-colors: active) {
        .mark-bar {
          background: Canvas;
          border: 2px solid CanvasText;
        }
        .action-btn, .drag-handle {
          color: CanvasText;
        }
        .color-btn {
          border: 2px solid CanvasText;
        }
      }
    `
  ];

  @property({ type: String, reflect: true }) mode: FzlMarkBarMode = 'floating';
  @property({ type: Boolean, reflect: true }) visible = false;
  @property({
    type: Array,
    converter: {
      fromAttribute(value: string | null): MarkColorItem[] {
        if (!value || typeof value !== 'string') return DEFAULT_MARK_COLORS;
        const trimmed = value.trim();
        if (!trimmed || trimmed === 'DEFAULT_MARK_COLORS') return DEFAULT_MARK_COLORS;
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MARK_COLORS;
        } catch {
          return DEFAULT_MARK_COLORS;
        }
      },
      toAttribute(value: MarkColorItem[] | null | undefined): string | null {
        if (!value || !Array.isArray(value)) return null;
        return JSON.stringify(value);
      },
    },
  })
  colors: MarkColorItem[] = [...DEFAULT_MARK_COLORS];
  @property({ type: String, attribute: 'selected-text' }) selectedText = '';
  @property({ type: String }) target = '';
  @property({ type: Boolean, attribute: 'watch-selection' }) watchSelection = false;

  @state() private _posX: number | null = null;
  @state() private _posY: number | null = null;
  @state() private _copied = false;
  @state() private _isTopFlipped = false;

  private _isDragging = false;
  private _dragStartX = 0;
  private _dragStartY = 0;
  private _initialPosX = 0;
  private _initialPosY = 0;
  private _boundSelectionHandler?: () => void;
  private _activeRange: Range | null = null;

  override connectedCallback() {
    super.connectedCallback();
    if (this.watchSelection || this.target) {
      this._bindSelectionWatcher();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unbindSelectionWatcher();
  }

  private _bindSelectionWatcher() {
    this._boundSelectionHandler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        if (!this._isDragging) {
          // Keep visible briefly if user just clicked inside bar
        }
        return;
      }

      const text = sel.toString().trim();
      if (text.length === 0) return;

      // Check target scope if specified
      if (this.target) {
        const root = this.getRootNode() as Document | ShadowRoot;
        const targetEl = root.querySelector(this.target) || document.querySelector(this.target);
        if (targetEl && !targetEl.contains(sel.anchorNode)) {
          return;
        }
      }

      const range = sel.getRangeAt(0);
      this._activeRange = range.cloneRange();
      const rect = range.getBoundingClientRect();
      this.showAt(rect, text);
    };

    document.addEventListener('selectionchange', this._boundSelectionHandler);
  }

  private _unbindSelectionWatcher() {
    if (this._boundSelectionHandler) {
      document.removeEventListener('selectionchange', this._boundSelectionHandler);
      this._boundSelectionHandler = undefined;
    }
  }

  /**
   * Shows the mark bar and calculates initial position based on current mode.
   */
  showAt(rect?: DOMRect, text?: string) {
    if (text !== undefined) {
      this.selectedText = text;
    }
    this.visible = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const barWidth = 330;
    const barHeight = 44;

    if (this.mode === 'floating') {
      if (this._posX === null || this._posY === null) {
        // Safe elevated default: 76px from bottom, centered
        const defaultLeft = Math.max(16, (vw - barWidth) / 2);
        const defaultTop = Math.max(16, vh - barHeight - 76);
        this._posX = defaultLeft;
        this._posY = defaultTop;
      }
      this.style.left = `${this._posX}px`;
      this.style.top = `${this._posY}px`;
      this.style.bottom = 'auto';
      this.style.right = 'auto';
    } else if (this.mode === 'bubble' && rect) {
      // Anchored bubble above or below selection
      let top = rect.top - barHeight - 10;
      let arrow: 'top' | 'bottom' = 'bottom';

      if (top < 10) {
        // Flip below
        top = rect.bottom + 10;
        arrow = 'top';
      }

      let left = rect.left + rect.width / 2 - barWidth / 2;
      left = Math.max(12, Math.min(left, vw - barWidth - 12));

      this.setAttribute('arrow', arrow);
      this.style.top = `${top}px`;
      this.style.left = `${left}px`;
    }
  }

  hide() {
    this.visible = false;
    this.emit('fzl-bar-close', { selectedText: this.selectedText });
  }

  /**
   * Flips position between elevated bottom and top in floating mode.
   */
  toggleVerticalPosition() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const barWidth = 330;
    const barHeight = 44;

    this._isTopFlipped = !this._isTopFlipped;
    const defaultLeft = Math.max(16, (vw - barWidth) / 2);

    if (this._isTopFlipped) {
      // Jump to top
      this._posX = defaultLeft;
      this._posY = 70;
    } else {
      // Jump to bottom-elevated (76px above bottom)
      this._posX = defaultLeft;
      this._posY = vh - barHeight - 76;
    }

    this.style.left = `${this._posX}px`;
    this.style.top = `${this._posY}px`;
  }

  // Pointer Drag Handlers
  private _handlePointerDown(e: PointerEvent) {
    if (this.mode !== 'floating') return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    this._isDragging = true;
    this._dragStartX = e.clientX;
    this._dragStartY = e.clientY;
    this._initialPosX = this._posX ?? this.getBoundingClientRect().left;
    this._initialPosY = this._posY ?? this.getBoundingClientRect().top;
  }

  private _handlePointerMove(e: PointerEvent) {
    if (!this._isDragging) return;

    const deltaX = e.clientX - this._dragStartX;
    const deltaY = e.clientY - this._dragStartY;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const barWidth = 330;
    const barHeight = 44;

    let nextX = this._initialPosX + deltaX;
    let nextY = this._initialPosY + deltaY;

    // Viewport boundary clamp
    nextX = Math.max(8, Math.min(nextX, vw - barWidth - 8));
    nextY = Math.max(8, Math.min(nextY, vh - barHeight - 8));

    this._posX = nextX;
    this._posY = nextY;
    this.style.left = `${nextX}px`;
    this.style.top = `${nextY}px`;
  }

  private _handlePointerUp(e: PointerEvent) {
    if (!this._isDragging) return;
    this._isDragging = false;
    const target = e.currentTarget as HTMLElement;
    try {
      target.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
    this.emit('fzl-drag-end', { x: this._posX, y: this._posY });
  }

  private _handleColorClick(color: MarkColorItem) {
    this.emit('fzl-mark', {
      color,
      action: 'highlight',
      text: this.selectedText,
      range: this._activeRange,
    });
  }

  private _handleActionClick(action: string) {
    if (action === 'copy' && this.selectedText) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.selectedText).catch(() => {});
      }
      this._copied = true;
      setTimeout(() => {
        this._copied = false;
      }, 1500);
    }

    this.emit('fzl-reader-action', {
      action,
      text: this.selectedText,
      range: this._activeRange,
    });
  }

  override render() {
    const activeColors = Array.isArray(this.colors) && this.colors.length > 0 ? this.colors : DEFAULT_MARK_COLORS;

    return html`
      <div class="mark-bar" role="toolbar" aria-label="Ações de marcação de texto">
        ${this.mode === 'floating'
          ? html`
              <div
                class="drag-handle"
                title="Arrastar barra de cores"
                aria-label="Arrastar barra de cores"
                @pointerdown=${this._handlePointerDown}
                @pointermove=${this._handlePointerMove}
                @pointerup=${this._handlePointerUp}
                @pointercancel=${this._handlePointerUp}
              >
                <!-- Material drag indicator icon -->
                <svg viewBox="0 0 24 24">
                  <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </div>
            `
          : ''}

        <!-- Color Swatches -->
        <div class="colors-group" role="group" aria-label="Cores de destaque">
          ${activeColors.map(
            (c) => html`
              <button
                type="button"
                class="color-btn"
                style="background: ${c.bg}; border-color: ${c.border};"
                title="Marcar com ${c.name}"
                aria-label="Marcar com ${c.name}"
                @click=${() => this._handleColorClick(c)}
              ></button>
            `
          )}
        </div>

        <div class="divider" aria-hidden="true"></div>

        <!-- Action Tools -->
        <div class="actions-group" role="group" aria-label="Ferramentas de leitura">
          <!-- Sublinhar -->
          <button
            type="button"
            class="action-btn"
            title="Sublinhar texto"
            aria-label="Sublinhar texto"
            @click=${() => this._handleActionClick('underline')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
            </svg>
          </button>

          <!-- Adicionar Nota -->
          <button
            type="button"
            class="action-btn"
            title="Adicionar nota / reflexão"
            aria-label="Adicionar nota"
            @click=${() => this._handleActionClick('note')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
          </button>

          <!-- Copiar -->
          <button
            type="button"
            class="action-btn"
            title="Copiar trecho"
            aria-label="Copiar trecho selecionado"
            @click=${() => this._handleActionClick('copy')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            ${this._copied ? html`<div class="feedback-badge">Copiado!</div>` : ''}
          </button>

          <!-- Compartilhar -->
          <button
            type="button"
            class="action-btn"
            title="Compartilhar versículo"
            aria-label="Compartilhar versículo"
            @click=${() => this._handleActionClick('share')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>

          <!-- Limpar Marcação -->
          <button
            type="button"
            class="action-btn"
            title="Remover marcação"
            aria-label="Remover marcação do trecho"
            @click=${() => this._handleActionClick('clear')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19.36 10.04l-7.4-7.4c-.78-.78-2.05-.78-2.83 0L3.26 8.51c-.78.78-.78 2.05 0 2.83l7.4 7.4c.78.78 2.05.78 2.83 0l5.87-5.87c.78-.78.78-2.05 0-2.83zm-1.41 1.41l-5.87 5.87c-.2.2-.51.2-.71 0l-5.99-5.99c-.2-.2-.2-.51 0-.71l5.87-5.87c.2-.2.51-.2.71 0l5.99 5.99c.2.2.2.51 0 .71zM15 19H9v2h6v-2z"/>
            </svg>
          </button>

          ${this.mode === 'floating'
            ? html`
                <!-- Flip posição vertical (Topo / Rodapé elevado) -->
                <button
                  type="button"
                  class="action-btn"
                  title="Alternar topo/base"
                  aria-label="Alternar posição da barra entre topo e base"
                  @click=${this.toggleVerticalPosition}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z"/>
                  </svg>
                </button>
              `
            : ''}

          <!-- Fechar -->
          <button
            type="button"
            class="action-btn"
            title="Fechar barra"
            aria-label="Fechar barra de cores"
            @click=${this.hide}
          >
            <svg viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="bubble-arrow"></div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-reader-mark-bar')) {
  customElements.define('fzl-reader-mark-bar', FzlReaderMarkBar);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-reader-mark-bar': FzlReaderMarkBar;
  }
}
