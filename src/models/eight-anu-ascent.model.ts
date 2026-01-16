import { GradeLabel } from './grade.model';
import { AscentType } from './supabase-interfaces';

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
}
