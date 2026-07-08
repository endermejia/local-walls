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

import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiNumberFormat,
} from '@taiga-ui/core';
import { TuiAmountPipe } from '@taiga-ui/addon-commerce';

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
    TuiAmountPipe,
    TuiNumberFormat,
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
                class="p-5 rounded-[28px] flex flex-col justify-between relative overflow-hidden max-w-sm w-full mx-auto min-h-[145px]"
                tuiAppearance="accent"
              >
                <div class="flex justify-between items-start z-10 w-full">
                  <div class="flex flex-col text-left">
                    <span class="font-bold text-[17px] leading-tight">{{
                      getVoucherName(p)
                    }}</span>
                    <span class="text-xs text-white/80 mt-1">
                      {{ 'expires' | translate }}:
                      {{ p.expiration_date | date: 'shortDate' }}
                    </span>
                  </div>
                  <div class="flex flex-col items-end shrink-0">
                    <span class="text-2xl font-black leading-none">{{
                      p.remaining_sessions
                    }}</span>
                    <span
                      class="text-[10px] uppercase text-white/80 mt-1 font-semibold tracking-wider"
                      >{{ 'indoor.sessions' | translate }}</span
                    >
                  </div>
                </div>
                <button
                  tuiButton
                  size="s"
                  appearance="primary"
                  class="mt-3 rounded-xl! z-10 self-start"
                  (click)="onCheckIn(p.id)"
                >
                  Check-in
                </button>
                <!-- Watermark Wrapper -->
                <div
                  class="absolute -bottom-2 -right-2 pointer-events-none z-0 overflow-visible"
                >
                  <tui-icon
                    [icon]="
                      getVoucherKind(p) === 'subscription'
                        ? '@tui.id-card'
                        : '@tui.ticket'
                    "
                    class="text-white/12 rotate-[-15deg] block"
                    [style.fontSize.px]="120"
                  />
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Available to Buy -->
      @if (availableVouchers().length > 0) {
        <div class="flex flex-col gap-3">
          <div
            class="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto w-full"
          >
            @for (v of availableVouchers(); track v.id) {
              <div
                class="rounded-[28px] p-6 flex flex-col relative overflow-hidden max-w-sm w-full mx-auto min-h-[145px]"
                tuiAppearance="floating"
              >
                <!-- Top Row: Icon and Title -->
                <div class="flex items-center gap-2.5 z-10 w-full mb-2">
                  <tui-icon
                    [icon]="
                      v.kind === 'subscription' ? '@tui.id-card' : '@tui.ticket'
                    "
                    class="text-[var(--tui-primary)]! scale-110 shrink-0"
                    [style.fontSize.px]="22"
                  />
                  <span class="font-bold text-[17px] leading-tight">{{
                    v.name
                  }}</span>
                </div>

                <!-- Price and Subtitle Group (Centered) -->
                <div
                  class="flex flex-col items-center justify-center flex-1 z-10 py-1"
                >
                  <span
                    [tuiNumberFormat]="{ precision: 2, decimalMode: 'always' }"
                    class="text-[34px] font-extrabold text-[var(--tui-primary)]! tracking-tight leading-none"
                  >
                    {{ v.price | tuiAmount: 'EUR' : 'end' }}
                  </span>
                  <div
                    class="text-xs text-[var(--tui-text-secondary)] font-medium mt-2 text-center"
                  >
                    @if (v.description) {
                      <span>{{ v.description }}</span>
                    } @else if (v.duration_days) {
                      <span
                        >{{ v.duration_days }} {{ 'days' | translate }}</span
                      >
                    }
                  </div>
                </div>

                <!-- Watermark Wrapper -->
                <div
                  class="absolute -bottom-2 -right-2 pointer-events-none z-0 overflow-visible"
                >
                  <tui-icon
                    icon="@tui.ticket"
                    class="text-[var(--tui-primary)]! opacity-[0.04] rotate-[-15deg] block"
                    [style.fontSize.px]="120"
                  />
                </div>
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

  protected getVoucherKind(purchase: IndoorVoucherPurchaseDto): string {
    const p = purchase as IndoorVoucherPurchaseDto & {
      voucher?: { kind: string };
    };
    return p.voucher?.kind || 'pass';
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
