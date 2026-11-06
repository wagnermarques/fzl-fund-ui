/**
 * Slippy Map Tile Mathematics & Web Mercator (EPSG:3857) Projections
 *
 * Implements the standard tile pyramid calculations used by Leaflet, OpenStreetMap,
 * CartoDB, Google Maps, and Esri:
 *   - Earth is projected onto a square of 2^Z x 2^Z tiles
 *   - Each tile is 256x256 pixels
 *   - Total world tiles at zoom Z = 4^Z = (2^Z)^2
 */

export interface TileCoords {
  x: number;
  y: number;
  z: number;
}

export interface VisibleTilesRange {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  countX: number;
  countY: number;
  total: number;
}

export interface TilePyramidStats {
  zoom: number;
  gridDimension: number;
  totalWorldTiles: number;
  centerTile: TileCoords;
  visibleRange?: VisibleTilesRange;
}

export interface ZoomPreset {
  label: string;
  zoom: number;
  description: string;
}

export const ZOOM_PRESETS: ZoomPreset[] = [
  { label: 'Mundo', zoom: 0, description: 'Visão global planetária (Z=0)' },
  { label: 'América', zoom: 3, description: 'Visão continental das Américas (Z=3)' },
  { label: 'Brasil', zoom: 4, description: 'Visão nacional do Brasil (Z=4)' },
  { label: 'Estado', zoom: 7, description: 'Visão estadual / regional (Z=7)' },
  { label: 'Cidade', zoom: 11, description: 'Visão municipal / metropolitana (Z=11)' },
  { label: 'Rua', zoom: 15, description: 'Visão urbana detalhada de ruas (Z=15)' },
];

/**
 * Converts WGS-84 Geographic Coordinates (Latitude, Longitude) into Slippy Map Tile (X, Y)
 * at a specific integer zoom level Z using the spherical Web Mercator projection.
 */
export function latLngToTileCoords(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );

  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
  };
}

/**
 * Calculates the bounding range of tile coordinates visible within the current map viewport.
 */
export function calculateVisibleTilesRange(
  nw: { lat: number; lng: number },
  se: { lat: number; lng: number },
  zoom: number
): VisibleTilesRange {
  const nwTile = latLngToTileCoords(nw.lat, nw.lng, zoom);
  const seTile = latLngToTileCoords(se.lat, se.lng, zoom);

  const minX = Math.min(nwTile.x, seTile.x);
  const maxX = Math.max(nwTile.x, seTile.x);
  const minY = Math.min(nwTile.y, seTile.y);
  const maxY = Math.max(nwTile.y, seTile.y);

  const countX = maxX - minX + 1;
  const countY = maxY - minY + 1;
  const total = countX * countY;

  return { minX, maxX, minY, maxY, countX, countY, total };
}

/**
 * Calculates all mathematical pyramid statistics for the current zoom and center point.
 */
export function calculateTilePyramidStats(
  zoom: number,
  centerLat: number,
  centerLng: number,
  viewportBounds?: { nw: { lat: number; lng: number }; se: { lat: number; lng: number } }
): TilePyramidStats {
  const roundedZoom = Math.round(zoom);
  const gridDimension = Math.pow(2, roundedZoom);
  const totalWorldTiles = Math.pow(4, roundedZoom);
  const tileXY = latLngToTileCoords(centerLat, centerLng, roundedZoom);

  let visibleRange: VisibleTilesRange | undefined;
  if (viewportBounds) {
    visibleRange = calculateVisibleTilesRange(viewportBounds.nw, viewportBounds.se, roundedZoom);
  }

  return {
    zoom: roundedZoom,
    gridDimension,
    totalWorldTiles,
    centerTile: {
      x: tileXY.x,
      y: tileXY.y,
      z: roundedZoom,
    },
    visibleRange,
  };
}
