# Component Specification: Crumb (`fzl-*-crumb`)

> **Status:** Ready  
> **Category:** Navigation Control  
> **Implementations:**
> - Vanilla ES6: `<fzl-es6-crumb>` (`@fzl/webcomponents-es6`)
> - Lit: `<fzl-lit-crumb>` (`@fzl/webcomponents-lit`)
> - Angular Elements: `<fzl-ng-crumb>` (`@fzl/webcomponents-angular`)

---

## 1. Overview & Purpose

The Crumb (Breadcrumb & Back Navigation) widget displays the user's current location path within the application navigation hierarchy (WCAG 2.4.8 Location) and provides a dedicated **Back** button to return to the previous view.

It supports structured breadcrumb items (`items` array or JSON attribute) as well as a convenient `path` shorthand string (e.g., `"Início / Config / Backend"`), customizable visual separators, and keyboard-accessible navigation events (`fzl-back` and `fzl-navigate`).

---

## 2. Usage Examples

### Plain HTML / BPMS
```html
<fzl-lit-crumb path="Início / Config / Backend" back-label="Voltar"></fzl-lit-crumb>
<fzl-es6-crumb items='[{"label":"Início","href":"#/"},{"label":"Conta"},{"label":"Minha conta"}]'></fzl-es6-crumb>
```

### Lit / Appshell Host Application
```js
html`
  <fzl-lit-crumb
    .items=${[
      { label: 'Início', href: '#/' },
      { label: 'Config' },
      { label: 'Backend' },
    ]}
    ?back-disabled=${!this._canGoBack()}
    @fzl-back=${this._handleBack}
  ></fzl-lit-crumb>
`
```

### Angular Host Application
```html
<fzl-ng-crumb
  [items]="crumbItems"
  [showBack]="true"
  back-label="Voltar"
  (fzl-back)="onBack($event)"
  (fzl-navigate)="onNavigate($event)"
></fzl-ng-crumb>
```

---

## 3. Synchronized API Reference (Auto-Generated)

> *The section below is automatically synchronized from source code JSDoc & TypeScript declarations via `npm run docs:sync`. Do not edit manually between the `CEM:START` and `CEM:END` markers.*

<!-- CEM:START -->

### `<fzl-es6-crumb>` — Vanilla ES6 (`@fzl/webcomponents-es6`)

Pure Vanilla ES6 Breadcrumb ("Crumb") Custom Element showing current navigation path
and providing back navigation to the previous view.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `items` | `string` | `'[]'` | Breadcrumb items JSON string or delimited string |
| `path` | `path` | `string` | `''` | Path string shorthand (e.g. "Início / Config / Backend") |
| `separator` | `separator` | `string` | `'›'` | Visual separator between breadcrumb items |
| `show-back` | `show-back` | `boolean` | `true` | Whether to display the back button |
| `back-disabled` | `back-disabled` | `boolean` | `false` | Whether the back button is disabled |
| `back-label` | `back-label` | `string` | `'Voltar'` | Label for the back navigation button |
| `back-href` | `back-href` | `string` | `''` | Optional explicit target URL/hash for the back button |
| `aria-label` | `aria-label` | `string` | `'Navegação estrutural'` | Accessible label for the `<nav>` landmark |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-back` | `CustomEvent<{ backHref: string; originalEvent: MouseEvent }>` | Dispatched when the back button is activated |
| `fzl-navigate` | `CustomEvent<{ item: FzlCrumbItem; index: number; href?: string; originalEvent: MouseEvent }>` | Dispatched when a breadcrumb link item is clicked |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `nav` | The outer `<nav>` landmark element |
| `back-button` | The back navigation `<button>` element |
| `list` | The `<ol>` breadcrumb trail list |
| `item` | Each `<li>` breadcrumb item |
| `link` | Interactive `<a>` link for ancestor items |
| `separator` | Visual separator `<span>` between items |
| `current` | The `<span aria-current="page">` active view label |

---

### `<fzl-lit-crumb>` — Lit (`@fzl/webcomponents-lit`)

Reactive Lit-based Breadcrumb ("Crumb") Custom Element showing current navigation path
and providing back navigation to the previous view.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `items` | `FzlCrumbItem[]` | `[]` | Breadcrumb items array or JSON/delimited string |
| `path` | `path` | `string` | `''` | Path string shorthand (e.g. "Início / Config / Backend") |
| `separator` | `separator` | `string` | `'›'` | Visual separator between breadcrumb items |
| `show-back` | `showBack` | `boolean` | `true` | Whether to display the back button |
| `back-disabled` | `backDisabled` | `boolean` | `false` | Whether the back button is disabled |
| `back-label` | `backLabel` | `string` | `'Voltar'` | Label for the back navigation button |
| `back-href` | `backHref` | `string` | `''` | Optional explicit target URL/hash for the back button |
| `aria-label` | `ariaLabel` | `string` | `'Navegação estrutural'` | Accessible label for the `<nav>` landmark |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-back` | `CustomEvent<{ backHref: string; originalEvent: MouseEvent }>` | Dispatched when the back button is activated |
| `fzl-navigate` | `CustomEvent<{ item: FzlCrumbItem; index: number; href?: string; originalEvent: MouseEvent }>` | Dispatched when a breadcrumb link item is clicked |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `nav` | The outer `<nav>` landmark element |
| `back-button` | The back navigation `<button>` element |
| `list` | The `<ol>` breadcrumb trail list |
| `item` | Each `<li>` breadcrumb item |
| `link` | Interactive `<a>` link for ancestor items |
| `separator` | Visual separator `<span>` between items |
| `current` | The `<span aria-current="page">` active view label |

---

### `<fzl-ng-crumb>` — Angular Elements (`@fzl/webcomponents-angular`)

Angular Elements Breadcrumb ("Crumb") Custom Element showing current navigation path
and providing back navigation to the previous view.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `items` | `string` | `'[]'` | Breadcrumb items array or JSON/delimited string |
| `path` | `path` | `string` | `''` | Path string shorthand (e.g. "Início / Config / Backend") |
| `separator` | `separator` | `string` | `'›'` | Visual separator between breadcrumb items |
| `show-back` | `show-back` | `boolean` | `true` | Whether to display the back button |
| `back-disabled` | `back-disabled` | `boolean` | `false` | Whether the back button is disabled |
| `back-label` | `back-label` | `string` | `'Voltar'` | Label for the back navigation button |
| `back-href` | `back-href` | `string` | `''` | Optional explicit target URL/hash for the back button |
| `aria-label` | `aria-label` | `string` | `'Navegação estrutural'` | Accessible label for the `<nav>` landmark |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-back` | `CustomEvent<{ backHref: string; originalEvent: MouseEvent }>` | Dispatched when the back button is activated |
| `fzl-navigate` | `CustomEvent<{ item: FzlCrumbItem; index: number; href?: string; originalEvent: MouseEvent }>` | Dispatched when a breadcrumb link item is clicked |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `nav` | The outer `<nav>` landmark element |
| `back-button` | The back navigation `<button>` element |
| `list` | The `<ol>` breadcrumb trail list |
| `item` | Each `<li>` breadcrumb item |
| `link` | Interactive `<a>` link for ancestor items |
| `separator` | Visual separator `<span>` between items |
| `current` | The `<span aria-current="page">` active view label |

<!-- CEM:END -->
