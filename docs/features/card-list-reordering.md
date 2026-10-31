# Feature: Card List Reordering & Manual Order Management (`allow-reorder`)

- **Status**: Completed
- **Date**: 2026-10-30
- **Author/Agent**: Antigravity Assistant
- **Target Components**:
  - `webcomponents-lit`: `<fzl-lit-card-list>`
  - `webcomponents-es6`: `<fzl-es6-card-list>`
  - `webcomponents-angular`: `<fzl-ng-card-list>`
  - `appshell-lit`: Showcase & Playground integration (`catalog.js`)
  - `docs/components/card-list.md`: Living documentation spec
- **Document Path**: `docs/features/card-list-reordering.md`

---

## 1. Goal & Overview

### 1.1 Objective
Implement an interactive card reordering feature across all three engines (**Lit**, **Vanilla ES6**, and **Angular Elements**) in `<fzl-*-card-list>`, allowing end users to manually organize, reorder, and modify the sequence of displayed cards via:
1. **Direct Drag-and-Drop** (native HTML5 draggable cards with visual drag handle, active dragging styles, and drop indicator).
2. **Accessible Reorder Controls** (keyboard-accessible "Mover para cima" / "Mover para baixo" buttons on each card, adhering to WCAG 2.1 accessible ordering standards).
3. **Reactive Reorder Dispatching** (`fzl-cards-reorder` custom event) giving host applications immediate access to the updated items collection.

### 1.2 Motivation & Value
Task management applications (such as `fzl-tasktodayapp`), workflow dashboards, and Kanban-style card feeds require users to prioritize and sequence their items manually according to their daily plan, rather than solely by static database fields. Enabling `allow-reorder` provides this capability out-of-the-box across all framework variants with zero external dependencies.

### 1.3 Scope & Acceptance Criteria
- [x] **Component Property & Attribute**: `allow-reorder` (boolean attribute, default `false`).
- [x] **Drag and Drop (HTML5)**:
  - Cards gain `draggable="true"` when `allow-reorder` is enabled.
  - Visual feedback on drag start (`dragging` class, opacity change).
  - Visual feedback on drag over / drop target (`drag-over` class, indicator border).
  - Dropping updates the array order and dispatches `fzl-cards-reorder`.
- [x] **Accessible Move Buttons**:
  - Each card renders "▲ Mover para cima" and "▼ Mover para baixo" buttons when `allow-reorder` is enabled.
  - Move Up is disabled on the first card; Move Down is disabled on the last card.
  - Activating a button swaps the card's position with its adjacent neighbor and dispatches `fzl-cards-reorder`.
- [x] **Event Contract**:
  - Dispatches `fzl-cards-reorder` with detail `{ items: FzlCardItem[], fromIndex: number, toIndex: number, item: FzlCardItem }`.
- [x] **Multi-Engine Consistency**:
  - Lit (`@fzl/webcomponents-lit`)
  - Vanilla ES6 (`@fzl/webcomponents-es6`)
  - Angular (`@fzl/webcomponents-angular`)
- [x] **Appshell Demo & Living Docs**:
  - Showcase in `catalog.js` configured with `allow-reorder: true`.
  - Specification updated in `docs/components/card-list.md`.
  - Unit tests in `appshell-lit/src/webcomponents/card-list.test.js`.

---

## 2. Task Breakdown & Explicit Justifications

### Task 1: API & Architectural Specification
- **Status**: [x] Completed
- **Justification**: Defines the public API contract (`allow-reorder`, events, CSS classes, accessibility attributes) beforehand to guarantee architectural parity across Lit, ES6, and Angular implementations.
- **Affected Files/Components**: `docs/components/card-list.md`, `docs/features/card-list-reordering.md`
- **What Was Done**:
  - Documented `allow-reorder` attribute and property across all implementations.
  - Specified `fzl-cards-reorder` event payload schema (`{ items, fromIndex, toIndex, item }`).
  - Added CSS part `reorder-controls` and updated accessibility design.

### Task 2: Lit Component Implementation (`<fzl-lit-card-list>`)
- **Status**: [x] Completed
- **Justification**: Provides the core reactive implementation with HTML5 drag-and-drop, accessible move buttons, and event dispatching for the primary Lit design system package.
- **Affected Files/Components**: `webcomponents-lit/src/components/card-list/card-list.component.ts`
- **What Was Done**:
  - Added `@property({ type: Boolean, attribute: 'allow-reorder' }) allowReorder: boolean = false;`.
  - Added `@state() _draggedIndex` and `@state() _dragOverIndex`.
  - Implemented `_reorderCards(fromIndex, toIndex)` method that swaps array positions, resets static `sortBy`, and dispatches `fzl-cards-reorder`.
  - Implemented `_moveCard(index, delta, event)` for accessible up/down button clicks.
  - Implemented HTML5 drag handlers (`_handleDragStart`, `_handleDragOver`, `_handleDragLeave`, `_handleDrop`, `_handleDragEnd`).
  - Rendered `draggable` attributes, `.dragging`, `.drag-over` states, and reorder controls container with drag handle (⠿), "▲ Mover para cima", and "▼ Mover para baixo" buttons (with boundary disabled state).

### Task 3: Vanilla ES6 Component Implementation (`<fzl-es6-card-list>`)
- **Status**: [x] Completed
- **Justification**: Guarantees zero-dependency Vanilla JavaScript support for legacy and framework-free enterprise environments with full feature parity.
- **Affected Files/Components**: `webcomponents-es6/src/components/card-list/card-list.component.ts`
- **What Was Done**:
  - Added `'allow-reorder'` to `observedAttributes`.
  - Added `allowReorder` getter and setter.
  - Added `_reorderCards(fromIndex, toIndex)` method that swaps elements in `this._items`, resets `_sortBy`, dispatches `fzl-cards-reorder`, and re-renders.
  - Added drag-and-drop DOM listeners and accessible move buttons in header actions.

### Task 4: Angular Elements Component Implementation (`<fzl-ng-card-list>`)
- **Status**: [x] Completed
- **Justification**: Ensures Angular host applications and Angular-based enterprise micro-frontends can seamlessly consume the reordering capability.
- **Affected Files/Components**: `webcomponents-angular/src/components/card-list/card-list.component.ts`
- **What Was Done**:
  - Added `@Input('allow-reorder') allowReorder: boolean | string = false;`.
  - Added `@Output('fzl-cards-reorder') fzlCardsReorder`.
  - Added template drag event bindings and accessible move buttons in `fzl-card-header-actions`.
  - Implemented `moveCard` and `reorderCards` methods with array splicing and event emission.

### Task 5: Unit Tests Suite for Reordering Functionality
- **Status**: [x] Completed
- **Justification**: Validates that array reordering logic (move up, move down, drag-and-drop index swap) and event payload dispatching work reliably without regressions across test suites.
- **Affected Files/Components**: `appshell-lit/src/webcomponents/card-list.test.js`
- **What Was Done**:
  - Added test suite `Card Reordering and Manual Order Management`.
  - Validated manual item position swapping (moving item up and down).
  - Validated `fzl-cards-reorder` event dispatching and payload structure.
  - Confirmed 260 unit tests pass across 25 test suites.

### Task 6: Appshell Showcase Integration, Build & Deployment
- **Status**: [x] Completed
- **Justification**: Integrates the feature in the live catalog demo (`catalog.js`), builds all packages, and publishes to GitHub Pages so end users can test the reordering feature in the browser.
- **Affected Files/Components**: `appshell-lit/demo/components/catalog.js`, `docs/components/card-list.md`
- **What Was Done**:
  - Enabled `'allow-reorder': true` by default in `catalog.js` initialValues.
  - Synchronized Custom Elements Manifests (`npm run docs:sync`).
  - Executed full production build (`npm run build:appshell`) successfully with 0 errors.

### Task 7: Playground Event Feedback Loop & State Retention Fix
- **Status**: [x] Completed
- **Justification**: The showcase playground (`ComponentDocsView`) was catching `fzl-cards-reorder`, triggering an update, and re-applying initial unmodified attribute values (`element.setAttribute('items', ...)`), causing any reordering to be immediately reverted.
- **Affected Files/Components**: `appshell-lit/demo/components/components-view.js`
- **What Was Done**:
  - In `_logEvent`, updated `this._values.items` with `JSON.stringify(event.detail.items)` upon receiving `fzl-cards-reorder`.
  - In `_sync()`, prevented setting attributes if the current DOM attribute already matches the target value, avoiding DOM resets and infinite feedback loops.

### Task 8: Vanilla ES6 Drag-and-Drop DOM Stability Fix
- **Status**: [x] Completed
- **Justification**: In `<fzl-es6-card-list>`, `dragstart`, `dragover`, and `dragend` listeners were calling `this._render()`, which destroyed and recreated all card DOM elements while dragging, immediately cancelling the browser's drag-and-drop operation.
- **Affected Files/Components**: `webcomponents-es6/src/components/card-list/card-list.component.ts`
- **What Was Done**:
  - Refactored drag listeners to mutate `.dragging` and `.drag-over` CSS classes directly without re-rendering the feed DOM.
  - In `attributeChangedCallback('items')`, added JSON equivalence check to avoid wiping out user reordering when parent passes identical items.
  - Reordered cards only on `drop` event, calling `_reorderCards(from, to)` cleanly.

### Task 9: Angular Elements Zoneless Change Detection & Draggable Fix
- **Status**: [x] Completed
- **Justification**: Under Zoneless Angular (`provideExperimentalZonelessChangeDetection`), custom element mutations and events do not trigger automatic zone-based change detection. Without explicit `ChangeDetectorRef.detectChanges()` and proper enumerated `draggable="true"` attributes, Angular Elements did not refresh or reorder cards.
- **Affected Files/Components**: `webcomponents-angular/src/components/card-list/card-list.component.ts`
- **What Was Done**:
  - Injected `ChangeDetectorRef` and changed component change detection strategy to `ChangeDetectionStrategy.Default`.
  - Converted `items` input to getter/setter that checks deep JSON equality before updating and calls `cdr.detectChanges()`.
  - Set `[attr.draggable]="isAllowReorder ? 'true' : null"` (standard HTML5 enumerated attribute value).
  - Called `this.cdr.detectChanges()` in `moveCard`, `reorderCards`, `onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`, and `onDragEnd`.

### Task 10: Lit Drag-and-Drop DataTransfer & Smoothness Fix
- **Status**: [x] Completed
- **Justification**: In `<fzl-lit-card-list>`, ensure dataTransfer `text/plain` payload retrieval on drop and prevent attribute reset loops.
- **Affected Files/Components**: `webcomponents-lit/src/components/card-list/card-list.component.ts`
- **What Was Done**:
  - Updated `_handleDrop` to read source index from `event.dataTransfer.getData('text/plain')` with fallback to `_draggedIndex`.
  - Added target boundary check on `_handleDragLeave`.
  - Verified Lit reorder reactivity and event emission.

---

## 3. Verification & Validation
- **Vitest Suite**: 260 tests passed across 25 test suites with 0 failures (`npm test`).
- **Build Verification**:
  - `@fzl/design-tokens`: tokens generated (`tokens.css`).
  - `@fzl/webcomponents-es6`: compiled to `dist/fzl-es6.js` (37.56 kB).
  - `@fzl/webcomponents-lit`: compiled to `dist/card-list.js` (21.81 kB).
  - `@fzl/webcomponents-angular`: compiled to `dist/fzl-angular.js` (456.47 kB).
  - `fzl-fund-appshell--lit`: production PWA bundle built in `dist/`.
- **Docs & CEM**: Custom Elements Manifests and `docs/components/card-list.md` updated and in sync.

---

## 3. Verification & Validation
- [Automated Vitest / Karma execution]
- [Build check across all packages]
- [Live testing in demo playground]
