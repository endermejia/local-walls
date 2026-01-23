import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  PLATFORM_ID,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  TuiButton,
  TuiHint,
  TuiLabel,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiBadgedContent, TuiBadgeNotification } from '@taiga-ui/kit';

import { TranslatePipe } from '@ngx-translate/core';

import {
  ClimbingKinds,
  ORDERED_GRADE_VALUES,
  RouteAscentWithExtras,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import { FiltersService, GlobalData, SupabaseService } from '../services';

import { AscentsTableComponent } from '../components';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    TuiLoader,
    TuiButton,
    TuiHint,
    TuiTextfield,
    TuiLabel,
    TuiBadgedContent,
    TuiBadgeNotification,
    AscentsTableComponent,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4 flex flex-col grow min-h-0">
      <div class="mb-4 flex items-end gap-2">
        <tui-textfield class="grow block" tuiTextfieldSize="l">
          <label tuiLabel for="user-search">{{
            'labels.searchPlaceholder' | translate
          }}</label>
          <input
            tuiTextfield
            #userSearch
            id="user-search"
            autocomplete="off"
            [value]="query()"
            (input.zoneless)="onQuery(userSearch.value)"
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
      </div>

      @if (ascentsResource.isLoading()) {
        <div class="flex grow min-h-0 items-center justify-center py-16">
          <tui-loader size="xxl" />
        </div>
      } @else {
        <app-ascents-table
          class="grow min-h-0"
          [data]="filteredAscents()"
          [total]="ascentsResource.value()?.total ?? 0"
          [page]="page()"
          [size]="size()"
          [showUser]="true"
          [showRowColors]="false"
          (paginationChange)="onPagination($event)"
          (updated)="ascentsResource.reload()"
        />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex grow min-h-0' },
})
export class HomeComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);
  private readonly filtersService = inject(FiltersService);

  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.global.areaListGradeRange;
  readonly selectedCategories = this.global.areaListCategories;

  readonly page = signal(0);
  readonly size = signal(20);

  constructor() {
    this.global.resetDataByPage('home');
    effect(() => {
      this.selectedGradeRange();
      this.selectedCategories();
      this.page.set(0);
    });
  }

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.selectedCategories().length > 0;
  });

  readonly ascentsResource = resource({
    params: () => ({
      page: this.page(),
      size: this.size(),
      query: this.query(),
      grades: this.selectedGradeRange(),
      categories: this.selectedCategories(),
    }),
    loader: async ({ params }) => {
      const { page, size, query, grades, categories } = params;
      if (!isPlatformBrowser(this.platformId)) return { items: [], total: 0 };
      await this.supabase.whenReady();
      const userId = this.supabase.authUserId();
      if (!userId) return { items: [], total: 0 };

      // 1. Get the following user IDs
      const { data: follows, error: followsError } = await this.supabase.client
        .from('user_follows')
        .select('followed_user_id')
        .eq('user_id', userId);

      if (followsError) {
        console.error('[HomeComponent] Error fetching follows:', followsError);
        return { items: [], total: 0 };
      }

      const followedIds = follows.map((f) => f.followed_user_id);
      if (followedIds.length === 0) return { items: [], total: 0 };

      // 2. Prepare filters for the query
      const from = page * size;
      const to = from + size - 1;

      let dbQuery = this.supabase.client
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
          { count: 'exact' },
        )
        .in('user_id', followedIds);

      // Text search (very basic, better than nothing)
      if (query) {
        // We use or with ILIKE on route name or user name (if we had user name here)
        // Since we don't have user name in route_ascents, we filter by route name
        dbQuery = dbQuery.ilike('route.name', `%${query}%`);
      }

      // Grade range
      const [minIdx, maxIdx] = grades;
      const allGradeIds = Object.keys(VERTICAL_LIFE_TO_LABEL)
        .map(Number)
        .sort((a, b) => a - b);
      const allowedGrades = allGradeIds.slice(minIdx, maxIdx + 1);
      dbQuery = dbQuery.in('route.grade', allowedGrades);

      // Categories
      if (categories.length > 0) {
        const idxToKind: Record<number, string> = {
          0: ClimbingKinds.SPORT,
          1: ClimbingKinds.BOULDER,
          2: ClimbingKinds.MULTIPITCH,
        };
        const allowedKinds = categories
          .map((i) => idxToKind[i])
          .filter(Boolean);
        dbQuery = dbQuery.in('route.climbing_kind', allowedKinds);
      }

      const {
        data: ascents,
        error: ascentsError,
        count,
      } = await dbQuery
        .order('date', { ascending: false })
        .range(from, to)
        .overrideTypes<RouteAscentWithExtras[]>();

      if (ascentsError) {
        console.error('[HomeComponent] Error fetching ascents:', ascentsError);
        return { items: [], total: 0 };
      }

      if (!ascents || ascents.length === 0) return { items: [], total: 0 };

      // 3. Fetch user profiles for these ascents
      const userIds = [...new Set(ascents.map((a) => a.user_id))];
      const { data: profiles, error: profilesError } =
        await this.supabase.client
          .from('user_profiles')
          .select('*')
          .in('id', userIds);

      if (profilesError) {
        console.error(
          '[HomeComponent] Error fetching user profiles:',
          profilesError,
        );
      }

      // 4. Map profiles to ascents
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      const items = ascents.map((a) => {
        const { route, ...ascentRest } = a;
        let mappedRoute: RouteAscentWithExtras['route'] = undefined;
        if (route) {
          const { crag, ...routeRest } = route;
          mappedRoute = {
            ...routeRest,
            crag_slug: crag?.slug,
            crag_name: crag?.name,
            area_slug: crag?.area?.slug,
            area_name: crag?.area?.name,
            liked: false,
            project: false,
          };
        }
        return {
          ...ascentRest,
          user: profileMap.get(a.user_id),
          route: mappedRoute,
        };
      });

      return { items, total: count ?? 0 };
    },
  });

  readonly filteredAscents = computed(() => {
    return this.ascentsResource.value()?.items || [];
  });

  onQuery(v: string) {
    this.query.set(v);
    this.page.set(0);
  }

  onPagination({ page, size }: { page: number; size: number }) {
    this.page.set(page);
    this.size.set(size);
  }

  openFilters(): void {
    this.filtersService.openFilters({ showShade: false });
  }
}

export default HomeComponent;
