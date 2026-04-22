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
  ClimbingKind,
} from '../models';

import { gradeToNumber } from '../utils';

interface DbArea {
  title: string;
  href: string;
  icon: string;
}

interface DbCrag {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

interface DbRoute {
  title: string;
  subtitle: string;
  href: string;
  icon: string;
  difficulty: number;
  climbing_kind: ClimbingKind;
}

interface DbUser {
  title: string;
  href: string;
  icon: string;
}

interface DbSearchResponse {
  areas?: DbArea[];
  crags?: DbCrag[];
  routes?: DbRoute[];
  users?: DbUser[];
}

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
        this.supabase.client.rpc('search_items_fuzzy', {
          p_query: trimmedQuery,
        }),
        this.eightAnu.searchUnified(trimmedQuery, ['0', '1', '3']),
      ]),
    ).pipe(
      map(([dbResponse, eightAnuItems]) => {
        const dbData = dbResponse.data as DbSearchResponse | null;
        const results: SearchData = {};

        // Process Areas
        const areas = dbData?.areas || [];
        if (areas.length > 0) {
          results['areas'] = areas.map((a) => ({
            title: a.title,
            href: a.href,
            icon: a.icon,
          }));
        }

        // Process Crags
        const crags = dbData?.crags || [];
        if (crags.length > 0) {
          results['crags'] = crags.map((c) => ({
            title: c.title,
            subtitle: c.subtitle,
            href: c.href,
            icon: c.icon,
          }));
        }

        // Process Routes
        const routes = dbData?.routes || [];
        if (routes.length > 0) {
          results['routes'] = routes.map((r) => ({
            title: r.title,
            subtitle: r.subtitle,
            href: r.href,
            icon: r.icon,
            difficulty:
              GRADE_NUMBER_TO_LABEL[r.difficulty as VERTICAL_LIFE_GRADES],
            grade: r.difficulty,
            climbing_kind: r.climbing_kind,
          }));
        }

        // Process Users
        const users = dbData?.users || [];
        if (users.length > 0) {
          results['users'] = users.map((u) => ({
            title: u.title,
            href: u.href,
            icon: this.supabase.buildAvatarUrl(u.icon) || u.title[0],
            type: 'user',
          }));
        }

        // Only show create/import options when there are no results at all
        const hasAnyResults =
          areas.length > 0 ||
          crags.length > 0 ||
          routes.length > 0 ||
          users.length > 0;

        if (!hasAnyResults) {
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
                    grade: gradeToNumber(anuRoute.difficulty),
                    climbing_kind:
                      anuRoute.category === 0 ? 'sport' : 'boulder',
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

        return results;
      }),
      catchError((err: Error) => {
        console.error('[SearchService] Search error', err);
        return of({} as SearchData);
      }),
    );
  }
}
