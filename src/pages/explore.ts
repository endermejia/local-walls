import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  PLATFORM_ID,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TranslateService } from '@ngx-translate/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import {
  TuiButton,
  TuiHint,
  TuiLink,
  TuiLoader,
  TuiSurface,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';
import { ChartRoutesByGradeComponent, MapComponent } from '../components';
import { FilterDialogComponent, FilterDialog } from './filter-dialog';
import { GlobalData } from '../services';
import {
  GradeLabel,
  MapAreaItem,
  MapCounts,
  MapCragItem,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
} from '../models';
import { remToPx } from '../utils';

@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    TuiHeader,
    TuiCardLarge,
    TuiTitle,
    TranslatePipe,
    TuiLoader,
    TuiSurface,
    TuiBottomSheet,
    TuiButton,
    TuiHint,
    LowerCasePipe,
    TuiLink,
    MapComponent,
    ChartRoutesByGradeComponent,
    TuiAvatar,
  ],
  template: ` <div class="h-full w-full">
    <div class="absolute right-4 top-16 flex flex-col gap-2">
      @let bottomSheetExpanded = isBottomSheetExpanded();
      <div class="z-100">
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          [iconStart]="bottomSheetExpanded ? '@tui.map' : '@tui.list'"
          class="pointer-events-auto"
          [tuiHint]="
            bottomSheetExpanded
              ? ('labels.map' | translate)
              : ('labels.list' | translate)
          "
          (click.zoneless)="setBottomSheet('toggle')"
        >
          {{ 'explore.toggleView' | translate }}
        </button>
      </div>
      <div class="z-10">
        <button
          tuiIconButton
          size="s"
          appearance="primary-grayscale"
          iconStart="@tui.sliders-horizontal"
          class="pointer-events-auto"
          [tuiHint]="'labels.filters' | translate"
          (click.zoneless)="openFilters()"
        >
          {{ 'labels.filters' | translate }}
        </button>
      </div>
    </div>

    <!-- Map -->
    @defer (on viewport) {
      <app-map
        class="w-full h-full"
        [mapCragItems]="mapCragItems()"
        [selectedMapCragItem]="global.selectedMapCragItem()"
        (selectedMapCragItemChange)="selectMapCragItem($event)"
        (mapClick)="closeAll()"
        (interactionStart)="setBottomSheet('close')"
      />
      <!-- (visibleChange)="remountBottomSheet()" -->
    } @placeholder {
      <tui-loader size="xxl" class="w-full h-full flex" />
    }

    @if (global.selectedMapCragItem(); as c) {
      <!-- Selected crag information section with the same width as the bottom-sheet -->
      <div
        class="absolute w-full max-w-[40rem] mx-auto z-50 pointer-events-none left-0 right-0 bottom-0"
      >
        <div
          tuiCardLarge
          tuiSurface="floating"
          class="relative pointer-events-auto cursor-pointer m-4"
          [routerLink]="['/area', c.area_slug, c.slug]"
        >
          <div class="flex items-center gap-3">
            <div class="flex flex-col min-w-0 grow">
              <header tuiHeader>
                <h2 tuiTitle>{{ c.name }}</h2>
              </header>
              <section>
                <a
                  tuiLink
                  appearance="action-grayscale"
                  [routerLink]="['/area', c.area_slug]"
                  (click.zoneless)="$event.stopPropagation()"
                  >{{ c.area_name }}</a
                >
              </section>
            </div>
            @if (global.selectedMapCragItem()?.grades; as grades) {
              <div (click.zoneless)="$event.stopPropagation()">
                <app-chart-routes-by-grade [grades]="grades" />
              </div>
            }
          </div>
        </div>
      </div>
    } @else {
      <!-- BottomSheet -->
      @let areas = mapAreaItems();
      @let crags = mapCragItems();
      @if (global.loading()) {
        <div class="absolute w-full h-full top-0">
          <tui-loader size="xxl" class="absolute w-full h-full z-50" />
        </div>
      } @else if (areas.length || crags.length) {
        <tui-bottom-sheet
          #sheet
          [stops]="stops"
          class="z-50"
          role="dialog"
          aria-labelledby="areas-title crags-title"
          (scroll.zoneless)="onSheetScroll($event)"
        >
          @if (areas.length) {
            <h3 tuiHeader id="areas-title" class="justify-center">
              <div
                class="flex flex-row align-items-center justify-center gap-2"
              >
                <tui-avatar
                  tuiThumbnail
                  size="l"
                  [src]="global.iconSrc()('zone')"
                  [attr.aria-label]="'labels.area' | translate"
                />
                <span tuiTitle class="justify-center">
                  {{ areas.length }}
                  {{
                    'labels.' + (areas.length === 1 ? 'area' : 'areas')
                      | translate
                      | lowercase
                  }}
                </span>
              </div>
            </h3>
            <section
              class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto"
            >
              <div class="grid gap-2">
                @for (a of areas; track a.id) {
                  <div
                    tuiCardLarge
                    [tuiSurface]="a.liked ? 'accent' : 'neutral'"
                    class="cursor-pointer"
                    [routerLink]="['/area', a.slug]"
                  >
                    <div class="flex items-center gap-3">
                      <div class="flex flex-col min-w-0 grow">
                        <header tuiHeader>
                          <h2 tuiTitle>{{ a.name }}</h2>
                        </header>
                        <section>
                          <div class="opacity-80">
                            {{ a.country_name }}
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
          @if (crags.length) {
            <h3 tuiHeader id="crags-title" class="justify-center">
              <div
                class="flex flex-row align-items-center justify-center gap-2"
              >
                <tui-avatar
                  tuiThumbnail
                  size="l"
                  [src]="global.iconSrc()('crag')"
                  class="self-center"
                  [attr.aria-label]="'labels.crag' | translate"
                />
                <span tuiTitle class="justify-center">
                  {{ crags.length }}
                  {{
                    'labels.' + (crags.length === 1 ? 'crag' : 'crags')
                      | translate
                      | lowercase
                  }}
                </span>
              </div>
            </h3>
            <section
              class="w-full max-w-5xl mx-auto sm:px-4 py-4 overflow-auto"
            >
              <div class="grid gap-2">
                @for (c of crags; track c.id) {
                  <div
                    tuiCardLarge
                    [tuiSurface]="c.liked ? 'accent' : 'neutral'"
                    class="cursor-pointer"
                    [routerLink]="['/area', c.area_slug, c.slug]"
                  >
                    <div class="flex items-center gap-3">
                      <div class="flex flex-col min-w-0 grow">
                        <header tuiHeader>
                          <h2 tuiTitle>{{ c.name }}</h2>
                        </header>
                        <section>
                          <a
                            tuiLink
                            appearance="action-grayscale"
                            [routerLink]="['/area', c.area_slug]"
                            (click.zoneless)="$event.stopPropagation()"
                            >{{ c.area_name }}</a
                          >
                        </section>
                      </div>
                      <div (click.zoneless)="$event.stopPropagation()">
                        <app-chart-routes-by-grade
                          class="mt-2"
                          [grades]="c.grades"
                        />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
        </tui-bottom-sheet>
      }
    }
  </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full',
  },
})
export class ExploreComponent {
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);

  // Filter state: categories (0=Sport, 1=Boulder); empty => all
  protected readonly selectedCategories: WritableSignal<number[]> = signal([
    0, 1,
  ]);
  // Grade range in indices over ORDERED_GRADE_VALUES
  protected readonly selectedGradeRange: WritableSignal<[number, number]> =
    signal([0, ORDERED_GRADE_VALUES.length - 1]);
  private readonly _platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);

  constructor() {
    this.global.resetDataByPage('explore');
  }

  protected readonly stops = ['6rem'] as const;

  @ViewChild('sheet', { read: ElementRef }) sheetRef?: ElementRef<HTMLElement>;

  private readonly _sheetClientHeight: WritableSignal<number> = signal(0);
  private readonly _sheetScrollTop: WritableSignal<number> = signal(0);

  protected mapCragItems: Signal<MapCragItem[]> = computed(() => {
    const items = this.global.mapItemsOnViewport();
    const categories = this.selectedCategories();
    const [selMin, selMax] = this.selectedGradeRange();

    const withinSelectedCategories = (c: MapCragItem): boolean => {
      // empty => all
      return !categories.length || categories.includes(c.category);
    };

    const overlapsSelectedGrades = (c: MapCragItem): boolean => {
      const byLabel = normalizeRoutesByGrade(c.grades);
      const labels = Object.keys(byLabel);
      if (!labels.length) return true; // no data, don't filter out
      // compute min and max index present
      let minIdx = Number.POSITIVE_INFINITY;
      let maxIdx = Number.NEGATIVE_INFINITY;
      for (const lab of labels) {
        const idx = ORDERED_GRADE_VALUES.indexOf(lab as GradeLabel);
        if (idx === -1) continue;
        const count = (byLabel as never)[lab] as number | undefined;
        if (!count) continue;
        if (idx < minIdx) minIdx = idx;
        if (idx > maxIdx) maxIdx = idx;
      }
      if (!Number.isFinite(minIdx) || !Number.isFinite(maxIdx)) return true;
      // overlap check between [minIdx,maxIdx] and [selMin, selMax]
      return maxIdx >= selMin && minIdx <= selMax;
    };

    return items.filter((item): item is MapCragItem => {
      const isCrag = (item as MapAreaItem).area_type !== 0;
      if (!isCrag) return false;
      const c = item as MapCragItem;
      if (!c.total_ascendables) return false;
      return withinSelectedCategories(c) && overlapsSelectedGrades(c);
    });
  });

  protected mapAreaItems: Signal<MapAreaItem[]> = computed(() => {
    const items = this.global.mapItemsOnViewport();

    return items.filter(
      (item): item is MapAreaItem => (item as MapAreaItem).area_type === 0,
    );
  });
  protected mapCounts: Signal<MapCounts | null> = computed(
    () => this.global.mapResponse()?.counts ?? null,
  );

  protected readonly isBottomSheetExpanded: Signal<boolean> = computed(() => {
    const clientHeight = this._sheetClientHeight();
    const scrollTop = this._sheetScrollTop();
    if (clientHeight <= 0) return false;
    const offset = remToPx(this.stops[0] as string) || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    return scrollTop >= maxTop * 0.5;
  });

  private isBrowser(): boolean {
    return isPlatformBrowser(this._platformId) && typeof window !== 'undefined';
  }

  private computeBottomSheetTargetTop(node: HTMLElement): number {
    const offsetPx = remToPx(this.stops[0] as string) || 0;
    const clientHeight = node.clientHeight || 0;
    return Math.max(0, clientHeight - offsetPx);
  }

  private updateBottomSheetScrollSignals(
    node: HTMLElement,
    targetTop?: number,
  ): void {
    const clientHeight = node.clientHeight || 0;
    const top = typeof targetTop === 'number' ? targetTop : node.scrollTop || 0;
    this._sheetClientHeight.set(clientHeight);
    this._sheetScrollTop.set(top);
  }

  private scrollBottomSheetTo(node: HTMLElement, top: number): void {
    this.updateBottomSheetScrollSignals(node, top);
    try {
      node.scrollTo({ top, behavior: 'smooth' });
    } catch {
      node.scrollTop = top;
    }
  }

  protected onSheetScroll(event: Event): void {
    if (!this.isBrowser()) return;
    const target =
      (event?.target as HTMLElement) || this.sheetRef?.nativeElement;
    if (!target) return;
    this.updateBottomSheetScrollSignals(target);
  }

  protected setBottomSheet(mode: 'open' | 'close' | 'toggle' = 'toggle'): void {
    if (!isPlatformBrowser(this._platformId) || typeof window === 'undefined') {
      return;
    }

    const hadSelectedMapItem = !!this.global.selectedMapCragItem();

    if (hadSelectedMapItem && mode !== 'open') {
      this.global.selectedMapCragItem.set(null);
    }

    const el = this.sheetRef?.nativeElement;
    if (!el) {
      window.requestAnimationFrame(() => {
        const node = this.sheetRef?.nativeElement;
        if (!node) return;
        window.requestAnimationFrame(() => {
          const target =
            mode === 'close' ? 0 : this.computeBottomSheetTargetTop(node);
          this.scrollBottomSheetTo(node, mode === 'open' ? target : target);
          if (mode === 'close') {
            this._sheetClientHeight.set(0);
            this._sheetScrollTop.set(0);
          }
        });
      });
      return;
    }

    const maxTop = this.computeBottomSheetTargetTop(el);
    const currentTop = el.scrollTop || 0;

    let targetTop = 0;
    if (mode === 'open') {
      targetTop = maxTop;
    } else if (mode === 'close') {
      targetTop = 0;
    } else {
      const shouldExpand = hadSelectedMapItem
        ? true
        : currentTop < maxTop * 0.5;
      targetTop = shouldExpand ? maxTop : 0;
    }

    const doScroll = (node: HTMLElement) => {
      this.scrollBottomSheetTo(node, targetTop);
      if (targetTop === 0) {
        // reset signals when closing
        this._sheetClientHeight.set(0);
        this._sheetScrollTop.set(0);
      }
    };

    window.requestAnimationFrame(() => {
      const nodeA = this.sheetRef?.nativeElement || el;
      window.requestAnimationFrame(() => doScroll(nodeA));
    });
  }

  protected selectMapCragItem(mapCragItem: MapCragItem | null): void {
    if (!mapCragItem) return;
    this.global.selectedMapCragItem.set(mapCragItem);
    this.setBottomSheet('open');
  }

  protected closeAll(): void {
    this.global.selectedMapCragItem.set(null);
    this.setBottomSheet('close');
  }

  protected openFilters(): void {
    const data: FilterDialog = {
      categories: this.selectedCategories(),
      gradeRange: this.selectedGradeRange(),
    };
    this.dialogs
      .open<FilterDialog>(new PolymorpheusComponent(FilterDialogComponent), {
        label: this.translate.instant('labels.filters'),
        size: 'l',
        data,
      })
      .subscribe((result) => {
        if (!result) return;
        this.global.loading.set(true);
        this.selectedCategories.set(result.categories ?? []);
        const [a, b] = result.gradeRange ?? [
          0,
          ORDERED_GRADE_VALUES.length - 1,
        ];
        const lo = Math.max(0, Math.min(a, ORDERED_GRADE_VALUES.length - 1));
        const hi = Math.max(0, Math.min(b, ORDERED_GRADE_VALUES.length - 1));
        this.selectedGradeRange.set([Math.min(lo, hi), Math.max(lo, hi)] as [
          number,
          number,
        ]);
        this.closeAll();
        this.global.loading.set(false);
      });
  }
}
