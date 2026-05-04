import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  IndoorCenterDto,
  IndoorVoucherDto,
  IndoorVoucherPurchaseDto,
  IndoorRouteDto,
  IndoorTopoDto,
  IndoorSaleDto,
  IndoorInventoryDto,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class IndoorService {
  private readonly supabase = inject(SupabaseService);
  loading = signal(false);

  async getCenterBySlug(slug: string): Promise<IndoorCenterDto | null> {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data as IndoorCenterDto | null;
    } finally {
      this.loading.set(false);
    }
  }

  async getCenterVouchers(centerId: string): Promise<IndoorVoucherDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_vouchers')
      .select('*')
      .eq('center_id', centerId)
      .eq('active', true);

    if (error) throw error;
    return data || [];
  }

  async getUserActiveVouchers(
    userId: string,
    centerId: string,
  ): Promise<IndoorVoucherPurchaseDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_voucher_purchases')
      .select('*, voucher:indoor_vouchers(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('indoor_vouchers.center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async getCenterRoutes(centerId: string): Promise<IndoorRouteDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_routes')
      .select('*')
      .eq('center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async getCenterTopos(centerId: string): Promise<IndoorTopoDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_topos')
      .select('*')
      .eq('center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async checkIn(purchaseId: string): Promise<boolean> {
    const { data: purchase, error: purchaseError } = await this.supabase.client
      .from('indoor_voucher_purchases')
      .select('remaining_sessions')
      .eq('id', purchaseId)
      .single();

    if (purchaseError) throw purchaseError;

    if (
      purchase.remaining_sessions !== null &&
      purchase.remaining_sessions <= 0
    ) {
      throw new Error('No sessions remaining');
    }

    const { error: usageError } = await this.supabase.client
      .from('indoor_voucher_usage')
      .insert({ purchase_id: purchaseId });

    if (usageError) throw usageError;

    if (purchase.remaining_sessions !== null) {
      const { error: updateError } = await this.supabase.client
        .from('indoor_voucher_purchases')
        .update({
          remaining_sessions: purchase.remaining_sessions - 1,
          status:
            purchase.remaining_sessions - 1 === 0 ? 'exhausted' : 'active',
        })
        .eq('id', purchaseId);

      if (updateError) throw updateError;
    }

    return true;
  }

  // Admin methods
  async updateCenter(
    centerId: string,
    updates: Partial<IndoorCenterDto>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('indoor_centers')
      .update(updates)
      .eq('id', centerId);

    if (error) throw error;
    return true;
  }

  async getSales(centerId: string): Promise<IndoorSaleDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_sales')
      .select('*')
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getInventory(centerId: string): Promise<IndoorInventoryDto[]> {
    const { data, error } = await this.supabase.client
      .from('indoor_inventory')
      .select('*')
      .eq('center_id', centerId);

    if (error) throw error;
    return data || [];
  }
}
