# Consuming `<fzl-*>` Widgets in Host Applications

Because all widgets in `webcomponents-es6`, `webcomponents-lit`, and `webcomponents-angular` compile down to standard **W3C Custom Elements**, they can be used in any web application or framework.

---

## 1. Plain HTML / Legacy BPMS Pages

Import the design tokens stylesheet and the component bundle as an ES module:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <link rel="stylesheet" href="/path/to/@fzl/design-tokens/dist/tokens.css" />
  <script type="module" src="/path/to/@fzl/webcomponents-lit/dist/fzl-lit-widgets.js"></script>
</head>
<body>
  <fzl-lit-button variant="primary" size="md">Approve Request</fzl-lit-button>

  <script>
    const btn = document.querySelector('fzl-lit-button');
    btn.addEventListener('fzl-click', (event) => {
      console.log('Clicked:', event.detail);
    });
  </script>
</body>
</html>
```

---

## 2. Angular Host Applications

1. Add `CUSTOM_ELEMENTS_SCHEMA` to your standalone component or `@NgModule`:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import '@fzl/webcomponents-lit';

@Component({
  selector: 'app-fund-approval',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <fzl-lit-button
      [variant]="'primary'"
      [disabled]="isSubmitting"
      (fzl-click)="onApprove($event)">
      Confirm Approval
    </fzl-lit-button>
  `
})
export class FundApprovalComponent {
  isSubmitting = false;

  onApprove(event: Event) {
    const customEvent = event as CustomEvent;
    console.log('Approved:', customEvent.detail);
  }
}
```

---

## 3. React Host Applications (React 18 & React 19+)

- **React 19+** has full built-in support for Custom Elements, properties, and custom events (`onfzl-click` / `onFzlClick`).
- **React 18** binds primitive attributes directly and listens to custom events via `ref` or thin wrapper hooks:

```tsx
import '@fzl/webcomponents-es6';

export function ActionToolbar() {
  return (
    <fzl-es6-button variant="primary" size="md">
      Save Form
    </fzl-es6-button>
  );
}
```

---

## 4. Customizing Theme Tokens in Any Host App

Override `--fzl-*` CSS variables globally in your application's root stylesheet:

```css
:root {
  --fzl-color-primary: #0f62fe;
  --fzl-color-primary-hover: #0353e9;
  --fzl-radius-md: 6px;
  --fzl-font-family: 'Inter', system-ui, sans-serif;
}
```
