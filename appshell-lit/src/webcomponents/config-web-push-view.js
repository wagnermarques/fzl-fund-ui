import { LitElement, html, css } from 'lit'
import { announce } from '../a11y/index.js'
import { pushService } from '../services/push-service.js'
import { storageKey } from '../storage-keys.js'
import './web-push.js'

const DEMO_VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-M9-25cdM0ykxTuqyS3OT421M-2R9b9Z_T_d5u3q1mRz8K5N9p_l_n4QY'
const STORAGE_CONFIG_KEY = 'push:web_push_config'

/**
 * Config > Web Push — tela de configuração e diagnóstico de notificações Web Push.
 *
 * Permite definir a chave pública VAPID, endpoint de registro no backend, auto-prompt,
 * tópicos de interesse, gerenciar a inscrição e realizar testes de envio com push simulado.
 */
export class ConfigWebPushView extends LitElement {
  static properties = {
    vapidKey: { state: true },
    endpointUrl: { state: true },
    autoPrompt: { state: true },
    topics: { state: true },
    _active: { state: true },
    _permission: { state: true },
    _busy: { state: true },
    _statusMessage: { state: true },
    _statusType: { state: true },
    _testTitle: { state: true },
    _testBody: { state: true },
    _testUrl: { state: true },
    _subscriptionJson: { state: true },
  }

  static styles = css`
    :host {
      display: block;
      max-width: 760px;
      margin: 0 auto;
      padding: 16px 24px 64px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    h1 {
      font-size: 1.5rem;
      margin: 0 0 4px;
    }

    .breadcrumb {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-size: 0.85rem;
      margin: 0 0 20px;
    }

    .intro-card {
      padding: 14px 18px;
      border-radius: 8px;
      background: var(--md-sys-color-surface-container-low, #f7f2fa);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      font-size: 0.9rem;
      line-height: 1.5;
      margin-bottom: 24px;
    }

    .section-card {
      padding: 20px;
      border-radius: 12px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface, #ffffff);
      margin-bottom: 24px;
    }

    h2 {
      font-size: 1.15rem;
      margin: 0 0 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--md-sys-color-primary, #6750a4);
    }

    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .hint {
      font-size: 0.8rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin-top: 4px;
    }

    input[type='text'],
    input[type='url'],
    textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      background: var(--md-sys-color-surface, #ffffff);
      color: inherit;
      font-family: inherit;
      font-size: 0.9rem;
    }

    input:focus,
    textarea:focus {
      outline: 2px solid var(--md-sys-color-primary, #6750a4);
      outline-offset: 1px;
    }

    .input-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .input-row input {
      flex: 1;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 6px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: background-color 0.2s, opacity 0.2s;
    }

    .btn:focus-visible {
      outline: 2px solid var(--md-sys-color-primary, #6750a4);
      outline-offset: 2px;
    }

    .btn-primary {
      background: var(--md-sys-color-primary, #6750a4);
      color: var(--md-sys-color-on-primary, #ffffff);
    }
    .btn-primary:hover:not(:disabled) {
      opacity: 0.92;
    }

    .btn-secondary {
      background: transparent;
      color: var(--md-sys-color-primary, #6750a4);
      border-color: var(--md-sys-color-outline-variant, #cac4d0);
    }
    .btn-secondary:hover:not(:disabled) {
      background: rgba(103, 80, 164, 0.08);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .switch-label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 0.95rem;
      cursor: pointer;
    }

    .topics-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 8px;
    }

    .topic-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 16px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface-container, #f3edf7);
      font-size: 0.85rem;
      cursor: pointer;
      user-select: none;
    }

    .topic-chip.selected {
      background: var(--md-sys-color-primary-container, #eaddff);
      color: var(--md-sys-color-on-primary-container, #21005d);
      border-color: var(--md-sys-color-primary, #6750a4);
      font-weight: 600;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-badge.granted {
      background: rgba(46, 125, 50, 0.15);
      color: #2e7d32;
    }
    .status-badge.denied {
      background: rgba(211, 47, 47, 0.15);
      color: #d32f2f;
    }
    .status-badge.default {
      background: rgba(237, 108, 2, 0.15);
      color: #ed6c02;
    }

    .status-alert {
      padding: 10px 14px;
      border-radius: 6px;
      margin: 12px 0;
      font-size: 0.875rem;
    }
    .status-alert.success {
      background: rgba(46, 125, 50, 0.12);
      color: #1b5e20;
      border: 1px solid rgba(46, 125, 50, 0.3);
    }
    .status-alert.error {
      background: var(--md-sys-color-error-container, #ffdad6);
      color: var(--md-sys-color-on-error-container, #410002);
      border: 1px solid var(--md-sys-color-error, #ba1a1a);
    }

    pre.json-box {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      overflow-x: auto;
      max-height: 200px;
      margin: 8px 0;
    }

    dl.diagnostics-grid {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 16px;
      margin: 12px 0;
      font-size: 0.875rem;
    }
    dt {
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-weight: 500;
    }
    dd {
      margin: 0;
      font-weight: 600;
    }
  `

  constructor() {
    super()
    this.vapidKey = ''
    this.endpointUrl = ''
    this.autoPrompt = false
    this.topics = 'alertas,processos,sistema'
    this._active = false
    this._permission = pushService.permission()
    this._busy = false
    this._statusMessage = ''
    this._statusType = ''
    this._testTitle = 'Novo Processo BPMS'
    this._testBody = 'A solicitação de adiantamento #1042 requer sua aprovação.'
    this._testUrl = '#/componentes'
    this._subscriptionJson = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this._loadSavedConfig()
    this._refreshState()

    this._unsubscribe = pushService.subscribe(({ type }) => {
      if (type === 'permission-change' || type === 'subscription-change' || type === 'subscribed' || type === 'unsubscribed') {
        this._refreshState()
      }
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubscribe?.()
  }

  _loadSavedConfig() {
    try {
      const raw = globalThis.localStorage?.getItem(storageKey(STORAGE_CONFIG_KEY))
      if (raw) {
        const parsed = JSON.parse(raw)
        this.vapidKey = parsed.vapidKey || ''
        this.endpointUrl = parsed.endpointUrl || ''
        this.autoPrompt = Boolean(parsed.autoPrompt)
        this.topics = parsed.topics || 'alertas,processos,sistema'
      }
    } catch {
      // Ignora erro de storage
    }
  }

  _saveConfig() {
    try {
      const config = {
        vapidKey: this.vapidKey,
        endpointUrl: this.endpointUrl,
        autoPrompt: this.autoPrompt,
        topics: this.topics,
      }
      globalThis.localStorage?.setItem(storageKey(STORAGE_CONFIG_KEY), JSON.stringify(config))
      this._statusMessage = 'Configurações de Web Push salvas com sucesso!'
      this._statusType = 'success'
      announce('Configurações de Web Push salvas')

      // Atualiza o componente interno
      const el = this.shadowRoot?.querySelector('#webPushEl')
      if (el) {
        el.vapidKey = this.vapidKey
        el.endpointUrl = this.endpointUrl
        el.autoPrompt = this.autoPrompt
        el.topics = this.topics
      }
    } catch (err) {
      this._statusMessage = 'Falha ao salvar configurações: ' + err.message
      this._statusType = 'error'
    }
  }

  async _refreshState() {
    this._permission = pushService.permission()
    if (!pushService.isSupported()) {
      this._active = false
      return
    }

    try {
      this._active = await pushService.isActive()
      if (this._active && navigator.serviceWorker) {
        const reg = await navigator.serviceWorker.getRegistration()
        const sub = await reg?.pushManager?.getSubscription()
        if (sub) {
          this._subscriptionJson = JSON.stringify(sub.toJSON(), null, 2)
        } else {
          this._subscriptionJson = ''
        }
      } else {
        this._subscriptionJson = ''
      }
    } catch {
      this._active = false
    }
  }

  _generateMockKey() {
    this.vapidKey = DEMO_VAPID_KEY
    this._statusMessage = 'Chave VAPID pública de demonstração preenchida!'
    this._statusType = 'success'
  }

  _toggleTopic(topic) {
    const list = this.topics.split(',').map((t) => t.trim()).filter(Boolean)
    const idx = list.indexOf(topic)
    if (idx >= 0) {
      list.splice(idx, 1)
    } else {
      list.push(topic)
    }
    this.topics = list.join(',')
  }

  async _toggleSubscription(e) {
    const wantActive = e.target.checked
    this._busy = true
    this._statusMessage = ''
    try {
      if (wantActive) {
        // Se ainda não salvou, inicializa com o que temos
        const el = this.shadowRoot.querySelector('#webPushEl')
        if (el) {
          el.vapidKey = this.vapidKey || DEMO_VAPID_KEY
          el.endpointUrl = this.endpointUrl
        }
        await pushService.enable()
        announce('Notificações ativadas')
      } else {
        await pushService.disable()
        announce('Notificações desativadas')
      }
    } catch (err) {
      this._statusMessage = err.message || 'Erro ao alterar inscrição de Web Push.'
      this._statusType = 'error'
    } finally {
      this._busy = false
      await this._refreshState()
    }
  }

  _sendSimulatedPush() {
    const el = this.shadowRoot.querySelector('#webPushEl')
    if (el) {
      el.simulatePush({
        title: this._testTitle || 'Teste de Web Push',
        body: this._testBody || 'Corpo da mensagem de notificação recebida.',
        url: this._testUrl || null,
      })
      this._statusMessage = 'Notificação de teste disparada com sucesso!'
      this._statusType = 'success'
    }
  }

  _copySubscriptionJson() {
    if (!this._subscriptionJson) return
    navigator.clipboard?.writeText(this._subscriptionJson).then(() => {
      announce('Inscrição copiada')
      this._statusMessage = 'JSON da inscrição copiado para a área de transferência!'
      this._statusType = 'success'
    })
  }

  render() {
    const availableTopics = ['alertas', 'processos', 'sistema', 'financeiro', 'relatorios']
    const selectedTopics = this.topics.split(',').map((t) => t.trim())

    return html`
      <h1>Web Push</h1>
      <div class="breadcrumb">Início › Config › Web Push</div>

      <div class="intro-card">
        O componente <strong>&lt;fzl-web-push&gt;</strong> gerencia o ciclo de vida completo de notificações Web Push.
        Configure abaixo as credenciais de servidor VAPID, endpoints de integração e realize testes de recebimento de notificações mesmo sem um servidor de backend ativo.
      </div>

      <!-- Instância do Web Push Component para exibição condicional e testes -->
      <fzl-web-push
        id="webPushEl"
        .vapidKey=${this.vapidKey}
        .endpointUrl=${this.endpointUrl}
        ?auto-prompt=${this.autoPrompt}
        .topics=${this.topics}
      ></fzl-web-push>

      ${this._statusMessage
        ? html`<div class="status-alert ${this._statusType}" role="alert">${this._statusMessage}</div>`
        : ''}

      <!-- 1. Configurações de Integração -->
      <div class="section-card">
        <h2><span>⚙️</span> Parâmetros do Provedor Push</h2>

        <div class="form-group">
          <label for="vapidKeyInput">Chave Pública VAPID (applicationServerKey)</label>
          <div class="input-row">
            <input
              id="vapidKeyInput"
              type="text"
              placeholder="Ex: BEl62iUYgUivxIkv69yViEuiBIa..."
              .value=${this.vapidKey}
              @input=${(e) => (this.vapidKey = e.target.value)}
            />
            <button class="btn btn-secondary" @click=${this._generateMockKey}>Gerar Chave Demo</button>
          </div>
          <div class="hint">Chave pública em formato base64url fornecida pelo seu servidor push.</div>
        </div>

        <div class="form-group">
          <label for="endpointInput">Endpoint de Registro no Backend (URL)</label>
          <input
            id="endpointInput"
            type="url"
            placeholder="Ex: https://api.exemplo.com/api/push/subscriptions"
            .value=${this.endpointUrl}
            @input=${(e) => (this.endpointUrl = e.target.value)}
          />
          <div class="hint">Endereço HTTP onde a aplicação envia o JSON da inscrição (onSubscribe).</div>
        </div>

        <div class="form-group">
          <label class="switch-label">
            <span>Solicitar permissão automaticamente (Auto-Prompt)</span>
            <input
              type="checkbox"
              .checked=${this.autoPrompt}
              @change=${(e) => (this.autoPrompt = e.target.checked)}
            />
          </label>
          <div class="hint">Exibe o banner discreto no topo da aplicação quando o usuário ainda não decidiu.</div>
        </div>

        <div class="form-group">
          <label>Tópicos de Interesse</label>
          <div class="topics-grid">
            ${availableTopics.map(
              (topic) => html`
                <div
                  class="topic-chip ${selectedTopics.includes(topic) ? 'selected' : ''}"
                  @click=${() => this._toggleTopic(topic)}
                >
                  <span>${selectedTopics.includes(topic) ? '✓' : '+'}</span>
                  <span>${topic}</span>
                </div>
              `,
            )}
          </div>
          <div class="hint">Categorias enviadas ao backend para filtrar quais notificações este dispositivo deve receber.</div>
        </div>

        <button class="btn btn-primary" @click=${this._saveConfig}>Salvar Configurações</button>
      </div>

      <!-- 2. Estado e Diagnóstico do Dispositivo -->
      <div class="section-card">
        <h2><span>📱</span> Diagnóstico do Dispositivo</h2>

        <dl class="diagnostics-grid">
          <dt>Suporte a Web Push:</dt>
          <dd>${pushService.isSupported() ? '✅ Suportado' : '❌ Não suportado neste navegador'}</dd>

          <dt>Permissão do Navegador:</dt>
          <dd>
            <span class="status-badge ${this._permission}">
              ${this._permission === 'granted'
                ? 'Concedida'
                : this._permission === 'denied'
                  ? 'Bloqueada'
                  : 'Padrão (Pendente)'}
            </span>
          </dd>

          <dt>Inscrição Ativa:</dt>
          <dd>${this._active ? '🟢 Inscrito e Ativo' : '⚪ Inativo'}</dd>
        </dl>

        <div class="form-group">
          <label class="switch-label">
            <span>Receber notificações push neste navegador</span>
            <input
              type="checkbox"
              ?checked=${Boolean(this._active)}
              ?disabled=${this._busy || !pushService.isSupported() || this._permission === 'denied'}
              @change=${this._toggleSubscription}
            />
          </label>
        </div>

        ${this._subscriptionJson
          ? html`
              <div class="form-group">
                <label>Dados da Inscrição Ativa (PushSubscription JSON):</label>
                <pre class="json-box">${this._subscriptionJson}</pre>
                <button class="btn btn-secondary" @click=${this._copySubscriptionJson}>Copiar JSON</button>
              </div>
            `
          : ''}
      </div>

      <!-- 3. Simulador de Notificações Push -->
      <div class="section-card">
        <h2><span>🔔</span> Simulador de Notificações Push</h2>
        <div class="hint" style="margin-bottom: 14px;">
          Teste o comportamento do componente e os eventos recebidos mesmo sem conexão com o servidor de push.
        </div>

        <div class="form-group">
          <label for="testTitleInput">Título da Notificação</label>
          <input
            id="testTitleInput"
            type="text"
            .value=${this._testTitle}
            @input=${(e) => (this._testTitle = e.target.value)}
          />
        </div>

        <div class="form-group">
          <label for="testBodyInput">Mensagem / Conteúdo</label>
          <input
            id="testBodyInput"
            type="text"
            .value=${this._testBody}
            @input=${(e) => (this._testBody = e.target.value)}
          />
        </div>

        <div class="form-group">
          <label for="testUrlInput">URL de Ação (Opcional)</label>
          <input
            id="testUrlInput"
            type="text"
            .value=${this._testUrl}
            @input=${(e) => (this._testUrl = e.target.value)}
          />
        </div>

        <button class="btn btn-primary" @click=${this._sendSimulatedPush}>
          🚀 Enviar Notificação de Teste
        </button>
      </div>
    `
  }
}

customElements.define('config-web-push-view', ConfigWebPushView)
