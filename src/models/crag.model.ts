import { Coordinates } from './coordinates.model';

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
