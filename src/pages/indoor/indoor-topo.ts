import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
  signal,
} from '@angular/core';

import { TuiSortDirection } from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import {
  TuiAppearance,
  TuiButton,
  TuiDataList,
  TuiLoader,
} from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiBadge,
  TuiBadgeNotification,
  TuiBadgedContent,
  type TuiConfirmData,
} from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';

import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AuthStateService } from '../../services/auth-state.service';
import { IndoorDataService } from '../../services/indoor-data.service';
import { IndoorService } from '../../services/indoor.service';
import { LayoutService } from '../../services/layout.service';

import { IndoorTopoFilterDialogComponent } from '../../components/dialogs/indoor-topo-filter-dialog';
import type {
  IndoorTopoFilterDialogData,
  IndoorTopoFilterDialogResult,
} from '../../components/dialogs/indoor-topo-filter-dialog';
import { TopoRoutesTableComponent } from '../../components/topo/topo-routes-table';
import { TopoViewerComponent } from '../../components/topo/topo-viewer';
import type { TopoRouteRow } from '../../components/topo/topo.types';
import { SectionHeaderComponent } from '../../components/ui/section-header';

import {
  GRADE_NUMBER_TO_LABEL,
  type IndoorTopoDto,
  ORDERED_GRADE_VALUES,
  PROJECT_GRADE_LABEL,
  type TopoDetail,
  type TopoRouteWithRoute,
  type VERTICAL_LIFE_GRADES,
} from '../../models';

import { TOPO_ROUTE_SORTERS } from '../../pipes';
import { calculateRouteMoves } from '../../utils';

import { TopoPageBase } from '../area/topo-page-base';

@Component({
  selector: 'app-indoor-topo',
  standalone: true,
  imports: [
    SectionHeaderComponent,
    TopoRoutesTableComponent,
    TopoViewerComponent,
    TranslatePipe,
    TuiAppearance,
    TuiBadge,
    TuiBadgeNotification,
    TuiBadgedContent,
    TuiButton,
    TuiDataList,
    TuiLoader,
  ],
  template: `
    <div class="h-full w-full">
      <section class="flex flex-col w-full h-full md:p-4">
        @let isMobile = layoutService.isMobile();
        @if (topo(); as t) {
          <div class="px-4 pt-4 pb-1.5 md:p-0 md:mb-4 shrink-0">
            <app-section-header
              [title]="t.name"
              [showLike]="false"
              [titleDropdown]="topoDropdown"
            >
              <ng-container titleInfo>
                @if (t.legacy) {
                  <span
                    tuiBadge
                    size="s"
                    appearance="neutral"
                    class="uppercase text-[10px] shrink-0"
                  >
                    {{ 'indoor.legacy' | translate }}
                  </span>
                }
                <tui-badged-content class="shrink-0">
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
                    size="s"
                    type="button"
                    iconStart="@tui.sliders-horizontal"
                    [attr.aria-label]="'filters' | translate"
                    (click.zoneless)="openFiltersDialog()"
                  ></button>
                </tui-badged-content>
              </ng-container>

              <ng-template #topoDropdown>
                <tui-data-list>
                  @for (item of sortedAreaTopos(); track item.id) {
                    <button
                      tuiOption
                      new
                      type="button"
                      [disabled]="item.id === t.id"
                      (click.zoneless)="navigateToTopo(item)"
                    >
                      {{ item.name }}
                    </button>
                  }
                </tui-data-list>
              </ng-template>

              <div actionButtons class="flex gap-2">
                @if (canDraw()) {
                  <button
                    tuiButton
                    size="s"
                    appearance="neutral"
                    [iconStart]="'/image/topo.svg'"
                    class="rounded-full!"
                    type="button"
                    (click.zoneless)="openDrawTopo(t)"
                  >
                    {{ 'draw' | translate }}
                  </button>
                }
                @if (canEdit()) {
                  <button
                    tuiIconButton
                    size="s"
                    appearance="neutral"
                    iconStart="@tui.square-pen"
                    class="rounded-full!"
                    [attr.aria-label]="'edit' | translate"
                    [title]="'edit' | translate"
                    type="button"
                    (click.zoneless)="openEditTopo(t)"
                  >
                    {{ 'edit' | translate }}
                  </button>
                  @if (canEditAsAdmin()) {
                    <button
                      tuiIconButton
                      size="s"
                      appearance="negative"
                      iconStart="@tui.trash"
                      class="rounded-full!"
                      [attr.aria-label]="'delete' | translate"
                      [title]="'delete' | translate"
                      type="button"
                      (click.zoneless)="deleteTopo(t)"
                    >
                      {{ 'delete' | translate }}
                    </button>
                  }
                }
              </div>
            </app-section-header>
          </div>

          <div
            class="grid grid-cols-1 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-cols-3 lg:grid-rows-1 w-full flex-1 min-h-0 gap-0 lg:gap-4 overflow-hidden"
          >
            <app-topo-viewer
              class="relative w-full h-full lg:col-span-2"
              [topoImage]="topoImageResource.value()"
              [topoName]="t.name"
              [renderedRoutes]="filteredRenderedTopoRoutes()"
              [hasAccess]="true"
              [selectedRouteId]="selectedRouteId()"
              [hoveredRouteId]="hoveredRouteId()"
              (selectedRouteIdChange)="selectedRouteId.set($event)"
              (hoveredRouteIdChange)="hoveredRouteId.set($event)"
              (imageRatioChange)="imageRatio.set($event)"
            />

            <app-topo-routes-table
              [sortedTableData]="sortedTableData()"
              [columns]="columns()"
              [canEdit]="canEdit()"
              [isMobile]="isMobile"
              [selectedRouteId]="selectedRouteId()"
              [hiddenRouteIds]="hiddenRouteIds()"
              [hasAccess]="true"
              [isIndoor]="true"
              [direction]="direction()"
              [sorter]="sorter()"
              [topoId]="t.id"
              (selectedRouteIdChange)="selectedRouteId.set($event)"
              (hoveredRouteIdChange)="hoveredRouteId.set($event)"
              (sortChange)="onSortChange($event)"
              (toggleRouteVisibility)="toggleRouteVisibility($event)"
            />
          </div>
        } @else {
          <div class="flex items-center justify-center h-full">
            <tui-loader size="xxl" />
          </div>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex grow h-full overflow-hidden',
    style: 'touch-action: auto',
  },
})
export class IndoorTopoComponent extends TopoPageBase {
  protected readonly authState = inject(AuthStateService);
  protected override readonly indoorData = inject(IndoorDataService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly indoorService = inject(IndoorService);

  override isIndoor = computed(() => true);

  protected readonly canEditAsAdmin = computed(() => {
    const centerId = this.topo()?.center_id ?? '';
    return !!this.authState.indoorAdminPermissions()[centerId];
  });

  protected readonly topoImageResource = resource({
    params: () => {
      const t = this.topo();
      if (!t?.photo) return null;
      return { path: t.photo };
    },
    loader: async ({ params }) => {
      if (!params) return null;
      return this.supabase.getPublicUrl('indoor-assets', params.path);
    },
  });

  protected readonly canEdit = computed(() => {
    const centerId = this.topo()?.center_id;
    return this.authState.canEditIndoorInCenter(centerId);
  });

  protected readonly canDraw = computed(() => {
    const centerId = this.topo()?.center_id;
    return this.authState.canCreateIndoorInCenter(centerId);
  });

  protected readonly columns = computed(() => {
    const isMobile = this.layoutService.isMobile();
    const base = isMobile
      ? ['grade', 'name', 'moves']
      : ['grade', 'name', 'moves', 'actions'];
    if (!isMobile && this.canEdit()) {
      base.push('admin_actions');
    }
    return base;
  });

  protected override readonly direction = signal<TuiSortDirection>(
    TuiSortDirection.Asc,
  );
  protected override readonly sorter = signal<TuiComparator<TopoRouteRow>>(
    TOPO_ROUTE_SORTERS['moves'],
  );

  protected readonly maxGradeIndex = ORDERED_GRADE_VALUES.length - 2;

  protected readonly maxPossibleMoves = computed(() => {
    const routes = this.topo()?.topo_routes ?? [];
    let max = 0;
    for (const tr of routes) {
      const m = calculateRouteMoves(tr.path);
      if (m > max) max = m;
    }
    return Math.max(max, 1);
  });

  protected readonly gradeRange = signal<[number, number] | null>(null);
  protected readonly movesRange = signal<[number, number] | null>(null);
  protected readonly hiddenRouteIds = signal<Set<string | number>>(new Set());

  protected readonly activeFilterCount = computed(() => {
    let count = 0;
    const gr = this.gradeRange();
    if (gr && (gr[0] > 0 || gr[1] < this.maxGradeIndex)) {
      count++;
    }
    const mr = this.movesRange();
    if (mr && (mr[0] > 0 || mr[1] < this.maxPossibleMoves())) {
      count++;
    }
    if (this.hiddenRouteIds().size > 0) {
      count++;
    }
    return count;
  });

  protected readonly hasActiveFilters = computed(() => {
    return this.activeFilterCount() > 0;
  });

  protected async openFiltersDialog(): Promise<void> {
    const maxMoves = this.maxPossibleMoves();
    const data: IndoorTopoFilterDialogData = {
      gradeRange: this.gradeRange() ?? [0, this.maxGradeIndex],
      movesRange: this.movesRange() ?? [0, maxMoves],
      maxPossibleMoves: maxMoves,
      hiddenRouteIds: Array.from(this.hiddenRouteIds()),
      routes: this.tableData().map((r) => ({
        id: r._ref.route_id,
        name: r.name,
        moves: r.moves ?? 0,
      })),
    };

    const result = await firstValueFrom(
      this.dialogs.open<IndoorTopoFilterDialogResult>(
        new PolymorpheusComponent(IndoorTopoFilterDialogComponent),
        {
          label: this.translate.instant('filters'),
          size: 'm',
          data,
          dismissible: true,
        },
      ),
      { defaultValue: null },
    );

    if (!result) return;

    this.gradeRange.set(result.gradeRange);
    this.movesRange.set(result.movesRange);
    this.hiddenRouteIds.set(new Set(result.hiddenRouteIds));
    this.preSoloHiddenRouteIds = null;
    const currentSelected = this.selectedRouteId();
    if (currentSelected && result.hiddenRouteIds.includes(currentSelected)) {
      this.selectedRouteId.set(null);
    }
  }

  private preSoloHiddenRouteIds: Set<string | number> | null = null;

  protected toggleRouteVisibility(event: {
    routeId: string | number;
    isAlt?: boolean;
  }): void {
    const { routeId, isAlt } = event;
    const allRoutes = this.tableData();
    const totalCount = allRoutes.length;
    this.hiddenRouteIds.update((set) => {
      const isHidden = set.has(routeId);
      const isSolo = totalCount > 1 && !isHidden && set.size >= totalCount - 1;

      if (isAlt) {
        if (isSolo) {
          const saved = this.preSoloHiddenRouteIds ?? new Set();
          this.preSoloHiddenRouteIds = null;
          return new Set([...saved].filter((id) => id !== routeId));
        }
        if (!this.preSoloHiddenRouteIds) {
          this.preSoloHiddenRouteIds = new Set(set);
        }
        const allOtherIds = allRoutes
          .map((r) => r._ref.route_id)
          .filter((id) => id !== routeId);
        this.selectedRouteId.set(routeId);
        return new Set(allOtherIds);
      }

      if (isSolo) {
        const saved = this.preSoloHiddenRouteIds ?? new Set();
        this.preSoloHiddenRouteIds = null;
        return new Set([...saved].filter((id) => id !== routeId));
      } else if (isHidden) {
        if (!this.preSoloHiddenRouteIds) {
          this.preSoloHiddenRouteIds = new Set(set);
        }
        const allOtherIds = allRoutes
          .map((r) => r._ref.route_id)
          .filter((id) => id !== routeId);
        this.selectedRouteId.set(routeId);
        return new Set(allOtherIds);
      } else {
        if (this.selectedRouteId() === routeId) {
          this.selectedRouteId.set(null);
        }
        const next = new Set(set);
        next.add(routeId);
        return next;
      }
    });
  }

  protected readonly tableData = computed(() => {
    const topo = this.topo();
    if (!topo) return [];
    return topo.topo_routes.map((tr) => {
      const r = tr.route;
      const climbed = !!r.own_ascent && r.own_ascent.type !== 'attempt';
      const project = !!r.project;
      const moves = calculateRouteMoves(tr.path);
      return {
        index: tr.number ?? 0,
        name: r.name,
        grade: r.grade,
        height: r.height || null,
        slug: r.slug,
        link: ['/indoor', this.centerSlug()!, 'route', r.slug],
        climbed,
        project,
        moves,
        _ref: tr,
      } as TopoRouteRow;
    });
  });

  protected readonly filteredTableData = computed(() => {
    const data = this.tableData();
    const gr = this.gradeRange();
    const mr = this.movesRange();
    const maxMoves = this.maxPossibleMoves();

    return data.filter((item) => {
      if (mr && (mr[0] > 0 || mr[1] < maxMoves)) {
        const moves = item.moves ?? 0;
        if (moves < mr[0] || moves > mr[1]) return false;
      }
      if (gr && (gr[0] > 0 || gr[1] < this.maxGradeIndex)) {
        const gradeNum = item._ref.route?.grade;
        const gradeLabel =
          GRADE_NUMBER_TO_LABEL[gradeNum as VERTICAL_LIFE_GRADES];
        if (gradeLabel && gradeLabel !== PROJECT_GRADE_LABEL) {
          const idx = ORDERED_GRADE_VALUES.indexOf(gradeLabel);
          if (idx !== -1 && (idx < gr[0] || idx > gr[1])) {
            return false;
          }
        }
      }
      return true;
    });
  });

  protected readonly sortedTableData = computed(() => {
    const data = this.filteredTableData();
    const sorter = this.sorter();
    const direction = this.direction();
    if (!sorter) return data;
    return [...data].sort((a, b) => {
      const result = sorter(a, b);
      return direction === 1 ? result : -result;
    });
  });

  protected readonly filteredRenderedTopoRoutes = computed(() => {
    const all = this.renderedTopoRoutes();
    const hidden = this.hiddenRouteIds();
    const gr = this.gradeRange();
    const mr = this.movesRange();
    const maxMoves = this.maxPossibleMoves();

    return all.filter((tr) => {
      if (hidden.has(tr.route_id)) return false;

      if (mr && (mr[0] > 0 || mr[1] < maxMoves)) {
        const moves = calculateRouteMoves(tr.path);
        if (moves < mr[0] || moves > mr[1]) return false;
      }

      if (gr && (gr[0] > 0 || gr[1] < this.maxGradeIndex)) {
        const gradeNum = tr.route?.grade;
        const gradeLabel =
          GRADE_NUMBER_TO_LABEL[gradeNum as VERTICAL_LIFE_GRADES];
        if (gradeLabel && gradeLabel !== PROJECT_GRADE_LABEL) {
          const idx = ORDERED_GRADE_VALUES.indexOf(gradeLabel);
          if (idx !== -1 && (idx < gr[0] || idx > gr[1])) {
            return false;
          }
        }
      }

      return true;
    });
  });

  protected async openDrawTopo(topo: TopoDetail): Promise<void> {
    if (!this.isBrowser) return;
    const photoPath = topo.photo;
    if (!photoPath) return;
    const imageUrl =
      this.topoImageResource.value() ||
      this.supabase.getPublicUrl('indoor-assets', photoPath);
    if (!imageUrl) return;

    const routes = (topo.topo_routes || []).map((tr, i) => ({
      topo_id: topo.id,
      route_id: tr.route_id,
      number: tr.number ?? i,
      route: tr.route,
      path: tr.path,
    }));

    const result = await this.toposService.openTopoPathEditor({
      imageUrl,
      topoRoutes: routes as TopoRouteWithRoute[],
      topoName: topo.name,
      topoId: topo.id,
      standalone: true,
      isIndoor: true,
      centerId: topo.center_id ? String(topo.center_id) : undefined,
    });

    if (result) {
      this.indoorData.topoDetailResource.reload();
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected openEditTopo(topo: TopoDetail): void {
    if (!this.isBrowser) return;
    const centerId = topo.center_id as string;
    const topoId = this.id();
    if (!topoId || !centerId) return;
    this.indoorService
      .openIndoorTopoForm(centerId, {
        id: topoId,
        name: topo.name,
        image_url: topo.photo ?? '',
        climbing_kind: null,
        legacy: topo.legacy ?? false,
        center_id: centerId,
        created_at: '',
        end_date: null,
        start_date: null,
      } as IndoorTopoDto)
      .then((success: boolean) => {
        if (success) this.indoorData.topoDetailResource.reload();
      });
  }

  protected deleteTopo(topo: TopoDetail): void {
    if (!this.isBrowser) return;
    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('topos.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('topos.deleteConfirm', {
            name: topo.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
          appearance: 'primary-destructive',
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.indoorService
        .deleteTopo(String(this.id()))
        .then(() => {
          this.toast.success('messages.toasts.topoDeleted');
          this.router.navigate(['/indoor', this.centerSlug()]);
        })
        .catch(() => {
          // noop
        });
    });
  }
}
