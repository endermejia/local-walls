import { RouteWithExtras } from './route.model';
import { RouteAscentDto } from './supabase-interfaces';
import { UserProfileBasicDto } from './user.model';

export interface RouteAscentWithExtras extends RouteAscentDto {
  user?: UserProfileBasicDto;
  route?: RouteWithExtras;
  likes_count?: number;
  user_liked?: boolean;
  is_duplicate?: boolean;
}

export interface PaginatedAscents {
  items: RouteAscentWithExtras[];
  total: number;
}

export interface UserAscentStatRecord {
  ascent_date: string;
  ascent_type: string;
  ascent_grade: number | null;
  route_grade: number;
  route_name: string;
  route_slug: string;
  crag_slug: string;
  area_slug: string;
}
