import { Component, ChangeDetectionStrategy, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CurrencyPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon } from '@taiga-ui/core';

import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-indoor-admin-dashboard',
  standalone: true,
  imports: [TranslatePipe, TuiIcon, CurrencyPipe],
  template: `
    <div class="p-6 md:p-8 max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">{{ 'dashboard' | translate }}</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Stats Cards -->
        <div class="bg-(--tui-background-elevation-1) p-6 rounded-3xl border border-(--tui-border-normal)">
          <div class="flex items-center gap-4 mb-2 text-(--tui-text-secondary)">
            <tui-icon icon="@tui.users" />
            <span class="font-medium uppercase text-xs">{{ 'activeUsers' | translate }}</span>
          </div>
          <div class="text-4xl font-black">{{ stats().activeUsers || 0 }}</div>
        </div>

        <div class="bg-(--tui-background-elevation-1) p-6 rounded-3xl border border-(--tui-border-normal)">
          <div class="flex items-center gap-4 mb-2 text-(--tui-text-secondary)">
            <tui-icon icon="@tui.ticket" />
            <span class="font-medium uppercase text-xs">{{ 'vouchersSold' | translate }}</span>
          </div>
          <div class="text-4xl font-black">{{ stats().vouchersSold || 0 }}</div>
        </div>

        <div class="bg-(--tui-background-elevation-1) p-6 rounded-3xl border border-(--tui-border-normal)">
          <div class="flex items-center gap-4 mb-2 text-(--tui-text-secondary)">
            <tui-icon icon="@tui.banknote" />
            <span class="font-medium uppercase text-xs">{{ 'revenueThisMonth' | translate }}</span>
          </div>
          <div class="text-4xl font-black text-green-600 dark:text-green-400">
            {{ stats().revenue | currency:'EUR' }}
          </div>
        </div>

        <div class="bg-(--tui-background-elevation-1) p-6 rounded-3xl border border-(--tui-border-normal)">
          <div class="flex items-center gap-4 mb-2 text-(--tui-text-secondary)">
            <tui-icon icon="@tui.activity" />
            <span class="font-medium uppercase text-xs">{{ 'checkInsToday' | translate }}</span>
          </div>
          <div class="text-4xl font-black text-blue-600 dark:text-blue-400">
            {{ stats().checkIns || 0 }}
          </div>
        </div>
      </div>

      <!-- Placeholder for Charts or Recent Activity -->
      <div class="bg-(--tui-background-elevation-1) p-8 rounded-3xl border border-(--tui-border-normal) flex flex-col items-center justify-center min-h-64 text-center">
        <tui-icon icon="@tui.bar-chart-2" class="text-6xl text-(--tui-text-tertiary) mb-4" />
        <h3 class="text-xl font-bold mb-2">{{ 'activityOverview' | translate }}</h3>
        <p class="text-(--tui-text-secondary)">{{ 'comingSoon' | translate }}</p>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAdminDashboardComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  stats = signal({ activeUsers: 0, vouchersSold: 0, revenue: 0, checkIns: 0 });

  constructor() {
    effect(() => {
      // In a real implementation we would fetch these stats from the DB
      // using the center ID derived from the parent route slug
      if (isPlatformBrowser(this.platformId)) {
        this.loadMockStats();
      }
    });
  }

  private loadMockStats() {
    // Mock data for initial implementation
    this.stats.set({
      activeUsers: 142,
      vouchersSold: 85,
      revenue: 4250,
      checkIns: 38
    });
  }
}
