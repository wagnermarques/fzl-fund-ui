# Component Specification: Web Push Component (`<fzl-web-push>` / `<web-push-component>`)

> **Status:** Ready  
> **Category:** Push Notifications & Messaging  
> **Implementations:**
> - Lit Custom Element: `<fzl-web-push>` / `<web-push-component>` (`fzl-fund-appshell--lit`)

---

## 1. Overview & Purpose

The **Web Push Component** (`<fzl-web-push>`, aliased as `<web-push-component>`) provides a robust, drop-in integration layer for Progressive Web App (PWA) Web Push notifications in applications built with the `fzlbpms-funds` AppShell and micro-frontend consumers.

### Key Capabilities
1. **Headless by default with Conditional Rendering**:
   - The component produces no visual layout or footprint when idle, allowing it to be safely embedded anywhere in the host application or AppShell template.
   - Based on internal logic, state, and user actions, it conditionally renders accessible, responsive UI elements:
     - **Permission Prompt Banner**: Displayed when `auto-prompt` is active and permission is `'default'`, politely asking the user to allow notifications without aggressively blocking their workflow.
     - **Blocked Notification Warning**: Displayed when the browser blocks notifications (`'denied'`), offering clear instructions on how to enable them.
     - **Incoming Push Notification Toast/Card**: Renders incoming push payloads (or simulated pushes) with title, body, icon, action buttons, and dismiss controls.
     - **Status Badge / Diagnostic Card**: When configured with `display-mode="badge"` or `display-mode="card"`, provides real-time status indicators.
2. **Comprehensive Parameters Configuration**:
   - Allows configuration of the public VAPID key (`vapid-key`), backend registration endpoint (`endpoint-url`), auto-prompting policy (`auto-prompt`), and topic subscriptions (`topics`).
3. **Simulated Diagnostics**:
   - Built-in simulation method (`simulatePush()`) enables testing push notification workflows, UI cards, and event dispatching in development or offline environments without an active backend server.
4. **WCAG 2.1 Accessibility & Design System Compliance**:
   - Follows Material 3 styling and design tokens.
   - Screen reader announcements via `role="status"` and `role="alert"`.

---

## 2. Usage Examples

### 2.1 Basic Headless Integration
```html
<fzl-web-push
  vapid-key="BEl62iUYgUivxIkv69yViEuiBIa..."
  endpoint-url="/api/push/subscribe"
  auto-prompt
></fzl-web-push>
```

### 2.2 In Lit AppShell or Custom Views
```js
import '@fzl/fund-appshell/webcomponents/web-push.js'
import { html } from 'lit'

function renderPush() {
  return html`
    <fzl-web-push
      vapid-key=${vapidKey}
      endpoint-url=${backendUrl}
      topics="alertas,sistema"
      @fzl-push-subscribed=${(e) => console.log('Subscribed:', e.detail.subscription)}
      @fzl-push-received=${(e) => console.log('Push received:', e.detail)}
      @fzl-push-error=${(e) => console.error('Push error:', e.detail.message)}
    ></fzl-web-push>
  `
}
```

### 2.3 Status Badge Mode
```html
<fzl-web-push display-mode="badge"></fzl-web-push>
```

### 2.4 Programmatic Control & Mock Testing
```js
const pushEl = document.querySelector('fzl-web-push')

// Subscribe programmatically on user gesture
await pushEl.subscribe()

// Dispatch mock push notification for testing
pushEl.simulatePush({
  title: 'Novo Processo BPMS',
  body: 'A tarefa #4892 foi atribuída à sua fila de trabalho.',
  url: '#/pedidos/4892',
})
```

---

## 3. API Reference

### Attributes & Properties

| Attribute | Property | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `vapid-key` | `vapidKey` | `string` | `''` | Chave pública VAPID (base64url) do servidor push. |
| `endpoint-url` | `endpointUrl` | `string` | `''` | URL do endpoint no backend para registrar/remover a inscrição. |
| `auto-prompt` | `autoPrompt` | `boolean` | `false` | Se verdadeiro, exibe automaticamente o banner de permissão quando o status for `default`. |
| `topics` | `topics` | `string` | `''` | Tópicos de notificação separados por vírgula (ex: `'alertas,atualizacoes'`). |
| `display-mode` | `displayMode` | `string` | `'none'` | Modo de exibição: `'none'` (headless), `'banner'`, `'badge'`, `'card'`. |
| `status` | `status` | `string` (readonly) | `'unconfigured'` | Estado atual do push: `'unsupported'`, `'unconfigured'`, `'default'`, `'granted'`, `'denied'`, `'subscribed'`, `'error'`. |
| `subscribed` | `subscribed` | `boolean` (readonly) | `false` | Indica se o navegador possui inscrição Web Push ativa. |

### Public Methods

| Method | Parameters | Returns | Description |
| :--- | :--- | :--- | :--- |
| `subscribe()` | `none` | `Promise<PushSubscription>` | Solicita permissão ao usuário (se necessário) e cria a inscrição no navegador e backend. |
| `unsubscribe()` | `none` | `Promise<void>` | Cancela a inscrição local e avisa o backend. |
| `prompt()` | `none` | `void` | Abre manualmente o banner de solicitação de permissão. |
| `simulatePush(payload)` | `payload: { title, body, url?, data?, icon? }` | `void` | Simula o recebimento de uma notificação push para diagnóstico e testes. |
| `getStatus()` | `none` | `WebPushStatus` | Devolve o objeto com informações detalhadas sobre suporte, permissão e inscrição. |

### Events

| Event Name | Detail Type | Description |
| :--- | :--- | :--- |
| `fzl-push-subscribed` | `{ subscription: Object }` | Disparado quando o usuário ativa e conclui a inscrição Web Push com sucesso. |
| `fzl-push-unsubscribed` | `{}` | Disparado quando a inscrição é desfeita. |
| `fzl-push-received` | `{ title: string, body: string, url?: string, data?: Object }` | Disparado ao receber (ou simular) uma notificação Web Push. |
| `fzl-push-clicked` | `{ action?: string, url?: string, data?: Object }` | Disparado quando o usuário clica na notificação ou ação do toast. |
| `fzl-push-permission-change`| `{ permission: string }` | Disparado quando a permissão de notificação muda (`granted`, `denied`, `default`). |
| `fzl-push-error` | `{ error: Error, message: string }` | Disparado em caso de erro na solicitação de permissão ou inscrição. |

### Slots

| Slot Name | Description |
| :--- | :--- |
| `prompt` | Conteúdo personalizado para o banner de solicitação de permissão. |
| `blocked` | Conteúdo personalizado exibido quando as notificações estão bloqueadas no navegador. |
| `message` | Conteúdo ou template personalizado para o toast de notificação recebida. |
| *(default)* | Conteúdo livre embutido no elemento. |

---

## 4. Accessibility & Behavior (WCAG 2.1)
- Prompt banners use `role="region"` and accessible aria-labels.
- Incoming push notifications are announced via `role="status"` or `role="alert"`.
- Buttons and action links provide keyboard navigation (`Tab`, `Enter`, `Space`) and high-contrast styling adhering to Material Design 3 tokens.
