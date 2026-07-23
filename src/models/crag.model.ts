import { AmountByEveryGrade } from './grade.model';
import { TopoListItem } from './topo.model';

import { Database } from './supabase-generated';
import { ParkingDto } from './supabase-interfaces';
import { TableInsert, TableRow, TableUpdate } from './supabase-interfaces';
import { TopoDto } from './supabase-interfaces';

export interface CragListItem extends Omit<
  Database['public']['Functions']['get_crags_list']['Returns'][number],
  'grades' | 'topos'
> {
  grades: AmountByEveryGrade;
  topos: { id: number; name: string; slug: string }[];
  // Extra fields from Map data or others
  approach?: number;
}

export interface AdditionalCragData {
  description_es?: string;
  description_en?: string;
  warning_es?: string;
  warning_en?: string;
  latitude: number;
  longitude: number;
}

export interface CragDetail extends CragListItem, AdditionalCragData {
  area_name: string;
  area_slug: string;
  parkings: ParkingDto[];
  topos: TopoListItem[];
  eight_anu_crag_slugs?: string[] | null;
  eight_anu_sector_slugs?: string[] | null;
  is_public: boolean;
  price: number;
  stripe_account_id: string | null;
  purchased: boolean;
}

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

export interface CragWithJoins extends CragDto {
  area: {
    id: number;
    name: string;
    slug: string;
    eight_anu_crag_slugs: string[] | null;
    is_public: boolean | null;
    price: number | null;
    stripe_account_id: string | null;
    purchased: { id: string }[];
  } | null;
  crag_parkings: { parking: ParkingDto }[] | null;
  topos:
    | (TopoDto & {
        topo_routes: { route_id: number; route: { grade: number } | null }[];
      })[]
    | null;
  liked: { id: number }[];
}

/** Raw row returned by get_crags_list RPC (grades/topos are Json from DB) */
export interface CragListRpcRow {
  id: number;
  name: string;
  slug: string;
  area_id: number;
  grades: unknown;
  topos: unknown;
  approach?: number;
  is_public?: boolean | null;
  price?: number | null;
  purchased?: boolean;
  user_creator_id?: string | null;
  created_at?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  eight_anu_sector_slugs?: string[] | null;
}

/** Row returned by getAllCragsSimple query */
export interface CragSimpleRow {
  id: number;
  name: string;
  slug: string;
  area_id: number;
  area: { name: string; slug: string } | null;
}
