import { CommonModule, DecimalPipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiDialogContext } from '@taiga-ui/core';
import {
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableHead,
  TuiTableCell,
} from '@taiga-ui/addon-table';
import { TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { OrderDetail } from '../../models/merchandise.model';

@Component({
  selector: 'app-order-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    UpperCasePipe,
    TranslatePipe,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableHead,
    TuiTableCell,
    TuiIcon,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <div class="grid grid-cols-2 gap-4 text-sm">
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

      <table
        tuiTable
        [columns]="['product', 'qty', 'color', 'price']"
        class="w-full"
      >
        <thead>
          <tr tuiThGroup>
            <th tuiTh *tuiHead="'product'">
              {{ 'merchandising.order.product' | translate }}
            </th>
            <th tuiTh *tuiHead="'qty'">{{ 'quantity' | translate }}</th>
            <th tuiTh *tuiHead="'color'">
              {{ 'merchandising.size' | translate }} /
              {{ 'merchandising.color' | translate }}
            </th>
            <th tuiTh *tuiHead="'price'">{{ 'price' | translate }}</th>
          </tr>
        </thead>
        <tbody tuiTbody [data]="order.items">
          @for (item of order.items; track item.id) {
            <tr tuiTr>
              <td tuiTd *tuiCell="'product'">
                <span class="font-medium">{{
                  item.product_name || item.item_id
                }}</span>
              </td>
              <td tuiTd *tuiCell="'qty'">{{ item.quantity }}</td>
              <td tuiTd *tuiCell="'color'">
                @if (item.selected_size || item.selected_color) {
                  <div class="flex flex-col gap-0.5 text-xs">
                    @if (item.selected_size) {
                      <span>{{ item.selected_size }}</span>
                    }
                    @if (item.selected_color) {
                      <span class="opacity-60">{{ item.selected_color }}</span>
                    }
                  </div>
                } @else {
                  <span class="opacity-40">—</span>
                }
              </td>
              <td tuiTd *tuiCell="'price'">
                {{ item.unit_price | number: '1.2-2' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailsDialogComponent {
  protected readonly context =
    injectContext<TuiDialogContext<void, OrderDetail>>();
  protected readonly order = this.context.data;

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
