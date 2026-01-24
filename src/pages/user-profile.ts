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

import {
  TuiButton,
  TuiDataList,
  TuiFallbackSrcPipe,
  TuiHint,
  TuiLabel,
  TuiScrollbar,
  TuiTextfield,
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
} from '@taiga-ui/kit';

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
  RouteItem,
  RoutesTableComponent,
} from '../components';

import { ORDERED_GRADE_VALUES } from '../models';

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
    ReactiveFormsModule,
    TuiSelect,
    TuiDataList,
    TuiDataListWrapper,
    TuiTextfield,
    TuiLabel,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiScrollbar,
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
            <div class="flex flex-row gap-2 items-center justify-between">
              @let name = profile()?.name;
              <div class="text-xl font-semibold break-all">
                <span
                  [tuiSkeleton]="
                    loading ? 'name lastName secondLastName' : false
                  "
                >
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
              } @else if (profile()) {
                @let following = isFollowing();
                <button
                  [iconStart]="following ? '@tui.user-minus' : '@tui.user-plus'"
                  size="m"
                  tuiIconButton
                  type="button"
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
          </div>
        </div>

        @if (projects().length > 0) {
          <div class="mt-8 min-w-0">
            <h3 class="text-xl font-semibold mb-4 capitalize">
              {{ 'labels.projects' | translate }}
            </h3>
            <app-routes-table
              [data]="projects()"
              [showAdminActions]="false"
              [showLocation]="true"
              [showRowColors]="false"
            />
          </div>
        }

        @if (hasAscents() || query() || hasActiveFilters()) {
          <div class="mt-8 min-w-0">
            <h3 class="text-xl font-semibold capitalize mb-4">
              {{ 'labels.ascents' | translate }}
            </h3>

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
                    global.isMobile() ? null : ('labels.filters' | translate)
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
                  <tui-data-list-wrapper new [items]="dateFilterOptions()" />
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
              (updated)="ascentsResource.reload()"
              (deleted)="onAscentDeleted($event)"
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

  onAscentDeleted(id: number): void {
    this.ascentsResource.update((curr) => {
      if (!curr) return { items: [], total: 0 };
      const newItems = curr.items.filter((a) => a.id !== id);
      const deletedCount = curr.items.length - newItems.length;
      return {
        items: newItems,
        total: Math.max(0, curr.total - deletedCount),
      };
    });
    this.global.userTotalAscentsCountResource.reload();
    this.projectsResource.reload();
  }

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
      }
    } else {
      const success = await this.followsService.follow(followedUserId);
      if (success) {
        this.isFollowingResource.update(() => true);
      }
    }
  }
}

export default UserProfileComponent;
