import { PageableResponse } from './pagination.model';
import { RouteDto } from './supabase-interfaces';

export interface RouteWithExtras extends RouteDto {
  liked: boolean;
  project: boolean;
}

export type RoutesPage = PageableResponse<RouteWithExtras>;
