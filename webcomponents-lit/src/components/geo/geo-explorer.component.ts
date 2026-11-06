import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import './geo-map.component';
import './geo-layer-manager.component';
import './geo-zoom-inspector.component';
import './geo-feature-details.component';
import './geo-legend.component';
import './geo-basemap-selector.component';
import type { FzlGeoMap, FzlMapMoveEventDetail, FzlFeatureEventDetail } from './geo-map.component';
import type { FzlLayerToggleEventDetail } from './geo-layer-manager.component';
import { type TilePyramidStats, calculateTilePyramidStats } from './geo-math';
import { DEFAULT_BASEMAP_KEY } from './basemaps';

/**
 * Full Composite WebGIS & IBGE Territorial Meshes Explorer Component.
 *
 * Combines map viewport, basemap controls, layer management with Auto-LOD,
 * zoom inspector, feature attribute inspector, and thematic legend into
 * a responsive dashboard.
 *
 * @customElement fzl-geo-explorer
 * @tag fzl-geo-explorer
 */
export class FzlGeoExplorer extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 600px;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        box-sizing: border-box;
      }

      *, *::before, *::after {
        box-sizing: border-box;
      }

      .explorer-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        min-height: 650px;
        background-color: var(--_fzl-color-surface, #ffffff);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-lg, 0.5rem);
        overflow: hidden;
      }

      /* Top Header Bar */
      .app-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--_fzl-space-2, 0.5rem) var(--_fzl-space-4, 1rem);
        background: #0f172a;
        color: #ffffff;
        border-bottom: 1px solid #1e293b;
        flex-wrap: wrap;
        gap: var(--_fzl-space-2, 0.5rem);
      }

      .header-title {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-2, 0.5rem);
      }

      .header-title h2 {
        margin: 0;
        font-size: var(--_fzl-font-size-md, 1rem);
        font-weight: var(--_fzl-font-weight-semibold, 600);
      }

      .header-badge {
        background-color: var(--_fzl-color-primary, #1d4ed8);
        color: #ffffff;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 12px;
      }

      .header-controls {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-3, 0.75rem);
        flex-wrap: wrap;
      }

      .header-select-group {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
      }

      .header-select {
        font-family: inherit;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        padding: 4px 8px;
        background: #1e293b;
        color: #f8fafc;
        border: 1px solid #334155;
        border-radius: 4px;
        cursor: pointer;
      }

      .header-checkbox-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        cursor: pointer;
        user-select: none;
      }

      .header-checkbox-label input {
        accent-color: var(--_fzl-color-primary, #1d4ed8);
      }

      /* Main Layout */
      .main-layout {
        display: flex;
        flex: 1;
        width: 100%;
        min-height: 580px;
        position: relative;
        overflow: hidden;
      }

      @media (max-width: 900px) {
        .main-layout {
          flex-direction: column-reverse;
        }
      }

      /* Sidebar */
      .sidebar {
        width: 360px;
        max-width: 100%;
        height: 100%;
        overflow-y: auto;
        background: var(--_fzl-color-surface, #ffffff);
        border-right: 1px solid var(--_fzl-color-border, #cbd5e1);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      }

      @media (max-width: 900px) {
        .sidebar {
          width: 100%;
          height: 380px;
          border-right: none;
          border-top: 1px solid var(--_fzl-color-border, #cbd5e1);
        }
      }

      /* Accordion items */
      .accordion-item {
        border-bottom: 1px solid var(--_fzl-color-border, #cbd5e1);
      }

      .accordion-header {
        font-weight: var(--_fzl-font-weight-semibold, 600);
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        padding: 10px 14px;
        cursor: pointer;
        background: var(--_fzl-color-surface-muted, #f8fafc);
        user-select: none;
        list-style: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .accordion-header::-webkit-details-marker {
        display: none;
      }

      .accordion-header::after {
        content: '▼';
        font-size: 9px;
        transition: transform var(--_fzl-transition-fast, 150ms);
        color: var(--_fzl-color-text-muted, #64748b);
      }

      details[open] .accordion-header::after {
        transform: rotate(180deg);
      }

      .accordion-body {
        padding: 12px 14px;
      }

      /* Didactic Steps List */
      .steps-list {
        margin: 0;
        padding-left: 18px;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        color: var(--_fzl-color-text-muted, #64748b);
        line-height: 1.6;
      }

      .steps-list code {
        background: var(--_fzl-color-surface-muted, #f8fafc);
        padding: 1px 4px;
        border-radius: 3px;
        color: var(--_fzl-color-primary, #1d4ed8);
      }

      /* Map Viewport Area */
      .map-wrapper {
        flex: 1;
        height: 100%;
        min-height: 480px;
        position: relative;
      }
    `,
  ];

  @property({ type: String })
  basemap = DEFAULT_BASEMAP_KEY;

  @property({ type: Boolean })
  showGrid = true;

  @state()
  private _zoom = 4;

  @state()
  private _centerLat = -14.235;

  @state()
  private _centerLng = -51.925;

  @state()
  private _pyramidStats: TilePyramidStats = calculateTilePyramidStats(4, -14.235, -51.925);

  @state()
  private _activeFeatureProps: any = null;

  private _getMapElement(): FzlGeoMap | null {
    return this.shadowRoot?.querySelector<FzlGeoMap>('fzl-geo-map') || null;
  }

  private _handleMapMove(e: CustomEvent<FzlMapMoveEventDetail>) {
    this._zoom = e.detail.zoom;
    this._centerLat = e.detail.center.lat;
    this._centerLng = e.detail.center.lng;
    this._pyramidStats = e.detail.pyramidStats;
  }

  private _handleFeatureHover(e: CustomEvent<FzlFeatureEventDetail>) {
    this._activeFeatureProps = e.detail.properties;
  }

  private _handleFeatureSelect(e: CustomEvent<FzlFeatureEventDetail>) {
    this._activeFeatureProps = e.detail.properties;
  }

  private _handleZoomChange(e: CustomEvent<{ zoom: number }>) {
    const map = this._getMapElement();
    if (map) {
      map.setZoom(e.detail.zoom);
    }
  }

  private _handleBasemapChange(basemapKey: string) {
    this.basemap = basemapKey;
    const map = this._getMapElement();
    if (map) {
      map.setBasemap(basemapKey);
    }
  }

  private _handleGridToggle(e: Event) {
    const input = e.target as HTMLInputElement;
    this.showGrid = input.checked;
    const map = this._getMapElement();
    if (map) {
      map.toggleGrid(this.showGrid);
    }
  }

  private _handleLayerToggle(e: CustomEvent<FzlLayerToggleEventDetail>) {
    const map = this._getMapElement();
    if (!map) return;

    if (e.detail.enabled && e.detail.cachedData) {
      map.setGeoJsonLayer(e.detail.layerKey, e.detail.cachedData.data);
    } else {
      map.removeGeoJsonLayer(e.detail.layerKey);
    }
  }

  override render() {
    return html`
      <div class="explorer-container">
        <!-- Barra de Cabeçalho do GIS -->
        <header class="app-header">
          <div class="header-title">
            <h2>🗺️ Explorador de Malhas do IBGE (2024)</h2>
            <span class="header-badge">Leaflet + Web Components</span>
          </div>

          <div class="header-controls">
            <div class="header-select-group">
              <label for="top-basemap-select">Mapa Base:</label>
              <select
                id="top-basemap-select"
                class="header-select"
                .value=${this.basemap}
                @change=${(e: Event) =>
                  this._handleBasemapChange((e.target as HTMLSelectElement).value)}
              >
                <option value="carto-light">CartoDB Positron (Claro)</option>
                <option value="carto-dark">CartoDB Dark Matter (Escuro)</option>
                <option value="osm">OpenStreetMap (Padrão)</option>
                <option value="esri-satellite">Esri World Imagery (Satélite)</option>
                <option value="opentopo">OpenTopoMap (Topográfico)</option>
              </select>
            </div>

            <label class="header-checkbox-label">
              <input
                type="checkbox"
                .checked=${this.showGrid}
                @change=${this._handleGridToggle}
              />
              <span>🔍 Grade de Tiles (Z/X/Y)</span>
            </label>
          </div>
        </header>

        <!-- Corpo Principal com Painel e Mapa -->
        <div class="main-layout">
          <aside class="sidebar">
            <!-- 1. Camadas do Mapa -->
            <details class="accordion-item" open>
              <summary class="accordion-header">📐 Camadas do Mapa (IBGE)</summary>
              <div class="accordion-body">
                <fzl-geo-layer-manager
                  .currentZoom=${this._zoom}
                  @fzl-layer-toggle=${this._handleLayerToggle}
                ></fzl-geo-layer-manager>
              </div>
            </details>

            <!-- 2. Inspetor de Zoom e Pirâmide de Tiles -->
            <details class="accordion-item" open>
              <summary class="accordion-header">🔍 Inspetor de Zoom (Pirâmide de Tiles)</summary>
              <div class="accordion-body">
                <fzl-geo-zoom-inspector
                  .zoom=${this._zoom}
                  .centerLat=${this._centerLat}
                  .centerLng=${this._centerLng}
                  .stats=${this._pyramidStats}
                  @fzl-zoom-change=${this._handleZoomChange}
                ></fzl-geo-zoom-inspector>
              </div>
            </details>

            <!-- 3. Informações da Feição GeoJSON -->
            <details class="accordion-item" open>
              <summary class="accordion-header">ℹ️ Detalhes da Feição</summary>
              <div class="accordion-body">
                <fzl-geo-feature-details
                  .properties=${this._activeFeatureProps}
                ></fzl-geo-feature-details>
              </div>
            </details>

            <!-- 4. Legenda das Regiões -->
            <details class="accordion-item" open>
              <summary class="accordion-header">🎨 Regiões do Brasil</summary>
              <div class="accordion-body">
                <fzl-geo-legend></fzl-geo-legend>
              </div>
            </details>

            <!-- 5. Informações do TileLayer Ativo -->
            <details class="accordion-item">
              <summary class="accordion-header">🌐 TileLayer Ativo</summary>
              <div class="accordion-body">
                <fzl-geo-basemap-selector
                  .basemap=${this.basemap}
                  .centerZoom=${this._zoom}
                  .centerX=${this._pyramidStats.centerTile.x}
                  .centerY=${this._pyramidStats.centerTile.y}
                  @fzl-basemap-change=${(e: CustomEvent<{ basemap: string }>) =>
                    this._handleBasemapChange(e.detail.basemap)}
                ></fzl-geo-basemap-selector>
              </div>
            </details>

            <!-- 6. Resumo didático -->
            <details class="accordion-item">
              <summary class="accordion-header">💡 Como a Pirâmide de Tiles funciona</summary>
              <div class="accordion-body">
                <ol class="steps-list">
                  <li><strong>Zoom Z:</strong> O mundo é dividido em <code>2^Z × 2^Z</code> blocos quadrados.</li>
                  <li><strong>Cada Bloco:</strong> Tem exatamente <code>256 × 256 pixels</code>.</li>
                  <li><strong>Coordenadas X/Y:</strong> Numeradas de <code>0</code> a <code>2^Z - 1</code>.</li>
                  <li><strong>Economia:</strong> O navegador baixa apenas os ~15 blocos visíveis na tela!</li>
                </ol>
              </div>
            </details>
          </aside>

          <!-- Viewport do Mapa Central -->
          <main class="map-wrapper">
            <fzl-geo-map
              .basemap=${this.basemap}
              .showGrid=${this.showGrid}
              @fzl-map-move=${this._handleMapMove}
              @fzl-feature-hover=${this._handleFeatureHover}
              @fzl-feature-select=${this._handleFeatureSelect}
            ></fzl-geo-map>
          </main>
        </div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-geo-explorer')) {
  customElements.define('fzl-geo-explorer', FzlGeoExplorer);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-geo-explorer': FzlGeoExplorer;
  }
}
