import { Coordinates } from './coordinates.model';
import { AmountByEveryGrade } from './grade.model';
import type { Database } from './supabase-generated';
import { Parking } from './parking.model';
import { TopoListItem } from './topo.model';

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

export type CragListItem = Omit<
  Database['public']['Functions']['get_crags_list_by_area_slug']['Returns'][number],
  'grades'
> & {
  grades: AmountByEveryGrade;
};

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

// TODO: obtener topos y parkings
// parkings: Parking[];
// topos: TopoListItem[];

// Supabase RPC toggle_crag_like response
export interface CragLikeToggleResult {
  action: string; // 'inserted' | 'deleted'
  total_likes: number;
}
