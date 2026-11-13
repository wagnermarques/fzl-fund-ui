# Seletor, Leitor & Bookmark de Documentos (`fzl-document-picker`)

> Web Component multiplataforma (Mobile e Desktop) para pesquisar e abrir documentos do sistema de arquivos local, lê-los imediatamente offline, organizá-los em Bookmarks com tags ou enviá-los ao backend.

---

## 1. Visão Geral & Casos de Uso

O `<fzl-document-picker>` atende três fluxos complementares em aplicações corporativas, educacionais e de pesquisa:

1. **Abrir para Leitura Imediata (`read`)**:
   - Decodifica arquivos de texto (`.txt`, `.md`, `.csv`, `.json`, `.log`) e exibe estatísticas de palavras/tempo estimado de leitura, controle de fonte (`A-` / `A+`) e busca com realce dentro do texto.
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
- **Drag & Drop Universal**: aceita arrastar e soltar um ou múltiplos arquivos diretamente sobre o componente.

---

## 3. Exemplo de Uso

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
