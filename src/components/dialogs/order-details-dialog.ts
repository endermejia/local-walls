import { CommonModule, DecimalPipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { injectContext, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogContext, TuiDialogService } from '@taiga-ui/core';

import { TuiIcon } from '@taiga-ui/core';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import {
  AreaPackDetail,
  MerchandiseItemDetail,
  OrderDetail,
} from '../../models/merchandise.model';
import { MerchandiseItemDialogComponent } from './merchandise-item-dialog';
import { MerchandisePackDialogComponent } from './merchandise-pack-dialog';

@Component({
  selector: 'app-order-details-dialog',
  standalone: true,
  imports: [CommonModule, DecimalPipe, UpperCasePipe, TranslatePipe, TuiIcon],
  template: `
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div
          class="flex flex-col gap-1 p-3 rounded-xl bg-(--tui-background-neutral-1)"
        >
          <span class="font-bold opacity-60 uppercase text-[10px]">{{
            'merchandising.checkout.shippingInfo' | translate
          }}</span>
          <span class="font-medium">{{ order.shipping_name }}</span>
          <span>{{ order.shipping_address }}</span>
          <span>{{ order.shipping_zip }} {{ order.shipping_city }}</span>
          <span>{{ order.shipping_country }}</span>
          @if (order.shipping_phone) {
            <div class="mt-1 flex items-center gap-1.5 opacity-80">
              <tui-icon icon="@tui.phone" class="w-3 h-3" />
              <a
                [href]="'tel:' + order.shipping_phone"
                class="text-inherit hover:underline"
                >{{ order.shipping_phone }}</a
              >
            </div>
          }
        </div>
        <div
          class="flex flex-col gap-1 p-3 rounded-xl bg-(--tui-background-neutral-1)"
        >
          <div class="flex items-center justify-between mb-1">
            <span class="font-bold opacity-60 uppercase text-[10px]">{{
              'merchandising.order.summary' | translate
            }}</span>
            @if (order.status) {
              <span
                class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm border"
                [ngClass]="getStatusColor(order.status)"
              >
                {{ 'merchandising.order.status.' + order.status | translate }}
              </span>
            }
          </div>
          <div class="flex justify-between">
            <span>{{ 'merchandising.checkout.subtotal' | translate }}</span>
            <span class="font-mono"
              >{{ order.total_amount | number: '1.2-2' }}
              {{ order.currency | uppercase }}</span
            >
          </div>
          <div
            class="flex justify-between border-t border-(--tui-border-normal) pt-1 mt-1"
          >
            <span class="font-bold">{{
              'merchandising.checkout.total' | translate
            }}</span>
            <span class="font-bold font-mono"
              >{{ order.total_amount | number: '1.2-2' }}
              {{ order.currency | uppercase }}</span
            >
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4 mt-2">
        <h3 class="font-bold uppercase text-[10px] opacity-60 m-0">
          {{ 'merchandising.order.summary' | translate }}
        </h3>
        <div class="flex flex-col gap-3">
          @for (item of order.items; track item.id) {
            <div
              class="flex justify-between items-center gap-4 p-3 rounded-xl bg-(--tui-background-neutral-1) border border-(--tui-border-normal) cursor-pointer hover:bg-(--tui-background-neutral-2) transition-colors group"
              (click)="openItemDetail(item)"
            >
              <div class="flex items-center gap-3 flex-1 min-w-0">
                <!-- 📸 Item Image -->
                <div
                  class="w-12 h-12 rounded-lg bg-(--tui-background-neutral-2) flex items-center justify-center border border-(--tui-border-normal) overflow-hidden shrink-0"
                >
                  @if (item.product_image) {
                    <img
                      [src]="item.product_image"
                      [alt]="item.product_name"
                      class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  } @else {
                    <tui-icon
                      [icon]="
                        item.item_type === 'area'
                          ? '@tui.map'
                          : item.item_type === 'area_pack'
                            ? '@tui.package'
                            : '@tui.shopping-bag'
                      "
                      class="w-6 h-6 opacity-40"
                    />
                  }
                </div>

                <div class="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span
                    class="font-medium truncate text-sm"
                    [title]="item.product_name || item.item_id"
                  >
                    {{ item.product_name || item.item_id }}
                  </span>

                  @if (item.selected_size || item.selected_color) {
                    <div
                      class="flex items-center gap-2 text-[10px] text-(--tui-text-secondary)"
                    >
                      @if (item.selected_size) {
                        <span
                          class="bg-(--tui-background-neutral-2) px-1.5 py-0.5 rounded font-medium"
                        >
                          {{ item.selected_size }}
                        </span>
                      }
                      @if (item.selected_color) {
                        <span>{{ item.selected_color }}</span>
                      }
                    </div>
                  }
                </div>
              </div>

              <div class="flex flex-col items-end gap-1 shrink-0">
                <span class="font-bold whitespace-nowrap text-sm">
                  {{ item.unit_price | number: '1.2-2' }}
                  {{ order.currency | uppercase }}
                </span>
                <span class="text-[10px] text-(--tui-text-secondary)">
                  {{ 'quantity' | translate }}: {{ item.quantity }}
                </span>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, OrderDetail>>();
  protected readonly order = this.context.data;

  private readonly dialogService = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  protected openItemDetail(item: any): void {
    if (item.item_type === 'area' && item.product_slug) {
      this.context.completeWith();
      void this.router.navigate(['/area', item.product_slug]);
      return;
    }

    if (item.item_type === 'merchandise' && item.product_data) {
      this.dialogService
        .open(new PolymorpheusComponent(MerchandiseItemDialogComponent), {
          data: item.product_data as MerchandiseItemDetail,
          label: this.translate.instant(
            item.product_name || 'merchandising.items.title',
          ),
          size: 'l',
        })
        .subscribe();
    }

    if (item.item_type === 'area_pack' && item.product_data) {
      this.dialogService
        .open(new PolymorpheusComponent(MerchandisePackDialogComponent), {
          data: item.product_data as AreaPackDetail,
          label: item.product_name || 'merchandising.packs.title',
          size: 'l',
        })
        .subscribe();
    }
  }

  protected getStatusColor(status: string | null): string {
    if (!status) return 'text-gray-600 bg-gray-500/10 border-gray-500/20';
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20';
      case 'paid':
        return 'text-blue-600 bg-blue-500/10 border-blue-500/20';
      case 'shipped':
        return 'text-purple-600 bg-purple-500/10 border-purple-500/20';
      case 'delivered':
        return 'text-green-600 bg-green-500/10 border-green-500/20';
      case 'cancelled':
      case 'refunded':
        return 'text-red-600 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-600 bg-gray-500/10 border-gray-500/20';
    }
  }
}
