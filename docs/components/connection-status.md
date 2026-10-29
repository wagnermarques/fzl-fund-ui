# Component Specification: Connection Status (`connection-status`)

> **Status:** Ready  
> **Category:** UI Indicator  
> **Implementations:**
> - Lit: `<connection-status>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `connection-status` widget displays the user's online or offline state, accompanied by a dynamic network icon and an optional connection type indicator (Wi-Fi, 4G, cellular) provided by `networkService`.

When network connectivity drops or returns, the change is automatically announced to screen readers (`WCAG 4.1.3 Status Messages`).

---

## 2. Usage Examples

### HTML
```html
<connection-status></connection-status>
```

### Lit
```js
html`<connection-status></connection-status>`
```
