import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { SupabaseService } from './supabase.service';

import {
  AreaListItem,
  AreaListRpcRow,
  AmountByEveryGrade,
  CragListItem,
  CragListRpcRow,
  RouteWithExtras,
  RouteWithJoins,
} from '../models';
import { mapRouteToExtras, RawRouteData } from '../utils/route-mapper';

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
      .rpc('get_areas_list')
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
        ...(a as unknown as AreaListRpcRow),
        grades: (a as unknown as AreaListRpcRow).grades as AmountByEveryGrade,
        liked: true,
      })) as unknown as AreaListItem[];
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
      .rpc('get_crags_list')
      .in('id', cragIds);

    if (error) {
      console.error('[FavoritesService] getLikedCrags error', error);
      return [];
    }

    return (likedCrags || []).map((c) => ({
      ...(c as CragListRpcRow),
      grades: (c as CragListRpcRow).grades as AmountByEveryGrade,
      topos: (c as CragListRpcRow).topos as {
        id: number;
        name: string;
        slug: string;
      }[],
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

    const routes = data as RouteWithJoins[];

    return routes.map((r) =>
      mapRouteToExtras(r as RawRouteData, {
        areaIdSource: 'crag.area.id',
        includeEquippers: false,
        includeTopos: false,
      }),
    );
  }
}
