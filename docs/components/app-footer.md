# Component Specification: App Footer (`app-footer`)

> **Status:** Ready  
> **Category:** Layout Container  
> **Implementations:**
> - Lit: `<app-footer>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `app-footer` component is the pinned bottom bar of the appshell. It hosts status indicators (`<connection-status>`, `<app-clock>`, `<app-version>`) and exposes a default `<slot>` for host applications to append custom status badges or audit summaries.

---

## 2. Usage Examples

### HTML
```html
<app-footer></app-footer>
```

### Lit
```js
html`
  <app-footer>
    <span>Ambiente: Homologação</span>
  </app-footer>
`
```
