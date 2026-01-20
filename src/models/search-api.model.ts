// Types for 8a.nu unified search endpoint used by header search
// The payload differs from map items (snake_case) and uses camelCase properties.

export interface SearchAreaItem {
  type: 0; // area
  areaName: string;
  areaSlug: string;
  countryName: string;
  countrySlug: string;
  // optional
  coordinates?: { latitude: number; longitude: number } | null;
}

export interface SearchCragItem {
  type: 1; // crag
  cragName: string;
  cragSlug: string;
  cragId: number;
  areaName: string;
  areaSlug: string;
  countryName: string;
  countrySlug: string;
  coordinates?: { latitude: number; longitude: number } | null;
}

export interface SearchRouteItem {
  type: 3; // route (zlaggable)
  zlaggableName: string;
  zlaggableSlug: string;
  zlaggableId: number;
  sectorName: string;
  sectorSlug: string;
  sectorId: number;
  cragName: string;
  cragSlug: string;
  cragId: number;
  areaName: string;
  areaSlug: string;
  countryName: string;
  countrySlug: string;
  difficulty?: string;
}

export type SearchApiItem = SearchAreaItem | SearchCragItem | SearchRouteItem;

export interface SearchApiResponse {
  items: SearchApiItem[];
  totals?: number;
  totalAreas?: number;
  totalCrags?: number;
  totalSectors?: number;
  totalZlaggables?: number;
  totalUsers?: number;
}
