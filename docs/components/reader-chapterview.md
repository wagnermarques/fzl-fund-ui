# Reader ChapterView (`fzl-reader-chapterview`)

> Componente padronizado de chip / tag / badge para leitores de texto e bíblia, barras de filtros, seleção de capítulos e categorização com acessibilidade total (WCAG 2.1 AA / AAA).

---

## 1. Visão Geral & Casos de Uso

O `<fzl-reader-chapterview>` e seu contêiner `<fzl-reader-chapterview-group>` (também com aliases `<fzl-chip>` e `<fzl-chip-group>`) foram desenvolvidos para prover controles táteis, compactos e acessíveis em formato de pílula.

Principais capacidades:
- **Badge Numérico de Contagem (`count`)**: Exibe quantidades ou contadores de versículos/itens diretamente dentro da pílula.
- **Estado Ativo/Selecionado (`selected`)**: Suporta seleção persistente com contraste elevado e tema dinâmico via tokens (`--fzl-color-primary`).
- **Ação de Remoção (`removable`)**: Botão de fechar (×) acessível com rótulo descritivo (`remove-aria-label`) que dispara o evento `fzl-remove`.
- **Variantes de Estilo (`variant`)**: `'default'`, `'filter'`, `'input'`, `'pill'`.
- **Cores Customizadas (`color`)**: Permite aplicar paletas temáticas ou identificadores cromáticos sem perder a conformidade de contraste.
- **Agrupamento Inteligente (`<fzl-reader-chapterview-group>`)**:
  - Modos de seleção: `'single'`, `'multiple'` ou `'none'` (modo acionador/link).
  - Configuração declarativa via propriedade ou atributo JSON (`items`).
  - Navegação roving tabindex pelas setas direcionais (← / → / ↑ / ↓) e teclas de atalho (Home / End).
  - Quebra flexível de linha (`wrap`).

---

## 2. Cenários e Exemplos Práticos

### A. Seletor de Capítulos (Leitor Bíblico)
Exibe capítulos com número de versículos e seleção ativa sincronizada com o leitor:

```html
<fzl-reader-chapterview-group selection-mode="single" aria-label="Capítulos de Gênesis">
  <fzl-reader-chapterview label="Capítulo 1" value="cap-1" count="31" selected></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Capítulo 2" value="cap-2" count="25"></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Capítulo 3" value="cap-3" count="24"></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Capítulo 4" value="cap-4" count="26"></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Capítulo 5" value="cap-5" count="32"></fzl-reader-chapterview>
</fzl-reader-chapterview-group>
```

### B. Barra de Filtros com Contadores e Limpeza
Filtre coleções de destaques, anotações ou registros com contadores numéricos:

```html
<fzl-reader-chapterview-group selection-mode="single" aria-label="Filtrar por tag">
  <fzl-reader-chapterview label="Todos" value="all" selected></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Doutrina" value="doutrina" count="14"></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Oração" value="oracao" count="8"></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Estudo Bíblico" value="estudo" count="5"></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Sem tag" value="untagged" count="2"></fzl-reader-chapterview>
</fzl-reader-chapterview-group>
```

### C. Editor de Tags com Remoção e Adição Rápida
Tags aplicadas a um item podem ser removidas com um clique ou toque, e novas tags podem ser selecionadas:

```html
<!-- Tags ativas do item -->
<div class="active-tags">
  <fzl-reader-chapterview
    label="Fé"
    selected
    removable
    remove-aria-label="Remover tag Fé"
    @fzl-remove=${(e) => removeTag(e.detail.label)}
  ></fzl-reader-chapterview>
  <fzl-reader-chapterview
    label="Promessas"
    selected
    removable
    remove-aria-label="Remover tag Promessas"
    @fzl-remove=${(e) => removeTag(e.detail.label)}
  ></fzl-reader-chapterview>
</div>

<!-- Sugestões de tags existentes -->
<fzl-reader-chapterview-group selection-mode="none" aria-label="Tags sugeridas">
  <fzl-reader-chapterview label="Família" @fzl-click=${(e) => addTag(e.detail.label)}></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Salvação" @fzl-click=${(e) => addTag(e.detail.label)}></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Gratidão" @fzl-click=${(e) => addTag(e.detail.label)}></fzl-reader-chapterview>
</fzl-reader-chapterview-group>
```

### D. Configuração Declarativa via JSON (`items`)
Carregue listas dinâmicas completas informando a propriedade ou atributo `items`:

```html
<fzl-reader-chapterview-group
  selection-mode="single"
  selected="gen-1"
  items='[
    {"label": "Gênesis 1", "value": "gen-1", "count": 31},
    {"label": "Gênesis 2", "value": "gen-2", "count": 25},
    {"label": "Gênesis 3", "value": "gen-3", "count": 24},
    {"label": "Doutrina", "value": "tag-doutrina", "color": "#1a73e8"},
    {"label": "Oração", "value": "tag-oracao", "color": "#1e8e3e"},
    {"label": "Estudo Bíblico", "value": "tag-estudo", "color": "#6750a4"},
    {"label": "Tag Removível", "value": "tag-temp", "removable": true}
  ]'
></fzl-reader-chapterview-group>
```

---

## 3. Acessibilidade & Navegação por Teclado

O componente cumpre integralmente os critérios WCAG 2.1 AA / AAA:
- **Roving Tabindex**: Dentro de `<fzl-reader-chapterview-group>`, apenas um elemento recebe foco por vez (`tabindex="0"`), enquanto os demais recebem `tabindex="-1"`.
- **Setas Direcionais**: As teclas <kbd>←</kbd> e <kbd>→</kbd> (ou <kbd>↑</kbd> e <kbd>↓</kbd>) movem o foco de forma contínua entre as opções.
- **Teclas de Extremos**: <kbd>Home</kbd> move diretamente para o primeiro chip; <kbd>End</kbd> move para o último chip.
- **Ativação**: <kbd>Enter</kbd> ou <kbd>Espaço</kbd> ativa/alterna a seleção do chip focado.
- **Modo Alto Contraste (WHCM)**: Cores nativas de sistema (`ButtonText`, `HighlightText`, `Highlight`) adaptam-se instantaneamente quando `forced-colors: active` está presente.
- **Leitores de Tela**: Emissão correta de `aria-pressed="true|false"` para estados de toggle, `aria-label` para grupos e `title`/`aria-label` descritivos no botão de remoção.

---

## 4. API Reference Sincronizada (Auto-Generated)

<!-- CEM:START -->

### `<fzl-reader-chapterview>` — Lit (`@fzl/webcomponents-lit`)

Reactive Lit-based Custom Element representing a Chip / Tag / Badge for readers,
filter bars, category pickers, and chapter views.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `label` | `label` | `string` | `''` | Chip text label |
| `value` | `value` | `string` | `''` | Identifier value for events and selection |
| `selected` | `selected` | `boolean` | `false` | Whether the chip is active/selected |
| `count` | `count` | `number \| undefined` | - | Optional count badge to display next to the label |
| `removable` | `removable` | `boolean` | `false` | Whether to show a removal button (×) |
| `disabled` | `disabled` | `boolean` | `false` | Disabled state |
| `variant` | `variant` | `'default' \| 'filter' \| 'input' \| 'pill'` | `'default'` | Style variant |
| `color` | `color` | `string` | `''` | Optional custom background or accent color |
| `remove-aria-label` | `removeAriaLabel` | `string` | `'Remover'` | Accessible label for the remove button |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-click` | `CustomEvent<{ originalEvent: Event; value: string; label: string; selected: boolean }>` | Dispatched when the chip is activated |
| `fzl-remove` | `CustomEvent<{ originalEvent: Event; value: string; label: string }>` | Dispatched when the removal button is clicked |

#### Slots
| Slot Name | Description |
| :--- | :--- |
| _(default)_ | Content to be displayed inside the chip (defaults to `label`) |
| `icon` | Optional leading icon |

#### CSS Shadow Parts (`::part`)
| Part Name | Description |
| :--- | :--- |
| `chip` | The main chip button container |
| `label` | The label text span |
| `count` | The numeric count badge |
| `remove` | The removal button |

---

### `<fzl-reader-chapterview-group>` — Lit (`@fzl/webcomponents-lit`)

Group container for FzlReaderChapterView chips with support for single or
multiple selection, wrapping, and keyboard roving navigation.

#### Attributes & Properties
| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `items` | `FzlChipItem[]` | `[]` | Array of items when configured declaratively |
| `selection-mode` | `selectionMode` | `'single' \| 'multiple' \| 'none'` | `'single'` | Selection behavior |
| `selected` | `selected` | `string \| string[]` | `''` | Selected value (string for single, array for multiple) |
| `wrap` | `wrap` | `boolean` | `true` | Whether chips wrap to multiple lines |
| `aria-label` | `ariaLabel` | `string \| null` | `'Grupo de opções'` | Accessible label for the group |

#### Events
| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-change` | `CustomEvent<{ selected: string \| string[]; item?: FzlChipItem; value: string }>` | Dispatched when selection changes |

#### Slots
| Slot Name | Description |
| :--- | :--- |
| _(default)_ | Child chips or other content |

<!-- CEM:END -->
