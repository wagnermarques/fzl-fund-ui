# ADR-005: Shared Widget Core, Utilities, and Mixins (`@fzl/core`)

- **Status:** Accepted
- **Date:** 2026-11-04

---

## Context

As our Web Component library grows across all three supported engines (`webcomponents-es6`, `webcomponents-lit`, and `webcomponents-angular`), every `<fzl-*>` widget needs consistent cross-cutting capabilities:

1. **Instance Registry & Discovery:** Finding widget instances by ID or DOM node across Shadow DOM boundaries.
2. **Focus Management & Restoration:** Tracking the active widget stack (`curNode`, `activeStack`) piercing nested Shadow roots, and restoring focus when items are reordered or re-rendered.
3. **Accessibility (A11y) & High Contrast:** Detecting `forced-colors: active`, `prefers-contrast: more`, `prefers-reduced-motion: reduce`, and resolving effective text direction (`ltr` / `rtl`).
4. **Interaction States & Lifecycle Cleanup:** Automatic CSS state reflection (`data-fzl-hovered`, `data-fzl-focused`, `data-fzl-active`), normalized event dispatching (`emit`), and automatic teardown of owned handles (`own`).
5. **Keyboard Navigation & Typematic Repeat:** WAI-ARIA roving `tabindex` (`ArrowLeft`/`ArrowRight`/`ArrowUp`/`ArrowDown`/`Home`/`End`) for composite widgets (`crumb`, `card-list`) and accelerating press-and-hold repeat (`typematic`) for buttons.

We took architectural inspiration from the proven layered design of **Dojo Toolkit's Dijit** (Base Utilities, Utility Classes, Infrastructure Widgets/Mixins, and Accessibility), while implementing a clean, modern TypeScript architecture tailored for **Custom Elements v1** and **Shadow DOM** under our project's `GPL-3.0-or-later` license and `fzl` namespace.

---

## Decision

We introduce the **`@fzl/core`** workspace package (`packages/core`) with zero external runtime dependencies, providing:

### 1. Base Utilities & Utility Singletons
- **`fzlRegistry`**: Central widget registry (`add`, `remove`, `byId`, `byNode`, `getEnclosingWidget`, `findWidgets`) with Shadow DOM traversal and automatic `data-fzl-widget-id` stamping.
- **`fzlFocus`**: Shadow-DOM-aware focus manager tracking `curNode` and `activeStack`, plus `bookmarkFocus()` for focus restoration.
- **`fzlA11y`**: High-contrast (`data-fzl-hc`), reduced-motion (`data-fzl-reduced-motion`), effective `dir` (`ltr`/`rtl`) detection, and focusable element queries.
- **`fzlTypematic` / `addTypematicListener`**: Accelerating mouse/keyboard repeat controller for press-and-hold actions.
- **`fzlPlace` & `fzlPopup`**: Viewport-aware anchor positioning and z-index popup stack management.

### 2. Infrastructure Mixins & Controllers
- **`FzlWidgetController` & `FzlWidgetMixin`**:
  - Used as a class mixin (`FzlWidgetMixin(HTMLElement)` / `FzlWidgetMixin(LitElement)`) in ES6 and Lit, and as a composed controller (`new FzlWidgetController(host)`) in Angular Elements.
  - Automatically registers/unregisters the widget in `fzlRegistry` on connect/disconnect.
  - Reflects `data-fzl-hovered`, `data-fzl-active`, and `data-fzl-focused` on `:host` and emits `fzl-focus` / `fzl-blur` events.
  - Provides `own(...handles)` for automatic listener/observer cleanup on disconnect and `emit(name, detail)` for composed CustomEvents.
- **`FzlKeyNavController`**:
  - Implements WAI-ARIA roving `tabindex` (`0` on the active item, `-1` on siblings) and RTL-aware arrow/Home/End keyboard navigation across child items.

---

## Consequences

### Positive
- **Zero Duplication Across Engines:** Vanilla ES6, Lit, and Angular Elements share the exact same registry, focus stack, keyboard navigation, and typematic logic.
- **Clean Licensing & Namespace:** All code is authored cleanly in TypeScript under the `fzl` namespace (`@fzl/core`) and licensed under `GPL-3.0-or-later`.
- **Built-in Accessibility:** Every `<fzl-*>` widget inherits high-contrast/reduced-motion awareness, focus tracking, and keyboard navigation out of the box.
