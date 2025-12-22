import { Injectable } from '@angular/core';
import { ApiCore, HttpOptions } from './api-core';
import {
  MapBounds,
  MapCragItem,
  MapResponse,
  SearchApiItem,
  SearchApiResponse,
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
}
