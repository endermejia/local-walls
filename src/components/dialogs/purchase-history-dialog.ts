import { Component, inject, resource } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { TuiScrollbar, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';
import { TranslatePipe } from '@ngx-translate/core';
import { SupabaseService } from '../../services/supabase.service';
import { GlobalData } from '../../services/global-data';
import { Router } from '@angular/router';
import { TuiDialogContext } from '@taiga-ui/experimental';
import { injectContext } from '@taiga-ui/polymorpheus';

interface PurchaseRecord {
  id: string;
  amount: number;
  created_at: string;
  area_name: string;
  area_slug: string;
}

@Component({
  selector: 'app-purchase-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    CurrencyPipe,
    TuiScrollbar,
    TuiLoader,
    TranslatePipe,
    TuiIcon,
    TuiHeader,
  ],
  template: `
    <div class="flex flex-col gap-0 max-h-[80dvh] -m-4">
      <header
        tuiHeader
        class="px-4 py-3 border-b border-[var(--tui-border-normal)]"
      >
        <h2 tuiTitle>{{ 'purchaseHistory.title' | translate }}</h2>
      </header>

      <tui-scrollbar class="flex-1 !overflow-x-hidden">
        <div class="flex flex-col gap-1 p-2">
          @if (purchasesResource.isLoading()) {
            <div class="py-12 flex justify-center">
              <tui-loader />
            </div>
          } @else {
            @for (p of purchasesResource.value(); track p.id) {
              <button
                class="flex items-center justify-between p-4 rounded-2xl hover:bg-[var(--tui-background-neutral-hover)] transition-colors text-left w-full border-none bg-transparent cursor-pointer"
                (click)="navigateToArea(p.area_slug)"
              >
                <div class="flex flex-col gap-1 min-w-0">
                  <span class="font-bold text-base truncate">{{
                    p.area_name
                  }}</span>
                  <span class="text-xs opacity-60">
                    {{
                      p.created_at
                        | date: 'medium' : undefined : global.selectedLanguage()
                    }}
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-bold text-lg whitespace-nowrap">
                    {{
                      p.amount
                        | currency
                          : 'EUR'
                          : 'symbol'
                          : '1.2-2'
                          : global.selectedLanguage()
                    }}
                  </span>
                  <tui-icon icon="@tui.chevron-right" class="opacity-30" />
                </div>
              </button>
            } @empty {
              <div
                class="py-20 text-center flex flex-col items-center gap-3 opacity-30"
              >
                <tui-icon icon="@tui.shopping-bag" class="text-6xl" />
                <span class="font-medium text-lg">{{
                  'purchaseHistory.empty' | translate
                }}</span>
              </div>
            }
          }
        </div>
      </tui-scrollbar>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class PurchaseHistoryDialogComponent {
  protected readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  protected readonly context = injectContext<TuiDialogContext<void>>();

  protected readonly purchasesResource = resource({
    loader: async () => {
      const userId = this.supabase.authUserId();
      if (!userId) return [];

      const { data, error } = await this.supabase.client
        .from('area_purchases')
        .select(
          `
          id,
          amount,
          created_at,
          area:areas (
            name,
            slug
          )
        `,
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PurchaseHistory] Error fetching purchases:', error);
        return [];
      }

      return (data || []).map(
        (p: {
          id: string;
          amount: number;
          created_at: string | null;
          area: { name: string; slug: string } | null;
        }) => ({
          id: p.id,
          amount: p.amount,
          created_at: p.created_at || '',
          area_name: p.area?.name || 'Unknown',
          area_slug: p.area?.slug || '',
        }),
      ) as PurchaseRecord[];
    },
  });

  protected navigateToArea(slug: string): void {
    if (!slug) return;
    this.context.completeWith();
    void this.router.navigate(['/area', slug]);
  }
}
