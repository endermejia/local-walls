import { AmountByEveryGrade } from './grade.model';
import { CragListItem } from './crag.model';

// Supabase RPC get_areas_list response item
export interface AreaListItem {
  id: number;
  name: string;
  slug: string;
  liked: boolean;
  crags_count: number;
  grades: AmountByEveryGrade;
}

// Supabase RPC toggle_area_like response
export interface AreaLikeToggleResult {
  action: string; // e.g. 'inserted' | 'deleted'
  total_likes: number;
}

export interface AreaDetail {
  id: number;
  name: string;
  slug: string;
  liked: boolean;
  grades: AmountByEveryGrade;
  crags: CragListItem[];
}
