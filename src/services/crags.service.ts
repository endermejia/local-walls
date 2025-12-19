import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
// getCragDetailBySlug eliminado; ya no se usa RPC get_crag_by_slug
import { GlobalData } from './global-data';

@Injectable({ providedIn: 'root' })
export class CragsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

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
      const liked = data;
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
      return liked;
    } catch (e) {
      console.error('[CragsService] toggleCragLike error', e);
      throw e;
    }
  }
}
