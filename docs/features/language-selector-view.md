# Feature: Language Selector Component & Drawer Menu Integration

- **Status**: In Progress
- **Date**: 2026-10-29
- **Author/Agent**: Antigravity Assistant
- **Target Components**: `appshell-lit` (`config-language-view.js`, `app-shell.js`, `router.js`)
- **Document Path**: `docs/features/language-selector-view.md`

---

## 1. Goal & Overview

### 1.1 Objective
Provide an accessible and responsive Web Component (`<config-language-view>`) enabling users to select the application's active language/locale (`pt-BR`, `en-US`, `es-ES`), integrated directly into the navigation drawer under the "Config" menu.

### 1.2 Motivation & Value
Following the implementation of the core i18n engine (Phase 1 & 2), users require a visual interface to select and switch languages. The selection must immediately persist across reloads, update document attributes (`lang` and `dir`), broadcast change events, and present immediate visual feedback.

### 1.3 Scope & Acceptance Criteria
- [x] Accessible Custom Element (`<config-language-view>`) built with Lit and Material Web 3 components.
- [x] Route `#/config/idioma` registered in `router.js` with helper `navigateToConfigLanguage()`.
- [x] Drawer menu item "Idioma" added under `<nav-accordion label="Config">` in `app-shell.js`.
- [x] Immediate reactivity: selecting a language updates `i18nService`, persisting in `localStorage` and updating `<html lang="..." dir="...">`.
- [x] Live preview block inside the view showing localized date, currency, and translation samples.
- [x] Comprehensive unit tests with 100% pass rate.

---

## 2. Task Breakdown & Explicit Justifications

### Task 1: Hash Router & Navigation Helper
- **Status**: [x] Completed
- **Justification**: The appshell relies on declarative hash routing (`resolveRoute`, `shellRoutes`, and `navigateTo*` functions). Creating `#/config/idioma` and `navigateToConfigLanguage()` is necessary so the drawer item and deep links can open the view directly.

### Task 2: Implement `<config-language-view>` Web Component
- **Status**: [x] Completed
- **Justification**: A dedicated custom element encapsulated in Shadow DOM isolates the language selection UI, follows WCAG 2.1 touch target (>= 48px) standards, and leverages `i18nService` for reactive updates and sample localization previews.

### Task 3: Integrate with Navigation Drawer & AppShell Routes
- **Status**: [x] Completed
- **Justification**: Users access configuration screens via the drawer modal. Integrating the "Idioma" item with a globe/language icon (`<md-icon>language</md-icon>`) ensures intuitive discoverability alongside Backend, Accessibility, and Privacy settings.

### Task 4: Unit Test Suite & Verification
- **Status**: [x] Completed
- **Justification**: Verifies that selecting a language dispatches the expected changes, updates the DOM, renders all supported locales from `i18nService`, and prevents regressions in the appshell test suite.

---

## 3. Progress Tracking & Execution Details ("What Was Done")

### Task 1 Details:
- Updated `appshell-lit/src/router.js`: added `{ name: 'config-idioma', match: pattern('config/idioma') }` to `shellRoutes` and exported `navigateToConfigLanguage()`.
- Updated `appshell-lit/src/router.test.js`: added test asserting `resolveRoute('#/config/idioma')` resolves to `config-idioma`.

### Task 2 Details:
- Created `appshell-lit/src/webcomponents/config-language-view.js`:
  - Defined `<config-language-view>` with Lit and Material 3 `<md-radio>`.
  - Accessible `<fieldset>` with `<legend>` and `role="radiogroup"`.
  - Touch target compliance (minimum height 48px).
  - Integrated `preview-card` displaying live formatted date, currency, and translation preview reacting to locale changes.

### Task 3 Details:
- Updated `appshell-lit/src/webcomponents/app-shell.js`:
  - Imported `./config-language-view.js` and `navigateToConfigLanguage`.
  - Added "Idioma" menu item under `<nav-accordion label="Config">` with `<md-icon slot="start">language</md-icon>`.
  - Handled route render for `config-idioma` returning `<config-language-view>`.
- Updated `appshell-lit/src/webcomponents/app-crumb.js`: added breadcrumb hierarchy for `config-idioma` (`Início > Config > Idioma`).

### Task 4 Details:
- Created `appshell-lit/src/webcomponents/config-language-view.test.js` validating custom element registration, property initialization, reactive updates via `_selectLanguage`, and template rendering.
- Ran `./run-project.sh test`: all 24 test suites passed (248/248 tests passing).
