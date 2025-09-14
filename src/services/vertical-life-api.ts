import { Injectable } from '@angular/core';
import { ApiCore, HttpOptions } from './api-core';
import {
  ClimbingArea,
  ClimbingAreaResponse,
  ClimbingCrag,
  ClimbingCragResponse,
  ClimbingRoute,
  ClimbingRouteResponse,
  ClimbingSector,
  MapBounds,
  MapCragItem,
  MapItem,
  MapResponse,
  PageableResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class VerticalLifeApi extends ApiCore {
  constructor() {
    super('/api/8anu');
  }

  /**
   * Fetches a single map item (crag/area) by its id from 8a.nu and returns it.
   * The backend proxy base is configured in ApiCore.
   * Note: The 8a endpoint returns either `{ item: MapItem }` or the item itself depending on context.
   */
  async getMapItemById(id: number): Promise<MapCragItem> {
    const data = await this.get<{ item?: MapCragItem }>(
      `/api/unification/collection/v1/web/map/item/0/${encodeURIComponent(String(id))}`,
    );
    return (data?.item ?? data) as MapCragItem;
  }

  async getMapResponse(
    bounds: MapBounds,
    sportClimbing = false,
    bouldering = false,
  ): Promise<MapResponse> {
    const categories = (sportClimbing ? 1 : 0) + (bouldering ? 2 : 0) || 3;

    return await this.get<MapResponse>(
      '/api/unification/collection/v1/web/map/items',
      {
        query: {
          ...bounds,
          page_index: 0,
          page_size: 20,
          categories,
        },
      },
    );
  }

  // TODO: Use on header search
  async getMapItemsBySearch(params: {
    query: string;
    pageSize?: number;
    showOnMap?: boolean;
  }): Promise<MapItem[]> {
    const opts: HttpOptions = {
      query: {
        query: params.query,
        pageSize: params.pageSize ?? 20,
        showOnMap: params.showOnMap ?? true,
      },
    };
    const { items = [] } = await this.get<MapResponse>(
      '/api/unification/collection/v1/web/search',
      opts,
    );
    return items.filter((i) => i.id) as MapItem[];
  }

  // TODO: implement pageable list for climbing crags (on Area page)
  // using @defer for lazy loading and infinite scroll
  async getClimbingCragsPageable(
    countrySlug: string,
    areaSlug: string,
    params?: {
      pageIndex?: number;
      sortField?: 'totalascents' | 'grade' | 'name';
      order?: 'asc' | 'desc';
      category?: number;
    },
  ): Promise<PageableResponse<ClimbingCrag>> {
    const query = {
      pageIndex: params?.pageIndex ?? 0,
      sortField: params?.sortField ?? 'totalascents',
      order: params?.order ?? 'desc',
      category: params?.category ?? 69,
      countrySlug,
      areaSlug,
    } as const;
    return this.get<PageableResponse<ClimbingCrag>>(
      '/api/unification/outdoor/v1/web/crags',
      { query },
    );
  }

  async getClimbingCragRoutesPageable(
    countrySlug: string,
    cragSlug: string,
    params?: {
      sectorSlug?: string;
      pageIndex?: number;
      sortField?: 'totalascents' | 'grade' | 'name';
      order?: 'asc' | 'desc';
      grade?: string;
      searchQuery?: string;
    },
  ): Promise<PageableResponse<ClimbingRoute>> {
    const query = {
      sectorSlug: params?.sectorSlug,
      pageIndex: params?.pageIndex ?? 0,
      sortField: params?.sortField ?? 'totalascents',
      grade: params?.grade,
      searchQuery: params?.searchQuery,
      order: params?.order ?? 'desc',
      cragSlug,
    } as const;
    return this.get<PageableResponse<ClimbingRoute>>(
      `/api/unification/outdoor/v1/web/zlaggables/sportclimbing/${encodeURIComponent(countrySlug)}`,
      { query },
    );
  }

  async getClimbingArea(
    countrySlug: string,
    areaSlug: string,
  ): Promise<ClimbingArea> {
    const areaResponse = await this.get<ClimbingAreaResponse>(
      `/api/unification/collection/v1/web/areas/${encodeURIComponent(countrySlug)}/${encodeURIComponent(areaSlug)}`,
    );
    return areaResponse.area;
  }

  async getClimbingCrag(
    countrySlug: string,
    cragSlug: string,
  ): Promise<ClimbingCrag> {
    const cragResponse = await this.get<ClimbingCragResponse>(
      `/api/unification/outdoor/v1/web/crags/sportclimbing/${encodeURIComponent(countrySlug)}/${encodeURIComponent(cragSlug)}`,
    );
    return cragResponse.crag;
  }

  async getClimbingSectors(
    countrySlug: string,
    cragSlug: string,
  ): Promise<ClimbingSector[]> {
    return this.get<ClimbingSector[]>(
      `/api/unification/outdoor/v1/web/crags/sportclimbing/${encodeURIComponent(countrySlug)}/${encodeURIComponent(cragSlug)}/sectors`,
    );
  }

  async getClimbingRoute(
    countrySlug: string,
    cragSlug: string,
    sectorSlug: string,
    zlaggableSlug: string,
  ): Promise<ClimbingRoute> {
    const response = await this.get<ClimbingRouteResponse>(
      `/api/unification/outdoor/v1/web/crags/sportclimbing/${encodeURIComponent(countrySlug)}/${encodeURIComponent(cragSlug)}/sectors/${encodeURIComponent(sectorSlug)}/routes/${encodeURIComponent(zlaggableSlug)}`,
    );
    return response.zlaggable;
  }
}
