import { GradeLabel } from './grade.model';
import { AscentType } from './supabase-interfaces';

export interface RouteScore {
  name: string;
  gradeLabel: GradeLabel;
  gradeId: number;
  score: number;
  type: AscentType;
  areaSlug: string;
  cragSlug: string;
  routeSlug: string;
}

export interface GradeDistributionRow {
  gradeLabel: GradeLabel;
  os: number;
  flash: number;
  rp: number;
  total: number;
  osRoutes: RouteScore[];
  flashRoutes: RouteScore[];
  rpRoutes: RouteScore[];
  allRoutes: RouteScore[];
}

export interface GradeDistribution {
  rows: GradeDistributionRow[];
  total: number;
  maxCount: number;
  hasMore: boolean;
}

export interface AscentTypeDistribution {
  os: number;
  flash: number;
  rp: number;
  total: number;
}

export interface TrendData {
  years: string[];
  series: readonly (readonly [number, number])[];
  maxY: number;
  minY: number;
}

export interface TrendDetail {
  totalScore: number;
  topRoutes: RouteScore[];
}

export interface TrendSourcePoint {
  label: string;
  score: number;
  topRoutes: RouteScore[];
}
