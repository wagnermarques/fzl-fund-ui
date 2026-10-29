# Component Specification: App Version (`app-version`)

> **Status:** Ready  
> **Category:** UI Indicator  
> **Implementations:**
> - Lit: `<app-version>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `app-version` widget displays the semantic version of the installed PWA bundle. The version is injected at build time from `package.json` through the `__APP_VERSION__` global constant.

Because progressive web applications utilize aggressive Service Worker caching, displaying the exact deployed build version is essential for user support and verification.

---

## 2. Usage Examples

### HTML
```html
<app-version></app-version>
```

### Lit
```js
html`<app-version></app-version>`
```
