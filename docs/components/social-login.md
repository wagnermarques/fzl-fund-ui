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
