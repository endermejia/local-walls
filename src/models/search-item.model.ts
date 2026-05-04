import { ClimbingKind } from './app-enums.model';

export interface SearchItem {
  href: string;
  title: string;
  subtitle?: string;
  icon?: string;
  type?: string;
  difficulty?: string;
  grade?: number;
  climbing_kind?: ClimbingKind;
  data?: unknown;
}

export type SearchData = Record<string, readonly SearchItem[]>;
