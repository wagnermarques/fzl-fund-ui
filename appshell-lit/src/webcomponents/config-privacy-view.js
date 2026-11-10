import { LitElement, html, css } from 'lit'
import { consentService } from '../services/consent-service.js'
import { appConfig } from '../app-config.js'

/**
 * Config > Privacidade — Gestão de consentimento (LGPD / GDPR / Google Consent Mode v2).
 *
 * Permite ao usuário revisar e alternar o consentimento de telemetria e cookies.
 * Revogar desliga imediatamente o envio ao GA4 e expurga os cookies _ga.
 * Apresenta a declaração transparente de cookies e armazenamento local utilizados pelo app.
 * Caso integrado a uma CMP externa (como Cookiebot), disponibiliza a reabertura do diálogo.
 */
export class ConfigPrivacyView extends LitElement {
  static properties = {
    privacyUrl: {},
    _consent: { state: true },
  }

  static styles = css`
    :host {
      display: block;
      max-width: 720px;
      margin: 0 auto;
      padding: 16px 24px 64px;
    }
    h1 {
      font-size: 1.5rem;
      margin: 0 0 4px;
      color: var(--md-sys-color-on-surface);
    }
    .breadcrumb {
      color: var(--md-sys-color-on-surface-variant);
      font-size: 0.85rem;
      margin: 0 0 24px;
    }
    .card {
      padding: 16px;
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      border-radius: 8px;
      background: var(--md-sys-color-surface-container-low, #f8fafc);
      margin-bottom: 24px;
    }
    label {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 1rem;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
      cursor: pointer;
    }
    .hint {
      margin-top: 10px;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.4;
    }
    .cmp-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      background: var(--md-sys-color-secondary-container, #e2e8f0);
      color: var(--md-sys-color-on-secondary-container, #1e293b);
      margin-bottom: 12px;
    }
    h2 {
      font-size: 1.15rem;
      margin: 28px 0 12px;
      color: var(--md-sys-color-on-surface);
    }
    .cookie-table-container {
      overflow-x: auto;
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      border-radius: 8px;
      margin-top: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }
    th,
    td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
    }
    th {
      background: var(--md-sys-color-surface-container, #f1f5f9);
      color: var(--md-sys-color-on-surface);
      font-weight: 600;
    }
    tr:last-child td {
      border-bottom: none;
    }
    td code {
      font-size: 0.8rem;
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 4px;
      border-radius: 4px;
    }
    a {
      color: var(--md-sys-color-primary);
    }
    .cookiebot-box {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
      border: 1px dashed var(--md-sys-color-outline, #94a3b8);
      border-radius: 6px;
      margin-top: 16px;
      background: var(--md-sys-color-surface, #ffffff);
    }
  `

  constructor() {
    super()
    this._consent = consentService.get()
  }

  connectedCallback() {
    super.connectedCallback()
    this._unsubscribe = consentService.subscribe((value) => (this._consent = value))
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubscribe?.()
  }

  _statusText() {
    if (this._consent === 'granted') return 'Você autorizou a medição de uso.'
    if (this._consent === 'denied') return 'Você recusou a medição de uso. Nenhum dado é enviado.'
    return 'Você ainda não respondeu. Enquanto isso, nenhum dado é enviado.'
  }

  _getCmpProvider() {
    const cmp = appConfig.config?.analytics?.cmp
    if (cmp === 'cookiebot') return 'Cookiebot CMP (Certificado Google)'
    if (cmp === 'custom') return 'CMP Personalizada (Open Source)'
    return 'Nativo Lit (LGPD Art. 8º)'
  }

  _openCookiebot() {
    if (typeof window !== 'undefined' && window.Cookiebot) {
      window.Cookiebot.renew()
    }
  }

  render() {
    const isCookiebot = appConfig.config?.analytics?.cmp === 'cookiebot' || (typeof window !== 'undefined' && Boolean(window.Cookiebot))

    return html`
      <h1>Privacidade e Consentimento</h1>
      <p class="breadcrumb">Config &gt; Privacidade</p>

      <div class="cmp-badge">
        <span>Gestão de Consentimento: ${this._getCmpProvider()}</span>
      </div>

      <div class="card">
        <label>
          Permitir medição de uso (Google Analytics 4)
          <md-switch
            ?selected=${this._consent === 'granted'}
            @change=${(e) => consentService.set(e.target.selected ? 'granted' : 'denied')}
          ></md-switch>
        </label>
        <p class="hint">
          ${this._statusText()} A medição registra quais telas do aplicativo são acessadas
          para subsidiar melhorias de ergonomia — nunca o conteúdo confidencial da sua conta.
          Ao desligar, todos os cookies de telemetria deste aplicativo são apagados imediatamente.
          ${this.privacyUrl
            ? html`<br /><a href=${this.privacyUrl} target="_blank" rel="noopener">Política de privacidade completa</a>`
            : ''}
        </p>

        ${isCookiebot
          ? html`
              <div class="cookiebot-box">
                <span style="font-size: 0.85rem;">Gerenciar categorias detalhadas via Cookiebot:</span>
                <md-outlined-button type="button" @click=${this._openCookiebot}>
                  Abrir Cookiebot
                </md-outlined-button>
              </div>
            `
          : ''}
      </div>

      <h2>Declaração de Cookies e Armazenamento Local</h2>
      <p class="hint">
        Em conformidade com o princípio da transparência da LGPD, listamos abaixo os itens
        de armazenamento utilizados por este aplicativo:
      </p>

      <div class="cookie-table-container">
        <table>
          <thead>
            <tr>
              <th>Identificador</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Duração</th>
              <th>Finalidade</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>_ga</code>, <code>_ga_*</code></td>
              <td>Cookie</td>
              <td>Estatísticas</td>
              <td>2 anos</td>
              <td>Métricas anônimas agregadas de navegação no GA4 (Consent Mode v2).</td>
            </tr>
            <tr>
              <td><code>*:auth:session</code></td>
              <td>LocalStorage</td>
              <td>Essencial</td>
              <td>Sessão</td>
              <td>Mantém o token de autenticação e a sessão do usuário conectado.</td>
            </tr>
            <tr>
              <td><code>*:a11y:preferences</code></td>
              <td>LocalStorage</td>
              <td>Preferências</td>
              <td>Persistente</td>
              <td>Armazena a escolha de tema (claro/escuro/alto contraste) e tamanho do texto.</td>
            </tr>
            <tr>
              <td><code>*:i18n:locale</code></td>
              <td>LocalStorage</td>
              <td>Preferências</td>
              <td>Persistente</td>
              <td>Guarda a seleção de idioma e direção de escrita da interface.</td>
            </tr>
            <tr>
              <td><code>*:consent:analytics</code></td>
              <td>LocalStorage</td>
              <td>Essencial</td>
              <td>Persistente</td>
              <td>Registra sua escolha de consentimento para não perguntar repetidamente.</td>
            </tr>
            <tr>
              <td><code>*:organization:config</code></td>
              <td>LocalStorage</td>
              <td>Preferências</td>
              <td>Persistente</td>
              <td>Preserva customizações corporativas da organização (marca e cores).</td>
            </tr>
          </tbody>
        </table>
      </div>
    `
  }
}

customElements.define('config-privacy-view', ConfigPrivacyView)
