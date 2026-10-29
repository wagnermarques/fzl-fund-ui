# Component Specification: App Clock (`app-clock`)

> **Status:** Ready  
> **Category:** UI Indicator  
> **Implementations:**
> - Lit: `<app-clock>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `app-clock` component renders the current day of the week, calendar date, and real-time clock formatted in `pt-BR` with tabular numbers (`tabular-nums`), refreshing automatically every second.

It is typically hosted inside the application footer to provide operational time reference for users working on business processes and audits.

---

## 2. Usage Examples

### HTML
```html
<app-clock></app-clock>
```

### Lit
```js
html`<app-clock></app-clock>`
```
