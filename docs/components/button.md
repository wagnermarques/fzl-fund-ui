# Component Specification: Button (`fzl-*-button`)

> **Status:** Ready  
> **Category:** UI Control  
> **Implementations:**
> - Vanilla ES6: `<fzl-es6-button>` (`@fzl/webcomponents-es6`)
> - Lit: `<fzl-lit-button>` (`@fzl/webcomponents-lit`)
> - Angular Elements: `<fzl-ng-button>` (`@fzl/webcomponents-angular`)

---

## 1. Overview & Purpose

The Button widget provides a standard, accessible, and themeable interactive button across all FZL applications. It supports multiple visual variants (`primary`, `secondary`, `danger`), sizing scales (`sm`, `md`, `lg`), disabled states, and keyboard activation (`Enter` / `Space`).

It encapsulates its internal styling with Shadow DOM and connects to `@fzl/design-tokens` for centralized design consistency while allowing host applications to customize it via CSS custom properties or `::part(button)`.

---

## 2. Usage Examples

### Plain HTML / BPMS
```html
<fzl-lit-button variant="primary" size="md">Submit Form</fzl-lit-button>
<fzl-es6-button variant="secondary">Cancel</fzl-es6-button>
```

### Angular Host Application
```html
<fzl-lit-button [variant]="'primary'" [disabled]="isSubmitting" (fzl-click)="onSubmit($event)">
  Submit
</fzl-lit-button>
```

### React Host Application
```tsx
<fzl-es6-button variant="primary" size="lg" onfzl-click={handleAction}>
  Execute Task
</fzl-es6-button>
```

---

## 3. Synchronized API Reference (Auto-Generated)

> *The section below is automatically synchronized from source code JSDoc & TypeScript declarations via `npm run docs:sync`. Do not edit manually between the `CEM:START` and `CEM:END` markers.*

<!-- CEM:START -->

### `<fzl-es6-button>` — Vanilla ES6 (`@fzl/webcomponents-es6`)

Pure Vanilla ES6 Custom Element button with Shadow DOM encapsulation.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `variant` | `'primary' \| 'secondary' \| 'danger'` | `'primary'` | Visual appearance variant |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size scale of the button |
| `disabled` | `disabled` | `boolean` | `false` | Whether the button is disabled |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Form button behavior |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-click` | `CustomEvent<{ originalEvent: MouseEvent }>` | Dispatched when the button is activated |

#### Slots
| Slot Name | Description |
| :--- | :--- |
| _(default)_ | Content to be displayed inside the button |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `button` | The internal native `<button>` element |

---

### `<fzl-lit-button>` — Lit (`@fzl/webcomponents-lit`)

Reactive Lit-based Custom Element button with Shadow DOM encapsulation.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `variant` | `FzlButtonVariant` | `'primary'` | Visual appearance variant |
| `size` | `size` | `FzlButtonSize` | `'md'` | Size scale of the button |
| `disabled` | `disabled` | `boolean` | `false` | Whether the button is disabled |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Form button behavior |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-click` | `CustomEvent<{ originalEvent: MouseEvent }>` | Dispatched when the button is activated |

#### Slots
| Slot Name | Description |
| :--- | :--- |
| _(default)_ | Content to be displayed inside the button |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `button` | The internal native `<button>` element |

---

### `<fzl-ng-button>` — Angular Elements (`@fzl/webcomponents-angular`)

Angular Elements Custom Element button with Shadow DOM encapsulation.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `variant` | `'primary' \| 'secondary' \| 'danger'` | `'primary'` | Visual appearance variant |
| `size` | `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size scale of the button |
| `disabled` | `disabled` | `boolean` | `false` | Whether the button is disabled |
| `type` | `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Form button behavior |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-click` | `CustomEvent<{ originalEvent: MouseEvent }>` | Dispatched when the button is activated |

#### Slots
| Slot Name | Description |
| :--- | :--- |
| _(default)_ | Content to be displayed inside the button |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `button` | The internal native `<button>` element |

<!-- CEM:END -->
