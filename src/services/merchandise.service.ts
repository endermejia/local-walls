import { inject, Injectable, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { SupabaseService } from './supabase.service';

import type {
  MerchandiseItem,
  AreaPackDetail,
  AreaPack,
  MerchandiseItemDetail,
  OrderDetail,
  OrderItem,
  OrderStatus,
} from '../models';

@Injectable({ providedIn: 'root' })
export class MerchandiseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);

  async getMerchandiseItems(
    onlyActive = true,
    includeStock = false,
  ): Promise<MerchandiseItemDetail[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    let query = this.supabase.client
      .from('merchandise_items')
      .select(includeStock ? '*, stock:merchandise_stock(*)' : '*')
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MerchandiseService] getMerchandiseItems error', error);
      return [];
    }
    return (data as unknown as MerchandiseItemDetail[]) || [];
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

  async upsertMerchandiseItem(
    item: Partial<MerchandiseItemDetail>,
  ): Promise<MerchandiseItem | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    this.loading.set(true);

    try {
      const itemToSave = { ...item };
      const stockToSave = itemToSave.stock;
      delete itemToSave.stock;

      const { data, error } = await this.supabase.client
        .from('merchandise_items')
        .upsert(itemToSave as MerchandiseItem)
        .select()
        .single();

      if (error) throw error;

      // Handle stock upsert if provided
      if (stockToSave && data) {
        for (const s of stockToSave) {
          await this.supabase.client.from('merchandise_stock').upsert(
            {
              item_id: data.id,
              size: s.size,
              stock: s.stock,
            },
            { onConflict: 'item_id,size' },
          );
        }
      }

      return data;
    } catch (e) {
      console.error('[MerchandiseService] upsertMerchandiseItem error', e);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  async updateItemStock(
    itemId: string,
    size: string,
    stock: number,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();

    const { error } = await this.supabase.client
      .from('merchandise_stock')
      .upsert({ item_id: itemId, size, stock }, { onConflict: 'item_id,size' });

    return !error;
  }

  async getUserOrders(): Promise<OrderDetail[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MerchandiseService] getUserOrders error', error);
      return [];
    }
    return data || [];
  }

  async getAllOrders(): Promise<OrderDetail[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();

    const { data, error } = await this.supabase.client
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[MerchandiseService] getAllOrders error', error);
      return [];
    }
    return data || [];
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    await this.supabase.whenReady();

    try {
      // 1. Get current order to check previous status and get items
      const { data: order, error: fetchError } = await this.supabase.client
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId)
        .single();

      if (fetchError || !order)
        throw fetchError || new Error('Order not found');

      const previousStatus = order.status;

      // 2. Update the status
      const { error: updateError } = await this.supabase.client
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // 3. Handle stock management
      // - If transitioning TO 'cancelled' from a state that had already decremented stock
      if (
        status === 'cancelled' &&
        previousStatus !== 'cancelled' &&
        previousStatus !== 'pending'
      ) {
        await this.adjustStockForOrder(order.items, 'increment');
      }
      // - If transitioning FROM 'pending' to something else (except cancelled)
      // Assuming stock was NOT decremented on 'pending' to avoid locking it for unpaid orders
      else if (
        previousStatus === 'pending' &&
        status !== 'pending' &&
        status !== 'cancelled'
      ) {
        await this.adjustStockForOrder(order.items, 'decrement');
      }
      // - If transitioning FROM 'cancelled' to an active state
      else if (
        previousStatus === 'cancelled' &&
        status !== 'pending' &&
        status !== 'cancelled'
      ) {
        await this.adjustStockForOrder(order.items, 'decrement');
      }

      return true;
    } catch (error) {
      console.error('[MerchandiseService] updateOrderStatus error', error);
      return false;
    }
  }

  private async adjustStockForOrder(
    items: OrderItem[],
    action: 'increment' | 'decrement',
  ): Promise<void> {
    for (const item of items) {
      if (!item.item_id || !item.selected_size || !item.quantity) continue;

      // Get current stock
      const { data: stockData } = await this.supabase.client
        .from('merchandise_stock')
        .select('stock')
        .eq('item_id', item.item_id)
        .eq('size', item.selected_size)
        .single();

      if (stockData) {
        const newStock =
          action === 'increment'
            ? stockData.stock + item.quantity
            : Math.max(0, stockData.stock - item.quantity);

        await this.supabase.client
          .from('merchandise_stock')
          .update({ stock: newStock })
          .eq('item_id', item.item_id)
          .eq('size', item.selected_size);
      }
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    // User logic: only if status != 'enviado'
    return this.updateOrderStatus(orderId, 'cancelled');
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
        .upsert(packToSave as AreaPack)
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
