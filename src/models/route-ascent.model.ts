import { RouteAscentDto, RouteWithExtras, UserProfileDto } from '../models';

export interface RouteAscentWithExtras extends RouteAscentDto {
  user?: UserProfileDto;
  route?: RouteWithExtras;
}

export interface PaginatedAscents {
  items: RouteAscentWithExtras[];
  total: number;
}
