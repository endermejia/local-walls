import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiBadge } from '@taiga-ui/kit';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';
import { AreaPackDetail } from '../../models';
import { CartService } from '../../services/cart.service';
import { GlobalData } from '../../services/global-data';

@Component({
  selector: 'app-merchandise-pack-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TuiButton,
    TuiIcon,
    TuiScrollbar,
    TranslatePipe,
    TuiBadge,
  ],
  template: `
    <div class="flex flex-col gap-6 max-h-[85vh] min-h-0 overflow-hidden">
      <tui-scrollbar class="flex-1 min-h-0">
        <div class="flex flex-col gap-8 pb-4 px-1">
          <!-- Image Section -->
          <div
            class="relative aspect-[16/9] sm:h-64 rounded-[2.5rem] overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-[var(--tui-border-normal)]"
          >
            @if (pack.image_url) {
              <img
                [src]="pack.image_url"
                [alt]="pack.name"
                class="w-full h-full object-cover"
              />
            } @else {
              <img
                src="/assets/images/area-pack-promo.png"
                [alt]="pack.name"
                class="w-full h-full object-cover"
              />
            }
            <div
              class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
            ></div>
          </div>

          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-2">
              <div class="flex justify-between items-start gap-4">
                <h2 class="text-3xl font-black tracking-tight flex-1">
                  {{ pack.name }}
                </h2>
                <div
                  class="text-2xl font-black text-primary tabular-nums whitespace-nowrap"
                >
                  {{ pack.price | number: '1.2-2' }}€
                </div>
              </div>
              <span
                class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--tui-text-tertiary)]"
              >
                {{ 'merchandising.filter.area_pack' | translate }}
              </span>
            </div>

            @if (pack.description) {
              <p
                class="text-base text-[var(--tui-text-secondary)] leading-relaxed"
              >
                {{ pack.description }}
              </p>
            }

            <div class="flex flex-col gap-4 pt-2">
              <span
                class="text-xs font-black uppercase tracking-widest text-[var(--tui-text-tertiary)]"
              >
                {{
                  'merchandising.packs.includes'
                    | translate: { count: pack.items.length }
                }}
              </span>
              <div class="flex flex-wrap gap-2">
                @for (item of pack.items; track item.area_id) {
                  <tui-badge
                    appearance="primary"
                    size="m"
                    class="font-semibold !rounded-xl"
                  >
                    {{ item.area.name }}
                  </tui-badge>
                }
              </div>
            </div>
          </div>
        </div>
      </tui-scrollbar>

      <div
        class="flex flex-col gap-4 pt-4 border-t border-[var(--tui-border-normal)] flex-shrink-0"
      >
        <button
          tuiButton
          appearance="primary"
          size="l"
          type="button"
          class="w-full !rounded-2xl shadow-xl shadow-primary/20 transform transition-all active:scale-[0.98]"
          (click)="addToCart()"
          [disabled]="isInCart()"
        >
          <tui-icon [icon]="isInCart() ? '@tui.check' : '@tui.shopping-bag'" />
          <span class="ml-3">{{
            (isInCart() ? 'merchandising.cart.alreadyIn' : 'merchandising.buy')
              | translate
          }}</span>
        </button>
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
  private readonly context =
    inject<TuiDialogContext<void, AreaPackDetail>>(POLYMORPHEUS_CONTEXT);

  protected readonly pack = this.context.data;

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
      type: 'area_pack',
    });

    this.global.showCart.set(true);
    this.context.completeWith();
  }
}
