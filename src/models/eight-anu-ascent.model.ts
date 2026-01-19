import { ClimbingKind, AscentType } from './supabase-interfaces';
import { GradeLabel } from './grade.model';

export interface EightAnuAscent {
  route_boulder: 'ROUTE' | 'BOULDER';
  name: string; // route name
  location_name: string; // area name
  sector_name: string; // crag name
  country_code: string;
  date: string;
  type: AscentType;
  rating: number;
  tries: number;
  difficulty: GradeLabel;
  comment: string;
  recommended: boolean;
  climbing_kind?: ClimbingKind;
}

export interface EightAnuRoute {
  zlaggableName: string;
  difficulty: string;
  gradeIndex: number;
  zlaggableSlug: string;
  sectorSlug: string;
  cragSlug: string;
}

export interface EightAnuRoutesResponse {
  items: EightAnuRoute[];
  pagination: {
    pageSize: number;
    totalItems: number;
    itemsOnPage: number;
    pageCount: number;
    hasNext: boolean;
    pageIndex: number;
  };
}
