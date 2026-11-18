# FzlPersonalCloudDocsController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/personal-cloud-docs.controller.ts`  
> **Herda de:** `FzlCloudUploadController`

Envia documentos para a nuvem pessoal do usuário logado: **Google Docs / Drive** para contas Google e **OneDrive** para contas Microsoft. Cuida do login quando necessário.

## Uso

```ts
const docs = new FzlPersonalCloudDocsController(null, {
  convertToGoogleDocs: true,
  authConfig: { googleClientId: '…' }
});
await docs.loginWithGoogle();
const result = await docs.uploadToPersonalCloud(docxFile);
open(result.externalViewerUrl);
```

## API

| Membro | Descrição |
| --- | --- |
| `loginWithGoogle()` / `loginWithMicrosoft()` / `logout()` | Delegam ao `FzlSocialAuthController` interno (ou ao passado em `authController`). |
| `uploadToPersonalCloud(file, options?)` | Envia para a nuvem da conta logada; com `autoLoginProvider`, faz login antes. |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `onUnauthenticatedUpload(file)` | Tentativa de envio sem login (ex.: abrir um modal). |
| `onPersonalDocUploaded(file, result)` | Após o envio. |
| Hooks de `FzlCloudUploadController` | `beforeUpload`, `performUpload`, `afterUpload`, `onError`. |

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-personal-cloud-auth-required` | Envio sem usuário autenticado. |
| `fzl-personal-cloud-uploaded` | Envio concluído. |
