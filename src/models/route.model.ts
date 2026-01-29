import { RouteAscentDto, RouteDto } from '../models';

export interface RouteWithExtras extends RouteDto {
  liked: boolean;
  project: boolean;
  crag_slug?: string;
  crag_name?: string;
  area_id?: number;
  area_slug?: string;
  area_name?: string;
  rating?: number;
  ascent_count?: number;
  climbed?: boolean;
  own_ascent?: RouteAscentDto | null;
}
