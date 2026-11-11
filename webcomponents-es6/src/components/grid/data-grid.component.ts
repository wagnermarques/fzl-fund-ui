import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin, type FzlStore } from '@fzl/core';

export interface FzlEs6GridColumn<T = any> {
  field: string;
  label?: string;
  name?: string; // Dojo compatibility alias
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: T) => any;
  hidden?: boolean;
}

export type FzlEs6GridSelectionMode = 'none' | 'single' | 'multiple';

function parseGridColumns(columns: any): FzlEs6GridColumn[] {
  let list: any[] = [];
  if (Array.isArray(columns)) {
    list = columns;
  } else if (typeof columns === 'string' && columns.trim()) {
    try {
      const parsed = JSON.parse(columns);
      if (Array.isArray(parsed)) list = parsed;
    } catch {}
  }

  return list
    .filter((col) => col && typeof col === 'object' && col.field)
    .map((col) => ({
      field: String(col.field),
      label: col.label ?? col.name ?? String(col.field),
      width: col.width,
      sortable: col.sortable !== false,
      align: col.align === 'center' || col.align === 'right' ? col.align : 'left',
      formatter: typeof col.formatter === 'function' ? col.formatter : undefined,
      hidden: Boolean(col.hidden),
    }));
}

function parseGridItems(items: any): any[] {
  if (Array.isArray(items)) {
    return items;
  }
  if (typeof items === 'string' && items.trim()) {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

/**
 * Vanilla ES6 Data Grid Web Component (`fzl-es6-data-grid`)
 * Inspired by Dojo `dojox/grid/DataGrid` and `dgrid`.
 */
export class FzlEs6DataGrid extends FzlWidgetMixin(HTMLElement) {
  static get observedAttributes(): string[] {
    return [
      'items',
      'columns',
      'structure',
      'selection-mode',
      'selected-id',
      'searchable',
      'pagination',
      'page-size',
      'page',
      'exportable',
      'empty-text',
    ];
  }

  private _store?: FzlStore<any>;
  private _columns: FzlEs6GridColumn[] = [];
  private _items: any[] = [];
  private _selectionMode: FzlEs6GridSelectionMode = 'single';
  private _selectedId: string | number | null = null;
  private _selectedIds: (string | number)[] = [];
  private _searchable: boolean = true;
  private _pagination: boolean = true;
  private _pageSize: number = 10;
  private _page: number = 1;
  private _pageSizes: number[] = [5, 10, 25, 50, 100];
  private _exportable: boolean = true;
  private _emptyText: string = 'Nenhum registro encontrado.';

  private _searchQuery: string = '';
  private _sortField: string | null = null;
  private _sortDesc: boolean = false;
  private _unsubStore?: () => void;
  private _root: ShadowRoot;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
  }

  get store(): FzlStore<any> | undefined {
    return this._store;
  }
  set store(val: FzlStore<any> | undefined) {
    this._store = val;
    this._bindStore();
    this._render();
  }

  get columns(): FzlEs6GridColumn[] {
    return this._columns;
  }
  set columns(val: FzlEs6GridColumn[] | string) {
    this._columns = parseGridColumns(val);
    this._render();
  }

  get structure(): FzlEs6GridColumn[] {
    return this._columns;
  }
  set structure(val: FzlEs6GridColumn[] | string) {
    this.columns = val;
  }

  get items(): any[] {
    return this._items;
  }
  set items(val: any[] | string) {
    this._items = parseGridItems(val);
    this._render();
  }

  get selectionMode(): FzlEs6GridSelectionMode {
    return this._selectionMode;
  }
  set selectionMode(val: FzlEs6GridSelectionMode) {
    this._selectionMode = val;
    this._render();
  }

  get selectedId(): string | number | null {
    return this._selectedId;
  }
  set selectedId(val: string | number | null) {
    this._selectedId = val;
    this._render();
  }

  get selectedIds(): (string | number)[] {
    return this._selectedIds;
  }
  set selectedIds(val: (string | number)[]) {
    this._selectedIds = Array.isArray(val) ? [...val] : [];
    this._render();
  }

  get searchable(): boolean {
    return this._searchable;
  }
  set searchable(val: boolean) {
    this._searchable = Boolean(val);
    this._render();
  }

  get pagination(): boolean {
    return this._pagination;
  }
  set pagination(val: boolean) {
    this._pagination = Boolean(val);
    this._render();
  }

  get pageSize(): number {
    return this._pageSize;
  }
  set pageSize(val: number) {
    this._pageSize = Math.max(0, Number(val) || 0);
    this._page = 1;
    this._render();
  }

  get page(): number {
    return this._page;
  }
  set page(val: number) {
    this._page = Math.max(1, Number(val) || 1);
    this._render();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._bindStore();
    this._render();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unbindStore();
  }

  attributeChangedCallback(name: string, _oldVal: string | null, newVal: string | null): void {
    if (name === 'items') {
      this._items = parseGridItems(newVal);
    } else if (name === 'columns' || name === 'structure') {
      this._columns = parseGridColumns(newVal);
    } else if (name === 'selection-mode') {
      this._selectionMode = (newVal as FzlEs6GridSelectionMode) || 'single';
    } else if (name === 'selected-id') {
      this._selectedId = newVal;
    } else if (name === 'searchable') {
      this._searchable = newVal !== 'false';
    } else if (name === 'pagination') {
      this._pagination = newVal !== 'false';
    } else if (name === 'page-size') {
      this._pageSize = Math.max(0, Number(newVal) || 10);
    } else if (name === 'page') {
      this._page = Math.max(1, Number(newVal) || 1);
    } else if (name === 'exportable') {
      this._exportable = newVal !== 'false';
    } else if (name === 'empty-text') {
      this._emptyText = newVal || 'Nenhum registro encontrado.';
    }
    this._render();
  }

  private _bindStore(): void {
    this._unbindStore();
    if (this._store && typeof this._store.observe === 'function') {
      this._unsubStore = this._store.observe(() => {
        this._render();
      });
    }
  }

  private _unbindStore(): void {
    if (this._unsubStore) {
      this._unsubStore();
      this._unsubStore = undefined;
    }
  }

  private _getItemId(item: any): string | number {
    if (this._store && typeof this._store.getIdentity === 'function') {
      return this._store.getIdentity(item);
    }
    return item?.id ?? JSON.stringify(item);
  }

  private _getAllFilteredItems(): any[] {
    let list: any[] = [];
    if (this._store) {
      list = this._store.query(
        this._searchQuery || undefined,
        this._sortField
          ? { sort: [{ attribute: this._sortField, descending: this._sortDesc }] }
          : undefined
      );
    } else {
      list = [...this._items];
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

  /**
   * Exports data to CSV and triggers download.
   */
  exportCsv(filename: string = 'grid-export.csv'): string {
    const visibleCols = this._columns.filter((c) => !c.hidden);
    const headers = visibleCols.map((c) => `"${(c.label || c.field).replace(/"/g, '""')}"`).join(';');
    const items = this._getAllFilteredItems();

    const rows = items.map((row) =>
      visibleCols
        .map((col) => {
          let val = row[col.field];
          if (col.formatter) {
            try {
              val = col.formatter(val, row);
            } catch {}
          }
          if (val === null || val === undefined) val = '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(';')
    );

    const csvContent = [headers, ...rows].join('\r\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return csvContent;
  }

  private _render(): void {
    const allFiltered = this._getAllFilteredItems();
    const totalCount = allFiltered.length;
    const activeColumns = this._columns.filter((c) => !c.hidden);

    const effectivePageSize = this._pagination && this._pageSize > 0 ? this._pageSize : totalCount;
    const totalPages = Math.max(1, Math.ceil(totalCount / (effectivePageSize || 1)));

    if (this._page > totalPages) this._page = totalPages;
    if (this._page < 1) this._page = 1;

    const startIndex = (this._page - 1) * effectivePageSize;
    const pagedItems =
      this._pagination && this._pageSize > 0
        ? allFiltered.slice(startIndex, startIndex + effectivePageSize)
        : allFiltered;

    const startRange = totalCount === 0 ? 0 : startIndex + 1;
    const endRange = Math.min(totalCount, this._page * effectivePageSize);

    const isAllSelected =
      totalCount > 0 && allFiltered.every((it) => this._selectedIds.includes(this._getItemId(it)));

    this._root.innerHTML = `
      <style>
        ${fzlDesignTokensCss}
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
        *, *::before, *::after { box-sizing: inherit; }
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
        .toolbar-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .search-box { position: relative; display: flex; align-items: center; width: 260px; max-width: 100%; }
        .search-box input {
          width: 100%;
          padding: 6px 10px 6px 30px;
          font-size: var(--_fzl-font-size-sm, 0.875rem);
          border: 1px solid var(--_fzl-color-border, #cbd5e1);
          border-radius: var(--_fzl-radius-sm, 4px);
          background: var(--_fzl-color-surface, #ffffff);
          color: var(--_fzl-color-text, #0f172a);
          outline: none;
        }
        .search-icon { position: absolute; left: 9px; color: #94a3b8; font-size: 0.9rem; pointer-events: none; }
        .toolbar-meta { font-size: var(--_fzl-font-size-xs, 0.775rem); color: var(--_fzl-color-text-muted, #64748b); display: flex; align-items: center; gap: 10px; }
        .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; background: #e0f2fe; color: #0369a1; }
        .badge-selected { background: #dcfce7; color: #166534; }
        .btn-toolbar {
          display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px;
          font-size: var(--_fzl-font-size-xs, 0.775rem); font-weight: 500;
          border: 1px solid var(--_fzl-color-border, #cbd5e1); border-radius: 4px;
          background: #ffffff; color: #1e293b; cursor: pointer;
        }
        .table-container { width: 100%; overflow-x: auto; position: relative; }
        table { width: 100%; border-collapse: collapse; font-size: var(--_fzl-font-size-sm, 0.875rem); text-align: left; }
        thead { background: var(--_fzl-color-surface-hover, #f1f5f9); border-bottom: 2px solid var(--_fzl-color-border, #cbd5e1); user-select: none; }
        th { padding: 10px 14px; font-weight: 600; color: #334155; white-space: nowrap; }
        th.sortable { cursor: pointer; }
        th.sortable:hover { background: #e2e8f0; }
        tbody tr { border-bottom: 1px solid var(--_fzl-color-border, #e2e8f0); cursor: pointer; }
        tbody tr:hover { background-color: #f8fafc; }
        tbody tr.selected { background-color: #e0f2fe !important; font-weight: 500; }
        td { padding: 10px 14px; color: inherit; white-space: nowrap; }
        .align-left { text-align: left; }
        .align-center { text-align: center; }
        .align-right { text-align: right; }
        .checkbox-cell { width: 36px; text-align: center; padding: 10px 8px; }
        .action-btn { background: transparent; border: none; cursor: pointer; padding: 4px 6px; border-radius: 4px; color: #64748b; font-size: 0.9rem; }
        .action-btn:hover { color: #ef4444; background: #fee2e2; }
        .grid-pagination-bar {
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
          padding: 8px 14px; background: var(--_fzl-color-surface-hover, #f8fafc);
          border-top: 1px solid var(--_fzl-color-border, #cbd5e1); font-size: 0.775rem; color: #64748b;
        }
        .pagination-controls { display: flex; align-items: center; gap: 4px; }
        .pagination-btn {
          display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px;
          padding: 0 6px; border: 1px solid #cbd5e1; border-radius: 4px; background: #ffffff; cursor: pointer;
        }
        .pagination-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .empty-state { padding: 32px 16px; text-align: center; color: #94a3b8; }
        .empty-icon { font-size: 2rem; margin-bottom: 8px; display: block; }
      </style>

      ${
        this._searchable || this._exportable
          ? `
        <div class="grid-toolbar">
          <div class="toolbar-left">
            ${
              this._searchable
                ? `
              <div class="search-box">
                <span class="search-icon" aria-hidden="true">&#128269;</span>
                <input id="searchInput" type="text" placeholder="Filtrar registros…" value="${this._searchQuery}">
              </div>
            `
                : ''
            }
            ${
              this._exportable
                ? `
              <button id="btnExport" type="button" class="btn-toolbar">📥 Exportar CSV</button>
            `
                : ''
            }
          </div>
          <div class="toolbar-meta">
            <span class="badge">${totalCount} registro(s)</span>
            ${
              this._selectionMode === 'multiple' && this._selectedIds.length > 0
                ? `<span class="badge badge-selected">${this._selectedIds.length} selecionado(s)</span>`
                : ''
            }
            ${
              this._selectionMode === 'single' && this._selectedId !== null
                ? `<span>Item selecionado: <strong>#${this._selectedId}</strong></span>`
                : ''
            }
          </div>
        </div>
      `
          : ''
      }

      <div class="table-container">
        <table role="grid" aria-label="Tabela de dados">
          <thead>
            <tr role="row">
              ${
                this._selectionMode === 'multiple'
                  ? `
                <th class="checkbox-cell" role="columnheader">
                  <input id="chkSelectAll" type="checkbox" aria-label="Selecionar todas as linhas" ${isAllSelected ? 'checked' : ''}>
                </th>
              `
                  : ''
              }
              ${activeColumns
                .map((col) => {
                  const isSorted = this._sortField === col.field;
                  const isSortable = col.sortable !== false;
                  const alignClass = `align-${col.align ?? 'left'}`;
                  const sortInd = isSorted ? (this._sortDesc ? ' &#9660;' : ' &#9650;') : '';
                  return `
                  <th role="columnheader" class="${isSortable ? 'sortable' : ''} ${alignClass}" data-field="${col.field}">
                    ${col.label || col.name || col.field}${sortInd}
                  </th>
                `;
                })
                .join('')}
              <th role="columnheader" style="width: 60px;" class="align-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${
              pagedItems.length === 0
                ? `
              <tr>
                <td colspan="${activeColumns.length + (this._selectionMode === 'multiple' ? 2 : 1)}">
                  <div class="empty-state">
                    <span class="empty-icon">&#128194;</span>
                    <p>${this._emptyText}</p>
                  </div>
                </td>
              </tr>
            `
                : pagedItems
                    .map((item, index) => {
                      const id = this._getItemId(item);
                      const isSelected =
                        this._selectionMode === 'single'
                          ? String(this._selectedId) === String(id)
                          : this._selectedIds.some((sId) => String(sId) === String(id));

                      return `
                  <tr role="row" class="${isSelected ? 'selected' : ''}" data-index="${index}" data-id="${id}" tabindex="0">
                    ${
                      this._selectionMode === 'multiple'
                        ? `
                      <td class="checkbox-cell" role="gridcell">
                        <input type="checkbox" class="row-checkbox" data-id="${id}" ${isSelected ? 'checked' : ''}>
                      </td>
                    `
                        : ''
                    }
                    ${activeColumns
                      .map((col) => {
                        let val = item[col.field];
                        if (col.formatter) {
                          try {
                            val = col.formatter(val, item);
                          } catch {}
                        }
                        const alignClass = `align-${col.align ?? 'left'}`;
                        return `<td role="gridcell" class="${alignClass}">${val ?? ''}</td>`;
                      })
                      .join('')}
                    <td role="gridcell" class="align-center">
                      <button type="button" class="action-btn delete-btn" data-id="${id}" title="Excluir item">&#128465;</button>
                    </td>
                  </tr>
                `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>

      ${
        this._pagination
          ? `
        <div class="grid-pagination-bar" role="navigation" aria-label="Paginação da grade">
          <div>Exibindo <strong>${startRange}</strong> a <strong>${endRange}</strong> de <strong>${totalCount}</strong> registro(s)</div>
          <div class="pagination-controls">
            <button id="btnFirst" type="button" class="pagination-btn" ${this._page <= 1 ? 'disabled' : ''}>⏮</button>
            <button id="btnPrev" type="button" class="pagination-btn" ${this._page <= 1 ? 'disabled' : ''}>◀</button>
            <span style="margin: 0 4px;">Página <strong>${this._page}</strong> de <strong>${totalPages}</strong></span>
            <button id="btnNext" type="button" class="pagination-btn" ${this._page >= totalPages ? 'disabled' : ''}>▶</button>
            <button id="btnLast" type="button" class="pagination-btn" ${this._page >= totalPages ? 'disabled' : ''}>⏭</button>
            <select id="selPageSize" class="page-size-selector" style="margin-left: 8px;">
              ${this._pageSizes.map((size) => `<option value="${size}" ${this._pageSize === size ? 'selected' : ''}>${size} / pág</option>`).join('')}
              <option value="0" ${this._pageSize === 0 ? 'selected' : ''}>Todos</option>
            </select>
          </div>
        </div>
      `
          : ''
      }
    `;

    this._attachEventListeners(allFiltered, pagedItems, totalPages);
  }

  private _attachEventListeners(allFiltered: any[], pagedItems: any[], totalPages: number): void {
    const searchInput = this._root.getElementById('searchInput') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._searchQuery = (e.target as HTMLInputElement).value;
        this._page = 1;
        this._render();
      });
    }

    const btnExport = this._root.getElementById('btnExport');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.exportCsv('export-tabela.csv');
      });
    }

    const chkSelectAll = this._root.getElementById('chkSelectAll') as HTMLInputElement | null;
    if (chkSelectAll) {
      chkSelectAll.indeterminate =
        !allFiltered.every((it) => this._selectedIds.includes(this._getItemId(it))) &&
        allFiltered.some((it) => this._selectedIds.includes(this._getItemId(it)));

      chkSelectAll.addEventListener('change', (e) => {
        const checked = (e.target as HTMLInputElement).checked;
        if (checked) {
          this._selectedIds = allFiltered.map((it) => this._getItemId(it));
        } else {
          this._selectedIds = [];
        }
        this._dispatchSelectionChange(allFiltered);
        this._render();
      });
    }

    // Sort column headers
    const sortHeaders = this._root.querySelectorAll('th.sortable');
    sortHeaders.forEach((th) => {
      th.addEventListener('click', () => {
        const field = (th as HTMLElement).getAttribute('data-field');
        if (field) {
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
          this._page = 1;
          this._render();
        }
      });
    });

    // Row clicks
    const rows = this._root.querySelectorAll('tbody tr[data-index]');
    rows.forEach((tr) => {
      tr.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.checkbox-cell') || (e.target as HTMLElement).closest('.delete-btn')) {
          return;
        }
        const index = Number((tr as HTMLElement).getAttribute('data-index'));
        const item = pagedItems[index];
        if (item) {
          const id = this._getItemId(item);
          if (this._selectionMode === 'single') {
            this._selectedId = id;
            this.dispatchEvent(
              new CustomEvent('fzl-grid-select', {
                bubbles: true,
                composed: true,
                detail: { item, id },
              })
            );
            this._render();
          } else if (this._selectionMode === 'multiple') {
            this._toggleMulti(id, allFiltered);
            this._render();
          }
        }
      });
    });

    // Checkboxes per row
    const rowCheckboxes = this._root.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach((chk) => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const id = (chk as HTMLElement).getAttribute('data-id');
        if (id) {
          this._toggleMulti(id, allFiltered);
          this._render();
        }
      });
    });

    // Delete buttons
    const deleteBtns = this._root.querySelectorAll('.delete-btn');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).getAttribute('data-id');
        const item = pagedItems.find((it) => String(this._getItemId(it)) === String(id));
        if (id && this._store) {
          this._store.remove(id);
        }
        this.dispatchEvent(
          new CustomEvent('fzl-grid-delete', {
            bubbles: true,
            composed: true,
            detail: { item, id },
          })
        );
        if (!this._store) {
          this._items = this._items.filter((it) => String(this._getItemId(it)) !== String(id));
          this._render();
        }
      });
    });

    // Pagination buttons
    const btnFirst = this._root.getElementById('btnFirst');
    const btnPrev = this._root.getElementById('btnPrev');
    const btnNext = this._root.getElementById('btnNext');
    const btnLast = this._root.getElementById('btnLast');
    const selPageSize = this._root.getElementById('selPageSize') as HTMLSelectElement | null;

    btnFirst?.addEventListener('click', () => this._setPage(1));
    btnPrev?.addEventListener('click', () => this._setPage(this._page - 1));
    btnNext?.addEventListener('click', () => this._setPage(this._page + 1));
    btnLast?.addEventListener('click', () => this._setPage(totalPages));

    if (selPageSize) {
      selPageSize.addEventListener('change', (e) => {
        this._pageSize = Number((e.target as HTMLSelectElement).value);
        this._page = 1;
        this._render();
      });
    }
  }

  private _toggleMulti(id: string | number, allFiltered: any[]): void {
    const set = new Set(this._selectedIds.map(String));
    if (set.has(String(id))) {
      set.delete(String(id));
    } else {
      set.add(String(id));
    }
    this._selectedIds = Array.from(set);
    this._dispatchSelectionChange(allFiltered);
  }

  private _dispatchSelectionChange(allFiltered: any[]): void {
    const selectedSet = new Set(this._selectedIds.map(String));
    const selectedItems = allFiltered.filter((it) => selectedSet.has(String(this._getItemId(it))));
    this.dispatchEvent(
      new CustomEvent('fzl-grid-selection-change', {
        bubbles: true,
        composed: true,
        detail: {
          selectedIds: [...this._selectedIds],
          selectedItems,
        },
      })
    );
  }

  private _setPage(p: number): void {
    this._page = p;
    this.dispatchEvent(
      new CustomEvent('fzl-grid-page-change', {
        bubbles: true,
        composed: true,
        detail: { page: this._page, pageSize: this._pageSize },
      })
    );
    this._render();
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-es6-data-grid')) {
  customElements.define('fzl-es6-data-grid', FzlEs6DataGrid);
}
