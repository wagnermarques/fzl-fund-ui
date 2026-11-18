# FzlCloudUploadController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/cloud-upload.controller.ts`  
> **Herda de:** `FzlBaseController`

Orquestra uploads para vários provedores (`rest`, `google-drive`, `s3`, `onedrive`, `custom`) com status e erros reativos. Para um CRUD que também precisa **apagar e atualizar** na nuvem, use o `FzlCrudBaseController` com um adaptador remoto.

## Uso

```ts
const uploader = new FzlCloudUploadController(this, {
  config: { provider: 'google-drive', googleDriveConvertToDocs: true }
});
uploader.bindSocialAuth(socialAuth); // Google -> Drive, Microsoft -> OneDrive
const result = await uploader.uploadFile(file);
```

## API

| Membro | Descrição |
| --- | --- |
| `status`, `isUploading`, `lastResult`, `lastError`, `uploadCount` | Estado reativo do upload. |
| `uploadFile(file, overrideConfig?, overrideContext?)` | Executa o fluxo completo com os hooks. |
| `setConfig(config)` / `setContext(ctx)` / `reset()` | Configuração e estado. |
| `bindSocialAuth(auth, options)` / `unbindSocialAuth()` | Escolhe o provedor e o token a partir do login social. |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `beforeUpload(file, config)` | Valida ou transforma; `false` cancela. |
| `performUpload(file, config, context)` | Transporte (padrão: `uploadToCloudStorage`). |
| `afterUpload(file, result)` | Após sucesso. |
| `onError(file, message, result)` | Após falha. |

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-upload-start` | `{ file, provider }` |
| `fzl-upload-success` | `{ file, result }` |
| `fzl-upload-error` | `{ file, error, result }` |
