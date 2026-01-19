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
