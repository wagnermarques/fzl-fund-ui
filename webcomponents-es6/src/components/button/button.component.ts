import { fzlDesignTokensCss } from '@fzl/design-tokens';

export type FzlButtonVariant = 'primary' | 'secondary' | 'danger';
export type FzlButtonSize = 'sm' | 'md' | 'lg';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${fzlDesignTokensCss}

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
  </style>
  <button part="button" type="button">
    <slot></slot>
  </button>
`;

/**
 * Pure Vanilla ES6 Custom Element button with Shadow DOM encapsulation.
 *
 * @customElement fzl-es6-button
 * @tag fzl-es6-button
 *
 * @attr {'primary' | 'secondary' | 'danger'} [variant='primary'] - Visual appearance variant
 * @attr {'sm' | 'md' | 'lg'} [size='md'] - Size scale of the button
 * @attr {boolean} [disabled=false] - Whether the button is disabled
 * @attr {'button' | 'submit' | 'reset'} [type='button'] - Form button behavior
 *
 * @prop {'primary' | 'secondary' | 'danger'} [variant='primary'] - Visual appearance variant
 * @prop {'sm' | 'md' | 'lg'} [size='md'] - Size scale of the button
 * @prop {boolean} [disabled=false] - Whether the button is disabled
 * @prop {'button' | 'submit' | 'reset'} [type='button'] - Form button behavior
 *
 * @fires {CustomEvent<{ originalEvent: MouseEvent }>} fzl-click - Dispatched when the button is activated
 *
 * @slot - Content to be displayed inside the button
 *
 * @csspart button - The internal native `<button>` element
 */
export class FzlEs6Button extends HTMLElement {
  private _internals?: ElementInternals;
  private _buttonEl!: HTMLButtonElement;

  /** @internal */
  get internals(): ElementInternals | undefined {
    return this._internals;
  }

  static formAssociated = true;

  static get observedAttributes(): string[] {
    return ['variant', 'size', 'disabled', 'type'];
  }

  constructor() {
    super();
    if (typeof this.attachInternals === 'function') {
      this._internals = this.attachInternals();
    }
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this._buttonEl = shadow.querySelector('button')!;
    this._buttonEl.addEventListener('click', (event: MouseEvent) => {
      if (this.disabled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      this.dispatchEvent(
        new CustomEvent('fzl-click', {
          detail: { originalEvent: event },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  connectedCallback(): void {
    this._render();
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue) {
      this._render();
    }
  }

  get variant(): FzlButtonVariant {
    return (this.getAttribute('variant') as FzlButtonVariant) || 'primary';
  }
  set variant(val: FzlButtonVariant) {
    this.setAttribute('variant', val);
  }

  get size(): FzlButtonSize {
    return (this.getAttribute('size') as FzlButtonSize) || 'md';
  }
  set size(val: FzlButtonSize) {
    this.setAttribute('size', val);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(val: boolean) {
    if (val) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  get type(): 'button' | 'submit' | 'reset' {
    return (this.getAttribute('type') as 'button' | 'submit' | 'reset') || 'button';
  }
  set type(val: 'button' | 'submit' | 'reset') {
    this.setAttribute('type', val);
  }

  private _render(): void {
    if (!this._buttonEl) return;
    this._buttonEl.className = `variant-${this.variant} size-${this.size}`;
    this._buttonEl.disabled = this.disabled;
    this._buttonEl.type = this.type;
  }
}

if (!customElements.get('fzl-es6-button')) {
  customElements.define('fzl-es6-button', FzlEs6Button);
}
