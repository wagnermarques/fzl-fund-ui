import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  AfterViewChecked,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetController, FzlKeyNavController } from '@fzl/core';
export { FzlNgCardComponent } from './card.component';

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
  collapsible?: boolean;
  expanded?: boolean;
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
 * Reorders a list of cards according to a sequence of saved IDs.
 */
export function applyPersistedCardOrder(items: FzlCardItem[], orderIds: string[]): FzlCardItem[] {
  if (!Array.isArray(orderIds) || orderIds.length === 0 || items.length <= 1) return items;
  const itemMap = new Map<string, FzlCardItem>();
  for (const item of items) {
    if (item && item.id !== undefined && item.id !== null) {
      itemMap.set(String(item.id), item);
    }
  }
  const reordered: FzlCardItem[] = [];
  for (const id of orderIds) {
    const found = itemMap.get(String(id));
    if (found) {
      reordered.push(found);
      itemMap.delete(String(id));
    }
  }
  for (const remaining of itemMap.values()) {
    reordered.push(remaining);
  }
  return reordered;
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
 * @attr {boolean} [allow-reorder=false] - Whether cards can be manually reordered
 * @attr {string} [empty-text='Nenhum item encontrado'] - Text when list is empty
 *
 * @fires {CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-click - Dispatched when a card is clicked
 * @fires {CustomEvent<{ action: string; item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-action - Dispatched when card action button is clicked
 * @fires {CustomEvent<{ sortBy: string; sortOrder: FzlSortOrder }>} fzl-sort-change - Dispatched when sorting criteria changes
 * @fires {CustomEvent<{ filter: string }>} fzl-filter-change - Dispatched when search filter text changes
 * @fires {CustomEvent<{ items: FzlCardItem[]; fromIndex: number; toIndex: number; item: FzlCardItem }>} fzl-cards-reorder - Dispatched when cards are reordered
 * @fires {CustomEvent<{ widgetId: string; originalEvent: FocusEvent }>} fzl-focus - Dispatched when the widget gains focus
 * @fires {CustomEvent<{ widgetId: string; originalEvent: FocusEvent }>} fzl-blur - Dispatched when the widget loses focus
 *
 * @csspart container - The outer root container
 * @csspart toolbar - The top sorting and filtering toolbar
 * @csspart list - The scrollable card container element
 * @csspart card - Each card element in the collection
 * @csspart card-header - Card header element
 * @csspart card-body - Card description/body element
 * @csspart card-footer - Card footer containing tags and action
 * @csspart reorder-controls - Reordering buttons container on each card
 */
@Component({
  selector: 'fzl-ng-card-list',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.Default,
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
        (keydown)="onFeedKeyDown($event)"
      >
        <li class="fzl-empty" *ngIf="displayedItems.length === 0" role="listitem">
          {{ emptyText }}
        </li>

        <li
          class="fzl-card"
          *ngFor="let item of displayedItems; let idx = index"
          [class.dragging]="draggedIndex === idx"
          [class.drag-over]="dragOverIndex === idx"
          [class.collapsible]="isItemCollapsible(item)"
          [class.expanded]="isItemCollapsible(item) && isCardExpanded(item)"
          [class.collapsed]="isItemCollapsible(item) && !isCardExpanded(item)"
          [attr.draggable]="isAllowReorder ? 'true' : null"
          (dragstart)="onDragStart(idx, $event)"
          (dragover)="onDragOver(idx, $event)"
          (dragleave)="onDragLeave(idx, $event)"
          (drop)="onDrop(idx, $event)"
          (dragend)="onDragEnd()"
          part="card"
          role="listitem"
          tabindex="0"
          (click)="onCardClick($event, item, idx)"
          (keydown.enter)="onCardClick($event, item, idx)"
          (keydown.space)="onCardClick($event, item, idx)"
        >
          <div class="fzl-card-header" part="card-header">
            <div
              class="fzl-card-title-group"
              [class.is-clickable]="isItemCollapsible(item)"
              [attr.role]="isItemCollapsible(item) ? 'button' : null"
              [tabindex]="isItemCollapsible(item) ? 0 : -1"
              [attr.aria-expanded]="isItemCollapsible(item) ? (isCardExpanded(item) ? 'true' : 'false') : null"
              [attr.aria-controls]="isItemCollapsible(item) ? 'fzl-card-body-' + item.id : null"
              (click)="isItemCollapsible(item) && toggleCardExpand(item, idx, $event)"
              (keydown.enter)="isItemCollapsible(item) && toggleCardExpand(item, idx, $event)"
              (keydown.space)="isItemCollapsible(item) && toggleCardExpand(item, idx, $event)"
            >
              <div class="fzl-card-title-row">
                <span
                  class="fzl-card-accordion-chevron"
                  [class.expanded]="isCardExpanded(item)"
                  *ngIf="isItemCollapsible(item)"
                  aria-hidden="true"
                >▾</span>
                <h3
                  class="fzl-card-title is-clickable"
                  role="button"
                  tabindex="0"
                  (click)="onTitleClick($event, item, idx)"
                  (keydown.enter)="onTitleClick($event, item, idx)"
                  (keydown.space)="onTitleClick($event, item, idx)"
                >{{ item.title }}</h3>
              </div>
              <span class="fzl-card-subtitle" *ngIf="item.subtitle">{{ item.subtitle }}</span>
            </div>
            <div class="fzl-card-header-actions">
              <div class="fzl-card-reorder-controls" part="reorder-controls" *ngIf="isAllowReorder">
                <span class="fzl-drag-handle" title="Arraste para reordenar" aria-hidden="true">⠿</span>
                <button
                  type="button"
                  class="fzl-btn-reorder"
                  [disabled]="idx === 0"
                  (click)="moveCard(idx, -1, $event)"
                  title="Mover para cima"
                  aria-label="Mover card para cima"
                >
                  ▲
                </button>
                <button
                  type="button"
                  class="fzl-btn-reorder"
                  [disabled]="idx === displayedItems.length - 1"
                  (click)="moveCard(idx, 1, $event)"
                  title="Mover para baixo"
                  aria-label="Mover card para baixo"
                >
                  ▼
                </button>
              </div>
              <span
                class="fzl-badge"
                *ngIf="item.badge || item.priority"
                [ngClass]="getPriorityClass(item.priority)"
              >
                {{ item.badge || item.priority }}
              </span>
            </div>
          </div>

          <div
            class="fzl-card-body"
            [id]="'fzl-card-body-' + item.id"
            [class.scrollable]="isItemCollapsible(item) || (cardBodyMaxHeight && cardBodyMaxHeight !== 'none')"
            [style.maxHeight]="cardBodyMaxHeight && cardBodyMaxHeight !== 'none' ? cardBodyMaxHeight : null"
            part="card-body"
            *ngIf="item.description"
          >
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

      /* Collapsible / Accordion Card styles */
      .fzl-card.collapsible {
        transition: border-color var(--_fzl-transition-fast), box-shadow var(--_fzl-transition-fast);
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

      .fzl-card-title-group.is-clickable {
        cursor: pointer;
        user-select: none;
        outline: none;
      }

      .fzl-card-title-group.is-clickable:hover .fzl-card-title {
        color: var(--_fzl-color-primary);
      }

      .fzl-card-title-group.is-clickable:focus-visible {
        outline: 2px solid var(--_fzl-color-primary);
        outline-offset: 2px;
        border-radius: var(--_fzl-radius-sm);
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
        transition: transform var(--_fzl-transition-fast), color var(--_fzl-transition-fast);
        transform: rotate(-90deg);
        user-select: none;
      }

      .fzl-card.expanded .fzl-card-accordion-chevron {
        transform: rotate(0deg);
        color: var(--_fzl-color-primary);
      }

      .fzl-card[draggable="true"] {
        cursor: grab;
      }

      .fzl-card.dragging {
        opacity: 0.45;
        border-style: dashed;
        border-color: var(--_fzl-color-primary);
        cursor: grabbing;
      }

      .fzl-card.drag-over {
        border-color: var(--_fzl-color-primary);
        box-shadow: 0 -3px 0 0 var(--_fzl-color-primary);
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

      .fzl-card-header-actions {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-1);
      }

      .fzl-card-reorder-controls {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        background-color: var(--_fzl-color-surface-muted);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-sm);
        padding: 1px 3px;
      }

      .fzl-btn-reorder {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        padding: 0;
        font-size: 9px;
        font-family: inherit;
        border: 1px solid var(--_fzl-color-border);
        background: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        border-radius: var(--_fzl-radius-sm);
        cursor: pointer;
        line-height: 1;
        transition: background-color var(--_fzl-transition-fast), color var(--_fzl-transition-fast);
      }

      .fzl-btn-reorder:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }

      .fzl-btn-reorder:not(:disabled):hover {
        background: var(--_fzl-color-primary);
        color: var(--_fzl-color-primary-contrast);
        border-color: var(--_fzl-color-primary);
      }

      .fzl-drag-handle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 2px;
        font-size: 13px;
        color: var(--_fzl-color-text-muted);
        cursor: grab;
        user-select: none;
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
        cursor: pointer;
        user-select: none;
        transition: color var(--_fzl-transition-fast), text-decoration var(--_fzl-transition-fast);
      }

      .fzl-card-title:hover {
        color: var(--_fzl-color-primary);
        text-decoration: underline;
      }

      .fzl-card-title:focus-visible {
        outline: 2px solid var(--_fzl-color-primary);
        outline-offset: 2px;
        border-radius: var(--_fzl-radius-sm);
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

      .fzl-card-body.scrollable::-webkit-scrollbar-thumb:hover {
        background-color: var(--_fzl-color-border-hover);
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
export class FzlNgCardListComponent implements OnInit, AfterViewChecked, OnDestroy {
  readonly fzlWidget: FzlWidgetController;
  private readonly _keyNav: FzlKeyNavController;
  private _pendingFocusIndex: number | null = null;
  private _items: FzlCardItem[] | string = [];
  private _initialItems: FzlCardItem[] | null = null;

  constructor(private readonly _host: ElementRef<HTMLElement>) {
    this.fzlWidget = new FzlWidgetController(_host.nativeElement);
    this._keyNav = new FzlKeyNavController(_host.nativeElement, {
      orientation: 'both',
      rovingTabIndex: true,
      getItems: () =>
        Array.from(
          this._host.nativeElement.shadowRoot?.querySelectorAll<HTMLElement>('.fzl-card') ?? []
        ),
    });
  }

  @Input()
  get items(): FzlCardItem[] | string {
    return this._items;
  }
  set items(val: FzlCardItem[] | string) {
    const parsedNew = parseFzlCardItems(val);
    const parsedOld = parseFzlCardItems(this._items);
    if (JSON.stringify(parsedNew) !== JSON.stringify(parsedOld)) {
      this._items = val;
      if (!this._initialItems) {
        this._initialItems = [...parsedNew];
      }
      this.cdr?.detectChanges();
    }
  }

  @Input() layout: FzlCardLayout = 'grid';
  @Input('max-height') maxHeight: string = 'none';
  @Input('sort-by') sortBy: string = '';
  @Input('sort-order') sortOrder: FzlSortOrder = 'asc';
  @Input('allow-sort') allowSort: boolean | string = false;
  @Input('allow-filter') allowFilter: boolean | string = false;
  @Input('allow-reorder') allowReorder: boolean | string = false;
  @Input('storage-key') storageKey: string = '';
  @Input('storage-type') storageType: 'local' | 'session' = 'local';
  @Input('empty-text') emptyText: string = 'Nenhum item encontrado';
  @Input('collapsible-cards') collapsibleCards: boolean | string = false;
  @Input('card-body-max-height') cardBodyMaxHeight: string = '180px';

  @Output('fzl-card-click') fzlCardClick = new EventEmitter<{
    item: FzlCardItem;
    index: number;
    originalEvent: MouseEvent;
  }>();

  @Output('fzl-card-toggle') fzlCardToggle = new EventEmitter<{
    item: FzlCardItem;
    index: number;
    expanded: boolean;
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

  @Output('fzl-cards-reorder') fzlCardsReorder = new EventEmitter<{
    items: FzlCardItem[];
    orderIds: string[];
    fromIndex: number;
    toIndex: number;
    item: FzlCardItem;
  }>();

  filterQuery: string = '';
  currentSortBy: string = '';
  currentSortOrder: FzlSortOrder = 'asc';
  draggedIndex: number | null = null;
  dragOverIndex: number | null = null;
  userExpandedState = new Map<string, boolean>();

  isItemCollapsible(item: FzlCardItem): boolean {
    return (
      this.collapsibleCards === '' ||
      this.collapsibleCards === true ||
      this.collapsibleCards === 'true' ||
      Boolean(item.collapsible)
    );
  }

  isCardExpanded(item: FzlCardItem): boolean {
    if (!this.isItemCollapsible(item)) return true;
    const id = String(item.id);
    if (this.userExpandedState.has(id)) {
      return Boolean(this.userExpandedState.get(id));
    }
    return Boolean(item.expanded);
  }

  toggleCardExpand(item: FzlCardItem, index: number, event?: Event): boolean {
    if (event) {
      event.stopPropagation();
    }
    const current = this.isCardExpanded(item);
    const next = !current;
    this.userExpandedState.set(String(item.id), next);
    this.fzlCardToggle.emit({ item, index, expanded: next });
    this.cdr?.detectChanges();
    return next;
  }

  expandAllCards(): void {
    this.displayedItems.forEach((item) => this.userExpandedState.set(String(item.id), true));
    this.cdr?.detectChanges();
  }

  collapseAllCards(): void {
    this.displayedItems.forEach((item) => this.userExpandedState.set(String(item.id), false));
    this.cdr?.detectChanges();
  }

  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.fzlWidget.connect();
    this.currentSortBy = this.sortBy;
    this.currentSortOrder = this.sortOrder;
  }

  ngAfterViewChecked(): void {
    this._keyNav.syncTabIndices();
    if (this._pendingFocusIndex !== null) {
      const targetIdx = this._pendingFocusIndex;
      this._pendingFocusIndex = null;
      this._keyNav.focusItem(targetIdx);
    }
  }

  ngOnDestroy(): void {
    this.fzlWidget.disconnect();
  }

  onFeedKeyDown(event: KeyboardEvent): void {
    this._keyNav.handleKeyDown(event);
  }

  get isAllowSort(): boolean {
    if (typeof this.allowSort === 'string') return this.allowSort !== 'false';
    return Boolean(this.allowSort);
  }

  get isAllowFilter(): boolean {
    if (typeof this.allowFilter === 'string') return this.allowFilter !== 'false';
    return Boolean(this.allowFilter);
  }

  get isAllowReorder(): boolean {
    if (typeof this.allowReorder === 'string') return this.allowReorder !== 'false';
    return Boolean(this.allowReorder);
  }

  get feedMaxHeight(): string {
    return this.maxHeight && this.maxHeight !== 'none' ? this.maxHeight : '';
  }

  private _getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return this.storageType === 'session' ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  }

  private _getPersistedOrderIds(): string[] | null {
    if (!this.storageKey) return null;
    const storage = this._getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(this.storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }

  private _persistOrderIds(orderIds: string[]): void {
    if (!this.storageKey) return;
    const storage = this._getStorage();
    if (!storage) return;
    try {
      storage.setItem(this.storageKey, JSON.stringify(orderIds));
    } catch (e) {
      console.warn('[fzl-ng-card-list] Failed to persist card order:', e);
    }
  }

  public clearPersistedOrder(): void {
    if (this.storageKey) {
      const storage = this._getStorage();
      if (storage) {
        try {
          storage.removeItem(this.storageKey);
        } catch {}
      }
    }
    if (this._initialItems && this._initialItems.length > 0) {
      this._items = typeof this._items === 'string'
        ? JSON.stringify(this._initialItems)
        : [...this._initialItems];
    }
    this.cdr.detectChanges();
  }

  private _getEffectiveItems(): FzlCardItem[] {
    const raw = parseFzlCardItems(this.items);
    const savedOrder = this._getPersistedOrderIds();
    return savedOrder ? applyPersistedCardOrder(raw, savedOrder) : raw;
  }

  get displayedItems(): FzlCardItem[] {
    const raw = this._getEffectiveItems();
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
    if (this.isItemCollapsible(item)) {
      this.toggleCardExpand(item, index, event);
    }
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

  moveCard(idx: number, delta: number, event: MouseEvent) {
    event.stopPropagation();
    this.reorderCards(idx, idx + delta);
  }

  reorderCards(fromIndex: number, toIndex: number) {
    const currentItems = this._getEffectiveItems();
    if (fromIndex < 0 || fromIndex >= currentItems.length) return;
    if (toIndex < 0 || toIndex >= currentItems.length) return;
    if (fromIndex === toIndex) return;

    const updated = [...currentItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    this.currentSortBy = '';
    this.sortBy = '';
    this._pendingFocusIndex = toIndex;
    this._keyNav.focusedIndex = toIndex;

    const orderIds = updated.map((item) => String(item.id));
    this._persistOrderIds(orderIds);

    this._items = updated;

    this.fzlCardsReorder.emit({
      items: updated,
      orderIds,
      fromIndex,
      toIndex,
      item: moved,
    });
    this.cdr.detectChanges();
  }

  onDragStart(idx: number, event: DragEvent) {
    if (!this.isAllowReorder) return;
    this.draggedIndex = idx;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(idx));
    }
    this.cdr.detectChanges();
  }

  onDragOver(idx: number, event: DragEvent) {
    if (!this.isAllowReorder) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this.dragOverIndex !== idx) {
      this.dragOverIndex = idx;
      this.cdr.detectChanges();
    }
  }

  onDragLeave(idx: number, event: DragEvent) {
    const target = event.currentTarget as HTMLElement;
    if (target && !target.contains(event.relatedTarget as Node)) {
      if (this.dragOverIndex === idx) {
        this.dragOverIndex = null;
        this.cdr.detectChanges();
      }
    }
  }

  onDrop(idx: number, event: DragEvent) {
    if (!this.isAllowReorder) return;
    event.preventDefault();
    event.stopPropagation();
    const data = event.dataTransfer?.getData('text/plain');
    const from = data !== undefined && data !== '' ? parseInt(data, 10) : this.draggedIndex;
    this.draggedIndex = null;
    this.dragOverIndex = null;
    if (from !== null && !isNaN(from) && from !== idx) {
      this.reorderCards(from, idx);
    }
    this.cdr.detectChanges();
  }

  onDragEnd() {
    this.draggedIndex = null;
    this.dragOverIndex = null;
    this.cdr.detectChanges();
  }
}
