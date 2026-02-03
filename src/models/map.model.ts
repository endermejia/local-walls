import { AmountByEveryGrade } from '../models';

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
  climbing_kind?: string[];
  shade_morning?: boolean;
  shade_afternoon?: boolean;
  shade_all_day?: boolean;
  sun_all_day?: boolean;
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
  topos_count?: number; // topos
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
  zoom?: number;
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
