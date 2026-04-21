export interface SearchItem {
  href: string;
  title: string;
  subtitle?: string;
  icon?: string;
  type?: string;
  difficulty?: string;
  grade?: number;
  data?: unknown;
}

export type SearchData = Record<string, readonly SearchItem[]>;
