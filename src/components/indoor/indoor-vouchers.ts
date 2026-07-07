import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  resource,
  computed,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TuiAppearance, TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';

import { GlobalData } from '../../services/global-data';
import { IndoorService } from '../../services/indoor.service';
import { IndoorVoucherDto, IndoorVoucherPurchaseDto } from '../../models';

@Component({
  selector: 'app-indoor-vouchers',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    TuiAppearance,
    TuiButton,
    TuiIcon,
    TuiLoader,
  ],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Active Vouchers -->
      @if (activeVouchers().length > 0) {
        <div class="flex flex-col gap-3">
          <h3 class="font-bold text-lg">
            {{ 'indoor.active_vouchers' | translate }}
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (p of activeVouchers(); track p.id) {
              <div
                class="p-4 rounded-3xl flex flex-col gap-2 relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md max-w-sm w-full mx-auto"
              >
                <div class="flex justify-between items-start z-10">
                  <div class="flex flex-col">
                    <span class="font-bold">{{ getVoucherName(p) }}</span>
                    <span class="text-xs text-white/80">
                      {{ 'expires' | translate }}:
                      {{ p.expiration_date | date: 'shortDate' }}
                    </span>
                  </div>
                  <div class="flex flex-col items-end">
                    <span class="text-xl font-black">{{
                      p.remaining_sessions
                    }}</span>
                    <span class="text-[10px] uppercase text-white/80">{{
                      'indoor.sessions' | translate
                    }}</span>
                  </div>
                </div>
                <button
                  tuiButton
                  size="s"
                  appearance="primary"
                  class="mt-2 rounded-xl! z-10 self-start"
                  (click)="onCheckIn(p.id)"
                >
                  Check-in
                </button>
                <tui-icon
                  icon="@tui.ticket"
                  class="absolute -bottom-4 -right-4 text-white/20 scale-150"
                  [style.fontSize.px]="120"
                />
              </div>
            }
          </div>
        </div>
      }

      <!-- Available to Buy -->
      @if (availableVouchers().length > 0) {
        <div class="flex flex-col gap-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @for (v of availableVouchers(); track v.id) {
              <div
                class="p-3 rounded-2xl flex flex-col relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md max-w-sm w-full mx-auto justify-center min-h-[90px]"
              >
                <div class="flex justify-between items-center z-10">
                  <div class="flex flex-col">
                    <span class="font-bold text-sm">{{ v.name }}</span>
                    @if (v.duration_days) {
                      <span class="text-xs text-white/80"
                        >{{ v.duration_days }} {{ 'days' | translate }}</span
                      >
                    }
                  </div>
                  <span class="text-lg font-black">{{
                    v.price | currency: 'EUR'
                  }}</span>
                </div>
                <tui-icon
                  icon="@tui.ticket"
                  class="absolute -bottom-2 -right-2 text-white/20 scale-[2]"
                  [style.fontSize.px]="80"
                />
              </div>
            }
          </div>
        </div>
      } @else if (availableVouchersResource.isLoading()) {
        <tui-loader />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IndoorVouchersComponent {
  centerId = input.required<string>();

  protected readonly global = inject(GlobalData);
  protected readonly indoor = inject(IndoorService);

  protected readonly activeVouchers = computed<IndoorVoucherPurchaseDto[]>(
    () => this.activeVouchersResource.value() || [],
  );
  protected readonly availableVouchers = computed<IndoorVoucherDto[]>(
    () => this.availableVouchersResource.value() || [],
  );

  protected readonly availableVouchersResource = resource<
    IndoorVoucherDto[],
    string
  >({
    params: () => this.centerId(),
    loader: ({ params: id }) => this.indoor.getCenterVouchers(id),
  });

  protected readonly activeVouchersResource = resource<
    IndoorVoucherPurchaseDto[],
    { userId: string | undefined; centerId: string }
  >({
    params: () => ({
      userId: this.global.userProfile()?.id,
      centerId: this.centerId(),
    }),
    loader: ({
      params: { userId, centerId },
    }): Promise<IndoorVoucherPurchaseDto[]> => {
      if (!userId) return Promise.resolve([]);
      return this.indoor.getUserActiveVouchers(userId, centerId);
    },
  });

  protected getVoucherName(purchase: IndoorVoucherPurchaseDto): string {
    const p = purchase as IndoorVoucherPurchaseDto & {
      voucher?: { name: string };
    };
    return p.voucher?.name || '';
  }

  async onCheckIn(purchaseId: string) {
    try {
      await this.indoor.checkIn(purchaseId);
      void this.activeVouchersResource.reload();
    } catch (e) {
      console.error('Check-in error', e);
    }
  }
}
