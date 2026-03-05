import { UserProfileBasicDto } from '../models';

export interface PaginatedProfilesResult<T = UserProfileBasicDto> {
  items: T[];
  total: number;
}
