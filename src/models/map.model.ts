import { AmountByEveryVerticalLifeGrade } from './grade.model';
import { VERTICAL_LIFE_SEASON } from './season.model';

export interface MapAreaItem {
  id: number;
  name: string;
  slug: string;
  country_name: string;
  country_slug: string;
  area_type?: number; // 0 == area, ignore
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
}

// To filter response items without an id
interface MapUnknownItem {
  id?: number;
}

export type MapAnyItem = MapCragItem | MapAreaItem | MapUnknownItem;

export type MapItem = MapCragItem | MapAreaItem;

export interface MapResponse {
  items: MapAnyItem[];
  counts: {
    locations: number; // crags
    map_collections: number; // areas
  };
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
