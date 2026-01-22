import { isPlatformBrowser, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  Signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import {
  TuiButton,
  TuiHint,
  TuiIcon,
  TuiLink,
  TuiLoader,
  TuiSurface,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe } from '@ngx-translate/core';

import {
  GradeLabel,
  MapAreaItem,
  MapCragItem,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
  ParkingDto,
} from '../models';

import { FiltersService, GlobalData, ParkingsService } from '../services';

import { ChartRoutesByGradeComponent, MapComponent } from '../components';

import { mapLocationUrl, remToPx } from '../utils';

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
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiIcon,
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
            global.isMobile()
              ? null
              : bottomSheetExpanded
                ? ('labels.map' | translate)
                : ('labels.list' | translate)
          "
          (click.zoneless)="setBottomSheet('toggle')"
        >
          {{ 'explore.toggleView' | translate }}
        </button>
      </div>
      <div class="z-10">
        <tui-badged-content>
          @if (hasActiveFilters()) {
            <tui-badge-notification size="s" tuiSlot="top" />
          }
          <button
            tuiIconButton
            size="s"
            appearance="primary-grayscale"
            iconStart="@tui.sliders-horizontal"
            class="pointer-events-auto"
            [tuiHint]="
              global.isMobile() ? null : ('labels.filters' | translate)
            "
            (click.zoneless)="openFilters()"
          >
            {{ 'labels.filters' | translate }}
          </button>
        </tui-badged-content>
      </div>
    </div>

    <!-- Map -->
    @defer (on viewport) {
      <app-map
        class="w-full h-full"
        [mapCragItems]="mapCragItems()"
        [selectedMapCragItem]="global.selectedMapCragItem()"
        (selectedMapCragItemChange)="selectMapCragItem($event)"
        [mapParkingItems]="global.parkingsMapResource.value() || []"
        [selectedMapParkingItem]="global.selectedMapParkingItem()"
        (selectedMapParkingItemChange)="selectMapParkingItem($event)"
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
        <button
          tuiCardLarge
          tuiSurface="floating"
          class="relative pointer-events-auto m-4"
          [routerLink]="['/area', c.area_slug, c.slug]"
        >
          <div class="flex flex-col min-w-0 grow">
            <header tuiHeader>
              <h2 tuiTitle>{{ c.name }}</h2>
            </header>
            <section class="grid grid-cols-[1fr_auto] gap-2 items-stretch">
              <div class="flex flex-col justify-between">
                <a
                  tuiSubtitle
                  tuiLink
                  appearance="action-grayscale"
                  class="!text-xl w-fit"
                  [routerLink]="['/area', c.area_slug]"
                  (click.zoneless)="$event.stopPropagation()"
                  >{{ c.area_name }}</a
                >
                <div
                  class="text-xl h-full mb-7 content-center flex items-center gap-4"
                >
                  <div>
                    {{ c.routes_count }}
                    {{
                      'labels.' + (c.routes_count === 1 ? 'route' : 'routes')
                        | translate
                        | lowercase
                    }}
                  </div>
                  @if (c.approach) {
                    <div
                      class="flex w-fit items-center gap-1 opacity-70"
                      [tuiHint]="
                        global.isMobile()
                          ? null
                          : ('labels.approach' | translate)
                      "
                    >
                      <tui-icon icon="@tui.footprints" />
                      <span class="whitespace-nowrap">
                        {{ c.approach }}
                        min.
                      </span>
                    </div>
                  }
                </div>
              </div>
              <div class="flex items-center">
                <app-chart-routes-by-grade
                  (click.zoneless)="$event.stopPropagation()"
                  [grades]="c.grades"
                />
              </div>
            </section>
          </div>
        </button>
      </div>
    } @else if (global.selectedMapParkingItem(); as p) {
      <!-- Selected parking information section -->
      <div
        class="absolute w-full max-w-[40rem] mx-auto z-50 pointer-events-none left-0 right-0 bottom-0"
      >
        <div
          tuiCardLarge
          tuiSurface="floating"
          class="relative pointer-events-auto m-4"
        >
          <div class="flex flex-col grow gap-2">
            <header tuiHeader class="flex wrap gap-2">
              <h2 tuiTitle>{{ p.name }}</h2>
              <section class="text-sm opacity-80">
                @if (p.size) {
                  <div
                    class="flex w-fit items-center gap-1"
                    [tuiHint]="
                      global.isMobile() ? null : ('labels.capacity' | translate)
                    "
                  >
                    <tui-icon icon="@tui.car" />
                    <span class="text-lg">
                      x
                      {{ p.size }}
                    </span>
                  </div>
                }
              </section>
              @if (global.isAdmin()) {
                <button
                  size="s"
                  appearance="neutral"
                  iconStart="@tui.square-pen"
                  tuiIconButton
                  type="button"
                  class="!rounded-full"
                  (click.zoneless)="openEditParking(p)"
                  [tuiHint]="'actions.edit' | translate"
                >
                  {{ 'actions.edit' | translate }}
                </button>
              }
            </header>
            @if (p.latitude && p.longitude) {
              <button
                appearance="flat"
                size="m"
                tuiButton
                type="button"
                class="lw-icon-50"
                [iconStart]="'/image/google-maps.svg'"
                (click.zoneless)="
                  openExternal(
                    mapLocationUrl({
                      latitude: p.latitude,
                      longitude: p.longitude,
                    })
                  )
                "
                [attr.aria-label]="'actions.openGoogleMaps' | translate"
              >
                {{ 'actions.openGoogleMaps' | translate }}
              </button>
            }
          </div>
        </div>
      </div>
    } @else {
      <!-- BottomSheet -->
      @let crags = mapCragItems();
      @let areas = mapAreaItems();
      @let loading =
        global.mapResource.isLoading() || global.areasMapResource.isLoading();
      @if (loading) {
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
                @for (a of areas; track a.slug) {
                  <button
                    tuiCardLarge
                    [tuiSurface]="a.liked ? 'outline-destructive' : 'outline'"
                    [routerLink]="['/area', a.slug]"
                  >
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ a.name }}</h2>
                      </header>
                      <section class="flex items-center justify-between gap-2">
                        @if (a.crags_count; as count) {
                          <div class="text-xl">
                            {{ count }}
                            {{
                              'labels.' + (count === 1 ? 'crag' : 'crags')
                                | translate
                                | lowercase
                            }}
                          </div>
                        }
                        @if (a.grades; as grades) {
                          <app-chart-routes-by-grade
                            (click.zoneless)="$event.stopPropagation()"
                            [grades]="grades"
                          />
                        }
                      </section>
                    </div>
                  </button>
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
                  <button
                    tuiCardLarge
                    [tuiSurface]="c.liked ? 'outline-destructive' : 'outline'"
                    [routerLink]="['/area', c.area_slug, c.slug]"
                  >
                    <div class="flex flex-col min-w-0 grow">
                      <header tuiHeader>
                        <h2 tuiTitle>{{ c.name }}</h2>
                      </header>
                      <section
                        class="grid grid-cols-[1fr_auto] gap-2 items-stretch"
                      >
                        <div class="flex flex-col justify-between">
                          <a
                            tuiSubtitle
                            tuiLink
                            appearance="action-grayscale"
                            [routerLink]="['/area', c.area_slug]"
                            class="!text-xl w-fit"
                            (click.zoneless)="$event.stopPropagation()"
                            >{{ c.area_name }}</a
                          >
                          <div class="text-xl h-full mb-7 content-center">
                            {{ c.routes_count }}
                            {{
                              'labels.' +
                                (c.routes_count === 1 ? 'route' : 'routes')
                                | translate
                                | lowercase
                            }}
                          </div>
                        </div>
                        <div class="flex items-center">
                          <app-chart-routes-by-grade
                            (click.zoneless)="$event.stopPropagation()"
                            [grades]="c.grades"
                          />
                        </div>
                      </section>
                    </div>
                  </button>
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
  protected readonly mapLocationUrl = mapLocationUrl;
  private readonly filtersService = inject(FiltersService);
  private readonly parkingsService = inject(ParkingsService);

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
    const categories = this.global.areaListCategories();
    const [selMin, selMax] = this.global.areaListGradeRange();
    const shade = this.global.areaListShade() || [];

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
        const count = byLabel[lab as GradeLabel];
        if (!count) continue;
        if (idx < minIdx) minIdx = idx;
        if (idx > maxIdx) maxIdx = idx;
      }
      if (!Number.isFinite(minIdx) || !Number.isFinite(maxIdx)) return true;
      // overlap check between [minIdx,maxIdx] and [selMin, selMax]
      return maxIdx >= selMin && minIdx <= selMax;
    };

    const matchesShade = (c: MapCragItem): boolean => {
      if (!shade.length) return true;
      if (
        c.shade_morning === undefined &&
        c.shade_afternoon === undefined &&
        c.shade_all_day === undefined &&
        c.sun_all_day === undefined
      ) {
        return true;
      }

      return shade.some((s) => {
        if (s === 'shade_morning') return c.shade_morning;
        if (s === 'shade_afternoon') return c.shade_afternoon;
        if (s === 'shade_all_day') return c.shade_all_day;
        if (s === 'sun_all_day') return c.sun_all_day;
        return false;
      });
    };

    return items.filter((item): item is MapCragItem => {
      const isCrag = (item as MapAreaItem).area_type !== 0;
      if (!isCrag) return false;
      const c = item as MapCragItem;
      return (
        withinSelectedCategories(c) &&
        overlapsSelectedGrades(c) &&
        matchesShade(c)
      );
    });
  });

  protected mapAreaItems: Signal<MapAreaItem[]> = computed(() => {
    const items = this.global.mapItemsOnViewport();
    return items.filter((item): item is MapAreaItem => {
      return (item as MapAreaItem).area_type === 0;
    });
  });

  protected readonly isBottomSheetExpanded: Signal<boolean> = computed(() => {
    const clientHeight = this._sheetClientHeight();
    const scrollTop = this._sheetScrollTop();
    if (clientHeight <= 0) return false;
    const offset = remToPx(this.stops[0] as string) || 0;
    const maxTop = Math.max(0, clientHeight - offset);
    return scrollTop >= maxTop * 0.5;
  });

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.global.areaListGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.global.areaListCategories().length > 0 ||
      this.global.areaListShade().length > 0
    );
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

    const hadSelectedMapItem =
      !!this.global.selectedMapCragItem() ||
      !!this.global.selectedMapParkingItem();

    if (hadSelectedMapItem && mode !== 'open') {
      this.global.selectedMapCragItem.set(null);
      this.global.selectedMapParkingItem.set(null);
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
    this.global.selectedMapParkingItem.set(null);
    this.global.selectedMapCragItem.set(mapCragItem);
    this.setBottomSheet('open');
  }

  protected selectMapParkingItem(parkingItem: ParkingDto | null): void {
    if (!parkingItem) return;
    this.global.selectedMapCragItem.set(null);
    this.global.selectedMapParkingItem.set(parkingItem);
    this.setBottomSheet('open');
  }

  protected openEditParking(parking: ParkingDto): void {
    this.parkingsService.openParkingForm({
      parkingData: parking,
    });
  }

  protected closeAll(): void {
    this.global.selectedMapCragItem.set(null);
    this.global.selectedMapParkingItem.set(null);
    this.setBottomSheet('close');
  }

  protected openExternal(url: string): void {
    if (isPlatformBrowser(this._platformId)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  protected openFilters(): void {
    this.filtersService.openFilters();
    this.closeAll();
  }
}
