import { AmountByEveryVerticalLifeGrade, GradeLabel } from './grade.model';

export interface ClimbingRouteResponse {
  zlaggable: ClimbingRoute;
  isEditable?: boolean;
  isFollowed?: boolean;
  isGradeEditable?: boolean;
}

export interface ClimbingRoute {
  zlaggableId: number;
  zlaggableName: string;
  zlaggableSlug: string;
  difficulty?: GradeLabel;
  averageRating?: number;
  totalAscents?: number;
  totalFlash?: number;
  totalOnsight?: number;
  totalRedpoint?: number;
  totalTopRope?: number;
  totalRecommended?: number;
  totalRecommendedRate?: number;
  flashOnsightRate?: number;
  onsightRate?: number;
  sectorSlug?: string;
  sectorName?: string;
  sectorId?: number;
  cragId?: number;
  cragName?: string;
  cragSlug?: string;
  areaName?: string;
  areaSlug?: string;
  countryName?: string;
  countrySlug?: string;
  gradeIndex?: number;
  grades?: AmountByEveryVerticalLifeGrade;
  hasVlId?: boolean;
  premium?: boolean;
  season?: number[];
  totalFollowers?: number;
  unifiedId?: number;
}
