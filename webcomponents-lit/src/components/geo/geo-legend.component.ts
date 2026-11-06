import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import { REGION_COLORS } from './ibge-service';

export interface LegendItem {
  label: string;
  color: string;
  id?: string;
}

export const DEFAULT_REGION_LEGEND_ITEMS: LegendItem[] = [
  { label: 'Norte (N)', color: REGION_COLORS['Norte'], id: 'N' },
  { label: 'Nordeste (NE)', color: REGION_COLORS['Nordeste'], id: 'NE' },
  { label: 'Centro-Oeste (CO)', color: REGION_COLORS['Centro-Oeste'], id: 'CO' },
  { label: 'Sudeste (SE)', color: REGION_COLORS['Sudeste'], id: 'SE' },
  { label: 'Sul (S)', color: REGION_COLORS['Sul'], id: 'S' },
];

/**
 * Thematic Map Legend Component.
 *
 * @customElement fzl-geo-legend
 * @tag fzl-geo-legend
 */
export class FzlGeoLegend extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        font-size: var(--_fzl-font-size-xs, 0.75rem);
      }

      .legend-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--_fzl-color-text, #0f172a);
      }

      .color-swatch {
        width: 16px;
        height: 16px;
        border-radius: 3px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        flex-shrink: 0;
      }
    `,
  ];

  @property({ type: Array })
  items: LegendItem[] = DEFAULT_REGION_LEGEND_ITEMS;

  override render() {
    return html`
      <ul class="legend-list">
        ${this.items.map(
          (item) => html`
            <li class="legend-item">
              <span class="color-swatch" style="background-color: ${item.color};"></span>
              <span>${item.label}</span>
            </li>
          `
        )}
      </ul>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-geo-legend')) {
  customElements.define('fzl-geo-legend', FzlGeoLegend);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-geo-legend': FzlGeoLegend;
  }
}
