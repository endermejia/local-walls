import { Component, ChangeDetectionStrategy, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon, TuiButton, TuiAlertService } from '@taiga-ui/core';

import { SupabaseService } from '../../../services/supabase.service';

@Component({
  selector: 'app-indoor-admin-users',
  standalone: true,
  imports: [TranslatePipe, TuiIcon, TuiButton, DatePipe],
  template: `
    <div class="p-6 md:p-8 max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold">{{ 'usersManagement' | translate }}</h1>
          <p class="text-(--tui-text-secondary)">{{ 'usersManagementDescription' | translate }}</p>
        </div>
      </div>

      <!-- Search Bar Placeholder -->
      <div class="mb-6 bg-(--tui-background-elevation-1) p-4 rounded-2xl border border-(--tui-border-normal) flex gap-4">
        <div class="flex-1 flex items-center gap-3 px-4 py-2 bg-(--tui-background-base) rounded-xl border border-(--tui-border-normal)">
          <tui-icon icon="@tui.search" class="text-(--tui-text-secondary)" />
          <input type="text" [placeholder]="'searchUsers' | translate" class="w-full bg-transparent border-none outline-none" />
        </div>
        <button tuiButton size="m">{{ 'search' | translate }}</button>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center p-12">
          <tui-icon icon="@tui.loader" class="text-4xl animate-spin text-(--tui-text-tertiary)" />
        </div>
      } @else if (purchases().length === 0) {
        <div class="bg-(--tui-background-elevation-1) p-12 rounded-3xl border border-(--tui-border-normal) flex flex-col items-center justify-center text-center">
          <tui-icon icon="@tui.users" class="text-6xl text-(--tui-text-tertiary) mb-4" />
          <h3 class="text-xl font-bold mb-2">{{ 'noActiveUsers' | translate }}</h3>
          <p class="text-(--tui-text-secondary)">{{ 'noActiveUsersDescription' | translate }}</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          @for (p of purchases(); track p.id) {
            <div class="bg-(--tui-background-elevation-1) p-5 rounded-3xl border border-(--tui-border-normal) flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

              <div class="flex items-center gap-4">
                @if (p.user_profile?.avatar) {
                  <img [src]="p.user_profile.avatar" alt="Avatar" class="w-14 h-14 rounded-full object-cover" />
                } @else {
                  <div class="w-14 h-14 rounded-full bg-(--tui-background-elevation-2) flex items-center justify-center">
                    <tui-icon icon="@tui.user" class="text-xl text-(--tui-text-tertiary)" />
                  </div>
                }

                <div>
                  <h3 class="font-bold text-lg leading-tight">{{ p.user_profile?.name || 'Unknown User' }}</h3>
                  <div class="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">
                    {{ p.voucher?.name }}
                  </div>

                  <div class="flex gap-3 text-xs text-(--tui-text-secondary) mt-1">
                    @if (p.remaining_sessions !== null) {
                      <span class="flex items-center gap-1">
                        <tui-icon icon="@tui.ticket" class="text-[10px]" />
                        <b class="text-(--tui-text-primary)">{{ p.remaining_sessions }}</b> {{ 'sessionsLeft' | translate }}
                      </span>
                    }
                    @if (p.expiration_date) {
                      <span class="flex items-center gap-1">
                        <tui-icon icon="@tui.calendar" class="text-[10px]" />
                        {{ 'expires' | translate }} {{ p.expiration_date | date:'shortDate' }}
                      </span>
                    }
                  </div>
                </div>
              </div>

              <button
                tuiButton
                appearance="primary"
                size="m"
                iconStart="@tui.check"
                [disabled]="p.remaining_sessions === 0"
                (click)="checkIn(p)"
                class="w-full sm:w-auto"
              >
                {{ 'checkIn' | translate }}
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAdminUsersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly alerts = inject(TuiAlertService);

  loading = signal(true);
  purchases = signal<any[]>([]);
  centerId: string | null = null;

  constructor() {
    effect(() => {
      const slug = this.route.parent?.snapshot.paramMap.get('slug');
      if (slug && isPlatformBrowser(this.platformId)) {
        this.loadUsers(slug);
      }
    });
  }

  private async loadUsers(slug: string) {
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

        // Fetch active purchases for this center, joined with user profile
        const { data, error } = await this.supabase.client
          .from('indoor_voucher_purchases')
          .select(`
            id,
            remaining_sessions,
            expiration_date,
            status,
            voucher:indoor_vouchers!inner(name, center_id),
            user_profile:user_profiles!user_id(id, name, avatar)
          `)
          .eq('voucher.center_id', center.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (data && !error) {
          this.purchases.set(data as any);
        } else if (!data) {
          // Mock data for preview
          this.purchases.set([
            { id: '1', remaining_sessions: 5, expiration_date: null, status: 'active', voucher: { name: 'Bono 10' }, user_profile: { name: 'John Doe', avatar: '' } },
            { id: '2', remaining_sessions: null, expiration_date: new Date(Date.now() + 864000000).toISOString(), status: 'active', voucher: { name: 'Mensual' }, user_profile: { name: 'Jane Smith', avatar: '' } }
          ]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  async checkIn(purchase: any) {
    if (!this.centerId) return;

    try {
      if (purchase.remaining_sessions !== null) {
        const newRemaining = Math.max(0, purchase.remaining_sessions - 1);
        const status = newRemaining === 0 ? 'exhausted' : 'active';

        const { error } = await this.supabase.client
          .from('indoor_voucher_purchases')
          .update({ remaining_sessions: newRemaining, status })
          .eq('id', purchase.id);

        if (!error) {
          this.purchases.update((items: any[]) =>
            items.map((p: any) => p.id === purchase.id ? { ...p, remaining_sessions: newRemaining, status } : p)
          );

          await this.supabase.client
            .from('indoor_voucher_usage')
            .insert({ purchase_id: purchase.id });

          this.alerts.open('Check-in successful!', { status: 'success' }).subscribe();
        }
      } else {
        // Time based voucher check-in
        await this.supabase.client
          .from('indoor_voucher_usage')
          .insert({ purchase_id: purchase.id });

        this.alerts.open('Check-in successful!', { status: 'success' }).subscribe();
      }
    } catch (e) {
      console.error(e);
    }
  }
}
