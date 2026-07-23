import { RouteDto } from './supabase-interfaces';
import { CragDto } from './crag.model';
import { AreaDto } from './area.model';
import { RouteWithExtras } from './route.model';
import { UserProfileBasicDto } from './user.model';

import { RouteAscentCommentDto, RouteAscentDto } from './supabase-interfaces';

export interface RouteAscentRaw extends RouteAscentDto {
  user?: UserProfileBasicDto;
  route?: RouteDto & {
    crag?: CragDto & {
      area?: Pick<AreaDto, 'slug' | 'name'>;
    };
  };
}

export interface RouteAscentWithExtras extends RouteAscentDto {
  user?: UserProfileBasicDto;
  route?: RouteWithExtras;
  likes_count?: number;
  user_liked?: boolean;
  is_duplicate?: boolean;
}

export interface PaginatedAscents {
  items: RouteAscentWithExtras[];
  total: number;
}

export interface UserAscentStatRecord {
  id: number;
  ascent_date: string;
  ascent_type: string;
  ascent_grade: number | null;
  attempts: number | null;
  route_grade: number;
  route_name: string;
  route_slug: string;
  crag_name: string;
  crag_slug: string;
  area_name: string;
  area_slug: string;
  private_ascent: boolean | null;
}

/** Comment with likes count from Supabase query */
export interface CommentWithLikes extends RouteAscentCommentDto {
  likes: { count: number }[];
}

export interface RouteAscentCommentWithExtras extends RouteAscentCommentDto {
  user_profiles: UserProfileBasicDto;
  likes_count: number;
  user_liked: boolean;
}

/** RouteAscentWithExtras with kind field for feed items */
export interface RouteAscentFeedItem extends RouteAscentWithExtras {
  kind: 'ascent';
}
