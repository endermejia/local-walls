export interface SearchItem {
  href: string;
  title: string;
  subtitle?: string;
  icon?: string;
}

export type SearchData = Record<string, readonly SearchItem[]>;
