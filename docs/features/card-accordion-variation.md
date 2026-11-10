# Feature: Card Accordion / Collapsible Variation (`fzl-*-card-list` & `fzl-*-card`)

- **Status**: Completed
- **Date**: 2026-11-10
- **Author/Agent**: Antigravity Assistant
- **Target Components**:
  - `webcomponents-lit`: `<fzl-lit-card-list>`, `<fzl-lit-card>` (`@fzl/webcomponents-lit`)
  - `webcomponents-es6`: `<fzl-es6-card-list>`, `<fzl-es6-card>` (`@fzl/webcomponents-es6`)
  - `webcomponents-angular`: `<fzl-ng-card-list>`, `<fzl-ng-card>` (`@fzl/webcomponents-angular`)
  - `appshell-lit`: Playground & Showcase integration (`catalog.js`)
  - `docs/components/card-list.md`: Living documentation spec
- **Document Path**: `docs/features/card-accordion-variation.md`

---

## 1. Goal & Motivation

### 1.1 Objective
Provide an **accordion / collapsible card variation** across our Web Components (`Lit`, `Vanilla ES6`, `Angular Elements`) designed specifically for cards with extensive text or content that requires scrolling.

### 1.2 User Problem & Solution Design
In task management systems (such as `fzl-tasktodayapp`), process management tools (BPMS), and financial investment platforms, cards often contain extensive text (such as compliance rulings, contract terms, descriptions, or instructions).
- **Previous behavior**: Cards with long text expanded vertically without bound, breaking the visual harmony of grid or vertical layouts and dominating the screen.
- **New behavior (Accordion Mode)**:
  1. **Collapsed State**: Cards are displayed initially closed, showing only the compact header (`caption`/`title` and optional `subtitle`, alongside badges and reorder controls). An accordion chevron indicator (`▾`) signals interactivity.
  2. **User Interaction**: Clicking on the card title / header (or pressing `Enter` / `Space`) toggles the card open.
  3. **Expanded State with Scrollbar**: The card does **not** expand indefinitely; instead, it opens to the standard card height (`card-body-max-height`, default `'180px'`), and an internal scrollbar (`overflow-y: auto`) allows the user to scroll through the full text cleanly without distorting the layout.
  4. **Toggle Back**: Clicking the title again collapses the card back into its compact state.

---

## 2. API Contract

### 2.1 Properties & Attributes on `<fzl-*-card-list>`
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `collapsible-cards` | `collapsibleCards` | `boolean` | `false` | Enables collapsible accordion behavior across all cards in the list |
| `card-body-max-height` | `cardBodyMaxHeight` | `string` | `'180px'` | Maximum height of the card body when expanded; activates scrollbar |

### 2.2 Item Schema (`FzlCardItem`)
```typescript
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
  collapsible?: boolean; // Enables accordion behavior on this specific card
  expanded?: boolean;    // Initial expanded state (defaults to false when collapsible)
  [key: string]: unknown;
}
```

### 2.3 Standalone Card Components (`<fzl-*-card>`)
In addition to the card list, developers can use `<fzl-lit-card>`, `<fzl-es6-card>`, and `<fzl-ng-card>` directly:
```html
<fzl-lit-card
  title="Instruções de Pagamento"
  subtitle="Conta de Liquidação"
  badge="Prioritário"
  badge-variant="danger"
  collapsible
  body-max-height="160px"
>
  <p>Texto longo com múltiplos parágrafos que exibirá barra de rolagem...</p>
</fzl-lit-card>
```

### 2.4 Programmatic Methods
- `isCardExpanded(item: FzlCardItem): boolean`: Checks whether a card is currently open.
- `toggleCardExpand(item: FzlCardItem, index: number, event?: Event): boolean`: Toggles expansion.
- `expandAllCards(): void`: Expands all cards in the list.
- `collapseAllCards(): void`: Collapses all cards in the list.

### 2.5 Events
- `fzl-card-toggle`: Dispatched when a card is expanded or collapsed:
  - `e.detail`: `{ item: FzlCardItem, index: number, expanded: boolean }` (on card list) or `{ expanded: boolean }` (on standalone card).

---

## 3. Accessibility & WCAG 2.2 AAA Considerations
- **WAI-ARIA Pattern**: The header title group uses `role="button"`, `tabindex="0"`, `aria-expanded="true|false"`, and `aria-controls="fzl-card-body-${item.id}"`.
- **Keyboard Navigation**: Pressing `Enter` or `Space` while focused on the title group triggers expansion / collapse.
- **Visible Focus Indicator**: Focus rings use `--_fzl-focus-ring` conforming to 3:1 contrast against adjacent colors.
- **Motion Reduction**: Transitions respect `prefers-reduced-motion`.
