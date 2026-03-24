import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { TuiButton, TuiLoader, TuiAppearance } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SupabaseService } from '../../services/supabase.service';
import { handleErrorToast } from '../../utils';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-paywall',
  imports: [CommonModule, TuiButton, TuiLoader, TranslatePipe, TuiAppearance],
  template: `
    <div
      class="flex flex-col items-center justify-center p-4 rounded-3xl border-2 border-dashed border-[var(--tui-border-normal)] text-center gap-4 sm:gap-6"
      tuiAppearance="flat"
    >
      @if (!hideTitle()) {
        <h2 class="text-xl sm:text-2xl font-bold px-2">
          {{ 'payments.buyAreaTopos' | translate }}
        </h2>
      }

      <p class="opacity-70 text-xs sm:text-sm max-w-sm px-2 sm:px-4">
        {{ 'payments.paywall.footer' | translate }}
      </p>

      <div
        class="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full justify-center px-2 mt-1 sm:mt-2"
      >
        <div class="text-3xl sm:text-4xl font-black">
          {{ price() | number: '1.2-2' }} €
        </div>

        <tui-loader
          [showLoader]="loading()"
          [overlay]="true"
          class="w-full sm:w-auto"
        >
          <button
            tuiButton
            appearance="primary"
            size="l"
            class="px-8 w-full sm:w-auto"
            (click.zoneless)="buyNow()"
            [iconStart]="'@tui.shopping-bag'"
          >
            {{ 'payments.buy' | translate }}
          </button>
        </tui-loader>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaywallComponent {
  areaId = input.required<number>();
  price = input.required<number>();
  toposCount = input<number>(0);
  hideTitle = input(false);

  loading = signal(false);

  private readonly supabase = inject(SupabaseService);
  private readonly toast = inject(ToastService);

  async buyNow() {
    this.loading.set(true);
    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'stripe-checkout',
        {
          body: { area_id: this.areaId() },
        },
      );

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('[PaywallComponent] Error starting checkout:', e);
      handleErrorToast(e as Error, this.toast);
    } finally {
      this.loading.set(false);
    }
  }
}
