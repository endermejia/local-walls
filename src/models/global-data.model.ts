/**
 * Modelo para datos de centro indoor en el mapa
 */
export interface MapIndoorCenterRaw {
  id: string;
  name: string;
  slug: string;
  latitude: number | string;
  longitude: number | string;
  city?: string | null;
  country?: string | null;
  avatar_url?: string | null;
  routes?: {
    grade: number | null;
    climbing_kind?: string | null;
    legacy?: boolean | null;
  }[];
  topos?: {
    id: string;
    name: string;
  }[];
}

/**
 * Modelo para datos de ruta indoor en el mapa
 */
export interface MapIndoorRouteRaw {
  grade: number | null;
  climbing_kind?: string | null;
  legacy?: boolean | null;
}

/**
 * Modelo para datos de topo indoor en el mapa
 */
export interface MapIndoorTopoRaw {
  id: string;
  name: string;
}
