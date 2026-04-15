import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';

import { TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';

import LinkParkingFormComponent from '../components/forms/link-parking-form';
import ParkingFormComponent from '../components/forms/parking-form';

import type { ParkingDto, ParkingInsertDto, ParkingUpdateDto } from '../models';

import { GlobalData } from './global-data';
import { mapLocationUrl } from '../utils';

@Injectable({ providedIn: 'root' })
export class ParkingsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);
  private readonly toast = inject(ToastService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  openParkingForm(
    data: {
      cragId?: number;
      parkingData?: ParkingDto;
      defaultLocation?: { lat: number; lng: number };
    } = {},
  ): void {
    const isEdit = !!data.parkingData;
    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(ParkingFormComponent),
        {
          label: this.translate.instant(isEdit ? 'edit' : 'new'),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        if (data.cragId) {
          this.global.cragDetailResource.reload();
        }
        this.global.adminParkingsResource.reload();
      }
    });
  }

  openLinkParkingForm(data: {
    cragId: number;
    existingParkingIds: number[];
  }): void {
    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(LinkParkingFormComponent),
        {
          label: this.translate.instant('link'),
          size: 'm',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: false },
    ).then((result) => {
      if (result) {
        this.global.cragDetailResource.reload();
      }
    });
  }

  async getAll(): Promise<ParkingDto[]> {
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('parkings')
      .select('*')
      .order('name');
    if (error) {
      console.error('[ParkingsService] getAll error', error);
      return [];
    }
    return data || [];
  }

  async create(
    payload: Omit<ParkingInsertDto, 'id' | 'created_at'>,
  ): Promise<ParkingDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('parkings')
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      console.error('[ParkingsService] create error', error);
      throw error;
    }
    this.toast.success('messages.toasts.parkingCreated');
    return data;
  }

  async update(
    id: number,
    payload: Partial<Omit<ParkingUpdateDto, 'id' | 'created_at'>>,
  ): Promise<ParkingDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('parkings')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('[ParkingsService] update error', error);
      throw error;
    }
    this.toast.success('messages.toasts.parkingUpdated');
    return data;
  }

  async delete(id: number): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('parkings')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[ParkingsService] delete error', error);
      throw error;
    }
    this.toast.success('messages.toasts.parkingDeleted');
    this.global.adminParkingsResource.reload();
    this.global.cragDetailResource.reload();
    return true;
  }

  async addParkingToCrag(cragId: number, parkingId: number): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('crag_parkings')
      .insert({ crag_id: cragId, parking_id: parkingId });
    if (error) {
      console.error('[ParkingsService] addParkingToCrag error', error);
      throw error;
    }
    this.global.cragDetailResource.reload();
    this.toast.success('messages.toasts.parkingLinked');
  }

  async removeParkingFromCrag(
    cragId: number,
    parkingId: number,
  ): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.supabase.whenReady();
    const { error } = await this.supabase.client
      .from('crag_parkings')
      .delete()
      .match({ crag_id: cragId, parking_id: parkingId });
    if (error) {
      console.error('[ParkingsService] removeParkingFromCrag error', error);
      throw error;
    }
    this.global.cragDetailResource.reload();
    this.toast.success('messages.toasts.parkingUnlinked');
  }

  openMaps(parking: ParkingDto, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const p = parking as any;
    const url = mapLocationUrl({
      latitude: p.latitude || p.lat,
      longitude: p.longitude || p.lng,
    });
    this.openExternal(url);
  }

  openExternal(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
}
