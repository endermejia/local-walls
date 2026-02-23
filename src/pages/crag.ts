import { AsyncPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiIcon,
  TuiLabel,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
  TuiDropdown,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiTabs,
  TuiPulse,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  AmountByEveryGrade,
  ClimbingKinds,
  type CragDetail,
  LABEL_TO_VERTICAL_LIFE,
  ORDERED_GRADE_VALUES,
  ParkingDto,
  RouteWithExtras,
  SearchRouteItem,
  type TopoListItem,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';
import { EightAnuService } from '../services/eight-anu.service';

import { CragsService } from '../services/crags.service';
import { FiltersService } from '../services/filters.service';
import { GlobalData } from '../services/global-data';
import { ParkingsService } from '../services/parkings.service';
import { RoutesService } from '../services/routes.service';
import { SupabaseService } from '../services/supabase.service';
import { ToastService } from '../services/toast.service';
import { ToposService } from '../services/topos.service';
import { TourService, TourStep } from '../services/tour.service';

import { TopoImagePipe } from '../pipes';

import { ChartRoutesByGradeComponent } from '../components/chart-routes-by-grade';
import { EmptyStateComponent } from '../components/empty-state';
import { GradeComponent } from '../components/avatar-grade';
import { RoutesTableComponent } from '../components/routes-table';
import { SectionHeaderComponent } from '../components/section-header';
import { TourHintComponent } from '../components/tour-hint';
import { WeatherForecastComponent } from '../components/weather-forecast';

import { handleErrorToast, mapLocationUrl, slugify } from '../utils';

@Component({
  selector: 'app-crag',
  imports: [
    AsyncPipe,
    ChartRoutesByGradeComponent,
    EmptyStateComponent,
    GradeComponent,
    FormsModule,
    LowerCasePipe,
    RoutesTableComponent,
    SectionHeaderComponent,
    TourHintComponent,
    WeatherForecastComponent,
    TopoImagePipe,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiDataList,
    TuiHeader,
    TuiIcon,
    TuiLabel,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiSwipe,
    TuiTabs,
    TuiTextfield,
    TuiTitle,
    TuiDropdown,
    TuiPulse,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section
        (tuiSwipe)="onSwipe($event)"
        class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full"
      >
        @let isAdmin = global.isAdmin();
        @if (cragDetail(); as c) {
          @let isEquipper = global.permissions.areaEquipper()[c.area_id];

          <ng-template #cragSwitcher>
            <tui-data-list>
              @for (cragItem of sortedCrags(); track cragItem.id) {
                <button
                  tuiOption
                  new
                  (click)="
                    router.navigate(['/area', areaSlug(), cragItem.slug])
                  "
                >
                  {{ cragItem.name }}
                </button>
              }
            </tui-data-list>
          </ng-template>

          <div class="mb-6">
            <app-section-header
              [title]="c.name"
              [liked]="c.liked"
              [titleDropdown]="cragSwitcher"
              (toggleLike)="onToggleLike()"
            >
              <!-- Admin/Creator action buttons -->
              @if (global.canEditCrag()) {
                <div actionButtons class="flex gap-2">
                  <button
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    tuiIconButton
                    type="button"
                    class="!rounded-full"
                    (click.zoneless)="openEditCrag()"
                  >
                    {{ 'actions.edit' | translate }}
                  </button>
                  @if (isAdmin) {
                    <button
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      tuiIconButton
                      type="button"
                      class="!rounded-full"
                      (click.zoneless)="deleteCrag()"
                    >
                      {{ 'actions.delete' | translate }}
                    </button>
                  }
                </div>
              }
            </app-section-header>
          </div>

          <div class="flex flex-col md:flex-row md:justify-between gap-4">
            <div class="flex flex-col gap-3 grow">
              @let lang = global.selectedLanguage();
              @let desc = lang === 'es' ? c.description_es : c.description_en;
              @let warn = lang === 'es' ? c.warning_es : c.warning_en;

              @if (desc) {
                <p class="text-lg">{{ desc }}</p>
              }

              @if (c.approach) {
                <div class="flex w-fit items-center gap-1 opacity-70">
                  <tui-icon icon="@tui.footprints" />
                  <span class="text-lg font-medium whitespace-nowrap">
                    {{ c.approach }}
                    min.
                  </span>
                </div>
              }

              @if (warn) {
                <tui-notification appearance="warning">
                  {{ warn }}
                </tui-notification>
              }

              <div
                class="flex flex-row flex-wrap justify-between items-center gap-2"
              >
                @if (c.latitude && c.longitude) {
                  <div class="flex flex-col md:flex-row gap-2 items-start">
                    <button
                      tuiButton
                      appearance="flat"
                      size="m"
                      type="button"
                      (click.zoneless)="viewOnMap(c.latitude, c.longitude)"
                      [iconStart]="'@tui.map-pin'"
                    >
                      {{ 'actions.viewOnMap' | translate }}
                    </button>
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
                            latitude: c.latitude,
                            longitude: c.longitude,
                          })
                        )
                      "
                      [attr.aria-label]="'actions.openGoogleMaps' | translate"
                    >
                      {{ 'actions.openGoogleMaps' | translate }}
                    </button>
                  </div>
                }
                <app-chart-routes-by-grade
                  class="md:hidden self-end"
                  [grades]="c.grades"
                />
              </div>
            </div>
            <app-chart-routes-by-grade
              class="hidden md:block self-end"
              [grades]="c.grades"
            />
          </div>

          @if (visibleTabs().length > 1) {
            <tui-tabs
              [activeItemIndex]="activeTabIndex()"
              (activeItemIndexChange)="activeTabIndex.set($event)"
              class="mt-6"
              [tuiDropdown]="tourHint"
              [tuiDropdownManual]="
                tourService.isActive() &&
                (tourService.step() === TourStep.CRAG ||
                  tourService.step() === TourStep.CRAG_TOPOS ||
                  tourService.step() === TourStep.CRAG_PARKINGS ||
                  tourService.step() === TourStep.CRAG_WEATHER)
              "
              tuiDropdownDirection="top"
            >
              @for (tabIdx of visibleTabs(); track tabIdx) {
                <button tuiTab class="relative">
                  @if (
                    tourService.isActive() &&
                    ((tabIdx === 0 && tourService.step() === TourStep.CRAG) ||
                      (tabIdx === 1 &&
                        tourService.step() === TourStep.CRAG_TOPOS) ||
                      (tabIdx === 2 &&
                        tourService.step() === TourStep.CRAG_PARKINGS) ||
                      (tabIdx === 3 &&
                        tourService.step() === TourStep.CRAG_WEATHER))
                  ) {
                    <tui-pulse />
                  }
                  {{
                    (tabIdx === 0
                      ? 'labels.routes'
                      : tabIdx === 1
                        ? 'labels.topos'
                        : tabIdx === 2
                          ? 'labels.parkings'
                          : 'weather.title'
                    ) | translate
                  }}
                </button>
              }
            </tui-tabs>
          }

          <div class="mt-6">
            @let currentTab = visibleTabs()[activeTabIndex()];
            @switch (currentTab) {
              @case (0) {
                <!-- Routes -->
                <div class="flex items-center justify-between gap-2 mb-4">
                  <div class="flex items-center w-full sm:w-auto gap-2">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      src="@tui.route"
                      class="self-center"
                      [attr.aria-label]="'labels.routes' | translate"
                    />
                    <h2 class="text-2xl font-semibold">
                      {{ routesCount() }}
                      {{ 'labels.routes' | translate | lowercase }}
                    </h2>
                  </div>
                  @if (global.editingMode()) {
                    <div
                      class="flex gap-2 flex-wrap sm:flex-nowrap justify-end"
                    >
                      @if (isAdmin || isEquipper) {
                        <button
                          tuiButton
                          appearance="textfield"
                          size="s"
                          type="button"
                          (click.zoneless)="routesService.openUnifyRoutes()"
                          [iconStart]="'@tui.blend'"
                        >
                          {{ 'actions.unify' | translate }}
                        </button>
                      }
                      <button
                        tuiButton
                        appearance="textfield"
                        size="s"
                        type="button"
                        (click.zoneless)="openCreateRoute()"
                        [iconStart]="'@tui.plus'"
                      >
                        {{ 'actions.new' | translate }}
                      </button>
                    </div>
                  }
                </div>

                <div class="mb-4 flex items-end gap-2">
                  <tui-textfield class="grow block" tuiTextfieldSize="l">
                    <label tuiLabel for="routes-search">{{
                      'labels.searchPlaceholder' | translate
                    }}</label>
                    <input
                      tuiTextfield
                      #routesSearch
                      id="routes-search"
                      autocomplete="off"
                      [value]="query()"
                      (input.zoneless)="onQuery(routesSearch.value)"
                    />
                  </tui-textfield>
                  <tui-badged-content>
                    @if (hasActiveFilters()) {
                      <tui-badge-notification
                        tuiAppearance="accent"
                        size="s"
                        tuiSlot="top"
                      />
                    }
                    <button
                      tuiButton
                      appearance="textfield"
                      size="l"
                      type="button"
                      iconStart="@tui.sliders-horizontal"
                      [attr.aria-label]="'labels.filters' | translate"
                      (click.zoneless)="openFilters()"
                    ></button>
                  </tui-badged-content>
                </div>

                @let routesList = filteredRoutes();
                @let isSearchingAnu = eightAnuResource.isLoading();
                @let anuResults = eightAnuResource.value() || [];

                @if (routesList.length > 0) {
                  <app-routes-table [data]="routesList" />
                }

                @if (
                  global.editingMode() &&
                  query().length >= 2 &&
                  routesList.length === 0
                ) {
                  @if (isSearchingAnu) {
                    <div
                      class="flex flex-col items-center justify-center p-8 gap-4"
                    >
                      <tui-loader size="m" />
                      <span class="text-sm opacity-60">
                        {{ 'actions.loading' | translate }} 8a.nu...
                      </span>
                    </div>
                  } @else if (anuResults.length > 0) {
                    <div class="flex flex-col gap-3 mt-4">
                      <div class="flex items-center gap-2 opacity-70 mb-2">
                        <tui-icon [icon]="global.iconSrc()('8anu')" />
                        <span class="font-medium">
                          {{ 'labels.eightAnuResults' | translate }}
                        </span>
                      </div>
                      @for (item of anuResults; track item.zlaggableId) {
                        <div
                          tuiAppearance="flat"
                          class="p-4 rounded-3xl flex items-center justify-between gap-4"
                        >
                          <div class="flex flex-col gap-1 min-w-0">
                            <div class="flex items-center gap-2">
                              <app-grade
                                [grade]="mapEightAnuGrade(item.difficulty)"
                              />
                              <span class="font-bold truncate">
                                {{ item.zlaggableName }}
                              </span>
                            </div>
                            <span class="text-xs opacity-60 truncate">
                              {{ item.cragName }} · {{ item.sectorName }}
                            </span>
                          </div>
                          <button
                            tuiButton
                            appearance="textfield"
                            size="s"
                            type="button"
                            iconStart="@tui.download"
                            (click.zoneless)="importRoute(item)"
                          >
                            {{ 'actions.import' | translate }}
                          </button>
                        </div>
                      }
                    </div>
                  }
                }

                @if (
                  routesList.length === 0 &&
                  (!global.editingMode() ||
                    query().length < 2 ||
                    (!isSearchingAnu && anuResults.length === 0))
                ) {
                  <app-empty-state icon="@tui.list" />
                }
              }
              @case (1) {
                <!-- Topos -->
                @let toposCount = c.topos.length;
                <div class="flex items-center justify-between gap-2 mb-4">
                  <div class="flex items-center gap-2">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      [src]="global.iconSrc()('topo')"
                      class="self-center"
                      [attr.aria-label]="'labels.topo' | translate"
                    />
                    <h2 class="text-2xl font-semibold">
                      {{ toposCount }}
                      {{
                        'labels.' + (toposCount === 1 ? 'topo' : 'topos')
                          | translate
                          | lowercase
                      }}
                    </h2>
                  </div>
                  @if (global.editingMode()) {
                    <button
                      tuiButton
                      appearance="textfield"
                      size="s"
                      type="button"
                      (click.zoneless)="openCreateTopo()"
                      [iconStart]="'@tui.plus'"
                    >
                      {{ 'actions.new' | translate }}
                    </button>
                  }
                </div>
                <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
                  @for (t of topos(); track t.id) {
                    <button
                      class="p-6 rounded-3xl"
                      tuiAppearance="outline"
                      (click.zoneless)="
                        router.navigate([
                          '/area',
                          areaSlug(),
                          cragSlug(),
                          'topo',
                          t.id,
                        ])
                      "
                    >
                      <div class="flex flex-col min-w-0 grow gap-2">
                        <header tuiHeader>
                          <h2 tuiTitle>{{ t.name }}</h2>
                        </header>
                        <section class="flex flex-col gap-2">
                          @if (t.photo; as photo) {
                            <img
                              [src]="
                                (photo | topoImage | async) ||
                                global.iconSrc()('topo')
                              "
                              alt="topo"
                              class="w-full h-48 object-cover rounded shadow-sm"
                              [attr.loading]="'lazy'"
                              decoding="async"
                            />
                          }
                          <div
                            class="flex items-center justify-between gap-2 mt-auto"
                          >
                            <div
                              class="flex items-center justify-between gap-2"
                            >
                              @let shade = getShadeInfo(t);
                              <tui-icon
                                [icon]="shade.icon"
                                class="opacity-70 text-xl"
                              />
                              <span class="text-sm opacity-80">
                                {{ shade.label | translate }}
                                @if (t.shade_change_hour) {
                                  · {{ 'filters.shade.changeAt' | translate }}
                                  {{ t.shade_change_hour }}
                                }
                              </span>
                            </div>
                            <app-chart-routes-by-grade
                              [grades]="t.grades"
                              (click)="$event.stopPropagation()"
                            />
                          </div>
                        </section>
                      </div>
                    </button>
                  } @empty {
                    <div class="col-span-full">
                      <app-empty-state icon="@tui.image" />
                    </div>
                  }
                </div>
              }
              @case (2) {
                <!-- Parkings -->
                <div class="flex items-center justify-between gap-2 mb-4">
                  <div class="flex items-center w-full sm:w-auto gap-2">
                    <tui-avatar
                      tuiThumbnail
                      size="l"
                      src="@tui.parking-square"
                      class="self-center"
                      [attr.aria-label]="'labels.parkings' | translate"
                    />
                    <h2 class="text-2xl font-semibold">
                      {{ 'labels.parkings' | translate }}
                    </h2>
                  </div>
                  @if (global.editingMode()) {
                    <div
                      class="flex gap-2 flex-wrap sm:flex-nowrap justify-end"
                    >
                      <button
                        tuiButton
                        appearance="textfield"
                        size="s"
                        type="button"
                        (click.zoneless)="openLinkParking()"
                        [iconStart]="'@tui.link'"
                      >
                        {{ 'actions.link' | translate }}
                      </button>
                      <button
                        tuiButton
                        appearance="textfield"
                        size="s"
                        type="button"
                        (click.zoneless)="openCreateParking()"
                        [iconStart]="'@tui.plus'"
                      >
                        {{ 'actions.new' | translate }}
                      </button>
                    </div>
                  }
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  @for (p of c.parkings; track p.id) {
                    <div
                      tuiAppearance="flat"
                      class="p-4 rounded-3xl flex flex-col justify-between"
                    >
                      <div class="flex flex-col gap-3">
                        <div class="flex items-start justify-between gap-2 ">
                          <div class="flex flex-wrap gap-2">
                            <span tuiTitle class="!text-lg">{{ p.name }}</span>
                          </div>

                          @if (p.size) {
                            <div
                              class="flex flex-nowrap items-center gap-1 opacity-80 whitespace-nowrap"
                            >
                              <tui-icon icon="@tui.car" />
                              <span class="text-lg"> x {{ p.size }} </span>
                            </div>
                          }

                          @if (isAdmin || isEquipper) {
                            <div class="flex gap-1">
                              <button
                                size="s"
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="openEditParking(p)"
                              >
                                {{ 'actions.edit' | translate }}
                              </button>
                              <button
                                size="s"
                                appearance="negative"
                                iconStart="@tui.unlink"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="removeParking(p)"
                              >
                                {{ 'actions.unlink' | translate }}
                              </button>
                            </div>
                          }
                        </div>

                        @if (p.latitude && p.longitude) {
                          <div class="flex flex-wrap gap-2 mt-2">
                            <button
                              tuiButton
                              appearance="secondary"
                              size="s"
                              type="button"
                              class="!rounded-full"
                              (click.zoneless)="
                                viewOnMap(p.latitude, p.longitude)
                              "
                              [iconStart]="'@tui.map-pin'"
                            >
                              {{ 'actions.viewOnMap' | translate }}
                            </button>
                            <button
                              appearance="secondary"
                              size="s"
                              tuiButton
                              type="button"
                              class="!rounded-full lw-icon-50"
                              [iconStart]="'/image/google-maps.svg'"
                              (click.zoneless)="
                                openExternal(
                                  mapLocationUrl({
                                    latitude: p.latitude,
                                    longitude: p.longitude,
                                  })
                                )
                              "
                              [attr.aria-label]="
                                'actions.openGoogleMaps' | translate
                              "
                            >
                              {{ 'actions.openGoogleMaps' | translate }}
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  } @empty {
                    <div class="col-span-full">
                      <app-empty-state icon="@tui.car" />
                    </div>
                  }
                </div>
              }
              @case (3) {
                <app-weather-forecast
                  [coords]="{ lat: c.latitude, lng: c.longitude }"
                />
              }
            }
          </div>
        } @else {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </tui-scrollbar>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="
          (tourService.step() === TourStep.CRAG
            ? 'tour.crag.routesDescription'
            : tourService.step() === TourStep.CRAG_TOPOS
              ? 'tour.crag.toposDescription'
              : tourService.step() === TourStep.CRAG_PARKINGS
                ? 'tour.crag.parkingsDescription'
                : 'tour.crag.weatherDescription'
          ) | translate
        "
        (next)="tourService.next()"
      />
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class CragComponent {
  protected readonly global = inject(GlobalData);
  protected readonly activeTabIndex = signal(0);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly routesService = inject(RoutesService);
  protected readonly parkingsService = inject(ParkingsService);
  protected readonly cragsService = inject(CragsService);
  protected readonly toposService = inject(ToposService);
  protected readonly eightAnuService = inject(EightAnuService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly platformId = inject(PLATFORM_ID);
  protected readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);
  protected readonly dialogs = inject(TuiDialogService);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;

  protected readonly mapLocationUrl = mapLocationUrl;

  protected onSwipe(event: TuiSwipeEvent): void {
    const direction = event.direction;
    const currentIndex = this.activeTabIndex();
    const maxIndex = this.visibleTabs().length - 1;
    if (direction === 'left' && currentIndex < maxIndex) {
      this.activeTabIndex.set(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      this.activeTabIndex.set(currentIndex - 1);
    }
  }

  readonly showRoutesTab = computed(() => {
    const isAdmin = this.global.isAdmin();
    const isEquipper = this.global.isAllowedEquipper(
      this.cragDetail()?.area_id,
    );
    return (
      (this.global.cragRoutesResource.value()?.length ?? 0) > 0 ||
      isAdmin ||
      isEquipper
    );
  });

  readonly showToposTab = computed(() => {
    const isAdmin = this.global.isAdmin();
    const isEquipper = this.global.isAllowedEquipper(
      this.cragDetail()?.area_id,
    );
    return (this.cragDetail()?.topos?.length ?? 0) > 0 || isAdmin || isEquipper;
  });
  readonly showParkingsTab = computed(() => {
    const isAdmin = this.global.isAdmin();
    const isEquipper = this.global.isAllowedEquipper(
      this.cragDetail()?.area_id,
    );
    return (
      (this.cragDetail()?.parkings?.length ?? 0) > 0 || isAdmin || isEquipper
    );
  });

  readonly showWeatherTab = computed(() => {
    const c = this.cragDetail();
    return !!(c?.latitude && c?.longitude);
  });

  readonly visibleTabs = computed(() => {
    const tabs = [];
    if (this.showRoutesTab()) tabs.push(0);
    if (this.showToposTab()) tabs.push(1);
    if (this.showParkingsTab()) tabs.push(2);
    if (this.showWeatherTab()) tabs.push(3);
    return tabs;
  });

  areaSlug: InputSignal<string> = input.required<string>();
  cragSlug: InputSignal<string> = input.required<string>();
  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.global.areaListGradeRange;
  readonly selectedCategories = this.global.areaListCategories;

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.selectedCategories().length > 0 ||
      this.query().trim().length > 0
    );
  });

  readonly filteredRoutes = computed(() => {
    const q = this.query().trim().toLowerCase();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const categories = this.selectedCategories();
    const list = this.global.cragRoutesResource.value() ?? [];

    const textMatches = (r: RouteWithExtras) => {
      if (!q) return true;
      const nameMatch = r.name.toLowerCase().includes(q);
      const gradeLabel =
        VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      const gradeMatch = gradeLabel?.toLowerCase().includes(q);
      return nameMatch || gradeMatch;
    };

    const gradeMatches = (r: RouteWithExtras) => {
      const label = VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      if (!label) return true;
      return (allowedLabels as readonly string[]).includes(label);
    };

    const categoryMatches = (r: RouteWithExtras) => {
      if (categories.length === 0) return true;
      const kind = r.climbing_kind;
      if (!kind) return true;
      // 0=Sport, 1=Boulder, 2=Multipitch (from FilterDialog)
      if (categories.includes(0) && kind === ClimbingKinds.SPORT) return true;
      if (categories.includes(1) && kind === ClimbingKinds.BOULDER) return true;
      return categories.includes(2) && kind === ClimbingKinds.MULTIPITCH;
    };

    return list.filter(
      (r) => textMatches(r) && gradeMatches(r) && categoryMatches(r),
    );
  });

  protected readonly eightAnuResource = resource({
    params: () => {
      const q = this.query().trim();
      const crag = this.cragDetail();
      const editing = this.global.editingMode();
      const routesCount = this.filteredRoutes().length;

      if (editing && q.length >= 2 && crag && routesCount === 0) {
        return { q, crag: crag.name };
      }
      return null;
    },
    loader: async ({ params }): Promise<SearchRouteItem[]> => {
      if (!params) return [];
      console.log('[8a.nu] Searching routes for:', params.q, 'in', params.crag);
      const results = await this.eightAnuService.searchRoutes(
        `${params.q} ${params.crag}`,
      );
      const localRoutes = this.global.cragRoutesResource.value() || [];
      const updatedSlugs = new Set(
        localRoutes.flatMap((r) => r.eight_anu_route_slugs || []),
      );

      for (const item of results) {
        const itemSlug = slugify(item.zlaggableName);
        if (updatedSlugs.has(itemSlug)) continue;

        const matchingLocals = localRoutes.filter(
          (r) => slugify(r.name) === itemSlug,
        );

        if (matchingLocals.length > 0) {
          for (const local of matchingLocals) {
            const currentSlugs = local.eight_anu_route_slugs || [];
            if (!currentSlugs.includes(itemSlug)) {
              console.log(
                '[8a.nu] Auto-linking route:',
                local.name,
                'with slug:',
                itemSlug,
              );
              await this.routesService.update(
                local.id,
                {
                  eight_anu_route_slugs: [...currentSlugs, itemSlug],
                },
                true,
              );
            }
          }
          updatedSlugs.add(itemSlug);
        }
      }

      return results.filter((item) => {
        const itemSlug = slugify(item.zlaggableName);
        return !updatedSlugs.has(itemSlug);
      });
    },
  });

  protected mapEightAnuGrade(
    difficulty: string | undefined,
  ): VERTICAL_LIFE_GRADES {
    if (!difficulty) return VERTICAL_LIFE_GRADES.G0;
    const label = difficulty.toLowerCase().replace(' ', '');
    return (
      LABEL_TO_VERTICAL_LIFE[label as keyof typeof LABEL_TO_VERTICAL_LIFE] ??
      VERTICAL_LIFE_GRADES.G0
    );
  }

  protected importRoute(item: SearchRouteItem): void {
    const crag = this.cragDetail();
    if (!crag) return;

    this.routesService.openRouteForm({
      cragId: crag.id,
      routeData: {
        id: 0,
        crag_id: crag.id,
        name: item.zlaggableName,
        slug: '',
        grade: this.mapEightAnuGrade(item.difficulty),
        climbing_kind: ClimbingKinds.SPORT,
        height: null,
        eight_anu_route_slugs: [slugify(item.zlaggableName)],
      },
    });
  }

  readonly loading = this.cragsService.loading;
  protected readonly sortedCrags = computed(() => {
    const list = this.global.cragsList() || [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  });

  protected readonly cragDetail = computed<CragDetail | null>(() => {
    const c = this.global.cragDetailResource.value();
    if (!c) return null;

    // Compute grades from routes
    const routes = this.global.cragRoutesResource.value() ?? [];
    const gradesVal: AmountByEveryGrade = {};
    for (const r of routes) {
      if (r.grade >= 0) {
        const g = r.grade as VERTICAL_LIFE_GRADES; // Cast number to enum
        gradesVal[g] = (gradesVal[g] ?? 0) + 1;
      }
    }

    // Return CragDetail
    return {
      ...c,
      grades: gradesVal,
    };
  });

  protected readonly routesCount = computed(() => this.filteredRoutes().length);

  protected readonly topos = computed(() => {
    const c = this.cragDetail();
    if (!c) return [];
    return c.topos;
  });

  constructor() {
    effect(() => {
      const step = this.tourService.step();
      const tabs = this.visibleTabs();
      if (!tabs.length) return;

      if (step === TourStep.CRAG) {
        if (tabs.includes(0)) this.activeTabIndex.set(tabs.indexOf(0));
      } else if (step === TourStep.CRAG_TOPOS) {
        if (tabs.includes(1)) this.activeTabIndex.set(tabs.indexOf(1));
      } else if (step === TourStep.CRAG_PARKINGS) {
        if (tabs.includes(2)) this.activeTabIndex.set(tabs.indexOf(2));
      } else if (step === TourStep.CRAG_WEATHER) {
        if (tabs.includes(3)) this.activeTabIndex.set(tabs.indexOf(3));
      }
    });

    // Synchronize the selected area /crag in global state from route
    effect(() => {
      const aSlug = this.areaSlug();
      const cSlug = this.cragSlug();
      this.global.resetDataByPage('crag');
      this.global.selectedAreaSlug.set(aSlug);
      this.global.selectedCragSlug.set(cSlug);
    });

    effect(() => {
      const tabs = this.visibleTabs();
      if (this.activeTabIndex() >= tabs.length && tabs.length > 0) {
        this.activeTabIndex.set(0);
      }
    });
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters({
      showShade: false,
    });
  }

  openCreateRoute(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.routesService.openRouteForm({ cragId: c.id });
  }

  openCreateParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.parkingsService.openParkingForm({
      cragId: c.id,
      defaultLocation:
        c.latitude && c.longitude
          ? { lat: c.latitude, lng: c.longitude }
          : undefined,
    });
  }

  openLinkParking(): void {
    const c = this.cragDetail();
    if (!c) return;
    const existingParkingIds = c.parkings.map((p) => p.id);
    this.parkingsService.openLinkParkingForm({
      cragId: c.id,
      existingParkingIds,
    });
  }

  openEditParking(parking: ParkingDto): void {
    this.parkingsService.openParkingForm({
      parkingData: parking,
      cragId: this.cragDetail()?.id,
    });
  }

  removeParking(parking: ParkingDto): void {
    const c = this.cragDetail();
    if (!c || !isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('admin.parkings.unlinkTitle'),
        size: 's',
        data: {
          content: this.translate.instant('admin.parkings.unlinkConfirm', {
            name: parking.name,
          }),
          yes: this.translate.instant('actions.unlink'),
          no: this.translate.instant('actions.cancel'),
          appearance: 'accent',
        } as TuiConfirmData,
      }),
    ).then((confirmed) => {
      if (confirmed) {
        this.parkingsService
          .removeParkingFromCrag(c.id, parking.id)
          .catch((err) => handleErrorToast(err, this.toast));
      }
    });
  }

  async viewOnMap(lat: number, lng: number): Promise<void> {
    const area = this.global.selectedArea();
    let minLat = lat;
    let maxLat = lat;
    let minLng = lng;
    let maxLng = lng;

    if (area) {
      await this.supabase.whenReady();
      const { data } = await this.supabase.client
        .from('crags')
        .select('latitude, longitude')
        .eq('area_id', area.id)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (data) {
        data.forEach((c) => {
          if (c.latitude! < minLat) minLat = c.latitude!;
          if (c.latitude! > maxLat) maxLat = c.latitude!;
          if (c.longitude! < minLng) minLng = c.longitude!;
          if (c.longitude! > maxLng) maxLng = c.longitude!;
        });
      }
    }

    this.global.mapBounds.set({
      south_west_latitude: minLat,
      south_west_longitude: minLng,
      north_east_latitude: maxLat,
      north_east_longitude: maxLng,
    });
    void this.router.navigateByUrl('/explore');
  }

  onToggleLike(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const c = this.cragDetail();
    if (!c) return;
    // Optimistic update not possible easily with computed resource without invalidation
    // We just call the API
    this.cragsService.toggleCragLike(c.id).then(() => {
      // Option: reload resource
      // this.global.cragDetailResource.reload();
    });
  }

  async deleteCrag(): Promise<void> {
    const c = this.cragDetail();
    if (!c) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const t = await firstValueFrom(
      this.translate.get(['crags.deleteTitle', 'crags.deleteConfirm'], {
        name: c.name,
      }),
    );
    const title = t['crags.deleteTitle'];
    const message = t['crags.deleteConfirm'];
    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('actions.delete'),
      no: this.translate.instant('actions.cancel'),
      appearance: 'accent',
    };
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: title,
        size: 's',
        data,
      }),
      { defaultValue: false },
    );
    if (!confirmed) return;
    try {
      const ok = await this.cragsService.delete(c.id);
      if (ok) {
        await this.router.navigateByUrl(`/area/${c.area_slug}`);
      }
    } catch (e) {
      const error = e as Error;
      console.error('[CragComponent] Error deleting crag:', error);
      handleErrorToast(error, this.toast);
    }
  }

  openEditCrag(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.cragsService.openCragForm({
      cragData: {
        id: c.id,
        area_id: c.area_id!,
        name: c.name,
        slug: c.slug,
        latitude: c.latitude,
        longitude: c.longitude,
        approach: c.approach,
        description_es: c.description_es,
        description_en: c.description_en,
        warning_es: c.warning_es,
        warning_en: c.warning_en,
      },
    });
  }

  openCreateTopo(): void {
    const c = this.cragDetail();
    if (!c) return;
    this.toposService.openTopoForm({ cragId: c.id });
  }

  protected openExternal(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  protected getShadeInfo(t: TopoListItem) {
    if (t.shade_morning && t.shade_afternoon) {
      return { icon: '@tui.eclipse', label: 'filters.shade.allDay' };
    }
    if (t.shade_morning) {
      return { icon: '@tui.sunset', label: 'filters.shade.morning' };
    }
    if (t.shade_afternoon) {
      return { icon: '@tui.sunrise', label: 'filters.shade.afternoon' };
    }
    return { icon: '@tui.sun', label: 'filters.shade.noShade' };
  }
}
