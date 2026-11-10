import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

export type FzlBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${fzlDesignTokensCss}

    :host {
      display: block;
      font-family: var(--_fzl-font-family);
      color: var(--_fzl-color-text);
      box-sizing: border-box;
    }

    *, *::before, *::after {
      box-sizing: inherit;
    }

    .fzl-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background-color: var(--_fzl-color-surface);
      border: 1px solid var(--_fzl-color-border);
      border-radius: var(--_fzl-radius-md);
      padding: var(--_fzl-space-3);
      transition: transform var(--_fzl-transition-fast), box-shadow var(--_fzl-transition-fast), border-color var(--_fzl-transition-fast);
      outline: none;
    }

    .fzl-card:hover {
      border-color: var(--_fzl-color-border-hover);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    }

    .fzl-card:focus-visible {
      box-shadow: var(--_fzl-focus-ring);
    }

    .fzl-card.collapsible.collapsed {
      justify-content: flex-start;
    }

    .fzl-card.collapsible.collapsed .fzl-card-header {
      margin-bottom: 0;
    }

    .fzl-card.collapsible.collapsed .fzl-card-body,
    .fzl-card.collapsible.collapsed .fzl-card-footer {
      display: none;
    }

    .fzl-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--_fzl-space-2);
      margin-bottom: var(--_fzl-space-2);
    }

    .fzl-card-title-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex-grow: 1;
    }

    .fzl-card-title-group.is-clickable {
      cursor: pointer;
      user-select: none;
    }

    .fzl-card-title-group.is-clickable:hover .fzl-card-title {
      color: var(--_fzl-color-primary);
    }

    .fzl-card-title-row {
      display: flex;
      align-items: center;
      gap: var(--_fzl-space-2);
    }

    .fzl-card-accordion-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: var(--_fzl-color-text-muted);
      transition: transform var(--_fzl-transition-fast);
      transform: rotate(-90deg);
      user-select: none;
    }

    .fzl-card.expanded .fzl-card-accordion-chevron {
      transform: rotate(0deg);
      color: var(--_fzl-color-primary);
    }

    .fzl-card-title {
      font-size: var(--_fzl-font-size-md);
      font-weight: var(--_fzl-font-weight-semibold);
      color: var(--_fzl-color-text);
      margin: 0;
      line-height: 1.3;
    }

    .fzl-card-subtitle {
      font-size: var(--_fzl-font-size-xs);
      color: var(--_fzl-color-text-muted);
      margin: 0;
    }

    .fzl-badge {
      display: inline-flex;
      align-items: center;
      font-size: var(--_fzl-font-size-xs);
      font-weight: var(--_fzl-font-weight-medium);
      padding: 2px 6px;
      border-radius: var(--_fzl-radius-sm);
      background-color: var(--_fzl-color-surface-muted);
      border: 1px solid var(--_fzl-color-border);
      white-space: nowrap;
    }

    .fzl-badge.variant-danger {
      background-color: #fee2e2;
      color: var(--_fzl-color-danger);
      border-color: #fca5a5;
    }

    .fzl-badge.variant-warning {
      background-color: #fef3c7;
      color: var(--_fzl-color-warning);
      border-color: #fcd34d;
    }

    .fzl-badge.variant-success {
      background-color: #dcfce7;
      color: var(--_fzl-color-success);
      border-color: #86efac;
    }

    .fzl-badge.variant-info {
      background-color: #e0f2fe;
      color: var(--_fzl-color-info);
      border-color: #bae6fd;
    }

    .fzl-card-body {
      font-size: var(--_fzl-font-size-sm);
      color: var(--_fzl-color-text);
      line-height: var(--_fzl-line-height);
      margin-bottom: var(--_fzl-space-3);
      flex-grow: 1;
    }

    .fzl-card-body.scrollable {
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
      scrollbar-color: var(--_fzl-color-border) transparent;
      padding-right: var(--_fzl-space-1);
    }

    .fzl-card-body.scrollable::-webkit-scrollbar {
      width: 6px;
    }

    .fzl-card-body.scrollable::-webkit-scrollbar-thumb {
      background-color: var(--_fzl-color-border);
      border-radius: var(--_fzl-radius-sm);
    }

    .fzl-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--_fzl-space-2);
      margin-top: auto;
      padding-top: var(--_fzl-space-2);
      border-top: 1px solid var(--_fzl-color-surface-muted);
      font-size: var(--_fzl-font-size-xs);
      color: var(--_fzl-color-text-muted);
    }

    .fzl-card-action-btn {
      font-family: inherit;
      font-size: var(--_fzl-font-size-xs);
      font-weight: var(--_fzl-font-weight-medium);
      padding: 4px 10px;
      background-color: var(--_fzl-color-primary);
      color: var(--_fzl-color-primary-contrast);
      border: none;
      border-radius: var(--_fzl-radius-sm);
      cursor: pointer;
      transition: background-color var(--_fzl-transition-fast);
    }

    .fzl-card-action-btn:hover {
      background-color: var(--_fzl-color-primary-hover);
    }
  </style>

  <article class="fzl-card" part="card">
    <div class="fzl-card-header" part="card-header">
      <div class="fzl-card-title-group" role="region">
        <div class="fzl-card-title-row">
          <span class="fzl-card-accordion-chevron" style="display: none;" aria-hidden="true">▾</span>
          <slot name="title"><h3 class="fzl-card-title"></h3></slot>
        </div>
        <slot name="subtitle"><span class="fzl-card-subtitle" style="display: none;"></span></slot>
      </div>
      <div class="fzl-card-header-actions">
        <slot name="header-actions">
          <span class="fzl-badge" style="display: none;"></span>
        </slot>
      </div>
    </div>
    <div class="fzl-card-body" part="card-body">
      <slot></slot>
    </div>
    <div class="fzl-card-footer" part="card-footer">
      <slot name="footer"></slot>
      <button type="button" class="fzl-card-action-btn" style="display: none;"></button>
    </div>
  </article>
`;

/**
 * Pure ES6 Standalone Card Custom Element (`fzl-es6-card`)
 * Supports title, subtitle, badge, action button,
 * collapsible accordion variation and scrollable body for long content.
 *
 * @customElement fzl-es6-card
 * @tag fzl-es6-card
 *
 * @fires {CustomEvent<{ expanded: boolean }>} fzl-card-toggle - Dispatched when card expansion state toggles
 * @fires {CustomEvent<{ action: string; originalEvent: MouseEvent }>} fzl-card-action - Dispatched when action button is clicked
 *
 * @csspart card - The card container
 * @csspart card-header - The card header
 * @csspart card-body - The scrollable body
 * @csspart card-footer - The card footer
 */
export class FzlEs6Card extends FzlWidgetMixin(HTMLElement) {
  static get observedAttributes(): string[] {
    return [
      'title',
      'subtitle',
      'badge',
      'badge-variant',
      'action-label',
      'collapsible',
      'expanded',
      'body-max-height',
    ];
  }

  private _title: string = '';
  private _subtitle: string = '';
  private _badge: string = '';
  private _badgeVariant: FzlBadgeVariant = 'default';
  private _actionLabel: string = '';
  private _collapsible: boolean = false;
  private _expanded: boolean = false;
  private _bodyMaxHeight: string = '180px';

  private readonly _root: ShadowRoot;
  private readonly _cardEl: HTMLElement;
  private readonly _titleGroupEl: HTMLElement;
  private readonly _chevronEl: HTMLElement;
  private readonly _titleEl: HTMLElement;
  private readonly _subtitleEl: HTMLElement;
  private readonly _badgeEl: HTMLElement;
  private readonly _bodyEl: HTMLElement;
  private readonly _actionBtnEl: HTMLButtonElement;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(template.content.cloneNode(true));

    this._cardEl = this._root.querySelector('.fzl-card') as HTMLElement;
    this._titleGroupEl = this._root.querySelector('.fzl-card-title-group') as HTMLElement;
    this._chevronEl = this._root.querySelector('.fzl-card-accordion-chevron') as HTMLElement;
    this._titleEl = this._root.querySelector('.fzl-card-title') as HTMLElement;
    this._subtitleEl = this._root.querySelector('.fzl-card-subtitle') as HTMLElement;
    this._badgeEl = this._root.querySelector('.fzl-badge') as HTMLElement;
    this._bodyEl = this._root.querySelector('.fzl-card-body') as HTMLElement;
    this._actionBtnEl = this._root.querySelector('.fzl-card-action-btn') as HTMLButtonElement;

    this._titleGroupEl.addEventListener('click', (e: MouseEvent) => {
      if (!this._collapsible) return;
      e.stopPropagation();
      this.toggle();
    });

    this._titleGroupEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this._collapsible) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
    });

    this._actionBtnEl.addEventListener('click', (e: MouseEvent) => {
      e.stopPropagation();
      this.dispatchEvent(
        new CustomEvent('fzl-card-action', {
          detail: { action: this._actionLabel || 'action', originalEvent: e },
          bubbles: true,
          composed: true,
        })
      );
    });
  }

  override get title(): string {
    return this._title;
  }

  override set title(val: string) {
    this._title = val || '';
    this._titleEl.textContent = this._title;
  }

  get subtitle(): string {
    return this._subtitle;
  }

  set subtitle(val: string) {
    this._subtitle = val || '';
    this._subtitleEl.textContent = this._subtitle;
    this._subtitleEl.style.display = this._subtitle ? 'inline' : 'none';
  }

  get badge(): string {
    return this._badge;
  }

  set badge(val: string) {
    this._badge = val || '';
    this._badgeEl.textContent = this._badge;
    this._badgeEl.style.display = this._badge ? 'inline-flex' : 'none';
  }

  get badgeVariant(): FzlBadgeVariant {
    return this._badgeVariant;
  }

  set badgeVariant(val: FzlBadgeVariant) {
    this._badgeVariant = val || 'default';
    this._badgeEl.className = `fzl-badge variant-${this._badgeVariant}`;
  }

  get actionLabel(): string {
    return this._actionLabel;
  }

  set actionLabel(val: string) {
    this._actionLabel = val || '';
    this._actionBtnEl.textContent = this._actionLabel;
    this._actionBtnEl.style.display = this._actionLabel ? 'inline-block' : 'none';
  }

  get collapsible(): boolean {
    return this._collapsible;
  }

  set collapsible(val: boolean) {
    this._collapsible = Boolean(val);
    this._updateCollapsibleState();
  }

  get expanded(): boolean {
    return this._expanded;
  }

  set expanded(val: boolean) {
    this._expanded = Boolean(val);
    this._updateCollapsibleState();
  }

  get bodyMaxHeight(): string {
    return this._bodyMaxHeight;
  }

  set bodyMaxHeight(val: string) {
    this._bodyMaxHeight = val || '180px';
    this._updateBodyHeight();
  }

  public toggle(force?: boolean): boolean {
    if (!this._collapsible) return true;
    this._expanded = typeof force === 'boolean' ? force : !this._expanded;
    this._updateCollapsibleState();
    this.dispatchEvent(
      new CustomEvent('fzl-card-toggle', {
        detail: { expanded: this._expanded },
        bubbles: true,
        composed: true,
      })
    );
    return this._expanded;
  }

  private _updateBodyHeight(): void {
    if (this._bodyMaxHeight && this._bodyMaxHeight !== 'none') {
      this._bodyEl.classList.add('scrollable');
      this._bodyEl.style.maxHeight = this._bodyMaxHeight;
    } else {
      this._bodyEl.classList.remove('scrollable');
      this._bodyEl.style.maxHeight = '';
    }
  }

  private _updateCollapsibleState(): void {
    if (this._collapsible) {
      this._cardEl.classList.add('collapsible');
      this._titleGroupEl.classList.add('is-clickable');
      this._titleGroupEl.setAttribute('role', 'button');
      this._titleGroupEl.tabIndex = 0;
      this._chevronEl.style.display = 'inline-flex';

      if (this._expanded) {
        this._cardEl.classList.add('expanded');
        this._cardEl.classList.remove('collapsed');
        this._titleGroupEl.setAttribute('aria-expanded', 'true');
      } else {
        this._cardEl.classList.add('collapsed');
        this._cardEl.classList.remove('expanded');
        this._titleGroupEl.setAttribute('aria-expanded', 'false');
      }
    } else {
      this._cardEl.classList.remove('collapsible', 'collapsed', 'expanded');
      this._titleGroupEl.classList.remove('is-clickable');
      this._titleGroupEl.setAttribute('role', 'region');
      this._titleGroupEl.tabIndex = -1;
      this._titleGroupEl.removeAttribute('aria-expanded');
      this._chevronEl.style.display = 'none';
    }
    this._updateBodyHeight();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    switch (name) {
      case 'title':
        this.title = newValue || '';
        break;
      case 'subtitle':
        this.subtitle = newValue || '';
        break;
      case 'badge':
        this.badge = newValue || '';
        break;
      case 'badge-variant':
        this.badgeVariant = (newValue as FzlBadgeVariant) || 'default';
        break;
      case 'action-label':
        this.actionLabel = newValue || '';
        break;
      case 'collapsible':
        this.collapsible = newValue !== null && newValue !== 'false';
        break;
      case 'expanded':
        this.expanded = newValue !== null && newValue !== 'false';
        break;
      case 'body-max-height':
        this.bodyMaxHeight = newValue || '180px';
        break;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._updateCollapsibleState();
  }
}

if (!customElements.get('fzl-es6-card')) {
  customElements.define('fzl-es6-card', FzlEs6Card);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-es6-card': FzlEs6Card;
  }
}
