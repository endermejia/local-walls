import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import type {
  EquipperDto,
  RouteDto,
  RouteInsertDto,
  RouteUpdateDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class RoutesService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);

  async getRouteEquippers(routeId: number): Promise<EquipperDto[]> {
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_equippers')
      .select('equipper:equippers(*)')
      .eq('route_id', routeId);
    if (error) {
      console.error('[RoutesService] getRouteEquippers error', error);
      return [];
    }
    return (data || []).map((d: any) => d.equipper as EquipperDto);
  }

  async setRouteEquippers(
    routeId: number,
    equippers: readonly (EquipperDto | string)[],
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();

    try {
      // 1. Get or create all equippers to get their IDs
      const equipperIds: number[] = [];

      for (const item of equippers) {
        if (typeof item === 'string') {
          // Check if it already exists by name (case insensitive)
          const { data: existing } = await this.supabase.client
            .from('equippers')
            .select('id')
            .ilike('name', item.trim())
            .maybeSingle();

          if (existing) {
            equipperIds.push(existing.id);
          } else {
            // Create new
            const { data: created, error: createError } =
              await this.supabase.client
                .from('equippers')
                .insert({ name: item.trim() })
                .select('id')
                .single();

            if (createError) throw createError;
            if (created) equipperIds.push(created.id);
          }
        } else {
          equipperIds.push(item.id);
        }
      }

      // 2. Sync junction table
      // Remove all first (simplest approach)
      await this.supabase.client
        .from('route_equippers')
        .delete()
        .eq('route_id', routeId);

      // Insert new ones
      if (equipperIds.length > 0) {
        const { error: insertError } = await this.supabase.client
          .from('route_equippers')
          .insert(
            equipperIds.map((id) => ({ route_id: routeId, equipper_id: id })),
          );

        if (insertError) throw insertError;
      }
    } catch (e) {
      console.error('[RoutesService] setRouteEquippers error', e);
      throw e;
    }
  }

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
