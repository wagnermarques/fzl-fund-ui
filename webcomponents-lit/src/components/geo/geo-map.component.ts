import { LitElement, html, css, unsafeCSS } from 'lit';
import { property } from 'lit/decorators.js';
import * as L from 'leaflet';
import leafletCss from 'leaflet/dist/leaflet.css?inline';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  calculateTilePyramidStats,
  type TilePyramidStats,
} from './geo-math';
import {
  DEFAULT_BASEMAP_KEY,
  getBasemapProvider,
} from './basemaps';
import {
  type IbgeLayerKey,
  IBGE_LAYERS_ORDER,
  getFeatureStyle,
  FEATURE_HIGHLIGHT_STYLE,
  UF_BORDER_WEIGHT,
  UF_BORDER_COLOR,
} from './ibge-service';

export interface FzlMapMoveEventDetail {
  center: { lat: number; lng: number };
  zoom: number;
  pyramidStats: TilePyramidStats;
}

export interface FzlFeatureEventDetail {
  properties: any;
  layerKey: IbgeLayerKey;
  originalEvent?: MouseEvent;
}

/**
 * Reactive Web Component encapsulating a Leaflet WebGIS Map with Slippy Tile Pyramid,
 * basemap layer switching, Z/X/Y debug grid, and IBGE GeoJSON vector layers.
 *
 * @customElement fzl-geo-map
 * @tag fzl-geo-map
 *
 * @fires {CustomEvent<FzlMapMoveEventDetail>} fzl-map-move - Emitted when map pans or finishes moving
 * @fires {CustomEvent<TilePyramidStats>} fzl-map-zoom - Emitted when map zoom level changes
 * @fires {CustomEvent<FzlFeatureEventDetail>} fzl-feature-hover - Emitted when hovering over a vector polygon
 * @fires {CustomEvent<FzlFeatureEventDetail>} fzl-feature-select - Emitted when clicking on a polygon
 */
export class FzlGeoMap extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    unsafeCSS(leafletCss),
    css`
      :host {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 400px;
        position: relative;
        overflow: hidden;
        font-family: var(--_fzl-font-family);
      }

      .fzl-map-root {
        width: 100%;
        height: 100%;
        position: relative;
        background-color: #0f172a;
      }

      .map-viewport {
        width: 100%;
        height: 100%;
        position: absolute;
        inset: 0;
      }

      /* Custom Leaflet Tooltip */
      .leaflet-tooltip-custom {
        background-color: var(--_fzl-color-surface, #ffffff) !important;
        color: var(--_fzl-color-text, #0f172a) !important;
        border: 1px solid var(--_fzl-color-border, #cbd5e1) !important;
        border-radius: var(--_fzl-radius-sm, 4px) !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15) !important;
        font-family: var(--_fzl-font-family) !important;
        font-size: var(--_fzl-font-size-xs, 0.75rem) !important;
        font-weight: var(--_fzl-font-weight-semibold, 600) !important;
        padding: 4px 8px !important;
      }

      /* Debug Tile Grid Overlay */
      .debug-tile-grid {
        box-sizing: border-box;
        border: 1px dashed rgba(29, 78, 216, 0.55);
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        padding: 6px;
        pointer-events: none;
      }

      .tile-coords-tag {
        background: rgba(15, 23, 42, 0.85);
        color: #ffffff;
        border-radius: 4px;
        padding: 3px 6px;
        font-family: monospace;
        font-size: 11px;
        line-height: 1.25;
        border: 1px solid rgba(255, 255, 255, 0.25);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
        pointer-events: none;
      }

      .z-tag {
        color: #38bdf8;
        font-weight: bold;
      }
      .xy-tag {
        color: #fde047;
      }

      /* High contrast */
      :host([data-fzl-hc]) .fzl-map-root {
        border: 2px solid CanvasText;
      }
    `,
  ];

  /** Latitude & Longitude of map center */
  @property({ type: Array })
  center: [number, number] = [-14.235, -51.925];

  /** Integer zoom level */
  @property({ type: Number })
  zoom = 4;

  @property({ type: Number })
  minZoom = 0;

  @property({ type: Number })
  maxZoom = 18;

  /** Active Basemap identifier */
  @property({ type: String })
  basemap = DEFAULT_BASEMAP_KEY;

  /** Whether to show the Z/X/Y tile debug grid */
  @property({ type: Boolean })
  showGrid = true;

  private _mapInstance: L.Map | null = null;
  private _basemapLayer: L.TileLayer | null = null;
  private _debugGridLayer: L.GridLayer | null = null;
  private _vectorLayers: Partial<Record<IbgeLayerKey, L.GeoJSON>> = {};
  private _ufBoundaryOverlay: L.GeoJSON | null = null;
  private _ufGeoJsonData: any = null;
  private _resizeObserver: ResizeObserver | null = null;

  override firstUpdated() {
    this._initMap();
    this._setupResizeObserver();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    if (this._mapInstance) {
      this._mapInstance.remove();
      this._mapInstance = null;
    }
  }

  private _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver(() => {
      this.invalidateSize();
    });
    const root = this.shadowRoot?.querySelector('.fzl-map-root');
    if (root) this._resizeObserver.observe(root);
  }

  /**
   * Initializes Leaflet map instance and default layers
   */
  private _initMap() {
    const container = this.shadowRoot?.querySelector<HTMLElement>('.map-viewport');
    if (!container) return;

    this._mapInstance = L.map(container, {
      center: this.center,
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
      zoomSnap: 1, // Integer zoom for tile alignment
      zoomDelta: 1,
      attributionControl: true,
    });

    // Setup base map
    this._updateBasemap(this.basemap);

    // Setup Debug Tile Grid Layer
    this._setupDebugGrid();

    // Attach Leaflet event listeners
    this._mapInstance.on('moveend zoomend', () => {
      this._handleMapMove();
    });

    this._mapInstance.on('zoomend', () => {
      this._handleZoomChange();
    });

    // Invalidate size once DOM is attached
    requestAnimationFrame(() => {
      this._mapInstance?.invalidateSize();
      this._handleMapMove();
    });
  }

  private _setupDebugGrid() {
    if (!this._mapInstance) return;

    // Custom Leaflet GridLayer for Z/X/Y tile coordinate labels
    const TileDebugGrid = L.GridLayer.extend({
      createTile: function (coords: L.Coords) {
        const tile = document.createElement('div');
        tile.className = 'debug-tile-grid';
        tile.innerHTML = `
          <div class="tile-coords-tag">
            <span class="z-tag">Z: ${coords.z}</span><br>
            <span class="xy-tag">X: ${coords.x}</span><br>
            <span class="xy-tag">Y: ${coords.y}</span>
          </div>
        `;
        return tile;
      },
    });

    this._debugGridLayer = new (TileDebugGrid as any)({
      zIndex: 500,
    });

    if (this.showGrid && this._debugGridLayer) {
      this._debugGridLayer.addTo(this._mapInstance);
    }
  }

  private _updateBasemap(providerKey: string) {
    if (!this._mapInstance) return;
    const provider = getBasemapProvider(providerKey);

    if (this._basemapLayer) {
      this._mapInstance.removeLayer(this._basemapLayer);
    }

    this._basemapLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      subdomains: provider.subdomains || 'abc',
      maxZoom: provider.maxZoom,
    });

    this._basemapLayer.addTo(this._mapInstance);
    this._basemapLayer.bringToBack();
  }

  private _handleMapMove() {
    if (!this._mapInstance) return;
    const center = this._mapInstance.getCenter();
    const zoom = Math.round(this._mapInstance.getZoom());
    const bounds = this._mapInstance.getBounds();
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();

    const stats = calculateTilePyramidStats(zoom, center.lat, center.lng, {
      nw: { lat: nw.lat, lng: nw.lng },
      se: { lat: se.lat, lng: se.lng },
    });

    this.zoom = zoom;
    this.center = [center.lat, center.lng];

    this.dispatchEvent(
      new CustomEvent<FzlMapMoveEventDetail>('fzl-map-move', {
        bubbles: true,
        composed: true,
        detail: {
          center: { lat: center.lat, lng: center.lng },
          zoom,
          pyramidStats: stats,
        },
      })
    );
  }

  private _handleZoomChange() {
    if (!this._mapInstance) return;
    const zoom = Math.round(this._mapInstance.getZoom());
    const center = this._mapInstance.getCenter();
    const stats = calculateTilePyramidStats(zoom, center.lat, center.lng);

    this.dispatchEvent(
      new CustomEvent<TilePyramidStats>('fzl-map-zoom', {
        bubbles: true,
        composed: true,
        detail: stats,
      })
    );
  }

  // --- Public API Methods ---

  /** Set integer zoom level */
  public setZoom(zoom: number) {
    this._mapInstance?.setZoom(zoom);
  }

  /** Pan to lat/lng coordinates */
  public panTo(lat: number, lng: number) {
    this._mapInstance?.panTo([lat, lng]);
  }

  /** Fit bounds with padding */
  public fitBounds(bounds: L.LatLngBoundsExpression) {
    this._mapInstance?.fitBounds(bounds, { padding: [20, 20] });
  }

  /** Invalidate map size */
  public invalidateSize() {
    this._mapInstance?.invalidateSize();
  }

  /** Change active basemap layer */
  public setBasemap(providerKey: string) {
    this.basemap = providerKey;
    this._updateBasemap(providerKey);
  }

  /** Toggle the Z/X/Y tile debug grid */
  public toggleGrid(show: boolean) {
    this.showGrid = show;
    if (!this._mapInstance || !this._debugGridLayer) return;

    if (show) {
      if (!this._mapInstance.hasLayer(this._debugGridLayer)) {
        this._debugGridLayer.addTo(this._mapInstance);
      }
    } else {
      if (this._mapInstance.hasLayer(this._debugGridLayer)) {
        this._mapInstance.removeLayer(this._debugGridLayer);
      }
    }
  }

  /**
   * Adds or updates a GeoJSON vector layer on the map with interactive tooltips and hover effects
   */
  public setGeoJsonLayer(layerKey: IbgeLayerKey, geoJsonData: any, shouldFit = false) {
    if (!this._mapInstance) return;

    // Remove existing layer for key if present
    this.removeGeoJsonLayer(layerKey);

    if (layerKey === 'uf') {
      this._ufGeoJsonData = geoJsonData;
    }

    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: (feature) => getFeatureStyle(feature, layerKey),
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const label = props.nome || props.nm_mun || props.nm_uf || props.codarea || 'Brasil';

        layer.bindTooltip(label, {
          permanent: false,
          direction: 'auto',
          className: 'leaflet-tooltip-custom',
        });

        layer.on({
          mouseover: (e) => {
            const target = e.target;
            target.setStyle(FEATURE_HIGHLIGHT_STYLE);
            target.bringToFront();
            this.dispatchEvent(
              new CustomEvent<FzlFeatureEventDetail>('fzl-feature-hover', {
                bubbles: true,
                composed: true,
                detail: { properties: props, layerKey, originalEvent: e.originalEvent },
              })
            );
          },
          mouseout: (e) => {
            e.target.setStyle(getFeatureStyle(feature, layerKey));
          },
          click: (e) => {
            this._mapInstance?.fitBounds(e.target.getBounds(), { padding: [24, 24] });
            this.dispatchEvent(
              new CustomEvent<FzlFeatureEventDetail>('fzl-feature-select', {
                bubbles: true,
                composed: true,
                detail: { properties: props, layerKey, originalEvent: e.originalEvent },
              })
            );
          },
        });
      },
    });

    this._vectorLayers[layerKey] = geoJsonLayer;
    this._reorderLayers();

    if (shouldFit) {
      this._mapInstance.fitBounds(geoJsonLayer.getBounds(), { padding: [15, 15] });
    }

    this._syncUfBoundaryOverlay();
  }

  /**
   * Removes a GeoJSON vector layer by key
   */
  public removeGeoJsonLayer(layerKey: IbgeLayerKey) {
    const layer = this._vectorLayers[layerKey];
    if (layer && this._mapInstance) {
      this._mapInstance.removeLayer(layer);
      delete this._vectorLayers[layerKey];
    }
    if (layerKey === 'uf') {
      this._ufGeoJsonData = null;
      this._syncUfBoundaryOverlay();
    }
  }

  /** Ensure visual layer stacking: país (base) -> regioes -> uf -> municipios (top) */
  private _reorderLayers() {
    if (!this._mapInstance) return;
    IBGE_LAYERS_ORDER.forEach((key) => {
      const layer = this._vectorLayers[key];
      if (layer && this._mapInstance) {
        if (!this._mapInstance.hasLayer(layer)) {
          layer.addTo(this._mapInstance);
        }
        layer.bringToFront();
      }
    });
  }

  /**
   * Keeps an exclusive border overlay for UFs on top of municipalities so state bounds remain crisp
   */
  private _syncUfBoundaryOverlay() {
    if (!this._mapInstance) return;
    const shouldShow = Boolean(this._vectorLayers.uf && this._ufGeoJsonData);

    if (!shouldShow) {
      if (this._ufBoundaryOverlay && this._mapInstance.hasLayer(this._ufBoundaryOverlay)) {
        this._mapInstance.removeLayer(this._ufBoundaryOverlay);
      }
      return;
    }

    if (!this._ufBoundaryOverlay) {
      this._ufBoundaryOverlay = L.geoJSON(this._ufGeoJsonData, {
        interactive: false,
        style: () => ({
          fillOpacity: 0,
          weight: UF_BORDER_WEIGHT,
          color: UF_BORDER_COLOR,
          opacity: 0.9,
        }),
      });
    }

    if (!this._mapInstance.hasLayer(this._ufBoundaryOverlay)) {
      this._ufBoundaryOverlay.addTo(this._mapInstance);
    }
    this._ufBoundaryOverlay.bringToFront();
  }

  override render() {
    return html`
      <div class="fzl-map-root">
        <div class="map-viewport"></div>
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-geo-map')) {
  customElements.define('fzl-geo-map', FzlGeoMap);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-geo-map': FzlGeoMap;
  }
}
