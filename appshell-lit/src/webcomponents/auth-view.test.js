// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './auth-view.js';
import { authService, localProvider } from '../services/auth-service.js';

function memoryStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => (data[k] = String(v)),
    removeItem: (k) => delete data[k],
    data,
  };
}

describe('AuthView Web Component (<auth-view>) com Social Login', () => {
  /** @type {import('./auth-view.js').AuthView} */
  let el;

  beforeEach(async () => {
    vi.stubGlobal('localStorage', memoryStorage());
    authService.use(localProvider);
    authService.configureSocialAuth(null);
    await authService.signOut();

    el = document.createElement('auth-view');
    el.mode = 'signin';
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    authService.configureSocialAuth(null);
    el?.remove();
  });

  it('renderiza o componente fzl-social-login na tela de login', () => {
    const socialWidget = el.shadowRoot.querySelector('fzl-social-login');
    expect(socialWidget).not.toBeNull();
  });

  it('propaga googleClientId, microsoftClientId, microsoftTenantId e providers do authService para <fzl-social-login>', async () => {
    authService.configureSocialAuth({
      googleClientId: 'appshell-google-cid.apps.googleusercontent.com',
      microsoftTenantId: 'organizations',
    });
    await el.updateComplete;

    const socialWidget = el.shadowRoot.querySelector('fzl-social-login');
    expect(socialWidget).not.toBeNull();
    expect(socialWidget.googleClientId).toBe('appshell-google-cid.apps.googleusercontent.com');
    expect(socialWidget.microsoftClientId).toBe('');
    expect(socialWidget.microsoftTenantId).toBe('organizations');
    expect(socialWidget.providers).toBe('google');
    expect(socialWidget.requestDriveScope).toBe(false);
    expect(socialWidget.googleScopes).toBe('openid profile email');
    expect(socialWidget.microsoftScopes).toBe('openid profile email User.Read');

    authService.configureSocialAuth(false);
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('fzl-social-login')).toBeNull();
  });

  it('efetua login social com conta Google e autentica o usuário no authService', async () => {
    const socialWidget = el.shadowRoot.querySelector('fzl-social-login');
    expect(socialWidget).not.toBeNull();

    // Simula evento de sucesso emitido pelo fzl-social-login
    socialWidget.dispatchEvent(
      new CustomEvent('fzl-social-login-success', {
        bubbles: true,
        composed: true,
        detail: {
          provider: 'google',
          user: {
            id: 'google-test-123',
            name: 'Ana Google',
            email: 'ana.google@gmail.com',
            avatarUrl: 'https://lh3.googleusercontent.com/avatar',
            provider: 'google',
          },
        },
      })
    );

    // Aguarda atualização assíncrona
    await new Promise((r) => setTimeout(r, 50));
    await el.updateComplete;

    const user = authService.getCurrentUser();
    expect(user).not.toBeNull();
    expect(user.name).toBe('Ana Google');
    expect(user.email).toBe('ana.google@gmail.com');
  });
});
