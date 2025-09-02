// Map-related shared interfaces

/**
 * Elementos visibles actualmente en el viewport del mapa
 */
export interface MapVisibleElements {
  zoneIds: string[];
  cragIds: string[];
}

/**
 * Opciones de configuración del mapa
 */
export interface MapOptions {
  center?: [number, number];
  zoom?: number;
  maxZoom?: number;
  minZoom?: number;
}
