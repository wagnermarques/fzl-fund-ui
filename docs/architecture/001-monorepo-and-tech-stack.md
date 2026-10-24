# ADR-001: Monorepo Workspace & Multi-Engine Web Components

- **Status:** Accepted
- **Date:** 2026-10-22

---

## Context

We are building reusable UI and Form widgets (`<fzl-*>`) to be consumed across heterogeneous host applications (Angular, React/Vue SPAs, and server-rendered/legacy HTML BPMS pages). We also want to develop and compare three distinct Web Component authoring approaches:

1. **`webcomponents-es6`**: Pure browser-native Custom Elements v1 (`HTMLElement`, Shadow DOM, `<template>`, `ElementInternals`) written in TypeScript with zero runtime dependencies.
2. **`webcomponents-lit`**: Reactive Custom Elements built on **Lit 3.x** (`LitElement`, declarative `html`/`css` tagged templates, reactive decorators).
3. **`webcomponents-angular`**: Angular components packaged as Custom Elements using **`@angular/elements`** (`createCustomElement`).

A key question arose: *Do we need completely separate projects for each approach, or can we use a single project?*

---

## Decision

We adopt a **Unified Monorepo Workspace** using **npm workspaces** at the root of `fzl-fund-ui-widgets-components`:

- **Single Developer Entrypoint:** One repository, one `npm install`, unified root scripts (`npm run build`, `npm run docs:sync`), and shared design tokens (`@fzl/design-tokens`).
- **Compiler Isolation per Package:**
  - `webcomponents-es6` and `webcomponents-lit` use **Vite** in library mode with `tsconfig.base.json`.
  - `webcomponents-angular` uses the **Angular CLI / Compiler (`ngc`)** with its own Angular-compatible `tsconfig.json`.
- **Standardized Tag Prefix (`fzl-`):**
  - Vanilla ES6 widgets use `<fzl-es6-*>` (or `<fzl-*>`)
  - Lit widgets use `<fzl-lit-*>`
  - Angular Elements widgets use `<fzl-ng-*>`

---

## Consequences

### Positive
- Zero compiler conflicts between Angular decorators/build pipeline and Lit/Vanilla ES6 TypeScript configurations.
- Zero runtime bloat: Vanilla ES6 bundles remain ~2–5 KB; Lit bundles only include `lit`; Angular bundles stay isolated to `webcomponents-angular`.
- Shared styling (`@fzl/design-tokens`) guarantees identical visual look-and-feel across all three implementations.
- Single synchronized documentation portal in `docs/`.
