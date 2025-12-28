import { AmountByEveryGrade } from './grade.model';
import { VERTICAL_LIFE_SEASON } from './season.model';

export interface MapAreaItem {
  id: number;
  name: string;
  slug: string;
  country_name?: string;
  country_slug?: string;
  area_type?: 0;
  b_box?: [[number, number], [number, number]];
  liked?: boolean;
  grades?: AmountByEveryGrade;
  crags_count?: number;
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
  grades: AmountByEveryGrade;
  routes_count?: number; // routes
  ascents_count?: number; // ascents
  liked?: boolean;
  approach?: number;
  shade_morning?: boolean;
  shade_afternoon?: boolean;
  shade_all_day?: boolean;
  sun_all_day?: boolean;
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
}

/**
 * Map configuration options
 */
export interface MapOptions {
  center?: [number, number];
  zoom?: number;
  maxZoom?: number;
  minZoom?: number;
  clusteringEnabled?: boolean;
  clusterRadius?: number;
  ignoreSavedViewport?: boolean;
}

/**
 * Map items GeoJSON (FeatureCollection with points)
 * Based on public/map/map_crags.json
 */
export interface MapCragDataFeature {
  type: 'Feature';
  id?: string | number;
  bbox?: [number, number, number, number];
  properties: {
    // Common
    item_id?: number; // reference id for GeoJSON
    id?: number; // zone id or area id
    name?: string;
    slug?: string;
    country_name?: string;
    country_slug?: string;
    // For crags
    area_name?: string;
    area_slug?: string;
    category?: number; // crag type/category
    avg_rating?: number;
    grades?: AmountByEveryGrade | Record<string, unknown>;
    season?: VERTICAL_LIFE_SEASON[] | number[];
    total_ascendables?: number;
    total_ascents?: number;
    liked?: boolean;
    // For areas
    area_type?: number | string;
    b_box?: [[number, number], [number, number]];
    // Generic
    [key: string]: unknown;
  };
  geometry: {
    type: 'Point';
    // [lng, lat]
    coordinates: [number, number];
  };
}

export interface MapCragsData {
  type: 'FeatureCollection';
  name?: string;
  bbox?: [number, number, number, number];
  features: MapCragDataFeature[];
}
