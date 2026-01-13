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
import { AscentsTableComponent } from '../components';
import { GlobalData, SupabaseService, FiltersService } from '../services';
import {
  RouteAscentWithExtras,
  RouteAscentDto,
  RouteDto,
  ClimbingKinds,
  ORDERED_GRADE_VALUES,
  VERTICAL_LIFE_TO_LABEL,
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
      type AscentQueryResponse = RouteAscentDto & {
        route:
          | (RouteDto & {
              crag: {
                slug: string;
                name: string;
                area: { slug: string; name: string } | null;
              } | null;
            })
          | null;
      };

      const { data: ascents, error: ascentsError } = await this.supabase.client
        .from('route_ascents')
        .select(
          `
          *,
          route:routes(
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
        .limit(50)
        .returns<AscentQueryResponse[]>();

      if (ascentsError) {
        console.error('[HomeComponent] Error fetching ascents:', ascentsError);
        return [];
      }

      if (!ascents || ascents.length === 0) return [];

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
        // Continue without user info if profiles fail
      }

      // 4. Map profiles to ascents
      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      return ascents.map((a) => {
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
    },
  });

  readonly filteredAscents = computed(() => {
    const list = this.ascentsResource.value() || [];
    const q = this.query().toLowerCase().trim();
    const [minIdx, maxIdx] = this.selectedGradeRange();

    // Convert indices to actual Grade IDs (numbers) because route.grade is a number
    // ORDERED_GRADE_VALUES contains labels, but we need the keys (IDs).
    // The keys are numerical IDs sorted ascending.
    const allGradeIds = Object.keys(VERTICAL_LIFE_TO_LABEL)
      .map(Number)
      .sort((a, b) => a - b);

    const allowedGrades = allGradeIds.slice(minIdx, maxIdx + 1);
    const categories = this.selectedCategories();

    return list.filter((a) => {
      // Search by user name or route name
      const userMatch = !q || a.user?.name?.toLowerCase().includes(q);
      const routeMatch = !q || a.route?.name?.toLowerCase().includes(q);
      const textMatch = userMatch || routeMatch;

      // Grade filter
      const grade = a.route?.grade;
      const gradeMatch =
        grade === undefined || grade === null || allowedGrades.includes(grade);

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
    this.filtersService.openFilters({ showShade: false });
  }
}

export default HomeComponent;
