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

import { TuiLoader } from '@taiga-ui/core';

import { IndoorService } from '../../services/indoor.service';
import { IndoorInventoryDto } from '../../models';

@Component({
  selector: 'app-indoor-inventory',
  standalone: true,
  imports: [CommonModule, TranslateModule, TuiLoader],
  template: `
    <div class="flex flex-col gap-6">
      @if (inventoryResource.isLoading()) {
        <div class="flex justify-center p-8">
          <tui-loader size="l"></tui-loader>
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-800">
                <th class="p-3 font-bold">{{ 'item' | translate }}</th>
                <th class="p-3 font-bold">{{ 'price' | translate }}</th>
                <th class="p-3 font-bold text-center">
                  {{ 'stock' | translate }}
                </th>
                <th class="p-3 font-bold text-right">
                  {{ 'actions' | translate }}
                </th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr
                  class="border-b border-neutral-100 dark:border-neutral-900 last:border-0"
                >
                  <td class="p-3">{{ item.item_name }}</td>
                  <td class="p-3">{{ item.price | currency: 'EUR' }}</td>
                  <td class="p-3 text-center">
                    <span
                      class="px-2 py-1 rounded-full text-xs font-bold"
                      [ngClass]="{
                        'bg-red-100 text-red-600': item.stock_quantity === 0,
                        'bg-yellow-100 text-yellow-600':
                          item.stock_quantity > 0 && item.stock_quantity < 5,
                        'bg-green-100 text-green-600': item.stock_quantity >= 5,
                      }"
                    >
                      {{ item.stock_quantity }}
                    </span>
                  </td>
                  <td class="p-3 text-right">
                    <!-- Actions would go here -->
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorInventoryComponent {
  centerId = input.required<string>();

  protected readonly indoor = inject(IndoorService);

  protected readonly items = computed<IndoorInventoryDto[]>(
    () => this.inventoryResource.value() || [],
  );

  protected readonly inventoryResource = resource<IndoorInventoryDto[], string>(
    {
      params: () => this.centerId(),
      loader: ({ params: id }) => this.indoor.getInventory(id),
    },
  );
}
