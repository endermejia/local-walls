import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from './supabase.service';
import { GlobalData } from './global-data';
import type { ParkingDto, ParkingInsertDto, ParkingUpdateDto } from '../models';

@Injectable({ providedIn: 'root' })
export class ParkingsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);
  private readonly global = inject(GlobalData);

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
    return true;
  }

  async getCragParkings(cragId: number): Promise<ParkingDto[]> {
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('crag_parkings')
      .select('parking:parkings(*)')
      .eq('crag_id', cragId);
    if (error) {
      console.error('[ParkingsService] getCragParkings error', error);
      return [];
    }
    return (data || []).map((d) => d.parking as ParkingDto);
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
  }
}
