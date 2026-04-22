import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Output,
  signal,
} from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiBadge } from '@taiga-ui/kit';
import {
  TuiButton,
  TuiDialogService,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../services/cart.service';
import { MerchandiseService } from '../../services/merchandise.service';
import { MerchandiseItemDialogComponent } from '../dialogs/merchandise-item-dialog';
import { MerchandisePackDialogComponent } from '../dialogs/merchandise-pack-dialog';
import { PurchaseHistoryDialogComponent } from '../dialogs/purchase-history-dialog';

import type { CartProduct } from '../../models';

@Component({
  selector: 'app-cart-overlay',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiIcon,
    TuiLoader,
    TuiScrollbar,
  ],
  template: `
    <div class="fixed inset-0 z-100 flex justify-end">
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm transition-opacity"
        role="button"
        tabindex="0"
        [attr.aria-label]="'close' | translate"
        (click)="closeOverlay.emit()"
        (keydown.enter)="closeOverlay.emit()"
        (keydown.space)="closeOverlay.emit()"
      ></div>

      <!-- Panel -->
      <div
        class="relative w-full max-w-md bg-(--tui-background-base) shadow-2xl flex flex-col h-full transform transition-transform duration-300 ease-out"
      >
        <div
          class="p-6 border-b border-(--tui-border-normal) flex items-center justify-between"
        >
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-black">
              {{ 'merchandising.cart.title' | translate }}
            </h2>
            <span tuiBadge size="m" appearance="accent">
              {{ totalItems() }}
            </span>
          </div>
          <button
            tuiIconButton
            type="button"
            appearance="flat"
            iconStart="@tui.x"
            size="s"
            (click)="closeOverlay.emit()"
          >
            {{ 'close' | translate }}
          </button>
        </div>

        <tui-scrollbar class="flex-1">
          <div class="p-6 flex flex-col gap-6">
            @if (items().length === 0) {
              <div
                class="flex flex-col items-center justify-center py-20 text-(--tui-text-tertiary)"
              >
                <tui-icon
                  icon="@tui.shopping-bag"
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
              @for (
                item of items();
                track item.id +
                  item.type +
                  item.selectedSize +
                  item.selectedColor
              ) {
                <div
                  class="flex gap-4 group animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  <button
                    type="button"
                    class="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-(--tui-border-normal) bg-(--tui-background-neutral-1) cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    (click)="openProduct(item)"
                  >
                    <tui-loader
                      [loading]="openingProductId() === item.id + item.type"
                      [overlay]="true"
                    >
                      @if (item.image_urls?.[0]) {
                        <img
                          [src]="item.image_urls![0]"
                          [alt]="item.name"
                          class="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                        />
                      } @else {
                        <div
                          class="w-full h-full flex items-center justify-center p-4"
                        >
                          <tui-icon
                            [icon]="
                              item.type === 'merchandise'
                                ? '@tui.shirt'
                                : '@tui.map'
                            "
                            class="text-3xl opacity-50 text-(--tui-text-secondary)"
                          />
                        </div>
                      }
                    </tui-loader>
                  </button>
                  <div class="flex-1 min-w-0 flex flex-col">
                    <div class="flex justify-between items-start gap-2">
                      <button
                        type="button"
                        class="font-black text-sm truncate text-(--tui-text-primary) text-left hover:underline focus:outline-none"
                        (click)="openProduct(item)"
                      >
                        {{ item.name }}
                      </button>
                      <button
                        tuiIconButton
                        type="button"
                        appearance="action-grayscale"
                        iconStart="@tui.trash-2"
                        size="xs"
                        (click)="
                          removeItem(
                            item.id,
                            item.type,
                            item.selectedSize,
                            item.selectedColor
                          )
                        "
                      >
                        {{ 'delete' | translate }}
                      </button>
                    </div>

                    <div class="flex flex-wrap gap-1.5 mt-1">
                      @if (item.selectedSize) {
                        <span
                          class="text-[9px] font-black bg-(--tui-background-neutral-2) px-2 py-0.5 rounded-full uppercase tracking-tighter text-(--tui-text-secondary)"
                        >
                          {{ 'merchandising.size' | translate }}:
                          {{ item.selectedSize }}
                        </span>
                      }
                      @if (item.selectedColor) {
                        <span
                          class="text-[9px] font-black bg-(--tui-background-neutral-2) px-2 py-0.5 rounded-full uppercase tracking-tighter text-(--tui-text-secondary)"
                        >
                          {{ 'merchandising.color' | translate }}:
                          {{ item.selectedColor }}
                        </span>
                      }
                    </div>
                    <div class="flex justify-between items-center mt-auto pt-4">
                      <div class="flex items-center gap-1">
                        @if (item.type !== 'area_pack') {
                          <button
                            tuiIconButton
                            type="button"
                            appearance="secondary"
                            size="xs"
                            [disabled]="item.quantity <= 1"
                            (click)="
                              updateQuantity(
                                item.id,
                                item.type,
                                item.quantity - 1,
                                item.selectedSize,
                                item.selectedColor
                              )
                            "
                          >
                            <tui-icon icon="@tui.minus" />
                            <span class="tui-sr-only">Decrease</span>
                          </button>
                          <span class="w-8 text-center font-bold text-sm">{{
                            item.quantity
                          }}</span>
                          <button
                            tuiIconButton
                            type="button"
                            appearance="secondary"
                            size="xs"
                            [disabled]="
                              item.maxStock !== undefined &&
                              item.quantity >= item.maxStock
                            "
                            (click)="
                              updateQuantity(
                                item.id,
                                item.type,
                                item.quantity + 1,
                                item.selectedSize,
                                item.selectedColor
                              )
                            "
                          >
                            <tui-icon icon="@tui.plus" />
                            <span class="tui-sr-only">Increase</span>
                          </button>
                        } @else {
                          <span
                            class="px-3 py-1 text-xs font-bold text-(--tui-text-tertiary)"
                          >
                            {{ item.quantity }}x
                          </span>
                        }
                      </div>
                      <span
                        class="font-black text-(--tui-text-primary) tabular-nums text-sm"
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

        <div
          class="p-6 border-t border-(--tui-border-normal) bg-(--tui-background-neutral-1) flex flex-col gap-3"
        >
          @if (items().length > 0) {
            <div class="flex justify-between items-center">
              <span class="text-(--tui-text-secondary)">{{
                'merchandising.cart.subtotal' | translate
              }}</span>
              <span class="text-2xl font-black text-(--tui-text-primary)">{{
                totalPrice() | currency: 'EUR'
              }}</span>
            </div>
            <button tuiButton class="w-full" size="l" (click)="checkout.emit()">
              {{ 'merchandising.cart.checkout' | translate }}
            </button>
          }
          <button
            tuiButton
            appearance="flat"
            size="s"
            class="w-full"
            (click)="openPurchaseHistory()"
          >
            <tui-icon icon="@tui.receipt" class="mr-1" />
            {{ 'purchaseHistory.view' | translate }}
          </button>
        </div>
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
  private readonly dialogs = inject(TuiDialogService);
  private readonly merchService = inject(MerchandiseService);

  @Output() closeOverlay = new EventEmitter<void>();
  @Output() checkout = new EventEmitter<void>();

  protected readonly items = this.cartService.items;
  protected readonly totalItems = this.cartService.totalItems;
  protected readonly totalPrice = this.cartService.totalPrice;
  protected readonly openingProductId = signal<string | null>(null);

  async openProduct(item: CartProduct): Promise<void> {
    if (this.openingProductId()) return;
    this.openingProductId.set(item.id + item.type);
    try {
      if (item.type === 'merchandise') {
        const product = await this.merchService.getMerchandiseItemById(item.id);
        if (product) {
          this.dialogs
            .open(new PolymorpheusComponent(MerchandiseItemDialogComponent), {
              data: product,
              label: product.name,
              size: 'l',
            })
            .subscribe();
        }
      } else if (item.type === 'area_pack') {
        const pack = await this.merchService.getAreaPackById(item.id);
        if (pack) {
          this.dialogs
            .open(new PolymorpheusComponent(MerchandisePackDialogComponent), {
              data: pack,
              label: pack.name,
              size: 'l',
            })
            .subscribe();
        }
      }
    } finally {
      this.openingProductId.set(null);
    }
  }

  protected openPurchaseHistory(): void {
    this.dialogs
      .open(new PolymorpheusComponent(PurchaseHistoryDialogComponent), {
        size: 'm',
      })
      .subscribe();
  }

  removeItem(
    id: string,
    type: CartProduct['type'],
    selectedSize?: string,
    selectedColor?: string,
  ): void {
    this.cartService.removeItem(id, type, selectedSize, selectedColor);
  }

  updateQuantity(
    id: string,
    type: CartProduct['type'],
    quantity: number,
    selectedSize?: string,
    selectedColor?: string,
  ): void {
    this.cartService.updateQuantity(
      id,
      type,
      quantity,
      selectedSize,
      selectedColor,
    );
  }
}
