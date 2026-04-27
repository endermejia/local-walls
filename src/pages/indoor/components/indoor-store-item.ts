import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiButton, TuiIcon } from '@taiga-ui/core';

export interface VoucherItem {
  id: string;
  name: string;
  price: number;
  sessions_count: number | null;
  duration_days: number | null;
}

@Component({
  selector: 'app-indoor-store-item',
  standalone: true,
  imports: [TranslatePipe, TuiButton, TuiIcon],
  template: `
    <div class="flex flex-col md:flex-row items-center justify-between p-4 rounded-2xl bg-(--tui-background-elevation-1) border border-(--tui-border-normal) gap-4">
      <div class="flex items-center gap-4 w-full md:w-auto">
        <div class="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          @if (voucher().sessions_count) {
            <tui-icon icon="@tui.ticket" class="text-2xl" />
          } @else {
            <tui-icon icon="@tui.calendar" class="text-2xl" />
          }
        </div>

        <div class="flex flex-col flex-1">
          <h3 class="text-lg font-bold">{{ voucher().name }}</h3>
          <span class="text-sm text-(--tui-text-secondary)">
            @if (voucher().sessions_count) {
              {{ voucher().sessions_count }} {{ 'sessions' | translate }}
            } @else if (voucher().duration_days) {
              {{ voucher().duration_days }} {{ 'days' | translate }}
            }
          </span>
        </div>
      </div>

      <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
        <div class="text-2xl font-black">
          {{ voucher().price | currency:'EUR' }}
        </div>

        <button
          tuiButton
          size="m"
          iconStart="@tui.shopping-cart"
          (click)="buy.emit(voucher())"
        >
          {{ 'buy' | translate }}
        </button>
      </div>
    </div>
  `,
})
export class IndoorStoreItemComponent {
  voucher = input.required<VoucherItem>();
  buy = output<VoucherItem>();
}
