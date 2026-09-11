import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  resource,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiCarousel,
  TuiCheckbox,
  TuiDialogService,
  TuiHint,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiNotification,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiChevron,
  TuiComboBox,
  TuiConfirmData,
  TuiDataListWrapper,
  TuiTabs,
} from '@taiga-ui/kit';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { BreadcrumbsService } from '../../services/breadcrumbs.service';
import { CacheService } from '../../services/cache.service';
import { FilterStateService } from '../../services/filter-state.service';
import { FiltersService } from '../../services/filters.service';
import { IndoorCentersDataService } from '../../services/indoor-centers-data.service';
import { IndoorService } from '../../services/indoor.service';
import { MapDataService } from '../../services/map-data.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { UserProfilesService } from '../../services/user-profiles.service';

import { AscentCardComponent } from '../../components/ascent/ascent-card';
import { IndoorToposComponent } from '../../components/indoor/indoor-topos';
import { IndoorVouchersComponent } from '../../components/indoor/indoor-vouchers';
import { IndoorRoutesTableComponent } from '../../components/route/indoor-routes-table';
import {
  CustomCarouselComponent,
  CarouselItem,
} from '../../components/ui/custom-carousel';
import { EmptyStateComponent } from '../../components/ui/empty-state';
import { SectionHeaderComponent } from '../../components/ui/section-header';
import { UserInfoHintComponent } from '../../components/ui/user-info-hint';

import {
  ClimbingKinds,
  GRADE_NUMBER_TO_LABEL,
  IndoorCenterDto,
  IndoorRouteWithExtras,
  ORDERED_GRADE_VALUES,
  PROJECT_GRADE_LABEL,
  RouteAscentWithExtras,
  UserProfileBasicDto,
  VERTICAL_LIFE_GRADES,
} from '../../models';

import { CACHE_KEYS } from '../../constants';
import { AnyToSchedulePipe, AvatarUrlPipe } from '../../pipes';
import { handleErrorToast, mapLocationUrl, matchesQuery } from '../../utils';

import { IS_BROWSER } from '../../app/is-browser';

@Component({
  selector: 'app-indoor-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TuiAppearance,
    TuiAvatar,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiCarousel,
    TuiCheckbox,
    TuiChevron,
    TuiComboBox,
    TuiDataListWrapper,
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiLoader,
    TuiNotification,
    TuiScrollbar,
    TuiTabs,
    TuiTextfield,
    RouterLink,
    SectionHeaderComponent,
    IndoorVouchersComponent,
    IndoorRoutesTableComponent,
    IndoorToposComponent,
    AnyToSchedulePipe,
    CustomCarouselComponent,
    AvatarUrlPipe,
    EmptyStateComponent,
    AscentCardComponent,
    UserInfoHintComponent,
  ],
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 flex flex-col min-h-full">
        @if (center(); as c) {
          <div class="mb-6">
            <app-section-header [title]="c.name" [showLike]="false">
              <span
                titleInfo
                class="flex items-center gap-1 text-sm font-normal text-(--tui-text-secondary) mt-1.5 select-none"
              >
                <tui-icon icon="@tui.map-pin" />
                <span>{{ c.city }}</span>
              </span>

              <div actionButtons class="flex gap-2">
                @if (canEdit()) {
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    class="rounded-full!"
                    type="button"
                    (click)="openEditCenter()"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (isAdmin()) {
                    <button
                      tuiIconButton
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      class="rounded-full!"
                      type="button"
                      (click.zoneless)="deleteCenter()"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                }
              </div>
            </app-section-header>
          </div>

          <div class="flex flex-col md:flex-row gap-6">
            <div class="flex flex-col gap-4 grow">
              <!-- Gallery/Avatar -->
              <div
                class="relative rounded-3xl overflow-hidden aspect-video bg-neutral-100 dark:bg-neutral-800"
              >
                @if (carouselItems().length > 0) {
                  <app-custom-carousel
                    [items]="carouselItems()"
                    [(index)]="galleryIndex"
                    [objectCover]="true"
                    class="h-full w-full"
                  />
                } @else {
                  <div class="flex items-center justify-center h-full">
                    <span
                      [tuiAvatar]="
                        supabase.getPublicUrl('indoor-centers', c.avatar_url)
                      "
                      size="xxl"
                      class="rounded-3xl"
                    ></span>
                  </div>
                }
              </div>

              <div class="flex flex-col gap-2">
                @if (c.warning) {
                  <div
                    tuiNotification
                    appearance="warning"
                    class="rounded-2xl mb-2"
                  >
                    {{ c.warning }}
                  </div>
                }
                <p class="text-lg">{{ c.description }}</p>

                @if (c.latitude && c.longitude) {
                  <div class="flex flex-row flex-wrap gap-2 mt-2">
                    <button
                      tuiButton
                      appearance="flat"
                      size="m"
                      type="button"
                      (click.zoneless)="viewOnMap(c.latitude, c.longitude)"
                      [iconStart]="'@tui.map-pin'"
                    >
                      {{ 'viewOnMap' | translate }}
                    </button>
                    <button
                      appearance="flat"
                      size="m"
                      tuiButton
                      type="button"
                      [iconStart]="'/image/google-maps.svg'"
                      class="[--tui-icon-size:1.25rem]"
                      (click.zoneless)="
                        openExternal(
                          mapLocationUrl({
                            latitude: c.latitude,
                            longitude: c.longitude,
                          })
                        )
                      "
                      [attr.aria-label]="'openGoogleMaps' | translate"
                    >
                      {{ 'openGoogleMaps' | translate }}
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Sidebar: Schedule & Vouchers -->
            <div class="flex flex-col gap-6 md:w-80 shrink-0">
              <div
                tuiAppearance="flat-grayscale"
                class="p-4 rounded-3xl flex flex-col gap-4"
              >
                <h3 class="font-bold flex items-center gap-2">
                  <tui-icon icon="@tui.clock" />
                  {{ 'indoor.schedule' | translate }}
                </h3>

                @let schedule = c.schedule | anyToSchedule;
                <div class="flex flex-col gap-1 text-sm">
                  @for (
                    day of [
                      'monday',
                      'tuesday',
                      'wednesday',
                      'thursday',
                      'friday',
                      'saturday',
                      'sunday',
                    ];
                    track day
                  ) {
                    <div
                      class="flex justify-between p-1 px-2.5 rounded-lg transition-all"
                      [class.bg-(--tui-background-accent-1)]="
                        day === currentDay
                      "
                      [class.text-(--tui-text-primary-on-accent-1)]="
                        day === currentDay
                      "
                      [class.font-bold]="day === currentDay"
                    >
                      <span class="capitalize">{{ day | translate }}</span>
                      @let s = schedule.normal[day];
                      <span>{{
                        s?.closed
                          ? ('indoor.closed' | translate)
                          : s?.open && s?.close
                            ? s.open +
                              ' - ' +
                              s.close +
                              (s.open2 && s.close2
                                ? ' / ' + s.open2 + ' - ' + s.close2
                                : '')
                            : '-'
                      }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Admins Section -->
          @let admins = centerAdmins();
          @if (canEdit()) {
            <div class="flex flex-col gap-3 mt-6">
              <span
                class="text-xs uppercase opacity-60 font-semibold tracking-wider"
              >
                {{ 'admins' | translate }}
              </span>
              <div class="flex flex-wrap gap-4 items-center">
                @for (admin of admins; track admin.user_id) {
                  <div
                    class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 pr-3 rounded-full border border-(--tui-border-normal) group transition-all hover:bg-(--tui-background-neutral-1-hover) no-underline text-inherit"
                    [class.pl-1]="admin.user.avatar"
                    [class.pl-3]="!admin.user.avatar"
                  >
                    <a
                      [routerLink]="['/profile', admin.user_id]"
                      [tuiHint]="adminUserHint"
                      (contextmenu.zoneless)="$event.preventDefault()"
                      class="flex items-center gap-2 no-underline text-inherit cursor-pointer select-none"
                    >
                      @if (admin.user.avatar) {
                        <span tuiAvatar size="s">
                          <img
                            [src]="admin.user.avatar | avatarUrl"
                            [alt]="admin.user.name"
                          />
                        </span>
                      }
                      <span class="text-sm font-medium">{{
                        admin.user.name
                      }}</span>
                    </a>
                    <ng-template #adminUserHint>
                      <app-user-info-hint
                        [userId]="admin.user_id"
                        [fallbackName]="admin.user.name"
                        [fallbackAvatar]="admin.user.avatar"
                      />
                    </ng-template>
                    @if (canEdit()) {
                      <button
                        tuiIconButton
                        appearance="flat"
                        size="xs"
                        type="button"
                        iconStart="@tui.x"
                        [attr.aria-label]="'delete' | translate"
                        class="opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity -mr-1"
                        (click.zoneless)="
                          removeAdmin(
                            admin.user_id || '',
                            admin.user.name || ''
                          )
                        "
                      ></button>
                    }
                  </div>
                }

                @if (canEdit()) {
                  <div class="w-64">
                    <tui-textfield
                      appearance="floating"
                      size="s"
                      tuiChevron
                      [tuiTextfieldCleaner]="true"
                      [stringify]="stringifyUser"
                      class="rounded-full!"
                    >
                      <label tuiLabel for="admin-search-input">{{
                        'addUser' | translate
                      }}</label>
                      <input
                        id="admin-search-input"
                        tuiComboBox
                        [placeholder]="'searchPlaceholder' | translate"
                        (ngModelChange)="onAdminSelected($event)"
                        [ngModel]="null"
                        (input.zoneless)="
                          userSearchQuery.set(adminSearchInput.value)
                        "
                        #adminSearchInput
                      />
                      <tui-data-list-wrapper
                        *tuiDropdown
                        [items]="foundUsers()"
                      />
                    </tui-textfield>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Routesetters Section -->
          @let routesettersList = centerRoutesetters();
          @if (canEdit()) {
            <div class="flex flex-col gap-3 mt-6">
              <span
                class="text-xs uppercase opacity-60 font-semibold tracking-wider"
              >
                {{ 'routesetters' | translate }}
              </span>
              <div class="flex flex-wrap gap-4 items-center">
                @for (rs of routesettersList; track rs.user_id) {
                  <div
                    class="flex items-center gap-2 bg-(--tui-background-neutral-1) py-1 pr-3 rounded-full border border-(--tui-border-normal) group transition-all hover:bg-(--tui-background-neutral-1-hover) no-underline text-inherit"
                    [class.pl-1]="rs.user.avatar"
                    [class.pl-3]="!rs.user.avatar"
                  >
                    <a
                      [routerLink]="['/profile', rs.user_id]"
                      [tuiHint]="rsUserHint"
                      (contextmenu.zoneless)="$event.preventDefault()"
                      class="flex items-center gap-2 no-underline text-inherit cursor-pointer select-none"
                    >
                      @if (rs.user.avatar) {
                        <span tuiAvatar size="s">
                          <img
                            [src]="rs.user.avatar | avatarUrl"
                            [alt]="rs.user.name"
                          />
                        </span>
                      }
                      <span class="text-sm font-medium">{{
                        rs.user.name
                      }}</span>
                    </a>
                    <ng-template #rsUserHint>
                      <app-user-info-hint
                        [userId]="rs.user_id"
                        [fallbackName]="rs.user.name"
                        [fallbackAvatar]="rs.user.avatar"
                      />
                    </ng-template>
                    @if (canEdit()) {
                      <button
                        tuiIconButton
                        appearance="flat"
                        size="xs"
                        type="button"
                        iconStart="@tui.x"
                        [attr.aria-label]="'delete' | translate"
                        class="opacity-0 group-hover:opacity-50 hover:opacity-100! transition-opacity -mr-1"
                        (click.zoneless)="removeRoutesetter(rs.user_id || '')"
                      ></button>
                    }
                  </div>
                }

                @if (canEdit()) {
                  <div class="w-64">
                    <tui-textfield
                      appearance="floating"
                      size="s"
                      tuiChevron
                      [tuiTextfieldCleaner]="true"
                      [stringify]="stringifyUser"
                      class="rounded-full!"
                    >
                      <label tuiLabel for="routesetter-search-input">{{
                        'addUser' | translate
                      }}</label>
                      <input
                        id="routesetter-search-input"
                        tuiComboBox
                        [placeholder]="'searchPlaceholder' | translate"
                        (ngModelChange)="onRoutesetterSelected($event)"
                        [ngModel]="null"
                        (input.zoneless)="
                          routesetterSearchQuery.set(
                            routesetterSearchInput.value
                          )
                        "
                        #routesetterSearchInput
                      />
                      <tui-data-list-wrapper
                        *tuiDropdown
                        [items]="foundRoutesetterUsers()"
                      />
                    </tui-textfield>
                  </div>
                }
              </div>
            </div>
          }
          <div class="overflow-x-auto no-scrollbar">
            <tui-tabs [(activeItemIndex)]="activeTabIndex">
              <button tuiTab>{{ 'indoor.topos' | translate }}</button>
              <button tuiTab>{{ 'indoor.routes' | translate }}</button>
              <button tuiTab>{{ 'indoor.ascents' | translate }}</button>
              @if (hasVouchers()) {
                <button tuiTab>{{ 'indoor.vouchers' | translate }}</button>
              }
            </tui-tabs>
          </div>

          <div class="mt-6">
            @if (loadedTabs().has(0)) {
              <div
                [hidden]="activeTabIndex() !== 0"
                [class.hidden]="activeTabIndex() !== 0"
              >
                <app-indoor-topos [centerId]="c.id" [centerSlug]="c.slug" />
              </div>
            }
            @if (loadedTabs().has(1)) {
              <div
                [hidden]="activeTabIndex() !== 1"
                [class.hidden]="activeTabIndex() !== 1"
              >
                <div class="flex flex-col gap-4">
                  <div class="flex items-center justify-between px-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input
                        tuiCheckbox
                        type="checkbox"
                        [ngModel]="showLegacyRoutes()"
                        (ngModelChange)="showLegacyRoutes.set($event)"
                        autocomplete="off"
                      />
                      <span class="text-xs opacity-75 select-none">{{
                        'indoor.showLegacyRoutes' | translate
                      }}</span>
                    </label>

                    @if (totalRoutes() > 0) {
                      <div
                        class="flex items-center gap-2 text-xs font-semibold opacity-70"
                      >
                        @if (allCompleted()) {
                          {{ 'indoor.allCompleted' | translate }}
                        } @else {
                          {{
                            'indoor.partialCompleted'
                              | translate
                                : {
                                    completed: totalRoutes() - pendingRoutes(),
                                    total: totalRoutes(),
                                  }
                          }}
                        }
                      </div>
                    }

                    @if (canCreateRoute()) {
                      <button
                        tuiButton
                        appearance="textfield"
                        size="s"
                        iconStart="@tui.plus"
                        (click.zoneless)="createRoute()"
                      >
                        {{ 'new' | translate }}
                      </button>
                    }
                  </div>

                  <div class="flex items-end gap-2">
                    <tui-textfield class="grow block" tuiTextfieldSize="l">
                      <label tuiLabel for="indoor-route-search">{{
                        'searchPlaceholder' | translate
                      }}</label>
                      <input
                        tuiInput
                        #indoorRouteSearch
                        id="indoor-route-search"
                        autocomplete="off"
                        [value]="routeQuery()"
                        (input.zoneless)="
                          routeQuery.set(indoorRouteSearch.value)
                        "
                      />
                    </tui-textfield>
                    <tui-badged-content>
                      @if (hasActiveRouteFilters()) {
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
                        [attr.aria-label]="'filters' | translate"
                        (click.zoneless)="openRouteFilters()"
                      ></button>
                    </tui-badged-content>
                  </div>

                  <app-indoor-routes-table
                    [data]="filteredCenterRoutes()"
                    [centerId]="c.id"
                    [centerSlug]="c.slug"
                    [availableTopos]="toposResource.value() || []"
                  />
                </div>
              </div>
            }
            @if (loadedTabs().has(2)) {
              <div
                [hidden]="activeTabIndex() !== 2"
                [class.hidden]="activeTabIndex() !== 2"
              >
                @let ascents = mappedAscents();
                @if (centerAscentsResource.isLoading()) {
                  <div class="flex items-center justify-center p-8">
                    <tui-loader size="m" />
                  </div>
                } @else {
                  <div
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    @for (ascent of ascents; track ascent.id) {
                      <app-ascent-card
                        [data]="ascent"
                        [showRoute]="true"
                        [showUser]="true"
                      />
                    } @empty {
                      <div class="col-span-full">
                        <app-empty-state />
                      </div>
                    }
                  </div>
                }
              </div>
            }
            @if (loadedTabs().has(3)) {
              <div
                [hidden]="activeTabIndex() !== 3"
                [class.hidden]="activeTabIndex() !== 3"
              >
                <app-indoor-vouchers [centerId]="c.id" />
              </div>
            }
          </div>
        } @else if (centerResource.isLoading()) {
          <div class="flex items-center justify-center w-full min-h-[50vh]">
            <tui-loader size="xxl" />
          </div>
        } @else {
          <div class="text-center p-20">
            <h2 class="text-2xl font-bold">
              {{ 'notFound.title' | translate }}
            </h2>
            <a tuiButton appearance="flat" class="mt-4" routerLink="/home">{{
              'notFound.goHome' | translate
            }}</a>
          </div>
        }
      </section>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class IndoorCenterComponent {
  protected readonly mappedAscents = computed(
    () =>
      (this.centerAscentsResource.value() ??
        []) as unknown as RouteAscentWithExtras[],
  );

  slug = input.required<string>();

  protected readonly authState = inject(AuthStateService);
  protected readonly breadcrumbsService = inject(BreadcrumbsService);
  protected readonly filterState = inject(FilterStateService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly mapData = inject(MapDataService);
  protected readonly indoorCentersData = inject(IndoorCentersDataService);
  protected readonly indoor = inject(IndoorService);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly userProfiles = inject(UserProfilesService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly isBrowser = inject(IS_BROWSER);
  private readonly cache = inject(CacheService);

  protected readonly activeTabIndex = signal(0);
  protected readonly loadedTabs = signal<Set<number>>(new Set([0]));
  protected readonly galleryIndex = signal(0);

  protected readonly carouselItems = computed<CarouselItem[]>(() => {
    const c = this.center();
    if (!c?.gallery_urls) return [];
    return c.gallery_urls.map((url) => ({
      type: 'image',
      url: this.supabase.getPublicUrl('indoor-assets', url),
    }));
  });

  protected readonly center = computed<IndoorCenterDto | null>(
    () => this.centerResource.value() ?? null,
  );

  protected readonly centerResource = resource<IndoorCenterDto | null, string>({
    params: () => this.slug(),
    loader: ({ params: slug }) => this.indoor.getCenterBySlug(slug),
  });

  protected readonly toposResource = resource({
    params: () => this.center()?.id,
    loader: ({ params: id }) =>
      id ? this.indoor.getCenterTopos(id) : Promise.resolve([]),
  });

  protected readonly vouchersResource = resource({
    params: () => this.center()?.id,
    loader: ({ params: id }) =>
      id ? this.indoor.getCenterVouchers(id) : Promise.resolve([]),
  });

  protected readonly hasVouchers = computed(
    () => (this.vouchersResource.value()?.length ?? 0) > 0,
  );

  protected readonly showLegacyRoutes = signal<boolean>(
    typeof window !== 'undefined'
      ? localStorage.getItem('show_legacy_routes') === 'true'
      : false,
  );

  protected readonly centerRoutesResource = resource({
    params: () => ({
      id: this.center()?.id,
      showLegacy: this.showLegacyRoutes(),
      reloadTick: this.indoorCentersData.indoorRoutesReloadTick(),
    }),
    loader: ({ params }) => {
      if (!params.id) return Promise.resolve([]);
      return this.indoor.getCenterRoutes(params.id, params.showLegacy);
    },
  });

  protected readonly centerRoutes = computed(
    () => this.centerRoutesResource.value() ?? [],
  );

  protected readonly routeQuery = signal('');
  protected readonly selectedGradeRange =
    this.filterState.indoorRoutesGradeRange;
  protected readonly selectedCategories =
    this.filterState.indoorRoutesCategories;
  protected readonly selectedToposOnly = this.filterState.indoorRoutesToposOnly;

  protected readonly activeRouteFilterCount = computed(() => {
    let count = 0;
    const [lo, hi] = this.selectedGradeRange();
    if (lo > 0 || hi < ORDERED_GRADE_VALUES.length - 1) {
      count++;
    }
    if (this.selectedCategories().length > 0) {
      count++;
    }
    if (this.selectedToposOnly()) {
      count++;
    }
    return count;
  });

  protected readonly hasActiveRouteFilters = computed(() => {
    return this.activeRouteFilterCount() > 0;
  });

  protected readonly filteredCenterRoutes = computed(() => {
    const routes = this.centerRoutes();
    const query = this.routeQuery().trim();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const categories = this.selectedCategories();
    const toposOnly = this.selectedToposOnly();

    const textMatches = (r: IndoorRouteWithExtras) => {
      if (!query) return true;
      const gradeLabel =
        r.grade != null
          ? GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES]
          : null;
      const equippersNames = (r.equippers || [])
        .map((e) => e.name)
        .filter(Boolean);
      const toposNames = (r.topos || []).map((t) => t.name).filter(Boolean);
      const translatedColor = r.color
        ? this.translate.instant('colors.' + r.color)
        : null;

      return (
        matchesQuery(r.name, query) ||
        (gradeLabel ? matchesQuery(gradeLabel, query) : false) ||
        (r.color ? matchesQuery(r.color, query) : false) ||
        (translatedColor ? matchesQuery(translatedColor, query) : false) ||
        equippersNames.some((name) => matchesQuery(name, query)) ||
        toposNames.some((name) => matchesQuery(name, query))
      );
    };

    const gradeMatches = (r: IndoorRouteWithExtras) => {
      if (minIdx === 0 && maxIdx === ORDERED_GRADE_VALUES.length - 1)
        return true;
      if (r.grade == null) return true;
      const label = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      if (!label || label === PROJECT_GRADE_LABEL) return true;
      return (allowedLabels as readonly string[]).includes(label);
    };

    const categoryMatches = (r: IndoorRouteWithExtras) => {
      if (categories.length === 0) return true;
      const kind = r.climbing_kind;
      if (!kind) return true;
      if (categories.includes(0) && kind === ClimbingKinds.SPORT) return true;
      if (categories.includes(1) && kind === ClimbingKinds.BOULDER) return true;
      if (categories.includes(2) && kind === ClimbingKinds.MULTIPITCH)
        return true;
      return false;
    };

    const toposOnlyMatches = (r: IndoorRouteWithExtras) => {
      if (!toposOnly) return true;
      return (r.topos && r.topos.length > 0) || !!r.topo_id;
    };

    return routes.filter(
      (r) =>
        textMatches(r) &&
        gradeMatches(r) &&
        categoryMatches(r) &&
        toposOnlyMatches(r),
    );
  });

  protected openRouteFilters(): void {
    this.filtersService.openIndoorRouteFilters();
  }

  protected readonly totalRoutes = computed(() => {
    return this.centerRoutes().length;
  });

  protected readonly pendingRoutes = computed(() => {
    return this.centerRoutes().filter((r) => !r.own_ascent).length;
  });

  protected readonly allCompleted = computed(() => {
    const total = this.totalRoutes();
    return total > 0 && this.pendingRoutes() === 0;
  });

  protected readonly centerAscentsResource = resource({
    params: () => ({
      id: this.center()?.id,
      reloadTick: this.indoorCentersData.indoorRoutesReloadTick(),
    }),
    loader: ({ params }) =>
      params.id ? this.indoor.getCenterAscents(params.id) : Promise.resolve([]),
  });

  protected readonly isAdmin = computed(() => {
    return this.authState.isAdmin();
  });

  protected readonly canCreateRoute = computed(() => {
    const center = this.center();
    return this.authState.canCreateIndoorInCenter(center?.id);
  });

  protected readonly canEdit = computed(() => {
    const center = this.center();
    if (!center) return false;
    return !!this.authState.indoorAdminPermissions()[center.id];
  });

  protected async openEditCenter(): Promise<void> {
    const center = this.center();
    if (!center) return;
    const success = await this.indoor.openIndoorCenterForm({
      centerData: center,
    });
    if (success) {
      this.centerResource.reload();
    }
  }

  protected readonly userSearchQuery = signal('');

  protected readonly centerAdminsResource = resource({
    params: () => this.center()?.id,
    loader: async ({ params: centerId }) => {
      if (!centerId) return [];
      await this.supabase.whenReady();

      const { data: mappings, error: mappingError } = await this.supabase.client
        .from('indoor_center_admins')
        .select('user_id')
        .eq('center_id', centerId);

      if (mappingError || !mappings?.length) {
        if (mappingError) {
          console.error(
            '[IndoorCenterComponent] Error fetching center admin mappings:',
            mappingError,
          );
        }
        return [];
      }

      const userIds = mappings
        .map((m) => m.user_id)
        .filter((id): id is string => !!id);
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

      if (profilesError) {
        console.error(
          '[IndoorCenterComponent] Error fetching admin profiles:',
          profilesError,
        );
        return [];
      }

      return mappings.map((m) => ({
        user_id: m.user_id,
        user: profiles.find((p) => p.id === m.user_id) || {
          id: m.user_id || '',
          name: 'Unknown',
          avatar: null,
        },
      }));
    },
  });

  protected readonly centerAdmins = computed(
    () => this.centerAdminsResource.value() ?? [],
  );

  protected readonly foundUsersResource = resource({
    params: () => this.userSearchQuery().trim(),
    loader: async ({ params: query }) => {
      if (query.length < 2) return [];
      return await this.userProfiles.searchUsers(query);
    },
  });

  protected readonly foundUsers = computed(
    () => this.foundUsersResource.value() ?? [],
  );

  protected readonly stringifyUser = (u: UserProfileBasicDto) => u.name || '';

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.breadcrumbsService.selectedIndoorCenter.set(null);
    });

    effect(() => {
      const c = this.center();
      this.breadcrumbsService.selectedIndoorCenter.set(c);
    });

    effect(() => {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'show_legacy_routes',
            String(this.showLegacyRoutes()),
          );
        }
      } catch {
        // Ignored
      }
    });

    effect(() => {
      const has = this.hasVouchers();
      if (!has && this.activeTabIndex() === 3) {
        this.activeTabIndex.set(0);
      }
    });

    effect(() => {
      this.slug();
      untracked(() => {
        this.loadedTabs.set(new Set([this.activeTabIndex()]));
      });
    });

    effect(() => {
      const idx = this.activeTabIndex();
      this.loadedTabs.update((set) => {
        if (set.has(idx)) return set;
        const next = new Set(set);
        next.add(idx);
        return next;
      });
    });
  }

  async addAdmin(user: UserProfileBasicDto): Promise<void> {
    const centerId = this.center()?.id;
    if (!centerId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_admins')
      .insert({ center_id: centerId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        this.toast.info('adminRequests.alreadyRequested');
      } else {
        console.error('[IndoorCenterComponent] Error adding admin:', error);
        this.toast.error('errors.unexpected');
      }
      return;
    }

    this.toast.success('messages.toasts.adminAdded');
    this.centerAdminsResource.reload();
    if (user.id === this.supabase.authUserId()) {
      this.cache.remove(CACHE_KEYS.adminIndoorCenters(user.id));
      this.supabase.adminIndoorCentersResource.reload();
    }
    this.userSearchQuery.set('');
  }

  async removeAdmin(userId: string, userName?: string): Promise<void> {
    const centerId = this.center()?.id;
    if (!centerId) return;
    if (!this.isBrowser) return;

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('indoor.removeAdminTitle'),
        size: 's',
        data: {
          content: this.translate.instant('indoor.removeAdminConfirm', {
            name: userName || this.translate.instant('user'),
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const { error } = await this.supabase.client
      .from('indoor_center_admins')
      .delete()
      .eq('center_id', centerId)
      .eq('user_id', userId);

    if (error) {
      console.error('[IndoorCenterComponent] Error removing admin:', error);
      this.toast.error('errors.unexpected');
      return;
    }

    this.toast.success('messages.toasts.adminRemoved');
    this.centerAdminsResource.reload();
    if (userId === this.supabase.authUserId()) {
      this.cache.remove(CACHE_KEYS.adminIndoorCenters(userId));
      this.supabase.adminIndoorCentersResource.reload();
    }
  }

  protected onAdminSelected(user: UserProfileBasicDto | null): void {
    if (user) {
      this.addAdmin(user);
    }
  }

  // ---- Routesetters ----
  protected readonly routesetterSearchQuery = signal('');

  protected readonly centerRoutesettersResource = resource({
    params: () => this.center()?.id,
    loader: async ({ params: centerId }) => {
      if (!centerId) return [];
      await this.supabase.whenReady();

      const { data: mappings, error: mappingError } = await this.supabase.client
        .from('indoor_center_routesetters')
        .select('user_id')
        .eq('center_id', centerId);

      if (mappingError || !mappings?.length) {
        if (mappingError) {
          console.error(
            '[IndoorCenterComponent] Error fetching center routesetter mappings:',
            mappingError,
          );
        }
        return [];
      }

      const userIds = mappings
        .map((m) => m.user_id)
        .filter((id): id is string => !!id);
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('id, name, avatar')
          .in('id', userIds);

      if (profilesError) {
        console.error(
          '[IndoorCenterComponent] Error fetching routesetter profiles:',
          profilesError,
        );
        return [];
      }

      return mappings.map((m) => ({
        user_id: m.user_id,
        user: profiles.find((p) => p.id === m.user_id) || {
          id: m.user_id || '',
          name: 'Unknown',
          avatar: null,
        },
      }));
    },
  });

  protected readonly centerRoutesetters = computed(
    () => this.centerRoutesettersResource.value() ?? [],
  );

  protected readonly foundRoutesetterUsersResource = resource({
    params: () => this.routesetterSearchQuery().trim(),
    loader: async ({ params: query }) => {
      if (query.length < 2) return [];
      return await this.userProfiles.searchUsers(query);
    },
  });

  protected readonly foundRoutesetterUsers = computed(
    () => this.foundRoutesetterUsersResource.value() ?? [],
  );

  async addRoutesetter(user: UserProfileBasicDto): Promise<void> {
    const centerId = this.center()?.id;
    if (!centerId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_routesetters')
      .insert({ center_id: centerId, user_id: user.id });

    if (error) {
      if (error.code === '23505') {
        this.toast.info('adminRequests.alreadyRequested');
      } else {
        console.error(
          '[IndoorCenterComponent] Error adding routesetter:',
          error,
        );
        this.toast.error('errors.unexpected');
      }
      return;
    }

    this.toast.success('messages.toasts.routesetterAdded');
    this.centerRoutesettersResource.reload();
    if (user.id === this.supabase.authUserId()) {
      this.supabase.routesetterIndoorCentersResource.reload();
    }
    this.routesetterSearchQuery.set('');
  }

  async removeRoutesetter(userId: string): Promise<void> {
    const centerId = this.center()?.id;
    if (!centerId) return;

    const { error } = await this.supabase.client
      .from('indoor_center_routesetters')
      .delete()
      .eq('center_id', centerId)
      .eq('user_id', userId);

    if (error) {
      console.error(
        '[IndoorCenterComponent] Error removing routesetter:',
        error,
      );
      this.toast.error('errors.unexpected');
      return;
    }

    this.toast.success('messages.toasts.routesetterRemoved');
    this.centerRoutesettersResource.reload();
    if (userId === this.supabase.authUserId()) {
      this.supabase.routesetterIndoorCentersResource.reload();
    }
  }

  protected onRoutesetterSelected(user: UserProfileBasicDto | null): void {
    if (user) {
      this.addRoutesetter(user);
    }
  }

  protected readonly mapLocationUrl = mapLocationUrl;

  async viewOnMap(lat: number, lng: number): Promise<void> {
    this.filterState.areaListShowIndoor.set(true);
    this.mapData.mapBounds.set({
      south_west_latitude: lat - 0.005,
      south_west_longitude: lng - 0.005,
      north_east_latitude: lat + 0.005,
      north_east_longitude: lng + 0.005,
    });
    void this.router.navigateByUrl('/explore');
  }

  openExternal(url?: string): void {
    if (!url) return;
    window.open(url, '_blank');
  }

  async deleteCenter(): Promise<void> {
    const c = this.center();
    if (!c) return;
    if (!this.isBrowser) return;

    const t = await firstValueFrom(
      this.translate.get(['indoor.deleteTitle', 'indoor.deleteConfirm'], {
        name: c.name,
      }),
    );
    const title = t['indoor.deleteTitle'];
    const message = t['indoor.deleteConfirm'];
    const data: TuiConfirmData = {
      content: message,
      yes: this.translate.instant('delete'),
      no: this.translate.instant('cancel'),
      appearance: 'primary-destructive',
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
      const ok = await this.indoor.deleteCenter(c.id);
      if (ok) {
        await this.router.navigateByUrl('/explore');
      }
    } catch (error) {
      handleErrorToast(error, this.toast);
    }
  }

  protected readonly currentDay = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ][new Date().getDay()];

  async createRoute(): Promise<void> {
    const id = this.center()?.id;
    if (!id) return;
    const success = await this.indoor.openIndoorRouteForm(id);
    if (success) {
      this.centerRoutesResource.reload();
    }
  }
}
