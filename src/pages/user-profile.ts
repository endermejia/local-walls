import { AsyncPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  TuiDataList,
  TuiFallbackSrcPipe,
  TuiHint,
  TuiLabel,
  TuiLink,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
  TuiButton,
} from '@taiga-ui/core';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import {
  TUI_COUNTRIES,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiDataListWrapper,
  TuiSelect,
  TuiSkeleton,
  TuiTabs,
} from '@taiga-ui/kit';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { startWith } from 'rxjs';

import {
  FiltersService,
  FollowsService,
  GlobalData,
  SupabaseService,
  UserProfilesService,
} from '../services';

import {
  AscentsTableComponent,
  EmptyStateComponent,
  RoutesTableComponent,
  UserFollowsListComponent,
} from '../components';

import { ORDERED_GRADE_VALUES, RouteWithExtras } from '../models';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    TranslatePipe,
    TuiAvatar,
    TuiFallbackSrcPipe,
    TuiButton,
    TuiHint,
    AsyncPipe,
    TuiSkeleton,
    LowerCasePipe,
    RoutesTableComponent,
    AscentsTableComponent,
    EmptyStateComponent,
    ReactiveFormsModule,
    TuiSelect,
    TuiDataList,
    TuiDataListWrapper,
    TuiTextfield,
    TuiLabel,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiScrollbar,
    TuiTabs,
    RouterLink,
    TuiLink,
    TuiLoader,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tui-scrollbar class="flex grow">
      <section class="w-full max-w-5xl mx-auto p-4 grid gap-4">
        @let loading = !profile();
        <div class="flex items-center gap-4">
          @let avatar = profileAvatarSrc();
          <tui-avatar
            [src]="avatar | tuiFallbackSrc: '@tui.user' | async"
            [tuiSkeleton]="loading"
            size="xxl"
          />
          <div class="grow">
            <div class="flex flex-row gap-2 items-center">
              @let name = profile()?.name;
              <div class="text-xl font-semibold break-all">
                <span [tuiSkeleton]="loading ? 'name lastName' : false">
                  {{ name }}
                </span>
              </div>
              @if (isOwnProfile()) {
                <button
                  iconStart="@tui.bolt"
                  size="m"
                  tuiIconButton
                  type="button"
                  appearance="action-grayscale"
                  [tuiHint]="
                    global.isMobile() ? null : ('actions.edit' | translate)
                  "
                  (click)="openEditDialog()"
                >
                  {{ 'actions.edit' | translate }}
                </button>
              } @else {
                @let following = isFollowing();
                <button
                  [iconStart]="following ? '@tui.user-minus' : '@tui.user-plus'"
                  size="m"
                  tuiIconButton
                  type="button"
                  [tuiSkeleton]="loading"
                  [appearance]="following ? 'secondary' : 'primary'"
                  [tuiHint]="
                    global.isMobile()
                      ? null
                      : ((following ? 'actions.unfollow' : 'actions.follow')
                        | translate)
                  "
                  (click)="toggleFollow()"
                >
                  {{
                    (following ? 'actions.unfollow' : 'actions.follow')
                      | translate
                  }}
                </button>
              }
            </div>

            <div class="flex items-center gap-x-2 flex-wrap">
              @let country = profileCountry();
              @let city = profile()?.city;
              <span
                class="flex items-center gap-2"
                [tuiSkeleton]="loading ? 'country, city' : false"
              >
                {{ (countriesNames$ | async)?.[country]
                }}{{ city ? ', ' + city : '' }}
              </span>
              @if (profileAge(); as age) {
                |
                <span>
                  {{ age }}
                  {{ 'labels.years' | translate | lowercase }}
                </span>
              }

              @if (profile()?.starting_climbing_year; as year) {
                <span class="opacity-70">
                  (
                  {{ 'labels.startingClimbingYear' | translate | lowercase }}
                  {{ year }}
                  )
                </span>
              }
            </div>
            <div class="opacity-70">
              @let bio = profile()?.bio;
              <span
                [tuiSkeleton]="
                  loading
                    ? 'This text serves as the content behind the skeleton and adjusts the width.'
                    : false
                "
              >
                {{ bio }}
              </span>
            </div>

            <div class="flex gap-4 mt-2">
              <button
                tuiLink
                type="button"
                [tuiSkeleton]="loading"
                (click)="openFollowsDialog('followers')"
              >
                <strong>{{ followersCount() }}</strong>
                {{ 'labels.followers' | translate | lowercase }}
              </button>
              <button
                tuiLink
                type="button"
                [tuiSkeleton]="loading"
                (click)="openFollowsDialog('following')"
              >
                <strong>{{ followingCount() }}</strong>
                {{ 'labels.following' | translate | lowercase }}
              </button>
            </div>
          </div>
        </div>

        <tui-tabs
          [activeItemIndex]="activeTab()"
          (activeItemIndexChange)="activeTab.set($event)"
        >
          <button tuiTab>
            {{ 'labels.ascents' | translate }}
          </button>
          <button tuiTab>
            {{ 'labels.projects' | translate }}
          </button>
          @if (isOwnProfile()) {
            <button tuiTab>
              {{ 'labels.areas' | translate }}
              @if (likedAreas().length) {
                <span class="ml-1 opacity-60">({{ likedAreas().length }})</span>
              }
            </button>
            <button tuiTab>
              {{ 'labels.crags' | translate }}
              @if (likedCrags().length) {
                <span class="ml-1 opacity-60">({{ likedCrags().length }})</span>
              }
            </button>
            <button tuiTab>
              {{ 'labels.routes' | translate }}
              @if (likedRoutes().length) {
                <span class="ml-1 opacity-60"
                  >({{ likedRoutes().length }})</span
                >
              }
            </button>
          }
        </tui-tabs>

        @switch (activeTab()) {
          @case (0) {
            @if (hasAscents() || query() || hasActiveFilters()) {
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-4">
                  <tui-textfield
                    class="grow min-w-48"
                    [tuiTextfieldCleaner]="true"
                    tuiTextfieldSize="l"
                  >
                    <label tuiLabel for="route-search">{{
                      'labels.searchPlaceholder' | translate
                    }}</label>
                    <input
                      tuiTextfield
                      #routeSearch
                      id="route-search"
                      autocomplete="off"
                      [value]="query()"
                      (input.zoneless)="onQuery(routeSearch.value)"
                    />
                  </tui-textfield>

                  <tui-badged-content>
                    @if (hasActiveFilters()) {
                      <tui-badge-notification size="s" tuiSlot="top" />
                    }
                    <button
                      tuiButton
                      appearance="textfield"
                      size="l"
                      type="button"
                      iconStart="@tui.sliders-horizontal"
                      [attr.aria-label]="'labels.filters' | translate"
                      [tuiHint]="
                        global.isMobile()
                          ? null
                          : ('labels.filters' | translate)
                      "
                      (click.zoneless)="openFilters()"
                    ></button>
                  </tui-badged-content>

                  <tui-textfield
                    class="w-full sm:w-48"
                    [tuiTextfieldCleaner]="false"
                    [stringify]="dateValueContent"
                    tuiTextfieldSize="l"
                  >
                    <label tuiLabel for="date-filter">
                      {{ 'labels.filterByDate' | translate }}
                    </label>
                    <input
                      tuiSelect
                      id="date-filter"
                      [formControl]="dateFilterControl"
                    />
                    <tui-data-list *tuiTextfieldDropdown>
                      <tui-data-list-wrapper
                        new
                        [items]="dateFilterOptions()"
                      />
                    </tui-data-list>
                  </tui-textfield>
                </div>

                <app-ascents-table
                  [data]="ascents()"
                  [total]="totalAscents()"
                  [page]="global.ascentsPage()"
                  [size]="global.ascentsSize()"
                  (paginationChange)="global.onAscentsPagination($event)"
                  [showUser]="false"
                  [showRowColors]="false"
                />
              </div>
            } @else if (isOwnProfile()) {
              <div class="mt-8 flex justify-center">
                <button
                  tuiButton
                  type="button"
                  appearance="secondary"
                  iconStart="@tui.download"
                  (click.zoneless)="openImport8aDialog()"
                >
                  {{ 'actions.import' | translate }} 8a.nu
                </button>
              </div>
            }
          }
          @case (1) {
            <div class="min-w-0">
              <app-routes-table
                [data]="projects()"
                [showAdminActions]="false"
                [showLocation]="true"
                [showRowColors]="false"
              />
            </div>
          }
          @case (2) {
            <div class="flex flex-col gap-2">
              @if (likedAreasResource.isLoading()) {
                <tui-loader class="m-4" />
              } @else {
                @for (area of likedAreas(); track area.id) {
                  <a
                    tuiLink
                    [routerLink]="['/area', area.slug]"
                    class="block p-2 font-bold !no-underline hover:opacity-80 border-b border-border-normal last:border-0"
                  >
                    <div class="flex items-baseline gap-2">
                      <span class="text-lg text-text">{{ area.name }}</span>
                      <span class="text-sm opacity-70 font-normal">
                        {{ area.crags.length || 0 }}
                        {{ 'labels.sectors' | translate }}
                      </span>
                    </div>
                  </a>
                } @empty {
                  <app-empty-state icon="@tui.heart" />
                }
              }
            </div>
          }
          @case (3) {
            <div class="flex flex-col gap-2">
              @if (likedCragsResource.isLoading()) {
                <tui-loader class="m-4" />
              } @else {
                @for (crag of likedCrags(); track crag.id) {
                  <a
                    tuiLink
                    [routerLink]="['/area', crag.area_slug, crag.slug]"
                    class="block p-2 font-bold !no-underline hover:opacity-80 border-b border-border-normal last:border-0"
                  >
                    <div class="flex items-baseline gap-2">
                      <span class="text-lg text-text">{{ crag.name }}</span>
                      <span class="text-sm opacity-70 font-normal">
                        {{ crag.area_name }}
                      </span>
                    </div>
                  </a>
                } @empty {
                  <app-empty-state icon="@tui.heart" />
                }
              }
            </div>
          }
          @case (4) {
            <div class="min-w-0">
              @if (likedRoutesResource.isLoading()) {
                <tui-loader class="m-4" />
              } @else if (likedRoutes().length) {
                <app-routes-table
                  [data]="likedRoutes()"
                  [showAdminActions]="false"
                  [showLocation]="true"
                  [showRowColors]="false"
                />
              } @else {
                <app-empty-state icon="@tui.heart" />
              }
            </div>
          }
        }
      </section>
    </tui-scrollbar>
  `,
  host: { class: 'flex grow min-h-0' },
})
export class UserProfileComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly supabase = inject(SupabaseService);
  private readonly translate = inject(TranslateService);
  private readonly followsService = inject(FollowsService);
  private readonly userProfilesService = inject(UserProfilesService);
  protected readonly global = inject(GlobalData);
  private readonly filtersService = inject(FiltersService);
  protected readonly countriesNames$ = inject(TUI_COUNTRIES);

  // Route param (optional)
  id = input<string | undefined>();

  private readonly dialogs = inject(TuiDialogService);

  protected readonly activeTab = signal(0);

  protected readonly followersCountResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return 0;
      return await this.followsService.getFollowersCount(userId);
    },
  });

  protected readonly followingCountResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return 0;
      return await this.followsService.getFollowingCount(userId);
    },
  });

  protected readonly followersCount = computed(
    () => this.followersCountResource.value() ?? 0,
  );
  protected readonly followingCount = computed(
    () => this.followingCountResource.value() ?? 0,
  );

  protected readonly likedRoutesResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];

      const { data: routeLikes } = await this.supabase.client
        .from('route_likes')
        .select('route_id')
        .eq('user_id', userId);

      const routeIds = routeLikes?.map((r) => r.route_id) || [];
      if (!routeIds.length) return [];

      const currentUserId = this.supabase.authUserId();
      let query = this.supabase.client
        .from('routes')
        .select(
          `
        *,
        liked:route_likes(id),
        project:route_projects(id),
        ascents:route_ascents(rate),
        own_ascent:route_ascents(*),
        crag:crags(
          slug,
          name,
          area:areas(slug, name)
        )
      `,
        )
        .in('id', routeIds);

      if (currentUserId) {
        query = query
          .eq('own_ascent.user_id', currentUserId)
          .eq('project.user_id', currentUserId)
          .eq('liked.user_id', currentUserId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[UserProfile] liked routes error', error);
        return [];
      }

      return (
        data.map((r) =>
          (() => {
            const rates =
              r.ascents?.map((a) => a.rate).filter((rate) => rate != null) ??
              [];
            const rating =
              rates.length > 0
                ? rates.reduce((a, b) => a + b, 0) / rates.length
                : 0;

            return {
              ...r,
              liked: (r.liked?.length ?? 0) > 0,
              project: (r.project?.length ?? 0) > 0,
              crag_slug: r.crag?.slug,
              crag_name: r.crag?.name,
              area_slug: r.crag?.area?.slug,
              area_name: r.crag?.area?.name,
              rating,
              ascent_count: r.ascents?.length ?? 0,
              climbed: (r.own_ascent?.length ?? 0) > 0,
              own_ascent: r.own_ascent?.[0],
            } as RouteWithExtras;
          })(),
        ) ?? []
      );
    },
  });

  protected readonly likedCragsResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];

      const { data: cragLikes } = await this.supabase.client
        .from('crag_likes')
        .select('crag_id')
        .eq('user_id', userId);

      const cragIds = cragLikes?.map((c) => c.crag_id) || [];
      if (!cragIds.length) return [];

      const { data, error } = await this.supabase.client
        .from('crags')
        .select(
          `
        *,
        area:areas(name, slug)
      `,
        )
        .in('id', cragIds);

      if (error) {
        console.error('[UserProfile] liked crags error', error);
        return [];
      }

      return (
        data?.map((c) => ({
          ...c,
          area_name: c.area?.name,
          area_slug: c.area?.slug,
        })) || []
      );
    },
  });

  protected readonly likedAreasResource = resource({
    params: () => this.profile()?.id,
    loader: async ({ params: userId }) => {
      if (!userId || !isPlatformBrowser(this.platformId)) return [];

      const { data: areaLikes } = await this.supabase.client
        .from('area_likes')
        .select('area_id')
        .eq('user_id', userId);

      const areaIds = areaLikes?.map((a) => a.area_id) || [];
      if (!areaIds.length) return [];

      const { data, error } = await this.supabase.client
        .from('areas')
        .select(
          `
        *,
        crags(id)
      `,
        )
        .in('id', areaIds);

      if (error) {
        console.error('[UserProfile] liked areas error', error);
        return [];
      }

      return data || [];
    },
  });

  protected readonly likedRoutes = computed(
    () => this.likedRoutesResource.value() ?? [],
  );
  protected readonly likedCrags = computed(
    () => this.likedCragsResource.value() ?? [],
  );
  protected readonly likedAreas = computed(
    () => this.likedAreasResource.value() ?? [],
  );

  protected readonly query = signal('');
  protected readonly dateFilterControl = new FormControl<string>('last12', {
    nonNullable: true,
  });
  protected readonly dateFilter = toSignal(
    this.dateFilterControl.valueChanges.pipe(
      startWith(this.dateFilterControl.value),
    ),
    { initialValue: this.dateFilterControl.value },
  );

  protected readonly selectedGradeRange = this.global.areaListGradeRange;
  protected readonly selectedCategories = this.global.areaListCategories;

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.selectedCategories().length > 0;
  });

  protected readonly dateFilterOptions = computed(() => {
    const years: string[] = [];
    const currentYear = new Date().getFullYear();
    const startingYear = this.profile()?.starting_climbing_year || 2020;
    const startYear = Math.min(2020, startingYear);
    for (let y = currentYear; y >= startYear; y--) {
      years.push(y.toString());
    }
    return ['last12', 'all', ...years];
  });

  protected readonly dateValueContent = (option: string): string => {
    if (option === 'last12') {
      return this.translate.instant('labels.last12Months');
    }
    if (option === 'all') {
      return this.translate.instant('labels.allTime');
    }
    return option;
  };

  constructor() {
    effect(() => {
      // Reset breadcrumbs when navigating to the profile page
      const profileId = this.profile()?.id;
      this.id(); // Track the id signal
      this.global.resetDataByPage('home');
      this.global.profileUserId.set(profileId ?? null);
    });

    // Auto-open profile config modal if the user hasn't completed setup
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      const profile = this.profile();
      const authUser = this.supabase.authUser();

      // Only auto-open for own profile
      if (this.isOwnProfile() && profile && authUser?.email) {
        // If name equals email, the user hasn't completed profile setup
        if (profile.name === authUser.email) {
          // Use setTimeout to avoid opening modal during effect execution
          setTimeout(() => this.openEditDialog(), 0);
        }
      }
    });

    // Sync initial global filters to local controls/signals if needed
    // However, global filters are typically reset to defaults on page entry.
    // The effect below ensures that when the local state changes, the global state is updated and the page is reset.
    effect(() => {
      const dateFilter = this.dateFilter();
      const query = this.query();

      // Read global filters to re-run the effect when they change (e.g., from the filter dialog)
      this.selectedGradeRange();
      this.selectedCategories();

      // Reset pagination when any filter changes
      this.global.ascentsPage.set(0);

      // Sync local filters with global signals
      this.global.ascentsDateFilter.set(dateFilter);
      this.global.ascentsQuery.set(query || null);
    });

    // Guard for activeTab index when switching between own profile and others
    effect(() => {
      const isOwn = this.isOwnProfile();
      if (!isOwn && this.activeTab() > 1) {
        this.activeTab.set(0);
      }
    });
  }

  onQuery(v: string) {
    this.query.set(v);
  }

  // Currently viewed profile (if by id)
  private readonly externalProfileResource = resource({
    params: () => this.id(),
    loader: async ({ params: paramId }) => {
      if (!paramId || !isPlatformBrowser(this.platformId)) return null;

      // If param is the same as the current user id, we use our own profile (computed below)
      const currentId = this.supabase.authUserId();
      if (currentId && paramId === currentId) return null;

      const { data, error } = await this.supabase.client
        .from('user_profiles')
        .select('*')
        .eq('id', paramId)
        .maybeSingle();

      if (error) {
        console.error('[UserProfile] fetch by id error', error);
        return null;
      }
      return data;
    },
  });

  readonly profile = computed(() => {
    const paramId = this.id();
    const ownProfile = this.supabase.userProfile();
    const currentId = this.supabase.authUserId();

    if (!paramId || (currentId && paramId === currentId)) {
      return ownProfile ?? null;
    }

    return this.externalProfileResource.value() ?? null;
  });

  readonly loading = computed(
    () =>
      this.supabase.userProfileResource.isLoading() ||
      this.externalProfileResource.isLoading(),
  );

  readonly profileCountry = computed(
    () => this.profile()?.country as TuiCountryIsoCode,
  );

  readonly isOwnProfile = computed(() => {
    const currentId = this.supabase.authUserId();
    const viewedId = this.profile()?.id ?? null;
    return !!currentId && !!viewedId && currentId === viewedId;
  });

  readonly isFollowingResource = resource({
    params: () => ({
      userId: this.supabase.authUserId(),
      followedUserId: this.profile()?.id,
    }),
    loader: async ({ params }) => {
      if (
        !params.userId ||
        !params.followedUserId ||
        params.userId === params.followedUserId ||
        !isPlatformBrowser(this.platformId)
      ) {
        return false;
      }
      return this.followsService.isFollowing(params.followedUserId);
    },
  });
  readonly isFollowing = computed(() => !!this.isFollowingResource.value());

  readonly profileAvatarSrc = computed(() =>
    this.supabase.buildAvatarUrl(this.profile()?.avatar),
  );

  readonly profileAge = computed(() => {
    const bd = this.profile()?.birth_date as string | null | undefined;
    if (!bd) return null;
    const d = new Date(bd);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years;
  });

  readonly projectsResource = this.global.userProjectsResource;

  readonly ascentsResource = this.global.userAscentsResource;

  readonly ascents = computed(() => this.ascentsResource.value()?.items ?? []);

  readonly totalAscents = computed(
    () => this.ascentsResource.value()?.total ?? 0,
  );
  readonly hasAscents = computed(
    () => this.global.userTotalAscentsCountResource.value() !== 0,
  );

  readonly projects = computed(() => this.projectsResource.value() ?? []);

  openEditDialog(): void {
    if (!this.isOwnProfile()) return;
    this.userProfilesService.openUserProfileConfigForm();
  }

  protected openImport8aDialog(): void {
    this.userProfilesService.openImport8aDialog();
  }

  protected openFilters(): void {
    this.filtersService.openFilters({ showShade: false });
  }

  async toggleFollow(): Promise<void> {
    const followedUserId = this.profile()?.id;
    if (!followedUserId || this.isOwnProfile()) return;

    if (this.isFollowing()) {
      const success = await this.followsService.unfollow(followedUserId);
      if (success) {
        this.isFollowingResource.update(() => false);
        void this.followersCountResource.reload();
      }
    } else {
      const success = await this.followsService.follow(followedUserId);
      if (success) {
        this.isFollowingResource.update(() => true);
        void this.followersCountResource.reload();
      }
    }
  }

  protected openFollowsDialog(type: 'followers' | 'following'): void {
    const userId = this.profile()?.id;
    if (!userId) return;

    this.dialogs
      .open<boolean>(new PolymorpheusComponent(UserFollowsListComponent), {
        data: { userId, type },
        label: this.translate.instant(`labels.${type}`),
        size: 'm',
      })
      .subscribe(() => {
        // Option to reload counts if needed, but the counts should be reactive enough
        void this.followersCountResource.reload();
        void this.followingCountResource.reload();
      });
  }
}

export default UserProfileComponent;
