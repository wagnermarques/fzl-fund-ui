/**
 * @license
 * FZL Software — Social Auth (Google & Microsoft) Reactive Controller
 */
import {
  loadGoogleGsiScript,
  parseJwtPayload,
  type FzlSocialAuthProvider,
  type FzlSocialLoginResult,
  type FzlSocialUser
} from '../components/social-login/social-login.types';
import { FzlBaseController, type FzlControllerHost } from './base.controller';

export interface FzlSocialAuthConfig {
  googleClientId?: string;
  microsoftClientId?: string;
  microsoftTenantId?: string;
  allowDemoFallback?: boolean;
  demoDelayMs?: number;
  requestDriveScope?: boolean;
  googleScopes?: string;
  microsoftScopes?: string;
}

/**
 * Controller reativo e headless para autenticação federada com Google Identity Services (GIS)
 * e Microsoft Entra / OAuth2, com suporte a escopos de Drive/OneDrive e fallback de demonstração.
 *
 * Extensível via herança (`extends FzlSocialAuthController`) pelos hooks protegidos
 * `onAuthenticated`, `createDemoResult` e `onAuthError`.
 */
export class FzlSocialAuthController extends FzlBaseController {
  private _config: FzlSocialAuthConfig;
  private _busyProvider: FzlSocialAuthProvider | null = null;
  private _errorMessage = '';
  private _lastResult: FzlSocialLoginResult | null = null;
  private _currentUser: FzlSocialUser | null = null;
  private _pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(host?: FzlControllerHost | null, config: FzlSocialAuthConfig = {}) {
    super(host);
    this._config = {
      microsoftTenantId: 'common',
      allowDemoFallback: true,
      demoDelayMs: 400,
      requestDriveScope: true,
      googleScopes: 'https://www.googleapis.com/auth/drive.file openid profile email',
      microsoftScopes: 'openid profile email User.Read Files.ReadWrite',
      ...config
    };
  }

  get config(): FzlSocialAuthConfig {
    return { ...this._config };
  }

  get busyProvider(): FzlSocialAuthProvider | null {
    return this._busyProvider;
  }

  get isBusy(): boolean {
    return this._busyProvider !== null;
  }

  get errorMessage(): string {
    return this._errorMessage;
  }

  get lastResult(): FzlSocialLoginResult | null {
    return this._lastResult;
  }

  get currentUser(): FzlSocialUser | null {
    return this._currentUser;
  }

  get isAuthenticated(): boolean {
    return this._currentUser !== null;
  }

  get accessToken(): string | null {
    return this._lastResult?.accessToken ?? null;
  }

  get cloudStorageProvider(): 'google-drive' | 'onedrive' | null {
    if (this._currentUser?.provider === 'google') return 'google-drive';
    if (this._currentUser?.provider === 'microsoft') return 'onedrive';
    return null;
  }

  /**
   * Atualiza configurações de provedores OAuth2 e fallback de demonstração.
   */
  configure(partial: Partial<FzlSocialAuthConfig>, notify = true): this {
    this._config = { ...this._config, ...partial };
    if (notify) {
      this.notifyChange();
    }
    return this;
  }

  override hostDisconnected(): void {
    this.clearPollTimer();
    super.hostDisconnected();
  }

  private clearPollTimer(): void {
    if (this._pollTimer !== null) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  /**
   * Executa autenticação via Google Identity Services (GIS) ou modo demonstração.
   */
  async loginWithGoogle(): Promise<FzlSocialLoginResult | null> {
    if (this._busyProvider) return null;
    this._busyProvider = 'google';
    this._errorMessage = '';
    this.emitHostEvent('fzl-social-login-start', { provider: 'google' as FzlSocialAuthProvider });
    this.notifyChange();

    try {
      let result: FzlSocialLoginResult | null = null;

      if (this._config.googleClientId) {
        await loadGoogleGsiScript();
        const win = window as unknown as {
          google?: {
            accounts?: {
              id?: {
                initialize: (opts: Record<string, unknown>) => void;
                prompt: () => void;
              };
            };
          };
        };

        if (win.google?.accounts?.id) {
          result = await new Promise<FzlSocialLoginResult>((resolve, reject) => {
            win.google!.accounts!.id!.initialize({
              client_id: this._config.googleClientId,
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
                  raw: payload
                };
                resolve({ provider: 'google', user, credential: response.credential });
              }
            });
            win.google!.accounts!.id!.prompt();
          });
        }
      }

      if (!result) {
        if (this._config.allowDemoFallback === false) {
          throw new Error('Google Client ID não configurado no componente.');
        }
        const delay = this._config.demoDelayMs ?? 400;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        result = await this.createDemoResult('google');
      }

      const finalResult = (await this.onAuthenticated(result)) ?? result;
      this._busyProvider = null;
      this._lastResult = finalResult;
      this._currentUser = finalResult.user;
      this.emitHostEvent('fzl-social-login-success', finalResult);
      this.notifyChange();
      return finalResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this._errorMessage = msg;
      this._busyProvider = null;
      await this.onAuthError('google', msg);
      this.emitHostEvent('fzl-social-login-error', {
        provider: 'google' as FzlSocialAuthProvider,
        error: msg
      });
      this.notifyChange();
      return null;
    }
  }

  /**
   * Executa autenticação via Microsoft Entra OAuth2 ou modo demonstração.
   */
  async loginWithMicrosoft(): Promise<FzlSocialLoginResult | null> {
    if (this._busyProvider) return null;
    this._busyProvider = 'microsoft';
    this._errorMessage = '';
    this.emitHostEvent('fzl-social-login-start', { provider: 'microsoft' as FzlSocialAuthProvider });
    this.notifyChange();

    try {
      let result: FzlSocialLoginResult | null = null;

      if (this._config.microsoftClientId) {
        const redirectUri = window.location.origin;
        const tenant = this._config.microsoftTenantId || 'common';
        const scopes =
          this._config.requestDriveScope !== false
            ? this._config.microsoftScopes || 'openid profile email User.Read Files.ReadWrite'
            : 'openid profile email User.Read';
        const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
          this._config.microsoftClientId
        )}&response_type=token&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&scope=${encodeURIComponent(scopes)}&response_mode=fragment`;

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

        result = await new Promise<FzlSocialLoginResult>((resolve, reject) => {
          this.clearPollTimer();
          this._pollTimer = setInterval(() => {
            try {
              if (popup.closed) {
                this.clearPollTimer();
                reject(new Error('Autenticação da Microsoft cancelada pelo usuário.'));
                return;
              }
              const hash = popup.location?.hash;
              if (hash && hash.includes('access_token')) {
                this.clearPollTimer();
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
                  raw: payload || {}
                };
                resolve({ provider: 'microsoft', user, credential: idToken, accessToken });
              }
            } catch {
              // Cross-origin antes do redirect é esperado durante o fluxo OAuth2
            }
          }, 300);
        });
      }

      if (!result) {
        if (this._config.allowDemoFallback === false) {
          throw new Error('Microsoft Client ID não configurado no componente.');
        }
        const delay = this._config.demoDelayMs ?? 400;
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        result = await this.createDemoResult('microsoft');
      }

      const finalResult = (await this.onAuthenticated(result)) ?? result;
      this._busyProvider = null;
      this._lastResult = finalResult;
      this._currentUser = finalResult.user;
      this.emitHostEvent('fzl-social-login-success', finalResult);
      this.notifyChange();
      return finalResult;
    } catch (err) {
      this.clearPollTimer();
      const msg = err instanceof Error ? err.message : String(err);
      this._errorMessage = msg;
      this._busyProvider = null;
      await this.onAuthError('microsoft', msg);
      this.emitHostEvent('fzl-social-login-error', {
        provider: 'microsoft' as FzlSocialAuthProvider,
        error: msg
      });
      this.notifyChange();
      return null;
    }
  }

  /**
   * Encerra a sessão social local mantida pelo controller.
   */
  logout(): void {
    const previous = this._currentUser;
    this.clearPollTimer();
    this._currentUser = null;
    this._lastResult = null;
    this._errorMessage = '';
    this._busyProvider = null;
    if (previous) {
      this.emitHostEvent('fzl-social-logout', { user: previous });
    }
    this.notifyChange();
  }

  /**
   * Requisita (ou reutiliza) um OAuth2 `accessToken` com escopo de escrita em nuvem
   * (`drive.file` para Google Drive / Docs e `Files.ReadWrite` para Microsoft OneDrive).
   */
  async requestCloudAccessToken(
    provider?: FzlSocialAuthProvider
  ): Promise<string | null> {
    const targetProvider = provider ?? this._currentUser?.provider;
    if (!targetProvider) return null;

    if (
      this._lastResult?.provider === targetProvider &&
      this._lastResult.accessToken
    ) {
      return this._lastResult.accessToken;
    }

    if (targetProvider === 'google' && this._config.googleClientId) {
      await loadGoogleGsiScript();
      const win = window as unknown as {
        google?: {
          accounts?: {
            oauth2?: {
              initTokenClient: (opts: Record<string, unknown>) => {
                requestAccessToken: () => void;
              };
            };
          };
        };
      };

      if (win.google?.accounts?.oauth2?.initTokenClient) {
        const scope =
          this._config.requestDriveScope !== false
            ? this._config.googleScopes ||
              'https://www.googleapis.com/auth/drive.file openid profile email'
            : 'openid profile email';

        const token = await new Promise<string>((resolve, reject) => {
          const tokenClient = win.google!.accounts!.oauth2!.initTokenClient({
            client_id: this._config.googleClientId,
            scope,
            callback: (response: { access_token?: string; error?: string }) => {
              if (response.access_token) {
                resolve(response.access_token);
              } else {
                reject(
                  new Error(
                    response.error || 'Não foi possível obter access_token do Google Drive.'
                  )
                );
              }
            }
          });
          tokenClient.requestAccessToken();
        });

        if (this._lastResult && this._lastResult.provider === 'google') {
          this._lastResult = { ...this._lastResult, accessToken: token };
        }
        this.notifyChange();
        return token;
      }
    }

    if (this._config.allowDemoFallback !== false) {
      const demoToken =
        targetProvider === 'google'
          ? 'demo-google-drive-oauth-token'
          : 'demo-ms-onedrive-oauth-token';
      if (this._lastResult && this._lastResult.provider === targetProvider) {
        this._lastResult = { ...this._lastResult, accessToken: demoToken };
      }
      this.notifyChange();
      return demoToken;
    }

    return null;
  }

  /**
   * Hook protegido que gera o usuário e resultado em modo demonstração.
   */
  protected async createDemoResult(
    provider: FzlSocialAuthProvider
  ): Promise<FzlSocialLoginResult> {
    if (provider === 'google') {
      return {
        provider: 'google',
        accessToken: 'demo-google-drive-oauth-token',
        user: {
          id: 'google-public-user-123',
          name: 'Usuário Google (Demonstração)',
          email: 'usuario.google@gmail.com',
          avatarUrl:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
          provider: 'google'
        }
      };
    }

    return {
      provider: 'microsoft',
      accessToken: 'demo-ms-onedrive-oauth-token',
      user: {
        id: 'ms-public-user-456',
        name: 'Usuário Microsoft (Demonstração)',
        email: 'usuario.ms@outlook.com',
        avatarUrl: null,
        provider: 'microsoft'
      }
    };
  }

  /**
   * Hook protegido invocado imediatamente após o provedor autenticar o usuário,
   * ideal para trocar o token no backend da aplicação ou enriquecer roles/tenant.
   */
  protected async onAuthenticated(
    result: FzlSocialLoginResult
  ): Promise<FzlSocialLoginResult | void> {
    return result;
  }

  /**
   * Hook protegido invocado quando ocorre erro na autenticação social.
   */
  protected async onAuthError(
    _provider: FzlSocialAuthProvider,
    _errorMessage: string
  ): Promise<void> {
    // Extensível em subclasses
  }
}
