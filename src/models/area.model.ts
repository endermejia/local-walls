import {
  AmountByEveryGrade,
  Database,
  TableInsert,
  TableRow,
  TableUpdate,
} from '../models';

// Areas
export type AreaDto = TableRow<'areas'>;
export type AreaInsertDto = TableInsert<'areas'>;
export type AreaUpdateDto = TableUpdate<'areas'>;
export type AreaListItem = Omit<
  Database['public']['Functions']['get_areas_list']['Returns'][number],
  'grades'
> & {
  grades: AmountByEveryGrade;
};
// Area Likes
export type AreaLikeDto = TableRow<'area_likes'>;
export type AreaLikeInsertDto = TableInsert<'area_likes'>;
export type AreaLikeUpdateDto = TableUpdate<'area_likes'>;

// Area Equippers
export type AreaEquipperDto = TableRow<'area_equippers'>;
export type AreaEquipperInsertDto = TableInsert<'area_equippers'>;
export type AreaEquipperUpdateDto = TableUpdate<'area_equippers'>;
