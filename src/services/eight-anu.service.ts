import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { firstValueFrom, Observable } from 'rxjs';

import {
  EightAnuRoute,
  EightAnuRoutesResponse,
  EightAnuSearchResponse,
  GradeLabel,
  SearchApiResponse,
  SearchCragItem,
  SearchRouteItem,
} from '../models';
import { normalizeName, slugify } from '../utils';

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
    areaName: string,
    cragName?: string,
  ): Promise<SearchCragItem | null> {
    try {
      const query = cragName ? `${cragName} ${areaName}` : areaName;
      const response = await firstValueFrom(
        this.http.get<SearchApiResponse>(this.searchUrl, {
          params: {
            query,
            pageIndex: '0',
            // pageSize not sent, server default
            'entityTypes[]': '1', // Type 1 = crags
            showOnMap: 'false',
          },
        }),
        { defaultValue: null },
      );

      if (response?.items && response.items.length > 0) {
        if (cragName) {
          // Buscar coincidencia exacta por nombre
          const match = response.items.find(
            (i) =>
              i.type === 1 &&
              normalizeName(i.cragName) === normalizeName(cragName) &&
              normalizeName(i.areaName) === normalizeName(areaName),
          ) as SearchCragItem;
          if (match) return match;
        }

        const item = response.items[0] as SearchCragItem;
        return item;
      }
    } catch (e) {
      console.error('[8a.nu] Error searching crag:', e);
    }
    return null;
  }

  /**
   * Busca una ruta en 8a.nu para obtener su información real (slugs, etc.)
   */
  async searchRoute(
    areaName: string,
    cragName: string,
    routeName?: string,
  ): Promise<SearchRouteItem | null> {
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
            // pageSize not sent
            'entityTypes[]': '3', // Type 3 = routes
            showOnMap: 'false',
          },
        }),
        { defaultValue: null },
      );

      if (response?.items && response.items.length > 0) {
        if (routeName) {
          // Buscar coincidencia exacta por nombre
          const match = response.items.find(
            (i) =>
              i.type === 3 &&
              normalizeName(i.zlaggableName) === normalizeName(routeName) &&
              normalizeName(i.cragName) === normalizeName(cragName) &&
              normalizeName(i.areaName) === normalizeName(areaName),
          ) as SearchRouteItem;
          if (match) return match;
        }

        // Si no hay routeName o no hay coincidencia exacta, devolver el primero que coincida con crag/area
        const matchCrag = response.items.find(
          (i) =>
            i.type === 3 &&
            normalizeName(i.cragName) === normalizeName(cragName) &&
            normalizeName(i.areaName) === normalizeName(areaName),
        ) as SearchRouteItem;

        if (matchCrag) return matchCrag;

        return response.items[0] as SearchRouteItem;
      }
    } catch (e) {
      console.error('[8a.nu] Error searching route:', e);
    }
    return null;
  }

  async searchRoutes(query: string, pageIndex = 0): Promise<SearchRouteItem[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<SearchApiResponse>(this.searchUrl, {
          params: {
            query,
            pageIndex: pageIndex.toString(),
            'entityTypes[]': '3', // Type 3 = routes
            showOnMap: 'false',
          },
        }),
        { defaultValue: null },
      );

      return (
        (response?.items?.filter((i) => i.type === 3) as SearchRouteItem[]) ||
        []
      );
    } catch (e) {
      console.error('[8a.nu] Error searching routes:', e);
      return [];
    }
  }

  searchUsers(
    query: string,
    pageIndex = 0,
  ): Observable<EightAnuSearchResponse> {
    return this.http.get<EightAnuSearchResponse>(this.searchUrl, {
      params: {
        query,
        pageIndex: pageIndex.toString(),
        // pageSize not sent
        'entityTypes[]': '4', // Type 4 seems to be users
        showOnMap: 'false',
      },
    });
  }

  getUserBySlug(slug: string): Observable<EightAnuSearchResponse> {
    return this.searchUsers(slug, 0);
  }

  getRoutes(
    category: 'sportclimbing' | 'bouldering',
    countrySlug: string,
    cragSlug: string,
    pageIndex = 0,
  ): Observable<EightAnuRoutesResponse> {
    const url = `/api/8anu/api/unification/outdoor/v1/web/zlaggables/${category}/${countrySlug}`;

    const params: Record<string, string> = {
      cragSlug,
      pageIndex: pageIndex.toString(),
      sortField: 'totalascents',
      order: 'desc',
    };

    return this.http.get<EightAnuRoutesResponse>(url, { params });
  }

  async getAllRoutes(
    category: 'sportclimbing' | 'bouldering',
    countrySlug: string,
    cragSlug: string,
  ): Promise<EightAnuRoute[]> {
    try {
      // 1. Fetch first page to get total pagination info
      const firstResponse = await firstValueFrom(
        this.getRoutes(category, countrySlug, cragSlug, 0),
        { defaultValue: null },
      );

      if (!firstResponse?.items) return [];

      const allRoutes = [...firstResponse.items];
      const pagination = firstResponse.pagination;

      if (!pagination || !pagination.hasNext || pagination.pageCount <= 1) {
        return allRoutes;
      }

      // 2. Fetch remaining pages
      const totalPages = pagination.pageCount;
      const CONCURRENCY = 3;
      const DELAY_MS = 300;

      // Ensure we don't go overboard if pageCount is huge (e.g. > 50)
      // Cap at 50 pages for safety? user reported pageIndex=36, so let's allow up to 100
      const maxPages = Math.min(totalPages, 100);

      const remainingPages = Array.from(
        { length: maxPages - 1 },
        (_, i) => i + 1,
      );

      for (let i = 0; i < remainingPages.length; i += CONCURRENCY) {
        const chunk = remainingPages.slice(i, i + CONCURRENCY);

        // Add delay between chunks to avoid 429s
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
        }

        const results = await Promise.all(
          chunk.map((idx) =>
            firstValueFrom(
              this.getRoutes(category, countrySlug, cragSlug, idx),
              { defaultValue: null },
            ).catch((err) => {
              console.warn(
                `[8a.nu] Failed to fetch page ${idx} for ${cragSlug}:`,
                err,
              );
              return null;
            }),
          ),
        );

        for (const res of results) {
          if (res?.items && res.items.length > 0) {
            allRoutes.push(...res.items);
          }
        }
      }

      return allRoutes;
    } catch (e) {
      console.error('[8a.nu] Error in getAllRoutes:', e);
      return [];
    }
  }

  normalizeDifficulty(difficulty: string): GradeLabel {
    const normalized = difficulty.toLowerCase();
    // 8a uses "7A" for boulder 7a. And "7a" for sport 7a.
    // We map both to "7a".
    // 8a also has "+" e.g., "7a+".
    // GradeLabel expects lowercase.
    return normalized as GradeLabel;
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
    const searchResult = await this.searchCrag(areaName, cragName);
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
        { defaultValue: null },
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
