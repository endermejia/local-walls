import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SupabaseService } from './supabase.service';

import {
  AreaListItem,
  AscentTypes,
  CragListItem,
  RouteWithExtras,
  RouteAscentDto,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  async getLikedAreas(userId: string): Promise<AreaListItem[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const { data: areaLikes } = await this.supabase.client
      .from('area_likes')
      .select('area_id')
      .eq('user_id', userId);

    const areaIds = areaLikes?.map((a) => a.area_id) || [];
    if (!areaIds.length) return [];

    const { data: likedAreas, error } = await this.supabase.client
      .from('areas')
      .select(
        `
        id,
        name,
        slug,
        crags_count:crags(count)
      `,
      )
      .in('id', areaIds);

    if (error) {
      console.error('[FavoritesService] getLikedAreas error', error);
      return [];
    }

    const { data: purchases } = await this.supabase.client
      .from('area_purchases')
      .select('area_id')
      .eq('user_id', userId);

    const purchasedIds = new Set(purchases?.map((p) => p.area_id) || []);

    return (likedAreas || [])
      .filter((a) => !purchasedIds.has(a.id))
      .map((a) => ({
        ...a,
        crags_count: (a.crags_count as any)?.[0]?.count ?? 0,
        liked: true,
      })) as AreaListItem[];
  }

  async getLikedCrags(userId: string): Promise<CragListItem[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const { data: cragLikes } = await this.supabase.client
      .from('crag_likes')
      .select('crag_id')
      .eq('user_id', userId);

    const cragIds = cragLikes?.map((c) => c.crag_id) || [];
    if (!cragIds.length) return [];

    const { data: likedCrags, error } = await this.supabase.client
      .from('crags')
      .select(
        `
        id,
        name,
        slug,
        area_id,
        topos_count:topos(count),
        area:areas(name, slug)
      `,
      )
      .in('id', cragIds);

    if (error) {
      console.error('[FavoritesService] getLikedCrags error', error);
      return [];
    }

    return (likedCrags || []).map((c: any) => ({
      ...c,
      topos_count: c.topos_count?.[0]?.count ?? 0,
      area_name: c.area?.name,
      area_slug: c.area?.slug,
      liked: true,
    })) as CragListItem[];
  }

  async getLikedRoutes(userId: string): Promise<RouteWithExtras[]> {
    if (!isPlatformBrowser(this.platformId)) return [];

    const { data: routeLikes } = await this.supabase.client
      .from('route_likes')
      .select('route_id')
      .eq('user_id', userId);

    const routeIds = routeLikes?.map((r) => r.route_id) || [];
    if (!routeIds.length) return [];

    const currentUserId = this.supabase.authUserId();
    let query = this.supabase.client
      .from('routes')
      .select(
        `
        *,
        liked:route_likes(id),
        project:route_projects(id),
        ascents:route_ascents(rate, type),
        own_ascent:route_ascents(*),
        crag:crags(
          slug,
          name,
          area:areas(slug, name)
        )
      `,
      )
      .in('id', routeIds);

    if (currentUserId) {
      query = query
        .eq('own_ascent.user_id', currentUserId)
        .eq('project.user_id', currentUserId)
        .eq('liked.user_id', currentUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[FavoritesService] getLikedRoutes error', error);
      return [];
    }

    return (data || []).map((r: any) => {
      const rates =
        r.ascents
          ?.map((a: any) => a.rate)
          .filter((rate: number | null): rate is number => rate != null) ?? [];
      const rating =
        rates.length > 0
          ? rates.reduce((a: number, b: number) => a + b, 0) / rates.length
          : 0;

      return {
        ...r,
        liked: (r.liked?.length ?? 0) > 0,
        project: (r.project?.length ?? 0) > 0,
        crag_slug: r.crag?.slug,
        crag_name: r.crag?.name,
        area_slug: r.crag?.area?.slug,
        area_name: r.crag?.area?.name,
        rating,
        ascent_count:
          r.ascents?.filter(
            (a: Partial<RouteAscentDto>) => a.type !== AscentTypes.ATTEMPT,
          ).length ?? 0,
        climbed: (r.own_ascent?.length ?? 0) > 0,
        own_ascent: r.own_ascent?.[0],
      } as RouteWithExtras;
    });
  }
}
