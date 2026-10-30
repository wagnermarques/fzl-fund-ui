# Feature: Multi-Engine Card List Web Component (`fzl-*-card-list`)

- **Status**: Completed
- **Date**: 2026-10-30
- **Author/Agent**: Antigravity Assistant
- **Target Components**:
  - `webcomponents-lit`: `<fzl-lit-card-list>`
  - `webcomponents-es6`: `<fzl-es6-card-list>`
  - `webcomponents-angular`: `<fzl-ng-card-list>`
  - `appshell-lit`: Showcase & Playground integration (`catalog.js`)
  - `docs/components/card-list.md`: Living documentation spec
- **Document Path**: `docs/features/card-list-component.md`

---

## 1. Goal & Overview

### 1.1 Objective
Implement a reusable, highly accessible, and customizable **Card List** Web Component across all three supported engines (**Lit**, **Vanilla ES6**, and **Angular Elements**), featuring responsive layout modes (vertical list, grid, horizontal scroll), built-in sorting (ascending/descending by multiple fields), search filtering, empty states, and keyboard/touch navigation.

### 1.2 Motivation & Value
Applications like `fzl-tasktodayapp` (`https://wagnermarques.github.io/fzl-tasktodayapp/`) and business process management (BPMS) systems routinely present collections of tasks, activities, process instances, or financial items as interactive cards.
A standardized `<fzl-*-card-list>` component allows host applications (React, Angular, Lit, or server-rendered HTML) to drop in a consistent, themed card feed with zero external dependencies, complete with user-controlled sorting and scrolling.

### 1.3 Scope & Acceptance Criteria
- [x] **Data Model & Types**: Standard `FzlCardItem` schema (`id`, `title`, `subtitle`, `description`, `status`, `priority`, `category`, `date`, `badge`, `tags`, `actionLabel`).
- [x] **Sorting Capabilities**:
  - Programmable and user-controlled sorting by field (`title`, `date`, `priority`, `status`, `category`).
  - Toggle between ascending (`asc`) and descending (`desc`) order.
  - Interactive top toolbar when `allow-sort` is enabled.
  - Custom event `fzl-sort-change` dispatched upon sort changes.
- [x] **Filtering & Scrolling**:
  - Search filter input when `allow-filter` is enabled (`fzl-filter-change` event).
  - Scrollable viewport container configured via `max-height` (vertical, responsive grid, or horizontal row).
  - Empty state message (`empty-text`) when no cards match.
- [x] **Event Dispatching**:
  - `fzl-card-click` when a card is selected.
  - `fzl-card-action` when a card action button is activated.
- [x] **Multi-Engine Consistency**:
  - Vanilla ES6: `<fzl-es6-card-list>` in `@fzl/webcomponents-es6`.
  - Lit: `<fzl-lit-card-list>` in `@fzl/webcomponents-lit`.
  - Angular Elements: `<fzl-ng-card-list>` in `@fzl/webcomponents-angular`.
- [x] **Design Tokens & A11y**:
  - Themed via `@fzl/design-tokens` with Shadow DOM isolation.
  - Accessible ARIA roles (`role="region"`, `role="list"`, `role="listitem"`, keyboard navigation).
- [x] **Docs & Demo Integration**:
  - Living specification document `docs/components/card-list.md`.
  - CEM synchronization (`npm run docs:sync`).
  - Interactive playground in `appshell-lit` demo showcase (`#/componentes`).

---

## 2. Task Breakdown & Explicit Justifications

### Task 1: Component Specification Document
- **Status**: [x] Completed
- **Justification**: Establishes the public API contract (attributes, events, slots, CSS parts) and usage guidelines in `docs/components/card-list.md` following the Docs-as-Code workflow prior to implementation.

### Task 2: Lit Implementation (`<fzl-lit-card-list>`)
- **Status**: [x] Completed
- **Justification**: Provides the reactive Lit Custom Element with subpath export (`@fzl/webcomponents-lit/card-list`), reactive sorting, and template rendering.

### Task 3: Vanilla ES6 Implementation (`<fzl-es6-card-list>`)
- **Status**: [x] Completed
- **Justification**: Guarantees zero-dependency browser-native execution in legacy and minimal host environments with direct DOM manipulation.

### Task 4: Angular Elements Implementation (`<fzl-ng-card-list>`)
- **Status**: [x] Completed
- **Justification**: Packages the component via `@angular/elements` with zoneless change detection and Angular Signals, maintaining feature parity.

### Task 5: Build, Package Exports & CEM Synchronization
- **Status**: [x] Completed
- **Justification**: Updates `package.json` entrypoints, builds bundles across all workspaces, runs `cem analyze`, and synchronizes API tables in Markdown docs.

### Task 6: Appshell Showcase Integration & End-to-End Validation
- **Status**: [x] Completed
- **Justification**: Integrates the new component into the Appshell live playground (`catalog.js`), runs full test suites, and verifies interactive sorting, filtering, and scrolling.

---

## 3. Progress Tracking & Execution Details ("What Was Done")

### Task 1 Details:
- Created `docs/components/card-list.md` with overview, usage examples for plain HTML, Lit, and Angular, and CEM placeholders.

### Task 2 Details:
- Created `webcomponents-lit/src/components/card-list/card-list.component.ts`:
  - Implemented `<fzl-lit-card-list>` with LitElement.
  - Added support for sorting fields (`title`, `date`, `priority`, `category`, `status`), ascending/descending order, filtering, layout modes (`grid`, `vertical`, `horizontal`), and custom events.
  - Exported in `webcomponents-lit/src/index.ts`, `vite.config.ts`, and `package.json` (`./card-list`).
  - Built bundle: `dist/card-list.js` (16.25 kB, gzip: 3.72 kB).

### Task 3 Details:
- Created `webcomponents-es6/src/components/card-list/card-list.component.ts`:
  - Pure Vanilla ES6 Custom Element `<fzl-es6-card-list>`.
  - Shadow DOM template cloning, observed attributes, and direct DOM event handling.
  - Exported in `webcomponents-es6/src/index.ts`.
  - Built bundle: `dist/fzl-es6.js` (32.14 kB, gzip: 7.02 kB).

### Task 4 Details:
- Created `webcomponents-angular/src/components/card-list/card-list.component.ts`:
  - Angular standalone component `FzlNgCardListComponent` with OnPush change detection and ShadowDom encapsulation.
  - Registered custom element `<fzl-ng-card-list>` in `webcomponents-angular/src/index.ts`.
  - Built bundle: `dist/fzl-angular.js` (450.77 kB, gzip: 120.66 kB).

### Task 5 Details:
- Executed `npm run docs:sync`:
  - Re-generated `custom-elements.json` across all 3 component packages.
  - Injected complete API tables (attributes, properties, events, CSS parts) into `docs/components/card-list.md`.

### Task 6 Details:
- Integrated `card-list` into `appshell-lit/demo/components/catalog.js` with realistic sample task data inspired by `fzl-tasktodayapp`.
- Created comprehensive test suite `appshell-lit/src/webcomponents/card-list.test.js` verifying parsing, sorting (by title, priority weights, and date), and filtering.
- Ran full monorepo test suite (`./run-project.sh test`): 25/25 test files passed, 257/257 tests passing.
