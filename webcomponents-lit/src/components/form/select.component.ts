import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

export interface FzlSelectOption {
  value: string;
  label: string;
}

/**
 * Dropdown Select Component inspired by Dijit `Select` / `FilteringSelect`.
 *
 * Supports typed options array or slotted native options, with validation,
 * visual state indicators, and keyboard focus integration.
 *
 * @customElement fzl-select
 * @tag fzl-select
 */
export class FzlSelect extends FzlWidgetMixin(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        margin-bottom: var(--_fzl-space-3, 12px);
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
      }

      .field-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
        position: relative;
      }

      label {
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        font-weight: var(--_fzl-font-weight-medium, 500);
        color: var(--_fzl-color-text, #334155);
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .required-indicator {
        color: var(--_fzl-color-danger, #ef4444);
      }

      .select-container {
        position: relative;
        display: flex;
        align-items: center;
        background: var(--_fzl-color-surface, #ffffff);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 6px);
        transition: border-color var(--_fzl-transition-fast, 150ms ease),
                    box-shadow var(--_fzl-transition-fast, 150ms ease);
      }

      .select-container:hover:not(.disabled) {
        border-color: var(--_fzl-color-border-hover, #94a3b8);
      }

      .select-container:focus-within:not(.disabled) {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.18);
      }

      .select-container.invalid {
        border-color: var(--_fzl-color-danger, #ef4444) !important;
      }

      .select-container.disabled {
        background: var(--_fzl-color-surface-disabled, #f1f5f9);
        opacity: 0.7;
        cursor: not-allowed;
      }

      select {
        width: 100%;
        padding: 8px 32px 8px 12px;
        font-family: inherit;
        font-size: var(--_fzl-font-size-md, 0.95rem);
        color: inherit;
        background: transparent;
        border: none;
        outline: none;
        appearance: none;
        cursor: pointer;
        box-sizing: border-box;
      }

      select:disabled {
        cursor: not-allowed;
      }

      .chevron {
        position: absolute;
        right: 12px;
        pointer-events: none;
        color: #64748b;
        font-size: 0.8rem;
      }

      .helper-text, .error-message {
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        margin-top: 2px;
      }

      .helper-text {
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .error-message {
        color: var(--_fzl-color-danger, #ef4444);
        display: flex;
        align-items: center;
        gap: 4px;
      }

      /* High contrast support */
      @media (forced-colors: active) {
        .select-container {
          border: 2px solid CanvasText;
        }
      }
    `
  ];

  @property({ type: String }) name = '';
  @property({ type: String }) label = '';
  @property({ type: String }) value = '';
  @property({ type: Array }) options: FzlSelectOption[] = [];
  @property({ type: String }) placeholder = 'Selecione…';
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String, attribute: 'error-message' }) errorMessage = '';
  @property({ type: String, attribute: 'helper-text' }) helperText = '';
  @property({ type: Boolean, reflect: true }) invalid = false;

  @state() private _activeError = '';

  validate(): boolean {
    if (this.disabled) {
      this.invalid = false;
      this._activeError = '';
      return true;
    }

    if (this.required && (!this.value || this.value.trim() === '')) {
      this.invalid = true;
      this._activeError = this.errorMessage || 'Selecione uma opção.';
      return false;
    }

    this.invalid = false;
    this._activeError = '';
    return true;
  }

  reset(): void {
    this.value = '';
    this.invalid = false;
    this._activeError = '';
  }

  private _handleChange(e: Event): void {
    const target = e.target as HTMLSelectElement;
    this.value = target.value;
    this.validate();
    this.emit('fzl-change', { name: this.name, value: this.value });
  }

  override render() {
    const selectId = `fzl_sel_${this.widgetId}`;
    const descId = `fzl_desc_${this.widgetId}`;

    return html`
      <div class="field-wrapper">
        ${this.label
          ? html`
              <label for=${selectId}>
                ${this.label}
                ${this.required ? html`<span class="required-indicator" aria-hidden="true">*</span>` : ''}
              </label>
            `
          : ''}

        <div class="select-container ${this.invalid ? 'invalid' : ''} ${this.disabled ? 'disabled' : ''}">
          <select
            id=${selectId}
            name=${this.name}
            .value=${this.value}
            ?required=${this.required}
            ?disabled=${this.disabled}
            aria-invalid=${this.invalid ? 'true' : 'false'}
            aria-describedby=${this._activeError || this.helperText ? descId : ''}
            @change=${this._handleChange}
            @blur=${() => this.validate()}
          >
            ${this.placeholder ? html`<option value="">${this.placeholder}</option>` : ''}
            ${this.options.map(
              (opt) => html`
                <option value=${opt.value} ?selected=${this.value === opt.value}>
                  ${opt.label}
                </option>
              `
            )}
            <slot></slot>
          </select>
          <span class="chevron" aria-hidden="true">&#9662;</span>
        </div>

        ${this.invalid && this._activeError
          ? html`<div id=${descId} class="error-message" role="alert">${this._activeError}</div>`
          : this.helperText
          ? html`<div id=${descId} class="helper-text">${this.helperText}</div>`
          : ''}
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-select')) {
  customElements.define('fzl-select', FzlSelect);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-select': FzlSelect;
  }
}
