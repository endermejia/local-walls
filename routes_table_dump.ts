import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  InputSignal,
  PLATFORM_ID,
  signal,
  Signal,
  viewChildren,
} from '@angular/core';

import { TuiDialogService } from '@taiga-ui/core';
import {
  TUI_CONFIRM,
  TuiBadge,
  TuiChevron,
  type TuiConfirmData,
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

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../../services/ascents.service';
import { GlobalData } from '../../services/global-data';
import { IndoorService } from '../../services/indoor.service';
import { RoutesService } from '../../services/routes.service';
import { ToastService } from '../../services/toast.service';
import { ToposService } from '../../services/topos.service';

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
  handleErrorToast,
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
  template: `
    @if (tableData(); as data) {
      @if (data.length > 0) {
        @let isMobile = global.isMobile();
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
                    <div class="flex items-center gap-1">
                      @if (col === 'expand') {
                        <button
                          appearance="flat-grayscale"
                          size="xs"
                          tuiIconButton
                          type="button"
                          class="rounded-full!"
                          [tuiChevron]="allExpanded()"
                          (click.zoneless)="toggleAllExpanded()"
                        >
                          Toggle All
                        </button>
                      } @else {
                        {{
                          col === 'actions' || col === 'admin_actions'
                            ? ''
                            : (col | translate)
                        }}
                      }
                    </div>
                  </th>
                }
              </tr>
            </thead>
            @let sortedData = data | tuiTableSort;
            @for (item of sortedData; track item.key) {
              @let canEditRoute = canEditRouteRow(item);
              <tbody tuiTbody>
                <tr
                  tuiTr
                  [style.background]="
                    showRowColors()
                      ? item.climbed
                        ? (ascentsService.ascentInfo()[
                            item.own_ascent?.type || 'default'
                          ]?.backgroundSubtle ?? '')
                        : item.project
                          ? 'var(--tui-status-info-pale)'
                          : ''
                      : ''
                  "
                >
                  @for (col of columns(); track col) {
                    <td
                      *tuiCell="col"
                      tuiTd
                      [class.text-right]="
                        col === 'actions' || col === 'admin_actions'
                      "
                    >
                      @switch (col) {
                        @case ('expand') {
                          <button
                            appearance="flat-grayscale"
                            size="xs"
                            tuiIconButton
                            type="button"
                            class="rounded-full!"
                            [tuiChevron]="exp.expanded()"
                            (click.zoneless)="exp.toggle()"
                          >
                            Toggle
                          </button>
                        }
                        @case ('grade') {
                          <div tuiCell size="m">
                            <app-grade
                              [grade]="item.gradeValue"
                              [kind]="item.climbing_kind"
                            />
                          </div>
                        }
                        @case ('route') {
                          <div tuiCell size="m">
                            <div class="flex flex-col min-w-0">
                              <div
                                class="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0"
                              >
                                <a
                                  tuiLink
                                  [routerLink]="item.link"
                                  [style.color]="
                                    item.liked
                                      ? 'var(--tui-status-negative)'
                                      : ''
                                  "
                                  class="align-self-start font-bold text-base truncate max-w-full block"
                                >
                                  {{ item.route || ('route' | translate) }}
                                </a>
                                @if (item.legacy) {
                                  <span
                                    tuiBadge
                                    size="s"
                                    appearance="neutral"
                                    class="uppercase text-[10px] shrink-0"
                                  >
                                    {{ 'indoor.legacy' | translate }}
                                  </span>
                                }
                              </div>
                              @if (
                                showLocation() && !isMobile && !item.isIndoor
                              ) {
                                <div
                                  class="text-xs opacity-70 flex gap-1 items-center whitespace-nowrap"
                                >
                                  <a
                                    tuiLink
                                    [routerLink]="['/area', item.area_slug]"
                                  >
                                    {{ item.area_name }}
                                  </a>
                                  <span>/</span>
                                  <a
                                    tuiLink
                                    [routerLink]="[
                                      '/area',
                                      item.area_slug,
                                      item.crag_slug,
                                    ]"
                                  >
                                    {{ item.crag_name }}
                                  </a>
                                </div>
                              }
                            </div>
                          </div>
                        }
                        @case ('height') {
                          <div tuiCell size="m" class="justify-center h-full">
                            @if (canEditRoute) {
                              <tui-textfield
                                [tuiTextfieldCleaner]="false"
                                tuiTextfieldSize="s"
                                [class.w-16!]="!isMobile"
                                [class.w-12!]="isMobile"
                                class="h-8!"
                              >
                                <input
                                  tuiInputNumber
                                  class="text-center h-full! border-none! p-0! route-height-input"
                                  [ngModel]="item.height"
                                  (blur.zoneless)="
                                    onUpdateRouteHeight(
                                      item._ref,
                                      $any($event.target).value
                                    )
                                  "
                                  (keydown.enter)="
                                    onUpdateRouteHeight(
                                      item._ref,
                                      $any($event.target).value
                                    )
                                  "
                                  autocomplete="off"
                                />
                                <span class="tui-textfield__suffix">m</span>
                              </tui-textfield>
                            } @else {
                              {{ item.height ? item.height + 'm' : '-' }}
                            }
                          </div>
                        }
                        @case ('color') {
                          <div tuiCell size="m">
                            <div class="flex items-center gap-2 min-w-0">
                              @if (item.color) {
                                <div
                                  tuiPin
                                  [style.backgroundColor]="item.color"
                                  style="position: static; transform: scale(0.75); margin: 0;"
                                  class="shrink-0"
                                ></div>
                                <span class="text-sm truncate">
                                  {{ indoorColorName(item.color) }}
                                </span>
                              } @else {
                                <span class="opacity-50 text-xs">-</span>
                              }
                            </div>
                          </div>
                        }
                        @case ('rating') {
                          <div tuiCell size="m">
                            <tui-rating
                              [max]="5"
                              [ngModel]="item.rating"
                              [readOnly]="true"
                              [style.font-size.rem]="1"
                            />
                          </div>
                        }
                        @case ('ascents') {
                          <div tuiCell size="m">
                            <span>{{ item.ascents }}</span>
                          </div>
                        }
                        @case ('topo') {
                          <div tuiCell size="m">
                            <div class="flex flex-wrap gap-1 min-w-0">
                              @if (item.isIndoor) {
                                @for (t of item.topos; track t.id) {
                                  <a
                                    tuiLink
                                    [routerLink]="t.link"
                                    class="text-xs bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 px-2 py-0.5 rounded-md transition-colors truncate max-w-full font-medium"
                                  >
                                    {{ t.name }}
                                  </a>
                                } @empty {
                                  <span class="opacity-50 text-xs">-</span>
                                }
                              } @else {
                                <div class="flex flex-wrap gap-x-1 gap-y-0">
                                  @let toposCount = item.topos.length;
                                  @if (toposCount > 0) {
                                    <div tuiGroup [collapsed]="true">
                                      @for (t of item.topos; track t.id) {
                                        <button
                                          tuiButton
                                          appearance="secondary"
                                          class="min-w-fit!"
                                          size="xs"
                                          (click.zoneless)="
                                            router.navigate(t.link)
                                          "
                                        >
                                          {{ t.name }}
                                        </button>
                                      }
                                      @if (
                                        global.editingMode() &&
                                        canEditRoute &&
                                        showAddRouteToTopo()
                                      ) {
                                        <button
                                          appearance="secondary"
                                          size="xs"
                                          tuiIconButton
                                          type="button"
                                          iconStart="@tui.chevron-down"
                                          [tuiDropdown]="toposMenu"
                                          [tuiDropdownOpen]="
                                            openDropdownId() === item.key
                                          "
                                          (tuiDropdownOpenChange)="
                                            openDropdownId.set(
                                              $event ? item.key : null
                                            )
                                          "
                                        >
                                          {{ 'addRouteToTopo' | translate }}
                                        </button>
                                      }
                                    </div>
                                  } @else if (
                                    global.editingMode() &&
                                    canEditRoute &&
                                    showAddRouteToTopo()
                                  ) {
                                    <button
                                      appearance="flat-grayscale"
                                      size="xs"
                                      tuiButton
                                      type="button"
                                      class="rounded-full!"
                                      iconStart="@tui.plus"
                                      [tuiDropdown]="toposMenu"
                                      [tuiDropdownOpen]="
                                        openDropdownId() === item.key
                                      "
                                      (tuiDropdownOpenChange)="
                                        openDropdownId.set(
                                          $event ? item.key : null
                                        )
                                      "
                                    >
                                      {{ 'addRouteToTopo' | translate }}
                                    </button>
                                  }
                                  <ng-template #toposMenu>
                                    <tui-data-list>
                                      @for (
                                        topo of global.cragDetail()?.topos ||
                                          [];
                                        track topo.id
                                      ) {
                                        @let isAttached =
                                          item.topos | includesId: topo.id;

                                        <button
                                          tuiOption
                                          new
                                          (click)="
                                            toggleRouteOnTopo(
                                              topo.id,
                                              item.id,
                                              isAttached
                                            );
                                            openDropdownId.set(null)
                                          "
                                        >
                                          <tui-icon
                                            [icon]="
                                              isAttached
                                                ? '@tui.check'
                                                : '@tui.image'
                                            "
                                            class="mr-2"
                                          />
                                          {{ topo.name }}
                                        </button>
                                      }
                                    </tui-data-list>
                                  </ng-template>
                                </div>
                              }
                            </div>
                          </div>
                        }
                        @case ('equippers') {
                          <div
                            tuiCell
                            size="m"
                            class="h-full py-0 grow min-w-0"
                          >
                            @if (item.isIndoor) {
                              @if (canEditIndoor()) {
                                <app-indoor-route-equippers-input
                                  [route]="getIndoorRef(item)"
                                  (equippersChanged)="
                                    indoorService.reloadCenterRoutes()
                                  "
                                />
                              } @else {
                                <div class="flex flex-wrap gap-1 items-center">
                                  @for (e of item.equippers; track e.id) {
                                    <button
                                      tuiButton
                                      appearance="secondary"
                                      size="xs"
                                      class="min-w-fit! px-2!"
                                      [routerLink]="['/equipper', e.id]"
                                    >
                                      {{ e.name }}
                                    </button>
                                  } @empty {
                                    <span class="opacity-50 text-xs">-</span>
                                  }
                                </div>
                              }
                            } @else {
                              @if (canEditRoute) {
                                <app-route-equippers-input
                                  [route]="getOutdoorRef(item)"
                                />
                              } @else if (item.equippers; as equippers) {
                                <div class="flex flex-wrap gap-1">
                                  @for (e of equippers; track e.id) {
                                    <button
                                      tuiButton
                                      appearance="secondary"
                                      size="xs"
                                      class="min-w-fit! px-2!"
                                      (click)="
                                        router.navigate(['/equipper', e.id])
                                      "
                                    >
                                      {{ e.name }}
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
                                  item.isIndoor
                                    ? editIndoorAscent(item._ref, ascent)
                                    : onEditAscent(ascent, item.route)
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
                                (click.zoneless)="
                                  item.isIndoor
                                    ? logIndoorAscent(item._ref)
                                    : onLogAscent(item._ref)
                                "
                              >
                                {{ 'ascent.new' | translate }}
                              </button>
                            }

                            @if (!item.isIndoor && !item.climbed) {
                              <button
                                size="m"
                                [appearance]="item.project ? 'info' : 'neutral'"
                                iconStart="@tui.bookmark"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiHint]="'project' | translate"
                                (click.zoneless)="onToggleProject(item)"
                              >
                                {{ 'project' | translate }}
                              </button>
                            }
                          </div>
                        }
                        @case ('admin_actions') {
                          <div class="flex gap-1 justify-end items-center">
                            @if (item.isIndoor) {
                              <button
                                size="s"
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiHint]="'edit' | translate"
                                (click.zoneless)="editIndoorRoute(item._ref)"
                              >
                                {{ 'edit' | translate }}
                              </button>
                              <button
                                size="s"
                                appearance="negative"
                                iconStart="@tui.trash"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiHint]="'delete' | translate"
                                (click.zoneless)="deleteIndoorRoute(item._ref)"
                              >
                                {{ 'delete' | translate }}
                              </button>
                            } @else {
                              <button
                                size="s"
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                (click.zoneless)="openEditRoute(item._ref)"
                              >
                                {{ 'edit' | translate }}
                              </button>
                              @if (canDeleteOutdoorRoute(item)) {
                                <button
                                  size="s"
                                  appearance="negative"
                                  iconStart="@tui.trash"
                                  tuiIconButton
                                  type="button"
                                  class="rounded-full!"
                                  (click.zoneless)="deleteRoute(item._ref)"
                                >
                                  {{ 'delete' | translate }}
                                </button>
                              }
                            }
                          </div>
                        }
                      }
                    </td>
                  }
                </tr>
                <tui-table-expand #exp [expanded]="false">
                  <tr>
                    <td
                      [colSpan]="columns().length"
                      class="p-0! border-none! w-full! max-w-full!"
                    >
                      <app-route-row-expanded
                        [isIndoor]="item.isIndoor"
                        [route]="getExpandedRoute(item)"
                        [canEdit]="canEditRouteRow(item)"
                        [centerSlug]="centerSlug()"
                        [showAdminActions]="showAdminActions()"
                        [showLocation]="showLocation()"
                        [showAddRouteToTopo]="showAddRouteToTopo()"
                        (logAscent)="
                          item.isIndoor
                            ? logIndoorAscent($event)
                            : onLogAscent($event)
                        "
                        (editAscent)="
                          item.isIndoor
                            ? editIndoorAscent($event.route, $event.own_ascent)
                            : onEditAscent($event.own_ascent, $event.route.name)
                        "
                        (toggleProject)="onToggleProject($event)"
                        (editRoute)="
                          item.isIndoor
                            ? editIndoorRoute($event)
                            : openEditRoute($event)
                        "
                        (deleteRoute)="
                          item.isIndoor
                            ? deleteIndoorRoute($event)
                            : deleteRoute($event)
                        "
                        (toggleRouteOnTopo)="
                          toggleRouteOnTopo(
                            $event.topoId,
                            $event.routeId,
                            $event.isAttached
                          )
                        "
                      />
                    </td>
                  </tr>
                </tui-table-expand>
              </tbody>
            }
          </table>
        </tui-scrollbar>
      } @else {
        <app-empty-state icon="@tui.list" />
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col min-h-0 min-w-0' },
})
export class RoutesTableComponent {
  protected readonly global = inject(GlobalData);
  protected readonly router = inject(Router);
  protected readonly routesService = inject(RoutesService);
  protected readonly toposService = inject(ToposService);
  protected readonly ascentsService = inject(AscentsService);
  protected readonly indoorService = inject(IndoorService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  // Inputs
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

  centerId: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );
  centerSlug: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
  );

  protected readonly isIndoor = computed(
    () =>
      this.data().some((r) => typeof r.id === 'string') ||
      this.centerId() !== undefined,
  );

  protected readonly sorters = ROUTE_TABLE_SORTERS;

  // Internal state for sorting
  protected currentSorter: TuiComparator<RoutesTableRow> =
    this.sorters[this.activeCol()];
  protected currentDirection: TuiSortDirection = this.direction();

  protected readonly openDropdownId = signal<string | null>(null);

  protected readonly expanders = viewChildren(TuiTableExpand);
  protected readonly allExpanded = signal(false);

  protected toggleAllExpanded() {
    this.allExpanded.update((v) => !v);
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

  protected readonly columns = computed(() => {
    const isMobile = this.global.isMobile() && this.expandableMobile();
    if (isMobile) {
      return ['expand', 'grade', 'route'];
    }

    if (this.isIndoor()) {
      const cols = [
        'expand',
        'grade',
        'route',
        'topo',
        'color',
        'rating',
        'ascents',
        'actions',
      ];
      if (this.canEditIndoor()) {
        cols.splice(cols.indexOf('rating'), 1);
        cols.splice(cols.indexOf('ascents'), 1);
        cols.splice(cols.indexOf('actions'), 1);
        cols.push('equippers');
        cols.push('admin_actions');
      }
      return cols;
    }

    const cols = [
      'grade',
      'route',
      'topo',
      'height',
      'rating',
      'ascents',
      'actions',
    ];

    const canEditAny = this.data().some(
      (r) => typeof r.id === 'number' && this.global.canEditCragRoutes()[r.id],
    );

    if (
      this.global.editingMode() &&
      this.showAdminActions() &&
      (this.global.canEditAsAdmin() || canEditAny)
    ) {
      cols.splice(cols.indexOf('rating'), 1);
      cols.splice(cols.indexOf('ascents'), 1);
      cols.splice(cols.indexOf('actions'), 1);

      cols.push('equippers');
      cols.push('admin_actions');
    }
    return cols.filter((c) => !this.hiddenColumns().includes(c));
  });

  protected readonly canEditIndoor = computed(() => {
    const id = this.centerId();
    return id ? !!this.global.indoorAdminPermissions()[id] : false;
  });

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
  }

  protected onLogAscent(item: RouteItem | IndoorRouteWithExtras): void {
    const r = item as RouteItem;
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        grade: r.grade,
        climbingKind: r.climbing_kind,
      }),
      { defaultValue: undefined },
    );
  }

  protected onEditAscent(
    ascent:
      | RouteAscentWithExtras
      | { id: string | number; type: string | null },
    routeName: string,
  ): void {
    const a = ascent as RouteAscentWithExtras;
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: a.route_id,
        routeName: routeName,
        ascentData: a,
      }),
      { defaultValue: undefined },
    );
  }

  protected deleteRoute(route: RouteItem | IndoorRouteWithExtras): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const r = route as RouteItem;

    firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
    ).then((confirmed) => {
      if (!confirmed) return;
      this.routesService
        .delete(r.id)
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  protected getIndoorRef(item: RoutesTableRow): IndoorRouteWithExtras {
    return item._ref as IndoorRouteWithExtras;
  }

  protected getOutdoorRef(item: RoutesTableRow): RouteItem {
    return item._ref as RouteItem;
  }

  protected getExpandedRoute(
    item: RoutesTableRow,
  ): RoutesTableRow | IndoorRouteWithExtras {
    return item.isIndoor ? (item._ref as IndoorRouteWithExtras) : item;
  }

  protected canEditRouteRow(item: RoutesTableRow): boolean {
    if (item.isIndoor) {
      return this.canEditIndoor();
    }
    return !!this.global.canEditCragRoutes()[item.id as number];
  }

  protected canDeleteOutdoorRoute(item: RoutesTableRow): boolean {
    if (item.isIndoor) return false;
    const ref = item._ref as RouteItem;
    return (
      this.global.canEditAsAdmin() ||
      !!this.global.areaAdminPermissions()[ref.area_id || -1]
    );
  }

  protected onToggleProject(item: RoutesTableRow): void {
    if (!item.isIndoor) {
      this.routesService.toggleRouteProject(
        item.id as number,
        item._ref as RouteItem,
      );
    }
  }

  protected openEditRoute(route: RouteItem | IndoorRouteWithExtras): void {
    const r = route as RouteItem;
    this.routesService.openRouteForm({
      cragId: r.crag_id,
      routeData: {
        id: r.id,
        crag_id: r.crag_id,
        name: r.name,
        slug: r.slug,
        grade: Number(r.grade),
        climbing_kind: r.climbing_kind,
        height: r.height || null,
      },
    });
  }

  protected openEquippersPanel(route: RouteItem): void {
    this.routesService.openRouteForm({
      cragId: route.crag_id,
      routeData: {
        id: route.id,
        crag_id: route.crag_id,
        name: route.name,
        slug: route.slug,
        grade: Number(route.grade),
        climbing_kind: route.climbing_kind,
        height: route.height || null,
      },
    });
  }

  protected onUpdateRouteHeight(
    route: RouteItem | IndoorRouteWithExtras,
    newHeight: number | string | null,
  ): void {
    const r = route as RouteItem;
    const val =
      newHeight === null || newHeight === ''
        ? null
        : typeof newHeight === 'string'
          ? parseInt(newHeight, 10)
          : newHeight;

    if (val === r.height) return;

    this.routesService
      .update(r.id, { height: val })
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected async toggleRouteOnTopo(
    topoId: number,
    routeId: number | string,
    isPresent: boolean,
  ): Promise<void> {
    const rid = typeof routeId === 'string' ? parseInt(routeId, 10) : routeId;
    try {
      if (isPresent) {
        await this.toposService.removeRoute(topoId, rid, false);
      } else {
        await this.toposService.addRoute(
          {
            topo_id: topoId,
            route_id: rid,
            number: 0,
          },
          false,
        );
      }
      await this.global.cragRoutesResource.reload();
      await this.global.cragDetailResource.reload();
    } catch (e: unknown) {
      console.error('[RoutesTable] error toggling route on topo', e);
      handleErrorToast(e, this.toast);
    }
  }

  // ── Indoor actions ──────────────────────────────────────────────────────

  protected indoorColorName(colorValue: string | null): string {
    if (!colorValue) return '';
    const name = INDOOR_ROUTE_COLORS[colorValue];
    return name ? this.translate.instant('colors.' + name) : colorValue;
  }

  protected async logIndoorAscent(
    item: RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r = item as IndoorRouteWithExtras;
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        grade: r.grade ?? undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected async editIndoorAscent(
    item: RouteItem | IndoorRouteWithExtras,
    ascent:
      | RouteAscentWithExtras
      | { id: string | number; type: AscentType | null },
  ): Promise<void> {
    const r = item as IndoorRouteWithExtras;
    const asc = ascent as { id: string | number; type: AscentType | null };
    const success = await firstValueFrom(
      this.ascentsService.openAscentForm({
        ascentData: {
          ...asc,
          route: {
            id: r.id,
            name: r.name,
            climbing_kind: r.climbing_kind,
            grade: r.grade,
            center_name: r.center_name,
            center_slug: r.center_slug,
          },
        } as unknown as RouteAscentWithExtras,
        routeId: r.id,
        routeName: r.name,
        isIndoor: true,
        grade: r.grade ?? undefined,
      }),
      { defaultValue: false },
    );
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected async editIndoorRoute(
    item: RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r = item as IndoorRouteWithExtras;
    const id = this.centerId();
    if (!id) return;
    const success = await this.indoorService.openIndoorRouteForm(id, r);
    if (success) {
      this.indoorService.reloadCenterRoutes();
    }
  }

  protected async deleteIndoorRoute(
    item: RouteItem | IndoorRouteWithExtras,
  ): Promise<void> {
    const r = item as IndoorRouteWithExtras;
    if (!isPlatformBrowser(this.platformId)) return;
    const confirmed = await firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: r.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    );
    if (!confirmed) return;
    await this.indoorService.deleteRoute(r.id);
    this.indoorService.reloadCenterRoutes();
  }
}
