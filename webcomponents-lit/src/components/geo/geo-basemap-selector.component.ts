import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  BASEMAP_PROVIDERS,
  DEFAULT_BASEMAP_KEY,
  getBasemapProvider,
  generateSampleTileUrl,
} from './basemaps';

/**
 * Basemap (TileLayer) Selector and URL Inspector Component.
 *
 * @customElement fzl-geo-basemap-selector
 * @tag fzl-geo-basemap-selector
 *
 * @fires {CustomEvent<{ basemap: string }>} fzl-basemap-change - Dispatched when the active basemap is changed
 */
export class FzlGeoBasemapSelector extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        font-size: var(--_fzl-font-size-sm, 0.875rem);
      }

      .basemap-card {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-2, 0.5rem);
      }

      .selector-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .selector-label {
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        font-weight: var(--_fzl-font-weight-medium, 500);
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .basemap-select {
        font-family: inherit;
        font-size: var(--_fzl-font-size-sm, 0.875rem);
        padding: var(--_fzl-space-2, 0.5rem);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 0.375rem);
        background-color: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #0f172a);
        cursor: pointer;
        width: 100%;
      }

      .basemap-select:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring);
        border-color: var(--_fzl-color-primary, #1d4ed8);
      }

      .description-box {
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        color: var(--_fzl-color-text-muted, #64748b);
        line-height: var(--_fzl-line-height, 1.5);
        background: var(--_fzl-color-surface-muted, #f8fafc);
        padding: 8px 10px;
        border-radius: var(--_fzl-radius-sm, 4px);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .url-box {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 11px;
      }

      .url-label {
        color: var(--_fzl-color-text-muted, #64748b);
        font-weight: 500;
      }

      .url-code {
        background: #0f172a;
        color: #38bdf8;
        padding: 6px 8px;
        border-radius: 4px;
        font-family: monospace;
        word-break: break-all;
        font-size: 11px;
        line-height: 1.35;
      }

      .url-code.sample {
        color: #fde047;
      }
    `,
  ];

  @property({ type: String })
  basemap = DEFAULT_BASEMAP_KEY;

  @property({ type: Number })
  centerZoom = 4;

  @property({ type: Number })
  centerX = 6;

  @property({ type: Number })
  centerY = 9;

  private _onChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.basemap = select.value;
    this.dispatchEvent(
      new CustomEvent<{ basemap: string }>('fzl-basemap-change', {
        bubbles: true,
        composed: true,
        detail: { basemap: this.basemap },
      })
    );
  }

  override render() {
    const provider = getBasemapProvider(this.basemap);
    const sampleUrl = generateSampleTileUrl(
      this.basemap,
      this.centerZoom,
      this.centerX,
      this.centerY
    );

    return html`
      <div class="basemap-card">
        <div class="selector-row">
          <label class="selector-label" for="basemap-select">Provedor de Mapa Base (TileLayer):</label>
          <select id="basemap-select" class="basemap-select" .value=${this.basemap} @change=${this._onChange}>
            ${Object.values(BASEMAP_PROVIDERS).map(
              (p) => html`
                <option value=${p.id} ?selected=${this.basemap === p.id}>${p.name}</option>
              `
            )}
          </select>
        </div>

        <div class="description-box">
          <strong>${provider.name}:</strong> ${provider.description}
        </div>

        <div class="url-box">
          <span class="url-label">Template URL (Slippy Map):</span>
          <code class="url-code">${provider.url}</code>
        </div>

        <div class="url-box">
          <span class="url-label">URL Real do Tile Central (Z=${this.centerZoom}):</span>
          <code class="url-code sample">${sampleUrl}</code>
        </div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-geo-basemap-selector')) {
  customElements.define('fzl-geo-basemap-selector', FzlGeoBasemapSelector);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-geo-basemap-selector': FzlGeoBasemapSelector;
  }
}
