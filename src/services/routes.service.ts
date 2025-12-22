import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import type { RouteDto, RouteInsertDto, RouteUpdateDto } from '../models';

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);

  async create(
    payload: Omit<RouteInsertDto, 'created_at' | 'id'>,
  ): Promise<RouteDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[RoutesService] create error', error);
      throw error;
    }
    // Refresh routes list for the current crag and current route
    this.global.cragRoutesResource.reload();
    this.global.routeDetailResource.reload();
    return data as RouteDto;
  }

  async update(
    id: number,
    payload: Partial<Omit<RouteUpdateDto, 'id' | 'created_at'>>,
  ): Promise<RouteDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('routes')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[RoutesService] update error', error);
      throw error;
    }
    this.global.cragRoutesResource.reload();
    this.global.routeDetailResource.reload();
    return data as RouteDto;
  }

  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('routes')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[RoutesService] delete error', error);
      throw error;
    }
    this.global.cragRoutesResource.reload();
    this.global.routeDetailResource.reload();
    return true;
  }

  async toggleRouteLike(routeId: number): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'toggle_route_like',
        {
          p_route_id: routeId,
        },
      );
      if (error) throw error;
      this.global.cragRoutesResource.reload();
      this.global.routeDetailResource.reload();
      return data as boolean;
    } catch (e) {
      console.error('[RoutesService] toggleRouteLike error', e);
      throw e;
    }
  }

  async removeRouteProject(routeId: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('route_projects')
        .delete()
        .match({
          user_id: this.supabase.authUserId(),
          route_id: routeId,
        });

      if (error) throw error;
      this.global.cragRoutesResource.reload();
      this.global.routeDetailResource.reload();
    } catch (e) {
      console.error('[RoutesService] removeRouteProject error', e);
    }
  }

  async toggleRouteProject(routeId: number): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'toggle_route_project',
        {
          p_route_id: routeId,
        },
      );
      if (error) throw error;
      this.global.cragRoutesResource.reload();
      this.global.routeDetailResource.reload();
      return data as boolean;
    } catch (e) {
      console.error('[RoutesService] toggleRouteProject error', e);
      throw e;
    }
  }
}
