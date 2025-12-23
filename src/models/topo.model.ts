import { AmountByEveryGrade } from './grade.model';
import { TopoDto, RouteDto } from './supabase-interfaces';

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

export interface TopoRouteWithRoute {
  topo_id: number;
  route_id: number;
  number: number;
  route: RouteDto;
}

export interface TopoDetail extends TopoDto {
  topo_routes: TopoRouteWithRoute[];
}
