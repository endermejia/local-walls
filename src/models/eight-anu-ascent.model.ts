import { AscentType, ClimbingKind, GradeLabel } from '../models';

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
  unifiedId: number;
  zlaggableSlug: string;
  gradeIndex: number;
  premium: boolean;
  zlaggableName: string;
  zlaggableId: number;
  cragSlug: string;
  cragName: string;
  cragId: number;
  countrySlug: string;
  countryName: string;
  sectorSlug: string;
  sectorName: string;
  sectorId: number;
  category: number;
  difficulty: string;
  areaSlug: string;
  areaName: string;
  hasVlId: boolean;
  averageRating: number;
  totalAscents: number;
  onsightRate?: number;
  flashOnsightRate?: number;
  totalRecommended?: number;
  totalRecommendedRate?: number;
  grades?: Record<string, number>;
  totalRedpoint?: number;
  totalFlash?: number;
  totalGo?: number;
  totalTopRope?: number;
  totalOnsight?: number;
  totalFollowers?: number;
  galleryImagesAmount?: number;
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
