import { Injectable } from '@angular/core';
import { ApiCore, HttpOptions } from './api-core';
import {
  ClimbingRoute,
  ClimbingRouteResponse,
  ClimbingSector,
  MapBounds,
  MapCragItem,
  MapResponse,
  SearchApiItem,
  SearchApiResponse,
  AscentsPage,
  AscentsQuery,
  ClimbingRoutesPage,
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

  // Used by header search; returns items from 8a unified search endpoint
  async getMapItemsBySearch(params: {
    query: string;
    pageSize?: number;
    showOnMap?: boolean;
  }): Promise<readonly SearchApiItem[]> {
    const opts: HttpOptions = {
      query: {
        query: params.query,
        pageSize: params.pageSize ?? 20,
        showOnMap: params.showOnMap ?? true,
      },
    };
    const { items = [] } = await this.get<SearchApiResponse>(
      '/api/unification/collection/v1/web/search',
      opts,
    );
    // Do not filter by `id` here because search payload uses different id fields (cragId, zlaggableId, ...)
    return items as readonly SearchApiItem[];
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
  ): Promise<ClimbingRoutesPage> {
    const query = {
      sectorSlug: params?.sectorSlug,
      pageIndex: params?.pageIndex ?? 0,
      sortField: params?.sortField ?? 'totalascents',
      grade: params?.grade,
      searchQuery: params?.searchQuery,
      order: params?.order ?? 'desc',
      cragSlug,
    } as const;
    return this.get<ClimbingRoutesPage>(
      `/api/unification/outdoor/v1/web/zlaggables/sportclimbing/${encodeURIComponent(countrySlug)}`,
      { query },
    );
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

  async getCragAscentsPageable(
    countrySlug: string,
    cragSlug: string,
    params?: AscentsQuery,
  ): Promise<AscentsPage> {
    const query = {
      sectorSlug: params?.sectorSlug,
      pageIndex: params?.pageIndex ?? 0,
      pageSize: params?.pageSize ?? 20,
      grade: params?.grade,
      searchQuery: params?.searchQuery,
    } as const;

    return this.get<AscentsPage>(
      `/api/unification/ascent/v1/web/crags/sportclimbing/${encodeURIComponent(countrySlug)}/${encodeURIComponent(cragSlug)}/ascents`,
      { query },
    );
  }

  // Fetch ascents by user slug from 8a.nu unified ascent endpoint
  async getUserAscents(
    userSlug: string,
    params?: {
      category?: 'sportclimbing' | 'bouldering' | 'alpine' | string;
      pageIndex?: number;
      pageSize?: number;
      sortField?: 'grade_desc' | 'date_desc' | 'date_asc' | string;
      timeFilter?: number;
      gradeFilter?: number;
      typeFilter?: string | null;
      includeProjects?: boolean;
      searchQuery?: string | null;
      showRepeats?: boolean;
      showDuplicates?: boolean;
    },
  ): Promise<import('../models').UserAscentsResponse> {
    const query = {
      category: params?.category ?? 'sportclimbing',
      pageIndex: params?.pageIndex ?? 0,
      pageSize: params?.pageSize ?? 50,
      sortField: params?.sortField ?? 'grade_desc',
      timeFilter: params?.timeFilter ?? 0,
      gradeFilter: params?.gradeFilter ?? 0,
      typeFilter: params?.typeFilter ?? undefined,
      includeProjects: params?.includeProjects ?? false,
      searchQuery: params?.searchQuery ?? undefined,
      showRepeats: params?.showRepeats ?? false,
      showDuplicates: params?.showDuplicates ?? false,
    } as const;

    return this.get<import('../models').UserAscentsResponse>(
      `/api/unification/ascent/v1/web/users/${encodeURIComponent(userSlug)}/ascents`,
      { query },
    );
  }
}
