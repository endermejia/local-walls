import { AmountByEveryGrade } from './grade.model';
import { CragListItem } from './crag.model';
import { ClimbingKind } from './supabase-interfaces';

// Supabase RPC get_areas_list response item
export interface AreaListItem {
  id: number;
  name: string;
  slug: string;
  liked: boolean; // si el usuario le ha dado like a esta area (tabla area_likes)
  crags_count: number; // numero de crags que hay en esta area (tabla crags)
  grades: AmountByEveryGrade; // suma de routes por grado que hay dentro de los crags de cada area (tabla routes)
  climbing_kind: ClimbingKind[]; // los distintos climbing_kind que hay en las rutas de los crags de esta area (tabla routes)
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
