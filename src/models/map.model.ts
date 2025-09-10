import { AmountByEveryVerticalLifeGrade } from './grade.model';
import { VERTICAL_LIFE_SEASON } from './season.model';

export interface MapAreaItem {
  id: number;
  name: string;
  slug: string;
  country_name: string;
  country_slug: string;
  area_type?: 0;
  b_box: [[number, number], [number, number]];
  liked?: boolean; // TODO: pending
}

export interface MapCragItem {
  area_name: string;
  area_slug: string;
  category: number;
  avg_rating: number;
  id: number; // zone id
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  grades: AmountByEveryVerticalLifeGrade;
  season: VERTICAL_LIFE_SEASON[];
  country_slug: string;
  country_name: string;
  total_ascendables?: number; // routes
  total_ascents?: number; // ascents
  liked?: boolean; // TODO: pending
}

export type MapItem = MapCragItem | MapAreaItem;

export interface MapCounts {
  locations: number; // crags
  map_collections: number; // areas
}

export interface MapResponse {
  items: MapItem[];
  counts: MapCounts;
}

export interface MapBounds {
  south_west_latitude: number;
  south_west_longitude: number;
  north_east_latitude: number;
  north_east_longitude: number;
  zoom: number;
  page_index?: number;
  page_size?: number;
}

/**
 * Opciones de configuración del mapa
 */
export interface MapOptions {
  center?: [number, number];
  zoom?: number;
  maxZoom?: number;
  minZoom?: number;
  clusteringEnabled?: boolean;
  clusterRadius?: number;
}

export interface MapAreaDataFeature {
  type: 'Feature';
  id?: string | number;
  bbox?: [number, number, number, number];
  properties: {
    id?: number;
    name?: string;
    slug?: string;
    country_name?: string;
    country_slug?: string;
    area_type?: number | string;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    // Polygon: number[ring][vertex][lng/lat]
    // MultiPolygon: number[poly][ring][vertex][lng/lat]
    coordinates: number[][][] | number[][][][];
  };
}

/**
 * GeoJSON de áreas del mapa (FeatureCollection con polígonos)
 * Basado en public/map/map_areas.json
 */
export interface MapAreasData {
  type: 'FeatureCollection';
  name?: string;
  bbox?: [number, number, number, number];
  features: MapAreaDataFeature[];
}

/**
 * GeoJSON de items del mapa (FeatureCollection con puntos)
 * Basado en public/map/map_items.json
 */
export interface MapItemDataFeature {
  type: 'Feature';
  id?: string | number;
  bbox?: [number, number, number, number];
  properties: {
    // Comunes
    id?: number; // zone id o area id
    name?: string;
    slug?: string;
    country_name?: string;
    country_slug?: string;
    // Para crags
    area_name?: string;
    area_slug?: string;
    category?: number; // tipo/categoría de crag
    avg_rating?: number;
    grades?: AmountByEveryVerticalLifeGrade | Record<string, unknown>;
    season?: VERTICAL_LIFE_SEASON[] | number[];
    total_ascendables?: number;
    total_ascents?: number;
    liked?: boolean;
    // Para áreas
    area_type?: number | string;
    b_box?: [[number, number], [number, number]];
    // Genérico
    [key: string]: unknown;
  };
  geometry: {
    type: 'Point';
    // [lng, lat]
    coordinates: [number, number];
  };
}

export interface MapItemsData {
  type: 'FeatureCollection';
  name?: string;
  bbox?: [number, number, number, number];
  features: MapItemDataFeature[];
}

/**
 * GeoJSON de polígonos del mapa (FeatureCollection con polígonos)
 * Basado en public/map/map_polygons.json
 */
export interface MapPolygonDataFeature {
  type: 'Feature';
  id?: string | number;
  bbox?: [number, number, number, number];
  properties: {
    id?: number;
    name?: string;
    slug?: string;
    // referencia al crag/área
    area_name?: string;
    area_slug?: string;
    country_name?: string;
    country_slug?: string;
    category?: number;
    area_type?: number | string;
    liked?: boolean;
    [key: string]: unknown;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][]; // ver comentario en MapAreaDataFeature
  };
}

export interface MapPolygonsData {
  type: 'FeatureCollection';
  name?: string;
  bbox?: [number, number, number, number];
  features: MapPolygonDataFeature[];
}
