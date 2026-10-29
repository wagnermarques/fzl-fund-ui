# Component Specification: Consent Banner (`consent-banner`)

> **Status:** Ready  
> **Category:** Privacy & Compliance  
> **Implementations:**
> - Lit: `<consent-banner>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `consent-banner` component provides LGPD and GDPR compliant user consent management for telemetry (Google Analytics 4 / Consent Mode v2).

It is positioned in-flow above the application footer, giving equal visual prominence to "Recusar" and "Aceitar" choices. User choices are persisted and broadcast via `consentService`.

---

## 2. Usage Examples

### HTML
```html
<consent-banner privacyUrl="#/config/privacidade"></consent-banner>
```

### Lit
```js
html`<consent-banner .privacyUrl=${'#/config/privacidade'}></consent-banner>`
```
