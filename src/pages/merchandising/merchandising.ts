import { CommonModule, DecimalPipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  resource,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiBadge,
  TuiFilter,
  TuiSkeleton,
  TuiBadgedContentComponent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { TuiDialogService } from '@taiga-ui/core';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { startWith } from 'rxjs';

import { MerchandiseItem, AreaPackDetail } from '../../models';
import { MerchandiseService } from '../../services/merchandise.service';
import { GlobalData } from '../../services/global-data';
import { CartService } from '../../services/cart.service';
import { MerchandiseItemDialogComponent } from '../../components/dialogs/merchandise-item-dialog';
import { MerchandisePackDialogComponent } from '../../components/dialogs/merchandise-pack-dialog';
import { AdminMerchandiseDialogComponent } from '../../components/dialogs/admin-merchandise-dialog';
import { AdminPackDialogComponent } from '../../components/dialogs/admin-pack-dialog';

@Component({
  selector: 'app-merchandising',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DecimalPipe,
    TranslatePipe,
    TuiAppearance,
    TuiBadge,
    TuiButton,
    TuiHeader,
    TuiIcon,
    TuiNotification,
    TuiScrollbar,
    TuiSkeleton,
    TuiTitle,
    TuiFilter,
    TuiBadgedContentComponent,
    TuiBadgeNotification,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <!-- 🛒 Floating Cart Button -->
      <div
        class="fixed top-0 right-0 w-full z-[95] flex justify-end p-2 sm:p-4 pointer-events-none"
      >
        <tui-badged-content
          [style.--tui-radius.%]="50"
          class="pointer-events-auto"
        >
          @if (cartItems() > 0) {
            <tui-badge-notification
              tuiAppearance="accent"
              size="s"
              tuiSlot="top"
            >
              {{ cartItems() }}
            </tui-badge-notification>
          }
          <button
            tuiIconButton
            type="button"
            appearance="floating"
            size="l"
            (click)="global.showCart.set(true)"
            [attr.aria-label]="'merchandising.cart.title' | translate"
          >
            <tui-icon icon="@tui.shopping-bag" />
          </button>
        </tui-badged-content>
      </div>

      <div
        class="flex flex-col gap-12 max-w-4xl mx-auto w-full pb-24 pt-2 md:pt-6 px-4 md:px-8"
      >
        <!-- 🚀 Hero Page Header -->
        <header
          class="relative flex flex-col items-center text-center gap-6 py-12 px-6 rounded-[3.5rem] overflow-hidden border border-[var(--tui-border-normal)] shadow-2xl shadow-black/5"
          style="background: var(--tui-background-base)"
        >
          <!-- Subtle decorative elements -->
          <div
            class="absolute -top-24 -right-24 w-64 h-64 bg-[var(--tui-background-accent-1-hover)] opacity-10 rounded-full blur-3xl"
          ></div>
          <div
            class="absolute -bottom-24 -left-24 w-64 h-64 bg-[var(--tui-background-accent-1-hover)] opacity-10 rounded-full blur-3xl"
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

          <div
            tuiNotification
            appearance="info"
            size="s"
            class="relative max-w-lg !rounded-2xl border-none bg-[var(--tui-background-neutral-1)] shadow-sm"
          >
            <span class="text-xs font-medium">
              {{ 'merchandising.croquisDisclaimer' | translate }}
            </span>
          </div>
        </header>

        <!-- ─── Area Packs ─── -->
        <section class="flex flex-col gap-6">
          <header tuiHeader class="flex items-center justify-between">
            <h2 tuiTitle size="xl" class="font-black tracking-tight">
              {{ 'merchandising.packs.title' | translate }}
            </h2>
            @if (isAdmin() && global.editingMode()) {
              <button
                tuiIconButton
                appearance="accent"
                size="s"
                type="button"
                class="!rounded-xl"
                (click)="editPack()"
              >
                <tui-icon icon="@tui.plus" />
              </button>
            }
          </header>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            @if (packsResource.isLoading()) {
              @for (_ of [1, 2]; track $index) {
                <div [tuiSkeleton]="true" class="h-64 rounded-[2.5rem]"></div>
              }
            } @else {
              @for (pack of packs(); track pack.id) {
                <article
                  class="group relative flex flex-col rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
                  style="background: var(--tui-background-base); border: 1px solid var(--tui-border-normal);"
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="pack.name"
                  (click)="openPackDetail(pack)"
                  (keydown.enter)="openPackDetail(pack)"
                  (keydown.space)="
                    openPackDetail(pack); $event.preventDefault()
                  "
                >
                  <!-- Illustration / Image -->
                  <div
                    class="relative h-48 overflow-hidden bg-[var(--tui-background-neutral-1)]"
                  >
                    <img
                      [src]="pack.image_url"
                      [alt]="pack.name"
                      [class.grayscale]="pack.active === false"
                      [class.opacity-50]="pack.active === false"
                      class="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000"
                    />

                    <div
                      class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"
                    ></div>

                    <div class="absolute top-4 right-4">
                      <span
                        tuiBadge
                        appearance="primary"
                        size="l"
                        class="shadow-xl font-black !rounded-xl border border-white/20"
                      >
                        {{ pack.price | number: '1.2-2' }}€
                      </span>
                    </div>

                    @if (isAdmin() && global.editingMode()) {
                      <div class="absolute top-4 left-4 flex flex-col gap-2">
                        <button
                          tuiIconButton
                          appearance="secondary-grayscale"
                          size="s"
                          type="button"
                          class="!rounded-xl backdrop-blur-md bg-[var(--tui-background-accent-opposite-pressed)] border border-[var(--tui-border-normal)] text-[var(--tui-background-base)]"
                          (click)="editPack(pack); $event.stopPropagation()"
                        >
                          <tui-icon icon="@tui.pencil" />
                        </button>

                        @if (pack.active === false) {
                          <span tuiBadge>
                            {{ 'merchandising.items.inactive' | translate }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  <div class="flex flex-col p-8 gap-4">
                    <h3
                      class="font-black text-2xl leading-tight tracking-tight flex-1 text-balance"
                    >
                      {{ pack.name }}
                    </h3>

                    @if (pack.description) {
                      <p
                        class="text-sm text-[var(--tui-text-secondary)] leading-relaxed"
                      >
                        {{ pack.description }}
                      </p>
                    }

                    <!-- Area listing -->
                    <div class="flex flex-wrap gap-2 pt-2">
                      @for (item of pack.items; track item.area_id) {
                        <span
                          tuiBadge
                          appearance="primary"
                          size="m"
                          class="font-semibold !rounded-xl opacity-90"
                        >
                          {{ item.area.name }}
                        </span>
                      }
                    </div>
                  </div>
                </article>
              } @empty {
                <div
                  class="col-span-full py-20 text-center text-sm text-[var(--tui-text-tertiary)] rounded-[2.5rem]"
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
          <header tuiHeader class="flex items-center justify-between">
            <h2 tuiTitle size="xl" class="font-black tracking-tight">
              {{ 'merchandising.items.title' | translate }}
            </h2>
            @if (isAdmin() && global.editingMode()) {
              <button
                tuiIconButton
                appearance="accent"
                size="s"
                type="button"
                class="!rounded-xl"
                (click)="editItem()"
              >
                <tui-icon icon="@tui.plus" />
              </button>
            }
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
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-10">
            @if (itemsResource.isLoading()) {
              @for (_ of [1, 2, 3, 4, 5, 6]; track $index) {
                <div
                  [tuiSkeleton]="true"
                  class="aspect-square rounded-[2rem]"
                ></div>
              }
            } @else {
              @for (item of filteredItems(); track item.id) {
                <article
                  class="flex flex-col gap-4 group cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent rounded-[2.5rem]"
                  role="button"
                  tabindex="0"
                  [attr.aria-label]="item.name"
                  (click)="openItemDetail(item)"
                  (keydown.enter)="openItemDetail(item)"
                  (keydown.space)="
                    openItemDetail(item); $event.preventDefault()
                  "
                >
                  <div
                    class="relative aspect-square rounded-[2.5rem] overflow-hidden transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1.5 border border-[var(--tui-border-normal)]"
                    style="background: var(--tui-background-neutral-1)"
                  >
                    @if (item.image_url) {
                      <img
                        [src]="item.image_url"
                        [alt]="item.name"
                        [class.grayscale]="item.active === false"
                        [class.opacity-50]="item.active === false"
                        class="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                      />
                    } @else {
                      <div
                        class="w-full h-full flex items-center justify-center p-12"
                      >
                        <tui-icon
                          icon="@tui.shirt"
                          class="text-[var(--tui-text-tertiary)] text-7xl opacity-20"
                        />
                      </div>
                    }

                    <!-- Price badge instead of buy button -->
                    <div class="absolute top-4 right-4">
                      <span
                        tuiBadge
                        appearance="primary"
                        size="l"
                        class="shadow-xl font-black !rounded-xl border border-white/20"
                      >
                        {{ item.price | number: '1.2-2' }}€
                      </span>
                    </div>

                    @if (isAdmin() && global.editingMode()) {
                      <div class="absolute top-4 left-4 flex flex-col gap-2">
                        <button
                          tuiIconButton
                          appearance="secondary-grayscale"
                          size="s"
                          type="button"
                          class="!rounded-xl backdrop-blur-md bg-[var(--tui-background-accent-opposite-pressed)] border border-[var(--tui-border-normal)] text-[var(--tui-background-base)]"
                          (click)="editItem(item); $event.stopPropagation()"
                        >
                          <tui-icon icon="@tui.pencil" />
                        </button>

                        @if (item.active === false) {
                          <span tuiBadge>
                            {{ 'merchandising.items.inactive' | translate }}
                          </span>
                        }
                      </div>
                    }
                  </div>

                  <div class="flex flex-col px-2 gap-1">
                    <span class="font-black text-lg truncate leading-tight">{{
                      item.name
                    }}</span>
                    @if (item.category) {
                      <span
                        class="text-[10px] font-bold uppercase tracking-widest text-[var(--tui-text-tertiary)]"
                      >
                        {{
                          'merchandising.filter.' + item.category.toLowerCase()
                            | translate
                        }}
                      </span>
                    }
                  </div>
                </article>
              } @empty {
                <div
                  class="col-span-full py-20 text-center text-sm text-[var(--tui-text-tertiary)] rounded-[2.5rem]"
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
  private readonly dialogService = inject(TuiDialogService);

  protected readonly itemsResource = resource<
    MerchandiseItem[],
    { onlyActive: boolean }
  >({
    params: () => ({
      onlyActive: !(this.isAdmin() && this.global.editingMode()),
    }),
    loader: ({ params }: { params: { onlyActive: boolean } }) =>
      this.merchService.getMerchandiseItems(params.onlyActive),
  });

  protected readonly packsResource = resource<
    AreaPackDetail[],
    { onlyActive: boolean }
  >({
    params: () => ({
      onlyActive: !(this.isAdmin() && this.global.editingMode()),
    }),
    loader: ({ params }) => this.merchService.getAreaPacks(params.onlyActive),
  });

  protected readonly items = computed<MerchandiseItem[]>(
    () => this.itemsResource.value() ?? [],
  );
  protected readonly packs = computed<AreaPackDetail[]>(
    () => this.packsResource.value() ?? [],
  );

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

    return (products as MerchandiseItem[]).filter((item: MerchandiseItem) => {
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

  protected readonly isAdmin = this.global.isAdmin;

  protected openItemDetail(item: MerchandiseItem): void {
    this.dialogService
      .open(new PolymorpheusComponent(MerchandiseItemDialogComponent), {
        data: item,
        label: this.translate.instant(item.name || 'merchandising.items.title'),
        size: 'm',
      })
      .subscribe();
  }

  protected openPackDetail(pack: AreaPackDetail): void {
    this.dialogService
      .open(new PolymorpheusComponent(MerchandisePackDialogComponent), {
        data: pack,
        label: pack.name,
        size: 'm',
      })
      .subscribe();
  }

  protected editItem(item?: MerchandiseItem): void {
    this.dialogService
      .open<MerchandiseItem | null>(
        new PolymorpheusComponent(AdminMerchandiseDialogComponent),
        {
          data: item,
          label: this.translate.instant(
            item ? 'merchandising.items.edit' : 'merchandising.items.new',
          ),
          size: 'm',
          dismissible: true,
        },
      )
      .subscribe((result: MerchandiseItem | null) => {
        if (result) {
          void this.itemsResource.reload();
        }
      });
  }

  protected editPack(pack?: AreaPackDetail): void {
    this.dialogService
      .open<boolean>(new PolymorpheusComponent(AdminPackDialogComponent), {
        data: pack,
        label: this.translate.instant(
          pack ? 'merchandising.packs.edit' : 'merchandising.packs.new',
        ),
        size: 'm',
        dismissible: true,
      })
      .subscribe((result: boolean) => {
        if (result) {
          void this.packsResource.reload();
        }
      });
  }
}
