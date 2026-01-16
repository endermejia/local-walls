import { RouteWithExtras } from './route.model';
import { RouteAscentDto, UserProfileDto } from './supabase-interfaces';

export interface RouteAscentWithExtras extends RouteAscentDto {
  user?: UserProfileDto;
  route?: RouteWithExtras;
}

export interface PaginatedAscents {
  items: RouteAscentWithExtras[];
  total: number;
}
