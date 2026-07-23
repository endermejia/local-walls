import { EquipperDto, RouteAscentDto, RouteDto } from './supabase-interfaces';
import { IndoorRouteWithExtras } from './indoor.model';
import { AscentType } from './app-enums.model';
import { CragDto } from './crag.model';

export interface RouteBasicDto extends Pick<
  RouteDto,
  'name' | 'slug' | 'grade' | 'climbing_kind'
> {
  id: string | number;
  height?: number | null;
}

export interface RouteBasicWithOwnData extends RouteBasicDto {
  own_ascent?: RouteAscentDto | null;
  project?: boolean;
}

export interface RouteWithExtras extends RouteDto {
  liked: boolean;
  project: boolean;
  crag_slug?: string;
  crag_name?: string;
  center_slug?: string;
  center_name?: string;
  area_id?: number;
  area_slug?: string;
  area_name?: string;
  rating?: number;
  ascent_count?: number;
  climbed?: boolean;
  own_ascent?: RouteAscentDto | null;
  topos?: { id: number; name: string; slug: string }[];
  equippers?: EquipperDto[];
}

/** Supabase route query with common joins (for mapRouteToExtras) */
export interface RouteWithJoins extends RouteDto {
  liked: { id: number }[];
  project: { id: number }[];
  ascents: { rate: number | null; type: AscentType }[];
  own_ascent: RouteAscentDto[];
  crag:
    | (CragDto & {
        area: { id: number; name: string; slug: string } | null;
      })
    | null;
  route_equippers?: { equipper: EquipperDto }[];
  topo_routes?: { topo: { id: number; name: string; slug: string } }[];
}

/** Route query result for profile ascents (uses 'crags' alias instead of 'crag') */
export interface RouteWithJoinsAlias extends RouteDto {
  liked: { id: number }[];
  project: { id: number }[];
  ascents: { rate: number | null; type: AscentType }[];
  crag:
    | (CragDto & {
        areas?: { slug?: string; name?: string };
        area?: { id: number; name: string; slug: string } | null;
      })
    | null;
}

/** Row returned by getRoutesByAreaSimple query */
export interface RouteSimpleRow {
  id: number;
  name: string;
  slug?: string;
  crag_id: number;
  crag: {
    name: string;
    slug?: string;
    area_id: number;
    area_slug?: string;
    area_name?: string;
  } | null;
}

export type RouteItem = RouteWithExtras;

export type RoutesTableKey =
  | 'grade'
  | 'route'
  | 'topo'
  | 'height'
  | 'rating'
  | 'ascents'
  | 'actions'
  | 'equippers'
  | 'admin_actions'
  | 'expand'
  | 'color';

export interface RoutesTableRow {
  id: string | number;
  key: string;
  grade: string;
  gradeValue: number;
  climbing_kind: RouteDto['climbing_kind'] | null;
  route: string;
  area_name?: string;
  crag_name?: string;
  area_slug?: string;
  crag_slug?: string;
  height: number | null;
  color: string | null;
  legacy?: boolean;
  rating: number;
  ascents: number;
  liked: boolean;
  project: boolean;
  climbed: boolean;
  link: string[];
  topos: {
    id: number | string;
    name: string;
    legacy?: boolean;
    link: string[];
  }[];
  equippers: EquipperDto[];
  own_ascent: { id: number | string; type: AscentType | null } | null;
  isIndoor: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canAddTopo?: boolean;
  _ref: RouteItem | IndoorRouteWithExtras;
}
