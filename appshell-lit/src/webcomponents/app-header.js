import { LitElement, html, css } from 'lit'
import { navigateHome } from '../router.js'
import './user-status.js'

/** Cabeçalho fixo do appshell: botão do menu, título e, à direita, o
 *  <user-status> (Entrar / notificações + conta). Expõe um <slot> para que
 *  um projeto derivado acrescente ações rápidas antes do user-status — sem
 *  precisar editar este arquivo.
 *
 *  Não abre o drawer por conta própria: dispara `menu-toggle` e quem hospeda
 *  (app-shell) decide. */
export class AppHeader extends LitElement {
  static properties = {
    heading: {},
    logo: { type: String },
    tagline: { type: String },
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 0 0 auto;
      min-height: 56px;
      padding: 0 8px;
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      border-bottom: 1px solid var(--md-sys-color-outline);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
      cursor: pointer;
      user-select: none;
    }
    .brand-logo {
      height: 32px;
      max-width: 120px;
      object-fit: contain;
      flex-shrink: 0;
      border-radius: 4px;
    }
    .brand-titles {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }
    h1 {
      font-size: 1.1rem;
      margin: 0;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .brand-tagline {
      font-size: 0.72rem;
      color: var(--md-sys-color-on-surface-variant);
      margin: 0;
      line-height: 1.1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  `

  constructor() {
    super()
    this.heading = 'Fund Appshell'
    this.logo = ''
    this.tagline = ''
  }

  render() {
    return html`
      <md-icon-button
        aria-label="Menu"
        @click=${() => this.dispatchEvent(new CustomEvent('menu-toggle', { bubbles: true, composed: true }))}
      >
        <md-icon>menu</md-icon>
      </md-icon-button>
      <div class="brand" @click=${navigateHome} role="button" tabindex="0">
        ${this.logo ? html`<img class="brand-logo" src=${this.logo} alt="" />` : ''}
        <div class="brand-titles">
          <h1>${this.heading}</h1>
          ${this.tagline ? html`<span class="brand-tagline">${this.tagline}</span>` : ''}
        </div>
      </div>
      <div class="actions">
        <slot></slot>
        <user-status></user-status>
      </div>
    `
  }
}

customElements.define('app-header', AppHeader)
