import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin, type FzlStore } from '@fzl/core';

export interface FzlGridColumn<T = any> {
  field: string;
  label: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  formatter?: (value: any, row: T) => any;
}

/**
 * Data Grid Component inspired by Dojo / Dijit `dojox/grid/DataGrid` and `dgrid`.
 *
 * Driven by `FzlStore` (`dojo/store`), offering reactive live updates via
 * `store.observe()`, interactive column sorting, real-time client-side search filtering,
 * accessible row selection, and keyboard navigation.
 *
 * @customElement fzl-data-grid
 * @tag fzl-data-grid
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
        box-sizing: border-box;
      }

      /* Grid Toolbar */
      .grid-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border-bottom: 1px solid var(--_fzl-color-border, #cbd5e1);
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
        border-radius: 6px;
        background: #ffffff;
        outline: none;
        transition: border-color var(--_fzl-transition-fast, 150ms);
      }

      .search-box input:focus {
        border-color: var(--_fzl-color-primary, #0284c7);
        box-shadow: 0 0 0 2px rgba(2, 132, 199, 0.18);
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
        gap: 12px;
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

      /* High contrast */
      @media (forced-colors: active) {
        :host {
          border: 2px solid CanvasText;
        }
        th, td {
          border: 1px solid CanvasText;
        }
        tbody tr.selected {
          outline: 2px solid Highlight;
        }
      }
    `
  ];

  @property({ attribute: false }) store?: FzlStore<T>;
  @property({ type: Array }) columns: FzlGridColumn<T>[] = [];
  @property({ type: Array }) items: T[] = [];
  @property({ type: String, attribute: 'selected-id' }) selectedId: string | number | null = null;
  @property({ type: Boolean }) searchable = true;
  @property({ type: String, attribute: 'empty-text' }) emptyText = 'Nenhum registro encontrado.';

  @state() private _searchQuery = '';
  @state() private _sortField: string | null = null;
  @state() private _sortDesc = false;

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
        // Request update whenever the store mutates
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
  }

  private _handleSort(field: string): void {
    if (this._sortField === field) {
      if (this._sortDesc) {
        // Clear sort
        this._sortField = null;
        this._sortDesc = false;
      } else {
        this._sortDesc = true;
      }
    } else {
      this._sortField = field;
      this._sortDesc = false;
    }
  }

  private _handleRowClick(item: T): void {
    const id = this.store ? this.store.getIdentity(item) : (item as any).id;
    this.selectedId = id;
    this.emit('fzl-grid-select', { item, id });
  }

  private _handleDeleteClick(e: Event, item: T): void {
    e.stopPropagation();
    const id = this.store ? this.store.getIdentity(item) : (item as any).id;
    if (this.store) {
      this.store.remove(id);
    }
    this.emit('fzl-grid-delete', { item, id });
  }

  private _getDisplayItems(): T[] {
    let list: T[] = [];

    if (this.store) {
      // Query store with search text and sort
      list = this.store.query(
        this._searchQuery || undefined,
        this._sortField
          ? { sort: [{ attribute: this._sortField as keyof T, descending: this._sortDesc }] }
          : undefined
      );
    } else {
      list = [...this.items];

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

  override render() {
    const items = this._getDisplayItems();

    return html`
      ${this.searchable
        ? html`
            <div class="grid-toolbar">
              <div class="search-box">
                <span class="search-icon" aria-hidden="true">&#128269;</span>
                <input
                  type="text"
                  placeholder="Filtrar registros…"
                  aria-label="Filtrar registros na grade"
                  .value=${this._searchQuery}
                  @input=${(e: Event) => {
                    this._searchQuery = (e.target as HTMLInputElement).value;
                  }}
                />
              </div>

              <div class="toolbar-meta">
                <span class="badge">${items.length} registro(s)</span>
                ${this.selectedId !== null
                  ? html`<span>Item selecionado: <strong>#${this.selectedId}</strong></span>`
                  : ''}
              </div>
            </div>
          `
        : ''}

      <div class="table-container">
        <table role="grid" aria-label="Tabela de dados">
          <thead>
            <tr role="row">
              ${this.columns.map((col) => {
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
                    ${col.label}
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
            ${items.length === 0
              ? html`
                  <tr>
                    <td colspan=${this.columns.length + 1}>
                      <div class="empty-state">
                        <span class="empty-icon">&#128194;</span>
                        <p>${this.emptyText}</p>
                      </div>
                    </td>
                  </tr>
                `
              : items.map((item) => {
                  const id = this.store ? this.store.getIdentity(item) : (item as any).id;
                  const isSelected = String(this.selectedId) === String(id);

                  return html`
                    <tr
                      role="row"
                      class=${isSelected ? 'selected' : ''}
                      tabindex="0"
                      aria-selected=${isSelected ? 'true' : 'false'}
                      @click=${() => this._handleRowClick(item)}
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          this._handleRowClick(item);
                        }
                      }}
                    >
                      ${this.columns.map((col) => {
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
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-data-grid')) {
  customElements.define('fzl-data-grid', FzlDataGrid);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-data-grid': FzlDataGrid;
  }
}
