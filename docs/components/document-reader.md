# Leitor de Documentos (`fzl-document-reader` / `fzl-lit-document-reader`)

> Leitor genérico de textos longos (entrevistas, artigos, DOCX convertido). Ocupa todo o espaço disponível com scroll próprio e tem uma barra fina com título, A−/A+, largura de leitura e tela cheia, além de um slot `actions` para botões do app.

**Status:** fase 1 (leitura e tela cheia) e fase 2 (seleção persistível e grifos).

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
| `annotations` | — | `FzlReaderAnnotation[]` | `[]` | Grifos `{ id, start, end, color?, title? }` por offsets no texto canônico. |
| `activeAnnotation` | `active-annotation` | `string` | `null` | Grifo destacado com contorno. |
| `pendingRange` | — | `{ start, end } \| null` | `null` | Trecho em edição, desenhado tracejado (veja §8). |
| `contextLength` | `context-length` | `number` | `32` | Caracteres de `prefix`/`suffix` na seleção. |
| `popoverAutofocus` | `popover-autofocus` | `boolean` | `false` | Foca o primeiro campo do slot `selection-popover` quando ele abre. |
| `snapToWords` | `snap-to-words` | `boolean` | `false` | Ao soltar, expande a seleção até palavras inteiras (também a seleção visível). |
| `asideOpen` | `aside-open` | `boolean` | `false` | Painel lateral (slot `aside`) aberto. Refletido. |
| `noSelection` | `no-selection` | `boolean` | `false` | Desliga os eventos de seleção. |
| `fullscreen` | — | `boolean` | — | Getter: em tela cheia. O componente põe o atributo `fullscreen` no host (para CSS). |
| `fullscreenMode` | — | `'native' \| 'immersive' \| null` | — | Getter. O host recebe `fullscreen-mode="native\|immersive"`. |

Getters: `plainText`, `resolvedBlocks`, `blockOffsets`, `selection`, `scrollElement`, `nativeFullscreenSupported`.

## 3. Métodos

| Método | Descrição |
| --- | --- |
| `toggleFullscreen()` | Entra ou sai da tela cheia. |
| `enterFullscreen()` / `exitFullscreen()` | Controle explícito. |
| `stepFontSize(1 \| -1)` | Igual aos botões A+/A−. |
| `toggleReadingWidth()` | Alterna estreita/larga. |
| `focusSelectionPopover()` | Foca o primeiro campo do slot `selection-popover`. |
| `clearSelection()` | Remove a seleção (DOM e estado) e esconde o popover. |
| `scrollToAnnotation(id)` | Rola até o grifo e o faz piscar. Retorna `false` se ele não estiver desenhado. |
| `scrollToOffset(offset)` | Rola até o bloco do offset. |
| `rangeToSelection(range)` | Converte um `Range`/`StaticRange` do leitor em `{ text, start, end, prefix, suffix, ... }`. |
| `blockIndexAt(offset)` | Índice do bloco que contém o offset. |
| `pageAt(offset)` | Página de origem do offset (blocos com `page`). |
| `selectOffsets(start, end)` | Seleciona visivelmente o intervalo. |
| `offsetsToRange(start, end)` | `Range` do DOM para o intervalo. |
| `toggleAside(force?)` | Abre/fecha o painel lateral e emite `fzl-reader-aside-toggle`. |

## 4. Tela cheia

1. Usa a Fullscreen API no próprio elemento (`requestFullscreen`, ou `webkitRequestFullscreen` no Safari/iPad).
2. Sem a API (Safari do iPhone), ou se o navegador recusar (iframe sem `allowfullscreen`), usa o **modo imersivo**: overlay `position: fixed` em `100vw × 100dvh`, com o scroll da página travado. **Esc** sai. Onde existe a Popover API, o overlay vai para a *top layer* do navegador e fica acima do header/rodapé do appshell mesmo dentro de contêineres com `transform` ou `z-index`; sem ela, vale `--fzl-reader-z-index`.
3. Cada mudança dispara `fzl-reader-fullscreen-change` com `{ fullscreen, mode }`.

## 5. Eventos

| Evento | `detail` | Quando |
| --- | --- | --- |
| `fzl-reader-fullscreen-change` | `{ fullscreen: boolean, mode: 'native' \| 'immersive' \| null }` | Entrou/saiu da tela cheia. |
| `fzl-reader-preferences-change` | `{ fontSize, readingWidth }` | O usuário mudou fonte ou largura. Use para lembrar a preferência. |
| `fzl-reader-selection` | `{ text, start, end, prefix, suffix, blockIndex, endBlockIndex, page?, endPage?, rect }` | Texto selecionado no leitor (ao soltar o ponteiro; pelo teclado/toque, após 150 ms). Espaços nas pontas são removidos. |
| `fzl-reader-selection-clear` | — | A seleção sumiu (exceto enquanto o foco está em conteúdo do próprio leitor, ou `pendingRange` cobre a seleção). |
| `fzl-reader-aside-toggle` | `{ open }` | O usuário abriu/fechou o painel lateral. |
| `fzl-reader-annotation-click` | `{ id, ids, annotation }` | Clique num grifo. `id` é o mais específico (menor); `ids`, todos sob o clique. |

## 6. Texto canônico e offsets

Todos os offsets do leitor (seleção e grifos) se referem ao **texto canônico**:

```
plainText = blocks.map(b => b.text).join('\n\n')   // com \r\n normalizado para \n
```

- Itens de lista não têm o "•" no texto (o marcador é só visual).
- Com `text`, o texto é dividido em parágrafos por linhas em branco e cada parágrafo perde espaços no fim. Por isso, **use `reader.plainText`** (ou `readerPlainText(blocks)`) como referência, não o texto original.
- Helpers exportados: `readerBlocksFromText`, `readerPlainText`, `readerBlockOffsets`, `normalizeReaderBlocks`.

## 7. Seleção persistível

O detail de `fzl-reader-selection` segue o modelo W3C Web Annotation: posição (`start`/`end`, *TextPositionSelector*) mais citação (`text`, `prefix`, `suffix`, *TextQuoteSelector*). Guarde os cinco campos.

```ts
reader.addEventListener('fzl-reader-selection', (e) => {
  const { text, start, end, prefix, suffix } = e.detail;
  abrirFormulario(e.detail);                     // ex.: no slot "selection-popover"
  reader.pendingRange = { start, end };          // mantém o trecho visível
});

async function salvar(titulo) {
  const s = reader.selection;
  await trechos.create({ docId, titulo, ...s });  // persistência é do app
  reader.pendingRange = null;
  reader.clearSelection();
}

// Ao abrir o documento (o texto pode ter mudado desde que o trecho foi salvo):
import { anchorSelection } from '@fzl/webcomponents-lit/document-reader';
reader.annotations = trechos
  .map((t) => ({ t, pos: anchorSelection(reader.plainText, t) }))
  .filter(({ pos }) => pos)
  .map(({ t, pos }) => ({ id: t.id, ...pos, color: t.cor, title: t.titulo }));
```

- `anchorSelection(texto, { start, end, text, prefix, suffix })` → `{ start, end } | null`: mantém os offsets se o texto ainda bate; senão procura todas as ocorrências de `text` e escolhe a de melhor contexto (`prefix`/`suffix`) e, no empate, a mais próxima do `start` antigo. `null` quando o trecho não existe mais.
- `buildTextQuote(texto, start, end, contexto = 32)` gera `{ text, prefix, suffix }`.
- A seleção é lida com `Selection.getComposedRanges()` (Safari, Firefox e Chrome atuais), depois `shadowRoot.getSelection()` (Chrome antigo) e, por fim, `document.getSelection()`.
- Os grifos são desenhados a partir dos dados (`<mark>` em volta de pedaços do texto). O texto do documento não muda e os offsets continuam válidos. Grifos sobrepostos ficam mais fortes e o clique devolve o mais específico.

## 8. Popover e trecho pendente

- `fzl-reader-selection` é disparado **depois** da renderização que mostra o popover, então o app pode focar um campo dele no próprio listener. Ou use `popover-autofocus`.
- **Deixe o conteúdo do slot `selection-popover` sempre renderizado** (o leitor o esconde sem seleção). Se o app só criar o formulário ao receber `fzl-reader-selection`, o popover não abre a tempo e `popover-autofocus` não encontra o campo.
- O slot `selection-popover` aparece abaixo da seleção, dentro da área de texto, e rola junto com ela. Fica oculto sem seleção ou sem conteúdo.
- Ao focar um campo do popover (ou do slot `actions`), o navegador tira a seleção visual. O leitor **mantém** `reader.selection` enquanto o foco estiver em conteúdo dele, ou enquanto `pendingRange` cobrir a seleção.
- `pendingRange` desenha o trecho com fundo azul tracejado (`--fzl-reader-pending`), para o pesquisador continuar vendo o que vai salvar. Zere-o ao salvar ou cancelar.

## 9. Páginas, palavras inteiras e painel lateral

- **Páginas:** blocos podem ter `page` (1-based, ex.: PDF). O leitor mostra um marcador discreto "p. N" quando a página muda. O marcador é desenhado só com CSS (`::before`), então não entra no texto nem nos offsets. A seleção traz `page`/`endPage` e `reader.pageAt(offset)` responde a página de qualquer offset.
- **`snap-to-words`:** ao soltar, uma seleção como "uldade de acessar a internet na esc" vira "dificuldade de acessar a internet na escola". Letras, números, acentos e `-`/`'` entre letras contam como palavra. O evento já sai ajustado e a seleção visível é atualizada. Também exportado: `snapRangeToWords(texto, start, end)`.
- **Painel lateral (`aside`):** conteúdo do slot `aside` aparece à direita da área de texto (embaixo quando o leitor tem menos de 640px). Fica visível também em tela cheia. O botão de painel na barra só aparece quando o slot tem conteúdo. Tamanho: `--fzl-reader-aside-width` (320px) e `--fzl-reader-aside-height` (40%).

## 10. PDF

`extractPdfBlocks(fonte, { pdfjs, ... })` lê a camada de texto de um PDF (`File`/`Blob`/`ArrayBuffer`/`Uint8Array`) e devolve blocos prontos para o leitor, cada um com `page`.

```ts
import { extractPdfBlocks } from '@fzl/webcomponents-lit/document-reader';
import * as pdfjs from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'; // Vite: o worker vira um asset do app
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

const { blocks, text, pageCount, needsOcr, title } = await extractPdfBlocks(file, { pdfjs });
if (needsOcr) avisar('PDF escaneado: sem texto selecionável (OCR ainda não suportado).');
reader.blocks = blocks;
```

- **O pdf.js não é dependência deste pacote.** O app instala `pdfjs-dist` e passa o módulo (ou uma função que o carrega sob demanda, ex.: `pdfjs: () => import('pdfjs-dist')`). Assim, quem não usa PDF não carrega ~1 MB.
- Montagem do texto: junta as linhas em parágrafos (pelo espaçamento vertical e pelas frases curtas no fim do parágrafo). Remove a hifenização de fim de linha ("difi-" + "culdade" → "dificuldade", só quando a linha seguinte começa em minúscula). Detecta títulos pelo tamanho da fonte. Remove cabeçalhos e rodapés repetidos (em 3 páginas ou mais) e números de página soltos. Também continua um parágrafo na página seguinte quando a frase não terminou; nesse caso, `page` é a página onde o parágrafo começa.
- Opções: `removeHeadersFooters`, `dehyphenate`, `mergeAcrossPages`, `detectHeadings` (todas `true`), `password`, `maxPages`, `signal` (`AbortSignal`), `onProgress(page, total)`.
- `needsOcr: true` quando o PDF tem menos de ~20 caracteres de texto por página (PDF escaneado). Nesse caso `blocks` vem vazio ou quase vazio.
- `pdfPagesToBlocks(paginas, opções)` é a parte pura (recebe os `items` de `page.getTextContent()`), útil para testes ou para outro extrator.
- No `<fzl-document-picker>`: `picker.pdfTextExtractor = (file) => extractPdfBlocks(file, { pdfjs })` preenche `textContent`, `docxBlocks` (com `page`), `pageCount` e `pdfNeedsOcr` dos PDFs, como já acontece com DOCX.

## 11. Personalização

- Slots: `actions` (botões na barra; a barra quebra linha quando falta espaço, sem esmagar o título), `selection-popover`, `aside`, `empty` (estado vazio).
- Partes: `toolbar`, `title`, `scroller`, `page`, `selection-popover`, `annotation` (e `pending`), `aside`, `page-marker`.
- Variáveis CSS: `--fzl-reader-height`, `--fzl-reader-font-family`, `--fzl-reader-z-index`, `--fzl-reader-highlight`, `--fzl-reader-pending`, `--fzl-reader-aside-width`, `--fzl-reader-aside-height`.
- Subclasse: sobrescreva `renderBlockText(block, index, offset)` (o padrão desenha os grifos) ou `renderBlock(block, index)`. Os nós de texto renderizados devem conter exatamente `block.text`, para os offsets continuarem válidos.
