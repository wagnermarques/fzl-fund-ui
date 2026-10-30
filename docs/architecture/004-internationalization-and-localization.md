# ADR-004: Internationalization (i18n) & Localization (l10n) Architecture

- **Status:** Proposed
- **Date:** 2026-10-29

---

## Context

The `fzl-fund-ui` monorepo delivers two interconnected layers:
1. **Host Appshell (`appshell-lit`)**: An application shell and PWA framework providing navigation, authentication, user preferences, storage, layout, and system notifications.
2. **Multi-Engine Web Components (`webcomponents-lit`, `webcomponents-es6`, `webcomponents-angular`)**: Standards-compliant `<fzl-*>` custom elements designed to run inside the appshell as well as standalone across third-party host applications (React, Angular, Vue, and server-rendered BPMS pages).

To support global deployments, multi-lingual BPMS workflows, and diverse user locales, we need a unified, performant, and decoupled approach to **internationalization (i18n)**, **localization (l10n)**, and **bidirectional layout (RTL/LTR)**.

### Challenges & Constraints
- **Zero Tight-Coupling for Standalone Widgets:** Reusable Web Components must not strictly depend on `appshell-lit` or any specific state management library. A host app using React or Vanilla HTML should be able to consume `<fzl-crumb>` or `<fzl-button>` and localize it naturally.
- **Bundle Size Optimization:** Loading heavy client-side i18n runtimes (e.g., massive polyfills or static translation catalogs for 20 languages) impairs PWA performance. Native browser capabilities (`Intl`) and lazy-loading of translation chunks must be prioritized.
- **Shadow DOM Isolation:** Shadow boundaries prevent global styling and DOM queries; language changes must propagate reactively and cleanly across the tree.
- **Multi-Engine Consistency:** The pattern must work symmetrically across Lit, Vanilla ES6, and Angular Elements without fragmenting developer experience.

---

## Decision

We adopt a **Two-Tier Layered i18n Architecture**:

```
+---------------------------------------------------------------------------------+
|                                 Appshell Tier                                   |
|  - i18nService (Locale detection, storageKey('i18n:locale'), reactive state)     |
|  - Translation Catalogs (Dynamic JSON/ESM loading per locale: pt-BR, en-US, etc)|
|  - Shell UI translation (Drawers, Dialogs, Auth, Notifications, Settings)       |
|  - Global DOM sync: <html lang="..." dir="..."> + shell:locale-changed event    |
+---------------------------------------------------------------------------------+
                                      |
                 (DOM Inheritance, lang/dir attributes & events)
                                      v
+---------------------------------------------------------------------------------+
|                             Web Components Tier                                 |
|  <fzl-*>, <fzl-lit-*>, <fzl-es6-*>, <fzl-ng-*>                                  |
|  - Principle 1: Slots first (host translates content passed into slots)         |
|  - Principle 2: Built-in minimal dictionary for internal UI strings             |
|  - Principle 3: Standard [lang] & [dir] attribute observation                   |
|  - Principle 4: Native browser Intl APIs (dates, times, numbers, currency)      |
|  - Principle 5: CSS Logical Properties for seamless RTL support                 |
+---------------------------------------------------------------------------------+
```

---

## 1. Web Components Tier Specification

### 1.1 Content Projection First (`<slot>`)
All customizable textual labels, button captions, and rich content are projected using native `<slot>` elements. This allows the host application (whether Lit, Angular, React, or server-rendered) to use its own translation tooling directly:
```html
<fzl-button variant="primary">
  <span>Salvar Alterações</span> <!-- Host translates this -->
</fzl-button>
```

### 1.2 Internal Built-in Dictionary & Overrides
For fixed internal control labels (e.g. `aria-label`, "Close", "Loading...", "Breadcrumb navigation", pagination buttons), components maintain a tiny internal dictionary with supported core locales (`pt-BR`, `en-US`, `es-ES`), falling back to `en-US` or `pt-BR`.
Any built-in label can be explicitly overridden via attributes or properties:
```html
<!-- Automatically localized via inherited or explicit lang -->
<fzl-crumb lang="en-US"></fzl-crumb>

<!-- Explicit label override takes precedence -->
<fzl-crumb aria-label="Hierarchical navigation"></fzl-crumb>
```

### 1.3 Locale Detection & Reactivity in Custom Elements
Components determine their active locale in the following order of precedence:
1. Explicit `lang` attribute on the custom element (`<fzl-crumb lang="es-ES">`).
2. Closest ancestor with a `lang` attribute (`el.closest('[lang]')`).
3. Root document language: `document.documentElement.lang`.
4. Default fallback locale configured in the component (`pt-BR`).

#### Implementation across engines:
- **`webcomponents-lit`**: Uses a lightweight `LocaleController` (Lit Reactive Controller) that registers a `MutationObserver` on `document.documentElement` (observing `lang` and `dir`) and listens to the `fzl:locale-change` event.
- **`webcomponents-es6`**: Listens to `attributeChangedCallback('lang', ...)` and global `fzl:locale-change` / document attribute mutations.
- **`webcomponents-angular`**: Standard `@Input() lang?: string` combined with Angular signal-based locale detection.

### 1.4 Native Browser `Intl` API
Instead of bundling third-party date/number formatting libraries, all components utilize the browser's native `Intl` APIs:
- `Intl.DateTimeFormat(locale, options)` (e.g. for `<fzl-clock>`, audit timestamps).
- `Intl.NumberFormat(locale, options)` (for financial amounts, quotas, BPMS counters).
- `Intl.RelativeTimeFormat(locale, options)` (e.g., "há 5 minutos", "2 hours ago").
- `Intl.PluralRules(locale)` (for pluralization logic).

### 1.5 CSS Logical Properties & RTL Support
To support right-to-left languages (e.g. Arabic, Hebrew) without custom CSS duplication:
- All spacing, margins, paddings, borders, and positions in `@fzl/design-tokens` and component styles MUST use **CSS Logical Properties**:
  - `margin-inline-start` / `margin-inline-end` instead of `margin-left` / `margin-right`.
  - `padding-inline-start` / `padding-inline-end` instead of `padding-left` / `padding-right`.
  - `inset-inline-start` / `inset-inline-end` instead of `left` / `right`.
  - `text-align: start` instead of `text-align: left`.
- Direction is declared on `:host([dir="rtl"])` or inherited from `document.documentElement.dir`.

---

## 2. Appshell Tier Specification (`appshell-lit`)

### 2.1 Configuration (`appshell.config.js`)
The appshell configuration extends to support i18n settings:
```javascript
export default {
  title: 'Fund Appshell',
  i18n: {
    defaultLocale: 'pt-BR',
    fallbackLocale: 'pt-BR',
    supportedLocales: [
      { code: 'pt-BR', name: 'Português (Brasil)', dir: 'ltr' },
      { code: 'en-US', name: 'English (US)', dir: 'ltr' },
      { code: 'es-ES', name: 'Español', dir: 'ltr' },
    ],
    // Auto-detect browser preferred language on first launch
    autoDetect: true,
  },
}
```

### 2.2 `i18nService` & State Management
Following the existing architecture of `accessibility-service.js` and `auth-service.js`:
- User selection is persisted in `localStorage` using `storageKey('i18n:locale')` (ensuring origin isolation across multiple apps).
- Initial locale resolution:
  1. Stored user preference in `localStorage`.
  2. If `autoDetect: true`, match `navigator.languages` with `supportedLocales`.
  3. `config.i18n.defaultLocale`.
  4. Fallback (`pt-BR`).
- When locale changes:
  1. Updates `document.documentElement.lang = newLocale`.
  2. Updates `document.documentElement.dir = localeDir` (`ltr` or `rtl`).
  3. Dispatches `SHELL_EVENTS.LOCALE_CHANGED` via `shellEvents`.
  4. Dispatches global window event `fzl:locale-change` for standalone custom elements.
  5. Saves to `storageKey('i18n:locale')`.

### 2.3 Modular Translation Catalogs (Dynamic Import)
Translations are organized in modular JSON/ESM catalogs:
```text
appshell-lit/src/locales/
├── pt-BR.js
├── en-US.js
└── es-ES.js
```
The active locale dictionary is dynamically imported on demand (`import('./locales/${locale}.js')`), ensuring zero penalty on initial page load for unused languages.

### 2.4 Interpolation & Pluralization Helper (`t()`)
A lightweight, fast formatting function handles interpolation and pluralization without bulky dependencies:
```javascript
// Variable interpolation
t('auth.welcome', { name: 'Wagner' }); // "Bem-vindo, Wagner!"

// Pluralization via Intl.PluralRules
t('notifications.unread', { count: 3 }); // "Você tem 3 novas notificações"
```

---

## Consequences

### Positive
- **High Performance:** Minimal bundle impact; leverages native browser `Intl` engine and asynchronous catalog loading.
- **Modular & Decoupled:** Components work in any host framework without requiring the appshell.
- **Accessible & SEO-Friendly:** Automatically updates `lang` and `dir` at the root, assisting screen readers and search crawlers.
- **Enterprise-Ready:** Fully supports multi-currency and RTL requirements for international BPMS deployments.

### Negative / Trade-offs
- Internal dictionaries in Web Components must be kept small (only essential control labels) to prevent bundle bloat in leaf widgets.
- Translations in the appshell require a maintenance process (linting/extracting missing keys).
