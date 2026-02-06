import { RouteAscentDto, UserProfileDto } from './supabase-interfaces';
import { RouteWithExtras } from './route.model';

export interface RouteAscentWithExtras extends RouteAscentDto {
  user?: UserProfileDto;
  route?: RouteWithExtras;
  likes_count?: number;
  user_liked?: boolean;
}

export interface PaginatedAscents {
  items: RouteAscentWithExtras[];
  total: number;
}
