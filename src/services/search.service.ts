import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { catchError, from, map, Observable, of } from 'rxjs';

import {
  SearchData,
  SearchItem,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
} from '../models';

import { normalizeName, slugify } from '../utils';

import { SupabaseService } from './supabase.service';
import { EightAnuService } from './eight-anu.service';

interface DbArea {
  id: number;
  name: string;
  slug: string;
}

interface DbCrag {
  id: number;
  name: string;
  slug: string;
  area:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
}

interface DbRoute {
  id: number;
  name: string;
  slug: string;
  grade: number;
  crag:
    | {
        name: string;
        slug: string;
        area:
          | { name: string; slug: string }
          | { name: string; slug: string }[]
          | null;
      }
    | {
        name: string;
        slug: string;
        area:
          | { name: string; slug: string }
          | { name: string; slug: string }[]
          | null;
      }[]
    | null;
}

interface DbUser {
  id: string;
  name: string;
  avatar: string | null;
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
    if (trimmedQuery.length < 2) return from([null]);

    const q = `%${trimmedQuery}%`;
    const qSlug = `%${slugify(trimmedQuery)}%`;
    const qLoose = `%${trimmedQuery
      .split('')
      .map((c) => (/[aeiouáéíóúü]/i.test(c) ? '%' : c))
      .join('')}%`.replace(/%+/g, '%');

    const dbQuery$: Observable<SearchData> = from(
      Promise.all([
        this.supabase.client
          .from('areas')
          .select('id, name, slug')
          .or(`name.ilike.${q},slug.ilike.${qSlug}`)
          .limit(5),
        this.supabase.client
          .from('crags')
          .select('id, name, slug, area:areas(name, slug)')
          .or(`name.ilike.${q},slug.ilike.${qSlug}`)
          .limit(5),
        this.supabase.client
          .from('routes')
          .select(
            'id, name, slug, grade, crag:crags!routes_crag_id_fkey(name, slug, area:areas!crags_area_id_fkey(name, slug))',
          )
          .or(`name.ilike.${q},slug.ilike.${qSlug}`)
          .limit(5),
        this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .or(`name.ilike.${q},name.ilike.${qLoose}`)
          .limit(50),
        this.eightAnu.searchUnified(trimmedQuery, ['0', '1', '3']),
      ]) as Promise<any[]>,
    ).pipe(
      map((responses) => {
        const areas = responses[0].data as DbArea[] | null;
        const crags = responses[1].data as DbCrag[] | null;
        const routes = responses[2].data as DbRoute[] | null;
        const users = responses[3].data as DbUser[] | null;
        const eightAnuItems = responses[4] as any[];

        const results: SearchData = {};
        const areasTitle = this.translate.instant('areas');
        if (areas?.length) {
          results[areasTitle] = areas.map(
            (a: DbArea) =>
              ({
                title: a.name,
                href: `/area/${a.slug}`,
                icon: '@tui.map-pin',
              }) as SearchItem,
          );
        } else {
          const anuArea = eightAnuItems?.find((i) => i.type === 0);
          results[areasTitle] = [
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

        const cragsTitle = this.translate.instant('crags');
        if (crags?.length) {
          results[cragsTitle] = crags.map((c: DbCrag) => {
            const area = Array.isArray(c.area) ? c.area[0] : c.area;
            return {
              title: c.name,
              subtitle: area?.name,
              href: `/area/${area?.slug}/${c.slug}`,
              icon: '@tui.mountain',
            } as SearchItem;
          });
        } else {
          const anuCrag = eightAnuItems?.find((i) => i.type === 1);
          results[cragsTitle] = [
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

        const routesTitle = this.translate.instant('routes');
        if (routes?.length) {
          results[routesTitle] = routes.map((r: DbRoute) => {
            const crag = Array.isArray(r.crag) ? r.crag[0] : r.crag;
            const area = Array.isArray(crag?.area) ? crag?.area[0] : crag?.area;
            return {
              title: r.name,
              subtitle: `${area?.name || ''} > ${crag?.name || ''}`,
              href: `/area/${area?.slug}/${crag?.slug}/${r.slug}`,
              icon: '@tui.route',
              difficulty:
                GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES],
            } as SearchItem;
          });
        } else {
          const anuRoute = eightAnuItems?.find((i) => i.type === 3);
          results[routesTitle] = [
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

        if (users?.length) {
          results[this.translate.instant('users')] = users
            .filter((u) =>
              normalizeName(u.name).includes(normalizeName(trimmedQuery)),
            )
            .slice(0, 5)
            .map(
              (u: DbUser) =>
                ({
                  title: u.name,
                  href: `/profile/${u.id}`,
                  icon: this.supabase.buildAvatarUrl(u.avatar) || u.name[0],
                  type: 'user',
                }) as SearchItem,
            );
        }
        return results;
      }),
      catchError((err: Error) => {
        console.error('[SearchService] DB search error', err);
        return of({} as SearchData);
      }),
    );

    return dbQuery$;
  }
}
