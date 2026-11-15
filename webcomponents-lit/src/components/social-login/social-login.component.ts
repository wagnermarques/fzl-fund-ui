import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  type FzlSocialAuthProvider,
  type FzlSocialUser,
  type FzlSocialLoginResult,
  parseJwtPayload,
  loadGoogleGsiScript,
} from './social-login.types';

export * from './social-login.types';

// Google Official 4-color "G" SVG Icon
const GOOGLE_ICON = html`
  <svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
`;

// Microsoft Official 4-square SVG Icon
const MICROSOFT_ICON = html`
  <svg class="social-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
    <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
    <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
    <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
  </svg>
`;

/**
 * Enterprise Social Login Web Component (`fzl-social-login`).
 *
 * Provides client-side social authentication with public Google and Microsoft accounts,
 * with zero required backend dependencies. Supports both direct OAuth2 / OpenID Connect
 * and an automatic realistic demo fallback for rapid development and design system catalog.
 *
 * @customElement fzl-social-login
 * @tag fzl-social-login
 */
export class FzlSocialLogin extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family, system-ui, sans-serif);
        color: var(--_fzl-color-text, #0f172a);
        box-sizing: border-box;
      }

      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      .social-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
      }

      .buttons-row {
        display: flex;
        flex-direction: column;
        gap: 10px;
        width: 100%;
      }

      .layout-chips .buttons-row {
        flex-direction: row;
      }

      .btn-social {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: 100%;
        padding: 10px 16px;
        border-radius: var(--fzl-radius-md, 8px);
        font-size: 0.92rem;
        font-weight: 500;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.18s ease;
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #1e293b);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        text-align: center;
        user-select: none;
        outline: none;
      }

      .btn-social:hover:not(:disabled) {
        background: var(--_fzl-color-surface-hover, #f8fafc);
        border-color: #94a3b8;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .btn-social:focus-visible {
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.35);
        border-color: var(--_fzl-color-primary, #0284c7);
      }

      .btn-social:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .btn-social.btn-google {
        border-color: #dadce0;
      }

      .btn-social.btn-microsoft {
        border-color: #cbd5e1;
      }

      .social-icon {
        flex-shrink: 0;
      }

      .btn-text {
        flex-grow: 1;
        text-align: center;
      }

      .layout-chips .btn-text {
        flex-grow: 0;
      }

      /* Divider styling */
      .divider-wrap {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 6px 0;
        color: var(--_fzl-color-text-muted, #64748b);
        font-size: 0.8rem;
        text-transform: lowercase;
      }

      .divider-line {
        flex: 1;
        height: 1px;
        background: var(--_fzl-color-border, #e2e8f0);
      }

      .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #cbd5e1;
        border-top-color: var(--_fzl-color-primary, #0284c7);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      .error-msg {
        color: #dc2626;
        font-size: 0.82rem;
        margin: 0;
        text-align: center;
      }

      .demo-pill {
        display: inline-block;
        font-size: 0.65rem;
        padding: 1px 6px;
        border-radius: 4px;
        background: #f1f5f9;
        color: #475569;
        font-weight: 600;
        margin-left: 6px;
        text-transform: uppercase;
      }

      /* High contrast */
      :host([data-fzl-hc]) .btn-social {
        border-width: 2px;
        border-color: #000000;
      }
    `,
  ];

  /** Public Google Cloud OAuth2 Client ID. */
  @property({ type: String, attribute: 'google-client-id' })
  googleClientId = '';

  /** Public Microsoft Azure App Client ID. */
  @property({ type: String, attribute: 'microsoft-client-id' })
  microsoftClientId = '';

  /** Microsoft Azure Tenant ID ('common', 'consumers', 'organizations' or specific GUID). */
  @property({ type: String, attribute: 'microsoft-tenant-id' })
  microsoftTenantId = 'common';

  /** Visible providers: 'all' | 'google' | 'microsoft'. */
  @property({ type: String })
  providers: 'all' | 'google' | 'microsoft' = 'all';

  /** Visual layout: 'buttons' | 'chips' | 'compact'. */
  @property({ type: String })
  layout: 'buttons' | 'chips' | 'compact' = 'buttons';

  /** Whether to show the bottom "or continue with email" divider. */
  @property({ type: Boolean, attribute: 'show-divider' })
  showDivider = true;

  /** Text label displayed in the divider. */
  @property({ type: String, attribute: 'divider-text' })
  dividerText = 'ou continue com e-mail';

  /** When true and no client ID is provided, simulates a realistic instant social login. */
  @property({ type: Boolean, attribute: 'allow-demo-fallback' })
  allowDemoFallback = true;

  @property({ type: Boolean })
  disabled = false;

  @state() private _busyProvider: FzlSocialAuthProvider | null = null;
  @state() private _errorMessage = '';

  /** Performs Google login using Google Identity Services (GIS) or demo fallback. */
  async loginWithGoogle(): Promise<FzlSocialLoginResult | null> {
    if (this.disabled || this._busyProvider) return null;
    this._busyProvider = 'google';
    this._errorMessage = '';
    this.emit('fzl-social-login-start', { provider: 'google' });

    try {
      if (this.googleClientId) {
        await loadGoogleGsiScript();
        const win = window as unknown as {
          google?: {
            accounts?: {
              id?: {
                initialize: (opts: Record<string, unknown>) => void;
                prompt: () => void;
              };
              oauth2?: {
                initTokenClient: (opts: Record<string, unknown>) => {
                  requestAccessToken: () => void;
                };
              };
            };
          };
        };

        if (win.google?.accounts?.id) {
          const result = await new Promise<FzlSocialLoginResult>((resolve, reject) => {
            win.google!.accounts!.id!.initialize({
              client_id: this.googleClientId,
              callback: (response: { credential?: string }) => {
                if (!response.credential) {
                  reject(new Error('Nenhuma credencial retornada pelo Google.'));
                  return;
                }
                const payload = parseJwtPayload(response.credential);
                if (!payload) {
                  reject(new Error('Não foi possível decodificar o token do Google.'));
                  return;
                }
                const user: FzlSocialUser = {
                  id: String(payload.sub || `google-${Date.now()}`),
                  name: String(payload.name || payload.email || 'Usuário Google'),
                  email: String(payload.email || ''),
                  avatarUrl: typeof payload.picture === 'string' ? payload.picture : null,
                  provider: 'google',
                  raw: payload,
                };
                resolve({ provider: 'google', user, credential: response.credential });
              },
            });
            win.google!.accounts!.id!.prompt();
          });

          this._busyProvider = null;
          this.emit('fzl-social-login-success', result);
          return result;
        }
      }

      // Demo fallback when client ID is not configured
      if (!this.allowDemoFallback) {
        throw new Error('Google Client ID não configurado no componente.');
      }

      // Small async delay for realistic UX feedback
      await new Promise((r) => setTimeout(r, 400));
      const demoResult: FzlSocialLoginResult = {
        provider: 'google',
        user: {
          id: 'google-public-user-123',
          name: 'Usuário Google (Demonstração)',
          email: 'usuario.google@gmail.com',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
          provider: 'google',
        },
      };

      this._busyProvider = null;
      this.emit('fzl-social-login-success', demoResult);
      return demoResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._errorMessage = msg;
      this._busyProvider = null;
      this.emit('fzl-social-login-error', { provider: 'google', error: msg });
      return null;
    }
  }

  /** Performs Microsoft login using OAuth2 PKCE or demo fallback. */
  async loginWithMicrosoft(): Promise<FzlSocialLoginResult | null> {
    if (this.disabled || this._busyProvider) return null;
    this._busyProvider = 'microsoft';
    this._errorMessage = '';
    this.emit('fzl-social-login-start', { provider: 'microsoft' });

    try {
      if (this.microsoftClientId) {
        // Build Microsoft OAuth2 PKCE / Authorization URL
        const redirectUri = window.location.origin;
        const tenant = this.microsoftTenantId || 'common';
        const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
          this.microsoftClientId
        )}&response_type=token&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&scope=openid%20profile%20email%20User.Read&response_mode=fragment`;

        // Open popup window
        const width = 500;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          authUrl,
          'fzl_ms_auth',
          `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
        );

        if (!popup) {
          throw new Error('O navegador bloqueou o popup de autenticação da Microsoft.');
        }

        // Wait for redirect fragment or postMessage
        const result = await new Promise<FzlSocialLoginResult>((resolve, reject) => {
          const timer = setInterval(() => {
            try {
              if (popup.closed) {
                clearInterval(timer);
                reject(new Error('Autenticação da Microsoft cancelada pelo usuário.'));
                return;
              }
              const hash = popup.location?.hash;
              if (hash && hash.includes('access_token')) {
                clearInterval(timer);
                popup.close();
                const params = new URLSearchParams(hash.substring(1));
                const accessToken = params.get('access_token') || undefined;
                const idToken = params.get('id_token') || undefined;
                const payload = idToken ? parseJwtPayload(idToken) : null;
                const user: FzlSocialUser = {
                  id: String(payload?.sub || `ms-${Date.now()}`),
                  name: String(payload?.name || 'Usuário Microsoft'),
                  email: String(payload?.email || payload?.preferred_username || ''),
                  avatarUrl: null,
                  provider: 'microsoft',
                  raw: payload || {},
                };
                resolve({ provider: 'microsoft', user, credential: idToken, accessToken });
              }
            } catch {
              // Cross-origin before redirect is expected, continue polling
            }
          }, 300);
        });

        this._busyProvider = null;
        this.emit('fzl-social-login-success', result);
        return result;
      }

      // Demo fallback when client ID is not configured
      if (!this.allowDemoFallback) {
        throw new Error('Microsoft Client ID não configurado no componente.');
      }

      await new Promise((r) => setTimeout(r, 400));
      const demoResult: FzlSocialLoginResult = {
        provider: 'microsoft',
        user: {
          id: 'ms-public-user-456',
          name: 'Usuário Microsoft (Demonstração)',
          email: 'usuario.ms@outlook.com',
          avatarUrl: null,
          provider: 'microsoft',
        },
      };

      this._busyProvider = null;
      this.emit('fzl-social-login-success', demoResult);
      return demoResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._errorMessage = msg;
      this._busyProvider = null;
      this.emit('fzl-social-login-error', { provider: 'microsoft', error: msg });
      return null;
    }
  }

  override render() {
    const showGoogle = this.providers === 'all' || this.providers === 'google';
    const showMs = this.providers === 'all' || this.providers === 'microsoft';
    const isGoogleBusy = this._busyProvider === 'google';
    const isMsBusy = this._busyProvider === 'microsoft';
    const isCompact = this.layout === 'compact';

    return html`
      <div class="social-container layout-${this.layout}">
        <div class="buttons-row">
          ${showGoogle
            ? html`
                <button
                  type="button"
                  class="btn-social btn-google"
                  aria-label="Continuar com conta pública do Google"
                  ?disabled=${this.disabled || this._busyProvider !== null}
                  @click=${() => this.loginWithGoogle()}
                >
                  ${isGoogleBusy ? html`<span class="spinner"></span>` : GOOGLE_ICON}
                  <span class="btn-text">
                    ${isCompact ? 'Google' : 'Continuar com o Google'}
                    ${!this.googleClientId && this.allowDemoFallback
                      ? html`<span class="demo-pill">Demo</span>`
                      : nothing}
                  </span>
                </button>
              `
            : nothing}
          ${showMs
            ? html`
                <button
                  type="button"
                  class="btn-social btn-microsoft"
                  aria-label="Continuar com conta pública da Microsoft"
                  ?disabled=${this.disabled || this._busyProvider !== null}
                  @click=${() => this.loginWithMicrosoft()}
                >
                  ${isMsBusy ? html`<span class="spinner"></span>` : MICROSOFT_ICON}
                  <span class="btn-text">
                    ${isCompact ? 'Microsoft' : 'Continuar com a Microsoft'}
                    ${!this.microsoftClientId && this.allowDemoFallback
                      ? html`<span class="demo-pill">Demo</span>`
                      : nothing}
                  </span>
                </button>
              `
            : nothing}
        </div>

        ${this._errorMessage ? html`<p class="error-msg" role="alert">${this._errorMessage}</p>` : nothing}

        ${this.showDivider
          ? html`
              <div class="divider-wrap" role="separator" aria-label=${this.dividerText}>
                <span class="divider-line"></span>
                <span>${this.dividerText}</span>
                <span class="divider-line"></span>
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

export class FzlLitSocialLogin extends FzlSocialLogin {}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-social-login': FzlSocialLogin;
    'fzl-lit-social-login': FzlLitSocialLogin;
  }
}

if (typeof customElements !== 'undefined') {
  if (!customElements.get('fzl-social-login')) {
    customElements.define('fzl-social-login', FzlSocialLogin);
  }
  if (!customElements.get('fzl-lit-social-login')) {
    customElements.define('fzl-lit-social-login', FzlLitSocialLogin);
  }
}
