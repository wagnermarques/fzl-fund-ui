# FzlSocialAuthController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/social-auth.controller.ts`  
> **Herda de:** `FzlBaseController`

Login federado com Google Identity Services e Microsoft Entra (OAuth2), com escopos de Drive e OneDrive. Ligue-o a um `FzlUserDataController` (`userData.bindAuth(auth)`) para que o logout isole ou apague os dados locais do usuário.

## Uso

```ts
const auth = new FzlSocialAuthController(this, { googleClientId: '…' });
await auth.loginWithGoogle();
const token = await auth.requestCloudAccessToken('google'); // drive.file
auth.logout();
```

## API

| Membro | Descrição |
| --- | --- |
| `currentUser`, `isAuthenticated`, `accessToken`, `cloudStorageProvider` | Estado. |
| `loginWithGoogle()` / `loginWithMicrosoft()` / `logout()` | Sessão. |
| `requestCloudAccessToken(provider?)` | Token com escopo de escrita na nuvem. |
| `configure(config)` | Client IDs e escopos. |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `onAuthenticated(result)` | Após login. |
| `onAuthError(provider, message)` | Após falha. |

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-social-login-start` | — |
| `fzl-social-login-success` | — |
| `fzl-social-login-error` | — |
| `fzl-social-logout` | — |
