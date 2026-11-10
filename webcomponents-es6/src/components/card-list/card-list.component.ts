import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin, FzlKeyNavController } from '@fzl/core';
export { FzlEs6Card } from './card.component';

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
  </style>

  <div class="fzl-card-list-container" part="container" role="region" aria-label="Lista de Cards">
    <div class="fzl-toolbar" part="toolbar" style="display: none;"></div>
    <ul class="fzl-card-feed layout-grid" part="list" role="list"></ul>
  </div>
`;

/**
 * Pure ES6 Custom Element (`fzl-es6-card-list`)
 * Displays structured cards with sorting, filtering, and responsive scrolling.
 *
 * @customElement fzl-es6-card-list
 * @tag fzl-es6-card-list
 *
 * @fires {CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-click - Dispatched when a card is clicked
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
export class FzlEs6CardList extends FzlWidgetMixin(HTMLElement) {
  static get observedAttributes(): string[] {
    return [
      'items',
      'layout',
      'max-height',
      'sort-by',
      'sort-order',
      'allow-sort',
      'allow-filter',
      'allow-reorder',
      'storage-key',
      'storage-type',
      'empty-text',
      'collapsible-cards',
      'card-body-max-height',
    ];
  }

  private _items: FzlCardItem[] = [];
  private _initialItems: FzlCardItem[] | null = null;
  private _layout: FzlCardLayout = 'grid';
  private _maxHeight: string = 'none';
  private _sortBy: string = '';
  private _sortOrder: FzlSortOrder = 'asc';
  private _allowSort: boolean = false;
  private _allowFilter: boolean = false;
  private _allowReorder: boolean = false;
  private _storageKey: string = '';
  private _storageType: 'local' | 'session' = 'local';
  private _emptyText: string = 'Nenhum item encontrado';
  private _collapsibleCards: boolean = false;
  private _cardBodyMaxHeight: string = '180px';
  private _userExpandedState = new Map<string, boolean>();
  private _filterQuery: string = '';
  private _draggedIndex: number | null = null;
  private _dragOverIndex: number | null = null;

  private readonly _root: ShadowRoot;
  private readonly _toolbarEl: HTMLDivElement;
  private readonly _feedEl: HTMLUListElement;
  private readonly _keyNav: FzlKeyNavController;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(template.content.cloneNode(true));

    this._toolbarEl = this._root.querySelector('.fzl-toolbar') as HTMLDivElement;
    this._feedEl = this._root.querySelector('.fzl-card-feed') as HTMLUListElement;

    this._keyNav = new FzlKeyNavController(this, {
      orientation: 'both',
      rovingTabIndex: true,
      getItems: () => Array.from(this._feedEl.querySelectorAll<HTMLElement>('.fzl-card')),
    });

    this._feedEl.addEventListener('keydown', (event: KeyboardEvent) => {
      this._keyNav.handleKeyDown(event);
    });
  }

  get items(): FzlCardItem[] | string {
    return this._items;
  }

  set items(val: FzlCardItem[] | string) {
    this._items = parseFzlCardItems(val);
    this._initialItems = [...this._items];
    this._render();
  }

  get layout(): FzlCardLayout {
    return this._layout;
  }

  set layout(val: FzlCardLayout) {
    this._layout = val;
    this._updateLayoutClass();
  }

  get maxHeight(): string {
    return this._maxHeight;
  }

  set maxHeight(val: string) {
    this._maxHeight = val || 'none';
    this._updateFeedHeight();
  }

  get sortBy(): string {
    return this._sortBy;
  }

  set sortBy(val: string) {
    this._sortBy = val || '';
    this._render();
  }

  get sortOrder(): FzlSortOrder {
    return this._sortOrder;
  }

  set sortOrder(val: FzlSortOrder) {
    this._sortOrder = val === 'desc' ? 'desc' : 'asc';
    this._render();
  }

  get allowSort(): boolean {
    return this._allowSort;
  }

  set allowSort(val: boolean) {
    this._allowSort = Boolean(val);
    this._renderToolbar();
    this._render();
  }

  get allowFilter(): boolean {
    return this._allowFilter;
  }

  set allowFilter(val: boolean) {
    this._allowFilter = Boolean(val);
    this._renderToolbar();
    this._render();
  }

  get allowReorder(): boolean {
    return this._allowReorder;
  }

  set allowReorder(val: boolean) {
    this._allowReorder = Boolean(val);
    this._render();
  }

  get storageKey(): string {
    return this._storageKey;
  }

  set storageKey(val: string) {
    this._storageKey = val || '';
    this._render();
  }

  get storageType(): 'local' | 'session' {
    return this._storageType;
  }

  set storageType(val: 'local' | 'session') {
    this._storageType = val === 'session' ? 'session' : 'local';
    this._render();
  }

  get emptyText(): string {
    return this._emptyText;
  }

  set emptyText(val: string) {
    this._emptyText = val || 'Nenhum item encontrado';
    this._render();
  }

  get collapsibleCards(): boolean {
    return this._collapsibleCards;
  }

  set collapsibleCards(val: boolean) {
    this._collapsibleCards = Boolean(val);
    this._render();
  }

  get cardBodyMaxHeight(): string {
    return this._cardBodyMaxHeight;
  }

  set cardBodyMaxHeight(val: string) {
    this._cardBodyMaxHeight = val || '180px';
    this._render();
  }

  public isCardExpanded(item: FzlCardItem): boolean {
    const isCollapsible = this._collapsibleCards || Boolean(item.collapsible);
    if (!isCollapsible) return true;
    const id = String(item.id);
    if (this._userExpandedState.has(id)) {
      return Boolean(this._userExpandedState.get(id));
    }
    return Boolean(item.expanded);
  }

  public toggleCardExpand(item: FzlCardItem, index: number, event?: Event): boolean {
    if (event) {
      event.stopPropagation();
    }
    const current = this.isCardExpanded(item);
    const next = !current;
    this._userExpandedState.set(String(item.id), next);

    this.dispatchEvent(
      new CustomEvent('fzl-card-toggle', {
        detail: { item, index, expanded: next },
        bubbles: true,
        composed: true,
      })
    );
    this._render();
    return next;
  }

  public expandAllCards(): void {
    const items = this._getEffectiveItems();
    items.forEach((item) => this._userExpandedState.set(String(item.id), true));
    this._render();
  }

  public collapseAllCards(): void {
    const items = this._getEffectiveItems();
    items.forEach((item) => this._userExpandedState.set(String(item.id), false));
    this._render();
  }

  private _getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;
    try {
      return this._storageType === 'session' ? window.sessionStorage : window.localStorage;
    } catch {
      return null;
    }
  }

  private _getPersistedOrderIds(): string[] | null {
    if (!this._storageKey) return null;
    const storage = this._getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(this._storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : null;
    } catch {
      return null;
    }
  }

  private _persistOrderIds(orderIds: string[]): void {
    if (!this._storageKey) return;
    const storage = this._getStorage();
    if (!storage) return;
    try {
      storage.setItem(this._storageKey, JSON.stringify(orderIds));
    } catch (e) {
      console.warn('[fzl-es6-card-list] Failed to persist card order:', e);
    }
  }

  public clearPersistedOrder(): void {
    if (this._storageKey) {
      const storage = this._getStorage();
      if (storage) {
        try {
          storage.removeItem(this._storageKey);
        } catch {}
      }
    }
    if (this._initialItems && this._initialItems.length > 0) {
      this._items = [...this._initialItems];
    }
    this._render();
  }

  private _getEffectiveItems(): FzlCardItem[] {
    const savedOrder = this._getPersistedOrderIds();
    return savedOrder ? applyPersistedCardOrder(this._items, savedOrder) : this._items;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this._initialItems && this._items.length > 0) {
      this._initialItems = [...this._items];
    }
    this._updateLayoutClass();
    this._updateFeedHeight();
    this._renderToolbar();
    this._render();
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    switch (name) {
      case 'items': {
        const parsed = parseFzlCardItems(newValue);
        if (JSON.stringify(parsed) !== JSON.stringify(this._items)) {
          this._items = parsed;
          this._initialItems = [...parsed];
          this._render();
        }
        return;
      }
      case 'layout':
        this._layout = (newValue as FzlCardLayout) || 'grid';
        this._updateLayoutClass();
        break;
      case 'max-height':
        this._maxHeight = newValue || 'none';
        this._updateFeedHeight();
        break;
      case 'sort-by':
        this._sortBy = newValue || '';
        break;
      case 'sort-order':
        this._sortOrder = newValue === 'desc' ? 'desc' : 'asc';
        break;
      case 'allow-sort':
        this._allowSort = newValue !== null && newValue !== 'false';
        this._renderToolbar();
        break;
      case 'allow-filter':
        this._allowFilter = newValue !== null && newValue !== 'false';
        this._renderToolbar();
        break;
      case 'allow-reorder':
        this._allowReorder = newValue !== null && newValue !== 'false';
        break;
      case 'storage-key':
        this._storageKey = newValue || '';
        break;
      case 'storage-type':
        this._storageType = newValue === 'session' ? 'session' : 'local';
        break;
      case 'empty-text':
        this._emptyText = newValue || 'Nenhum item encontrado';
        break;
      case 'collapsible-cards':
        this.collapsibleCards = newValue !== null && newValue !== 'false';
        return;
      case 'card-body-max-height':
        this.cardBodyMaxHeight = newValue || '180px';
        return;
    }
    this._render();
  }

  private _reorderCards(fromIndex: number, toIndex: number): void {
    const currentItems = this._getEffectiveItems();
    if (fromIndex < 0 || fromIndex >= currentItems.length) return;
    if (toIndex < 0 || toIndex >= currentItems.length) return;
    if (fromIndex === toIndex) return;

    const updated = [...currentItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    this._sortBy = '';
    this._items = updated;
    this._keyNav.focusedIndex = toIndex;

    const orderIds = updated.map((item) => String(item.id));
    this._persistOrderIds(orderIds);

    this.emit('fzl-cards-reorder', {
      items: updated,
      orderIds,
      fromIndex,
      toIndex,
      item: moved,
    });

    this._render();
    this._keyNav.focusItem(toIndex);
  }

  private _updateLayoutClass(): void {
    this._feedEl.className = `fzl-card-feed layout-${this._layout}`;
  }

  private _updateFeedHeight(): void {
    this._feedEl.style.maxHeight = this._maxHeight && this._maxHeight !== 'none' ? this._maxHeight : '';
  }

  private _renderToolbar(): void {
    if (!this._allowSort && !this._allowFilter) {
      this._toolbarEl.style.display = 'none';
      this._toolbarEl.innerHTML = '';
      return;
    }

    this._toolbarEl.style.display = 'flex';
    this._toolbarEl.innerHTML = '';

    if (this._allowFilter) {
      const filterGroup = document.createElement('div');
      filterGroup.className = 'fzl-toolbar-group';

      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'fzl-input';
      input.placeholder = 'Filtrar cards...';
      input.value = this._filterQuery;
      input.setAttribute('aria-label', 'Filtrar cards');

      input.addEventListener('input', () => {
        this._filterQuery = input.value;
        this.dispatchEvent(
          new CustomEvent('fzl-filter-change', {
            detail: { filter: this._filterQuery },
            bubbles: true,
            composed: true,
          })
        );
        this._render();
      });

      filterGroup.appendChild(input);
      this._toolbarEl.appendChild(filterGroup);
    } else {
      this._toolbarEl.appendChild(document.createElement('div'));
    }

    if (this._allowSort) {
      const sortGroup = document.createElement('div');
      sortGroup.className = 'fzl-toolbar-group';

      const label = document.createElement('label');
      label.textContent = 'Ordenar por:';
      label.style.fontSize = 'var(--_fzl-font-size-xs)';
      label.style.color = 'var(--_fzl-color-text-muted)';

      const select = document.createElement('select');
      select.className = 'fzl-select';
      select.setAttribute('aria-label', 'Ordenar por campo');

      const options = [
        { value: '', text: 'Padrão' },
        { value: 'title', text: 'Título' },
        { value: 'date', text: 'Data / Prazo' },
        { value: 'priority', text: 'Prioridade' },
        { value: 'category', text: 'Categoria' },
        { value: 'status', text: 'Status' },
      ];

      for (const opt of options) {
        const optionEl = document.createElement('option');
        optionEl.value = opt.value;
        optionEl.textContent = opt.text;
        if (opt.value === this._sortBy) optionEl.selected = true;
        select.appendChild(optionEl);
      }

      select.addEventListener('change', () => {
        this._sortBy = select.value;
        this.dispatchEvent(
          new CustomEvent('fzl-sort-change', {
            detail: { sortBy: this._sortBy, sortOrder: this._sortOrder },
            bubbles: true,
            composed: true,
          })
        );
        this._render();
      });

      const orderBtn = document.createElement('button');
      orderBtn.type = 'button';
      orderBtn.className = 'fzl-btn-icon';
      orderBtn.textContent = this._sortOrder === 'asc' ? '▲' : '▼';
      orderBtn.title = this._sortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente';
      orderBtn.setAttribute('aria-label', this._sortOrder === 'asc' ? 'Alternar para Decrescente' : 'Alternar para Crescente');

      orderBtn.addEventListener('click', () => {
        this._sortOrder = this._sortOrder === 'asc' ? 'desc' : 'asc';
        orderBtn.textContent = this._sortOrder === 'asc' ? '▲' : '▼';
        orderBtn.title = this._sortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente';
        orderBtn.setAttribute('aria-label', this._sortOrder === 'asc' ? 'Alternar para Decrescente' : 'Alternar para Crescente');

        this.dispatchEvent(
          new CustomEvent('fzl-sort-change', {
            detail: { sortBy: this._sortBy, sortOrder: this._sortOrder },
            bubbles: true,
            composed: true,
          })
        );
        this._render();
      });

      sortGroup.appendChild(label);
      sortGroup.appendChild(select);
      sortGroup.appendChild(orderBtn);
      this._toolbarEl.appendChild(sortGroup);
    }
  }

  private _render(): void {
    this._feedEl.innerHTML = '';

    const effective = this._getEffectiveItems();
    const filtered = filterFzlCardItems(effective, this._filterQuery);
    const displayed = sortFzlCardItems(filtered, this._sortBy, this._sortOrder);

    if (displayed.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'fzl-empty';
      emptyLi.setAttribute('role', 'listitem');
      emptyLi.textContent = this._emptyText;
      this._feedEl.appendChild(emptyLi);
      return;
    }

    displayed.forEach((item, index) => {
      const cardLi = document.createElement('li');
      const isDragging = this._draggedIndex === index;
      const isDragOver = this._dragOverIndex === index;
      const isCollapsible = this._collapsibleCards || Boolean(item.collapsible);
      const isExpanded = this.isCardExpanded(item);
      const bodyScrollable = isCollapsible || (this._cardBodyMaxHeight && this._cardBodyMaxHeight !== 'none');

      cardLi.className = [
        'fzl-card',
        isDragging ? 'dragging' : '',
        isDragOver ? 'drag-over' : '',
        isCollapsible ? 'collapsible' : '',
        isCollapsible ? (isExpanded ? 'expanded' : 'collapsed') : '',
      ]
        .filter(Boolean)
        .join(' ');

      cardLi.setAttribute('part', 'card');
      cardLi.setAttribute('role', 'listitem');
      cardLi.tabIndex = 0;

      if (this._allowReorder) {
        cardLi.draggable = true;

        cardLi.addEventListener('dragstart', (e: DragEvent) => {
          this._draggedIndex = index;
          cardLi.classList.add('dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(index));
          }
        });

        cardLi.addEventListener('dragover', (e: DragEvent) => {
          if (this._draggedIndex === null && !e.dataTransfer?.types.includes('text/plain')) return;
          e.preventDefault();
          if (e.dataTransfer) {
            e.dataTransfer.dropEffect = 'move';
          }
          if (!cardLi.classList.contains('drag-over')) {
            this._feedEl.querySelectorAll('.fzl-card.drag-over').forEach((el) => {
              if (el !== cardLi) el.classList.remove('drag-over');
            });
            cardLi.classList.add('drag-over');
          }
        });

        cardLi.addEventListener('dragleave', (e: DragEvent) => {
          if (!cardLi.contains(e.relatedTarget as Node)) {
            cardLi.classList.remove('drag-over');
          }
        });

        cardLi.addEventListener('drop', (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          this._feedEl.querySelectorAll('.fzl-card').forEach((el) => {
            el.classList.remove('dragging', 'drag-over');
          });

          const data = e.dataTransfer?.getData('text/plain');
          const from = data !== undefined && data !== '' ? parseInt(data, 10) : this._draggedIndex;
          this._draggedIndex = null;
          this._dragOverIndex = null;

          if (from !== null && !isNaN(from) && from !== index) {
            this._reorderCards(from, index);
          }
        });

        cardLi.addEventListener('dragend', () => {
          this._draggedIndex = null;
          this._dragOverIndex = null;
          this._feedEl.querySelectorAll('.fzl-card').forEach((el) => {
            el.classList.remove('dragging', 'drag-over');
          });
        });
      }

      cardLi.addEventListener('click', (e) => {
        this.dispatchEvent(
          new CustomEvent('fzl-card-click', {
            detail: { item, index, expanded: this.isCardExpanded(item), originalEvent: e },
            bubbles: true,
            composed: true,
          })
        );
      });

      cardLi.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isCollapsible) {
            this.toggleCardExpand(item, index, e);
          }
          this.dispatchEvent(
            new CustomEvent('fzl-card-click', {
              detail: { item, index, expanded: this.isCardExpanded(item), originalEvent: e },
              bubbles: true,
              composed: true,
            })
          );
        }
      });

      // Header
      const header = document.createElement('div');
      header.className = 'fzl-card-header';
      header.setAttribute('part', 'card-header');

      const titleGroup = document.createElement('div');
      titleGroup.className = 'fzl-card-title-group';

      if (isCollapsible) {
        titleGroup.classList.add('is-clickable');
        titleGroup.setAttribute('role', 'button');
        titleGroup.tabIndex = 0;
        titleGroup.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        titleGroup.setAttribute('aria-controls', `fzl-card-body-${item.id}`);

        titleGroup.addEventListener('click', (e) => {
          e.stopPropagation();
          this.toggleCardExpand(item, index, e);
        });

        titleGroup.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            this.toggleCardExpand(item, index, e);
          }
        });
      }

      const titleRow = document.createElement('div');
      titleRow.className = 'fzl-card-title-row';

      if (isCollapsible) {
        const chevron = document.createElement('span');
        chevron.className = `fzl-card-accordion-chevron ${isExpanded ? 'expanded' : ''}`.trim();
        chevron.setAttribute('aria-hidden', 'true');
        chevron.textContent = '▾';
        titleRow.appendChild(chevron);
      }

      const h3 = document.createElement('h3');
      h3.className = 'fzl-card-title';
      h3.textContent = item.title;
      titleRow.appendChild(h3);
      titleGroup.appendChild(titleRow);

      if (item.subtitle) {
        const sub = document.createElement('span');
        sub.className = 'fzl-card-subtitle';
        sub.textContent = item.subtitle;
        titleGroup.appendChild(sub);
      }
      header.appendChild(titleGroup);

      const headerActions = document.createElement('div');
      headerActions.className = 'fzl-card-header-actions';

      if (this._allowReorder) {
        const reorderControls = document.createElement('div');
        reorderControls.className = 'fzl-card-reorder-controls';
        reorderControls.setAttribute('part', 'reorder-controls');

        const dragHandle = document.createElement('span');
        dragHandle.className = 'fzl-drag-handle';
        dragHandle.title = 'Arraste para reordenar';
        dragHandle.setAttribute('aria-hidden', 'true');
        dragHandle.textContent = '⠿';
        reorderControls.appendChild(dragHandle);

        const upBtn = document.createElement('button');
        upBtn.type = 'button';
        upBtn.className = 'fzl-btn-reorder';
        upBtn.textContent = '▲';
        upBtn.title = 'Mover para cima';
        upBtn.setAttribute('aria-label', 'Mover card para cima');
        if (index === 0) upBtn.disabled = true;
        upBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._reorderCards(index, index - 1);
        });
        reorderControls.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.type = 'button';
        downBtn.className = 'fzl-btn-reorder';
        downBtn.textContent = '▼';
        downBtn.title = 'Mover para baixo';
        downBtn.setAttribute('aria-label', 'Mover card para baixo');
        if (index === displayed.length - 1) downBtn.disabled = true;
        downBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this._reorderCards(index, index + 1);
        });
        reorderControls.appendChild(downBtn);

        headerActions.appendChild(reorderControls);
      }

      if (item.badge || item.priority) {
        const badge = document.createElement('span');
        const prioClass = item.priority ? `priority-${item.priority.toLowerCase()}` : '';
        badge.className = `fzl-badge ${prioClass}`.trim();
        badge.textContent = item.badge || item.priority || '';
        headerActions.appendChild(badge);
      }
      header.appendChild(headerActions);
      cardLi.appendChild(header);

      // Body
      if (item.description) {
        const body = document.createElement('div');
        body.id = `fzl-card-body-${item.id}`;
        body.className = `fzl-card-body ${bodyScrollable ? 'scrollable' : ''}`.trim();
        body.setAttribute('part', 'card-body');
        if (this._cardBodyMaxHeight && this._cardBodyMaxHeight !== 'none') {
          body.style.maxHeight = this._cardBodyMaxHeight;
        }
        body.textContent = item.description;
        cardLi.appendChild(body);
      }

      // Footer
      const footer = document.createElement('div');
      footer.className = 'fzl-card-footer';
      footer.setAttribute('part', 'card-footer');

      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'fzl-card-tags';

      if (item.category) {
        const cat = document.createElement('span');
        cat.className = 'fzl-tag';
        cat.textContent = `📁 ${item.category}`;
        tagsContainer.appendChild(cat);
      }
      if (item.date) {
        const dt = document.createElement('span');
        dt.className = 'fzl-tag';
        dt.textContent = `📅 ${item.date}`;
        tagsContainer.appendChild(dt);
      }
      if (item.status) {
        const st = document.createElement('span');
        st.className = 'fzl-tag';
        st.textContent = `● ${item.status}`;
        tagsContainer.appendChild(st);
      }
      if (Array.isArray(item.tags)) {
        for (const tag of item.tags) {
          const t = document.createElement('span');
          t.className = 'fzl-tag';
          t.textContent = `#${tag}`;
          tagsContainer.appendChild(t);
        }
      }
      footer.appendChild(tagsContainer);

      if (item.actionLabel) {
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'fzl-card-action-btn';
        actionBtn.textContent = item.actionLabel;

        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dispatchEvent(
            new CustomEvent('fzl-card-action', {
              detail: { action: item.actionLabel, item, index, originalEvent: e },
              bubbles: true,
              composed: true,
            })
          );
        });

        footer.appendChild(actionBtn);
      }

      cardLi.appendChild(footer);
      this._feedEl.appendChild(cardLi);
    });

    this._keyNav.syncTabIndices();
  }
}

if (!customElements.get('fzl-es6-card-list')) {
  customElements.define('fzl-es6-card-list', FzlEs6CardList);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-es6-card-list': FzlEs6CardList;
  }
}
