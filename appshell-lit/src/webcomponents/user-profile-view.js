import { LitElement, html, css } from 'lit'
import { authService } from '../services/auth-service.js'
import { navigateToLogin, navigateToChangePassword } from '../router.js'
import '@fzl/webcomponents-lit/avatar-upload'

/**
 * Tela de Perfil do Usuário (<user-profile-view>).
 *
 * Exibe os dados do usuário conectado, formulário para edição de dados pessoais,
 * e integra o Web Component <fzl-lit-avatar-upload> para seleção e recorte redondo
 * de foto de perfil.
 *
 * É totalmente desacoplado do backend:
 * - Salva e reage via `authService.updateProfile(...)`
 * - Emite os eventos customizados `profile-save` e `profile-avatar-change` para
 *   que qualquer aplicação consumidora possa plugar APIs REST, GraphQL, S3, etc.
 *
 * @customElement user-profile-view
 * @fires {CustomEvent} profile-save - Disparado quando os dados de perfil são salvos
 * @fires {CustomEvent} profile-avatar-change - Disparado quando a foto é recortada
 */
export class UserProfileView extends LitElement {
  static properties = {
    _user: { state: true },
    _busy: { state: true },
    _successMessage: { state: true },
    _errorMessage: { state: true },
  }

  static styles = css`
    :host {
      display: block;
      max-width: 680px;
      margin: 0 auto;
      padding: 24px 20px 80px;
      font-family: inherit;
      color: var(--md-sys-color-on-surface, #1e293b);
      box-sizing: border-box;
    }

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .profile-card {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
      border-radius: 16px;
      padding: 28px 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }

    .header {
      margin-bottom: 28px;
      text-align: center;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 6px;
      color: var(--md-sys-color-on-surface, #0f172a);
    }

    .subtitle {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant, #64748b);
      font-size: 0.95rem;
    }

    /* Avatar section */
    .avatar-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
    }

    .avatar-hint {
      margin-top: 8px;
      font-size: 0.8rem;
      color: var(--md-sys-color-on-surface-variant, #64748b);
      text-align: center;
      max-width: 320px;
    }

    /* Form grid */
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    @media (max-width: 580px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }

    .full-width {
      grid-column: 1 / -1;
    }

    md-outlined-text-field {
      width: 100%;
    }

    /* Metadata DL */
    .metadata-box {
      margin-top: 12px;
      padding: 16px;
      border-radius: 12px;
      background: var(--md-sys-color-surface-container-low, #f8fafc);
      border: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 16px;
      font-size: 0.875rem;
    }

    .metadata-box dt {
      color: var(--md-sys-color-on-surface-variant, #64748b);
      font-weight: 500;
    }

    .metadata-box dd {
      margin: 0;
      color: var(--md-sys-color-on-surface, #0f172a);
    }

    /* Feedback Alerts */
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      animation: fadeIn 200ms ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .alert-success {
      background-color: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .alert-error {
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    /* Actions bar */
    .actions-bar {
      margin-top: 24px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 20px;
      border-top: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
    }

    .action-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Not logged in banner */
    .not-logged-in-card {
      text-align: center;
      padding: 48px 24px;
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
      border-radius: 16px;
    }

    .not-logged-in-card md-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--md-sys-color-primary, #1d4ed8);
      margin-bottom: 16px;
    }

    .demo-btn-group {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
  `

  constructor() {
    super()
    this._user = null
    this._busy = false
    this._successMessage = null
    this._errorMessage = null
  }

  connectedCallback() {
    super.connectedCallback()
    this._unsubscribe = authService.subscribe((user) => {
      this._user = user
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this._unsubscribe?.()
  }

  /** Trata a alteração/corte da foto de perfil pelo componente <fzl-lit-avatar-upload> */
  async _handleAvatarChange(e) {
    const detail = e.detail
    this._errorMessage = null

    // Emite evento configurável para escuta externa (ex: upload em S3 / API)
    this.dispatchEvent(
      new CustomEvent('profile-avatar-change', {
        bubbles: true,
        composed: true,
        detail,
      })
    )

    if (this._user) {
      try {
        await authService.updateProfile({ avatarUrl: detail.dataUrl })
        this._successMessage = 'Foto de perfil recortada e salva com sucesso!'
        setTimeout(() => {
          if (this._successMessage?.includes('Foto')) this._successMessage = null
        }, 3500)
      } catch (err) {
        this._errorMessage = err.message
      }
    }
  }

  /** Trata a remoção da foto de perfil */
  async _handleAvatarRemove() {
    this._errorMessage = null
    if (this._user) {
      try {
        await authService.updateProfile({ avatarUrl: null })
        this._successMessage = 'Foto de perfil removida com sucesso.'
        setTimeout(() => {
          if (this._successMessage?.includes('removida')) this._successMessage = null
        }, 3500)
      } catch (err) {
        this._errorMessage = err.message
      }
    }
  }

  /** Salva alterações nos campos do formulário */
  async _handleFormSubmit(e) {
    e.preventDefault()
    const form = e.target
    if (!form.reportValidity()) return

    const fields = Object.fromEntries(
      [...form.querySelectorAll('md-outlined-text-field')].map((f) => [f.name, f.value.trim()])
    )

    this._busy = true
    this._errorMessage = null
    this._successMessage = null

    try {
      const updatedUser = await authService.updateProfile({
        name: fields.name,
        role: fields.role,
        phone: fields.phone,
        bio: fields.bio,
      })

      // Emite evento configurável para que o backend possa sincronizar
      this.dispatchEvent(
        new CustomEvent('profile-save', {
          bubbles: true,
          composed: true,
          detail: { user: updatedUser, fields },
        })
      )

      this._successMessage = 'Dados de perfil atualizados com sucesso!'
      setTimeout(() => {
        this._successMessage = null
      }, 4000)
    } catch (err) {
      this._errorMessage = err.message || 'Erro ao atualizar perfil.'
    } finally {
      this._busy = false
    }
  }

  /** Atalho para facilitar demonstração e testes quando o usuário ainda não logou */
  async _loginDemoUser() {
    this._busy = true
    try {
      // Tenta entrar com usuário demo ou cria
      try {
        await authService.signIn({ email: 'demo@fzl.com', password: 'demo12345' })
      } catch {
        await authService.signUp({
          name: 'Wagner Marques',
          email: 'demo@fzl.com',
          password: 'demo12345',
        })
        await authService.updateProfile({
          role: 'Arquiteto de Software',
          bio: 'Especialista em Web Components e Arquitetura Frontend',
          phone: '+55 (11) 98765-4321',
        })
      }
    } catch (err) {
      this._errorMessage = err.message
    } finally {
      this._busy = false
    }
  }

  render() {
    if (!this._user) {
      return html`
        <div class="not-logged-in-card">
          <md-icon>account_circle</md-icon>
          <h1>Minha Conta</h1>
          <p class="subtitle">Você precisa estar conectado para visualizar e editar seu perfil.</p>
          <div class="demo-btn-group">
            <md-filled-button @click=${navigateToLogin}>Entrar</md-filled-button>
            <md-outlined-button @click=${this._loginDemoUser} ?disabled=${this._busy}>
              Entrar como Usuário Demo
            </md-outlined-button>
          </div>
        </div>
      `
    }

    const sinceDate = this._user.createdAt
      ? new Date(this._user.createdAt).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : 'Hoje'

    return html`
      <div class="profile-card">
        <div class="header">
          <h1>Meu Perfil</h1>
          <p class="subtitle">Gerencie suas informações pessoais e foto de perfil</p>
        </div>

        ${this._successMessage
          ? html`
              <div class="alert alert-success" role="status">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>${this._successMessage}</span>
              </div>
            `
          : ''}
        ${this._errorMessage
          ? html`
              <div class="alert alert-error" role="alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                  />
                </svg>
                <span>${this._errorMessage}</span>
              </div>
            `
          : ''}

        <!-- Seção do Avatar com Recorte Redondo -->
        <div class="avatar-section">
          <fzl-lit-avatar-upload
            .src=${this._user.avatarUrl || ''}
            .name=${this._user.name || ''}
            size="130"
            cropTitle="Recortar foto de perfil"
            buttonLabel="Alterar foto"
            @fzl-avatar-change=${this._handleAvatarChange}
            @fzl-avatar-remove=${this._handleAvatarRemove}
          ></fzl-lit-avatar-upload>
          <p class="avatar-hint">
            Formatos suportados: PNG, JPG, WebP. Clique na imagem para selecionar e aplicar o enquadramento redondo.
          </p>
        </div>

        <!-- Formulário de Dados Pessoais -->
        <form @submit=${this._handleFormSubmit} novalidate>
          <div class="form-grid">
            <div class="full-width">
              <md-outlined-text-field
                name="name"
                label="Nome completo"
                .value=${this._user.name || ''}
                autocomplete="name"
                required
              ></md-outlined-text-field>
            </div>

            <md-outlined-text-field
              name="email"
              label="E-mail principal"
              .value=${this._user.email || ''}
              type="email"
              disabled
              supporting-text="O e-mail é utilizado para identificação da conta."
            ></md-outlined-text-field>

            <md-outlined-text-field
              name="role"
              label="Cargo / Função"
              .value=${this._user.role || ''}
              placeholder="Ex: Gestor de Fundos, Analista"
            ></md-outlined-text-field>

            <div class="full-width">
              <md-outlined-text-field
                name="phone"
                label="Telefone / Celular"
                .value=${this._user.phone || ''}
                placeholder="+55 (11) 98765-4321"
                type="tel"
              ></md-outlined-text-field>
            </div>

            <div class="full-width">
              <md-outlined-text-field
                name="bio"
                label="Biografia / Sobre você"
                .value=${this._user.bio || ''}
                type="textarea"
                rows="3"
                placeholder="Breve resumo da sua experiência ou áreas de atuação"
              ></md-outlined-text-field>
            </div>
          </div>

          <!-- Metadados do Sistema -->
          <dl class="metadata-box">
            <dt>Membro desde:</dt>
            <dd>${sinceDate}</dd>
            <dt>Autenticação:</dt>
            <dd>${authService.isLocal() ? 'Modo Local de Demonstração' : 'Provedor Integrado'}</dd>
            <dt>ID da Conta:</dt>
            <dd><code>${this._user.id}</code></dd>
          </dl>

          <!-- Barra de Ações -->
          <div class="actions-bar">
            <div class="action-group">
              <md-filled-button type="submit" ?disabled=${this._busy}>
                <md-icon slot="icon">save</md-icon>
                Salvar alterações
              </md-filled-button>

              ${authService.supports('changePassword')
                ? html`
                    <md-outlined-button type="button" @click=${navigateToChangePassword}>
                      <md-icon slot="icon">password</md-icon>
                      Alterar senha
                    </md-outlined-button>
                  `
                : ''}
            </div>

            <div class="action-group">
              <md-text-button
                type="button"
                @click=${() => authService.signOut()}
                style="--md-text-button-label-text-color: var(--md-sys-color-error, #b91c1c);"
              >
                <md-icon slot="icon">logout</md-icon>
                Sair da conta
              </md-text-button>
            </div>
          </div>
        </form>
      </div>
    `
  }
}

customElements.define('user-profile-view', UserProfileView)
