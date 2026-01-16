import { isPlatformBrowser } from '@angular/common';
import {
  inject,
  Injectable,
  PLATFORM_ID,
  signal,
  WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import type { CragDto, CragInsertDto, CragUpdateDto } from '../models';

import { CragFormComponent } from '../pages/crag-form';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class CragsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  openCragForm(data?: {
    areaId?: number;
    cragData?: {
      id: number;
      area_id: number;
      name: string;
      slug: string;
      latitude?: number | null;
      longitude?: number | null;
      approach?: number | null;
      description_es?: string | null;
      description_en?: string | null;
      warning_es?: string | null;
      warning_en?: string | null;
    };
  }): void {
    const isEdit = !!data?.cragData;
    const oldSlug = data?.cragData?.slug;
    void firstValueFrom(
      this.dialogs.open<string | null>(
        new PolymorpheusComponent(CragFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'crags.editTitle' : 'crags.newTitle',
          ),
          size: 'l',
          data,
        },
      ),
    ).then((result) => {
      if (result) {
        this.global.cragsListResource.reload();
        this.global.cragDetailResource.reload();

        if (isEdit && oldSlug && result !== oldSlug) {
          const areaSlug = this.global.selectedAreaSlug();
          if (areaSlug && this.global.selectedCragSlug() === oldSlug) {
            void this.router.navigate(['/area', areaSlug, result]);
          }
        }
      }
    });
  }

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
    this.toast.success('messages.toasts.cragCreated');
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
    this.toast.success('messages.toasts.cragUpdated');
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
      this.toast.success('messages.toasts.cragDeleted');
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

      this.toast.success(
        liked
          ? 'messages.toasts.favoriteAdded'
          : 'messages.toasts.favoriteRemoved',
      );

      return liked;
    } catch (e) {
      console.error('[CragsService] toggleCragLike error', e);
      throw e;
    }
  }
}
