import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiLoader,
  TuiScrollbar,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import {
  TuiDialogService,
  TuiSearchHotkey,
  TuiSearchResults,
} from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiAvatar,
  TuiConfirmData,
  TuiRating,
} from '@taiga-ui/kit';
import { TuiCell, TuiHeader, TuiInputSearch } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  concatMap,
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  from,
  map,
  Observable,
  scan,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import {
  GradeLabel,
  RouteAscentWithExtras,
  SearchData,
  SearchItem,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { FollowsService, GlobalData, SupabaseService } from '../services';

@Component({
  selector: 'app-infinite-scroll-trigger',
  template: '<div class="h-1 w-full"></div>',
})
export class InfiniteScrollTriggerComponent
  implements AfterViewInit, OnDestroy
{
  private el = inject(ElementRef);
  intersect = output<void>();
  private observer?: IntersectionObserver;

  ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.intersect.emit();
      }
    });
    this.observer.observe(this.el.nativeElement);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}

@Component({
  selector: 'app-home',
  imports: [
    AsyncPipe,
    CommonModule,
    FormsModule,
    InfiniteScrollTriggerComponent,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiHeader,
    TuiIcon,
    TuiInputSearch,
    TuiLoader,
    TuiRating,
    TuiScrollbar,
    TuiSearchHotkey,
    TuiSearchResults,
    TuiTextfield,
    TuiTitle,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full pb-32">
        <!-- Search bar -->
        <div
          class="w-full sticky top-0 z-50 bg-[var(--tui-background-base)] py-2"
        >
          <tui-textfield>
            <input
              tuiSearchHotkey
              autocomplete="off"
              [formControl]="control"
              [tuiInputSearch]="search"
              [(tuiInputSearchOpen)]="searchOpen"
              [placeholder]="'labels.searchPlaceholder' | translate"
            />
            <ng-template #search>
              <tui-search-results [results]="results$ | async">
                <ng-template let-item>
                  <a
                    tuiCell
                    [routerLink]="item.href"
                    (click)="control.setValue(''); searchOpen = false"
                  >
                    @if (item.type === 'user') {
                      <tui-avatar
                        [src]="item.icon || '@tui.user'"
                        size="xs"
                        class="mr-2"
                      />
                    } @else if (item.icon) {
                      <tui-icon [icon]="item.icon" class="mr-2" />
                    }
                    <span tuiTitle>
                      {{ item.title }}
                      @if (item.subtitle) {
                        <span tuiSubtitle>{{ item.subtitle }}</span>
                      }
                    </span>
                  </a>
                </ng-template>
              </tui-search-results>
            </ng-template>
          </tui-textfield>
        </div>

        <!-- Active Crags -->
        @if (activeCrags$ | async; as crags) {
          @if (crags.length > 0) {
            <div class="flex flex-col gap-2 mt-2">
              <span class="text-xs font-bold opacity-60 uppercase px-1">
                {{ 'labels.crags' | translate }}
              </span>
              <div
                class="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar"
              >
                @for (c of crags; track c.id) {
                  <a
                    [routerLink]="['/area', c.area_slug, c.slug]"
                    tuiAppearance="textfield"
                    class="flex-none p-3 rounded-2xl flex items-center gap-2 no-underline text-inherit hover:bg-[var(--tui-background-neutral-1)]"
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
        <div class="flex flex-col gap-6 mt-4">
          @if (ascents$ | async; as ascents) {
            @for (ascent of ascents; track ascent.id) {
              @defer (on viewport) {
                <button
                  tuiAppearance="flat-grayscale"
                  (click)="
                    ascent.route
                      ? router.navigate([
                          '/area',
                          ascent.route.area_slug,
                          ascent.route.crag_slug,
                          ascent.route.slug,
                        ])
                      : null
                  "
                  class="flex flex-col gap-4 p-4 rounded-3xl relative no-underline text-inherit hover:no-underline"
                >
                  <header tuiHeader class="flex justify-between items-center">
                    <div
                      role="link"
                      tabindex="0"
                      (click)="
                        $event.stopPropagation();
                        $event.preventDefault();
                        router.navigate(['/profile', ascent.user_id])
                      "
                      (keydown.enter)="
                        $event.stopPropagation();
                        $event.preventDefault();
                        router.navigate(['/profile', ascent.user_id])
                      "
                      class="flex items-center gap-3 no-underline text-inherit cursor-pointer group/user"
                    >
                      <tui-avatar
                        [src]="
                          supabase.buildAvatarUrl(ascent.user?.avatar) ||
                          '@tui.user'
                        "
                        size="s"
                      />
                      <div class="flex flex-col">
                        <span
                          class="font-bold text-sm group-hover/user:underline"
                        >
                          {{ ascent.user?.name || 'User' }}
                        </span>
                        <span class="text-xs text-gray-400">
                          {{ ascent.date | date: 'mediumDate' }}
                        </span>
                      </div>
                    </div>

                    @if (ascent.user_id !== supabase.authUserId()) {
                      @if (followedIds().has(ascent.user_id)) {
                        <button
                          tuiButton
                          size="s"
                          appearance="secondary-grayscale"
                          class="!rounded-full"
                          (click)="
                            unfollow(
                              ascent.user_id,
                              ascent.user?.name || 'User'
                            );
                            $event.stopPropagation()
                          "
                        >
                          {{ 'actions.following' | translate }}
                        </button>
                      } @else {
                        <button
                          tuiButton
                          size="s"
                          appearance="action"
                          class="!rounded-full"
                          (click)="
                            follow(ascent.user_id); $event.stopPropagation()
                          "
                        >
                          {{ 'actions.follow' | translate }}
                        </button>
                      }
                    }
                  </header>

                  <div class="flex flex-col gap-1">
                    @if (ascent.route) {
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-bold text-lg">
                          {{ ascent.route.name }}
                        </span>
                        @if (ascent.rate) {
                          <tui-rating
                            [ngModel]="ascent.rate"
                            [max]="5"
                            [readOnly]="true"
                            class="pointer-events-none"
                            [style.font-size.rem]="0.5"
                          />
                        }
                      </div>
                      <div
                        class="flex items-center gap-2 text-sm text-gray-600"
                      >
                        <span class="font-semibold text-blue-600">
                          {{ gradeLabelByNumber[ascent.route.grade] }}
                        </span>
                        @if (ascent.type) {
                          <span
                            class="px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-bold"
                          >
                            {{ 'ascentTypes.' + ascent.type | translate }}
                          </span>
                        }
                        <span>•</span>
                        <span>{{ ascent.route.crag_name }}</span>
                      </div>
                    }
                  </div>

                  @if (ascent.comment) {
                    <p
                      class="text-sm text-gray-700 italic border-l-2 border-gray-200 pl-3 py-1 self-start"
                    >
                      "{{ ascent.comment }}"
                    </p>
                  }
                </button>
              } @placeholder {
                <div
                  class="h-64 w-full bg-gray-50 animate-pulse rounded-xl"
                ></div>
              }
            }

            @if (isLoading()) {
              <div class="flex justify-center p-8">
                <tui-loader />
              </div>
            }

            @if (ascents.length > 0 && !isLoading() && hasMore()) {
              <app-infinite-scroll-trigger (intersect)="loadMore()" />
            }
          } @else {
            @if (isLoading()) {
              <div class="flex justify-center p-20">
                <tui-loader size="xl" />
              </div>
            }
          }
        </div>
      </div>
    </tui-scrollbar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-1 flex-col min-h-0',
  },
})
export class HomeComponent implements OnDestroy {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  private readonly followsService = inject(FollowsService);
  private readonly translate = inject(TranslateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  protected readonly gradeLabelByNumber: Partial<Record<number, GradeLabel>> =
    VERTICAL_LIFE_TO_LABEL;
  protected readonly followedIds = signal<Set<string>>(new Set());

  protected readonly activeCrags$ = from(this.fetchActiveCrags()).pipe(
    shareReplay(1),
  );

  constructor() {
    this.loadFollowedIds();
  }

  private async loadFollowedIds() {
    if (!this.isBrowser) return;
    const ids = await this.followsService.getFollowedIds();
    this.followedIds.set(new Set(ids));
  }

  private async fetchActiveCrags() {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const { data } = await this.supabase.client
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
    return Array.from(cragsMap.values()).slice(0, 8);
  }

  // Search logic
  protected readonly control = new FormControl('');
  protected searchOpen = false;

  protected readonly results$ = this.control.valueChanges.pipe(
    map((v) => (v ?? '').trim()),
    debounceTime(300),
    distinctUntilChanged(),
    switchMap((query) => {
      if (query.length < 2) return from([null]);
      return from(
        (async (): Promise<SearchData> => {
          await this.supabase.whenReady();
          const q = `%${query}%`;

          const [
            { data: areas },
            { data: crags },
            { data: routes },
            { data: users },
          ] = await Promise.all([
            this.supabase.client
              .from('areas')
              .select('id, name, slug')
              .ilike('name', q)
              .limit(5),
            this.supabase.client
              .from('crags')
              .select('id, name, slug, area:areas(name, slug)')
              .ilike('name', q)
              .limit(5),
            this.supabase.client
              .from('routes')
              .select(
                'id, name, slug, crag:crags!routes_crag_id_fkey(name, slug, area:areas!crags_area_id_fkey(name, slug))',
              )
              .ilike('name', q)
              .limit(5),
            this.supabase.client
              .from('user_profiles')
              .select('id, name, avatar')
              .ilike('name', q)
              .limit(5),
          ]);

          const results: SearchData = {};

          if (areas?.length) {
            results[this.translate.instant('labels.areas')] = areas.map(
              (a) =>
                ({
                  title: a.name,
                  href: `/area/${a.slug}`,
                  icon: '@tui.map-pin',
                }) as SearchItem,
            );
          }

          if (crags?.length) {
            results[this.translate.instant('labels.crags')] = crags.map((c) => {
              const area = Array.isArray(c.area) ? c.area[0] : c.area;
              return {
                title: c.name,
                subtitle: area?.name,
                href: `/area/${area?.slug}/${c.slug}`,
                icon: '@tui.mountain',
              } as SearchItem;
            });
          }

          if (routes?.length) {
            results[this.translate.instant('labels.routes')] = routes.map(
              (r) => {
                const crag = Array.isArray(r.crag) ? r.crag[0] : r.crag;
                const area = Array.isArray(crag?.area)
                  ? crag?.area[0]
                  : crag?.area;
                return {
                  title: r.name,
                  subtitle: `${area?.name || ''} > ${crag?.name || ''}`,
                  href: `/area/${area?.slug}/${crag?.slug}/${r.slug}`,
                  icon: '@tui.route',
                } as SearchItem;
              },
            );
          }

          if (users?.length) {
            results[this.translate.instant('labels.users')] = users.map(
              (u) =>
                ({
                  title: u.name,
                  href: `/profile/${u.id}`,
                  icon: this.supabase.buildAvatarUrl(u.avatar) || u.name[0],
                  type: 'user',
                }) as SearchItem,
            );
          }

          return results;
        })(),
      );
    }),
    startWith(null),
    shareReplay(1),
  );

  // Infinite Scroll & Async Pipe for Ascents
  private readonly loadMore$ = new Subject<void>();
  protected readonly isLoading = signal(false);
  protected readonly hasMore = signal(true);

  private readonly page$ = this.loadMore$.pipe(
    startWith(void 0),
    scan((acc) => acc + 1, -1),
  );

  protected readonly ascents$: Observable<RouteAscentWithExtras[]> =
    this.page$.pipe(
      tap(() => this.isLoading.set(true)),
      concatMap((page) => this.fetchAscents(page)),
      scan((acc, curr) => [...acc, ...curr], [] as RouteAscentWithExtras[]),
      tap(() => this.isLoading.set(false)),
      shareReplay(1),
    );

  private async fetchAscents(page: number): Promise<RouteAscentWithExtras[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const size = 10;
    const fromIdx = page * size;
    const toIdx = fromIdx + size - 1;

    const { data: ascents } = await this.supabase.client
      .from('route_ascents')
      .select(
        `
          *,
          route:routes!inner(
            *,
            crag:crags(
              slug,
              name,
              area:areas(slug,name)
            )
          )
        `,
      )
      .neq('user_id', userId)
      .order('date', { ascending: false })
      .range(fromIdx, toIdx)
      .overrideTypes<RouteAscentWithExtras[]>();

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

    return ascents.map((a) => {
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
        user: profileMap.get(a.user_id),
        route: mappedRoute,
      } as RouteAscentWithExtras;
    });
  }

  async follow(userId: string) {
    const success = await this.followsService.follow(userId);
    if (success) {
      this.followedIds.update((s) => {
        const next = new Set(s);
        next.add(userId);
        return next;
      });
    }
  }

  async unfollow(userId: string, name: string) {
    const data: TuiConfirmData = {
      content: this.translate.instant('actions.unfollowConfirm', {
        name,
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

    if (confirmed) {
      const success = await this.followsService.unfollow(userId);
      if (success) {
        this.followedIds.update((s) => {
          const next = new Set(s);
          next.delete(userId);
          return next;
        });
      }
    }
  }

  loadMore() {
    if (this.isBrowser && !this.isLoading()) {
      this.loadMore$.next();
    }
  }

  ngOnDestroy() {
    this.loadMore$.complete();
  }
}
