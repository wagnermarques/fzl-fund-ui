import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

/**
 * Text Input Component inspired by Dijit `ValidationTextBox`.
 *
 * Provides integrated label, placeholder, validation rules (required, pattern, min/max length),
 * visual error states, helper text, and accessible ARIA attributes.
 *
 * @customElement fzl-text-input
 * @tag fzl-text-input
 */
export class FzlTextInput extends FzlWidgetMixin(LitElement) {
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

      input {
        width: 100%;
        padding: 8px 12px;
        font-family: inherit;
        font-size: var(--_fzl-font-size-md, 0.95rem);
        color: inherit;
        background: transparent;
        border: none;
        outline: none;
        box-sizing: border-box;
      }

      input::placeholder {
        color: var(--_fzl-color-text-muted, #94a3b8);
      }

      input:disabled {
        cursor: not-allowed;
      }

      .clear-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 0 8px;
        font-size: 1.1rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .clear-btn:hover {
        color: #475569;
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
        .input-container.invalid {
          outline: 2px solid Highlight;
        }
      }
    `
  ];

  @property({ type: String }) name = '';
  @property({ type: String }) label = '';
  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = '';
  @property({ type: String }) type = 'text';
  @property({ type: Boolean }) required = false;
  @property({ type: String }) pattern = '';
  @property({ type: Number }) minlength?: number;
  @property({ type: Number }) maxlength?: number;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: String, attribute: 'error-message' }) errorMessage = '';
  @property({ type: String, attribute: 'helper-text' }) helperText = '';
  @property({ type: Boolean, reflect: true }) invalid = false;

  @state() private _activeError = '';

  private _inputEl: HTMLInputElement | null = null;

  validate(): boolean {
    if (this.disabled) {
      this.invalid = false;
      this._activeError = '';
      return true;
    }

    const val = this.value?.trim() ?? '';

    if (this.required && val.length === 0) {
      this.invalid = true;
      this._activeError = this.errorMessage || 'Este campo é obrigatório.';
      return false;
    }

    if (this.minlength && val.length > 0 && val.length < this.minlength) {
      this.invalid = true;
      this._activeError = `Mínimo de ${this.minlength} caracteres.`;
      return false;
    }

    if (this.pattern && val.length > 0) {
      const regex = new RegExp(this.pattern);
      if (!regex.test(val)) {
        this.invalid = true;
        this._activeError = this.errorMessage || 'Formato inválido.';
        return false;
      }
    }

    this.invalid = false;
    this._activeError = '';
    return true;
  }

  override focus(): void {
    this._inputEl?.focus();
  }

  reset(): void {
    this.value = '';
    this.invalid = false;
    this._activeError = '';
  }

  private _handleInput(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    if (this.invalid) {
      this.validate();
    }
    this.emit('fzl-input', { name: this.name, value: this.value });
  }

  private _handleChange(_e: Event): void {
    this.validate();
    this.emit('fzl-change', { name: this.name, value: this.value });
  }

  private _handleClear(): void {
    this.value = '';
    this.validate();
    this.emit('fzl-input', { name: this.name, value: '' });
    this.emit('fzl-change', { name: this.name, value: '' });
    this.focus();
  }

  override render() {
    const inputId = `fzl_text_${this.widgetId}`;
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
          <input
            id=${inputId}
            type=${this.type}
            name=${this.name}
            .value=${this.value}
            placeholder=${this.placeholder}
            ?required=${this.required}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            maxlength=${this.maxlength ?? ''}
            minlength=${this.minlength ?? ''}
            aria-invalid=${this.invalid ? 'true' : 'false'}
            aria-describedby=${this._activeError || this.helperText ? descId : ''}
            @input=${this._handleInput}
            @change=${this._handleChange}
            @blur=${() => this.validate()}
          />
          ${!this.disabled && !this.readonly && this.value
            ? html`
                <button
                  type="button"
                  class="clear-btn"
                  title="Limpar campo"
                  aria-label="Limpar campo"
                  @click=${this._handleClear}
                >
                  &times;
                </button>
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

if (typeof customElements !== 'undefined' && !customElements.get('fzl-text-input')) {
  customElements.define('fzl-text-input', FzlTextInput);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-text-input': FzlTextInput;
  }
}
