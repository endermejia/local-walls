import { Coordinates } from './coordinates.model';
import { PageableResponse } from './pagination.model';
import { AmountByEveryGrade } from './grade.model';
import { TopoListItem } from './topo.model';
import { Parking } from './parking.model';

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
  liked: boolean;
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
  liked: boolean;
  topos_count: number;
  grades: AmountByEveryGrade;
}

export interface CragDetail {
  id: number;
  name: string;
  slug: string;
  area_name: string;
  area_slug: string;
  description_es?: string;
  description_en?: string;
  warning_es?: string;
  warning_en?: string;
  liked: boolean;
  grades: AmountByEveryGrade;
  latitude: number;
  longitude: number;
  approach: number;
  parkings: Parking[];
  topos: TopoListItem[];
}
