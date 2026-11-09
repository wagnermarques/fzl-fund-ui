import { LitElement, html, css } from 'lit'
import { organizationService } from '../services/organization-service.js'

export const BRAND_COLOR_PRESETS = [
  { label: 'FZL Corporate Blue', color: '#0284c7' },
  { label: 'Emerald Finance', color: '#059669' },
  { label: 'Royal Purple', color: '#6750a4' },
  { label: 'Indigo Asset', color: '#4f46e5' },
  { label: 'Crimson Capital', color: '#dc2626' },
  { label: 'Slate Dark', color: '#334155' },
]

/**
 * Config > Organização — Personalização da identidade institucional da marca.
 *
 * Permite ao administrador/usuário visualizar e configurar os dados da
 * organização consumidora do App Shell: nome, logo, slogan, cor corporativa,
 * canais de suporte e texto de rodapé.
 */
export class ConfigOrganizationView extends LitElement {
  static properties = {
    _config: { state: true },
    _form: { state: true },
    _feedback: { state: true },
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
      margin: 0 0 20px;
    }

    .hint {
      margin: 0 0 24px;
      font-size: 0.875rem;
      color: var(--md-sys-color-on-surface-variant);
      line-height: 1.5;
    }

    .preview-card {
      margin-bottom: 28px;
      padding: 20px;
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      border-radius: 12px;
      background: var(--md-sys-color-surface-container-low, #f8fafc);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .preview-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }

    .preview-logo {
      height: 48px;
      width: 48px;
      object-fit: contain;
      border-radius: 8px;
      background: var(--md-sys-color-surface, #ffffff);
      padding: 4px;
      box-sizing: border-box;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }

    .preview-titles h2 {
      font-size: 1.25rem;
      margin: 0;
      color: var(--md-sys-color-on-surface);
      line-height: 1.2;
    }

    .preview-tagline {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant);
      margin: 2px 0 0;
    }

    .preview-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 0.8rem;
      color: var(--md-sys-color-on-surface-variant);
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px dashed var(--md-sys-color-outline-variant, #e2e8f0);
    }

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .meta-item md-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .preview-footer {
      font-size: 0.75rem;
      color: var(--md-sys-color-on-surface-variant);
      margin-top: 10px;
      font-style: italic;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    md-outlined-text-field {
      width: 100%;
    }

    fieldset {
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      border-radius: 8px;
      padding: 16px;
      margin: 0 0 12px;
    }

    legend {
      font-size: 0.95rem;
      font-weight: 600;
      padding: 0 6px;
      color: var(--md-sys-color-on-surface);
    }

    .preset-palette {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0 16px;
    }

    .palette-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 20px;
      border: 1px solid var(--md-sys-color-outline-variant, #cbd5e1);
      background: var(--md-sys-color-surface, #ffffff);
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 120ms ease;
    }

    .palette-btn:hover {
      background: var(--md-sys-color-surface-container-highest, #e2e8f0);
    }

    .palette-btn.selected {
      border-color: var(--md-sys-color-primary);
      background: var(--md-sys-color-primary-container, #e0f2fe);
      font-weight: 600;
    }

    .color-swatch {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: inline-block;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
    }

    .custom-color-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .custom-color-input {
      width: 44px;
      height: 44px;
      border: 1px solid var(--md-sys-color-outline-variant);
      border-radius: 8px;
      cursor: pointer;
      padding: 2px;
      background: transparent;
    }

    .actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .feedback {
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: fadeIn 200ms ease-out;
    }

    .feedback.success {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `

  constructor() {
    super()
    this._config = organizationService.getConfig() || {}
    this._form = { ...this._config }
    this._feedback = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._unsubscribe = organizationService.subscribe((cfg) => {
      this._config = cfg || {}
      this._form = { ...this._config }
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubscribe?.()
  }

  _onFieldChange(e) {
    const { name, value } = e.target
    this._form = { ...this._form, [name]: value }
  }

  _selectPresetColor(color) {
    this._form = { ...this._form, primaryColor: color }
  }

  _handleSubmit(e) {
    e.preventDefault()
    organizationService.updateConfig(this._form)
    this._feedback = 'Configurações da organização salvas com sucesso!'
    setTimeout(() => {
      this._feedback = null
    }, 4000)
  }

  _handleReset() {
    organizationService.resetToDefault()
    this._feedback = 'Valores padrão restaurados com sucesso!'
    setTimeout(() => {
      this._feedback = null
    }, 4000)
  }

  render() {
    const cfg = this._form
    return html`
      <h1>Configurações da Organização</h1>
      <p class="breadcrumb">Config &gt; Organização</p>
      <p class="hint">
        Personalize a identidade institucional da sua marca no App Shell. As mudanças de nome, logotipo e cor
        primária são aplicadas em tempo real em todo o ecossistema.
      </p>

      ${this._feedback
        ? html`
            <div class="feedback success" role="alert">
              <md-icon>check_circle</md-icon>
              <span>${this._feedback}</span>
            </div>
          `
        : ''}

      <!-- Cartão de Preview em Tempo Real -->
      <div class="preview-card" aria-label="Pré-visualização da Marca">
        <div class="preview-header">
          ${cfg.logo
            ? html`<img class="preview-logo" src=${cfg.logo} alt="Logotipo da Organização" />`
            : html`<md-icon style="font-size: 36px; width: 36px; height: 36px;">corporate_fare</md-icon>`}
          <div class="preview-titles">
            <h2>${cfg.name || 'Nome da Organização'}</h2>
            <div class="preview-tagline">${cfg.tagline || 'Slogan ou ramo de atividade'}</div>
          </div>
        </div>

        <div class="preview-meta">
          ${cfg.supportEmail
            ? html`
                <span class="meta-item">
                  <md-icon>mail</md-icon>
                  ${cfg.supportEmail}
                </span>
              `
            : ''}
          ${cfg.website
            ? html`
                <span class="meta-item">
                  <md-icon>language</md-icon>
                  ${cfg.website}
                </span>
              `
            : ''}
          ${cfg.primaryColor
            ? html`
                <span class="meta-item">
                  <span class="color-swatch" style="background: ${cfg.primaryColor};"></span>
                  Cor Corporativa: ${cfg.primaryColor}
                </span>
              `
            : ''}
        </div>

        ${cfg.footerText
          ? html`<div class="preview-footer">${cfg.footerText}</div>`
          : ''}
      </div>

      <!-- Formulário de Customização -->
      <form @submit=${this._handleSubmit}>
        <md-outlined-text-field
          label="Nome da Organização / Razão Social"
          name="name"
          .value=${cfg.name || ''}
          @input=${this._onFieldChange}
          required
        ></md-outlined-text-field>

        <md-outlined-text-field
          label="Slogan / Tagline Institucional"
          name="tagline"
          .value=${cfg.tagline || ''}
          @input=${this._onFieldChange}
        ></md-outlined-text-field>

        <md-outlined-text-field
          label="URL do Logotipo (SVG data URI ou link externo)"
          name="logo"
          .value=${cfg.logo || ''}
          @input=${this._onFieldChange}
          supporting-text="Recomendado: SVG data URI para suporte offline"
        ></md-outlined-text-field>

        <!-- Paleta de Cores e Identidade Visual -->
        <fieldset>
          <legend>Cor Institucional Primária</legend>
          <p class="hint" style="margin-bottom: 8px;">
            Escolha uma cor predefinida ou informe o código HEX correspondente:
          </p>
          <div class="preset-palette">
            ${BRAND_COLOR_PRESETS.map(
              (p) => html`
                <button
                  type="button"
                  class="palette-btn ${cfg.primaryColor === p.color ? 'selected' : ''}"
                  @click=${() => this._selectPresetColor(p.color)}
                >
                  <span class="color-swatch" style="background: ${p.color};"></span>
                  ${p.label}
                </button>
              `,
            )}
          </div>
          <div class="custom-color-row">
            <input
              type="color"
              class="custom-color-input"
              aria-label="Seletor de cor"
              .value=${cfg.primaryColor || '#0284c7'}
              @input=${(e) => this._selectPresetColor(e.target.value)}
            />
            <md-outlined-text-field
              label="Código HEX da Cor"
              name="primaryColor"
              .value=${cfg.primaryColor || ''}
              @input=${this._onFieldChange}
              style="flex: 1;"
            ></md-outlined-text-field>
          </div>
        </fieldset>

        <md-outlined-text-field
          label="E-mail de Suporte / Contato"
          name="supportEmail"
          type="email"
          .value=${cfg.supportEmail || ''}
          @input=${this._onFieldChange}
        ></md-outlined-text-field>

        <md-outlined-text-field
          label="Website Oficial / Portal Corporativo"
          name="website"
          type="url"
          .value=${cfg.website || ''}
          @input=${this._onFieldChange}
        ></md-outlined-text-field>

        <md-outlined-text-field
          label="Texto de Rodapé / Direitos Autorais"
          name="footerText"
          .value=${cfg.footerText || ''}
          @input=${this._onFieldChange}
        ></md-outlined-text-field>

        <div class="actions">
          <md-outlined-button type="button" @click=${this._handleReset}>
            Restaurar Padrão
          </md-outlined-button>
          <md-filled-button type="submit">
            Salvar Configurações
          </md-filled-button>
        </div>
      </form>
    `
  }
}

customElements.define('config-organization-view', ConfigOrganizationView)
