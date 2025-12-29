import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
  WritableSignal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  TuiLoader,
  TuiButton,
  TuiHint,
  TuiTextfield,
  TuiLabel,
} from '@taiga-ui/core';
import {
  TuiBadgedContent,
  TuiBadgeNotification,
  TuiAvatar,
} from '@taiga-ui/kit';
import { AscentsTableComponent, EmptyStateComponent } from '../components';
import { GlobalData, SupabaseService, FiltersService } from '../services';
import {
  RouteAscentWithExtras,
  ClimbingKinds,
  ORDERED_GRADE_VALUES,
} from '../models';

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
    TuiAvatar,
    AscentsTableComponent,
    EmptyStateComponent,
  ],
  template: `
    <section class="w-full max-w-5xl mx-auto p-4">
      <header class="mb-6">
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <tui-avatar
            tuiThumbnail
            size="l"
            src="@tui.home"
            class="self-center"
            [attr.aria-label]="'nav.home' | translate"
          />
          {{ 'nav.home' | translate }}
        </h1>
      </header>

      <div class="mb-4 flex items-end gap-2">
        <tui-textfield class="grow block" tuiTextfieldSize="l">
          <label tuiLabel for="user-search">{{
            'labels.searchPlaceholder' | translate
          }}</label>
          <input
            tuiTextfield
            #userSearch
            id="user-search"
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
        <div class="flex items-center justify-center py-16">
          <tui-loader size="xxl" />
        </div>
      } @else {
        <app-ascents-table
          [data]="filteredAscents()"
          [showUser]="true"
          (updated)="ascentsResource.reload()"
        />
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'overflow-auto' },
})
export class HomeComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly global = inject(GlobalData);
  private readonly supabase = inject(SupabaseService);
  private readonly filtersService = inject(FiltersService);

  readonly query: WritableSignal<string> = signal('');
  readonly selectedGradeRange = this.global.areaListGradeRange;
  readonly selectedCategories = this.global.areaListCategories;

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return gradeActive || this.selectedCategories().length > 0;
  });

  readonly ascentsResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      await this.supabase.whenReady();
      const userId = this.supabase.authUserId();
      if (!userId) return [];

      // 1. Get followed user IDs
      const { data: follows, error: followsError } = await this.supabase.client
        .from('user_follows')
        .select('followed_user_id')
        .eq('user_id', userId);

      if (followsError) {
        console.error('[HomeComponent] Error fetching follows:', followsError);
        return [];
      }

      const followedIds = follows.map((f) => f.followed_user_id);
      if (followedIds.length === 0) return [];

      // 2. Get ascents from those users
      const { data: ascents, error: ascentsError } = await this.supabase.client
        .from('route_ascents')
        .select(
          `
          *,
          user:user_profiles (*),
          route:routes (
            *,
            crag:crags (
              slug,
              name,
              area:areas (slug, name)
            )
          )
        `,
        )
        .in('user_id', followedIds)
        .order('date', { ascending: false })
        .limit(50);

      if (ascentsError) {
        console.error('[HomeComponent] Error fetching ascents:', ascentsError);
        return [];
      }

      return (ascents as any[]).map((a) => {
        const { route, ...ascentRest } = a;
        let mappedRoute = null;
        if (route) {
          const { crag, ...routeRest } = route;
          mappedRoute = {
            ...routeRest,
            crag_slug: crag?.slug,
            crag_name: crag?.name,
            area_slug: crag?.area?.slug,
            area_name: crag?.area?.name,
          };
        }
        return {
          ...ascentRest,
          route: mappedRoute,
        };
      }) as RouteAscentWithExtras[];
    },
  });

  readonly filteredAscents = computed(() => {
    const list = this.ascentsResource.value() || [];
    const q = this.query().toLowerCase().trim();
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedGrades = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1).map(
      (g) => Number(g),
    );
    const categories = this.selectedCategories();

    return list.filter((a) => {
      // Search by user name or route name
      const userMatch = !q || a.user?.name?.toLowerCase().includes(q);
      const routeMatch = !q || a.route?.name?.toLowerCase().includes(q);
      const textMatch = userMatch || routeMatch;

      // Grade filter
      const grade = a.route?.grade;
      const gradeMatch = grade === undefined || allowedGrades.includes(grade);

      // Category filter
      let kindMatch = true;
      if (categories.length > 0) {
        const idxToKind: Record<number, string> = {
          0: ClimbingKinds.SPORT,
          1: ClimbingKinds.BOULDER,
          2: ClimbingKinds.MULTIPITCH,
        };
        const allowedKinds = categories
          .map((i) => idxToKind[i])
          .filter(Boolean);
        kindMatch =
          !!a.route?.climbing_kind &&
          allowedKinds.includes(a.route.climbing_kind);
      }

      return textMatch && gradeMatch && kindMatch;
    });
  });

  onQuery(v: string) {
    this.query.set(v);
  }

  openFilters(): void {
    this.filtersService.openFilters();
  }
}

export default HomeComponent;
