import { Coordinates } from './coordinates.model';
import { PageableResponse } from './pagination.model';
import { AmountByEveryVerticalLifeGrade } from './grade.model';

export interface ClimbingCrag {
  unifiedId?: number;
  cragSlug: string;
  vlLocationId?: number | null;
  cragName: string;
  totalZlaggables?: number;
  areaSlug: string;
  areaName: string;
  countrySlug: string;
  countryName: string;
  category?: number;
  totalAscents?: number;
  averageRating?: number;
  location: Coordinates | null;
  description?: string | null;
  totalSectors?: number;
}

export interface ClimbingCragResponse {
  crag: ClimbingCrag;
  isEditable?: boolean;
  isFollowed?: boolean;
}

export type ClimbingCragsPage = PageableResponse<ClimbingCrag>;

export interface CragListItem {
  id: number;
  name: string;
  slug: string;
  routes_count: number; // routes
  grades: AmountByEveryVerticalLifeGrade;
}
