import { AmountByEveryGrade } from './grade.model';
import type { Database } from './supabase-generated';
import { ParkingDto } from './supabase-interfaces';
import { TopoListItem } from './topo.model';
import { TableInsert, TableRow, TableUpdate } from './supabase-interfaces';

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
    parkings: ParkingDto[];
    topos: TopoListItem[];
  };

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
