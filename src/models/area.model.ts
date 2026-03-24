import { AmountByEveryGrade } from './grade.model';
import { Database } from './supabase-generated';
import { TableInsert, TableRow, TableUpdate } from './supabase-interfaces';

// Areas
export type AreaDto = TableRow<'areas'>;
export type AreaInsertDto = TableInsert<'areas'>;
export type AreaUpdateDto = TableUpdate<'areas'>;
export type AreaListItem = Omit<
  Database['public']['Functions']['get_areas_list']['Returns'][number],
  'grades'
> & {
  grades: AmountByEveryGrade;
  topos_count: number;
};
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
