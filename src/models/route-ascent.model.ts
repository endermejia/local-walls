import { PageableResponse } from './pagination.model';
import { RouteAscentDto, UserProfileDto } from './supabase-interfaces';
import { RouteWithExtras } from './route.model';

export interface RouteAscentWithExtras extends RouteAscentDto {
  user?: UserProfileDto;
  route?: RouteWithExtras;
}

export type RouteAscentsPage = PageableResponse<RouteAscentWithExtras>;
