import { Component, ChangeDetectionStrategy, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CurrencyPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon, TuiButton, TuiAlertService } from '@taiga-ui/core';

import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-indoor-admin-vouchers',
  standalone: true,
  imports: [TranslatePipe, TuiIcon, TuiButton, CurrencyPipe],
  template: `
    <div class="p-6 md:p-8 max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold">{{ 'vouchersManagement' | translate }}</h1>
          <p class="text-(--tui-text-secondary)">{{ 'vouchersManagementDescription' | translate }}</p>
        </div>

        <button tuiButton size="m" iconStart="@tui.plus" (click)="openCreateModal()">
          {{ 'createVoucher' | translate }}
        </button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center p-12">
          <tui-icon icon="@tui.loader" class="text-4xl animate-spin text-(--tui-text-tertiary)" />
        </div>
      } @else if (vouchers().length === 0) {
        <div class="bg-(--tui-background-elevation-1) p-12 rounded-3xl border border-(--tui-border-normal) flex flex-col items-center justify-center text-center">
          <tui-icon icon="@tui.ticket" class="text-6xl text-(--tui-text-tertiary) mb-4" />
          <h3 class="text-xl font-bold mb-2">{{ 'noVouchers' | translate }}</h3>
          <p class="text-(--tui-text-secondary) mb-6">{{ 'noVouchersDescription' | translate }}</p>
          <button tuiButton appearance="secondary" (click)="openCreateModal()">
            {{ 'createVoucher' | translate }}
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (v of vouchers(); track v.id) {
            <div class="bg-(--tui-background-elevation-1) p-6 rounded-3xl border border-(--tui-border-normal) relative" [class.opacity-50]="!v.active">
              <div class="absolute top-4 right-4 flex gap-2">
                <button class="p-2 text-(--tui-text-secondary) hover:text-(--tui-text-primary) transition-colors rounded-full hover:bg-(--tui-background-elevation-2)">
                  <tui-icon icon="@tui.pencil" class="text-lg" />
                </button>
                <button
                  class="p-2 text-(--tui-text-secondary) hover:text-(--tui-text-primary) transition-colors rounded-full hover:bg-(--tui-background-elevation-2)"
                  (click)="toggleActive(v)"
                >
                  <tui-icon [icon]="v.active ? '@tui.eye-off' : '@tui.eye'" class="text-lg" />
                </button>
              </div>

              <div class="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                @if (v.sessions_count) {
                  <tui-icon icon="@tui.ticket" class="text-xl" />
                } @else {
                  <tui-icon icon="@tui.calendar" class="text-xl" />
                }
              </div>

              <h3 class="text-xl font-bold mb-1">{{ v.name }}</h3>

              <div class="text-(--tui-text-secondary) mb-4 text-sm font-medium">
                @if (v.sessions_count) {
                  {{ v.sessions_count }} {{ 'sessions' | translate }}
                } @else if (v.duration_days) {
                  {{ v.duration_days }} {{ 'days' | translate }}
                } @else {
                  {{ 'unlimited' | translate }}
                }
              </div>

              <div class="text-3xl font-black mt-auto pt-4 border-t border-(--tui-border-normal)">
                {{ v.price | currency:'EUR' }}
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAdminVouchersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly alerts = inject(TuiAlertService);

  loading = signal(true);
  vouchers = signal<any[]>([]);
  centerId: string | null = null;

  constructor() {
    effect(() => {
      // Get the parent route's slug param
      const slug = this.route.parent?.snapshot.paramMap.get('slug');
      if (slug && isPlatformBrowser(this.platformId)) {
        this.loadVouchers(slug);
      }
    });
  }

  private async loadVouchers(slug: string) {
    this.loading.set(true);
    try {
      await this.supabase.whenReady();

      // First get the center ID
      const { data: center } = await this.supabase.client
        .from('indoor_centers')
        .select('id')
        .eq('slug', slug)
        .single();

      if (center) {
        this.centerId = center.id;

        // Then get the vouchers
        const { data, error } = await this.supabase.client
          .from('indoor_vouchers')
          .select('*')
          .eq('center_id', center.id)
          .order('price', { ascending: true });

        if (data && !error) {
          this.vouchers.set(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  openCreateModal() {
    this.alerts.open('Create voucher modal (mock)', { status: 'info' }).subscribe();
  }

  async toggleActive(voucher: any) {
    if (!this.centerId) return;

    try {
      const newStatus = !voucher.active;
      const { error } = await this.supabase.client
        .from('indoor_vouchers')
        .update({ active: newStatus })
        .eq('id', voucher.id);

      if (!error) {
        this.vouchers.update((vouchers: any[]) =>
          vouchers.map((v: any) => v.id === voucher.id ? { ...v, active: newStatus } : v)
        );
      }
    } catch (e) {
      console.error(e);
    }
  }
}
