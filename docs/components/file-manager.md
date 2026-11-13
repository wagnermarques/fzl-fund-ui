# Gerenciador de Arquivos & Leitura (`fzl-file-manager`)

> Web Component no estilo explorador de arquivos (Filesystem / Explorer) que reúne documentos do usuário, exibindo de forma transparente se cada arquivo é um **favorito local**, se está **no servidor (uploaded)**, se está **sincronizado** ou se está **pendente de envio**, permitindo **retomar a leitura imediatamente** com leitor embutido de DOCX, Markdown, TXT, PDF, JSON e CSV.

---

## 1. Visão Geral & Casos de Uso

Aplicações corporativas e de pesquisa frequentemente lidam com arquivos em múltiplos estados de retenção:
- Arquivos de apoio salvos temporariamente pelo usuário no dispositivo local (`bookmarked-only`).
- Documentos oficiais enviados ao repositório ou GED da instituição (`uploaded-only`).
- Arquivos sincronizados em ambas as pontas (`synced`).
- Rascunhos aguardando conexão ou confirmação de envio (`pending-upload`).

O `<fzl-file-manager>` oferece:
1. **Badges de Status em Cores Contrastantes**:
   - `🔄 Sincronizado`
   - `☁️ No Servidor`
   - `🔖 Favorito Local`
   - `⏳ Pendente Upload`
2. **Navegação Hierárquica em Pastas**:
   - Breadcrumbs clicáveis para alternar entre diretórios (ex: `Raiz (/)`, `/processos/2026`, `/relatorios`).
3. **Modos de Visualização Alternáveis**:
   - **Tabela**: exibição compacta estilo explorador com colunas Nome, Status, Tamanho, Progresso de Leitura e Ações.
   - **Grade**: cartões visuais com tags e barra de progresso.
4. **Retomada de Leitura Instantânea ("Continuar Leitura")**:
   - Abre diretamente o documento no leitor embutido com suporte a `.docx` (títulos, negrito, itálico, tabelas), busca em texto, ajuste de escala de fonte (`A-`/`A+`) e botão para envio ao **Leitor de Estudo (`<fzl-reader-content>`)**.

---

## 2. Exemplo de Uso

```html
<script type="module" src="@fzl/webcomponents-lit/file-manager"></script>

<!-- Uso com dados precarregados para demonstração -->
<fzl-file-manager
  view-mode="table"
  current-folder="/"
  preload-samples
></fzl-file-manager>

<script>
  const fm = document.querySelector('fzl-file-manager');

  // Integração com API REST remota
  fm.fetchHandler = async ({ folder, search }) => {
    const res = await fetch(`/api/user-files?folder=${encodeURIComponent(folder)}&q=${encodeURIComponent(search || '')}`);
    return await res.json();
  };

  fm.addEventListener('fzl-file-read', (e) => {
    console.log('Retomando leitura do arquivo:', e.detail.file.name, e.detail.file.readProgress);
  });
</script>
```
