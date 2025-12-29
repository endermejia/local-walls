import { computed, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import type {
  RouteAscentDto,
  RouteAscentInsertDto,
  RouteAscentUpdateDto,
  AscentDialogData,
} from '../models';
import { TuiDialogService } from '@taiga-ui/experimental';
import { TranslateService } from '@ngx-translate/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import AscentFormComponent from '../pages/ascent-form';
import { Observable, Subject, tap } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AscentsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  private readonly ascentUpdated$ = new Subject<void>();
  readonly updated$ = this.ascentUpdated$.asObservable();

  readonly ascentInfo = computed<
    Record<string, { icon: string; background: string }>
  >(() => ({
    os: {
      icon: '@tui.eye',
      background: 'var(--tui-status-positive)',
    },
    f: {
      icon: '@tui.zap',
      background: 'var(--tui-status-warning)',
    },
    rp: {
      icon: '@tui.circle',
      background: 'var(--tui-status-negative)',
    },
    default: {
      icon: '@tui.circle',
      background: 'var(--tui-neutral-fill)',
    },
  }));

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
    this.refreshResources();
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
    this.refreshResources();
    this.toast.success('messages.toasts.ascentDeleted');
    return true;
  }

  private refreshResources(): void {
    this.global.routeDetailResource.reload();
    this.global.routeAscentsResource.reload();
    this.global.cragRoutesResource.reload();
    this.global.topoDetailResource.reload();
    this.global.userProjectsResource.reload();
    this.global.userAscentsResource.reload();
    this.ascentUpdated$.next();
  }
}
