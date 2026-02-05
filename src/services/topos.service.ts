import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import type {
  TopoDetail,
  TopoDto,
  TopoInsertDto,
  TopoRouteInsertDto,
  TopoUpdateDto,
} from '../models';
import {
  TopoPathEditorConfig,
  TopoPathEditorDialogComponent,
} from '../dialogs/topo-path-editor-dialog';

import TopoFormComponent from '../forms/topo-form';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ToposService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  openTopoForm(data: {
    cragId?: number;
    topoData?: TopoDetail;
    initialRouteIds?: number[];
  }): void {
    const isEdit = !!data.topoData;
    void firstValueFrom(
      this.dialogs.open<string | null>(
        new PolymorpheusComponent(TopoFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'topos.editTitle' : 'topos.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.global.cragDetailResource.reload();
        if (this.global.selectedTopoId()) {
          this.global.topoDetailResource.reload();
        }
      }
    });
  }

  async create(
    payload: Omit<TopoInsertDto, 'created_at' | 'id'>,
  ): Promise<TopoDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('topos')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[ToposService] create error', error);
      throw error;
    }
    this.global.cragDetailResource.reload();
    this.toast.success('messages.toasts.topoCreated');
    return data as TopoDto;
  }

  async update(
    id: number,
    payload: Partial<Omit<TopoUpdateDto, 'id' | 'created_at'>>,
  ): Promise<TopoDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('topos')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[ToposService] update error', error);
      throw error;
    }
    this.global.cragDetailResource.reload();
    this.global.topoDetailResource.reload();
    this.toast.success('messages.toasts.topoUpdated');
    return data as TopoDto;
  }

  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();

    // 1. Delete photo from storage via Edge Function if exists
    // We do this BEFORE deleting the topo record to ensure permissions
    try {
      await this.deletePhoto(id);
    } catch (e) {
      console.warn(
        '[ToposService] Could not delete photo during topo deletion',
        e,
      );
    }

    const { error } = await this.supabase.client
      .from('topos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ToposService] delete error', error);
      throw error;
    }

    this.global.cragDetailResource.reload();
    this.toast.success('messages.toasts.topoDeleted');
    return true;
  }

  async deletePhoto(topoId: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();

    const { error } = await this.supabase.client.functions.invoke(
      'delete-topo',
      {
        headers: {
          'topo-id': topoId.toString(),
        },
      },
    );

    if (error) {
      console.error('[ToposService] deletePhoto error', error);
      throw error;
    }

    this.global.topoPhotoVersion.update((v) => v + 1);
    this.global.topoDetailResource.reload();
    this.global.cragDetailResource.reload();
  }

  async addRoute(payload: TopoRouteInsertDto): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('topo_routes')
      .insert(payload);
    if (error) {
      console.error('[ToposService] addRoute error', error);
      throw error;
    }
    this.global.topoDetailResource.reload();
    this.toast.success('messages.toasts.routeUpdated');
  }

  async removeRoute(topoId: number, routeId: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('topo_routes')
      .delete()
      .match({ topo_id: topoId, route_id: routeId });
    if (error) {
      console.error('[ToposService] removeRoute error', error);
      throw error;
    }
    this.global.topoDetailResource.reload();
    this.toast.success('messages.toasts.routeUpdated');
  }

  async updateRouteOrder(
    topoId: number,
    routeId: number,
    number: number,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('topo_routes')
      .update({ number })
      .match({ topo_id: topoId, route_id: routeId });
    if (error) {
      console.error('[ToposService] updateRouteOrder error', error);
      throw error;
    }
    this.global.topoDetailResource.reload();
    this.toast.success('messages.toasts.routeUpdated');
  }

  async uploadPhoto(topoId: number, file: File): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const toBase64 = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(f);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

    try {
      const base64 = await toBase64(file);
      await this.supabase.whenReady();
      const { error } = await this.supabase.client.functions.invoke(
        'upload-topo-photo',
        {
          body: {
            file_name: file.name,
            content_type: file.type,
            base64,
          },
          headers: {
            'Topo-Id': topoId.toString(),
          },
        },
      );

      if (error) throw error;

      this.toast.success('messages.toasts.topoUpdated');
      this.global.topoPhotoVersion.update((v) => v + 1);
      this.global.topoDetailResource.reload();
      this.global.cragDetailResource.reload();
    } catch (e) {
      console.error('[ToposService] uploadPhoto error', e);
      throw e;
    }
  }

  async openTopoPathEditor(data: TopoPathEditorConfig): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;

    return firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(TopoPathEditorDialogComponent),
        {
          data,
          size: 'l',
          closable: false,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.global.topoDetailResource.reload();
      }
      return result;
    });
  }

  async updateRoutePath(
    topoId: number,
    routeId: number,
    path: { x: number; y: number }[],
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('topo_routes')
      .update({ path } as any)
      .match({ topo_id: topoId, route_id: routeId });

    if (error) {
      console.error('[ToposService] updateRoutePath error', error);
      throw error;
    }
  }
}
