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

import { CragFormComponent } from '../forms/crag-form';
import { CragUnifyComponent } from '../forms/crag-unify';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

export interface CragSimple {
  id: number;
  name: string;
  area_id: number;
  area: { name: string } | null;
}

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
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(CragFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'crags.editTitle' : 'crags.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.global.cragsListResource.reload();
        this.global.cragDetailResource.reload();

        if (
          isEdit &&
          oldSlug &&
          typeof result === 'string' &&
          result !== oldSlug
        ) {
          const areaSlug = this.global.selectedAreaSlug();
          if (areaSlug && this.global.selectedCragSlug() === oldSlug) {
            void this.router.navigate(['/area', areaSlug, result]);
          }
        }
      }
    });
  }

  openUnifyCrags(crags?: CragDto[]): Promise<boolean> {
    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(CragUnifyComponent),
        {
          label: this.translate.instant('crags.unifyTitle'),
          size: 'm',
          data: { candidates: crags },
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.global.cragsListResource.reload();
      }
      return result;
    });
  }

  async getCragsAdmin(
    page: number,
    pageSize: number,
    query: string,
  ): Promise<{ data: (CragDto & { area?: { name: string } })[]; count: number }> {
    if (!isPlatformBrowser(this.platformId)) return { data: [], count: 0 };
    await this.supabase.whenReady();

    let queryBuilder = this.supabase.client
      .from('crags')
      .select('*, area:areas(name)', { count: 'exact' });

    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await queryBuilder
      .range(from, to)
      .order('name');

    if (error) {
      console.error('[CragsService] getCragsAdmin error', error);
      return { data: [], count: 0 };
    }

    return {
      data: data as (CragDto & { area?: { name: string } })[],
      count: count || 0,
    };
  }

  async getAllCragsSimple(): Promise<CragSimple[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    let allCrags: CragSimple[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await this.supabase.client
        .from('crags')
        .select('id, name, area_id, area:areas(name)')
        .range(from, from + step - 1);

      if (error) {
        console.error('[CragsService] getAllCragsSimple error', error);
        break;
      }

      if (data && data.length > 0) {
        allCrags = [...allCrags, ...(data as unknown as CragSimple[])];
        if (data.length < step) {
          hasMore = false;
        } else {
          from += step;
        }
      } else {
        hasMore = false;
      }
    }

    return allCrags;
  }

  async unify(
    targetCragId: number,
    sourceCragIds: number[],
    newName: string,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { error } = await this.supabase.client.rpc('unify_crags', {
        p_target_crag_id: targetCragId,
        p_source_crag_ids: sourceCragIds,
        p_new_name: newName,
      });

      if (error) throw error;

      this.global.cragsListResource.reload();
      this.toast.success('messages.toasts.cragsUnified');
      return true;
    } catch (e) {
      console.error('[CragsService] unify error', e);
      this.toast.error('errors.unexpected');
      return false;
    } finally {
      this.loading.set(false);
    }
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

  async getById(id: number): Promise<{ data: CragDto | null; error: unknown }> {
    if (!isPlatformBrowser(this.platformId)) return { data: null, error: null };
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('crags')
      .select('*')
      .eq('id', id)
      .single();
    return { data: data as CragDto, error };
  }

  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('crags')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[CragsService] delete error', error);
      throw error;
    }
    // Reload the crags list
    this.global.cragsListResource.reload();
    this.toast.success('messages.toasts.cragDeleted');
    return true;
  }

  async toggleCragLike(cragId: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    try {
      const { data: liked, error } = await this.supabase.client.rpc(
        'toggle_crag_like',
        { p_crag_id: cragId },
      );

      if (error) throw error;

      // Update local state
      this.global.cragsListResource.update((curr) => {
        return (curr || [])
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
