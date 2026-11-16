// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@fzl/webcomponents-lit/social-login';
import { parseJwtPayload } from '@fzl/webcomponents-lit/social-login';

function createMockJwt(payloadObj) {
  const encode = (obj) =>
    btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode(payloadObj)}.mockSig`;
}

describe('FzlSocialLogin Web Component (<fzl-social-login>)', () => {
  /** @type {import('@fzl/webcomponents-lit/social-login').FzlSocialLogin} */
  let el;

  beforeEach(async () => {
    el = document.createElement('fzl-social-login');
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el?.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete window.google;
    delete window.__fzlGisCallback;
  });

  it('registra os custom elements fzl-social-login e fzl-lit-social-login', () => {
    expect(customElements.get('fzl-social-login')).toBeDefined();
    expect(customElements.get('fzl-lit-social-login')).toBeDefined();
  });

  it('renderiza ambos os botões Google e Microsoft por padrão', () => {
    const googleBtn = el.shadowRoot.querySelector('.btn-google');
    const msBtn = el.shadowRoot.querySelector('.btn-microsoft');
    expect(googleBtn).not.toBeNull();
    expect(msBtn).not.toBeNull();
    expect(googleBtn.textContent).toContain('Continuar com o Google');
    expect(msBtn.textContent).toContain('Continuar com a Microsoft');
  });

  it('filtra provedores através da propriedade providers', async () => {
    el.providers = 'google';
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.btn-google')).not.toBeNull();
    expect(el.shadowRoot.querySelector('.btn-microsoft')).toBeNull();

    el.providers = 'microsoft';
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.btn-google')).toBeNull();
    expect(el.shadowRoot.querySelector('.btn-microsoft')).not.toBeNull();
  });

  it('emite fzl-social-login-error quando Client ID não está configurado', async () => {
    const errorSpy = vi.fn();
    const successSpy = vi.fn();
    el.addEventListener('fzl-social-login-error', errorSpy);
    el.addEventListener('fzl-social-login-success', successSpy);

    el.shadowRoot.querySelector('.btn-google').click();
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;

    expect(successSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0].detail).toEqual({
      provider: 'google',
      error: 'Google Client ID não configurado.',
    });

    el.shadowRoot.querySelector('.btn-microsoft').click();
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;

    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[1][0].detail).toEqual({
      provider: 'microsoft',
      error: 'Microsoft Client ID não configurado.',
    });
    expect(el.shadowRoot.querySelector('.demo-pill')).toBeNull();
  });

  it('executa login com Google via Google Identity Services (GIS) quando configurado', async () => {
    const credential = createMockJwt({
      sub: 'google-sub-ana',
      name: 'Ana Silva',
      email: 'ana.silva@gmail.com',
      picture: 'https://lh3.googleusercontent.com/a/ana',
    });
    vi.stubGlobal('google', {
      accounts: {
        id: {
          initialize: (opts) => {
            window.__fzlGisCallback = opts.callback;
          },
          prompt: () => {
            window.__fzlGisCallback?.({ credential });
          },
        },
      },
    });

    el.googleClientId = 'test-google-client.apps.googleusercontent.com';
    await el.updateComplete;

    const startSpy = vi.fn();
    const successSpy = vi.fn();
    el.addEventListener('fzl-social-login-start', startSpy);
    el.addEventListener('fzl-social-login-success', successSpy);

    el.shadowRoot.querySelector('.btn-google').click();
    await new Promise((r) => setTimeout(r, 20));
    await el.updateComplete;

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.calls[0][0].detail.provider).toBe('google');

    expect(successSpy).toHaveBeenCalledTimes(1);
    const result = successSpy.mock.calls[0][0].detail;
    expect(result.provider).toBe('google');
    expect(result.user.email).toBe('ana.silva@gmail.com');
    expect(result.user.name).toBe('Ana Silva');
    expect(result.credential).toBe(credential);
  });

  it('faz fallback para popup OAuth2 do Google com escopo mínimo quando One Tap não é exibido', async () => {
    let requestedScope = '';
    vi.stubGlobal('google', {
      accounts: {
        id: {
          initialize: () => {},
          prompt: (momentListener) => {
            momentListener?.({
              isNotDisplayed: () => true,
              isSkippedMoment: () => false,
              isDismissedMoment: () => false,
            });
          },
        },
        oauth2: {
          initTokenClient: (opts) => {
            requestedScope = opts.scope;
            return {
              requestAccessToken: () => {
                opts.callback({ access_token: 'ya29.oauth2-popup-token' });
              },
            };
          },
        },
      },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        sub: 'google-popup-99',
        name: 'Bruno Popup',
        email: 'bruno.popup@gmail.com',
        picture: 'https://lh3.googleusercontent.com/a/bruno',
      }),
    });

    el.googleClientId = '71632020257-bunqshu7n4ein9v46amajmk21ts25b5p.apps.googleusercontent.com';
    el.requestDriveScope = false;
    await el.updateComplete;

    const successSpy = vi.fn();
    el.addEventListener('fzl-social-login-success', successSpy);

    el.shadowRoot.querySelector('.btn-google').click();
    await new Promise((r) => setTimeout(r, 30));
    await el.updateComplete;

    expect(requestedScope).toBe('openid profile email');
    expect(successSpy).toHaveBeenCalledTimes(1);
    const result = successSpy.mock.calls[0][0].detail;
    expect(result.user.email).toBe('bruno.popup@gmail.com');
    expect(result.accessToken).toBe('ya29.oauth2-popup-token');
  });

  it('executa login com Microsoft via popup OAuth2 quando configurado', async () => {
    const idToken = createMockJwt({
      sub: 'ms-sub-carlos',
      name: 'Carlos Souza',
      email: 'carlos.souza@outlook.com',
    });
    const popup = {
      closed: false,
      close: vi.fn(),
      location: {
        hash: `#access_token=EwB_mock_ms_token&id_token=${idToken}`,
      },
    };
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup);

    el.microsoftClientId = 'test-ms-client-id';
    await el.updateComplete;

    const startSpy = vi.fn();
    const successSpy = vi.fn();
    el.addEventListener('fzl-social-login-start', startSpy);
    el.addEventListener('fzl-social-login-success', successSpy);

    el.shadowRoot.querySelector('.btn-microsoft').click();
    await new Promise((r) => setTimeout(r, 380));
    await el.updateComplete;

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.calls[0][0].detail.provider).toBe('microsoft');

    expect(successSpy).toHaveBeenCalledTimes(1);
    const result = successSpy.mock.calls[0][0].detail;
    expect(result.provider).toBe('microsoft');
    expect(result.user.email).toBe('carlos.souza@outlook.com');
    expect(result.accessToken).toBe('EwB_mock_ms_token');
  });

  it('desabilita os botões quando a propriedade disabled está ativa', async () => {
    el.disabled = true;
    await el.updateComplete;

    const googleBtn = el.shadowRoot.querySelector('.btn-google');
    const msBtn = el.shadowRoot.querySelector('.btn-microsoft');
    expect(googleBtn.disabled).toBe(true);
    expect(msBtn.disabled).toBe(true);
  });

  it('decodifica tokens JWT / OpenID Connect corretamente via parseJwtPayload', () => {
    // Cria um JWT mock (header.payload.signature) com UTF-8 seguro
    const headerStr = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
    const payloadStr = JSON.stringify({
      sub: '10987654321',
      name: 'Usuário Teste Google',
      email: 'teste@gmail.com',
      picture: 'https://lh3.googleusercontent.com/avatar',
    });
    const header = btoa(headerStr);
    const payload = btoa(unescape(encodeURIComponent(payloadStr)));
    const token = `${header}.${payload}.mockSignature`;

    const parsed = parseJwtPayload(token);
    expect(parsed).not.toBeNull();
    expect(parsed.sub).toBe('10987654321');
    expect(parsed.name).toBe('Usuário Teste Google');
    expect(parsed.email).toBe('teste@gmail.com');
    expect(parsed.picture).toBe('https://lh3.googleusercontent.com/avatar');
  });
});
