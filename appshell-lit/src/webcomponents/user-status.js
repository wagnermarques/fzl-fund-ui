import { LitElement, html, css } from 'lit'
import { authService } from '../services/auth-service.js'
import { navigateToAccount, navigateToLogin } from '../router.js'
import './user-notifications.js'

/** Canto do usuário no header: botão "Entrar" quando ninguém está logado;
 *  com usuário logado, o sino de notificações + um avatar com menu
 *  (nome/e-mail, Minha conta, Sair). */
export class UserStatus extends LitElement {
  static properties = {
    _user: { state: true },
  }

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      font-size: 0.85rem;
      font-weight: 600;
      overflow: hidden;
    }
    .avatar-img {
      object-fit: cover;
      width: 100%;
      height: 100%;
    }
    md-menu {
      --md-menu-container-color: var(--md-sys-color-surface);
      min-width: 220px;
    }
    .who {
      padding: 12px 16px;
      line-height: 1.4;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .who-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
      font-weight: 600;
    }
    .who-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .who-details {
      min-width: 0;
    }
    .who .name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .who .email {
      font-size: 0.8rem;
      color: var(--md-sys-color-on-surface-variant);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `

  constructor() {
    super()
    this._user = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._unsubscribe = authService.subscribe((user) => (this._user = user))
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubscribe?.()
  }

  _initials(name) {
    const parts = name.trim().split(/\s+/)
    return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase()
  }

  _toggleMenu() {
    const menu = this.renderRoot.querySelector('md-menu')
    menu.open = !menu.open
  }

  render() {
    if (!this._user) {
      return html`
        <md-text-button @click=${navigateToLogin}>
          <md-icon slot="icon">login</md-icon>
          Entrar
        </md-text-button>
      `
    }

    return html`
      <user-notifications></user-notifications>
      <md-icon-button
        id="anchor"
        aria-label=${`Conta de ${this._user.name}`}
        title=${this._user.name}
        @click=${this._toggleMenu}
      >
        <span class="avatar">
          ${this._user.avatarUrl
            ? html`<img class="avatar-img" src=${this._user.avatarUrl} alt="" />`
            : this._initials(this._user.name)}
        </span>
      </md-icon-button>
      <md-menu anchor="anchor" positioning="popover" menu-corner="start-end" anchor-corner="end-end">
        <div class="who">
          <div class="who-avatar">
            ${this._user.avatarUrl
              ? html`<img src=${this._user.avatarUrl} alt="" />`
              : this._initials(this._user.name)}
          </div>
          <div class="who-details">
            <div class="name">${this._user.name}</div>
            <div class="email">${this._user.email}</div>
          </div>
        </div>
        <md-divider></md-divider>
        <md-menu-item @click=${navigateToAccount}>
          <md-icon slot="start">account_circle</md-icon>
          <div slot="headline">Minha conta</div>
        </md-menu-item>
        <md-menu-item @click=${() => authService.signOut()}>
          <md-icon slot="start">logout</md-icon>
          <div slot="headline">Sair</div>
        </md-menu-item>
      </md-menu>
    `
  }
}

customElements.define('user-status', UserStatus)
