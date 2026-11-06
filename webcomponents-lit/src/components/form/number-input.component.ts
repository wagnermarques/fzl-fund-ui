import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state, query } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin, addTypematicListener } from '@fzl/core';

/**
 * Number & Currency Input Component inspired by Dijit `NumberTextBox` / `CurrencyTextBox`.
 *
 * Supports prefix/suffix formatting, min/max range limits, step increments,
 * and mouse/touch typematic repeat acceleration on +/- stepper buttons.
 *
 * @customElement fzl-number-input
 * @tag fzl-number-input
 */
export class FzlNumberInput extends FzlWidgetMixin(LitElement) {
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

      .input-container {
        position: relative;
        display: flex;
        align-items: center;
        background: var(--_fzl-color-surface, #ffffff);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 6px);
        transition: border-color var(--_fzl-transition-fast, 150ms ease),
                    box-shadow var(--_fzl-transition-fast, 150ms ease);
        overflow: hidden;
      }

      .input-container:hover:not(.disabled) {
        border-color: var(--_fzl-color-border-hover, #94a3b8);
      }

      .input-container:focus-within:not(.disabled) {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.18);
      }

      .input-container.invalid {
        border-color: var(--_fzl-color-danger, #ef4444) !important;
      }

      .input-container.invalid:focus-within {
        box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
      }

      .input-container.disabled {
        background: var(--_fzl-color-surface-disabled, #f1f5f9);
        opacity: 0.7;
        cursor: not-allowed;
      }

      .prefix, .suffix {
        padding: 0 8px;
        color: var(--_fzl-color-text-muted, #64748b);
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        font-weight: 500;
        user-select: none;
      }

      input {
        width: 100%;
        padding: 8px 10px;
        font-family: inherit;
        font-size: var(--_fzl-font-size-md, 0.95rem);
        color: inherit;
        background: transparent;
        border: none;
        outline: none;
        box-sizing: border-box;
      }

      input:disabled {
        cursor: not-allowed;
      }

      /* Stepper controls */
      .stepper-controls {
        display: flex;
        border-left: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .step-btn {
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border: none;
        color: var(--_fzl-color-text, #334155);
        padding: 0 10px;
        height: 38px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        transition: background-color var(--_fzl-transition-fast, 150ms);
      }

      .step-btn:first-child {
        border-right: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .step-btn:hover:not(:disabled) {
        background: #e2e8f0;
      }

      .step-btn:active:not(:disabled) {
        background: #cbd5e1;
      }

      .step-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
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
        .input-container {
          border: 2px solid CanvasText;
        }
      }
    `
  ];

  @property({ type: String }) name = '';
  @property({ type: String }) label = '';
  @property({ type: Number }) value: number = 0;
  @property({ type: Number }) min?: number;
  @property({ type: Number }) max?: number;
  @property({ type: Number }) step = 1;
  @property({ type: String }) override prefix = '';
  @property({ type: String }) suffix = '';
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String, attribute: 'error-message' }) errorMessage = '';
  @property({ type: String, attribute: 'helper-text' }) helperText = '';
  @property({ type: Boolean, reflect: true }) invalid = false;

  @state() private _activeError = '';

  @query('#btn-step-down') private _stepDownBtn!: HTMLButtonElement;
  @query('#btn-step-up') private _stepUpBtn!: HTMLButtonElement;

  override firstUpdated() {
    if (this._stepDownBtn) {
      this.own(
        addTypematicListener(this._stepDownBtn, () => {
          this.stepDown();
        })
      );
    }
    if (this._stepUpBtn) {
      this.own(
        addTypematicListener(this._stepUpBtn, () => {
          this.stepUp();
        })
      );
    }
  }

  validate(): boolean {
    if (this.disabled) {
      this.invalid = false;
      this._activeError = '';
      return true;
    }

    if (this.required && (this.value === undefined || this.value === null || isNaN(this.value))) {
      this.invalid = true;
      this._activeError = this.errorMessage || 'Valor numérico obrigatório.';
      return false;
    }

    if (this.min !== undefined && this.value < this.min) {
      this.invalid = true;
      this._activeError = `Valor mínimo permitido é ${this.min}.`;
      return false;
    }

    if (this.max !== undefined && this.value > this.max) {
      this.invalid = true;
      this._activeError = `Valor máximo permitido é ${this.max}.`;
      return false;
    }

    this.invalid = false;
    this._activeError = '';
    return true;
  }

  stepUp(): void {
    if (this.disabled || this.readonly) return;
    const current = Number(this.value) || 0;
    let next = current + this.step;
    // Format precision to avoid floating point issues (e.g. 0.1 + 0.2)
    next = Number(next.toFixed(4));
    if (this.max !== undefined && next > this.max) next = this.max;
    this.value = next;
    this.validate();
    this.emit('fzl-input', { name: this.name, value: this.value });
    this.emit('fzl-change', { name: this.name, value: this.value });
  }

  stepDown(): void {
    if (this.disabled || this.readonly) return;
    const current = Number(this.value) || 0;
    let next = current - this.step;
    next = Number(next.toFixed(4));
    if (this.min !== undefined && next < this.min) next = this.min;
    this.value = next;
    this.validate();
    this.emit('fzl-input', { name: this.name, value: this.value });
    this.emit('fzl-change', { name: this.name, value: this.value });
  }

  reset(): void {
    this.value = 0;
    this.invalid = false;
    this._activeError = '';
  }

  private _handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    const num = parseFloat(target.value);
    this.value = isNaN(num) ? 0 : num;
    this.emit('fzl-input', { name: this.name, value: this.value });
  }

  private _handleChange(): void {
    this.validate();
    this.emit('fzl-change', { name: this.name, value: this.value });
  }

  override render() {
    const inputId = `fzl_num_${this.widgetId}`;
    const descId = `fzl_desc_${this.widgetId}`;

    return html`
      <div class="field-wrapper">
        ${this.label
          ? html`
              <label for=${inputId}>
                ${this.label}
                ${this.required ? html`<span class="required-indicator" aria-hidden="true">*</span>` : ''}
              </label>
            `
          : ''}

        <div class="input-container ${this.invalid ? 'invalid' : ''} ${this.disabled ? 'disabled' : ''}">
          ${this.prefix ? html`<span class="prefix" aria-hidden="true">${this.prefix}</span>` : ''}

          <input
            id=${inputId}
            type="number"
            name=${this.name}
            .value=${String(this.value ?? '')}
            step=${this.step}
            min=${this.min ?? ''}
            max=${this.max ?? ''}
            ?required=${this.required}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            aria-invalid=${this.invalid ? 'true' : 'false'}
            aria-describedby=${this._activeError || this.helperText ? descId : ''}
            @input=${this._handleInput}
            @change=${this._handleChange}
            @blur=${() => this.validate()}
          />

          ${this.suffix ? html`<span class="suffix" aria-hidden="true">${this.suffix}</span>` : ''}

          ${!this.disabled && !this.readonly
            ? html`
                <div class="stepper-controls">
                  <button
                    type="button"
                    id="btn-step-down"
                    class="step-btn"
                    title="Diminuir"
                    aria-label="Diminuir valor"
                    tabindex="-1"
                  >
                    &minus;
                  </button>
                  <button
                    type="button"
                    id="btn-step-up"
                    class="step-btn"
                    title="Aumentar"
                    aria-label="Aumentar valor"
                    tabindex="-1"
                  >
                    +
                  </button>
                </div>
              `
            : ''}
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

if (typeof customElements !== 'undefined' && !customElements.get('fzl-number-input')) {
  customElements.define('fzl-number-input', FzlNumberInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-number-input': FzlNumberInput;
  }
}
