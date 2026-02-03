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
  TuiHint,
  TuiIcon,
  TuiLink,
  TuiScrollbar,
} from '@taiga-ui/core';
import { TuiDialogService } from '@taiga-ui/experimental';
import {
  TUI_CONFIRM,
  TuiChevron,
  type TuiConfirmData,
  TuiRating,
} from '@taiga-ui/kit';
import { TuiCell } from '@taiga-ui/layout';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import {
  RouteAscentWithExtras,
  RouteWithExtras,
  VERTICAL_LIFE_GRADES,
  VERTICAL_LIFE_TO_LABEL,
} from '../models';

import {
  AscentsService,
  GlobalData,
  RoutesService,
  ToastService,
} from '../services';

import { handleErrorToast } from '../utils';

import { AvatarGradeComponent } from './avatar-grade';
import { AvatarAscentTypeComponent } from './avatar-ascent-type';
import { EmptyStateComponent } from './empty-state';

export type RoutesTableKey =
  | 'grade'
  | 'route'
  | 'rating'
  | 'ascents'
  | 'height';
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
  _ref: RouteItem;
}

@Component({
  selector: 'app-routes-table',
  imports: [
    AvatarAscentTypeComponent,
    AvatarGradeComponent,
    DecimalPipe,
    EmptyStateComponent,
    FormsModule,
    LowerCasePipe,
    RouterLink,
    TranslatePipe,
    TuiButton,
    TuiCell,
    TuiChevron,
    TuiHint,
    TuiIcon,
    TuiLink,
    TuiRating,
    TuiScrollbar,
    TuiTable,
    TuiTableExpand,
    TuiTableSortPipe,
  ],
  template: `
    @if (tableData(); as data) {
      @if (data.length > 0) {
        @let isMobile = global.isMobile();
        @let isAdmin = global.isAdmin();
        <tui-scrollbar class="grow min-h-0 no-scrollbar">
          <table
            tuiTable
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
                    [class.!w-20]="
                      col === 'grade' || col === 'height' || col === 'ascents'
                    "
                    [class.!w-24]="col === 'rating'"
                    [class.!w-32]="col === 'actions' || col === 'admin_actions'"
                  >
                    <div class="flex items-center gap-1">
                      {{
                        col === 'actions' ||
                        col === 'admin_actions' ||
                        col === 'expand'
                          ? ''
                          : ('labels.' + col | translate)
                      }}
                    </div>
                  </th>
                }
              </tr>
            </thead>
            @let sortedData = data | tuiTableSort;
            @for (item of sortedData; track item.key) {
              @let isAllowedEquipper =
                global.isAllowedEquipper(item._ref.area_id);
              <tbody tuiTbody>
                <tr
                  tuiTr
                  class="cursor-pointer"
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
                  tabindex="0"
                  (click.zoneless)="
                    isMobile ? exp.toggle() : router.navigate(item.link)
                  "
                  (keydown.enter)="
                    isMobile ? exp.toggle() : router.navigate(item.link)
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
                            (click.zoneless)="
                              exp.toggle(); $event.stopPropagation()
                            "
                          >
                            Toggle
                          </button>
                        }
                        @case ('grade') {
                          <div tuiCell size="m">
                            <app-avatar-grade [grade]="item._ref.grade" />
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
                                (click.zoneless)="$event.stopPropagation()"
                              >
                                {{ item.route || ('labels.route' | translate) }}
                              </a>
                              @if (showLocation() && !isMobile) {
                                <div
                                  class="text-xs opacity-70 flex gap-1 items-center whitespace-nowrap"
                                >
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
                          </div>
                        }
                        @case ('height') {
                          <div tuiCell size="m">
                            {{ item.height ? item.height + 'm' : '-' }}
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
                                [tuiHint]="
                                  isMobile ? null : ('ascent.new' | translate)
                                "
                                (click.zoneless)="
                                  onLogAscent(item._ref);
                                  $event.stopPropagation()
                                "
                              >
                                {{ 'ascent.new' | translate }}
                              </button>
                            } @else if (item._ref.own_ascent; as ascentToEdit) {
                              <app-avatar-ascent-type
                                [type]="ascentToEdit?.type"
                                size="m"
                                class="cursor-pointer"
                                [tuiHint]="
                                  isMobile ? null : ('ascent.edit' | translate)
                                "
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
                                [tuiHint]="
                                  isMobile
                                    ? null
                                    : ((item.project
                                        ? 'actions.project.remove'
                                        : 'actions.project.add'
                                      ) | translate)
                                "
                                (click.zoneless)="
                                  routesService.toggleRouteProject(
                                    item._ref.id,
                                    item._ref
                                  );
                                  $event.stopPropagation()
                                "
                              >
                                {{
                                  (item.project
                                    ? 'actions.project.remove'
                                    : 'actions.project.add'
                                  ) | translate
                                }}
                              </button>
                            }
                          </div>
                        }
                        @case ('admin_actions') {
                          <div tuiCell size="m">
                            @if (isAllowedEquipper) {
                              <button
                                size="s"
                                appearance="neutral"
                                iconStart="@tui.square-pen"
                                tuiIconButton
                                type="button"
                                class="!rounded-full"
                                [tuiHint]="
                                  isMobile ? null : ('actions.edit' | translate)
                                "
                                (click.zoneless)="
                                  openEditRoute(item._ref);
                                  $event.stopPropagation()
                                "
                              >
                                {{ 'actions.edit' | translate }}
                              </button>
                              @if (isAdmin) {
                                <button
                                  size="s"
                                  appearance="negative"
                                  iconStart="@tui.trash"
                                  tuiIconButton
                                  type="button"
                                  class="!rounded-full"
                                  [tuiHint]="
                                    isMobile
                                      ? null
                                      : ('actions.delete' | translate)
                                  "
                                  (click.zoneless)="
                                    deleteRoute(item._ref);
                                    $event.stopPropagation()
                                  "
                                >
                                  {{ 'actions.delete' | translate }}
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
                            @if (item.ascents; as ascents) {
                              <div class="flex items-center gap-1 opacity-70">
                                <span class="font-medium">{{
                                  item.ascents
                                }}</span>
                                {{
                                  'labels.' +
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
                              <app-avatar-ascent-type
                                [type]="ascentToEdit?.type"
                                size="m"
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
                                {{
                                  (item.project
                                    ? 'actions.project.remove'
                                    : 'actions.project.add'
                                  ) | translate
                                }}
                              </button>
                            }

                            @if (
                              (isAdmin || isAllowedEquipper) &&
                              showAdminActions()
                            ) {
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
                                {{ 'actions.edit' | translate }}
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
                                {{ 'actions.delete' | translate }}
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

  protected readonly sorters: Record<
    RoutesTableKey,
    TuiComparator<RoutesTableRow>
  > = {
    grade: (a, b) => tuiDefaultSort(a._ref.grade, b._ref.grade),
    route: (a, b) => tuiDefaultSort(a.route, b.route),
    height: (a, b) => tuiDefaultSort(a.height ?? 0, b.height),
    rating: (a, b) => tuiDefaultSort(a.rating, b.rating),
    ascents: (a, b) => tuiDefaultSort(a.ascents, b.ascents),
  };

  // Internal state for sorting
  protected currentSorter: TuiComparator<RoutesTableRow> =
    this.sorters['ascents'];
  protected currentDirection: TuiSortDirection = TuiSortDirection.Desc;

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

    const cols = ['grade', 'route', 'height', 'rating', 'ascents', 'actions'];
    if (
      (this.global.isAdmin() || this.global.isEquipper()) &&
      this.showAdminActions()
    ) {
      cols.push('admin_actions');
    }
    return cols;
  });

  protected readonly tableData: Signal<RoutesTableRow[]> = computed(() =>
    this.data().map((r: RouteItem) => {
      // Map numeric grade from Supabase using label mapping
      const grade =
        VERTICAL_LIFE_TO_LABEL[r.grade as VERTICAL_LIFE_GRADES] ?? '?';

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
          yes: this.translate.instant('actions.delete'),
          no: this.translate.instant('actions.cancel'),
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
}
