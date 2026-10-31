import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
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
 * Multi-Engine Card List Custom Element (`fzl-lit-card-list`)
 * Displays structured cards with responsive layouts, sorting, filtering and scroll container.
 *
 * @customElement fzl-lit-card-list
 * @tag fzl-lit-card-list
 *
 * @fires {CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-click - Dispatched when a card is clicked
 * @fires {CustomEvent<{ action: string; item: FzlCardItem; index: number; originalEvent: MouseEvent }>} fzl-card-action - Dispatched when card action button is clicked
 * @fires {CustomEvent<{ sortBy: string; sortOrder: FzlSortOrder }>} fzl-sort-change - Dispatched when sorting criteria changes
 * @fires {CustomEvent<{ filter: string }>} fzl-filter-change - Dispatched when search filter text changes
 * @fires {CustomEvent<{ items: FzlCardItem[]; fromIndex: number; toIndex: number; item: FzlCardItem }>} fzl-cards-reorder - Dispatched when cards are reordered
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
export class FzlLitCardList extends LitElement {
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

  /** Text displayed when list is empty */
  @property({ type: String, attribute: 'empty-text' })
  emptyText: string = 'Nenhum item encontrado';

  @state()
  private _filterQuery: string = '';

  @state()
  private _draggedIndex: number | null = null;

  @state()
  private _dragOverIndex: number | null = null;

  private _reorderCards(fromIndex: number, toIndex: number) {
    const rawItems = parseFzlCardItems(this.items);
    if (fromIndex < 0 || fromIndex >= rawItems.length) return;
    if (toIndex < 0 || toIndex >= rawItems.length) return;
    if (fromIndex === toIndex) return;

    const updated = [...rawItems];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);

    // Reset automatic sortBy so user custom ordering takes precedence
    this.sortBy = '';

    if (typeof this.items === 'string') {
      this.items = JSON.stringify(updated);
    } else {
      this.items = updated;
    }

    this.dispatchEvent(
      new CustomEvent('fzl-cards-reorder', {
        detail: {
          items: updated,
          fromIndex,
          toIndex,
          item: moved,
        },
        bubbles: true,
        composed: true,
      })
    );
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
    if (!this.allowReorder || this._draggedIndex === null) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    if (this._dragOverIndex !== index) {
      this._dragOverIndex = index;
    }
  }

  private _handleDragLeave(index: number) {
    if (this._dragOverIndex === index) {
      this._dragOverIndex = null;
    }
  }

  private _handleDrop(targetIndex: number, event: DragEvent) {
    if (!this.allowReorder || this._draggedIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceIndex = this._draggedIndex;
    this._draggedIndex = null;
    this._dragOverIndex = null;
    this._reorderCards(sourceIndex, targetIndex);
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
    const rawItems = parseFzlCardItems(this.items);
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
                return html`
                  <li
                    class="fzl-card ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}"
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
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this._handleCardClick(item, index, e as unknown as MouseEvent);
                      }
                    }}
                  >
                    <div class="fzl-card-header" part="card-header">
                      <div class="fzl-card-title-group">
                        <h3 class="fzl-card-title">${item.title}</h3>
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
                      ? html`<div class="fzl-card-body" part="card-body">${item.description}</div>`
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
