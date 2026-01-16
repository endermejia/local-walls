import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';

import { EightAnuAscentsResponse, EightAnuSearchResponse } from '../models';

@Injectable({
  providedIn: 'root',
})
export class EightAnuService {
  private http = inject(HttpClient);
  private readonly baseUrl = '/api/8anu/api/unification';
  private readonly searchUrl = `${this.baseUrl}/collection/v1/web/search`;

  getAscents(
    category: string,
    country: string,
    cragSlug: string,
    sectorSlug?: string,
    pageIndex = 0,
    pageSize = 10,
    searchQuery = '',
  ): Observable<EightAnuAscentsResponse> {
    const url = `${this.baseUrl}/ascent/v1/web/crags/${category}/${country}/${cragSlug}/ascents`;
    const params: Record<string, string> = {
      pageIndex: pageIndex.toString(),
      pageSize: pageSize.toString(),
    };

    if (sectorSlug) {
      params['sectorSlug'] = sectorSlug;
    }

    if (searchQuery) {
      params['searchQuery'] = searchQuery;
    }

    return this.http.get<EightAnuAscentsResponse>(url, { params });
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
}
