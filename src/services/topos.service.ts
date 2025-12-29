import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import type {
  TopoDto,
  TopoInsertDto,
  TopoUpdateDto,
  TopoRouteInsertDto,
} from '../models';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class ToposService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly toast = inject(ToastService);

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
}
