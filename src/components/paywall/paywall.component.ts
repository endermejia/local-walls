import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { TuiButton, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SupabaseService } from '../../services/supabase.service';
import { handleErrorToast } from '../../utils';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-paywall',
  imports: [CommonModule, TuiButton, TuiIcon, TuiLoader, TranslatePipe],
  template: `
    <div
      class="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-center gap-4"
    >
      <div class="flex items-center gap-4 w-full justify-center">
        <div class="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full shrink-0">
          <tui-icon
            icon="@tui.lock"
            class="text-blue-600 dark:text-blue-400 size-6"
          />
        </div>
        <h2 class="text-xl font-bold">
          {{ 'payments.buyAreaTopos' | translate }}
        </h2>
      </div>

      <p class="text-gray-500 text-sm max-w-sm px-4">
        {{ 'payments.paywall.footer' | translate }}
      </p>

      <div
        class="flex flex-wrap items-center gap-4 w-full max-w-sm justify-center px-4 mt-2"
      >
        <div class="text-3xl font-black">{{ price() | number: '1.2-2' }} €</div>

        <tui-loader [showLoader]="loading()" [overlay]="true">
          <button
            tuiButton
            appearance="primary"
            size="m"
            class="px-8"
            (click.zoneless)="buyNow()"
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
