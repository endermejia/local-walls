import { AmountByEveryGrade } from './grade.model';

import { Database } from './supabase-generated';
import { TableInsert, TableRow, TableUpdate } from './supabase-interfaces';

// Areas
export type AreaDto = TableRow<'areas'>;
export type AreaInsertDto = TableInsert<'areas'>;
export type AreaUpdateDto = TableUpdate<'areas'>;
export interface AreaListItem extends Omit<
  Database['public']['Functions']['get_areas_list']['Returns'][number],
  'grades'
> {
  grades: AmountByEveryGrade;
  topos_count: number;
  is_public?: boolean | null;
  price?: number | null;
  purchased?: boolean;
}

/** Raw row returned by get_areas_list RPC (grades is Json from DB) */
export interface AreaListRpcRow {
  id: number;
  name: string;
  slug: string;
  grades: unknown;
  topos_count: number;
  is_public: boolean | null;
  price: number | null;
  purchased: boolean;
  user_creator_id: string | null;
  created_at: string | null;
  eight_anu_crag_slugs: string[] | null;
}

// Area Likes
export type AreaLikeDto = TableRow<'area_likes'>;
export type AreaLikeInsertDto = TableInsert<'area_likes'>;
export type AreaLikeUpdateDto = TableUpdate<'area_likes'>;

// Area Admins
export type AreaAdminDto = TableRow<'area_admins'>;
export type AreaAdminInsertDto = TableInsert<'area_admins'>;
export type AreaAdminUpdateDto = TableUpdate<'area_admins'>;

// Area Admin Requests
export type AreaAdminRequestDto = TableRow<'area_admin_requests'>;
export type AreaAdminRequestInsertDto = TableInsert<'area_admin_requests'>;
export type AreaAdminRequestUpdateDto = TableUpdate<'area_admin_requests'>;

/** Row returned by getAreaAdminRequests query */
export interface AreaAdminRequestWithArea {
  id: number;
  created_at: string;
  area: { id: number; name: string; slug: string };
  user: { id: string; name: string | null };
}

export interface AreaDetail extends Omit<AreaListItem, 'user_creator_id'> {
  topos_count: number;
  is_public: boolean;
  price: number;
  stripe_account_id: string | null;
  purchased?: boolean;
  user_creator_id: string | null;
  eight_anu_crag_slugs: string[] | null;
  created_at: string;
  slug: string;
}

/** Row returned by getById query (with purchased join) */
export interface AreaWithPurchase extends AreaDto {
  purchased: { id: string }[] | boolean;
}
