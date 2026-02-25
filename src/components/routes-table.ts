import { DecimalPipe, isPlatformBrowser, LowerCasePipe } from '@angular/common';
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
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import {
  TuiSortDirection,
  TuiTable,
  TuiTableExpand,
  TuiTableSortChange,
  TuiTableSortPipe,
} from '@taiga-ui/addon-table';
import type { TuiComparator } from '@taiga-ui/addon-table/types';
import { tuiDefaultSort } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiDataList,
  TuiDropdown,
  TuiGroup,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
  TuiTextfield,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiChevron,
  type TuiConfirmData,
  TuiInputNumber,
  TuiRating,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { AscentsService } from '../services/ascents.service';
import { GlobalData } from '../services/global-data';
import { RoutesService } from '../services/routes.service';
import { ToastService } from '../services/toast.service';
import { ToposService } from '../services/topos.service';

import {
  RouteAscentWithExtras,
  RouteWithExtras,
  VERTICAL_LIFE_GRADES,
  GRADE_NUMBER_TO_LABEL,
} from '../models';

import { handleErrorToast, normalizeName } from '../utils';

import { GradeComponent } from './avatar-grade';
import { ButtonAscentTypeComponent } from './button-ascent-type';
import { EmptyStateComponent } from './empty-state';
import { RouteEquippersInputComponent } from './route-equippers-input';

export type RoutesTableKey =
  | 'grade'
  | 'route'
  | 'rating'
  | 'ascents'
  | 'height'
  | 'topo';
export type RouteItem = RouteWithExtras;

export interface RoutesTableRow {
  key: string;
  grade: string;
  route: string;
  height: number | null;
  rating: number;
  ascents: number;
  liked: boolean;
  project: boolean;
  climbed: boolean;
  link: string[];
  area_name?: string;
  crag_name?: string;
  area_slug?: string;
  crag_slug?: string;
  topos: { id: number; name: string; slug: string }[];
  _ref: RouteItem;
}

@Component({
  selector: 'app-routes-table',
  imports: [
    ButtonAscentTypeComponent,
    GradeComponent,
    DecimalPipe,
    EmptyStateComponent,
    FormsModule,
    LowerCasePipe,
    RouteEquippersInputComponent,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiDataList,
    TuiDropdown,
    TuiGroup,
    TuiIcon,
    TuiInputNumber,
    TuiLink,
    TuiRating,
    TuiScrollbar,
    TuiTable,
    TuiTableExpand,
    TuiTableSortPipe,
    TuiTextfield,
  ],
  template: `
    @if (tableData(); as data) {
      @if (data.length > 0) {
        @let isMobile = global.isMobile();
        @let isAdmin = global.isAdmin();
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
                    [class.!w-12]="col === 'expand'"
                    [class.!w-16]="col === 'height'"
                    [class.!w-20]="col === 'grade' || col === 'ascents'"
                    [class.!w-24]="col === 'rating'"
                    [class.!w-32]="col === 'actions' || col === 'admin_actions'"
                    [class.!w-64]="col === 'equippers'"
                  >
                    <div class="flex items-center gap-1">
                      {{
                        col === 'actions' ||
                        col === 'admin_actions' ||
                        col === 'expand'
                          ? ''
                          : (col | translate)
                      }}
                    </div>
                  </th>
                }
              </tr>
            </thead>
            @let sortedData = data | tuiTableSort;
            @for (item of sortedData; track item.key) {
              @let canEditRoute = global.permissions.routeEdit()[item._ref.id];
              <tbody tuiTbody>
                <tr
                  tuiTr
                  [style.background]="
                    showRowColors()
                      ? item.climbed
                        ? ascentsService.ascentInfo()[
                            item._ref.own_ascent?.type || 'default'
                          ].backgroundSubtle
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
                            class="!rounded-full"
                            [tuiChevron]="exp.expanded()"
                            (click.zoneless)="exp.toggle()"
                          >
                            Toggle
                          </button>
                        }
                        @case ('grade') {
                          <div tuiCell size="m">
                            <app-grade [grade]="item._ref.grade" />
                          </div>
                        }
                        @case ('route') {
                          <div tuiCell size="m">
                            <div class="flex flex-col min-w-0">
                              <a
                                tuiLink
                                [routerLink]="item.link"
                                [style.color]="
                                  item.liked ? 'var(--tui-status-negative)' : ''
                                "
                                class="align-self-start font-bold text-base truncate max-w-full block"
                              >
                                {{ item.route || ('route' | translate) }}
                              </a>
                              @if (showLocation() && !isMobile) {
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
                                tuiTextfieldSize="s"
                                [class.!w-16]="!isMobile"
                                [class.!w-12]="isMobile"
                                class="!h-8"
                              >
                                <input
                                  tuiInputNumber
                                  class="text-center !h-full !border-none !p-0 route-height-input"
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
                        @case ('rating') {
                          <div tuiCell size="m">
                            <tui-rating
                              [max]="5"
                              [ngModel]="item.rating"
                              [readOnly]="true"
                              [style.font-size.rem]="0.5"
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
                            <div class="flex flex-wrap gap-1">
                              @let toposCount = item.topos.length;
                              @if (toposCount > 0) {
                                <div tuiGroup [collapsed]="true">
                                  @for (t of item.topos; track t.id) {
                                    <button
                                      tuiButton
                                      appearance="secondary"
                                      class="!min-w-fit"
                                      size="xs"
                                      (click.zoneless)="
                                        router.navigate([
                                          '/area',
                                          item.area_slug,
                                          item.crag_slug,
                                          'topo',
                                          t.id,
                                        ])
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
                                  class="!rounded-full"
                                  iconStart="@tui.plus"
                                  [tuiDropdown]="toposMenu"
                                  [tuiDropdownOpen]="
                                    openDropdownId() === item.key
                                  "
                                  (tuiDropdownOpenChange)="
                                    openDropdownId.set($event ? item.key : null)
                                  "
                                >
                                  {{ 'addRouteToTopo' | translate }}
                                </button>
                              }
                              <ng-template #toposMenu>
                                <tui-data-list>
                                  @for (
                                    topo of global.cragDetailResource.value()
                                      ?.topos || [];
                                    track topo.id
                                  ) {
                                    @let isAttached =
                                      isRouteInTopo(
                                        item._ref.id,
                                        topo.id,
                                        item.topos
                                      );
                                    <button
                                      tuiOption
                                      new
                                      (click)="
                                        toggleRouteOnTopo(
                                          topo.id,
                                          item._ref.id,
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
                          </div>
                        }
                        @case ('equippers') {
                          <div tuiCell size="m" class="h-full py-0">
                            @if (canEditRoute) {
                              <app-route-equippers-input [route]="item._ref" />
                            }
                          </div>
                        }
                        @case ('actions') {
                          <div tuiCell size="m">
                            @if (!item.climbed) {
                              <button
                                size="m"
                                appearance="neutral"
                                iconStart="@tui.circle-plus"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="onLogAscent(item._ref)"
                              >
                                {{ 'ascent.new' | translate }}
                              </button>
                            } @else if (item._ref.own_ascent; as ascentToEdit) {
                              <app-button-ascent-type
                                [type]="ascentToEdit?.type"
                                [active]="true"
                                class="cursor-pointer"
                                tabindex="0"
                                (click.zoneless)="
                                  onEditAscent(ascentToEdit, item._ref.name)
                                "
                                (keydown.enter)="
                                  onEditAscent(ascentToEdit, item._ref.name)
                                "
                              />
                            }

                            @if (!item.climbed) {
                              <button
                                size="m"
                                [appearance]="
                                  item.project ? 'primary' : 'neutral'
                                "
                                iconStart="@tui.bookmark"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="
                                  routesService.toggleRouteProject(
                                    item._ref.id,
                                    item._ref
                                  )
                                "
                              >
                                {{ 'project' | translate }}
                              </button>
                            }
                          </div>
                        }
                        @case ('admin_actions') {
                          <div tuiCell size="m">
                            @if (canEditRoute) {
                              <button
                                size="s"
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="openEditRoute(item._ref)"
                              >
                                {{ 'edit' | translate }}
                              </button>
                              @if (isAdmin) {
                                <button
                                  size="s"
                                  appearance="negative"
                                  iconStart="@tui.trash"
                                  tuiIconButton
                                  type="button"
                                  class="!rounded-full"
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
                  <tr tuiTr>
                    <td [colSpan]="columns().length" tuiTd>
                      <div
                        class="flex flex-col gap-3 p-3 bg-[var(--tui-background-neutral-1)] rounded-2xl border border-[var(--tui-border-normal)]"
                      >
                        <div
                          class="flex flex-wrap items-center justify-between gap-2"
                        >
                          <div class="flex items-center gap-3">
                            @if (item.height) {
                              <div class="flex items-center gap-1 opacity-70">
                                <tui-icon
                                  icon="@tui.arrow-up-right"
                                  class="text-xs"
                                />
                                <span class="font-medium"
                                  >{{ item.height }}m</span
                                >
                              </div>
                            }
                            <div class="flex items-center gap-1 opacity-70">
                              <tui-icon icon="@tui.star" class="text-xs" />
                              <span class="font-medium">{{
                                item.rating | number: '1.1-1'
                              }}</span>
                            </div>
                          </div>

                          <div class="flex flex-col gap-2">
                            <div class="flex flex-wrap gap-1">
                              @let toposCountExp = item.topos.length;
                              @if (toposCountExp > 0) {
                                <div tuiGroup [collapsed]="true">
                                  @for (t of item.topos; track t.id) {
                                    <button
                                      tuiButton
                                      appearance="secondary"
                                      class="!min-w-fit"
                                      size="xs"
                                      (click.zoneless)="
                                        router.navigate([
                                          '/area',
                                          item.area_slug,
                                          item.crag_slug,
                                          'topo',
                                          t.id,
                                        ])
                                      "
                                    >
                                      {{ t.name }}
                                    </button>
                                  }
                                  @if (
                                    global.editingMode() && showAddRouteToTopo()
                                  ) {
                                    <button
                                      appearance="secondary"
                                      size="xs"
                                      tuiIconButton
                                      type="button"
                                      iconStart="@tui.chevron-down"
                                      [tuiDropdown]="toposMenuExpanded"
                                      [tuiDropdownOpen]="
                                        openDropdownId() === item.key + '_exp'
                                      "
                                      (tuiDropdownOpenChange)="
                                        openDropdownId.set(
                                          $event ? item.key + '_exp' : null
                                        )
                                      "
                                      (click.zoneless)="
                                        $event.stopPropagation()
                                      "
                                    >
                                      {{ 'addRouteToTopo' | translate }}
                                    </button>
                                  }
                                </div>
                              } @else if (
                                global.editingMode() && showAddRouteToTopo()
                              ) {
                                <button
                                  appearance="flat-grayscale"
                                  size="xs"
                                  tuiButton
                                  type="button"
                                  class="!rounded-full"
                                  iconStart="@tui.plus"
                                  [tuiDropdown]="toposMenuExpanded"
                                  [tuiDropdownOpen]="
                                    openDropdownId() === item.key + '_exp'
                                  "
                                  (tuiDropdownOpenChange)="
                                    openDropdownId.set(
                                      $event ? item.key + '_exp' : null
                                    )
                                  "
                                  (click.zoneless)="$event.stopPropagation()"
                                >
                                  {{ 'addRouteToTopo' | translate }}
                                </button>
                              }
                              <ng-template #toposMenuExpanded>
                                <tui-data-list>
                                  @for (
                                    topo of global.cragDetailResource.value()
                                      ?.topos || [];
                                    track topo.id
                                  ) {
                                    @let isAttached =
                                      isRouteInTopo(
                                        item._ref.id,
                                        topo.id,
                                        item.topos
                                      );
                                    <button
                                      tuiOption
                                      new
                                      (click)="
                                        toggleRouteOnTopo(
                                          topo.id,
                                          item._ref.id,
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

                            @if (item.ascents; as ascents) {
                              <div class="flex items-center gap-1 opacity-70">
                                <span class="font-medium">{{
                                  item.ascents
                                }}</span>
                                {{
                                  (ascents > 1 ? 'ascents' : 'ascent')
                                    | translate
                                    | lowercase
                                }}
                              </div>
                            }
                          </div>

                          <div class="flex items-center gap-3">
                            @if (!item.climbed) {
                              <button
                                size="m"
                                appearance="neutral"
                                iconStart="@tui.circle-plus"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="
                                  onLogAscent(item._ref);
                                  $event.stopPropagation()
                                "
                              >
                                {{ 'ascent.new' | translate }}
                              </button>
                            } @else if (item._ref.own_ascent; as ascentToEdit) {
                              <app-button-ascent-type
                                [type]="ascentToEdit?.type"
                                [active]="true"
                                class="cursor-pointer"
                                tabindex="0"
                                (click.zoneless)="
                                  onEditAscent(ascentToEdit, item._ref.name);
                                  $event.stopPropagation()
                                "
                                (keydown.enter)="
                                  onEditAscent(ascentToEdit, item._ref.name);
                                  $event.stopPropagation()
                                "
                              />
                            }

                            @if (!item.climbed) {
                              <button
                                size="m"
                                [appearance]="
                                  item.project ? 'primary' : 'neutral'
                                "
                                iconStart="@tui.bookmark"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="
                                  routesService.toggleRouteProject(
                                    item._ref.id,
                                    item._ref
                                  );
                                  $event.stopPropagation()
                                "
                              >
                                {{ 'project' | translate }}
                              </button>
                            }

                            @if (canEditRoute && showAdminActions()) {
                              <button
                                size="s"
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="
                                  openEditRoute(item._ref);
                                  $event.stopPropagation()
                                "
                              >
                                {{ 'edit' | translate }}
                              </button>
                              <button
                                size="s"
                                appearance="negative"
                                iconStart="@tui.trash"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                (click.zoneless)="
                                  deleteRoute(item._ref);
                                  $event.stopPropagation()
                                "
                              >
                                {{ 'delete' | translate }}
                              </button>
                            }
                          </div>
                        </div>

                        @if (showLocation()) {
                          <div
                            class="text-xs opacity-60 flex gap-1 items-center border-t border-[var(--tui-border-normal)] pt-2"
                          >
                            <tui-icon icon="@tui.map-pin" class="text-[10px]" />
                            <a
                              tuiLink
                              [routerLink]="['/area', item.area_slug]"
                              (click)="$event.stopPropagation()"
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
                              (click)="$event.stopPropagation()"
                            >
                              {{ item.crag_name }}
                            </a>
                          </div>
                        }
                      </div>
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
  host: { class: 'flex flex-col min-h-0' },
})
export class RoutesTableComponent {
  protected readonly global = inject(GlobalData);
  protected readonly router = inject(Router);
  protected readonly routesService = inject(RoutesService);
  protected readonly toposService = inject(ToposService);
  protected readonly ascentsService = inject(AscentsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialogs = inject(TuiDialogService);
  private readonly translate = inject(TranslateService);
  private readonly toast = inject(ToastService);

  // Inputs
  data: InputSignal<RouteItem[]> = input.required<RouteItem[]>();
  direction: InputSignal<TuiSortDirection> = input<TuiSortDirection>(
    TuiSortDirection.Desc,
  );
  showAdminActions: InputSignal<boolean> = input(true);
  showRowColors: InputSignal<boolean> = input(true);
  showLocation: InputSignal<boolean> = input(false);
  showAddRouteToTopo: InputSignal<boolean> = input(false);
  hiddenColumns: InputSignal<string[]> = input<string[]>([]);

  protected readonly sorters: Record<
    RoutesTableKey,
    TuiComparator<RoutesTableRow>
  > = {
    grade: (a, b) => tuiDefaultSort(a._ref.grade, b._ref.grade),
    route: (a, b) => tuiDefaultSort(a.route, b.route),
    height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height ?? 0),
    rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
    ascents: (a, b) => tuiDefaultSort(a.ascents, b.ascents),
    topo: (a, b) => {
      const aVal = a.topos.map((t) => normalizeName(t.name)).join(', ');
      const bVal = b.topos.map((t) => normalizeName(t.name)).join(', ');
      return tuiDefaultSort(aVal, bVal) || tuiDefaultSort(a.route, b.route);
    },
  };

  // Internal state for sorting
  protected currentSorter: TuiComparator<RoutesTableRow> =
    this.sorters['ascents'];
  protected currentDirection: TuiSortDirection = TuiSortDirection.Desc;

  protected readonly openDropdownId = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.currentDirection = this.direction();
    });
  }

  protected readonly columns = computed(() => {
    const isMobile = this.global.isMobile();
    if (isMobile) {
      return ['expand', 'grade', 'route'];
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
      (r) => this.global.permissions.routeEdit()[r.id],
    );

    if (
      this.global.editingMode() &&
      this.showAdminActions() &&
      (this.global.isAdmin() || canEditAny)
    ) {
      cols.splice(cols.indexOf('rating'), 1);
      cols.splice(cols.indexOf('ascents'), 1);
      cols.splice(cols.indexOf('actions'), 1);

      cols.push('equippers');
      cols.push('admin_actions');
    }
    return cols.filter((c) => !this.hiddenColumns().includes(c));
  });

  protected readonly tableData: Signal<RoutesTableRow[]> = computed(() =>
    this.data().map((r: RouteItem) => {
      // Map numeric grade from Supabase using label mapping
      const grade =
        GRADE_NUMBER_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES] ?? '?';

      const rating = r.rating || 0;
      const ascents = r.ascent_count || 0;

      const liked = r.liked;
      const project = r.project;

      const key = r.id.toString();

      return {
        key,
        grade,
        route: r.name,
        area_name: r.area_name,
        crag_name: r.crag_name,
        area_slug: r.area_slug,
        crag_slug: r.crag_slug,
        height: r.height || null,
        rating,
        ascents,
        liked,
        project,
        climbed: r.climbed ?? false,
        link: [
          '/area',
          r.area_slug || 'unknown',
          r.crag_slug || 'unknown',
          r.slug,
        ],
        topos: (r.topos || []).sort((a, b) =>
          tuiDefaultSort(normalizeName(a.name), normalizeName(b.name)),
        ),
        _ref: r,
      };
    }),
  );

  protected getSorter(col: string): TuiComparator<RoutesTableRow> | null {
    if (col === 'actions' || col === 'admin_actions') return null;
    if (col === 'expand') return this.sorters['ascents'];
    return this.sorters[col as RoutesTableKey] ?? null;
  }

  protected onSortChange(sort: TuiTableSortChange<RoutesTableRow>): void {
    this.currentSorter = sort.sortComparator || this.sorters['grade'];
    this.currentDirection = sort.sortDirection;
  }

  protected onLogAscent(item: RouteItem): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: item.id,
        routeName: item.name,
        grade: item.grade,
      }),
      { defaultValue: undefined },
    );
  }

  protected onEditAscent(
    ascent: RouteAscentWithExtras,
    routeName: string,
  ): void {
    void firstValueFrom(
      this.ascentsService.openAscentForm({
        routeId: ascent.route_id,
        routeName: routeName,
        ascentData: ascent,
      }),
      { defaultValue: undefined },
    );
  }

  protected deleteRoute(route: RouteItem): void {
    if (!isPlatformBrowser(this.platformId)) return;

    void firstValueFrom(
      this.dialogs.open<boolean>(TUI_CONFIRM, {
        label: this.translate.instant('routes.deleteTitle'),
        size: 's',
        data: {
          content: this.translate.instant('routes.deleteConfirm', {
            name: route.name,
          }),
          yes: this.translate.instant('delete'),
          no: this.translate.instant('cancel'),
        } as TuiConfirmData,
      }),
      { defaultValue: false },
    ).then((confirmed) => {
      if (!confirmed) return;
      this.routesService
        .delete(route.id)
        .catch((err) => handleErrorToast(err, this.toast));
    });
  }

  protected openEditRoute(route: RouteItem): void {
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

  protected isRouteInTopo(
    routeId: number,
    topoId: number,
    routeTopos: { id: number }[],
  ): boolean {
    return routeTopos.some((t) => t.id === topoId);
  }

  protected onUpdateRouteHeight(
    route: RouteItem,
    newHeight: number | string | null,
  ): void {
    const val =
      newHeight === null || newHeight === ''
        ? null
        : typeof newHeight === 'string'
          ? parseInt(newHeight, 10)
          : newHeight;

    if (val === route.height) return;

    this.routesService
      .update(route.id, { height: val })
      .catch((err) => handleErrorToast(err, this.toast));
  }

  protected async toggleRouteOnTopo(
    topoId: number,
    routeId: number,
    isPresent: boolean,
  ): Promise<void> {
    console.log(
      '[RoutesTable] toggling route',
      routeId,
      'on topo',
      topoId,
      'isPresent:',
      isPresent,
    );
    try {
      if (isPresent) {
        await this.toposService.removeRoute(topoId, routeId, false);
      } else {
        await this.toposService.addRoute(
          {
            topo_id: topoId,
            route_id: routeId,
            number: 0,
          },
          false,
        );
      }
      console.log('[RoutesTable] operation success, reloading resources');
      await this.global.cragRoutesResource.reload();
      await this.global.cragDetailResource.reload();
    } catch (e) {
      console.error('[RoutesTable] error toggling route on topo', e);
      handleErrorToast(e as Error, this.toast);
    }
  }
}
