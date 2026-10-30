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

export interface FzlCardItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  status?: string;
  priority?: string;
  category?: string;
  date?: string;
  badge?: string;
  tags?: string[];
  actionLabel?: string;
  [key: string]: unknown;
}

export type FzlCardLayout = 'vertical' | 'grid' | 'horizontal';
export type FzlSortOrder = 'asc' | 'desc';

export function parseFzlCardItems(items: FzlCardItem[] | string | null | undefined): FzlCardItem[] {
  if (Array.isArray(items)) {
    return items;
  }
  if (typeof items === 'string' && items.trim()) {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ignora erro
    }
  }
  return [];
}

const PRIORITY_WEIGHTS: Record<string, number> = {
  urgente: 4,
  urgent: 4,
  critica: 4,
  crítica: 4,
  critical: 4,
  alta: 3,
  high: 3,
  media: 2,
  média: 2,
  medium: 2,
  baixa: 1,
  low: 1,
};

export function sortFzlCardItems(
  items: FzlCardItem[],
  sortBy: string,
  sortOrder: FzlSortOrder = 'asc'
): FzlCardItem[] {
  if (!sortBy || items.length <= 1) return [...items];

  const sorted = [...items].sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'priority') {
      const pA = typeof valA === 'string' ? PRIORITY_WEIGHTS[valA.toLowerCase()] ?? 0 : Number(valA || 0);
      const pB = typeof valB === 'string' ? PRIORITY_WEIGHTS[valB.toLowerCase()] ?? 0 : Number(valB || 0);
      return pA - pB;
    }

    if (sortBy === 'date' || sortBy === 'dueDate') {
      const timeA = valA ? new Date(String(valA)).getTime() : 0;
      const timeB = valB ? new Date(String(valB)).getTime() : 0;
      return timeA - timeB;
    }

    const strA = valA !== undefined && valA !== null ? String(valA) : '';
    const strB = valB !== undefined && valB !== null ? String(valB) : '';
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  });

  if (sortOrder === 'desc') {
    sorted.reverse();
  }
  return sorted;
}

export function filterFzlCardItems(items: FzlCardItem[], query: string): FzlCardItem[] {
  const clean = query?.trim().toLowerCase();
  if (!clean) return items;

  return items.filter((item) => {
    const titleMatch = item.title?.toLowerCase().includes(clean);
    const descMatch = item.description?.toLowerCase().includes(clean);
    const subMatch = item.subtitle?.toLowerCase().includes(clean);
    const catMatch = item.category?.toLowerCase().includes(clean);
    const statusMatch = item.status?.toLowerCase().includes(clean);
    const tagMatch = Array.isArray(item.tags) && item.tags.some((t) => t.toLowerCase().includes(clean));

    return Boolean(titleMatch || descMatch || subMatch || catMatch || statusMatch || tagMatch);
  });
}

/**
 * Angular Elements Card List Custom Element (`fzl-ng-card-list`)
 * Displays structured cards with sorting, filtering, and responsive scrolling.
 *
 * @customElement fzl-ng-card-list
 * @tag fzl-ng-card-list
 *
 * @attr {string} [items='[]'] - Card items array or JSON string
 * @attr {string} [layout='grid'] - Layout mode: 'vertical' | 'grid' | 'horizontal'
 * @attr {string} [max-height='none'] - Max height for scroll container (e.g. '500px')
 * @attr {string} [sort-by=''] - Field to sort by ('title', 'date', 'priority', 'status', 'category')
 * @attr {string} [sort-order='asc'] - Sort order: 'asc' | 'desc'
 * @attr {boolean} [allow-sort=false] - Whether to show the sorting toolbar
 * @attr {boolean} [allow-filter=false] - Whether to show the filter search input
 * @attr {string} [empty-text='Nenhum item encontrado'] - Text when list is empty
 *
 * @fires {CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-click - Dispatched when a card is clicked
 * @fires {CustomEvent<{ action: string; item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-action - Dispatched when card action button is clicked
 * @fires {CustomEvent<{ sortBy: string; sortOrder: FzlSortOrder }>} fzl-sort-change - Dispatched when sorting criteria changes
 * @fires {CustomEvent<{ filter: string }>} fzl-filter-change - Dispatched when search filter text changes
 *
 * @csspart container - The outer root container
 * @csspart toolbar - The top sorting and filtering toolbar
 * @csspart list - The scrollable card container element
 * @csspart card - Each card element in the collection
 * @csspart card-header - Card header element
 * @csspart card-body - Card description/body element
 * @csspart card-footer - Card footer containing tags and action
 */
@Component({
  selector: 'fzl-ng-card-list',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fzl-card-list-container" part="container" role="region" aria-label="Lista de Cards">
      <div class="fzl-toolbar" part="toolbar" *ngIf="isAllowSort || isAllowFilter">
        <div class="fzl-toolbar-group" *ngIf="isAllowFilter">
          <input
            type="search"
            class="fzl-input"
            placeholder="Filtrar cards..."
            [value]="filterQuery"
            (input)="onFilterInput($event)"
            aria-label="Filtrar cards"
          />
        </div>
        <div *ngIf="!isAllowFilter"></div>

        <div class="fzl-toolbar-group" *ngIf="isAllowSort">
          <label style="font-size: var(--_fzl-font-size-xs); color: var(--_fzl-color-text-muted);">
            Ordenar por:
          </label>
          <select
            class="fzl-select"
            [value]="currentSortBy"
            (change)="onSortFieldChange($event)"
            aria-label="Ordenar por campo"
          >
            <option value="">Padrão</option>
            <option value="title">Título</option>
            <option value="date">Data / Prazo</option>
            <option value="priority">Prioridade</option>
            <option value="category">Categoria</option>
            <option value="status">Status</option>
          </select>
          <button
            type="button"
            class="fzl-btn-icon"
            (click)="toggleSortOrder()"
            [title]="currentSortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'"
            [attr.aria-label]="currentSortOrder === 'asc' ? 'Alternar para Decrescente' : 'Alternar para Crescente'"
          >
            {{ currentSortOrder === 'asc' ? '▲' : '▼' }}
          </button>
        </div>
      </div>

      <ul
        class="fzl-card-feed"
        [ngClass]="'layout-' + layout"
        [style.max-height]="feedMaxHeight"
        part="list"
        role="list"
      >
        <li class="fzl-empty" *ngIf="displayedItems.length === 0" role="listitem">
          {{ emptyText }}
        </li>

        <li
          class="fzl-card"
          *ngFor="let item of displayedItems; let idx = index"
          part="card"
          role="listitem"
          tabindex="0"
          (click)="onCardClick($event, item, idx)"
          (keydown.enter)="onCardClick($event, item, idx)"
          (keydown.space)="onCardClick($event, item, idx)"
        >
          <div class="fzl-card-header" part="card-header">
            <div class="fzl-card-title-group">
              <h3 class="fzl-card-title">{{ item.title }}</h3>
              <span class="fzl-card-subtitle" *ngIf="item.subtitle">{{ item.subtitle }}</span>
            </div>
            <span
              class="fzl-badge"
              *ngIf="item.badge || item.priority"
              [ngClass]="getPriorityClass(item.priority)"
            >
              {{ item.badge || item.priority }}
            </span>
          </div>

          <div class="fzl-card-body" part="card-body" *ngIf="item.description">
            {{ item.description }}
          </div>

          <div class="fzl-card-footer" part="card-footer">
            <div class="fzl-card-tags">
              <span class="fzl-tag" *ngIf="item.category">📁 {{ item.category }}</span>
              <span class="fzl-tag" *ngIf="item.date">📅 {{ item.date }}</span>
              <span class="fzl-tag" *ngIf="item.status">● {{ item.status }}</span>
              <ng-container *ngIf="item.tags">
                <span class="fzl-tag" *ngFor="let tag of item.tags">#{{ tag }}</span>
              </ng-container>
            </div>

            <button
              type="button"
              class="fzl-card-action-btn"
              *ngIf="item.actionLabel"
              (click)="onCardAction($event, item, idx)"
            >
              {{ item.actionLabel }}
            </button>
          </div>
        </li>
      </ul>
    </div>
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

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }

      .fzl-card-list-container {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3);
        width: 100%;
      }

      .fzl-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--_fzl-space-2);
        padding-bottom: var(--_fzl-space-2);
        border-bottom: 1px solid var(--_fzl-color-border);
      }

      .fzl-toolbar-group {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2);
      }

      .fzl-input,
      .fzl-select {
        font-family: inherit;
        font-size: var(--_fzl-font-size-sm);
        padding: var(--_fzl-space-1) var(--_fzl-space-2);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
        background-color: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        outline: none;
        transition: border-color var(--_fzl-transition-fast);
      }

      .fzl-input:focus,
      .fzl-select:focus {
        border-color: var(--_fzl-color-primary);
        box-shadow: var(--_fzl-focus-ring);
      }

      .fzl-btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        min-height: 32px;
        padding: var(--_fzl-space-1);
        font-size: var(--_fzl-font-size-sm);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
        background: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        cursor: pointer;
        transition: background var(--_fzl-transition-fast);
      }

      .fzl-btn-icon:hover {
        background: var(--_fzl-color-surface-muted);
      }

      .fzl-card-feed {
        overflow-y: auto;
        overflow-x: hidden;
        padding: var(--_fzl-space-1);
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3);
        list-style: none;
        margin: 0;
      }

      .fzl-card-feed.layout-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: var(--_fzl-space-3);
      }

      .fzl-card-feed.layout-horizontal {
        display: flex;
        flex-direction: row;
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: var(--_fzl-space-2);
      }

      .fzl-card-feed.layout-horizontal .fzl-card {
        min-width: 280px;
        max-width: 320px;
        flex-shrink: 0;
      }

      .fzl-card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background-color: var(--_fzl-color-surface);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
        padding: var(--_fzl-space-3);
        cursor: pointer;
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

      .fzl-badge.priority-alta,
      .fzl-badge.priority-high,
      .fzl-badge.priority-urgente,
      .fzl-badge.priority-urgent {
        background-color: #fee2e2;
        color: var(--_fzl-color-danger);
        border-color: #fca5a5;
      }

      .fzl-badge.priority-media,
      .fzl-badge.priority-medium {
        background-color: #fef3c7;
        color: var(--_fzl-color-warning);
        border-color: #fcd34d;
      }

      .fzl-badge.priority-baixa,
      .fzl-badge.priority-low {
        background-color: #dcfce7;
        color: var(--_fzl-color-success);
        border-color: #86efac;
      }

      .fzl-card-body {
        font-size: var(--_fzl-font-size-sm);
        color: var(--_fzl-color-text);
        line-height: var(--_fzl-line-height);
        margin-bottom: var(--_fzl-space-3);
        flex-grow: 1;
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

      .fzl-card-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .fzl-tag {
        font-size: 0.7rem;
        padding: 1px 5px;
        background: var(--_fzl-color-surface-muted);
        border-radius: var(--_fzl-radius-sm);
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

      .fzl-empty {
        padding: var(--_fzl-space-6) var(--_fzl-space-3);
        text-align: center;
        color: var(--_fzl-color-text-muted);
        font-size: var(--_fzl-font-size-sm);
        border: 1px dashed var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
      }
    `,
  ],
})
export class FzlNgCardListComponent {
  @Input() items: FzlCardItem[] | string = [];
  @Input() layout: FzlCardLayout = 'grid';
  @Input('max-height') maxHeight: string = 'none';
  @Input('sort-by') sortBy: string = '';
  @Input('sort-order') sortOrder: FzlSortOrder = 'asc';
  @Input('allow-sort') allowSort: boolean | string = false;
  @Input('allow-filter') allowFilter: boolean | string = false;
  @Input('empty-text') emptyText: string = 'Nenhum item encontrado';

  @Output('fzl-card-click') fzlCardClick = new EventEmitter<{
    item: FzlCardItem;
    index: number;
    originalEvent: MouseEvent;
  }>();

  @Output('fzl-card-action') fzlCardAction = new EventEmitter<{
    action: string;
    item: FzlCardItem;
    index: number;
    originalEvent: MouseEvent;
  }>();

  @Output('fzl-sort-change') fzlSortChange = new EventEmitter<{
    sortBy: string;
    sortOrder: FzlSortOrder;
  }>();

  @Output('fzl-filter-change') fzlFilterChange = new EventEmitter<{
    filter: string;
  }>();

  filterQuery: string = '';
  currentSortBy: string = '';
  currentSortOrder: FzlSortOrder = 'asc';

  ngOnInit() {
    this.currentSortBy = this.sortBy;
    this.currentSortOrder = this.sortOrder;
  }

  get isAllowSort(): boolean {
    if (typeof this.allowSort === 'string') return this.allowSort !== 'false';
    return Boolean(this.allowSort);
  }

  get isAllowFilter(): boolean {
    if (typeof this.allowFilter === 'string') return this.allowFilter !== 'false';
    return Boolean(this.allowFilter);
  }

  get feedMaxHeight(): string {
    return this.maxHeight && this.maxHeight !== 'none' ? this.maxHeight : '';
  }

  get displayedItems(): FzlCardItem[] {
    const raw = parseFzlCardItems(this.items);
    const filtered = filterFzlCardItems(raw, this.filterQuery);
    return sortFzlCardItems(filtered, this.currentSortBy || this.sortBy, this.currentSortOrder);
  }

  getPriorityClass(priority?: string): string {
    return priority ? `priority-${priority.toLowerCase()}` : '';
  }

  onFilterInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.filterQuery = target.value;
    this.fzlFilterChange.emit({ filter: this.filterQuery });
  }

  onSortFieldChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.currentSortBy = target.value;
    this.fzlSortChange.emit({
      sortBy: this.currentSortBy,
      sortOrder: this.currentSortOrder,
    });
  }

  toggleSortOrder() {
    this.currentSortOrder = this.currentSortOrder === 'asc' ? 'desc' : 'asc';
    this.fzlSortChange.emit({
      sortBy: this.currentSortBy,
      sortOrder: this.currentSortOrder,
    });
  }

  onCardClick(event: MouseEvent, item: FzlCardItem, index: number) {
    this.fzlCardClick.emit({ item, index, originalEvent: event });
  }

  onCardAction(event: MouseEvent, item: FzlCardItem, index: number) {
    event.stopPropagation();
    this.fzlCardAction.emit({
      action: item.actionLabel ?? 'action',
      item,
      index,
      originalEvent: event,
    });
  }
}
