export interface SearchItem {
  href: string;
  title: string;
  subtitle?: string;
  icon?: string;
  type?: string;
  difficulty?: string;
  data?: unknown;
}

export type SearchData = Record<string, readonly SearchItem[]>;
