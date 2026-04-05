import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
} from '@angular/core';
import { TuiButton, TuiIcon, TuiScrollbar, TuiTitle } from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { TranslatePipe } from '@ngx-translate/core';
import { CartService } from '../../services/cart.service';
import type { CartProduct } from '../../models';

@Component({
  selector: 'app-cart-overlay',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiScrollbar,
    TuiTitle,
    TuiBadge,
    TranslatePipe,
  ],
  template: `
    <div class="fixed inset-0 z-[100] flex justify-end">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        role="button"
        tabindex="0"
        [attr.aria-label]="'close' | translate"
        (click)="closeOverlay.emit()"
        (keydown.enter)="closeOverlay.emit()"
        (keydown.space)="closeOverlay.emit()"
      ></div>

      <!-- Panel -->
      <div
        class="relative w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-out"
      >
        <div
          class="p-6 border-b dark:border-zinc-800 flex items-center justify-between"
        >
          <h2 tuiTitle="m">
            {{ 'merchandising.cart.title' | translate }}
            <tui-badge size="s" appearance="primary" class="ml-2">{{
              totalItems()
            }}</tui-badge>
          </h2>
          <button
            tuiIconButton
            type="button"
            appearance="flat"
            icon="@tui.x"
            size="s"
            (click)="closeOverlay.emit()"
          >
            <span class="tui-sr-only">{{ 'close' | translate }}</span>
          </button>
        </div>

        <tui-scrollbar class="flex-1">
          <div class="p-6 flex flex-col gap-6">
            @if (items().length === 0) {
              <div
                class="flex flex-col items-center justify-center py-20 text-zinc-400"
              >
                <tui-icon
                  icon="@tui.shopping-cart"
                  class="text-6xl mb-4 opacity-20"
                ></tui-icon>
                <p>{{ 'merchandising.cart.empty' | translate }}</p>
                <button
                  tuiButton
                  appearance="flat"
                  size="m"
                  class="mt-4"
                  (click)="closeOverlay.emit()"
                >
                  {{ 'merchandising.success.continueShopping' | translate }}
                </button>
              </div>
            } @else {
              @for (item of items(); track item.id + item.type) {
                <div class="flex gap-4 group">
                  <div
                    class="w-20 h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0"
                  >
                    <img
                      [src]="item.image_url"
                      [alt]="item.name"
                      class="w-full h-full object-cover"
                    />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start">
                      <h3
                        class="font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                      >
                        {{ item.name }}
                      </h3>
                      <button
                        tuiIconButton
                        type="button"
                        appearance="flat"
                        icon="@tui.trash"
                        size="xs"
                        class="opacity-0 group-hover:opacity-100 transition-opacity"
                        (click)="removeItem(item.id, item.type)"
                      >
                        <span class="tui-sr-only">{{
                          'delete' | translate
                        }}</span>
                      </button>
                    </div>
                    <p class="text-xs text-zinc-500 mb-2 capitalize">
                      {{ item.type }}
                    </p>
                    <div class="flex justify-between items-center mt-auto">
                      <div class="flex items-center gap-1">
                        <button
                          tuiIconButton
                          type="button"
                          appearance="flat"
                          icon="@tui.minus"
                          size="xs"
                          [disabled]="item.quantity <= 1"
                          (click)="
                            updateQuantity(
                              item.id,
                              item.type,
                              item.quantity - 1
                            )
                          "
                        >
                          <span class="tui-sr-only">Decrease</span>
                        </button>
                        <span class="w-8 text-center text-sm font-medium">{{
                          item.quantity
                        }}</span>
                        <button
                          tuiIconButton
                          type="button"
                          appearance="flat"
                          icon="@tui.plus"
                          size="xs"
                          (click)="
                            updateQuantity(
                              item.id,
                              item.type,
                              item.quantity + 1
                            )
                          "
                        >
                          <span class="tui-sr-only">Increase</span>
                        </button>
                      </div>
                      <span
                        class="font-bold text-zinc-900 dark:text-zinc-100"
                        >{{
                          item.price * item.quantity | currency: 'EUR'
                        }}</span
                      >
                    </div>
                  </div>
                </div>
              }
            }
          </div>
        </tui-scrollbar>

        @if (items().length > 0) {
          <div
            class="p-6 border-t dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
          >
            <div class="flex justify-between items-center mb-6">
              <span class="text-zinc-500">{{
                'merchandising.cart.subtotal' | translate
              }}</span>
              <span
                class="text-2xl font-black text-zinc-900 dark:text-zinc-100"
                >{{ totalPrice() | currency: 'EUR' }}</span
              >
            </div>
            <button tuiButton class="w-full" size="l" (click)="checkout.emit()">
              {{ 'merchandising.cart.checkout' | translate }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartOverlayComponent {
  private readonly cartService = inject(CartService);

  @Output() closeOverlay = new EventEmitter<void>();
  @Output() checkout = new EventEmitter<void>();

  protected readonly items = this.cartService.items;
  protected readonly totalItems = this.cartService.totalItems;
  protected readonly totalPrice = this.cartService.totalPrice;

  removeItem(id: string, type: CartProduct['type']): void {
    this.cartService.removeItem(id, type);
  }

  updateQuantity(
    id: string,
    type: CartProduct['type'],
    quantity: number,
  ): void {
    this.cartService.updateQuantity(id, type, quantity);
  }
}
