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

  async getMerchandiseItems(): Promise<MerchandiseItem[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
      .from('merchandise_items')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MerchandiseService] getMerchandiseItems error', error);
      return [];
    }
    return data || [];
  }

  async getAreaPacks(): Promise<AreaPackDetail[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
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

  async buyAreaPack(packId: string): Promise<void> {
    console.log(`[MerchandiseService] buying pack ${packId}`);
    // await this.supabase.client.functions.invoke('create-pack-checkout', { body: { packId } });
  }
}
