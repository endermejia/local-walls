import { EquipperDto, RouteAscentDto, RouteDto } from './supabase-interfaces';

export interface RouteBasicDto
  extends Pick<RouteDto, 'id' | 'name' | 'slug' | 'grade' | 'climbing_kind'> {
  height?: number | null;
}

export interface RouteBasicWithOwnData extends RouteBasicDto {
  own_ascent?: RouteAscentDto | null;
  project?: boolean;
}

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
  topos?: { id: number; name: string; slug: string }[];
  equippers?: EquipperDto[];
}
