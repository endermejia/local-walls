import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { firstValueFrom, Observable } from 'rxjs';

import {
  EightAnuRoutesResponse,
  EightAnuSearchResponse,
  SearchApiResponse,
  SearchCragItem,
  SearchRouteItem,
} from '../models';
import { slugify } from '../utils';

@Injectable({
  providedIn: 'root',
})
export class EightAnuService {
  private http = inject(HttpClient);
  private readonly searchUrl =
    '/api/8anu/api/unification/collection/v1/web/search';

  private readonly COUNTRY_CODE_TO_SLUG: Record<string, string> = {
    ES: 'spain',
    FR: 'france',
    IT: 'italy',
    DE: 'germany',
    US: 'united-states',
    GB: 'united-kingdom',
    AD: 'andorra',
    BE: 'belgium',
    CH: 'switzerland',
    AT: 'austria',
    GR: 'greece',
    PT: 'portugal',
  };

  /**
   * Busca un crag en 8a.nu para obtener su información real (slugs, etc.)
   */
  async searchCrag(
    countryCode: string,
    areaName: string,
    cragName?: string,
    pageSize = 10,
  ): Promise<SearchCragItem | null> {
    const items = await this.searchCrags(countryCode, cragName ? `${cragName} ${areaName}` : areaName, pageSize);
    if (items.length > 0) {
      if (cragName) {
        // Buscar coincidencia exacta por nombre
        const match = items.find(
          (i) =>
            i.cragName?.toLowerCase() === cragName.toLowerCase() &&
            i.areaName?.toLowerCase() === areaName.toLowerCase(),
        );
        if (match) return match;
      }
      return items[0];
    }
    return null;
  }

  async searchCrags(
    countryCode: string,
    query: string,
    pageSize = 10,
  ): Promise<SearchCragItem[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<SearchApiResponse>(this.searchUrl, {
          params: {
            query,
            pageIndex: '0',
            pageSize: pageSize.toString(),
            'entityTypes[]': '1', // Type 1 = crags
            showOnMap: 'false',
          },
        }),
      );
      return (response?.items || []).filter((i) => i.type === 1) as SearchCragItem[];
    } catch (e) {
      console.error('[8a.nu] Error searching crags:', e);
      return [];
    }
  }

  /**
   * Busca una ruta en 8a.nu para obtener su información real (slugs, etc.)
   */
  async searchRoute(
    countryCode: string,
    areaName: string,
    cragName: string,
    routeName?: string,
    pageSize = 10,
  ): Promise<SearchRouteItem | null> {
    const items = await this.searchRoutes(countryCode, areaName, cragName, routeName, pageSize);
    if (items.length > 0) {
      if (routeName) {
        // Buscar coincidencia exacta por nombre
        const match = items.find(
          (i) =>
            i.zlaggableName?.toLowerCase() === routeName.toLowerCase() &&
            i.cragName?.toLowerCase() === cragName.toLowerCase() &&
            i.areaName?.toLowerCase() === areaName.toLowerCase(),
        );
        if (match) return match;
      }
      return items[0];
    }
    return null;
  }

  async searchRoutes(
    countryCode: string,
    areaName: string,
    cragName: string,
    routeName?: string,
    pageSize = 10,
  ): Promise<SearchRouteItem[]> {
    try {
      let query = `${cragName} ${areaName}`;
      if (routeName) {
        query = `${routeName} ${query}`;
      }

      const response = await firstValueFrom(
        this.http.get<SearchApiResponse>(this.searchUrl, {
          params: {
            query,
            pageIndex: '0',
            pageSize: pageSize.toString(),
            'entityTypes[]': '3', // Type 3 = routes
            showOnMap: 'false',
          },
        }),
      );
      return (response?.items || []).filter((i) => i.type === 3) as SearchRouteItem[];
    } catch (e) {
      console.error('[8a.nu] Error searching routes:', e);
      return [];
    }
  }

  searchUsers(
    query: string,
    pageIndex = 0,
    pageSize = 10,
  ): Observable<EightAnuSearchResponse> {
    return this.http.get<EightAnuSearchResponse>(this.searchUrl, {
      params: {
        query,
        pageIndex: pageIndex.toString(),
        pageSize: pageSize.toString(),
        'entityTypes[]': '4', // Type 4 seems to be users
        showOnMap: 'false',
      },
    });
  }

  getUserBySlug(slug: string): Observable<EightAnuSearchResponse> {
    // 8a.nu doesn't seem to have a direct "get by slug" that returns the same structure
    // but we can search for the slug or the username.
    // In this case, we search for the slug to find the user.
    return this.searchUsers(slug, 0, 1);
  }

  getRoutes(
    category: 'sportclimbing' | 'bouldering',
    countrySlug: string,
    cragSlug: string,
    sectorSlug: string,
    pageIndex = 0,
    pageSize = 1000,
  ): Observable<EightAnuRoutesResponse> {
    const url = `/api/8anu/api/unification/outdoor/v1/web/zlaggables/${category}/${countrySlug}`;

    return this.http.get<EightAnuRoutesResponse>(url, {
      params: {
        sectorSlug,
        cragSlug,
        pageIndex: pageIndex.toString(),
        pageSize: pageSize.toString(),
        sortField: 'totalascents',
        order: 'desc',
      },
    });
  }

  async getCoordinates(
    countryCode: string,
    areaName: string,
    cragName?: string,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const countrySlug =
      this.COUNTRY_CODE_TO_SLUG[countryCode.toUpperCase()] ||
      countryCode.toLowerCase();

    // Intentar obtener el slug real del crag/area mediante búsqueda
    // Si tenemos cragName lo usamos para precisar, si no usamos solo areaName
    const searchResult = await this.searchCrag(
      countryCode,
      areaName,
      cragName,
      1,
    );
    let cragSlug = searchResult?.cragSlug;

    if (!cragSlug) {
      // Fallback a slugify si la búsqueda no devuelve nada
      cragSlug = slugify(cragName || areaName);
    }

    const url = `/api/8anu/api/unification/outdoor/v1/web/crags/sportclimbing/${countrySlug}/${cragSlug}`;

    try {
      const data = await firstValueFrom(
        this.http.get<{
          crag?: { location?: { latitude: number; longitude: number } };
        }>(url),
      );
      if (data?.crag?.location?.latitude && data?.crag?.location?.longitude) {
        return {
          latitude: data.crag.location.latitude,
          longitude: data.crag.location.longitude,
        };
      }
    } catch (e) {
      console.error(
        `Error fetching 8a coordinates for ${cragSlug} (${countrySlug}):`,
        e,
      );
    }
    return null;
  }

  getCountrySlug(countryCode: string): string {
    return (
      this.COUNTRY_CODE_TO_SLUG[countryCode.toUpperCase()] ||
      countryCode.toLowerCase()
    );
  }
}
