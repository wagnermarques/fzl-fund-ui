import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  type TilePyramidStats,
  ZOOM_PRESETS,
  calculateTilePyramidStats,
} from './geo-math';

/**
 * Zoom Inspector and Slippy Map Tile Pyramid Calculator Component.
 *
 * @customElement fzl-geo-zoom-inspector
 * @tag fzl-geo-zoom-inspector
 *
 * @fires {CustomEvent<{ zoom: number }>} fzl-zoom-change - Dispatched when zoom level is modified via slider or preset
 */
export class FzlGeoZoomInspector extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        font-size: var(--_fzl-font-size-sm, 0.875rem);
      }

      .zoom-inspector-card {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3, 0.75rem);
      }

      .instruction {
        margin: 0;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        color: var(--_fzl-color-text-muted, #64748b);
        line-height: var(--_fzl-line-height, 1.5);
      }

      .zoom-slider-container {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-1, 0.25rem);
        background: var(--_fzl-color-surface-muted, #f8fafc);
        padding: var(--_fzl-space-2, 0.5rem) var(--_fzl-space-3, 0.75rem);
        border-radius: var(--_fzl-radius-md, 0.375rem);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .zoom-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: var(--_fzl-font-weight-medium, 500);
      }

      .zoom-badge {
        background-color: var(--_fzl-color-primary, #1d4ed8);
        color: var(--_fzl-color-primary-contrast, #ffffff);
        padding: 2px 8px;
        border-radius: var(--_fzl-radius-sm, 4px);
        font-weight: var(--_fzl-font-weight-semibold, 600);
        font-family: monospace;
      }

      .zoom-slider {
        width: 100%;
        accent-color: var(--_fzl-color-primary, #1d4ed8);
        cursor: pointer;
      }

      /* Presets buttons */
      .zoom-presets {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--_fzl-space-1, 0.25rem);
      }

      .btn-preset {
        font-family: inherit;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        font-weight: var(--_fzl-font-weight-medium, 500);
        padding: 5px 6px;
        background: var(--_fzl-color-surface, #ffffff);
        color: var(--_fzl-color-text, #0f172a);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-sm, 4px);
        cursor: pointer;
        transition: all var(--_fzl-transition-fast, 150ms);
        text-align: center;
      }

      .btn-preset:hover {
        background: var(--_fzl-color-surface-muted, #f8fafc);
        border-color: var(--_fzl-color-primary, #1d4ed8);
      }

      .btn-preset.is-active {
        background: var(--_fzl-color-primary, #1d4ed8);
        color: var(--_fzl-color-primary-contrast, #ffffff);
        border-color: var(--_fzl-color-primary, #1d4ed8);
      }

      /* Tile Math Box */
      .tile-math-box {
        background: #0f172a;
        color: #e2e8f0;
        border-radius: var(--_fzl-radius-md, 0.375rem);
        padding: var(--_fzl-space-2, 0.5rem) var(--_fzl-space-3, 0.75rem);
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        border: 1px solid #1e293b;
      }

      .math-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .math-label {
        color: #94a3b8;
      }

      .math-value {
        font-family: monospace;
        font-weight: 600;
        color: #ffffff;
      }

      .math-value.highlight {
        color: #38bdf8;
      }
    `,
  ];

  @property({ type: Number })
  zoom = 4;

  @property({ type: Number })
  centerLat = -14.235;

  @property({ type: Number })
  centerLng = -51.925;

  @property({ type: Object })
  stats: TilePyramidStats | null = null;

  private _onSliderInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const nextZoom = parseInt(input.value, 10);
    this._dispatchZoomChange(nextZoom);
  }

  private _onPresetClick(presetZoom: number) {
    this._dispatchZoomChange(presetZoom);
  }

  private _dispatchZoomChange(zoom: number) {
    this.zoom = zoom;
    this.dispatchEvent(
      new CustomEvent<{ zoom: number }>('fzl-zoom-change', {
        bubbles: true,
        composed: true,
        detail: { zoom },
      })
    );
  }

  override render() {
    const currentStats =
      this.stats || calculateTilePyramidStats(this.zoom, this.centerLat, this.centerLng);

    return html`
      <div class="zoom-inspector-card">
        <p class="instruction">
          Altere o nível de zoom inteiro para observar a subdivisão quádrupla dos blocos (2^Z × 2^Z).
        </p>

        <div class="zoom-slider-container">
          <div class="zoom-display">
            <span>Nível de Zoom (Z):</span>
            <span class="zoom-badge">${currentStats.zoom}</span>
          </div>
          <input
            type="range"
            class="zoom-slider"
            min="0"
            max="18"
            step="1"
            .value=${String(currentStats.zoom)}
            @input=${this._onSliderInput}
            aria-label="Controle de nível de zoom"
          />
        </div>

        <div class="zoom-presets">
          ${ZOOM_PRESETS.map(
            (p) => html`
              <button
                type="button"
                class="btn-preset ${currentStats.zoom === p.zoom ? 'is-active' : ''}"
                title=${p.description}
                @click=${() => this._onPresetClick(p.zoom)}
              >
                ${p.label} (${p.zoom})
              </button>
            `
          )}
        </div>

        <div class="tile-math-box">
          <div class="math-row">
            <span class="math-label">Dimensão da grade:</span>
            <span class="math-value">
              ${currentStats.gridDimension.toLocaleString('pt-BR')} ×
              ${currentStats.gridDimension.toLocaleString('pt-BR')}
            </span>
          </div>
          <div class="math-row">
            <span class="math-label">Total no planeta:</span>
            <span class="math-value">
              ${currentStats.totalWorldTiles.toLocaleString('pt-BR')} tiles
            </span>
          </div>
          <div class="math-row">
            <span class="math-label">Tile central:</span>
            <span class="math-value highlight">
              Z: ${currentStats.centerTile.z} | X: ${currentStats.centerTile.x} | Y:
              ${currentStats.centerTile.y}
            </span>
          </div>
          ${currentStats.visibleRange
            ? html`
                <div class="math-row">
                  <span class="math-label">Tiles na tela:</span>
                  <span class="math-value highlight">
                    ${currentStats.visibleRange.total} tiles (${currentStats.visibleRange.countX} ×
                    ${currentStats.visibleRange.countY})
                  </span>
                </div>
              `
            : ''}
        </div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-geo-zoom-inspector')) {
  customElements.define('fzl-geo-zoom-inspector', FzlGeoZoomInspector);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-geo-zoom-inspector': FzlGeoZoomInspector;
  }
}
