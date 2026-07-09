const fs = require('fs');

const path = 'src/components/route/routes-table.ts';
const content = `import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  InputSignal,
  output,
  signal,
  Signal,
  viewChildren,
} from '@angular/core';

import {
  TuiBadge,
  TuiChevron,
  TuiInputNumber,
  TuiPin,
  TuiRating,
} from '@taiga-ui/kit';
import {
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiGroup,
  TuiHint,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
  TuiCell,
  TuiInput,
} from '@taiga-ui/core';
import {
  TuiSortDirection,
  TuiTable,
  TuiTableTbody,
  TuiTableThGroup,
  TuiTableTh,
  TuiTableTr,
  TuiTableTd,
  TuiTableHead,
  TuiTableCell,
  TuiTableExpand,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';

import { TranslatePipe } from '@ngx-translate/core';

import { ButtonAscentTypeComponent } from '../ascent/button-ascent-type';
import { EmptyStateComponent } from '../ui/empty-state';
import { GradeComponent } from '../ui/avatar-grade';
import { IndoorRouteEquippersInputComponent } from './indoor-route-equippers-input';
import { RouteEquippersInputComponent } from './route-equippers-input';
import { RouteRowExpandedComponent } from './route-row-expanded';

import {
  RouteAscentWithExtras,
  RoutesTableKey,
  RoutesTableRow,
  RouteItem,
  IndoorRouteWithExtras,
  AscentType,
  INDOOR_ROUTE_COLORS,
} from '../../models';

import { IncludesIdPipe } from '../../pipes/includes-id.pipe';
import {
  mapRouteToTableRow,
  ROUTE_TABLE_SORTERS,
} from '../../utils';

@Component({
  selector: 'app-routes-table',
  imports: [
    ButtonAscentTypeComponent,
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    IncludesIdPipe,
    IndoorRouteEquippersInputComponent,
    RouteEquippersInputComponent,
    RouteRowExpandedComponent,
    RouterLink,
    TranslatePipe,
    TuiBadge,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
    TuiGroup,
    TuiHint,
    TuiIcon,
    TuiInput,
    TuiInputNumber,
    TuiLink,
    TuiPin,
    TuiRating,
    TuiScrollbar,
    TuiTable,
    TuiTableTbody,
    TuiTableThGroup,
    TuiTableTh,
    TuiTableTr,
    TuiTableTd,
    TuiTableHead,
    TuiTableCell,
    TuiTableExpand,
    TuiTableSortPipe,
  ],
  template: \`
    @if (tableData(); as data) {
      @if (data.length > 0) {
        @let isMobile = expandableMobile();
        <tui-scrollbar class="grow min-h-0 no-scrollbar">
          <table
            tuiTable
            [size]="isMobile ? 's' : 'm'"
            class="w-full"
            [class.table-fixed]="isMobile"
            [columns]="columns()"
            [direction]="currentDirection"
            [sorter]="currentSorter"
            (sortChange)="onSortChange($event)"
          >
            <thead tuiThead>
              <tr tuiThGroup>
                @for (col of columns(); track col) {
                  <th
                    *tuiHead="col"
                    tuiTh
                    [sorter]="getSorter(col)"
                    [class.text-right]="
                      col === 'actions' || col === 'admin_actions'
                    "
                    [class.w-12!]="col === 'expand'"
                    [class.w-16!]="col === 'height'"
                    [class.w-20!]="col === 'grade' || col === 'ascents'"
                    [class.w-24!]="col === 'rating' || col === 'color'"
                    [class.w-32!]="col === 'actions' || col === 'admin_actions'"
                    [class.w-64!]="col === 'equippers'"
                  >
                    @switch (col) {
                      @case ('expand') {
                        <button
                          appearance="icon"
                          size="xs"
                          tuiIconButton
                          [iconStart]="
                            allExpanded()
                              ? '@tui.chevron-up'
                              : '@tui.chevron-down'
                          "
                          (click.zoneless)="toggleAllExpanded()"
                        >
                          Expand
                        </button>
                      }
                      @case ('grade') {
                        {{ 'table.grade' | translate }}
                      }
                      @case ('route') {
                        {{ 'table.route' | translate }}
                      }
                      @case ('height') {
                        <tui-icon icon="@tui.ruler" class="text-xl" />
                      }
                      @case ('topo') {
                        {{ 'table.topo' | translate }}
                      }
                      @case ('color') {
                        {{ 'table.color' | translate }}
                      }
                      @case ('rating') {
                        {{ 'table.rating' | translate }}
                      }
                      @case ('ascents') {
                        {{ 'table.ascents' | translate }}
                      }
                      @case ('equippers') {
                        {{ 'table.equippers' | translate }}
                      }
                    }
                  </th>
                }
              </tr>
            </thead>

            <tbody
              tuiTbody
              [data]="data | tuiTableSort: currentSorter : currentDirection"
            >
              @for (item of data; track item.id; let index = $index) {
                <tr tuiTr>
                  @for (col of columns(); track col) {
                    <td *tuiCell="col" tuiTd>
                      @switch (col) {
                        @case ('expand') {
                          <div
                            tuiCell
                            size="s"
                            tuiTableExpand
                            #exp="tuiTableExpand"
                          >
                            <button
                              appearance="icon"
                              size="xs"
                              tuiIconButton
                              [iconStart]="
                                exp.expanded()
                                  ? '@tui.chevron-up'
                                  : '@tui.chevron-down'
                              "
                              (click.zoneless)="exp.toggle()"
                            >
                              Expand
                            </button>
                          </div>
                        }
                        @case ('grade') {
                          <div tuiCell size="l">
                            <app-avatar-grade
                              [grade]="item.grade"
                              [kind]="item.climbing_kind"
                            />
                          </div>
                        }
                        @case ('route') {
                          <div
                            tuiCell
                            size="l"
                            class="flex flex-col min-w-0"
                            [class.opacity-50]="item.legacy"
                          >
                            <div class="flex items-center gap-2">
                              <a
                                tuiLink
                                [routerLink]="item.link"
                                class="font-medium text-lg leading-tight truncate"
                                >{{ item.route }}</a
                              >

                              @if (item.own_ascent; as ascent) {
                                <tui-icon
                                  [icon]="
                                    ascent.type === 'project'
                                      ? '@tui.bookmark'
                                      : '@tui.check'
                                  "
                                  [class.text-green-500]="
                                    ascent.type !== 'project'
                                  "
                                  [class.text-blue-500]="
                                    ascent.type === 'project'
                                  "
                                />
                              }
                            </div>
                            @if (showLocation() && !isMobile) {
                              <div
                                class="text-xs opacity-70 truncate max-w-full"
                              >
                                {{ item.area_name }}
                                <tui-icon
                                  icon="@tui.chevron-right"
                                  class="text-xs inline-block translate-y-[2px]"
                                />
                                {{ item.crag_name }}
                              </div>
                            }
                          </div>
                        }
                        @case ('topo') {
                          <div
                            tuiCell
                            size="s"
                            class="flex flex-wrap gap-1 mt-1"
                          >
                            @if (item.topos.length > 0) {
                              @for (topo of item.topos; track topo.id) {
                                <a
                                  tuiBadge
                                  appearance="outline"
                                  [class.opacity-50]="topo.legacy"
                                  [routerLink]="topo.link"
                                >
                                  {{ topo.name }}
                                </a>
                              }
                            } @else {
                              <div class="text-xs opacity-50">
                                {{ 'noTopo' | translate }}
                              </div>
                            }
                          </div>
                        }
                        @case ('color') {
                          <div tuiCell size="s" class="flex flex-wrap gap-1">
                            <div
                              class="w-3 h-3 rounded-full mr-2"
                              [style.background-color]="item.color"
                              [tuiHint]="indoorColorName(item.color)"
                            ></div>
                          </div>
                        }
                        @case ('height') {
                          <div tuiCell size="m">
                            @if (item.height) {
                              <tui-badge appearance="neutral">
                                {{ item.height }} m
                              </tui-badge>
                            }
                          </div>
                        }
                        @case ('rating') {
                          <div tuiCell size="m">
                            <tui-rating [value]="item.rating" [readOnly]="true" />
                          </div>
                        }
                        @case ('ascents') {
                          <div tuiCell size="m">
                            {{ item.ascents }}
                          </div>
                        }
                        @case ('equippers') {
                          <div tuiCell size="l">
                            @if (item.isIndoor) {
                              <app-indoor-route-equippers-input
                                [routeId]="item.id"
                                [equippers]="item.equippers"
                                [small]="true"
                              />
                            } @else {
                              <app-route-equippers-input
                                [routeId]="$any(item.id)"
                                [equippers]="item.equippers"
                                [small]="true"
                              />
                            }
                          </div>
                        }
                        @case ('admin_actions') {
                          <div tuiCell size="s" class="flex flex-wrap gap-1">
                            @if (canEditRow()(item)) {
                              <div tuiGroup>
                                <button
                                  appearance="flat-grayscale"
                                  size="xs"
                                  tuiButton
                                  type="button"
                                  class="rounded-full!"
                                  iconStart="@tui.pencil"
                                  (click.zoneless)="editRoute.emit(item._ref)"
                                >
                                  {{ 'edit' | translate }}
                                </button>
                                @if (canDeleteRow()(item)) {
                                  <button
                                    appearance="flat-destructive"
                                    size="xs"
                                    tuiButton
                                    type="button"
                                    class="rounded-full!"
                                    iconStart="@tui.trash"
                                    (click.zoneless)="
                                      deleteRouteEvent.emit(item._ref)
                                    "
                                  >
                                    {{ 'delete' | translate }}
                                  </button>
                                }
                              </div>
                            }

                            @if (!item.isIndoor) {
                              @let canEditRoute = canEditRow()(item);
                              @let canAddRoute = canEditRoute || showAddRouteToTopo();

                              @if (item.topos.length > 0) {
                                <div tuiGroup>
                                  @for (topo of item.topos; track topo.id) {
                                    @let itemHasTopo =
                                      (item.topos | includesId: topo.id) !== null;
                                    <button
                                      appearance="secondary"
                                      size="xs"
                                      tuiButton
                                      type="button"
                                      [iconStart]="
                                        itemHasTopo ? '@tui.check' : '@tui.plus'
                                      "
                                      (click.zoneless)="
                                        toggleTopo.emit({
                                          topoId: $any(topo.id),
                                          routeId: item.id,
                                          isPresent: itemHasTopo
                                        })
                                      "
                                    >
                                      {{ topo.name }}
                                    </button>
                                  }
                                </div>
                              }
                            }
                          </div>
                        }
                        @case ('actions') {
                          <div tuiCell size="m">
                            @if (item.own_ascent; as ascent) {
                              <app-button-ascent-type
                                [type]="ascent.type"
                                [active]="true"
                                class="cursor-pointer"
                                [tuiHint]="'ascent.edit' | translate"
                                (click.zoneless)="
                                  editAscent.emit({
                                    item: item._ref,
                                    ascent: ascent,
                                    routeName: item.route
                                  })
                                "
                              />
                            } @else {
                              <button
                                size="m"
                                appearance="neutral"
                                iconStart="@tui.circle-plus"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiHint]="'ascent.new' | translate"
                                (click.zoneless)="logAscent.emit(item._ref)"
                              >
                                {{ 'ascent.new' | translate }}
                              </button>
                            }

                            @if (showProjectButton() && !item.climbed) {
                              <button
                                size="m"
                                [appearance]="item.project ? 'info' : 'neutral'"
                                iconStart="@tui.bookmark"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiHint]="'project' | translate"
                                (click.zoneless)="toggleProject.emit(item)"
                              >
                                {{ 'project' | translate }}
                              </button>
                            }
                          </div>
                        }
                      }
                    </td>
                  }
                </tr>

                @if (exp.expanded() || allExpanded()) {
                  <ng-template tuiTableExpand>
                    <div class="px-4 py-8 xl:p-8 overflow-hidden bg-neutral-900">
                      <app-route-row-expanded
                        [route]="item._ref"
                        [canEdit]="canEditRow()(item)"
                        [centerSlug]="centerSlug()"
                        [showAdminActions]="showAdminActions()"
                        [showLocation]="showLocation()"
                        [showAddRouteToTopo]="showAddRouteToTopo()"
                        (logAscent)="logAscent.emit($event)"
                        (editAscent)="
                          editAscent.emit({
                            item: $event.route,
                            ascent: $event.own_ascent,
                            routeName: $event.route.name
                          })
                        "
                        (toggleProject)="toggleProject.emit($event)"
                        (editRoute)="editRoute.emit($event)"
                        (openEquippers)="openEquippers.emit($event)"
                        (updateHeight)="
                          updateHeight.emit({
                            route: item._ref,
                            newHeight: $event
                          })
                        "
                        (toggleRouteOnTopo)="
                          toggleTopo.emit({
                            topoId: $event.topoId,
                            routeId: $event.routeId,
                            isPresent: $event.isPresent
                          })
                        "
                      />
                    </div>
                  </ng-template>
                }
              }
            </tbody>
          </table>
        </tui-scrollbar>
      } @else {
        <app-empty-state icon="@tui.route" />
      }
    }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col min-h-0 min-w-0' },
})
export class RoutesTableComponent {
  data: InputSignal<(RouteItem | IndoorRouteWithExtras)[]> = input<
    (RouteItem | IndoorRouteWithExtras)[]
  >([]);
  direction: InputSignal<TuiSortDirection> = input<TuiSortDirection>(
    TuiSortDirection.Desc,
  );
  showAdminActions: InputSignal<boolean> = input(true);
  showRowColors: InputSignal<boolean> = input(true);
  showLocation: InputSignal<boolean> = input(false);
  showAddRouteToTopo: InputSignal<boolean> = input(false);
  hiddenColumns: InputSignal<string[]> = input<string[]>([]);
  expandableMobile: InputSignal<boolean> = input(true);
  activeCol: InputSignal<RoutesTableKey> = input<RoutesTableKey>('ascents');

  columns = input<string[]>([]);
  showProjectButton = input(false);
  canEditRow = input<(row: RoutesTableRow) => boolean>(() => false);
  canDeleteRow = input<(row: RoutesTableRow) => boolean>(() => false);

  centerId: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );
  centerSlug: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  logAscent = output<RouteItem | IndoorRouteWithExtras>();
  editAscent = output<{
    item: RouteItem | IndoorRouteWithExtras;
    ascent:
      | RouteAscentWithExtras
      | { id: string | number; type: AscentType | null };
    routeName: string;
  }>();
  deleteRouteEvent = output<RouteItem | IndoorRouteWithExtras>();
  toggleProject = output<RoutesTableRow>();
  editRoute = output<RouteItem | IndoorRouteWithExtras>();
  updateHeight = output<{
    route: RouteItem | IndoorRouteWithExtras;
    newHeight: number | string | null;
  }>();
  toggleTopo = output<{
    topoId: number;
    routeId: number | string;
    isPresent: boolean;
  }>();
  openEquippers = output<RouteItem | IndoorRouteWithExtras>();
  sortChange = output<TuiTableSortChange<RoutesTableRow>>();

  protected readonly sorters = ROUTE_TABLE_SORTERS;

  protected currentSorter: TuiComparator<RoutesTableRow> =
    this.sorters[this.activeCol()];
  protected currentDirection: TuiSortDirection = this.direction();

  protected readonly openDropdownId = signal<string | null>(null);

  protected readonly expanders = viewChildren(TuiTableExpand);
  protected readonly allExpanded = signal(false);

  protected toggleAllExpanded() {
    this.allExpanded.update((v: boolean) => !v);
    const expandState = this.allExpanded();
    for (const exp of this.expanders()) {
      if (exp.expanded() !== expandState) {
        exp.expanded.set(expandState);
      }
    }
  }

  constructor() {
    effect(() => {
      this.currentDirection = this.direction();
      this.currentSorter = this.sorters[this.activeCol()];
    });
  }

  protected readonly tableData: Signal<RoutesTableRow[]> = computed(() =>
    this.data().map(mapRouteToTableRow),
  );

  protected getSorter(col: string): TuiComparator<RoutesTableRow> | null {
    if (col === 'actions' || col === 'admin_actions' || col === 'expand')
      return null;
    return this.sorters[col as RoutesTableKey] ?? null;
  }

  protected onSortChange(sort: TuiTableSortChange<RoutesTableRow>): void {
    this.currentSorter = sort.sortComparator || this.sorters['grade'];
    this.currentDirection = sort.sortDirection;
    this.sortChange.emit(sort);
  }

  protected getExpandedRoute(
    item: RoutesTableRow,
  ): RouteItem | IndoorRouteWithExtras {
    return item._ref;
  }

  protected indoorColorName(colorValue: string | null): string {
    if (!colorValue) return '';
    const name = INDOOR_ROUTE_COLORS[colorValue];
    return name ? colorValue : colorValue;
  }
}
`;
fs.writeFileSync(path, content);
