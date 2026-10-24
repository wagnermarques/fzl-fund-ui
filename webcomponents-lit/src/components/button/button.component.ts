import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';

export type FzlButtonVariant = 'primary' | 'secondary' | 'danger';
export type FzlButtonSize = 'sm' | 'md' | 'lg';

/**
 * Reactive Lit-based Custom Element button with Shadow DOM encapsulation.
 *
 * @customElement fzl-lit-button
 * @tag fzl-lit-button
 *
 * @fires {CustomEvent<{ originalEvent: MouseEvent }>} fzl-click - Dispatched when the button is activated
 *
 * @slot - Content to be displayed inside the button
 *
 * @csspart button - The internal native `<button>` element
 */
@customElement('fzl-lit-button')
export class FzlLitButton extends LitElement {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      button {
        font-family: var(--_fzl-font-family);
        font-weight: var(--_fzl-font-weight-medium);
        line-height: var(--_fzl-line-height);
        border: 1px solid transparent;
        border-radius: var(--_fzl-radius-md);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--_fzl-space-2);
        transition: background-color var(--_fzl-transition-fast), border-color var(--_fzl-transition-fast);
        user-select: none;
      }

      button:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring);
      }

      /* Sizes */
      button.size-sm {
        font-size: var(--_fzl-font-size-xs);
        padding: var(--_fzl-space-1) var(--_fzl-space-2);
      }

      button.size-md {
        font-size: var(--_fzl-font-size-sm);
        padding: var(--_fzl-space-2) var(--_fzl-space-4);
      }

      button.size-lg {
        font-size: var(--_fzl-font-size-md);
        padding: var(--_fzl-space-3) var(--_fzl-space-6);
      }

      /* Variants */
      button.variant-primary {
        background-color: var(--_fzl-color-primary);
        color: var(--_fzl-color-primary-contrast);
      }
      button.variant-primary:hover:not(:disabled) {
        background-color: var(--_fzl-color-primary-hover);
      }
      button.variant-primary:active:not(:disabled) {
        background-color: var(--_fzl-color-primary-active);
      }

      button.variant-secondary {
        background-color: var(--_fzl-color-secondary);
        color: var(--_fzl-color-secondary-contrast);
      }
      button.variant-secondary:hover:not(:disabled) {
        background-color: var(--_fzl-color-secondary-hover);
      }
      button.variant-secondary:active:not(:disabled) {
        background-color: var(--_fzl-color-secondary-active);
      }

      button.variant-danger {
        background-color: var(--_fzl-color-danger);
        color: var(--_fzl-color-danger-contrast);
      }
      button.variant-danger:hover:not(:disabled) {
        background-color: var(--_fzl-color-danger-hover);
      }

      /* Disabled */
      button:disabled {
        background-color: var(--_fzl-color-disabled-bg);
        color: var(--_fzl-color-disabled-text);
        cursor: not-allowed;
        border-color: transparent;
      }
    `
  ];

  /**
   * Visual appearance variant
   * @attr {'primary' | 'secondary' | 'danger'} variant
   */
  @property({ type: String, reflect: true })
  variant: FzlButtonVariant = 'primary';

  /**
   * Size scale of the button
   * @attr {'sm' | 'md' | 'lg'} size
   */
  @property({ type: String, reflect: true })
  size: FzlButtonSize = 'md';

  /**
   * Whether the button is disabled
   * @attr {boolean} disabled
   */
  @property({ type: Boolean, reflect: true })
  disabled: boolean = false;

  /**
   * Form button behavior
   * @attr {'button' | 'submit' | 'reset'} type
   */
  @property({ type: String, reflect: true })
  type: 'button' | 'submit' | 'reset' = 'button';

  private _handleClick(event: MouseEvent) {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.dispatchEvent(
      new CustomEvent('fzl-click', {
        detail: { originalEvent: event },
        bubbles: true,
        composed: true
      })
    );
  }

  override render() {
    return html`
      <button
        part="button"
        class="variant-${this.variant} size-${this.size}"
        .type=${this.type}
        ?disabled=${this.disabled}
        @click=${this._handleClick}
      >
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-lit-button': FzlLitButton;
  }
}
