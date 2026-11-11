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
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetController, type FzlStore } from '@fzl/core';

export interface FzlNgGridColumn<T = any> {
  field: string;
  label?: string;
  name?: string; // Dojo compatibility alias
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: T) => any;
  hidden?: boolean;
}

export type FzlNgGridSelectionMode = 'none' | 'single' | 'multiple';

function parseGridColumns(columns: any): FzlNgGridColumn[] {
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

let tokensSheet: CSSStyleSheet | undefined;

/**
 * Angular Elements Data Grid Web Component (`fzl-ng-data-grid`)
 * Inspired by Dojo `dojox/grid/DataGrid` and `dgrid`.
 *
 * @customElement fzl-ng-data-grid
 * @tag fzl-ng-data-grid
 *
 * @attr {string} [columns='[]'] - Column definitions array or JSON string
 * @attr {string} [structure='[]'] - Dojo alias for columns definition
 * @attr {string} [items='[]'] - Row items array or JSON string
 * @attr {'none' | 'single' | 'multiple'} [selection-mode='single'] - Selection mode
 * @attr {string | number | null} [selected-id=null] - Selected row identity for single selection
 * @attr {string} [selected-ids='[]'] - Selected row identities for multiple selection
 * @attr {boolean} [searchable=true] - Whether to show the search toolbar
 * @attr {boolean} [pagination=true] - Whether to enable pagination
 * @attr {number} [page-size=10] - Number of items per page
 * @attr {number} [page=1] - Current active page (1-based)
 * @attr {string} [page-sizes='[5, 10, 25, 50, 100]'] - Available page sizes
 * @attr {boolean} [exportable=true] - Whether to show CSV export button
 * @attr {string} [empty-text='Nenhum registro encontrado.'] - Text when grid is empty
 *
 * @fires {CustomEvent<{ item: any; id: any }>} fzl-grid-select - Dispatched when a row is selected in single mode
 * @fires {CustomEvent<{ selectedIds: any[]; selectedItems: any[] }>} fzl-grid-selection-change - Dispatched when multiple selection changes
 * @fires {CustomEvent<{ item: any; id: any }>} fzl-grid-delete - Dispatched when delete button on a row is clicked
 * @fires {CustomEvent<{ page: number; pageSize: number }>} fzl-grid-page-change - Dispatched when page or page size changes
 */
@Component({
  selector: 'fzl-ng-data-grid',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Toolbar -->
    <div class="grid-toolbar" *ngIf="searchable || exportable">
      <div class="toolbar-left">
        <div class="search-box" *ngIf="searchable">
          <span class="search-icon" aria-hidden="true">&#128269;</span>
          <input
            type="text"
            placeholder="Filtrar registros…"
            aria-label="Filtrar registros na grade"
            [value]="searchQuery"
            (input)="onSearchInput($event)"
          />
        </div>
        <button
          *ngIf="exportable"
          type="button"
          class="btn-toolbar"
          (click)="exportCsv('export-tabela.csv')"
          title="Exportar dados para CSV"
        >
          📥 Exportar CSV
        </button>
      </div>

      <div class="toolbar-meta">
        <span class="badge">{{ totalCount }} registro(s)</span>
        <span class="badge badge-selected" *ngIf="selectionMode === 'multiple' && selectedIds.length > 0">
          {{ selectedIds.length }} selecionado(s)
        </span>
        <span *ngIf="selectionMode === 'single' && selectedId !== null">
          Item selecionado: <strong>#{{ selectedId }}</strong>
        </span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <table role="grid" aria-label="Tabela de dados">
        <thead>
          <tr role="row">
            <th class="checkbox-cell" role="columnheader" *ngIf="selectionMode === 'multiple'">
              <input
                type="checkbox"
                aria-label="Selecionar todas as linhas"
                [checked]="isAllSelected"
                (change)="onSelectAllToggle($event)"
              />
            </th>
            <th
              *ngFor="let col of activeColumns"
              role="columnheader"
              [style.width]="col.width || null"
              [class.sortable]="col.sortable !== false"
              [class.align-left]="col.align === 'left' || !col.align"
              [class.align-center]="col.align === 'center'"
              [class.align-right]="col.align === 'right'"
              [attr.aria-sort]="sortField === col.field ? (sortDesc ? 'descending' : 'ascending') : 'none'"
              (click)="onSortClick(col)"
            >
              {{ col.label || col.name || col.field }}
              <span class="sort-indicator" *ngIf="sortField === col.field">
                {{ sortDesc ? '&#9660;' : '&#9650;' }}
              </span>
            </th>
            <th role="columnheader" style="width: 60px;" class="align-center">Ações</th>
          </tr>
        </thead>

        <tbody>
          <tr *ngIf="pagedItems.length === 0">
            <td [attr.colspan]="activeColumns.length + (selectionMode === 'multiple' ? 2 : 1)">
              <div class="empty-state">
                <span class="empty-icon">&#128194;</span>
                <p>{{ emptyText }}</p>
              </div>
            </td>
          </tr>

          <tr
            *ngFor="let item of pagedItems"
            role="row"
            [class.selected]="isRowSelected(item)"
            tabindex="0"
            [attr.aria-selected]="isRowSelected(item) ? 'true' : 'false'"
            (click)="onRowClick(item, $event)"
            (keydown.enter)="onRowClick(item, $event)"
            (keydown.space)="onRowClick(item, $event)"
          >
            <td
              class="checkbox-cell"
              role="gridcell"
              *ngIf="selectionMode === 'multiple'"
              (click)="$event.stopPropagation()"
            >
              <input
                type="checkbox"
                aria-label="Selecionar linha"
                [checked]="isRowSelected(item)"
                (change)="onRowCheckboxChange(item, $event)"
              />
            </td>
            <td
              *ngFor="let col of activeColumns"
              role="gridcell"
              [class.align-left]="col.align === 'left' || !col.align"
              [class.align-center]="col.align === 'center'"
              [class.align-right]="col.align === 'right'"
            >
              {{ formatCellValue(col, item) }}
            </td>
            <td role="gridcell" class="align-center">
              <button
                type="button"
                class="action-btn"
                title="Excluir item"
                aria-label="Excluir registro"
                (click)="onDeleteClick($event, item)"
              >
                &#128465;
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination Bar -->
    <div class="grid-pagination-bar" role="navigation" aria-label="Paginação da grade" *ngIf="pagination">
      <div>
        Exibindo <strong>{{ startRange }}</strong> a <strong>{{ endRange }}</strong> de
        <strong>{{ totalCount }}</strong> registro(s)
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="pagination-btn"
          (click)="setPage(1)"
          [disabled]="page <= 1"
          title="Primeira página"
          aria-label="Primeira página"
        >
          ⏮
        </button>
        <button
          type="button"
          class="pagination-btn"
          (click)="setPage(page - 1)"
          [disabled]="page <= 1"
          title="Página anterior"
          aria-label="Página anterior"
        >
          ◀
        </button>
        <span style="margin: 0 4px;">
          Página <strong>{{ page }}</strong> de <strong>{{ totalPages }}</strong>
        </span>
        <button
          type="button"
          class="pagination-btn"
          (click)="setPage(page + 1)"
          [disabled]="page >= totalPages"
          title="Próxima página"
          aria-label="Próxima página"
        >
          ▶
        </button>
        <button
          type="button"
          class="pagination-btn"
          (click)="setPage(totalPages)"
          [disabled]="page >= totalPages"
          title="Última página"
          aria-label="Última página"
        >
          ⏭
        </button>

        <select
          class="page-size-selector"
          [value]="pageSize"
          (change)="onPageSizeChange($event)"
          aria-label="Itens por página"
          style="margin-left: 8px;"
        >
          <option *ngFor="let size of pageSizes" [value]="size">{{ size }} / pág</option>
          <option value="0">Todos</option>
        </select>
      </div>
    </div>
  `,
  styles: [
    `
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
  ],
})
export class FzlNgDataGridComponent implements OnInit, OnDestroy, OnChanges {
  private readonly _cdr?: ChangeDetectorRef;
  readonly fzlWidget: FzlWidgetController;

  constructor(_host: ElementRef<HTMLElement>, _cdr?: ChangeDetectorRef) {
    this.fzlWidget = new FzlWidgetController(_host.nativeElement);
    try {
      this._cdr = _cdr ?? inject(ChangeDetectorRef);
    } catch {
      this._cdr = undefined;
    }

    const root = _host.nativeElement.shadowRoot;
    if (root) {
      if (!tokensSheet) {
        tokensSheet = new CSSStyleSheet();
        tokensSheet.replaceSync(fzlDesignTokensCss);
      }
      root.adoptedStyleSheets = [tokensSheet, ...root.adoptedStyleSheets];
    }
  }

  @Input() store?: FzlStore<any>;
  @Input() columns: FzlNgGridColumn[] | string = [];
  @Input() structure: FzlNgGridColumn[] | string = [];
  @Input() items: any[] | string = [];

  @Input('selection-mode') selectionMode: FzlNgGridSelectionMode = 'single';
  @Input('selected-id') selectedId: string | number | null = null;
  @Input('selected-ids') selectedIds: (string | number)[] = [];

  @Input() searchable: boolean = true;
  @Input() pagination: boolean = true;
  @Input('page-size') pageSize: number = 10;
  @Input() page: number = 1;
  @Input('page-sizes') pageSizes: number[] = [5, 10, 25, 50, 100];
  @Input() exportable: boolean = true;
  @Input('empty-text') emptyText: string = 'Nenhum registro encontrado.';

  @Output('fzl-grid-select') select = new EventEmitter<{ item: any; id: any }>();
  @Output('fzl-grid-selection-change') selectionChange = new EventEmitter<{ selectedIds: any[]; selectedItems: any[] }>();
  @Output('fzl-grid-delete') delete = new EventEmitter<{ item: any; id: any }>();
  @Output('fzl-grid-page-change') pageChange = new EventEmitter<{ page: number; pageSize: number }>();

  searchQuery: string = '';
  sortField: string | null = null;
  sortDesc: boolean = false;

  private _unsubStore?: () => void;

  get parsedColumns(): FzlNgGridColumn[] {
    const raw = this.structure && (Array.isArray(this.structure) ? this.structure.length > 0 : Boolean(this.structure))
      ? this.structure
      : this.columns;
    return parseGridColumns(raw);
  }

  get activeColumns(): FzlNgGridColumn[] {
    return this.parsedColumns.filter((c) => !c.hidden);
  }

  get parsedItems(): any[] {
    return parseGridItems(this.items);
  }

  get allFilteredItems(): any[] {
    let list: any[] = [];
    if (this.store) {
      list = this.store.query(
        this.searchQuery || undefined,
        this.sortField
          ? { sort: [{ attribute: this.sortField, descending: this.sortDesc }] }
          : undefined
      );
    } else {
      list = [...this.parsedItems];
      if (this.searchQuery) {
        const needle = this.searchQuery.toLowerCase();
        list = list.filter((item) =>
          Object.values(item).some((v) => String(v ?? '').toLowerCase().includes(needle))
        );
      }
      if (this.sortField) {
        const field = this.sortField;
        const desc = this.sortDesc;
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

  get totalCount(): number {
    return this.allFilteredItems.length;
  }

  get effectivePageSize(): number {
    return this.pagination && this.pageSize > 0 ? this.pageSize : this.totalCount;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / (this.effectivePageSize || 1)));
  }

  get pagedItems(): any[] {
    const all = this.allFilteredItems;
    if (!this.pagination || this.pageSize <= 0) return all;
    const start = (this.page - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  }

  get startRange(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.effectivePageSize + 1;
  }

  get endRange(): number {
    return Math.min(this.totalCount, this.page * this.effectivePageSize);
  }

  get isAllSelected(): boolean {
    const all = this.allFilteredItems;
    return all.length > 0 && all.every((it) => this.selectedIds.includes(this.getItemId(it)));
  }

  ngOnInit(): void {
    this.fzlWidget.connect();
    this.bindStore();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['store']) {
      this.bindStore();
    }
  }

  ngOnDestroy(): void {
    this.unbindStore();
    this.fzlWidget.disconnect();
  }

  private bindStore(): void {
    this.unbindStore();
    if (this.store && typeof this.store.observe === 'function') {
      this._unsubStore = this.store.observe(() => {
        this._cdr?.markForCheck();
      });
    }
  }

  private unbindStore(): void {
    if (this._unsubStore) {
      this._unsubStore();
      this._unsubStore = undefined;
    }
  }

  getItemId(item: any): string | number {
    if (this.store && typeof this.store.getIdentity === 'function') {
      return this.store.getIdentity(item);
    }
    return item?.id ?? JSON.stringify(item);
  }

  isRowSelected(item: any): boolean {
    const id = this.getItemId(item);
    if (this.selectionMode === 'single') {
      return String(this.selectedId) === String(id);
    }
    return this.selectedIds.some((sId) => String(sId) === String(id));
  }

  formatCellValue(col: FzlNgGridColumn, item: any): any {
    const val = item[col.field];
    return col.formatter ? col.formatter(val, item) : val;
  }

  onSortClick(col: FzlNgGridColumn): void {
    if (col.sortable === false) return;
    if (this.sortField === col.field) {
      if (this.sortDesc) {
        this.sortField = null;
        this.sortDesc = false;
      } else {
        this.sortDesc = true;
      }
    } else {
      this.sortField = col.field;
      this.sortDesc = false;
    }
    this.page = 1;
    this._cdr?.markForCheck();
  }

  onRowClick(item: any, _event: Event): void {
    const id = this.getItemId(item);
    if (this.selectionMode === 'single') {
      this.selectedId = id;
      this.select.emit({ item, id });
      this._cdr?.markForCheck();
    } else if (this.selectionMode === 'multiple') {
      this.toggleSelectMulti(id);
    }
  }

  onRowCheckboxChange(item: any, event: Event): void {
    event.stopPropagation();
    const id = this.getItemId(item);
    this.toggleSelectMulti(id);
  }

  private toggleSelectMulti(id: string | number): void {
    const set = new Set(this.selectedIds.map(String));
    if (set.has(String(id))) {
      set.delete(String(id));
    } else {
      set.add(String(id));
    }
    this.selectedIds = Array.from(set);
    this.dispatchSelectionChange();
    this._cdr?.markForCheck();
  }

  onSelectAllToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const all = this.allFilteredItems;
    if (checked) {
      this.selectedIds = all.map((it) => this.getItemId(it));
    } else {
      this.selectedIds = [];
    }
    this.dispatchSelectionChange();
    this._cdr?.markForCheck();
  }

  private dispatchSelectionChange(): void {
    const set = new Set(this.selectedIds.map(String));
    const all = this.allFilteredItems;
    const selectedItems = all.filter((it) => set.has(String(this.getItemId(it))));
    this.selectionChange.emit({
      selectedIds: [...this.selectedIds],
      selectedItems,
    });
  }

  onDeleteClick(event: Event, item: any): void {
    event.stopPropagation();
    const id = this.getItemId(item);
    if (this.store) {
      this.store.remove(id);
    }
    this.delete.emit({ item, id });
    if (!this.store) {
      this.items = this.parsedItems.filter((it) => String(this.getItemId(it)) !== String(id));
    }
    this._cdr?.markForCheck();
  }

  onSearchInput(event: Event): void {
    this.searchQuery = (event.target as HTMLInputElement).value;
    this.page = 1;
    this._cdr?.markForCheck();
  }

  setPage(p: number): void {
    if (p < 1 || p > this.totalPages) return;
    this.page = p;
    this.pageChange.emit({ page: this.page, pageSize: this.pageSize });
    this._cdr?.markForCheck();
  }

  onPageSizeChange(event: Event): void {
    this.pageSize = Number((event.target as HTMLSelectElement).value);
    this.page = 1;
    this.pageChange.emit({ page: this.page, pageSize: this.pageSize });
    this._cdr?.markForCheck();
  }

  exportCsv(filename: string = 'grid-export.csv'): string {
    const visibleCols = this.activeColumns;
    const headers = visibleCols.map((c) => `"${(c.label || c.field).replace(/"/g, '""')}"`).join(';');
    const items = this.allFilteredItems;

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
}
