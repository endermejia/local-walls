import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { Router } from '@angular/router';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';
import {
  TuiScrollbar,
  TuiIcon,
  TuiLoader,
  TuiButton,
  TuiDialogService,
} from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { GlobalData } from '../../services/global-data';
import { SupabaseService } from '../../services/supabase.service';
import { MerchandiseService } from '../../services/merchandise.service';

interface PurchaseRecord {
  id: string;
  amount: number;
  created_at: string;
  name: string;
  type: 'area' | 'pack' | 'merchandise';
  status?: string;
  slug?: string;
}

@Component({
  selector: 'app-purchase-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    DatePipe,
    TranslatePipe,
    TuiHeader,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
    TuiButton,
  ],
  template: `
    <div class="flex flex-col gap-0 max-h-[85dvh] -m-4">
      <header tuiHeader class="px-4 py-3 border-b border-(--tui-border-normal)">
        <h2 tuiTitle>{{ 'purchaseHistory.title' | translate }}</h2>
      </header>

      <tui-scrollbar class="flex-1 overflow-x-hidden!">
        <div class="flex flex-col gap-1 p-2 pb-6">
          @if (purchasesResource.isLoading()) {
            <div class="py-12 flex justify-center">
              <tui-loader />
            </div>
          } @else {
            @for (p of purchasesResource.value(); track p.id) {
              <div
                class="flex flex-col gap-3 p-4 rounded-2xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) transition-colors"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-10 h-10 rounded-xl bg-(--tui-background-base) flex items-center justify-center border border-(--tui-border-normal)"
                    >
                      <tui-icon
                        [icon]="
                          p.type === 'area'
                            ? '@tui.map-pin'
                            : p.type === 'pack'
                              ? '@tui.layers'
                              : '@tui.shopping-bag'
                        "
                        class="text-(--tui-text-tertiary)"
                      />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="font-bold text-base truncate">{{
                        p.name
                      }}</span>
                      <span class="text-xs opacity-60">
                        {{
                          p.created_at
                            | date
                              : 'medium'
                              : undefined
                              : global.selectedLanguage()
                        }}
                      </span>
                    </div>
                  </div>
                  <div class="flex flex-col items-end gap-1">
                    <span class="font-bold text-lg">
                      {{
                        p.amount
                          | currency
                            : 'EUR'
                            : 'symbol'
                            : '1.2-2'
                            : global.selectedLanguage()
                      }}
                    </span>
                    @if (p.status) {
                      <span
                        class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        [ngClass]="{
                          'bg-yellow-500/20 text-yellow-600':
                            p.status === 'pending',
                          'bg-blue-500/20 text-blue-600':
                            p.status === 'en_proceso',
                          'bg-purple-500/20 text-purple-600':
                            p.status === 'enviado',
                          'bg-green-500/20 text-green-600':
                            p.status === 'recibido',
                          'bg-red-500/20 text-red-600':
                            p.status === 'cancelled',
                        }"
                      >
                        {{
                          'merchandising.order.status.' + p.status | translate
                        }}
                      </span>
                    }
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2 mt-1">
                  @if (p.slug) {
                    <button
                      tuiButton
                      appearance="flat"
                      size="s"
                      type="button"
                      class="rounded-xl!"
                      (click)="navigateToArea(p.slug)"
                    >
                      {{ 'view' | translate }}
                    </button>
                  }

                  @if (
                    p.type === 'merchandise' &&
                    p.status !== 'cancelled' &&
                    p.status !== 'enviado' &&
                    p.status !== 'recibido'
                  ) {
                    <button
                      tuiButton
                      appearance="action-destructive"
                      size="s"
                      type="button"
                      class="rounded-xl!"
                      (click)="cancelOrder(p.id)"
                    >
                      {{ 'merchandising.order.cancel' | translate }}
                    </button>
                  }
                </div>
              </div>
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
  private readonly merchService = inject(MerchandiseService);
  private readonly dialogService = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  protected readonly context = injectContext<TuiDialogContext<void>>();

  protected readonly purchasesResource = resource({
    loader: async () => {
      const userId = this.supabase.authUserId();
      if (!userId) return [];

      // Fetch all types of purchases in parallel
      const [areaPurchases, packPurchases, orders] = await Promise.all([
        this.supabase.client
          .from('area_purchases')
          .select('id, amount, created_at, area:areas (name, slug)')
          .eq('user_id', userId),
        this.supabase.client
          .from('area_pack_purchases')
          .select('id, amount, created_at, pack:area_packs (name)')
          .eq('user_id', userId),
        this.merchService.getUserOrders(),
      ]);

      const records: PurchaseRecord[] = [];

      // Process Area Purchases
      if (areaPurchases.data) {
        records.push(
          ...areaPurchases.data.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            created_at: p.created_at || '',
            name: p.area?.name || 'Unknown Area',
            type: 'area' as const,
            slug: p.area?.slug,
          })),
        );
      }

      // Process Pack Purchases
      if (packPurchases.data) {
        records.push(
          ...packPurchases.data.map((p: any) => ({
            id: p.id,
            amount: p.amount,
            created_at: p.created_at || '',
            name: p.pack?.name || 'Unknown Pack',
            type: 'pack' as const,
          })),
        );
      }

      // Process Merchandise Orders
      if (orders) {
        records.push(
          ...orders.map((o) => ({
            id: o.id,
            amount: Number(o.total_amount),
            created_at: o.created_at || '',
            name: `Pedido #${o.id.slice(0, 8)}`,
            type: 'merchandise' as const,
            status: o.status || undefined,
          })),
        );
      }

      // Sort by date descending
      return records.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  protected navigateToArea(slug: string): void {
    if (!slug) return;
    this.context.completeWith();
    void this.router.navigate(['/area', slug]);
  }

  async cancelOrder(orderId: string): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogService.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('merchandising.order.cancelTitle'),
        size: 's',
        data: {
          content: this.translate.instant('merchandising.order.cancelConfirm'),
          yes: this.translate.instant('merchandising.order.cancelYes'),
          no: this.translate.instant('merchandising.order.cancelNo'),
        },
      }),
    );

    if (confirmed) {
      const success = await this.merchService.cancelOrder(orderId);
      if (success) {
        void this.purchasesResource.reload();
      }
    }
  }
}
