import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { catchError, from, map, Observable, of } from 'rxjs';

import { EightAnuService } from './eight-anu.service';
import { SupabaseService } from './supabase.service';

import {
  SearchData,
  SearchItem,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
  SearchAreaItem,
  SearchCragItem,
  SearchRouteItem,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly supabase = inject(SupabaseService);
  private readonly translate = inject(TranslateService);
  private readonly eightAnu = inject(EightAnuService);

  search(query: string): Observable<SearchData | null> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return of(null);

    return from(
      Promise.all([
        (this.supabase.client.rpc as any)('search_items_fuzzy', {
          p_query: trimmedQuery,
        }),
        this.eightAnu.searchUnified(trimmedQuery, ['0', '1', '3']),
      ]),
    ).pipe(
      map(([dbResponse, eightAnuItems]) => {
        const dbData = dbResponse.data as any;
        const results: SearchData = {};

        // Process Areas
        const areas = (dbData?.areas || []) as any[];
        if (areas.length > 0) {
          results['areas'] = areas.slice(0, 5).map((a) => ({
            title: a.title,
            href: a.href,
            icon: a.icon,
          }));
        } else {
          // If no local areas, show import/create options
          const anuArea = eightAnuItems?.find(
            (i): i is SearchAreaItem => i.type === 0,
          );
          results['areas'] = [
            ...(anuArea
              ? [
                  {
                    title: `${this.translate.instant('import')} ${anuArea.areaName}`,
                    subtitle: anuArea.countryName,
                    href: '',
                    icon: '@tui.download',
                    type: 'import-area',
                    data: anuArea,
                  } as SearchItem,
                ]
              : []),
            {
              title: this.translate.instant('areas.newTitle'),
              href: '',
              icon: '@tui.plus',
              type: 'create-area',
            },
          ];
        }

        // Process Crags
        const crags = (dbData?.crags || []) as any[];
        if (crags.length > 0) {
          results['crags'] = crags.slice(0, 5).map((c) => ({
            title: c.title,
            subtitle: c.subtitle,
            href: c.href,
            icon: c.icon,
          }));
        } else {
          const anuCrag = eightAnuItems?.find(
            (i): i is SearchCragItem => i.type === 1,
          );
          results['crags'] = [
            ...(anuCrag
              ? [
                  {
                    title: `${this.translate.instant('import')} ${anuCrag.cragName}`,
                    subtitle: `${anuCrag.areaName}, ${anuCrag.countryName}`,
                    href: '',
                    icon: '@tui.download',
                    type: 'import-crag',
                    data: anuCrag,
                  } as SearchItem,
                ]
              : []),
            {
              title: this.translate.instant('crags.newTitle'),
              href: '',
              icon: '@tui.plus',
              type: 'create-crag',
            },
          ];
        }

        // Process Routes
        const routes = (dbData?.routes || []) as any[];
        if (routes.length > 0) {
          results['routes'] = routes.slice(0, 5).map((r) => ({
            title: r.title,
            subtitle: r.subtitle,
            href: r.href,
            icon: r.icon,
            difficulty:
              GRADE_NUMBER_TO_LABEL[r.difficulty as VERTICAL_LIFE_GRADES],
          }));
        } else {
          const anuRoute = eightAnuItems?.find(
            (i): i is SearchRouteItem => i.type === 3,
          );
          results['routes'] = [
            ...(anuRoute
              ? [
                  {
                    title: `${this.translate.instant('import')} ${anuRoute.zlaggableName}`,
                    subtitle: `${anuRoute.cragName}, ${anuRoute.areaName}`,
                    href: '',
                    icon: '@tui.download',
                    type: 'import-route',
                    data: anuRoute,
                  } as SearchItem,
                ]
              : []),
            {
              title: this.translate.instant('routes.newTitle'),
              href: '',
              icon: '@tui.plus',
              type: 'create-route',
            },
          ];
        }

        // Process Users
        const users = (dbData?.users || []) as any[];
        if (users.length > 0) {
          results['users'] = users.slice(0, 5).map((u) => ({
            title: u.title,
            href: u.href,
            icon: this.supabase.buildAvatarUrl(u.icon) || u.title[0],
            type: 'user',
          }));
        }

        return results;
      }),
      catchError((err: Error) => {
        console.error('[SearchService] Search error', err);
        return of({} as SearchData);
      }),
    );
  }
}
