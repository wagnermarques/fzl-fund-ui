# Component Specification: Nav Accordion (`nav-accordion`)

> **Status:** Ready  
> **Category:** Navigation Container  
> **Implementations:**
> - Lit: `<nav-accordion>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `nav-accordion` component provides a collapsible navigation drawer section. It encapsulates native `<details>` and `<summary>` elements for keyboard navigation and screen-reader accessibility without manual state management.

It supports nested accordion groups (using the `nested` attribute) to build multi-level menus.

---

## 2. Usage Examples

### HTML
```html
<nav-accordion label="Configurações" expanded>
  <md-list>
    <md-list-item type="button">Backend</md-list-item>
    <md-list-item type="button">Acessibilidade</md-list-item>
  </md-list>
</nav-accordion>
```

### Lit
```js
html`
  <nav-accordion label="Conta">
    <md-list>
      <md-list-item type="button">Minha conta</md-list-item>
    </md-list>
  </nav-accordion>
`
```
