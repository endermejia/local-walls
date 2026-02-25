import { CommonModule, isPlatformBrowser } from '@angular/common';
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
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { TuiAppearance, TuiLoader, TuiScrollbar } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';
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
} from 'rxjs';

import { DesnivelService } from '../services/desnivel.service';
import { FollowsService } from '../services/follows.service';
import { GlobalData } from '../services/global-data';
import { ScrollService } from '../services/scroll.service';
import { SupabaseService } from '../services/supabase.service';

import { AscentsFeedComponent } from '../components/ascents-feed';

import { FeedItem, RouteAscentWithExtras } from '../models';

@Component({
  selector: 'app-home',
  imports: [
    AscentsFeedComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiLoader,
    TuiScrollbar,
    TuiSegmented,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="flex flex-col gap-4 max-w-2xl mx-auto w-full pb-32 pt-4">
        <div class="px-4 flex flex-col gap-4 relative">
          <!-- Active Crags -->
          @if (activeCrags(); as crags) {
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

          <!-- Filter Segmented -->
          @if (followsLoaded() && followedIds().size > 0) {
            <div class="flex justify-center">
              <tui-segmented [(activeItemIndex)]="filterIndex">
                <button type="button">
                  {{ 'following' | translate }}
                </button>
                <button type="button">
                  {{ 'all' | translate }}
                </button>
              </tui-segmented>
            </div>
          }

          <!-- Ascents Feed -->
          @if (ascents(); as ascents) {
            <app-ascents-feed
              [ascents]="ascents"
              [isLoading]="isLoading()"
              [hasMore]="hasMore()"
              [followedIds]="followedIds()"
              (loadMore)="loadMore()"
              (follow)="onFollow($event)"
              (unfollow)="onUnfollow($event)"
            />
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
  private readonly desnivelService = inject(DesnivelService);
  private readonly followsService = inject(FollowsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly scrollService = inject(ScrollService);

  @ViewChild(TuiScrollbar, { read: ElementRef })
  scrollbar?: ElementRef<HTMLElement>;

  protected readonly followedIds = signal<Set<string>>(new Set());
  protected readonly followsLoaded = signal(false);

  protected readonly activeCragsResource = resource({
    loader: () => this.fetchActiveCrags(),
  });

  protected readonly activeCrags = computed(
    () => this.activeCragsResource.value() ?? [],
  );

  protected readonly feedFilter = signal<'following' | 'all'>('following');

  protected get filterIndex(): number {
    return this.feedFilter() === 'following' ? 0 : 1;
  }

  protected set filterIndex(index: number) {
    this.feedFilter.set(index === 0 ? 'following' : 'all');
  }

  constructor() {
    this.loadFollowedIds();

    this.scrollService.scrollToTop$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.scrollToTop();
    });

    combineLatest([
      toObservable(this.feedFilter),
      toObservable(this.followsLoaded),
    ])
      .pipe(
        takeUntilDestroyed(),
        filter(([, loaded]) => loaded),
        map(([f]) => f as 'following' | 'all'),
        distinctUntilChanged(),
        switchMap((filter) => {
          this.ascents.set([]);
          this.hasMore.set(true);
          this.isLoading.set(true);
          return this.loadMore$.pipe(
            startWith(void 0),
            scan((acc) => acc + 1, -1),
            concatMap(async (page) => {
              const ascents = await this.fetchAscents(page, filter);
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
        this.ascents.update((current) => [...current, ...newAscents]);
      });
  }

  private async loadFollowedIds() {
    if (!this.isBrowser) {
      this.followsLoaded.set(true);
      return;
    }
    try {
      await this.supabase.whenReady();
      const ids = await this.followsService.getFollowedIds();
      this.followedIds.set(new Set(ids));
      if (ids.length === 0) {
        this.feedFilter.set('all');
      }
    } catch (error) {
      console.error('Error loading followed ids:', error);
      this.feedFilter.set('all');
    } finally {
      this.followsLoaded.set(true);
    }
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

  // Infinite Scroll & Async Pipe for Ascents
  private readonly loadMore$ = new Subject<void>();
  protected readonly isLoading = signal(false);
  protected readonly hasMore = signal(true);
  protected readonly ascents = signal<FeedItem[]>([]);

  private async fetchAscents(
    page: number,
    filter: 'following' | 'all' = this.feedFilter(),
  ): Promise<(RouteAscentWithExtras & { kind: 'ascent' })[]> {
    if (!this.isBrowser) return [];
    await this.supabase.whenReady();
    const userId = this.supabase.authUserId();
    if (!userId) return [];

    const size = 10;
    const fromIdx = page * size;
    const toIdx = fromIdx + size - 1;

    let query = this.supabase.client
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
      .neq('user_id', userId);

    if (filter === 'following') {
      const followed = Array.from(this.followedIds());
      if (followed.length === 0) {
        this.hasMore.set(false);
        return [];
      }
      query = query.in('user_id', followed);
    }

    const { data: ascents } = await query
      .order('date', { ascending: false })
      .order('id', { ascending: false })
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
        kind: 'ascent',
        user: profileMap.get(a.user_id),
        route: mappedRoute,
      } as RouteAscentWithExtras & { kind: 'ascent' };
    });
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
    if (this.isBrowser && !this.isLoading()) {
      this.loadMore$.next();
    }
  }

  private scrollToTop() {
    if (this.scrollbar?.nativeElement) {
      this.scrollbar.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  ngOnDestroy() {
    this.loadMore$.complete();
  }
}
