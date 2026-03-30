import { LowerCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  TuiAvatar,
  TuiBadgedContent,
  TuiBadgeNotification,
} from '@taiga-ui/kit';
import {
  TuiAppearance,
  TuiButton,
  TuiIcon,
  TuiLabel,
  TuiLoader,
  TuiTextfield,
} from '@taiga-ui/core';

import { EightAnuService } from '../../services/eight-anu.service';
import { FiltersService } from '../../services/filters.service';
import { GlobalData } from '../../services/global-data';
import { RoutesService } from '../../services/routes.service';
import { GradeComponent } from '../ui/avatar-grade';
import { EmptyStateComponent } from '../ui/empty-state';
import { RoutesTableComponent } from '../route/routes-table';
import {
  ClimbingKinds,
  CragDetail,
  GRADE_NUMBER_TO_LABEL,
  LABEL_TO_VERTICAL_LIFE,
  ORDERED_GRADE_VALUES,
  PROJECT_GRADE_LABEL,
  RouteDto,
  RouteWithExtras,
  SearchRouteItem,
  VERTICAL_LIFE_GRADES,
} from '../../models';
import { normalizeName, slugify } from '../../utils';

@Component({
  selector: 'app-crag-routes',
  imports: [
    FormsModule,
    LowerCasePipe,
    TranslatePipe,
    TuiAppearance,
    TuiAvatar,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiIcon,
    TuiLabel,
    TuiLoader,
    TuiTextfield,
    GradeComponent,
    EmptyStateComponent,
    RoutesTableComponent,
  ],
  template: `
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center w-full sm:w-auto gap-2">
        <tui-avatar
          tuiThumbnail
          size="l"
          src="@tui.route"
          class="self-center"
          [attr.aria-label]="'routes' | translate"
        />
        <h2 class="text-2xl font-semibold">
          {{ routesCount() }}
          {{ 'routes' | translate | lowercase }}
        </h2>
      </div>
      @if (global.editingMode()) {
        <div class="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
          @if (canEditAsAdmin() || canAreaAdmin()) {
            <button
              tuiButton
              appearance="textfield"
              size="s"
              type="button"
              (click.zoneless)="routesService.openUnifyRoutes()"
              [iconStart]="'@tui.blend'"
            >
              {{ 'unify' | translate }}
            </button>
          }
          <button
            tuiButton
            appearance="textfield"
            size="s"
            type="button"
            (click.zoneless)="openCreateRoute()"
            [iconStart]="'@tui.plus'"
          >
            {{ 'new' | translate }}
          </button>
        </div>
      }
    </div>

    <div class="mb-4 flex items-end gap-2">
      <tui-textfield class="grow block" tuiTextfieldSize="l">
        <label tuiLabel for="routes-search">{{
          'searchPlaceholder' | translate
        }}</label>
        <input
          tuiTextfield
          #routesSearch
          id="routes-search"
          autocomplete="off"
          [value]="query()"
          (input.zoneless)="query.set(routesSearch.value)"
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
          [attr.aria-label]="'filters' | translate"
          (click.zoneless)="openFilters()"
        ></button>
      </tui-badged-content>
    </div>

    @let routesList = filteredRoutes();
    @let isSearchingAnu = eightAnuResource.isLoading();
    @let anuResults = eightAnuResource.value() || [];

    @if (routesList.length > 0) {
      <app-routes-table
        [data]="routesList"
        [showAddRouteToTopo]="true"
        [showLocation]="query().trim().length >= 2"
      />
    }

    @if (query().length >= 2 && routesList.length === 0) {
      @if (isSearchingAnu) {
        <div class="flex flex-col items-center justify-center p-8 gap-4">
          <tui-loader size="m" />
          <span class="text-sm opacity-60">
            {{ 'loading' | translate }} 8a.nu...
          </span>
        </div>
      } @else {
        @if (anuResults.length > 0) {
          <div class="flex flex-col gap-3 mt-4">
            <div class="flex items-center gap-2 opacity-70 mb-2">
              <tui-icon [icon]="global.iconSrc()('8anu')" />
              <span class="font-medium">
                {{ 'eightAnuResults' | translate }}
              </span>
            </div>
            @for (item of anuResults.slice(0, 3); track item.zlaggableId) {
              <div
                tuiAppearance="flat"
                class="p-4 rounded-3xl flex items-center justify-between gap-4"
              >
                <div class="flex flex-col gap-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <app-grade [grade]="mapEightAnuGrade(item.difficulty)" />
                    <span class="font-bold truncate">
                      {{ item.zlaggableName }}
                    </span>
                  </div>
                  <span class="text-xs opacity-60 truncate">
                    {{ item.cragName }} · {{ item.sectorName }}
                  </span>
                </div>
                <button
                  tuiButton
                  appearance="textfield"
                  size="s"
                  type="button"
                  iconStart="@tui.download"
                  (click.zoneless)="importRoute(item)"
                >
                  {{ 'import' | translate }}
                </button>
              </div>
            }
          </div>
        }

        <div
          tuiAppearance="flat"
          class="flex flex-col items-center justify-center p-8 gap-4 rounded-3xl mt-4"
        >
          @if (anuResults.length === 0) {
            <tui-icon icon="@tui.search-x" class="text-4xl opacity-50" />
            <span class="text-sm opacity-60 text-center">
              {{ 'crags.8anuNotFound' | translate }}
            </span>
          } @else {
            <span class="text-sm opacity-60 text-center">
              {{ 'crags.createLocalInstead' | translate }}
            </span>
          }
          <button
            tuiButton
            appearance="primary"
            size="m"
            type="button"
            iconStart="@tui.plus"
            (click.zoneless)="openCreateRoute(query())"
          >
            {{ 'crags.createRouteAction' | translate }}
          </button>
        </div>
      }
    }

    @if (routesList.length === 0 && query().length < 2) {
      <app-empty-state icon="@tui.list" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CragRoutesComponent {
  crag = input.required<CragDetail | null>();

  protected readonly global = inject(GlobalData);
  protected readonly routesService = inject(RoutesService);
  protected readonly filtersService = inject(FiltersService);
  protected readonly eightAnuService = inject(EightAnuService);

  readonly query = signal('');
  readonly selectedGradeRange = this.global.areaListGradeRange;
  readonly selectedCategories = this.global.areaListCategories;

  readonly canEditAsAdmin = this.global.canEditAsAdmin;
  readonly canAreaAdmin = computed(() => {
    const c = this.crag();
    if (!c) return false;
    return this.global.areaAdminPermissions()[c.area_id];
  });

  readonly hasActiveFilters = computed(() => {
    const [lo, hi] = this.selectedGradeRange();
    const gradeActive = !(lo === 0 && hi === ORDERED_GRADE_VALUES.length - 1);
    return (
      gradeActive ||
      this.selectedCategories().length > 0 ||
      this.query().trim().length > 0
    );
  });

  protected readonly areaRoutesResource = resource({
    params: () => this.crag()?.area_id,
    loader: async ({ params: areaId }) => {
      if (!areaId) return [];
      return this.routesService.getRoutesByAreaWithDetails(areaId);
    },
  });

  readonly filteredRoutes = computed(() => {
    const q = normalizeName(this.query());
    const [minIdx, maxIdx] = this.selectedGradeRange();
    const allowedLabels = ORDERED_GRADE_VALUES.slice(minIdx, maxIdx + 1);
    const categories = this.selectedCategories();
    const crag = this.crag();
    const localList = this.global.cragRoutesResource.value() ?? [];

    const textMatches = (r: Partial<RouteWithExtras>) => {
      if (!q) return true;
      const nameMatch = normalizeName(r.name || '').includes(q);
      const gradeLabel = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      const gradeMatch = gradeLabel
        ? normalizeName(gradeLabel).includes(q)
        : false;
      return nameMatch || gradeMatch;
    };

    const gradeMatches = (r: Partial<RouteWithExtras>) => {
      const label = GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES];
      if (!label || label === PROJECT_GRADE_LABEL) return true;
      return (allowedLabels as readonly string[]).includes(label);
    };

    const categoryMatches = (r: Partial<RouteWithExtras>) => {
      if (categories.length === 0) return true;
      const kind = r.climbing_kind;
      if (!kind) return true;
      if (categories.includes(0) && kind === ClimbingKinds.SPORT) return true;
      if (categories.includes(1) && kind === ClimbingKinds.BOULDER) return true;
      return categories.includes(2) && kind === ClimbingKinds.MULTIPITCH;
    };

    const filteredLocals = localList.filter(
      (r) => textMatches(r) && gradeMatches(r) && categoryMatches(r),
    );

    if (q.trim().length >= 2 && crag) {
      const otherCragsRoutes = this.areaRoutesResource.value() ?? [];
      const filteredOthers = otherCragsRoutes
        .filter(
          (r) =>
            r.crag_id !== crag.id &&
            textMatches(r) &&
            gradeMatches(r) &&
            categoryMatches(r),
        )
        .map(
          (r) =>
            ({
              ...r,
            }) as RouteWithExtras,
        );

      const seenSlugs = new Set(filteredLocals.map((r) => r.slug));
      const othersToAdd = filteredOthers.filter((r) => !seenSlugs.has(r.slug));

      return [...filteredLocals, ...othersToAdd];
    }

    return filteredLocals;
  });

  protected readonly eightAnuResource = resource({
    params: () => {
      const q = this.query().trim();
      const crag = this.crag();
      const allMatchesCount = this.filteredRoutes().length;

      if (q.length >= 2 && crag && allMatchesCount === 0) {
        const slug =
          crag.eight_anu_crag_slugs?.[0] || crag.eight_anu_sector_slugs?.[0];
        return { q, slug };
      }
      return null;
    },
    loader: async ({ params }): Promise<SearchRouteItem[]> => {
      if (!params) return [];
      const searchQuery = params.slug ? `${params.q} ${params.slug}` : params.q;
      const results = await this.eightAnuService.searchRoutes(searchQuery);

      const areaRoutes = this.areaRoutesResource.value() || [];
      const existingSlugs = new Set(areaRoutes.map((r) => r.slug));
      const existingEightAnuSlugs = new Set(
        areaRoutes.flatMap((r) => r.eight_anu_route_slugs || []),
      );

      const updatePromises: Promise<RouteDto | null>[] = [];

      for (const item of results) {
        const itemSlug = slugify(item.zlaggableName);
        if (existingSlugs.has(itemSlug) || existingEightAnuSlugs.has(itemSlug))
          continue;

        const currentCragRoutes = this.global.cragRoutesResource.value() || [];
        const matchingLocals = currentCragRoutes.filter(
          (r) => slugify(r.name) === itemSlug,
        );

        if (matchingLocals.length > 0) {
          for (const local of matchingLocals) {
            const currentSlugs = local.eight_anu_route_slugs || [];
            if (!currentSlugs.includes(itemSlug)) {
              if (this.global.editingMode()) {
                updatePromises.push(
                  this.routesService.update(
                    local.id,
                    {
                      eight_anu_route_slugs: [...currentSlugs, itemSlug],
                    },
                    true,
                  ),
                );
              }
            }
          }
          existingEightAnuSlugs.add(itemSlug);
        }
      }

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      return results.filter((item) => {
        const itemSlug = slugify(item.zlaggableName);
        return (
          !existingSlugs.has(itemSlug) && !existingEightAnuSlugs.has(itemSlug)
        );
      });
    },
  });

  protected readonly routesCount = computed(() => this.filteredRoutes().length);

  protected mapEightAnuGrade(
    difficulty: string | undefined,
  ): VERTICAL_LIFE_GRADES {
    if (!difficulty) return VERTICAL_LIFE_GRADES.G0;
    const label = difficulty.toLowerCase().replace(' ', '');
    return (
      LABEL_TO_VERTICAL_LIFE[label as keyof typeof LABEL_TO_VERTICAL_LIFE] ??
      VERTICAL_LIFE_GRADES.G0
    );
  }

  protected importRoute(item: SearchRouteItem): void {
    const crag = this.crag();
    if (!crag) return;

    this.routesService.openRouteForm({
      cragId: crag.id,
      routeData: {
        id: 0,
        crag_id: crag.id,
        name: item.zlaggableName,
        slug: '',
        grade: this.mapEightAnuGrade(item.difficulty),
        climbing_kind: ClimbingKinds.SPORT,
        height: null,
        eight_anu_route_slugs: [slugify(item.zlaggableName)],
      },
    });
  }

  openFilters(): void {
    this.filtersService.openFilters({
      showShade: false,
    });
  }

  openCreateRoute(prefillName?: string): void {
    const c = this.crag();
    if (!c) return;
    this.routesService.openRouteForm({
      cragId: c.id,
      routeData: prefillName
        ? {
            id: 0,
            crag_id: c.id,
            name: prefillName,
            slug: slugify(prefillName),
            grade: 0,
            climbing_kind: ClimbingKinds.SPORT,
          }
        : undefined,
    });
  }
}
