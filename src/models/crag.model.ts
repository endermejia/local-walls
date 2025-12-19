import { Coordinates } from './coordinates.model';
import { PageableResponse } from './pagination.model';
import { AmountByEveryGrade } from './grade.model';
import { TopoListItem } from './topo.model';
import { Parking } from './parking.model';
import { ClimbingKind } from './supabase-interfaces';

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
  liked: boolean; // si el usuario le ha dado like a este crag (tabla crag_likes)
  topos_count: number; // numero de topos que hay en este crag (tabla topos)
  grades: AmountByEveryGrade; // suma de routes por grado que hay dentro de este crag (tabla routes)
  climbing_kind: ClimbingKind[]; // los distintos climbing_kind que hay en las rutas de este crag (tabla routes)
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

// Supabase RPC toggle_crag_like response
export interface CragLikeToggleResult {
  action: string; // 'inserted' | 'deleted'
  total_likes: number;
}
