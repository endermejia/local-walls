import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiButton,
  TuiIcon,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiBadge, TuiFilter, TuiSkeleton } from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { startWith } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

import { MerchandiseItem } from '../../models';
import { MerchandiseService } from '../../services/merchandise.service';
import { GlobalData } from '../../services/global-data';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-merchandising',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiFilter,
    TuiHeader,
    TuiIcon,
    TuiNotification,
    TuiScrollbar,
    TuiSkeleton,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <!-- 🛒 Floating Cart Button moved to navbar, but let's keep it here too if specifically requested, or just remove if navbar handles it -->
      <!-- Actually, user said the button is not visible, I added it to navbar, so I'll keep this one as a fallback for now or remove if redundant -->
      @if (false) {
        <button
          tuiIconButton
          type="button"
          appearance="accent"
          icon="@tui.shopping-cart"
          size="l"
          class="fixed bottom-8 right-8 z-[90] shadow-2xl !rounded-full transform transition-all hover:scale-110 active:scale-95"
          (click)="showNavbarCart()"
        >
          @if (cartItems() > 0) {
            <tui-badge
              size="s"
              appearance="primary"
              class="absolute -top-1 -right-1 border-2 border-white dark:border-zinc-900"
            >
              {{ cartItems() }}
            </tui-badge>
          }
        </button>
      }

      <!-- 🛍️ Cart Overlay is now in navbar component, so we don't need it here anymore -->

      <div
        class="flex flex-col gap-12 max-w-4xl mx-auto w-full pb-24 pt-10 px-4 md:px-8"
      >
        <!-- 🚀 Hero Page Header -->
        <header
          class="relative flex flex-col items-center text-center gap-6 py-12 px-6 rounded-[3rem] overflow-hidden border border-[var(--tui-border-normal)] shadow-2xl shadow-black/5"
          style="background: var(--tui-background-base)"
        >
          <!-- Subtle decorative elements -->
          <div
            class="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          ></div>
          <div
            class="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          ></div>

          <div class="relative flex flex-col items-center gap-4 text-center">
            <img
              src="logo/climbeast.svg"
              alt="ClimBeast Logo"
              class="h-16 sm:h-20 w-auto mb-2 opacity-90 drop-shadow-sm"
            />
            <h1
              class="text-4xl sm:text-5xl font-black tracking-tight text-balance leading-tight"
            >
              {{ 'merchandising.title' | translate }}
            </h1>
          </div>

          <p
            class="relative text-base sm:text-lg text-[var(--tui-text-secondary)] leading-relaxed max-w-2xl text-balance"
          >
            {{ 'merchandising.description' | translate }}
          </p>

          <tui-notification
            appearance="info"
            size="s"
            class="relative max-w-lg !rounded-2xl border-none bg-neutral-50 dark:bg-neutral-900 shadow-sm"
          >
            <span class="text-xs font-medium">
              {{ 'merchandising.croquisDisclaimer' | translate }}
            </span>
          </tui-notification>
        </header>

        <!-- ─── Area Packs ─── -->
        <section class="flex flex-col gap-6">
          <header tuiHeader>
            <h2 tuiTitle size="xl" class="font-black tracking-tight">
              {{ 'merchandising.packs.title' | translate }}
            </h2>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            @if (packsResource.isLoading()) {
              @for (_ of [1, 2]; track $index) {
                <div [tuiSkeleton]="true" class="h-56 rounded-[2rem]"></div>
              }
            } @else {
              @for (pack of packs(); track pack.id) {
                <article
                  class="group relative flex flex-col rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-black/5"
                  style="background: var(--tui-background-base); border: 1px solid var(--tui-border-normal);"
                >
                  <!-- Illustration / Image -->
                  <div
                    class="relative h-44 overflow-hidden bg-neutral-50 dark:bg-neutral-950"
                  >
                    <img
                      src="/assets/images/area-pack-promo.png"
                      [alt]="pack.name"
                      class="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-1000"
                    />

                    <div
                      class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
                    ></div>
                  </div>

                  <div class="flex flex-col p-7 gap-4">
                    <div class="flex justify-between items-start gap-4">
                      <h3
                        class="font-black text-xl leading-tight tracking-tight flex-1 text-balance"
                      >
                        {{ pack.name }}
                      </h3>
                      <div
                        class="text-2xl font-black text-primary tracking-tighter tabular-nums shrink-0"
                      >
                        {{ pack.price | number: '1.2-2' }}€
                      </div>
                    </div>

                    @if (pack.description) {
                      <p
                        class="text-sm text-[var(--tui-text-secondary)] leading-relaxed"
                      >
                        {{ pack.description }}
                      </p>
                    }

                    <!-- Area listing -->
                    <div class="flex flex-wrap gap-2 py-1">
                      @for (item of pack.items; track item.area_id) {
                        <tui-badge
                          appearance="neutral"
                          size="m"
                          class="font-semibold !rounded-lg opacity-80"
                        >
                          {{ item.area.name }}
                        </tui-badge>
                      }
                    </div>

                    <button
                      tuiButton
                      appearance="primary"
                      size="l"
                      type="button"
                      class="w-full mt-2 !rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                      (click)="buyPack(pack.id)"
                      [iconStart]="'@tui.hand-heart'"
                    >
                      {{ 'merchandising.buy' | translate }}
                    </button>
                  </div>
                </article>
              } @empty {
                <div
                  class="col-span-full py-20 text-center text-sm text-[var(--tui-text-tertiary)] rounded-[2rem]"
                  style="border: 2px dashed var(--tui-border-normal)"
                >
                  {{ 'merchandising.packs.empty' | translate }}
                </div>
              }
            }
          </div>
        </section>

        <!-- ─── Merch Items ─── -->
        <section class="flex flex-col gap-6">
          <header tuiHeader>
            <h2 tuiTitle size="xl" class="font-black tracking-tight">
              {{ 'merchandising.items.title' | translate }}
            </h2>
          </header>

          <!-- 🏷️ Translated Filter chips -->
          <div class="flex items-center gap-3">
            @if (
              !itemsResource.isLoading() && availableCategories().length > 0
            ) {
              <tui-filter
                size="l"
                [items]="availableCategories()"
                [formControl]="categoryControl"
              />
            }
          </div>

          <!-- Product Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            @if (itemsResource.isLoading()) {
              @for (_ of [1, 2, 3, 4]; track $index) {
                <div
                  [tuiSkeleton]="true"
                  class="aspect-square rounded-3xl"
                ></div>
              }
            } @else {
              @for (item of filteredItems(); track item.id) {
                <article class="flex flex-col gap-4 group cursor-pointer">
                  <div
                    class="relative aspect-square rounded-3xl overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1"
                    style="background: var(--tui-background-neutral-1)"
                  >
                    @if (item.image_url) {
                      <img
                        [src]="item.image_url"
                        [alt]="item.name"
                        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    } @else {
                      <div
                        class="w-full h-full flex items-center justify-center"
                      >
                        <tui-icon
                          icon="@tui.shirt"
                          class="text-[var(--tui-text-tertiary)] text-5xl opacity-20"
                        />
                      </div>
                    }

                    <!-- Hover overlay with buy button -->
                    <div
                      class="absolute inset-0 flex items-end justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style="background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 70%)"
                    >
                      <button
                        tuiButton
                        appearance="whiteblock"
                        size="s"
                        type="button"
                        class="translate-y-4 group-hover:translate-y-0 transition-transform duration-500 !rounded-xl shadow-2xl"
                        (click)="buyItem(item)"
                      >
                        <tui-icon icon="@tui.shopping-cart" />
                        <span class="ml-2">{{
                          'merchandising.buy' | translate
                        }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="flex flex-col px-1 gap-3">
                    <div class="flex flex-col gap-0.5">
                      <div class="flex justify-between items-baseline gap-2">
                        <span class="font-bold text-base truncate">{{
                          item.name
                        }}</span>
                        <span
                          class="text-base font-black shrink-0 text-primary"
                        >
                          {{ item.price | number: '1.2-2' }}€
                        </span>
                      </div>
                      @if (item.category) {
                        <span
                          class="text-xs font-medium uppercase tracking-wider text-[var(--tui-text-tertiary)]"
                        >
                          {{
                            'merchandising.filter.' +
                              item.category.toLowerCase() | translate
                          }}
                        </span>
                      }
                    </div>

                    <!-- 📐 Variation Selectors -->
                    <div class="flex flex-col gap-3 mt-1">
                      @if (item.available_sizes?.length) {
                        <div class="flex flex-col gap-1.5">
                          <span
                            class="text-[10px] font-black uppercase tracking-widest text-[var(--tui-text-tertiary)] ml-1"
                          >
                            {{ 'merchandising.size' | translate }}
                          </span>
                          <div class="flex flex-wrap gap-1.5">
                            @for (size of item.available_sizes; track $index) {
                              <button
                                type="button"
                                (click)="
                                  setSelection(item.id, 'size', size);
                                  $event.stopPropagation()
                                "
                                class="h-8 min-w-8 px-2 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all border"
                                [class.bg-primary]="
                                  getSelection(item.id).size === size
                                "
                                [class.text-white]="
                                  getSelection(item.id).size === size
                                "
                                [class.border-primary]="
                                  getSelection(item.id).size === size
                                "
                                [class.border-[var(--tui-border-normal)]]="
                                  getSelection(item.id).size !== size
                                "
                                [class.bg-[var(--tui-background-neutral-1)]]="
                                  getSelection(item.id).size !== size
                                "
                                [class.hover:border-primary]="
                                  getSelection(item.id).size !== size
                                "
                              >
                                {{ size }}
                              </button>
                            }
                          </div>
                        </div>
                      }

                      @if (item.available_colors?.length) {
                        <div class="flex flex-col gap-1.5">
                          <span
                            class="text-[10px] font-black uppercase tracking-widest text-[var(--tui-text-tertiary)] ml-1"
                          >
                            {{ 'merchandising.color' | translate }}
                          </span>
                          <div class="flex flex-wrap gap-1.5">
                            @for (
                              color of item.available_colors;
                              track $index
                            ) {
                              <button
                                type="button"
                                (click)="
                                  setSelection(item.id, 'color', color);
                                  $event.stopPropagation()
                                "
                                class="h-8 min-w-8 px-2 flex items-center justify-center rounded-lg text-[11px] font-bold transition-all border"
                                [class.bg-primary]="
                                  getSelection(item.id).color === color
                                "
                                [class.text-white]="
                                  getSelection(item.id).color === color
                                "
                                [class.border-primary]="
                                  getSelection(item.id).color === color
                                "
                                [class.border-[var(--tui-border-normal)]]="
                                  getSelection(item.id).color !== color
                                "
                                [class.bg-[var(--tui-background-neutral-1)]]="
                                  getSelection(item.id).color !== color
                                "
                                [class.hover:border-primary]="
                                  getSelection(item.id).color !== color
                                "
                              >
                                {{ color }}
                              </button>
                            }
                          </div>
                        </div>
                      }
                    </div>

                    <!-- Desktop Add to Cart (Visible on Hover or always on small screens) -->
                    <button
                      tuiButton
                      appearance="primary"
                      size="s"
                      type="button"
                      class="md:hidden mt-2 !rounded-xl"
                      (click)="buyItem(item)"
                    >
                      {{ 'merchandising.buy' | translate }}
                    </button>
                  </div>
                </article>
              } @empty {
                <div
                  class="col-span-full py-20 text-center text-sm text-[var(--tui-text-tertiary)] rounded-3xl"
                  style="border: 2px dashed var(--tui-border-normal)"
                >
                  {{ 'merchandising.items.empty' | translate }}
                </div>
              }
            }
          </div>
        </section>
      </div>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        min-height: 0;
      }
    `,
  ],
})
export class MerchandisingComponent {
  private readonly merchService = inject(MerchandiseService);
  protected readonly global = inject(GlobalData);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly itemsResource = resource({
    loader: () => this.merchService.getMerchandiseItems(),
  });

  protected readonly packsResource = resource({
    loader: () => this.merchService.getAreaPacks(),
  });

  protected readonly items = () => this.itemsResource.value() ?? [];
  protected readonly packs = () => this.packsResource.value() ?? [];

  /** FormControl for TuiFilter */
  protected readonly categoryControl = new FormControl<string[]>([], {
    nonNullable: true,
  });

  private readonly selectedCategoryLabels = toSignal(
    this.categoryControl.valueChanges.pipe(startWith([] as string[])),
    { initialValue: [] as string[] },
  );

  private readonly langChange = toSignal(
    this.translate.onLangChange.pipe(startWith(this.translate.currentLang)),
  );

  /**
   * Translated labels for the chips.
   * Derived from item categories.
   */
  protected readonly availableCategories = computed<string[]>(() => {
    this.langChange(); // React to language changes
    if (!isPlatformBrowser(this.platformId)) return [];

    const cats = new Set<string>();
    for (const item of this.items()) {
      if (item.category) {
        const key = `merchandising.filter.${item.category.toLowerCase()}`;
        const label = this.translate.instant(key);
        cats.add(label);
      }
    }
    return Array.from(cats).sort();
  });

  protected readonly filteredItems = computed(() => {
    this.langChange(); // React to language changes
    const products = this.items() ?? [];
    const selectedLabels = this.selectedCategoryLabels() ?? [];

    // If nothing selected → show all
    if (selectedLabels.length === 0) {
      return products;
    }

    return products.filter((item) => {
      if (!item.category) return false;
      const key = `merchandising.filter.${item.category.toLowerCase()}`;
      const label = this.translate.instant(key);
      return selectedLabels.includes(label);
    });
  });

  private readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  protected readonly cartItems = this.cartService.totalItems;
  protected readonly cartTotal = this.cartService.totalPrice;

  /** Size/Color selections for merchandise items */
  protected readonly selections = signal<
    Record<string, { size?: string; color?: string }>
  >({});

  protected getSelection(itemId: string): { size?: string; color?: string } {
    return this.selections()[itemId] || {};
  }

  protected setSelection(
    itemId: string,
    type: 'size' | 'color',
    value: string,
  ): void {
    this.selections.update((s) => ({
      ...s,
      [itemId]: {
        ...s[itemId],
        [type]: value,
      },
    }));
  }

  showNavbarCart(): void {
    const navbar = document.querySelector('app-navbar');
    if (navbar) {
      // We need to trigger the signal in NavbarComponent.
      // Since they share the same GlobalData, we could use that,
      // but showCart is in NavbarComponent.
      // For now, let's inject NavbarComponent if possible or use a service.
    }
  }

  async buyItem(item: MerchandiseItem): Promise<void> {
    const selection = this.getSelection(item.id);

    // Check if variations are selected if they are available
    if (
      item.available_sizes &&
      item.available_sizes.length > 0 &&
      !selection.size
    ) {
      this.global.setError('Please select a size');
      return;
    }
    if (
      item.available_colors &&
      item.available_colors.length > 0 &&
      !selection.color
    ) {
      this.global.setError('Please select a color');
      return;
    }

    await this.cartService.addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      type: 'merchandise',
      selectedSize: selection.size,
      selectedColor: selection.color,
    });

    this.global.showCart.set(true);
  }

  async buyPack(id: string): Promise<void> {
    const pack = this.packs().find((p) => p.id === id);
    if (!pack) return;

    this.cartService.addItem({
      id: pack.id,
      name: pack.name,
      price: pack.price,
      image_url: pack.image_url,
      type: 'area_pack',
    });

    this.global.showCart.set(true);
  }
}
