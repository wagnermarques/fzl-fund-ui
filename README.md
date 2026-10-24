# FZL UI Widgets & Web Components

Unified monorepo workspace for building, documenting, and distributing standards-based **Web Components** (`<fzl-*>`) across heterogeneous host applications (Angular, React, Vue, and server-rendered/legacy HTML BPMS applications).

---

## Workspace Structure

```text
fzl-fund-ui-widgets-components/
├── docs/                         # Synchronized Architecture, Guides & Component Specs
│   ├── README.md                 # Documentation Hub & Docs-as-Code workflow
│   ├── architecture/             # Architecture Decision Records (ADRs)
│   ├── guides/                   # Host application integration guides
│   └── components/               # Component specifications & auto-synced API tables
├── packages/
│   └── design-tokens/            # @fzl/design-tokens: Shared CSS variables & Shadow DOM styles
├── webcomponents-es6/            # @fzl/webcomponents-es6: Pure Vanilla ES6/TS Custom Elements
├── webcomponents-lit/            # @fzl/webcomponents-lit: Lit 3.x Custom Elements
├── webcomponents-angular/        # @fzl/webcomponents-angular: Angular Elements Web Components
└── scripts/
    └── sync-docs.mjs             # Synchronizes Custom Elements Manifest (CEM) into Markdown docs
```

---

## Quick Start

### Prerequisites
- **Node.js** `>= 20.0.0` (tested with `v22.x`)
- **npm** `>= 10.0.0`

### Common Commands

| Command | Description |
| :--- | :--- |
| `npm install` | Install dependencies for all workspace packages from the root |
| `npm run build` | Build all packages (`@fzl/design-tokens`, `es6`, `lit`, `angular`) |
| `npm run analyze` | Generate `custom-elements.json` manifests across packages |
| `npm run docs:sync` | Analyze components and synchronize API tables in `docs/components/` |
| `npm run dev:es6` | Start local development server for `webcomponents-es6` |
| `npm run dev:lit` | Start local development server for `webcomponents-lit` |
| `npm run dev:angular` | Start local development server for `webcomponents-angular` |

---

## Documentation Hub

All architectural decisions, styling conventions, and widget API specifications are maintained in [`docs/README.md`](./docs/README.md):

1. [ADR 001: Monorepo Workspace & Technology Stack](./docs/architecture/001-monorepo-and-tech-stack.md)
2. [ADR 002: Design Tokens, Shadow DOM & Theming](./docs/architecture/002-design-tokens-and-shadow-dom.md)
3. [Host Application Integration Guide](./docs/guides/host-integration.md)
4. [Component Specification Template](./docs/components/_template.md)
