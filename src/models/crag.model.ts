import { Coordinates } from './coordinates.model';
import { AmountByEveryGrade } from './grade.model';
import type { Database } from './supabase-generated';
import { Parking } from './parking.model';
import { TopoListItem } from './topo.model';
import {
  EquipperDto,
  RouteDto,
  TableInsert,
  TableRow,
  TableUpdate,
} from './supabase-interfaces';

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

// export interface CragDetail_DEPRECATED { ... } // Removed

export interface AdditionalCragData {
  description_es?: string;
  description_en?: string;
  warning_es?: string;
  warning_en?: string;
  latitude: number;
  longitude: number;
  approach?: number;
  area_id?: number;
}

export type CragDetail = CragListItem &
  AdditionalCragData & {
    area_name: string;
    area_slug: string;
    parkings: Parking[];
    topos: TopoListItem[];
    // routes are fetched separately via cragRoutesResource
  };

// Para la futura llamada get_routes_list_by_crag_slug
export interface RouteListItem {
  climbing_kind: Database['public']['Enums']['climbing_kind'];
  grade: number;
  height: number | null;
  id: number;
  name: string;
  slug: string;
  liked: boolean; // incluir function toggleRouteLike
  project: boolean; // incluir function toggleProjectRoute
  equippers: EquipperDto[];
}

// TODO: obtener topos y parkings
// parkings: Parking[];
// topos: TopoListItem[];

// Crags
export type CragDto = TableRow<'crags'>;
export type CragInsertDto = TableInsert<'crags'>;
export type CragUpdateDto = TableUpdate<'crags'>;

// Crag Likes
export type CragLikeDto = TableRow<'crag_likes'>;
export type CragLikeInsertDto = TableInsert<'crag_likes'>;
export type CragLikeUpdateDto = TableUpdate<'crag_likes'>;

// Crag Parkings
export type CragParkingDto = TableRow<'crag_parkings'>;
export type CragParkingInsertDto = TableInsert<'crag_parkings'>;
export type CragParkingUpdateDto = TableUpdate<'crag_parkings'>;

// Crag Equippers
export type CragEquipperDto = TableRow<'crag_equippers'>;
export type CragEquipperInsertDto = TableInsert<'crag_equippers'>;
export type CragEquipperUpdateDto = TableUpdate<'crag_equippers'>;
