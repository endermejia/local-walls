import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
// getCragDetailBySlug removed; RPC get_crag_by_slug is no longer used
import { GlobalData } from './global-data';
import type { CragDto, CragInsertDto, CragUpdateDto } from '../models';

@Injectable({ providedIn: 'root' })
export class CragsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  async create(
    payload: Omit<CragInsertDto, 'created_at' | 'id'>,
  ): Promise<CragDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('crags')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[CragsService] create error', error);
      throw error;
    }
    // After creating, reload the crags list for the selected area
    this.global.cragsListResource.reload();
    return data as CragDto;
  }

  async update(
    id: number,
    payload: Omit<CragUpdateDto, 'id' | 'created_at'>,
  ): Promise<CragDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('crags')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[CragsService] update error', error);
      throw error;
    }
    // Reload the crags list for the selected area and the current crag detail
    this.global.cragsListResource.reload();
    this.global.cragDetailResource.reload();
    return data as CragDto;
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
      // Update global crag list
      this.global.cragsListResource.update((value) => {
        if (!value) return value;
        return value.filter((item) => item.id !== id);
      });
      return true;
    } catch (e) {
      console.error('[CragsService] delete error', e);
      throw e;
    }
  }

  /** Toggle like for a crag using Supabase RPC toggle_crag_like */
  async toggleCragLike(cragId: number): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      if (!cragId) {
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
      const liked = data as boolean;
      // Update global crag list
      this.global.cragsListResource.update((value) => {
        if (!value) return value;
        return value
          .map((item) => (item.id === cragId ? { ...item, liked } : item))
          .sort((a, b) => {
            // First sort by liked status (liked items first)
            if (a.liked && !b.liked) return -1;
            if (!a.liked && b.liked) return 1;
            // Then sort by name
            return a.name.localeCompare(b.name);
          });
      });

      // Update crag detail if it matches
      this.global.cragDetailResource.update((curr) => {
        if (curr?.id === cragId) {
          return { ...curr, liked };
        }
        return curr;
      });

      return liked;
    } catch (e) {
      console.error('[CragsService] toggleCragLike error', e);
      throw e;
    }
  }
}
