import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';

/**
 * Feature Inspector Widget displaying territorial metadata attributes on hover/click.
 *
 * @customElement fzl-geo-feature-details
 * @tag fzl-geo-feature-details
 */
export class FzlGeoFeatureDetails extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        font-size: var(--_fzl-font-size-sm, 0.875rem);
      }

      .details-card {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-2, 0.5rem);
      }

      .instruction {
        margin: 0;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .detail-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: var(--_fzl-space-1, 0.25rem);
        background: var(--_fzl-color-surface-muted, #f8fafc);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 0.375rem);
        overflow: hidden;
      }

      .detail-table tr:not(:last-child) {
        border-bottom: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .detail-table td {
        padding: 6px 10px;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
      }

      .detail-table td.label {
        color: var(--_fzl-color-text-muted, #64748b);
        font-weight: var(--_fzl-font-weight-medium, 500);
        width: 35%;
        background: rgba(0, 0, 0, 0.02);
      }

      .detail-table td.value {
        color: var(--_fzl-color-text, #0f172a);
      }

      .empty-state {
        padding: var(--_fzl-space-4, 1rem);
        text-align: center;
        background: var(--_fzl-color-surface-muted, #f8fafc);
        border: 1px dashed var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 0.375rem);
        color: var(--_fzl-color-text-muted, #64748b);
        font-size: var(--_fzl-font-size-xs, 0.75rem);
      }
    `,
  ];

  @property({ type: Object })
  properties: any = null;

  override render() {
    if (!this.properties) {
      return html`
        <div class="details-card">
          <p class="instruction">Passe o mouse ou clique em uma área do mapa para inspecionar seus dados.</p>
          <div class="empty-state">Nenhuma área selecionada</div>
        </div>
      `;
    }

    const nome = this.properties.nome || this.properties.nm_mun || this.properties.nm_uf || 'Brasil';
    const codigo = this.properties.codarea || this.properties.cd_mun || this.properties.cd_uf || '-';
    const uf = this.properties.sigla_uf || this.properties.sigla || '-';
    const regiao = this.properties.nm_regiao || this.properties.nome || '-';
    const area = this.properties.AREA_KM2
      ? `${Number(this.properties.AREA_KM2).toLocaleString('pt-BR')} km²`
      : null;

    return html`
      <div class="details-card">
        <p class="instruction">Dados da feição territorial sob o cursor:</p>
        <table class="detail-table">
          <tbody>
            <tr>
              <td class="label">Nome:</td>
              <td class="value"><strong>${nome}</strong></td>
            </tr>
            <tr>
              <td class="label">Código IBGE:</td>
              <td class="value"><code>${codigo}</code></td>
            </tr>
            ${this.properties.sigla_uf || (this.properties.sigla && this.properties.sigla.length === 2)
              ? html`
                  <tr>
                    <td class="label">UF:</td>
                    <td class="value">${uf}</td>
                  </tr>
                `
              : ''}
            ${this.properties.nm_regiao
              ? html`
                  <tr>
                    <td class="label">Região:</td>
                    <td class="value">${regiao}</td>
                  </tr>
                `
              : ''}
            ${area
              ? html`
                  <tr>
                    <td class="label">Área territorial:</td>
                    <td class="value">${area}</td>
                  </tr>
                `
              : ''}
          </tbody>
        </table>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-geo-feature-details')) {
  customElements.define('fzl-geo-feature-details', FzlGeoFeatureDetails);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-geo-feature-details': FzlGeoFeatureDetails;
  }
}
