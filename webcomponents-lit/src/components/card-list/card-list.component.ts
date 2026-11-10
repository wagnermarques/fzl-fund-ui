import { LitElement, html, css, unsafeCSS, type PropertyValues } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin, FzlKeyNavController, fzlFocus } from '@fzl/core';
export { FzlLitCard } from './card.component';

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
      // Ignora erro de parse
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
 * Items present in `orderIds` are placed first in that exact sequence;
 * any new items not in `orderIds` are appended at the end.
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
 * Multi-Engine Card List Custom Element (`fzl-lit-card-list`)
 * Displays structured cards with responsive layouts, sorting, filtering and scroll container.
 *
 * @customElement fzl-lit-card-list
 * @tag fzl-lit-card-list
 *
 * @fires {CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-click - Dispatched when a card is clicked
 * @fires {CustomEvent<{ item: FzlCardItem; index: number; expanded: boolean }>} fzl-card-toggle - Dispatched when a collapsible card is expanded or collapsed
 * @fires {CustomEvent<{ action: string; item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-action - Dispatched when card action button is clicked
 * @fires {CustomEvent<{ sortBy: string; sortOrder: FzlSortOrder }>} fzl-sort-change - Dispatched when sorting criteria changes
 * @fires {CustomEvent<{ filter: string }>} fzl-filter-change - Dispatched when search filter text changes
 * @fires {CustomEvent<{ items: FzlCardItem[]; orderIds: string[]; fromIndex: number; toIndex: number; item: FzlCardItem }>} fzl-cards-reorder - Dispatched when cards are reordered
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
export class FzlLitCardList extends FzlWidgetMixin(LitElement) {
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

      .fzl-card-list-container {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3);
        width: 100%;
      }

      /* Toolbar */
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

      /* Scroll viewport */
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

      /* Card Item */
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

      /* Empty State */
      .fzl-empty {
        padding: var(--_fzl-space-6) var(--_fzl-space-3);
        text-align: center;
        color: var(--_fzl-color-text-muted);
        font-size: var(--_fzl-font-size-sm);
        border: 1px dashed var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
      }
    `,
  ];

  /** Array of card items or JSON string */
  @property({ type: Array })
  items: FzlCardItem[] | string = [];

  /** Layout mode: 'vertical' | 'grid' | 'horizontal' */
  @property({ type: String, reflect: true })
  layout: FzlCardLayout = 'grid';

  /** Max height of the scrollable feed (e.g. '500px', '100%') */
  @property({ type: String, attribute: 'max-height' })
  maxHeight: string = 'none';

  /** Field to sort by ('title', 'date', 'priority', 'status', 'category') */
  @property({ type: String, attribute: 'sort-by' })
  sortBy: string = '';

  /** Sorting order: 'asc' | 'desc' */
  @property({ type: String, attribute: 'sort-order' })
  sortOrder: FzlSortOrder = 'asc';

  /** Whether to display the built-in sorting toolbar */
  @property({ type: Boolean, attribute: 'allow-sort' })
  allowSort: boolean = false;

  /** Whether to display the search filter input */
  @property({ type: Boolean, attribute: 'allow-filter' })
  allowFilter: boolean = false;

  /** Whether cards can be manually reordered by the user */
  @property({ type: Boolean, attribute: 'allow-reorder' })
  allowReorder: boolean = false;

  /** Unique storage key for local browser persistence of manual card order */
  @property({ type: String, attribute: 'storage-key' })
  storageKey: string = '';

  /** Type of browser storage to use: 'local' | 'session' (default: 'local') */
  @property({ type: String, attribute: 'storage-type' })
  storageType: 'local' | 'session' = 'local';

  /** Text displayed when list is empty */
  @property({ type: String, attribute: 'empty-text' })
  emptyText: string = 'Nenhum item encontrado';

  /** Whether cards behave as collapsible accordions (collapsed initially showing only title/subtitle) */
  @property({ type: Boolean, attribute: 'collapsible-cards' })
  collapsibleCards: boolean = false;

  /** Max height of the card body when expanded (e.g. '180px', '220px', 'none'). Long text scrolls inside via overflow-y. */
  @property({ type: String, attribute: 'card-body-max-height' })
  cardBodyMaxHeight: string = '180px';

  @state()
  private _filterQuery: string = '';

  @state()
  private _userExpandedState = new Map<string, boolean>();

  @state()
  private _draggedIndex: number | null = null;

  @state()
  private _dragOverIndex: number | null = null;

  private _pendingFocusIndex: number | null = null;
  private _initialRawItems: FzlCardItem[] | null = null;
  private _isInternalReordering = false;

  private _keyNav = new FzlKeyNavController(this, {
    orientation: 'both',
    rovingTabIndex: true,
    getItems: () => Array.from(this.renderRoot.querySelectorAll<HTMLElement>('.fzl-card')),
  });

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
      console.warn('[fzl-card-list] Failed to persist card order:', e);
    }
  }

  /**
   * Resets any persisted card sequence from browser storage
   * and restores initial cards order.
   */
  public clearPersistedOrder(): void {
    if (this.storageKey) {
      const storage = this._getStorage();
      if (storage) {
        try {
          storage.removeItem(this.storageKey);
        } catch {}
      }
    }
    if (this._initialRawItems && this._initialRawItems.length > 0) {
      this.items = typeof this.items === 'string'
        ? JSON.stringify(this._initialRawItems)
        : [...this._initialRawItems];
    }
    this.requestUpdate();
  }

  /**
   * Returns whether a given card item is currently expanded.
   * If the list/item is not collapsible, returns true.
   * If collapsible, returns the user toggled state or item.expanded (defaulting to false).
   */
  public isCardExpanded(item: FzlCardItem): boolean {
    const isCollapsible = this.collapsibleCards || Boolean(item.collapsible);
    if (!isCollapsible) return true;
    const id = String(item.id);
    if (this._userExpandedState.has(id)) {
      return Boolean(this._userExpandedState.get(id));
    }
    return Boolean(item.expanded);
  }

  /**
   * Toggles expansion state for a collapsible card item.
   */
  public toggleCardExpand(item: FzlCardItem, index: number, event?: Event): boolean {
    if (event) {
      event.stopPropagation();
    }
    const current = this.isCardExpanded(item);
    const next = !current;
    const nextMap = new Map(this._userExpandedState);
    nextMap.set(String(item.id), next);
    this._userExpandedState = nextMap;

    this.dispatchEvent(
      new CustomEvent('fzl-card-toggle', {
        detail: { item, index, expanded: next },
        bubbles: true,
        composed: true,
      })
    );
    return next;
  }

  /**
   * Expands all cards in the list.
   */
  public expandAllCards(): void {
    const items = this._getEffectiveItems();
    const nextMap = new Map(this._userExpandedState);
    items.forEach((item) => nextMap.set(String(item.id), true));
    this._userExpandedState = nextMap;
  }

  /**
   * Collapses all cards in the list.
   */
  public collapseAllCards(): void {
    const items = this._getEffectiveItems();
    const nextMap = new Map(this._userExpandedState);
    items.forEach((item) => nextMap.set(String(item.id), false));
    this._userExpandedState = nextMap;
  }

  private _getEffectiveItems(): FzlCardItem[] {
    const raw = parseFzlCardItems(this.items);
    const savedOrder = this._getPersistedOrderIds();
    return savedOrder ? applyPersistedCardOrder(raw, savedOrder) : raw;
  }

  override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (changedProperties.has('items') && !this._isInternalReordering) {
      this._initialRawItems = parseFzlCardItems(this.items);
    }
  }

  override updated(_changedProperties: PropertyValues): void {
    super.updated(_changedProperties);
    this._keyNav.syncTabIndices();
    if (this._pendingFocusIndex !== null) {
      const targetIdx = this._pendingFocusIndex;
      this._pendingFocusIndex = null;
      this._keyNav.focusItem(targetIdx);
    }
  }

  private _handleFeedKeyDown(event: KeyboardEvent): void {
    this._keyNav.handleKeyDown(event);
  }

  private _reorderCards(fromIndex: number, toIndex: number) {
    const currentItems = this._getEffectiveItems();
    if (fromIndex < 0 || fromIndex >= currentItems.length) return;
    if (toIndex < 0 || toIndex >= currentItems.length) return;
    if (fromIndex === toIndex) return;

    const updated = [...currentItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Reset automatic sortBy so user custom ordering takes precedence
    this.sortBy = '';
    this._pendingFocusIndex = toIndex;
    this._keyNav.focusedIndex = toIndex;

    const orderIds = updated.map((item) => String(item.id));
    this._persistOrderIds(orderIds);

    this._isInternalReordering = true;
    if (typeof this.items === 'string') {
      this.items = JSON.stringify(updated);
    } else {
      this.items = updated;
    }
    this._isInternalReordering = false;

    this.emit('fzl-cards-reorder', {
      items: updated,
      orderIds,
      fromIndex,
      toIndex,
      item: moved,
    });
  }

  private _moveCard(fromIndex: number, delta: number, event: MouseEvent) {
    event.stopPropagation();
    const toIndex = fromIndex + delta;
    this._reorderCards(fromIndex, toIndex);
  }

  private _handleDragStart(index: number, event: DragEvent) {
    if (!this.allowReorder) return;
    this._draggedIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    }
  }

  private _handleDragOver(index: number, event: DragEvent) {
    if (!this.allowReorder) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this._dragOverIndex !== index) {
      this._dragOverIndex = index;
    }
  }

  private _handleDragLeave(_index: number) {
    // Only clear if leaving outside
  }

  private _handleDrop(targetIndex: number, event: DragEvent) {
    if (!this.allowReorder) return;
    event.preventDefault();
    event.stopPropagation();
    const data = event.dataTransfer?.getData('text/plain');
    const sourceIndex = data !== undefined && data !== '' ? parseInt(data, 10) : this._draggedIndex;
    this._draggedIndex = null;
    this._dragOverIndex = null;
    if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      this._reorderCards(sourceIndex, targetIndex);
    }
  }

  private _handleDragEnd() {
    this._draggedIndex = null;
    this._dragOverIndex = null;
  }

  private _handleCardClick(item: FzlCardItem, index: number, event: MouseEvent) {
    this.dispatchEvent(
      new CustomEvent('fzl-card-click', {
        detail: { item, index, originalEvent: event },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleCardAction(item: FzlCardItem, index: number, event: MouseEvent) {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('fzl-card-action', {
        detail: { action: item.actionLabel ?? 'action', item, index, originalEvent: event },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleSortFieldChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.sortBy = select.value;
    this.dispatchEvent(
      new CustomEvent('fzl-sort-change', {
        detail: { sortBy: this.sortBy, sortOrder: this.sortOrder },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.dispatchEvent(
      new CustomEvent('fzl-sort-change', {
        detail: { sortBy: this.sortBy, sortOrder: this.sortOrder },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleFilterInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this._filterQuery = input.value;
    this.dispatchEvent(
      new CustomEvent('fzl-filter-change', {
        detail: { filter: this._filterQuery },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const rawItems = this._getEffectiveItems();
    const filtered = filterFzlCardItems(rawItems, this._filterQuery);
    const displayedItems = sortFzlCardItems(filtered, this.sortBy, this.sortOrder);

    const feedStyles = this.maxHeight && this.maxHeight !== 'none'
      ? `max-height: ${this.maxHeight};`
      : '';

    return html`
      <div class="fzl-card-list-container" part="container" role="region" aria-label="Lista de Cards">
        ${this.allowSort || this.allowFilter
          ? html`
              <div class="fzl-toolbar" part="toolbar">
                ${this.allowFilter
                  ? html`
                      <div class="fzl-toolbar-group">
                        <input
                          type="search"
                          class="fzl-input"
                          placeholder="Filtrar cards..."
                          .value=${this._filterQuery}
                          @input=${this._handleFilterInput}
                          aria-label="Filtrar cards"
                        />
                      </div>
                    `
                  : html`<div></div>`}
                ${this.allowSort
                  ? html`
                      <div class="fzl-toolbar-group">
                        <label for="fzl-sort-select" style="font-size: var(--_fzl-font-size-xs); color: var(--_fzl-color-text-muted);">
                          Ordenar por:
                        </label>
                        <select
                          id="fzl-sort-select"
                          class="fzl-select"
                          .value=${this.sortBy}
                          @change=${this._handleSortFieldChange}
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
                          @click=${this._toggleSortOrder}
                          title=${this.sortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
                          aria-label=${this.sortOrder === 'asc' ? 'Alternar para Decrescente' : 'Alternar para Crescente'}
                        >
                          ${this.sortOrder === 'asc' ? '▲' : '▼'}
                        </button>
                      </div>
                    `
                  : ''}
              </div>
            `
          : ''}

        <ul
          class="fzl-card-feed layout-${this.layout}"
          part="list"
          style=${feedStyles}
          role="list"
          @keydown=${this._handleFeedKeyDown}
        >
          ${displayedItems.length === 0
            ? html`
                <li class="fzl-empty" role="listitem">
                  ${this.emptyText}
                </li>
              `
            : displayedItems.map((item, index) => {
                const priorityClass = item.priority ? `priority-${item.priority.toLowerCase()}` : '';
                const isDragging = this._draggedIndex === index;
                const isDragOver = this._dragOverIndex === index;
                const isCollapsible = this.collapsibleCards || Boolean(item.collapsible);
                const isExpanded = this.isCardExpanded(item);
                const bodyScrollable = isCollapsible || (this.cardBodyMaxHeight && this.cardBodyMaxHeight !== 'none');
                return html`
                  <li
                    class="fzl-card ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isCollapsible ? 'collapsible' : ''} ${isCollapsible ? (isExpanded ? 'expanded' : 'collapsed') : ''}"
                    part="card"
                    role="listitem"
                    tabindex="0"
                    draggable=${this.allowReorder ? 'true' : 'false'}
                    @dragstart=${(e: DragEvent) => this._handleDragStart(index, e)}
                    @dragover=${(e: DragEvent) => this._handleDragOver(index, e)}
                    @dragleave=${() => this._handleDragLeave(index)}
                    @drop=${(e: DragEvent) => this._handleDrop(index, e)}
                    @dragend=${() => this._handleDragEnd()}
                    @click=${(e: MouseEvent) => this._handleCardClick(item, index, e)}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.target !== e.currentTarget && fzlFocus.getDeepActiveElement() !== e.currentTarget) {
                        return;
                      }
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (isCollapsible) {
                          this.toggleCardExpand(item, index, e);
                        }
                        this._handleCardClick(item, index, e as unknown as MouseEvent);
                      }
                    }}
                  >
                    <div class="fzl-card-header" part="card-header">
                      <div
                        class="fzl-card-title-group ${isCollapsible ? 'is-clickable' : ''}"
                        role=${isCollapsible ? 'button' : undefined}
                        tabindex=${isCollapsible ? '0' : undefined}
                        aria-expanded=${isCollapsible ? (isExpanded ? 'true' : 'false') : undefined}
                        aria-controls=${isCollapsible ? `fzl-card-body-${item.id}` : undefined}
                        @click=${isCollapsible ? (e: MouseEvent) => this.toggleCardExpand(item, index, e) : undefined}
                        @keydown=${isCollapsible
                          ? (e: KeyboardEvent) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                this.toggleCardExpand(item, index, e);
                              }
                            }
                          : undefined}
                      >
                        <div class="fzl-card-title-row">
                          ${isCollapsible
                            ? html`<span class="fzl-card-accordion-chevron" aria-hidden="true">▾</span>`
                            : ''}
                          <h3 class="fzl-card-title">${item.title}</h3>
                        </div>
                        ${item.subtitle ? html`<span class="fzl-card-subtitle">${item.subtitle}</span>` : ''}
                      </div>
                      <div class="fzl-card-header-actions">
                        ${this.allowReorder
                          ? html`
                              <div class="fzl-card-reorder-controls" part="reorder-controls">
                                <span class="fzl-drag-handle" title="Arraste para reordenar" aria-hidden="true">⠿</span>
                                <button
                                  type="button"
                                  class="fzl-btn-reorder"
                                  ?disabled=${index === 0}
                                  @click=${(e: MouseEvent) => this._moveCard(index, -1, e)}
                                  aria-label="Mover card para cima"
                                  title="Mover para cima"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  class="fzl-btn-reorder"
                                  ?disabled=${index === displayedItems.length - 1}
                                  @click=${(e: MouseEvent) => this._moveCard(index, 1, e)}
                                  aria-label="Mover card para baixo"
                                  title="Mover para baixo"
                                >
                                  ▼
                                </button>
                              </div>
                            `
                          : ''}
                        ${item.badge || item.priority
                          ? html`
                              <span class="fzl-badge ${priorityClass}">
                                ${item.badge || item.priority}
                              </span>
                            `
                          : ''}
                      </div>
                    </div>

                    ${item.description
                      ? html`
                          <div
                            id="fzl-card-body-${item.id}"
                            class="fzl-card-body ${bodyScrollable ? 'scrollable' : ''}"
                            part="card-body"
                            style=${this.cardBodyMaxHeight && this.cardBodyMaxHeight !== 'none'
                              ? `max-height: ${this.cardBodyMaxHeight};`
                              : ''}
                          >
                            ${item.description}
                          </div>
                        `
                      : ''}

                    <div class="fzl-card-footer" part="card-footer">
                      <div class="fzl-card-tags">
                        ${item.category ? html`<span class="fzl-tag">📁 ${item.category}</span>` : ''}
                        ${item.date ? html`<span class="fzl-tag">📅 ${item.date}</span>` : ''}
                        ${item.status ? html`<span class="fzl-tag">● ${item.status}</span>` : ''}
                        ${Array.isArray(item.tags)
                          ? item.tags.map((tag) => html`<span class="fzl-tag">#${tag}</span>`)
                          : ''}
                      </div>

                      ${item.actionLabel
                        ? html`
                            <button
                              type="button"
                              class="fzl-card-action-btn"
                              @click=${(e: MouseEvent) => this._handleCardAction(item, index, e)}
                            >
                              ${item.actionLabel}
                            </button>
                          `
                        : ''}
                    </div>
                  </li>
                `;
              })}
        </ul>
      </div>
    `;
  }
}

if (!customElements.get('fzl-lit-card-list')) {
  customElements.define('fzl-lit-card-list', FzlLitCardList);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-lit-card-list': FzlLitCardList;
  }
}
