import { inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { MerchandiseItem, AreaPackDetail } from '../models';

@Injectable({ providedIn: 'root' })
export class MerchandiseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);

  async getMerchandiseItems(onlyActive = true): Promise<MerchandiseItem[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    let query = this.supabase.client
      .from('merchandise_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MerchandiseService] getMerchandiseItems error', error);
      return [];
    }
    return data || [];
  }

  async getAreaPacks(onlyActive = true): Promise<AreaPackDetail[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    let query = this.supabase.client
      .from('area_packs')
      .select(
        `
        *,
        items:area_pack_items(
          area_id,
          area:areas(id, name, slug)
        )
      `,
      )
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MerchandiseService] getAreaPacks error', error);
      return [];
    }

    return (data || []) as unknown as AreaPackDetail[];
  }

  async buyMerchandise(itemId: string, quantity = 1): Promise<void> {
    // This would typically invoke a Stripe checkout session Edge Function
    // For now, we'll just log it or provide a placeholder for implementation
    console.log(`[MerchandiseService] buying item ${itemId} x ${quantity}`);
    // await this.supabase.client.functions.invoke('create-merch-checkout', { body: { itemId, quantity } });
  }

  async upsertMerchandiseItem(
    item: Partial<MerchandiseItem>,
  ): Promise<MerchandiseItem | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    this.loading.set(true);

    try {
      const { data, error } = await this.supabase.client
        .from('merchandise_items')
        .upsert(item as MerchandiseItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (e) {
      console.error('[MerchandiseService] upsertMerchandiseItem error', e);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async upsertAreaPack(pack: Partial<AreaPackDetail>): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();
    this.loading.set(true);

    try {
      // 1. Upsert the pack itself
      const packToSave = { ...pack };
      delete (packToSave as Partial<AreaPackDetail>).items; // Don't save joints here

      const { data: savedPack, error: packError } = await this.supabase.client
        .from('area_packs')
        .upsert(packToSave as AreaPackDetail)
        .select()
        .single();

      if (packError) throw packError;

      // 2. If it has items, sync area_pack_items
      if (pack.items) {
        // Delete existing items for this pack
        await this.supabase.client
          .from('area_pack_items')
          .delete()
          .eq('pack_id', savedPack.id);

        // Insert new ones
        const joints = pack.items.map((i) => ({
          pack_id: savedPack.id,
          area_id: i.area_id,
        }));

        const { error: jointsError } = await this.supabase.client
          .from('area_pack_items')
          .insert(joints);

        if (jointsError) throw jointsError;
      }

      return true;
    } catch (e) {
      console.error('[MerchandiseService] upsertAreaPack error', e);
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async uploadShopImage(file: File): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `shop/${fileName}`;

    const { data, error } = await this.supabase.client.storage
      .from('merchandise') // Assumption: bucket name is 'merchandise'
      .upload(filePath, file);

    if (error) {
      console.error('[MerchandiseService] uploadShopImage error', error);
      return null;
    }

    return this.supabase.getPublicUrl('merchandise', data.path);
  }
}
