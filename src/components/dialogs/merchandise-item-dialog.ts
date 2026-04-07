import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import {
  TuiButton,
  TuiDialogContext,
  TuiIcon,
  TuiScrollbar,
} from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@ngx-translate/core';
import { MerchandiseItem } from '../../models';
import { CartService } from '../../services/cart.service';
import { GlobalData } from '../../services/global-data';

@Component({
  selector: 'app-merchandise-item-dialog',
  standalone: true,
  imports: [CommonModule, TuiButton, TuiIcon, TuiScrollbar, TranslatePipe],
  template: `
    <div class="flex flex-col gap-6 max-h-[75vh] min-h-0 overflow-hidden">
      <tui-scrollbar class="flex-1 min-h-0">
        <div class="flex flex-col gap-8 pb-4">
          <!-- Image Section -->
          <div
            class="relative aspect-square rounded-[2.5rem] overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-[var(--tui-border-normal)]"
          >
            @if (item.image_url) {
              <img
                [src]="item.image_url"
                [alt]="item.name"
                class="w-full h-full object-cover"
              />
            } @else {
              <div class="w-full h-full flex items-center justify-center">
                <tui-icon
                  icon="@tui.shirt"
                  class="text-8xl opacity-10 text-[var(--tui-text-tertiary)]"
                />
              </div>
            }
          </div>

          <!-- Selection Section -->
          <div class="flex flex-col gap-6">
            <div class="flex flex-col gap-1.5">
              <div class="flex justify-between items-baseline">
                <h2 class="text-3xl font-black tracking-tight">
                  {{ item.name }}
                </h2>
                <div class="text-2xl font-black text-primary tabular-nums">
                  {{ item.price | number: '1.2-2' }}€
                </div>
              </div>
              @if (item.category) {
                <span
                  class="text-xs font-bold uppercase tracking-[0.2em] text-[var(--tui-text-tertiary)]"
                >
                  {{
                    'merchandising.filter.' + item.category.toLowerCase()
                      | translate
                  }}
                </span>
              }
            </div>

            @if (item.description) {
              <p
                class="text-base text-[var(--tui-text-secondary)] leading-relaxed"
              >
                {{ item.description }}
              </p>
            }

            <div class="flex flex-col gap-6 pt-2">
              @if (item.available_sizes?.length) {
                <div class="flex flex-col gap-3">
                  <span
                    class="text-xs font-black uppercase tracking-widest text-[var(--tui-text-tertiary)]"
                  >
                    {{ 'merchandising.size' | translate }}
                  </span>
                  <div class="flex flex-wrap gap-2">
                    @for (size of item.available_sizes; track $index) {
                      <button
                        type="button"
                        (click)="selectedSize.set(size)"
                        class="h-11 min-w-[3.5rem] px-4 flex items-center justify-center rounded-xl text-sm font-bold transition-all border"
                        [class.bg-primary]="selectedSize() === size"
                        [class.text-white]="selectedSize() === size"
                        [class.border-primary]="selectedSize() === size"
                        [class.border-[var(--tui-border-normal)]]="
                          selectedSize() !== size
                        "
                        [class.bg-[var(--tui-background-neutral-1)]]="
                          selectedSize() !== size
                        "
                        [class.hover:border-primary]="selectedSize() !== size"
                      >
                        {{ size }}
                      </button>
                    }
                  </div>
                </div>
              }

              @if (item.available_colors?.length) {
                <div class="flex flex-col gap-3">
                  <span
                    class="text-xs font-black uppercase tracking-widest text-[var(--tui-text-tertiary)]"
                  >
                    {{ 'merchandising.color' | translate }}
                  </span>
                  <div class="flex flex-wrap gap-2">
                    @for (color of item.available_colors; track $index) {
                      <button
                        type="button"
                        (click)="selectedColor.set(color)"
                        class="h-11 min-w-[3.5rem] px-4 flex items-center justify-center rounded-xl text-sm font-bold transition-all border"
                        [class.bg-primary]="selectedColor() === color"
                        [class.text-white]="selectedColor() === color"
                        [class.border-primary]="selectedColor() === color"
                        [class.border-[var(--tui-border-normal)]]="
                          selectedColor() !== color
                        "
                        [class.bg-[var(--tui-background-neutral-1)]]="
                          selectedColor() !== color
                        "
                        [class.hover:border-primary]="selectedColor() !== color"
                      >
                        {{ color }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </tui-scrollbar>

      <!-- Fixed Buy Button -->
      <div
        class="flex flex-col gap-4 pt-4 border-t border-[var(--tui-border-normal)] flex-shrink-0"
      >
        <button
          tuiButton
          appearance="primary"
          size="l"
          type="button"
          class="w-full !rounded-2xl shadow-2xl shadow-primary/30 transform transition-all active:scale-[0.98]"
          (click)="addToCart()"
          [disabled]="
            (item.available_sizes?.length && !selectedSize()) ||
            (item.available_colors?.length && !selectedColor())
          "
        >
          <tui-icon icon="@tui.shopping-bag" />
          <span class="ml-3">{{ 'merchandising.buy' | translate }}</span>
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
export class MerchandiseItemDialogComponent {
  private readonly cartService = inject(CartService);
  private readonly global = inject(GlobalData);
  private readonly context =
    inject<TuiDialogContext<void, MerchandiseItem>>(POLYMORPHEUS_CONTEXT);

  protected readonly item = this.context.data as MerchandiseItem;

  protected readonly selectedSize = signal<string | undefined>(undefined);
  protected readonly selectedColor = signal<string | undefined>(undefined);

  async addToCart(): Promise<void> {
    await this.cartService.addItem({
      id: this.item.id,
      name: this.item.name,
      price: this.item.price,
      image_url: this.item.image_url,
      type: 'merchandise',
      selectedSize: this.selectedSize(),
      selectedColor: this.selectedColor(),
    });

    this.global.showCart.set(true);
    this.context.completeWith();
  }
}
