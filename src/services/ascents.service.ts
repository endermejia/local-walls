import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { Observable, tap } from 'rxjs';

import {
  AscentDialogData,
  AscentType,
  RouteAscentDto,
  RouteAscentInsertDto,
  RouteAscentUpdateDto,
  RouteAscentWithExtras,
} from '../models';

import AscentFormComponent from '../pages/ascent-form';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AscentsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  readonly ascentInfo = computed<
    Record<
      AscentType | 'default',
      { icon: string; background: string; backgroundSubtle: string }
    >
  >(() => {
    const info: Record<
      AscentType | 'default',
      { icon: string; background: string; backgroundSubtle: string }
    > = {
      os: {
        icon: '@tui.eye',
        background: 'var(--tui-status-positive)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      f: {
        icon: '@tui.zap',
        background: 'var(--tui-status-warning)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      rp: {
        icon: '@tui.circle',
        background: 'var(--tui-status-negative)',
        backgroundSubtle: 'var(--tui-status-positive-pale)',
      },
      default: {
        icon: '@tui.circle',
        background: 'var(--tui-neutral-fill)',
        backgroundSubtle: 'transparent',
      },
    };
    return info;
  });

  openAscentForm(data: AscentDialogData): Observable<boolean> {
    return this.dialogs
      .open<boolean>(new PolymorpheusComponent(AscentFormComponent), {
        label: this.translate.instant(
          data.ascentData ? 'ascent.edit' : 'ascent.new',
        ),
        size: 'm',
        data,
      })
      .pipe(
        tap((res) => {
          if (res === null || res) {
            void this.refreshResources();
          }
        }),
      );
  }

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
    this.toast.success('messages.toasts.ascentCreated');
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
    this.refreshResources(id, payload as Partial<RouteAscentWithExtras>);
    this.toast.success('messages.toasts.ascentUpdated');
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

    // Update resources by removing the ascent
    const removeFn = (
      data: { items: RouteAscentWithExtras[]; total: number } | undefined,
    ) => {
      if (!data) return { items: [], total: 0 };
      const newItems = data.items.filter((item) => item.id !== id);
      if (newItems.length === data.items.length) return data;
      return {
        items: newItems,
        total: Math.max(0, data.total - 1),
      };
    };
    this.global.userAscentsResource.update(removeFn);
    this.global.routeAscentsResource.update(removeFn);

    this.refreshResources();
    this.toast.success('messages.toasts.ascentDeleted');
    return true;
  }

  refreshResources(
    ascentId?: number,
    changes?: Partial<RouteAscentWithExtras>,
  ): void {
    if (ascentId && changes) {
      const updateFn = (
        data: { items: RouteAscentWithExtras[]; total: number } | undefined,
      ) => {
        if (!data) return { items: [], total: 0 };
        return {
          ...data,
          items: data.items.map((item) =>
            item.id === ascentId ? { ...item, ...changes } : item,
          ),
        };
      };

      this.global.userAscentsResource.update(updateFn);
      this.global.routeAscentsResource.update(updateFn);
    } else {
      this.global.userAscentsResource.reload();
      this.global.routeAscentsResource.reload();
    }

    this.global.routeDetailResource.reload();
    this.global.cragRoutesResource.reload();
    this.global.topoDetailResource.reload();
    this.global.userProjectsResource.reload();
    this.global.userTotalAscentsCountResource.reload();
  }
}
