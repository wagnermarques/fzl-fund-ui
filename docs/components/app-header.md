# Component Specification: App Header (`app-header`)

> **Status:** Ready  
> **Category:** Layout Container  
> **Implementations:**
> - Lit: `<app-header>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `app-header` component provides the top navigation bar of the appshell. It contains the menu toggle button (hamburger icon), application title, a slot for domain-specific fast actions, and the `<user-status>` session avatar / login trigger.

Activating the menu icon fires the `menu-toggle` custom event, delegating drawer opening behavior to the parent host.

---

## 2. Usage Examples

### HTML
```html
<app-header heading="Meu Aplicativo"></app-header>
```

### Lit
```js
html`
  <app-header .heading=${'Meu Aplicativo'} @menu-toggle=${this._onMenuToggle}>
    <md-icon-button aria-label="Pesquisar"><md-icon>search</md-icon></md-icon-button>
  </app-header>
`
```
