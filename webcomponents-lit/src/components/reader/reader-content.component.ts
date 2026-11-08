import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import './reader-mark-bar.component';
import type { FzlReaderMarkBar } from './reader-mark-bar.component';

export interface AppliedHighlight {
  id: string;
  verseIndex: number;
  colorId: string;
  bg: string;
  text: string;
  createdAt: number;
}

const DEFAULT_PASSAGE = [
  {
    num: 1,
    text: 'O Senhor é o meu pastor; de nada terei falta.',
  },
  {
    num: 2,
    text: 'Em verdes pastagens me faz repousar e me conduz a águas tranquilas;',
  },
  {
    num: 3,
    text: 'restaura-me o vigor. Guia-me nas veredas da justiça por amor do seu nome.',
  },
  {
    num: 4,
    text: 'Mesmo quando eu andar por um vale de trevas e morte, não temerei perigo algum, pois tu estás comigo; a tua vara e o teu cajado me protegem.',
  },
  {
    num: 5,
    text: 'Preparas um banquete para mim à vista dos meus inimigos. Tu unges a minha cabeça com óleo, e o meu cálice transborda.',
  },
  {
    num: 6,
    text: 'Sei que a bondade e a fidelidade me acompanharão todos os dias da minha vida, e voltarei à casa do Senhor enquanto eu viver.',
  },
];

/**
 * Reader Content Container with live text selection and highlight rendering.
 *
 * Designed to showcase biblical passages, articles, and reading views with seamless
 * integration to `<fzl-reader-mark-bar>`.
 *
 * @customElement fzl-reader-content
 * @tag fzl-reader-content
 */
export class FzlReaderContent extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        width: 100%;
        max-width: 760px;
        margin: 0 auto;
        font-family: var(--_fzl-font-family, system-ui, sans-serif);
        color: var(--_fzl-color-text, #0f172a);
        line-height: 1.8;
        box-sizing: border-box;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      .reader-header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0);
      }

      .passage-title {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0 0 4px;
        color: var(--_fzl-color-text, #0f172a);
      }

      .passage-meta {
        font-size: 0.85rem;
        color: var(--_fzl-color-text-muted, #64748b);
        margin: 0;
      }

      /* Verses Container */
      .verses-container {
        font-size: 1.15rem;
        position: relative;
      }

      .verse {
        display: inline;
        margin-right: 6px;
        cursor: text;
      }

      .verse-num {
        font-size: 0.72rem;
        font-weight: 700;
        color: var(--_fzl-color-primary, #0284c7);
        vertical-align: super;
        margin-right: 4px;
        user-select: none;
        -webkit-user-select: none;
      }

      /* Highlighted marks */
      mark.highlighted {
        border-radius: 4px;
        padding: 2px 2px;
        cursor: pointer;
        transition: filter 120ms ease;
      }

      mark.highlighted:hover {
        filter: brightness(0.92);
      }

      mark.underlined {
        background: transparent !important;
        text-decoration: underline wavy var(--_fzl-color-primary, #0284c7);
        text-underline-offset: 4px;
        text-decoration-thickness: 2px;
      }

      /* Mode Switcher toolbar */
      .reader-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border: 1px solid var(--_fzl-color-border, #e2e8f0);
        border-radius: 10px;
        margin-bottom: 24px;
        font-size: 0.82rem;
      }

      .mode-chips {
        display: flex;
        gap: 6px;
      }

      .mode-chip {
        background: #ffffff;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: 16px;
        padding: 4px 10px;
        font-size: 0.78rem;
        cursor: pointer;
        font-family: inherit;
        color: #334155;
        transition: all 140ms ease;
      }

      .mode-chip.active {
        background: var(--_fzl-color-primary, #0284c7);
        color: #ffffff;
        border-color: var(--_fzl-color-primary, #0284c7);
        font-weight: 600;
      }

      .clear-all-btn {
        background: transparent;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 0.78rem;
        font-weight: 500;
      }

      .clear-all-btn:hover {
        text-decoration: underline;
      }
    `
  ];

  @property({ type: String, attribute: 'passage-title' }) passageTitle = 'Salmos 23';
  @property({ type: String, attribute: 'passage-meta' }) passageMeta = 'Nova Versão Internacional (NVI)';
  @property({ type: String }) mode: 'floating' | 'top' | 'bubble' = 'floating';
  @property({ type: Array }) verses = DEFAULT_PASSAGE;

  @query('fzl-reader-mark-bar') private _markBar!: FzlReaderMarkBar;
  @query('.verses-container') private _versesContainer!: HTMLElement;

  override firstUpdated() {
    this._attachSelectionListeners();
  }

  private _attachSelectionListeners() {
    this.addEventListener('pointerup', () => {
      this._checkSelection();
    });
    this.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.key === 'Shift' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        this._checkSelection();
      }
    });
  }

  private _checkSelection() {
    // Small delay to ensure browser selection finishes
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        return;
      }

      const text = sel.toString().trim();
      if (!text || text.length === 0) return;

      const range = sel.getRangeAt(0);
      const container = this._versesContainer;
      if (!container) return;

      // Ensure selection is inside this reader
      if (!container.contains(range.commonAncestorContainer) && container !== range.commonAncestorContainer) {
        return;
      }

      const rect = range.getBoundingClientRect();

      if (this._markBar) {
        this._markBar.showAt(rect, text);
      }
      this.emit('fzl-text-selected', { text, rect });
    }, 40);
  }

  private _handleMarkColor(e: CustomEvent) {
    const { color } = e.detail;
    this._applyHighlight(color.bg, color.id);
  }

  private _handleReaderAction(e: CustomEvent) {
    const { action } = e.detail;
    if (action === 'underline') {
      this._applyUnderline();
    } else if (action === 'clear') {
      this._clearSelectionHighlight();
    }
  }

  private _applyHighlight(bgColor: string, colorId: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    try {
      const range = sel.getRangeAt(0);
      const mark = document.createElement('mark');
      mark.className = 'highlighted';
      mark.style.backgroundColor = bgColor;
      mark.setAttribute('data-color-id', colorId);
      mark.setAttribute('title', 'Clique para remover destaque');
      mark.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this._unwrapMark(mark);
      });

      // Wrap selected range
      mark.appendChild(range.extractContents());
      range.insertNode(mark);

      sel.removeAllRanges();
      if (this._markBar) this._markBar.hide();

      this.emit('fzl-mark-applied', { color: colorId, text: mark.textContent });
    } catch {
      // Range split across complex nodes
    }
  }

  private _applyUnderline() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    try {
      const range = sel.getRangeAt(0);
      const mark = document.createElement('mark');
      mark.className = 'highlighted underlined';
      mark.setAttribute('title', 'Clique para remover sublinhado');
      mark.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this._unwrapMark(mark);
      });

      mark.appendChild(range.extractContents());
      range.insertNode(mark);

      sel.removeAllRanges();
      if (this._markBar) this._markBar.hide();
    } catch {
      // Ignored
    }
  }

  private _unwrapMark(mark: HTMLElement) {
    const parent = mark.parentNode;
    while (mark.firstChild) {
      parent?.insertBefore(mark.firstChild, mark);
    }
    parent?.removeChild(mark);
  }

  private _clearSelectionHighlight() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Check if cursor or selection is inside a mark
    let node: Node | null = sel.anchorNode;
    while (node && node !== this) {
      if (node.nodeName === 'MARK') {
        this._unwrapMark(node as HTMLElement);
        break;
      }
      node = node.parentNode;
    }
    sel.removeAllRanges();
    if (this._markBar) this._markBar.hide();
  }

  private _handleClearAll() {
    const marks = Array.from(this.renderRoot.querySelectorAll('mark.highlighted'));
    for (const m of marks) {
      this._unwrapMark(m as HTMLElement);
    }
  }

  private _setMode(mode: 'floating' | 'top' | 'bubble') {
    this.mode = mode;
    if (this._markBar) {
      this._markBar.mode = mode;
    }
  }

  override render() {
    return html`
      <div class="reader-header">
        <h2 class="passage-title">${this.passageTitle}</h2>
        <p class="passage-meta">${this.passageMeta}</p>
      </div>

      <!-- Mode selection controls -->
      <div class="reader-toolbar">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 600; color: #475569;">Modo da Barra:</span>
          <div class="mode-chips">
            <button
              type="button"
              class="mode-chip ${this.mode === 'floating' ? 'active' : ''}"
              @click=${() => this._setMode('floating')}
              title="Pílula flutuante arrastável (elevada da base)"
            >
              1. Pílula Flutuante (Arrastável)
            </button>
            <button
              type="button"
              class="mode-chip ${this.mode === 'top' ? 'active' : ''}"
              @click=${() => this._setMode('top')}
              title="Barra de ação no topo da tela"
            >
              2. Barra no Topo
            </button>
            <button
              type="button"
              class="mode-chip ${this.mode === 'bubble' ? 'active' : ''}"
              @click=${() => this._setMode('bubble')}
              title="Balão ancorado sobre a seleção"
            >
              3. Balão Ancorado
            </button>
          </div>
        </div>

        <button type="button" class="clear-all-btn" @click=${this._handleClearAll}>
          Limpar Todos os Grifos
        </button>
      </div>

      <!-- Verses text area -->
      <div class="verses-container" role="article" aria-label="Texto de leitura bíblica">
        ${this.verses.map(
          (v) => html`
            <span class="verse" data-verse=${v.num}>
              <span class="verse-num">${v.num}</span>${v.text}
            </span>
          `
        )}
      </div>

      <!-- Selection & Mark Bar -->
      <fzl-reader-mark-bar
        .mode=${this.mode}
        @fzl-mark=${this._handleMarkColor}
        @fzl-reader-action=${this._handleReaderAction}
      ></fzl-reader-mark-bar>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-reader-content')) {
  customElements.define('fzl-reader-content', FzlReaderContent);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-reader-content': FzlReaderContent;
  }
}
