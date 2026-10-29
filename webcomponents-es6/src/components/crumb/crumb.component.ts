import { fzlDesignTokensCss } from '@fzl/design-tokens';

export interface FzlCrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** Optional navigation href (e.g., '#/config/backend') */
  href?: string;
  /** Optional identifier */
  id?: string;
}

export function parseFzlCrumbItems(
  items: FzlCrumbItem[] | string | null | undefined,
  pathStr?: string
): FzlCrumbItem[] {
  if (Array.isArray(items) && items.length > 0) {
    return items.map((it) => (typeof it === 'string' ? { label: it } : it));
  }
  const raw = typeof items === 'string' && items.trim() ? items.trim() : (pathStr ?? '').trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((it) =>
          typeof it === 'string'
            ? { label: it }
            : { label: String(it.label ?? ''), href: it.href, id: it.id }
        );
      }
    } catch {
      // Fallback to delimiter splitting
    }
  }
  return raw
    .split(/\s*(?:\/|›|>)\s*/)
    .filter(Boolean)
    .map((segment, idx, arr) => ({
      label: segment,
      href:
        idx === 0 &&
        arr.length > 1 &&
        (segment.toLowerCase() === 'início' ||
          segment.toLowerCase() === 'inicio' ||
          segment.toLowerCase() === 'home')
          ? '#/'
          : undefined,
    }));
}

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${fzlDesignTokensCss}

    :host {
      display: block;
      font-family: var(--_fzl-font-family);
    }

    nav {
      display: flex;
      align-items: center;
      gap: var(--_fzl-space-3);
      padding: var(--_fzl-space-2) var(--_fzl-space-4);
      background-color: var(--_fzl-color-surface-muted);
      border-bottom: 1px solid var(--_fzl-color-border);
      color: var(--_fzl-color-text-muted);
      font-size: var(--_fzl-font-size-sm);
      line-height: var(--_fzl-line-height);
      min-height: 2.5rem;
      box-sizing: border-box;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--_fzl-space-1);
      padding: var(--_fzl-space-1) var(--_fzl-space-2);
      font-family: inherit;
      font-size: var(--_fzl-font-size-xs);
      font-weight: var(--_fzl-font-weight-medium);
      color: var(--_fzl-color-primary);
      background-color: transparent;
      border: 1px solid var(--_fzl-color-border);
      border-radius: var(--_fzl-radius-md);
      cursor: pointer;
      transition:
        background-color var(--_fzl-transition-fast),
        border-color var(--_fzl-transition-fast),
        color var(--_fzl-transition-fast);
      flex-shrink: 0;
      user-select: none;
    }

    .back-btn:hover:not(:disabled) {
      background-color: var(--_fzl-color-surface);
      border-color: var(--_fzl-color-primary);
      color: var(--_fzl-color-primary-hover);
    }

    .back-btn:focus-visible {
      outline: none;
      box-shadow: var(--_fzl-focus-ring);
    }

    .back-btn:disabled {
      color: var(--_fzl-color-disabled-text);
      border-color: var(--_fzl-color-border);
      background-color: transparent;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .back-btn[hidden] {
      display: none;
    }

    .back-icon {
      width: 0.875rem;
      height: 0.875rem;
      fill: currentColor;
      flex-shrink: 0;
    }

    ol {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--_fzl-space-1);
      list-style: none;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    li {
      display: inline-flex;
      align-items: center;
      gap: var(--_fzl-space-1);
      min-width: 0;
    }

    a.crumb-link {
      color: var(--_fzl-color-primary);
      text-decoration: none;
      font-weight: var(--_fzl-font-weight-medium);
      border-radius: var(--_fzl-radius-sm);
      padding: 0.125rem 0.25rem;
      transition: color var(--_fzl-transition-fast), background-color var(--_fzl-transition-fast);
    }

    a.crumb-link:hover {
      color: var(--_fzl-color-primary-hover);
      text-decoration: underline;
    }

    a.crumb-link:focus-visible {
      outline: none;
      box-shadow: var(--_fzl-focus-ring);
    }

    .crumb-text {
      color: var(--_fzl-color-text-muted);
      padding: 0.125rem 0.25rem;
    }

    .crumb-current {
      color: var(--_fzl-color-text);
      font-weight: var(--_fzl-font-weight-semibold);
      padding: 0.125rem 0.25rem;
    }

    .separator {
      color: var(--_fzl-color-text-muted);
      user-select: none;
      padding: 0 0.125rem;
    }
  </style>
  <nav part="nav" aria-label="Navegação estrutural">
    <button part="back-button" type="button" class="back-btn" aria-label="Voltar">
      <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
      </svg>
      <span class="back-label">Voltar</span>
    </button>
    <ol part="list"></ol>
  </nav>
`;

/**
 * Pure Vanilla ES6 Breadcrumb ("Crumb") Custom Element showing current navigation path
 * and providing back navigation to the previous view.
 *
 * @customElement fzl-es6-crumb
 * @tag fzl-es6-crumb
 *
 * @attr {string} [items='[]'] - Breadcrumb items JSON string or delimited string
 * @attr {string} [path=''] - Path string shorthand (e.g. "Início / Config / Backend")
 * @attr {string} [separator='›'] - Visual separator between breadcrumb items
 * @attr {boolean} [show-back=true] - Whether to display the back button
 * @attr {boolean} [back-disabled=false] - Whether the back button is disabled
 * @attr {string} [back-label='Voltar'] - Label for the back navigation button
 * @attr {string} [back-href=''] - Optional explicit target URL/hash for the back button
 * @attr {string} [aria-label='Navegação estrutural'] - Accessible label for the `<nav>` landmark
 *
 * @prop {FzlCrumbItem[]} [items=[]] - Breadcrumb items array
 * @prop {string} [path=''] - Path string shorthand
 * @prop {string} [separator='›'] - Visual separator between breadcrumb items
 * @prop {boolean} [showBack=true] - Whether to display the back button
 * @prop {boolean} [backDisabled=false] - Whether the back button is disabled
 * @prop {string} [backLabel='Voltar'] - Label for the back navigation button
 * @prop {string} [backHref=''] - Optional explicit target URL/hash for the back button
 *
 * @fires {CustomEvent<{ backHref: string; originalEvent: MouseEvent }>} fzl-back - Dispatched when the back button is activated
 * @fires {CustomEvent<{ item: FzlCrumbItem; index: number; href?: string; originalEvent: MouseEvent }>} fzl-navigate - Dispatched when a breadcrumb link item is clicked
 *
 * @csspart nav - The outer `<nav>` landmark element
 * @csspart back-button - The back navigation `<button>` element
 * @csspart list - The `<ol>` breadcrumb trail list
 * @csspart item - Each `<li>` breadcrumb item
 * @csspart link - Interactive `<a>` link for ancestor items
 * @csspart separator - Visual separator `<span>` between items
 * @csspart current - The `<span aria-current="page">` active view label
 */
export class FzlEs6Crumb extends HTMLElement {
  private _navEl!: HTMLElement;
  private _backBtnEl!: HTMLButtonElement;
  private _backLabelEl!: HTMLElement;
  private _listEl!: HTMLOListElement;
  private _itemsProp: FzlCrumbItem[] | null = null;

  static get observedAttributes(): string[] {
    return [
      'items',
      'path',
      'separator',
      'show-back',
      'back-disabled',
      'back-label',
      'back-href',
      'aria-label',
    ];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));

    this._navEl = shadow.querySelector('nav')!;
    this._backBtnEl = shadow.querySelector('.back-btn')!;
    this._backLabelEl = shadow.querySelector('.back-label')!;
    this._listEl = shadow.querySelector('ol')!;

    this._backBtnEl.addEventListener('click', (event: MouseEvent) => {
      if (this.backDisabled) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      const customEvent = new CustomEvent('fzl-back', {
        detail: { backHref: this.backHref, originalEvent: event },
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      const dispatched = this.dispatchEvent(customEvent);
      if (dispatched) {
        if (this.backHref) {
          if (this.backHref.startsWith('#')) {
            window.location.hash = this.backHref;
          } else {
            window.location.href = this.backHref;
          }
        } else if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        }
      }
    });
  }

  connectedCallback(): void {
    this._render();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue !== newValue) {
      if (name === 'items') {
        this._itemsProp = null;
      }
      this._render();
    }
  }

  get items(): FzlCrumbItem[] {
    if (this._itemsProp !== null) return this._itemsProp;
    return parseFzlCrumbItems(this.getAttribute('items'), this.path);
  }
  set items(val: FzlCrumbItem[] | string) {
    if (Array.isArray(val)) {
      this._itemsProp = val;
      this._render();
    } else {
      this._itemsProp = null;
      this.setAttribute('items', String(val ?? ''));
    }
  }

  get path(): string {
    return this.getAttribute('path') || '';
  }
  set path(val: string) {
    this.setAttribute('path', val);
  }

  get separator(): string {
    return this.getAttribute('separator') || '›';
  }
  set separator(val: string) {
    this.setAttribute('separator', val);
  }

  get showBack(): boolean {
    const attr = this.getAttribute('show-back');
    if (attr === null) return true;
    return attr !== 'false';
  }
  set showBack(val: boolean) {
    this.setAttribute('show-back', val ? 'true' : 'false');
  }

  get backDisabled(): boolean {
    return this.hasAttribute('back-disabled') && this.getAttribute('back-disabled') !== 'false';
  }
  set backDisabled(val: boolean) {
    if (val) {
      this.setAttribute('back-disabled', '');
    } else {
      this.removeAttribute('back-disabled');
    }
  }

  get backLabel(): string {
    return this.getAttribute('back-label') || 'Voltar';
  }
  set backLabel(val: string) {
    this.setAttribute('back-label', val);
  }

  get backHref(): string {
    return this.getAttribute('back-href') || '';
  }
  set backHref(val: string) {
    this.setAttribute('back-href', val);
  }

  private _render(): void {
    if (!this._navEl) return;

    this._navEl.setAttribute('aria-label', this.getAttribute('aria-label') || 'Navegação estrutural');
    this._backBtnEl.hidden = !this.showBack;
    this._backBtnEl.disabled = this.backDisabled;
    this._backBtnEl.setAttribute('aria-label', this.backLabel);
    this._backLabelEl.textContent = this.backLabel;

    const list = this.items;
    const lastIdx = list.length - 1;
    this._listEl.replaceChildren();

    list.forEach((item, idx) => {
      const isLast = idx === lastIdx;
      const li = document.createElement('li');
      li.setAttribute('part', 'item');

      if (isLast) {
        const span = document.createElement('span');
        span.setAttribute('part', 'current');
        span.className = 'crumb-current';
        span.setAttribute('aria-current', 'page');
        span.textContent = item.label;
        li.appendChild(span);
      } else if (item.href) {
        const a = document.createElement('a');
        a.setAttribute('part', 'link');
        a.className = 'crumb-link';
        a.href = item.href;
        a.textContent = item.label;
        a.addEventListener('click', (e: MouseEvent) => {
          const customEvent = new CustomEvent('fzl-navigate', {
            detail: { item, index: idx, href: item.href, originalEvent: e },
            bubbles: true,
            composed: true,
            cancelable: true,
          });
          if (!this.dispatchEvent(customEvent)) {
            e.preventDefault();
          }
        });
        li.appendChild(a);
      } else {
        const span = document.createElement('span');
        span.className = 'crumb-text';
        span.textContent = item.label;
        li.appendChild(span);
      }

      if (!isLast) {
        const sep = document.createElement('span');
        sep.setAttribute('part', 'separator');
        sep.className = 'separator';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = this.separator;
        li.appendChild(sep);
      }

      this._listEl.appendChild(li);
    });
  }
}

if (!customElements.get('fzl-es6-crumb')) {
  customElements.define('fzl-es6-crumb', FzlEs6Crumb);
}
