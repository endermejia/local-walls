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
      class="relative overflow-hidden flex flex-col items-center justify-center p-6 sm:p-10 rounded-[2rem] border border-[var(--tui-border-normal)] text-center gap-6 shadow-xl bg-[var(--tui-background-elevated)]"
    >
      <!-- Fondo decorativo sutil -->
      <div
        class="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
      ></div>
      <div
        class="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
      ></div>

      @if (!hideTitle()) {
        <h2
          class="relative text-2xl sm:text-3xl font-black tracking-tight text-balance"
        >
          {{ 'payments.buyAreaTopos' | translate }}
        </h2>
      }

      <div class="relative flex flex-col items-center gap-2">
        <div
          class="text-4xl sm:text-6xl font-black text-primary tracking-tighter tabular-nums"
        >
          {{ price() | number: '1.2-2' }}€
        </div>
        <p
          class="text-xs sm:text-sm font-medium opacity-60 uppercase tracking-widest"
        >
          {{ 'payments.price' | translate }}
        </p>
      </div>

      <div class="relative w-full max-w-xs space-y-4">
        <tui-loader [showLoader]="loading()" [overlay]="true">
          <button
            tuiButton
            appearance="primary"
            size="l"
            class="w-full !rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            (click.zoneless)="contributeNow()"
            [iconStart]="'@tui.hand-heart'"
          >
            {{ 'payments.buy' | translate }}
          </button>
        </tui-loader>

        <p class="text-[10px] sm:text-xs leading-relaxed opacity-50 px-4">
          {{ 'payments.paywall.footer' | translate }}
        </p>
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

  async contributeNow() {
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
