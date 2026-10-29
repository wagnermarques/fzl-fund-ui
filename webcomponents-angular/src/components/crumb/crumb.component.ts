import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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

/**
 * Angular Elements Breadcrumb ("Crumb") Custom Element showing current navigation path
 * and providing back navigation to the previous view.
 *
 * @customElement fzl-ng-crumb
 * @tag fzl-ng-crumb
 *
 * @attr {string} [items='[]'] - Breadcrumb items array or JSON/delimited string
 * @attr {string} [path=''] - Path string shorthand (e.g. "Início / Config / Backend")
 * @attr {string} [separator='›'] - Visual separator between breadcrumb items
 * @attr {boolean} [show-back=true] - Whether to display the back button
 * @attr {boolean} [back-disabled=false] - Whether the back button is disabled
 * @attr {string} [back-label='Voltar'] - Label for the back navigation button
 * @attr {string} [back-href=''] - Optional explicit target URL/hash for the back button
 * @attr {string} [aria-label='Navegação estrutural'] - Accessible label for the `<nav>` landmark
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
@Component({
  selector: 'fzl-ng-crumb-internal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav part="nav" [attr.aria-label]="ariaLabel || 'Navegação estrutural'">
      <button
        *ngIf="isShowBack"
        part="back-button"
        type="button"
        class="back-btn"
        [disabled]="isBackDisabled"
        [attr.aria-label]="backLabel"
        (click)="onBackClick($event)"
      >
        <svg class="back-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
        </svg>
        <span>{{ backLabel }}</span>
      </button>
      <ol part="list">
        <li part="item" *ngFor="let item of resolvedItems; let idx = index; let isLast = last">
          <span *ngIf="isLast" part="current" class="crumb-current" aria-current="page">{{
            item.label
          }}</span>
          <a
            *ngIf="!isLast && item.href"
            part="link"
            class="crumb-link"
            [href]="item.href"
            (click)="onItemClick($event, item, idx)"
            >{{ item.label }}</a
          >
          <span *ngIf="!isLast && !item.href" class="crumb-text">{{ item.label }}</span>
          <span *ngIf="!isLast" part="separator" class="separator" aria-hidden="true">{{
            separator
          }}</span>
        </li>
      </ol>
    </nav>
  `,
  styles: [
    fzlDesignTokensCss,
    `
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
    `,
  ],
})
export class FzlNgCrumbComponent {
  @Input() items: FzlCrumbItem[] | string = [];
  @Input() path: string = '';
  @Input() separator: string = '›';
  @Input('show-back') showBack: boolean | string = true;
  @Input('back-disabled') backDisabled: boolean | string = false;
  @Input('back-label') backLabel: string = 'Voltar';
  @Input('back-href') backHref: string = '';
  @Input('aria-label') ariaLabel: string = 'Navegação estrutural';

  @Output('fzl-back') fzlBack = new EventEmitter<{ backHref: string; originalEvent: MouseEvent }>();
  @Output('fzl-navigate') fzlNavigate = new EventEmitter<{
    item: FzlCrumbItem;
    index: number;
    href?: string;
    originalEvent: MouseEvent;
  }>();

  get isShowBack(): boolean {
    if (typeof this.showBack === 'string') return this.showBack !== 'false';
    return Boolean(this.showBack);
  }

  get isBackDisabled(): boolean {
    if (typeof this.backDisabled === 'string') return this.backDisabled !== 'false';
    return Boolean(this.backDisabled);
  }

  get resolvedItems(): FzlCrumbItem[] {
    return parseFzlCrumbItems(this.items, this.path);
  }

  onBackClick(event: MouseEvent) {
    if (this.isBackDisabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    this.fzlBack.emit({ backHref: this.backHref, originalEvent: event });
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

  onItemClick(event: MouseEvent, item: FzlCrumbItem, index: number) {
    this.fzlNavigate.emit({ item, index, href: item.href, originalEvent: event });
  }
}
