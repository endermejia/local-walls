import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import type {
  RouteAscentDto,
  RouteAscentInsertDto,
  RouteAscentUpdateDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AscentsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);

  async create(
    payload: Omit<RouteAscentInsertDto, 'created_at' | 'id'>,
  ): Promise<RouteAscentDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[AscentsService] create error', error);
      throw error;
    }
    this.refreshResources();
    return data as RouteAscentDto;
  }

  async update(
    id: number,
    payload: Partial<Omit<RouteAscentUpdateDto, 'id' | 'created_at'>>,
  ): Promise<RouteAscentDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('route_ascents')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[AscentsService] update error', error);
      throw error;
    }
    this.refreshResources();
    return data as RouteAscentDto;
  }

  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('route_ascents')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[AscentsService] delete error', error);
      throw error;
    }
    this.refreshResources();
    return true;
  }

  private refreshResources(): void {
    this.global.routeDetailResource.reload();
    this.global.routeAscentsResource.reload();
    this.global.cragRoutesResource.reload();
    this.global.topoDetailResource.reload();
  }
}
