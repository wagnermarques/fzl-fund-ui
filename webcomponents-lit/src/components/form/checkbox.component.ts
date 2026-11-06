import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

/**
 * Checkbox Component inspired by Dijit `CheckBox`.
 *
 * @customElement fzl-checkbox
 * @tag fzl-checkbox
 */
export class FzlCheckbox extends FzlWidgetMixin(LitElement) {
  static override shadowRootOptions: ShadowRootInit = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: inline-block;
        margin-bottom: var(--_fzl-space-2, 8px);
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
      }

      label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        user-select: none;
      }

      label.disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      input[type='checkbox'] {
        width: 18px;
        height: 18px;
        border-radius: 4px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        cursor: pointer;
        accent-color: var(--_fzl-color-primary, #0284c7);
      }

      input[type='checkbox']:disabled {
        cursor: not-allowed;
      }

      /* High contrast */
      @media (forced-colors: active) {
        input[type='checkbox'] {
          outline: 2px solid CanvasText;
        }
      }
    `
  ];

  @property({ type: String }) name = '';
  @property({ type: String }) label = '';
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean }) disabled = false;

  private _handleChange(e: Event): void {
    const target = e.target as HTMLInputElement;
    this.checked = target.checked;
    this.emit('fzl-change', { name: this.name, checked: this.checked, value: this.checked });
  }

  override render() {
    const checkId = `fzl_chk_${this.widgetId}`;

    return html`
      <label class=${this.disabled ? 'disabled' : ''} for=${checkId}>
        <input
          id=${checkId}
          type="checkbox"
          name=${this.name}
          .checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this._handleChange}
        />
        <span>${this.label}</span>
      </label>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-checkbox')) {
  customElements.define('fzl-checkbox', FzlCheckbox);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-checkbox': FzlCheckbox;
  }
}
