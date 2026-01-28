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
  TuiDataList,
  TuiDropdown,
  TuiIcon,
  TuiLoader,
  TuiOptGroup,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiAvatar, TuiRating } from '@taiga-ui/kit';
import { TuiCardLarge, TuiHeader } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  concatMap,
  debounceTime,
  distinctUntilChanged,
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
  RouteAscentWithExtras,
  SearchData,
  SearchItem,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';
import { GlobalData, SupabaseService } from '../services';

@Component({
  selector: 'app-infinite-scroll-trigger',
  standalone: true,
  template: '<div class="h-1 w-full"></div>',
})
export class InfiniteScrollTriggerComponent implements AfterViewInit, OnDestroy {
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
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TuiAvatar,
    TuiCardLarge,
    TuiDataList,
    TuiDropdown,
    TuiHeader,
    TuiIcon,
    TuiLoader,
    TuiOptGroup,
    TuiRating,
    TuiTextfield,
    TranslatePipe,
    InfiniteScrollTriggerComponent,
  ],
  template: `
    <div class="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full pb-32">
      <!-- Search bar -->
      <div
        class="w-full sticky top-0 z-50 bg-[var(--tui-background-base)] py-2"
        [tuiDropdown]="searchResults"
        [tuiDropdownOpen]="control.value !== '' && (results$ | async) !== null"
        tuiDropdownLimitWidth="fixed"
      >
        <tui-textfield class="w-full">
          <tui-icon tuiStart icon="@tui.search" />
          <input
            #input
            tuiTextfield
            autocomplete="off"
            [formControl]="control"
            [placeholder]="'labels.searchPlaceholder' | translate"
          />
        </tui-textfield>

        <ng-template #searchResults>
          <tui-data-list>
            @if (results$ | async; as results) {
              @for (group of results | keyvalue; track group.key) {
                <tui-opt-group [label]="group.key">
                  @for (item of group.value; track item.href) {
                    <a
                      tuiOption
                      [routerLink]="item.href"
                      (click)="control.setValue('')"
                    >
                      @if (group.key === ('labels.users' | translate)) {
                        <tui-avatar
                          [src]="item.icon || '@tui.user'"
                          size="xs"
                          class="mr-2"
                        />
                      } @else if (item.icon) {
                        <tui-icon [icon]="item.icon" class="mr-2" />
                      }
                      <div class="flex flex-col">
                        <span>{{ item.title }}</span>
                        @if (item.subtitle) {
                          <span class="text-xs opacity-60">{{
                            item.subtitle
                          }}</span>
                        }
                      </div>
                    </a>
                  }
                </tui-opt-group>
              }
            }
          </tui-data-list>
        </ng-template>
      </div>

      <!-- Ascents Feed -->
      <div class="flex flex-col gap-6 mt-4">
        @if (ascents$ | async; as ascents) {
          @for (ascent of ascents; track ascent.id) {
            @defer (on viewport) {
              <a
                tuiAppearance="outline"
                [routerLink]="
                  ascent.route
                    ? [
                        '/area',
                        ascent.route.area_slug,
                        ascent.route.crag_slug,
                        ascent.route.slug
                      ]
                    : null
                "
                class="flex flex-col gap-4 p-4 rounded-3xl relative no-underline text-inherit hover:no-underline"
              >
                <header tuiHeader>
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
                      <span class="font-bold text-sm group-hover/user:underline">
                        {{ ascent.user?.name || 'User' }}
                      </span>
                      <span class="text-xs text-gray-400">
                        {{ ascent.date | date: 'mediumDate' }}
                      </span>
                    </div>
                  </div>
                </header>

                <div class="flex flex-col gap-1">
                  @if (ascent.route) {
                    <div class="font-bold text-lg">
                      {{ ascent.route.name }}
                    </div>
                    <div class="flex items-center gap-2 text-sm text-gray-600">
                      <span class="font-semibold text-blue-600">
                        {{ getGradeLabel(ascent.route.grade) }}
                      </span>
                      @if (ascent.ascent_type) {
                        <span
                          class="px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-bold"
                        >
                          {{ getAscentTypeLabel(ascent.ascent_type) }}
                        </span>
                      }
                      <span>•</span>
                      <span>{{ ascent.route.crag_name }}</span>
                    </div>
                  }
                </div>

                @if (ascent.rate) {
                  <tui-rating
                    [ngModel]="ascent.rate"
                    [max]="5"
                    [readOnly]="true"
                    class="pointer-events-none origin-left scale-75 h-6"
                  />
                }

                @if (ascent.comment) {
                  <p
                    class="text-sm text-gray-700 italic border-l-2 border-gray-200 pl-3 py-1"
                  >
                    "{{ ascent.comment }}"
                  </p>
                }
              </a>
            } @placeholder {
              <div class="h-64 w-full bg-gray-50 animate-pulse rounded-xl"></div>
            }
          }

          @if (isLoading()) {
            <div class="flex justify-center p-8">
              <tui-loader />
            </div>
          }

          @if (ascents.length > 0 && !isLoading()) {
            <app-infinite-scroll-trigger (intersect)="loadMore()" />
          }

          @if (ascents.length === 0 && !isLoading()) {
            <div class="text-center py-20 text-gray-400">
              {{ 'labels.noAscentsFollowed' | translate }}
            </div>
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-1 flex-col overflow-y-auto min-h-0',
  },
})
export class HomeComponent implements OnDestroy {
  protected readonly global = inject(GlobalData);
  protected readonly supabase = inject(SupabaseService);
  protected readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // Search logic
  protected readonly control = new FormControl('');

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

    const { data: follows } = await this.supabase.client
      .from('user_follows')
      .select('followed_user_id')
      .eq('user_id', userId);

    const followedIds = follows?.map((f) => f.followed_user_id) || [];
    if (followedIds.length === 0) return [];

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
      .in('user_id', followedIds)
      .order('date', { ascending: false })
      .range(fromIdx, toIdx)
      .overrideTypes<RouteAscentWithExtras[]>();

    if (!ascents) return [];

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

  loadMore() {
    if (this.isBrowser && !this.isLoading()) {
      this.loadMore$.next();
    }
  }

  getGradeLabel(grade: number | null): string {
    if (grade === null) return '';
    return VERTICAL_LIFE_TO_LABEL[grade as VERTICAL_LIFE_GRADES] || '';
  }

  getAscentTypeLabel(type: string | null): string {
    if (!type) return '';
    return this.translate.instant(`ascentTypes.${type}`);
  }

  ngOnDestroy() {
    this.loadMore$.complete();
  }
}

export default HomeComponent;
