# Controllers Reativos & Headless (`@fzl/webcomponents-lit/controllers`)

> **Status:** Ready  
> **Categoria:** Arquitetura Headless / Business Logic Controllers  
> **Subpath Export:** `@fzl/webcomponents-lit/controllers` (também re-exportado por `@fzl/webcomponents-lit`)

---

## 1. Visão Geral

Os **Headless Reactive Controllers** desacoplam regras de negócio reutilizáveis (upload multi-provedor, parsing de `.docx`, persistência de favoritos, estado reativo de grid/store e autenticação social) do template DOM dos Web Components.

Eles implementam o protocolo `FzlReactiveController` (compatível com `ReactiveController` do Lit) e funcionam em **dois modos**:

1. **Acoplado a um `LitElement`** (`new MeuController(this)`): conecta automaticamente ao ciclo de vida (`hostConnected` / `hostDisconnected`), dispara `host.requestUpdate()` e emite eventos via `host.dispatchEvent()`.
2. **Headless / Fora de UI** (`new FzlCloudUploadController(null, ...)`): utilizável em serviços, ViewModels, Node/Vitest ou frameworks externos via `controller.subscribe(() => ...)`.

Além da **composição**, todos os controllers foram desenhados para **extensão por herança (`extends`)** através de hooks `protected` bem definidos.

---

## 2. Catálogo de Controllers Predefinidos

| Controller | Propósito | Hooks Protegidos (`extends`) |
| --- | --- | --- |
| `FzlBaseController` | Classe base com ciclo de vida de host, `subscribe()` e `emitHostEvent()` | `notifyChange()`, `emitHostEvent()`, `hostConnected()`, `hostUpdated()`, `hostDisconnected()` |
| `FzlCloudUploadController` | Orquestra uploads multi-provedor (`rest`, `google-drive`, `s3`, `onedrive`, `custom`) com status e erros reativos | `beforeUpload()`, `performUpload()`, `afterUpload()`, `onError()` |
| `FzlDocxReaderController` | Leitura `.docx` OOXML e texto com filtro em blocos, zoom tipográfico e `toStudyVerses()` | `parseDocx()`, `transformBlocks()`, `onDocumentOpened()` |
| `FzlBookmarksController` | Favoritos com persistência em `Storage`, tags, notas e sincronização cross-tab (`storage` event) | `validateTag()`, `serializeBookmark()`, `getStorage()` |
| `FzlDataGridController<T>` | Vinculação reativa a `FzlStore` (`store.observe()`), ordenação, filtro, paginação, seleção e CSV | `filterItems()`, `sortItems()`, `getRowId()` |
| `FzlSocialAuthController` | Fluxo OAuth2 / GIS (Google & Microsoft) com fallback demo e `logout()` | `onAuthenticated()`, `createDemoResult()`, `onAuthError()` |

---

## 3. Exemplos de Uso

### Composição em `LitElement` Customizado

```ts
import { LitElement, html } from 'lit';
import {
  FzlCloudUploadController,
  FzlDocxReaderController
} from '@fzl/webcomponents-lit/controllers';

export class MeuPainelDocumentos extends LitElement {
  private readonly uploader = new FzlCloudUploadController(this, {
    config: { provider: 's3', s3Bucket: 'meus-fundos' }
  });

  private readonly reader = new FzlDocxReaderController(this, { fontSize: 16 });

  override render() {
    return html`
      <p>Status do upload: ${this.uploader.status}</p>
      <p>Documento aberto: ${this.reader.document?.name ?? 'Nenhum'}</p>
    `;
  }
}
```

### Modo Headless (Sem DOM)

```ts
import { FzlDataGridController } from '@fzl/webcomponents-lit/controllers';
import { FzlMemoryStore } from '@fzl/core';

const store = new FzlMemoryStore({
  data: [
    { id: 1, nome: 'FIDC Alpha', pl: 1200000 },
    { id: 2, nome: 'FIM Beta', pl: 850000 }
  ]
});

const gridCtrl = new FzlDataGridController(null, { store, pageSize: 10 });
const unsubscribe = gridCtrl.subscribe(() => {
  console.log('Linhas atualizadas:', gridCtrl.pagedItems);
});

store.add({ id: 3, nome: 'FIP Gamma', pl: 3100000 });
unsubscribe();
```

### Extensibilidade via Herança (`extends`)

```ts
import {
  FzlCloudUploadController,
  type FzlCloudStorageConfig,
  type FzlUploadResult
} from '@fzl/webcomponents-lit/controllers';

export class FundAuditUploadController extends FzlCloudUploadController {
  protected override async beforeUpload(file: File, _config: FzlCloudStorageConfig) {
    if (file.name.endsWith('.exe')) {
      return false; // bloqueia o envio antes da rede
    }
    return file;
  }

  protected override async performUpload(
    file: File,
    config: FzlCloudStorageConfig,
    context: Record<string, unknown>
  ): Promise<FzlUploadResult> {
    return super.performUpload(file, config, {
      ...context,
      auditTimestamp: new Date().toISOString()
    });
  }
}
```

---

## 4. Integração nos Web Components Nativos

Os Web Components abaixo expõem instâncias públicas desses controllers para acesso programático e extensibilidade direta:

- `<fzl-social-login>`: `element.authController` (`FzlSocialAuthController`)
- `<fzl-document-picker>`: `element.uploadController` (`FzlCloudUploadController`) e `element.readerController` (`FzlDocxReaderController`)
- `<fzl-file-manager>`: `element.uploadController` (`FzlCloudUploadController`) e `element.readerController` (`FzlDocxReaderController`)
