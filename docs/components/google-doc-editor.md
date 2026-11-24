# Editor e Visualizador de Google Docs (`<fzl-google-doc-editor>`)

> Web Component oficial do ecossistema FZL para vincular, gerenciar, visualizar e abrir documentos do **Google Docs** diretamente com suporte a edição externa, cópia de link, validação de URL e injeção de conteúdo (ex.: anotações e versículos bíblicos).

---

## 1. Visão Geral & Casos de Uso

O `<fzl-google-doc-editor>` (também registrado como `<fzl-lit-google-doc-editor>`) resolve o fluxo de edição de documentos na nuvem do Google de maneira desacoplada:

1. **Abertura Oficial Segura**: Como o Google Docs bloqueia edição completa dentro de `<iframe>` por segurança (`X-Frame-Options` / CSP `frame-ancestors`), o componente oferece o botão primário estilizado **"Editar no Google Docs ↗"** que abre a URL oficial do documento em nova aba ou popup com foco garantido.
2. **Extração Automática de ID**: Aceita URLs completas (ex.: `https://docs.google.com/document/d/1pbBa5e81DOuULro1MUQI7H5V2QLqTfegA_JASPnvJ94/edit?tab=t.0`), URLs parciais ou apenas o ID do documento.
3. **Modos Visuais**:
   - `mode="card"` (padrão): card com ícone oficial, título, ID truncado em badge, link clicável e botões de ação ("Editar", "Copiar Link", "Alterar", "Desvincular").
   - `mode="compact"`: pílula/chip compacto para cabeçalhos, barras de ferramentas e listas.
   - `mode="embedded"`: inclui painel colapsável de prévia (`/preview`) integrada.
4. **Vinculação Interativa**: Quando vazio, exibe formulário amigável para colar ou digitar o link do Google Docs.
5. **Injeção de Conteúdo (`appendContent`)**: Permite que o app hospedeiro (como o leitor bíblico ou sistema de processos) envie textos ou versículos selecionados para serem inseridos no documento.

---

## 2. Exemplos de Uso

### Uso Básico via HTML

```html
<script type="module" src="@fzl/webcomponents-lit/google-doc-editor"></script>

<fzl-google-doc-editor
  doc-url="https://docs.google.com/document/d/1pbBa5e81DOuULro1MUQI7H5V2QLqTfegA_JASPnvJ94/edit?tab=t.0"
  title="Esboço de Pregação - Salmos 23"
  description="Anotações e esboço para o sermão da noite."
></fzl-google-doc-editor>
```

### Modo Compacto (Pílula em Cabeçalho)

```html
<fzl-google-doc-editor
  mode="compact"
  doc-url="https://docs.google.com/document/d/1pbBa5e81DOuULro1MUQI7H5V2QLqTfegA_JASPnvJ94/edit"
  title="Abrir Esboço no Docs"
></fzl-google-doc-editor>
```

### Uso com Lit e Tratamento de Eventos

```ts
import { LitElement, html } from 'lit';
import '@fzl/webcomponents-lit/google-doc-editor';
import type { FzlDocChangeDetail, FzlDocOpenDetail } from '@fzl/webcomponents-lit/google-doc-editor';

export class MeuSermonEditor extends LitElement {
  private sermonDocUrl = 'https://docs.google.com/document/d/1pbBa5e81DOuULro1MUQI7H5V2QLqTfegA_JASPnvJ94/edit';

  private handleDocChange(e: CustomEvent<FzlDocChangeDetail>) {
    console.log('Novo documento vinculado:', e.detail.docId);
    this.sermonDocUrl = e.detail.docUrl;
  }

  override render() {
    return html`
      <fzl-google-doc-editor
        .docUrl=${this.sermonDocUrl}
        title="Esboço do Culto"
        @fzl-doc-change=${this.handleDocChange}
      ></fzl-google-doc-editor>
    `;
  }
}
```

---

## 3. Propriedades & Atributos

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| --- | --- | --- | --- | --- |
| `docUrl` | `doc-url` | `string` | `''` | URL completa ou parcial do Google Docs. |
| `docId` | `doc-id` | `string` | `''` | ID do documento (extraído automaticamente de `docUrl` se omitido). |
| `title` | `title` | `string` | `''` | Título ou rótulo do documento para exibição. |
| `description` | `description` | `string` | `''` | Descrição ou resumo complementar do documento. |
| `mode` | `mode` | `'card' \| 'compact' \| 'embedded'` | `'card'` | Modo visual de renderização. |
| `allowUrlEdit` | `allow-url-edit` | `boolean` | `true` | Habilita a edição, inclusão ou exclusão do link pelo usuário. |
| `readonly` | `readonly` | `boolean` | `false` | Se `true`, desabilita botões de alteração de link. |
| `placeholder` | `placeholder` | `string` | `'Cole o link...'` | Texto de orientação do campo de entrada. |
| `authToken` | `auth-token` | `string` | `''` | Token OAuth2 opcional para requisições diretas via API. |
| `showPreview` | `show-preview` | `boolean` | `false` | Exibe o iframe de pré-visualização no card. |

---

## 4. Métodos Públicos

- `openInGoogleDocs(target?: string): Window | null` — Abre o Google Docs na URL oficial em nova aba/janela.
- `copyDocUrl(): Promise<boolean>` — Copia o link formatado para a área de transferência do usuário.
- `setDocUrl(url: string): boolean` — Valida e atualiza a URL do documento, emitindo `fzl-doc-change`.
- `clearDocUrl(): void` — Desvincula o documento atual e emite `fzl-doc-change`.
- `appendContent(text: string, title?: string): Promise<boolean>` — Envia texto ou versículos para inserção no documento.

---

## 5. Eventos Customizados

- `@fzl-doc-open` — Disparado ao acionar a abertura do documento (`{ docId, docUrl, target }`).
- `@fzl-doc-change` — Disparado quando a URL é definida, alterada ou removida (`{ docId, docUrl, previousDocId }`).
- `@fzl-doc-copy` — Disparado ao copiar a URL com sucesso (`{ docId, docUrl }`).
- `@fzl-doc-append` — Disparado ao solicitar inclusão de conteúdo (`{ docId, docUrl, text, title }`).
