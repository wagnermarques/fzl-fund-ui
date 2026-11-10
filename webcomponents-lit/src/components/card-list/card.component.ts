import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

export type FzlBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Standalone Card Component (`fzl-lit-card`)
 * Structured card supporting title, subtitle, badge, actions,
 * collapsible accordion variation and scrollable body for long content.
 *
 * @customElement fzl-lit-card
 * @tag fzl-lit-card
 *
 * @fires {CustomEvent<{ expanded: boolean }>} fzl-card-toggle - Dispatched when card expansion state toggles
 * @fires {CustomEvent<{ action: string; originalEvent: MouseEvent }>} fzl-card-action - Dispatched when action button is clicked
 *
 * @csspart card - The card container
 * @csspart card-header - The card header
 * @csspart card-body - The scrollable body
 * @csspart card-footer - The card footer
 */
export class FzlLitCard extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text);
        box-sizing: border-box;
      }

      *,
      *::before,
      *::after {
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

      .fzl-card-body.scrollable::-webkit-scrollbar-track {
        background: transparent;
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
    `,
  ];

  @property({ type: String })
  override title: string = '';

  @property({ type: String })
  subtitle: string = '';

  @property({ type: String })
  badge: string = '';

  @property({ type: String, attribute: 'badge-variant' })
  badgeVariant: FzlBadgeVariant = 'default';

  @property({ type: String, attribute: 'action-label' })
  actionLabel: string = '';

  @property({ type: Boolean, reflect: true })
  collapsible: boolean = false;

  @property({ type: Boolean, reflect: true })
  expanded: boolean = false;

  @property({ type: String, attribute: 'body-max-height' })
  bodyMaxHeight: string = '180px';

  public toggle(force?: boolean): boolean {
    if (!this.collapsible) return true;
    this.expanded = typeof force === 'boolean' ? force : !this.expanded;
    this.dispatchEvent(
      new CustomEvent('fzl-card-toggle', {
        detail: { expanded: this.expanded },
        bubbles: true,
        composed: true,
      })
    );
    return this.expanded;
  }

  private _handleTitleClick(e: MouseEvent) {
    if (!this.collapsible) return;
    e.stopPropagation();
    this.toggle();
  }

  private _handleTitleKeyDown(e: KeyboardEvent) {
    if (!this.collapsible) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      this.toggle();
    }
  }

  private _handleActionClick(e: MouseEvent) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('fzl-card-action', {
        detail: { action: this.actionLabel || 'action', originalEvent: e },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const isCollapsible = this.collapsible;
    const isExpanded = !isCollapsible || this.expanded;
    const isScrollable = this.bodyMaxHeight && this.bodyMaxHeight !== 'none';

    return html`
      <article
        class="fzl-card ${isCollapsible ? 'collapsible' : ''} ${isCollapsible ? (isExpanded ? 'expanded' : 'collapsed') : ''}"
        part="card"
      >
        <div class="fzl-card-header" part="card-header">
          <div
            class="fzl-card-title-group ${isCollapsible ? 'is-clickable' : ''}"
            role=${isCollapsible ? 'button' : 'region'}
            tabindex=${isCollapsible ? '0' : '-1'}
            aria-expanded=${isCollapsible ? (isExpanded ? 'true' : 'false') : undefined}
            @click=${this._handleTitleClick}
            @keydown=${this._handleTitleKeyDown}
          >
            <div class="fzl-card-title-row">
              ${isCollapsible
                ? html`<span class="fzl-card-accordion-chevron" aria-hidden="true">▾</span>`
                : ''}
              <slot name="title"><h3 class="fzl-card-title">${this.title}</h3></slot>
            </div>
            ${this.subtitle || this.querySelector('[slot="subtitle"]')
              ? html`<slot name="subtitle"><span class="fzl-card-subtitle">${this.subtitle}</span></slot>`
              : ''}
          </div>
          <div class="fzl-card-header-actions">
            <slot name="header-actions">
              ${this.badge
                ? html`<span class="fzl-badge variant-${this.badgeVariant}">${this.badge}</span>`
                : ''}
            </slot>
          </div>
        </div>

        <div
          class="fzl-card-body ${isScrollable ? 'scrollable' : ''}"
          part="card-body"
          style=${isScrollable ? `max-height: ${this.bodyMaxHeight};` : ''}
        >
          <slot></slot>
        </div>

        <div class="fzl-card-footer" part="card-footer">
          <slot name="footer"></slot>
          ${this.actionLabel
            ? html`
                <button type="button" class="fzl-card-action-btn" @click=${this._handleActionClick}>
                  ${this.actionLabel}
                </button>
              `
            : ''}
        </div>
      </article>
    `;
  }
}

if (!customElements.get('fzl-lit-card')) {
  customElements.define('fzl-lit-card', FzlLitCard);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-lit-card': FzlLitCard;
  }
}
