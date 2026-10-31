# Component Specification: Card List (`fzl-*-card-list`)

> **Status:** In Progress  
> **Category:** UI Data Display  
> **Implementations:**
> - Vanilla ES6: `<fzl-es6-card-list>` (`@fzl/webcomponents-es6`)
> - Lit: `<fzl-lit-card-list>` (`@fzl/webcomponents-lit`)
> - Angular Elements: `<fzl-ng-card-list>` (`@fzl/webcomponents-angular`)

---

## 1. Overview & Purpose

The **Card List** (`<fzl-*-card-list>`) component presents collections of items (tasks, activities, process instances, cards) in interactive, structured card layouts.

It supports:
- **Layout modes**: `'vertical'` (list/feed), `'grid'` (responsive multi-column grid), and `'horizontal'` (horizontal scroll carousel).
- **Customizable Scrolling**: Controlled via `max-height` (e.g. `'480px'`, `'100%'`).
- **Interactive Sorting**: Sort cards by fields (`title`, `date`, `priority`, `status`, `category`) in ascending (`asc`) or descending (`desc`) order, with an optional user-facing toolbar (`allow-sort`).
- **Manual Reordering**: Reorder and organize cards via HTML5 drag-and-drop and accessible move buttons (▲ / ▼) (`allow-reorder`).
- **Quick Filtering**: Optional search filter bar (`allow-filter`).
- **Card Actions & Selection**: Custom events for card click (`fzl-card-click`), primary action button (`fzl-card-action`), and card reordering (`fzl-cards-reorder`).
- **Design Tokens & Accessibility**: Themed via `@fzl/design-tokens`, WCAG compliant with `role="region"`, `role="list"`, `role="listitem"`, and keyboard navigation.

---

## 2. Usage Examples

### Plain HTML / BPMS
```html
<fzl-lit-card-list
  layout="grid"
  allow-sort
  allow-filter
  allow-reorder
  max-height="500px"
  items='[
    {"id":"t-1","title":"Revisar módulo de Arquitetura Apache Camel","description":"Concluir refatoração de rotas","category":"Cursos","priority":"ALTA","status":"EM_ANDAMENTO","date":"2026-10-31"},
    {"id":"t-2","title":"Pagamento de serviços Cloud","description":"Fatura mensal do provedor","category":"Financeiro","priority":"MEDIA","status":"PENDENTE","date":"2026-11-05"}
  ]'
></fzl-lit-card-list>
```

### Lit / Appshell Host Application
```js
html`
  <fzl-lit-card-list
    .items=${tasks}
    layout="grid"
    allow-sort
    allow-filter
    allow-reorder
    @fzl-card-click=${(e) => openTask(e.detail.item)}
    @fzl-card-action=${(e) => toggleStatus(e.detail.item)}
    @fzl-cards-reorder=${(e) => saveTaskSequence(e.detail.items)}
    @fzl-sort-change=${(e) => console.log('Sorted by', e.detail)}
  ></fzl-lit-card-list>
`
```

### Angular Host Application
```html
<fzl-ng-card-list
  [items]="tasks"
  layout="vertical"
  [allowSort]="true"
  [allowFilter]="true"
  (fzl-card-click)="onCardClick($event)"
  (fzl-card-action)="onCardAction($event)"
></fzl-ng-card-list>
```

---

## 3. Synchronized API Reference (Auto-Generated)

> *The section below is automatically synchronized from source code JSDoc & TypeScript declarations via `npm run docs:sync`. Do not edit manually between the `CEM:START` and `CEM:END` markers.*

<!-- CEM:START -->

### `<fzl-es6-card-list>` — Vanilla ES6 (`@fzl/webcomponents-es6`)

Pure ES6 Custom Element (`fzl-es6-card-list`)
Displays structured cards with sorting, filtering, and responsive scrolling.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `items` | `string` | - |  |
| `layout` | `layout` | `string` | - |  |
| `max-height` | `max-height` | `string` | - |  |
| `sort-by` | `sort-by` | `string` | - |  |
| `sort-order` | `sort-order` | `string` | - |  |
| `allow-sort` | `allow-sort` | `string` | - |  |
| `allow-filter` | `allow-filter` | `string` | - |  |
| `allow-reorder` | `allow-reorder` | `string` | - |  |
| `empty-text` | `empty-text` | `string` | - |  |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-cards-reorder` | `CustomEvent<{ items: FzlCardItem[]; fromIndex: number; toIndex: number; item: FzlCardItem }>` | Dispatched when cards are reordered |
| `fzl-filter-change` | `CustomEvent<{ filter: string }>` | Dispatched when search filter text changes |
| `fzl-sort-change` | `CustomEvent<{ sortBy: string; sortOrder: FzlSortOrder }>` | Dispatched when sorting criteria changes |
| `fzl-card-click` | `CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>` | Dispatched when a card is clicked |
| `fzl-card-action` | `CustomEvent<{ action: string; item: FzlCardItem; index: number; originalEvent: MouseEvent }>` | Dispatched when card action button is clicked |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `container` | The outer root container |
| `toolbar` | The top sorting and filtering toolbar |
| `list` | The scrollable card container element |
| `card` | Each card element in the collection |
| `card-header` | Card header element |
| `card-body` | Card description/body element |
| `card-footer` | Card footer containing tags and action |
| `reorder-controls` | Reordering buttons container on each card |

---

### `<fzl-lit-card-list>` — Lit (`@fzl/webcomponents-lit`)

Multi-Engine Card List Custom Element (`fzl-lit-card-list`)
Displays structured cards with responsive layouts, sorting, filtering and scroll container.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `items` | `FzlCardItem[] \| string` | `[]` | Array of card items or JSON string |
| `layout` | `layout` | `FzlCardLayout` | `'grid'` | Layout mode: 'vertical' \| 'grid' \| 'horizontal' |
| `max-height` | `maxHeight` | `string` | `'none'` | Max height of the scrollable feed (e.g. '500px', '100%') |
| `sort-by` | `sortBy` | `string` | `''` | Field to sort by ('title', 'date', 'priority', 'status', 'category') |
| `sort-order` | `sortOrder` | `FzlSortOrder` | `'asc'` | Sorting order: 'asc' \| 'desc' |
| `allow-sort` | `allowSort` | `boolean` | `false` | Whether to display the built-in sorting toolbar |
| `allow-filter` | `allowFilter` | `boolean` | `false` | Whether to display the search filter input |
| `allow-reorder` | `allowReorder` | `boolean` | `false` | Whether cards can be manually reordered by the user |
| `empty-text` | `emptyText` | `string` | `'Nenhum item encontrado'` | Text displayed when list is empty |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-cards-reorder` | `CustomEvent<{ items: FzlCardItem[]; fromIndex: number; toIndex: number; item: FzlCardItem }>` | Dispatched when cards are reordered |
| `fzl-card-click` | `CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>` | Dispatched when a card is clicked |
| `fzl-card-action` | `CustomEvent<{ action: string; item: FzlCardItem; index: number; originalEvent: MouseEvent }>` | Dispatched when card action button is clicked |
| `fzl-sort-change` | `CustomEvent<{ sortBy: string; sortOrder: FzlSortOrder }>` | Dispatched when sorting criteria changes |
| `fzl-filter-change` | `CustomEvent<{ filter: string }>` | Dispatched when search filter text changes |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `container` | The outer root container |
| `toolbar` | The top sorting and filtering toolbar |
| `list` | The scrollable card container element |
| `card` | Each card element in the collection |
| `card-header` | Card header element |
| `card-body` | Card description/body element |
| `card-footer` | Card footer containing tags and action |
| `reorder-controls` | Reordering buttons container on each card |

---

### `<fzl-ng-card-list>` — Angular Elements (`@fzl/webcomponents-angular`)

Angular Elements Card List Custom Element (`fzl-ng-card-list`)
Displays structured cards with sorting, filtering, and responsive scrolling.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `items` | `string` | `'[]'` | Card items array or JSON string |
| `layout` | `layout` | `string` | `'grid'` | Layout mode: 'vertical' \| 'grid' \| 'horizontal' |
| `max-height` | `max-height` | `string` | `'none'` | Max height for scroll container (e.g. '500px') |
| `sort-by` | `sort-by` | `string` | `''` | Field to sort by ('title', 'date', 'priority', 'status', 'category') |
| `sort-order` | `sort-order` | `string` | `'asc'` | Sort order: 'asc' \| 'desc' |
| `allow-sort` | `allow-sort` | `boolean` | `false` | Whether to show the sorting toolbar |
| `allow-filter` | `allow-filter` | `boolean` | `false` | Whether to show the filter search input |
| `allow-reorder` | `allow-reorder` | `boolean` | `false` | Whether cards can be manually reordered |
| `empty-text` | `empty-text` | `string` | `'Nenhum item encontrado'` | Text when list is empty |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-card-click` | `CustomEvent<{ item: FzlCardItem; index: number; originalEvent: MouseEvent }>` | Dispatched when a card is clicked |
| `fzl-card-action` | `CustomEvent<{ action: string; item: FzlCardItem; index: number; originalEvent: MouseEvent }>` | Dispatched when card action button is clicked |
| `fzl-sort-change` | `CustomEvent<{ sortBy: string; sortOrder: FzlSortOrder }>` | Dispatched when sorting criteria changes |
| `fzl-filter-change` | `CustomEvent<{ filter: string }>` | Dispatched when search filter text changes |
| `fzl-cards-reorder` | `CustomEvent<{ items: FzlCardItem[]; fromIndex: number; toIndex: number; item: FzlCardItem }>` | Dispatched when cards are reordered |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `container` | The outer root container |
| `toolbar` | The top sorting and filtering toolbar |
| `list` | The scrollable card container element |
| `card` | Each card element in the collection |
| `card-header` | Card header element |
| `card-body` | Card description/body element |
| `card-footer` | Card footer containing tags and action |
| `reorder-controls` | Reordering buttons container on each card |

<!-- CEM:END -->
