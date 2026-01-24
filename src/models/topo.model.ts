import {
  AmountByEveryGrade,
  RouteAscentDto,
  RouteDto,
  RouteProjectDto,
  TopoDto,
} from '../models';

export interface TopoListItem {
  id: number;
  name: string;
  slug: string;
  photo?: string | null;
  grades: AmountByEveryGrade;
  shade_afternoon: boolean;
  shade_change_hour: string | null;
  shade_morning: boolean;
}

export interface RouteWithOwnData extends RouteDto {
  own_ascent?: RouteAscentDto | null;
  project?: boolean;
}

export interface TopoRouteWithRoute {
  topo_id: number;
  route_id: number;
  number: number;
  route: RouteWithOwnData;
}

export interface TopoDetail extends TopoDto {
  topo_routes: TopoRouteWithRoute[];
}
