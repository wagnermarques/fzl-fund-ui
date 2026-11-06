import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';
import { FzlWidgetMixin } from '@fzl/core';
import {
  type IbgeLayerKey,
  IBGE_LAYERS_ORDER,
  IBGE_LAYERS_METADATA,
  type CachedLayerData,
  fetchIbgeLayer,
  getAutoLodLayerForZoom,
} from './ibge-service';

export interface FzlLayerToggleEventDetail {
  layerKey: IbgeLayerKey;
  enabled: boolean;
  cachedData?: CachedLayerData;
}

export interface FzlAutoLodToggleEventDetail {
  enabled: boolean;
}

/**
 * IBGE Territorial Meshes Layer Manager & Auto-LOD (Level of Detail) Widget.
 *
 * @customElement fzl-geo-layer-manager
 * @tag fzl-geo-layer-manager
 *
 * @fires {CustomEvent<FzlLayerToggleEventDetail>} fzl-layer-toggle - Dispatched when a layer is toggled on or off
 * @fires {CustomEvent<FzlAutoLodToggleEventDetail>} fzl-auto-lod-toggle - Dispatched when Auto-LOD is toggled
 */
export class FzlGeoLayerManager extends FzlWidgetMixin(LitElement) {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text, #0f172a);
        font-size: var(--_fzl-font-size-sm, 0.875rem);
      }

      .layer-manager-card {
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

      .color-hint {
        background: var(--_fzl-color-surface-muted, #f8fafc);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-sm, 4px);
        padding: 6px 10px;
        font-size: 11px;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      /* Auto-LOD box */
      .auto-lod-box {
        background: rgba(29, 78, 216, 0.06);
        border: 1px solid rgba(29, 78, 216, 0.25);
        border-radius: var(--_fzl-radius-md, 0.375rem);
        padding: var(--_fzl-space-2, 0.5rem) var(--_fzl-space-3, 0.75rem);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-weight: var(--_fzl-font-weight-medium, 500);
        user-select: none;
      }

      .checkbox-label input[type='checkbox'] {
        accent-color: var(--_fzl-color-primary, #1d4ed8);
        width: 16px;
        height: 16px;
        cursor: pointer;
      }

      .lod-hint {
        font-size: 11px;
        color: var(--_fzl-color-text-muted, #64748b);
        padding-left: 24px;
      }

      /* Layer list */
      .layer-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .layer-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 8px;
        border-radius: var(--_fzl-radius-sm, 4px);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        background: var(--_fzl-color-surface, #ffffff);
        cursor: pointer;
        transition: background-color var(--_fzl-transition-fast, 150ms);
      }

      .layer-row:hover {
        background: var(--_fzl-color-surface-muted, #f8fafc);
      }

      .layer-row input[type='checkbox'] {
        margin-top: 2px;
        accent-color: var(--_fzl-color-primary, #1d4ed8);
        cursor: pointer;
      }

      .layer-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
      }

      .layer-name {
        font-weight: var(--_fzl-font-weight-medium, 500);
        font-size: var(--_fzl-font-size-xs, 0.75rem);
      }

      .layer-meta {
        font-size: 11px;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      /* Active layers chips */
      .section-title {
        margin: var(--_fzl-space-1, 0.25rem) 0 0;
        font-size: var(--_fzl-font-size-xs, 0.75rem);
        font-weight: var(--_fzl-font-weight-semibold, 600);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .active-chips {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .active-chip {
        background: var(--_fzl-color-surface-muted, #f8fafc);
        border: 1px solid var(--_fzl-color-border, #cbd5e1);
        border-left: 3px solid var(--_fzl-color-primary, #1d4ed8);
        border-radius: var(--_fzl-radius-sm, 4px);
        padding: 6px 10px;
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 11px;
      }

      .chip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        color: var(--_fzl-color-text, #0f172a);
      }

      .chip-badge {
        background: rgba(29, 78, 216, 0.12);
        color: var(--_fzl-color-primary, #1d4ed8);
        padding: 1px 6px;
        border-radius: 10px;
        font-size: 10px;
      }

      .chip-meta {
        color: var(--_fzl-color-text-muted, #64748b);
      }

      .loading-tag {
        color: var(--_fzl-color-primary, #1d4ed8);
        font-size: 11px;
        font-style: italic;
      }

      .empty-state {
        padding: var(--_fzl-space-3, 0.75rem);
        text-align: center;
        background: var(--_fzl-color-surface-muted, #f8fafc);
        border: 1px dashed var(--_fzl-color-border, #cbd5e1);
        border-radius: var(--_fzl-radius-md, 0.375rem);
        color: var(--_fzl-color-text-muted, #64748b);
        font-size: var(--_fzl-font-size-xs, 0.75rem);
      }
    `,
  ];

  /** Whether Auto-LOD (Level of Detail by Zoom) is enabled */
  @property({ type: Boolean })
  autoLod = true;

  /** Active map zoom level, used by Auto-LOD */
  @property({ type: Number })
  currentZoom = 4;

  /** Map of active layers by key */
  @state()
  private _activeLayers: Partial<Record<IbgeLayerKey, CachedLayerData>> = {};

  @state()
  private _loadingLayers: Partial<Record<IbgeLayerKey, boolean>> = {};

  private _autoLodCurrentKey: IbgeLayerKey | null = null;

  override willUpdate(changedProps: Map<string, any>) {
    if (changedProps.has('currentZoom') && this.autoLod) {
      this._handleAutoLodSync();
    }
  }

  private async _handleAutoLodSync() {
    const targetKey = getAutoLodLayerForZoom(this.currentZoom);
    if (targetKey === this._autoLodCurrentKey) return;

    this._autoLodCurrentKey = targetKey;

    // Enable target layer, disable others in exclusive mode
    for (const key of IBGE_LAYERS_ORDER) {
      if (key === targetKey) {
        if (!this._activeLayers[key]) {
          await this._activateLayer(key);
        }
      } else {
        if (this._activeLayers[key]) {
          this._deactivateLayer(key);
        }
      }
    }
  }

  private async _activateLayer(key: IbgeLayerKey) {
    this._loadingLayers = { ...this._loadingLayers, [key]: true };
    try {
      const cachedData = await fetchIbgeLayer(key);
      this._activeLayers = { ...this._activeLayers, [key]: cachedData };
      this.dispatchEvent(
        new CustomEvent<FzlLayerToggleEventDetail>('fzl-layer-toggle', {
          bubbles: true,
          composed: true,
          detail: { layerKey: key, enabled: true, cachedData },
        })
      );
    } catch (err) {
      console.error(`Falha ao carregar malha ${key}:`, err);
    } finally {
      this._loadingLayers = { ...this._loadingLayers, [key]: false };
    }
  }

  private _deactivateLayer(key: IbgeLayerKey) {
    const updated = { ...this._activeLayers };
    delete updated[key];
    this._activeLayers = updated;
    this.dispatchEvent(
      new CustomEvent<FzlLayerToggleEventDetail>('fzl-layer-toggle', {
        bubbles: true,
        composed: true,
        detail: { layerKey: key, enabled: false },
      })
    );
  }

  private async _onLayerCheckboxChange(e: Event, key: IbgeLayerKey) {
    const input = e.target as HTMLInputElement;

    // Manual interaction disables Auto-LOD
    if (this.autoLod) {
      this.autoLod = false;
      this._autoLodCurrentKey = null;
      this.dispatchEvent(
        new CustomEvent<FzlAutoLodToggleEventDetail>('fzl-auto-lod-toggle', {
          bubbles: true,
          composed: true,
          detail: { enabled: false },
        })
      );
    }

    if (input.checked) {
      await this._activateLayer(key);
    } else {
      this._deactivateLayer(key);
    }
  }

  private _onToggleAutoLod(e: Event) {
    const input = e.target as HTMLInputElement;
    this.autoLod = input.checked;
    this.dispatchEvent(
      new CustomEvent<FzlAutoLodToggleEventDetail>('fzl-auto-lod-toggle', {
        bubbles: true,
        composed: true,
        detail: { enabled: this.autoLod },
      })
    );
    if (this.autoLod) {
      this._autoLodCurrentKey = null;
      this._handleAutoLodSync();
    }
  }

  override render() {
    const activeKeys = IBGE_LAYERS_ORDER.filter((k) => Boolean(this._activeLayers[k]));

    return html`
      <div class="layer-manager-card">
        <p class="instruction">Selecione uma ou mais malhas para combiná-las sobre o mapa base.</p>

        <div class="color-hint">
          🎨 <strong>Cores:</strong> Regiões têm cor fixa · UFs usam tons do matiz regional · Municípios têm
          paleta categórica de alto contraste.
        </div>

        <div class="auto-lod-box">
          <label class="checkbox-label" for="toggle-auto-lod">
            <input
              type="checkbox"
              id="toggle-auto-lod"
              .checked=${this.autoLod}
              @change=${this._onToggleAutoLod}
            />
            <span>🎯 <strong>Auto-Recorte por Zoom (LOD)</strong></span>
          </label>
          <span class="lod-hint">
            Alterna País (Z≤3) → Regiões (Z=4) → UFs (Z=5..7) → Municípios (Z≥8).
          </span>
        </div>

        <div class="layer-list">
          ${IBGE_LAYERS_ORDER.map((key) => {
            const meta = IBGE_LAYERS_METADATA[key];
            const isChecked = Boolean(this._activeLayers[key]);
            const isLoading = Boolean(this._loadingLayers[key]);

            return html`
              <label class="layer-row">
                <input
                  type="checkbox"
                  .checked=${isChecked}
                  ?disabled=${isLoading}
                  @change=${(e: Event) => this._onLayerCheckboxChange(e, key)}
                />
                <div class="layer-info">
                  <span class="layer-name">${meta.name}</span>
                  <span class="layer-meta">
                    ${meta.sizeEstimate} · ${meta.featuresExpected.toLocaleString('pt-BR')} feições
                    ${isLoading ? html`<span class="loading-tag">(baixando...)</span>` : ''}
                  </span>
                </div>
              </label>
            `;
          })}
        </div>

        <h4 class="section-title">Malhas Ativas no Mapa</h4>
        ${activeKeys.length === 0
          ? html`<div class="empty-state">Nenhuma malha selecionada</div>`
          : html`
              <div class="active-chips">
                ${activeKeys.map((key) => {
                  const meta = IBGE_LAYERS_METADATA[key];
                  const info = this._activeLayers[key]!;
                  const sizeText = info.payloadSizeBytes
                    ? `${(info.payloadSizeBytes / 1024).toFixed(1)} KB`
                    : meta.sizeEstimate;
                  const timeText = info.fromCache
                    ? 'cache local'
                    : `${info.downloadDurationMs.toFixed(0)} ms`;

                  return html`
                    <div class="active-chip">
                      <div class="chip-header">
                        <span>${meta.name}</span>
                        <span class="chip-badge">${info.featuresCount} feições</span>
                      </div>
                      <div class="chip-meta">${sizeText} · ${timeText}</div>
                    </div>
                  `;
                })}
              </div>
            `}
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('fzl-geo-layer-manager')) {
  customElements.define('fzl-geo-layer-manager', FzlGeoLayerManager);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-geo-layer-manager': FzlGeoLayerManager;
  }
}
