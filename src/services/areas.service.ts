import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
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
import type { AreaDto, AreaInsertDto, AreaUpdateDto } from '../models';
import { ToastService } from './toast.service';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TranslateService } from '@ngx-translate/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { AreaFormComponent } from '../pages/area-form';

@Injectable({ providedIn: 'root' })
export class AreasService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  openAreaForm(data?: {
    areaData?: { id: number; name: string; slug: string };
  }): void {
    const isEdit = !!data?.areaData;
    const oldSlug = data?.areaData?.slug;
    void firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(AreaFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'areas.editTitle' : 'areas.newTitle',
          ),
          size: 'l',
          data,
        },
      ),
    ).then((result) => {
      if (result) {
        this.global.areasListResource.reload();
        // Also reload global area detail if we are on that page?
        // Since we might navigate, we rely on router/resource reload.
        // But if we are on area list, reloads list.

        if (
          isEdit &&
          oldSlug &&
          typeof result === 'string' &&
          result !== oldSlug
        ) {
          if (this.global.selectedAreaSlug() === oldSlug) {
            void this.router.navigate(['/area', result]);
          }
        }
      }
    });
  }

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
    this.global.areasListResource.reload();
    this.toast.success('messages.toasts.areaCreated');
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
    this.global.areasListResource.reload();
    this.toast.success('messages.toasts.areaUpdated');
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
    // Update global area list
    this.global.areasListResource.update((value) => {
      if (!value) return value;
      return value.filter((item) => item.id !== id);
    });
    this.toast.success('messages.toasts.areaDeleted');
    return true;
  }

  /** Toggle like for an area using Supabase RPC toggle_area_like */
  async toggleAreaLike(areaId: number): Promise<boolean | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    try {
      if (!areaId) {
        throw new Error(
          `[AreasService] toggleAreaLike invalid areaId: ${String(areaId)}`,
        );
      }
      const params = { p_area_id: areaId } as const;
      const { data, error } = await this.supabase.client.rpc(
        'toggle_area_like',
        params,
      );
      if (error) throw error;
      const liked = data;
      // Update global area list
      this.global.areasListResource.update((value) => {
        if (!value) return value;
        return value
          .map((item) => (item.id === areaId ? { ...item, liked } : item))
          .sort((a, b) => {
            // First sort by liked status (liked items first)
            if (a.liked && !b.liked) return -1;
            if (!a.liked && b.liked) return 1;
            // Then sort by name
            return a.name.localeCompare(b.name);
          });
      });
      this.toast.success(
        liked
          ? 'messages.toasts.favoriteAdded'
          : 'messages.toasts.favoriteRemoved',
      );
      return liked;
    } catch (e) {
      console.error('[AreasService] toggleAreaLike error', e);
      throw e;
    }
  }
}
