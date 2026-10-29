# Component Specification: User Status & Notifications (`user-status`)

> **Status:** Ready  
> **Category:** Account & Notifications  
> **Implementations:**
> - Lit: `<user-status>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The `user-status` widget renders an "Entrar" button when no user session is present, or a user avatar with initials and account popover menu when logged in, alongside the `<user-notifications>` notification bell with unread badge counter.

---

## 2. Usage Examples

### HTML
```html
<user-status></user-status>
```

### Lit
```js
html`<user-status></user-status>`
```
