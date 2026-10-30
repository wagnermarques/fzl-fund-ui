import { LitElement, html, css } from 'lit'
import { i18nService } from '../services/i18n-service.js'

/**
 * Config > Idioma — Seleção de idioma e região do aplicativo.
 *
 * Exibe a lista de idiomas suportados pelo app, permitindo ao usuário
 * selecionar sua preferência. A mudança é aplicada imediatamente em
 * tempo de execução, gravada no localStorage (com prefixo do app) e
 * sincronizada com os atributos <html lang dir> e eventos de shell / fzl:locale-change.
 */
export class ConfigLanguageView extends LitElement {
  static properties = {
    _locale: { state: true },
  }

  static styles = css`
    :host {
      display: block;
      max-width: 640px;
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

    .hint {
      margin: 0 0 16px;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.4;
    }

    fieldset {
      border: 0;
      margin: 0 0 24px;
      padding: 0;
    }

    legend {
      font-size: 1rem;
      font-weight: 700;
      padding: 0;
      margin-bottom: 8px;
      color: var(--md-sys-color-on-surface);
    }

    .language-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    label {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 48px;
      cursor: pointer;
      font-size: 1rem;
      color: var(--md-sys-color-on-surface);
      padding: 4px 8px;
      border-radius: 8px;
      transition: background-color 150ms ease;
    }

    label:hover {
      background-color: var(--md-sys-color-surface-container-highest, rgba(0, 0, 0, 0.04));
    }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background-color: var(--md-sys-color-secondary-container, #e2e8f0);
      color: var(--md-sys-color-on-secondary-container, #1e293b);
      margin-left: auto;
    }

    .preview-card {
      margin-top: 24px;
      padding: 16px;
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      border-radius: 8px;
      background: var(--md-sys-color-surface-container-low, #f8fafc);
      color: var(--md-sys-color-on-surface);
    }

    .preview-title {
      font-size: 0.875rem;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--md-sys-color-primary, #1d4ed8);
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      margin-bottom: 8px;
    }

    .preview-label {
      color: var(--md-sys-color-on-surface-variant, #64748b);
    }

    .preview-value {
      font-weight: 500;
    }
  `

  constructor() {
    super()
    this._locale = i18nService.getLocale()
  }

  connectedCallback() {
    super.connectedCallback()
    this._unsubscribe = i18nService.subscribe(({ locale }) => {
      this._locale = locale
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubscribe?.()
  }

  _selectLanguage(code) {
    if (this._locale !== code) {
      this._locale = code
      i18nService.setLocale(code)
    }
  }

  render() {
    const supportedLocales = i18nService.getSupportedLocales()
    const now = new Date()

    return html`
      <div class="breadcrumb" aria-hidden="true">
        ${i18nService.t('nav.config')} &gt; ${i18nService.t('nav.language')}
      </div>

      <h1>${i18nService.t('nav.language')}</h1>
      <p class="hint">
        Selecione o idioma de preferência para a interface da aplicação e seus componentes.
      </p>

      <fieldset>
        <legend id="lang-legend">Idiomas disponíveis</legend>
        <div class="language-list" role="radiogroup" aria-labelledby="lang-legend">
          ${supportedLocales.map(
            (loc) => html`
              <label>
                <md-radio
                  name="language"
                  value=${loc.code}
                  .checked=${this._locale === loc.code}
                  @change=${() => this._selectLanguage(loc.code)}
                  aria-label=${loc.label}
                ></md-radio>
                <span>${loc.label}</span>
                <span class="badge">${loc.code}</span>
              </label>
            `,
          )}
        </div>
      </fieldset>

      <div class="preview-card" aria-live="polite">
        <div class="preview-title">Demonstração de Formatação (${this._locale})</div>
        <div class="preview-item">
          <span class="preview-label">Data atual:</span>
          <span class="preview-value">${i18nService.formatDate(now, { dateStyle: 'long' })}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Moeda:</span>
          <span class="preview-value">${i18nService.formatCurrency(1234.5, 'BRL')}</span>
        </div>
        <div class="preview-item">
          <span class="preview-label">Mensagem:</span>
          <span class="preview-value">${i18nService.t('auth.welcome', { name: 'Wagner' })}</span>
        </div>
      </div>
    `
  }
}

if (!customElements.get('config-language-view')) {
  customElements.define('config-language-view', ConfigLanguageView)
}
