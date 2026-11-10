import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetController } from '@fzl/core';

export type FzlBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

@Component({
  selector: 'fzl-ng-card',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article
      class="fzl-card"
      [class.collapsible]="isCollapsible"
      [class.expanded]="isCollapsible && isExpanded"
      [class.collapsed]="isCollapsible && !isExpanded"
      part="card"
    >
      <div class="fzl-card-header" part="card-header">
        <div
          class="fzl-card-title-group"
          [class.is-clickable]="isCollapsible"
          [attr.role]="isCollapsible ? 'button' : 'region'"
          [tabindex]="isCollapsible ? 0 : -1"
          [attr.aria-expanded]="isCollapsible ? (isExpanded ? 'true' : 'false') : null"
          (click)="onTitleClick($event)"
          (keydown.enter)="onTitleKeydown($event)"
          (keydown.space)="onTitleKeydown($event)"
        >
          <div class="fzl-card-title-row">
            <span
              class="fzl-card-accordion-chevron"
              [class.expanded]="isExpanded"
              *ngIf="isCollapsible"
              aria-hidden="true"
            >▾</span>
            <slot name="title"><h3 class="fzl-card-title">{{ title }}</h3></slot>
          </div>
          <slot name="subtitle"><span class="fzl-card-subtitle" *ngIf="subtitle">{{ subtitle }}</span></slot>
        </div>
        <div class="fzl-card-header-actions">
          <slot name="header-actions">
            <span class="fzl-badge" [ngClass]="'variant-' + badgeVariant" *ngIf="badge">{{ badge }}</span>
          </slot>
        </div>
      </div>

      <div
        class="fzl-card-body"
        [class.scrollable]="isScrollable"
        [style.maxHeight]="isScrollable ? bodyMaxHeight : null"
        part="card-body"
      >
        <slot></slot>
      </div>

      <div class="fzl-card-footer" part="card-footer">
        <slot name="footer"></slot>
        <button
          type="button"
          class="fzl-card-action-btn"
          *ngIf="actionLabel"
          (click)="onActionClick($event)"
        >
          {{ actionLabel }}
        </button>
      </div>
    </article>
  `,
  styles: [
    `
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
    `,
  ],
})
export class FzlNgCardComponent {
  readonly fzlWidget: FzlWidgetController;
  private readonly cdr = inject(ChangeDetectorRef);

  constructor(_host: ElementRef<HTMLElement>) {
    this.fzlWidget = new FzlWidgetController(_host.nativeElement);
  }

  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() badge: string = '';
  @Input('badge-variant') badgeVariant: FzlBadgeVariant = 'default';
  @Input('action-label') actionLabel: string = '';
  @Input() collapsible: boolean | string = false;
  @Input() expanded: boolean | string = false;
  @Input('body-max-height') bodyMaxHeight: string = '180px';

  @Output('fzl-card-toggle') fzlCardToggle = new EventEmitter<{ expanded: boolean }>();
  @Output('fzl-card-action') fzlCardAction = new EventEmitter<{ action: string; originalEvent: MouseEvent }>();

  get isCollapsible(): boolean {
    return this.collapsible === '' || this.collapsible === true || this.collapsible === 'true';
  }

  get isExpanded(): boolean {
    return !this.isCollapsible || this.expanded === '' || this.expanded === true || this.expanded === 'true';
  }

  get isScrollable(): boolean {
    return Boolean(this.bodyMaxHeight && this.bodyMaxHeight !== 'none');
  }

  toggle(force?: boolean): boolean {
    if (!this.isCollapsible) return true;
    const next = typeof force === 'boolean' ? force : !this.isExpanded;
    this.expanded = next;
    this.fzlCardToggle.emit({ expanded: next });
    this.cdr.detectChanges();
    return next;
  }

  onTitleClick(e: MouseEvent): void {
    if (!this.isCollapsible) return;
    e.stopPropagation();
    this.toggle();
  }

  onTitleKeydown(e: Event): void {
    if (!this.isCollapsible) return;
    e.preventDefault();
    e.stopPropagation();
    this.toggle();
  }

  onActionClick(e: MouseEvent): void {
    e.stopPropagation();
    this.fzlCardAction.emit({ action: this.actionLabel || 'action', originalEvent: e });
  }
}
