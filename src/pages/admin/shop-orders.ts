import {
  CommonModule,
  DatePipe,
  DecimalPipe,
  UpperCasePipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Injector,
  resource,
  signal,
} from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiHeader } from '@taiga-ui/layout';
import {
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiDropdown,
  TuiIcon,
  TuiLoader,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiDataListWrapper, TuiChevron } from '@taiga-ui/kit';
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

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { MerchandiseService } from '../../services/merchandise.service';
import { OrderDetail, OrderStatus } from '../../models/merchandise.model';
import { OrderDetailsDialogComponent } from '../../components/dialogs/order-details-dialog';

@Component({
  selector: 'app-admin-shop-orders',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    UpperCasePipe,
    DatePipe,
    TranslatePipe,
    TuiHeader,
    TuiTitle,
    TuiIcon,
    TuiButton,
    TuiLoader,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableHead,
    TuiTableCell,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdown,
    TuiChevron,
  ],
  template: `
    <div class="p-4 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <header tuiHeader>
        <h1 tuiTitle>{{ 'admin.orders.title' | translate }}</h1>
      </header>

      <tui-loader [overlay]="true" [loading]="ordersResource.isLoading()">
        @if (ordersResource.value(); as orders) {
          <table tuiTable [columns]="columns()" class="w-full">
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
                      @if (order.shipping_phone) {
                        <span class="text-xs text-(--tui-text-secondary)">{{
                          order.shipping_phone
                        }}</span>
                      }
                    </div>
                  </td>
                  <td tuiTd *tuiCell="'total'">
                    {{ order.total_amount | number: '1.2-2' }}
                    {{ order.currency | uppercase }}
                  </td>
                  <td tuiTd *tuiCell="'status'">
                    <button
                      tuiButton
                      tuiChevron
                      type="button"
                      size="xs"
                      class="rounded-md! px-2!"
                      [appearance]="getStatusAppearance(order.status)"
                      [tuiDropdown]="statusDropdown"
                      [tuiDropdownOpen]="openDropdownId() === order.id"
                      (click)="toggleDropdown(order.id)"
                    >
                      <span class="flex items-center gap-1">
                        <span
                          class="w-2 h-2 rounded-full"
                          [ngClass]="getStatusColor(order.status)"
                          style="background-color: currentColor;"
                        ></span>
                        <span
                          class="text-[10px] font-bold uppercase tracking-wider"
                        >
                          {{
                            'merchandising.order.status.' + order.status
                              | translate
                          }}
                        </span>
                      </span>
                    </button>

                    <ng-template #statusDropdown>
                      <tui-data-list>
                        @for (option of statusOptions; track option) {
                          <button
                            tuiOption
                            new
                            type="button"
                            (click)="onStatusChange(order.id, option)"
                          >
                            <div class="flex items-center gap-2">
                              <span
                                class="w-2 h-2 rounded-full"
                                [ngClass]="getStatusColor(option)"
                                style="background-color: currentColor;"
                              ></span>
                              <span class="text-xs uppercase font-medium">
                                {{
                                  'merchandising.order.status.' + option
                                    | translate
                                }}
                              </span>
                            </div>
                          </button>
                        }
                      </tui-data-list>
                    </ng-template>
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
  private readonly injector = inject(Injector);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly columns = signal([
    'id',
    'user',
    'total',
    'status',
    'date',
    'actions',
  ]);
  protected readonly openDropdownId = signal<string | null>(null);

  readonly statusOptions: OrderStatus[] = [
    'pending',
    'paid',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];

  protected readonly stringifyStatus = (status: OrderStatus): string =>
    this.translate.instant('merchandising.order.status.' + status);

  readonly ordersResource = resource({
    loader: () => this.merchService.getAllOrders(),
  });

  protected getStatusColor(status: OrderStatus | string | null): string {
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

  protected getStatusAppearance(status: OrderStatus | string | null): string {
    if (!status) return 'neutral';
    switch (status) {
      case 'pending':
        return 'warning';
      case 'paid':
        return 'primary';
      case 'shipped':
        return 'secondary';
      case 'delivered':
        return 'success';
      case 'cancelled':
      case 'refunded':
        return 'error';
      default:
        return 'neutral';
    }
  }

  async onStatusChange(orderId: string, status: OrderStatus): Promise<void> {
    this.openDropdownId.set(null);
    const success = await this.merchService.updateOrderStatus(orderId, status);
    if (success) {
      void this.ordersResource.reload();
    }
  }

  protected toggleDropdown(orderId: string): void {
    this.openDropdownId.set(this.openDropdownId() === orderId ? null : orderId);
  }

  viewDetails(order: OrderDetail): void {
    this.dialogs
      .open(
        new PolymorpheusComponent(OrderDetailsDialogComponent, this.injector),
        {
          data: order,
          label:
            this.translate.instant('merchandising.order.details') +
            ` #${order.id.slice(0, 8)}`,
          size: 'm',
        },
      )
      .subscribe();
  }
}

export default AdminShopOrdersComponent;
