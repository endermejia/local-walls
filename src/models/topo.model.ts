import { AmountByEveryGrade } from './grade.model';
import { RouteBasicWithOwnData } from './route.model';

import { Json, RouteAscentDto, RouteDto, TopoDto } from './supabase-interfaces';

export interface TopoListItem {
  id: number;
  name: string;
  slug: string;
  photo?: string | null;
  grades: AmountByEveryGrade;
  shade_afternoon: boolean;
  shade_change_hour: string | null;
  shade_morning: boolean;
  route_ids?: number[];
}

export interface RouteWithOwnData extends RouteDto {
  own_ascent?: RouteAscentDto | null;
  project?: boolean;
}

export interface TopoPath {
  points: { x: number; y: number }[];
  color?: string;
  width?: number;
  [key: string]: unknown;
}

/** Safely convert a TopoPath to Json for Supabase storage */
export function topoPathToJson(path: TopoPath | null | undefined): Json {
  return (path ?? null) as Json;
}

export interface TopoRouteWithRoute {
  topo_id: string | number;
  route_id: string | number;
  number: number;
  route: RouteBasicWithOwnData;
  path?: TopoPath | null;
}

export interface TopoDetail extends Omit<TopoDto, 'id'> {
  id: string | number;
  topo_routes: TopoRouteWithRoute[];
  legacy?: boolean | null;
  center_id?: string | null;
  crag?: {
    id: number;
    name: string;
    slug: string;
    area_id: number;
    user_creator_id: string | null;
    area: {
      id: number;
      name: string;
      slug: string;
      is_public: boolean;
      price: number;
      purchased?: boolean;
    };
  };
}

export interface TopoPathEditorResult {
  saved?: boolean;
  paths?: {
    routeId: string | number;
    path: TopoPath;
  }[];
  routeIds?: (string | number)[];
}
