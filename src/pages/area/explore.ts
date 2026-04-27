import { Router, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  PLATFORM_ID,
  signal,
  Signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import {
  isPlatformBrowser,
  LowerCasePipe,
  NgTemplateOutlet,
} from '@angular/common';

import { TuiBottomSheet } from '@taiga-ui/addon-mobile';
import { TuiHeader } from '@taiga-ui/layout';
import { TuiDropdown } from '@taiga-ui/core';
import {
  TuiAppearance,
  TuiButton,
  TuiLoader,
  TuiScrollbar,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import { AreasService } from '../../services/areas.service';
import { FiltersService } from '../../services/filters.service';
import { GlobalData } from '../../services/global-data';
import { ParkingsService } from '../../services/parkings.service';
import { TourService } from '../../services/tour.service';
import { TourStep } from '../../services/tour.service';

import { AreaCardComponent } from '../../components/area/area-card';
import { CragCardComponent } from '../../components/crag/crag-card';
import { ParkingCardComponent } from '../../components/location/parking-card';
import { IndoorCenterCardComponent } from '../indoor/components/indoor-center-card';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { MapComponent } from '../../components/location/map';
import { TourHintComponent } from '../../components/ui/tour-hint';

import {
  ClimbingKinds,
  isGradeRangeOverlap,
  MapAreaItem,
  MapCragItem,
  matchesShadeFilter,
  normalizeRoutesByGrade,
  ORDERED_GRADE_VALUES,
  ParkingDto,
} from '../../models';

import { mapLocationUrl, remToPx } from '../../utils';
import { IconSrcPipe } from '../../pipes/icon-src.pipe';

@Component({
  selector: 'app-home',
  imports: [
    AreaCardComponent,
    CragCardComponent,
    EmptyStateComponent,
    IconSrcPipe,
    LowerCasePipe,
    MapComponent,
    NgTemplateOutlet,
    ParkingCardComponent,
    RouterLink,
    TourHintComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiBottomSheet,
    TuiButton,
    TuiDropdown,
    TuiHeader,
    TuiLoader,
    TuiScrollbar,
    TuiTitle,
  ],
  template: ` @let isMobile = global.isMobile();
    <div class="h-full w-full flex min-h-0">
      <div
        class="relative h-full grow flex flex-col min-w-0 transition-[width] duration-300"
      >
        <div class="absolute right-4 top-4 flex flex-col items-end gap-2">
          <div class="z-10">
            <tui-badged-content>
              @if (hasActiveFilters()) {
                <tui-badge-notification
                  tuiAppearance="accent"
                  size="s"
                  tuiSlot="top"
                />
              }
              <button
                tuiIconButton
                size="s"
                appearance="primary-grayscale"
                iconStart="@tui.sliders-horizontal"
                class="pointer-events-auto"
                (click.zoneless)="openFilters()"
              >
                {{ 'filters' | translate }}
              </button>
            </tui-badged-content>
          </div>
          @if (global.canEditAsAdmin() && !isMobile) {
            <div class="z-10">
              <button
                tuiIconButton
                size="s"
                appearance="primary-grayscale"
                iconStart="@tui.blend"
                class="pointer-events-auto"
                (click.zoneless)="unifyVisibleAreas()"
              >
                {{ 'areas.unifyVisibleAreas' | translate }}
              </button>
            </div>
          }
        </div>

        @if (isMobile && isBottomSheetExpanded()) {
          <div
            class="absolute bottom-4 left-1/2 -translate-x-1/2 z-100 pointer-events-auto"
          >
            <button
              tuiButton
              size="m"
              appearance="primary-grayscale"
              iconStart="@tui.map"
              (click.zoneless)="setBottomSheet('close')"
            >
              {{ 'map' | translate }}
            </button>
          </div>
        }

        @let hasMapResults =
          mapAreaItems().length > 0 || mapCragItems().length > 0 || mapIndoorItems().length > 0;
        @let hasSelection =
          !!global.selectedMapCragItem() || !!global.selectedMapParkingItem() || !!global.selectedMapIndoorItem();

        @let isExploreAreasTourStep =
          tourService.isActive() &&
          tourService.step() === TourStep.EXPLORE_AREAS;

        <!-- Bottom version (No selection) -->
        <div
          class="absolute left-1/2 z-60 sm:z-100 pointer-events-auto transition-opacity duration-300 ease-in-out"
          [style.bottom]="buttonBottomOffset()"
          [style.opacity]="
            (hasMapResults && !hasSelection) || isExploreAreasTourStep ? 1 : 0
          "
          [style.visibility]="
            (hasMapResults && !hasSelection) || isExploreAreasTourStep
              ? 'visible'
              : 'hidden'
          "
          [style.transform]="'translate(-50%, -' + _sheetScrollTop() + 'px)'"
        >
          <button
            tuiButton
            size="m"
            appearance="primary-grayscale"
            iconStart="@tui.list"
            routerLink="/area"
            [tuiDropdown]="tourHint"
            [tuiDropdownManual]="isExploreAreasTourStep"
          >
            {{ 'viewAllAreas' | translate }}
          </button>
        </div>

        <!-- Top version (With selection) -->
        <div
          class="absolute left-1/2 top-4 z-60 sm:z-100 pointer-events-auto transition-opacity duration-300 ease-in-out -translate-x-1/2"
          [style.opacity]="hasSelection ? 1 : 0"
          [style.visibility]="hasSelection ? 'visible' : 'hidden'"
        >
          <button
            tuiButton
            size="m"
            appearance="primary-grayscale"
            iconStart="@tui.list"
            routerLink="/area"
          >
            {{ 'viewAllAreas' | translate }}
          </button>
        </div>

        <!-- Map -->
        @defer (on viewport) {
          <div class="absolute inset-0 pointer-events-none"></div>
          <app-map
            class="w-full h-full"
            [mapCragItems]="mapCragItems()"
            [mapAreaItems]="global.areasMapResource.value() || []"
            [selectedMapCragItem]="global.selectedMapCragItem()"
            (selectedMapCragItemChange)="selectMapCragItem($event)"
            [mapParkingItems]="global.parkingsMapResource.value() || []"
            [mapIndoorItems]="mapIndoorItems()"
            [selectedMapIndoorItem]="global.selectedMapIndoorItem()"
            (selectedMapIndoorItemChange)="selectMapIndoorItem($event)"
            [selectedMapParkingItem]="global.selectedMapParkingItem()"
            (selectedMapParkingItemChange)="selectMapParkingItem($event)"
            (mapClick)="closeAll()"
          />
          <!-- (visibleChange)="remountBottomSheet()" -->
        } @placeholder {
          <tui-loader size="xxl" class="w-full h-full flex" />
        }

        @if (global.selectedMapCragItem(); as c) {
          <!-- Selected crag information section with the same width as the bottom-sheet -->
          <div
            class="absolute w-full max-w-120 mx-auto z-50 pointer-events-none left-0 right-0 bottom-0 px-4 pb-4"
          >
            <app-crag-card
              [crag]="c"
              appearance="floating"
              class="pointer-events-auto"
            />
          </div>
        } @else if (global.selectedMapParkingItem(); as p) {
          <!-- Selected parking information section -->
          <div
            class="absolute w-full max-w-120 mx-auto z-50 pointer-events-none left-0 right-0 bottom-0 px-4 pb-4"
          >
            <app-parking-card
              [parking]="p"
              appearance="floating"
              class="pointer-events-auto"
            />
          </div>
        } @else if (global.selectedMapIndoorItem(); as i) {
          <div
            class="absolute w-full max-w-120 mx-auto z-50 pointer-events-none left-0 right-0 bottom-0 px-4 pb-4"
          >
            <app-indoor-center-card
              [item]="i"
              class="pointer-events-auto block"
            />
          </div>
        }

        <!-- BottomSheet (Mobile) -->
        @let crags = mapCragItems();
        @let areas = mapAreaItems();
        @let indoors = mapIndoorItems();
        @let loading =
          global.mapResource.isLoading() || global.areasMapResource.isLoading();

        @if (
          !global.selectedMapCragItem() && !global.selectedMapParkingItem()
        ) {
          @if (loading) {
            <div
              class="absolute w-full h-full top-0 pointer-events-none z-50 flex items-center justify-center bg-(--tui-background-base)/30"
            >
              <tui-loader size="xxl" />
            </div>
          } @else if (isMobile && (areas.length || crags.length)) {
            <tui-bottom-sheet
              #sheet
              [stops]="stops"
              class="z-50"
              role="dialog"
              aria-labelledby="areas-title crags-title"
              (scroll.zoneless)="onSheetScroll($event)"
            >
              <ng-container *ngTemplateOutlet="listContent" />
            </tui-bottom-sheet>
          }
        }
      </div>

      <!-- Desktop Sidebar (always visible) -->
      @if (!isMobile) {
        <div
          class="flex flex-col shrink-0 h-full w-80 sm:w-96 border-l border-(--tui-border-normal)"
        >
          <tui-scrollbar class="h-full bg-(--tui-background-base)">
            @if (mapCragItems().length || mapAreaItems().length || mapIndoorItems().length) {
              <ng-container *ngTemplateOutlet="listContent" />
            } @else {
              <app-empty-state icon="@tui.map-pin" />
            }
          </tui-scrollbar>
        </div>
      }

      <ng-template #tourHint>
        <app-tour-hint
          [description]="tourDescription() | translate"
          (next)="tourService.next()"
          (skip)="tourService.finish()"
        />
      </ng-template>

      <ng-template #listContent>
        @if (indoors.length) {
          <h3 tuiHeader id="indoors-title" class="justify-center sm:pt-4">
            <div class="flex flex-row align-items-center justify-center gap-2">
              <span
                [tuiAvatar]="'home' | iconSrc"
                tuiThumbnail
                size="l"
                [attr.aria-label]="'indoor' | translate"
              ></span>
              <span tuiTitle class="justify-center">
                {{ indoors.length }}
                {{
                  (indoors.length === 1 ? 'indoorCenter' : 'indoorCenters')
                    | translate
                    | lowercase
                }}
              </span>
            </div>
          </h3>
          <section class="w-full max-w-5xl mx-auto sm:px-4 py-4 pb-20">
            <div class="grid gap-2">
              @for (i of indoors; track i.id) {
                <app-indoor-center-card [item]="i" />
              }
            </div>
          </section>
        }
        @if (areas.length) {
          <h3 tuiHeader id="areas-title" class="justify-center sm:pt-4">
            <div class="flex flex-row align-items-center justify-center gap-2">
              <span
                [tuiAvatar]="'zone' | iconSrc"
                tuiThumbnail
                size="l"
                [attr.aria-label]="'area' | translate"
              ></span>
              <span tuiTitle class="justify-center">
                {{ areas.length }}
                {{
                  (areas.length === 1 ? 'area' : 'areas')
                    | translate
                    | lowercase
                }}
              </span>
            </div>
          </h3>
          <section class="w-full max-w-5xl mx-auto sm:px-4 py-4 pb-20">
            <div class="grid gap-2">
              @for (a of areas; track a.slug) {
                <app-area-card [area]="a" />
              }
            </div>
          </section>
        }
        @if (crags.length) {
          <h3 tuiHeader id="crags-title" class="justify-center">
            <div class="flex flex-row align-items-center justify-center gap-2">
              <span
                [tuiAvatar]="'crag' | iconSrc"
                tuiThumbnail
                size="l"
                class="self-center"
                [attr.aria-label]="'crag' | translate"
              ></span>
              <span tuiTitle class="justify-center">
                {{ crags.length }}
                {{
                  (crags.length === 1 ? 'crag' : 'crags')
                    | translate
                    | lowercase
                }}
              </span>
            </div>
          </h3>
          <section class="w-full max-w-5xl mx-auto sm:px-4 py-4 pb-20">
            <div class="grid gap-2">
              @for (c of crags; track c.id) {
                <app-crag-card [crag]="c" />
              }
            </div>
          </section>
        }
      </ng-template>
    </div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow min-h-0 overflow-hidden',
  },
})
export class ExploreComponent {
  protected readonly global = inject(GlobalData);
  protected readonly router = inject(Router);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  protected readonly tourDescription = computed(() => {
    const step = this.tourService.step();
    switch (step) {
      case TourStep.EXPLORE_AREAS:
        return 'tour.explore.areasDescription';
      default:
        return 'tour.explore.description';
    }
  });
  private readonly filtersService = inject(FiltersService);
  private readonly parkingsService = inject(ParkingsService);
  protected readonly areasService = inject(AreasService);
  private readonly _platformId = inject(PLATFORM_ID);

  protected readonly mapLocationUrl = mapLocationUrl;

  constructor() {
    this.global.resetDataByPage('explore');
  }

  protected readonly stops = ['6.5rem'] as const;

  protected readonly sheetRef: Signal<ElementRef<HTMLElement> | undefined> =
    viewChild('sheet', { read: ElementRef });

  private readonly _sheetClientHeight: WritableSignal<number> = signal(0);
  protected readonly _sheetScrollTop: WritableSignal<number> = signal(0);

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
      return isGradeRangeOverlap(byLabel, selMin, selMax);
    };

    const matchesShade = (c: MapCragItem): boolean => {
      return matchesShadeFilter(c, shade);
    };

    return items
      .filter((item): item is MapCragItem => {
        const isCrag = (item as MapAreaItem).area_type !== 0;
        if (!isCrag) return false;
        const c = item as MapCragItem;
        return (
          withinSelectedCategories(c) &&
          overlapsSelectedGrades(c) &&
          matchesShade(c)
        );
      })
      .sort((a, b) => (a.liked === b.liked ? 0 : a.liked ? -1 : 1));
  });

  protected mapIndoorItems: Signal<MapIndoorCenterItem[]> = computed(() => {
    const items = this.global.mapItemsOnViewport();
    return items.filter(
      (it): it is MapIndoorCenterItem =>
        !!it && 'latitude' in it && 'id' in it && typeof it.id === 'string'
    );
  });

  protected mapAreaItems: Signal<MapAreaItem[]> = computed(() => {
    const items = this.global.mapItemsOnViewport();
    const categories = this.global.areaListCategories();
    const [selMin, selMax] = this.global.areaListGradeRange();
    const shade = this.global.areaListShade() || [];

    const withinSelectedCategories = (a: MapAreaItem): boolean => {
      if (!categories.length) return true;
      const kinds = a.climbing_kind || [];
      const idxToKind: Record<number, string> = {
        0: ClimbingKinds.SPORT,
        1: ClimbingKinds.BOULDER,
        2: ClimbingKinds.MULTIPITCH,
      };
      const allowedKinds = categories.map((i) => idxToKind[i]).filter(Boolean);
      return kinds.some((k) => allowedKinds.includes(k));
    };

    const overlapsSelectedGrades = (a: MapAreaItem): boolean => {
      const byLabel = normalizeRoutesByGrade(a.grades || {});
      return isGradeRangeOverlap(byLabel, selMin, selMax);
    };

    const matchesShade = (a: MapAreaItem): boolean => {
      return matchesShadeFilter(a, shade);
    };

    return items
      .filter((item): item is MapAreaItem => {
        const isArea = (item as MapAreaItem).area_type === 0;
        if (!isArea) return false;
        const a = item as MapAreaItem;
        return (
          withinSelectedCategories(a) &&
          overlapsSelectedGrades(a) &&
          matchesShade(a)
        );
      })
      .sort((a, b) => (a.liked === b.liked ? 0 : a.liked ? -1 : 1));
  });

  protected readonly hasBottomSheet = computed(() => {
    const loading =
      this.global.mapResource.isLoading() ||
      this.global.areasMapResource.isLoading();
    if (loading) return false;
    const cragsCount = this.mapCragItems().length;
    const areasCount = this.mapAreaItems().length;
    const indoorsCount = this.mapIndoorItems().length;
    return (
      (areasCount > 0 || cragsCount > 0 || indoorsCount > 0) &&
      !this.global.selectedMapCragItem() &&
      !this.global.selectedMapParkingItem() &&
      !this.global.selectedMapIndoorItem()
    );
  });

  protected readonly isBottomSheetExpanded: Signal<boolean> = computed(() => {
    if (!this.global.isMobile()) return true;
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

  protected readonly buttonBottomOffset = computed(() => {
    const isMobile = this.global.isMobile();
    const hasSheet = this.hasBottomSheet();
    const hasSelection =
      !!this.global.selectedMapCragItem() ||
      !!this.global.selectedMapParkingItem() ||
      !!this.global.selectedMapIndoorItem();

    if (hasSelection) {
      return 'calc(100% - 6rem)';
    }

    if (isMobile && hasSheet) {
      return `calc(${this.stops[0]} + 1.5rem)`;
    }

    return '1rem';
  });

  protected unifyVisibleAreas(): void {
    const visibleAreaIds = new Set(
      this.global.areasMapResource.value()?.map((ma) => ma.id),
    );
    const visibleAreas = this.global
      .areaList()
      .filter((a) => visibleAreaIds.has(a.id));
    this.areasService.openUnifyAreas(visibleAreas);
  }

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
      (event?.target as HTMLElement) || this.sheetRef()?.nativeElement;
    if (!target) return;
    this.updateBottomSheetScrollSignals(target);
  }

  protected setBottomSheet(mode: 'open' | 'close' | 'toggle' = 'toggle'): void {
    if (!this.global.isMobile()) {
      return;
    }

    if (!isPlatformBrowser(this._platformId) || typeof window === 'undefined') {
      return;
    }

    const hadSelectedMapItem =
      !!this.global.selectedMapCragItem() ||
      !!this.global.selectedMapParkingItem();

    if (hadSelectedMapItem && mode !== 'open') {
      this.global.selectedMapCragItem.set(null);
      this.global.selectedMapParkingItem.set(null);
    this.global.selectedMapIndoorItem.set(null);
    }

    const el = this.sheetRef()?.nativeElement;
    if (!el) {
      window.requestAnimationFrame(() => {
        const node = this.sheetRef()?.nativeElement;
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
      const nodeA = this.sheetRef()?.nativeElement || el;
      window.requestAnimationFrame(() => doScroll(nodeA));
    });
  }

  protected selectMapCragItem(mapCragItem: MapCragItem | null): void {
    if (!mapCragItem) return;
    this.global.selectedMapParkingItem.set(null);
    this.global.selectedMapIndoorItem.set(null);
    this.global.selectedMapCragItem.set(mapCragItem);
    if (this.global.isMobile()) {
      this.setBottomSheet('open');
    }
  }

  protected selectMapParkingItem(parkingItem: ParkingDto | null): void {
    if (!parkingItem) return;
    this.global.selectedMapCragItem.set(null);
    this.global.selectedMapParkingItem.set(parkingItem);
    if (this.global.isMobile()) {
      this.setBottomSheet('open');
    }
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
