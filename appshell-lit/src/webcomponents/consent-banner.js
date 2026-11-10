import { LitElement, html, css } from 'lit'
import { consentService } from '../services/consent-service.js'

/**
 * Componente: Consent Banner (`<consent-banner>`).
 *
 * Pede o consentimento para telemetria/analytics na primeira visita.
 * Conformidade com a LGPD (Lei 13.709/2018 Art. 8º §5º) e GDPR:
 *
 * - Posicionado "in-flow" imediatamente acima do rodapé (<app-footer>), sem
 *   backdrop intrusivo e sem criar armadilhas de teclado (WCAG 2.1/2.2 AAA).
 * - "Recusar" tem o mesmo peso visual de "Aceitar" (md-outlined-button),
 *   evitando dark patterns (padrões obscuros que forçam a aceitação).
 * - Opera no modo "Básico" do Google Consent Mode v2: enquanto o consentimento
 *   não for concedido, o script do Google Analytics (gtag.js) NUNCA é baixado.
 * - Integra com a plataforma de consentimento do App Shell (consentService)
 *   e pode ser substituído por CMPs de mercado como Cookiebot configurando
 *   `analytics.cmp: 'cookiebot'` no appshell.config.js.
 *
 * @element consent-banner
 * @property {string} privacyUrl - Link opcional para a política de privacidade.
 * @fires consent:change - Disparado via shellEvents quando a escolha é registrada.
 * @see docs/components/consent-banner.md
 * @see docs/architecture/007-consent-management-platforms-and-cookiebot.md
 */
export class ConsentBanner extends LitElement {
  static properties = {
    privacyUrl: {},
  }

  static styles = css`
    :host {
      display: block;
      border-top: 1px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface);
    }
    .content {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 16px;
      max-width: 960px;
      margin: 0 auto;
      padding: 12px 16px;
    }
    p {
      flex: 1 1 320px;
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.4;
    }
    a {
      color: var(--md-sys-color-primary);
    }
    .actions {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
  `

  render() {
    return html`
      <div class="content" role="region" aria-label="Consentimento de cookies">
        <p>
          Usamos o Google Analytics para entender como o app é usado — quais telas são abertas,
          sem nenhum dado seu de conta. Isso grava cookies no seu navegador. Você pode mudar de
          ideia a qualquer momento em Config › Privacidade.
          ${this.privacyUrl
            ? html`<a href=${this.privacyUrl} target="_blank" rel="noopener">Saiba mais</a>`
            : ''}
        </p>
        <div class="actions">
          <md-outlined-button @click=${() => consentService.set('denied')}>Recusar</md-outlined-button>
          <md-outlined-button @click=${() => consentService.set('granted')}>Aceitar</md-outlined-button>
        </div>
      </div>
    `
  }
}

customElements.define('consent-banner', ConsentBanner)
