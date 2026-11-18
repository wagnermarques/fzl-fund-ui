# FzlDocxReaderController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/docx-reader.controller.ts`  
> **Herda de:** `FzlBaseController`

Leitura estruturada de `.docx` (OOXML nativo, sem dependências) e de documentos de texto, com busca em blocos, zoom tipográfico e conversão para versículos de estudo.

## Uso

```ts
const reader = new FzlDocxReaderController(this, { fontSize: 16 });
await reader.openFile(file);
reader.setSearchQuery('cláusula');
const blocos = reader.getFilteredBlocks();
```

## API

| Membro | Descrição |
| --- | --- |
| `openFile(file)` / `openDocument(doc)` / `close()` | Abre e fecha documentos. |
| `setSearchQuery(q)` / `getFilteredBlocks()` | Filtra os blocos. |
| `setFontSize(px)` / `zoomIn()` / `zoomOut()` / `resetZoom()` | Zoom tipográfico. |
| `toStudyVerses()` | Converte os blocos em versículos de estudo. |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `parseDocx(file)` | Parser do OOXML. |
| `transformBlocks(blocks)` | Pós-processa os blocos. |
| `onDocumentOpened(doc)` | Após abrir. |

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-reader-open` | — |
| `fzl-reader-close` | — |
| `fzl-reader-error` | — |
