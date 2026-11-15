/**
 * @license
 * FZL Software — DataGrid Reactive Controller
 */
import type { FzlId, FzlStore } from '@fzl/core';
import {
  exportToCsv,
  parseGridColumns,
  parseGridItems,
  type FzlGridColumn,
  type FzlGridSelectionMode
} from '../components/grid/data-grid.types';
import { FzlBaseController, type FzlControllerHost } from './base.controller';

export interface FzlDataGridControllerOptions<T extends Record<string, any> = Record<string, any>> {
  store?: FzlStore<T> | null;
  items?: T[];
  columns?: FzlGridColumn<T>[] | string;
  idProperty?: string;
  pageSize?: number;
  selectionMode?: FzlGridSelectionMode;
  sortField?: string | null;
  sortDescending?: boolean;
  searchQuery?: string;
}

/**
 * Controller reativo e headless para tabelas/grids com suporte a `FzlStore` (`store.observe()`),
 * ordenação, filtro textual, paginação, seleção simples/múltipla e exportação CSV.
 *
 * Extensível via herança (`extends FzlDataGridController<T>`) pelos hooks protegidos
 * `filterItems`, `sortItems` e `getRowId`.
 */
export class FzlDataGridController<
  T extends Record<string, any> = Record<string, any>
> extends FzlBaseController {
  private _store: FzlStore<T> | null = null;
  private _storeUnsubscribe: (() => void) | null = null;
  private _rawItems: T[] = [];
  private _columns: FzlGridColumn<T>[] = [];
  private _idProperty: string;
  private _page = 1;
  private _pageSize: number;
  private _selectionMode: FzlGridSelectionMode;
  private _selectedIds: FzlId[] = [];
  private _sortField: string | null;
  private _sortDescending: boolean;
  private _searchQuery: string;

  constructor(
    host?: FzlControllerHost | null,
    options: FzlDataGridControllerOptions<T> = {}
  ) {
    super(host);
    this._idProperty = options.idProperty ?? 'id';
    this._pageSize = options.pageSize ?? 10;
    this._selectionMode = options.selectionMode ?? 'single';
    this._sortField = options.sortField ?? null;
    this._sortDescending = Boolean(options.sortDescending);
    this._searchQuery = options.searchQuery ?? '';

    if (options.columns) {
      this._columns = parseGridColumns(options.columns) as FzlGridColumn<T>[];
    }
    if (options.items) {
      this._rawItems = parseGridItems(options.items) as T[];
    }
    if (options.store) {
      this.bindStore(options.store, false);
    }
  }

  get store(): FzlStore<T> | null {
    return this._store;
  }

  get columns(): FzlGridColumn<T>[] {
    return this._columns;
  }

  get allItems(): T[] {
    return this._store ? [...this._store.query()] : [...this._rawItems];
  }

  get filteredItems(): T[] {
    return this.filterItems(this.allItems, this._searchQuery);
  }

  get sortedItems(): T[] {
    return this.sortItems(this.filteredItems, this._sortField, this._sortDescending);
  }

  get totalItems(): number {
    return this.sortedItems.length;
  }

  get totalPages(): number {
    if (this._pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(this.totalItems / this._pageSize));
  }

  get page(): number {
    return Math.min(Math.max(1, this._page), this.totalPages);
  }

  get pageSize(): number {
    return this._pageSize;
  }

  get pagedItems(): T[] {
    const sorted = this.sortedItems;
    if (this._pageSize <= 0) return sorted;
    const currentPage = this.page;
    const start = (currentPage - 1) * this._pageSize;
    return sorted.slice(start, start + this._pageSize);
  }

  get sortField(): string | null {
    return this._sortField;
  }

  get sortDescending(): boolean {
    return this._sortDescending;
  }

  get searchQuery(): string {
    return this._searchQuery;
  }

  get selectionMode(): FzlGridSelectionMode {
    return this._selectionMode;
  }

  get selectedIds(): FzlId[] {
    return [...this._selectedIds];
  }

  get selectedItems(): T[] {
    const selectedSet = new Set(this._selectedIds);
    return this.allItems.filter((item, idx) => selectedSet.has(this.getRowId(item, idx)));
  }

  private unbindStore(): void {
    if (this._storeUnsubscribe) {
      this._storeUnsubscribe();
      this._storeUnsubscribe = null;
    }
  }

  private bindStore(store: FzlStore<T> | null, notify = true): void {
    this.unbindStore();
    this._store = store;
    if (store) {
      this._idProperty = store.idProperty || this._idProperty;
      this._storeUnsubscribe = store.observe(() => {
        this.clampPage();
        this.notifyChange();
      });
    }
    this.clampPage();
    if (notify) {
      this.notifyChange();
    }
  }

  private clampPage(): void {
    const maxPage = this.totalPages;
    if (this._page > maxPage) {
      this._page = maxPage;
    } else if (this._page < 1) {
      this._page = 1;
    }
  }

  override hostConnected(): void {
    super.hostConnected();
    if (this._store && !this._storeUnsubscribe) {
      this._storeUnsubscribe = this._store.observe(() => {
        this.clampPage();
        this.notifyChange();
      });
    }
  }

  override hostDisconnected(): void {
    this.unbindStore();
    super.hostDisconnected();
  }

  setStore(store: FzlStore<T> | null): this {
    this.bindStore(store, true);
    return this;
  }

  setItems(items: T[] | string): this {
    this._rawItems = parseGridItems(items) as T[];
    this.clampPage();
    this.notifyChange();
    return this;
  }

  setColumns(columns: FzlGridColumn<T>[] | string): this {
    this._columns = parseGridColumns(columns) as FzlGridColumn<T>[];
    this.notifyChange();
    return this;
  }

  setSearchQuery(query: string): this {
    if (this._searchQuery === query) return this;
    this._searchQuery = query;
    this._page = 1;
    this.notifyChange();
    return this;
  }

  setSort(field: string | null, descending = false): this {
    this._sortField = field;
    this._sortDescending = Boolean(descending);
    this._page = 1;
    this.emitHostEvent('fzl-grid-sort', {
      field: this._sortField,
      descending: this._sortDescending
    });
    this.notifyChange();
    return this;
  }

  /**
   * Alterna ordenação de coluna no ciclo: ascendente -> descendente -> sem ordenação.
   */
  toggleSort(field: string): this {
    if (this._sortField !== field) {
      return this.setSort(field, false);
    }
    if (!this._sortDescending) {
      return this.setSort(field, true);
    }
    return this.setSort(null, false);
  }

  setPage(page: number): this {
    const clamped = Math.min(Math.max(1, Math.floor(page)), this.totalPages);
    if (clamped === this._page) return this;
    this._page = clamped;
    this.emitHostEvent('fzl-grid-page-change', {
      page: this._page,
      pageSize: this._pageSize
    });
    this.notifyChange();
    return this;
  }

  setPageSize(pageSize: number): this {
    this._pageSize = pageSize;
    this._page = 1;
    this.emitHostEvent('fzl-grid-page-change', {
      page: this._page,
      pageSize: this._pageSize
    });
    this.notifyChange();
    return this;
  }

  setSelectionMode(mode: FzlGridSelectionMode): this {
    if (this._selectionMode === mode) return this;
    this._selectionMode = mode;
    if (mode === 'none') {
      this._selectedIds = [];
    } else if (mode === 'single' && this._selectedIds.length > 1) {
      this._selectedIds = [this._selectedIds[0]];
    }
    this.notifyChange();
    return this;
  }

  isSelected(rowOrId: T | FzlId, index?: number): boolean {
    const id =
      typeof rowOrId === 'object' && rowOrId !== null
        ? this.getRowId(rowOrId as T, index)
        : rowOrId;
    return this._selectedIds.includes(id);
  }

  selectRow(row: T, index?: number): this {
    if (this._selectionMode === 'none') return this;
    const id = this.getRowId(row, index);

    if (this._selectionMode === 'single') {
      this._selectedIds = [id];
      this.emitHostEvent('fzl-grid-select', { item: row, id });
      this.notifyChange();
      return this;
    }

    const exists = this._selectedIds.includes(id);
    this._selectedIds = exists
      ? this._selectedIds.filter((item) => item !== id)
      : [...this._selectedIds, id];

    this.emitHostEvent('fzl-grid-selection-change', {
      selectedIds: this.selectedIds,
      selectedItems: this.selectedItems
    });
    this.notifyChange();
    return this;
  }

  toggleSelectAllOnPage(): this {
    if (this._selectionMode !== 'multiple') return this;
    const pageRows = this.pagedItems;
    const pageIds = pageRows.map((row, idx) => this.getRowId(row, idx));
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => this._selectedIds.includes(id));

    if (allSelected) {
      const pageIdSet = new Set(pageIds);
      this._selectedIds = this._selectedIds.filter((id) => !pageIdSet.has(id));
    } else {
      const merged = new Set([...this._selectedIds, ...pageIds]);
      this._selectedIds = Array.from(merged);
    }

    this.emitHostEvent('fzl-grid-selection-change', {
      selectedIds: this.selectedIds,
      selectedItems: this.selectedItems
    });
    this.notifyChange();
    return this;
  }

  clearSelection(): this {
    if (this._selectedIds.length === 0) return this;
    this._selectedIds = [];
    this.emitHostEvent('fzl-grid-selection-change', {
      selectedIds: [],
      selectedItems: []
    });
    this.notifyChange();
    return this;
  }

  refresh(): this {
    this.clampPage();
    this.notifyChange();
    return this;
  }

  exportCsv(filename = 'export.csv', allFiltered = true): string {
    const dataset = allFiltered ? this.sortedItems : this.pagedItems;
    return exportToCsv(dataset, this._columns, filename);
  }

  /**
   * Hook protegido que extrai a identidade única de uma linha.
   */
  protected getRowId(row: T, fallbackIndex = 0): FzlId {
    if (this._store) {
      const storeId = this._store.getIdentity(row);
      if (storeId !== undefined && storeId !== null) return storeId;
    }
    const candidate = row?.[this._idProperty];
    if (typeof candidate === 'string' || typeof candidate === 'number') {
      return candidate;
    }
    return fallbackIndex;
  }

  /**
   * Hook protegido para filtragem textual dos registros.
   * Subclasses podem sobrescrever para busca fuzzy, por colunas específicas ou server-side.
   */
  protected filterItems(items: T[], query: string): T[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    const searchFields =
      this._columns.length > 0
        ? this._columns.filter((c) => !c.hidden).map((c) => c.field)
        : null;

    return items.filter((row) => {
      const fields = searchFields ?? Object.keys(row);
      return fields.some((field) => {
        const val = row[field];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(normalized);
      });
    });
  }

  /**
   * Hook protegido para ordenação dos registros filtrados.
   */
  protected sortItems(items: T[], field: string | null, descending: boolean): T[] {
    if (!field) return items;
    const copy = [...items];
    const dir = descending ? -1 : 1;

    copy.sort((a, b) => {
      const va = a?.[field];
      const vb = b?.[field];

      if (va === vb) return 0;
      if (va === null || va === undefined) return -1 * dir;
      if (vb === null || vb === undefined) return 1 * dir;

      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * dir;
      }
      if (va instanceof Date && vb instanceof Date) {
        return (va.getTime() - vb.getTime()) * dir;
      }

      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
    });

    return copy;
  }
}
