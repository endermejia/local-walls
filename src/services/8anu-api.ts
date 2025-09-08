import { Injectable } from '@angular/core';
import { ApiCore } from './api-core';
import type { Zone } from '../models';

// 8a.nu raw models (subset)
interface EightaMapItemArea {
  id: number;
  name: string;
  slug: string;
  country_name: string;
  country_slug: string;
  area_type?: number; // 0 == area, ignore
}
interface EightaMapItemLocation {
  id: number;
  name: string;
  slug: string;
  latitude: number;
  longitude: number;
  area_slug: string;
  area_name: string;
  country_slug: string;
  country_name: string;
}
function isArea(
  item: EightaMapItemArea | EightaMapItemLocation,
): item is EightaMapItemArea {
  return (item as EightaMapItemArea).area_type === 0;
}

interface EightaMapResponse {
  items: (EightaMapItemArea | EightaMapItemLocation)[];
  counts: unknown;
}

export interface MapBounds {
  south_west_latitude: number;
  south_west_longitude: number;
  north_east_latitude: number;
  north_east_longitude: number;
  zoom: number;
  page_index?: number;
  page_size?: number;
}

interface EightaSectorDto {
  sectorId: number;
  sectorName: string;
  sectorSlug: string;
  totalZlaggables: number;
}

interface EightaRoutesResponse {
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
export class EightaApi extends ApiCore {
  constructor() {
    super('https://www.8a.nu');
  }

  async getZonesByMapLocation(bounds: MapBounds): Promise<Zone[]> {
    const resp = await this.get<EightaMapResponse>(
      '/api/unification/collection/v1/web/map/items',
      {
        query: {
          ...bounds,
          page_index: bounds.page_index ?? 0,
          page_size: bounds.page_size ?? 20,
        },
      },
    );
    // Map only location items (those without area_type === 0)
    const zones: Zone[] = [];
    for (const it of resp.items ?? []) {
      // ignore pure areas (area_type === 0)
      if (isArea(it)) continue;
      const loc = it as EightaMapItemLocation;
      // Use id and name, cragIds empty initially
      zones.push({ id: String(loc.id), name: loc.name, cragIds: [] });
    }
    return zones;
  }

  async getCrags(
    country: string,
    areaSlug: string,
  ): Promise<EightaSectorDto[]> {
    // This endpoint returns sectors for a crag; keeping raw dto for now
    return this.get<EightaSectorDto[]>(
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
  ): Promise<EightaRoutesResponse> {
    const query = {
      sectorSlug: params?.sectorSlug,
      pageIndex: params?.pageIndex ?? 0,
      sortField: params?.sortField ?? 'totalascents',
      grade: params?.grade,
      searchQuery: params?.searchQuery,
      order: params?.order ?? 'desc',
      cragSlug,
    } as const;
    return this.get<EightaRoutesResponse>(
      `/api/unification/outdoor/v1/web/zlaggables/sportclimbing/${encodeURIComponent(country)}`,
      { query },
    );
  }
}
