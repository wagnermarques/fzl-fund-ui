# ADR-002: Design Tokens, Shadow DOM Encapsulation & Form Participation

- **Status:** Accepted
- **Date:** 2026-10-22

---

## Context

Because our widgets will run inside multiple heterogeneous host applications with different global CSS resets (e.g., Bootstrap, Angular Material, Tailwind, or legacy stylesheets), our components must:
1. Prevent host CSS from accidentally breaking internal widget layout.
2. Allow host applications to customize brand colors, typography, and border radius consistently.
3. Work seamlessly inside native `<form>` elements as well as Angular Reactive Forms and React forms.

---

## Decision

### 1. Shadow DOM & `@fzl/design-tokens`
- All widgets use **open Shadow DOM** (`attachShadow({ mode: 'open' })` or `ViewEncapsulation.ShadowDom` in Angular).
- Visual properties (colors, spacing, fonts, focus rings, transitions) are defined as **CSS Custom Properties** (`--fzl-*`) inside `@fzl/design-tokens`.
- Because CSS Custom Properties pierce the Shadow DOM boundary via inheritance, host applications can theme all `<fzl-*>` widgets globally on `:root` or locally on a wrapper container.
- Every widget exposes key internal elements via `part="..."` attributes (e.g., `part="button"`, `part="input"`, `part="label"`) so host apps can use `::part()` when fine-grained CSS overrides are needed.

### 2. Custom Events Convention
- All custom events dispatched by `<fzl-*>` widgets MUST set:
  ```ts
  new CustomEvent('fzl-change', {
    detail: { value },
    bubbles: true,
    composed: true, // Required to cross the Shadow DOM boundary
  });
  ```
- Event names are prefixed with `fzl-` (e.g., `fzl-click`, `fzl-input`, `fzl-change`, `fzl-focus`, `fzl-blur`) to avoid colliding with native DOM events while remaining explicit in frameworks.

### 3. Native Form Participation (`ElementInternals`)
- Form control widgets (`input`, `select`, `checkbox`, etc.) implement `static formAssociated = true` and `this.attachInternals()` where supported so they participate natively in `<form>` submission, reset, and validation.
