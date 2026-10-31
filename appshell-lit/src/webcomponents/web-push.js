import { LitElement, html, css } from 'lit'
import { announce } from '../a11y/index.js'
import { pushService, urlBase64ToUint8Array } from '../services/push-service.js'
import { storageKey } from '../storage-keys.js'

/**
 * Web Push Component (<fzl-web-push> / <web-push-component>).
 *
 * Componente configurável de Web Push com exibição condicional (headless por padrão):
 * - Permanece sem renderização visível quando ocioso.
 * - Exibe banner de solicitação de permissão quando `auto-prompt` está ativo e permissão é 'default'.
 * - Exibe toast/card com a notificação quando um push chega (ou ao simular com simulatePush).
 * - Exibe alerta acessível caso as notificações estejam bloqueadas pelo navegador.
 * - Suporta display-mode="badge" ou "card" para diagnóstico visual.
 */
export class WebPushComponent extends LitElement {
  static properties = {
    vapidKey: { type: String, attribute: 'vapid-key' },
    endpointUrl: { type: String, attribute: 'endpoint-url' },
    autoPrompt: { type: Boolean, attribute: 'auto-prompt' },
    topics: { type: String },
    displayMode: { type: String, attribute: 'display-mode' },
    status: { type: String, reflect: true },
    subscribed: { type: Boolean, reflect: true },

    _permission: { state: true },
    _showPrompt: { state: true },
    _incomingPush: { state: true },
    _busy: { state: true },
    _error: { state: true },
  }

  static styles = css`
    :host {
      display: block;
    }

    :host([hidden]) {
      display: none !important;
    }

    /* Prompt Banner */
    .push-prompt-banner {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 20px;
      margin: 12px 0;
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-on-surface, #1d1b20);
      border-left: 4px solid var(--md-sys-color-primary, #6750a4);
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }

    .prompt-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1 1 280px;
    }

    .prompt-icon {
      color: var(--md-sys-color-primary, #6750a4);
      font-size: 24px;
      flex-shrink: 0;
    }

    .prompt-title {
      font-weight: 600;
      font-size: 0.95rem;
      margin-bottom: 2px;
    }

    .prompt-description {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .prompt-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 14px;
      font-size: 0.85rem;
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
      color: var(--md-sys-color-on-surface-variant, #49454f);
      border-color: var(--md-sys-color-outline-variant, #cac4d0);
    }
    .btn-secondary:hover:not(:disabled) {
      background: rgba(0, 0, 0, 0.05);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Incoming Push Toast */
    .push-toast {
      position: fixed;
      right: 20px;
      bottom: 24px;
      z-index: 1050;
      max-width: 380px;
      width: calc(100vw - 40px);
      background: var(--md-sys-color-inverse-surface, #313033);
      color: var(--md-sys-color-inverse-on-surface, #f4eff4);
      border-radius: 8px;
      padding: 14px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      animation: push-slide-in 0.25s ease-out;
    }

    @keyframes push-slide-in {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .toast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }

    .toast-title {
      font-weight: 600;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--md-sys-color-inverse-primary, #d0bcff);
    }

    .toast-close {
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      font-size: 1.1rem;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.15);
    }

    .toast-body {
      font-size: 0.875rem;
      line-height: 1.4;
      margin-bottom: 8px;
      word-break: break-word;
    }

    .toast-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    /* Blocked Alert */
    .push-blocked-alert {
      padding: 12px 16px;
      margin: 8px 0;
      border-radius: 8px;
      background: var(--md-sys-color-error-container, #ffdad6);
      color: var(--md-sys-color-on-error-container, #410002);
      border-left: 4px solid var(--md-sys-color-error, #ba1a1a);
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    /* Badge Mode */
    .push-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      background: var(--md-sys-color-surface-container, #f3edf7);
      color: var(--md-sys-color-on-surface-variant, #49454f);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }

    .push-badge.status-subscribed {
      background: rgba(46, 125, 50, 0.12);
      color: #2e7d32;
      border-color: rgba(46, 125, 50, 0.3);
    }

    .push-badge.status-denied {
      background: rgba(211, 47, 47, 0.12);
      color: #d32f2f;
      border-color: rgba(211, 47, 47, 0.3);
    }

    .push-badge.status-default {
      background: rgba(237, 108, 2, 0.12);
      color: #ed6c02;
      border-color: rgba(237, 108, 2, 0.3);
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    /* Diagnostic Card Mode */
    .push-card {
      padding: 16px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #1d1b20);
    }

    .push-card h4 {
      margin: 0 0 10px;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .push-card-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px 14px;
      font-size: 0.85rem;
      margin-bottom: 12px;
    }

    .push-card-label {
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
  `

  constructor() {
    super()
    this.vapidKey = ''
    this.endpointUrl = ''
    this.autoPrompt = false
    this.topics = ''
    this.displayMode = 'none' // 'none' | 'banner' | 'badge' | 'card'
    this.status = 'unconfigured'
    this.subscribed = false

    this._permission = pushService.permission()
    this._showPrompt = false
    this._incomingPush = null
    this._busy = false
    this._error = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this._initService()
    this._refreshState()

    // Ouve eventos do pushService
    this._unsubscribe = pushService.subscribe(({ type, ...detail }) => {
      if (type === 'permission-change') {
        this._permission = pushService.permission()
        this._updateStatus()
        this.dispatchEvent(new CustomEvent('fzl-push-permission-change', { detail: { permission: this._permission } }))
      } else if (type === 'subscribed') {
        this.subscribed = true
        this._updateStatus()
        this.dispatchEvent(new CustomEvent('fzl-push-subscribed', { detail }))
      } else if (type === 'unsubscribed') {
        this.subscribed = false
        this._updateStatus()
        this.dispatchEvent(new CustomEvent('fzl-push-unsubscribed', { detail }))
      } else if (type === 'received') {
        this._handleIncomingPush(detail)
      }
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubscribe?.()
    if (this._toastTimeout) clearTimeout(this._toastTimeout)
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('vapidKey') || changedProperties.has('endpointUrl')) {
      this._initService()
      this._refreshState()
    }
    if (changedProperties.has('autoPrompt') && this.autoPrompt) {
      if (this._permission === 'default' && pushService.isSupported()) {
        this._showPrompt = true
      }
    }
  }

  _initService() {
    if (!this.vapidKey) return

    // Configura o pushService caso uma chave pública seja fornecida diretamente ao componente
    try {
      pushService.use({
        vapidPublicKey: this.vapidKey,
        onSubscribe: async (subscription) => {
          if (this.endpointUrl) {
            try {
              await fetch(this.endpointUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscription,
                  topics: this._getTopicsList(),
                }),
              })
            } catch (err) {
              console.warn('[fzl-web-push] Falha ao enviar inscrição para o endpoint configurado:', err)
            }
          }
        },
        onUnsubscribe: async (subscription) => {
          if (this.endpointUrl) {
            try {
              await fetch(this.endpointUrl, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription }),
              })
            } catch (err) {
              console.warn('[fzl-web-push] Falha ao remover inscrição no endpoint configurado:', err)
            }
          }
        },
      })
    } catch (err) {
      console.warn('[fzl-web-push] Configuração do pushService ignorada:', err.message)
    }
  }

  async _refreshState() {
    if (!pushService.isSupported()) {
      this.status = 'unsupported'
      this.subscribed = false
      return
    }

    this._permission = pushService.permission()
    try {
      this.subscribed = await pushService.isActive()
    } catch {
      this.subscribed = false
    }

    if (this.autoPrompt && this._permission === 'default') {
      this._showPrompt = true
    }

    this._updateStatus()
  }

  _updateStatus() {
    if (!pushService.isSupported()) {
      this.status = 'unsupported'
      return
    }
    if (this._permission === 'denied') {
      this.status = 'denied'
      return
    }
    if (this.subscribed) {
      this.status = 'subscribed'
      return
    }
    if (this._permission === 'granted') {
      this.status = 'granted'
      return
    }
    if (this._permission === 'default') {
      this.status = this.vapidKey ? 'default' : 'unconfigured'
      return
    }
    this.status = this.vapidKey ? 'ready' : 'unconfigured'
  }

  _getTopicsList() {
    if (!this.topics) return []
    return this.topics
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
  }

  /** Solicita permissão e ativa a inscrição Web Push */
  async subscribe() {
    if (!pushService.isSupported()) {
      const err = new Error('Navegador não suporta notificações Web Push.')
      this._emitError(err)
      throw err
    }

    this._busy = true
    this._error = ''
    try {
      const subscription = await pushService.enable()
      this.subscribed = true
      this._showPrompt = false
      this._updateStatus()
      announce('Inscrição Web Push ativada com sucesso.')
      this.dispatchEvent(new CustomEvent('fzl-push-subscribed', { detail: { subscription } }))
      return subscription
    } catch (err) {
      this._error = err.message
      this._updateStatus()
      this._emitError(err)
      throw err
    } finally {
      this._busy = false
    }
  }

  /** Cancela a inscrição Web Push */
  async unsubscribe() {
    this._busy = true
    this._error = ''
    try {
      await pushService.disable()
      this.subscribed = false
      this._updateStatus()
      announce('Inscrição Web Push desativada.')
      this.dispatchEvent(new CustomEvent('fzl-push-unsubscribed', { detail: {} }))
    } catch (err) {
      this._error = err.message
      this._emitError(err)
      throw err
    } finally {
      this._busy = false
    }
  }

  /** Abre manualmente o banner de permissão se a permissão for 'default' */
  prompt() {
    this._showPrompt = true
  }

  _dismissPrompt() {
    this._showPrompt = false
  }

  /** Simula o recebimento de uma notificação Web Push (para testes e diagnóstico) */
  simulatePush(payload = {}) {
    const pushData = {
      title: payload.title || 'Notificação Push Simulada',
      body: payload.body || 'Esta é uma notificação disparada para validação de layout e eventos.',
      url: payload.url || null,
      data: payload.data || {},
      icon: payload.icon || 'notifications',
    }
    this._handleIncomingPush(pushData)
  }

  _handleIncomingPush(pushData) {
    this._incomingPush = pushData
    announce(`Nova notificação: ${pushData.title}. ${pushData.body}`)
    this.dispatchEvent(
      new CustomEvent('fzl-push-received', {
        detail: pushData,
        bubbles: true,
        composed: true,
      }),
    )

    if (this._toastTimeout) clearTimeout(this._toastTimeout)
    this._toastTimeout = setTimeout(() => {
      this._incomingPush = null
    }, 7000)
  }

  _handleToastClick(action = null) {
    if (!this._incomingPush) return
    const detail = {
      action,
      url: this._incomingPush.url,
      data: this._incomingPush.data,
    }
    this.dispatchEvent(
      new CustomEvent('fzl-push-clicked', {
        detail,
        bubbles: true,
        composed: true,
      }),
    )
    if (this._incomingPush.url && typeof window !== 'undefined') {
      window.location.hash = this._incomingPush.url
    }
    this._incomingPush = null
  }

  _closeToast() {
    this._incomingPush = null
  }

  _emitError(error) {
    this.dispatchEvent(
      new CustomEvent('fzl-push-error', {
        detail: { error, message: error.message },
        bubbles: true,
        composed: true,
      }),
    )
  }

  getStatus() {
    return {
      supported: pushService.isSupported(),
      configured: pushService.isConfigured() || Boolean(this.vapidKey),
      permission: this._permission,
      subscribed: this.subscribed,
      status: this.status,
      topics: this._getTopicsList(),
      endpointUrl: this.endpointUrl,
    }
  }

  _renderPromptBanner() {
    if (!this._showPrompt || this.subscribed || this._permission !== 'default') {
      return ''
    }

    return html`
      <div class="push-prompt-banner" role="region" aria-label="Solicitação de Notificações Web Push">
        <slot name="prompt">
          <div class="prompt-content">
            <span class="prompt-icon">🔔</span>
            <div>
              <div class="prompt-title">Deseja ativar notificações Web Push?</div>
              <div class="prompt-description">
                Receba alertas de processos, atualizações e mensagens mesmo com a aplicação fechada.
              </div>
            </div>
          </div>
          <div class="prompt-actions">
            <button class="btn btn-secondary" @click=${this._dismissPrompt}>Agora não</button>
            <button class="btn btn-primary" ?disabled=${this._busy} @click=${() => this.subscribe()}>
              ${this._busy ? 'Ativando…' : 'Ativar Notificações'}
            </button>
          </div>
        </slot>
      </div>
    `
  }

  _renderBlockedAlert() {
    if (this._permission !== 'denied' || this.displayMode === 'none') {
      return ''
    }

    return html`
      <div class="push-blocked-alert" role="alert">
        <slot name="blocked">
          <span>⚠️</span>
          <div>
            <strong>Notificações bloqueadas no navegador.</strong>
            Para ativá-las, libere as notificações nas configurações do site (ícone ao lado da barra de endereço).
          </div>
        </slot>
      </div>
    `
  }

  _renderToast() {
    if (!this._incomingPush) return ''

    return html`
      <div class="push-toast" role="status" aria-live="polite">
        <slot name="message">
          <div class="toast-header">
            <span class="toast-title">
              <span>🔔</span>
              <span>${this._incomingPush.title}</span>
            </span>
            <button class="toast-close" aria-label="Fechar" @click=${this._closeToast}>✕</button>
          </div>
          <div class="toast-body">${this._incomingPush.body}</div>
          <div class="toast-actions">
            ${this._incomingPush.url
              ? html`
                  <button class="btn btn-primary" @click=${() => this._handleToastClick('open')}>
                    Visualizar
                  </button>
                `
              : ''}
            <button class="btn btn-secondary" @click=${this._closeToast}>Fechar</button>
          </div>
        </slot>
      </div>
    `
  }

  _renderBadge() {
    const statusMap = {
      subscribed: { text: 'Push Ativo', icon: '●' },
      denied: { text: 'Push Bloqueado', icon: '✕' },
      default: { text: 'Push Pendente', icon: '○' },
      unsupported: { text: 'Não Suportado', icon: '—' },
      unconfigured: { text: 'Push Desativado', icon: '○' },
      ready: { text: 'Pronto', icon: '○' },
    }
    const current = statusMap[this.status] || { text: this.status, icon: '•' }

    return html`
      <div class="push-badge status-${this.status}" title="Estado do Web Push: ${current.text}">
        <span class="badge-dot"></span>
        <span>${current.text}</span>
      </div>
    `
  }

  _renderCard() {
    return html`
      <div class="push-card">
        <h4><span>🔔</span> Web Push Diagnostics</h4>
        <div class="push-card-grid">
          <span class="push-card-label">Suporte do Navegador:</span>
          <span>${pushService.isSupported() ? 'Suportado' : 'Não Suportado'}</span>

          <span class="push-card-label">Permissão Atual:</span>
          <span>${this._permission}</span>

          <span class="push-card-label">Inscrição Ativa:</span>
          <span>${this.subscribed ? 'Sim' : 'Não'}</span>

          <span class="push-card-label">Modo:</span>
          <span>${this.displayMode}</span>

          <span class="push-card-label">Tópicos:</span>
          <span>${this.topics || '(Nenhum tópico filtrado)'}</span>
        </div>
        <div class="prompt-actions">
          ${this.subscribed
            ? html`<button class="btn btn-secondary" ?disabled=${this._busy} @click=${() => this.unsubscribe()}>
                Desativar Inscrição
              </button>`
            : html`<button class="btn btn-primary" ?disabled=${this._busy} @click=${() => this.subscribe()}>
                Ativar Inscrição
              </button>`}
          <button class="btn btn-secondary" @click=${() => this.simulatePush()}>
            Testar Notificação
          </button>
        </div>
      </div>
    `
  }

  render() {
    return html`
      ${this.displayMode === 'badge' ? this._renderBadge() : ''}
      ${this.displayMode === 'card' ? this._renderCard() : ''}
      ${this.displayMode === 'banner' || this.autoPrompt || this._showPrompt ? this._renderPromptBanner() : ''}
      ${this._renderBlockedAlert()}
      ${this._renderToast()}
      <slot></slot>
    `
  }
}

if (!customElements.get('fzl-web-push')) {
  customElements.define('fzl-web-push', WebPushComponent)
}
if (!customElements.get('web-push-component')) {
  customElements.define('web-push-component', class WebPushAlias extends WebPushComponent {})
}
