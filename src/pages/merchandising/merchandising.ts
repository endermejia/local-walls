import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  resource,
} from '@angular/core';

import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TuiDialogService } from '@taiga-ui/core';
import { TuiHeader } from '@taiga-ui/layout';
import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiNotification,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiFilter,
  TuiSkeleton,
  TuiBadgedContentComponent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { startWith } from 'rxjs';

import { CartService } from '../../services/cart.service';
import { GlobalData } from '../../services/global-data';
import { MerchandiseService } from '../../services/merchandise.service';

import { AdminMerchandiseDialogComponent } from '../../components/dialogs/admin-merchandise-dialog';
import { AdminPackDialogComponent } from '../../components/dialogs/admin-pack-dialog';
import { MerchandiseItemDialogComponent } from '../../components/dialogs/merchandise-item-dialog';
import { MerchandisePackDialogComponent } from '../../components/dialogs/merchandise-pack-dialog';
import { MerchandiseCardComponent } from '../../components/merchandise/merchandise-card';
import { PackCardComponent } from '../../components/merchandise/pack-card';

import { AreaPackDetail, MerchandiseItemDetail } from '../../models';

@Component({
  selector: 'app-merchandising',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContentComponent,
    TuiBadgeNotification,
    TuiButton,
    TuiFilter,
    TuiHeader,
    TuiIcon,
    TuiNotification,
    TuiScrollbar,
    TuiSkeleton,
    TuiTitle,
    MerchandiseCardComponent,
    PackCardComponent,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <!-- 🛒 Floating Cart Button -->
      <div
        class="fixed top-0 right-0 w-full z-95 flex justify-end p-2 sm:p-4 pointer-events-none"
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
          class="relative flex flex-col items-center text-center gap-6 py-12 px-6 rounded-[3.5rem] overflow-hidden border border-(--tui-border-normal) shadow-2xl shadow-black/5"
          style="background: var(--tui-background-base)"
        >
          <div class="relative flex flex-col items-center gap-4 text-center">
            <img
              src="logo/climbeast.svg"
              alt="ClimBeast Logo"
              class="h-16 sm:h-20 w-auto mb-2 opacity-90 drop-shadow-sm"
            />
            <h1
              class="text-4xl sm:text-5xl font-black tracking-tight text-balance leading-tight flex flex-col items-center"
            >
              <span class="leading-none">{{
                'climbeast.title' | translate
              }}</span>
              <span
                class="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-(--tui-text-tertiary) mt-2"
              >
                {{ 'climbeast.subtitle' | translate }}
              </span>
            </h1>
          </div>

          <p
            class="relative text-base sm:text-lg text-(--tui-text-secondary) leading-relaxed max-w-2xl text-balance"
          >
            {{ 'merchandising.description' | translate }}
          </p>

          <div
            tuiNotification
            appearance="info"
            size="s"
            class="relative max-w-lg rounded-2xl! border-none bg-(--tui-background-neutral-1) shadow-sm"
          >
            <span class="text-xs font-medium">
              {{ 'merchandising.croquisDisclaimer' | translate }}
            </span>
          </div>
        </header>

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
                class="rounded-xl! bg-(--tui-background-accent-1)! text-(--tui-background-base)!"
                (click)="editItem()"
              >
                <tui-icon icon="@tui.plus" />
              </button>
            }
          </header>

          <!-- 🏷️ Translated Filter chips -->
          <div class="flex items-center gap-3">
            @if (
              !itemsResource.isLoading() && availableCategories().length > 1
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
                  class="aspect-square rounded-4xl"
                ></div>
              }
            } @else {
              @for (item of filteredItems(); track item.id) {
                <app-merchandise-card
                  [item]="item"
                  (clicked)="openItemDetail($event)"
                  (edit)="editItem($event)"
                />
              } @empty {
                <div
                  class="col-span-full py-20 text-center text-sm text-(--tui-text-tertiary) rounded-[2.5rem]"
                  style="border: 2px dashed var(--tui-border-normal)"
                >
                  {{ 'merchandising.items.empty' | translate }}
                </div>
              }
            }
          </div>
        </section>

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
                class="rounded-xl! bg-(--tui-background-accent-1)! text-(--tui-background-base)!"
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
                <app-pack-card
                  [pack]="pack"
                  (clicked)="openPackDetail($event)"
                  (edit)="editPack($event)"
                />
              } @empty {
                <div
                  tuiAppearance="floating"
                  class="col-span-full flex flex-col md:flex-row items-center gap-6 p-8 sm:p-12 text-center md:text-left rounded-[2.5rem]"
                >
                  <img
                    src="image/zone-light.svg"
                    alt="Empty packs"
                    class="w-32 h-32 opacity-80"
                  />
                  <div class="flex flex-col items-center md:items-start gap-4">
                    <h3
                      class="text-xl sm:text-2xl font-black uppercase tracking-tight m-0"
                    >
                      {{ 'merchandising.packs.empty' | translate }}
                    </h3>
                  </div>
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
        background-color: var(--tui-background-base-alt);
        background-image: url('/image/cartography-lines.svg');
        background-repeat: no-repeat;
        background-position: left center;
        background-size: 50% auto;
        background-attachment: fixed;
      }

      @media (max-width: 768px) {
        :host {
          background-size: cover;
          background-position: center;
        }
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
    MerchandiseItemDetail[],
    { onlyActive: boolean }
  >({
    params: () => ({
      onlyActive: !(this.isAdmin() && this.global.editingMode()),
    }),
    loader: ({ params }: { params: { onlyActive: boolean } }) =>
      this.merchService.getMerchandiseItems(params.onlyActive, true),
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

  protected readonly items = computed<MerchandiseItemDetail[]>(
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

    return (products as MerchandiseItemDetail[]).filter(
      (item: MerchandiseItemDetail) => {
        if (!item.category) return false;
        const key = `merchandising.filter.${item.category.toLowerCase()}`;
        const label = this.translate.instant(key);
        return selectedLabels.includes(label);
      },
    );
  });

  private readonly cartService = inject(CartService);

  protected readonly cartItems = this.cartService.totalItems;
  protected readonly cartTotal = this.cartService.totalPrice;

  protected readonly isAdmin = this.global.isAdmin;

  protected openItemDetail(item: MerchandiseItemDetail): void {
    this.dialogService
      .open(new PolymorpheusComponent(MerchandiseItemDialogComponent), {
        data: item,
        label: this.translate.instant(item.name || 'merchandising.items.title'),
        size: 'l',
      })
      .subscribe();
  }

  protected openPackDetail(pack: AreaPackDetail): void {
    this.dialogService
      .open(new PolymorpheusComponent(MerchandisePackDialogComponent), {
        data: pack,
        label: pack.name,
        size: 'l',
      })
      .subscribe();
  }

  protected editItem(item?: MerchandiseItemDetail): void {
    this.dialogService
      .open<MerchandiseItemDetail | null>(
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
      .subscribe((result: MerchandiseItemDetail | null) => {
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
