import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { EightAnuRoutesResponse, EightAnuSearchResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class EightAnuService {
  private http = inject(HttpClient);
  private readonly searchUrl =
    '/api/8anu/api/unification/collection/v1/web/search';

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
}
