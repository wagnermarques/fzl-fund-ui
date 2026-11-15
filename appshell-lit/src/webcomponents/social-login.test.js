// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@fzl/webcomponents-lit/social-login';
import { parseJwtPayload } from '@fzl/webcomponents-lit/social-login';

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

  it('executa login com Google no modo demonstração com eventos disparados', async () => {
    const startSpy = vi.fn();
    const successSpy = vi.fn();
    el.addEventListener('fzl-social-login-start', startSpy);
    el.addEventListener('fzl-social-login-success', successSpy);

    const googleBtn = el.shadowRoot.querySelector('.btn-google');
    googleBtn.click();

    // Espera conclusão do login simulado
    await new Promise((r) => setTimeout(r, 450));
    await el.updateComplete;

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.calls[0][0].detail.provider).toBe('google');

    expect(successSpy).toHaveBeenCalledTimes(1);
    const result = successSpy.mock.calls[0][0].detail;
    expect(result.provider).toBe('google');
    expect(result.user.email).toBe('usuario.google@gmail.com');
  });

  it('executa login com Microsoft no modo demonstração com eventos disparados', async () => {
    const startSpy = vi.fn();
    const successSpy = vi.fn();
    el.addEventListener('fzl-social-login-start', startSpy);
    el.addEventListener('fzl-social-login-success', successSpy);

    const msBtn = el.shadowRoot.querySelector('.btn-microsoft');
    msBtn.click();

    await new Promise((r) => setTimeout(r, 450));
    await el.updateComplete;

    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy.mock.calls[0][0].detail.provider).toBe('microsoft');

    expect(successSpy).toHaveBeenCalledTimes(1);
    const result = successSpy.mock.calls[0][0].detail;
    expect(result.provider).toBe('microsoft');
    expect(result.user.email).toBe('usuario.ms@outlook.com');
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
