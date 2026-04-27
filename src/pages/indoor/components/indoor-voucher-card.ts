import { Component, input, computed } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiIcon } from '@taiga-ui/core';

export interface VoucherPurchaseItem {
  id: string;
  voucher: {
    name: string;
    sessions_count: number | null;
  };
  expiration_date: string | null;
  remaining_sessions: number | null;
  status: string | null;
}

@Component({
  selector: 'app-indoor-voucher-card',
  standalone: true,
  imports: [TranslatePipe, DatePipe, TuiIcon, NgClass],
  template: `
    <div
      class="flex flex-col p-5 rounded-3xl text-white shadow-lg relative overflow-hidden"
      [ngClass]="bgColorClass()"
    >
      <div class="absolute -right-6 -top-6 text-white/10">
        <tui-icon icon="@tui.ticket" class="text-9xl" />
      </div>

      <div class="relative z-10 flex justify-between items-start mb-6">
        <div>
          <h3 class="text-xl font-bold mb-1">{{ purchase().voucher?.name }}</h3>
          <span class="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 uppercase tracking-wider">
            {{ purchase().status | translate }}
          </span>
        </div>

        @if (purchase().remaining_sessions !== null) {
          <div class="flex flex-col items-end">
            <span class="text-3xl font-black leading-none">{{ purchase().remaining_sessions }}</span>
            <span class="text-xs uppercase font-bold opacity-80">{{ 'sessionsLeft' | translate }}</span>
          </div>
        }
      </div>

      <div class="relative z-10 flex justify-between items-end mt-auto pt-4 border-t border-white/20">
        @if (purchase().expiration_date) {
          <div class="flex flex-col">
            <span class="text-xs uppercase font-bold opacity-80">{{ 'expires' | translate }}</span>
            <span class="font-medium">{{ purchase().expiration_date | date:'mediumDate' }}</span>
          </div>
        } @else {
          <div class="flex flex-col">
            <span class="text-xs uppercase font-bold opacity-80">{{ 'expires' | translate }}</span>
            <span class="font-medium">{{ 'never' | translate }}</span>
          </div>
        }
      </div>
    </div>
  `,
})
export class IndoorVoucherCardComponent {
  purchase = input.required<VoucherPurchaseItem>();

  bgColorClass = computed(() => {
    const status = this.purchase().status;
    if (status === 'expired' || status === 'exhausted') return 'bg-gray-500';
    return 'bg-gradient-to-br from-blue-500 to-indigo-600';
  });
}
