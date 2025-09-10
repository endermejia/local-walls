import { AmountByEveryVerticalLifeGrade } from './grade.model';

export interface ClimbingArea {
  areaName: string;
  areaSlug: string;
  averageRating?: number;
  countryName: string;
  countrySlug: string;
  description?: string | null;
  grades: AmountByEveryVerticalLifeGrade;
  hasBouldering?: boolean;
  hasSportClimbing?: boolean;
  image?: string | null;
  onsightRate?: number;
  polygon?: string;
  season?: number[];
  topImages?: string[];
  totalAscents?: number;
  totalBoulders?: number;
  totalFollowers?: number | null;
  totalRoutes?: number;
  totalZlaggables?: number; // Ascents
  unifiedId?: number;
  vlAreaId?: number | null;
}

export interface ClimbingAreaResponse {
  area: ClimbingArea;
  isEditable?: boolean;
  isFollowed?: boolean;
}
