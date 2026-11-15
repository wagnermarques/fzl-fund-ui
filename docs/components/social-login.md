# Login Social com Contas Públicas (`fzl-social-login`)

> Web Component para autenticação client-side com contas públicas do **Google** e da **Microsoft**, com zero dependências externas obrigatórias no backend e conformidade visual com as diretrizes oficiais de identidade de marca.

---

## 1. Visão Geral & Casos de Uso

O `<fzl-social-login>` viabiliza o fluxo de autenticação social em aplicações corporativas, portais institucionais e SPAs (Single Page Applications):

1. **Google Identity Services (GIS)**:
   - Carrega dinamicamente a biblioteca oficial do Google (`https://accounts.google.com/gsi/client`).
   - Apresenta o fluxo moderno de popup ou One Tap do Google.
   - Decodifica no front-end o JWT/ID Token assinado, extraindo nome completo, e-mail verificado, avatar e ID de usuário.
2. **Microsoft Account / Entra ID (OAuth2)**:
   - Realiza autenticação com contas públicas da Microsoft (`@outlook.com`, `@hotmail.com`, `@live.com`) e contas corporativas do Office 365.
   - Utiliza fluxo OAuth2 em popup sem recarregar a aplicação.
3. **Integração com o Appshell (`auth-view` & `authService`)**:
   - O `<auth-view>` do Appshell já traz o `<fzl-social-login>` embutido nas telas de login (`#/conta/entrar`) e cadastro (`#/conta/cadastro`), logando o usuário no `authService` e disparando o evento `auth:login`.

---

## 2. Propriedades & Atributos

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `googleClientId` | `google-client-id` | `string` | `''` | Client ID público do projeto no Google Cloud Console (obrigatório para login Google). |
| `microsoftClientId` | `microsoft-client-id` | `string` | `''` | Client ID público registrado no portal Microsoft Azure (obrigatório para login Microsoft). |
| `microsoftTenantId` | `microsoft-tenant-id` | `string` | `'common'` | Tenant Microsoft (`'common'`, `'consumers'`, `'organizations'` ou GUID). |
| `providers` | `providers` | `'all' \| 'google' \| 'microsoft'` | `'all'` | Provedores habilitados para exibição. |
| `layout` | `layout` | `'buttons' \| 'chips' \| 'compact'` | `'buttons'` | Disposição visual dos botões. |
| `showDivider` | `show-divider` | `boolean` | `true` | Exibe a linha divisória inferior "ou continue com e-mail". |
| `dividerText` | `divider-text` | `string` | `'ou continue com e-mail'` | Texto exibido na divisória. |
| `requestDriveScope` | `request-drive-scope` | `boolean` | `true` | Solicita escopos de leitura/escrita em Google Drive (`drive.file`) e OneDrive (`Files.ReadWrite`). |
| `googleScopes` | `google-scopes` | `string` | `'https://www.googleapis.com/auth/drive.file openid profile email'` | Escopos OAuth2 solicitados ao Google. |
| `microsoftScopes` | `microsoft-scopes` | `string` | `'openid profile email User.Read Files.ReadWrite'` | Escopos OAuth2 solicitados à Microsoft. |
| `disabled` | `disabled` | `boolean` | `false` | Desabilita a interação com os botões. |

---

## 3. Eventos Emitidos

| Evento | Detalhe (`event.detail`) | Descrição |
| :--- | :--- | :--- |
| `fzl-social-login-start` | `{ provider: 'google' \| 'microsoft' }` | Disparado ao iniciar o fluxo de autenticação. |
| `fzl-social-login-success` | `{ provider, user: { id, name, email, avatarUrl }, credential? }` | Disparado ao concluir a autenticação com sucesso. |
| `fzl-social-login-error` | `{ provider, error: string }` | Disparado em caso de cancelamento ou falha. |

---

## 4. Exemplo de Uso

```html
<script type="module" src="@fzl/webcomponents-lit/social-login"></script>

<fzl-social-login
  google-client-id="SEU_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
  microsoft-client-id="SEU_MICROSOFT_CLIENT_ID"
  providers="all"
  divider-text="ou entre com sua senha"
></fzl-social-login>

<script>
  const social = document.querySelector('fzl-social-login');

  social.addEventListener('fzl-social-login-success', (e) => {
    const { provider, user } = e.detail;
    console.log(`Logado via ${provider}:`, user.name, user.email, user.avatarUrl);
  });

  social.addEventListener('fzl-social-login-error', (e) => {
    console.warn('Erro ao autenticar:', e.detail.error);
  });
</script>
```

---

## 5. Uso Plug-and-Play no AppShell (`fzl-fund-appshell--lit`)

Aplicações que usam `fzl-fund-appshell--lit` **não precisam escrever código extra de OAuth2**: basta declarar os Client IDs públicos em `appshell.config.js` ou pelas variáveis de ambiente `.env`:

```js
// appshell.config.js
import { defineAppShellConfig } from 'fzl-fund-appshell--lit/config'

export default defineAppShellConfig({
  title: 'Meu App',
  socialAuth: {
    enabled: true,
    googleClientId: '',
    microsoftClientId: '',
    microsoftTenantId: 'common',
  },
})
```

Ou via variáveis de ambiente no build (`.env` / CI):

```env
VITE_APPSHELL_SOCIAL_AUTH_GOOGLE_CLIENT_ID=seu-id.apps.googleusercontent.com
VITE_APPSHELL_SOCIAL_AUTH_MICROSOFT_CLIENT_ID=seu-client-id-azure
VITE_APPSHELL_SOCIAL_AUTH_MICROSOFT_TENANT_ID=common
```

Quando apenas um dos dois Client IDs é preenchido, o `<auth-view>` exibe automaticamente apenas o botão correspondente. Para ocultar os botões sociais por completo, use `socialAuth: false`. Além disso, `authService.getAccessToken()` entrega automaticamente o token OAuth2 retornado após o login social para backends com `auth: 'bearer'`.
