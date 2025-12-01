import { AmountByEveryVerticalLifeGrade } from './grade.model';
import { CragListItem } from './crag.model';

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

// Supabase RPC get_areas_list response item
export interface AreaListItem {
  id: number;
  name: string;
  slug: string;
  liked: boolean;
  crags_count: number;
  grades: AmountByEveryVerticalLifeGrade | null;
}

// Supabase RPC toggle_area_like response
export interface AreaLikeToggleResult {
  action: string; // e.g. 'inserted' | 'deleted'
  total_likes: number;
}

export interface AreaDetail {
  id: number;
  name: string;
  slug: string;
  liked: boolean;
  grades: AmountByEveryVerticalLifeGrade;
  crags: CragListItem[];
}
