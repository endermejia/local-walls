import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, from, map, merge, Observable, of, scan } from 'rxjs';
import { SearchApiResponse, SearchData, SearchItem } from '../models';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly supabase = inject(SupabaseService);
  private readonly translate = inject(TranslateService);

  search(query: string): Observable<SearchData | null> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return from([null]);

    const q = `%${trimmedQuery}%`;

    const dbQuery$ = from(
      Promise.all([
        this.supabase.client
          .from('areas')
          .select('id, name, slug')
          .ilike('name', q)
          .limit(5),
        this.supabase.client
          .from('crags')
          .select('id, name, slug, area:areas(name, slug)')
          .ilike('name', q)
          .limit(5),
        this.supabase.client
          .from('routes')
          .select(
            'id, name, slug, crag:crags!routes_crag_id_fkey(name, slug, area:areas!crags_area_id_fkey(name, slug))',
          )
          .ilike('name', q)
          .limit(5),
        this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .ilike('name', q)
          .limit(5),
      ]),
    ).pipe(
      map(
        ([
          { data: areas },
          { data: crags },
          { data: routes },
          { data: users },
        ]: any[]) => {
          const results: SearchData = {};
          if (areas?.length) {
            results[this.translate.instant('labels.areas')] = areas.map(
              (a: any) =>
                ({
                  title: a.name,
                  href: `/area/${a.slug}`,
                  icon: '@tui.map-pin',
                }) as SearchItem,
            );
          }
          if (crags?.length) {
            results[this.translate.instant('labels.crags')] = crags.map(
              (c: any) => {
                const area = Array.isArray(c.area) ? c.area[0] : c.area;
                return {
                  title: c.name,
                  subtitle: area?.name,
                  href: `/area/${area?.slug}/${c.slug}`,
                  icon: '@tui.mountain',
                } as SearchItem;
              },
            );
          }
          if (routes?.length) {
            results[this.translate.instant('labels.routes')] = routes.map(
              (r: any) => {
                const crag = Array.isArray(r.crag) ? r.crag[0] : r.crag;
                const area = Array.isArray(crag?.area)
                  ? crag?.area[0]
                  : crag?.area;
                return {
                  title: r.name,
                  subtitle: `${area?.name || ''} > ${crag?.name || ''}`,
                  href: `/area/${area?.slug}/${crag?.slug}/${r.slug}`,
                  icon: '@tui.route',
                } as SearchItem;
              },
            );
          }
          if (users?.length) {
            results[this.translate.instant('labels.users')] = users.map(
              (u: any) =>
                ({
                  title: u.name,
                  href: `/profile/${u.id}`,
                  icon: this.supabase.buildAvatarUrl(u.avatar) || u.name[0],
                  type: 'user',
                }) as SearchItem,
            );
          }
          return results;
        },
      ),
      catchError((err) => {
        console.error('[SearchService] DB search error', err);
        return of({});
      }),
    );

    const elasticQuery$ = from(
      this.supabase.client.functions.invoke<SearchApiResponse>('search', {
        body: { query: trimmedQuery },
      }),
    ).pipe(
      map(({ data, error }: { data: SearchApiResponse | null; error: any }) => {
        if (error) throw error;
        const results: SearchData = {};
        if (data?.items?.length) {
          const elasticAreas: SearchItem[] = [];
          const elasticCrags: SearchItem[] = [];
          const elasticRoutes: SearchItem[] = [];

          data.items.forEach((item: any) => {
            if (item.type === 0) {
              elasticAreas.push({
                title: item.areaName,
                href: `/area/${item.areaSlug}`,
                icon: '@tui.map-pin',
              });
            } else if (item.type === 1) {
              elasticCrags.push({
                title: item.cragName,
                subtitle: item.areaName,
                href: `/area/${item.areaSlug}/${item.cragSlug}`,
                icon: '@tui.mountain',
              });
            } else if (item.type === 3) {
              elasticRoutes.push({
                title: item.zlaggableName,
                subtitle: `${item.areaName || ''} > ${item.cragName || ''}`,
                href: `/area/${item.areaSlug}/${item.cragSlug}/${item.zlaggableSlug}`,
                icon: '@tui.route',
                difficulty: item.difficulty,
              } as SearchItem);
            }
          });

          if (elasticAreas.length)
            results[this.translate.instant('labels.areas')] = elasticAreas;
          if (elasticCrags.length)
            results[this.translate.instant('labels.crags')] = elasticCrags;
          if (elasticRoutes.length)
            results[this.translate.instant('labels.routes')] = elasticRoutes;
        }
        return results;
      }),
      catchError((err) => {
        console.error('[SearchService] Elastic search error', err);
        return of({});
      }),
    );

    return merge(dbQuery$, elasticQuery$).pipe(
      scan((acc, curr) => this.mergeResults(acc, curr), {} as SearchData),
    );
  }

  private mergeResults(
    current: SearchData,
    newResults: SearchData,
  ): SearchData {
    const merged = { ...current };
    Object.keys(newResults).forEach((key) => {
      const existing = (merged[key] as SearchItem[]) || [];
      const incoming = (newResults[key] as SearchItem[]) || [];

      const existingHrefs = new Set(existing.map((i) => i.href));
      const uniqueIncoming = incoming.filter((i) => !existingHrefs.has(i.href));

      merged[key] = [...existing, ...uniqueIncoming];
    });
    return merged;
  }
}
