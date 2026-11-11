import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin, type FzlStore } from '@fzl/core';
import {
  FzlGridColumn,
  FzlGridSelectionMode,
  parseGridColumns,
  parseGridItems,
  exportToCsv,
} from './data-grid.types';

export * from './data-grid.types';

/**
 * Enterprise Data Grid Web Component inspired by Dojo / Dijit `dojox/grid/DataGrid` and `dgrid`.
 *
 * Supported features:
 * - Reactive data binding via `FzlStore` (`dojo/store`) with `store.observe()`
 * - Static data binding via `items` array or JSON attribute
 * - Flexible column definitions (`columns` or Dojo `structure` alias)
 * - Sorting (single column asc/desc/reset)
 * - Live search/filtering
 * - Pagination bar (page navigation, page size selector: 5, 10, 25, 50, 100, All)
 * - Selection modes (`'none' | 'single' | 'multiple'` with checkbox column and Select All)
 * - CSV Export (`exportCsv()`)
 * - WCAG / ARIA accessibility (`role="grid"`, keyboard navigation)
 *
 * @customElement fzl-lit-data-grid
 * @tag fzl-lit-data-grid
 * @tag fzl-data-grid
 *
 * @fires {CustomEvent<{ item: T; id: any }>} fzl-grid-select - Dispatched when a row is selected in single mode
 * @fires {CustomEvent<{ selectedIds: any[]; selectedItems: T[] }>} fzl-grid-selection-change - Dispatched when multi-selection changes
 * @fires {CustomEvent<{ item: T; id: any }>} fzl-grid-delete - Dispatched when row delete action is clicked
 * @fires {CustomEvent<{ page: number; pageSize: number }>} fzl-grid-page-change - Dispatched when page changes
 */
export class FzlDataGrid<T extends Record<string, any> = any> extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: flex;
        flex-direction: column;
        width: 100%;
        background: var(--_fzl-color-surface, #ffffff);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 8px);
        box-shadow: var(--_fzl-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05));
        overflow: hidden;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        box-sizing: border-box;
      }

      *, *::before, *::after {
        box-sizing: inherit;
      }

      /* Grid Toolbar */
      .grid-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        padding: 10px 14px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border-bottom: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .toolbar-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }

      .search-box {
        position: relative;
        display: flex;
        align-items: center;
        width: 260px;
        max-width: 100%;
      }

      .search-box input {
        width: 100%;
        padding: 6px 10px 6px 30px;
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-sm, 4px);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #0f172a);
        outline: none;
        transition: border-color var(--_fzl-transition-fast, 150ms);
      }

      .search-box input:focus {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: var(--_fzl-focus-ring);
      }

      .search-icon {
        position: absolute;
        left: 9px;
        color: #94a3b8;
        font-size: 0.9rem;
        pointer-events: none;
      }

      .toolbar-meta {
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        color: var(--_fzl-color-text-muted, #64748b);
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.72rem;
        font-weight: 600;
        background: #e0f2fe;
        color: #0369a1;
      }

      .badge-selected {
        background: #dcfce7;
        color: #166534;
      }

      .btn-toolbar {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        font-weight: 500;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-sm, 4px);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #1e293b);
        cursor: pointer;
        transition: all 150ms ease;
      }

      .btn-toolbar:hover {
        background: var(--_fzl-color-surface-hover, #f1f5f9);
        border-color: var(--_fzl-color-primary, #0284c7);
      }

      /* Table Container */
      .table-container {
        width: 100%;
        overflow-x: auto;
        position: relative;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        text-align: left;
      }

      thead {
        background: var(--_fzl-color-surface-hover, #f1f5f9);
        user-select: none;
        border-bottom: 2px solid var(--_fzl-color-border, #cbd5e1);
      }

      th {
        padding: 10px 14px;
        font-weight: 600;
        color: var(--_fzl-color-text, #334155);
        white-space: nowrap;
      }

      th.sortable {
        cursor: pointer;
        transition: background-color var(--_fzl-transition-fast, 150ms);
      }

      th.sortable:hover {
        background: #e2e8f0;
      }

      th .sort-indicator {
        display: inline-block;
        margin-left: 4px;
        font-size: 0.8rem;
        color: var(--_fzl-color-primary, #0284c7);
      }

      tbody tr {
        border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0);
        cursor: pointer;
        transition: background-color var(--_fzl-transition-fast, 150ms);
      }

      tbody tr:hover {
        background-color: #f8fafc;
      }

      tbody tr.selected {
        background-color: #e0f2fe !important;
        font-weight: 500;
      }

      tbody tr:focus-visible {
        outline: 2px solid var(--_fzl-color-primary, #0284c7);
        outline-offset: -2px;
      }

      td {
        padding: 10px 14px;
        color: inherit;
        white-space: nowrap;
      }

      .align-left { text-align: left; }
      .align-center { text-align: center; }
      .align-right { text-align: right; }

      .checkbox-cell {
        width: 36px;
        text-align: center;
        padding: 10px 8px;
      }

      .checkbox-cell input[type="checkbox"] {
        cursor: pointer;
        width: 15px;
        height: 15px;
      }

      /* Action buttons */
      .action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 4px;
        color: #64748b;
        font-size: 0.9rem;
        line-height: 1;
        transition: all var(--_fzl-transition-fast, 150ms);
      }

      .action-btn:hover {
        color: #ef4444;
        background: #fee2e2;
      }

      /* Pagination Bar (Dojo Paging Style) */
      .grid-pagination-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        padding: 8px 14px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border-top: 1px solid var(--_fzl-color-border, #cbd5e1);
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .pagination-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        padding: 0 6px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-sm, 4px);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #1e293b);
        cursor: pointer;
        font-family: inherit;
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        transition: all 150ms ease;
      }

      .pagination-btn:hover:not(:disabled) {
        background: #e2e8f0;
        border-color: var(--_fzl-color-primary, #0284c7);
      }

      .pagination-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .page-size-selector {
        padding: 4px 8px;
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-sm, 4px);
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #1e293b);
        font-size: var(--_fzl-font-size-xs, 0.775rem);
        outline: none;
      }

      /* Empty State */
      .empty-state {
        padding: 32px 16px;
        text-align: center;
        color: var(--_fzl-color-text-muted, #94a3b8);
      }

      .empty-icon {
        font-size: 2rem;
        margin-bottom: 8px;
        display: block;
      }
    `,
  ];

  /** Reactive FzlStore instance (`dojo/store`) */
  @property({ attribute: false }) store?: FzlStore<T>;

  /** Column descriptors */
  @property({
    type: Array,
    converter: {
      fromAttribute: (val) => parseGridColumns(val),
      toAttribute: (val) => JSON.stringify(val),
    },
  })
  columns: FzlGridColumn<T>[] = [];

  /** Dojo compatibility alias for `columns` */
  @property({
    type: Array,
    converter: {
      fromAttribute: (val) => parseGridColumns(val),
      toAttribute: (val) => JSON.stringify(val),
    },
  })
  structure: FzlGridColumn<T>[] = [];

  /** Static dataset */
  @property({
    type: Array,
    converter: {
      fromAttribute: (val) => parseGridItems(val),
      toAttribute: (val) => JSON.stringify(val),
    },
  })
  items: T[] = [];

  /** Selection Mode: 'none' | 'single' | 'multiple' */
  @property({ type: String, attribute: 'selection-mode' })
  selectionMode: FzlGridSelectionMode = 'single';

  /** Selected ID in single-selection mode */
  @property({ attribute: 'selected-id' })
  selectedId: string | number | null = null;

  /** Set of selected IDs in multi-selection mode */
  @property({ type: Array, attribute: 'selected-ids' })
  selectedIds: (string | number)[] = [];

  /** Enable search / filter bar */
  @property({ type: Boolean })
  searchable: boolean = true;

  /** Enable pagination bar */
  @property({ type: Boolean })
  pagination: boolean = true;

  /** Rows per page (Dojo `rowsPerPage` style, 0 for unlimited) */
  @property({ type: Number, attribute: 'page-size' })
  pageSize: number = 10;

  /** Current active page (1-based index) */
  @property({ type: Number })
  page: number = 1;

  /** Allowed page sizes dropdown options */
  @property({ type: Array, attribute: 'page-sizes' })
  pageSizes: number[] = [5, 10, 25, 50, 100];

  /** Enable CSV export button in toolbar */
  @property({ type: Boolean })
  exportable: boolean = true;

  /** Message displayed when no records match */
  @property({ type: String, attribute: 'empty-text' })
  emptyText: string = 'Nenhum registro encontrado.';

  @state() private _searchQuery: string = '';
  @state() private _sortField: string | null = null;
  @state() private _sortDesc: boolean = false;

  private _unsubStore?: () => void;

  override connectedCallback(): void {
    super.connectedCallback();
    this._bindStore();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unbindStore();
  }

  private _bindStore(): void {
    this._unbindStore();
    if (this.store) {
      this._unsubStore = this.store.observe(() => {
        this.requestUpdate();
      });
    }
  }

  private _unbindStore(): void {
    if (this._unsubStore) {
      this._unsubStore();
      this._unsubStore = undefined;
    }
  }

  override updated(changedProps: Map<string, any>): void {
    if (changedProps.has('store')) {
      this._bindStore();
    }
    if (changedProps.has('structure') && this.structure && this.structure.length > 0) {
      this.columns = this.structure;
    }
  }

  private _getActiveColumns(): FzlGridColumn<T>[] {
    const cols = (this.columns && this.columns.length > 0) ? this.columns : this.structure;
    return cols ? cols.filter((c) => !c.hidden) : [];
  }

  private _handleSort(field: string): void {
    if (this._sortField === field) {
      if (this._sortDesc) {
        this._sortField = null;
        this._sortDesc = false;
      } else {
        this._sortDesc = true;
      }
    } else {
      this._sortField = field;
      this._sortDesc = false;
    }
    this.page = 1; // Volta para primeira página ao ordenar
  }

  private _handleRowClick(item: T, _event?: Event): void {
    const id = this._getItemId(item);

    if (this.selectionMode === 'single') {
      this.selectedId = id;
      this.dispatchEvent(
        new CustomEvent('fzl-grid-select', {
          bubbles: true,
          composed: true,
          detail: { item, id },
        })
      );
    } else if (this.selectionMode === 'multiple') {
      this._toggleSelectMulti(id);
    }
  }

  private _toggleSelectMulti(id: string | number, _item?: T): void {
    const current = new Set(this.selectedIds);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds = Array.from(current);
    this._dispatchSelectionChange();
  }

  private _handleSelectAllToggle(e: Event, allItems: T[]): void {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedIds = allItems.map((item) => this._getItemId(item));
    } else {
      this.selectedIds = [];
    }
    this._dispatchSelectionChange();
  }

  private _dispatchSelectionChange(): void {
    const selectedSet = new Set(this.selectedIds.map(String));
    const allItems = this._getAllFilteredItems();
    const selectedItems = allItems.filter((it) => selectedSet.has(String(this._getItemId(it))));

    this.dispatchEvent(
      new CustomEvent('fzl-grid-selection-change', {
        bubbles: true,
        composed: true,
        detail: {
          selectedIds: [...this.selectedIds],
          selectedItems,
        },
      })
    );
  }

  private _getItemId(item: T): string | number {
    if (this.store && typeof this.store.getIdentity === 'function') {
      return this.store.getIdentity(item);
    }
    return (item as any).id ?? JSON.stringify(item);
  }

  private _handleDeleteClick(e: Event, item: T): void {
    e.stopPropagation();
    const id = this._getItemId(item);
    if (this.store) {
      this.store.remove(id);
    }
    this.dispatchEvent(
      new CustomEvent('fzl-grid-delete', {
        bubbles: true,
        composed: true,
        detail: { item, id },
      })
    );
  }

  private _getAllFilteredItems(): T[] {
    let list: T[] = [];

    if (this.store) {
      list = this.store.query(
        this._searchQuery || undefined,
        this._sortField
          ? { sort: [{ attribute: this._sortField as keyof T, descending: this._sortDesc }] }
          : undefined
      );
    } else {
      list = [...(this.items || [])];

      if (this._searchQuery) {
        const needle = this._searchQuery.toLowerCase();
        list = list.filter((item) =>
          Object.values(item).some((v) => String(v ?? '').toLowerCase().includes(needle))
        );
      }

      if (this._sortField) {
        const field = this._sortField;
        const desc = this._sortDesc;
        list.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA === valB) return 0;
          let comp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') comp = valA - valB;
          else comp = String(valA ?? '').localeCompare(String(valB ?? ''));
          return desc ? -comp : comp;
        });
      }
    }

    return list;
  }

  private _getPagedItems(filteredItems: T[]): T[] {
    if (!this.pagination || this.pageSize <= 0) {
      return filteredItems;
    }
    const startIndex = (this.page - 1) * this.pageSize;
    return filteredItems.slice(startIndex, startIndex + this.pageSize);
  }

  /**
   * Export grid data to CSV file
   */
  exportCsv(filename: string = 'grid-export.csv'): string {
    const items = this._getAllFilteredItems();
    const columns = this._getActiveColumns();
    return exportToCsv(items, columns, filename);
  }

  private _setPage(newPage: number, totalPages: number): void {
    if (newPage < 1 || newPage > totalPages) return;
    this.page = newPage;
    this.dispatchEvent(
      new CustomEvent('fzl-grid-page-change', {
        bubbles: true,
        composed: true,
        detail: { page: this.page, pageSize: this.pageSize },
      })
    );
  }

  private _handlePageSizeChange(e: Event): void {
    const val = Number((e.target as HTMLSelectElement).value);
    this.pageSize = val;
    this.page = 1;
    this.dispatchEvent(
      new CustomEvent('fzl-grid-page-change', {
        bubbles: true,
        composed: true,
        detail: { page: this.page, pageSize: this.pageSize },
      })
    );
  }

  override render() {
    const allFiltered = this._getAllFilteredItems();
    const totalCount = allFiltered.length;
    const activeColumns = this._getActiveColumns();

    const effectivePageSize = this.pagination && this.pageSize > 0 ? this.pageSize : totalCount;
    const totalPages = Math.max(1, Math.ceil(totalCount / (effectivePageSize || 1)));

    // Ensure page stays within valid bounds
    if (this.page > totalPages) this.page = totalPages;
    if (this.page < 1) this.page = 1;

    const pagedItems = this._getPagedItems(allFiltered);
    const startRange = totalCount === 0 ? 0 : (this.page - 1) * effectivePageSize + 1;
    const endRange = Math.min(totalCount, this.page * effectivePageSize);

    const isAllSelected =
      totalCount > 0 && allFiltered.every((it) => this.selectedIds.includes(this._getItemId(it)));
    const isSomeSelected =
      !isAllSelected && allFiltered.some((it) => this.selectedIds.includes(this._getItemId(it)));

    return html`
      <!-- Toolbar -->
      ${this.searchable || this.exportable
        ? html`
            <div class="grid-toolbar">
              <div class="toolbar-left">
                ${this.searchable
                  ? html`
                      <div class="search-box">
                        <span class="search-icon" aria-hidden="true">&#128269;</span>
                        <input
                          type="text"
                          placeholder="Filtrar registros…"
                          aria-label="Filtrar registros na grade"
                          .value=${this._searchQuery}
                          @input=${(e: Event) => {
                            this._searchQuery = (e.target as HTMLInputElement).value;
                            this.page = 1;
                          }}
                        />
                      </div>
                    `
                  : ''}
                ${this.exportable
                  ? html`
                      <button
                        type="button"
                        class="btn-toolbar"
                        @click=${() => this.exportCsv('export-tabela.csv')}
                        title="Exportar dados para CSV"
                      >
                        📥 Exportar CSV
                      </button>
                    `
                  : ''}
              </div>

              <div class="toolbar-meta">
                <span class="badge">${totalCount} registro(s)</span>
                ${this.selectionMode === 'multiple' && this.selectedIds.length > 0
                  ? html`<span class="badge badge-selected">${this.selectedIds.length} selecionado(s)</span>`
                  : ''}
                ${this.selectionMode === 'single' && this.selectedId !== null
                  ? html`<span>Item selecionado: <strong>#${this.selectedId}</strong></span>`
                  : ''}
              </div>
            </div>
          `
        : ''}

      <!-- Table -->
      <div class="table-container">
        <table role="grid" aria-label="Tabela de dados">
          <thead>
            <tr role="row">
              ${this.selectionMode === 'multiple'
                ? html`
                    <th class="checkbox-cell" role="columnheader">
                      <input
                        type="checkbox"
                        aria-label="Selecionar todas as linhas"
                        .checked=${isAllSelected}
                        .indeterminate=${isSomeSelected}
                        @change=${(e: Event) => this._handleSelectAllToggle(e, allFiltered)}
                      />
                    </th>
                  `
                : ''}
              ${activeColumns.map((col) => {
                const isSorted = this._sortField === col.field;
                const isSortable = col.sortable !== false;
                const alignClass = `align-${col.align ?? 'left'}`;

                return html`
                  <th
                    role="columnheader"
                    style=${col.width ? `width: ${col.width}` : ''}
                    class="${isSortable ? 'sortable' : ''} ${alignClass}"
                    aria-sort=${isSorted ? (this._sortDesc ? 'descending' : 'ascending') : 'none'}
                    @click=${() => isSortable && this._handleSort(col.field)}
                  >
                    ${col.label || col.name || col.field}
                    ${isSorted
                      ? html`<span class="sort-indicator">${this._sortDesc ? '&#9660;' : '&#9650;'}</span>`
                      : ''}
                  </th>
                `;
              })}
              <th role="columnheader" style="width: 60px;" class="align-center">Ações</th>
            </tr>
          </thead>

          <tbody>
            ${pagedItems.length === 0
              ? html`
                  <tr>
                    <td colspan=${activeColumns.length + (this.selectionMode === 'multiple' ? 2 : 1)}>
                      <div class="empty-state">
                        <span class="empty-icon">&#128194;</span>
                        <p>${this.emptyText}</p>
                      </div>
                    </td>
                  </tr>
                `
              : pagedItems.map((item) => {
                  const id = this._getItemId(item);
                  const isSelected =
                    this.selectionMode === 'single'
                      ? String(this.selectedId) === String(id)
                      : this.selectedIds.some((sId) => String(sId) === String(id));

                  return html`
                    <tr
                      role="row"
                      class=${isSelected ? 'selected' : ''}
                      tabindex="0"
                      aria-selected=${isSelected ? 'true' : 'false'}
                      @click=${(e: Event) => this._handleRowClick(item, e)}
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          this._handleRowClick(item, e);
                        }
                      }}
                    >
                      ${this.selectionMode === 'multiple'
                        ? html`
                            <td class="checkbox-cell" role="gridcell" @click=${(e: Event) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                aria-label="Selecionar linha"
                                .checked=${isSelected}
                                @change=${() => this._toggleSelectMulti(id, item)}
                              />
                            </td>
                          `
                        : ''}
                      ${activeColumns.map((col) => {
                        const val = item[col.field];
                        const formatted = col.formatter ? col.formatter(val, item) : val;
                        const alignClass = `align-${col.align ?? 'left'}`;
                        return html`<td role="gridcell" class=${alignClass}>${formatted}</td>`;
                      })}
                      <td role="gridcell" class="align-center">
                        <button
                          type="button"
                          class="action-btn"
                          title="Excluir item"
                          aria-label="Excluir registro"
                          @click=${(e: Event) => this._handleDeleteClick(e, item)}
                        >
                          &#128465;
                        </button>
                      </td>
                    </tr>
                  `;
                })}
          </tbody>
        </table>
      </div>

      <!-- Pagination Bar -->
      ${this.pagination
        ? html`
            <div class="grid-pagination-bar" role="navigation" aria-label="Paginação da grade">
              <div>
                Exibindo <strong>${startRange}</strong> a <strong>${endRange}</strong> de
                <strong>${totalCount}</strong> registro(s)
              </div>

              <div class="pagination-controls">
                <button
                  type="button"
                  class="pagination-btn"
                  @click=${() => this._setPage(1, totalPages)}
                  ?disabled=${this.page <= 1}
                  title="Primeira página"
                  aria-label="Primeira página"
                >
                  ⏮
                </button>
                <button
                  type="button"
                  class="pagination-btn"
                  @click=${() => this._setPage(this.page - 1, totalPages)}
                  ?disabled=${this.page <= 1}
                  title="Página anterior"
                  aria-label="Página anterior"
                >
                  ◀
                </button>
                <span style="margin: 0 4px;">
                  Página <strong>${this.page}</strong> de <strong>${totalPages}</strong>
                </span>
                <button
                  type="button"
                  class="pagination-btn"
                  @click=${() => this._setPage(this.page + 1, totalPages)}
                  ?disabled=${this.page >= totalPages}
                  title="Próxima página"
                  aria-label="Próxima página"
                >
                  ▶
                </button>
                <button
                  type="button"
                  class="pagination-btn"
                  @click=${() => this._setPage(totalPages, totalPages)}
                  ?disabled=${this.page >= totalPages}
                  title="Última página"
                  aria-label="Última página"
                >
                  ⏭
                </button>

                <select
                  class="page-size-selector"
                  .value=${String(this.pageSize)}
                  @change=${this._handlePageSizeChange}
                  aria-label="Itens por página"
                  style="margin-left: 8px;"
                >
                  ${this.pageSizes.map(
                    (size) => html`<option value=${String(size)} ?selected=${this.pageSize === size}>${size} / pág</option>`
                  )}
                  <option value="0" ?selected=${this.pageSize === 0}>Todos</option>
                </select>
              </div>
            </div>
          `
        : ''}
    `;
  }
}

// Register both custom elements
if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-data-grid')) {
    customElements.define('fzl-data-grid', FzlDataGrid);
  }
  if (!customElements.get('fzl-lit-data-grid')) {
    customElements.define('fzl-lit-data-grid', class extends FzlDataGrid {});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-data-grid': FzlDataGrid;
    'fzl-lit-data-grid': FzlDataGrid;
  }
}
