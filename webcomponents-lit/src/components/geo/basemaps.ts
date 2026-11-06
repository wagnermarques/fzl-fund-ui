/**
 * Cartographic Basemap Providers (TileLayers)
 *
 * Provides ready-to-use definitions for standard web cartography tile services:
 * CartoDB Positron, CartoDB Dark Matter, OpenStreetMap, Esri World Imagery, and OpenTopoMap.
 */

export interface BasemapProvider {
  id: string;
  name: string;
  url: string;
  subdomains?: string;
  attribution: string;
  maxZoom: number;
  description: string;
  isDark?: boolean;
}

export const BASEMAP_PROVIDERS: Record<string, BasemapProvider> = {
  'carto-light': {
    id: 'carto-light',
    name: 'CartoDB Positron (Claro)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | Dados: <a href="https://www.ibge.gov.br">IBGE 2024</a>',
    maxZoom: 19,
    description:
      'Fundo claro e minimalista, ideal para destacar mapas temáticos e polígonos sem poluição visual.',
    isDark: false,
  },
  'carto-dark': {
    id: 'carto-dark',
    name: 'CartoDB Dark Matter (Escuro)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a> | Dados: <a href="https://www.ibge.gov.br">IBGE 2024</a>',
    maxZoom: 19,
    description:
      'Modo escuro de alto contraste, ideal para visualizações noturnas ou polígonos temáticos vibrantes.',
    isDark: true,
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap (Padrão)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Dados: <a href="https://www.ibge.gov.br">IBGE 2024</a>',
    maxZoom: 19,
    description:
      'Mapa rico em detalhes urbanos, nomes de vias, bairros, rios e relevo clássico colaborativo.',
    isDark: false,
  },
  'esri-satellite': {
    id: 'esri-satellite',
    name: 'Esri World Imagery (Satélite)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community | Dados: <a href="https://www.ibge.gov.br">IBGE 2024</a>',
    maxZoom: 18,
    description:
      'Fotografias reais de satélite em alta resolução para inspecionar cobertura vegetal, rios e relevo real.',
    isDark: true,
  },
  opentopo: {
    id: 'opentopo',
    name: 'OpenTopoMap (Topográfico)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> | Dados: <a href="https://www.ibge.gov.br">IBGE 2024</a>',
    maxZoom: 17,
    description:
      'Mapa topográfico com relevo sombreado e curvas de nível de elevação do terreno.',
    isDark: false,
  },
};

export const DEFAULT_BASEMAP_KEY = 'carto-light';

export function getBasemapProvider(key: string): BasemapProvider {
  return BASEMAP_PROVIDERS[key] || BASEMAP_PROVIDERS[DEFAULT_BASEMAP_KEY];
}

/**
 * Returns a concrete tile image URL for given coordinates using the provider's template.
 */
export function generateSampleTileUrl(providerKey: string, zoom: number, x: number, y: number): string {
  const provider = getBasemapProvider(providerKey);
  const subdomain = provider.subdomains ? provider.subdomains[0] : 'a';
  return provider.url
    .replace('{s}', subdomain)
    .replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
    .replace('{r}', '');
}
