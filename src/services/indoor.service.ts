import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { firstValueFrom } from 'rxjs';
import { GlobalData } from './global-data';
import { SupabaseService } from './supabase.service';
import { IndoorCenterFormComponent } from '../components/forms/indoor-center-form';
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
  private readonly global = inject(GlobalData);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  private readonly platformId = inject(PLATFORM_ID);
  loading = signal(false);

  async getAllCenters(): Promise<IndoorCenterDto[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as IndoorCenterDto[];
    } finally {
      this.loading.set(false);
    }
  }

  openIndoorCenterForm(data?: { centerData?: Partial<IndoorCenterDto> }): void {
    const isEdit = !!data?.centerData?.id;
    void firstValueFrom(
      this.dialogs.open<string | boolean | null>(
        new PolymorpheusComponent(IndoorCenterFormComponent),
        {
          label: this.translate.instant(
            isEdit ? 'indoor.editTitle' : 'indoor.newTitle',
          ),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    ).then((result) => {
      if (result) {
        this.global.indoorCentersResource.reload();
      }
    });
  }

  async createCenter(
    payload: Omit<IndoorCenterDto, 'id' | 'created_at'>,
  ): Promise<IndoorCenterDto | null> {
    const { data, error } = await this.supabase.client
      .from('indoor_centers')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return data as IndoorCenterDto;
  }

  async getCenterBySlug(slug: string): Promise<IndoorCenterDto | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
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
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
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
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
    const { data, error } = await this.supabase.client
      .from('indoor_routes')
      .select('*')
      .eq('center_id', centerId);

    if (error) throw error;
    return data || [];
  }

  async getCenterTopos(centerId: string): Promise<IndoorTopoDto[]> {
    if (!isPlatformBrowser(this.platformId)) return [];
    await this.supabase.whenReady();
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

  async uploadAsset(centerId: string, file: File): Promise<string | null> {
    if (!isPlatformBrowser(this.platformId)) return null;
    await this.supabase.whenReady();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `centers/${centerId}/${fileName}`;

    const { data, error } = await this.supabase.client.storage
      .from('indoor-assets')
      .upload(filePath, file);

    if (error) throw error;
    return data.path;
  }
}
