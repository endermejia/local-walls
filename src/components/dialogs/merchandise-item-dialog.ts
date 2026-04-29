import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { injectContext } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDialogContext, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CustomCarouselComponent } from '../ui/custom-carousel';
import { CartService } from '../../services/cart.service';
import { GlobalData } from '../../services/global-data';

import { MerchandiseItemDetail } from '../../models';

@Component({
  selector: 'app-merchandise-item-dialog',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    TuiButton,
    CustomCarouselComponent,
    TuiIcon,
  ],
  template: `
    <div
      class="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-16 items-start"
    >
      <!-- Image Section -->
      <div
        class="relative aspect-square rounded-[2.5rem] overflow-hidden bg-(--tui-background-neutral-1) border border-(--tui-border-normal) md:sticky md:top-0"
      >
        @let images = item.image_urls || [];
        @if (images.length > 0) {
          @let carouselItems = getCarouselItems(images);
          <app-custom-carousel
            [items]="carouselItems"
            [(index)]="index"
            class="w-full h-full"
            [objectCover]="true"
          />
        } @else {
          <div class="w-full h-full flex items-center justify-center">
            <tui-icon
              icon="@tui.shirt"
              class="text-8xl opacity-10 text-(--tui-text-tertiary)"
            />
          </div>
        }
      </div>

      <div class="flex flex-col gap-8">
        <!-- Selection Section -->
        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-1.5">
            <div class="flex justify-between items-baseline">
              <h2 class="text-3xl font-black tracking-tight">
                {{ item.name }}
              </h2>
              <div
                class="text-2xl font-black text-(--tui-text-accent) tabular-nums"
              >
                {{ item.price | number: '1.2-2' }}€
              </div>
            </div>
            @if (item.category) {
              <span
                class="text-xs font-bold uppercase tracking-[0.2em] text-(--tui-text-tertiary)"
              >
                {{
                  'merchandising.filter.' + item.category.toLowerCase()
                    | translate
                }}
              </span>
            }
          </div>

          @if (item.description) {
            <p class="text-base text-(--tui-text-secondary) leading-relaxed">
              {{ item.description }}
            </p>
          }

          <div class="flex flex-col gap-6 pt-2">
            @if (item.available_sizes?.length) {
              <div class="flex flex-col gap-3">
                <span
                  class="text-xs font-black uppercase tracking-widest text-(--tui-text-tertiary)"
                >
                  {{ 'merchandising.size' | translate }}
                </span>
                <div class="flex flex-wrap gap-2">
                  @for (size of item.available_sizes; track $index) {
                    @let inStock = isSizeInStock(size);
                    <button
                      type="button"
                      (click)="inStock && selectedSize.set(size)"
                      class="h-11 min-w-14 px-4 flex flex-col items-center justify-center rounded-xl transition-all border relative overflow-hidden"
                      [style.background]="
                        selectedSize() === size
                          ? 'var(--tui-background-accent-1)'
                          : 'var(--tui-background-neutral-1)'
                      "
                      [style.color]="
                        selectedSize() === size
                          ? 'var(--tui-background-base)'
                          : inStock
                            ? 'var(--tui-text-primary)'
                            : 'var(--tui-text-tertiary)'
                      "
                      [style.border-color]="
                        selectedSize() === size
                          ? 'var(--tui-background-accent-1)'
                          : 'var(--tui-border-normal)'
                      "
                      [style.opacity]="inStock ? 1 : 0.5"
                      [class.cursor-not-allowed]="!inStock"
                      [class.hover:border-primary]="
                        selectedSize() !== size && inStock
                      "
                    >
                      <span class="text-sm font-bold">{{ size }}</span>
                      @if (!inStock) {
                        <span
                          class="text-[8px] uppercase font-black absolute bottom-1 leading-none opacity-50"
                        >
                          {{ 'merchandising.items.noStockShort' | translate }}
                        </span>
                      }
                    </button>
                  }
                </div>
              </div>
            }

            @if (item.available_colors?.length) {
              <div class="flex flex-col gap-3">
                <span
                  class="text-xs font-black uppercase tracking-widest text-(--tui-text-tertiary)"
                >
                  {{ 'merchandising.color' | translate }}
                </span>
                <div class="flex flex-wrap gap-2">
                  @for (color of item.available_colors; track $index) {
                    <button
                      type="button"
                      (click)="selectedColor.set(color)"
                      class="h-11 min-w-14 px-4 flex items-center justify-center rounded-xl text-sm font-bold transition-all border"
                      [style.background]="
                        selectedColor() === color
                          ? 'var(--tui-background-accent-1)'
                          : 'var(--tui-background-neutral-1)'
                      "
                      [style.color]="
                        selectedColor() === color
                          ? 'var(--tui-background-base)'
                          : 'var(--tui-text-primary)'
                      "
                      [style.border-color]="
                        selectedColor() === color
                          ? 'var(--tui-background-accent-1)'
                          : 'var(--tui-border-normal)'
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

        <!-- Buy Button -->
        <div class="pt-6 border-t border-(--tui-border-normal)">
          <button
            tuiButton
            appearance="primary"
            size="l"
            type="button"
            class="w-full rounded-2xl! shadow-2xl shadow-black/5 transform transition-all active:scale-[0.98]"
            (click)="addToCart()"
            [disabled]="
              (item.available_sizes?.length &&
                (!selectedSize() || !isSizeInStock(selectedSize()!))) ||
              (item.available_colors?.length && !selectedColor()) ||
              !canAddMore()
            "
          >
            <tui-icon icon="@tui.shopping-bag" />
            <span class="ml-3">{{ 'merchandising.buy' | translate }}</span>
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
export class MerchandiseItemDialogComponent {
  private readonly cartService = inject(CartService);
  private readonly global = inject(GlobalData);
  protected readonly context =
    injectContext<TuiDialogContext<void, MerchandiseItemDetail>>();
  protected readonly item: MerchandiseItemDetail = this.context.data;

  protected getCarouselItems(images: string[]) {
    return images.map((url) => ({
      type: 'image' as const,
      url,
      alt: this.item.name,
    }));
  }

  protected isSizeInStock(size: string): boolean {
    const stock = this.item.stock?.find((s) => s.size === size);
    return (stock?.stock ?? 0) > 0;
  }

  protected index = signal(0);
  protected readonly selectedSize = signal<string | undefined>(
    this.item.available_sizes?.length === 1
      ? this.item.available_sizes[0]
      : undefined,
  );
  protected readonly selectedColor = signal<string | undefined>(
    this.item.available_colors?.length === 1
      ? this.item.available_colors[0]
      : undefined,
  );

  private readonly stockForSelection = computed(() => {
    const size = this.selectedSize();
    if (!size || !this.item.stock?.length) return undefined;
    return this.item.stock.find((s) => s.size === size)?.stock ?? 0;
  });

  private readonly cartQtyForSelection = computed(() => {
    const size = this.selectedSize();
    const color = this.selectedColor();
    return (
      this.cartService
        .items()
        .find(
          (i) =>
            i.id === this.item.id &&
            i.type === 'merchandise' &&
            (i.selectedSize || undefined) === (size || undefined) &&
            (i.selectedColor || undefined) === (color || undefined),
        )?.quantity ?? 0
    );
  });

  protected readonly canAddMore = computed(() => {
    const max = this.stockForSelection();
    if (max === undefined) return true;
    return this.cartQtyForSelection() < max;
  });

  async addToCart(): Promise<void> {
    await this.cartService.addItem({
      id: this.item.id,
      name: this.item.name,
      price: this.item.price,
      image_urls: this.item.image_urls,
      type: 'merchandise',
      selectedSize: this.selectedSize(),
      selectedColor: this.selectedColor(),
      maxStock: this.stockForSelection(),
    });

    this.global.showCart.set(true);
    this.context.completeWith();
  }
}
