import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { from, Observable } from 'rxjs';
import { SearchData, SearchItem } from '../models';
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

    return from(
      (async (): Promise<SearchData> => {
        await this.supabase.whenReady();
        const q = `%${trimmedQuery}%`;

        const [
          { data: areas },
          { data: crags },
          { data: routes },
          { data: users },
        ] = await Promise.all([
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
        ]);

        const results: SearchData = {};

        if (areas?.length) {
          results[this.translate.instant('labels.areas')] = areas.map(
            (a) =>
              ({
                title: a.name,
                href: `/area/${a.slug}`,
                icon: '@tui.map-pin',
              }) as SearchItem,
          );
        }

        if (crags?.length) {
          results[this.translate.instant('labels.crags')] = crags.map((c) => {
            const area = Array.isArray(c.area) ? c.area[0] : c.area;
            return {
              title: c.name,
              subtitle: area?.name,
              href: `/area/${area?.slug}/${c.slug}`,
              icon: '@tui.mountain',
            } as SearchItem;
          });
        }

        if (routes?.length) {
          results[this.translate.instant('labels.routes')] = routes.map((r) => {
            const crag = Array.isArray(r.crag) ? r.crag[0] : r.crag;
            const area = Array.isArray(crag?.area) ? crag?.area[0] : crag?.area;
            return {
              title: r.name,
              subtitle: `${area?.name || ''} > ${crag?.name || ''}`,
              href: `/area/${area?.slug}/${crag?.slug}/${r.slug}`,
              icon: '@tui.route',
            } as SearchItem;
          });
        }

        if (users?.length) {
          results[this.translate.instant('labels.users')] = users.map(
            (u) =>
              ({
                title: u.name,
                href: `/profile/${u.id}`,
                icon: this.supabase.buildAvatarUrl(u.avatar) || u.name[0],
                type: 'user',
              }) as SearchItem,
          );
        }

        return results;
      })(),
    );
  }
}
