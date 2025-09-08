import { Injectable } from '@angular/core';
import { ApiCore } from './api-core';

// 8a.nu raw models (subset)
interface VerticalLifeMapItemArea {
  id: number;
  name: string;
  slug: string;
  country_name: string;
  country_slug: string;
  area_type?: number; // 0 == area, ignore
}
interface VerticalLifeMapItemLocation {
  id?: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  area_slug: string;
  area_name: string;
  country_slug: string;
  country_name: string;
  total_ascendables?: number;
  total_ascents?: number;
}
function isArea(
  item: VerticalLifeMapItemArea | VerticalLifeMapItemLocation,
): item is VerticalLifeMapItemArea {
  return (item as VerticalLifeMapItemArea).area_type === 0;
}

interface VerticalLifeMapResponse {
  items: VerticalLifeMapItem[];
  counts: unknown;
}

export type VerticalLifeMapItem =
  | VerticalLifeMapItemArea
  | VerticalLifeMapItemLocation;

export interface MapBounds {
  south_west_latitude: number;
  south_west_longitude: number;
  north_east_latitude: number;
  north_east_longitude: number;
  zoom: number;
  page_index?: number;
  page_size?: number;
}

interface VerticalLifeSectorDto {
  sectorId: number;
  sectorName: string;
  sectorSlug: string;
  totalZlaggables: number;
}

interface VarticalLifeRoutesResponse {
  items: {
    zlaggableId: number;
    zlaggableName: string;
    difficulty?: string; // like 7a
    averageRating?: number;
    totalAscents?: number;
    sectorSlug?: string;
    sectorName?: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class VerticalLifeApi extends ApiCore {
  constructor() {
    super('/api/8anu');
  }

  async getMapLocations(
    bounds: MapBounds,
  ): Promise<VerticalLifeMapItemLocation[]> {
    const resp = await this.get<VerticalLifeMapResponse>(
      '/api/unification/collection/v1/web/map/items',
      {
        query: {
          ...bounds,
          page_index: bounds.page_index ?? 0,
          categories: 1,
          page_size: bounds.page_size ?? 20,
        },
      },
    );
    const filtered = resp.items.filter(
      (it): it is VerticalLifeMapItemLocation =>
        !isArea(it) && !!it.id && !!it.total_ascendables && !!it.total_ascents,
    );
    console.log('getMapLocations', filtered);
    return (filtered as VerticalLifeMapItemLocation[]) ?? [];
  }

  async getCrags(
    country: string,
    areaSlug: string,
  ): Promise<VerticalLifeSectorDto[]> {
    return this.get<VerticalLifeSectorDto[]>(
      `/api/unification/outdoor/v1/web/crags/sportclimbing/${encodeURIComponent(country)}/${encodeURIComponent(areaSlug)}/sectors`,
    );
  }

  async getRoutesByCrag(
    country: string,
    cragSlug: string,
    params?: {
      sectorSlug?: string;
      pageIndex?: number;
      sortField?: string;
      order?: 'asc' | 'desc';
      grade?: string;
      searchQuery?: string;
    },
  ): Promise<VarticalLifeRoutesResponse> {
    const query = {
      sectorSlug: params?.sectorSlug,
      pageIndex: params?.pageIndex ?? 0,
      sortField: params?.sortField ?? 'totalascents',
      grade: params?.grade,
      searchQuery: params?.searchQuery,
      order: params?.order ?? 'desc',
      cragSlug,
    } as const;
    return this.get<VarticalLifeRoutesResponse>(
      `/api/unification/outdoor/v1/web/zlaggables/sportclimbing/${encodeURIComponent(country)}`,
      { query },
    );
  }
}
