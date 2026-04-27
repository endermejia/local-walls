import { Component, ChangeDetectionStrategy, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon, TuiButton } from '@taiga-ui/core';

import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-indoor-admin-sales',
  standalone: true,
  imports: [TranslatePipe, TuiIcon, TuiButton, CurrencyPipe, DatePipe],
  template: `
    <div class="p-6 md:p-8 max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold">{{ 'salesAndAccounting' | translate }}</h1>
          <p class="text-(--tui-text-secondary)">{{ 'salesManagementDescription' | translate }}</p>
        </div>

        <button tuiButton size="m" iconStart="@tui.plus">
          {{ 'newSale' | translate }}
        </button>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div class="bg-(--tui-background-elevation-1) p-5 rounded-3xl border border-(--tui-border-normal)">
          <div class="text-sm font-medium text-(--tui-text-secondary) uppercase mb-1">{{ 'todaySales' | translate }}</div>
          <div class="text-3xl font-black text-green-600 dark:text-green-400">145.50 €</div>
        </div>
        <div class="bg-(--tui-background-elevation-1) p-5 rounded-3xl border border-(--tui-border-normal)">
          <div class="text-sm font-medium text-(--tui-text-secondary) uppercase mb-1">{{ 'thisWeekSales' | translate }}</div>
          <div class="text-3xl font-black text-green-600 dark:text-green-400">1,240.00 €</div>
        </div>
        <div class="bg-(--tui-background-elevation-1) p-5 rounded-3xl border border-(--tui-border-normal)">
          <div class="text-sm font-medium text-(--tui-text-secondary) uppercase mb-1">{{ 'thisMonthSales' | translate }}</div>
          <div class="text-3xl font-black text-green-600 dark:text-green-400">4,250.00 €</div>
        </div>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center p-12">
          <tui-icon icon="@tui.loader" class="text-4xl animate-spin text-(--tui-text-tertiary)" />
        </div>
      } @else if (sales().length === 0) {
        <div class="bg-(--tui-background-elevation-1) p-12 rounded-3xl border border-(--tui-border-normal) flex flex-col items-center justify-center text-center">
          <tui-icon icon="@tui.banknote" class="text-6xl text-(--tui-text-tertiary) mb-4" />
          <h3 class="text-xl font-bold mb-2">{{ 'noSalesYet' | translate }}</h3>
          <p class="text-(--tui-text-secondary)">{{ 'noSalesDescription' | translate }}</p>
        </div>
      } @else {
        <div class="bg-(--tui-background-elevation-1) rounded-3xl border border-(--tui-border-normal) overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-(--tui-background-elevation-2) border-b border-(--tui-border-normal)">
                  <th class="p-4 font-bold text-sm text-(--tui-text-secondary) uppercase tracking-wider">{{ 'date' | translate }}</th>
                  <th class="p-4 font-bold text-sm text-(--tui-text-secondary) uppercase tracking-wider">{{ 'item' | translate }}</th>
                  <th class="p-4 font-bold text-sm text-(--tui-text-secondary) uppercase tracking-wider">{{ 'category' | translate }}</th>
                  <th class="p-4 font-bold text-sm text-(--tui-text-secondary) uppercase tracking-wider">{{ 'paymentMethod' | translate }}</th>
                  <th class="p-4 font-bold text-sm text-(--tui-text-secondary) uppercase tracking-wider text-right">{{ 'amount' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (s of sales(); track s.id) {
                  <tr class="border-b border-(--tui-border-normal) last:border-0 hover:bg-(--tui-background-elevation-2) transition-colors">
                    <td class="p-4 text-sm">{{ s.created_at | date:'short' }}</td>
                    <td class="p-4 font-medium">{{ s.item_name }}</td>
                    <td class="p-4">
                      <span class="inline-flex px-2 py-1 rounded-md text-xs font-bold bg-(--tui-background-elevation-3)">
                        {{ s.category }}
                      </span>
                    </td>
                    <td class="p-4 text-sm text-(--tui-text-secondary)">{{ s.payment_method }}</td>
                    <td class="p-4 font-bold text-right text-green-600 dark:text-green-400">{{ s.amount | currency:'EUR' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAdminSalesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  loading = signal(true);
  sales = signal<any[]>([]);
  centerId: string | null = null;

  constructor() {
    effect(() => {
      // Get the parent route's slug param
      const slug = this.route.parent?.snapshot.paramMap.get('slug');
      if (slug && isPlatformBrowser(this.platformId)) {
        this.loadSales(slug);
      }
    });
  }

  private async loadSales(slug: string) {
    this.loading.set(true);
    try {
      await this.supabase.whenReady();

      const { data: center } = await this.supabase.client
        .from('indoor_centers')
        .select('id')
        .eq('slug', slug)
        .single();

      if (center) {
        this.centerId = center.id;

        const { data, error } = await this.supabase.client
          .from('indoor_sales')
          .select('*')
          .eq('center_id', center.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (data && !error) {
          this.sales.set(data);
        } else if (!data) {
          // Mock data for preview if no DB data
          this.sales.set([
            { id: '1', item_name: 'Bono 10 Sesiones', amount: 65.00, category: 'Vouchers', payment_method: 'Card', created_at: new Date().toISOString() },
            { id: '2', item_name: 'Entrada de Día', amount: 9.50, category: 'Day Pass', payment_method: 'Cash', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: '3', item_name: 'Magnesio Líquido', amount: 8.00, category: 'Store', payment_method: 'Card', created_at: new Date(Date.now() - 7200000).toISOString() }
          ]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
