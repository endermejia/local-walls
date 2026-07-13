import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  PLATFORM_ID,
  resource,
  computed,
  signal,
  viewChild,
  input,
  effect,
} from '@angular/core';

import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiDialogService,
  TuiScrollbar,
} from '@taiga-ui/core';
import {
  TuiBadgeNotification,
  TuiBadgedContent,
  TuiSkeleton,
} from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import {
  combineLatest,
  concatMap,
  distinctUntilChanged,
  filter,
  map,
  scan,
  startWith,
  Subject,
  switchMap,
  tap,
  firstValueFrom,
} from 'rxjs';

import { DesnivelService } from '../../services/desnivel.service';
import { FollowsService } from '../../services/follows.service';
import { GlobalData } from '../../services/global-data';
import { LocalStorage } from '../../services/local-storage';
import { ScrollService } from '../../services/scroll.service';
import { SupabaseService } from '../../services/supabase.service';
import { VisitedCragsService } from '../../services/visited-crags.service';
import { CartService } from '../../services/cart.service';

import { AscentsFeedComponent } from '../../components/ascent/ascents-feed';
import { DropdownButtonComponent } from '../../components/ui/dropdown-button';
import { NotificationsDialogComponent } from '../../components/dialogs/notifications-dialog';
import {
  ChatDialogComponent,
  ChatDialogData,
} from '../../components/dialogs/chat-dialog';
import {
  FilterDialog,
  FilterDialogComponent,
} from '../../components/dialogs/filter-dialog';

import {
  ClimbingKind,
  ClimbingKinds,
  FeedItem,
  LABEL_TO_VERTICAL_LIFE,
  ORDERED_GRADE_VALUES,
  RouteAscentWithExtras,
} from '../../models';

export type HomeFeedFilter =
  | 'following'
  | 'all'
  | 'favorite_areas'
  | 'favorite_crags'
  | 'favorite_routes';

@Component({
  selector: 'app-home',
  imports: [
    AscentsFeedComponent,
    CommonModule,
    DropdownButtonComponent,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiBadgedContent,
    TuiBadgeNotification,
    TuiButton,
    TuiDataList,
    TuiScrollbar,
    TuiSkeleton,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="flex flex-col gap-4 max-w-5xl mx-auto w-full pb-32 pt-2">
        <div class="px-4 flex flex-col gap-4 relative">
          <!-- Filter Segmented -->
          <div class="flex justify-between items-center gap-2">
            <!-- Left Side: Select and Filter -->
            <div class="flex items-center gap-2">
              @if (!followsLoaded()) {
                <div
                  [tuiSkeleton]="true"
                  class="w-32 h-10 rounded-full opacity-60"
                ></div>
                <div
                  [tuiSkeleton]="true"
                  class="w-10 h-10 rounded-full opacity-60"
                ></div>
              } @else {
                @if (
                  followedIds().size > 0 ||
                  global.likedAreaIds().length > 0 ||
                  global.likedCragIds().length > 0 ||
                  global.likedRouteIds().length > 0
                ) {
                  <app-dropdown-button
                    appearance="flat-grayscale"
                    size="xl"
                    [content]="feedFilterDropdown"
                    [(open)]="dropdownOpen"
                  >
                    {{ filterLabels[feedFilter()] | translate }}
                  </app-dropdown-button>
                }
                <tui-badged-content [style.--tui-radius.%]="50">
                  @if (hasActiveFilters()) {
                    <tui-badge-notification
                      tuiAppearance="accent"
                      size="s"
                      tuiSlot="top"
                    />
                  }
                  <button
                    tuiIconButton
                    size="m"
                    appearance="action-grayscale"
                    iconStart="@tui.sliders-horizontal"
                    (click.zoneless)="openFilters()"
                    [attr.aria-label]="'filters' | translate"
                    title="Filters"
                  >
                    <span class="tui-sr-only">{{ 'filters' | translate }}</span>
                  </button>
                </tui-badged-content>
              }
            </div>

            @if (!followsLoaded()) {
              <div
                [tuiSkeleton]="true"
                class="w-10 h-10 rounded-full opacity-60 mt-1"
              ></div>
            } @else {
              <div class="flex items-center gap-2">
                @if (global.isAdmin()) {
                  <tui-badged-content [style.--tui-radius.%]="50">
                    @if (cart.totalItems(); as totalItems) {
                      <tui-badge-notification
                        tuiAppearance="accent"
                        size="s"
                        tuiSlot="top"
                      >
                        {{ totalItems }}
                      </tui-badge-notification>
                    }
                    <button
                      tuiIconButton
                      size="m"
                      appearance="action-grayscale"
                      iconStart="@tui.shopping-bag"
                      [routerLink]="['/merchandising']"
                      [attr.aria-label]="'nav.merchandising' | translate"
                      title="Shop"
                    >
                      <span class="tui-sr-only">{{
                        'nav.merchandising' | translate
                      }}</span>
                    </button>
                  </tui-badged-content>
                }
                <tui-badged-content [style.--tui-radius.%]="50">
                  @if (
                    global.unreadNotificationsCount();
                    as unreadNotifications
                  ) {
                    <tui-badge-notification
                      tuiAppearance="accent"
                      size="s"
                      tuiSlot="top"
                    >
                      {{ unreadNotifications }}
                    </tui-badge-notification>
                  }
                  <button
                    tuiIconButton
                    size="m"
                    appearance="action-grayscale"
                    iconStart="@tui.heart"
                    (click.zoneless)="openNotifications()"
                    [attr.aria-label]="'notifications' | translate"
                    title="Notifications"
                  >
                    <span class="tui-sr-only">{{
                      'notifications' | translate
                    }}</span>
                  </button>
                </tui-badged-content>
              </div>
            }
          </div>
          <!-- Crags -->
          @if (!followsLoaded() || activeCragsResource.isLoading()) {
            <div class="flex flex-col gap-2 mt-2">
              <div
                [tuiSkeleton]="true"
                class="w-24 h-4 rounded-full opacity-40 ml-1"
              ></div>
              <div
                class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar"
              >
                @for (_ of [1, 2, 3, 4, 5, 6]; track $index) {
                  <div
                    [tuiSkeleton]="true"
                    class="flex-none w-28 h-11 rounded-2xl opacity-30"
                  ></div>
                }
              </div>
            </div>
          } @else if (activeCrags(); as crags) {
            @if (crags.length > 0) {
              <div class="flex flex-col gap-2 mt-2">
                <span class="text-xs font-bold opacity-60 uppercase px-1">
                  {{ 'crags' | translate }}
                </span>
                <div
                  class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar"
                >
                  @for (c of crags; track c.id) {
                    <a
                      [routerLink]="['/area', c.area_slug, c.slug]"
                      tuiAppearance="textfield"
                      class="flex-none p-3 rounded-2xl"
                    >
                      <span class="whitespace-nowrap font-bold text-sm">{{
                        c.name
                      }}</span>
                    </a>
                  }
                </div>
              </div>
            }
          }

          <!-- Ascents Feed -->
          <app-ascents-feed
            [ascents]="ascents()"
            [isLoading]="isLoading()"
            [hasMore]="hasMore()"
            [followedIds]="followedIds()"
            [columns]="2"
            (loadMore)="loadMore()"
            (follow)="onFollow($event)"
            (unfollow)="onUnfollow($event)"
          />
        </div>
      </div>
    </tui-scrollbar>

    <ng-template #feedFilterDropdown>
      <tui-data-list size="l">
        @for (option of filterOptions(); track option) {
          <button tuiOption new (click)="setFilter(option)">
            {{ filterLabels[option] | translate }}
          </button>
        }
      </tui-data-list>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-1 flex-col min-h-0',
  },
})
export class HomeComponent implements OnDestroy {
  protected readonly global = inject(GlobalData);
  protected readonly cart = inject(CartService);
  protected readonly supabase = inject(SupabaseService);
  private readonly desnivelService = inject(DesnivelService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly followsService = inject(FollowsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);
  private readonly scrollService = inject(ScrollService);
  private readonly storage = inject(LocalStorage);
  private readonly translate = inject(TranslateService);
  private readonly visitedCragsService = inject(VisitedCragsService);

  private readonly STORAGE_KEY = 'home_feed_filter';

  protected readonly scrollbar = viewChild(TuiScrollbar, { read: ElementRef });

  readonly roomId = input<string | undefined>();
  protected readonly followedIds = signal<Set<string>>(new Set());
  protected readonly followsLoaded = signal(false);

  protected readonly activeCragsResource = resource({
    loader: () => this.fetchActiveCrags(),
  });

  protected readonly activeCrags = computed(() => {
    const visited = this.visitedCragsService.visitedCrags();
    const active = this.activeCragsResource.value() ?? [];

    const merged = [...visited];
    const visitedIds = new Set(visited.map((c) => c.id));

    for (const c of active) {
      if (!visitedIds.has(c.id)) {
        merged.push(c);
      }
    }

    return merged;
  });

  protected readonly feedFilter = signal<HomeFeedFilter>(
    (this.storage.getItem(this.STORAGE_KEY) as HomeFeedFilter) || 'following',
  );

  protected readonly saveFilterEffect = effect(() => {
    const currentFilter = this.feedFilter();
    const options = this.filterOptions();
    if (!options.includes(currentFilter)) {
      this.feedFilter.set('following');
    } else {
      this.storage.setItem(this.STORAGE_KEY, currentFilter);
    }
  });
  protected dropdownOpen = signal(false);

  protected readonly filterLabels: Record<HomeFeedFilter, string> = {
    following: 'following',
    all: 'all',
    favorite_areas: 'likedAreas',
    favorite_crags: 'likedCrags',
    favorite_routes: 'likedRoutes',
  };

  protected readonly filterOptions = computed(() => {
    const options: (keyof typeof this.filterLabels)[] = ['following', 'all'];
    if (this.global.likedAreaIds().length > 0) {
      options.push('favorite_areas');
    }
    if (this.global.likedCragIds().length > 0) {
      options.push('favorite_crags');
    }
    if (this.global.likedRouteIds().length > 0) {
      options.push('favorite_routes');
    }
    return options;
  });

  protected setFilter(filter: HomeFeedFilter) {
    this.feedFilter.set(filter);
    this.dropdownOpen.set(false);
  }

  protected readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.global.feedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.global.feedCategories().length > 0;
  });

  constructor() {
    this.loadFollowedIds();

    effect(() => {
      const id = this.roomId();
      if (id && this.isBrowser) {
        void this.openChat(id);
      }
    });

    this.scrollService.scrollToTop$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.scrollToTop();
    });

    combineLatest([
      toObservable(this.feedFilter),
      toObservable(this.global.feedCategories),
      toObservable(this.global.feedGradeRange),
      toObservable(this.followsLoaded),
      toObservable(this.global.likedAreaIds),
      toObservable(this.global.likedCragIds),
      toObservable(this.global.likedRouteIds),
      toObservable(this.global.feedShowIndoorAscents),
    ])
      .pipe(
        takeUntilDestroyed(),
        filter(([, , , loaded]) => loaded),
        map(
          ([f, cat, grades, , areas, crags, routes, showIndoor]) =>
            ({
              filter: f,
              categories: cat,
              gradeRange: grades,
              areas,
              crags,
              routes,
              showIndoor,
            }) as const,
        ),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap(({ filter, showIndoor }) => {
          this.ascents.set([]);
          this.hasMore.set(true);
          this.isLoading.set(true);
          return this.loadMore$.pipe(
            startWith(void 0),
            scan((acc) => acc + 1, -1),
            concatMap(async (page) => {
              let ascents = await this.fetchAscents(page, filter);
              if (showIndoor) {
                const indoor = await this.fetchIndoorAscents(page, filter);
                ascents = [...ascents, ...indoor].sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return dateB - dateA;
                });
              }
              if (filter === 'all') {
                const lastItem = this.ascents().slice(-1)[0];
                const beforeDate =
                  lastItem && lastItem.date
                    ? new Date(lastItem.date).toISOString()
                    : undefined;
                const news = await this.desnivelService.getLatestPosts(
                  5,
                  beforeDate,
                );
                const all = [...ascents, ...news].sort((a, b) => {
                  const dateA = a.date ? new Date(a.date).getTime() : 0;
                  const dateB = b.date ? new Date(b.date).getTime() : 0;
                  return dateB - dateA;
                });
                return all;
              }
              return ascents;
            }),
            tap(() => this.isLoading.set(false)),
          );
        }),
      )
      .subscribe((newAscents) => {
        this.ascents.update((current) => {
          const all = [...current, ...newAscents];
          // Since we might be merging two separate paginated streams (indoor and outdoor),
          // a simple append could lead to out-of-order items across page boundaries.
          // Sorting the entire accumulated array guarantees chronological order.
          return all.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
        });
      });
  }

  private async loadFollowedIds() {
    if (!this.isBrowser) {
      return;
    }
    const cacheKey = 'cached_followed_ids_v1';
    try {
      await this.supabase.whenReady();
      const ids = await this.followsService.getFollowedIds();
      this.followedIds.set(new Set(ids));
      this.storage.setItem(cacheKey, JSON.stringify(ids));
      if (ids.length === 0) {
        this.feedFilter.set('all');
      }
    } catch (error: unknown) {
      console.error('Error loading followed ids:', error);
      // Offline fallback: try to restore from cache
      try {
        const cached = this.storage.getItem(cacheKey);
        if (cached) {
          const ids = JSON.parse(cached) as string[];
          this.followedIds.set(new Set(ids));
        } else {
          this.feedFilter.set('all');
        }
      } catch {
        this.feedFilter.set('all');
      }
    } finally {
      this.followsLoaded.set(true);
    }
  }

  private async fetchActiveCrags() {
    if (!this.isBrowser) return [];

    const cacheKey = 'cached_active_crags_v1';

    try {
      await this.supabase.whenReady();
      const { data, error } = await this.supabase.client
        .from('route_ascents')
        .select(
          `
          route:routes!inner(
            crag:crags(
              id, name, slug, area:areas(slug)
            )
          )
        `,
        )
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      const cragsMap = new Map<
        number,
        { id: number; name: string; slug: string; area_slug: string }
      >();
      data?.forEach((d) => {
        const route = d.route as unknown as {
          crag: {
            id: number;
            name: string;
            slug: string;
            area: { slug: string }[] | { slug: string };
          }[];
        };
        const c = Array.isArray(route?.crag) ? route?.crag[0] : route?.crag;
        if (c && !cragsMap.has(c.id)) {
          const area = Array.isArray(c.area) ? c.area[0] : c.area;
          cragsMap.set(c.id, {
            id: c.id,
            name: c.name,
            slug: c.slug,
            area_slug: area?.slug,
          });
        }
      });

      const result = Array.from(cragsMap.values()).slice(0, 8);
      this.storage.setItem(cacheKey, JSON.stringify(result));
      return result;
    } catch (e: unknown) {
      console.warn('[Home] fetchActiveCrags error/offline, trying cache', e);
      const cached = this.storage.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          console.error('[Home] Cache parse error');
        }
      }
      return [];
    }
  }

  // Infinite Scroll & Async Pipe for Ascents
  private readonly loadMore$ = new Subject<void>();
  protected readonly isLoading = signal(true);
  protected readonly hasMore = signal(true);
  protected readonly ascents = signal<FeedItem[]>([]);

  private async fetchIndoorAscents(
    page: number,
    filter: HomeFeedFilter = this.feedFilter(),
  ): Promise<(RouteAscentWithExtras & { kind: 'ascent' })[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const size = 10;
    const fromIdx = page * size;
    const toIdx = fromIdx + size - 1;

    let query = this.supabase.client.from('indoor_ascents').select(
      `
          *,
          route:indoor_routes!inner(
            *,
            center:indoor_centers!inner(*)
          )
        `,
    );

    if (filter !== 'all') {
      query = query.neq('user_id', userId);
    }

    if (filter === 'following') {
      const followed = Array.from(this.followedIds());
      if (followed.length === 0) return [];
      query = query.in('user_id', followed);
    } else if (filter === 'favorite_crags') {
      return []; // outdoor crags don't apply to indoor
    } else if (filter === 'favorite_routes') {
      return []; // outdoor liked routes don't apply to indoor
    } else if (filter === 'favorite_areas') {
      return []; // indoor centers don't belong to areas
    }

    const categories = this.global.feedCategories();
    if (categories.length > 0) {
      const kindsArray: ClimbingKind[] = [];
      if (categories.includes(0)) kindsArray.push(ClimbingKinds.SPORT);
      if (categories.includes(1)) kindsArray.push(ClimbingKinds.BOULDER);
      if (kindsArray.length > 0) {
        query = query.in('route.climbing_kind', kindsArray);
      }
    }

    const [loIdx, hiIdx] = this.global.feedGradeRange();
    if (loIdx > 0 || hiIdx < ORDERED_GRADE_VALUES.length - 1) {
      const allowedLabels = ORDERED_GRADE_VALUES.slice(loIdx, hiIdx + 1);
      const allowedDbGrades = allowedLabels
        .map((label) => LABEL_TO_VERTICAL_LIFE[label])
        .filter((g): g is number => g !== undefined);
      if (!allowedDbGrades.includes(0)) {
        allowedDbGrades.push(0);
      }
      query = query.in('route.grade', allowedDbGrades);
    }

    try {
      const { data: ascents, error } = await query
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(fromIdx, toIdx);

      if (error) throw error;
      if (!ascents || ascents.length === 0) return [];

      const userIds = [...new Set(ascents.map((a) => a.user_id))].filter(
        (id): id is string => id !== null,
      );
      const { data: profiles } = await this.supabase.client
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      return ascents.map((a) => {
        const { route, ...ascentRest } = a as {
          route?: {
            center?:
              | { slug?: string; name?: string }
              | { slug?: string; name?: string }[];
          };
          user_id: string;
          [key: string]: unknown;
        };
        let mappedRoute: RouteAscentWithExtras['route'] = undefined;
        if (route) {
          const center = Array.isArray(route.center)
            ? route.center[0]
            : route.center;
          mappedRoute = {
            ...route,
            crag_slug: center?.slug,
            crag_name: center?.name,
            liked: false,
            project: false,
          } as RouteAscentWithExtras['route'];
        }
        return {
          ...ascentRest,
          kind: 'ascent',
          user: a.user_id ? profileMap.get(a.user_id) : undefined,
          route: mappedRoute,
        } as RouteAscentWithExtras & { kind: 'ascent' };
      });
    } catch (e: unknown) {
      console.warn('[Home] fetchIndoorAscents error', e);
      return [];
    }
  }

  private async fetchAscents(
    page: number,
    filter: HomeFeedFilter = this.feedFilter(),
  ): Promise<(RouteAscentWithExtras & { kind: 'ascent' })[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const size = 10;
    const fromIdx = page * size;
    const toIdx = fromIdx + size - 1;

    let query = this.supabase.client.from('route_ascents').select(
      `
          *,
          route:routes!inner(
            *,
            crag:crags!inner(
              *,
              area:areas!inner(slug, name)
            )
          )
        `,
    );

    if (filter !== 'all') {
      query = query.neq('user_id', userId);
    }

    if (filter === 'following') {
      const followed = Array.from(this.followedIds());
      if (followed.length === 0) {
        this.hasMore.set(false);
        return [];
      }
      query = query.in('user_id', followed);
    } else if (filter === 'favorite_areas') {
      const areaIds = this.global.likedAreaIds();
      if (areaIds.length === 0) {
        this.hasMore.set(false);
        return [];
      }
      query = query.in('route.crag.area_id', areaIds);
    } else if (filter === 'favorite_crags') {
      const cragIds = this.global.likedCragIds();
      if (cragIds.length === 0) {
        this.hasMore.set(false);
        return [];
      }
      query = query.in('route.crag_id', cragIds);
    } else if (filter === 'favorite_routes') {
      const routeIds = this.global.likedRouteIds();
      if (routeIds.length === 0) {
        this.hasMore.set(false);
        return [];
      }
      query = query.in('route_id', routeIds);
    }

    const categories = this.global.feedCategories();
    if (categories.length > 0) {
      const kindsArray: ClimbingKind[] = [];
      if (categories.includes(0)) kindsArray.push(ClimbingKinds.SPORT);
      if (categories.includes(1)) kindsArray.push(ClimbingKinds.BOULDER);
      if (categories.includes(2)) kindsArray.push(ClimbingKinds.MULTIPITCH);
      if (kindsArray.length > 0) {
        query = query.in('route.climbing_kind', kindsArray);
      }
    }

    const [loIdx, hiIdx] = this.global.feedGradeRange();
    if (loIdx > 0 || hiIdx < ORDERED_GRADE_VALUES.length - 1) {
      const allowedLabels = ORDERED_GRADE_VALUES.slice(loIdx, hiIdx + 1);
      const allowedDbGrades = allowedLabels
        .map((label) => LABEL_TO_VERTICAL_LIFE[label])
        .filter((g): g is number => g !== undefined);
      // Ensure projects (0) are always rendered for partial ranges
      if (!allowedDbGrades.includes(0)) {
        allowedDbGrades.push(0);
      }
      query = query.in('grade', allowedDbGrades);
    }

    const cacheKey = `cached_home_feed_${filter}_${page}_v1`;

    try {
      const { data: ascents, error } = await query
        .order('date', { ascending: false })
        .order('id', { ascending: false })
        .range(fromIdx, toIdx)
        .overrideTypes<RouteAscentWithExtras[]>();

      if (error) throw error;

      if (!ascents || ascents.length === 0) {
        this.hasMore.set(false);
        return [];
      }

      if (ascents.length < size) {
        this.hasMore.set(false);
      }

      const userIds = [...new Set(ascents.map((a) => a.user_id))];
      const { data: profiles } = await this.supabase.client
        .from('user_profiles')
        .select('*')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      const result = ascents.map((a) => {
        const { route, ...ascentRest } = a;
        let mappedRoute: RouteAscentWithExtras['route'] = undefined;
        if (route) {
          const crag = Array.isArray(route.crag) ? route.crag[0] : route.crag;
          const area = Array.isArray(crag?.area) ? crag?.area[0] : crag?.area;
          mappedRoute = {
            ...route,
            crag_slug: crag?.slug,
            crag_name: crag?.name,
            area_slug: area?.slug,
            area_name: area?.name,
            liked: false,
            project: false,
          };
        }
        return {
          ...ascentRest,
          kind: 'ascent',
          user: a.user_id ? profileMap.get(a.user_id) : undefined,
          route: mappedRoute,
        } as RouteAscentWithExtras & { kind: 'ascent' };
      });

      this.storage.setItem(cacheKey, JSON.stringify(result));
      return result;
    } catch (e: unknown) {
      console.warn('[Home] fetchAscents error/offline, trying cache', e);
      const cached = this.storage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (!parsed || parsed.length === 0) {
            this.hasMore.set(false);
            return [];
          }
          if (parsed.length < size) {
            this.hasMore.set(false);
          }
          return parsed;
        } catch {
          console.error('[Home] Cache parse error');
        }
      }
      this.hasMore.set(false);
      return [];
    }
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

  loadMore() {
    if (this.isBrowser && !this.isLoading() && this.hasMore()) {
      this.isLoading.set(true);
      this.loadMore$.next();
    }
  }

  async openFilters() {
    const data: FilterDialog = {
      categories: this.global.feedCategories(),
      gradeRange: this.global.feedGradeRange(),
      showCategories: true,
      showGradeRange: true,
      showShade: false,
      showIndoorAscents: this.global.feedShowIndoorAscents(),
    };

    const result = await firstValueFrom(
      this.dialogs.open<FilterDialog>(
        new PolymorpheusComponent(FilterDialogComponent),
        {
          label: this.translate.instant('filters'),
          size: 'l',
          data,
          dismissible: false,
        },
      ),
      { defaultValue: null },
    );

    if (!result) return;
    this.global.feedCategories.set(result.categories ?? []);
    if (result.gradeRange) {
      this.global.feedGradeRange.set(result.gradeRange);
    }
    if (result.showIndoorAscents !== undefined) {
      this.global.feedShowIndoorAscents.set(result.showIndoorAscents);
    }
  }

  protected openNotifications(): void {
    void firstValueFrom(
      this.dialogs.open(
        new PolymorpheusComponent(NotificationsDialogComponent),
        {
          label: this.translate.instant('notifications'),
          size: 'm',
        },
      ),
      { defaultValue: undefined },
    );
  }

  protected async openChat(roomId?: string): Promise<void> {
    const data: ChatDialogData = { roomId };

    await firstValueFrom(
      this.dialogs.open(new PolymorpheusComponent(ChatDialogComponent), {
        label: this.translate.instant('messages'),
        size: 'm',
        data,
      }),
      { defaultValue: undefined },
    );

    // Clean up URL after closing
    if (this.roomId()) {
      void this.router.navigate(['/home'], { replaceUrl: true });
    }
  }

  private scrollToTop() {
    if (this.scrollbar()?.nativeElement) {
      this.scrollbar()!.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  ngOnDestroy() {
    this.loadMore$.complete();
  }
}
