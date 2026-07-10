import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  TemplateRef,
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

import {
  RoutesTableKey,
  RoutesTableRow,
  INDOOR_ROUTE_COLORS,
} from '../../models';

import { IncludesIdPipe } from '../../pipes';
import { ROUTE_TABLE_SORTERS } from '../../utils';

@Component({
  selector: 'app-routes-table',
  standalone: true,
  imports: [
    ButtonAscentTypeComponent,
    EmptyStateComponent,
    FormsModule,
    GradeComponent,
    IncludesIdPipe,
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
    NgTemplateOutlet,
  ],
  template: `
    @if (tableData(); as data) {
      @if (data.length > 0) {
        @let isMobile = this.isMobile();
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
                    [sorter]="sorters[col]"
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
              @let canEditRoute = item.canEdit;
              <tbody tuiTbody>
                <tr
                  tuiTr
                  [style.background]="
                    showRowColors()
                      ? item.climbed
                        ? (ascentInfo()[item.own_ascent?.type || 'default']
                            ?.backgroundSubtle ?? '')
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
                                    updateRouteHeight.emit({
                                      row: item,
                                      height: $any($event.target).value,
                                    })
                                  "
                                  (keydown.enter)="
                                    updateRouteHeight.emit({
                                      row: item,
                                      height: $any($event.target).value,
                                    })
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
                                  @let colorName =
                                    item.color
                                      ? indoorRouteColors[item.color] || ''
                                      : '';
                                  @if (colorName) {
                                    {{ 'colors.' + colorName | translate }}
                                  } @else {
                                    {{ item.color }}
                                  }
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
                                        [routerLink]="t.link"
                                      >
                                        {{ t.name }}
                                      </button>
                                    }
                                    @if (
                                      item.canAddTopo && showAddRouteToTopo()
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
                                  item.canAddTopo && showAddRouteToTopo()
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
                                      topo of availableTopos();
                                      track topo.id
                                    ) {
                                      @let isAttached =
                                        item.topos | includesId: topo.id;

                                      <button
                                        tuiOption
                                        new
                                        (click)="
                                          toggleRouteOnTopo.emit({
                                            topoId: topo.id,
                                            routeId: item.id,
                                            isAttached: isAttached,
                                          });
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
                          </div>
                        }
                        @case ('equippers') {
                          <div
                            tuiCell
                            size="m"
                            class="h-full py-0 grow min-w-0"
                          >
                            @if (equippersTemplate(); as tpl) {
                              <ng-container
                                *ngTemplateOutlet="
                                  tpl;
                                  context: { $implicit: item }
                                "
                              />
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
                                  editAscent.emit({ row: item, ascent: ascent })
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
                                (click.zoneless)="logAscent.emit(item)"
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
                                (click.zoneless)="toggleProject.emit(item)"
                              >
                                {{ 'project' | translate }}
                              </button>
                            }
                          </div>
                        }
                        @case ('admin_actions') {
                          <div class="flex gap-1 justify-end items-center">
                            @if (item.canEdit) {
                              <button
                                size="s"
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiHint]="'edit' | translate"
                                (click.zoneless)="editRoute.emit(item)"
                              >
                                {{ 'edit' | translate }}
                              </button>
                            }
                            @if (item.canDelete) {
                              <button
                                size="s"
                                appearance="negative"
                                iconStart="@tui.trash"
                                tuiIconButton
                                type="button"
                                class="rounded-full!"
                                [tuiHint]="'delete' | translate"
                                (click.zoneless)="deleteRoute.emit(item)"
                              >
                                {{ 'delete' | translate }}
                              </button>
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
                      @if (exp.expanded()) {
                        @if (expandedTemplate(); as tpl) {
                          <ng-container
                            *ngTemplateOutlet="
                              tpl;
                              context: { $implicit: item }
                            "
                          />
                        }
                      }
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
  // Inputs
  tableData = input<RoutesTableRow[]>([], { alias: 'data' });
  inputColumns = input<string[]>([], { alias: 'columns' });
  direction = input<TuiSortDirection>(TuiSortDirection.Desc);
  activeCol = input<RoutesTableKey>('ascents');
  showRowColors = input(true);
  expandableMobile = input(true);
  showAddRouteToTopo = input(false);
  showLocation = input(false);
  isMobile = input(false);
  availableTopos = input<{ id: number | string; name: string }[]>([]);
  ascentInfo = input<Record<string, { backgroundSubtle?: string }>>({});

  // Templates
  equippersTemplate = input<TemplateRef<{ $implicit: RoutesTableRow }> | null>(
    null,
  );
  expandedTemplate = input<TemplateRef<{ $implicit: RoutesTableRow }> | null>(
    null,
  );

  // Outputs
  sortChange = output<{ key: RoutesTableKey; direction: TuiSortDirection }>();
  updateRouteHeight = output<{
    row: RoutesTableRow;
    height: number | string | null;
  }>();
  toggleRouteOnTopo = output<{
    topoId: number | string;
    routeId: number | string;
    isAttached: boolean;
  }>();
  logAscent = output<RoutesTableRow>();
  editAscent = output<{ row: RoutesTableRow; ascent: any }>();
  toggleProject = output<RoutesTableRow>();
  editRoute = output<RoutesTableRow>();
  deleteRoute = output<RoutesTableRow>();

  protected readonly sorters = ROUTE_TABLE_SORTERS;

  // Internal state for sorting
  protected currentSorter: TuiComparator<RoutesTableRow> =
    this.sorters[this.activeCol()];
  protected currentDirection: TuiSortDirection = this.direction();

  protected readonly openDropdownId = signal<string | null>(null);

  protected readonly expanders = viewChildren(TuiTableExpand);
  protected readonly allExpanded = signal(false);

  protected readonly columns = computed(() => {
    const isMobile = this.isMobile() && this.expandableMobile();
    if (isMobile) {
      return ['expand', 'grade', 'route'];
    }
    return this.inputColumns();
  });

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

  protected readonly indoorRouteColors = INDOOR_ROUTE_COLORS;

  protected onSortChange(sort: TuiTableSortChange<RoutesTableRow>): void {
    if (!sort) return;
    this.currentSorter = sort.sortComparator || (() => 0);
    this.currentDirection = sort.sortDirection;
    // Emitting sortChange is helpful for parent wrappers to track active col / direction
    this.sortChange.emit({
      key: this.activeCol(), // wrapper can use activeCol or computed col
      direction: sort.sortDirection,
    });
  }
}
