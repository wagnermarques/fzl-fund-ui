// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import {
  latLngToTileCoords,
  calculateTilePyramidStats,
  calculateVisibleTilesRange,
  ZOOM_PRESETS,
  BASEMAP_PROVIDERS,
  DEFAULT_BASEMAP_KEY,
  getBasemapProvider,
  generateSampleTileUrl,
  IBGE_LAYERS_METADATA,
  IBGE_LAYERS_ORDER,
  REGION_COLORS,
  getAutoLodLayerForZoom,
  getRegionBaseColor,
  getFeatureColor,
  hexToHsl,
  hslToHex,
  hashString,
} from '@fzl/webcomponents-lit';
import '@fzl/webcomponents-lit/geo-explorer';

describe('Geo Math & Slippy Map Tile Calculations', () => {
  it('converte coordenadas geográficas para tiles X/Y em zoom 0 e 4', () => {
    // Zoom 0 tem apenas 1 tile no planeta (X:0, Y:0)
    const worldTile = latLngToTileCoords(0, 0, 0);
    expect(worldTile).toEqual({ x: 0, y: 0 });

    // Centro do Brasil [-14.235, -51.925] em Zoom 4
    const brTile = latLngToTileCoords(-14.235, -51.925, 4);
    expect(brTile.x).toBe(5);
    expect(brTile.y).toBe(8);
  });

  it('calcula estatísticas da pirâmide de tiles (2^Z x 2^Z, 4^Z)', () => {
    const statsZ0 = calculateTilePyramidStats(0, 0, 0);
    expect(statsZ0.gridDimension).toBe(1);
    expect(statsZ0.totalWorldTiles).toBe(1);
    expect(statsZ0.centerTile).toEqual({ z: 0, x: 0, y: 0 });

    const statsZ4 = calculateTilePyramidStats(4, -14.235, -51.925);
    expect(statsZ4.gridDimension).toBe(16);
    expect(statsZ4.totalWorldTiles).toBe(256);
    expect(statsZ4.centerTile.z).toBe(4);
  });

  it('calcula a faixa de tiles visíveis no viewport', () => {
    const range = calculateVisibleTilesRange(
      { lat: 5.27, lng: -73.98 },  // NW Brasil
      { lat: -33.75, lng: -34.79 }, // SE Brasil
      4
    );
    expect(range.minX).toBeLessThanOrEqual(range.maxX);
    expect(range.minY).toBeLessThanOrEqual(range.maxY);
    expect(range.total).toBe(range.countX * range.countY);
  });

  it('disponibiliza os presets de zoom principais', () => {
    expect(ZOOM_PRESETS.map((p) => p.zoom)).toEqual([0, 3, 4, 7, 11, 15]);
  });
});

describe('Basemap Providers', () => {
  it('registra os 5 provedores de mapas base', () => {
    expect(Object.keys(BASEMAP_PROVIDERS)).toEqual([
      'carto-light',
      'carto-dark',
      'osm',
      'esri-satellite',
      'opentopo',
    ]);
    expect(DEFAULT_BASEMAP_KEY).toBe('carto-light');
  });

  it('gera URLs concretas de exemplo a partir do template', () => {
    const url = generateSampleTileUrl('carto-light', 4, 5, 8);
    expect(url).toBe('https://a.basemaps.cartocdn.com/light_all/4/5/8.png');
  });

  it('retorna fallback seguro para chave inexistente', () => {
    const provider = getBasemapProvider('inexistente');
    expect(provider.id).toBe('carto-light');
  });
});

describe('IBGE Territorial Meshes & Thematic Styling', () => {
  it('define as 4 camadas em ordem correta de sobreposição', () => {
    expect(IBGE_LAYERS_ORDER).toEqual(['pais', 'regioes', 'uf', 'municipios']);
    expect(IBGE_LAYERS_METADATA.pais.featuresExpected).toBe(1);
    expect(IBGE_LAYERS_METADATA.regioes.featuresExpected).toBe(5);
    expect(IBGE_LAYERS_METADATA.uf.featuresExpected).toBe(27);
    expect(IBGE_LAYERS_METADATA.municipios.featuresExpected).toBe(5571);
  });

  it('mapeia os níveis de Auto-LOD por zoom', () => {
    expect(getAutoLodLayerForZoom(0)).toBe('pais');
    expect(getAutoLodLayerForZoom(3)).toBe('pais');
    expect(getAutoLodLayerForZoom(4)).toBe('regioes');
    expect(getAutoLodLayerForZoom(6)).toBe('uf');
    expect(getAutoLodLayerForZoom(8)).toBe('municipios');
    expect(getAutoLodLayerForZoom(12)).toBe('municipios');
  });

  it('calcula cores consistentes para regiões e feições', () => {
    expect(REGION_COLORS['Sudeste']).toBe('#fdae61');
    expect(REGION_COLORS['Sul']).toBe('#d7191c');
    expect(getRegionBaseColor({ nome: 'Sul' })).toBe('#d7191c');
    expect(getFeatureColor({}, 'pais')).toBe('#64748b');
  });

  it('converte e manipula cores HSL e gera hashes determinísticos', () => {
    const hex = '#2b83ba';
    const hsl = hexToHsl(hex);
    expect(hsl.h).toBeGreaterThan(0);
    const converted = hslToHex(hsl.h, hsl.s, hsl.l);
    expect(converted.toLowerCase()).toBe(hex.toLowerCase());

    const hash1 = hashString('SP');
    const hash2 = hashString('SP');
    expect(hash1).toBe(hash2);
  });
});

describe('Geo Web Components Registration', () => {
  it('registra todos os custom elements da suíte GIS', () => {
    expect(customElements.get('fzl-geo-map')).toBeDefined();
    expect(customElements.get('fzl-geo-zoom-inspector')).toBeDefined();
    expect(customElements.get('fzl-geo-feature-details')).toBeDefined();
    expect(customElements.get('fzl-geo-legend')).toBeDefined();
    expect(customElements.get('fzl-geo-basemap-selector')).toBeDefined();
    expect(customElements.get('fzl-geo-layer-manager')).toBeDefined();
    expect(customElements.get('fzl-geo-explorer')).toBeDefined();
  });
});
