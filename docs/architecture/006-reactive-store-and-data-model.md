# ADR-006: Reactive Data Model (`dojo/store`), Forms, and DataGrid Infrastructure

- **Status:** Accepted
- **Date:** 2026-11-06

---

## Context

Following the adoption of Dijit's widget infrastructure (`@fzl/core` ADR-005), our Web Components ecosystem required a formal, framework-agnostic **Data Model** to decouple data storage, querying, and mutations from the presentation layer.

In complex web applications and dashboards (such as the fund management tools and territorial GIS interfaces), widgets like forms (`<fzl-form>`) and tabular grids (`<fzl-data-grid>`) need to:

1. Query, sort, and filter records with a consistent API.
2. Synchronize state between disparate widgets without direct coupling.
3. Automatically react to asynchronous mutations (`add`, `update`, `delete`) via observable change events.
4. Support user data entry with validation, dirty checking, and structured serialization.

We adopted the architectural principles of **Dojo Toolkit's `dojo/store`** (`MemoryStore`, `QueryResults`, and `Observable`) and **`dijit/form` / `dojox/grid/DataGrid`**, adapting them cleanly for W3C Custom Elements and modern TypeScript.

---

## Decision

### 1. Unified Data Store Specification (`@fzl/core`)

We introduce `FzlStore<T, Id>` and its concrete in-memory implementation `FzlMemoryStore<T, Id>` in `@fzl/core`:

- **Identity Management (`getIdentity`, `idProperty`)**:
  - Deterministic primary key resolution (defaulting to `'id'`) with automated ID generation for new records.
- **Canonical CRUD Operations**:
  - `get(id)`: O(1) record retrieval via internal Map indexing.
  - `put(item, options)`: Updates an existing record or inserts if new.
  - `add(item, options)`: Explicit insertion with collision prevention.
  - `remove(id)`: Deletes a record and returns success status.
- **Querying & Slicing**:
  - `query(predicateOrFilter, options)`: Multi-criteria object filtering, case-insensitive string search across fields, custom predicate callbacks, multi-attribute sorting (`asc`/`desc`), and pagination slicing (`start`, `count`).
- **Reactive Observability (`observe`)**:
  - Emits normalized mutation events (`FzlStoreChangeEvent<T>`: `{ type: 'add' | 'update' | 'delete', id, target, previous }`).
  - Supports query-level observers via `queryResults.observe((item, removedFrom, insertedInto) => ...)`.

### 2. Form & Form Controls (`@fzl/webcomponents-lit`)

Modeled after `dijit/form/Form` and `_FormWidget`:

- **`<fzl-form>`**: Container element providing:
  - `getValues()`: Scans light and shadow DOM controls with a `name` attribute and returns a unified plain JavaScript object.
  - `setValues(data)`: Populates all child controls from an object or store record.
  - `validate()`: Triggers collective validation across all child inputs.
  - `reset()` and `isDirty()`: Rollback and dirty-state tracking.
  - `fzl-submit` and `fzl-change` custom events.
- **`<fzl-text-input>` (`ValidationTextBox`)**: Text input with regex pattern validation, required indicator, character limits, error alerts, and clear button.
- **`<fzl-number-input>` (`NumberTextBox` / `CurrencyTextBox`)**: Numeric/currency input with min/max bounds, step sizing, prefix/suffix formatting, and typematic repeat acceleration on increment/decrement buttons (`FzlTypematicController`).
- **`<fzl-select>` (`Select`)**: Accessible dropdown select with typed options array and slotted option elements.
- **`<fzl-checkbox>` (`CheckBox`)**: Accessible toggle checkbox.

### 3. Reactive Data Grid (`<fzl-data-grid>`)

Modeled after `dojox/grid/DataGrid` and `dgrid`:

- Driven directly by a `store` instance (`FzlStore`).
- Subscribes to `store.observe()` on `connectedCallback()` and automatically unbinds on `disconnectedCallback()` via `this.own()`.
- Interactive column header sorting with visual direction indicators.
- Real-time client-side search filtering.
- Row selection with `fzl-grid-select` and keyboard navigation.
- Empty states, row action triggers (`fzl-grid-delete`), and WCAG 2.1 AA / High Contrast compatibility.

### 4. Interactive Developers Portal (`/developers`)

We provide a dedicated "Developers" page in `appshell-lit` (`#/developers`):
- Visual documentation of the `@fzl/core` and Dijit architectural lineage.
- Live interactive laboratory demonstrating synchronization between `FzlMemoryStore`, `<fzl-form>`, and `<fzl-data-grid>` with real-time mutation telemetry.

---

## Consequences

### Positive
- **Decoupled Architecture:** Visual components only depend on the `FzlStore` interface, allowing backends (REST, GraphQL, IndexedDB, WebSockets) to swap seamlessly with in-memory stores.
- **Predictable Reactivity:** No heavy virtual DOM diffing required; widgets re-render specifically when their observed store emits mutation events.
- **High Consistency:** Form controls share standard validation paradigms, ARIA semantics, and token styling.
