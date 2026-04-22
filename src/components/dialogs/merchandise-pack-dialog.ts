import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiBadge } from '@taiga-ui/kit';
import {
  TuiButton,
  TuiCarousel,
  TuiDialogContext,
  TuiIcon,
} from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../services/cart.service';
import { GlobalData } from '../../services/global-data';

import { AreaPackDetail } from '../../models';

@Component({
  selector: 'app-merchandise-pack-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiCarousel,
    TuiIcon,
  ],
  template: `
    <div
      class="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-16 items-start"
    >
      <!-- Image Section -->
      <div
        class="relative aspect-video sm:h-64 md:h-auto md:aspect-square rounded-[2.5rem] overflow-hidden bg-(--tui-background-neutral-1) border border-(--tui-border-normal) md:sticky md:top-0"
      >
        @let images =
          (pack.image_urls?.length
            ? pack.image_urls
            : pack.image_url
              ? [pack.image_url]
              : ['/assets/images/area-pack-promo.png']) || [];
        @if (images.length > 0) {
          <tui-carousel #carousel [(index)]="index" class="w-full h-full">
            <ng-template tuiItem let-i>
              @let n = images.length;
              <img
                [src]="images[((i % n) + n) % n]"
                [alt]="pack.name"
                class="w-full h-full object-cover"
              />
            </ng-template>
          </tui-carousel>
          @if (images.length > 1) {
            @let ni =
              ((index() % images.length) + images.length) % images.length;
            <button
              type="button"
              class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white hover:bg-black/70 transition-colors"
              (click)="carousel.prev()"
            >
              <tui-icon icon="@tui.chevron-left" class="text-sm" />
            </button>
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10 text-white hover:bg-black/70 transition-colors"
              (click)="carousel.next()"
            >
              <tui-icon icon="@tui.chevron-right" class="text-sm" />
            </button>
            <div
              class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1"
            >
              @for (_ of images; track $index; let i = $index) {
                <div
                  class="h-1.5 rounded-full bg-white transition-all duration-300"
                  [style.width.rem]="ni === i ? 1 : 0.375"
                  [style.opacity]="ni === i ? '1' : '0.45'"
                ></div>
              }
            </div>
          }
        }
        <div
          class="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent pointer-events-none"
        ></div>
      </div>

      <div class="flex flex-col gap-8">
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-2">
            <div class="flex justify-between items-start gap-4">
              <h2 class="text-3xl font-black tracking-tight flex-1">
                {{ pack.name }}
              </h2>
              <div
                class="text-2xl font-black text-(--tui-text-accent) tabular-nums whitespace-nowrap"
              >
                {{ pack.price | number: '1.2-2' }}€
              </div>
            </div>
            <span
              class="text-xs font-bold uppercase tracking-[0.2em] text-(--tui-text-tertiary)"
            >
              {{ 'merchandising.filter.area_pack' | translate }}
            </span>
          </div>

          @if (pack.description) {
            <p class="text-base text-(--tui-text-secondary) leading-relaxed">
              {{ pack.description }}
            </p>
          }

          <div class="flex flex-col gap-4 pt-2">
            <span
              class="text-xs font-black uppercase tracking-widest text-(--tui-text-tertiary)"
            >
              {{
                'merchandising.packs.includes'
                  | translate: { count: pack.items.length }
              }}
            </span>
            <div class="flex flex-wrap gap-2">
              @for (item of pack.items; track item.area_id) {
                <span
                  tuiBadge
                  appearance="primary"
                  size="m"
                  class="font-semibold rounded-xl!"
                >
                  {{ item.area.name }}
                </span>
              }
            </div>
          </div>
        </div>

        <div class="pt-6 border-t border-(--tui-border-normal)">
          <button
            tuiButton
            appearance="primary"
            size="l"
            type="button"
            class="w-full rounded-2xl! shadow-xl shadow-black/5 transform transition-all active:scale-[0.98]"
            (click)="addToCart()"
            [disabled]="isInCart()"
          >
            <tui-icon
              [icon]="isInCart() ? '@tui.check' : '@tui.shopping-bag'"
            />
            <span class="ml-3">{{
              (isInCart()
                ? 'merchandising.cart.alreadyIn'
                : 'merchandising.buy'
              ) | translate
            }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MerchandisePackDialogComponent {
  private readonly cartService = inject(CartService);
  private readonly global = inject(GlobalData);
  protected readonly context =
    injectContext<TuiDialogContext<void, AreaPackDetail>>();

  protected readonly index = signal(0);
  protected readonly pack: AreaPackDetail = this.context.data;

  protected readonly isInCart = computed(() =>
    this.cartService
      .items()
      .some((i) => i.id === this.pack.id && i.type === 'area_pack'),
  );

  async addToCart(): Promise<void> {
    if (this.isInCart()) return; // Should be disabled, but just as safety

    await this.cartService.addItem({
      id: this.pack.id,
      name: this.pack.name,
      price: this.pack.price,
      image_url: this.pack.image_url,
      image_urls: this.pack.image_urls,
      type: 'area_pack',
    });

    this.global.showCart.set(true);
    this.context.completeWith();
  }
}
