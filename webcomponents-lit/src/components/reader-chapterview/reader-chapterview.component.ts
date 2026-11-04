import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin, FzlKeyNavController } from '@fzl/core';

export type FzlChipVariant = 'default' | 'filter' | 'input' | 'pill';
export type FzlChipSelectionMode = 'single' | 'multiple' | 'none';

export interface FzlChipItem {
  id?: string;
  value?: string;
  label: string;
  count?: number;
  selected?: boolean;
  removable?: boolean;
  disabled?: boolean;
  color?: string;
  [key: string]: unknown;
}

/**
 * Reactive Lit-based Custom Element representing a Chip / Tag / Badge for readers,
 * filter bars, category pickers, and chapter views.
 *
 * @customElement fzl-reader-chapterview
 * @tag fzl-reader-chapterview
 *
 * @fires {CustomEvent<{ originalEvent: Event; value: string; label: string; selected: boolean }>} fzl-click - Dispatched when the chip is activated
 * @fires {CustomEvent<{ originalEvent: Event; value: string; label: string }>} fzl-remove - Dispatched when the removal button is clicked
 *
 * @slot - Content to be displayed inside the chip (defaults to `label`)
 * @slot icon - Optional leading icon
 *
 * @csspart chip - The main chip button container
 * @csspart label - The label text span
 * @csspart count - The numeric count badge
 * @csspart remove - The removal button
 */
@customElement('fzl-reader-chapterview')
export class FzlReaderChapterView extends FzlWidgetMixin(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      :host([hidden]) {
        display: none !important;
      }

      .chip {
        font-family: var(--_fzl-font-family);
        font-weight: var(--_fzl-font-weight-medium, 500);
        line-height: var(--_fzl-line-height, 1.4);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--_fzl-space-1, 4px);
        padding: var(--_fzl-space-1, 4px) var(--_fzl-space-3, 12px);
        border-radius: var(--_fzl-radius-full, 9999px);
        border: 1px solid var(--_fzl-color-border, #cac4cf);
        background-color: var(--_fzl-color-surface, #fffbfe);
        color: var(--_fzl-color-text, #1c1b1f);
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        cursor: pointer;
        user-select: none;
        transition: background-color var(--_fzl-transition-fast, 0.15s ease),
          border-color var(--_fzl-transition-fast, 0.15s ease),
          color var(--_fzl-transition-fast, 0.15s ease),
          box-shadow var(--_fzl-transition-fast, 0.15s ease);
        box-sizing: border-box;
        text-decoration: none;
        outline: none;
      }

      .chip:hover:not(:disabled) {
        background-color: var(--_fzl-color-surface-hover, rgba(103, 80, 164, 0.08));
        border-color: var(--_fzl-color-primary, #6750a4);
      }

      .chip:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring, 0 0 0 3px rgba(103, 80, 164, 0.35));
        border-color: var(--_fzl-color-primary, #6750a4);
      }

      /* Selected state */
      :host([selected]) .chip,
      .chip.selected {
        background-color: var(--_fzl-color-primary, #6750a4);
        color: var(--_fzl-color-primary-contrast, #ffffff);
        border-color: var(--_fzl-color-primary, #6750a4);
      }

      :host([selected]) .chip:hover:not(:disabled),
      .chip.selected:hover:not(:disabled) {
        background-color: var(--_fzl-color-primary-hover, #533e8b);
        border-color: var(--_fzl-color-primary-hover, #533e8b);
      }

      /* Disabled state */
      :host([disabled]) .chip,
      .chip:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: none;
      }

      /* Numeric count badge */
      .count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0 6px;
        min-width: 16px;
        height: 16px;
        border-radius: var(--_fzl-radius-full, 9999px);
        background-color: rgba(0, 0, 0, 0.08);
        color: inherit;
        box-sizing: border-box;
      }

      :host([selected]) .count,
      .chip.selected .count {
        background-color: rgba(255, 255, 255, 0.25);
        color: #ffffff;
      }

      /* Removal button */
      .remove-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        margin-left: 2px;
        border: none;
        background: transparent;
        color: inherit;
        border-radius: 50%;
        cursor: pointer;
        padding: 0;
        font-size: 0.95rem;
        line-height: 1;
        transition: background-color 0.12s ease;
      }

      .remove-btn:hover {
        background-color: rgba(0, 0, 0, 0.15);
      }

      :host([selected]) .remove-btn:hover {
        background-color: rgba(255, 255, 255, 0.3);
      }

      .remove-btn:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 1px;
      }

      /* High contrast support */
      @media (forced-colors: active) {
        .chip {
          forced-color-adjust: none;
          border: 2px solid ButtonText;
          background-color: ButtonFace;
          color: ButtonText;
        }

        :host([selected]) .chip,
        .chip.selected {
          background-color: Highlight;
          color: HighlightText;
          border-color: Highlight;
        }

        .chip:focus-visible {
          outline: 3px solid Highlight;
        }
      }
    `,
  ];

  /** Chip text label */
  @property({ type: String })
  label: string = '';

  /** Identifier value for events and selection */
  @property({ type: String })
  value: string = '';

  /** Whether the chip is active/selected */
  @property({ type: Boolean, reflect: true })
  selected: boolean = false;

  /** Optional count badge to display next to the label */
  @property({ type: Number })
  count?: number;

  /** Whether to show a removal button (×) */
  @property({ type: Boolean, reflect: true })
  removable: boolean = false;

  /** Disabled state */
  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  /** Style variant */
  @property({ type: String, reflect: true })
  variant: FzlChipVariant = 'default';

  /** Optional custom background or accent color */
  @property({ type: String })
  color: string = '';

  /** Accessible label for the remove button */
  @property({ type: String, attribute: 'remove-aria-label' })
  removeAriaLabel: string = 'Remover';

  private _handleClick(event: MouseEvent) {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    this.emit('fzl-click', {
      originalEvent: event,
      value: this.value || this.label,
      label: this.label,
      selected: this.selected,
    });
  }

  private _handleKeydown(event: KeyboardEvent) {
    if (this.disabled) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.emit('fzl-click', {
        originalEvent: event,
        value: this.value || this.label,
        label: this.label,
        selected: this.selected,
      });
    }
  }

  private _handleRemove(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    if (this.disabled) return;
    this.emit('fzl-remove', {
      originalEvent: event,
      value: this.value || this.label,
      label: this.label,
    });
  }

  override render() {
    const inlineStyle = this.color
      ? this.selected
        ? `background-color: ${this.color}; border-color: ${this.color}; color: #ffffff;`
        : `border-color: ${this.color}; color: ${this.color};`
      : '';

    return html`
      <button
        type="button"
        part="chip"
        class="chip ${this.selected ? 'selected' : ''}"
        style=${inlineStyle}
        ?disabled=${this.disabled}
        aria-pressed=${this.selected ? 'true' : 'false'}
        @click=${this._handleClick}
        @keydown=${this._handleKeydown}
      >
        <slot name="icon"></slot>
        <span part="label" class="label"><slot>${this.label}</slot></span>
        ${this.count !== undefined && this.count !== null
          ? html`<span part="count" class="count">${this.count}</span>`
          : ''}
        ${this.removable
          ? html`
              <button
                type="button"
                part="remove"
                class="remove-btn"
                aria-label=${this.removeAriaLabel}
                title=${this.removeAriaLabel}
                @click=${this._handleRemove}
              >
                ×
              </button>
            `
          : ''}
      </button>
    `;
  }
}

/**
 * Group container for FzlReaderChapterView chips with support for single or
 * multiple selection, wrapping, and keyboard roving navigation.
 *
 * @customElement fzl-reader-chapterview-group
 * @tag fzl-reader-chapterview-group
 *
 * @fires {CustomEvent<{ selected: string | string[]; item?: FzlChipItem; value: string }>} fzl-change - Dispatched when selection changes
 *
 * @slot - Child chips or other content
 */
@customElement('fzl-reader-chapterview-group')
export class FzlReaderChapterViewGroup extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2, 8px);
      }

      :host([wrap]),
      .group.wrap {
        flex-wrap: wrap;
      }

      .group {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2, 8px);
        width: 100%;
      }

      .group.wrap {
        flex-wrap: wrap;
      }
    `,
  ];

  /** Array of items when configured declaratively */
  @property({ type: Array })
  items: FzlChipItem[] = [];

  /** Selection behavior */
  @property({ type: String, attribute: 'selection-mode' })
  selectionMode: FzlChipSelectionMode = 'single';

  /** Selected value (string for single, array for multiple) */
  @property({ type: [String, Array] })
  selected: string | string[] = '';

  /** Whether chips wrap to multiple lines */
  @property({ type: Boolean, reflect: true })
  wrap: boolean = true;

  /** Accessible label for the group */
  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel: string | null = 'Grupo de opções';

  private _keyNav = new FzlKeyNavController(this, {
    orientation: 'both',
    wrap: true,
    getItems: () =>
      Array.from(
        this.renderRoot.querySelectorAll('fzl-reader-chapterview, button.chip, [part="chip"]') as NodeListOf<HTMLElement>
      ),
  });

  private _onItemClick(item: FzlChipItem) {
    const itemVal = item.value || item.id || item.label;
    if (this.selectionMode === 'none') {
      this.emit('fzl-change', { selected: this.selected, item, value: itemVal });
      return;
    }

    if (this.selectionMode === 'single') {
      const newSel = this.selected === itemVal ? '' : itemVal;
      this.selected = newSel;
      this.emit('fzl-change', { selected: newSel, item, value: itemVal });
    } else if (this.selectionMode === 'multiple') {
      const arr = Array.isArray(this.selected) ? [...this.selected] : this.selected ? [this.selected] : [];
      const idx = arr.indexOf(itemVal);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        arr.push(itemVal);
      }
      this.selected = arr;
      this.emit('fzl-change', { selected: arr, item, value: itemVal });
    }
  }

  private _isItemSelected(item: FzlChipItem): boolean {
    const itemVal = item.value || item.id || item.label;
    if (Array.isArray(this.selected)) {
      return this.selected.includes(itemVal);
    }
    return this.selected === itemVal;
  }

  override render() {
    if (this.items && this.items.length > 0) {
      return html`
        <div
          class="group ${this.wrap ? 'wrap' : ''}"
          role="group"
          aria-label=${this.ariaLabel || ''}
          @keydown=${(e: KeyboardEvent) => this._keyNav.handleKeyDown(e)}
        >
          ${this.items.map(
            (item) => html`
              <fzl-reader-chapterview
                .label=${item.label}
                .value=${item.value || item.id || item.label}
                .count=${item.count}
                .color=${item.color || ''}
                ?selected=${this._isItemSelected(item)}
                ?removable=${Boolean(item.removable)}
                ?disabled=${Boolean(item.disabled)}
                @fzl-click=${() => this._onItemClick(item)}
              ></fzl-reader-chapterview>
            `
          )}
        </div>
      `;
    }

    return html`
      <div
        class="group ${this.wrap ? 'wrap' : ''}"
        role="group"
        aria-label=${this.ariaLabel || ''}
        @keydown=${(e: KeyboardEvent) => this._keyNav.handleKeyDown(e)}
      >
        <slot></slot>
      </div>
    `;
  }
}

// Aliases for chip nomenclature
if (!customElements.get('fzl-chip')) {
  try {
    customElements.define('fzl-chip', class extends FzlReaderChapterView {});
    customElements.define('fzl-chip-group', class extends FzlReaderChapterViewGroup {});
  } catch {
    // Ignore duplicate definition in test/re-import environments
  }
}
