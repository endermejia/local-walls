import { inject, Injectable, signal } from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  MaterialRequestDialogComponent,
  MaterialRequestDialogData,
} from '../components/dialogs/material-request-dialog';
import {
  MaterialRequestsHistoryDialogComponent,
  MaterialRequestsHistoryDialogData,
} from '../components/dialogs/material-requests-history-dialog';

import {
  AreaMaterialRequestWithDetails,
  MaterialCatalogItem,
  MaterialRequestStatus,
} from '../models';

import { handleErrorToast } from '../utils';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AreaMaterialRequestsService {
  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly pendingCount = signal(0);
  readonly requestsChange = signal(0);

  async createRequest(
    areaId: number,
    items: { material_id: number; quantity: number }[],
    notes?: string,
  ): Promise<number | null> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client.rpc(
        'create_area_material_request',
        {
          p_area_id: areaId,
          p_items: items,
          p_notes: notes || undefined,
        },
      );

      if (error) throw error;
      this.toast.success('materialRequest.success');
      this.requestsChange.update((v) => v + 1);
      return data as number;
    } catch (e) {
      console.error('[AreaMaterialRequestsService] createRequest error:', e);
      handleErrorToast(e, this.toast);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async cancelRequest(requestId: number): Promise<boolean> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      const { error } = await this.supabase.client
        .from('area_material_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending');

      if (error) throw error;
      this.toast.success('materialRequest.cancelled');
      this.requestsChange.update((v) => v + 1);
      return true;
    } catch (e) {
      console.error('[AreaMaterialRequestsService] cancelRequest error:', e);
      handleErrorToast(e, this.toast);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async updateRequestStatus(
    requestId: number,
    status: MaterialRequestStatus,
    rejectionReason?: string,
  ): Promise<boolean> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      const session = this.supabase.session();
      const currentUserId = session?.user?.id || null;

      const { error } = await this.supabase.client
        .from('area_material_requests')
        .update({
          status,
          rejection_reason: rejectionReason || null,
          reviewed_by: currentUserId,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;
      this.toast.success('materialRequests.statusUpdated');
      this.requestsChange.update((v) => v + 1);
      await this.loadPendingCount();
      return true;
    } catch (e) {
      console.error(
        '[AreaMaterialRequestsService] updateRequestStatus error:',
        e,
      );
      handleErrorToast(e, this.toast);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async getRequestsByArea(
    areaId: number,
  ): Promise<AreaMaterialRequestWithDetails[]> {
    await this.supabase.whenReady();
    try {
      const { data, error } = await this.supabase.client
        .from('area_material_requests')
        .select(
          `
          *,
          user:user_profiles!area_material_requests_user_id_fkey(id, name, avatar),
          reviewer:user_profiles!area_material_requests_reviewed_by_fkey(id, name),
          items:area_material_request_items(
            id,
            request_id,
            material_id,
            quantity,
            unit_price,
            created_at,
            material:material_catalog(*)
          )
        `,
        )
        .eq('area_id', areaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return this.mapRequestsWithDetails(
        (data as unknown as RawRequestRow[]) ?? [],
      );
    } catch (e) {
      console.error(
        '[AreaMaterialRequestsService] getRequestsByArea error:',
        e,
      );
      return [];
    }
  }

  async getAllRequests(
    statusFilter?: MaterialRequestStatus,
  ): Promise<AreaMaterialRequestWithDetails[]> {
    this.loading.set(true);
    await this.supabase.whenReady();
    try {
      let query = this.supabase.client
        .from('area_material_requests')
        .select(
          `
          *,
          area:areas!area_material_requests_area_id_fkey(id, name, slug),
          user:user_profiles!area_material_requests_user_id_fkey(id, name, avatar),
          reviewer:user_profiles!area_material_requests_reviewed_by_fkey(id, name),
          items:area_material_request_items(
            id,
            request_id,
            material_id,
            quantity,
            unit_price,
            created_at,
            material:material_catalog(*)
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (statusFilter) {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      const mapped = this.mapRequestsWithDetails(
        (data as unknown as RawRequestRow[]) ?? [],
      );
      return mapped;
    } catch (e) {
      console.error('[AreaMaterialRequestsService] getAllRequests error:', e);
      handleErrorToast(e, this.toast);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  async loadPendingCount(): Promise<number> {
    await this.supabase.whenReady();
    try {
      const { count, error } = await this.supabase.client
        .from('area_material_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (error) throw error;
      const total = count ?? 0;
      this.pendingCount.set(total);
      return total;
    } catch {
      return 0;
    }
  }

  async openMaterialRequestDialog(
    areaId: number,
    areaName: string,
    availableBalance: number,
  ): Promise<boolean> {
    const result = await firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(MaterialRequestDialogComponent),
        {
          data: {
            areaId,
            areaName,
            availableBalance,
          } as MaterialRequestDialogData,
          label: this.translate.instant('materialRequest.title'),
          size: 'l',
        },
      ),
      { defaultValue: false },
    );
    return !!result;
  }

  openHistoryDialog(areaId: number, areaName: string): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(MaterialRequestsHistoryDialogComponent),
        {
          data: { areaId, areaName } as MaterialRequestsHistoryDialogData,
          label: this.translate.instant('materialRequests.historyTitle'),
          size: 'l',
        },
      ),
      { defaultValue: undefined },
    );
  }

  private mapRequestsWithDetails(
    rawList: RawRequestRow[],
  ): AreaMaterialRequestWithDetails[] {
    return rawList.map((r) => ({
      id: r.id,
      area_id: r.area_id,
      user_id: r.user_id,
      status: r.status,
      total_amount: r.total_amount,
      notes: r.notes,
      rejection_reason: r.rejection_reason,
      created_at: r.created_at,
      updated_at: r.updated_at,
      reviewed_by: r.reviewed_by,
      reviewed_at: r.reviewed_at,
      area: r.area
        ? { id: r.area.id, name: r.area.name, slug: r.area.slug }
        : undefined,
      user: {
        id: r.user?.id || r.user_id,
        name: r.user?.name || null,
        avatar: r.user?.avatar || null,
      },
      reviewer: r.reviewer
        ? { id: r.reviewer.id, name: r.reviewer.name || null }
        : null,
      items: (r.items ?? []).map((i) => ({
        id: i.id,
        request_id: i.request_id,
        material_id: i.material_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        created_at: i.created_at,
        material: (i.material as MaterialCatalogItem) || {
          id: i.material_id,
          name: 'Material',
          description: null,
          unit: 'ud',
          price: i.unit_price,
          image_url: null,
          active: true,
          created_at: i.created_at,
          updated_at: i.created_at,
        },
      })),
    }));
  }
}

interface RawRequestRow {
  id: number;
  area_id: number;
  user_id: string;
  status: MaterialRequestStatus;
  total_amount: number;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  area?: { id: number; name: string; slug: string } | null;
  user?: {
    id: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
  reviewer?: { id: string; name?: string | null } | null;
  items?: {
    id: number;
    request_id: number;
    material_id: number;
    quantity: number;
    unit_price: number;
    created_at: string;
    material?: MaterialCatalogItem | null;
  }[];
}
