# Seletor, Leitor & Bookmark de Documentos (`fzl-document-picker`)

> Web Component multiplataforma (Mobile e Desktop) para pesquisar e abrir documentos do sistema de arquivos local, lê-los imediatamente offline, organizá-los em Bookmarks com tags ou enviá-los ao backend.

---

## 1. Visão Geral & Casos de Uso

O `<fzl-document-picker>` atende três fluxos complementares em aplicações corporativas, educacionais e de pesquisa:

1. **Abrir para Leitura Imediata (`read`)**:
   - Decodifica arquivos de texto (`.txt`, `.md`, `.csv`, `.json`, `.log`) e exibe estatísticas de palavras/tempo estimado de leitura, controle de fonte (`A-` / `A+`) e busca com realce dentro do texto.
   - **Leitura Nativa de Microsoft Word (`.docx`) sem Dependências Externas**: leitor OOXML embutido (ZIP + `DecompressionStream('deflate-raw')` + `DOMParser` em `word/document.xml`) que preserva títulos, negrito, itálico, sublinhado, listas e tabelas com ajuste fluido para celular e pesquisa interna.
   - Renderiza PDFs e imagens via `ObjectURL` seguro sem precisar fazer upload prévio.
   - Permite enviar parágrafos do documento aberto para o componente `<fzl-reader-content>` através do evento `fzl-document-open-study`.
2. **Salvar nos Bookmarks de Documentos (`bookmark`)**:
   - Persiste referências favoritas e conteúdo textual leve no navegador (`storage-key`) com suporte a tags personalizadas (`#tag`) e filtragem instantânea.
3. **Upload para o Backend (`upload`)**:
   - Valida o tamanho máximo (`max-file-size`), envia via `fetch(endpoint)` (`multipart/form-data`) ou função assíncrona customizada (`uploadHandler`), acompanhando o estado de envio por documento (`idle`, `uploading`, `uploaded`, `error`).

---

## 2. Estratégia Mobile & Desktop

- **Celular (Android / iOS)**: aciona o seletor nativo do sistema operacional (`<input type="file">`), permitindo buscar no armazenamento local, Google Drive ou iCloud Files.
- **Desktop Moderno (Chromium)**: utiliza a *File System Access API* (`showOpenFilePicker`) e disponibiliza o botão **Explorar Pasta Local** (`showDirectoryPicker`) quando `allow-folder-scan` está habilitado.
- **Pasta Inicial Garantida (`start-in` & `enforce-start-in`)**: abre o seletor sempre em uma pasta padrão existente do sistema operacional (`documents`, `downloads`, `desktop`, `pictures`, `music` ou `videos`, padrão `'documents'`), evitando que o navegador tente reabrir discos removíveis desmontados ou caminhos antigos inválidos.
- **Drag & Drop Universal**: aceita arrastar e soltar um ou múltiplos arquivos diretamente sobre o componente.

---

## 3. Integração com Provedores de Nuvem (`storage-provider`)

O componente possui arquitetura aberta e desacoplada para envio de arquivos diretamente a múltiplos provedores de nuvem ou através de backend proxy:

| Provedor | Valor `storage-provider` | Propriedades Principais | Ação após Upload |
| :--- | :--- | :--- | :--- |
| **Google Drive / Google Docs** | `'google-drive'` | `google-drive-folder-id`, `google-drive-convert-to-docs`, `google-auth-token`, `googleTokenProvider` | Converte `.docx` para nativo Google Docs e exibe botão **"Abrir no Google Docs ↗"**. |
| **Amazon S3 / R2 / MinIO** | `'s3'` | `s3-upload-url`, `s3-bucket`, `s3-region`, `s3PresignedUrlProvider` | Upload via Presigned PUT URL com link **"Ver no S3 ↗"**. |
| **Microsoft OneDrive / MS Graph** | `'onedrive'` | `one-drive-folder-id`, `one-drive-drive-id`, `one-drive-auth-token`, `oneDriveTokenProvider` | Envia via Graph API com link **"Abrir no OneDrive ↗"**. |
| **REST Backend Proxy** | `'rest'` (padrão) | `endpoint` | Envia `file` e metadados (`storageProvider`, `googleDriveFolderId`, etc.) via `FormData` para o backend. |
| **Uploader Customizado** | `'custom'` | `customUploader` | Função JS assíncrona com controle total do ciclo de vida. |

### Exemplo com Google Drive e Conversão para Google Docs:
```html
<fzl-document-picker
  storage-provider="google-drive"
  google-drive-folder-id="1fzl_pasta_processos_2026"
  google-drive-convert-to-docs
></fzl-document-picker>

<script>
  const picker = document.querySelector('fzl-document-picker');
  // Fornece token OAuth2 dinâmico gerado pelo Google Identity Services (GIS)
  picker.googleTokenProvider = async () => {
    return await obterGoogleAccessToken();
  };
</script>
```

### Permissões & Escopos OAuth2 (Google Drive & OneDrive — Menor Privilégio)

Para integrar o `<fzl-document-picker>` com o Google Drive sem pedir acesso irrestrito aos arquivos pessoais do usuário, o componente utiliza por padrão o escopo granular **`drive.file`**. Não existe no OAuth2 do Google um escopo que restrinja o acesso pelo caminho de uma pasta específica do usuário, mas o `drive.file` garante isolamento equivalente na prática:

| Escopo / Provedor | O que libera | O app vê ou apaga arquivos antigos do usuário? |
| :--- | :--- | :--- |
| **`https://www.googleapis.com/auth/drive.file`** *(padrão usado aqui)* | Somente arquivos e pastas **criados pelo próprio app** ou **selecionados explicitamente** pelo usuário no Google Picker. | **Não.** Todo o restante do Google Drive pessoal do usuário permanece invisível e inacessível. |
| **`https://www.googleapis.com/auth/drive.appdata`** | Apenas uma pasta oculta exclusiva do aplicativo (`appDataFolder`), fora do Drive normal. | **Não.** Porém os arquivos não ficam visíveis na interface comum do Google Docs/Drive. |
| **`https://www.googleapis.com/auth/drive`** *(não utilizado)* | Leitura, escrita e exclusão em **todo** o Google Drive do usuário (escopo restrito). | **Sim.** Não deve ser solicitado pelo widget por violar o menor privilégio. |
| **Microsoft OneDrive (`Files.ReadWrite` / `Files.ReadWrite.AppFolder`)** | `Files.ReadWrite` grava em pasta informada (`one-drive-folder-id`) ou raiz; `Files.ReadWrite.AppFolder` isola exclusivamente em `Apps/<Nome do App>` (`/special/approot`). | Com `Files.ReadWrite.AppFolder`, **não** (isolamento estrito na pasta do app). |

> **Padrão recomendado:** mantenha o escopo `drive.file` e envie os arquivos para uma pasta criada pelo próprio aplicativo (via `google-drive-folder-id`). Assim, o usuário encontra tudo organizado em uma única pasta no Drive e o aplicativo tecnicamente não tem permissão para ler, alterar ou excluir quaisquer outros documentos pessoais pré-existentes.

---

## 4. Exemplo de Uso Geral

```html
<script type="module" src="@fzl/webcomponents-lit/document-picker"></script>

<fzl-document-picker
  mode="all"
  accept=".txt,.md,.pdf,.csv,.json"
  endpoint="/api/documentos/upload"
  preload-samples
></fzl-document-picker>

<script>
  const picker = document.querySelector('fzl-document-picker');

  picker.addEventListener('fzl-document-read', (e) => {
    console.log('Documento aberto para leitura:', e.detail.document.name);
  });

  picker.addEventListener('fzl-document-bookmark-add', (e) => {
    console.log('Total nos bookmarks:', e.detail.bookmarks.length);
  });

  picker.uploadHandler = async ({ document, file, tags }) => {
    // Integração customizada com backend
    return { ok: true, id: document.id, tags };
  };
</script>
```


## PDF com texto selecionável

Por padrão, PDFs entram só com `objectUrl`. Para extrair o texto (parágrafos com `page`), informe um extrator. O pdf.js fica por conta do app:

```ts
import { extractPdfBlocks } from '@fzl/webcomponents-lit/document-reader';
import * as pdfjs from 'pdfjs-dist';
picker.pdfTextExtractor = (file) => extractPdfBlocks(file, { pdfjs });
```

O item recebe `textContent`, `docxBlocks` (com `page`), `pageCount` e `pdfNeedsOcr`. Falhas disparam `fzl-document-error`. Detalhes em [document-reader.md](./document-reader.md#10-pdf).
