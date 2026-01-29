import { RouteAscentDto, RouteWithExtras, UserProfileDto } from '../models';

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
