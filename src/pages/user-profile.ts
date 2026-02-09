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
import { Router } from '@angular/router';

import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiFallbackSrcPipe,
  TuiLabel,
  TuiLink,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TuiCountryIsoCode } from '@taiga-ui/i18n';
import {
  TUI_COUNTRIES,
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiConfirmData,
  TuiDataListWrapper,
  TuiSelect,
  TuiSkeleton,
  TuiTabs,
  TuiPulse,
} from '@taiga-ui/kit';
import { TuiHeader } from '@taiga-ui/layout';
import { TuiDialogService } from '@taiga-ui/experimental';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { TUI_CONFIRM } from '@taiga-ui/kit';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, startWith } from 'rxjs';

import {
  BlockingService,
  FiltersService,
  FollowsService,
  GlobalData,
  SupabaseService,
  ToastService,
  UserProfilesService,
  TourService,
  TourStep,
} from '../services';

import { AscentsFeedComponent } from '../components/ascents-feed';
import { EmptyStateComponent } from '../components/empty-state';
import { RoutesTableComponent } from '../components/routes-table';
import { TourHintComponent } from '../components/tour-hint';
import { ChatDialogComponent } from '../dialogs/chat-dialog';
import { UserListDialogComponent } from '../dialogs/user-list-dialog';

import {
  ORDERED_GRADE_VALUES,
  RouteAscentWithExtras,
  RouteWithExtras,
} from '../models';
import { PhotoViewerDialogComponent } from '../dialogs/photo-viewer-dialog';

@Component({
  selector: 'app-user-profile',
  imports: [
    AscentsFeedComponent,
    AsyncPipe,
    EmptyStateComponent,
    LowerCasePipe,
    ReactiveFormsModule,
    RoutesTableComponent,
    TourHintComponent,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiDataList,
    TuiDataListWrapper,
    TuiDropdown,
    TuiFallbackSrcPipe,
    TuiHeader,
    TuiLabel,
    TuiLink,
    TuiLoader,
    TuiScrollbar,
    TuiSelect,
    TuiSkeleton,
    TuiSwipe,
    TuiTabs,
    TuiTextfield,
    TuiTitle,
    TuiPulse,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tui-scrollbar class="flex grow">
      <section
        (tuiSwipe)="onSwipe($event)"
        class="w-full max-w-5xl mx-auto p-4 grid gap-4"
      >
        @let loading = !profile();
        <div class="flex items-center gap-4">
          <div
            class="absolute inset-0 pointer-events-none"
            [tuiDropdown]="tourHint"
            [tuiDropdownOpen]="tourService.step() === TourStep.PROFILE"
            tuiDropdownDirection="bottom"
          ></div>
          @let avatar = profileAvatarSrc();
          <tui-avatar
            [src]="avatar | tuiFallbackSrc: '@tui.user' | async"
            [tuiSkeleton]="loading"
            size="xxl"
            class="cursor-pointer transition-transform hover:scale-105 active:scale-95"
            (click)="showEnlargedPhoto()"
          />
          <div class="grow">
            <div class="flex flex-row gap-2 items-center">
              @let name = profile()?.name;
              <div class="text-xl font-semibold wrap-anywhere">
                <span [tuiSkeleton]="loading ? 'name lastName' : false">
                  {{ name }}
                </span>
              </div>
              @if (isOwnProfile()) {
                <button
                  iconStart="@tui.settings"
                  size="m"
                  tuiIconButton
                  type="button"
                  appearance="action-grayscale"
                  (click)="openEditDialog()"
                >
                  {{ 'actions.edit' | translate }}
                </button>
              } @else {
                @let blockMessages = blockState().blockMessages;
                @let blockAscents = blockState().blockAscents;
                <button
                  [appearance]="
                    blockMessages || blockAscents
                      ? 'negative'
                      : 'action-grayscale'
                  "
                  iconStart="@tui.ellipsis-vertical"
                  size="m"
                  tuiIconButton
                  type="button"
                  [tuiSkeleton]="loading"
                  [tuiDropdown]="dropdownContent"
                  [(tuiDropdownOpen)]="dropdownOpen"
                >
                  {{ 'labels.options' | translate }}
                </button>
                <ng-template #dropdownContent>
                  <tui-data-list>
                    <button
                      tuiOption
                      new
                      [tuiAppearance]="blockMessages ? 'negative' : 'neutral'"
                      iconStart="@tui.message-circle-off"
                      (click)="toggleBlockMessages(); dropdownOpen.set(false)"
                    >
                      {{
                        (blockMessages
                          ? 'actions.messagesBlocked'
                          : 'actions.blockMessages'
                        ) | translate
                      }}
                    </button>
                    <button
                      tuiOption
                      new
                      [tuiAppearance]="blockAscents ? 'negative' : 'neutral'"
                      iconStart="@tui.bell-off"
                      (click)="toggleHideAscents(); dropdownOpen.set(false)"
                    >
                      {{
                        (blockAscents
                          ? 'actions.ascentsHidden'
                          : 'actions.hideAscents'
                        ) | translate
                      }}
                    </button>
                  </tui-data-list>
                </ng-template>
              }
            </div>

            <div class="flex items-center gap-x-2 flex-wrap">
              @let country = profileCountry();
              @let city = profile()?.city;
              <span
                class="flex items-center gap-2"
                [tuiSkeleton]="loading ? 'country, city' : false"
              >
                {{ countriesNames()?.[country] }}{{ city ? ', ' + city : '' }}
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
                class="wrap-anywhere"
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

        @if (!isOwnProfile()) {
          <div class="flex gap-2">
            @let following = isFollowing();
            <button
              tuiButton
              type="button"
              appearance="secondary"
              size="m"
              [iconStart]="following ? '@tui.bell-filled' : '@tui.bell'"
              [tuiSkeleton]="loading"
              (click)="toggleFollow()"
            >
              {{
                (following ? 'actions.following' : 'actions.follow') | translate
              }}
            </button>

            <button
              tuiButton
              type="button"
              appearance="secondary"
              size="m"
              iconStart="@tui.messages-square"
              [tuiSkeleton]="loading"
              (click)="openChat()"
            >
              {{ 'actions.sendMessage' | translate }}
            </button>
          </div>
        }

        <tui-tabs
          [activeItemIndex]="activeTab()"
          (activeItemIndexChange)="activeTab.set($event)"
          class="w-full mt-6"
          [tuiDropdown]="tourHint"
          [tuiDropdownOpen]="
            tourService.step() === TourStep.PROFILE ||
            tourService.step() === TourStep.PROFILE_PROJECTS ||
            tourService.step() === TourStep.PROFILE_LIKES
          "
          tuiDropdownDirection="top"
        >
          <button tuiTab class="relative">
            @if (tourService.step() === TourStep.PROFILE) {
              <tui-pulse class="absolute -top-1 -right-1" />
            }
            {{ 'labels.ascents' | translate }}
          </button>
          <button tuiTab class="relative">
            @if (tourService.step() === TourStep.PROFILE_PROJECTS) {
              <tui-pulse class="absolute -top-1 -right-1" />
            }
            {{ 'labels.projects' | translate }}
          </button>
          @if (isOwnProfile()) {
            <button tuiTab class="relative">
              @if (tourService.step() === TourStep.PROFILE_LIKES) {
                <tui-pulse class="absolute -top-1 -right-1" />
              }
              {{ 'labels.likes' | translate }}
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

                  <tui-textfield
                    class="w-full sm:w-48"
                    [tuiTextfieldCleaner]="false"
                    [stringify]="sortValueContent"
                    tuiTextfieldSize="l"
                  >
                    <label tuiLabel for="sort-filter">
                      {{ 'labels.sortBy' | translate }}
                    </label>
                    <input
                      tuiSelect
                      id="sort-filter"
                      [formControl]="sortFilterControl"
                    />
                    <tui-data-list *tuiTextfieldDropdown>
                      <tui-data-list-wrapper new [items]="['grade', 'date']" />
                    </tui-data-list>
                  </tui-textfield>
                </div>

                <app-ascents-feed
                  [ascents]="accumulatedAscents()"
                  [isLoading]="isLoading()"
                  [hasMore]="hasMore()"
                  [showUser]="false"
                  [followedIds]="followedIds()"
                  [columns]="2"
                  [groupByGrade]="sortFilter() === 'grade'"
                  (loadMore)="loadMore()"
                  (follow)="onFollow($event)"
                  (unfollow)="onUnfollow($event)"
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
            } @else {
              <app-empty-state icon="@tui.list" />
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
            <div class="flex flex-col gap-8">
              <!-- Liked Areas -->
              <section class="grid gap-2">
                <header tuiHeader>
                  <h3 tuiTitle>{{ 'labels.likedAreas' | translate }}</h3>
                </header>
                <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
                  @if (likedAreasResource.isLoading()) {
                    <tui-loader class="col-span-full m-4" />
                  } @else {
                    @for (area of likedAreas(); track area.id) {
                      <button
                        class="p-6 rounded-3xl text-left"
                        [tuiAppearance]="
                          area.liked ? 'outline-destructive' : 'outline'
                        "
                        (click.zoneless)="router.navigate(['/area', area.slug])"
                      >
                        <div class="flex flex-col min-w-0 grow">
                          <header tuiHeader>
                            <h2 tuiTitle>{{ area.name }}</h2>
                          </header>
                          <section
                            class="flex items-center justify-between gap-2"
                          >
                            <div class="text-xl">
                              {{ area.crags_count }}
                              {{
                                'labels.' +
                                  (area.crags_count === 1 ? 'crag' : 'crags')
                                  | translate
                                  | lowercase
                              }}
                            </div>
                          </section>
                        </div>
                      </button>
                    } @empty {
                      <div class="col-span-full opacity-50">
                        <app-empty-state icon="@tui.heart" />
                      </div>
                    }
                  }
                </div>
              </section>

              <!-- Liked Crags -->
              <section class="grid gap-2">
                <header tuiHeader>
                  <h3 tuiTitle>{{ 'labels.likedCrags' | translate }}</h3>
                </header>
                <div class="grid gap-2 grid-cols-1 md:grid-cols-2">
                  @if (likedCragsResource.isLoading()) {
                    <tui-loader class="col-span-full m-4" />
                  } @else {
                    @for (crag of likedCrags(); track crag.id) {
                      <button
                        class="p-6 rounded-3xl text-left"
                        [tuiAppearance]="
                          crag.liked ? 'outline-destructive' : 'outline'
                        "
                        (click.zoneless)="
                          router.navigate(['/area', crag.area_slug, crag.slug])
                        "
                      >
                        <div class="flex flex-col min-w-0 grow">
                          <header tuiHeader>
                            <h2 tuiTitle>{{ crag.name }}</h2>
                          </header>
                          <section
                            class="flex items-center justify-between gap-2"
                          >
                            <div class="flex flex-col items-start">
                              <div class="text-xl">
                                {{ crag.topos_count }}
                                {{
                                  'labels.' +
                                    (crag.topos_count === 1 ? 'topo' : 'topos')
                                    | translate
                                    | lowercase
                                }}
                              </div>
                              <div class="text-sm opacity-70">
                                {{ crag.area_name }}
                              </div>
                            </div>
                          </section>
                        </div>
                      </button>
                    } @empty {
                      <div class="col-span-full opacity-50">
                        <app-empty-state icon="@tui.heart" />
                      </div>
                    }
                  }
                </div>
              </section>

              <!-- Liked Routes -->
              <section class="grid gap-2">
                <header tuiHeader>
                  <h3 tuiTitle>{{ 'labels.likedRoutes' | translate }}</h3>
                </header>
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
                    <div class="opacity-50">
                      <app-empty-state icon="@tui.heart" />
                    </div>
                  }
                </div>
              </section>
            </div>
          }
        }
      </section>
    </tui-scrollbar>

    <ng-template #tourHint>
      <app-tour-hint
        [description]="
          (tourService.step() === TourStep.PROFILE
            ? 'tour.profile.ascentsDescription'
            : tourService.step() === TourStep.PROFILE_PROJECTS
              ? 'tour.profile.projectsDescription'
              : 'tour.profile.likesDescription'
          ) | translate
        "
        [isLast]="tourService.step() === TourStep.PROFILE_LIKES"
        (next)="tourService.next()"
      />
    </ng-template>
  `,
  host: { class: 'flex grow min-h-0' },
})
export class UserProfileComponent {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  protected readonly tourService = inject(TourService);
  protected readonly TourStep = TourStep;
  private readonly countriesNames$ = inject(TUI_COUNTRIES);
  protected readonly countriesNames = toSignal(this.countriesNames$);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly followsService = inject(FollowsService);
  private readonly blockingService = inject(BlockingService);
  private readonly toast = inject(ToastService);
  private readonly userProfilesService = inject(UserProfilesService);
  private readonly filtersService = inject(FiltersService);

  // Route param (optional)
  id = input<string | undefined>();

  protected dropdownOpen = signal(false);

  private readonly dialogs = inject(TuiDialogService);

  protected readonly activeTab = this.global.profileActiveTab;

  protected onSwipe(event: TuiSwipeEvent): void {
    const direction = event.direction;
    const currentIndex = this.activeTab();
    const maxIndex = this.isOwnProfile() ? 2 : 1;
    if (direction === 'left' && currentIndex < maxIndex) {
      this.activeTab.set(currentIndex + 1);
    } else if (direction === 'right' && currentIndex > 0) {
      this.activeTab.set(currentIndex - 1);
    }
  }

  protected readonly followersCountResource = resource({
    params: () => ({
      userId: this.profile()?.id,
      change: this.followsService.followChange(),
    }),
    loader: async ({ params }) => {
      const userId = params.userId;
      if (!userId || !isPlatformBrowser(this.platformId)) return 0;
      return await this.followsService.getFollowersCount(userId);
    },
  });

  protected readonly followingCountResource = resource({
    params: () => ({
      userId: this.profile()?.id,
      change: this.followsService.followChange(),
    }),
    loader: async ({ params }) => {
      const userId = params.userId;
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

      const { data: likedCrags, error } = await this.supabase.client
        .from('crags')
        .select(
          `
          id,
          name,
          slug,
          area_id,
          topos_count:topos(count),
          area:areas(name, slug)
        `,
        )
        .in('id', cragIds);

      if (error) {
        console.error('[UserProfile] liked crags error', error);
        return [];
      }

      return likedCrags.map((c) => ({
        ...c,
        topos_count: c.topos_count?.[0]?.count ?? 0,
        area_name: c.area?.name,
        area_slug: c.area?.slug,
        liked: true,
      }));
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

      const { data: likedAreas, error } = await this.supabase.client
        .from('areas')
        .select(
          `
          id,
          name,
          slug,
          crags_count:crags(count)
        `,
        )
        .in('id', areaIds);

      if (error) {
        console.error('[UserProfile] liked areas error', error);
        return [];
      }

      return likedAreas.map((a) => ({
        ...a,
        crags_count: a.crags_count?.[0]?.count ?? 0,
        liked: true,
      }));
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

  protected readonly sortFilterControl = new FormControl<'grade' | 'date'>(
    this.global.ascentsSort(),
    {
      nonNullable: true,
    },
  );
  protected readonly sortFilter = toSignal(
    this.sortFilterControl.valueChanges.pipe(
      startWith(this.sortFilterControl.value),
    ),
    { initialValue: this.sortFilterControl.value },
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

  protected readonly sortValueContent = (option: 'grade' | 'date'): string => {
    return this.translate.instant(
      option === 'grade' ? 'labels.orderByGrade' : 'labels.orderByDate',
    );
  };

  protected readonly accumulatedAscents = signal<RouteAscentWithExtras[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly followedIds = signal<Set<string>>(new Set());

  loadMore() {
    if (this.hasMore() && !this.isLoading()) {
      this.isLoading.set(true);
      this.global.ascentsPage.update((p) => p + 1);
    }
  }

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);
    if (isBrowser) {
      void this.followsService
        .getFollowedIds()
        .then((ids) => this.followedIds.set(new Set(ids)));
    }

    effect(() => {
      const step = this.tourService.step();
      if (step === TourStep.PROFILE) {
        this.activeTab.set(0);
      } else if (step === TourStep.PROFILE_PROJECTS) {
        this.activeTab.set(1);
      } else if (step === TourStep.PROFILE_LIKES) {
        if (this.isOwnProfile()) {
          this.activeTab.set(2);
        } else {
          // If not own profile, skip likes and finish
          this.activeTab.set(1);
        }
      }
    });

    effect(() => {
      // Reset breadcrumbs when navigating to the profile page
      const profileId = this.profile()?.id;
      this.id(); // Track the id signal

      // Only reset data if the profile user ID has changed
      if (profileId && profileId !== this.global.profileUserId()) {
        this.global.resetDataByPage('home');
        this.global.profileUserId.set(profileId);
      }
    });

    effect(() => {
      const res = this.ascentsResource.value();
      if (res) {
        if (this.global.ascentsPage() === 0) {
          this.accumulatedAscents.set(res.items);
        } else {
          this.accumulatedAscents.update((prev) => [...prev, ...res.items]);
        }
        this.isLoading.set(false);
      } else if (this.ascentsResource.error()) {
        this.isLoading.set(false);
      }
    });

    // Sync initial global filters to local controls/signals if needed
    // However, global filters are typically reset to defaults on page entry.
    // The effect below ensures that when the local state changes, the global state is updated and the page is reset.
    effect(() => {
      const dateFilter = this.dateFilter();
      const query = this.query();
      const sort = this.sortFilter();

      // Read global filters to re-run the effect when they change (e.g., from the filter dialog)
      this.selectedGradeRange();
      this.selectedCategories();

      // Reset pagination when any filter changes
      this.global.ascentsPage.set(0);

      // Sync local filters with global signals
      this.global.ascentsDateFilter.set(dateFilter);
      this.global.ascentsQuery.set(query || null);
      this.global.ascentsSort.set(sort);
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

  onFollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.add(userId);
      return next;
    });
  }

  onUnfollow(userId: string) {
    this.followedIds.update((s) => {
      const next = new Set(s);
      next.delete(userId);
      return next;
    });
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
      change: this.followsService.followChange(),
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

  readonly blockStateResource = resource({
    params: () => ({
      userId: this.profile()?.id,
      change: this.blockingService.blockChange(),
    }),
    loader: async ({ params }) => {
      if (!params.userId || !isPlatformBrowser(this.platformId))
        return { blockMessages: false, blockAscents: false };
      return this.blockingService.getBlockState(params.userId);
    },
  });
  readonly blockState = computed(
    () =>
      this.blockStateResource.value() ?? {
        blockMessages: false,
        blockAscents: false,
      },
  );

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
  readonly hasMore = computed(() => {
    return this.accumulatedAscents().length < this.totalAscents();
  });
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
    const profile = this.profile();
    const followedUserId = profile?.id;
    if (!followedUserId || this.isOwnProfile()) return;

    if (this.isFollowing()) {
      const data: TuiConfirmData = {
        content: this.translate.instant('actions.unfollowConfirm', {
          name: profile.name,
        }),
        yes: this.translate.instant('actions.unfollow'),
        no: this.translate.instant('actions.cancel'),
        appearance: 'negative',
      };
      const confirmed = await firstValueFrom(
        this.dialogs.open<boolean>(TUI_CONFIRM, {
          label: this.translate.instant('actions.unfollow'),
          size: 's',
          data,
        }),
        { defaultValue: false },
      );
      if (!confirmed) return;
      await this.followsService.unfollow(followedUserId);
    } else {
      await this.followsService.follow(followedUserId);
    }
  }

  async toggleBlockMessages(): Promise<void> {
    const profile = this.profile();
    const userId = profile?.id;
    if (!userId || this.isOwnProfile()) return;

    const current = this.blockState();
    const isBlocking = !current.blockMessages;

    const data: TuiConfirmData = {
      content: this.translate.instant(
        isBlocking
          ? 'actions.blockMessagesConfirm'
          : 'actions.unblockMessagesConfirm',
        { name: profile.name },
      ),
      yes: this.translate.instant(
        isBlocking ? 'actions.block' : 'actions.unblock',
      ),
      no: this.translate.instant('actions.cancel'),
      appearance: isBlocking ? 'negative' : 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(
          isBlocking ? 'actions.blockMessages' : 'actions.unblockMessages',
        ),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = isBlocking
      ? await this.blockingService.toggleBlockMessages(
          userId,
          current.blockAscents,
        )
      : await this.blockingService.toggleUnblockMessages(
          userId,
          current.blockAscents,
        );

    if (success) {
      this.toast.success(
        isBlocking
          ? 'messages.toasts.messagesBlocked'
          : 'messages.toasts.messagesUnblocked',
      );
    }
  }

  async toggleHideAscents(): Promise<void> {
    const profile = this.profile();
    const userId = profile?.id;
    if (!userId || this.isOwnProfile()) return;

    const current = this.blockState();
    const isHiding = !current.blockAscents;

    const data: TuiConfirmData = {
      content: this.translate.instant(
        isHiding ? 'actions.hideAscentsConfirm' : 'actions.showAscentsConfirm',
        { name: profile.name },
      ),
      yes: this.translate.instant(
        isHiding ? 'actions.hide' : 'actions.showAscents',
      ),
      no: this.translate.instant('actions.cancel'),
      appearance: isHiding ? 'negative' : 'primary',
    };

    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant(
          isHiding ? 'actions.hideAscents' : 'actions.showAscents',
        ),
        size: 's',
        data,
      }),
      { defaultValue: false },
    );

    if (!confirmed) return;

    const success = isHiding
      ? await this.blockingService.toggleBlockAscents(
          userId,
          current.blockMessages,
        )
      : await this.blockingService.toggleUnblockAscents(
          userId,
          current.blockMessages,
        );

    if (success) {
      this.toast.success(
        isHiding
          ? 'messages.toasts.ascentsHidden'
          : 'messages.toasts.ascentsShown',
      );

      // If hiding ascents, we might want to unfollow as well?
      if (isHiding && this.isFollowing()) {
        await this.followsService.unfollow(userId);
      }
    }
  }

  protected openFollowsDialog(type: 'followers' | 'following'): void {
    const userId = this.profile()?.id;
    if (!userId) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(
        new PolymorpheusComponent(UserListDialogComponent),
        {
          data: { userId, type },
          label: this.translate.instant(`labels.${type}`),
          size: 'm',
        },
      ),
      { defaultValue: false },
    );
  }

  protected openChat(): void {
    const userId = this.profile()?.id;
    if (!userId) return;

    void firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        data: { userId },
        label: this.translate.instant('labels.messages'),
        size: 'm',
      }),
      { defaultValue: undefined },
    );
  }

  protected showEnlargedPhoto(): void {
    const avatar = this.profileAvatarSrc();
    if (!avatar) return;

    void this.dialogs
      .open(new PolymorpheusComponent(PhotoViewerDialogComponent), {
        data: { imageUrl: avatar },
        size: 'l',
        appearance: 'flat',
      })
      .subscribe();
  }
}

export default UserProfileComponent;
