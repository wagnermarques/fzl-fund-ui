# Leitor de Documentos (`fzl-document-reader` / `fzl-lit-document-reader`)

> Leitor genérico de textos longos (entrevistas, artigos, DOCX convertido). Ocupa todo o espaço disponível com scroll próprio e tem uma barra fina com título, A−/A+, largura de leitura e tela cheia, além de um slot `actions` para botões do app.

**Status:** fase 1 (leitura e tela cheia).  
**Próxima fase:** seleção persistível (`fzl-reader-selection`, `annotations`, `anchorSelection`).

---

## 1. Uso

```ts
import '@fzl/webcomponents-lit/document-reader';
```

```html
<div style="height: 70vh">
  <fzl-document-reader document-title="Entrevista 03" meta="DOCX · 3.200 palavras" compact>
    <md-icon-button slot="actions" aria-label="Codificar"><md-icon>sell</md-icon></md-icon-button>
  </fzl-document-reader>
</div>
```

```ts
const reader = document.querySelector('fzl-document-reader');
reader.text = textoPuro;            // linhas em branco separam parágrafos
// ou, com o FzlDocxReaderController:
reader.blocks = docxReader.blocks;  // FzlDocxBlock[] funciona sem conversão
```

O leitor ocupa `100%` da altura do pai (`--fzl-reader-height`). Dê altura ao contêiner, senão a página inteira rola.

## 2. Propriedades

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `text` | `text` | `string` | `''` | Texto puro. Ignorado quando `blocks` tem itens. |
| `blocks` | — | `FzlReaderBlock[]` | `null` | `{ type: 'heading' \| 'paragraph' \| 'list-item' \| 'table', text, level? }`. |
| `documentTitle` | `document-title` | `string` | `''` | Título na barra. Não se chama `title` para não virar tooltip nativo. |
| `meta` | `meta` | `string` | `''` | Informação secundária ao lado do título (oculta em `compact`). |
| `fontSize` | `font-size` | `number` | `18` | Tamanho do texto em px (12–36, passo 2 no A−/A+). |
| `readingWidth` | `reading-width` | `'narrow' \| 'wide'` | `'narrow'` | Coluna estreita (~72ch) ou larga (~120ch). |
| `compact` | `compact` | `boolean` | `false` | Barra de 36px (normal: 44px). |
| `hideToolbar` | `hide-toolbar` | `boolean` | `false` | Esconde a barra. |
| `fullscreen` | — | `boolean` | — | Getter: em tela cheia. O componente põe o atributo `fullscreen` no host (para CSS). |
| `fullscreenMode` | — | `'native' \| 'immersive' \| null` | — | Getter. O host recebe `fullscreen-mode="native\|immersive"`. |

Getters: `plainText`, `resolvedBlocks`, `blockOffsets`, `scrollElement`, `nativeFullscreenSupported`.

## 3. Métodos

| Método | Descrição |
| --- | --- |
| `toggleFullscreen()` | Entra ou sai da tela cheia. |
| `enterFullscreen()` / `exitFullscreen()` | Controle explícito. |
| `stepFontSize(1 \| -1)` | Igual aos botões A+/A−. |
| `toggleReadingWidth()` | Alterna estreita/larga. |

## 4. Tela cheia

1. Usa a Fullscreen API no próprio elemento (`requestFullscreen`, ou `webkitRequestFullscreen` no Safari/iPad).
2. Sem a API (Safari do iPhone), ou se o navegador recusar (iframe sem `allowfullscreen`), usa o **modo imersivo**: overlay `position: fixed` em `100vw × 100dvh`, com o scroll da página travado. **Esc** sai. Onde existe a Popover API, o overlay vai para a *top layer* do navegador e fica acima do header/rodapé do appshell mesmo dentro de contêineres com `transform` ou `z-index`; sem ela, vale `--fzl-reader-z-index`.
3. Cada mudança dispara `fzl-reader-fullscreen-change` com `{ fullscreen, mode }`.

## 5. Eventos

| Evento | `detail` | Quando |
| --- | --- | --- |
| `fzl-reader-fullscreen-change` | `{ fullscreen: boolean, mode: 'native' \| 'immersive' \| null }` | Entrou/saiu da tela cheia. |
| `fzl-reader-preferences-change` | `{ fontSize, readingWidth }` | O usuário mudou fonte ou largura. Use para lembrar a preferência. |

## 6. Texto canônico e offsets

Todos os offsets do leitor (fase 2: seleção e grifos) se referem ao **texto canônico**:

```
plainText = blocks.map(b => b.text).join('\n\n')   // com \r\n normalizado para \n
```

- Itens de lista não têm o "•" no texto (o marcador é só visual).
- Com `text`, o texto é dividido em parágrafos por linhas em branco e cada parágrafo perde espaços no fim. Por isso, **use `reader.plainText`** (ou `readerPlainText(blocks)`) como referência, não o texto original.
- Helpers exportados: `readerBlocksFromText`, `readerPlainText`, `readerBlockOffsets`, `normalizeReaderBlocks`.

## 7. Personalização

- Slots: `actions` (botões na barra), `empty` (estado vazio).
- Partes: `toolbar`, `title`, `scroller`, `page`.
- Variáveis CSS: `--fzl-reader-height`, `--fzl-reader-font-family`, `--fzl-reader-z-index`.
- Subclasse: sobrescreva `renderBlockText(block, index, offset)` ou `renderBlock(block, index)`. Os nós de texto renderizados devem conter exatamente `block.text`, para os offsets continuarem válidos.
