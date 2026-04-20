import {
  CommonModule,
  DecimalPipe,
  UpperCasePipe,
  DatePipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  resource,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TuiHeader } from '@taiga-ui/layout';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiLoader,
  TuiNotification,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { TuiTable } from '@taiga-ui/addon-table';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { MerchandiseService } from '../../services/merchandise.service';
import { OrderDetail, OrderStatus } from '../../models/merchandise.model';

@Component({
  selector: 'app-admin-shop-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    UpperCasePipe,
    DatePipe,
    TranslatePipe,
    TuiHeader,
    TuiTitle,
    TuiIcon,
    TuiButton,
    TuiLoader,
    TuiNotification,
    TuiTable,
    TuiSelect,
    TuiChevron,
    TuiDataList,
    TuiDataListWrapper,
    TuiAppearance,
    TuiDropdown,
    TuiTextfield,
  ],
  template: `
    <div class="p-4 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>{{ 'admin.orders.title' | translate }}</h1>
      </header>

      <tui-loader [overlay]="true" [loading]="ordersResource.isLoading()">
        @if (ordersResource.value(); as orders) {
          <table tuiTable [columns]="columns" class="w-full">
            <thead>
              <tr tuiThGroup>
                <th tuiTh *tuiHead="'id'">ID</th>
                <th tuiTh *tuiHead="'user'">{{ 'user' | translate }}</th>
                <th tuiTh *tuiHead="'total'">Total</th>
                <th tuiTh *tuiHead="'status'">{{ 'status' | translate }}</th>
                <th tuiTh *tuiHead="'date'">{{ 'date' | translate }}</th>
                <th tuiTh *tuiHead="'actions'">{{ 'actions' | translate }}</th>
              </tr>
            </thead>
            <tbody tuiTbody [data]="orders">
              @for (order of orders; track order.id) {
                <tr tuiTr>
                  <td tuiTd *tuiCell="'id'">
                    <span class="text-xs font-mono">{{
                      order.id.slice(0, 8)
                    }}</span>
                  </td>
                  <td tuiTd *tuiCell="'user'">
                    <div class="flex flex-col">
                      <span class="font-medium">{{ order.shipping_name }}</span>
                      <span class="text-xs text-(--tui-text-secondary)"
                        >{{ order.shipping_city }},
                        {{ order.shipping_country }}</span
                      >
                    </div>
                  </td>
                  <td tuiTd *tuiCell="'total'">
                    {{ order.total_amount | number: '1.2-2' }}
                    {{ order.currency | uppercase }}
                  </td>
                  <td tuiTd *tuiCell="'status'">
                    <tui-textfield
                      tuiChevron
                      class="max-w-[160px]"
                      [stringify]="stringifyStatus"
                    >
                      <input
                        tuiSelect
                        [ngModel]="order.status"
                        (ngModelChange)="onStatusChange(order.id, $event)"
                      />
                      <tui-data-list *tuiDropdown>
                        <tui-data-list-wrapper
                          new
                          [items]="statusOptions"
                          [itemContent]="statusItem"
                        />
                      </tui-data-list>
                      <ng-template #statusItem let-item>
                        {{ 'merchandising.order.status.' + item | translate }}
                      </ng-template>
                    </tui-textfield>
                  </td>
                  <td tuiTd *tuiCell="'date'">
                    {{ order.created_at | date: 'short' }}
                  </td>
                  <td tuiTd *tuiCell="'actions'">
                    <button
                      tuiIconButton
                      appearance="neutral"
                      size="s"
                      type="button"
                      class="rounded-full!"
                      (click)="viewDetails(order)"
                    >
                      <tui-icon icon="@tui.eye" />
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        } @else {
          <div class="p-12 text-center text-(--tui-text-secondary)">
            {{ 'merchandising.order.noOrders' | translate }}
          </div>
        }
      </tui-loader>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShopOrdersComponent {
  private readonly merchService = inject(MerchandiseService);
  private readonly translate = inject(TranslateService);

  readonly columns = ['id', 'user', 'total', 'status', 'date', 'actions'];
  readonly statusOptions: OrderStatus[] = [
    'pending',
    'en_proceso',
    'enviado',
    'recibido',
    'cancelled',
    'refunded',
  ];

  protected readonly stringifyStatus = (status: OrderStatus): string =>
    this.translate.instant('merchandising.order.status.' + status);

  readonly ordersResource = resource({
    loader: () => this.merchService.getAllOrders(),
  });

  async onStatusChange(orderId: string, status: OrderStatus): Promise<void> {
    const success = await this.merchService.updateOrderStatus(orderId, status);
    if (success) {
      void this.ordersResource.reload();
    }
  }

  viewDetails(order: OrderDetail): void {
    // TODO: Implement details dialog if needed
    console.log('Order Details:', order);
  }
}

export default AdminShopOrdersComponent;
