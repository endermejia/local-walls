import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TuiAppearance, TuiLoader } from '@taiga-ui/core';

import { IndoorService } from '../../services/indoor.service';
import { IndoorSaleDto } from '../../models';

@Component({
  selector: 'app-indoor-accounting',
  standalone: true,
  imports: [CommonModule, TranslateModule, TuiAppearance, TuiLoader],
  template: `
    <div class="flex flex-col gap-6">
      @if (salesResource.value(); as sales) {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            tuiAppearance="flat-grayscale"
            class="p-4 rounded-3xl flex flex-col gap-1"
          >
            <span class="text-sm text-(--tui-text-secondary)">{{
              'indoor.accounting.total_sales' | translate
            }}</span>
            <span class="text-2xl font-bold">{{
              totalAmount() | currency: 'EUR'
            }}</span>
          </div>
          <div
            tuiAppearance="flat-grayscale"
            class="p-4 rounded-3xl flex flex-col gap-1"
          >
            <span class="text-sm text-(--tui-text-secondary)">{{
              'indoor.accounting.sales_count' | translate
            }}</span>
            <span class="text-2xl font-bold">{{ sales.length }}</span>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-800">
                <th class="p-3 font-bold">{{ 'date' | translate }}</th>
                <th class="p-3 font-bold">{{ 'item' | translate }}</th>
                <th class="p-3 font-bold">{{ 'category' | translate }}</th>
                <th class="p-3 font-bold text-right">
                  {{ 'amount' | translate }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (sale of sales; track sale.id) {
                <tr
                  class="border-b border-neutral-100 dark:border-neutral-900 last:border-0"
                >
                  <td class="p-3 text-sm">
                    {{ sale.created_at | date: 'short' }}
                  </td>
                  <td class="p-3">{{ sale.item_name }}</td>
                  <td class="p-3 text-sm opacity-70">{{ sale.category }}</td>
                  <td class="p-3 text-right font-bold">
                    {{ sale.amount | currency: 'EUR' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (salesResource.isLoading()) {
        <tui-loader />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorAccountingComponent {
  centerId = input.required<string>();

  protected readonly indoor = inject(IndoorService);

  protected readonly salesResource = resource({
    params: () => this.centerId(),
    loader: ({ params: id }): Promise<IndoorSaleDto[]> =>
      this.indoor.getSales(id),
  });

  protected readonly totalAmount = computed(() => {
    const sales = this.salesResource.value() || [];
    return sales.reduce((acc, s) => acc + Number(s.amount), 0);
  });
}
