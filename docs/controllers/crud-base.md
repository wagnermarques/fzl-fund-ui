# FzlCrudBaseController

> **Status:** Ready  
> **Arquivos:** `webcomponents-lit/src/controllers/crud-base.controller.ts`, `crud-adapters.ts`  
> **Herda de:** `FzlBaseController`

CRUD *local-first* com persistência em várias fontes. O navegador (IndexedDB) é o primeiro passo ou cache, e a persistência final fica em outro lugar (Google Drive, OneDrive, REST…). O controller mantém as fontes coerentes: **apagar do grid é apagar de todas as fontes de persistência.**

## Arquitetura

```
FzlDataGridController   → estado da tela (ordenação, filtro, seleção)
FzlCrudBaseController   → operações, eventos, confirmação, consistência
Adaptadores             → FzlLocalAdapter  (IndexedDB / memória)
                          FzlRemoteAdapter (Google Drive / OneDrive / o seu)
```

Cada registro guarda onde está persistido e em que estado:

```ts
interface FzlCrudRecord<T> {
  id: string;
  data: T;
  syncState: 'local-only' | 'syncing' | 'synced' | 'dirty' | 'pending-delete' | 'error';
  remotes: { provider: string; remoteId: string; url?: string; syncedAt?: number }[];
  createdAt: number;
  updatedAt: number;
  lastError?: string;
}
```

## Exclusão consistente

A ordem importa:

1. **Lápide:** o registro vira `pending-delete` no armazenamento local e some da lista na hora.
2. **Remotos:** apaga em cada remoto onde o registro está (`remotes`).
3. **Local:** só então apaga o registro local.

Se um remoto falhar (sem rede, token expirado, 403), a lápide **fica** com a referência remota. O próximo `retryPending()` (chamado automaticamente no `load()`) tenta de novo. Assim o arquivo nunca fica órfão no Drive e nunca "ressuscita" no grid.

Apagar o local primeiro, como faria um CRUD ingênuo, perde a única referência ao arquivo remoto quando o remoto falha.

No Google Drive o padrão é mover para a **lixeira** (recuperável por 30 dias). Use `permanentDelete: true` para apagar de vez. Um remoto que responde 404 conta como já apagado.

## Uso (ex.: arquivos do caqdas)

```ts
import {
  FzlCrudBaseController,
  FzlIndexedDbCrudAdapter,
  FzlGoogleDriveRemoteAdapter,
  FzlUserDataController,
  FzlSocialAuthController,
  FzlDataGridController
} from '@fzl/webcomponents-lit/controllers';

const auth = new FzlSocialAuthController(null, { googleClientId: '…' });
const userData = new FzlUserDataController(null, { appId: 'caqdas', confirmPurge: perguntarAoUsuario });
userData.bindAuth(auth);

interface Arquivo { name: string; file: File; tags?: string[] }

const arquivos = new FzlCrudBaseController<Arquivo>(this, {
  userData,                                                  // isolado por usuário
  local: new FzlIndexedDbCrudAdapter({ dbName: 'arquivos', userData }),
  remotes: [
    new FzlGoogleDriveRemoteAdapter({
      getToken: () => auth.requestCloudAccessToken('google'),
      folderId: 'opcional'
    })
  ],
  confirmDelete: (records) =>
    confirm(
      records.some((r) => r.remotes.length)
        ? 'Isso também removerá o arquivo do Google Drive. Continuar?'
        : 'Remover este arquivo?'
    )
});

const grid = new FzlDataGridController(this, { columns: 'name,syncState' });
arquivos.bindGrid(grid);

await arquivos.create({ name: file.name, file });     // só no navegador (local-only)
await arquivos.sync(id);                               // usuário optou por enviar ao Drive
await arquivos.delete(id);                             // Drive (lixeira) + IndexedDB
```

O `FzlIndexedDbCrudAdapter` guarda `Blob`/`File` como `ArrayBuffer` e os reconstrói na leitura. Isso funciona em todos os navegadores.

## API

| Membro | Descrição |
| --- | --- |
| `items` / `rows` | Registros visíveis (sem lápides); `rows` já vem achatado para grids (`{ id, ...data, syncState, remotes, updatedAt }`). |
| `allRecords`, `pendingDeletes` | Inclui as lápides. |
| `unsyncedCount` | Registros que se perderiam numa limpeza (tudo que não é `synced`). |
| `isLoading`, `isLoaded`, `lastError`, `isBusy(id?)` | Estado. |
| `load()` | Lê o local; com `retryPendingOnLoad` (padrão), conclui o que ficou pendente. |
| `create(data, { id?, sync? })` | Grava localmente; envia se `sync`/`autoSync`. |
| `update(id, patch \| fn, { sync? })` | Grava localmente; um registro já sincronizado vira `dirty` (ou é reenviado com `autoSync`). |
| `sync(id, providers?)` | Envia aos remotos: atualiza os que já têm cópia e cria nos outros. |
| `delete(id \| ids, { skipConfirm? })` | Exclusão consistente; devolve `{ deleted, pending, cancelled }`. |
| `retryPending()` | Conclui exclusões pendentes e reenvia registros `dirty`/`error`. |
| `bindGrid(grid)` | Espelha `rows` num `FzlDataGridController` (ou qualquer `{ setItems }`). |
| `addRemote(adapter)` / `removeRemote(provider)` | Remotos dinâmicos. |
| `dispose()` | Libera as inscrições. |

### Opções

| Opção | Padrão | |
| --- | --- | --- |
| `local` | — (obrigatória) | `FzlLocalAdapter` |
| `remotes` | `[]` | `FzlRemoteAdapter[]` |
| `userData` | — | `FzlUserDataController`: recarrega ao trocar de usuário e informa os não sincronizados ao logout. |
| `autoSync` | `false` | `true` = todos os remotos; ou uma lista de provedores. |
| `confirmDelete` | — | Diálogo de confirmação. |
| `autoLoad` | `true` | |
| `retryPendingOnLoad` | `true` | |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `createId(data)` | Gera o id (padrão `crypto.randomUUID()`). |
| `beforeCreate(data)` / `beforeUpdate(current, next)` | Valida ou transforma; `false` cancela. |
| `beforeDelete(records)` | Confirmação (padrão: a opção `confirmDelete`). |
| `deleteRemote(ref, record, adapter)` / `deleteLocal(record)` | Como apagar em cada fonte. |
| `afterDelete(record)` | Após sair de todas as fontes. |
| `onPartialFailure(record, failures)` | Um remoto falhou; o registro continua como lápide. |
| `onSynced(record)` / `onSyncError(record, failures)` | Resultado do envio. |
| `isUnsynced(record)` | O que conta como "não sincronizado". |
| `toRow(record)` | Formato da linha no grid. |

```ts
class ArquivosCaqdas extends FzlCrudBaseController<Arquivo> {
  protected override async beforeCreate(data: Arquivo) {
    if (data.file.size > 50 * 1024 * 1024) throw new Error('Máximo de 50 MB.');
    return data;
  }
  protected override async onPartialFailure(record, failures) {
    toast(`"${record.data.name}" sairá do Drive quando a conexão voltar.`);
  }
}
```

## Adaptadores

```ts
interface FzlLocalAdapter<T> {
  list(); get(id); put(record); delete(id); clear?();
}
interface FzlRemoteAdapter<T> {
  readonly provider: string;
  create(record): Promise<FzlRemoteRef>;
  update?(record, ref): Promise<FzlRemoteRef>;
  delete(ref, record): Promise<void>;   // idempotente: "já não existe" = sucesso
}
```

| Adaptador | |
| --- | --- |
| `FzlIndexedDbCrudAdapter({ dbName, storeName?, userData? })` | Local; isolado por usuário com `userData`. |
| `FzlMemoryCrudAdapter` | Local em memória (testes e protótipos). |
| `FzlGoogleDriveRemoteAdapter({ getToken, getFile?, folderId?, convertToDocs?, permanentDelete? })` | Remoto Google Drive (escopo `drive.file`). |
| `FzlOneDriveRemoteAdapter({ getToken, getFile?, folderId?, driveId? })` | Remoto OneDrive (excluídos vão para a lixeira do OneDrive). |

`getFile(record)` diz onde está o arquivo no registro (padrão: `data.file` ou `data.blob`).

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-crud-loaded` | `{ records }` |
| `fzl-crud-create` / `fzl-crud-update` | `{ record }` (`previous` no update) |
| `fzl-crud-delete` | `{ record }`: saiu de todas as fontes |
| `fzl-crud-delete-pending` | `{ record, failures }`: lápide mantida |
| `fzl-crud-sync` / `fzl-crud-sync-error` | `{ record }` / `{ record, failures }` |
| `fzl-crud-error` | `{ error, operation, id? }` |
