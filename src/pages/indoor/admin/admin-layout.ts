import { Component, ChangeDetectionStrategy, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon } from '@taiga-ui/core';

import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-indoor-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, TuiIcon],
  template: `
    @if (loading()) {
      <div class="flex items-center justify-center p-8 h-full">
        <tui-icon icon="@tui.loader" class="text-4xl animate-spin text-(--tui-text-tertiary)" />
      </div>
    } @else if (center()) {
      <div class="flex flex-col md:flex-row h-full min-h-[calc(100vh-4rem)]">
        <!-- Sidebar Navigation -->
        <aside class="w-full md:w-64 shrink-0 bg-(--tui-background-elevation-1) border-r border-(--tui-border-normal) p-4 flex flex-col gap-2">
          <div class="mb-4 px-3">
            <h2 class="text-xl font-bold">{{ center().name }}</h2>
            <span class="text-xs font-bold uppercase text-(--tui-text-secondary)">{{ 'admin' | translate }}</span>
          </div>

          <a
            routerLink="dashboard"
            routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-(--tui-background-elevation-2) font-medium"
          >
            <tui-icon icon="@tui.layout-dashboard" class="text-lg" />
            {{ 'dashboard' | translate }}
          </a>

          <a
            routerLink="vouchers"
            routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-(--tui-background-elevation-2) font-medium"
          >
            <tui-icon icon="@tui.ticket" class="text-lg" />
            {{ 'vouchers' | translate }}
          </a>

          <a
            routerLink="users"
            routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-(--tui-background-elevation-2) font-medium"
          >
            <tui-icon icon="@tui.users" class="text-lg" />
            {{ 'users' | translate }}
          </a>

          <a
            routerLink="sales"
            routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-(--tui-background-elevation-2) font-medium"
          >
            <tui-icon icon="@tui.shopping-bag" class="text-lg" />
            {{ 'sales' | translate }}
          </a>

          <a
            routerLink="settings"
            routerLinkActive="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-(--tui-background-elevation-2) font-medium mt-auto"
          >
            <tui-icon icon="@tui.settings" class="text-lg" />
            {{ 'settings' | translate }}
          </a>

          <a
            [routerLink]="['/indoor', center().slug]"
            class="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors hover:bg-(--tui-background-elevation-2) font-medium text-(--tui-text-secondary)"
          >
            <tui-icon icon="@tui.arrow-left" class="text-lg" />
            {{ 'backToCenter' | translate }}
          </a>
        </aside>

        <!-- Main Content Area -->
        <main class="flex-1 bg-(--tui-background-base) overflow-y-auto">
          <router-outlet></router-outlet>
        </main>
      </div>
    } @else {
      <div class="flex items-center justify-center p-8">
        <p class="text-(--tui-text-secondary)">{{ 'centerNotFound' | translate }}</p>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAdminLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);

  loading = signal(true);
  center = signal<any>(null);

  constructor() {
    effect(() => {
      const slug = this.route.snapshot.paramMap.get('slug');
      if (slug && isPlatformBrowser(this.platformId)) {
        this.loadCenter(slug);
      } else {
        this.loading.set(false);
      }
    });
  }

  private async loadCenter(slug: string) {
    this.loading.set(true);
    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('indoor_centers')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data && !error) {
        this.center.set(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
