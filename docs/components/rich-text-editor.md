# Rich Text Editor (`<fzl-lit-rich-text-editor>`)

Componente reativo WYSIWYG de edição de texto rico e tabelas para o ecossistema FZL, implementado como Web Component padrão nativo com suporte a Design Tokens e isolamento de Shadow DOM.

## Características Principais

- **Formatação de Texto**: Negrito, itálico, sublinhado, listas ordenadas e não ordenadas, inserção de links e remoção de formatação.
- **Suporte Nativo a Tabelas**: Inserção de tabelas responsivas (com prompt intuitivo de linhas/colunas), adição de linhas abaixo, adição de colunas à direita e remoção de linhas.
- **Sanitização Segura**: Sanitizador interno baseado em DOMParser para prevenir ataques XSS, com suporte a função sanitizadora customizada (ex.: DOMPurify).
- **Sem Dependências Externas**: Ícones em SVG inline puros, sem dependência de fontes externas como Material Symbols.
- **Integração Total com Tokens**: Utiliza as variáveis CSS `--_fzl-*` e variáveis Material Design 3 (`--md-sys-color-*`).

## Instalação & Importação

```javascript
import '@fzl/webcomponents-lit/rich-text-editor';
```

## Exemplo de Uso

```html
<fzl-lit-rich-text-editor
  label="Descrição da Tarefa ou Nota"
  placeholder="Digite os detalhes... use a barra para formatar e criar tabelas"
  value="<p>Texto inicial com <b>negrito</b> e tabela:</p><table><thead><tr><th>Item</th><th>Valor</th></tr></thead><tbody><tr><td>Hospedagem</td><td>R$ 150</td></tr></tbody></table>"
></fzl-lit-rich-text-editor>
```

```javascript
const editor = document.querySelector('fzl-lit-rich-text-editor');
editor.addEventListener('fzl-change', (e) => {
  console.log('HTML sanitizado:', e.detail.value);
});
```

## Propriedades (Attributes / Properties)

| Propriedade | Atributo | Tipo | Padrão | Descrição |
|---|---|---|---|---|
| `value` | `value` | `string` | `''` | Conteúdo HTML do editor. |
| `label` | `label` | `string` | `''` | Rótulo do campo. |
| `placeholder` | `placeholder` | `string` | `'...'` | Texto de instrução quando o editor estiver vazio. |
| `disabled` | `disabled` | `boolean` | `false` | Desabilita o editor e barra de ferramentas. |
| `readOnly` | `read-only` | `boolean` | `false` | Modo somente leitura. |
| `minHeight` | `min-height` | `string` | `'96px'` | Altura mínima da área de edição. |
| `maxHeight` | `max-height` | `string` | `'360px'` | Altura máxima com rolagem vertical. |
| `sanitizer` | - | `function` | `defaultSanitizeHtml` | Função de sanitização customizada. |

## Eventos Disparados

- `fzl-change`: Disparado quando o conteúdo é alterado e confirmado (`{ detail: { value: string } }`).
- `fzl-input`: Disparado a cada digitação na área editável.
- `value-changed`: Disparado com o valor limpo (compatibilidade com forms existentes).
- `fzl-focus` / `fzl-blur`: Eventos de foco e perda de foco.
