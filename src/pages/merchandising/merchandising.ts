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

import { MerchandiseService } from '../../services/merchandise.service';
import { GlobalData } from '../../services/global-data';

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
                        (click)="buyItem(item.id)"
                      >
                        <tui-icon icon="@tui.shopping-bag" />
                      </button>
                    </div>
                  </div>

                  <div class="flex flex-col px-1 gap-0.5">
                    <div class="flex justify-between items-baseline gap-2">
                      <span class="font-bold text-base truncate">{{
                        item.name
                      }}</span>
                      <span class="text-base font-black shrink-0 text-primary">
                        {{ item.price | number: '1.2-2' }}€
                      </span>
                    </div>
                    @if (item.category) {
                      <span
                        class="text-xs font-medium uppercase tracking-wider text-[var(--tui-text-tertiary)]"
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

  async buyItem(id: string): Promise<void> {
    await this.merchService.buyMerchandise(id);
  }

  async buyPack(id: string): Promise<void> {
    await this.merchService.buyAreaPack(id);
  }
}
