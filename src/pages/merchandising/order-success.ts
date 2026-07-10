import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';

import { TuiSkeleton } from '@taiga-ui/kit';
import {
  TuiButton,
  TuiIcon,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../services/cart.service';
import { CheckoutService } from '../../services/checkout.service';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiIcon,
    TuiNotification,
    TuiScrollbar,
    TuiSkeleton,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="max-w-2xl mx-auto w-full py-20 px-4 text-center">
        @if (orderResource.isLoading()) {
          <div tuiSkeleton class="h-64 w-full rounded-3xl"></div>
        } @else if (orderResource.value(); as order) {
          <div class="flex flex-col items-center gap-6">
            <div
              class="w-24 h-24 bg-(--tui-background-positive-neutral) text-(--tui-status-positive) rounded-full flex items-center justify-center mb-4"
            >
              <tui-icon icon="@tui.check" class="text-5xl"></tui-icon>
            </div>

            <h1 tuiTitle="l" class="text-4xl font-black">
              {{ 'merchandising.success.title' | translate }}
            </h1>

            <p class="text-(--tui-text-secondary) max-w-md mx-auto">
              {{ 'merchandising.success.description' | translate }}
              <span class="font-bold text-(--tui-text-primary)"
                >#{{ shortOrderId() }}</span
              >
            </p>

            <div
              class="w-full bg-(--tui-background-neutral-1) rounded-3xl p-8 mt-8 text-left border border-(--tui-border-normal)"
            >
              <h2 tuiTitle="m" class="mb-6!">
                {{ 'merchandising.success.summary' | translate }}
              </h2>

              <div class="flex flex-col gap-4">
                @for (item of order.items; track item.id) {
                  <div class="flex justify-between items-start text-sm">
                    <div class="flex flex-col gap-0.5">
                      <span class="text-(--tui-text-secondary)"
                        >{{ item.quantity || 1 }}x Item ID:
                        {{ item.item_id }}</span
                      >
                      @if (item.selected_size || item.selected_color) {
                        <div
                          class="flex gap-2 text-[10px] font-bold uppercase opacity-60"
                        >
                          @if (item.selected_size) {
                            <span>{{ item.selected_size }}</span>
                          }
                          @if (item.selected_color) {
                            <span>{{ item.selected_color }}</span>
                          }
                        </div>
                      }
                    </div>
                    <span class="font-medium">{{
                      item.unit_price * (item.quantity || 1) | currency: 'EUR'
                    }}</span>
                  </div>
                }

                <div
                  class="pt-6 border-t border-(--tui-border-normal) flex justify-between items-center text-xl font-black mt-2"
                >
                  <span>{{ 'merchandising.success.total' | translate }}</span>
                  <span>{{ order.total_amount | currency: 'EUR' }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
              <button
                tuiButton
                appearance="primary"
                size="l"
                routerLink="/home"
              >
                {{ 'merchandising.success.backHome' | translate }}
              </button>
              <button
                tuiButton
                appearance="flat"
                size="l"
                routerLink="/merchandising"
              >
                {{ 'merchandising.success.continueShopping' | translate }}
              </button>
            </div>
          </div>
        } @else {
          <div tuiNotification status="error">
            {{ 'merchandising.success.notFound' | translate }}
          </div>
          <button
            tuiButton
            appearance="flat"
            size="l"
            class="mt-8"
            routerLink="/merchandising"
          >
            {{ 'merchandising.success.backToShop' | translate }}
          </button>
        }
      </div>
    </tui-scrollbar>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderSuccessComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly checkoutService = inject(CheckoutService);
  private readonly cart = inject(CartService);

  readonly orderResource = resource({
    params: () => this.route.snapshot.queryParamMap.get('session_id'),
    loader: async ({ params: sessionId }) => {
      if (!sessionId) return null;
      const order = await this.checkoutService.verifyOrder(sessionId);
      if (order) {
        this.cart.clear(); // Clear cart after successful order
      }
      return order;
    },
  });

  protected readonly shortOrderId = computed(() => this.orderResource.value()?.id?.slice(0, 8));
}
