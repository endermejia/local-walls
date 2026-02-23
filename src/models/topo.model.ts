import { AmountByEveryGrade } from './grade.model';
import { RouteAscentDto, RouteDto, TopoDto } from './supabase-interfaces';

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
  [key: string]: unknown;
}

import { RouteBasicWithOwnData } from './route.model';

export interface TopoRouteWithRoute {
  topo_id: number;
  route_id: number;
  number: number;
  route: RouteBasicWithOwnData;
  path?: TopoPath | null;
}

export interface TopoDetail extends TopoDto {
  topo_routes: TopoRouteWithRoute[];
}

export interface ImageEditorResult {
  file?: File;
  paths?: {
    routeId: number;
    path: TopoPath;
  }[];
  routeIds?: number[];
}
