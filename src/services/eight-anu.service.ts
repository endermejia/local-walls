import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { firstValueFrom, Observable } from 'rxjs';

import {
  EightAnuRoutesResponse,
  EightAnuSearchResponse,
  SearchApiResponse,
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
   * Busca un crag en 8a.nu para obtener su slug real
   */
  async searchCrag(
    countryCode: string,
    areaName: string,
    cragName: string,
  ): Promise<string | null> {
    try {
      const query = `${cragName} ${areaName}`;
      const response = await firstValueFrom(
        this.http.get<SearchApiResponse>(this.searchUrl, {
          params: {
            query,
            pageIndex: '0',
            pageSize: '10',
            'entityTypes[]': '1', // Type 1 = crags
            showOnMap: 'false',
          },
        }),
      );

      if (response?.items && response.items.length > 0) {
        const item = response.items[0] as any;
        // Buscar coincidencia exacta por nombre
        const match = response.items.find(
          (i: any) =>
            i.cragName?.toLowerCase() === cragName.toLowerCase() &&
            i.areaName?.toLowerCase() === areaName.toLowerCase(),
        );
        const crag = (match || item) as any;
        return crag.cragSlug || null;
      }
    } catch (e) {
      console.error('[8a.nu] Error searching crag:', e);
    }
    return null;
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
  ): Promise<{ latitude: number; longitude: number } | null> {
    const countrySlug =
      this.COUNTRY_CODE_TO_SLUG[countryCode.toUpperCase()] ||
      countryCode.toLowerCase();
    const areaSlug = slugify(areaName);
    const url = `/api/8anu/api/unification/outdoor/v1/web/crags/sportclimbing/${countrySlug}/${areaSlug}`;

    try {
      const data = await firstValueFrom(this.http.get<any>(url));
      if (data?.crag?.location?.latitude && data?.crag?.location?.longitude) {
        return {
          latitude: data.crag.location.latitude,
          longitude: data.crag.location.longitude,
        };
      }
    } catch (e) {
      console.error('Error fetching 8a coordinates:', e);
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
