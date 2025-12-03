import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import type { CragDetail } from '../models';
import type { CragLikeToggleResult } from '../models/crag.model';

@Injectable({ providedIn: 'root' })
export class CragsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /** Detail for a crag using Supabase RPC get_crag_by_slug. */
  async getCragDetailBySlug(slug: string): Promise<CragDetail | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client.rpc(
        'get_crag_by_slug',
        {
          p_slug: slug,
        },
      );
      if (error) throw error;
      return (data as CragDetail) ?? null;
    } catch (e: any) {
      console.error('[CragsService] getCragDetailBySlug error', e);
      this.error.set(e?.message ?? 'Unknown error');
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /** Delete a crag by id. Returns true if deleted. */
  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('crags')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('[CragsService] delete error', e);
      throw e;
    }
  }

  /** Toggle like for a crag using Supabase RPC toggle_crag_like */
  async toggleCragLike(cragId: number): Promise<CragLikeToggleResult | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      if (
        typeof cragId !== 'number' ||
        !Number.isFinite(cragId) ||
        cragId <= 0
      ) {
        throw new Error(
          `[CragsService] toggleCragLike invalid cragId: ${String(cragId)}`,
        );
      }
      const params = { p_crag_id: cragId } as const;
      const { data, error } = await this.supabase.client.rpc(
        'toggle_crag_like',
        params,
      );
      if (error) throw error;
      const result = (Array.isArray(data) ? data[0] : data) as
        | CragLikeToggleResult
        | undefined;
      return result ?? null;
    } catch (e) {
      console.error('[CragsService] toggleCragLike error', e);
      throw e;
    }
  }
}
