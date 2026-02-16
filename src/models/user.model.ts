import { UserProfileDto } from './supabase-interfaces';

export type UserProfileBasicDto = Pick<
  UserProfileDto,
  'id' | 'name' | 'avatar'
>;
