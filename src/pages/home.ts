import { AsyncPipe, CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiAppearance,
  TuiLoader,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  concatMap,
  from,
  Observable,
  scan,
  shareReplay,
  startWith,
  Subject,
  tap,
} from 'rxjs';

import {
  GradeLabel,
  RouteAscentWithExtras,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { FollowsService, GlobalData, SupabaseService } from '../services';

import { AscentsFeedComponent } from '../components';

@Component({
  selector: 'app-home',
  imports: [
    AscentsFeedComponent,
    AsyncPipe,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    TuiAppearance,
    TuiLoader,
    TuiScrollbar,
  ],
  template: `
    <tui-scrollbar class="h-full">
      <div class="p-4 flex flex-col gap-4 max-w-2xl mx-auto w-full pb-32">
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
        @if (ascents$ | async; as ascents) {
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

  ngOnDestroy() {
    this.loadMore$.complete();
  }
}
