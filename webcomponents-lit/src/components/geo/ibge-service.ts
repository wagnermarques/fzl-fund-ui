/**
 * IBGE Territorial Meshes & Thematic Cartography Service
 *
 * Provides metadata, endpoints (servicodados.ibge.gov.br), in-memory caching,
 * Level of Detail (LOD) mapping, and deterministic regional color calculations.
 */

export type IbgeLayerKey = 'pais' | 'regioes' | 'uf' | 'municipios';

export interface IbgeLayerMetadata {
  key: IbgeLayerKey;
  name: string;
  description: string;
  apiUrl: string;
  fallbackPath: string;
  featuresExpected: number;
  sizeEstimate: string;
  recommendedZoom: string;
  minZoomLOD: number;
  maxZoomLOD: number;
}

export interface CachedLayerData {
  data: any;
  featuresCount: number;
  payloadSizeBytes: number;
  downloadDurationMs: number;
  fromCache: boolean;
  timestamp: number;
}

export const IBGE_LAYERS_ORDER: IbgeLayerKey[] = ['pais', 'regioes', 'uf', 'municipios'];

export const IBGE_LAYERS_METADATA: Record<IbgeLayerKey, IbgeLayerMetadata> = {
  pais: {
    key: 'pais',
    name: 'Contorno do País (Brasil)',
    description: 'Contorno Nacional do Brasil',
    apiUrl:
      'https://servicodados.ibge.gov.br/api/v4/malhas/paises/BR?qualidade=minima&formato=application/vnd.geo+json',
    fallbackPath: 'https://claudiadaros75.github.io/Mapeamento-Intersetorial/data/BR_pais_2024_minima.geojson',
    featuresExpected: 1,
    sizeEstimate: '~15 KB',
    recommendedZoom: 'Z = 0 a 3',
    minZoomLOD: 0,
    maxZoomLOD: 3,
  },
  regioes: {
    key: 'regioes',
    name: 'Grandes Regiões (5)',
    description: '5 Grandes Regiões (N, NE, CO, SE, S)',
    apiUrl:
      'https://servicodados.ibge.gov.br/api/v4/malhas/paises/BR?qualidade=minima&formato=application/vnd.geo+json&intrarregiao=regiao',
    fallbackPath: 'https://claudiadaros75.github.io/Mapeamento-Intersetorial/data/BR_regioes_2024_minima.geojson',
    featuresExpected: 5,
    sizeEstimate: '~33 KB',
    recommendedZoom: 'Z = 4',
    minZoomLOD: 4,
    maxZoomLOD: 4,
  },
  uf: {
    key: 'uf',
    name: 'Unidades da Federação (27)',
    description: '27 Unidades da Federação (Estados e DF)',
    apiUrl:
      'https://servicodados.ibge.gov.br/api/v4/malhas/paises/BR?qualidade=minima&formato=application/vnd.geo+json&intrarregiao=UF',
    fallbackPath: 'https://claudiadaros75.github.io/Mapeamento-Intersetorial/data/BR_uf_2024_minima.geojson',
    featuresExpected: 27,
    sizeEstimate: '~117 KB',
    recommendedZoom: 'Z = 5 a 7',
    minZoomLOD: 5,
    maxZoomLOD: 7,
  },
  municipios: {
    key: 'municipios',
    name: 'Municípios do Brasil (5.571)',
    description: '5.571 Municípios Brasileiros',
    apiUrl:
      'https://servicodados.ibge.gov.br/api/v4/malhas/paises/BR?qualidade=minima&formato=application/vnd.geo+json&intrarregiao=municipio',
    fallbackPath: 'https://claudiadaros75.github.io/Mapeamento-Intersetorial/data/BR_municipios_2024_minima.geojson',
    featuresExpected: 5571,
    sizeEstimate: '~5.3 MB',
    recommendedZoom: 'Z = 8 a 18',
    minZoomLOD: 8,
    maxZoomLOD: 18,
  },
};

// Regional official color coding
export const REGION_COLORS: Record<string, string> = {
  '1': '#2b83ba', // Norte
  Norte: '#2b83ba',
  N: '#2b83ba',

  '2': '#abdda4', // Nordeste
  Nordeste: '#abdda4',
  NE: '#abdda4',

  '5': '#ffffbf', // Centro-Oeste
  'Centro-Oeste': '#ffffbf',
  CO: '#ffffbf',

  '3': '#fdae61', // Sudeste
  Sudeste: '#fdae61',
  SE: '#fdae61',

  '4': '#d7191c', // Sul
  Sul: '#d7191c',
  S: '#d7191c',
};

export const PAIS_COLOR = '#64748b';

export const MUNICIPIO_PALETTE = [
  '#f97316', '#a855f7', '#14b8a6', '#eab308',
  '#ec4899', '#22c55e', '#0ea5e9', '#f43f5e',
  '#84cc16', '#8b5cf6', '#06b6d4', '#d946ef',
];

export const UF_LIGHTNESS_STEPS = [0, -16, 14, -28, 26, -8, 8, 20, -20];

export const UF_BORDER_COLOR = '#1e293b';
export const UF_BORDER_WEIGHT = 2.2;

/** Deterministic djb2 hash string */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

export function getRegionBaseColor(properties: any): string {
  if (!properties) return '#60a5fa';
  const regId =
    properties.cd_regiao || properties.sigla_regiao || properties.sigla || properties.nome;
  return REGION_COLORS[regId] || '#60a5fa';
}

export function getUfColor(properties: any): string {
  const baseColor = getRegionBaseColor(properties);
  const hsl = hexToHsl(baseColor);
  const ufKey = properties.sigla || properties.codarea || properties.nome || '';
  const stepIndex = hashString(String(ufKey)) % UF_LIGHTNESS_STEPS.length;
  const lightness = Math.min(80, Math.max(22, hsl.l + UF_LIGHTNESS_STEPS[stepIndex]));
  return hslToHex(hsl.h, hsl.s, lightness);
}

export function getMunicipioColor(properties: any): string {
  const key = properties.codarea || properties.nome || '';
  const index = hashString(String(key)) % MUNICIPIO_PALETTE.length;
  return MUNICIPIO_PALETTE[index];
}

/**
 * Returns the fill color for any feature depending on its territorial layer key
 */
export function getFeatureColor(properties: any, layerKey: IbgeLayerKey): string {
  if (!properties) return '#3b82f6';
  switch (layerKey) {
    case 'pais':
      return PAIS_COLOR;
    case 'uf':
      return getUfColor(properties);
    case 'municipios':
      return getMunicipioColor(properties);
    case 'regioes':
    default:
      return getRegionBaseColor(properties);
  }
}

/**
 * Generates Leaflet vector style object for a given feature
 */
export function getFeatureStyle(feature: any, layerKey: IbgeLayerKey) {
  const isUf = layerKey === 'uf';
  return {
    fillColor: getFeatureColor(feature?.properties, layerKey),
    weight: isUf ? UF_BORDER_WEIGHT : 1.2,
    opacity: 1,
    color: isUf ? UF_BORDER_COLOR : '#ffffff',
    dashArray: '',
    fillOpacity: 0.72,
  };
}

export const FEATURE_HIGHLIGHT_STYLE = {
  weight: 3.2,
  color: '#1d4ed8',
  dashArray: '',
  fillOpacity: 0.9,
};

/**
 * Calculates the target IBGE mesh layer key based on the current zoom level for Auto-LOD
 */
export function getAutoLodLayerForZoom(zoom: number): IbgeLayerKey {
  const rounded = Math.round(zoom);
  if (rounded <= 3) return 'pais';
  if (rounded === 4) return 'regioes';
  if (rounded >= 5 && rounded <= 7) return 'uf';
  return 'municipios';
}

// In-memory cache for downloaded GeoJSON datasets
const inMemoryGeoJsonCache: Partial<Record<IbgeLayerKey, CachedLayerData>> = {};

/**
 * Loads GeoJSON mesh data for an IBGE layer with automatic in-memory caching
 */
export async function fetchIbgeLayer(layerKey: IbgeLayerKey): Promise<CachedLayerData> {
  const meta = IBGE_LAYERS_METADATA[layerKey];
  if (!meta) {
    throw new Error(`Camada IBGE desconhecida: "${layerKey}"`);
  }

  // Check cache
  const cached = inMemoryGeoJsonCache[layerKey];
  if (cached) {
    return { ...cached, fromCache: true };
  }

  const startTime = performance.now();
  let response: Response;

  try {
    // Attempt primary IBGE API endpoint
    response = await fetch(meta.apiUrl, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch {
    // Fallback to static GeoJSON mirror
    response = await fetch(meta.fallbackPath, { mode: 'cors' });
    if (!response.ok) {
      throw new Error(`Falha ao obter malha ${meta.name} (HTTP ${response.status})`);
    }
  }

  const payloadText = await response.text();
  const payloadSizeBytes = new Blob([payloadText]).size;
  const data = JSON.parse(payloadText);
  const downloadDurationMs = performance.now() - startTime;
  const featuresCount = Array.isArray(data.features) ? data.features.length : meta.featuresExpected;

  const entry: CachedLayerData = {
    data,
    featuresCount,
    payloadSizeBytes,
    downloadDurationMs,
    fromCache: false,
    timestamp: Date.now(),
  };

  inMemoryGeoJsonCache[layerKey] = entry;
  return entry;
}
