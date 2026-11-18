# Migrar um app para `FzlUserDataController` + `FzlCrudBaseController`

Guia para apps (ex.: caqdas) que hoje guardam arquivos num IndexedDB "global" e, se o usuário quiser, enviam ao Google Drive.

## Problemas que isso resolve

1. **Um usuário vê os arquivos do anterior.** O IndexedDB pertence ao site, não ao usuário.
2. **Apagar do grid só apaga do IndexedDB.** A cópia no Drive fica órfã.

## Passo a passo

```ts
import {
  FzlUserDataController,
  FzlCrudBaseController,
  FzlIndexedDbCrudAdapter,
  FzlGoogleDriveRemoteAdapter
} from '@fzl/webcomponents-lit/controllers';

// 1. Dados por usuário + política de logout
const userData = new FzlUserDataController(null, {
  appId: 'caqdas',
  logoutPolicy: 'purge',
  confirmPurge: ({ unsynced }) =>
    confirm(`${unsynced} arquivo(s) não foram enviados ao Drive. Apagar mesmo assim?`)
});
userData.bindAuth(socialAuth); // FzlSocialAuthController ou authService do appshell

// 2. CRUD local-first: IndexedDB (por usuário) + Google Drive
const arquivos = new FzlCrudBaseController(host, {
  userData,
  local: new FzlIndexedDbCrudAdapter({ dbName: 'arquivos', userData }),
  remotes: [
    new FzlGoogleDriveRemoteAdapter({ getToken: () => socialAuth.requestCloudAccessToken('google') })
  ],
  confirmDelete: (records) =>
    confirm(
      records.some((r) => r.remotes.length)
        ? 'Isso também removerá o arquivo do Google Drive. Continuar?'
        : 'Remover este arquivo?'
    )
});
arquivos.bindGrid(gridController);

// 3. Operações do grid
await arquivos.create({ name: file.name, file }); // só no navegador
await arquivos.sync(id);                          // botão "Enviar ao Drive"
await arquivos.delete(id);                        // Drive (lixeira) + IndexedDB
```

Outros dados locais também passam a ser por usuário:

```ts
audioCapture.dbName = userData.scopedName('audio');          // <fzl-audio-capture>
new FzlBookmarksController(host, { userData });               // favoritos
```

## Cuidados na migração

- **Dados antigos:** o IndexedDB "global" de hoje não pertence a nenhum escopo. Decida se ele vai para o escopo do primeiro usuário que logar ou se é apagado. Em computador compartilhado, apagar é o mais seguro.
- **Uploads já feitos:** para que `delete()` alcance um arquivo já enviado, o `fileId` do Drive precisa estar em `record.remotes` (`{ provider: 'google-drive', remoteId: fileId, url }`). Ao migrar, copie o id que o app guardava para esse campo.
- **Escopo `drive.file`:** o app só consegue apagar arquivos que ele mesmo criou no Drive. Isso já é o caso dos uploads feitos pelo app.

Referência completa: [`docs/controllers/user-data.md`](../controllers/user-data.md) e [`docs/controllers/crud-base.md`](../controllers/crud-base.md).
