import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import type {
  AreaDetail,
  AreaDto,
  AreaInsertDto,
  AreaLikeToggleResult,
  AreaListItem,
  AreaUpdateDto,
} from '../models';

@Injectable({ providedIn: 'root' })
export class AreasService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  async create(
    payload: Omit<AreaInsertDto, 'created_at' | 'id'>,
  ): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] create error', error);
      throw error;
    }
    return data as AreaDto;
  }

  async update(
    id: number,
    payload: Omit<AreaUpdateDto, 'id' | 'created_at'>,
  ): Promise<AreaDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('areas')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[AreasService] update error', error);
      throw error;
    }
    return data as AreaDto;
  }

  /** Delete an area by id (client-only). Returns true if deleted. */
  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('areas')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[AreasService] delete error', error);
      throw error;
    }
    return true;
  }

  /**
   * List areas using Supabase RPC get_areas_list, which includes user like information.
   * Client-only. On server returns an empty list.
   */
  async listFromRpc(
    filter = '',
    limit = 100,
    offset = 0,
  ): Promise<AreaListItem[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client.rpc(
        'get_areas_list' as unknown as never,
        {
          _filter: filter || null,
          _limit: limit,
          _offset: offset,
          // _user_id can be omitted to use auth context on RLS
        } as unknown as never,
      );
      if (error) throw error;
      const items = (data as AreaListItem[] | null) ?? [];

      // Store in GlobalData as the single source of truth
      this.global.areas.set(items);
      return items;
    } catch (e: any) {
      console.error('[AreasService] listFromRpc error', e);
      this.error.set(e?.message ?? 'Unknown error');
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /** Toggle like for an area using Supabase RPC toggle_area_like */
  async toggleAreaLike(areaId: number): Promise<AreaLikeToggleResult | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      // Validate input to avoid sending RPC without parameters
      if (
        typeof areaId !== 'number' ||
        !Number.isFinite(areaId) ||
        areaId <= 0
      ) {
        throw new Error(
          `[AreasService] toggleAreaLike invalid areaId: ${String(areaId)}`,
        );
      }

      const params = { p_area_id: areaId } as const;
      const { data, error } = await this.supabase.client.rpc(
        'toggle_area_like' as unknown as never,
        params as unknown as undefined,
      );
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as
        | AreaLikeToggleResult
        | undefined;
      if (!result) return null;
      // Optimistically update GlobalData areas cache
      try {
        const list = this.global.areas();
        const idx = list.findIndex((a) => a.id === areaId);
        if (idx !== -1) {
          const updated = [...list];
          const liked = result.action === 'inserted';
          updated[idx] = { ...updated[idx], liked };
          this.global.areas.set(updated);
        }
      } catch {
        /* empty */
      }
      return result;
    } catch (e) {
      console.error('[AreasService] toggleAreaLike error', e);
      throw e;
    }
  }

  /**
   * Detail for an area using Supabase RPC get_area_by_slug.
   * Returns null on server or on error.
   */
  async getAreaDetailBySlug(slug: string): Promise<AreaDetail | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'get_area_by_slug' as unknown as never,
        { p_slug: slug } as unknown as undefined,
      );
      if (error) throw error;
      return data as AreaDetail;
    } catch (e) {
      console.error('[AreasService] getAreaDetailBySlug error', e);
      return null;
    }
  }
}
