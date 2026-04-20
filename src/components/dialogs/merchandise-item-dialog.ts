import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TuiButton, TuiDialogContext, TuiIcon } from '@taiga-ui/core';

import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../services/cart.service';
import { GlobalData } from '../../services/global-data';

import { MerchandiseItem } from '../../models';

@Component({
  selector: 'app-merchandise-item-dialog',
  standalone: true,
  imports: [CommonModule, TranslatePipe, TuiButton, TuiIcon],
  template: `
    <div
      class="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-16 items-start"
    >
      <!-- Image Section -->
      <div
        class="relative aspect-square rounded-[2.5rem] overflow-hidden bg-(--tui-background-neutral-1) border border-(--tui-border-normal) md:sticky md:top-0"
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
                    <button
                      type="button"
                      (click)="selectedSize.set(size)"
                      class="h-11 min-w-14 px-4 flex items-center justify-center rounded-xl text-sm font-bold transition-all border"
                      [style.background]="
                        selectedSize() === size
                          ? 'var(--tui-background-accent-1)'
                          : 'var(--tui-background-neutral-1)'
                      "
                      [style.color]="
                        selectedSize() === size
                          ? 'var(--tui-background-base)'
                          : 'var(--tui-text-primary)'
                      "
                      [style.border-color]="
                        selectedSize() === size
                          ? 'var(--tui-background-accent-1)'
                          : 'var(--tui-border-normal)'
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
              (item.available_sizes?.length && !selectedSize()) ||
              (item.available_colors?.length && !selectedColor())
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
